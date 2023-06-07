import * as common from './common';
const axios = common.getAxios();
/*
 * Helper functions
 */

export async function getImageMeta(current: ota.Version, logger: Logger, device: zh.Device) {
    const images = (await axios.get('https://files.inovelli.com/firmware/firmware.json')).data;

    if (Object.keys(images).indexOf(device.modelID) === -1) {
        throw new Error(`The device '${device.modelID}' is not supported for OTA at this time.`);
    }

    // Force for now.  There is only beta firmware at the moment.
    const useBetaChannel = true;
    const image = images[device.modelID]
        .filter((i: KeyValue) => (useBetaChannel ? true : i.channel === 'production'))
        .sort((a: KeyValueAny, b: KeyValueAny) => {
            const aRadix = a.version.match(/[A-F]/) ? 16 : 10;
            const bRadix = b.version.match(/[A-F]/) ? 16 : 10;
            // @ts-expect-error
            const aVersion = parseFloat(a.version, aRadix);
            // @ts-expect-error
            const bVersion = parseFloat(b.version, bRadix);
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
        // @ts-expect-error
        fileVersion: parseFloat(image.version, image.version.match(/[A-F]/) ? 16 : 10),
        url: image.firmware,
    };
}

/**
 * Interface implementation
 */

async function isUpdateAvailable(device: zh.Device, logger: Logger, requestPayload:KeyValue=null) {
    return common.isUpdateAvailable(
        device,
        logger,
        common.isNewImageAvailable,
        requestPayload,
        getImageMeta,
    );
}

async function updateToLatest(device: zh.Device, logger: Logger, onProgress: ota.OnProgress) {
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
