import type {
    Device as ZHDevice,
    Endpoint as ZHEndpoint,
    Group as ZHGroup,
} from 'zigbee-herdsman/dist/controller/model';

import * as exposes from './exposes';
import * as tuyaLib from './tuya';

declare global {
    interface Logger {
        info: (message: string) => void;
        warn: (message: string) => void;
        error: (message: string) => void;
        debug: (message: string) => void;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface KeyValue {[s: string]: any}
    type Publish = (payload: KeyValue) => void;
    interface FzMeta {state: KeyValue, logger: Logger, device: zh.Device}
    interface Definition {
        vendor: string,
        model: string,
        meta: {
            separateWhite?: boolean,
            multiEndpoint: true,
            publishDuplicateTransaction: boolean,
            tuyaDatapoints: tuya.MetaTuyaDataPoints,
        },
        endpoint: (device: zh.Device) => {[s: string]: number},
        configure: (device: zh.Device, coordinatorEndpoint: zh.Endpoint, logger: Logger) => Promise<void>,
    }
    type OnEventType = 'start' | 'stop' | 'message' | 'deviceJoined' | 'deviceInterview' | 'deviceAnnounce' |
        'deviceNetworkAddressChanged' | 'deviceOptionsChanged';
    type Access = 0b001 | 0b010 | 0b100 | 0b011 | 0b101 | 0b111;
    type Expose = exposes.Numeric | exposes.Binary | exposes.Enum | exposes.Composite | exposes.List | exposes.Light | exposes.Switch | exposes.Lock;

    interface FromZigbeeConverter {
        cluster: string,
        type: string[] | string,
        options?: any[] | ((definition: Definition) => any[]);
        convert: (model: Definition, msg: KeyValue, publish: Publish, options: KeyValue, meta: FzMeta) => KeyValue | void
    }

    interface ToZigbeeConverter {
        key: string[],
        options?: any[] | ((definition: Definition) => any[]);
        convertSet: (entity: zh.Endpoint | zh.Group, key: string, value: number | string | KeyValue, meta: tz.Meta)
            => Promise<{state: KeyValue} | void>,
        convertGet?: (entity: zh.Endpoint | zh.Group, key: string, meta: tz.Meta) => Promise<void>,
    }

    namespace tz {
        type Value = number | string | KeyValue | boolean;
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
            options?: exposes.Numeric[] | ((definition: Definition) => exposes.Numeric[]);
            convertSet: (entity: zh.Endpoint | zh.Group, key: string, value: number | string | KeyValue, meta: tz.Meta)
                => Promise<{state: KeyValue} | void>,
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
            to: (value: string|number, meta: tz.Meta) => string|number|boolean,
            from: (value: string|number, meta: FzMeta, options: KeyValue, publish: Publish) => string|number,
        }
        interface ValueConverterMulti {
            to: (value: string|number, meta: tz.Meta) => string|number|boolean|tuyaLib.Enum|tuyaLib.Bitmap,
            from: (value: string|number, meta: FzMeta, options: KeyValue, publish: Publish) => KeyValue,
        }
        interface MetaTuyaDataPointsMeta {skip: (meta: tz.Meta) => boolean, optimistic?: boolean}
        type MetaTuyaDataPoints = (
            [number, string, tuya.ValueConverterSingle, MetaTuyaDataPointsMeta?]|[number, null, tuya.ValueConverterMulti, MetaTuyaDataPointsMeta?])[]
    }
}

