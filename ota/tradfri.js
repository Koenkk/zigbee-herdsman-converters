const axios = require('axios');
const url = 'http://fw.ota.homesmart.ikea.net/feed/version_info.json';
const assert = require('assert');
const common = require('./common');

function getEndpoint(device) {
    return device.endpoints.find((e) => e.supportsOutputCluster('genOta'));
}

async function getDeviceInfo(endpoint) {
    const queryNextImageRequest = endpoint.waitForCommand('genOta', 'queryNextImageRequest', 10000);
    await endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 100});
    return await queryNextImageRequest;
}

async function getImage(imageType) {
    const images = (await axios.get(url)).data;
    const image = images.find((i) => i.fw_image_type === imageType);
    return {
        fileVersion: (image.fw_file_version_MSB << 16) | image.fw_file_version_LSB,
        url: image.fw_binary_url,
    };
}

async function isUpdateAvailable(device, logger) {
    logger.debug(`Check if update available for '${device.ieeeAddr}' (${device.modelID})`);

    const endpoint = getEndpoint(device);
    assert(endpoint !== null, `Failed to find endpoint which support OTA cluster`);
    logger.debug(`Using endpoint '${endpoint.ID}'`);

    const info = await getDeviceInfo(endpoint);
    logger.debug(`Got device info '${JSON.stringify(info)}'`);

    const image = await getImage(info.imageType);
    logger.debug(`Got image '${JSON.stringify(image)}'`);

    return image.fileVersion > info.currentFileVersion;
}

async function updateToLatest(device, logger) {
    logger.debug(`Update to latest '${device.ieeeAddr}' (${device.modelID})`);

    const endpoint = getEndpoint(device);
    assert(endpoint !== null, `Failed to find endpoint which support OTA cluster`);
    logger.debug(`Using endpoint '${endpoint.ID}'`);

    const info = await getDeviceInfo(endpoint);
    logger.debug(`Got device info '${JSON.stringify(info)}'`);

    const image = await getImage(info.imageType);
    logger.debug(`Got image '${JSON.stringify(image)}'`);

    assert(image.fileVersion > info.currentFileVersion, 'No update available');

    const imageResponse = await axios.get(image.url, {responseType: 'arraybuffer'});
    const bin = imageResponse.data;
    const start = bin.indexOf(common.upgradeFileIdentifier);
    const parsed = common.parseOtaImage(bin.slice(start));
    console.log(parsed);
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
