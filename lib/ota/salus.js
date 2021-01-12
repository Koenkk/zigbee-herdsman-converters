const url = 'https://eu.salusconnect.io/demo/default/status/firmware?timestamp=0';
const assert = require('assert');
const common = require('./common');
const tar = require('tar-stream');
const axios = common.getAxios();

/**
 * Helper functions
 */

async function getImageMeta(current, logger, device) {
    const modelID = device.modelID;
    const images = (await axios.get(url)).data.versions;
    const image = images.find((i) => i.model === modelID);
    assert(image, `No image available for modelID '${modelID}'`);
    return {
        fileVersion: parseInt(image.version, 16),
        url: image.url.replace(/^http:\/\//, 'https://'),
    };
}

async function untar(tarStream) {
    return new Promise((resolve, reject) => {
        const extract = tar.extract();

        const result = [];

        extract.on('error', reject);

        extract.on('entry', (headers, stream, next) => {
            const buffers = [];

            stream.on('data', function(data) {
                buffers.push(data);
            });

            stream.on('end', function() {
                result.push({
                    headers,
                    data: Buffer.concat(buffers),
                });

                next();
            });

            stream.resume();
        });

        extract.on('finish', () => {
            resolve(result);
        });

        tarStream.pipe(extract);
    });
}

async function downloadImage(meta, logger) {
    const download = await axios.get(meta.url, {responseType: 'stream'});

    const files = await untar(download.data);

    const imageFile = files.find((file) => file.headers.name.endsWith('.ota'));

    return imageFile.data;
}

/**
 * Interface implementation
 */

async function isUpdateAvailable(device, logger, requestPayload=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, getImageMeta);
}

async function updateToLatest(device, logger, onProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta, downloadImage);
}

module.exports = {
    isUpdateAvailable,
    updateToLatest,
};
