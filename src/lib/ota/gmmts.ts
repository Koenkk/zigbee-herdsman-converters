import {Zh, Ota} from '../types';
import * as common from './common';
import {logger} from '../logger';
const axios = common.getAxios();

const firmwareManifest = 'https://update.gammatroniques.fr/ticmeter/manifest.json';

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.info(`GMMTS OTA: call getImageMeta for ${device.modelID}`, 'TICMeter');
    const {data: releases} = await axios.get(firmwareManifest);

    if (!releases.builds) {
        throw new Error(`GMMTS OTA: No builds available for ${device.modelID}`);
    }

    const appUrl: { path: string, offset: number, type: string, ota: string } | undefined =
     releases.builds[0].parts.find((part: { type: string }) => part.type === 'app');

    logger.info(`GMMTS OTA: Using firmware file ` + appUrl.path + ` for ${device.modelID}`, 'TICMeter');
    const image = common.parseImage((await common.getAxios().get(appUrl.ota, {responseType: 'arraybuffer'})).data);

    const ret = {
        fileVersion: image.header.fileVersion,
        fileSize: image.header.totalImageSize,
        url: appUrl.ota,
    };

    logger.debug(`GMMTS OTA: Image header  ${JSON.stringify(image.header)}`, 'TICMeter');
    logger.info(`GMMTS OTA: Image metadata for ${device.modelID}: ${JSON.stringify(ret)}`, 'TICMeter');

    return ret;
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
