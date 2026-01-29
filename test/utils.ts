import {expect, vi} from "vitest";
import type {Device} from "zigbee-herdsman/dist/controller/model";
import type {DeviceType} from "zigbee-herdsman/dist/controller/tstype";
import {Clusters} from "zigbee-herdsman/dist/zspec/zcl/definition/cluster";
import * as tz from "../src/converters/toZigbee";
import {findByDevice} from "../src/index";
import type {Definition, DefinitionMeta, Fz, Zh} from "../src/lib/types";
import * as utils from "../src/lib/utils";

export interface MockEndpointArgs {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ID?: number;
    profileID?: number;
    deviceID?: number;
    inputClusters?: string[];
    outputClusters?: string[];
    inputClusterIDs?: number[];
    outputClusterIDs?: number[];
    attributes?: {[s: string]: {[s: string]: unknown}};
    meta?: {[s: string]: unknown};
}

export function reportingItem(attribute: string, min: number, max: number, change: number) {
    return {attribute: attribute, minimumReportInterval: min, maximumReportInterval: max, reportableChange: change};
}

export function mockDevice(
    args: {modelID: string; manufacturerID?: number; manufacturerName?: string; endpoints: MockEndpointArgs[]},
    type: DeviceType = "Router",
    extraArgs: Record<string, unknown> = {},
): Zh.Device {
    const ieeeAddr = "0x12345678";
    const device: Zh.Device = {
        // @ts-expect-error ignore
        constructor: {name: "Device"},
        ieeeAddr,
        save: vi.fn(),
        customClusters: {},
        addCustomCluster: vi.fn(),
        type,
        ...args,
        ...extraArgs,
    };

    const endpoints = args.endpoints.map((e) => mockEndpoint(e, device));
    // @ts-expect-error ignore
    device.endpoints = endpoints;
    device.getEndpoint = (id: number) => {
        const endpoint = endpoints.find((e) => e.ID === id);
        if (!endpoint) throw new Error(`No endpoint ${id}`);
        return endpoint;
    };
    return device;
}

function getCluster(id: string | number) {
    const cluster = Object.entries(Clusters).find((c) => (typeof id === "number" ? c[1].ID === id : c[0] === id));
    if (!cluster) throw new Error(`Cluster '${id}' does not exist`);
    return {name: cluster[0], ID: cluster[1].ID};
}

function mockEndpoint(args: MockEndpointArgs, device: Zh.Device | undefined): Zh.Endpoint {
    const attributes = args.attributes ?? {};
    const inputClusters = args.inputClusterIDs ?? (args.inputClusters ?? []).map((c) => getCluster(c).ID);
    const outputClusters = args.outputClusterIDs ?? (args.outputClusters ?? []).map((c) => getCluster(c).ID);
    return {
        ID: args.ID ?? 1,
        profileID: args.profileID ?? 1,
        deviceID: args.deviceID ?? 1,
        deviceIeeeAddress: "0x12345678",
        // @ts-expect-error ignore
        constructor: {name: "Endpoint"},
        bind: vi.fn(),
        configureReporting: vi.fn(),
        read: vi.fn(),
        command: vi.fn(),
        getDevice: () => device,
        inputClusters,
        outputClusters,
        // @ts-expect-error ignore
        getInputClusters: () => inputClusters.map((c) => getCluster(c)),
        // @ts-expect-error ignore
        getOutputClusters: () => outputClusters.map((c) => getCluster(c)),
        supportsInputCluster: (key) => !!inputClusters.find((id) => id === getCluster(key).ID),
        saveClusterAttributeKeyValue: vi.fn().mockImplementation((cluster, values) => {
            attributes[cluster] = {...attributes[cluster], ...values};
        }),
        save: vi.fn(),
        getClusterAttributeValue: vi.fn().mockImplementation((cluster, attribute) => attributes?.[cluster]?.[attribute]),
        meta: args.meta,
    };
}

const DefaultTz = [
    tz.scene_store,
    tz.scene_recall,
    tz.scene_add,
    tz.scene_remove,
    tz.scene_remove_all,
    tz.scene_rename,
    tz.read,
    tz.write,
    tz.command,
    tz.factory_reset,
    tz.zcl_command,
];

export type AssertDefinitionArgs = {
    device: Zh.Device;
    meta: DefinitionMeta | undefined;
    // biome-ignore lint/suspicious/noExplicitAny: generic
    fromZigbee: Fz.Converter<any, any, any>[];
    toZigbee: string[];
    exposes: string[];
    bind: {[s: number]: string[]};
    read: {[s: number]: [string, string[]][]};
    configureReporting: {[s: number]: [string, ReturnType<typeof reportingItem>[]][]};
    endpoints?: {[s: string]: number};
    findByDeviceFn?: (device: Device) => Promise<Definition>;
};
export async function assertDefinition(args: AssertDefinitionArgs) {
    args.findByDeviceFn = args.findByDeviceFn ?? findByDevice;
    const coordinatorEndpoint = mockEndpoint({}, undefined);
    const definition = await args.findByDeviceFn(args.device);

    await definition.configure?.(args.device, coordinatorEndpoint, definition);

    const logIfNotEqual = (expected: string[], actual: string[]) => {
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            console.log(`[${expected?.map((c) => `'${c}'`).join(", ")}]`);
        }
    };

    expect(definition.meta).toEqual(args.meta);
    expect(definition.fromZigbee).toEqual(args.fromZigbee);

    const expectedToZigbee = definition.toZigbee?.slice(0, definition.toZigbee.length - DefaultTz.length).flatMap((c) => c.key);
    utils.assertArray(expectedToZigbee);
    logIfNotEqual(expectedToZigbee, args.toZigbee);
    expect(expectedToZigbee).toEqual(args.toZigbee);

    utils.assertArray(definition.exposes);
    const expectedExposes = definition.exposes
        ?.map((e) => e.name ?? `${e.type}${e.endpoint ? `_${e.endpoint}` : ""}(${e.features?.map((f) => f.name).join(",")})`)
        .sort();
    logIfNotEqual(expectedExposes, args.exposes);
    expect(expectedExposes).toEqual(args.exposes);

    for (const endpoint of args.device.endpoints) {
        expect(endpoint.bind).toHaveBeenCalledTimes(args.bind[endpoint.ID]?.length ?? 0);
        if (args.bind[endpoint.ID]) {
            args.bind[endpoint.ID].forEach((bind, idx) => {
                expect(endpoint.bind).toHaveBeenNthCalledWith(idx + 1, bind, coordinatorEndpoint);
            });
        }

        expect(endpoint.read).toHaveBeenCalledTimes(args.read[endpoint.ID]?.length ?? 0);
        if (args.read[endpoint.ID]) {
            args.read[endpoint.ID].forEach((read, idx) => {
                expect(endpoint.read).toHaveBeenNthCalledWith(idx + 1, read[0], read[1]);
            });
        }

        expect(endpoint.configureReporting).toHaveBeenCalledTimes(args.configureReporting[endpoint.ID]?.length ?? 0);
        if (args.configureReporting[endpoint.ID]) {
            args.configureReporting[endpoint.ID].forEach((configureReporting, idx) => {
                expect(endpoint.configureReporting).toHaveBeenNthCalledWith(idx + 1, configureReporting[0], configureReporting[1]);
            });
        }
    }

    if (definition.endpoint) {
        // @ts-expect-error ignore
        expect(definition.endpoint()).toStrictEqual(args.endpoints);
    }
}
