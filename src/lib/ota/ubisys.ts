const firmwareHtmlPageUrl = 'http://fwu.ubisys.de/smarthome/OTA/release/index';
const imageRegex = /10F2-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{8})\S*ota1?\.zigbee/gi;
import assert from 'assert';
import url from 'url';
import * as common from './common';
import {Ota, Logger, Zh} from '../types';
const axios = common.getAxios();

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    const imageType = current.imageType;
    const hardwareVersion = device.hardwareVersion;

    const firmwarePage = await axios.get(firmwareHtmlPageUrl);
    logger.debug(
        `OTA ubisys: got firmware page, status: ${firmwarePage.status}, data.length: ${firmwarePage.data.length}`);
    assert(firmwarePage.status === 200, `HTTP Error getting ubisys firmware page`);
    const firmwarePageHtml = firmwarePage.data;

    imageRegex.lastIndex = 0; // reset (global) regex for next exec to match from the beginning again
    let imageMatch = imageRegex.exec(firmwarePageHtml);
    let highestMatch = null;
    while (imageMatch != null) {
        logger.debug(`OTA ubisys: image found: ${imageMatch[0]}`);
        if (parseInt(imageMatch[1], 16) === imageType &&
            parseInt(imageMatch[2], 16) <= hardwareVersion && hardwareVersion <= parseInt(imageMatch[3], 16)) {
            if (highestMatch === null || parseInt(highestMatch[4], 16) < parseInt(imageMatch[4], 16)) {
                highestMatch = imageMatch;
            }
        }
        imageMatch = imageRegex.exec(firmwarePageHtml);
    }
    assert(highestMatch !== null,
        `No image available for imageType '0x${imageType.toString(16)}' with hardware version ${hardwareVersion}`);

    return {
        hardwareVersionMin: parseInt(highestMatch[2], 16),
        hardwareVersionMax: parseInt(highestMatch[3], 16),
        fileVersion: parseInt(highestMatch[4], 16),
        url: url.resolve(firmwareHtmlPageUrl, highestMatch[0]),
    };
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
