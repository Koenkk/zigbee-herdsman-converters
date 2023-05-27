import type {
    Device as ZHDevice,
    Endpoint as ZHEndpoint,
    Group as ZHGroup,
} from 'zigbee-herdsman/dist/controller/model';

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
        meta: {separateWhite?: boolean, multiEndpoint: true, publishDuplicateTransaction: boolean},
        endpoint: (device: zh.Device) => {[s: string]: number},
        configure: (device: zh.Device, coordinatorEndpoint: zh.Endpoint, logger: Logger) => Promise<void>,
    }

    interface FromZigbeeConverter {
        cluster: string,
        type: string[] | string,
        options?: any[] | ((definition: Definition) => any[]);
        convert: (model: Definition, msg: KeyValue, publish: Publish, options: KeyValue, meta: FzMeta) => KeyValue | void
    }

    interface ToZigbeeMeta {
        logger: Logger,
        message: KeyValue,
        device: zh.Device,
        mapped: Definition,
        options: KeyValue,
        state: KeyValue,
        endpoint_name: string,
    }

    interface ToZigbeeConverter {
        key: string[],
        options?: any[] | ((definition: Definition) => any[]);
        convertSet: (entity: zh.Endpoint | zh.Group, key: string, value: number | string | KeyValue, meta: ToZigbeeMeta)
            => Promise<{state: KeyValue} | void>,
        convertGet?: (entity: zh.Endpoint | zh.Group, key: string, meta: ToZigbeeMeta) => Promise<void>,
    }

    namespace zh {
        type Endpoint = ZHEndpoint;
        type Device = ZHDevice;
        type Group = ZHGroup;
    }

    namespace tuya {
        interface ValueConverter {to: (value: string|number) => string|number, from: (value: string|number) => string|number}
    }
}

