const url = 'https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json';
const assert = require('assert');
const common = require('./common');
const axios = common.getAxios();
const fs = require('fs');
const URI = require('uri-js');
const path = require('path');

let overrideIndexFileName = null;
let dataDir = null;

/**
 * Helper functions
 */


function isValidUrl(url) {
    let parsed;
    try {
        parsed = URI.parse(url);
    } catch (_) {
        return false;
    }
    return parsed.scheme === 'http' || parsed.scheme === 'https';
}

async function getIndexFile(urlOrName) {
    if (isValidUrl(urlOrName)) {
        return (await axios.get(urlOrName)).data;
    }

    return JSON.parse(fs.readFileSync(urlOrName));
}

async function getFirmwareFile(image, logger) {
    let urlOrName = image.url;

    // First try to download firmware file with the URL provided
    if (isValidUrl(urlOrName)) {
        logger.debug(`ZigbeeOTA: downloading firmware image from ${urlOrName}`);
        return await axios.get(urlOrName, {responseType: 'arraybuffer'});
    }

    // If the file name is not a full path, then treat it as a relative to the data directory
    if (!path.isAbsolute(urlOrName) && dataDir) {
        urlOrName = path.join(dataDir, urlOrName);
    }

    logger.debug(`ZigbeeOTA: getting local firmware file ${urlOrName}`);
    return {data: fs.readFileSync(urlOrName)};
}


async function getIndex(logger) {
    const index = (await axios.get(url)).data;

    logger.debug(`ZigbeeOTA: downloaded main index`);

    if (overrideIndexFileName) {
        logger.debug(`ZigbeeOTA: Loading override index ${overrideIndexFileName}`);
        const localIndex = await getIndexFile(overrideIndexFileName);

        // Resulting index will have overriden items first
        return localIndex.concat(index);
    }

    return index;
}

async function getImageMeta(current, logger, device) {
    const modelId = device.modelID;
    const imageType = current.imageType;
    const manufacturerCode = current.manufacturerCode;
    const manufacturerName = device.manufacturerName;
    const images = await getIndex(logger);

    // NOTE: Officially an image can be determined with a combination of manufacturerCode and imageType.
    // However Gledopto pro products use the same imageType (0) for every device while the image is different.
    // For this case additional identification through the modelId is done.
    // In the case of Tuya and Moes, additional identification is carried out through the manufacturerName.
    const image = images.find((i) => i.imageType === imageType && i.manufacturerCode === manufacturerCode &&
        (!i.modelId || i.modelId === modelId) && (!i.manufacturerName || i.manufacturerName.includes(manufacturerName)));

    assert(image !== undefined, `No image available for imageType '${imageType}'`);
    return {
        fileVersion: image.fileVersion,
        fileSize: image.fileSize,
        url: image.url,
        sha512: image.sha512,
    };
}

/**
 * Interface implementation
 */

async function isUpdateAvailable(device, logger, requestPayload=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, getImageMeta);
}

async function updateToLatest(device, logger, onProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta, getFirmwareFile);
}

module.exports = {
    getImageMeta,
    isUpdateAvailable,
    updateToLatest,
    useIndexOverride: (indexFileName) => {
        overrideIndexFileName = indexFileName;
    },
    setDataDir: (dir) => {
        dataDir = dir;
    },
};
