const updateCheckUrl = 'https://api.update.ledvance.com/v1/zigbee/firmwares/newer';
const updateDownloadUrl = 'https://api.update.ledvance.com/v1/zigbee/firmwares/download';
import {logger} from '../logger';
import {Zh, Ota} from '../types';
import * as common from './common';

const NS = 'zhc:ota:ledvance';
const axios = common.getAxios();

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`Call getImageMeta for ${device.modelID}`, NS);
    const url = `${updateCheckUrl}?company=${current.manufacturerCode}&product=${current.imageType}&version=0.0.0`;
    const {data} = await axios.get(url);

    // Since URL is product-specific, var checking is soft-fail here ("images unavailable")
    if (!data?.firmwares?.length) {
        return null;
    }

    // Ledvance's API docs state the checksum should be `sha_256` but it is actually `shA256`
    const {identity, fullName, length, shA256: sha256} = data.firmwares[0];

    // The fileVersion in hex is included in the fullName between the `/`, e.g.:
    // - PLUG COMPACT EU T/032b3674/PLUG_COMPACT_EU_T-0x00D6-0x032B3674-MF_DIS.OTA
    // - A19 RGBW/00102428/A19_RGBW_IMG0019_00102428-encrypted.ota
    const fileVersionMatch = /\/(\d|\w+)\//.exec(fullName);
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

export async function isUpdateAvailable(device: Zh.Device, requestPayload: Ota.ImageInfo = null) {
    return common.isUpdateAvailable(device, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, onProgress: Ota.OnProgress) {
    // Ledvance OTAs are not valid against the Zigbee spec, the last image element fails to parse but the
    // update succeeds even without sending it. Therefore set suppressElementImageParseFailure to true
    // https://github.com/Koenkk/zigbee2mqtt/issues/16900
    // The size check also needs to be disabled
    // https://github.com/Koenkk/zigbee2mqtt/issues/22687
    return common.updateToLatest(device, onProgress, common.getNewImage, getImageMeta, null, true, true);
}

exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
