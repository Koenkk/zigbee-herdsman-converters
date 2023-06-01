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
        coverInverted?: boolean,
        timeout?: number,
        multiEndpointSkip?: string[],
        tuyaSendCommand?: 'sendData' | 'dataRequest',
        thermostat?: {
            weeklyScheduleMaxTransitions: number,
            weeklyScheduleSupportedModes: number[],
            weeklyScheduleFirstDayDpId: number,
        },
        battery?: {voltageToPercentage?: string},
        applyRedFix?: boolean,
        turnsOffAtBrightness1?: boolean;
        tuyaThermostatPreset?: {[s: number]: string},
        tuyaThermostatSystemMode?: {[s: number]: string},
    }

    type Configure = (device: zh.Device, coordinatorEndpoint: zh.Endpoint, logger: Logger) => Promise<void>;
    type OnEvent = (type: OnEventType, data: OnEventData, device: zh.Device, settings: KeyValue, state: KeyValue) => Promise<void>;
    interface Extend {fromZigbee: fz.Converter[], toZigbee: tz.Converter[], exposes: Expose[], configure?: Configure}

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
            isUpdateAvailable: (device: zh.Device, logger: Logger, data?: KeyValue)
                => Promise<OtaUpdateAvailableResult>;
            updateToLatest: (device: zh.Device, logger: Logger,
                onProgress: (progress: number, remaining: number) => void) => Promise<number>;
        }
    } & ({ zigbeeModel: string[] } | { fingerprint: Fingerprint[] })
      & ({ extend: Extend } |
        { fromZigbee: fz.Converter[], toZigbee: tz.Converter[], exposes: (Expose[] | ((device: zh.Device, options: KeyValue) => Expose[])) });

    namespace fz {
        interface Message {
            data: KeyValueAny, endpoint: zh.Endpoint, device: zh.Device, meta: {zclTransactionSequenceNumber: number}, groupID: number, type: string}
        interface Meta {state: KeyValue, logger: Logger, device: zh.Device}
        interface Converter {
            cluster: string,
            type: string[] | string,
            options?: Option[] | ((definition: Definition) => Option[]);
            convert: (model: Definition, msg: Message, publish: Publish, options: KeyValue, meta: fz.Meta) => KeyValueAny | void | Promise<void>;
        }
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
}

