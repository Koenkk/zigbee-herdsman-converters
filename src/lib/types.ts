/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-namespace */
import type {Device as ZHDevice, Endpoint as ZHEndpoint, Group as ZHGroup} from 'zigbee-herdsman/dist/controller/model';
import type {Header as ZHZclHeader} from 'zigbee-herdsman/dist/zspec/zcl';
import type {FrameControl} from 'zigbee-herdsman/dist/zspec/zcl/definition/tstype';

import * as exposes from './exposes';

export interface Logger {
    debug: (messageOrLambda: string | (() => string), namespace: string) => void;
    info: (messageOrLambda: string | (() => string), namespace: string) => void;
    warning: (messageOrLambda: string | (() => string), namespace: string) => void;
    error: (messageOrLambda: string | (() => string), namespace: string) => void;
}

export type Range = [number, number];
export interface KeyValue {
    [s: string]: unknown;
}
export interface KeyValueString {
    [s: string]: string;
}
export interface KeyValueNumberString {
    [s: number]: string;
}
export interface KeyValueAny {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [s: string]: any;
}
export type Publish = (payload: KeyValue) => void;
export type OnEventType =
    | 'start'
    | 'stop'
    | 'message'
    | 'deviceJoined'
    | 'deviceInterview'
    | 'deviceAnnounce'
    | 'deviceNetworkAddressChanged'
    | 'deviceOptionsChanged';
export type Access = 0b001 | 0b010 | 0b100 | 0b011 | 0b101 | 0b111;
export type Expose =
    | exposes.Numeric
    | exposes.Binary
    | exposes.Enum
    | exposes.Composite
    | exposes.List
    | exposes.Light
    | exposes.Switch
    | exposes.Lock
    | exposes.Cover
    | exposes.Climate
    | exposes.Fan
    | exposes.Text;
export type Option = exposes.Numeric | exposes.Binary | exposes.Composite | exposes.Enum | exposes.List | exposes.Text;
export interface Fingerprint {
    applicationVersion?: number;
    manufacturerID?: number;
    type?: 'EndDevice' | 'Router';
    dateCode?: string;
    hardwareVersion?: number;
    manufacturerName?: string;
    modelID?: string;
    powerSource?: 'Battery' | 'Mains (single phase)';
    softwareBuildID?: string;
    stackVersion?: number;
    zclVersion?: number;
    ieeeAddr?: RegExp;
    endpoints?: {ID?: number; profileID?: number; deviceID?: number; inputClusters?: number[]; outputClusters?: number[]}[];
    priority?: number;
}
export type WhiteLabel =
    | {vendor: string; model: string; description: string; fingerprint: Fingerprint[]}
    | {vendor: string; model: string; description?: string};
export interface OtaUpdateAvailableResult {
    available: boolean;
    currentFileVersion: number;
    otaFileVersion: number;
}

export interface MockProperty {
    property: string;
    value: KeyValue | string;
}
// eslint-disable-next-line camelcase
export interface DiscoveryEntry {
    mockProperties: MockProperty[];
    type: string;
    object_id: string;
    discovery_payload: KeyValue;
}

export type BatteryLinearVoltage = {
    min: number;
    max: number;
    vOffset?: number;
};

export type BatteryNonLinearVoltage = '3V_2100' | '3V_1500_2800';

export interface DefinitionMeta {
    separateWhite?: boolean;
    /**
     * Enables the multi endpoint functionality in e.g. `fromZigbee.on_off`, example: normally this converter would return `{"state": "OFF"}`, when
     * multiEndpoint is enabled the `endpoint` method of the device definition will be called to determine the endpoint name which is then used as ke
     * y e.g. `{"state_left": "OFF"}`. Only needed when device sends the same attribute from multiple endpoints.
     *
     * @defaultValue false
     */
    multiEndpoint?: boolean;
    /**
     * enforce a certain endpoint for an attribute, e.g. `{"power": 4}` see `utils.enforceEndpoint()`
     */
    multiEndpointEnforce?: {[s: string]: number};
    /**
     * Attributes to not suffix with the endpoint name
     */
    multiEndpointSkip?: string[];
    publishDuplicateTransaction?: boolean;
    tuyaDatapoints?: Tuya.MetaTuyaDataPoints;
    /**
     * used by toZigbee converters to disable the default response of some devices as they don't provide one.
     *
     * @defaultValue false
     */
    disableDefaultResponse?: boolean | ((entity: Zh.Endpoint) => boolean);
    /**
     *  Amount of pincodes the lock can handle
     */
    pinCodeCount?: number;
    /**
     * Set to true for cover controls that report position=100 as open.
     *
     * @defaultValue false
     */
    coverInverted?: boolean;
    /**
     * timeout for commands to this device used in toZigbee.
     *
     * @defaultValue 10000
     */
    timeout?: number;
    tuyaSendCommand?: 'sendData' | 'dataRequest';
    /**
     * Set cover state based on tilt
     */
    coverStateFromTilt?: boolean;
    /**
     * see e.g. HT-08 definition
     */
    thermostat?: {
        weeklyScheduleMaxTransitions?: number;
        weeklyScheduleSupportedModes?: number[];
        weeklyScheduleFirstDayDpId?: number;
        weeklyScheduleConversion?: string;
        /**
         * Do not map `pIHeatingDemand`/`pICoolingDemand` from 0-255 -\> 0-100, see `fromZigbee.thermostat`
         *
         * @defaultValue false
         */
        dontMapPIHeatingDemand?: boolean;
    };
    battery?: {
        /**
         * convert voltage to percentage using specified option. See `utils.batteryVoltageToPercentage()`
         *
         * @example '3V_2100'
         * @defaultValue null
         */
        voltageToPercentage?: BatteryNonLinearVoltage | BatteryLinearVoltage;
        /**
         * Prevents batteryPercentageRemaining from being divided (ZCL 200=100%, but some report 100=100%)
         *
         * @defaultValue false
         */
        dontDividePercentage?: boolean;
    };
    /**
     * see `toZigbee.light_color`
     *
     * @defaultValue false
     */
    applyRedFix?: boolean;
    /**
     * Indicates light turns off when brightness 1 is set
     *
     * @defaultValue false
     */
    turnsOffAtBrightness1?: boolean;
    tuyaThermostatPreset?: {[s: number]: string};
    /** Tuya specific thermostat options */
    tuyaThermostatSystemMode?: {[s: number]: string};
    /** Tuya specific thermostat options */
    tuyaThermostatPresetToSystemMode?: {[s: number]: string};
    /**
     * see `toZigbee.light_color`
     *
     * @defaultValue true
     */
    supportsEnhancedHue?: boolean | ((entity: Zh.Endpoint) => boolean);
    /**
     * Prevents some converters adding the `action_group` to the payload.
     *
     * @defaultValue false
     */
    disableActionGroup?: boolean;
    /**
     * see `toZigbee.light_color`, usually set by `light_*` extends via options.
     *
     * @defaultValue true
     */
    supportsHueAndSaturation?: boolean;
    /**
     * Do not set `position` or `tilt` to target value on /set. See `toZigbee.cover_position_tilt`
     *
     * @defaultValue false
     */
    coverPositionTiltDisableReport?: boolean;
    /**
     * Override the Home Assistant discovery payload using a custom function.
     */
    overrideHaDiscoveryPayload?(payload: KeyValueAny): void;
    /**
     * Never use a transition when transitioning to off (even when specified)
     */
    noOffTransition?: boolean | ((entity: Zh.Endpoint) => boolean);
}

export type Configure = (device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, definition: Definition) => Promise<void>;
export type OnEvent = (type: OnEventType, data: OnEventData, device: Zh.Device, settings: KeyValue, state: KeyValue) => Promise<void>;

export interface ModernExtend {
    fromZigbee?: Fz.Converter[];
    toZigbee?: Tz.Converter[];
    exposes?: (Expose | DefinitionExposesFunction)[];
    configure?: Configure[];
    meta?: DefinitionMeta;
    ota?: DefinitionOta;
    onEvent?: OnEvent;
    endpoint?: (device: Zh.Device) => {[s: string]: number};
    isModernExtend: true;
}

export interface OnEventData {
    endpoint?: Zh.Endpoint;
    meta?: {zclTransactionSequenceNumber?: number; manufacturerCode?: number};
    cluster?: string;
    type?: string;
    data?: KeyValueAny;
}

export type DefinitionOta = {
    isUpdateAvailable: (device: Zh.Device, requestPayload: Ota.ImageInfo | undefined) => Promise<OtaUpdateAvailableResult>;
    updateToLatest: (device: Zh.Device, onProgress: Ota.OnProgress) => Promise<number>;
};

export type DefinitionExposesFunction = (device: Zh.Device | undefined, options: KeyValue | undefined) => Expose[];

export type DefinitionExposes = Expose[] | DefinitionExposesFunction;

type DefinitionBase = {
    model: string;
    vendor: string;
    description: string;
    whiteLabel?: WhiteLabel[];
    endpoint?: (device: Zh.Device) => {[s: string]: number};
    configure?: Configure;
    options?: Option[];
    meta?: DefinitionMeta;
    onEvent?: OnEvent;
    ota?: DefinitionOta;
    generated?: boolean;
} & ({zigbeeModel: string[]; fingerprint?: Fingerprint[]} | {zigbeeModel?: string[]; fingerprint: Fingerprint[]});

export type Definition = DefinitionBase & {
    fromZigbee: Fz.Converter[];
    toZigbee: Tz.Converter[];
    exposes: DefinitionExposes;
};

export type DefinitionWithExtend = DefinitionBase &
    (
        | {
              extend: ModernExtend[];
              fromZigbee?: Fz.Converter[];
              toZigbee?: Tz.Converter[];
              exposes?: DefinitionExposes;
          }
        | {
              fromZigbee: Fz.Converter[];
              toZigbee: Tz.Converter[];
              exposes: DefinitionExposes;
          }
    );

export namespace Fz {
    export interface Message {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any;
        endpoint: Zh.Endpoint;
        device: Zh.Device;
        meta: {zclTransactionSequenceNumber?: number; manufacturerCode?: number; frameControl?: FrameControl};
        groupID: number;
        type: string;
        cluster: string | number;
        linkquality: number;
    }
    export interface Meta {
        state: KeyValue;
        device: Zh.Device;
        deviceExposesChanged: () => void;
    }
    export interface Converter {
        cluster: string | number;
        type: string[] | string;
        options?: Option[] | ((definition: Definition) => Option[]);
        convert: (model: Definition, msg: Message, publish: Publish, options: KeyValue, meta: Fz.Meta) => KeyValueAny | void | Promise<void>;
    }
}

export namespace Tz {
    export interface Meta {
        message: KeyValue;
        device: Zh.Device | undefined;
        mapped: Definition | Definition[];
        options: KeyValue;
        state: KeyValue;
        endpoint_name: string | undefined;
        membersState?: {[s: string]: KeyValue};
    }
    export type ConvertSetResult = {state?: KeyValue; readAfterWriteTime?: number; membersState?: {[s: string]: KeyValue}} | void;
    export interface Converter {
        key?: string[];
        options?: Option[] | ((definition: Definition) => Option[]);
        endpoint?: string;
        convertSet?: (entity: Zh.Endpoint | Zh.Group, key: string, value: unknown, meta: Tz.Meta) => Promise<ConvertSetResult>;
        convertGet?: (entity: Zh.Endpoint | Zh.Group, key: string, meta: Tz.Meta) => Promise<void>;
    }
}

export namespace Zh {
    export type Endpoint = ZHEndpoint;
    export type Device = ZHDevice;
    export type Group = ZHGroup;
    export type ZclHeader = ZHZclHeader;
}

export namespace Tuya {
    export interface DpValue {
        dp: number;
        datatype: number;
        data: Buffer | number[];
    }
    export interface ValueConverterSingle {
        to?: (value: unknown, meta?: Tz.Meta) => unknown;
        from?: (
            value: unknown,
            meta?: Fz.Meta,
            options?: KeyValue,
            publish?: Publish,
            msg?: Fz.Message,
        ) => number | string | boolean | KeyValue | null;
    }
    export interface ValueConverterMulti {
        to?: (value: unknown, meta?: Tz.Meta) => unknown;
        from?: (value: unknown, meta?: Fz.Meta, options?: KeyValue, publish?: Publish, msg?: Fz.Message) => KeyValue;
    }
    export interface MetaTuyaDataPointsMeta {
        skip?: (meta: Tz.Meta) => boolean;
        optimistic?: boolean;
    }
    export type MetaTuyaDataPointsSingle = [number, string, Tuya.ValueConverterSingle, MetaTuyaDataPointsMeta?];
    export type MetaTuyaDataPoints = MetaTuyaDataPointsSingle[];
}

export namespace Ota {
    export type OnProgress = (progress: number, remaining: number) => void;
    export interface Version {
        imageType: number;
        manufacturerCode: number;
        fileVersion: number;
    }
    export interface ImageHeader {
        otaUpgradeFileIdentifier: Buffer;
        otaHeaderVersion: number;
        otaHeaderLength: number;
        otaHeaderFieldControl: number;
        manufacturerCode: number;
        imageType: number;
        fileVersion: number;
        zigbeeStackVersion: number;
        otaHeaderString: string;
        totalImageSize: number;
        securityCredentialVersion?: number;
        upgradeFileDestination?: Buffer;
        minimumHardwareVersion?: number;
        maximumHardwareVersion?: number;
    }
    export interface ImageElement {
        tagID: number;
        length: number;
        data: Buffer;
    }
    export interface Image {
        header: ImageHeader;
        elements: ImageElement[];
        raw: Buffer;
    }
    export interface ImageInfo {
        imageType: number;
        fileVersion: number;
        manufacturerCode: number;
    }
    export interface ImageMeta {
        fileVersion: number;
        fileSize?: number;
        url: string;
        sha256?: string;
        force?: boolean;
        sha512?: string;
        hardwareVersionMin?: number;
        hardwareVersionMax?: number;
    }
    export type GetImageMeta = (current: ImageInfo, device: Zh.Device) => Promise<ImageMeta>;
}
export namespace Reporting {
    export interface Override {
        min?: number;
        max?: number;
        change?: number | [number, number];
    }
}
