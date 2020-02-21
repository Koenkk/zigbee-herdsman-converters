const axios = require('axios');
const url = 'https://fw.ota.homesmart.ikea.net/feed/version_info.json';
const assert = require('assert');
const common = require('./common');

/**
 * Helper functions
 */

async function getImageMeta(imageType) {
    const images = (await axios.get(url)).data;
    const image = images.find((i) => i.fw_image_type === imageType);
    assert(image !== null, `No image available for imageType '${imageType}'`);
    return {
        fileVersion: (image.fw_file_version_MSB << 16) | image.fw_file_version_LSB,
        fileSize: image.fw_filesize,
        url: image.fw_binary_url.replace(/^http:\/\//, 'https://'),
    };
}

async function getNewImage(current, logger, device) {
    const meta = await getImageMeta(current.imageType);
    assert(meta.fileVersion > current.fileVersion, 'No new image available');

    const download = await axios.get(meta.url, {responseType: 'arraybuffer'});
    const start = download.data.indexOf(common.upgradeFileIdentifier);

    const image = common.parseImage(download.data.slice(start));
    assert(image.header.fileVersion === meta.fileVersion, 'File version mismatch');
    assert(image.header.totalImageSize === meta.fileSize, 'Image size mismatch');
    assert(image.header.manufacturerCode === 4476, 'Manufacturer code mismatch');
    assert(image.header.imageType === current.imageType, 'Image type mismatch');
    return image;
}

async function isNewImageAvailable(current, logger, device) {
    const meta = await getImageMeta(current.imageType);
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
