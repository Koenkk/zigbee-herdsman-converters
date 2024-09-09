import assert from 'assert';
import axios from 'axios';
import crc32 from 'buffer-crc32';
import crypto from 'crypto';
import {readFileSync} from 'fs';
import https from 'https';
import {HttpsProxyAgent} from 'https-proxy-agent';
import path from 'path';
import tls from 'tls';
import * as URI from 'uri-js';
import {Zcl} from 'zigbee-herdsman';

import {logger} from '../logger';
import {Zh, Ota, KeyValueAny, KeyValue, OtaUpdateAvailableResult} from '../types';
import {sleep} from '../utils';

interface Request {
    cancel: () => void;
    promise: Promise<{header: Zh.ZclHeader; payload: KeyValue}>;
}
interface Waiters {
    imageBlockOrPageRequest?: Request;
    upgradeEndRequest?: Request;
}
type CommandResult = {header: Zcl.Header; payload: KeyValueAny};
type IsNewImageAvailable = (
    current: Ota.ImageInfo,
    device: Zh.Device,
    getImageMeta: Ota.GetImageMeta,
) => Promise<{available: number; currentFileVersion: number; otaFileVersion: number}>;
type DownloadImage = (meta: Ota.ImageMeta) => Promise<{data: Buffer}>;
type GetNewImage = (
    current: Ota.Version,
    device: Zh.Device,
    getImageMeta: Ota.GetImageMeta,
    downloadImage: DownloadImage,
    suppressElementImageParseFailure: boolean,
) => Promise<Ota.Image>;
type ImageBlockResponsePayload = {
    status: number;
    manufacturerCode: Zcl.ManufacturerCode;
    imageType: number;
    fileVersion: number;
    fileOffset: number;
    dataSize: number;
    data: Buffer;
};

const NS = 'zhc:ota:common';

let dataDir: string = null;

const MAX_TIMEOUT = 2147483647; // +- 24 days
const IMAGE_BLOCK_RESPONSE_DELAY = 250;
export const UPGRADE_FILE_IDENTIFIER = Buffer.from([0x1e, 0xf1, 0xee, 0x0b]);

const VALID_SILABS_CRC = 0x2144df1c;
const EBL_TAG_HEADER = 0x0;
const EBL_TAG_ENC_HEADER = 0xfb05;
const EBL_TAG_END = 0xfc04;
const EBL_PADDING = 0xff;
const EBL_IMAGE_SIGNATURE = 0xe350;
const GBL_TAG_HEADER = 0xeb17a603;
const GBL_TAG_END = 0xfc0404fc;

// ----
// Helper functions
// ----

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
                        throw new Error(`Get Axios, no scheme or domain`);
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

export function setDataDir(dir: string): void {
    dataDir = dir;
}

export function isValidUrl(url: string): boolean {
    try {
        const parsed = URI.parse(url);

        return parsed.scheme === 'http' || parsed.scheme === 'https';
    } catch {
        return false;
    }
}

export function readLocalFile(fileName: string): Buffer {
    // If the file name is not a full path, then treat it as a relative to the data directory
    if (!path.isAbsolute(fileName) && dataDir) {
        fileName = path.join(dataDir, fileName);
    }

    logger.debug(`Getting local firmware file '${fileName}'`, NS);
    return readFileSync(fileName);
}

export async function getFirmwareFile(image: KeyValueAny): Promise<{data: Buffer}> {
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

        rawCaBundle = readFileSync(uri, {encoding: 'utf-8'});
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
            throw new Error(`Error getting override index file from '${urlOrName}'`);
        }

        return index;
    }

    return JSON.parse(readFileSync(urlOrName, 'utf-8'));
}

// ----
// OTA functions
// ----

function getOTAEndpoint(device: Zh.Device): Zh.Endpoint {
    return device.endpoints.find((e) => e.supportsOutputCluster('genOta'));
}

function parseSubElement(buffer: Buffer, position: number): Ota.ImageElement {
    const tagID = buffer.readUInt16LE(position);
    const length = buffer.readUInt32LE(position + 2);
    const data = buffer.subarray(position + 6, position + 6 + length);
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
    let didSuppressElementImageParseFailure = false;

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

    const raw = buffer.subarray(0, header.totalImageSize);

    assert(UPGRADE_FILE_IDENTIFIER.equals(header.otaUpgradeFileIdentifier), `Not an OTA file`);

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

        didSuppressElementImageParseFailure = true;
        logger.debug('Partially failed to parse the image, continuing anyway...', NS);
    }

    if (!didSuppressElementImageParseFailure) {
        assert(position === header.totalImageSize, `Size mismatch`);
    }

    return {header, elements, raw};
}

export function validateImageData(image: Ota.Image): void {
    for (const element of image.elements) {
        const {data} = element;

        if (data.readUInt32BE(0) === GBL_TAG_HEADER) {
            validateSilabsGbl(data);
        } else {
            const tag = data.readUInt16BE(0);

            if ((tag === EBL_TAG_HEADER && data.readUInt16BE(6) === EBL_IMAGE_SIGNATURE) || tag === EBL_TAG_ENC_HEADER) {
                validateSilabsEbl(data);
            }
        }
    }
}

function validateSilabsEbl(data: Buffer): void {
    const dataLength = data.length;

    let position = 0;

    while (position + 4 <= dataLength) {
        const tag = data.readUInt16BE(position);
        const len = data.readUInt16BE(position + 2);

        position += 4 + len;

        if (tag !== EBL_TAG_END) {
            continue;
        }

        for (let position2 = position; position2 < dataLength; position2++) {
            assert(data.readUInt8(position2) === EBL_PADDING, `Image padding contains invalid bytes`);
        }

        const calculatedCrc32 = crc32.unsigned(data.subarray(0, position));

        assert(calculatedCrc32 === VALID_SILABS_CRC, `Image CRC-32 is invalid`);

        return;
    }

    throw new Error(`Image is truncated, not long enough to contain a valid tag`);
}

function validateSilabsGbl(data: Buffer): void {
    const dataLength = data.length;

    let position = 0;

    while (position + 8 <= dataLength) {
        const tag = data.readUInt32BE(position);
        const len = data.readUInt32LE(position + 4);

        position += 8 + len;

        if (tag !== GBL_TAG_END) {
            continue;
        }

        const calculatedCrc32 = crc32.unsigned(data.subarray(0, position));

        assert(calculatedCrc32 === VALID_SILABS_CRC, `Image CRC-32 is invalid`);

        return;
    }

    throw new Error(`Image is truncated, not long enough to contain a valid tag`);
}

function cancelWaiters(waiters: Waiters): void {
    waiters.imageBlockOrPageRequest?.cancel();
    waiters.upgradeEndRequest?.cancel();
}

async function sendQueryNextImageResponse(endpoint: Zh.Endpoint, image: Ota.Image, requestTransactionSequenceNumber: number): Promise<void> {
    const payload = {
        status: Zcl.Status.SUCCESS,
        manufacturerCode: image.header.manufacturerCode,
        imageType: image.header.imageType,
        fileVersion: image.header.fileVersion,
        imageSize: image.header.totalImageSize,
    };

    try {
        await endpoint.commandResponse('genOta', 'queryNextImageResponse', payload, null, requestTransactionSequenceNumber);
    } catch (error) {
        logger.debug(`Failed to send queryNextImageResponse: ${error}`, NS);
    }
}

async function imageNotify(endpoint: Zh.Endpoint): Promise<void> {
    await endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 100}, {sendPolicy: 'immediate'});
}

async function requestOTA(endpoint: Zh.Endpoint): Promise<[transNum: number, Ota.ImageInfo]> {
    // Some devices (e.g. Insta) take very long trying to discover the correct coordinator EP for OTA.
    const queryNextImageRequest = endpoint.waitForCommand('genOta', 'queryNextImageRequest', null, 60000);

    try {
        await imageNotify(endpoint);
        const response = await queryNextImageRequest.promise;

        return [response.header.transactionSequenceNumber, response.payload as Ota.ImageInfo];
    } catch (e) {
        queryNextImageRequest.cancel();

        throw new Error(`Device didn't respond to OTA request`);
    }
}

function getImageBlockResponsePayload(
    image: Ota.Image,
    imageBlockRequest: CommandResult,
    pageOffset: number,
    pageSize: number,
): ImageBlockResponsePayload {
    let start = imageBlockRequest.payload.fileOffset + pageOffset;
    // When the data size is too big, OTA gets unstable, so default it to 50 bytes maximum.
    // - Insta devices, OTA only works for data sizes 40 and smaller (= manufacturerCode 4474).
    // - Legrand devices (newer firmware) require up to 64 bytes (= manufacturerCode 4129).
    let maximumDataSize = 50;

    if (imageBlockRequest.payload.manufacturerCode === Zcl.ManufacturerCode.INSTA_GMBH) {
        maximumDataSize = 40;
    } else if (imageBlockRequest.payload.manufacturerCode === Zcl.ManufacturerCode.LEGRAND_GROUP) {
        maximumDataSize = Infinity;
    }

    let dataSize = Math.min(maximumDataSize, imageBlockRequest.payload.maximumDataSize);

    // Hack for https://github.com/Koenkk/zigbee-OTA/issues/328 (Legrand OTA not working)
    if (
        imageBlockRequest.payload.manufacturerCode === Zcl.ManufacturerCode.LEGRAND_GROUP &&
        imageBlockRequest.payload.fileOffset === 50 &&
        imageBlockRequest.payload.maximumDataSize === 12
    ) {
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

    logger.debug(
        `Request offsets: fileOffset=${imageBlockRequest.payload.fileOffset} pageOffset=${pageOffset} ` +
            `maximumDataSize=${imageBlockRequest.payload.maximumDataSize}`,
        NS,
    );
    logger.debug(`Payload offsets: start=${start} end=${end} dataSize=${dataSize}`, NS);

    return {
        status: Zcl.Status.SUCCESS,
        manufacturerCode: imageBlockRequest.payload.manufacturerCode,
        imageType: imageBlockRequest.payload.imageType,
        fileVersion: imageBlockRequest.payload.fileVersion,
        fileOffset: start,
        dataSize: end - start,
        data: image.raw.subarray(start, end),
    };
}

function callOnProgress(
    startTime: number,
    lastUpdate: number,
    imageBlockRequest: CommandResult,
    image: Ota.Image,
    onProgress: Ota.OnProgress,
): number {
    const now = Date.now();

    // Call on progress every +- 30 seconds
    if (lastUpdate === null || now - lastUpdate > 30000) {
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

export async function isUpdateAvailable(
    device: Zh.Device,
    requestPayload: Ota.ImageInfo,
    isNewImageAvailable: IsNewImageAvailable = null,
    getImageMeta: Ota.GetImageMeta = null,
): Promise<OtaUpdateAvailableResult> {
    const logId = `'${device.ieeeAddr}' (${device.modelID})`;
    logger.debug(`Checking if an update is available for ${logId}`, NS);

    if (requestPayload == null) {
        const endpoint = getOTAEndpoint(device);
        assert(endpoint != null, `Failed to find an endpoint which supports the OTA cluster for ${logId}`);

        logger.debug(`Using endpoint '${endpoint.ID}'`, NS);

        const [, payload] = await requestOTA(endpoint);

        logger.debug(`Got request '${JSON.stringify(payload)}'`, NS);

        requestPayload = payload;
    }

    const availableResult = await isNewImageAvailable(requestPayload, device, getImageMeta);

    logger.debug(`Update available for ${logId}: ${availableResult.available < 0 ? 'YES' : 'NO'}`, NS);

    if (availableResult.available > 0) {
        logger.warning(`Firmware on ${logId} is newer than latest firmware online.`, NS);
    }

    return {...availableResult, available: availableResult.available < 0};
}

export async function isNewImageAvailable(
    current: Ota.ImageInfo,
    device: Zh.Device,
    getImageMeta: Ota.GetImageMeta,
): ReturnType<IsNewImageAvailable> {
    const currentS = JSON.stringify(current);
    logger.debug(`Is new image available for '${device.ieeeAddr}' (${device.modelID}), current '${currentS}'`, NS);

    const meta = await getImageMeta(current, device);

    // Soft-fail because no images in repo/URL for specified device
    if (!meta) {
        const metaS = `device '${device.modelID}', hardwareVersion '${device.hardwareVersion}', manufacturerName ${device.manufacturerName}`;
        logger.debug(`Images currently unavailable for ${metaS}, ${currentS}'`, NS);

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

/**
 * @see https://zigbeealliance.org/wp-content/uploads/2021/10/07-5123-08-Zigbee-Cluster-Library.pdf 11.12
 */
export async function updateToLatest(
    device: Zh.Device,
    onProgress: Ota.OnProgress,
    getNewImage: GetNewImage,
    getImageMeta: Ota.GetImageMeta = null,
    downloadImage: DownloadImage = null,
    suppressElementImageParseFailure: boolean = false,
): Promise<number> {
    const logId = `'${device.ieeeAddr}' (${device.modelID})`;
    logger.debug(`Updating ${logId} to latest`, NS);

    const endpoint = getOTAEndpoint(device);
    assert(endpoint != null, `Failed to find an endpoint which supports the OTA cluster for ${logId}`);

    logger.debug(`Using endpoint '${endpoint.ID}'`, NS);

    const [transNum, requestPayload] = await requestOTA(endpoint);

    logger.debug(`Got request payload '${JSON.stringify(requestPayload)}'`, NS);

    const image = await getNewImage(requestPayload, device, getImageMeta, downloadImage, suppressElementImageParseFailure);

    logger.debug(`Got new image for ${logId}`, NS);

    // reply to `queryNextImageRequest` in `requestOTA` now that we have the data for it,
    // should trigger image block/page request from device
    await sendQueryNextImageResponse(endpoint, image, transNum);

    const waiters: Waiters = {};
    let lastBlockResponseTime: number = 0;
    let lastUpdate: number = null;
    const startTime = Date.now();
    let ended: boolean = false;

    const sendImageBlockResponse = async (imageBlockRequest: CommandResult, pageOffset: number, pageSize: number): Promise<number> => {
        // Reduce network congestion by throttling response if necessary
        {
            const blockResponseTime = Date.now();
            const delay = blockResponseTime - lastBlockResponseTime;

            if (delay < IMAGE_BLOCK_RESPONSE_DELAY) {
                await sleep(IMAGE_BLOCK_RESPONSE_DELAY - delay);
            }

            lastBlockResponseTime = blockResponseTime;
        }

        try {
            const blockPayload = getImageBlockResponsePayload(image, imageBlockRequest, pageOffset, pageSize);

            await endpoint.commandResponse('genOta', 'imageBlockResponse', blockPayload, null, imageBlockRequest.header.transactionSequenceNumber);

            pageOffset += blockPayload.dataSize;
        } catch (error) {
            // Shit happens, device will probably do a new imageBlockRequest so don't care.
            logger.debug(`Image block response failed: ${error}`, NS);
        }

        lastUpdate = callOnProgress(startTime, lastUpdate, imageBlockRequest, image, onProgress);

        return pageOffset;
    };

    const sendImage = async () => {
        let imageBlockOrPageRequestTimeoutMs: number = 150000;
        // increase the upgradeEndReq wait time to solve the problem of OTA timeout failure of Sonoff Devices
        // (https://github.com/Koenkk/zigbee-herdsman-converters/issues/6657)
        if (requestPayload.manufacturerCode === Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD && requestPayload.imageType == 8199) {
            imageBlockOrPageRequestTimeoutMs = 3600000;
        }

        // Bosch transmits the firmware updates in the background in their native implementation.
        // According to the app, this can take up to 2 days. Therefore, we assume to get at least
        // one package request per hour from the device here.
        if (requestPayload.manufacturerCode == Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH) {
            imageBlockOrPageRequestTimeoutMs = 60 * 60 * 1000;
        }

        // Increase the timeout for Legrand devices, so that they will re-initiate and update themselves
        // Newer firmwares have ackward behaviours when it comes to the handling of the last bytes of OTA updates
        if (requestPayload.manufacturerCode === Zcl.ManufacturerCode.LEGRAND_GROUP) {
            imageBlockOrPageRequestTimeoutMs = 30 * 60 * 1000;
        }

        while (!ended) {
            const imageBlockRequest = endpoint.waitForCommand('genOta', 'imageBlockRequest', null, imageBlockOrPageRequestTimeoutMs);
            const imagePageRequest = endpoint.waitForCommand('genOta', 'imagePageRequest', null, imageBlockOrPageRequestTimeoutMs);
            waiters.imageBlockOrPageRequest = {
                promise: Promise.race([imageBlockRequest.promise, imagePageRequest.promise]),
                cancel: () => {
                    imageBlockRequest.cancel();
                    imagePageRequest.cancel();
                },
            };

            try {
                const result = await waiters.imageBlockOrPageRequest.promise;
                let pageOffset = 0;
                let pageSize = 0;

                if ('pageSize' in result.payload) {
                    // imagePageRequest
                    pageSize = result.payload.pageSize as number;

                    const handleImagePageRequestBlocks = async (imagePageRequest: CommandResult) => {
                        if (pageOffset < pageSize) {
                            pageOffset = await sendImageBlockResponse(imagePageRequest, pageOffset, pageSize);
                            await handleImagePageRequestBlocks(imagePageRequest);
                        }
                    };

                    await handleImagePageRequestBlocks(result);
                } else {
                    // imageBlockRequest
                    pageOffset = await sendImageBlockResponse(result, pageOffset, pageSize);
                }
            } catch (error) {
                cancelWaiters(waiters);
                throw new Error(`Timeout. Device did not start/finish firmware download after being notified. (${error})`);
            }
        }
    };

    // will eventually time out in `sendImage` if this never resolves when it's supposed to
    waiters.upgradeEndRequest = endpoint.waitForCommand('genOta', 'upgradeEndRequest', null, MAX_TIMEOUT);

    logger.debug(`Starting update`, NS);

    // `sendImage` is looping and never resolves, so will only stop before `upgradeEndRequest` resolves if it throws
    await Promise.race([sendImage(), waiters.upgradeEndRequest.promise]);

    cancelWaiters(waiters);

    ended = true;
    // already resolved when this is reached
    const endResult = await waiters.upgradeEndRequest.promise;

    logger.debug(`Got upgrade end request for ${logId}: ${JSON.stringify(endResult.payload)}`, NS);

    if (endResult.payload.status === Zcl.Status.SUCCESS) {
        const payload = {
            manufacturerCode: image.header.manufacturerCode,
            imageType: image.header.imageType,
            fileVersion: image.header.fileVersion,
            currentTime: 0,
            upgradeTime: 1,
        };

        try {
            await endpoint.commandResponse('genOta', 'upgradeEndResponse', payload, null, endResult.header.transactionSequenceNumber);

            logger.debug(`Update successful. Waiting for device announce...`, NS);

            onProgress(100, null);

            let timer: NodeJS.Timeout = null;

            return new Promise<number>((resolve) => {
                const onDeviceAnnounce = () => {
                    clearTimeout(timer);
                    logger.debug(`Received device announce, update finished.`, NS);
                    resolve(image.header.fileVersion);
                };

                // force "finished" after 2 minutes
                timer = setTimeout(() => {
                    device.removeListener('deviceAnnounce', onDeviceAnnounce);
                    logger.debug(`Timed out waiting for device announce, update considered finished.`, NS);
                    resolve(image.header.fileVersion);
                }, 120 * 1000);

                device.once('deviceAnnounce', onDeviceAnnounce);
            });
        } catch (error) {
            throw new Error(`Upgrade end response failed: ${error}`);
        }
    } else {
        /**
         * For other status value received such as INVALID_IMAGE, REQUIRE_MORE_IMAGE, or ABORT,
         * the upgrade server SHALL not send Upgrade End Response command but it SHALL send default
         * response command with status of success and it SHALL wait for the client to reinitiate the upgrade process.
         */
        try {
            await endpoint.defaultResponse(
                Zcl.Clusters.genOta.commands.upgradeEndRequest.ID,
                Zcl.Status.SUCCESS,
                Zcl.Clusters.genOta.ID,
                endResult.header.transactionSequenceNumber,
            );
        } catch (error) {
            logger.debug(`Upgrade end request default response failed: ${error}`, NS);
        }

        throw new Error(`Update failed with reason: '${Zcl.Status[endResult.payload.status as number]}'`);
    }
}

export async function getNewImage(
    current: Ota.ImageInfo,
    device: Zh.Device,
    getImageMeta: Ota.GetImageMeta,
    downloadImage: DownloadImage,
    suppressElementImageParseFailure: boolean,
): Promise<Ota.Image> {
    // TODO: better errors (these are reported in frontend notifies)
    const logId = `'${device.ieeeAddr}' (${device.modelID})`;
    const meta = await getImageMeta(current, device);
    assert(!!meta, `Images for ${logId} currently unavailable`);

    logger.debug(`Getting new image for ${logId}, latest meta ${JSON.stringify(meta)}`, NS);

    assert(meta.fileVersion > current.fileVersion || meta.force, `No new image available`);

    const download = downloadImage ? await downloadImage(meta) : await getAxios().get(meta.url, {responseType: 'arraybuffer'});

    const checksum = meta.sha512 || meta.sha256;

    if (checksum) {
        const hash = crypto.createHash(meta.sha512 ? 'sha512' : 'sha256');
        hash.update(download.data);

        assert(hash.digest('hex') === checksum, `File checksum validation failed`);
        logger.debug(`Update checksum validation succeeded for ${logId}`, NS);
    }

    const start = download.data.indexOf(UPGRADE_FILE_IDENTIFIER);
    const image = parseImage(download.data.slice(start), suppressElementImageParseFailure);

    logger.debug(`Get new image for ${logId}, image header ${JSON.stringify(image.header)}`, NS);

    assert(image.header.fileVersion === meta.fileVersion, `File version mismatch`);
    assert(!meta.fileSize || image.header.totalImageSize === meta.fileSize, `Image size mismatch`);
    assert(image.header.manufacturerCode === current.manufacturerCode, `Manufacturer code mismatch`);
    assert(image.header.imageType === current.imageType, `Image type mismatch`);

    if ('minimumHardwareVersion' in image.header && 'maximumHardwareVersion' in image.header) {
        assert(
            image.header.minimumHardwareVersion <= device.hardwareVersion && device.hardwareVersion <= image.header.maximumHardwareVersion,
            `Hardware version mismatch`,
        );
    }

    validateImageData(image);

    return image;
}

exports.UPGRADE_FILE_IDENTIFIER = UPGRADE_FILE_IDENTIFIER;
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
