import {findByDevice} from '../src/index';
import * as utils from '../src/lib/utils';
import {Zh, Logger} from '../src/lib/types';
import * as reporting from '../src/lib/reporting';
import { repInterval } from '../src/lib/constants';
import tz from '../src/converters/toZigbee'
import fz from '../src/converters/fromZigbee'

export function reportingItem(attribute: string, min: number, max: number, change: number | [number, number]) {
    return {attribute: attribute, minimumReportInterval: min, maximumReportInterval: max, reportableChange: change};
}

function mockDevice(args: {modelID: string, endpoints: {inputClusters: string[]}[]}): Zh.Device {
    const ieeeAddr = '0x12345678';
    return {
        // @ts-expect-error
        constructor: {name: 'Device'},
        ieeeAddr,
        ...args,
        endpoints: args.endpoints.map((endpoint) => mockEndpoint(endpoint))
    };
}

function mockEndpoint(args?: {inputClusters: string[]}): Zh.Endpoint {
    return {
        // @ts-expect-error
        constructor: {name: 'Endpoint'},
        bind: jest.fn(),
        configureReporting: jest.fn(),
        read: jest.fn(),
        getInputClusters: jest.fn().mockReturnValue(args?.inputClusters?.map((name) => ({name}))),
        saveClusterAttributeKeyValue: jest.fn(),
        save: jest.fn(),
        getClusterAttributeValue: jest.fn(),
    };
}

const MockLogger: Logger = {info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()};

const DefaultTz = [
    tz.scene_store, tz.scene_recall, tz.scene_add, tz.scene_remove, tz.scene_remove_all, 
    tz.scene_rename, tz.read, tz.write, tz.command, tz.factory_reset
];

describe('ModernExtend', () => {
});