const firmwareOrigin = 'https://api.github.com/repos/fairecasoimeme/Zlinky_TIC/releases';
import assert from 'assert';
import common from './common';
const axios = common.getAxios();

/**
 * Helper functions
 */

export async function getImageMeta(current: ota.Version, logger: Logger, device: zh.Device) {
    const manufacturerCode = current.manufacturerCode;
    const imageType = current.imageType;
    const releasesLIST = (await axios.get(firmwareOrigin)).data;

    let firmURL;

    // Find the most recent OTA file available
    for (const e of releasesLIST.sort((a: KeyValueAny, b: KeyValueAny) => a.published_at - a.published_at)) {
        if (e.assets) {
            const targetObj = e.assets.find((a: KeyValueAny) => a.name.endsWith('.ota'));
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

async function isUpdateAvailable(device: zh.Device, logger: Logger, requestPayload:KeyValue=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, getImageMeta);
}

async function updateToLatest(device: zh.Device, logger: Logger, onProgress: ota.OnProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta);
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
