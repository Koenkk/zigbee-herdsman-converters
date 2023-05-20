const firmwareOrigin = 'https://api.github.com/repos/fairecasoimeme/Zlinky_TIC/releases';
const assert = require('assert');
const common = require('./common');
const axios = common.getAxios();

/**
 * Helper functions
 */

async function getImageMeta(current, logger, device) {
    const manufacturerCode = current.manufacturerCode;
    const imageType = current.imageType;
    const releasesLIST = (await axios.get(firmwareOrigin)).data;

    let firmURL;

    // Find the most recent OTA file available
    for (const e of releasesLIST.sort((a, b) => a.published_at - a.published_at)) {
        if (e.assets) {
            const targetObj = e.assets
                .find((a) => a.name.endsWith('.ota'));
            if (targetObj && targetObj.browser_download_url) {
                firmURL = targetObj;
                break;
            }
        }
    }

    assert(firmURL,
        `No image available for manufacturerCode '${manufacturerCode}' imageType '${imageType} on Github repo'`);

    logger.info(`Using firmware file ` + firmURL.name);
    const image = common.parseImage((await common.getAxios().get(firmURL.browser_download_url, {responseType: 'arraybuffer'})).data);

    return {
        fileVersion: image.header.fileVersion,
        fileSize: firmURL.size,
        url: firmURL.browser_download_url,
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
