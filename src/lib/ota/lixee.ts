const firmwareOrigin = 'https://api.github.com/repos/fairecasoimeme/Zlinky_TIC/releases';
import {logger} from '../logger';
import {Zh, Ota, KeyValueAny} from '../types';
import * as common from './common';

const NS = 'zhc:ota:lixee';
const axios = common.getAxios();

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`Call getImageMeta for ${device.modelID}`, NS);
    const {data: releases} = await axios.get(firmwareOrigin);

    if (!releases?.length) {
        throw new Error(`LixeeOTA: Error getting firmware page at ${firmwareOrigin}`);
    }

    let firmURL;

    // Find the most recent OTA file available
    for (const e of releases.sort((a: KeyValueAny, b: KeyValueAny) => a.published_at - a.published_at)) {
        if (e.assets) {
            const targetObj = e.assets.find((a: KeyValueAny) => a.name.endsWith('.ota'));
            if (targetObj && targetObj.browser_download_url) {
                firmURL = targetObj;
                break;
            }
        }
    }

    if (!firmURL) {
        return null;
    }

    logger.info(`Using firmware file ` + firmURL.name, NS);
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

export async function isUpdateAvailable(device: Zh.Device, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, onProgress, common.getNewImage, getImageMeta);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
