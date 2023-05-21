const common = require('./common');
const zigbeeOTA = require('./zigbeeOTA');

async function isUpdateAvailable(device, logger, requestPayload=null) {
    if (device.modelID === 'PP-WHT-US') {
        // see https://github.com/Koenkk/zigbee-OTA/pull/14
        const scenesEndpoint = device.endpoints.find((e) => e.supportsOutputCluster('genScenes'));
        await scenesEndpoint.write('genScenes', {currentGroup: 49502});
    }
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, zigbeeOTA.getImageMeta);
}

async function updateToLatest(device, logger, onProgress) {
    if (device.modelID === 'PP-WHT-US') {
        // see https://github.com/Koenkk/zigbee-OTA/pull/14
        const scenesEndpoint = device.endpoints.find((e) => e.supportsOutputCluster('genScenes'));
        await scenesEndpoint.write('genScenes', {currentGroup: 49502});
    }
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, zigbeeOTA.getImageMeta);
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
