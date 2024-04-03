const productionURL = 'http://fw.ota.homesmart.ikea.net/feed/version_info.json';
const testURL = 'http://fw.test.ota.homesmart.ikea.net/feed/version_info.json';
import {logger} from '../logger';
import {Ota, Zh, KeyValue} from '../types';
import * as common from './common';

const NS = 'zhc:ota:tradfri';
const axios = common.getAxios();
let useTestURL = false;

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`Call getImageMeta for ${device.modelID}`, NS);
    const url = useTestURL ? testURL : productionURL;
    const {data: images} = await axios.get(url);

    if (!images?.length) {
        throw new Error(`TradfriOTA: Error getting firmware page at ${url}`);
    }

    const image = images.find((i: KeyValue) => i.fw_image_type === current.imageType);

    if (!image) {
        return null;
    }

    return {
        fileVersion: (image.fw_file_version_MSB << 16) | image.fw_file_version_LSB,
        url: image.fw_binary_url,
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

const useTestURL_ = () => {
    useTestURL = true;
};

export {useTestURL_ as useTestURL};

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
exports.useTestURL = useTestURL_;
