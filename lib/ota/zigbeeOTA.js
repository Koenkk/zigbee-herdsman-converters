const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const assert = require('assert');
const common = require('./common');
const axios = common.getAxios();

/**
 * Helper functions
 */

async function getImageMeta(current, logger, device) {
    const modelId = device.modelID;
    const imageType = current.imageType;
    const manufacturerCode = current.manufacturerCode;
    const images = (await axios.get(url)).data;

    // NOTE: Officially an image can be determined with a combination of manufacturerCode and imageType.
    // However Gledopto pro products use the same imageType (0) for every device while the image is different.
    // For this case additional identification through the modelId is done.
    const image = images.find((i) => i.imageType === imageType && i.manufacturerCode === manufacturerCode &&
        (!i.modelId || i.modelId === modelId));

    assert(image !== undefined, `No image available for imageType '${imageType}'`);
    return {
        fileVersion: image.fileVersion,
        fileSize: image.fileSize,
        url: image.url,
        sha512: image.sha512,
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
    getImageMeta,
    isUpdateAvailable,
    updateToLatest,
};
