const common = require('./common');
const axios = common.getAxios();
/*
 * Helper functions
 */

async function getImageMeta(current, logger, device) {
    const images = (await axios.get('https://files.inovelli.com/firmware/firmware.json')).data;

    if (Object.keys(images).indexOf(device.modelID) === -1) {
        throw new Error(`The device '${device.modelID}' is not supported for OTA at this time.`);
    }

    // Force for now.  There is only beta firmware at the moment.
    const useBetaChannel = true;
    const image = images[device.modelID]
        .filter((i) => (useBetaChannel ? true : i.channel === 'production'))
        .sort((a, b) => {
            const aRadix = a.version.match(/[A-F]/) ? 16 : 10;
            const bRadix = b.version.match(/[A-F]/) ? 16 : 10;
            const aVersion = parseInt(a.version.replace(/\./g, ''), aRadix);
            const bVersion = parseInt(b.version.replace(/\./g, ''), bRadix);
            // doesn't matter which order they are in
            if (aVersion < bVersion) {
                return -1;
            }
            if (aVersion > bVersion) {
                return 1;
            }
            return 0;
        })
        .pop();

    if (!image) {
        throw new Error(`No images found in the ${useBetaChannel ? 'beta' : 'production'} channel for the device '${device.modelID}'`,
        );
    }
    // version in the firmare removes the zero padding and support hex versioning
    return {
        fileVersion: parseInt(image.version, image.version.match(/[A-F]/) ? 16 : 10),
        url: image.firmware,
    };
}

/**
 * Interface implementation
 */

async function isUpdateAvailable(device, logger, requestPayload = null) {
    return common.isUpdateAvailable(
        device,
        logger,
        common.isNewImageAvailable,
        requestPayload,
        getImageMeta,
    );
}

async function updateToLatest(device, logger, onProgress) {
    return common.updateToLatest(
        device,
        logger,
        onProgress,
        common.getNewImage,
        getImageMeta,
    );
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
