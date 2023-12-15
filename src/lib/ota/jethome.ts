const baseurl = 'https://fw.jethome.ru';
const deviceurl = baseurl + '/api/devices/';
import * as common from './common';
import {Logger, Zh, Ota, KeyValueAny} from '../types';
const axios = common.getAxios();
import fs from 'fs';
import path from 'path';

let overrideIndexFileName: string = null;
let dataDir: string = null;

/**
 * Helper functions
 */


function isValidUrl(url: string) {
    let parsed;
    try {
        parsed = URI.parse(url);
    } catch (_) {
        return false;
    }
    return parsed.scheme === 'http' || parsed.scheme === 'https';
}

function readLocalFile(fileName: string, logger: Logger) {
    logger.debug(`JetHomeOTA: call readLocalFile`);
    // If the file name is not a full path, then treat it as a relative to the data directory
    if (!path.isAbsolute(fileName) && dataDir) {
        fileName = path.join(dataDir, fileName);
    }

    logger.debug(`JetHomeOTA: getting local firmware file ${fileName}`);
    return fs.readFileSync(fileName);
}

async function getFirmwareFile(image: KeyValueAny, logger: Logger) {
    const urlOrName = image.url;

    // First try to download firmware file with the URL provided
    if (isValidUrl(urlOrName)) {
        logger.debug(`JetHomeOTA: downloading firmware image from ${urlOrName}`);
        return await axios.get(urlOrName, {responseType: 'arraybuffer'});
    }

    return {data: readLocalFile(urlOrName, logger)};
}

async function getIndex(logger: Logger, modelId: string) {
    if (overrideIndexFileName) {
        logger.debug(`JetHomeOTA: Loading override index ${overrideIndexFileName}`);
        if (isValidUrl(overrideIndexFileName)) {
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
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta, getFirmwareFile);
}

export const useIndexOverride = (indexFileName: string) => {
    overrideIndexFileName = indexFileName;
};
export const setDataDir = (dir: string) => {
    dataDir = dir;
};

exports.getImageMeta = getImageMeta;
exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
exports.useIndexOverride = useIndexOverride;
exports.setDataDir = setDataDir;
