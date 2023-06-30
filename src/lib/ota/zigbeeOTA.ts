const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
import * as common from './common';
import {Logger, Zh, Ota, KeyValueAny} from '../types';
const axios = common.getAxios();
import fs from 'fs';
import * as URI from 'uri-js';
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

async function getIndexFile(urlOrName: string) {
    if (isValidUrl(urlOrName)) {
        return (await axios.get(urlOrName)).data;
    }

    return JSON.parse(fs.readFileSync(urlOrName, 'utf-8'));
}

function readLocalFile(fileName: string, logger: Logger) {
    // If the file name is not a full path, then treat it as a relative to the data directory
    if (!path.isAbsolute(fileName) && dataDir) {
        fileName = path.join(dataDir, fileName);
    }

    logger.debug(`ZigbeeOTA: getting local firmware file ${fileName}`);
    return fs.readFileSync(fileName);
}

async function getFirmwareFile(image: KeyValueAny, logger: Logger) {
    const urlOrName = image.url;

    // First try to download firmware file with the URL provided
    if (isValidUrl(urlOrName)) {
        logger.debug(`ZigbeeOTA: downloading firmware image from ${urlOrName}`);
        return await axios.get(urlOrName, {responseType: 'arraybuffer'});
    }

    return {data: readLocalFile(urlOrName, logger)};
}

function fillImageInfo(meta: KeyValueAny, logger: Logger) {
    // Web-hosted images must come with all fields filled already
    if (isValidUrl(meta.url)) {
        return meta;
    }

    // Nothing to do if needed fields were filled already
    if (meta.hasOwnProperty('imageType') &&
        meta.hasOwnProperty('manufacturerCode') &&
        meta.hasOwnProperty('fileVersion')) {
        return meta;
    }

    // If no fields provided - get them from the image file
    const buffer = readLocalFile(meta.url, logger);
    const start = buffer.indexOf(common.upgradeFileIdentifier);
    const image = common.parseImage(buffer.slice(start));

    // Will fill only those fields that were absent
    if (!meta.hasOwnProperty('imageType')) meta.imageType = image.header.imageType;
    if (!meta.hasOwnProperty('manufacturerCode')) meta.manufacturerCode = image.header.manufacturerCode;
    if (!meta.hasOwnProperty('fileVersion')) meta.fileVersion = image.header.fileVersion;
    return meta;
}

async function getIndex(logger: Logger) {
    const index = (await axios.get(url)).data;

    logger.debug(`ZigbeeOTA: downloaded main index`);

    if (overrideIndexFileName) {
        logger.debug(`ZigbeeOTA: Loading override index ${overrideIndexFileName}`);
        const localIndex = await getIndexFile(overrideIndexFileName);

        // Resulting index will have overriden items first
        return localIndex.concat(index).map((item: KeyValueAny) => isValidUrl(item.url) ? item : fillImageInfo(item, logger));
    }

    return index;
}

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    const modelId = device.modelID;
    const imageType = current.imageType;
    const manufacturerCode = current.manufacturerCode;
    const manufacturerName = device.manufacturerName;
    const images = await getIndex(logger);

    // NOTE: Officially an image can be determined with a combination of manufacturerCode and imageType.
    // However Gledopto pro products use the same imageType (0) for every device while the image is different.
    // For this case additional identification through the modelId is done.
    // In the case of Tuya and Moes, additional identification is carried out through the manufacturerName.
    const image = images.find((i: KeyValueAny) => i.imageType === imageType && i.manufacturerCode === manufacturerCode &&
        (!i.minFileVersion || current.fileVersion >= i.minFileVersion) && (!i.maxFileVersion || current.fileVersion <= i.maxFileVersion) &&
        (!i.modelId || i.modelId === modelId) && (!i.manufacturerName || i.manufacturerName.includes(manufacturerName)));

    if (!image) {
        throw new Error(`No image available for imageType '${imageType}'`);
    }

    return {
        fileVersion: image.fileVersion,
        fileSize: image.fileSize,
        url: image.url,
        sha512: image.sha512,
        force: image.force,
    };
}

async function isNewImageAvailable(current: Ota.ImageInfo, logger: Logger, device: Zh.Device, getImageMeta: Ota.GetImageMeta) {
    if (device.modelID === 'lumi.airrtc.agl001') {
        // The current.fileVersion which comes from the device is wrong.
        // Use the `aqaraFileVersion` which comes from the aqaraOpple.attributeReport instead.
        // https://github.com/Koenkk/zigbee2mqtt/issues/16345#issuecomment-1454835056
        // https://github.com/Koenkk/zigbee2mqtt/issues/16345 doesn't seem to be needed for all
        if (device.meta.aqaraFileVersion) {
            current = {...current, fileVersion: device.meta.aqaraFileVersion};
        }
    }

    return common.isNewImageAvailable(current, logger, device, getImageMeta);
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, isNewImageAvailable, requestPayload, getImageMeta);
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
