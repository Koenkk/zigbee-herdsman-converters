import tar from 'tar-stream';

import {logger} from '../logger';
import {KeyValue, KeyValueAny, Ota, Zh} from '../types';
import * as common from './common';

const url = 'https://eu.salusconnect.io/demo/default/status/firmware?timestamp=0';

const NS = 'zhc:ota:salus';
const axios = common.getAxios();

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`Call getImageMeta for ${device.modelID}`, NS);
    const {data} = await axios.get(url);

    if (!data?.versions?.length) {
        throw new Error(`SalusOTA: Error getting firmware page at ${url}`);
    }

    const image = data.versions.find((i: KeyValue) => i.model === device.modelID);

    if (!image) {
        return null;
    }

    return {
        fileVersion: parseInt(image.version, 16),
        url: image.url.replace(/^http:\/\//, 'https://'),
    };
}

async function untar(tarStream: NodeJS.ReadStream) {
    return await new Promise((resolve, reject) => {
        const extract = tar.extract();

        const result: KeyValue[] = [];

        extract.on('error', reject);

        extract.on('entry', (headers, stream, next) => {
            const buffers: Buffer[] = [];

            stream.on('data', function (data) {
                buffers.push(data);
            });

            stream.on('end', function () {
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

async function downloadImage(meta: KeyValueAny) {
    const download = await axios.get(meta.url, {responseType: 'stream'});

    const files = await untar(download.data);

    // @ts-expect-error ignore
    const imageFile = files.find((file) => file.headers.name.endsWith('.ota'));

    return imageFile;
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, requestPayload: Ota.ImageInfo = null) {
    return await common.isUpdateAvailable(device, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, onProgress: Ota.OnProgress) {
    return await common.updateToLatest(device, onProgress, common.getNewImage, getImageMeta, downloadImage);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
