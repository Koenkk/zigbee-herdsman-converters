import crypto from 'crypto';
import {HttpsProxyAgent} from 'https-proxy-agent';
import {Zh, Ota, KeyValueAny, KeyValue, KeyValueNumberString} from '../types';
import assert from 'assert';
import crc32 from 'buffer-crc32';
import axios from 'axios';
import * as URI from 'uri-js';
import fs from 'fs';
import path from 'path';
import {Zcl} from 'zigbee-herdsman';
import {logger} from '../logger';
import https from 'https';
import tls from 'tls';

const NS = 'zhc:ota:common';
let dataDir: string = null;
const maxTimeout = 2147483647; // +- 24 days
const imageBlockResponseDelay = 250;
const endRequestCodeLookup: KeyValueNumberString = {
    0x00: 'success',
    0x95: 'aborted by device',
    0x7E: 'not authorized',
    0x96: 'invalid image',
    0x97: 'no data available',
    0x98: 'no image available',
    0x80: 'malformed command',
    0x81: 'unsupported cluster command',
    0x99: 'requires more image files',
};
export const upgradeFileIdentifier = Buffer.from([0x1E, 0xF1, 0xEE, 0x0B]);

interface Request {cancel: () => void, promise: Promise<{header: Zh.ZclHeader, payload: KeyValue}>}
interface Waiters {imageBlockOrPageRequest?: Request, nextImageRequest?: Request, upgradeEndRequest?: Request}
type IsNewImageAvailable = (current: Ota.ImageInfo, device: Zh.Device, getImageMeta: Ota.GetImageMeta) =>
    Promise<{available: number, currentFileVersion: number, otaFileVersion: number}>
type DownloadImage = (meta: Ota.ImageMeta) => Promise<{data: Buffer}>;
type GetNewImage = (current: Ota.Version, device: Zh.Device, getImageMeta: Ota.GetImageMeta, downloadImage: DownloadImage,
    suppressElementImageParseFailure: boolean) => Promise<Ota.Image>;

const validSilabsCrc = 0x2144DF1C;

const eblTagHeader = 0x0;
const eblTagEncHeader = 0xfb05;
const eblTagEnd = 0xfc04;
const eblPadding = 0xff;
const eblImageSignature = 0xe350;

const gblTagHeader = 0xeb17a603;
const gblTagEnd = 0xfc0404fc;


/**
 * Helper functions
 */


export const setDataDir = (dir: string) => {
    dataDir = dir;
};

export function isValidUrl(url: string) {
    let parsed;
    try {
        parsed = URI.parse(url);
    } catch (_) {
        return false;
    }
    return parsed.scheme === 'http' || parsed.scheme === 'https';
}

export function readLocalFile(fileName: string) {
    // If the file name is not a full path, then treat it as a relative to the data directory
    if (!path.isAbsolute(fileName) && dataDir) {
        fileName = path.join(dataDir, fileName);
    }

    logger.debug(`Getting local firmware file '${fileName}'`, NS);
    return fs.readFileSync(fileName);
}

export async function getFirmwareFile(image: KeyValueAny) {
    const urlOrName = image.url;

    // First try to download firmware file with the URL provided
    if (isValidUrl(urlOrName)) {
        logger.debug(`Downloading firmware image from '${urlOrName}'`, NS);
        return await getAxios().get(urlOrName, {responseType: 'arraybuffer'});
    }

    logger.debug(`Try to read firmware image from local file '${urlOrName}'`, NS);
    return {data: readLocalFile(urlOrName)};
}

export async function processCustomCaBundle(uri: string) {
    let rawCaBundle = '';
    if (isValidUrl(uri)) {
        rawCaBundle = (await axios.get(uri)).data;
    } else {
        if (!path.isAbsolute(uri) && dataDir) {
            uri = path.join(dataDir, uri);
        }
        rawCaBundle = fs.readFileSync(uri, {encoding: 'utf-8'});
    }

    // Parse the raw CA bundle into clean, separate CA certs
    const lines = rawCaBundle.split('\n');
    const caBundle = [];
    let inCert = false;
    let currentCert = '';
    for (const line of lines) {
        if (line === '-----BEGIN CERTIFICATE-----') {
            inCert = true;
        }
        if (inCert) {
            currentCert = currentCert + line + '\n';
        }
        if (line === '-----END CERTIFICATE-----') {
            inCert = false;
            caBundle.push(currentCert);
            currentCert = '';
        }
    }

    return caBundle;
}

export async function getOverrideIndexFile(urlOrName: string) {
    if (isValidUrl(urlOrName)) {
        const {data: index} = await getAxios().get(urlOrName);

        if (!index) {
            throw new Error(`OTA: Error getting override index file from '${urlOrName}'`);
        }

        return index;
    }

    return JSON.parse(fs.readFileSync(urlOrName, 'utf-8'));
}


/**
 * OTA functions
 */

function getOTAEndpoint(device: Zh.Device) {
    return device.endpoints.find((e) => e.supportsOutputCluster('genOta'));
}

function parseSubElement(buffer: Buffer, position: number): Ota.ImageElement {
    const tagID = buffer.readUInt16LE(position);
    const length = buffer.readUInt32LE(position + 2);
    const data = buffer.slice(position + 6, position + 6 + length);
    return {tagID, length, data};
}

export function parseImage(buffer: Buffer, suppressElementImageParseFailure: boolean = false): Ota.Image {
    const header: Ota.ImageHeader = {
        otaUpgradeFileIdentifier: buffer.subarray(0, 4),
        otaHeaderVersion: buffer.readUInt16LE(4),
        otaHeaderLength: buffer.readUInt16LE(6),
        otaHeaderFieldControl: buffer.readUInt16LE(8),
        manufacturerCode: buffer.readUInt16LE(10),
        imageType: buffer.readUInt16LE(12),
        fileVersion: buffer.readUInt32LE(14),
        zigbeeStackVersion: buffer.readUInt16LE(18),
        otaHeaderString: buffer.toString('utf8', 20, 52),
        totalImageSize: buffer.readUInt32LE(52),
    };
    let headerPos = 56;
    if (header.otaHeaderFieldControl & 1) {
        header.securityCredentialVersion = buffer.readUInt8(headerPos);
        headerPos += 1;
    }
    if (header.otaHeaderFieldControl & 2) {
        header.upgradeFileDestination = buffer.subarray(headerPos, headerPos + 8);
        headerPos += 8;
    }
    if (header.otaHeaderFieldControl & 4) {
        header.minimumHardwareVersion = buffer.readUInt16LE(headerPos);
        headerPos += 2;
        header.maximumHardwareVersion = buffer.readUInt16LE(headerPos);
        headerPos += 2;
    }

    const raw = buffer.slice(0, header.totalImageSize);

    assert(Buffer.compare(header.otaUpgradeFileIdentifier, upgradeFileIdentifier) === 0, `Not an OTA file`);

    let position = header.otaHeaderLength;
    const elements = [];
    try {
        while (position < header.totalImageSize) {
            const element = parseSubElement(buffer, position);
            elements.push(element);
            position += element.data.length + 6;
        }
    } catch (error) {
        if (!suppressElementImageParseFailure) {
            throw error;
        }
        logger.debug('Partially failed to parse the image, continuing anyway...', NS);
    }

    assert(position === header.totalImageSize, `Size mismatch`);
    return {header, elements, raw};
}

function validateImageData(image: Ota.Image) {
    for (const element of image.elements) {
        const {data} = element;

        if (data.readUInt32BE(0) === gblTagHeader) {
            validateSilabsGbl(data);
        } else {
            const tag = data.readUInt16BE(0);

            if ((tag === eblTagHeader && data.readUInt16BE(6) === eblImageSignature) || tag === eblTagEncHeader ) {
                validateSilabsEbl(data);
            }
        }
    }
}

function validateSilabsEbl(data: Buffer) {
    const dataLength = data.length;

    let position = 0;

    while (position + 4 <= dataLength) {
        const tag = data.readUInt16BE(position);
        const len = data.readUInt16BE(position + 2);

        position += 4 + len;

        if (tag !== eblTagEnd) {
            continue;
        }

        for (let position2 = position; position2 < dataLength; position2++) {
            assert(data.readUInt8(position2) === eblPadding, `Image padding contains invalid bytes`);
        }

        const calculatedCrc32 = crc32.unsigned(data.slice(0, position));

        assert(calculatedCrc32 === validSilabsCrc, `Image CRC-32 is invalid`);

        return;
    }

    throw new Error(`OTA: Image is truncated, not long enough to contain a valid tag`);
}

function validateSilabsGbl(data: Buffer) {
    const dataLength = data.length;

    let position = 0;

    while (position + 8 <= dataLength) {
        const tag = data.readUInt32BE(position);
        const len = data.readUInt32LE(position + 4);

        position += 8 + len;

        if (tag !== gblTagEnd) {
            continue;
        }

        const calculatedCrc32 = crc32.unsigned(data.slice(0, position));

        assert(calculatedCrc32 === validSilabsCrc, `Image CRC-32 is invalid`);

        return;
    }

    throw new Error(`OTA: Image is truncated, not long enough to contain a valid tag`);
}

function cancelWaiters(waiters: Waiters) {
    for (const waiter of Object.values(waiters)) {
        if (waiter) {
            waiter.cancel();
        }
    }
}

function sendQueryNextImageResponse(endpoint: Zh.Endpoint, image: Ota.Image, requestTransactionSequenceNumber: number) {
    const payload = {
        status: 0,
        manufacturerCode: image.header.manufacturerCode,
        imageType: image.header.imageType,
        fileVersion: image.header.fileVersion,
        imageSize: image.header.totalImageSize,
    };

    endpoint.commandResponse('genOta', 'queryNextImageResponse', payload, null, requestTransactionSequenceNumber).catch((e) => {
        logger.debug(`Failed to send queryNextImageResponse (${e.message})`, NS);
    });
}

function imageNotify(endpoint: Zh.Endpoint) {
    return endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 100}, {sendPolicy: 'immediate'});
}

async function requestOTA(endpoint: Zh.Endpoint): Promise<{payload: Ota.ImageInfo}> {
    // Some devices (e.g. Insta) take very long trying to discover the correct coordinator EP for OTA.
    const queryNextImageRequest = endpoint.waitForCommand('genOta', 'queryNextImageRequest', null, 60000);
    try {
        await imageNotify(endpoint);
        // @ts-expect-error
        return await queryNextImageRequest.promise;
    } catch (e) {
        queryNextImageRequest.cancel();
        throw new Error(`OTA: Device didn't respond to OTA request`);
    }
}

function getImageBlockResponsePayload(image: Ota.Image, imageBlockRequest: KeyValueAny, pageOffset: number, pageSize: number) {
    let start = imageBlockRequest.payload.fileOffset + pageOffset;
    // When the data size is too big, OTA gets unstable, so default it to 50 bytes maximum.
    // - Insta devices, OTA only works for data sizes 40 and smaller (= manufacturerCode 4474).
    // - Legrand devices (newer firmware) require up to 64 bytes (= manufacturerCode 4129).
    let maximumDataSize = 50;
    if (imageBlockRequest.payload.manufacturerCode === 4474) maximumDataSize = 40;
    else if (imageBlockRequest.payload.manufacturerCode === 4129) maximumDataSize = Infinity;

    let dataSize = Math.min(maximumDataSize, imageBlockRequest.payload.maximumDataSize);

    // Hack for https://github.com/Koenkk/zigbee-OTA/issues/328 (Legrand OTA not working)
    if (imageBlockRequest.payload.manufacturerCode === 4129 &&
        imageBlockRequest.payload.fileOffset === 50 &&
        imageBlockRequest.payload.maximumDataSize === 12) {
        logger.info(`Detected Legrand firmware issue, attempting to reset the OTA stack`, NS);
        // The following vector seems to buffer overflow the device to reset the OTA stack!
        start = 78;
        dataSize = 64;
    }

    if (pageSize) {
        dataSize = Math.min(dataSize, pageSize - pageOffset);
    }
    let end = start + dataSize;
    if (end > image.raw.length) {
        end = image.raw.length;
    }

    logger.debug(`Request offsets: fileOffset=${imageBlockRequest.payload.fileOffset} pageOffset=${pageOffset} \
                dataSize=${imageBlockRequest.payload.maximumDataSize}`, NS);
    logger.debug(`Payload offsets: start=${start} end=${end} dataSize=${dataSize}`, NS);

    return {
        status: 0,
        manufacturerCode: imageBlockRequest.payload.manufacturerCode,
        imageType: imageBlockRequest.payload.imageType,
        fileVersion: imageBlockRequest.payload.fileVersion,
        fileOffset: start,
        dataSize: end - start,
        data: image.raw.slice(start, end),
    };
}

function callOnProgress(startTime: number, lastUpdate: number, imageBlockRequest: KeyValueAny,
    image: Ota.Image, onProgress: Ota.OnProgress) {
    const now = Date.now();

    // Call on progress every +- 30 seconds
    if (lastUpdate === null || (now - lastUpdate) > 30000) {
        const totalDuration = (now - startTime) / 1000; // in seconds
        const bytesPerSecond = imageBlockRequest.payload.fileOffset / totalDuration;
        const remaining = (image.header.totalImageSize - imageBlockRequest.payload.fileOffset) / bytesPerSecond;
        let percentage = imageBlockRequest.payload.fileOffset / image.header.totalImageSize;
        percentage = Math.round(percentage * 10000) / 100;
        logger.debug(`Update at ${percentage}%, remaining ${remaining} seconds`, NS);
        onProgress(percentage, remaining === Infinity ? null : remaining);
        return now;
    } else {
        return lastUpdate;
    }
}

export async function isUpdateAvailable(device: Zh.Device, requestPayload: Ota.ImageInfo,
    isNewImageAvailable: IsNewImageAvailable = null, getImageMeta: Ota.GetImageMeta = null) {
    logger.debug(`Checking if an update is available for '${device.ieeeAddr}' (${device.modelID})`, NS);

    if (requestPayload === null) {
        const endpoint = getOTAEndpoint(device);
        assert(endpoint != null, `Failed to find an endpoint which supports the OTA cluster`);
        logger.debug(`Using endpoint '${endpoint.ID}'`, NS);

        const request = await requestOTA(endpoint);
        logger.debug(`Got request '${JSON.stringify(request.payload)}'`, NS);
        requestPayload = request.payload;
    }

    const availableResult = await isNewImageAvailable(requestPayload, device, getImageMeta);
    logger.debug(`Update available for '${device.ieeeAddr}' (${device.modelID}): ${availableResult.available < 0 ? 'YES' : 'NO'}`, NS);
    if (availableResult.available > 0) {
        logger.warning(`Firmware on '${device.ieeeAddr}' (${device.modelID}) is newer than latest firmware online.`, NS);
    }
    return {...availableResult, available: availableResult.available < 0};
}

export async function isNewImageAvailable(current: Ota.ImageInfo, device: Zh.Device, getImageMeta: Ota.GetImageMeta) {
    const currentS = JSON.stringify(current);
    logger.debug(`Is new image available for '${device.ieeeAddr}' (${device.modelID}), current '${currentS}'`, NS);
    const meta = await getImageMeta(current, device);

    // Soft-fail because no images in repo/URL for specified device
    if (!meta) {
        const metaS = `device '${device.modelID}', hardwareVersion '${device.hardwareVersion}', manufacturerName ${device.manufacturerName}`;
        logger.warning(`Images currently unavailable for ${metaS}, ${currentS}'`, NS);

        return {
            available: 0,
            currentFileVersion: current.fileVersion,
            otaFileVersion: current.fileVersion,
        };
    }

    logger.debug(`Is new image available for '${device.ieeeAddr}' (${device.modelID}), latest meta '${JSON.stringify(meta)}'`, NS);

    // Negative number means the new firmware is 'newer' than current one
    return {
        available: meta.force ? -1 : Math.sign(current.fileVersion - meta.fileVersion),
        currentFileVersion: current.fileVersion,
        otaFileVersion: meta.fileVersion,
    };
}

export async function updateToLatest(device: Zh.Device, onProgress: Ota.OnProgress, getNewImage: GetNewImage,
    getImageMeta: Ota.GetImageMeta = null, downloadImage: DownloadImage = null, suppressElementImageParseFailure: boolean = false): Promise<number> {
    logger.debug(`Updating to latest '${device.ieeeAddr}' (${device.modelID})`, NS);
    const endpoint = getOTAEndpoint(device);
    assert(endpoint != null, `Failed to find an endpoint which supports the OTA cluster`);
    logger.debug(`Using endpoint '${endpoint.ID}'`, NS);
    const request = await requestOTA(endpoint);
    logger.debug(`Got request '${JSON.stringify(request.payload)}'`, NS);
    const image = await getNewImage(request.payload, device, getImageMeta, downloadImage, suppressElementImageParseFailure);
    logger.debug(`Got new image for '${device.ieeeAddr}' (${device.modelID})`, NS);

    const waiters: Waiters = {};
    let lastUpdate: number = null;
    let lastImageBlockResponse: number = null;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const answerNextImageBlockOrPageRequest = () => {
            let imageBlockOrPageRequestTimeoutMs: number = 150000;
            // increase the upgradeEndReq wait time to solve the problem of OTA timeout failure of Sonoff Devices
            // (https://github.com/Koenkk/zigbee-herdsman-converters/issues/6657)
            if ( request.payload.manufacturerCode == 4742 && request.payload.imageType == 8199 ) {
                imageBlockOrPageRequestTimeoutMs = 3600000;
            }

            // Bosch transmits the firmware updates in the background in their native implementation.
            // According to the app, this can take up to 2 days. Therefore, we assume to get at least
            // one package request per hour from the device here.
            if (request.payload.manufacturerCode == Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH) {
                imageBlockOrPageRequestTimeoutMs = 60 * 60 * 1000;
            }

            // Increase the timeout for Legrand devices, so that they will re-initiate and update themselves
            // Newer firmwares have ackward behaviours when it comes to the handling of the last bytes of OTA updates
            if ( request.payload.manufacturerCode === 4129 ) {
                imageBlockOrPageRequestTimeoutMs = 30 * 60 * 1000;
            }

            const imageBlockRequest = endpoint.waitForCommand('genOta', 'imageBlockRequest', null, imageBlockOrPageRequestTimeoutMs);
            const imagePageRequest = endpoint.waitForCommand('genOta', 'imagePageRequest', null, imageBlockOrPageRequestTimeoutMs);
            waiters.imageBlockOrPageRequest = {
                promise: Promise.race([imageBlockRequest.promise, imagePageRequest.promise]),
                cancel: () => {
                    imageBlockRequest.cancel();
                    imagePageRequest.cancel();
                },
            };

            waiters.imageBlockOrPageRequest.promise.then(
                (imageBlockOrPageRequest) => {
                    let pageOffset = 0;
                    let pageSize = 0;

                    const sendImageBlockResponse = (imageBlockRequest: KeyValueAny, thenCallback: () => void, transactionSequenceNumber: number) => {
                        const payload = getImageBlockResponsePayload(image, imageBlockRequest, pageOffset, pageSize);
                        const now = Date.now();
                        const timeSinceLastImageBlockResponse = now - lastImageBlockResponse;

                        // Reduce network congestion by only sending imageBlockResponse min every 250ms.
                        const cooldownTime = Math.max(imageBlockResponseDelay - timeSinceLastImageBlockResponse, 0);
                        setTimeout(() => {
                            endpoint.commandResponse(
                                'genOta', 'imageBlockResponse', payload, null, transactionSequenceNumber,
                            ).then(
                                () => {
                                    pageOffset += payload.dataSize;
                                    lastImageBlockResponse = Date.now();
                                    thenCallback();
                                },
                                (e) => {
                                    // Shit happens, device will probably do a new imageBlockRequest so don't care.
                                    lastImageBlockResponse = Date.now();
                                    thenCallback();
                                    logger.debug(`Image block response failed (${e.message})`, NS);
                                },
                            );
                        }, cooldownTime);

                        lastUpdate = callOnProgress(startTime, lastUpdate, imageBlockRequest, image, onProgress);
                    };

                    if ('pageSize' in imageBlockOrPageRequest.payload) {
                        // imagePageRequest
                        pageSize = imageBlockOrPageRequest.payload.pageSize as number;
                        const handleImagePageRequestBlocks = (imagePageRequest: KeyValueAny) => {
                            if (pageOffset < pageSize) {
                                sendImageBlockResponse(imagePageRequest,
                                    () => handleImagePageRequestBlocks(imagePageRequest), imagePageRequest.header.transactionSequenceNumber);
                            } else {
                                answerNextImageBlockOrPageRequest();
                            }
                        };
                        handleImagePageRequestBlocks(imageBlockOrPageRequest);
                    } else {
                        // imageBlockRequest
                        sendImageBlockResponse(imageBlockOrPageRequest, answerNextImageBlockOrPageRequest,
                            imageBlockOrPageRequest.header.transactionSequenceNumber);
                    }
                },
                () => {
                    cancelWaiters(waiters);
                    reject(new Error(`OTA: Timeout, device did not request any image blocks`));
                },
            );
        };

        const answerNextImageRequest = () => {
            waiters.nextImageRequest = endpoint.waitForCommand('genOta', 'queryNextImageRequest', null, maxTimeout);
            waiters.nextImageRequest.promise.then((payload) => {
                answerNextImageRequest();
                sendQueryNextImageResponse(endpoint, image, payload.header.transactionSequenceNumber);
            });
        };

        // No need to timeout here, will already be done in answerNextImageBlockRequest
        waiters.upgradeEndRequest = endpoint.waitForCommand('genOta', 'upgradeEndRequest', null, maxTimeout);
        waiters.upgradeEndRequest.promise.then((data) => {
            logger.debug(`Got upgrade end request for '${device.ieeeAddr}' (${device.modelID}): ${JSON.stringify(data.payload)}`, NS);
            cancelWaiters(waiters);

            if (data.payload.status === 0) {
                const payload = {
                    manufacturerCode: image.header.manufacturerCode, imageType: image.header.imageType,
                    fileVersion: image.header.fileVersion, currentTime: 0, upgradeTime: 1,
                };

                endpoint.commandResponse('genOta', 'upgradeEndResponse', payload, null, data.header.transactionSequenceNumber).then(
                    () => {
                        logger.debug(`Update succeeded, waiting for device announce`, NS);
                        onProgress(100, null);

                        let timer: ReturnType<typeof setTimeout> = null;
                        const cb = () => {
                            logger.debug(`Got device announce or timed out, call resolve`, NS);
                            clearInterval(timer);
                            device.removeListener('deviceAnnounce', cb);
                            resolve(image.header.fileVersion);
                        };
                        timer = setTimeout(cb, 120 * 1000); // timeout after 2 minutes
                        device.once('deviceAnnounce', cb);
                    },
                    (e) => {
                        const message = `OTA: Upgrade end response failed (${e.message})`;
                        logger.debug(message, NS);
                        reject(new Error(message));
                    },
                );
            } else {
                // @ts-expect-error
                const error = `Update failed with reason: '${endRequestCodeLookup[data.payload.status]}'`;
                logger.debug(error, NS);
                reject(new Error(error));
            }
        });

        logger.debug(`Starting upgrade`, NS);
        answerNextImageBlockOrPageRequest();
        answerNextImageRequest();

        // Notify client once more about new image, client should start sending queryNextImageRequest now
        imageNotify(endpoint).catch((e) => logger.debug(`Image notify failed (${e})`, NS));
    });
}

export async function getNewImage(current: Ota.ImageInfo, device: Zh.Device,
    getImageMeta: Ota.GetImageMeta, downloadImage: DownloadImage, suppressElementImageParseFailure: boolean): Promise<Ota.Image> {
    const meta = await getImageMeta(current, device);
    assert(meta, `Images for '${device.ieeeAddr}' (${device.modelID}) currently unavailable`);
    logger.debug(`Getting new image for '${device.ieeeAddr}' (${device.modelID}), latest meta ${JSON.stringify(meta)}`, NS);
    assert(meta.fileVersion > current.fileVersion || meta.force, `No new image available`);

    const download = downloadImage ? await downloadImage(meta) :
        await getAxios().get(meta.url, {responseType: 'arraybuffer'});

    const checksum = (meta.sha512 || meta.sha256);
    if (checksum) {
        const hash = crypto.createHash(meta.sha512 ? 'sha512' : 'sha256');
        hash.update(download.data);
        assert(hash.digest('hex') === checksum, `File checksum validation failed`);
        logger.debug(`Update checksum validation succeeded for '${device.ieeeAddr}' (${device.modelID})`, NS);
    }

    const start = download.data.indexOf(upgradeFileIdentifier);
    const image = parseImage(download.data.slice(start), suppressElementImageParseFailure);
    logger.debug(`Get new image for '${device.ieeeAddr}' (${device.modelID}), image header ${JSON.stringify(image.header)}`, NS);
    assert(image.header.fileVersion === meta.fileVersion, `File version mismatch`);
    assert(!meta.fileSize || image.header.totalImageSize === meta.fileSize, `Image size mismatch`);
    assert(image.header.manufacturerCode === current.manufacturerCode, `Manufacturer code mismatch`);
    assert(image.header.imageType === current.imageType, `Image type mismatch`);
    if ('minimumHardwareVersion' in image.header && 'maximumHardwareVersion' in image.header) {
        assert(image.header.minimumHardwareVersion <= device.hardwareVersion &&
            device.hardwareVersion <= image.header.maximumHardwareVersion, `Hardware version mismatch`);
    }
    validateImageData(image);
    return image;
}

export function getAxios(caBundle: string[] = null) {
    let config = {};
    const httpsAgentOptions: https.AgentOptions = {};
    if (caBundle !== null) {
        // We also include all system default CAs, as setting custom CAs fully replaces the default list
        httpsAgentOptions.ca = [...tls.rootCertificates, ...caBundle];
    }

    const proxy = process.env.HTTPS_PROXY;
    if (proxy) {
        config = {
            proxy: false,
            httpsAgent: new HttpsProxyAgent(proxy, httpsAgentOptions),
            headers: {
                'Accept-Encoding': '*',
            },
        };
    } else {
        config = {
            httpsAgent: new https.Agent(httpsAgentOptions),
        };
    }

    const axiosInstance = axios.create(config);
    axiosInstance.defaults.maxRedirects = 0; // Set to 0 to prevent automatic redirects
    // Add work with 302 redirects without hostname in Location header
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            // get domain from basic url
            if (error.response && [301, 302].includes(error.response.status)) {
                let redirectUrl = error.response.headers.location;
                try {
                    const parsedUrl = new URL(redirectUrl);
                    if (!parsedUrl.protocol || !parsedUrl.host) {
                        throw new Error(`OTA: Get Axios, no scheme or domain`);
                    }
                } catch {
                    // Prepend scheme and domain from the original request's base URL
                    const baseURL = new URL(error.config.url);
                    redirectUrl = `${baseURL.origin}${redirectUrl}`;
                }
                return axiosInstance.get(redirectUrl, {responseType: error.config.responseType || 'arraybuffer'});
            }
        },
    );
    return axiosInstance;
}

exports.upgradeFileIdentifier = upgradeFileIdentifier;
exports.isUpdateAvailable = isUpdateAvailable;
exports.parseImage = parseImage;
exports.validateImageData = validateImageData;
exports.isNewImageAvailable = isNewImageAvailable;
exports.updateToLatest = updateToLatest;
exports.getNewImage = getNewImage;
exports.getAxios = getAxios;
exports.isValidUrl = isValidUrl;
exports.setDataDir = setDataDir;
exports.getFirmwareFile = getFirmwareFile;
exports.readLocalFile = readLocalFile;
exports.getOverrideIndexFile = getOverrideIndexFile;
