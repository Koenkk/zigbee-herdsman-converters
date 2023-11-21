import crypto from 'crypto';
import {HttpsProxyAgent} from 'https-proxy-agent';
import {Zh, Ota, Logger, KeyValueAny, KeyValue, KeyValueNumberString} from '../types';
import assert from 'assert';
import crc32 from 'buffer-crc32';
import axios from 'axios';
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
type IsNewImageAvailable = (current: Ota.ImageInfo, logger: Logger, device: Zh.Device, getImageMeta: Ota.GetImageMeta) =>
    Promise<{available: number, currentFileVersion: number, otaFileVersion: number}>
type DownloadImage = (meta: Ota.ImageMeta, logger: Logger) => Promise<{data: Buffer}>;
type GetNewImage = (current: Ota.Version, logger: Logger, device: Zh.Device, getImageMeta: Ota.GetImageMeta, downloadImage: DownloadImage)
    => Promise<Ota.Image>;

const validSilabsCrc = 0x2144DF1C;

const eblTagHeader = 0x0;
const eblTagEncHeader = 0xfb05;
const eblTagEnd = 0xfc04;
const eblPadding = 0xff;
const eblImageSignature = 0xe350;

const gblTagHeader = 0xeb17a603;
const gblTagEnd = 0xfc0404fc;

function getOTAEndpoint(device: Zh.Device) {
    return device.endpoints.find((e) => e.supportsOutputCluster('genOta'));
}

function parseSubElement(buffer: Buffer, position: number): Ota.ImageElement {
    const tagID = buffer.readUInt16LE(position);
    const length = buffer.readUInt32LE(position + 2);
    const data = buffer.slice(position + 6, position + 6 + length);
    return {tagID, length, data};
}

export function parseImage(buffer: Buffer): Ota.Image {
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

    assert(Buffer.compare(header.otaUpgradeFileIdentifier, upgradeFileIdentifier) === 0, 'Not an OTA file');

    let position = header.otaHeaderLength;
    const elements = [];
    while (position < header.totalImageSize) {
        const element = parseSubElement(buffer, position);
        elements.push(element);
        position += element.data.length + 6;
    }

    assert(position === header.totalImageSize, 'Size mismatch');
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

    throw new Error(`Image is truncated: not long enough to contain a valid tag`);
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

    throw new Error(`Image is truncated: not long enough to contain a valid tag`);
}

function cancelWaiters(waiters: Waiters) {
    for (const waiter of Object.values(waiters)) {
        if (waiter) {
            waiter.cancel();
        }
    }
}

function sendQueryNextImageResponse(endpoint: Zh.Endpoint, image: Ota.Image, requestTransactionSequenceNumber: number, logger: Logger) {
    const payload = {
        status: 0,
        manufacturerCode: image.header.manufacturerCode,
        imageType: image.header.imageType,
        fileVersion: image.header.fileVersion,
        imageSize: image.header.totalImageSize,
    };

    endpoint.commandResponse('genOta', 'queryNextImageResponse', payload, null, requestTransactionSequenceNumber).catch((e) => {
        logger.debug(`Failed to send queryNextImageResponse (${e.message})`);
    });
}

function imageNotify(endpoint: Zh.Endpoint) {
    return endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 100}, {sendWhen: 'immediate'});
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
        throw new Error(`Device didn't respond to OTA request`);
    }
}

function getImageBlockResponsePayload(image: Ota.Image, imageBlockRequest: KeyValueAny, pageOffset: number, pageSize: number, logger: Logger) {
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
        logger.info(`Detected Legrand firmware issue, attempting to reset the OTA stack`);
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

    logger.debug(`Request offsets:` +
                ` fileOffset=${imageBlockRequest.payload.fileOffset}` +
                ` pageOffset=${pageOffset}` +
                ` dataSize=${imageBlockRequest.payload.maximumDataSize}`);
    logger.debug(`Payload offsets: start=${start} end=${end} dataSize=${dataSize}`);

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
    image: Ota.Image, logger: Logger, onProgress: Ota.OnProgress) {
    const now = Date.now();

    // Call on progress every +- 30 seconds
    if (lastUpdate === null || (now - lastUpdate) > 30000) {
        const totalDuration = (now - startTime) / 1000; // in seconds
        const bytesPerSecond = imageBlockRequest.payload.fileOffset / totalDuration;
        const remaining = (image.header.totalImageSize - imageBlockRequest.payload.fileOffset) / bytesPerSecond;
        let percentage = imageBlockRequest.payload.fileOffset / image.header.totalImageSize;
        percentage = Math.round(percentage * 10000) / 100;
        logger.debug(`OTA update at ${percentage}%, remaining ${remaining} seconds`);
        onProgress(percentage, remaining === Infinity ? null : remaining);
        return now;
    } else {
        return lastUpdate;
    }
}

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, isNewImageAvailable: IsNewImageAvailable, requestPayload: Ota.ImageInfo,
    getImageMeta: Ota.GetImageMeta = null) {
    logger.debug(`Check if update available for '${device.ieeeAddr}' (${device.modelID})`);

    if (requestPayload === null) {
        const endpoint = getOTAEndpoint(device);
        assert(endpoint != null, `Failed to find endpoint which support OTA cluster`);
        logger.debug(`Using endpoint '${endpoint.ID}'`);

        const request = await requestOTA(endpoint);
        logger.debug(`Got OTA request '${JSON.stringify(request.payload)}'`);
        requestPayload = request.payload;
    }

    const availableResult = await isNewImageAvailable(requestPayload, logger, device, getImageMeta);
    logger.debug(`Update available for '${device.ieeeAddr}': ${availableResult.available < 0 ? 'YES' : 'NO'}`);
    if (availableResult.available > 0) {
        logger.warn(`Firmware on '${device.ieeeAddr}' is newer than latest firmware online.`);
    }
    return {...availableResult, available: availableResult.available < 0};
}

export async function isNewImageAvailable(current: Ota.ImageInfo, logger: Logger, device: Zh.Device, getImageMeta: Ota.GetImageMeta) {
    const meta = await getImageMeta(current, logger, device);
    const [currentS, metaS] = [JSON.stringify(current), JSON.stringify(meta)];
    logger.debug(`Is new image available for '${device.ieeeAddr}', current '${currentS}', latest meta '${metaS}'`);

    // Negative number means the new firmware is 'newer' than current one
    return {
        available: meta.force ? -1 : Math.sign(current.fileVersion - meta.fileVersion),
        currentFileVersion: current.fileVersion,
        otaFileVersion: meta.fileVersion,
    };
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress, getNewImage: GetNewImage,
    getImageMeta: Ota.GetImageMeta = null, downloadImage: DownloadImage = null): Promise<number> {
    logger.debug(`Updating to latest '${device.ieeeAddr}' (${device.modelID})`);

    const endpoint = getOTAEndpoint(device);
    assert(endpoint != null, `Failed to find endpoint which support OTA cluster`);
    logger.debug(`Using endpoint '${endpoint.ID}'`);

    const request = await requestOTA(endpoint);
    logger.debug(`Got OTA request '${JSON.stringify(request.payload)}'`);

    const image = await getNewImage(request.payload, logger, device, getImageMeta, downloadImage);
    logger.debug(`Got new image for '${device.ieeeAddr}'`);

    const waiters: Waiters = {};
    let lastUpdate: number = null;
    let lastImageBlockResponse: number = null;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        const answerNextImageBlockOrPageRequest = () => {
            const imageBlockRequest = endpoint.waitForCommand('genOta', 'imageBlockRequest', null, 150000);
            const imagePageRequest = endpoint.waitForCommand('genOta', 'imagePageRequest', null, 150000);
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
                        const payload = getImageBlockResponsePayload(image, imageBlockRequest, pageOffset, pageSize, logger);
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
                                    logger.debug(`Image block response failed (${e.message})`);
                                },
                            );
                        }, cooldownTime);

                        lastUpdate = callOnProgress(startTime, lastUpdate, imageBlockRequest, image, logger,
                            onProgress);
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
                    reject(new Error('Timeout: device did not request any image blocks'));
                },
            );
        };

        const answerNextImageRequest = () => {
            waiters.nextImageRequest = endpoint.waitForCommand('genOta', 'queryNextImageRequest', null, maxTimeout);
            waiters.nextImageRequest.promise.then((payload) => {
                answerNextImageRequest();
                sendQueryNextImageResponse(endpoint, image, payload.header.transactionSequenceNumber, logger);
            });
        };

        // No need to timeout here, will already be done in answerNextImageBlockRequest
        waiters.upgradeEndRequest = endpoint.waitForCommand('genOta', 'upgradeEndRequest', null, maxTimeout);
        waiters.upgradeEndRequest.promise.then((data) => {
            logger.debug(`Got upgrade end request for '${device.ieeeAddr}': ${JSON.stringify(data.payload)}`);
            cancelWaiters(waiters);

            if (data.payload.status === 0) {
                const payload = {
                    manufacturerCode: image.header.manufacturerCode, imageType: image.header.imageType,
                    fileVersion: image.header.fileVersion, imageSize: image.header.totalImageSize,
                    currentTime: 0, upgradeTime: 1,
                };

                endpoint.commandResponse('genOta', 'upgradeEndResponse', payload, null, data.header.transactionSequenceNumber).then(
                    () => {
                        logger.debug(`Update succeeded, waiting for device announce`);
                        onProgress(100, null);

                        let timer: ReturnType<typeof setTimeout> = null;
                        const cb = () => {
                            logger.debug(`Got device announce or timed out, call resolve`);
                            clearInterval(timer);
                            device.removeListener('deviceAnnounce', cb);
                            resolve(image.header.fileVersion);
                        };
                        timer = setTimeout(cb, 120 * 1000); // timeout after 2 minutes
                        device.once('deviceAnnounce', cb);
                    },
                    (e) => {
                        const message = `Upgrade end response failed (${e.message})`;
                        logger.debug(message);
                        reject(new Error(message));
                    },
                );
            } else {
                // @ts-expect-error
                const error = `Update failed with reason: '${endRequestCodeLookup[data.payload.status]}'`;
                logger.debug(error);
                reject(new Error(error));
            }
        });

        logger.debug('Starting upgrade');
        answerNextImageBlockOrPageRequest();
        answerNextImageRequest();

        // Notify client once more about new image, client should start sending queryNextImageRequest now
        imageNotify(endpoint).catch((e) => logger.debug(`Image notify failed (${e})`));
    });
}

export async function getNewImage(current: Ota.ImageInfo, logger: Logger, device: Zh.Device,
    getImageMeta: Ota.GetImageMeta, downloadImage: DownloadImage): Promise<Ota.Image> {
    const meta = await getImageMeta(current, logger, device);
    logger.debug(`getNewImage for '${device.ieeeAddr}', meta ${JSON.stringify(meta)}`);
    assert(meta.fileVersion > current.fileVersion || meta.force, 'No new image available');

    const download = downloadImage ? await downloadImage(meta, logger) :
        await getAxios().get(meta.url, {responseType: 'arraybuffer'});

    const checksum = (meta.sha512 || meta.sha256);
    if (checksum) {
        const hash = crypto.createHash(meta.sha512 ? 'sha512' : 'sha256');
        hash.update(download.data);
        assert(hash.digest('hex') === checksum, 'File checksum validation failed');
        logger.debug(`OTA update checksum validation succeeded for '${device.ieeeAddr}'`);
    }

    const start = download.data.indexOf(upgradeFileIdentifier);
    const image = parseImage(download.data.slice(start));
    logger.debug(`getNewImage for '${device.ieeeAddr}', image header ${JSON.stringify(image.header)}`);
    assert(image.header.fileVersion === meta.fileVersion, 'File version mismatch');
    assert(!meta.fileSize || image.header.totalImageSize === meta.fileSize, 'Image size mismatch');
    assert(image.header.manufacturerCode === current.manufacturerCode, 'Manufacturer code mismatch');
    assert(image.header.imageType === current.imageType, 'Image type mismatch');
    if ('minimumHardwareVersion' in image.header && 'maximumHardwareVersion' in image.header) {
        assert(image.header.minimumHardwareVersion <= device.hardwareVersion &&
            device.hardwareVersion <= image.header.maximumHardwareVersion, 'Hardware version mismatch');
    }
    validateImageData(image);
    return image;
}

export function getAxios() {
    let config = {};
    const proxy = process.env.HTTPS_PROXY;
    if (proxy) {
        config = {
            proxy: false,
            httpsAgent: new HttpsProxyAgent(proxy),
            headers: {
                'Accept-Encoding': '*',
            },
        };
    }

    return axios.create(config);
}

exports.upgradeFileIdentifier = upgradeFileIdentifier;
exports.isUpdateAvailable = isUpdateAvailable;
exports.parseImage = parseImage;
exports.validateImageData = validateImageData;
exports.isNewImageAvailable = isNewImageAvailable;
exports.updateToLatest = updateToLatest;
exports.getNewImage = getNewImage;
exports.getAxios = getAxios;
