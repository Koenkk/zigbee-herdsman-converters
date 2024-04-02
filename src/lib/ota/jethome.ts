const baseurl = 'https://fw.jethome.ru';
const deviceurl = `${baseurl}/api/devices/`;
import * as common from './common';
import {Zh, Ota} from '../types';
import {logger} from '../logger';

const NS = 'zhc:ota:jethome';
const axios = common.getAxios();

let overrideIndexFileName: string = null;

/**
 * Helper functions
 */

async function getIndex(modelID: string) {
    if (overrideIndexFileName) {
        logger.debug(`Loading override index ${overrideIndexFileName}`, NS);
        const overrideIndex = await common.getOverrideIndexFile(overrideIndexFileName);

        return overrideIndex;
    } else {
        const url = `${deviceurl}${modelID}/info`;
        const {data: index} = await axios.get(url);

        if (!index) {
            throw new Error(`JetHomeOTA: Error getting firmware page at ${url}`);
        }

        logger.debug(`Downloaded index for ${modelID}`, NS);
        return index;
    }
}

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`Call getImageMeta for ${device.modelID}`, NS);
    const images = await getIndex(device.modelID);

    // XXX: this is assumed to always be present even for devices that support OTA but without images yet available?
    if (!images?.latest_firmware?.release?.images) {
        throw new Error(`JetHomeOTA: Error getting firmware images`);
    }

    // we need to return the latest_firmware.release.urls.zigbee.ota
    const jetimage = images.latest_firmware.release.images['zigbee.ota'];

    if (!jetimage) {
        return null;
    }

    logger.debug(`Version: ${images.latest_firmware.release.version} size: ${jetimage.filesize} url: ${baseurl + jetimage.url}`, NS);

    return {
        fileVersion: Number(images.latest_firmware.release.version),
        fileSize: jetimage.filesize,
        url: baseurl + jetimage.url,
    };
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, onProgress, common.getNewImage, getImageMeta, common.getFirmwareFile);
}

export const useIndexOverride = (indexFileName: string) => {
    overrideIndexFileName = indexFileName;
};

exports.getImageMeta = getImageMeta;
exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
exports.useIndexOverride = useIndexOverride;
