const productionURL = 'http://fw.ota.homesmart.ikea.net/feed/version_info.json';
const testURL = 'http://fw.test.ota.homesmart.ikea.net/feed/version_info.json';
const assert = require('assert');
const common = require('./common');
const axios = common.getAxios();
let useTestURL = false;

/**
 * Helper functions
 */

async function getImageMeta(current, logger, device) {
    const url = useTestURL ? testURL : productionURL;
    const imageType = current.imageType;
    const images = (await axios.get(url)).data;
    const image = images.find((i) => i.fw_image_type === imageType);
    assert(image !== undefined, `No image available for imageType '${imageType}'`);
    return {
        fileVersion: (image.fw_file_version_MSB << 16) | image.fw_file_version_LSB,
        url: image.fw_binary_url,
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
    useTestURL: () => {
        useTestURL = true;
    },
};
