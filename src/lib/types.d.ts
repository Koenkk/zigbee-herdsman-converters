import type {
    Device as ZHDevice,
    Endpoint as ZHEndpoint,
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
        options: any[];
        convert: (model: Definition, msg: KeyValue, publish: Publish, options: KeyValue, meta: FzMeta) => KeyValue | void
    }

    namespace zh {
        type Endpoint = ZHEndpoint;
        type Device = ZHDevice;
    }

    namespace tuya {
        interface ValueConverter {to: (value: string|number) => string|number, from: (value: string|number) => string|number}
    }
}

