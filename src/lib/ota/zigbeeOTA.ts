const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const caBundleUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/cacerts.pem';
import * as common from './common';
import {Zh, Ota, KeyValueAny} from '../types';
import {logger} from '../logger';

const NS = 'zhc:ota';
const axios = common.getAxios();

let overrideIndexFileName: string = null;

/**
 * Helper functions
 */

function fillImageInfo(meta: KeyValueAny) {
    // Web-hosted images must come with all fields filled already
    if (common.isValidUrl(meta.url)) {
        return meta;
    }

    // Nothing to do if needed fields were filled already
    if (meta.hasOwnProperty('imageType') &&
        meta.hasOwnProperty('manufacturerCode') &&
        meta.hasOwnProperty('fileVersion')) {
        return meta;
    }

    // If no fields provided - get them from the image file
    const buffer = common.readLocalFile(meta.url);
    const start = buffer.indexOf(common.UPGRADE_FILE_IDENTIFIER);
    const image = common.parseImage(buffer.subarray(start));

    // Will fill only those fields that were absent
    if (!meta.hasOwnProperty('imageType')) meta.imageType = image.header.imageType;
    if (!meta.hasOwnProperty('manufacturerCode')) meta.manufacturerCode = image.header.manufacturerCode;
    if (!meta.hasOwnProperty('fileVersion')) meta.fileVersion = image.header.fileVersion;
    return meta;
}

async function getIndex() {
    const {data: mainIndex} = await axios.get(url);

    if (!mainIndex) {
        throw new Error(`ZigbeeOTA: Error getting firmware page at '${url}'`);
    }
    logger.debug(`Downloaded main index`, NS);

    if (overrideIndexFileName) {
        logger.debug(`Loading override index '${overrideIndexFileName}'`, NS);
        const localIndex = await common.getOverrideIndexFile(overrideIndexFileName);

        // Resulting index will have overridden items first
        return localIndex.concat(mainIndex).map((item: KeyValueAny) => common.isValidUrl(item.url) ? item : fillImageInfo(item));
    }
    return mainIndex;
}

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`Getting image metadata for '${device.modelID}'`, NS);
    const images = await getIndex();
    // NOTE: Officially an image can be determined with a combination of manufacturerCode and imageType.
    // However Gledopto pro products use the same imageType (0) for every device while the image is different.
    // For this case additional identification through the modelId is done.
    // In the case of Tuya and Moes, additional identification is carried out through the manufacturerName.
    const image = images.find((i: KeyValueAny) => i.imageType === current.imageType && i.manufacturerCode === current.manufacturerCode &&
        (!i.minFileVersion || current.fileVersion >= i.minFileVersion) && (!i.maxFileVersion || current.fileVersion <= i.maxFileVersion) &&
        (!i.modelId || i.modelId === device.modelID) && (!i.manufacturerName || i.manufacturerName.includes(device.manufacturerName)));

    if (!image) {
        return null;
    }

    return {
        fileVersion: image.fileVersion,
        fileSize: image.fileSize,
        url: image.url,
        sha512: image.sha512,
        force: image.force,
    };
}

async function isNewImageAvailable(current: Ota.ImageInfo, device: Zh.Device, getImageMeta: Ota.GetImageMeta) {
    if (['lumi.airrtc.agl001', 'lumi.curtain.acn003', 'lumi.curtain.agl001'].includes(device.modelID)) {
        // The current.fileVersion which comes from the device is wrong.
        // Use the `lumiFileVersion` which comes from the manuSpecificLumi.attributeReport instead.
        // https://github.com/Koenkk/zigbee2mqtt/issues/16345#issuecomment-1454835056
        // https://github.com/Koenkk/zigbee2mqtt/issues/16345 doesn't seem to be needed for all
        // https://github.com/Koenkk/zigbee2mqtt/issues/15745
        if (device.meta.lumiFileVersion) {
            current = {...current, fileVersion: device.meta.lumiFileVersion};
        }
    }
    return common.isNewImageAvailable(current, device, getImageMeta);
}

export async function getFirmwareFile(image: KeyValueAny) {
    const urlOrName = image.url;

    // First try to download firmware file with the URL provided
    if (common.isValidUrl(urlOrName)) {
        logger.debug(`Downloading firmware image from '${urlOrName}' using the zigbeeOTA custom CA certificates`, NS);
        const otaCaBundle = await common.processCustomCaBundle(caBundleUrl);
        const response = await common.getAxios(otaCaBundle).get(urlOrName, {responseType: 'arraybuffer'});
        return response;
    }

    logger.debug(`Trying to read firmware image from local file '${urlOrName}'`, NS);
    return {data: common.readLocalFile(urlOrName)};
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, requestPayload, isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, onProgress, common.getNewImage, getImageMeta, getFirmwareFile);
}

export const useIndexOverride = (indexFileName: string) => {
    overrideIndexFileName = indexFileName;
};

exports.getImageMeta = getImageMeta;
exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
exports.useIndexOverride = useIndexOverride;
