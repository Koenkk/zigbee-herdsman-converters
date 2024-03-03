const updateCheckUrl = 'https://api.update.ledvance.com/v1/zigbee/firmwares/newer';
const updateDownloadUrl = 'https://api.update.ledvance.com/v1/zigbee/firmwares/download';
import * as common from './common';
import {Zh, Logger, Ota} from '../types';
const axios = common.getAxios();

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, logger: Logger, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`LedvanceOTA: call getImageMeta for ${device.modelID}`);
    const url = `${updateCheckUrl}?company=${current.manufacturerCode}&product=${current.imageType}&version=0.0.0`;
    const {data} = await axios.get(url);

    // Since URL is product-specific, var checking is soft-fail here ("images unavailable")
    if (!data?.firmwares?.length) {
        return null;
    }

    // Ledvance's API docs state the checksum should be `sha_256` but it is actually `shA256`
    const {identity, fullName, length, shA256: sha256} = data.firmwares[0];

    const fileVersionMatch = /\/(\d+)\//.exec(fullName);
    const fileVersion = parseInt(`0x${fileVersionMatch[1]}`, 16);

    const versionString = `${identity.version.major}.${identity.version.minor}.${identity.version.build}.${identity.version.revision}`;

    return {
        fileVersion,
        fileSize: length,
        url: `${updateDownloadUrl}?company=${identity.company}&product=${identity.product}&version=${versionString}`,
        sha256,
    };
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, logger: Logger, requestPayload:Ota.ImageInfo=null) {
    return common.isUpdateAvailable(device, logger, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, logger: Logger, onProgress: Ota.OnProgress) {
    // Ledvance OTAs are not valid against the Zigbee spec, the last image element fails to parse but the
    // update succeeds even without sending it. Therefore set suppressElementImageParseFailure to true
    // https://github.com/Koenkk/zigbee2mqtt/issues/16900
    return common.updateToLatest(device, logger, onProgress, common.getNewImage, getImageMeta, null, true);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
