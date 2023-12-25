const baseurl = 'https://fw.jethome.ru';
const deviceurl = baseurl + '/api/devices/';
import * as common from './common';
import {Logger, Zh, Ota, KeyValueAny} from '../types';
const axios = common.getAxios();
import fs from 'fs';

let overrideIndexFileName: string = null;

/**
 * Helper functions
 */

async function getIndex(logger: Logger, modelId: string) {
    if (overrideIndexFileName) {
        logger.debug(`JetHomeOTA: Loading override index ${overrideIndexFileName}`);
        if (common.isValidUrl(overrideIndexFileName)) {
            const index = (await axios.get(overrideIndexFileName)).data;
            return index;
        }
        const index = JSON.parse(fs.readFileSync(overrideIndexFileName, 'utf-8'));
        return index;
    } else {
        const index = (await axios.get(deviceurl + modelId + '/info')).data;
        logger.debug(`JetHomeOTA: downloaded index for ${modelId}`);
        return index;
    }
}

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    const modelId = device.modelID;
    const imageType = current.imageType;
    logger.debug(`JetHomeOTA: call getImageMeta for ${modelId}`);
    const images = await getIndex(logger, modelId);
    // we need to return the latest_firmware.release.urls.zigbee.ota
    const jetimage = images.latest_firmware.release.images['zigbee.ota'];

    if (!jetimage) {
        throw new Error(`No image available for imageType '${imageType}'`);
    }
    logger.debug('JetHomeOTA: ver: ' + images.latest_firmware.release.version + ' size: ' + jetimage.filesize + ' url: ' + baseurl + jetimage.url);
    return {
        fileVersion: Number(images.latest_firmware.release.version),
        fileSize: jetimage.filesize,
        url: baseurl + jetimage.url,
    };
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta, common.getFirmwareFile);
}

export const useIndexOverride = (indexFileName: string) => {
    overrideIndexFileName = indexFileName;
};

exports.getImageMeta = getImageMeta;
exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
exports.useIndexOverride = useIndexOverride;
