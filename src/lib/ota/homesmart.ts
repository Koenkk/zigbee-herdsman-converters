import {logger} from '../logger';
import {KeyValue, KeyValueAny, Ota, Zh} from '../types';
import * as common from './common';

const url = 'https://fw.ota.homesmart.ikea.com/check/update/prod';

/**
 * IKEA HomeSmart intermediate certificate used for verifying OTA (Over-the-Air) updates.
 *
 * This CA (Certificate Authority) certificate is necessary to establish a secure
 * connection when fetching firmware update metadata and binaries from IKEA's
 * HomeSmart OTA servers.
 *
 * - The certificate is included here as part of the custom CA bundle to allow the
 *   client to validate the IKEA OTA servers' SSL certificates.
 * - It is appended to the default system CAs to avoid overriding the default trusted
 *   root CAs.
 *
 * @type {string[]}
 */
const caBundle = [
    `-----BEGIN CERTIFICATE-----
MIICQTCCAcagAwIBAgIUAr5VleESJnRg+J9oehqJc+MGphIwCgYIKoZIzj0EAwMw
SzELMAkGA1UEBhMCU0UxGjAYBgNVBAoMEUlLRUEgb2YgU3dlZGVuIEFCMSAwHgYD
VQQDDBdJS0VBIEhvbWUgc21hcnQgUm9vdCBDQTAeFw0yMTA1MjYxOTE1NDVaFw00
NjA1MjAxOTE1NDRaMFAxCzAJBgNVBAYTAlNFMRowGAYDVQQKDBFJS0VBIG9mIFN3
ZWRlbiBBQjElMCMGA1UEAwwcSUtFQSBIb21lIHNtYXJ0IE9UQSBUcnVzdCBDQTB2
MBAGByqGSM49AgEGBSuBBAAiA2IABC6Db3/cBpl//CmRX7Ur90ikDbpLtaCcvcJT
p72LY585dsMUA7cjZQlAQdNfI7zSr0Y8O9w0dIoqz8HL8G7E/pYChhvQPUgx1avn
6IEtdWLwI0XPPsFtLO8jRJFIsjkeAaNmMGQwEgYDVR0TAQH/BAgwBgEB/wIBADAf
BgNVHSMEGDAWgBRx2USd9fQzJkDjMB1joIs7J73B/DAdBgNVHQ4EFgQUrRAWZaau
bKmqMPHU92uXboPJn8cwDgYDVR0PAQH/BAQDAgGGMAoGCCqGSM49BAMDA2kAMGYC
MQDcIekS7OcwMcLXMtP6rWfZUsJF7iI59t3rEame11vIdY/sFHHWWm07OLJ7gRwg
NpwCMQDhMc3sX2cBD3zZ2zDwCjFBCudhgWLc2eqNy/b5mY+/Ppdp6EX11PZK0Hb9
dZ2TSWM=
-----END CERTIFICATE-----`,
    `-----BEGIN CERTIFICATE-----
MIICGDCCAZ+gAwIBAgIUdfH0KDnENv/dEcxH8iVqGGGDqrowCgYIKoZIzj0EAwMw
SzELMAkGA1UEBhMCU0UxGjAYBgNVBAoMEUlLRUEgb2YgU3dlZGVuIEFCMSAwHgYD
VQQDDBdJS0VBIEhvbWUgc21hcnQgUm9vdCBDQTAgFw0yMTA1MjYxOTAxMDlaGA8y
MDcxMDUxNDE5MDEwOFowSzELMAkGA1UEBhMCU0UxGjAYBgNVBAoMEUlLRUEgb2Yg
U3dlZGVuIEFCMSAwHgYDVQQDDBdJS0VBIEhvbWUgc21hcnQgUm9vdCBDQTB2MBAG
ByqGSM49AgEGBSuBBAAiA2IABIDRUvKGFMUu2zIhTdgfrfNcPULwMlc0TGSrDLBA
oTr0SMMV4044CRZQbl81N4qiuHGhFzCnXapZogkiVuFu7ZqSslsFuELFjc6ZxBjk
Kmud+pQM6QQdsKTE/cS06dA+P6NCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4E
FgQUcdlEnfX0MyZA4zAdY6CLOye9wfwwDgYDVR0PAQH/BAQDAgGGMAoGCCqGSM49
BAMDA2cAMGQCMG6mFIeB2GCFch3r0Gre4xRH+f5pn/bwLr9yGKywpeWvnUPsQ1KW
ckMLyxbeNPXdQQIwQc2YZDq/Mz0mOkoheTUWiZxK2a5bk0Uz1XuGshXmQvEg5TGy
2kVHW/Mz9/xwpy4u
-----END CERTIFICATE-----`,
];

const NS = 'zhc:ota:homesmart';

/**
 * Helper functions
 */

export async function getImageMeta(current: Ota.ImageInfo, device: Zh.Device): Promise<Ota.ImageMeta> {
    logger.debug(`Call getImageMeta for ${device.modelID}`, NS);
    const {data: images} = await common.getAxios(caBundle).get(url);

    if (!images?.length) {
        throw new Error(`HomeSmartOTA: Error getting firmware page at ${url}`);
    }

    const image = images.find((img: KeyValue) => img.fw_image_type === current.imageType);

    if (!image) {
        return null;
    }

    //Get firmware metadata
    const imageMeta = common.parseImage((await common.getAxios(caBundle).get(image.fw_binary_url, {responseType: 'arraybuffer'})).data);

    return {
        fileVersion: imageMeta.header.fileVersion,
        fileSize: imageMeta.header.totalImageSize,
        url: image.fw_binary_url,
        sha3_256: image.fw_sha3_256,
    };
}

export async function getFirmwareFile(image: KeyValueAny) {
    const urlOrName = image.url;

    if (common.isValidUrl(urlOrName)) {
        logger.debug(`Downloading firmware image from '${urlOrName}' using the IKEA Home Smart custom CA certificates`, NS);
        const response = await common.getAxios(caBundle).get(urlOrName, {responseType: 'arraybuffer'});
        return response;
    }

    throw new Error(`HomeSmart OTA: Invalid firmware URL: ${urlOrName}`);
}

/**
 * Interface implementation
 */

export async function isUpdateAvailable(device: Zh.Device, requestPayload: Ota.ImageInfo = null) {
    return await common.isUpdateAvailable(device, requestPayload, common.isNewImageAvailable, getImageMeta);
}

export async function updateToLatest(device: Zh.Device, onProgress: Ota.OnProgress) {
    return await common.updateToLatest(device, onProgress, common.getNewImage, getImageMeta, getFirmwareFile);
}

exports.getImageMeta = getImageMeta;
exports.isUpdateAvailable = isUpdateAvailable;
exports.updateToLatest = updateToLatest;
