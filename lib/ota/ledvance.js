const updateCheckUrl = 'https://api.update.ledvance.com/v1/zigbee/firmwares/newer';
const updateDownloadUrl = 'https://api.update.ledvance.com/v1/zigbee/firmwares/download';
const assert = require('assert');
const common = require('./common');
const axios = common.getAxios();

/**
 * Helper functions
 */

async function getImageMeta(current, logger, device) {
    const manufacturerCode = current.manufacturerCode;
    const imageType = current.imageType;
    const {data} = await axios.get(updateCheckUrl +
        `?company=${manufacturerCode}&product=${imageType}&version=0.0.0`);

    assert(data && data.firmwares && data.firmwares.length > 0,
        `No image available for manufacturerCode '${manufacturerCode}' imageType '${imageType}'`);

    // Ledvance's API docs state the checksum should be `sha_256` but it is actually `shA256`
    const {identity, fullName, length, shA256: sha256} = data.firmwares[0];

    const fileVersionMatch = /\/(\d+)\//.exec(fullName);
    const fileVersion = parseInt(`0x${fileVersionMatch[1]}`, 16);

    const versionString = `${identity.version.major}.${identity.version.minor}.${identity.version.build}`;

    return {
        fileVersion,
        fileSize: length,
        url: updateDownloadUrl +
            `?company=${identity.company}&product=${identity.product}&version=${versionString}`,
        sha256,
    };
}

/**
 * Interface implementation
 */

async function isUpdateAvailable(device, logger, requestPayload=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, getImageMeta);
}

async function updateToLatest(device, logger, onProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta);
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
