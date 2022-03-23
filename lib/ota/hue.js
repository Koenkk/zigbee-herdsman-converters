const checkupdateURL = 'https://firmware.meethue.com/v1/checkUpdate';
const common = require('./common');
const axios = common.getAxios();

/**
 * Helper functions
 */

async function getUpdates(current, logger) {
    const manufacturerCode = current.manufacturerCode;
    const imageType = current.imageType;
    const deviceTypeId = manufacturerCode.toString(16) + '-' + imageType.toString(16);

    const querystring = `?version=${current.fileVersion}&deviceTypeId=${deviceTypeId}`;
    const params = new URLSearchParams(querystring);
    const images = (await axios.get(checkupdateURL, {params})).data;

    logger.debug(`Updates available: ${JSON.stringify(images.updates)}`);

    return images.updates.sort((a, b) => a.version - b.version);
}

async function getImageMeta(current, logger, device) {
    const updates = await getUpdates(current, logger);

    if (updates.length < 1) {
        throw new Error(`No image available for imageType '${current.imageType}'`);
    }

    /* There might be several updates available but always update to the oldest one.
       Further request for available updates will contain one less update until the
       firmware is fully up to date. */
    const image = updates[0];

    return {
        fileVersion: image.version,
        fileSize: image.fileSize,
        url: image.binaryUrl,
        md5: image.md5,
    };
}

async function isNewImageAvailable(current, logger, device, getImageMeta) {
    const updates = await getUpdates(current, logger);
    const [currentS, metaS] = [JSON.stringify(current), JSON.stringify(updates)];
    logger.debug(`Is new image available for '${device.ieeeAddr}', current '${currentS}', latest meta '${metaS}'`);

    if (updates.length > 0) {
        return Math.sign(current.fileVersion - updates[0].version);
    } else {
        return 0;
    }
}

/**
 * Interface implementation
 */

async function isUpdateAvailable(device, logger, requestPayload = null) {
    return common.isUpdateAvailable(device, logger, isNewImageAvailable, requestPayload, getImageMeta);
}

async function updateToLatest(device, logger, onProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta);
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
