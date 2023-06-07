/* eslint-disable no-unused-vars */
import type {
    Device as ZHDevice,
    Endpoint as ZHEndpoint,
    Group as ZHGroup,
} from 'zigbee-herdsman/dist/controller/model';

import * as exposes from './exposes';

declare global {
    interface Logger {
        info: (message: string) => void;
        warn: (message: string) => void;
        error: (message: string) => void;
        debug: (message: string) => void;
    }

    type Range = [number, number];
    interface KeyValue {[s: string]: unknown}
    interface KeyValueString {[s: string]: string}
    interface KeyValueNumberString {[s: string]: string}
    // eslint-disable-next-line
    interface KeyValueAny {[s: string]: any}
    type Publish = (payload: KeyValue) => void;
    type OnEventType = 'start' | 'stop' | 'message' | 'deviceJoined' | 'deviceInterview' | 'deviceAnnounce' |
        'deviceNetworkAddressChanged' | 'deviceOptionsChanged';
    type Access = 0b001 | 0b010 | 0b100 | 0b011 | 0b101 | 0b111;
    type Expose = exposes.Numeric | exposes.Binary | exposes.Enum | exposes.Composite | exposes.List | exposes.Light | exposes.Switch |
        exposes.Lock | exposes.Cover | exposes.Climate | exposes.Text;
    type Option = exposes.Numeric | exposes.Binary | exposes.Composite | exposes.Enum;
    interface Fingerprint {
        modelID?: string, manufacturerName?: string, type?: 'EndDevice' | 'Router', manufacturerID?: number, applicationVersion?: number,
        powerSource?: 'Battery' | 'Mains (single phase)', softwareBuildID?: string, ieeeAddr?: RegExp,
        endpoints?: {ID?: number, profileID?: number, deviceID?: number, inputClusters?: number[], outputClusters?: number[]}[],
    }
    type WhiteLabel =
        {vendor: string, model: string, description: string, fingerprint: Fingerprint[]} |
        {vendor: string, model: string, description?: string};
    interface OtaUpdateAvailableResult {available: boolean, currentFileVersion: number, otaFileVersion: number}

    interface DefinitionMeta {
        separateWhite?: boolean,
        multiEndpoint?: boolean,
        publishDuplicateTransaction?: boolean,
        tuyaDatapoints?: tuya.MetaTuyaDataPoints,
        disableDefaultResponse?: boolean,
        pinCodeCount?: number,
        coverInverted?: boolean,
        timeout?: number,
        multiEndpointSkip?: string[],
        tuyaSendCommand?: 'sendData' | 'dataRequest',
        coverStateFromTilt?: boolean,
        thermostat?: {
            weeklyScheduleMaxTransitions?: number,
            weeklyScheduleSupportedModes?: number[],
            weeklyScheduleFirstDayDpId?: number,
            dontMapPIHeatingDemand?: boolean
        },
        battery?: {voltageToPercentage?: string | {min: number, max: number}, dontDividePercentage?: boolean},
        applyRedFix?: boolean,
        turnsOffAtBrightness1?: boolean;
        tuyaThermostatPreset?: {[s: number]: string},
        tuyaThermostatSystemMode?: {[s: number]: string},
        tuyaThermostatPresetToSystemMode?: {[s: number]: string},
        supportsEnhancedHue?: boolean,
        disableActionGroup?: boolean,
        supportsHueAndSaturation?: boolean,
    }

    type Configure = (device: zh.Device, coordinatorEndpoint: zh.Endpoint, logger: Logger) => Promise<void>;
    type OnEvent = (type: OnEventType, data: OnEventData, device: zh.Device, settings: KeyValue, state: KeyValue) => Promise<void>;
    interface Extend {fromZigbee: fz.Converter[], toZigbee: tz.Converter[], exposes: Expose[], configure?: Configure, meta?: DefinitionMeta}

    interface OnEventData {
        endpoint?: zh.Endpoint,
        meta?: {zclTransactionSequenceNumber?: number},
        cluster?: string,
        type?: string,
    }

    type Definition = {
        model: string;
        vendor: string;
        description: string;
        whiteLabel?: WhiteLabel[];
        endpoint?: (device: zh.Device) => {[s: string]: number},
        configure?: Configure,
        options?: Option[],
        meta?: DefinitionMeta,
        onEvent?: OnEvent,
        ota?: {
            isUpdateAvailable: (device: zh.Device, logger: Logger, data?: KeyValue) => Promise<OtaUpdateAvailableResult>;
            updateToLatest: (device: zh.Device, logger: Logger, onProgress: ota.OnProgress) => Promise<number>;
        }
    } & ({ zigbeeModel: string[] } | { fingerprint: Fingerprint[] })
      & ({ extend: Extend } |
        { fromZigbee: fz.Converter[], toZigbee: tz.Converter[], exposes: (Expose[] | ((device: zh.Device, options: KeyValue) => Expose[])) });

    namespace fz {
        interface Message {
            // eslint-disable-next-line
            data: any, 
            endpoint: zh.Endpoint, device: zh.Device, meta: {zclTransactionSequenceNumber: number}, groupID: number, type: string, cluster: string}
        interface Meta {state: KeyValue, logger: Logger, device: zh.Device}
        interface Converter {
            cluster: string | number,
            type: string[] | string,
            options?: Option[] | ((definition: Definition) => Option[]);
            convert: (model: Definition, msg: Message, publish: Publish, options: KeyValue, meta: fz.Meta) => KeyValueAny | void | Promise<void>;
        }
    }

    namespace ota {
        type OnProgress = (progress: number, remaining: number) => void;
        interface Version {imageType: number, manufacturerCode: number, fileVersion: number}
        interface ImageHeader {
            otaUpgradeFileIdentifier: Buffer,
            otaHeaderVersion: number,
            otaHeaderLength: number,
            otaHeaderFieldControl: number,
            manufacturerCode: number,
            imageType: number,
            fileVersion: number,
            zigbeeStackVersion: number,
            otaHeaderString: string,
            totalImageSize: number,
            securityCredentialVersion?: number,
            upgradeFileDestination?: Buffer
            minimumHardwareVersion?: number,
            maximumHardwareVersion?: number,
        }
        interface ImageElement {
            tagID: number,
            length: number,
            data: Buffer,
        }
        interface Image {
            header: ImageHeader,
            elements: ImageElement[],
            raw: Buffer,
        }
        type GetImageMeta = (current: ota.Version, logger: Logger, device: zh.Device) =>
            {fileVersion: number, fileSize: number, url: string, sha256: string, force: boolean, sha512: string};
    }

    namespace tz {
        interface Meta {
            logger: Logger,
            message: KeyValue,
            device: zh.Device,
            mapped: Definition,
            options: KeyValue,
            state: KeyValue,
            endpoint_name: string,
        }
        interface Converter {
            key: string[],
            options?: Option[] | ((definition: Definition) => Option[]);
            convertSet?: (entity: zh.Endpoint | zh.Group, key: string, value: unknown, meta: tz.Meta) =>
                Promise<{state?: KeyValue, readAfterWriteTime?: number} | void>,
            convertGet?: (entity: zh.Endpoint | zh.Group, key: string, meta: tz.Meta) => Promise<void>,
        }
    }

    namespace zh {
        type Endpoint = ZHEndpoint;
        type Device = ZHDevice;
        type Group = ZHGroup;
    }

    namespace tuya {
        interface DpValue {dp: number, datatype: number, data: Buffer | number[]}
        interface ValueConverterSingle {
            to?: (value: unknown, meta?: tz.Meta) => unknown,
            from?: (value: unknown, meta?: fz.Meta, options?: KeyValue, publish?: Publish) => number|string|boolean|KeyValue,
        }
        interface ValueConverterMulti {
            to?: (value: unknown, meta?: tz.Meta) => unknown,
            from?: (value: unknown, meta?: fz.Meta, options?: KeyValue, publish?: Publish) => KeyValue,
        }
        interface MetaTuyaDataPointsMeta {skip: (meta: tz.Meta) => boolean, optimistic?: boolean}
        type MetaTuyaDataPointsSingle = [number, string, tuya.ValueConverterSingle, MetaTuyaDataPointsMeta?];
        type MetaTuyaDataPoints = MetaTuyaDataPointsSingle[];
    }

    namespace extend {
        interface options_switch {
            disablePowerOnBehavior?: boolean, toZigbee?: tz.Converter[], fromZigbee?: fz.Converter[], exposes?: Expose[]
        }
        interface options_light_onoff_brightness {
            disablePowerOnBehavior?: boolean, toZigbee?: tz.Converter[], fromZigbee?: fz.Converter[], exposes?: Expose[], disableEffect?: boolean,
            disableMoveStep?: boolean, disableTransition?: boolean, noConfigure?: boolean
        }
        interface options_light_onoff_brightness_colortemp {
            disablePowerOnBehavior?: boolean, toZigbee?: tz.Converter[], fromZigbee?: fz.Converter[], exposes?: Expose[], disableEffect?: boolean,
            disableMoveStep?: boolean, disableTransition?: boolean, noConfigure?: boolean, disableColorTempStartup?: boolean, colorTempRange?: Range,
        }
        interface options_light_onoff_brightness_color {
            disablePowerOnBehavior?: boolean, toZigbee?: tz.Converter[], fromZigbee?: fz.Converter[], exposes?: Expose[], disableEffect?: boolean,
            disableMoveStep?: boolean, disableTransition?: boolean, noConfigure?: boolean, disableColorTempStartup?: boolean, colorTempRange?: Range,
            preferHueAndSaturation?: boolean, supportsHueAndSaturation?: boolean,
        }
        interface options_light_onoff_brightness_colortemp_color {
            disablePowerOnBehavior?: boolean, toZigbee?: tz.Converter[], fromZigbee?: fz.Converter[], exposes?: Expose[], disableEffect?: boolean,
            disableMoveStep?: boolean, disableTransition?: boolean, noConfigure?: boolean, disableColorTempStartup?: boolean, colorTempRange?: Range,
            preferHueAndSaturation?: boolean, supportsHueAndSaturation?: boolean,
        }
    }
}
