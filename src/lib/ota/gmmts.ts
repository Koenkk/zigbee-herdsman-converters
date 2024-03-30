import {Zh, Logger, Ota, KeyValueAny} from '../types';
import * as common from './common';
const axios = common.getAxios();

const firmware_manifest = 'https://update.gammatroniques.fr/ticmeter/manifest.json';

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.info(`GMMTS OTA: call getImageMeta for ${device.modelID}`);
    const {data: releases} = await axios.get(firmware_manifest);

    if (!releases.builds){
        throw new Error(`GMMTS OTA: No builds available for ${device.modelID}`);
    }

    // {
    //     "name": "TICMeter",
    //     "version": "V3.1.5",
    //     "home_assistant_domain": "esphome",
    //     "funding_url": "https://esphome.io/guides/supporters.html",
    //     "new_install_prompt_erase": true,
    //     "builds": [
    //       {
    //         "chipFamily": "ESP32-C6",
    //         "target": "esp32c6",
    //         "parts": [
    //           {
    //             "path": "https://update.gammatroniques.fr/ticmeter/download/bootloader.bin",
    //             "offset": 0
    //           },
    //           {
    //             "path": "https://update.gammatroniques.fr/ticmeter/download/partition-table.bin",
    //             "offset": 32768
    //           },
    //           {
    //             "path": "https://update.gammatroniques.fr/ticmeter/download/ota_data_initial.bin",
    //             "offset": 65536
    //           },
    //           {
    //             "path": "https://update.gammatroniques.fr/ticmeter/download/storage.bin",
    //             "offset": 94208,
    //             "type": "storage"
    //           },
    //           {
    //             "path": "https://update.gammatroniques.fr/ticmeter/download/TICMeter.bin",
    //             "offset": 196608,
    //             "type": "app"
    //           }
    //         ]
    //       }
    //     ]
    //   }

    const app_url: { path: string, offset: number, type: string, ota: string } | undefined = releases.builds[0].parts.find((part: { type: string }) => part.type === 'app');
    const storage_url: { path: string, offset: number, type: string, ota: string } | undefined = releases.builds[0].parts.find((part: { type: string }) => part.type === 'storage');

    logger.info(`GMMTS OTA: Using firmware file ` + app_url.path + ` for ${device.modelID}`);
    const image = common.parseImage((await common.getAxios().get(app_url.ota, {responseType: 'arraybuffer'})).data);

    const ret = {
        fileVersion: image.header.fileVersion,
        fileSize: image.header.totalImageSize,
        url: app_url.ota,
    };

    logger.debug(`GMMTS OTA: Image header  ${JSON.stringify(image.header)}`);
    logger.info(`GMMTS OTA: Image metadata for ${device.modelID}: ${JSON.stringify(ret)}`);

    return ret;
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
