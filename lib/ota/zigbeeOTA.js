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

function readLocalFile(fileName, logger) {
    // If the file name is not a full path, then treat it as a relative to the data directory
    if (!path.isAbsolute(fileName) && dataDir) {
        fileName = path.join(dataDir, fileName);
    }

    logger.debug(`ZigbeeOTA: getting local firmware file ${fileName}`);
    return fs.readFileSync(fileName);
}

async function getFirmwareFile(image, logger) {
    const urlOrName = image.url;

    // First try to download firmware file with the URL provided
    if (isValidUrl(urlOrName)) {
        logger.debug(`ZigbeeOTA: downloading firmware image from ${urlOrName}`);
        return await axios.get(urlOrName, {responseType: 'arraybuffer'});
    }

    return {data: readLocalFile(urlOrName, logger)};
}

function fillImageInfo(meta, logger) {
    // Web-hosted images must come with all fields filled already
    if (isValidUrl(meta.url)) {
        return meta;
    }

    // Nothing to do if needed fields were filled already
    if (meta.hasOwnProperty('imageType') &&
        meta.hasOwnProperty('manufacturerCode') &&
        meta.hasOwnProperty('fileVersion')) {
        return meta;
    }

    // If no fields provided - get them from the image file
    const buffer = readLocalFile(meta.url, logger);
    const start = buffer.indexOf(common.upgradeFileIdentifier);
    const image = common.parseImage(buffer.slice(start));

    // Will fill only those fields that were absent
    if (!meta.hasOwnProperty('imageType')) meta.imageType = image.header.imageType;
    if (!meta.hasOwnProperty('manufacturerCode')) meta.manufacturerCode = image.header.manufacturerCode;
    if (!meta.hasOwnProperty('fileVersion')) meta.fileVersion = image.header.fileVersion;
    return meta;
}

async function getIndex(logger) {
    const index = (await axios.get(url)).data;

    logger.debug(`ZigbeeOTA: downloaded main index`);

    if (overrideIndexFileName) {
        logger.debug(`ZigbeeOTA: Loading override index ${overrideIndexFileName}`);
        const localIndex = await getIndexFile(overrideIndexFileName);

        // Resulting index will have overriden items first
        return localIndex.concat(index).map((item) => isValidUrl(item.url) ? item : fillImageInfo(item, logger));
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
        (!i.minFileVersion || current.fileVersion >= i.minFileVersion) && (!i.maxFileVersion || current.fileVersion <= i.maxFileVersion) &&
        (!i.modelId || i.modelId === modelId) && (!i.manufacturerName || i.manufacturerName.includes(manufacturerName)));

    assert(image !== undefined, `No image available for imageType '${imageType}'`);
    return {
        fileVersion: image.fileVersion,
        fileSize: image.fileSize,
        url: image.url,
        sha512: image.sha512,
        force: image.force,
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
