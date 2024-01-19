const productionURL = 'http://fw.ota.homesmart.ikea.net/feed/version_info.json';
const testURL = 'http://fw.test.ota.homesmart.ikea.net/feed/version_info.json';
import {Ota, Logger, Zh, KeyValue} from '../types';
import * as common from './common';
const axios = common.getAxios();
let useTestURL = false;

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`TradfriOTA: call getImageMeta for ${device.modelID}`);
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

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta);
}

const useTestURL_ = () => {
    useTestURL = true;
};

export {useTestURL_ as useTestURL};

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
exports.useTestURL = useTestURL_;
