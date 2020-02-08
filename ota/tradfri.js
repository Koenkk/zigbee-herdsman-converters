const axios = require('axios');
const url = 'http://fw.ota.homesmart.ikea.net/feed/version_info.json';
const assert = require('assert');
const common = require('./common');
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        fileSize: image.fw_filesize,
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

    return image.fileVersion > info.fileVersion;
}

async function updateToLatest(device, logger) {
    logger.debug(`Update to latest '${device.ieeeAddr}' (${device.modelID})`);

    const endpoint = getEndpoint(device);
    assert(endpoint !== null, `Failed to find endpoint which support OTA cluster`);
    logger.debug(`Using endpoint '${endpoint.ID}'`);

    const info = await getDeviceInfo(endpoint);
    logger.debug(`Got device info '${JSON.stringify(info.payload)}'`);
    const image = await getImage(info.payload.imageType);
    logger.debug(`Got image '${JSON.stringify(image)}'`);

    assert(image.fileVersion > info.payload.fileVersion, 'No update available');

    const imageResponse = await axios.get(image.url, {responseType: 'arraybuffer'});
    const start = imageResponse.data.indexOf(common.upgradeFileIdentifier);

    const otaImage = common.parseOtaImage(imageResponse.data.slice(start));
    assert(otaImage.header.fileVersion === image.fileVersion, 'File version mismatch');
    assert(otaImage.header.totalImageSize === image.fileSize, 'Image size mismatch');
    assert(otaImage.header.manufacturerCode === 4476, 'Manufacturer code mismatch');
    assert(otaImage.header.imageType === info.payload.imageType, 'Image type mismatch');
    logger.debug('Image parsed and verified');

    // Wait 5 seconds, otherwise device doesn't start with block requests
    await wait(5000);

    await common.update(endpoint, logger, otaImage);

    // Give device some time to reboot after update
    await wait(30000);

    const from_ = {softwareBuildID: device.softwareBuildID, dateCode: device.dateCode};

    const genBasicEndpoint = device.endpoints.find((e) => e.supportsInputCluster('genBasic'));
    const result = await genBasicEndpoint.read('genBasic', ['dateCode', 'swBuildId']);
    device.softwareBuildID = result.swBuildId;
    device.dateCode = result.dateCode;
    device.save();

    const to = {softwareBuildID: device.softwareBuildID, dateCode: device.dateCode};

    logger.debug(`Updated from '${JSON.stringify(from_)}' to '${JSON.stringify(to)}'`);
    return {from: from_, to: to};
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
