const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const assert = require('assert');
const common = require('./common');
const axios = common.getAxios();

/**
 * Helper functions
 */

async function getImageMeta(imageType, manufacturerCode) {
    const images = (await axios.get(url)).data;
    const image = images.find((i) => i.imageType === imageType && i.manufacturerCode === manufacturerCode);
    assert(image !== undefined, `No image available for imageType '${imageType}'`);
    return {
        fileVersion: image.fileVersion,
        fileSize: image.fileSize,
        url: image.url,
    };
}

async function getNewImage(current, logger, device) {
    const meta = await getImageMeta(current.imageType, current.manufacturerCode);
    assert(meta.fileVersion > current.fileVersion, 'No new image available');

    const download = await axios.get(meta.url, {responseType: 'arraybuffer'});
    const image = common.parseImage(download.data);
    assert(image.header.fileVersion === meta.fileVersion, 'File version mismatch');
    assert(image.header.totalImageSize === meta.fileSize, 'Image size mismatch');
    assert(image.header.manufacturerCode === current.manufacturerCode, 'Manufacturer code mismatch');
    assert(image.header.imageType === current.imageType, 'Image type mismatch');
    return image;
}

async function isNewImageAvailable(current, logger, device) {
    const meta = await getImageMeta(current.imageType, current.manufacturerCode);
    const [currentS, metaS] = [JSON.stringify(current), JSON.stringify(meta)];
    logger.debug(`Is new image available for '${device.ieeeAddr}', current '${currentS}', latest meta '${metaS}'`);
    return Math.sign(current.fileVersion - meta.fileVersion);
}

/**
 * Interface implementation
 */

async function isUpdateAvailable(device, logger, requestPayload=null) {
    return common.isUpdateAvailable(device, logger, isNewImageAvailable, requestPayload);
}

async function updateToLatest(device, logger, onProgress) {
    return common.updateToLatest(device, logger, onProgress, getNewImage);
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
