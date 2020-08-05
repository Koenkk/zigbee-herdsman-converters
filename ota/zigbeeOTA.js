const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const assert = require('assert');
const common = require('./common');
const axios = common.getAxios();

/**
 * Helper functions
 */

async function getImageMeta(current, logger, device) {
    const imageType = current.imageType;
    const manufacturerCode = current.manufacturerCode;
    const images = (await axios.get(url)).data;
    const image = images.find((i) => i.imageType === imageType && i.manufacturerCode === manufacturerCode);
    assert(image !== undefined, `No image available for imageType '${imageType}'`);
    return {
        fileVersion: image.fileVersion,
        fileSize: image.fileSize,
        url: image.url,
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
