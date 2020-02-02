async function updateAvailable(device, logger) {
    logger.debug(`Check if update available for '${device.ieeeAddr}' (${device.modelID})`);

    const endpoint = device.endpoints.find((e) => e.supportsOutputCluster('genOta'));
    if (!endpoint) {
        throw new Error(`Failed to find endpoint which support OTA cluster`);
    }
    logger.debug(`Using endpoint '${endpoint.ID}'`);

    const imageType = await endpoint.read('genOta', ['imageUpgradeStatus']);
    console.log(imageType);
}

module.exports = {
    updateAvailable,
};
