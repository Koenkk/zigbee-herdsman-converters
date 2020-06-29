const firmwareHtmlPageUrl = 'https://www.ubisys.de/en/support/firmware/';
const imageRegex = /[^"\s]*\/10F2-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{8})\S*ota\.zigbee/gi;
const assert = require('assert');
const url = require('url');
const common = require('./common');
const axios = common.getAxios();

/**
 * Helper functions
 */

async function getImageMeta(current, logger, device) {
    const imageType = current.imageType;
    const hardwareVersion = device.hardwareVersion;

    const firmwarePage = await axios.get(firmwareHtmlPageUrl);
    logger.debug(
        `OTA ubisys: got firmware page, status: ${firmwarePage.status}, data.length: ${firmwarePage.data.length}`);
    assert(firmwarePage.status === 200, `HTTP Error getting ubisys firmware page`);
    const firmwarePageHtml = firmwarePage.data;

    imageRegex.lastIndex = 0; // reset (global) regex for next exec to match from the beginning again
    let imageMatch = imageRegex.exec(firmwarePageHtml);
    while (imageMatch != null) {
        logger.debug(`OTA ubisys: image found: ${imageMatch[0]}`);
        if (parseInt(imageMatch[1], 16) === imageType &&
            parseInt(imageMatch[2], 16) <= hardwareVersion && hardwareVersion <= parseInt(imageMatch[3], 16)) {
            break;
        }
        imageMatch = imageRegex.exec(firmwarePageHtml);
    }
    assert(imageMatch !== null,
        `No image available for imageType '0x${imageType.toString(16)}' with hardware version ${hardwareVersion}`);

    return {
        hardwareVersionMin: parseInt(imageMatch[2], 16),
        hardwareVersionMax: parseInt(imageMatch[3], 16),
        fileVersion: parseInt(imageMatch[4], 16),
        url: url.resolve(firmwareHtmlPageUrl, imageMatch[0]),
    };
}

async function getNewImage(current, logger, device) {
    const meta = await getImageMeta(current, logger, device);
    assert(meta.fileVersion > current.fileVersion, 'No new image available');

    const download = await axios.get(meta.url, {responseType: 'arraybuffer'});
    const start = download.data.indexOf(common.upgradeFileIdentifier);

    const image = common.parseImage(download.data.slice(start));
    assert(image.header.fileVersion === meta.fileVersion, 'File version mismatch');
    assert(image.header.manufacturerCode === 0x10f2, 'Manufacturer code mismatch');
    assert(image.header.imageType === current.imageType, 'Image type mismatch');
    assert(image.header.minimumHardwareVersion <= device.hardwareVersion &&
        device.hardwareVersion <= image.header.maximumHardwareVersion, 'Hardware version mismatch');
    return image;
}

async function isNewImageAvailable(current, logger, device) {
    const meta = await getImageMeta(current, logger, device);
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
