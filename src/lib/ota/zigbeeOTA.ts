const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const caBundleUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/cacerts.pem';
import * as common from './common';
import {Logger, Zh, Ota, KeyValueAny} from '../types';
const axios = common.getAxios();

let overrideIndexFileName: string = null;

/**
 * Helper functions
 */

function fillImageInfo(meta: KeyValueAny, logger: Logger) {
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
    const buffer = common.readLocalFile(meta.url, logger);
    const start = buffer.indexOf(common.upgradeFileIdentifier);
    const image = common.parseImage(buffer.slice(start));

    // Will fill only those fields that were absent
    if (!meta.hasOwnProperty('imageType')) meta.imageType = image.header.imageType;
    if (!meta.hasOwnProperty('manufacturerCode')) meta.manufacturerCode = image.header.manufacturerCode;
    if (!meta.hasOwnProperty('fileVersion')) meta.fileVersion = image.header.fileVersion;
    return meta;
}

async function getIndex(logger: Logger) {
    const {data: mainIndex} = await axios.get(url);

    if (!mainIndex) {
        throw new Error(`ZigbeeOTA: Error getting firmware page at '${url}'`);
    }
    logger.debug(`ZigbeeOTA: Downloaded main index`);

    if (overrideIndexFileName) {
        logger.debug(`ZigbeeOTA: Loading override index '${overrideIndexFileName}'`);
        const localIndex = await common.getOverrideIndexFile(overrideIndexFileName);

        // Resulting index will have overridden items first
        return localIndex.concat(mainIndex).map((item: KeyValueAny) => common.isValidUrl(item.url) ? item : fillImageInfo(item, logger));
    }
    return mainIndex;
}

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`ZigbeeOTA: Getting image metadata for '${device.modelID}'`);
    const images = await getIndex(logger);
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

async function isNewImageAvailable(current: Ota.ImageInfo, logger: Logger, device: Zh.Device, getImageMeta: Ota.GetImageMeta) {
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
    return common.isNewImageAvailable(current, logger, device, getImageMeta);
}

export async function getFirmwareFile(image: KeyValueAny, logger: Logger) {
    const urlOrName = image.url;

    // First try to download firmware file with the URL provided
    if (common.isValidUrl(urlOrName)) {
        logger.debug(`OTA: Downloading firmware image from '${urlOrName}' using the zigbeeOTA custom CA certificates`);
        const otaCaBundle = await common.processCustomCaBundle(caBundleUrl);
        const response = await common.getAxios(otaCaBundle).get(urlOrName, {responseType: 'arraybuffer'});
        return response;
    }

    logger.debug(`OTA: Trying to read firmware image from local file '${urlOrName}'`);
    return {data: common.readLocalFile(urlOrName, logger)};
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, requestPayload, isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta, getFirmwareFile);
}

export const useIndexOverride = (indexFileName: string) => {
    overrideIndexFileName = indexFileName;
};

exports.getImageMeta = getImageMeta;
exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
exports.useIndexOverride = useIndexOverride;
