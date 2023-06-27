const url = 'https://eu.salusconnect.io/demo/default/status/firmware?timestamp=0';
import assert from 'assert';
import * as common from './common';
import tar from 'tar-stream';
import {Zh, Logger, Ota, KeyValue, KeyValueAny} from '../types';
const axios = common.getAxios();

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    const modelID = device.modelID;
    const images = (await axios.get(url)).data.versions;
    const image = images.find((i: KeyValue) => i.model === modelID);
    assert(image, `No image available for modelID '${modelID}'`);
    return {
        fileVersion: parseInt(image.version, 16),
        url: image.url.replace(/^http:\/\//, 'https://'),
    };
}

async function untar(tarStream: NodeJS.ReadStream) {
    return new Promise((resolve, reject) => {
        const extract = tar.extract();

        const result: KeyValue[] = [];

        extract.on('error', reject);

        extract.on('entry', (headers, stream, next) => {
            const buffers: Buffer[] = [];

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

async function downloadImage(meta: KeyValueAny, logger: Logger) {
    const download = await axios.get(meta.url, {responseType: 'stream'});

    const files = await untar(download.data);

    // @ts-expect-error
    const imageFile = files.find((file) => file.headers.name.endsWith('.ota'));

    return imageFile;
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, common.isNewImageAvailable, requestPayload, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta, downloadImage);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
