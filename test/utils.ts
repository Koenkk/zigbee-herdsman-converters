import {findByDevice} from '../src/index';
import * as utils from '../src/lib/utils';
import {Zh, Logger, DefinitionMeta, Fz, Definition} from '../src/lib/types';
import tz from '../src/converters/toZigbee';
import { Device } from 'zigbee-herdsman/dist/controller/model';

interface MockEndpointArgs {ID?: number, inputClusters?: string[], outputClusters?: string[], attributes?: {[s: string]: {[s: string]: unknown}}}

export function reportingItem(attribute: string, min: number, max: number, change: number | [number, number]) {
    return {attribute: attribute, minimumReportInterval: min, maximumReportInterval: max, reportableChange: change};
}

export function mockDevice(args: {modelID: string, manufacturerID?: number, endpoints: MockEndpointArgs[]}): Zh.Device {
    const ieeeAddr = '0x12345678';
    const device: Zh.Device = {
        // @ts-expect-error
        constructor: {name: 'Device'},
        ieeeAddr,
        ...args,
    };

    const endpoints = args.endpoints.map((e) => mockEndpoint(e, device));
    // @ts-expect-error
    device.endpoints = endpoints;
    device.getEndpoint = (ID: number) => {
        const endpoint = endpoints.find((e) => e.ID === ID);
        if (!endpoint) throw new Error(`No endpoint ${ID}`);
        return endpoint;
    };
    return device;
}

function mockEndpoint(args: MockEndpointArgs, device: Zh.Device | undefined): Zh.Endpoint {
    const attributes = args.attributes ?? {};
    return {
        ID: args?.ID ?? 1,
        // @ts-expect-error
        constructor: {name: 'Endpoint'},
        bind: jest.fn(),
        configureReporting: jest.fn(),
        read: jest.fn(),
        getDevice: () => device,
        getInputClusters: jest.fn().mockReturnValue(args?.inputClusters?.map((name) => ({name}))),
        getOutputClusters: jest.fn().mockReturnValue(args?.outputClusters?.map((name) => ({name}))),
        supportsInputCluster: jest.fn().mockImplementation((cluster) => args?.inputClusters?.includes(cluster)),
        saveClusterAttributeKeyValue: jest.fn().mockImplementation((cluster, values) => attributes[cluster] = {...attributes[cluster], ...values}),
        save: jest.fn(),
        getClusterAttributeValue: jest.fn().mockImplementation((cluster, attribute) => attributes?.[cluster]?.[attribute]),
    };
}

const MockLogger: Logger = {info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()};

const DefaultTz = [
    tz.scene_store, tz.scene_recall, tz.scene_add, tz.scene_remove, tz.scene_remove_all, 
    tz.scene_rename, tz.read, tz.write, tz.command, tz.factory_reset
];

export type AssertDefinitionArgs = {
    device: Zh.Device,
    meta: DefinitionMeta | undefined,
    fromZigbee: Fz.Converter[],
    toZigbee: string[],
    exposes: string[],
    bind: {[s: number]: string[]},
    read: {[s: number]: [string, string[]][]},
    configureReporting: {[s: number]: [string, ReturnType<typeof reportingItem>[]][]},
    endpoints?: {[s: string]: number},
    findByDeviceFn?: (device: Device) => Promise<Definition>,
}
export async function assertDefintion(args: AssertDefinitionArgs) {
    args.findByDeviceFn = args.findByDeviceFn ?? findByDevice
    const coordinatorEndpoint = mockEndpoint({}, undefined);
    const definition = await args.findByDeviceFn(args.device);

    await definition.configure?.(args.device, coordinatorEndpoint, MockLogger);

    const logIfNotEqual = (expected: string[], actual: string[]) => {
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            console.log(`[${expected?.map((c) => `'${c}'`).join(', ')}]`);
        }
    }

    expect(definition.meta).toEqual(args.meta);
    expect(definition.fromZigbee).toEqual(args.fromZigbee);

    const expectedToZigbee = definition.toZigbee?.slice(0, definition.toZigbee.length - DefaultTz.length).flatMap((c) => c.key);
    utils.assertArray(expectedToZigbee);
    logIfNotEqual(expectedToZigbee, args.toZigbee);
    expect(expectedToZigbee).toEqual(args.toZigbee);

    utils.assertArray(definition.exposes);
    const expectedExposes = definition.exposes?.map((e) => e.name ?? `${e.type}${e.endpoint ? '_' + e.endpoint : ''}(${e.features?.map((f) => f.name).join(',')})`).sort();
    logIfNotEqual(expectedExposes, args.exposes);
    expect(expectedExposes).toEqual(args.exposes);

    for (const endpoint of args.device.endpoints) {
        expect(endpoint.bind).toHaveBeenCalledTimes(args.bind[endpoint.ID]?.length ?? 0);
        if (args.bind[endpoint.ID]) {
            args.bind[endpoint.ID].forEach((bind, idx) => expect(endpoint.bind).toHaveBeenNthCalledWith(idx + 1, bind, coordinatorEndpoint));
        }
    
        expect(endpoint.read).toHaveBeenCalledTimes(args.read[endpoint.ID]?.length ?? 0);
        if (args.read[endpoint.ID]) {
            args.read[endpoint.ID].forEach((read, idx) => expect(endpoint.read).toHaveBeenNthCalledWith(idx + 1, read[0], read[1]));
        }
    
        expect(endpoint.configureReporting).toHaveBeenCalledTimes(args.configureReporting[endpoint.ID]?.length ?? 0);
        if (args.configureReporting[endpoint.ID]) {
            args.configureReporting[endpoint.ID].forEach((configureReporting, idx) => expect(endpoint.configureReporting).toHaveBeenNthCalledWith(idx + 1, configureReporting[0], configureReporting[1]));
        }
    }

    if (definition.endpoint) {
        // @ts-expect-error
        expect(definition.endpoint()).toStrictEqual(args.endpoints)
    }
}
