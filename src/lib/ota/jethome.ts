const baseurl = 'https://fw.jethome.ru';
const deviceurl = `${baseurl}/api/devices/`;
import * as common from './common';
import {Logger, Zh, Ota} from '../types';
const axios = common.getAxios();

let overrideIndexFileName: string = null;

/**
 * Helper functions
 */

async function getIndex(logger: Logger, modelID: string) {
    if (overrideIndexFileName) {
        logger.debug(`JetHomeOTA: Loading override index ${overrideIndexFileName}`);
        const overrideIndex = await common.getOverrideIndexFile(overrideIndexFileName);

        return overrideIndex;
    } else {
        const url = `${deviceurl}${modelID}/info`;
        const {data: index} = await axios.get(url);

        if (!index) {
            throw new Error(`JetHomeOTA: Error getting firmware page at ${url}`);
        }

        logger.debug(`JetHomeOTA: downloaded index for ${modelID}`);
        return index;
    }
}

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`JetHomeOTA: call getImageMeta for ${device.modelID}`);
    const images = await getIndex(logger, device.modelID);

    // XXX: this is assumed to always be present even for devices that support OTA but without images yet available?
    if (!images?.latest_firmware?.release?.images) {
        throw new Error(`JetHomeOTA: Error getting firmware images`);
    }

    // we need to return the latest_firmware.release.urls.zigbee.ota
    const jetimage = images.latest_firmware.release.images['zigbee.ota'];

    if (!jetimage) {
        return null;
    }

    logger.debug(`JetHomeOTA: version: ${images.latest_firmware.release.version} size: ${jetimage.filesize} url: ${baseurl + jetimage.url}`);

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
    return common.isUpdateAvailable(device, logger, requestPayload, common.isNewImageAvailable, getImageMeta);
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
