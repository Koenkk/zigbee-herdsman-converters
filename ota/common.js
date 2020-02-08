const upgradeFileIdentifier = Buffer.from([0x1E, 0xF1, 0xEE, 0x0B]);
const assert = require('assert');

function parseSubElement(buffer, position) {
    const tagID = buffer.readUInt16LE(position);
    const length = buffer.readUInt32LE(position + 2);
    const data = buffer.slice(position + 6, position + 6 + length);
    return {tagID, length, data};
}

function parseOtaImage(buffer) {
    const headerLength = 56;
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

    const raw = buffer.slice(0, header.totalImageSize);

    assert(Buffer.compare(header.otaUpgradeFileIdentifier, upgradeFileIdentifier) === 0, 'Not an OTA file');
    assert(header.otaHeaderFieldControl === 0, 'Non zero field control not implemented yet');

    let remaining = header.totalImageSize - headerLength;
    const elements = [];
    while (remaining !== 0) {
        const element = parseSubElement(buffer, headerLength);
        elements.push(element);
        remaining -= element.data.length + 6;
    }

    assert(remaining === 0, 'Size mismatch');
    return {header, elements, raw};
}

function update(endpoint, logger, otaImage, onProgress) {
    return new Promise((resolve, reject) => {
        let imageBlockRequest = null;
        let lastUpdate = null;
        const waitAndAnswerNextImageBlockRequest = () => {
            imageBlockRequest = endpoint.waitForCommand('genOta', 'imageBlockRequest', null, 60000);
            const fulfilled = (response) => {
                waitAndAnswerNextImageBlockRequest();

                const start = response.payload.fileOffset;
                let end = start + response.payload.maximumDataSize;
                if (end > otaImage.raw.length) {
                    end = otaImage.raw.length;
                }

                endpoint.commandResponse('genOta', 'imageBlockResponse',
                    {
                        status: 0,
                        manufacturerCode: response.payload.manufacturerCode,
                        imageType: response.payload.imageType,
                        fileVersion: response.payload.fileVersion,
                        fileOffset: response.payload.fileOffset,
                        dataSize: end - start,
                        data: otaImage.raw.slice(start, end),
                    },
                    null,
                    response.header.transactionSequenceNumber,
                );

                if (lastUpdate === null || (Date.now() - lastUpdate) > 30000) {
                    let percentage = response.payload.fileOffset / otaImage.header.totalImageSize;
                    percentage = Math.round(percentage * 10000) / 100;
                    logger.debug(`OTA update at ${percentage}%`);
                    onProgress(percentage);
                    lastUpdate = Date.now();
                }
            };

            const rejected = () => {
                reject(new Error('Did not receive imageBlockRequest'));
            };

            imageBlockRequest.promise.then(fulfilled, rejected);
        };

        logger.debug('Starting upgrade');
        waitAndAnswerNextImageBlockRequest();

        const queryNextImageResponse = () => endpoint.commandResponse('genOta', 'queryNextImageResponse',
            {
                status: 0,
                manufacturerCode: otaImage.header.manufacturerCode,
                imageType: otaImage.header.imageType,
                fileVersion: otaImage.header.fileVersion,
                imageSize: otaImage.header.totalImageSize,
            },
        );

        queryNextImageResponse();
        setTimeout(queryNextImageResponse, 5000);

        const upgradeEndRequest = endpoint.waitForCommand('genOta', 'upgradeEndRequest', null, 1000 * 3600);
        const fulfilled = (response) => {
            if (imageBlockRequest) {
                imageBlockRequest.cancel();
            }

            if (response.payload.status === 0) {
                endpoint.commandResponse('genOta', 'upgradeEndResponse',
                    {
                        manufacturerCode: otaImage.header.manufacturerCode,
                        imageType: otaImage.header.imageType,
                        fileVersion: otaImage.header.fileVersion,
                        imageSize: otaImage.header.totalImageSize,
                        currentTime: 0,
                        upgradeTime: 1,
                    },
                );
                logger.debug(`Update succeeded`);
                resolve();
            } else {
                const error = `Update failed with code '${response.payload.status}'`;
                logger.debug(error);
                reject(new Error(error));
            }
        };

        const rejected = () => {
            reject(new Error('Upgrade end request timeout'));
        };

        upgradeEndRequest.promise.then(fulfilled, rejected);
    });
}

module.exports = {
    parseOtaImage,
    upgradeFileIdentifier,
    update,
};
