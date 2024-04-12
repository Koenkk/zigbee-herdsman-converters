const firmwareHtmlPageUrl = 'http://fwu.ubisys.de/smarthome/OTA/release/index';
const imageRegex = /10F2-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{8})\S*ota1?\.zigbee/gi;
import url from 'url';
import * as common from './common';
import {Ota, Zh} from '../types';
import {logger} from '../logger';

const NS = 'zhc:ota:ubisys';
const axios = common.getAxios();

/**
 * Ubisys switched firmware format when the switched to their newer
 *  `Ubisys Compact7B Stack` (I think it was 7B, could have bene earlier)
 *
 * Their firmware index lists a *.ota1.zigbee firmware for those devices that
 *  is in the old firmware format that will update the device to use the new
 *  format. The matching logisch seems to generally work, however as reported in
 *  Koenkk/zigbee-OTA#329 there still seems to be a bug lurking somewhere.
 */

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`Call getImageMeta for ${device.modelID}`, NS);
    const {status, data: pageHtml} = await axios.get(firmwareHtmlPageUrl, {maxContentLength: -1});

    if (status !== 200 || !pageHtml?.length) {
        throw new Error(`UbisysOTA: Error getting firmware page at ${firmwareHtmlPageUrl}`);
    }

    logger.debug(`Got firmware page, status: ${status}, data.length: ${pageHtml.length}`, NS);

    imageRegex.lastIndex = 0; // reset (global) regex for next exec to match from the beginning again
    let imageMatch = imageRegex.exec(pageHtml);
    let highestMatch = null;

    while (imageMatch != null) {
        logger.debug(`Image found: ${imageMatch[0]}`, NS);
        if (parseInt(imageMatch[1], 16) === current.imageType &&
            parseInt(imageMatch[2], 16) <= device.hardwareVersion && device.hardwareVersion <= parseInt(imageMatch[3], 16)) {
            if (highestMatch === null || parseInt(highestMatch[4], 16) < parseInt(imageMatch[4], 16)) {
                highestMatch = imageMatch;
            }
        }
        imageMatch = imageRegex.exec(pageHtml);
    }

    if (!highestMatch) {
        return null;
    }

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

export async function isUpdateAvailable(device: Zh.Device, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, onProgress, common.getNewImage, getImageMeta);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
