const axios = require('axios');
const updateCheckUrl = 'https://api.update.ledvance.com/v1/zigbee/firmwares/newer';
const updateDownloadUrl = 'https://api.update.ledvance.com/v1/zigbee/firmwares/download';
const assert = require('assert');
const common = require('./common');

/**
 * Helper functions
 */

async function getImageMeta(manufacturerCode, imageType) {
    const {data} = await axios.get(updateCheckUrl +
        `?company=${manufacturerCode}&product=${imageType}&version=0.0.0`);

    assert(data && data.firmwares && data.firmwares.length > 0,
        `No image available for manufacturerCode '${manufacturerCode}' imageType '${imageType}'`);

    const {identity, fullName, length} = data.firmwares[0];

    const fileVersionMatch = /\/(\d+)\//.exec(fullName);
    const fileVersion = parseInt(`0x${fileVersionMatch[1]}`, 16);

    const versionString = `${identity.version.major}.${identity.version.minor}.${identity.version.build}`;

    return {
        fileVersion,
        fileSize: length,
        url: updateDownloadUrl +
            `?company=${identity.company}&product=${identity.product}&version=${versionString}`,
    };
}

async function getNewImage(current, logger, device) {
    const meta = await getImageMeta(current.manufacturerCode, current.imageType);
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
    const meta = await getImageMeta(current.manufacturerCode, current.imageType);
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
