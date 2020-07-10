const upgradeFileIdentifier = Buffer.from([0x1E, 0xF1, 0xEE, 0x0B]);
const HttpsProxyAgent = require('https-proxy-agent');
const assert = require('assert');
const maxTimeout = 2147483647; // +- 24 days
const imageBlockResponseDelay = 250;
const endRequestCodeLookup = {
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

function getOTAEndpoint(device) {
    return device.endpoints.find((e) => e.supportsOutputCluster('genOta'));
}

function parseSubElement(buffer, position) {
    const tagID = buffer.readUInt16LE(position);
    const length = buffer.readUInt32LE(position + 2);
    const data = buffer.slice(position + 6, position + 6 + length);
    return {tagID, length, data};
}

function parseImage(buffer) {
    const header = {
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

function cancelWaiters(waiters) {
    for (const waiter of Object.values(waiters)) {
        if (waiter) {
            waiter.cancel();
        }
    }
}

function sendQueryNextImageResponse(endpoint, image, logger) {
    const payload = {
        status: 0,
        manufacturerCode: image.header.manufacturerCode,
        imageType: image.header.imageType,
        fileVersion: image.header.fileVersion,
        imageSize: image.header.totalImageSize,
    };

    endpoint.commandResponse('genOta', 'queryNextImageResponse', payload).catch((e) => {
        logger.debug(`Failed to send queryNextImageResponse (${e.message})`);
    });
}

function imageNotify(endpoint) {
    return endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 100});
}

async function requestOTA(endpoint) {
    // Some devices (e.g. Insta) take very long trying to discover the correct coordinator EP for OTA.
    const queryNextImageRequest = endpoint.waitForCommand('genOta', 'queryNextImageRequest', null, 30000);
    try {
        await imageNotify(endpoint);
        return await queryNextImageRequest.promise;
    } catch (e) {
        queryNextImageRequest.cancel();
        throw new Error(`Device didn't respond to OTA request`);
    }
}

function getImageBlockResponsePayload(image, imageBlockRequest, pageOffset, pageSize) {
    const start = imageBlockRequest.payload.fileOffset + pageOffset;
    // When the data size is too big, OTA gets unstable, so default it to 50 bytes maximum.
    // For Insta devices, OTA only works for data sizes 40 and smaller (= manufacturerCode 4474).
    const maximumDataSize = imageBlockRequest.payload.manufacturerCode === 4474 ? 40 : 50;
    let dataSize = Math.min(maximumDataSize, imageBlockRequest.payload.maximumDataSize);
    if (pageSize) {
        dataSize = Math.min(dataSize, pageSize - pageOffset);
    }
    let end = start + dataSize;
    if (end > image.raw.length) {
        end = image.raw.length;
    }

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

function callOnProgress(startTime, lastUpdate, imageBlockRequest, image, logger, onProgress) {
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

async function isUpdateAvailable(device, logger, isNewImageAvailable, requestPayload, getImageMeta = null) {
    logger.debug(`Check if update available for '${device.ieeeAddr}' (${device.modelID})`);

    if (requestPayload === null) {
        const endpoint = getOTAEndpoint(device);
        assert(endpoint !== null, `Failed to find endpoint which support OTA cluster`);
        logger.debug(`Using endpoint '${endpoint.ID}'`);

        const request = await requestOTA(endpoint);
        logger.debug(`Got OTA request '${JSON.stringify(request.payload)}'`);
        requestPayload = request.payload;
    }

    const available = await isNewImageAvailable(requestPayload, logger, device, getImageMeta);
    logger.debug(`Update available for '${device.ieeeAddr}': ${available < 0 ? 'YES' : 'NO'}`);
    if (available > 0) {
        logger.warn(`Firmware on '${device.ieeeAddr}' is newer than latest firmware online.`);
    }
    return (available < 0);
}

async function isNewImageAvailable(current, logger, device, getImageMeta) {
    const meta = await getImageMeta(current, logger, device);
    const [currentS, metaS] = [JSON.stringify(current), JSON.stringify(meta)];
    logger.debug(`Is new image available for '${device.ieeeAddr}', current '${currentS}', latest meta '${metaS}'`);
    return Math.sign(current.fileVersion - meta.fileVersion);
}

async function updateToLatest(device, logger, onProgress, getNewImage, getImageMeta = null, downloadImage = null) {
    logger.debug(`Updating to latest '${device.ieeeAddr}' (${device.modelID})`);

    const endpoint = getOTAEndpoint(device);
    assert(endpoint !== null, `Failed to find endpoint which support OTA cluster`);
    logger.debug(`Using endpoint '${endpoint.ID}'`);

    const request = await requestOTA(endpoint);
    logger.debug(`Got OTA request '${JSON.stringify(request.payload)}'`);

    const image = await getNewImage(request.payload, logger, device, getImageMeta, downloadImage);
    logger.debug(`Got new image for '${device.ieeeAddr}'`);

    const waiters = {};
    let lastUpdate = null;
    let lastImageBlockResponse = null;
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

                    const sendImageBlockResponse = (imageBlockRequest, thenCallback, transactionSequenceNumber) => {
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
                                    logger.debug(`Image block response failed (${e.message})`);
                                },
                            );
                        }, cooldownTime);

                        lastUpdate = callOnProgress(startTime, lastUpdate, imageBlockRequest, image, logger,
                            onProgress);
                    };

                    if ('pageSize' in imageBlockOrPageRequest.payload) {
                        // imagePageRequest
                        pageSize = imageBlockOrPageRequest.payload.pageSize;
                        const handleImagePageRequestBlocks = (imagePageRequest) => {
                            if (pageOffset < pageSize) {
                                sendImageBlockResponse(imagePageRequest,
                                    () => handleImagePageRequestBlocks(imagePageRequest));
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
            waiters.nextImageRequest.promise.then(() => {
                answerNextImageRequest();
                sendQueryNextImageResponse(endpoint, image, logger);
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

                endpoint.commandResponse('genOta', 'upgradeEndResponse', payload).then(
                    () => {
                        logger.debug(`Update succeeded, waiting for device to restart`);
                        setTimeout(() => {
                            onProgress(100, null);
                            resolve();
                        }, 90 * 1000);
                    },
                    (e) => {
                        const message = `Upgrade end reponse failed (${e.message})`;
                        logger.debug(message);
                        reject(new Error(message));
                    },
                );
            } else {
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

async function getNewImage(current, logger, device, getImageMeta, downloadImage) {
    const meta = await getImageMeta(current, logger, device);
    logger.debug(`getNewImage for '${device.ieeeAddr}', meta ${JSON.stringify(meta)}`);
    assert(meta.fileVersion > current.fileVersion, 'No new image available');

    const download = downloadImage ? await downloadImage(meta, logger) :
        await getAxios().get(meta.url, {responseType: 'arraybuffer'});

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
    return image;
}

function getAxios() {
    let config = {};
    const proxy = process.env.HTTPS_PROXY;
    if (proxy) {
        config = {
            proxy: false,
            httpsAgent: new HttpsProxyAgent(proxy),
        };
    }

    const axios = require('axios').create(config);
    return axios;
}

module.exports = {
    upgradeFileIdentifier,
    isUpdateAvailable,
    parseImage,
    isNewImageAvailable,
    updateToLatest,
    getNewImage,
    getAxios,
};
