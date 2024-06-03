import {join} from 'path';
import {readFileSync} from 'fs';
import {EventEmitter} from 'stream';
import {updateToLatest, parseImage, UPGRADE_FILE_IDENTIFIER, getNewImage} from '../src/lib/ota/common';
import {KeyValueAny, Ota} from '../src/lib/types';
import {Zcl} from 'zigbee-herdsman';
import Waitress from 'zigbee-herdsman/dist/utils/waitress';
import ZclTransactionSequenceNumber from 'zigbee-herdsman/dist/controller/helpers/zclTransactionSequenceNumber';

interface WaitressMatcher {
    clusterID: number;
    commandIdentifier: number;
    transactionSequenceNumber?: number;
};
type CommandResult = {
    clusterID: number;
    header: {
        commandIdentifier: number;
        transactionSequenceNumber: number;
    };
    payload: KeyValueAny
};

// NOTE: takes too long to run this with CI, can enable locally as needed
describe('OTA', () => {
    const TX_MAX_DELAY = 20000;// arbitrary, but less than min timeout involved (queryNextImageRequest === 60000)
    const waitressValidator = (payload: CommandResult, matcher: WaitressMatcher): boolean => {
        return payload.header && (payload.clusterID === matcher.clusterID) && (payload.header.commandIdentifier === matcher.commandIdentifier)
            && (!matcher.transactionSequenceNumber || (payload.header.transactionSequenceNumber === matcher.transactionSequenceNumber))
    };
    const waitressTimeoutFormatter = (matcher: WaitressMatcher, timeout: number) => `Timeout - ${matcher.clusterID} - ${matcher.commandIdentifier} - ${matcher.transactionSequenceNumber}`;
    const waitress: Waitress<CommandResult, WaitressMatcher> = new Waitress<CommandResult, WaitressMatcher>(waitressValidator, waitressTimeoutFormatter);
    const mockWaitressResolve = async (payload: CommandResult, maxDelay: number = TX_MAX_DELAY): Promise<boolean> => {
        // rnd wait time to trigger throttling randomly (min 25ms, can't be instant)
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * maxDelay) + 25));

        return waitress.resolve(payload);
    };
    let stopRequestingBlocks: boolean = false;
    
    class MockOTAEndpoint extends EventEmitter {
        public ID: number;
        public waiters: [];
        public manufacturerCode: Zcl.ManufacturerCode;
        public currentImageType: number;
        public currentImageVersion: number;
        private endFileOffset: number;
        private reqFileOffset: number;
        public downloadedImage: Buffer;
    
        constructor(ID: number, newImageHeader: Ota.ImageHeader) {
            super();
    
            this.ID = ID;
            this.waiters = [];
            this.manufacturerCode = newImageHeader.manufacturerCode;
            this.currentImageType = newImageHeader.imageType;
            this.currentImageVersion = (newImageHeader.fileVersion - 1);
            this.endFileOffset = newImageHeader.totalImageSize;
            this.reqFileOffset = 0;
            this.downloadedImage = Buffer.alloc(0);
        }
    
        public supportsOutputCluster(clusterKey: number | string): boolean {
            return true;
        }
    
        public async commandResponse(clusterKey: number | string, commandKey: number | string, payload: KeyValueAny, options?: unknown,
            transactionSequenceNumber?: number): Promise<void> {
            // just because...
            if (clusterKey !== 'genOta') {
                return;
            }
    
            transactionSequenceNumber = transactionSequenceNumber || ZclTransactionSequenceNumber.next();
    
            switch (commandKey) {
                case 'imageNotify': {
                    // trigger queryNextImageRequest
                    mockWaitressResolve({
                        clusterID: Zcl.Clusters.genOta.ID,
                        header: {commandIdentifier: Zcl.Clusters.genOta.commands.queryNextImageRequest.ID, transactionSequenceNumber},
                        payload: {
                            fieldControl: 0,
                            manufacturerCode: this.manufacturerCode,
                            imageType: this.currentImageType,
                            fileVersion: this.currentImageVersion,// version currently installed on the device
                        },
                    });
                    break;
                }
                case 'queryNextImageResponse': {
                    // trigger first `imageBlockRequest`
                    if (payload.status === Zcl.Status.SUCCESS) {
                        // payload.fileVersion is version client is required to install
                        if (payload.fileVersion === this.currentImageVersion) {
                            console.log('Cannot perform a re-install, not supported by Zigbee spec.');
                            return;
                        }
    
                        if (payload.fileVersion < this.currentImageVersion) {
                            console.log('Performing downgrade.');
                        } else {
                            console.log('Performing upgrade.');
                        }
    
                        // first imageBlockRequest can take a good long while before triggering in practice, fake it
                        await new Promise((resolve) => setTimeout(resolve, 300000));
    
                        this.reqFileOffset = 0;// starting at zero
    
                        mockWaitressResolve({
                            clusterID: Zcl.Clusters.genOta.ID,
                            header: {commandIdentifier: Zcl.Clusters.genOta.commands.imageBlockRequest.ID, transactionSequenceNumber},
                            payload: {
                                fieldControl: 0,
                                manufacturerCode: payload.manufacturerCode,
                                imageType: payload.imageType,
                                fileVersion: payload.fileVersion,
                                fileOffset: this.reqFileOffset,
                                maximumDataSize: 64,
                            },
                        });
                    }
                    break;
                }
                case 'imageBlockResponse': {
                    if (stopRequestingBlocks) {
                        return;
                    }

                    if (this.reqFileOffset >= this.endFileOffset) {
                        // trigger `upgradeEndRequest`
                        mockWaitressResolve({
                            clusterID: Zcl.Clusters.genOta.ID,
                            header: {commandIdentifier: Zcl.Clusters.genOta.commands.upgradeEndRequest.ID, transactionSequenceNumber},
                            payload: {
                                status: Zcl.Status.SUCCESS,
                                manufacturerCode: payload.manufacturerCode,
                                imageType: payload.imageType,
                                fileVersion: payload.fileVersion,
                            },
                        }, 150);
                    } else {
                        // trigger n `imageBlockRequest`
                        this.reqFileOffset += payload.dataSize;
    
                        mockWaitressResolve({
                            clusterID: Zcl.Clusters.genOta.ID,
                            header: {commandIdentifier: Zcl.Clusters.genOta.commands.imageBlockRequest.ID, transactionSequenceNumber},
                            payload: {
                                fieldControl: 0,
                                manufacturerCode: payload.manufacturerCode,
                                imageType: payload.imageType,
                                fileVersion: payload.fileVersion,
                                fileOffset: this.reqFileOffset,
                                maximumDataSize: 64,
                            },
                        });
                    }
    
                    this.downloadedImage = Buffer.concat([this.downloadedImage, payload.data]);
                    break;
                }
                case 'upgradeEndResponse': {
                    // trigger deviceAnnounce event / timeout 2min
                    break;
                }
            }
        }
    
        public waitForCommand(clusterKey: number | string, commandKey: number | string, transactionSequenceNumber: number, timeout: number)
            : {promise: Promise<CommandResult>; cancel: () => void} {
            const cluster = Zcl.Utils.getCluster(clusterKey, null, {});
            const command = cluster.getCommand(commandKey);
            const waiter = waitress.waitFor({clusterID: cluster.ID, commandIdentifier: command.ID, transactionSequenceNumber}, timeout);
    
            return {cancel: (): void => waitress.remove(waiter.ID), promise: waiter.start().promise};
        }

        public async defaultResponse(commandID: number, status: number, clusterID: number, transactionSequenceNumber: number, options?: unknown)
            : Promise<void> {
            // triggered when `upgradeEndRequest` fails, per spec
        }
    }
    
    class MockDevice extends EventEmitter {
        public modelID: string;
        public endpoints: MockOTAEndpoint[];
        public hardwareVersion: number;
    
        constructor(filename: string, otaEndpoint: MockOTAEndpoint, hardwareVersion: number) {
            super();
    
            this.modelID = filename;
            this.endpoints = [otaEndpoint];
            this.hardwareVersion = hardwareVersion;
        }
    
        get ieeeAddr(): string {
            return '0x1234acdb1234abcd';
        }
    }

    beforeAll(() => {
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    })

    beforeEach(() => {
        stopRequestingBlocks = false;
    });

    it.each([
        // ['10F2-7B09-0000-0004-01090206-spo-fmi4.ota.zigbee', {hardwareVersionMin: 0, hardwareVersionMax: 4, fileVersion: 17367558}, false],
        // ['100B-0112-01002400-ConfLightBLE-Lamps-EFR32MG13.zigbee', {fileVersion: 16786432, fileSize: 439622}, false],
        // ['10005778-10.1-TRADFRI-onoff-shortcut-control-2.2.010.ota.ota.signed', {fileVersion: 570492465}, false],
        ['A60_DIM_Z3_IM003D_00103101-encrypted_11_20_2018_Tue_122925_01_withoutMF.ota', {fileVersion: 1061121, fileSize: 182876}, true],
    ])('Updates to latest for %s', async (filename, imageMeta, suppressElementImageParseFailure) => {
        const data = readFileSync(join(__dirname, 'stub', 'otaImageFiles', filename));
        const start = data.indexOf(UPGRADE_FILE_IDENTIFIER);
        const newImage = parseImage(data.subarray(start));
        console.log(JSON.stringify(newImage.header));

        const endpoint = new MockOTAEndpoint(0, newImage.header);
        const device = new MockDevice(filename, endpoint, newImage.header.maximumHardwareVersion ?? 0);
        const onProgress = jest.fn();

        const update = updateToLatest(
            // @ts-expect-error mock
            device,
            onProgress,
            () => newImage,
            () => imageMeta,
            () => ({data}),
            suppressElementImageParseFailure,
        );

        await jest.runAllTimersAsync();
        const fileVersion = await update;

        expect(fileVersion).toStrictEqual(newImage.header.fileVersion);
        expect(newImage.raw).toStrictEqual(endpoint.downloadedImage);
    }, 60000);

    it.each([
        // ['10F2-7B09-0000-0004-01090206-spo-fmi4.ota.zigbee', {hardwareVersionMin: 0, hardwareVersionMax: 4, fileVersion: 17367558}, false],
        // ['100B-0112-01002400-ConfLightBLE-Lamps-EFR32MG13.zigbee', {fileVersion: 16786432, fileSize: 439622}, false],
        // ['10005778-10.1-TRADFRI-onoff-shortcut-control-2.2.010.ota.ota.signed', {fileVersion: 570492465}, false],
        ['A60_DIM_Z3_IM003D_00103101-encrypted_11_20_2018_Tue_122925_01_withoutMF.ota', {fileVersion: 1061121, fileSize: 182876}, true],
    ])('Handles device stop requesting blocks for %s', async (filename, imageMeta, suppressElementImageParseFailure) => {
        const data = readFileSync(join(__dirname, 'stub', 'otaImageFiles', filename));
        const start = data.indexOf(UPGRADE_FILE_IDENTIFIER);
        const newImage = parseImage(data.subarray(start));
        console.log(JSON.stringify(newImage.header));

        const endpoint = new MockOTAEndpoint(0, newImage.header);
        const device = new MockDevice(filename, endpoint, newImage.header.maximumHardwareVersion ?? 0);
        const onProgress = jest.fn();

        setTimeout(() => {
            stopRequestingBlocks = true;
        }, 350000);// some time after start of block requests
        const update = updateToLatest(
            // @ts-expect-error mock
            device,
            onProgress,
            () => newImage,
            () => imageMeta,
            () => ({data}),
            suppressElementImageParseFailure,
        );
        // https://github.com/jestjs/jest/issues/6028#issuecomment-567669082
        update.catch(() => {});

        await jest.runAllTimersAsync();

        await expect(update).rejects.toThrow(
            `Timeout. Device did not start/finish firmware download after being notified. (Error: Timeout - ${Zcl.Clusters.genOta.ID} - ${Zcl.Clusters.genOta.commands.imageBlockRequest.ID} - null)`
        );
    }, 30000);

    // TODO: Image block response failed
    // TODO: Upgrade end response failed
    // TODO: Update failed with reason
    // TODO: imagePageRequest
});
