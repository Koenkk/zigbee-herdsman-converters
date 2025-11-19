import type {Models as ZHModels} from "zigbee-herdsman";
import type {
    ClusterCommandKeys,
    ClusterCommandResponseKeys,
    ClusterOrRawAttributeKeys,
    TCustomCluster,
    TCustomClusterPayload,
} from "zigbee-herdsman/dist/controller/tstype";
import type {Header as ZHZclHeader} from "zigbee-herdsman/dist/zspec/zcl";
import type {TClusterAttributeKeys, TClusterPayload, TPartialClusterAttributes} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import type {FrameControl} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";
import type * as exposes from "./exposes";

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
    // biome-ignore lint/suspicious/noExplicitAny: ignored using `--suppress`
    [s: string]: any;
}
export type Publish = (payload: KeyValue) => void;
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
    type?: "EndDevice" | "Router";
    dateCode?: string;
    hardwareVersion?: number;
    manufacturerName?: string;
    modelID?: string;
    powerSource?: "Battery" | "Mains (single phase)";
    softwareBuildID?: string;
    stackVersion?: number;
    zclVersion?: number;
    ieeeAddr?: RegExp;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    endpoints?: {ID?: number; profileID?: number; deviceID?: number; inputClusters?: number[]; outputClusters?: number[]}[];
    priority?: number;
}
export type WhiteLabel =
    | {vendor: string; model: string; description: string; fingerprint: Fingerprint[]}
    | {vendor: string; model: string; description?: string};

export interface MockProperty {
    property: string;
    value: KeyValue | string;
}

export interface DiscoveryEntry {
    mockProperties: MockProperty[];
    type: string;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    object_id: string;
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    discovery_payload: KeyValue;
}

export type BatteryLinearVoltage = {
    min: number;
    max: number;
    vOffset?: number;
};

export type BatteryNonLinearVoltage = "3V_2100" | "3V_1500_2800";

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
    tuyaSendCommand?: "sendData" | "dataRequest";
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
    moveToLevelWithOnOffDisable?: boolean;
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
    noOffTransitionWhenOff?: boolean | ((entity: Zh.Endpoint) => boolean);
}

export type Configure = (device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, definition: Definition) => Promise<void> | void;

export namespace OnEvent {
    export type BaseData = {device: Zh.Device; deviceExposesChanged: () => void; state: KeyValue; options: KeyValue};
    export type Event =
        | {type: "stop"; data: {ieeeAddr: string}}
        | {type: "deviceNetworkAddressChanged" | "deviceAnnounce" | "deviceJoined" | "start"; data: BaseData}
        | {type: "deviceOptionsChanged"; data: BaseData & {from: KeyValue; to: KeyValue}}
        | {type: "deviceInterview"; data: BaseData & {status: "started" | "successful" | "failed"}};

    export type Handler = (event: Event) => Promise<void> | void;
}

export interface ModernExtend {
    fromZigbee?: Definition["fromZigbee"];
    toZigbee?: Definition["toZigbee"];
    exposes?: (Expose | DefinitionExposesFunction)[];
    configure?: Definition["configure"][];
    meta?: Definition["meta"];
    ota?: Definition["ota"];
    options?: Option[];
    onEvent?: Definition["onEvent"][];
    endpoint?: Definition["endpoint"];
    isModernExtend: true;
}

// Special type for the zigbee2mqtt.io device page docgen
export type DummyDevice = {
    manufacturerName?: string;
    isDummyDevice: true;
    applicationVersion?: number;
};

export type DefinitionExposesFunction = (device: Zh.Device | DummyDevice, options: KeyValue) => Expose[];

export type DefinitionExposes = Expose[] | DefinitionExposesFunction;

type DefinitionMatcher = {zigbeeModel: string[]; fingerprint?: Fingerprint[]} | {zigbeeModel?: string[]; fingerprint: Fingerprint[]};

type DefinitionBase = {
    model: string;
    vendor: string;
    description: string;
    whiteLabel?: WhiteLabel[];
    generated?: true;
    externalConverterName?: string;
};

type DefinitionConfig = {
    endpoint?: (device: Zh.Device) => {[s: string]: number};
    configure?: Configure;
    options?: Option[];
    meta?: DefinitionMeta;
    onEvent?: OnEvent.Handler;
    ota?: boolean | Ota.ExtraMetas;
};

type DefinitionFeatures = {
    // biome-ignore lint/suspicious/noExplicitAny: generic
    fromZigbee: Fz.Converter<any, any, any>[];
    toZigbee: Tz.Converter[];
    exposes: DefinitionExposes;
};

export type Definition = DefinitionMatcher & DefinitionBase & DefinitionConfig & DefinitionFeatures;

export type DefinitionWithExtend = DefinitionMatcher &
    DefinitionBase &
    DefinitionConfig &
    (({extend: ModernExtend[]} & Partial<DefinitionFeatures>) | DefinitionFeatures);

export type ExternalDefinitionWithExtend = DefinitionWithExtend & {externalConverterName: string};

export type ElementOf<T> = T extends readonly (infer U)[] ? U : T;

/** TFoundationRepetitive from ZSpec Zcl mapped to names used by ZHC (TODO: refactor names to match ZSpec Zcl directly / breaking ext. conv) */
export type TFoundationRepetitiveMapped =
    | "read"
    | "readResponse" // "readRsp"
    | "write"
    | "attributeReport"; // "report"

export namespace Fz {
    export type ConverterTypeCmd<Cl extends number | string, Custom extends TCustomCluster | undefined = undefined> =
        | `command${Capitalize<ClusterCommandKeys<Cl, Custom>[number] & string>}` // exclude `number` with `& string`
        | `command${Capitalize<ClusterCommandResponseKeys<Cl, Custom>[number] & string>}`; // exclude `number` with `& string`

    type ConverterType<Cl extends number | string, Custom extends TCustomCluster | undefined = undefined> =
        | "raw"
        | TFoundationRepetitiveMapped
        | ClusterOrRawAttributeKeys<Cl, Custom>[number]
        | ConverterTypeCmd<Cl, Custom>;

    type ConverterTypeStringOrArray<Cl extends number | string, Custom extends TCustomCluster | undefined = undefined> =
        | ConverterType<Cl, Custom>
        | readonly ConverterType<Cl, Custom>[];

    type MessageTypeDataMap<Cl extends string | number> = {
        raw: Buffer;
        read: (TClusterAttributeKeys<Cl>[number] | number)[];
        readResponse: TPartialClusterAttributes<Cl>;
        write: TPartialClusterAttributes<Cl>;
        attributeReport: TPartialClusterAttributes<Cl>;
    };
    type MessageTypeCustomDataMap<Custom extends TCustomCluster> = {
        raw: Buffer;
        read: (keyof Custom["attributes"] | number)[];
        readResponse: Partial<Custom["attributes"]>;
        write: Partial<Custom["attributes"]>;
        attributeReport: Partial<Custom["attributes"]>;
    };

    export interface Message<
        Cl extends number | string,
        Custom extends TCustomCluster | undefined = undefined,
        Ty extends ConverterTypeStringOrArray<Cl, Custom> = ConverterTypeStringOrArray<Cl, Custom>,
    > {
        data: (ElementOf<Ty> extends infer Single
            ? Custom extends undefined
                ? Single extends keyof MessageTypeDataMap<Cl>
                    ? MessageTypeDataMap<Cl>[Single]
                    : Single extends string | number
                      ? Single extends `command${infer Co}`
                          ? TClusterPayload<Cl, Uncapitalize<Co>>
                          : TClusterPayload<Cl, Single>
                      : never
                : Custom extends TCustomCluster
                  ? Single extends keyof MessageTypeCustomDataMap<Custom>
                      ? MessageTypeDataMap<Cl>[Single] extends never
                          ? MessageTypeCustomDataMap<Custom>[Single] extends never
                              ? Record<number, unknown>
                              : MessageTypeCustomDataMap<Custom>[Single]
                          : MessageTypeDataMap<Cl>[Single] & MessageTypeCustomDataMap<Custom>[Single]
                      : Single extends string | number
                        ? Single extends `command${infer Co}`
                            ? TClusterPayload<Cl, Uncapitalize<Co>> extends never
                                ? TCustomClusterPayload<Custom, Uncapitalize<Co>>
                                : TClusterPayload<Cl, Uncapitalize<Co>> & TCustomClusterPayload<Custom, Uncapitalize<Co>>
                            : TClusterPayload<Cl, Single> extends never
                              ? TCustomClusterPayload<Custom, Single>
                              : TClusterPayload<Cl, Single> & TCustomClusterPayload<Custom, Single>
                        : never
                  : never
            : never) &
            Record<number, unknown> /* XXX: too many customs not to have this as fallback */;
        endpoint: Zh.Endpoint;
        device: Zh.Device;
        meta: {zclTransactionSequenceNumber?: number; manufacturerCode?: number; frameControl?: FrameControl; rawData: Buffer};
        groupID: number;
        type: ElementOf<Ty>;
        cluster: string | number;
        linkquality: number;
    }

    export interface Meta {
        state: KeyValue;
        device: Zh.Device;
        deviceExposesChanged: () => void;
    }

    export interface Converter<
        Cl extends number | string,
        Custom extends TCustomCluster | undefined = undefined,
        Ty extends ConverterTypeStringOrArray<Cl, Custom> = ConverterTypeStringOrArray<Cl, Custom>,
    > {
        cluster: Cl;
        type: Ty;
        options?: Option[] | ((definition: Definition) => Option[]);
        convert: (
            model: Definition,
            msg: Message<Cl, Custom, Ty>,
            publish: Publish,
            options: KeyValue,
            meta: Fz.Meta,
        ) => KeyValueAny | void | Promise<void>;
    }
}

export namespace Tz {
    export interface Meta {
        message: KeyValue;
        device: Zh.Device | undefined;
        mapped: Definition | Definition[];
        options: KeyValue;
        state: KeyValue;
        // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
        endpoint_name: string | undefined;
        membersState?: {[s: string]: KeyValue};
        publish: Publish;
        converterOptions?: KeyValue;
    }
    // biome-ignore lint/suspicious/noConfusingVoidType: ignored using `--suppress`
    export type ConvertSetResult = {state?: KeyValue; membersState?: {[s: string]: KeyValue}} | void;
    export interface Converter {
        key?: string[];
        options?: Option[] | ((definition: Definition) => Option[]);
        endpoints?: string[];
        convertSet?: (entity: Zh.Endpoint | Zh.Group, key: string, value: unknown, meta: Tz.Meta) => Promise<ConvertSetResult> | ConvertSetResult;
        convertGet?: (entity: Zh.Endpoint | Zh.Group, key: string, meta: Tz.Meta) => Promise<void>;
    }
}

export namespace Zh {
    export type Endpoint = ZHModels.Endpoint;
    export type Device = ZHModels.Device;
    export type Group = ZHModels.Group;
    export type ZclHeader = ZHZclHeader;
}

export namespace Tuya {
    export interface DpValue {
        dp: number;
        datatype: number;
        data: Buffer;
    }
    export interface ValueConverterSingle {
        // biome-ignore lint/suspicious/noExplicitAny: value is validated on per-case basis
        to?: (value: any, meta?: Tz.Meta) => unknown;
        from?: (
            // biome-ignore lint/suspicious/noExplicitAny: value is validated on per-case basis
            value: any,
            meta?: Fz.Meta,
            options?: KeyValue,
            publish?: Publish,
            // biome-ignore lint/suspicious/noExplicitAny: value is validated on per-case basis
            msg?: Fz.Message<any>,
        ) => number | string | boolean | KeyValue | null;
    }
    export interface MetaTuyaDataPointsMeta {
        skip?: (meta: Tz.Meta) => boolean;
        optimistic?: boolean;
    }
    export type MetaTuyaDataPointsSingle = [number, string, ValueConverterSingle, MetaTuyaDataPointsMeta?];
    export type MetaTuyaDataPoints = MetaTuyaDataPointsSingle[];
}

export namespace Ota {
    export type OnProgress = (progress: number, remaining?: number) => void;
    export type CustomParseLogic = undefined | "telinkEncrypted";

    export interface Settings {
        dataDir: string;
        overrideIndexLocation?: string;
        imageBlockResponseDelay?: number;
        defaultMaximumDataSize?: number;
    }

    export interface UpdateAvailableResult {
        available: boolean;
        currentFileVersion: number;
        otaFileVersion: number;
    }
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
        imageType: ImageHeader["imageType"];
        fileVersion: ImageHeader["fileVersion"];
        manufacturerCode: ImageHeader["manufacturerCode"];
        hardwareVersion?: number;
    }
    export interface ImageMeta {
        fileVersion: ImageHeader["fileVersion"];
        fileSize?: ImageHeader["totalImageSize"];
        url: string;
        force?: boolean;
        sha512?: string;
        otaHeaderString?: ImageHeader["otaHeaderString"];
        hardwareVersionMin?: ImageHeader["minimumHardwareVersion"];
        hardwareVersionMax?: ImageHeader["maximumHardwareVersion"];
    }
    export interface ZigbeeOTAImageMeta extends ImageInfo, ImageMeta {
        fileName: string;
        modelId?: string;
        manufacturerName?: string[];
        minFileVersion?: ImageHeader["fileVersion"];
        maxFileVersion?: ImageHeader["fileVersion"];
        originalUrl?: string;
        releaseNotes?: string;
        customParseLogic?: CustomParseLogic;
    }
    export type ExtraMetas = Pick<ZigbeeOTAImageMeta, "modelId" | "otaHeaderString" | "hardwareVersionMin" | "hardwareVersionMax"> & {
        manufacturerName?: string;
        suppressElementImageParseFailure?: boolean;
    };
}

export namespace Reporting {
    export interface Override {
        min?: number;
        max?: number;
        change?: number;
    }
}

export type LevelConfigFeatures = (
    | "on_off_transition_time"
    | "on_transition_time"
    | "off_transition_time"
    | "execute_if_off"
    | "on_level"
    | "current_level_startup"
)[];
