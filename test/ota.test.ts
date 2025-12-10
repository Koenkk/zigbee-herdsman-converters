import crypto from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import path from "node:path";
import {EventEmitter} from "node:stream";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import ZclTransactionSequenceNumber from "zigbee-herdsman/dist/controller/helpers/zclTransactionSequenceNumber";
import {Waitress} from "zigbee-herdsman/dist/utils/waitress";
import {
    DEFAULT_IMAGE_BLOCK_RESPONSE_DELAY,
    type ImageBlockRequestPayload,
    type ImageNotifyPayload,
    type ImagePageRequestPayload,
    isUpdateAvailable,
    parseImage,
    type QueryNextImageRequestPayload,
    type QueryNextImageResponsePayload,
    setConfiguration,
    UPGRADE_FILE_IDENTIFIER,
    type UpdateEndRequestPayload,
    type UpgradeEndResponsePayload,
    update,
    ZIGBEE_OTA_LATEST_URL,
    ZIGBEE_OTA_PREVIOUS_URL,
} from "../src/lib/ota";
import type {KeyValueAny, Ota, Zh} from "../src/lib/types";
import {sleep} from "../src/lib/utils";

interface WaitressMatcher {
    clusterID: number;
    commandIdentifier: number;
    transactionSequenceNumber?: number;
}
type CommandResult = {
    clusterID: number;
    header: {
        commandIdentifier: number;
        transactionSequenceNumber: number;
    };
    payload: KeyValueAny;
};

// biome-ignore lint/suspicious/noExportsInTest: https://github.com/jestjs/jest/issues/6028#issuecomment-567669082
export function defuseRejection<T>(promise: Promise<T>): Promise<T> {
    promise.catch(() => {});

    return promise;
}

function fixVitestExplorerPath(filepath: string): string {
    return path.resolve(filepath).replace(/test(\/|\\)test/, "test");
}

const ZIGBEE_OTA_MASTER_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/";
const BASE_IMAGES_DIRNAME = "images";
const PREV_IMAGES_DIRNAME = "images1";
const TEST_BASE_IMAGES_DIRNAME = "otaUpgradeImages";
const TEST_PREV_IMAGES_DIRNAME = "otaDowngradeImages";
const TEST_BASE_MANIFEST_INDEX_FILEPATH = path.join("test", "stub", "otaIndex.json");
const TEST_PREV_MANIFEST_INDEX_FILEPATH = path.join("test", "stub", "otaIndex1.json");
const TEST_BASE_IMAGES_DIRPATH = path.join("test", "stub", TEST_BASE_IMAGES_DIRNAME);
const TEST_PREV_IMAGES_DIRPATH = path.join("test", "stub", TEST_PREV_IMAGES_DIRNAME);

const BOSCH_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/Bosch/0x1209_0x3011_0x03076a30.ota";
const GLEDOPTO_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/Gledopto/GL-S-007P_V15_A1_OTAV5_20210201_90%.ota";
const GAMMA_TRONIQUES_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/GammaTroniques/TICMeter.ota";
const IKEA_BASE_URL =
    "https://github.com/Koenkk/zigbee-OTA/raw/master/images/IKEA/inspelning-smart-plug-soc_release_prod_v33816645_02579ff4-6fec-42f6-8957-4048def87def.ota";
const INNR_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/Innr/1166-022D-24031511-upgradeMe-BY 266.zigbee";
const INOVELLI_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/Inovelli/VZM31-SN_2.18-Production.ota";
const LEDVANCE_BASE_URL =
    "https://github.com/Koenkk/zigbee-OTA/raw/master/images/LEDVANCE/A60_TW_Value_II-0x1189-0x008B-0x03177310-MF_DIS-20240426150951-3221010102432.ota";
const LIXEE_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/LiXee/ZLinky_router_v14_limited.ota";
const SALUS_CONTROLS_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/SalusControls/WindowSensor_20240103.ota";
const SECURIFI_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/Tuya/ZPS_CS5490_039.ota";
const UBISYS_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/Ubisys/10F2-7B3A-0000-0005-02500447-m7b-r0.ota.zigbee";
const TELINK_BASE_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images/Sonoff/SN-TLSR8656-02LWD-01-v1.1.0.ota";

const INOVELLI_PREV_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images1/Inovelli/VZM31-SN_2.15-Production.ota";
const XYZROE_PREV_URL = "https://github.com/Koenkk/zigbee-OTA/raw/master/images1/xyzroe/ZigUSB_C6.ota";

// NOTE: takes too long to run this with CI, can enable locally as needed
describe("OTA", () => {
    let maximumDataSize = 64;
    const txRandomDelay = () => Math.floor(Math.random() * 500);
    const mockTXDelay = vi.fn(txRandomDelay); // arbitrary, but less than min timeout involved (queryNextImageRequest === 60000)
    const waitressValidator = vi.fn((payload: CommandResult, matcher: WaitressMatcher): boolean => {
        return (
            payload.header &&
            payload.clusterID === matcher.clusterID &&
            payload.header.commandIdentifier === matcher.commandIdentifier &&
            (!matcher.transactionSequenceNumber || payload.header.transactionSequenceNumber === matcher.transactionSequenceNumber)
        );
    });
    const waitressTimeoutFormatter = vi.fn(
        (matcher: WaitressMatcher, timeout: number) =>
            `Timeout - ${matcher.clusterID} - ${matcher.commandIdentifier} - ${matcher.transactionSequenceNumber}`,
    );
    const waitress: Waitress<CommandResult, WaitressMatcher> = new Waitress<CommandResult, WaitressMatcher>(
        waitressValidator,
        waitressTimeoutFormatter,
    );
    const mockWaitressResolve = vi.fn(async (payload: CommandResult): Promise<boolean> => {
        // rnd wait time to trigger throttling randomly (min 25ms, can't be instant due to waitForCommand starting immediately)
        await sleep(mockTXDelay() + 25);

        return waitress.resolve(payload);
    });

    let stopRequestingBlocks = false;
    let failImageBlockResponse = false;
    let failQueryNextImageResponse = false;
    let useImagePageRequest = false;
    let failQueryNextImageRequest = false;
    let failUpgradeEndResponse = false;
    let upgradeEndRequestBadStatus = false;

    const getLocalPath = (fromUrl: string): string[] => fromUrl.split("/").slice(-2);
    let fetchReturnedStatus: {ok: boolean; status: number; body: unknown} = {ok: true, status: 200, body: 1 /* just needs to not be falsy */};
    const mockGetLatestManifest = vi.fn(
        () => JSON.parse(readFileSync(fixVitestExplorerPath(TEST_BASE_MANIFEST_INDEX_FILEPATH), "utf8")) as Ota.ZigbeeOTAImageMeta[],
    );
    const mockGetPreviousManifest = vi.fn(
        () => JSON.parse(readFileSync(fixVitestExplorerPath(TEST_PREV_MANIFEST_INDEX_FILEPATH), "utf8")) as Ota.ZigbeeOTAImageMeta[],
    );
    const mockGetFirmwareFile = vi.fn((urlStr: string) => {
        const dirPath = urlStr.startsWith(`${ZIGBEE_OTA_MASTER_URL}${BASE_IMAGES_DIRNAME}/`) ? TEST_BASE_IMAGES_DIRPATH : TEST_PREV_IMAGES_DIRPATH;
        const filePaths = getLocalPath(urlStr);
        const filePath = path.join(dirPath, ...filePaths);

        console.log(`Getting image: ${filePath} using ${urlStr}`);

        return readFileSync(fixVitestExplorerPath(filePath));
    });
    const fetchOverride = (urlStr: string | URL | Request) => {
        if (urlStr === ZIGBEE_OTA_LATEST_URL) {
            return {
                ok: fetchReturnedStatus.ok,
                status: fetchReturnedStatus.status,
                body: fetchReturnedStatus.body,
                json: mockGetLatestManifest,
            };
        }
        if (urlStr === ZIGBEE_OTA_PREVIOUS_URL) {
            return {
                ok: fetchReturnedStatus.ok,
                status: fetchReturnedStatus.status,
                body: fetchReturnedStatus.body,
                json: mockGetPreviousManifest,
            };
        }
        // firmware file
        return {
            ok: fetchReturnedStatus.ok,
            status: fetchReturnedStatus.status,
            body: fetchReturnedStatus.body,
            arrayBuffer: () => mockGetFirmwareFile(urlStr as string),
        };
    };
    let fetchSpy = vi.spyOn(global, "fetch").mockImplementation(
        // @ts-expect-error mocked as needed
        fetchOverride,
    );

    class MockOTAEndpoint extends EventEmitter {
        // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
        public ID: number;
        public waiters: [];
        public manufacturerCode: Zcl.ManufacturerCode;
        public currentImageType: number;
        public currentImageVersion: number;
        public endFileOffset: number;
        public reqFileOffset: number;
        public downloadedImage: Buffer;

        constructor(id: number, newImageHeader: Ota.ImageHeader, newImageRawLength: number, imageVersionOffset: number) {
            super();

            this.ID = id;
            this.waiters = [];
            this.manufacturerCode = newImageHeader.manufacturerCode;
            this.currentImageType = newImageHeader.imageType;
            this.currentImageVersion = newImageHeader.fileVersion + imageVersionOffset;
            this.endFileOffset = newImageRawLength;
            this.reqFileOffset = 0;
            this.downloadedImage = Buffer.alloc(0);
        }

        supportsOutputCluster = vi.fn((clusterKey: number | string): boolean => clusterKey === "genOta");

        commandResponse = vi.fn(
            async (
                clusterKey: number | string,
                commandKey: number | string,
                payload: KeyValueAny,
                options?: unknown,
                transactionSequenceNumber?: number,
            ): Promise<void> => {
                // just because...
                if (clusterKey !== "genOta") {
                    return await Promise.resolve();
                }

                transactionSequenceNumber = transactionSequenceNumber || ZclTransactionSequenceNumber.next();

                switch (commandKey) {
                    case "imageNotify": {
                        if (failQueryNextImageRequest) {
                            console.warn("failQueryNextImageRequest");

                            // not a reject here, let waitress timeout QueryNextImageRequestPayload
                            return await Promise.resolve();
                        }

                        // trigger queryNextImageRequest
                        mockWaitressResolve({
                            clusterID: Zcl.Clusters.genOta.ID,
                            header: {commandIdentifier: Zcl.Clusters.genOta.commands.queryNextImageRequest.ID, transactionSequenceNumber},
                            payload: {
                                fieldControl: 0,
                                manufacturerCode: this.manufacturerCode,
                                imageType: this.currentImageType,
                                fileVersion: this.currentImageVersion, // version currently installed on the device
                            } as QueryNextImageRequestPayload,
                        });

                        break;
                    }

                    case "queryNextImageResponse": {
                        if (failQueryNextImageResponse) {
                            failQueryNextImageResponse = false;

                            throw new Error("failQueryNextImageResponse");
                        }

                        // trigger first `imageBlockRequest`
                        if (payload.status === Zcl.Status.SUCCESS) {
                            // payload.fileVersion is version client is required to install
                            if (payload.fileVersion === this.currentImageVersion) {
                                return Promise.reject("Cannot perform a re-install, not supported by Zigbee spec.");
                            }

                            if (payload.fileVersion < this.currentImageVersion) {
                                console.log("Performing downgrade.");
                            } else {
                                console.log("Performing upgrade.");
                            }

                            // first imageBlockRequest can take a good long while before triggering in practice, fake it
                            await new Promise((resolve) => setTimeout(resolve, 300000));

                            this.reqFileOffset = 0; // starting at zero

                            mockWaitressResolve({
                                clusterID: Zcl.Clusters.genOta.ID,
                                header: {commandIdentifier: Zcl.Clusters.genOta.commands.imageBlockRequest.ID, transactionSequenceNumber},
                                payload: {
                                    fieldControl: 0,
                                    manufacturerCode: payload.manufacturerCode,
                                    imageType: payload.imageType,
                                    fileVersion: payload.fileVersion,
                                    fileOffset: this.reqFileOffset,
                                    maximumDataSize,
                                } as ImageBlockRequestPayload,
                            });
                        }

                        break;
                    }

                    case "imageBlockResponse": {
                        if (failImageBlockResponse) {
                            failImageBlockResponse = false;

                            throw new Error("failImageBlockResponse");
                        }

                        if (stopRequestingBlocks) {
                            console.warn("stopRequestingBlocks");

                            // not a reject here, let waitress timeout ImageBlockRequestPayload | ImagePageRequestPayload
                            return await Promise.resolve();
                        }

                        // trigger n `imageBlockRequest`
                        this.reqFileOffset += payload.dataSize;

                        const imageBlockOrPagePayload: ImageBlockRequestPayload | ImagePageRequestPayload = {
                            fieldControl: 0,
                            manufacturerCode: payload.manufacturerCode,
                            imageType: payload.imageType,
                            fileVersion: payload.fileVersion,
                            fileOffset: this.reqFileOffset,
                            maximumDataSize,
                        };

                        if (useImagePageRequest) {
                            (imageBlockOrPagePayload as ImagePageRequestPayload).pageSize = 1024;
                            (imageBlockOrPagePayload as ImagePageRequestPayload).responseSpacing = 1;
                        }

                        mockWaitressResolve({
                            clusterID: Zcl.Clusters.genOta.ID,
                            header: {commandIdentifier: Zcl.Clusters.genOta.commands.imageBlockRequest.ID, transactionSequenceNumber},
                            payload: imageBlockOrPagePayload,
                        });

                        if (this.reqFileOffset >= this.endFileOffset) {
                            // trigger `upgradeEndRequest`
                            mockWaitressResolve({
                                clusterID: Zcl.Clusters.genOta.ID,
                                header: {commandIdentifier: Zcl.Clusters.genOta.commands.upgradeEndRequest.ID, transactionSequenceNumber},
                                payload: {
                                    status: upgradeEndRequestBadStatus ? Zcl.Status.FAILURE : Zcl.Status.SUCCESS,
                                    manufacturerCode: payload.manufacturerCode,
                                    imageType: payload.imageType,
                                    fileVersion: payload.fileVersion,
                                } as UpdateEndRequestPayload,
                            });
                        }

                        this.downloadedImage = Buffer.concat([this.downloadedImage, payload.data]);

                        break;
                    }

                    case "upgradeEndResponse": {
                        if (failUpgradeEndResponse) {
                            failUpgradeEndResponse = false;

                            throw new Error("failUpgradeEndResponse");
                        }

                        // trigger deviceAnnounce event / timeout 2min
                        break;
                    }
                }

                return await Promise.resolve();
            },
        );

        waitForCommand = vi.fn(
            (
                clusterKey: number | string,
                commandKey: number | string,
                transactionSequenceNumber: number,
                timeout: number,
            ): {promise: Promise<CommandResult>; cancel: () => void} => {
                const cluster = Zcl.Utils.getCluster(clusterKey, undefined, {});
                const command = cluster.getCommand(commandKey);
                const waiter = waitress.waitFor({clusterID: cluster.ID, commandIdentifier: command.ID, transactionSequenceNumber}, timeout);

                return {cancel: (): void => waitress.remove(waiter.ID), promise: waiter.start().promise};
            },
        );

        defaultResponse = vi.fn(
            (commandID: number, status: number, clusterID: number, transactionSequenceNumber: number, options?: unknown): Promise<void> => {
                // triggered when `upgradeEndRequest` fails, per spec
                return Promise.resolve();
            },
        );
    }

    class MockDevice extends EventEmitter {
        public ieeeAddr: string;
        public modelID: string;
        public manufacturerName: string;
        public hardwareVersion = 0;
        public endpoints: MockOTAEndpoint[];
        public meta: Record<string, unknown> = {};

        constructor(ieeeAddr: string, modelID: string, manufacturerName: string, otaEndpoint: MockOTAEndpoint) {
            super();

            this.ieeeAddr = ieeeAddr;
            this.modelID = modelID;
            this.manufacturerName = manufacturerName;
            this.endpoints = [otaEndpoint];
        }
    }

    const getImage = (manifestUrl: string): Ota.Image => {
        const newImageRsp = fetchOverride(manifestUrl);
        // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
        const newImage = newImageRsp.arrayBuffer!();

        return parseImage(newImage.subarray(newImage.indexOf(UPGRADE_FILE_IDENTIFIER)));
    };

    const getDevice = async (
        manifestUrl: string,
        ieeeAddress: string,
        modelId: string,
        manufacturerName: string,
        imageVersionOffset = -1,
    ): Promise<[MockDevice, Ota.Image]> => {
        const image = await getImage(manifestUrl);

        return [
            new MockDevice(ieeeAddress, modelId, manufacturerName, new MockOTAEndpoint(1, image.header, image.raw.length, imageVersionOffset)),
            image,
        ];
    };

    const getMetas = (metaUrl: string, manifest: Ota.ZigbeeOTAImageMeta[]): Ota.ZigbeeOTAImageMeta | undefined =>
        manifest.find((m) => m.url === metaUrl);

    const getBoschDevice = (imageVersionOffset: number) =>
        getDevice(BOSCH_BASE_URL, "0x1111111111111111", "RBSH-RTH0-ZB-EU", "Bosch", imageVersionOffset);

    const getGammaTroniquesDevice = (imageVersionOffset: number) =>
        getDevice(GAMMA_TRONIQUES_BASE_URL, "0x2222222222222222", "TICMeter", "GammaTroniques", imageVersionOffset);

    const getGledoptoDevice = (imageVersionOffset: number) =>
        getDevice(GLEDOPTO_BASE_URL, "0x3333333333333333", "GL-S-007P", "Gledopto", imageVersionOffset);

    const getIKEADevice = (imageVersionOffset: number) =>
        getDevice(IKEA_BASE_URL, "0x4444444444444444", "INSPELNING Smart plug", "IKEA", imageVersionOffset);

    const getInnrDevice = (imageVersionOffset: number) => getDevice(INNR_BASE_URL, "0x5555555555555555", "BY 266", "Innr", imageVersionOffset);

    const getInovelliDevice = (imageVersionOffset: number) =>
        getDevice(INOVELLI_BASE_URL, "0x6666666666666666", "VZM31-SN", "Inovelli", imageVersionOffset);

    const getLEDVANCEDevice = (imageVersionOffset: number) =>
        getDevice(LEDVANCE_BASE_URL, "0x8888888888888888", "A60 TW Value II", "LEDVANCE", imageVersionOffset);

    const getLiXeeDevice = (imageVersionOffset: number) => getDevice(LIXEE_BASE_URL, "0x9999999999999999", "ZLinky_TIC", "LiXee", imageVersionOffset);

    const getSalusControlsDevice = (imageVersionOffset: number) =>
        getDevice(SALUS_CONTROLS_BASE_URL, "0xaaaaaaaaaaaaaaaa", "SW600", "Salus Controls", imageVersionOffset);

    const getSecurifiDevice = (imageVersionOffset: number) =>
        getDevice(SECURIFI_BASE_URL, "0xbbbbbbbbbbbbbbbb", "PP-WHT-US", "Securifi", imageVersionOffset);

    const getUbisysDevice = (imageVersionOffset: number) =>
        getDevice(UBISYS_BASE_URL, "0xcccccccccccccccc", "R0 (5501)", "Ubisys", imageVersionOffset);

    const getXyzroePrevDevice = (imageVersionOffset: number) =>
        getDevice(XYZROE_PREV_URL, "0xffffffffeeeeeeee", "ZigUSB_C6", "xyzroe", imageVersionOffset);

    const getRequestPayloadFromImage = (image: Ota.Image, imageVersionOffset = 0) => ({
        imageType: image.header.imageType,
        fileVersion: image.header.fileVersion + imageVersionOffset,
        manufacturerCode: image.header.manufacturerCode,
    });

    const DEFAULT_CONFIG = {
        dataDir: path.join("test", "stub"),
    };

    beforeAll(() => {
        vi.useFakeTimers();
        setConfiguration(DEFAULT_CONFIG);
    });

    afterAll(() => {
        vi.useRealTimers();
        fetchSpy.mockRestore();
    });

    beforeEach(() => {
        mockTXDelay.mockImplementation(txRandomDelay);
        maximumDataSize = 64;
        stopRequestingBlocks = false;
        failImageBlockResponse = false;
        failQueryNextImageResponse = false;
        useImagePageRequest = false;
        failQueryNextImageRequest = false;
        failUpgradeEndResponse = false;
        upgradeEndRequestBadStatus = false;
        fetchReturnedStatus = {ok: true, status: 200, body: 1 /* just needs to not be falsy */};
        fetchSpy = vi.spyOn(global, "fetch").mockImplementation(
            // @ts-expect-error mocked as needed
            fetchOverride,
        );
        setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: undefined});
    });

    afterEach(() => {
        vi.clearAllTimers();
    });

    it("checks all test links work", async () => {
        expect(existsSync(fixVitestExplorerPath(TEST_BASE_MANIFEST_INDEX_FILEPATH))).toStrictEqual(true);
        expect(existsSync(fixVitestExplorerPath(TEST_PREV_MANIFEST_INDEX_FILEPATH))).toStrictEqual(true);

        const baseManifestRsp = fetchOverride(ZIGBEE_OTA_LATEST_URL);
        // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
        const baseManifest = baseManifestRsp.json!() as Ota.ZigbeeOTAImageMeta[];
        const prevManifestRsp = fetchOverride(ZIGBEE_OTA_PREVIOUS_URL);
        // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
        const prevManifest = prevManifestRsp.json!() as Ota.ZigbeeOTAImageMeta[];

        for (const meta of baseManifest.concat(prevManifest)) {
            const image = await getImage(meta.url);

            expect(image).not.toBeUndefined();
        }
    });

    describe("parseImage", () => {
        async function getOtaImageBuffer(baseUrl: string): Promise<Buffer> {
            const imageRsp = fetchOverride(baseUrl);
            return await imageRsp.arrayBuffer();
        }

        it("parses standard OTA file", async () => {
            const image = parseImage(await getOtaImageBuffer(IKEA_BASE_URL));

            // Validate parsing results
            expect(image.header).toStrictEqual({
                fileVersion: 33816645,
                imageType: 40766,
                manufacturerCode: 4476,
                otaHeaderFieldControl: 0,
                otaHeaderLength: 56,
                otaHeaderString: "GBL inspelning_smart_plug_soc   ",
                otaHeaderVersion: 256,
                otaUpgradeFileIdentifier: Buffer.from([30, 241, 238, 11]),
                totalImageSize: 294530,
                zigbeeStackVersion: 2,
            });
            expect(image.elements).toStrictEqual([{data: expect.any(Buffer), tagID: 0, length: 294468}]);
            expect(image.elements[0].data.subarray(0, 5)).toStrictEqual(Buffer.from([235, 23, 166, 3, 8]));
            expect(image.elements[0].data.subarray(-5)).toStrictEqual(Buffer.from([0, 142, 158, 67, 83]));
            expect(image.raw.length).toBe(294530);
        });

        it("parses OTA file with Telink encryption", async () => {
            const image = parseImage(await getOtaImageBuffer(TELINK_BASE_URL), false, "telinkEncrypted");

            // Validate parsing results
            expect(image.header).toStrictEqual({
                fileVersion: 4352,
                imageType: 2061,
                manufacturerCode: 4742,
                otaHeaderFieldControl: 0,
                otaHeaderLength: 56,
                otaHeaderString: "Telink OTA Sample Usage         ",
                otaHeaderVersion: 256,
                otaUpgradeFileIdentifier: Buffer.from([30, 241, 238, 11]),
                totalImageSize: 167744,
                zigbeeStackVersion: 2,
            });
            expect(image.elements).toStrictEqual([{data: expect.any(Buffer), tagID: 61440, length: 167680}]);
            expect(image.elements[0].data.subarray(0, 5)).toStrictEqual(Buffer.from([244, 255, 67, 150, 128]));
            expect(image.elements[0].data.subarray(-5)).toStrictEqual(Buffer.from([20, 232, 187, 227, 237]));
            expect(image.raw.length).toBe(167744);
        });

        it("fails when parsing invalid OTA file", () => {
            expect(() => {
                parseImage(Buffer.alloc(128, 0xff));
            }).toThrow("Not a valid OTA file");
        });
    });

    describe("Checking", () => {
        const expectAvailableResult = (result: Ota.UpdateAvailableResult, available: boolean, currentFileVersion: number, otaFileVersion: number) => {
            expect(result.available).toStrictEqual(available);
            expect(result.currentFileVersion).toStrictEqual(currentFileVersion);
            expect(result.otaFileVersion).toStrictEqual(otaFileVersion);
        };

        it("fails to get latest manifest", async () => {
            fetchReturnedStatus.ok = false;
            fetchReturnedStatus.status = 429;
            const [device, image] = await getBoschDevice(-1);

            await expect(async () => {
                await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image), false);
            }).rejects.toThrow(`Invalid response from ${ZIGBEE_OTA_LATEST_URL} status=429.`);
        });

        it("fails to get previous manifest", async () => {
            fetchReturnedStatus.ok = false;
            fetchReturnedStatus.status = 403;
            const [device, image] = await getBoschDevice(-1);

            await expect(async () => {
                await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image), true);
            }).rejects.toThrow(`Invalid response from ${ZIGBEE_OTA_PREVIOUS_URL} status=403.`);
        });

        it("fails for device without OTA endpoint", async () => {
            const [device, _image] = await getBoschDevice(-1);
            device.endpoints.pop();

            await expect(async () => {
                await isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, false);
            }).rejects.toThrow(
                expect.objectContaining({message: expect.stringContaining("Failed to find an endpoint which supports the OTA cluster")}),
            );
        });

        it("finds no image with specific request payload", async () => {
            const [device, image] = await getBoschDevice(-1);

            const result = await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image), false);

            expectAvailableResult(result, false, image.header.fileVersion, image.header.fileVersion);
        });

        it("finds an image with specific request payload", async () => {
            const [device, image] = await getBoschDevice(-1);

            const result = await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image, -1), false);

            expectAvailableResult(result, true, image.header.fileVersion - 1, image.header.fileVersion);
        });

        it("finds no image without specific request payload", async () => {
            const [device, image] = await getIKEADevice(0);

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, false, image.header.fileVersion, image.header.fileVersion);
        });

        it("finds an image without specific request payload", async () => {
            const [device, image] = await getIKEADevice(-1);

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion - 1, image.header.fileVersion);
        });

        it("finds an image by minFileVersion with specific request payload", async () => {
            const [device, image] = await getInovelliDevice(-1);
            // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
            const metas = getMetas(INOVELLI_BASE_URL, mockGetLatestManifest())!;
            metas.minFileVersion = 16908810;

            mockGetLatestManifest.mockReturnValueOnce([metas]);

            const result = await isUpdateAvailable(
                device as unknown as Zh.Device,
                {},
                {
                    imageType: metas.imageType,
                    manufacturerCode: metas.manufacturerCode,
                    fileVersion: metas.minFileVersion,
                },
                false,
            );

            expectAvailableResult(result, true, metas.minFileVersion, image.header.fileVersion);
        });

        it("finds no image by minFileVersion with specific request payload", async () => {
            const [device, _image] = await getInovelliDevice(-1);
            // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
            const metas = getMetas(INOVELLI_BASE_URL, mockGetLatestManifest())!;
            metas.minFileVersion = 16908810;

            mockGetLatestManifest.mockReturnValueOnce([metas]);

            const result = await isUpdateAvailable(
                device as unknown as Zh.Device,
                {},
                {
                    imageType: metas.imageType,
                    manufacturerCode: metas.manufacturerCode,
                    fileVersion: metas.minFileVersion - 1,
                },
                false,
            );

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, metas.minFileVersion - 1, metas.minFileVersion - 1);
        });

        it("finds an image by maxFileVersion with specific request payload", async () => {
            const [device, image] = await getInovelliDevice(-1);
            // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
            const metas = getMetas(INOVELLI_BASE_URL, mockGetLatestManifest())!;
            metas.maxFileVersion = 16908815;

            mockGetLatestManifest.mockReturnValueOnce([metas]);

            const result = await isUpdateAvailable(
                device as unknown as Zh.Device,
                {},
                {
                    imageType: metas.imageType,
                    manufacturerCode: metas.manufacturerCode,
                    fileVersion: metas.maxFileVersion,
                },
                false,
            );

            expectAvailableResult(result, true, metas.maxFileVersion, image.header.fileVersion);
        });

        it("finds no image by maxFileVersion with specific request payload", async () => {
            const [device, _image] = await getInovelliDevice(-1);
            // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
            const metas = getMetas(INOVELLI_BASE_URL, mockGetLatestManifest())!;
            metas.maxFileVersion = 16908815;

            mockGetLatestManifest.mockReturnValueOnce([metas]);

            const result = await isUpdateAvailable(
                device as unknown as Zh.Device,
                {},
                {
                    imageType: metas.imageType,
                    manufacturerCode: metas.manufacturerCode,
                    fileVersion: metas.maxFileVersion + 1,
                },
                false,
            );

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, metas.maxFileVersion + 1, metas.maxFileVersion + 1);
        });

        it("finds an image by modelId", async () => {
            const [device, image] = await getXyzroePrevDevice(+1);

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, true);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion + 1, image.header.fileVersion);
        });

        it("finds an image by extra meta modelId", async () => {
            // use prev since it has modelId
            const [device, image] = await getXyzroePrevDevice(+1);
            device.modelID = "abcd";

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {modelId: "ZigUSB_C6"}, undefined, true);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion + 1, image.header.fileVersion);
        });

        it("finds an image by manufacturerName", async () => {
            const [device, image] = await getSalusControlsDevice(-1);
            // no space in manifest version, spaced by default, force it to find
            device.manufacturerName = "SalusControls";

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion - 1, image.header.fileVersion);
        });

        it("finds an image by extra meta manufacturerName", async () => {
            const [device, image] = await getSalusControlsDevice(-1);

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {manufacturerName: "SalusControls"}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion - 1, image.header.fileVersion);
        });

        it("finds no image without proper manufacturerName", async () => {
            // 'SalusControls' manifest version, 'Salus Controls' in device
            const [device, image] = await getSalusControlsDevice(-1);

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, image.header.fileVersion - 1, image.header.fileVersion - 1);
        });

        it("finds no image without proper extra meta otaHeaderString", async () => {
            const [device, image] = await getLiXeeDevice(-1);

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {otaHeaderString: "notgoingtomatch"}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, image.header.fileVersion - 1, image.header.fileVersion - 1);
        });

        it("finds an image by hardwareVersionMin", async () => {
            const [device, image] = await getUbisysDevice(-1);
            const requestPayload: Ota.ImageInfo = {
                imageType: image.header.imageType,
                manufacturerCode: image.header.manufacturerCode,
                fileVersion: image.header.fileVersion - 1,
                // 0 in manifest
                hardwareVersion: 0,
            };
            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, requestPayload, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion - 1, image.header.fileVersion);
        });

        it("finds no image without proper hardwareVersionMin", async () => {
            const [device, image] = await getUbisysDevice(-1);
            // 0 in manifest
            device.hardwareVersion = -1;

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, image.header.fileVersion - 1, image.header.fileVersion - 1);
        });

        it("finds an image by hardwareVersionMax", async () => {
            const [device, image] = await getUbisysDevice(-1);
            const requestPayload: Ota.ImageInfo = {
                imageType: image.header.imageType,
                manufacturerCode: image.header.manufacturerCode,
                fileVersion: image.header.fileVersion - 1,
                // 5 in manifest
                hardwareVersion: 5,
            };
            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, requestPayload, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion - 1, image.header.fileVersion);
        });

        it("finds no image without proper hardwareVersionMax", async () => {
            const [device, image] = await getUbisysDevice(-1);
            // 5 in manifest
            device.hardwareVersion = 6;

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, image.header.fileVersion - 1, image.header.fileVersion - 1);
        });

        it("finds an image by extra meta hardwareVersionMin", async () => {
            const [device, image] = await getUbisysDevice(-1);
            const requestPayload: Ota.ImageInfo = {
                imageType: image.header.imageType,
                manufacturerCode: image.header.manufacturerCode,
                fileVersion: image.header.fileVersion - 1,
                // fail the higher matching
                hardwareVersion: -1,
            };
            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {hardwareVersionMin: 0}, requestPayload, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion - 1, image.header.fileVersion);
        });

        it("finds no image without proper extra meta hardwareVersionMin", async () => {
            const [device, image] = await getUbisysDevice(-1);
            // fail the higher matching
            device.hardwareVersion = -1;

            // 0 in manifest
            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {hardwareVersionMin: -1}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, image.header.fileVersion - 1, image.header.fileVersion - 1);
        });

        it("finds an image by extra meta hardwareVersionMax", async () => {
            const [device, image] = await getUbisysDevice(-1);
            const requestPayload: Ota.ImageInfo = {
                imageType: image.header.imageType,
                manufacturerCode: image.header.manufacturerCode,
                fileVersion: image.header.fileVersion - 1,
                // fail the higher matching
                hardwareVersion: 6,
            };

            // 5 in manifest
            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {hardwareVersionMax: 5}, requestPayload, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion - 1, image.header.fileVersion);
        });

        it("finds no image without proper extra meta hardwareVersionMax", async () => {
            const [device, image] = await getUbisysDevice(-1);
            // fail the higher matching
            device.hardwareVersion = 6;

            // 5 in manifest
            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {hardwareVersionMax: 6}, undefined, false);

            await vi.runAllTimersAsync();

            const result = await resultP;

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, image.header.fileVersion - 1, image.header.fileVersion - 1);
        });

        it("finds an image with extra meta force and ignores higher fileVersion", async () => {
            const [device, image] = await getInovelliDevice(-1);
            // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
            const metas = getMetas(INOVELLI_BASE_URL, mockGetLatestManifest())!;
            metas.force = true;

            mockGetLatestManifest.mockReturnValueOnce([metas]);

            const result = await isUpdateAvailable(
                device as unknown as Zh.Device,
                {},
                {
                    imageType: metas.imageType,
                    manufacturerCode: metas.manufacturerCode,
                    fileVersion: image.header.fileVersion + 1,
                },
                false,
            );

            expectAvailableResult(result, true, image.header.fileVersion + 1, image.header.fileVersion);
        });

        it("finds no downgrade image with specific request payload", async () => {
            const [device, image] = await getBoschDevice(0);

            const result = await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image), true);

            expectAvailableResult(result, false, image.header.fileVersion, image.header.fileVersion);
        });

        it("finds a downgrade image with specific request payload", async () => {
            const [device, image] = await getInovelliDevice(0);
            // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
            const prevMetas = getMetas(INOVELLI_PREV_URL, mockGetPreviousManifest())!;

            const result = await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image, 0), true);

            expectAvailableResult(result, true, image.header.fileVersion, prevMetas.fileVersion);
        });

        it("finds no downgrade image without specific request payload", async () => {
            const [device, image] = await getGammaTroniquesDevice(0);

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, true);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, false, image.header.fileVersion, image.header.fileVersion);
        });

        it("finds a downgrade image without specific request payload", async () => {
            const [device, image] = await getXyzroePrevDevice(+1);

            const resultP = isUpdateAvailable(device as unknown as Zh.Device, {}, undefined, true);

            await vi.runAllTimersAsync();

            const result = await resultP;

            expectAvailableResult(result, true, image.header.fileVersion + 1, image.header.fileVersion);
        });

        it("executes workaround for Securifi modelID=PP-WHT-US to trigger OTA with genScenes cluster", async () => {
            const [device, image] = await getSecurifiDevice(-1);
            const mockEndpointWrite = vi.fn();

            device.endpoints.push({
                // @ts-expect-error mocked as needed
                write: mockEndpointWrite,
                supportsOutputCluster: vi.fn((clusterKey) => clusterKey === "genScenes"),
            });

            const result = await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image), false);

            expectAvailableResult(result, false, image.header.fileVersion, image.header.fileVersion);
            expect(mockEndpointWrite).toHaveBeenCalledTimes(1);
            expect(mockEndpointWrite).toHaveBeenCalledWith("genScenes", {currentGroup: 49502});
        });

        it.each([
            "lumi.airrtc.agl001",
            "lumi.curtain.acn003",
            "lumi.curtain.agl001",
        ])("executes workaround for modelIDs=%s to correct fileVersion", async (modelID) => {
            // doesn't matter, forcing the trigger
            const [device, image] = await getBoschDevice(-1);
            device.modelID = modelID;
            const lumiFileVersion = image.header.fileVersion + 123;
            device.meta = {lumiFileVersion};

            const result = await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image), false);

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, lumiFileVersion, image.header.fileVersion);
        });

        it.each([
            "lumi.airrtc.agl001",
            "lumi.curtain.acn003",
            "lumi.curtain.agl001",
        ])("does not execute workaround for modelIDs=%s to correct fileVersion if not needed", async (modelID) => {
            // doesn't matter, forcing the trigger
            const [device, image] = await getBoschDevice(-1);
            device.modelID = modelID;
            // const lumiFileVersion = image.header.fileVersion + 123; // no meta, no need to trigger

            const result = await isUpdateAvailable(device as unknown as Zh.Device, {}, getRequestPayloadFromImage(image), false);

            // otaFileVersion set to current of device when not found
            expectAvailableResult(result, false, image.header.fileVersion, image.header.fileVersion);
        });

        describe("with local override index", () => {
            it("matches from override first using local file", async () => {
                const [device, image] = await getInovelliDevice(-1);
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                const prevMetas = getMetas(INOVELLI_PREV_URL, mockGetPreviousManifest())!;

                // previous index has a downgrade image, lower version, but is being overridden
                setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: TEST_PREV_MANIFEST_INDEX_FILEPATH});

                const result = await isUpdateAvailable(
                    device as unknown as Zh.Device,
                    {},
                    {
                        imageType: image.header.imageType,
                        manufacturerCode: image.header.manufacturerCode,
                        fileVersion: image.header.fileVersion - 1,
                    },
                    false,
                );

                expectAvailableResult(result, false, image.header.fileVersion - 1, prevMetas.fileVersion);
            });

            it("matches from override first using URL", async () => {
                const [device, image] = await getInovelliDevice(-1);
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                const prevMetas = getMetas(INOVELLI_PREV_URL, mockGetPreviousManifest())!;

                // previous index has a downgrade image, lower version, but is being overridden
                setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: ZIGBEE_OTA_PREVIOUS_URL});

                const result = await isUpdateAvailable(
                    device as unknown as Zh.Device,
                    {},
                    {
                        imageType: image.header.imageType,
                        manufacturerCode: image.header.manufacturerCode,
                        fileVersion: image.header.fileVersion - 1,
                    },
                    false,
                );

                expectAvailableResult(result, false, image.header.fileVersion - 1, prevMetas.fileVersion);
            });

            it("fills missing image info when needed", async () => {
                const [device, image] = await getInovelliDevice(-1);
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                const prevMetas = getMetas(INOVELLI_PREV_URL, mockGetPreviousManifest())!;
                const incompletePrevMetas = structuredClone(prevMetas);
                incompletePrevMetas.url = path.join(TEST_PREV_IMAGES_DIRNAME, ...getLocalPath(incompletePrevMetas.url));
                // TODO: set @ts-expect-error when "strict": true enabled
                delete incompletePrevMetas.imageType;
                delete incompletePrevMetas.manufacturerCode;
                delete incompletePrevMetas.fileVersion;

                mockGetPreviousManifest.mockReturnValueOnce([incompletePrevMetas]);
                // will get the value returned above for override
                setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: ZIGBEE_OTA_PREVIOUS_URL});

                const result = await isUpdateAvailable(
                    device as unknown as Zh.Device,
                    {},
                    {
                        imageType: image.header.imageType,
                        manufacturerCode: image.header.manufacturerCode,
                        fileVersion: image.header.fileVersion - 1,
                    },
                    false,
                );

                expectAvailableResult(result, false, image.header.fileVersion - 1, prevMetas.fileVersion);
            });

            it("does not fill missing image info when not needed", async () => {
                const [device, image] = await getInovelliDevice(-1);
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                const prevMetas = getMetas(INOVELLI_PREV_URL, mockGetPreviousManifest())!;
                prevMetas.url = path.join(TEST_PREV_IMAGES_DIRNAME, ...getLocalPath(prevMetas.url));

                mockGetPreviousManifest.mockReturnValueOnce([prevMetas]);
                // will get the value returned above for override
                setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: ZIGBEE_OTA_PREVIOUS_URL});

                const result = await isUpdateAvailable(
                    device as unknown as Zh.Device,
                    {},
                    {
                        imageType: image.header.imageType,
                        manufacturerCode: image.header.manufacturerCode,
                        fileVersion: image.header.fileVersion - 1,
                    },
                    false,
                );

                expectAvailableResult(result, false, image.header.fileVersion - 1, prevMetas.fileVersion);
                expect(mockGetPreviousManifest).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe("Updating", () => {
        it("fails to get latest manifest", async () => {
            const consoleInfoSpy = vi.spyOn(console, "info");
            fetchReturnedStatus.ok = false;
            fetchReturnedStatus.status = 429;
            const [device, _image] = await getBoschDevice(-1);
            const result = defuseRejection(update(device as unknown as Zh.Device, {}, false, () => {}));

            await vi.runAllTimersAsync();

            await expect(result).resolves.toStrictEqual(undefined);
            expect(consoleInfoSpy).toHaveBeenCalledWith(
                expect.stringContaining(`No image currently available (Invalid response from ${ZIGBEE_OTA_LATEST_URL} status=429.)`),
            );
        });

        it("fails to get previous manifest", async () => {
            const consoleInfoSpy = vi.spyOn(console, "info");
            fetchReturnedStatus.ok = false;
            fetchReturnedStatus.status = 403;
            const [device, _image] = await getInovelliDevice(-1);
            const result = defuseRejection(update(device as unknown as Zh.Device, {}, true, () => {}));

            await vi.runAllTimersAsync();

            await expect(result).resolves.toStrictEqual(undefined);
            expect(consoleInfoSpy).toHaveBeenCalledWith(
                expect.stringContaining(`No image currently available (Invalid response from ${ZIGBEE_OTA_PREVIOUS_URL} status=403.)`),
            );
        });

        it("fails to get firmware file from URL", async () => {
            const consoleInfoSpy = vi.spyOn(console, "info");
            const [device, _image] = await getInnrDevice(-1);

            // first call is to manifest, let that resolve
            fetchSpy
                .mockImplementationOnce(
                    // @ts-expect-error mocked as needed
                    fetchOverride,
                )
                .mockResolvedValueOnce(
                    // @ts-expect-error mocked as needed
                    {
                        ok: true,
                        status: 200,
                        body: null,
                    },
                );

            const result = defuseRejection(update(device as unknown as Zh.Device, {}, false, () => {}));

            await vi.runAllTimersAsync();

            await expect(result).resolves.toStrictEqual(undefined);
            expect(consoleInfoSpy).toHaveBeenCalledWith(
                expect.stringContaining(`No image currently available (Invalid response from ${INNR_BASE_URL} status=200.)`),
            );
        });

        it("executes workaround for Securifi modelID=PP-WHT-US to trigger OTA with genScenes cluster", async () => {
            const consoleInfoSpy = vi.spyOn(console, "info");
            // same version, short-circuit since tested logic already done
            const [device, _image] = await getSecurifiDevice(0);
            const mockEndpointWrite = vi.fn();

            device.endpoints.push({
                // @ts-expect-error mocked as needed
                write: mockEndpointWrite,
                supportsOutputCluster: vi.fn((clusterKey) => clusterKey === "genScenes"),
            });

            const result = defuseRejection(update(device as unknown as Zh.Device, {}, false, () => {}));

            await vi.runAllTimersAsync();

            await expect(result).resolves.toStrictEqual(undefined);
            expect(consoleInfoSpy).toHaveBeenCalledWith(expect.stringContaining("No image currently available (No new image available)"));
            expect(mockEndpointWrite).toHaveBeenCalledTimes(1);
            expect(mockEndpointWrite).toHaveBeenCalledWith("genScenes", {currentGroup: 49502});
        });

        it("fails queryNextImageRequest", async () => {
            failQueryNextImageRequest = true;
            const [device, _image] = await getGammaTroniquesDevice(0);

            const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, true, vi.fn()));

            await vi.runAllTimersAsync();

            await expect(resultP).rejects.toThrow(`Device didn't respond to OTA request`);
        });

        it("fails to find an image", async () => {
            const [device, _image] = await getGammaTroniquesDevice(0);
            const commandResponseSpy = vi.spyOn(device.endpoints[0], "commandResponse");

            const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, true, vi.fn()));

            await vi.runAllTimersAsync();

            await expect(resultP).resolves.toStrictEqual(undefined);
            expect(commandResponseSpy).toHaveBeenCalledTimes(2);
            expect(commandResponseSpy).toHaveBeenNthCalledWith(
                2,
                "genOta",
                "queryNextImageResponse",
                {status: Zcl.Status.NO_IMAGE_AVAILABLE},
                undefined,
                expect.any(Number),
            );
        });

        it("fails to find an upgrade image", async () => {
            const [device, _image] = await getGammaTroniquesDevice(0);
            const commandResponseSpy = vi.spyOn(device.endpoints[0], "commandResponse");

            const resultP = update(device as unknown as Zh.Device, {}, false, vi.fn());

            await vi.runAllTimersAsync();

            await expect(resultP).resolves.toStrictEqual(undefined);
            expect(commandResponseSpy).toHaveBeenCalledTimes(2);
            expect(commandResponseSpy).toHaveBeenNthCalledWith(
                2,
                "genOta",
                "queryNextImageResponse",
                {status: Zcl.Status.NO_IMAGE_AVAILABLE},
                undefined,
                expect.any(Number),
            );
        });

        it("fails to find a downgrade image", async () => {
            const [device, _image] = await getInovelliDevice(-10);
            const commandResponseSpy = vi.spyOn(device.endpoints[0], "commandResponse");

            const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, true, vi.fn()));

            await vi.runAllTimersAsync();

            await expect(resultP).resolves.toStrictEqual(undefined);
            expect(commandResponseSpy).toHaveBeenCalledTimes(2);
            expect(commandResponseSpy).toHaveBeenNthCalledWith(
                2,
                "genOta",
                "queryNextImageResponse",
                {status: Zcl.Status.NO_IMAGE_AVAILABLE},
                undefined,
                expect.any(Number),
            );
        });

        describe.skip("runs an update", () => {
            const consoleDebugOriginal = console.debug;
            // XXX: some logging for local testing since debug disabled
            const logOnProgress = (progress: number, remaining?: number): void => {
                console.info(`Update at ${progress}%, remaining ${remaining} seconds`);
            };
            let mockOnProgress = vi.fn(logOnProgress);

            beforeAll(() => {
                // XXX: no-op debug, too verbose/long for jest, disable locally as needed
                console.debug = () => {};
            });

            afterAll(() => {
                console.debug = consoleDebugOriginal;
            });

            beforeEach(() => {
                mockOnProgress = vi.fn(logOnProgress);
            });

            const expectUpdateSuccess = (endpoint: MockOTAEndpoint, image: Ota.Image, dataSize = 50): number => {
                const imageChunks = Math.ceil(image.raw.length / dataSize);

                expect(image.raw).toStrictEqual(endpoint.downloadedImage);

                // can't be exact on the match since the logic may vary calls by 1-2 depending on delays
                expect(
                    endpoint.waitForCommand.mock.calls.filter(([, commandKey]) => commandKey === "imageBlockRequest").length,
                ).toBeGreaterThanOrEqual(imageChunks);
                expect(
                    endpoint.waitForCommand.mock.calls.filter(([, commandKey]) => commandKey === "imagePageRequest").length,
                ).toBeGreaterThanOrEqual(imageChunks);
                expect(endpoint.waitForCommand.mock.calls.filter(([, commandKey]) => commandKey === "queryNextImageRequest").length).toStrictEqual(1);
                expect(endpoint.waitForCommand.mock.calls.filter(([, commandKey]) => commandKey === "upgradeEndRequest").length).toStrictEqual(1);

                expect(endpoint.commandResponse).toHaveBeenNthCalledWith(
                    1,
                    "genOta",
                    "imageNotify",
                    {payloadType: 0, queryJitter: 100} as ImageNotifyPayload,
                    {sendPolicy: "immediate"},
                );
                expect(endpoint.commandResponse).toHaveBeenNthCalledWith(
                    2,
                    "genOta",
                    "queryNextImageResponse",
                    {
                        status: Zcl.Status.SUCCESS,
                        manufacturerCode: image.header.manufacturerCode,
                        imageType: image.header.imageType,
                        fileVersion: image.header.fileVersion,
                        imageSize: image.header.totalImageSize,
                    } as QueryNextImageResponsePayload,
                    undefined,
                    expect.any(Number),
                );
                expect(
                    endpoint.commandResponse.mock.calls.filter(([, commandKey]) => commandKey === "imageBlockResponse").length,
                ).toBeGreaterThanOrEqual(imageChunks);
                // logic is a race between imageBlockResponse and upgradeEndResponse, can't use `toHaveBeenLastCalledWith`
                expect(endpoint.commandResponse).toHaveBeenCalledWith(
                    "genOta",
                    "upgradeEndResponse",
                    {
                        manufacturerCode: image.header.manufacturerCode,
                        imageType: image.header.imageType,
                        fileVersion: image.header.fileVersion,
                        currentTime: 0,
                        upgradeTime: 1,
                    } as UpgradeEndResponsePayload,
                    undefined,
                    expect.any(Number),
                );

                return imageChunks;
            };

            it("upgrades with defaults", async () => {
                const [device, image] = await getInovelliDevice(-1);
                const resultP = update(device as unknown as Zh.Device, {}, false, mockOnProgress);

                await vi.runAllTimersAsync();

                await expect(resultP).resolves.toStrictEqual(image.header.fileVersion);

                expectUpdateSuccess(device.endpoints[0], image);
            }, 60000);

            it("upgrades with local firmware file", async () => {
                const [device, _image] = await getInovelliDevice(-10); // go before the version in prev for below mocks to work
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                const prevMetas = getMetas(INOVELLI_PREV_URL, mockGetPreviousManifest())!;
                const prevImage = await getImage(INOVELLI_PREV_URL);
                prevMetas.url = path.join(TEST_PREV_IMAGES_DIRNAME, ...getLocalPath(prevMetas.url));

                mockGetPreviousManifest.mockReturnValueOnce([prevMetas]);

                // will get the value returned above for override
                setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: ZIGBEE_OTA_PREVIOUS_URL});

                // replace the file offset with the override image
                device.endpoints[0].endFileOffset = prevImage.raw.length;
                const resultP = update(device as unknown as Zh.Device, {}, false, mockOnProgress);

                await vi.runAllTimersAsync();

                await expect(resultP).resolves.toStrictEqual(prevImage.header.fileVersion);

                expectUpdateSuccess(device.endpoints[0], prevImage);
                expect(mockGetPreviousManifest).toHaveBeenCalledTimes(2);
            }, 60000);

            it("upgrades with no TX delay randomness to allow time checking", async () => {
                mockTXDelay.mockImplementation(() => DEFAULT_IMAGE_BLOCK_RESPONSE_DELAY); // +25ms static
                const [device, image] = await getInovelliDevice(-1);
                const resultP = update(device as unknown as Zh.Device, {}, false, mockOnProgress);

                await vi.runAllTimersAsync();

                await expect(resultP).resolves.toStrictEqual(image.header.fileVersion);

                const imageChunks = expectUpdateSuccess(device.endpoints[0], image);

                // first call does not have remaining time
                expect(mockOnProgress.mock.calls[1][1]).toBeLessThan((DEFAULT_IMAGE_BLOCK_RESPONSE_DELAY + 25) * imageChunks);
            }, 60000);

            it("upgrades with adjusted block response delay", async () => {
                mockTXDelay.mockImplementation(() => 60); // +25ms static

                setConfiguration({...DEFAULT_CONFIG, imageBlockResponseDelay: 60});

                const [device, image] = await getLEDVANCEDevice(-1);
                const resultP = update(device as unknown as Zh.Device, {suppressElementImageParseFailure: true}, false, mockOnProgress);

                await vi.runAllTimersAsync();

                await expect(resultP).resolves.toStrictEqual(image.header.fileVersion);

                const imageChunks = expectUpdateSuccess(device.endpoints[0], image);

                // first call does not have remaining time
                expect(mockOnProgress.mock.calls[1][1]).toBeLessThan((60 + 25) * imageChunks);
            }, 60000);

            it("upgrades with adjusted max data size", async () => {
                mockTXDelay.mockImplementation(() => DEFAULT_IMAGE_BLOCK_RESPONSE_DELAY); // +25ms static

                // set a higher value in MockEndpoint responses to allow below
                maximumDataSize = 1024;
                setConfiguration({...DEFAULT_CONFIG, defaultMaximumDataSize: 512});

                const [device, image] = await getLEDVANCEDevice(-1);
                const resultP = update(device as unknown as Zh.Device, {suppressElementImageParseFailure: true}, false, mockOnProgress);

                await vi.runAllTimersAsync();

                await expect(resultP).resolves.toStrictEqual(image.header.fileVersion);

                const imageChunks = expectUpdateSuccess(device.endpoints[0], image, 512);

                // first call does not have remaining time
                expect(mockOnProgress.mock.calls[1][1]).toBeLessThan((DEFAULT_IMAGE_BLOCK_RESPONSE_DELAY + 25) * imageChunks);
            }, 60000);

            it("downgrades with defaults", async () => {
                const [device, _image] = await getInovelliDevice(0);
                const prevImage = await getImage(INOVELLI_PREV_URL);

                // replace the file offset with the override image
                device.endpoints[0].endFileOffset = prevImage.raw.length;
                const resultP = update(device as unknown as Zh.Device, {}, true, mockOnProgress);

                await vi.runAllTimersAsync();

                await expect(resultP).resolves.toStrictEqual(prevImage.header.fileVersion);

                expectUpdateSuccess(device.endpoints[0], prevImage);
            }, 60000);

            it("downgrades using imagePageRequest", async () => {
                const [device, _image] = await getInovelliDevice(0);
                const prevImage = await getImage(INOVELLI_PREV_URL);
                useImagePageRequest = true;

                // replace the file offset with the override image
                device.endpoints[0].endFileOffset = prevImage.raw.length;
                const resultP = update(device as unknown as Zh.Device, {}, true, mockOnProgress);

                await vi.runAllTimersAsync();

                await expect(resultP).resolves.toStrictEqual(prevImage.header.fileVersion);

                // TODO: mock is currently limited on handling this, needs better expects
                // expectUpdateSuccess(device.endpoints[0], prevImage);
            });

            it("starts but device stops requesting blocks", async () => {
                const [device, _image] = await getGledoptoDevice(-1);
                mockOnProgress = vi.fn((progress, remaining) => {
                    logOnProgress(progress, remaining);

                    if (progress > 50) {
                        // device stops requests half way
                        stopRequestingBlocks = true;
                    }
                });
                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                await expect(resultP).rejects.toThrow(
                    expect.objectContaining({
                        message: expect.stringContaining("Timeout. Device did not start/finish firmware download after being notified"),
                    }),
                );
            }, 60000);

            it("continues on failed queryNextImageResponse", async () => {
                failQueryNextImageResponse = true;
                const [device, _image] = await getLiXeeDevice(-1);
                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                // avoids having to mock re-sending a request "from device", if this error is reached, it means it bypassed the commandResponse error
                await expect(resultP).rejects.toThrow(
                    expect.objectContaining({
                        message: expect.stringContaining("Timeout. Device did not start/finish firmware download after being notified"),
                    }),
                );
            }, 60000);

            it("continues on failed imageBlockResponse", async () => {
                const [device, _image] = await getIKEADevice(-1);
                let failed = false;
                mockOnProgress = vi.fn((progress, remaining) => {
                    logOnProgress(progress, remaining);

                    if (!failed && progress > 25) {
                        // throw from commandResponse>imageBlockResponse quarter of the way
                        failImageBlockResponse = true;
                        failed = true;
                    }
                });
                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                // avoids having to mock re-sending a request "from device", if this error is reached, it means it bypassed the commandResponse error
                await expect(resultP).rejects.toThrow(
                    expect.objectContaining({
                        message: expect.stringContaining("Timeout. Device did not start/finish firmware download after being notified"),
                    }),
                );
                expect(failed).toStrictEqual(true); // just to be sure
            }, 60000);

            it("continues on OTA file element parse failure with extra meta", async () => {
                const [device, _image] = await getInovelliDevice(-1);
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                const metas = getMetas(INOVELLI_BASE_URL, mockGetLatestManifest())!;
                const filePaths = getLocalPath(INOVELLI_BASE_URL);
                const filePath = path.join(TEST_BASE_IMAGES_DIRPATH, ...filePaths);
                let firmwareFile = readFileSync(fixVitestExplorerPath(filePath));
                firmwareFile = firmwareFile.subarray(0, -1024);
                // bypass checksum validation to get to proper codepath
                metas.sha512 = crypto.createHash("sha512").update(firmwareFile).digest("hex");

                mockGetFirmwareFile.mockReturnValueOnce(firmwareFile);
                mockGetPreviousManifest.mockReturnValueOnce([metas]);
                // will get the value returned above for override
                setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: ZIGBEE_OTA_PREVIOUS_URL});

                const resultP = defuseRejection(
                    update(device as unknown as Zh.Device, {suppressElementImageParseFailure: true}, false, mockOnProgress),
                );

                await vi.runAllTimersAsync();

                // this image will eventually fail GBL validation, but tested codepath was covered by then
                await expect(resultP).rejects.toThrow("Not a valid GBL image");
            }, 60000);

            it("fails on OTA file element parse failure without extra meta", async () => {
                const [device, _image] = await getInovelliDevice(-1);
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                const metas = getMetas(INOVELLI_BASE_URL, mockGetLatestManifest())!;
                const filePaths = getLocalPath(INOVELLI_BASE_URL);
                const filePath = path.join(TEST_BASE_IMAGES_DIRPATH, ...filePaths);
                let firmwareFile = readFileSync(fixVitestExplorerPath(filePath));
                firmwareFile = firmwareFile.subarray(0, -1024);
                // bypass checksum validation to get to proper codepath
                metas.sha512 = crypto.createHash("sha512").update(firmwareFile).digest("hex");

                mockGetFirmwareFile.mockReturnValueOnce(firmwareFile);
                mockGetPreviousManifest.mockReturnValueOnce([metas]);
                // will get the value returned above for override
                setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: ZIGBEE_OTA_PREVIOUS_URL});

                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                await expect(resultP).rejects.toThrow(expect.objectContaining({message: expect.stringContaining("out of range")}));
            }, 60000);

            it("fails file checksum validation", async () => {
                const [device, _image] = await getInovelliDevice(-1);

                mockGetFirmwareFile.mockReturnValueOnce(Buffer.alloc(254, 0xff));

                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                await expect(resultP).rejects.toThrow("File checksum validation failed");
            });

            it("fails to find an image due to hardware version restrictions unmet", async () => {
                const [device, _image] = await getUbisysDevice(-1);
                device.hardwareVersion = 100;

                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                await expect(resultP).rejects.toThrow(expect.objectContaining({message: expect.stringContaining("No image currently available")}));
            });

            it("fails due to hardware version restrictions unmet - with manifest missing info", async () => {
                const [device, _image] = await getUbisysDevice(-1);
                device.hardwareVersion = 100;
                // biome-ignore lint/style/noNonNullAssertion: ignored using `--suppress`
                const metas = getMetas(UBISYS_BASE_URL, mockGetLatestManifest())!;
                // workaround to reach the proper file
                metas.url = metas.url.replace(`${PREV_IMAGES_DIRNAME}/`, `${BASE_IMAGES_DIRNAME}/`);
                delete metas.hardwareVersionMin;
                delete metas.hardwareVersionMax;

                mockGetPreviousManifest.mockReturnValueOnce([metas]);
                // will get the value returned above for override
                setConfiguration({...DEFAULT_CONFIG, overrideIndexLocation: ZIGBEE_OTA_PREVIOUS_URL});

                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                await expect(resultP).rejects.toThrow(expect.objectContaining({message: expect.stringContaining("Hardware version mismatch")}));
            });

            it("sends default response when upgradeEndResult != SUCCESS", async () => {
                upgradeEndRequestBadStatus = true;
                const [device, _image] = await getIKEADevice(-1);
                const otaEndpoint = device.endpoints[0];

                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                await expect(resultP).rejects.toThrow("Update failed with reason: FAILURE");
                expect(otaEndpoint.defaultResponse).toHaveBeenCalledTimes(1);
                expect(otaEndpoint.defaultResponse).toHaveBeenCalledWith(
                    Zcl.Clusters.genOta.commands.upgradeEndRequest.ID,
                    Zcl.Status.SUCCESS,
                    Zcl.Clusters.genOta.ID,
                    expect.any(Number),
                );
            }, 60000);

            it("fails to send default response when upgradeEndResult != SUCCESS", async () => {
                upgradeEndRequestBadStatus = true;
                const [device, _image] = await getIKEADevice(-1);
                const otaEndpoint = device.endpoints[0];

                otaEndpoint.defaultResponse.mockRejectedValueOnce("ignored failure");

                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                await expect(resultP).rejects.toThrow("Update failed with reason: FAILURE");
                expect(otaEndpoint.defaultResponse).toHaveBeenCalledTimes(1);
                expect(otaEndpoint.defaultResponse).toHaveBeenCalledWith(
                    Zcl.Clusters.genOta.commands.upgradeEndRequest.ID,
                    Zcl.Status.SUCCESS,
                    Zcl.Clusters.genOta.ID,
                    expect.any(Number),
                );
            }, 60000);

            it("fails upgradeEndResponse", async () => {
                failUpgradeEndResponse = true;
                const [device, _image] = await getInovelliDevice(-1);

                const resultP = defuseRejection(update(device as unknown as Zh.Device, {}, false, mockOnProgress));

                await vi.runAllTimersAsync();

                await expect(resultP).rejects.toThrow("Upgrade end response failed: failUpgradeEndResponse");
            }, 60000);
        });
    });
});
