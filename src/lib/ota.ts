import assert from "node:assert";
import crypto from "node:crypto";
import {readFileSync} from "node:fs";
import path from "node:path";
import {crc32} from "node:zlib";
import {Zcl} from "zigbee-herdsman";
import {logger} from "./logger";
import type {Ota, Zh} from "./types";

// #region 'genOta' commands

export interface QueryNextImageRequestPayload {
    fieldControl: number;
    manufacturerCode: Zcl.ManufacturerCode;
    imageType: number;
    fileVersion: number;
    hardwareVersion?: number;
}

export interface ImageBlockRequestPayload {
    fieldControl: number;
    manufacturerCode: Zcl.ManufacturerCode;
    imageType: number;
    fileVersion: number;
    fileOffset: number;
    maximumDataSize: number;
}

export interface ImagePageRequestPayload extends ImageBlockRequestPayload {
    pageSize: number;
    responseSpacing: number;
}

export interface UpdateEndRequestPayload {
    status: Zcl.Status;
    manufacturerCode: Zcl.ManufacturerCode;
    imageType: number;
    fileVersion: number;
}

// #endregion
// #region 'genOta' commandsResponse

export type ImageNotifyPayload = {
    payloadType: number;
    queryJitter: number;
};

export type QueryNextImageResponsePayload =
    | {
          status: Zcl.Status;
      }
    | {
          status: Zcl.Status.SUCCESS;
          manufacturerCode: Zcl.ManufacturerCode;
          imageType: number;
          fileVersion: number;
          imageSize: number;
      };

export type ImageBlockResponsePayload = {
    status: Zcl.Status;
    manufacturerCode: Zcl.ManufacturerCode;
    imageType: number;
    fileVersion: number;
    fileOffset: number;
    dataSize: number;
    data: Buffer;
};

export type UpgradeEndResponsePayload = {
    manufacturerCode: Zcl.ManufacturerCode;
    imageType: number;
    fileVersion: number;
    currentTime: number;
    upgradeTime: number;
};

// #endregion

type CommandResult<T> = {header: Zcl.Header; payload: T};

interface Request<T> {
    cancel: () => void;
    promise: Promise<CommandResult<T>>;
}
interface Waiters {
    imageBlockOrPageRequest?: Request<ImageBlockRequestPayload | ImagePageRequestPayload>;
    upgradeEndRequest?: Request<UpdateEndRequestPayload>;
}

const NS = "zhc:ota";

export const ZIGBEE_OTA_LATEST_URL = "https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json";
export const ZIGBEE_OTA_PREVIOUS_URL = "https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index1.json";

/** +- 24 days */
const MAX_TIMEOUT = 2147483647;
/** When the data size is too big, OTA gets unstable, so default it to 50 bytes maximum. */
export const DEFAULT_MAXIMUM_DATA_SIZE = 50;
/** Use to reduce network congestion by throttling response if necessary */
export const DEFAULT_IMAGE_BLOCK_RESPONSE_DELAY = 250;
/** Consider update done after this amount of time without having seen a deviceAnnounce */
const UPDATE_END_FORCE_RESOLVE_TIME = 120 * 1000;

export const UPGRADE_FILE_IDENTIFIER = Buffer.from([0x1e, 0xf1, 0xee, 0x0b]);

const VALID_SILABS_CRC = 0x2144df1c;
const EBL_TAG_HEADER = 0x0;
const EBL_TAG_ENC_HEADER = 0xfb05;
const EBL_TAG_END = 0xfc04;
const EBL_PADDING = 0xff;
const EBL_IMAGE_SIGNATURE = 0xe350;
const GBL_HEADER_TAG = Buffer.from([0xeb, 0x17, 0xa6, 0x03]);
/** Contains length+CRC32 and possibly padding after this. */
const GBL_END_TAG = Buffer.from([0xfc, 0x04, 0x04, 0xfc]);

// #region Configuration

let dataDir: string | undefined;
let overrideIndexFileName: string | undefined;

let imageBlockResponseDelay = DEFAULT_IMAGE_BLOCK_RESPONSE_DELAY;
let initialMaximumDataSize = DEFAULT_MAXIMUM_DATA_SIZE;

export function setConfiguration(settings: Ota.Settings): void {
    dataDir = settings.dataDir;
    overrideIndexFileName = settings.overrideIndexLocation;
    // use || no zero values
    imageBlockResponseDelay = settings.imageBlockResponseDelay || DEFAULT_IMAGE_BLOCK_RESPONSE_DELAY;
    initialMaximumDataSize = settings.defaultMaximumDataSize || DEFAULT_MAXIMUM_DATA_SIZE;
}

// #endregion
// #region General Utils

export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);

        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

async function getJson<T>(pageUrl: string): Promise<T> {
    const response = await fetch(pageUrl);

    if (!response.ok || !response.body) {
        throw new Error(`Invalid response from ${pageUrl} status=${response.status}.`);
    }

    return (await response.json()) as T;
}

function readLocalFile(fileName: string): Buffer {
    // If the file name is not a full path, then treat it as a relative to the data directory
    if (!path.isAbsolute(fileName) && dataDir) {
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        fileName = path.join(dataDir, fileName);
    }

    logger.debug(`Getting local firmware file '${fileName}'`, NS);

    return readFileSync(fileName);
}

async function getFirmwareFile(meta: Ota.ImageMeta): Promise<Buffer> {
    const urlOrName = meta.url;

    // First try to download firmware file with the URL provided
    if (isValidUrl(urlOrName)) {
        logger.debug(`Downloading firmware image from '${urlOrName}'`, NS);
        const firmwareFileRsp = await fetch(urlOrName);

        if (!firmwareFileRsp.ok || !firmwareFileRsp.body) {
            throw new Error(`Invalid response from ${urlOrName} status=${firmwareFileRsp.status}.`);
        }

        return Buffer.from(await firmwareFileRsp.arrayBuffer());
    }

    logger.debug(`Try to read firmware image from local file '${urlOrName}'`, NS);

    return readLocalFile(urlOrName);
}

// #endregion
// #region OTA Utils

function parseSubElement(buffer: Buffer, position: number): Ota.ImageElement {
    const tagID = buffer.readUInt16LE(position);
    const length = buffer.readUInt32LE(position + 2);
    const data = buffer.subarray(position + 6, position + 6 + length);

    return {tagID, length, data};
}

function parseTelinkEncryptSubElement(buffer: Buffer, position: number): Ota.ImageElement {
    const tagID = buffer.readUInt16LE(position);
    const length = buffer.readUInt32LE(position + 2);
    // const tagInfo = buffer.readUInt32LE(position + 4);
    const data = buffer.subarray(position + 8, position + 8 + length);

    return {tagID, length, data};
}

export function parseImage(buffer: Buffer, suppressElementImageParseFailure = false, customParseLogic: Ota.CustomParseLogic = undefined): Ota.Image {
    logger.debug(
        `Parsing image, size=${buffer.length}, suppressElementImageParseFailure=${suppressElementImageParseFailure}, customParseLogic=${customParseLogic}`,
        NS,
    );

    const header: Ota.ImageHeader = {
        otaUpgradeFileIdentifier: buffer.subarray(0, 4),
        otaHeaderVersion: buffer.readUInt16LE(4),
        otaHeaderLength: buffer.readUInt16LE(6),
        otaHeaderFieldControl: buffer.readUInt16LE(8),
        manufacturerCode: buffer.readUInt16LE(10),
        imageType: buffer.readUInt16LE(12),
        fileVersion: buffer.readUInt32LE(14),
        zigbeeStackVersion: buffer.readUInt16LE(18),
        otaHeaderString: buffer.toString("utf8", 20, 52),
        totalImageSize: buffer.readUInt32LE(52),
    };

    let headerPos = 56;
    let didSuppressElementImageParseFailure = false;

    /* istanbul ignore next */
    if (header.otaHeaderFieldControl & 1) {
        header.securityCredentialVersion = buffer.readUInt8(headerPos);
        headerPos += 1;
    }

    /* istanbul ignore next */
    if (header.otaHeaderFieldControl & 2) {
        header.upgradeFileDestination = buffer.subarray(headerPos, headerPos + 8);
        headerPos += 8;
    }

    if (header.otaHeaderFieldControl & 4) {
        header.minimumHardwareVersion = buffer.readUInt16LE(headerPos);
        headerPos += 2;
        header.maximumHardwareVersion = buffer.readUInt16LE(headerPos);
        headerPos += 2;
    }

    const raw = buffer.subarray(0, header.totalImageSize);

    // Note: in the context of this file, this can never assert, since both callers of `parseImage` already subarray to `UPGRADE_FILE_IDENTIFIER`
    assert(UPGRADE_FILE_IDENTIFIER.equals(header.otaUpgradeFileIdentifier), "Not a valid OTA file");

    let position = header.otaHeaderLength;
    const elements = [];

    try {
        while (position < header.totalImageSize) {
            // Use the selected parser function
            let element: Ota.ImageElement;
            let elementOffset = 6;
            if (customParseLogic === "telinkEncrypted") {
                element = parseTelinkEncryptSubElement(buffer, position);
                elementOffset = 8;
            } else {
                element = parseSubElement(buffer, position);
            }

            elements.push(element);
            position += element.data.length + elementOffset;
        }
    } catch (error) {
        if (!suppressElementImageParseFailure) {
            throw error;
        }

        didSuppressElementImageParseFailure = true;

        logger.error("Partially failed to parse the image, continuing anyway...", NS);
    }

    if (!didSuppressElementImageParseFailure) {
        assert(position === header.totalImageSize, "Size mismatch");
    }

    return {header, elements, raw};
}

function validateImageData(image: Ota.Image): void {
    for (const element of image.elements) {
        const {data} = element;

        if (data.indexOf(GBL_HEADER_TAG) === 0) {
            validateSilabsGbl(data);
        } else {
            const tag = data.readUInt16BE(0);

            /* istanbul ignore next */
            if ((tag === EBL_TAG_HEADER && data.readUInt16BE(6) === EBL_IMAGE_SIGNATURE) || tag === EBL_TAG_ENC_HEADER) {
                validateSilabsEbl(data);
            }
        }
    }
}

/* istanbul ignore next */
function validateSilabsEbl(data: Buffer): void {
    const dataLength = data.length;

    let position = 0;

    while (position + 4 <= dataLength) {
        const tag = data.readUInt16BE(position);
        const len = data.readUInt16BE(position + 2);

        position += 4 + len;

        if (tag !== EBL_TAG_END) {
            continue;
        }

        for (let position2 = position; position2 < dataLength; position2++) {
            assert(data.readUInt8(position2) === EBL_PADDING, "Image padding contains invalid bytes");
        }

        const calculatedCrc32 = crc32(data.subarray(0, position));

        assert(calculatedCrc32 === VALID_SILABS_CRC, "Image CRC-32 is invalid");

        return;
    }

    throw new Error("Image is truncated, not long enough to contain a valid tag");
}

function validateSilabsGbl(data: Buffer): void {
    assert(data.indexOf(GBL_HEADER_TAG) === 0, "Not a valid GBL image");

    const gblEndTagIndex = data.lastIndexOf(GBL_END_TAG);

    assert(gblEndTagIndex > 16, "Not a valid GBL image"); // after HEADER, just because...

    const gblEnd = gblEndTagIndex + 12; // tag + length + crc32 (4*3)
    // ignore possible padding
    const calculatedCrc32 = crc32(data.subarray(0, gblEnd));

    assert(calculatedCrc32 === VALID_SILABS_CRC, "Image CRC-32 is invalid");
}

function fillImageInfo(meta: Ota.ZigbeeOTAImageMeta): Ota.ZigbeeOTAImageMeta {
    // Web-hosted images must come with all fields filled already
    if (isValidUrl(meta.url)) {
        return meta;
    }

    // Nothing to do if needed fields were filled already
    if (meta.imageType !== undefined && meta.manufacturerCode !== undefined && meta.fileVersion !== undefined) {
        return meta;
    }

    // If no fields provided - get them from the image file
    const imageFile = readLocalFile(meta.url);
    const otaIdentifier = imageFile.indexOf(UPGRADE_FILE_IDENTIFIER);

    assert(otaIdentifier !== -1, "Not a valid OTA file");

    // allow bypass non-spec Ledvance OTA files if proper manufacturer set
    const image = parseImage(imageFile.subarray(otaIdentifier), meta.manufacturerCode === Zcl.ManufacturerCode.LEDVANCE_GMBH, meta.customParseLogic);

    // Will fill only those fields that were absent
    if (meta.imageType === undefined) {
        meta.imageType = image.header.imageType;
    }

    if (meta.manufacturerCode === undefined) {
        meta.manufacturerCode = image.header.manufacturerCode;
    }

    if (meta.fileVersion === undefined) {
        meta.fileVersion = image.header.fileVersion;
    }

    return meta;
}

async function getIndex(previous: boolean): Promise<Ota.ZigbeeOTAImageMeta[]> {
    const mainIndex = await getJson<Ota.ZigbeeOTAImageMeta[]>(previous ? ZIGBEE_OTA_PREVIOUS_URL : ZIGBEE_OTA_LATEST_URL);

    logger.debug("Downloaded main index", NS);

    if (overrideIndexFileName) {
        logger.debug(`Loading override index '${overrideIndexFileName}'`, NS);

        const localIndex = isValidUrl(overrideIndexFileName)
            ? await getJson<Ota.ZigbeeOTAImageMeta[]>(overrideIndexFileName)
            : (JSON.parse(readFileSync(overrideIndexFileName, "utf-8")) as Ota.ZigbeeOTAImageMeta[]);

        // Resulting index will have overridden items first
        return localIndex.map((image) => fillImageInfo(image)).concat(mainIndex);
    }

    return mainIndex;
}

function deviceLogString(device: Zh.Device): string {
    return `[${device.ieeeAddr} | ${device.modelID}]`;
}

// #endregion
// #region OTA

function cancelWaiters(waiters: Waiters): void {
    waiters.imageBlockOrPageRequest?.cancel();
    waiters.upgradeEndRequest?.cancel();
}

function getOTAEndpoint(device: Zh.Device): Zh.Endpoint | undefined {
    return device.endpoints.find((e) => e.supportsOutputCluster("genOta"));
}

async function sendQueryNextImageResponse(
    device: Zh.Device,
    endpoint: Zh.Endpoint,
    image: Ota.Image | undefined,
    requestTransactionSequenceNumber: number,
): Promise<void> {
    const payload: QueryNextImageResponsePayload = image
        ? {
              status: Zcl.Status.SUCCESS,
              manufacturerCode: image.header.manufacturerCode,
              imageType: image.header.imageType,
              fileVersion: image.header.fileVersion,
              imageSize: image.header.totalImageSize,
          }
        : {status: Zcl.Status.NO_IMAGE_AVAILABLE};

    try {
        await endpoint.commandResponse("genOta", "queryNextImageResponse", payload, undefined, requestTransactionSequenceNumber);
    } catch (error) {
        logger.debug(() => `${deviceLogString(device)} Failed to send queryNextImageResponse: ${(error as Error).message}`, NS);
    }
}

async function imageNotify(endpoint: Zh.Endpoint): Promise<void> {
    await endpoint.commandResponse("genOta", "imageNotify", {payloadType: 0, queryJitter: 100} as ImageNotifyPayload, {sendPolicy: "immediate"});
}

async function requestOTA(endpoint: Zh.Endpoint): Promise<[transNum: number, Ota.ImageInfo]> {
    // Some devices (e.g. Insta) take very long trying to discover the correct coordinator EP for OTA.
    const queryNextImageRequest = endpoint.waitForCommand(
        "genOta",
        "queryNextImageRequest",
        undefined,
        60000,
    ) as Request<QueryNextImageRequestPayload>;

    try {
        await imageNotify(endpoint);
        const response = await queryNextImageRequest.promise;

        return [response.header.transactionSequenceNumber, response.payload as Ota.ImageInfo];
    } catch {
        queryNextImageRequest.cancel();

        throw new Error(`Device didn't respond to OTA request`);
    }
}

// this is not significant for tests, skipping coverage
/* istanbul ignore next */
function getInitialMaximumDataSize(imageBlockRequest: CommandResult<ImageBlockRequestPayload>): number {
    if (imageBlockRequest.payload.manufacturerCode === Zcl.ManufacturerCode.INSTA_GMBH) {
        // Insta devices, OTA only works for data sizes 40 and smaller (= manufacturerCode 4474).
        return 40;
    }
    if (imageBlockRequest.payload.manufacturerCode === Zcl.ManufacturerCode.LEGRAND_GROUP) {
        // Legrand devices (newer firmware) require up to 64 bytes (= manufacturerCode 4129).
        return Number.POSITIVE_INFINITY;
    }

    return initialMaximumDataSize;
}

function getImageBlockResponsePayload(
    device: Zh.Device,
    image: Ota.Image,
    imageBlockRequest: CommandResult<ImageBlockRequestPayload>,
    pageOffset: number,
    pageSize: number,
): ImageBlockResponsePayload {
    let dataSize = Math.min(getInitialMaximumDataSize(imageBlockRequest), imageBlockRequest.payload.maximumDataSize);
    let start = imageBlockRequest.payload.fileOffset + pageOffset;

    // Hack for https://github.com/Koenkk/zigbee-OTA/issues/328 (Legrand OTA not working)
    /* istanbul ignore next */
    if (
        imageBlockRequest.payload.manufacturerCode === Zcl.ManufacturerCode.LEGRAND_GROUP &&
        imageBlockRequest.payload.fileOffset === 50 &&
        imageBlockRequest.payload.maximumDataSize === 12
    ) {
        logger.info(() => `${deviceLogString(device)} Detected Legrand firmware issue, attempting to reset the OTA stack`, NS);
        // The following vector seems to buffer overflow the device to reset the OTA stack!
        start = 78;
        dataSize = 64;
    }

    if (pageSize) {
        dataSize = Math.min(dataSize, pageSize - pageOffset);
    }

    let end = start + dataSize;

    if (end > image.raw.length) {
        end = image.raw.length;
    }

    logger.debug(
        () =>
            `${deviceLogString(device)} Request offsets: fileOffset=${imageBlockRequest.payload.fileOffset} pageOffset=${pageOffset} maximumDataSize=${imageBlockRequest.payload.maximumDataSize}`,
        NS,
    );
    logger.debug(() => `${deviceLogString(device)} Payload offsets: start=${start} end=${end} dataSize=${dataSize}`, NS);

    return {
        status: Zcl.Status.SUCCESS,
        manufacturerCode: imageBlockRequest.payload.manufacturerCode,
        imageType: imageBlockRequest.payload.imageType,
        fileVersion: imageBlockRequest.payload.fileVersion,
        fileOffset: start,
        dataSize: end - start,
        data: image.raw.subarray(start, end),
    };
}

function callOnProgress(
    device: Zh.Device,
    startTime: number,
    lastUpdate: number | undefined,
    imageBlockRequest: CommandResult<ImageBlockRequestPayload>,
    image: Ota.Image,
    onProgress: Ota.OnProgress,
): number {
    const now = Date.now();

    // Call on progress every +- 30 seconds
    if (lastUpdate === undefined || now - lastUpdate > 30000) {
        const totalDuration = (now - startTime) / 1000; // in seconds
        const bytesPerSecond = imageBlockRequest.payload.fileOffset / totalDuration;
        const remaining = (image.header.totalImageSize - imageBlockRequest.payload.fileOffset) / bytesPerSecond;
        let percentage = imageBlockRequest.payload.fileOffset / image.header.totalImageSize;
        percentage = Math.round(percentage * 10000) / 100;

        logger.debug(() => `${deviceLogString(device)} Update at ${percentage}%, remaining ${remaining} seconds`, NS);
        onProgress(percentage, remaining === Number.POSITIVE_INFINITY ? undefined : remaining);

        return now;
    }
    return lastUpdate;
}

async function getImageMeta(
    current: Ota.ImageInfo,
    device: Zh.Device,
    extraMetas: Ota.ExtraMetas,
    previous: boolean,
): Promise<Ota.ZigbeeOTAImageMeta | undefined> {
    logger.debug(() => `${deviceLogString(device)} Getting image metadata...`, NS);
    const images = await getIndex(previous);
    // NOTE: Officially an image can be determined with a combination of manufacturerCode and imageType.
    // However Gledopto pro products use the same imageType (0) for every device while the image is different.
    // For this case additional identification through the modelId is done.
    // In the case of Tuya and Moes, additional identification is carried out through the manufacturerName.
    return images.find(
        (i) =>
            i.imageType === current.imageType &&
            i.manufacturerCode === current.manufacturerCode &&
            (i.minFileVersion === undefined || current.fileVersion >= i.minFileVersion) &&
            (i.maxFileVersion === undefined || current.fileVersion <= i.maxFileVersion) &&
            // let extra metas override the match from device.modelID, same for manufacturerName
            (!i.modelId || i.modelId === device.modelID || i.modelId === extraMetas.modelId) &&
            (!i.manufacturerName ||
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                i.manufacturerName.includes(device.manufacturerName!) ||
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                i.manufacturerName.includes(extraMetas.manufacturerName!)) &&
            (!extraMetas.otaHeaderString || i.otaHeaderString === extraMetas.otaHeaderString) &&
            (i.hardwareVersionMin === undefined ||
                (current.hardwareVersion !== undefined && current.hardwareVersion >= i.hardwareVersionMin) ||
                (extraMetas.hardwareVersionMin !== undefined && extraMetas.hardwareVersionMin >= i.hardwareVersionMin)) &&
            (i.hardwareVersionMax === undefined ||
                (current.hardwareVersion !== undefined && current.hardwareVersion <= i.hardwareVersionMax) ||
                (extraMetas.hardwareVersionMax !== undefined && extraMetas.hardwareVersionMax <= i.hardwareVersionMax)),
    );
}

async function isImageAvailable(
    current: Ota.ImageInfo,
    device: Zh.Device,
    extraMetas: Ota.ExtraMetas,
    previous: boolean,
): Promise<Omit<Ota.UpdateAvailableResult, "available"> & {available: number}> {
    const imageSet = previous ? "previous" : "latest";

    logger.debug(() => `${deviceLogString(device)} Checking ${imageSet} image availability, current: ${JSON.stringify(current)}`, NS);

    // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
    if (["lumi.airrtc.agl001", "lumi.curtain.acn003", "lumi.curtain.agl001"].includes(device.modelID!)) {
        // The current.fileVersion which comes from the device is wrong.
        // Use the `lumiFileVersion` which comes from the manuSpecificLumi.attributeReport instead.
        // https://github.com/Koenkk/zigbee2mqtt/issues/16345#issuecomment-1454835056
        // https://github.com/Koenkk/zigbee2mqtt/issues/16345 doesn't seem to be needed for all
        // https://github.com/Koenkk/zigbee2mqtt/issues/15745
        if (device.meta.lumiFileVersion) {
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            current = {...current, fileVersion: device.meta.lumiFileVersion};
        }
    }

    const meta = await getImageMeta(current, device, extraMetas, previous);

    // Soft-fail because no images in repo/URL for specified device
    if (!meta) {
        logger.debug(() => `${deviceLogString(device)} No ${imageSet} image currently available, current: ${JSON.stringify(current)}'`, NS);

        return {
            available: 0,
            currentFileVersion: current.fileVersion,
            otaFileVersion: current.fileVersion,
        };
    }

    logger.debug(() => `${deviceLogString(device)} Result for ${imageSet} image availability, meta: '${JSON.stringify(meta)}'`, NS);

    /* istanbul ignore next */
    if (meta.releaseNotes) {
        logger.info(
            () =>
                `${deviceLogString(device)} Firmware release notes: ${
                    // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                    meta.releaseNotes!.replace(/[\r\n]/g, "")
                }`,
            NS,
        );
    }

    // Negative number means the firmware is 'newer' than current one
    // Positive number means the firmware is 'older' than current one
    return {
        available: meta.force ? -1 : Math.sign(current.fileVersion - meta.fileVersion),
        currentFileVersion: current.fileVersion,
        otaFileVersion: meta.fileVersion,
    };
}

async function getImage(current: Ota.ImageInfo, device: Zh.Device, extraMetas: Ota.ExtraMetas, previous: boolean): Promise<Ota.Image> {
    const meta = await getImageMeta(current, device, extraMetas, previous);

    if (!meta) {
        throw new Error(`${deviceLogString(device)} No image currently available`);
    }

    const imageSet = previous ? "previous" : "latest";

    logger.info(() => `${deviceLogString(device)} Getting ${imageSet} image, meta: ${JSON.stringify(meta)}`, NS);

    if (previous) {
        assert(meta.fileVersion < current.fileVersion || meta.force, "No previous image available");
    } else {
        assert(meta.fileVersion > current.fileVersion || meta.force, "No new image available");
    }

    const downloadedFile = await getFirmwareFile(meta);

    if (meta.sha512) {
        const hash = crypto.createHash("sha512");
        hash.update(downloadedFile);

        assert(hash.digest("hex") === meta.sha512, "File checksum validation failed");
        logger.debug(() => `${deviceLogString(device)} Image checksum validation succeeded.`, NS);
    }

    const otaIdentifier = downloadedFile.indexOf(UPGRADE_FILE_IDENTIFIER);

    assert(otaIdentifier !== -1, "Not a valid OTA file");

    const image = parseImage(downloadedFile.subarray(otaIdentifier), extraMetas.suppressElementImageParseFailure || false, meta.customParseLogic);

    logger.debug(() => `${deviceLogString(device)} Got ${imageSet} image, header: ${JSON.stringify(image.header)}`, NS);

    assert(image.header.fileVersion === meta.fileVersion, "File version mismatch");
    assert(!meta.fileSize || image.header.totalImageSize === meta.fileSize, "Image size mismatch");
    assert(image.header.manufacturerCode === current.manufacturerCode, "Manufacturer code mismatch");
    assert(image.header.imageType === current.imageType, "Image type mismatch");

    // this is only reachable if manifest is missing hardwareVersionMin/Max
    if (
        "minimumHardwareVersion" in image.header &&
        image.header.minimumHardwareVersion !== undefined &&
        "maximumHardwareVersion" in image.header &&
        image.header.maximumHardwareVersion !== undefined
    ) {
        assert(current.hardwareVersion !== undefined, "Hardware version required");
        assert(
            image.header.minimumHardwareVersion <= current.hardwareVersion && current.hardwareVersion <= image.header.maximumHardwareVersion,
            "Hardware version mismatch",
        );
    }

    validateImageData(image);

    return image;
}

export async function isUpdateAvailable(
    device: Zh.Device,
    extraMetas: Ota.ExtraMetas,
    requestPayload: Ota.ImageInfo | undefined,
    previous: boolean,
): Promise<Ota.UpdateAvailableResult> {
    logger.debug(() => `${deviceLogString(device)} Checking if an update is available`, NS);

    if (device.modelID === "PP-WHT-US") {
        // see https://github.com/Koenkk/zigbee-OTA/pull/14
        const scenesEndpoint = device.endpoints.find((e) => e.supportsOutputCluster("genScenes"));

        if (scenesEndpoint) {
            await scenesEndpoint.write("genScenes", {currentGroup: 49502});
        }
    }

    if (requestPayload === undefined) {
        const endpoint = getOTAEndpoint(device);
        assert(endpoint !== undefined, `${deviceLogString(device)} Failed to find an endpoint which supports the OTA cluster`);

        logger.debug(() => `${deviceLogString(device)} Using endpoint '${endpoint.ID}'`, NS);

        const [, payload] = await requestOTA(endpoint);

        logger.debug(() => `${deviceLogString(device)} Got request '${JSON.stringify(payload)}'`, NS);

        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        requestPayload = payload;
    }

    const availableResult = await isImageAvailable(requestPayload, device, extraMetas, previous);
    let available = false;

    if (previous) {
        available = availableResult.available > 0;

        logger.debug(() => `${deviceLogString(device)} Downgrade available: ${available ? "YES" : "NO"}`, NS);
    } else {
        available = availableResult.available < 0;

        logger.debug(() => `${deviceLogString(device)} Upgrade available: ${available ? "YES" : "NO"}`, NS);

        if (availableResult.available > 0) {
            logger.warning(() => `${deviceLogString(device)} Firmware is newer than latest available firmware.`, NS);
        }
    }

    return {...availableResult, available};
}

// this is not significant for tests, skipping coverage
/* istanbul ignore next */
function getImageBlockOrPageRequestTimeoutMs(requestPayload: Ota.ImageInfo): number {
    // increase the upgradeEndReq wait time to solve the problem of OTA timeout failure of Sonoff Devices
    // (https://github.com/Koenkk/zigbee-herdsman-converters/issues/6657)
    if (requestPayload.manufacturerCode === Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD && requestPayload.imageType === 8199) {
        return 3600000;
    }

    // Bosch transmits the firmware updates in the background in their native implementation.
    // According to the app, this can take up to 2 days. Therefore, we assume to get at least
    // one package request per hour from the device here.
    if (requestPayload.manufacturerCode === Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH) {
        return 60 * 60 * 1000;
    }

    // Increase the timeout for Legrand devices, so that they will re-initiate and update themselves
    // Newer firmwares have awkward behaviours when it comes to the handling of the last bytes of OTA updates
    if (requestPayload.manufacturerCode === Zcl.ManufacturerCode.LEGRAND_GROUP) {
        return 30 * 60 * 1000;
    }

    return 150000;
}

/**
 * @see https://zigbeealliance.org/wp-content/uploads/2021/10/07-5123-08-Zigbee-Cluster-Library.pdf 11.12
 */
export async function update(
    device: Zh.Device,
    extraMetas: Ota.ExtraMetas,
    previous: boolean,
    onProgress: Ota.OnProgress,
    requestPayload: Ota.ImageInfo,
    reqTransNum: number,
): Promise<number | undefined>;
export async function update(
    device: Zh.Device,
    extraMetas: Ota.ExtraMetas,
    previous: boolean,
    onProgress: Ota.OnProgress,
): Promise<number | undefined>;
export async function update(
    device: Zh.Device,
    extraMetas: Ota.ExtraMetas,
    previous: boolean,
    onProgress: Ota.OnProgress,
    requestPayload?: Ota.ImageInfo,
    reqTransNum?: number,
): Promise<number | undefined> {
    const imageSet = previous ? "previous" : "latest";

    logger.debug(() => `${deviceLogString(device)} Updating to ${imageSet}`, NS);

    const endpoint = getOTAEndpoint(device);
    assert(endpoint !== undefined, `${deviceLogString(device)} Failed to find an endpoint which supports the OTA cluster`);

    logger.debug(() => `${deviceLogString(device)} Using endpoint '${endpoint.ID}'`, NS);

    if (device.modelID === "PP-WHT-US") {
        // see https://github.com/Koenkk/zigbee-OTA/pull/14
        const scenesEndpoint = device.endpoints.find((e) => e.supportsOutputCluster("genScenes"));

        if (scenesEndpoint) {
            await scenesEndpoint.write("genScenes", {currentGroup: 49502});
        }
    }

    if (!requestPayload) {
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        [reqTransNum, requestPayload] = await requestOTA(endpoint);

        logger.debug(() => `${deviceLogString(device)} Got request payload '${JSON.stringify(requestPayload)}'`, NS);
    }

    let image: Ota.Image | undefined;

    try {
        image = await getImage(requestPayload, device, extraMetas, previous);

        logger.debug(() => `${deviceLogString(device)} Got ${imageSet} image`, NS);
    } catch (error) {
        logger.info(() => `${deviceLogString(device)} No image currently available (${(error as Error).message})`, NS);
    }

    // reply to `queryNextImageRequest` in `requestOTA` now that we have the data for it,
    // should trigger image block/page request from device
    await sendQueryNextImageResponse(device, endpoint, image, reqTransNum);

    if (!image) {
        return undefined;
    }

    const waiters: Waiters = {};
    let lastBlockResponseTime = 0;
    let lastBlockTimeout: NodeJS.Timeout;
    let lastUpdate: number | undefined;
    const startTime = Date.now();

    const sendImageBlockResponse = async (
        imageBlockRequest: CommandResult<ImageBlockRequestPayload>,
        pageOffset: number,
        pageSize: number,
    ): Promise<number> => {
        // Reduce network congestion by throttling response if necessary
        {
            clearTimeout(lastBlockTimeout);

            const now = Date.now();
            const timeSinceLast = now - lastBlockResponseTime;
            const delay = imageBlockResponseDelay - timeSinceLast;

            if (delay <= 0) {
                lastBlockResponseTime = now;
            } else {
                await new Promise<void>((resolve) => {
                    lastBlockTimeout = setTimeout(() => {
                        lastBlockResponseTime = Date.now();
                        resolve();
                    }, delay);
                });
            }
        }

        try {
            const blockPayload = getImageBlockResponsePayload(device, image, imageBlockRequest, pageOffset, pageSize);

            await endpoint.commandResponse(
                "genOta",
                "imageBlockResponse",
                blockPayload,
                undefined,
                imageBlockRequest.header.transactionSequenceNumber,
            );

            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            pageOffset += blockPayload.dataSize;
        } catch (error) {
            // Shit happens, device will probably do a new imageBlockRequest so don't care.
            logger.debug(() => `${deviceLogString(device)} Image block response failed: ${(error as Error).message}`, NS);
        }

        lastUpdate = callOnProgress(device, startTime, lastUpdate, imageBlockRequest, image, onProgress);

        return pageOffset;
    };

    let done = false;
    const imageBlockOrPageRequestTimeoutMs = getImageBlockOrPageRequestTimeoutMs(requestPayload);

    /** recursive, endless (expects `upgradeEndRequest` to stop it, or anything that sets done=true) */
    const sendImageChunks = async (): Promise<void> => {
        while (!done) {
            const imageBlockRequest = endpoint.waitForCommand(
                "genOta",
                "imageBlockRequest",
                undefined,
                imageBlockOrPageRequestTimeoutMs,
            ) as Request<ImageBlockRequestPayload>;

            const imagePageRequest = endpoint.waitForCommand(
                "genOta",
                "imagePageRequest",
                undefined,
                imageBlockOrPageRequestTimeoutMs,
            ) as Request<ImagePageRequestPayload>;

            waiters.imageBlockOrPageRequest = {
                promise: Promise.race([imageBlockRequest.promise, imagePageRequest.promise]),
                cancel: () => {
                    imageBlockRequest.cancel();
                    imagePageRequest.cancel();
                },
            };

            try {
                const result = await waiters.imageBlockOrPageRequest.promise;
                let pageSize = 0;
                let pageOffset = 0;

                if ("pageSize" in result.payload) {
                    // TODO: `result.payload.responseSpacing` support?
                    // imagePageRequest
                    pageSize = result.payload.pageSize;

                    while (pageOffset < pageSize) {
                        // in case upgradeEndRequest resolves, bail early (quirks)
                        if (done) {
                            return;
                        }

                        pageOffset = await sendImageBlockResponse(result, pageOffset, pageSize);
                    }
                } else {
                    // imageBlockRequest
                    pageOffset = await sendImageBlockResponse(result, pageOffset, pageSize);
                }
            } catch (error) {
                cancelWaiters(waiters);
                throw new Error(
                    `${deviceLogString(device)} Timeout. Device did not start/finish firmware download after being notified. (${(error as Error).message})`,
                );
            }
        }
    };

    logger.debug(() => `${deviceLogString(device)} Starting update`, NS);

    waiters.upgradeEndRequest = endpoint.waitForCommand("genOta", "upgradeEndRequest", undefined, MAX_TIMEOUT) as Request<UpdateEndRequestPayload>;

    await Promise.race([
        sendImageChunks(),
        waiters.upgradeEndRequest.promise.finally(() => {
            clearTimeout(lastBlockResponseTime);
            // always clear state
            cancelWaiters(waiters);

            done = true;
        }),
    ]);

    // already resolved when this is reached
    const endResult = await waiters.upgradeEndRequest.promise;

    logger.debug(() => `${deviceLogString(device)} Got upgrade end request: ${JSON.stringify(endResult.payload)}`, NS);

    if (endResult.payload.status === Zcl.Status.SUCCESS) {
        const payload: UpgradeEndResponsePayload = {
            manufacturerCode: image.header.manufacturerCode,
            imageType: image.header.imageType,
            fileVersion: image.header.fileVersion,
            currentTime: 0,
            upgradeTime: 1,
        };

        try {
            await endpoint.commandResponse("genOta", "upgradeEndResponse", payload, undefined, endResult.header.transactionSequenceNumber);

            logger.debug(() => `${deviceLogString(device)} Update successful. Waiting for device announce...`, NS);

            onProgress(100, undefined);

            let timer: NodeJS.Timeout;
            const newFileVersion = image.header.fileVersion;

            return await new Promise<number>((resolve) => {
                // XXX: annoying to test since using fake timers, same result anyway
                /* istanbul ignore next */
                const onDeviceAnnounce = () => {
                    clearTimeout(timer);
                    logger.debug(() => `${deviceLogString(device)} Received device announce, update finished.`, NS);
                    resolve(newFileVersion);
                };

                // force "finished" after given time
                timer = setTimeout(() => {
                    device.removeListener("deviceAnnounce", onDeviceAnnounce);
                    logger.debug(() => `${deviceLogString(device)} Timed out waiting for device announce, update considered finished.`, NS);
                    resolve(newFileVersion);
                }, UPDATE_END_FORCE_RESOLVE_TIME);

                device.once("deviceAnnounce", onDeviceAnnounce);
            });
        } catch (error) {
            throw new Error(`Upgrade end response failed: ${(error as Error).message}`);
        }
    } else {
        /**
         * For other status value received such as INVALID_IMAGE, REQUIRE_MORE_IMAGE, or ABORT,
         * the upgrade server SHALL not send Upgrade End Response command but it SHALL send default
         * response command with status of success and it SHALL wait for the client to reinitiate the upgrade process.
         */
        try {
            await endpoint.defaultResponse(
                Zcl.Clusters.genOta.commands.upgradeEndRequest.ID,
                Zcl.Status.SUCCESS,
                Zcl.Clusters.genOta.ID,
                endResult.header.transactionSequenceNumber,
            );
        } catch (error) {
            logger.debug(() => `${deviceLogString(device)} Upgrade end request default response failed: ${(error as Error).message}`, NS);
        }

        throw new Error(`Update failed with reason: ${Zcl.Status[endResult.payload.status]}`);
    }
}

// #endregion
