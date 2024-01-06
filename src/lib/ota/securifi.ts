import {Zh, Logger, Ota} from '../types';
import * as common from './common';
import * as zigbeeOTA from './zigbeeOTA';

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    if (device.modelID === 'PP-WHT-US') {
        // see https://github.com/Koenkk/zigbee-OTA/pull/14
        const scenesEndpoint = device.endpoints.find((e) => e.supportsOutputCluster('genScenes'));
        await scenesEndpoint.write('genScenes', {currentGroup: 49502});
    }
    return common.isUpdateAvailable(device, logger, requestPayload, common.isNewImageAvailable, zigbeeOTA.getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    if (device.modelID === 'PP-WHT-US') {
        // see https://github.com/Koenkk/zigbee-OTA/pull/14
        const scenesEndpoint = device.endpoints.find((e) => e.supportsOutputCluster('genScenes'));
        await scenesEndpoint.write('genScenes', {currentGroup: 49502});
    }
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, zigbeeOTA.getImageMeta);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
