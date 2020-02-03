const axios = require('axios');
const url = 'http://fw.ota.homesmart.ikea.net/feed/version_info.json';

async function updateAvailable(device, logger) {
    // Find endpoint
    logger.debug(`Check if update available for '${device.ieeeAddr}' (${device.modelID})`);

    const endpoint = device.endpoints.find((e) => e.supportsOutputCluster('genOta'));
    if (!endpoint) {
        throw new Error(`Failed to find endpoint which support OTA cluster`);
    }
    logger.debug(`Using endpoint '${endpoint.ID}'`);

    // Query available images
    const images = (await axios.get(url)).data;

    // Check which image is installed
    const queryNextImageRequest = endpoint.waitForCommand('genOta', 'queryNextImageRequest', 10000);
    await endpoint.commandResponse('genOta', 'imageNotify', {payloadType: 0, queryJitter: 100});
    const current = await queryNextImageRequest;

    const image = images.find((i) => i.fw_image_type === current.imageType);
    const imageFileVersion = (image.fw_file_version_MSB << 16) | image.fw_file_version_LSB;
    console.log(imageFileVersion, current);
}

module.exports = {
    updateAvailable,
};
