import {expect, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {Device, Endpoint} from "zigbee-herdsman/dist/controller/model";
import {InterviewState} from "zigbee-herdsman/dist/controller/model/device";
import type {DeviceType} from "zigbee-herdsman/dist/controller/tstype";
import * as tz from "../src/converters/toZigbee";
import {findByDevice} from "../src/index";
import type {Definition, DefinitionMeta, Fz, Zh} from "../src/lib/types";
import * as utils from "../src/lib/utils";

interface MockEndpointArgs {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ID?: number;
    profileID?: number;
    deviceID?: number;
    inputClusters?: string[];
    outputClusters?: string[];
    inputClusterIDs?: number[];
    outputClusterIDs?: number[];
    attributes?: {
        [cluster: string]: {
            attributes: {[attribute: string]: number | string};
        };
    };
    meta?: {[s: string]: unknown};
    read?: ReturnType<typeof vi.fn<() => Promise<Record<string, unknown>>>>;
}

export function reportingItem(attribute: string, min: number, max: number, change: number) {
    return {attribute: attribute, minimumReportInterval: min, maximumReportInterval: max, reportableChange: change};
}

export function mockDevice(
    args: {
        modelID: string;
        manufacturerID?: number;
        manufacturerName?: string;
        endpoints: MockEndpointArgs[];
        applicationVersion?: number;
        powerSource?: string;
        softwareBuildID?: string;
        ieeeAddr?: string;
    },
    type: DeviceType = "Router",
) {
    const ieeeAddr = args.ieeeAddr ?? "0x12345678";
    const endpoints: Endpoint[] = [];
    // @ts-expect-error private
    const device = new Device(
        1,
        type,
        ieeeAddr,
        0x1234,
        args.manufacturerID,
        endpoints,
        args.manufacturerName,
        args.powerSource,
        args.modelID,
        args.applicationVersion,
        undefined,
        undefined,
        undefined,
        undefined,
        args.softwareBuildID,
        InterviewState.InProgress,
        {},
        undefined,
        undefined,
        0,
        undefined,
        undefined,
    );

    for (const endpoint of args.endpoints) {
        endpoints.push(mockEndpoint(endpoint, device));
    }

    return device;
}

function mockEndpoint(args: MockEndpointArgs, device: Zh.Device | undefined) {
    const inputClusters = args.inputClusterIDs ?? [];

    for (const inCluster of args.inputClusters ?? []) {
        inputClusters.push(Zcl.Utils.getCluster(inCluster).ID);
    }

    const outputClusters = args.outputClusterIDs ?? [];

    for (const outCluster of args.outputClusters ?? []) {
        outputClusters.push(Zcl.Utils.getCluster(outCluster).ID);
    }

    // @ts-expect-error private
    const endpoint: Endpoint = new Endpoint(
        args.ID ?? 1,
        args.profileID ?? 1,
        args.deviceID ?? 1,
        inputClusters,
        outputClusters,
        device?.networkAddress ?? "0x0000",
        device?.ieeeAddr ?? 0,
        args.attributes ?? {},
        [],
        [],
        args.meta,
    );

    vi.spyOn(endpoint, "getDevice").mockImplementation(() => device);
    vi.spyOn(endpoint, "read").mockImplementation(args.read ? args.read : async () => ({}));
    // no-ops
    vi.spyOn(endpoint, "bind").mockImplementation(async () => {});
    vi.spyOn(endpoint, "configureReporting").mockImplementation(async () => {});
    vi.spyOn(endpoint, "write").mockImplementation(async () => {});
    vi.spyOn(endpoint, "command").mockImplementation(async () => ({}));

    return endpoint;
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
    read: {[s: number]: ([string, string[]] | [string, string[], Record<string, unknown> | undefined])[]};
    write: {
        [s: number]: ([string, Record<string | number, unknown>] | [string, Record<string | number, unknown>, Record<string, unknown> | undefined])[];
    };
    configureReporting: {
        [s: number]: (
            | [string, ReturnType<typeof reportingItem>[]]
            | [string, ReturnType<typeof reportingItem>[], Record<string, unknown> | undefined]
        )[];
    };
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

    const expectedToZigbee = definition.toZigbee?.slice(DefaultTz.length).flatMap((c) => c.key);
    utils.assertArray(expectedToZigbee);
    logIfNotEqual(expectedToZigbee, args.toZigbee);
    expect(expectedToZigbee).toEqual(args.toZigbee);

    utils.assertArray(definition.exposes);
    const expectedExposes = definition.exposes
        ?.map((e) => e.property ?? `${e.type}${e.endpoint ? `_${e.endpoint}` : ""}(${e.features?.map((f) => f.name).join(",")})`)
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
                const options = read[2];

                if (options) {
                    expect(endpoint.read).toHaveBeenNthCalledWith(idx + 1, read[0], read[1], options);
                } else {
                    expect(endpoint.read).toHaveBeenNthCalledWith(idx + 1, read[0], read[1]);
                }
            });
        }

        expect(endpoint.write).toHaveBeenCalledTimes(args.write[endpoint.ID]?.length ?? 0);
        if (args.write[endpoint.ID]) {
            args.write[endpoint.ID].forEach((write, idx) => {
                const options = write[2];

                if (options) {
                    expect(endpoint.write).toHaveBeenNthCalledWith(idx + 1, write[0], write[1], options);
                } else {
                    expect(endpoint.write).toHaveBeenNthCalledWith(idx + 1, write[0], write[1]);
                }
            });
        }

        expect(endpoint.configureReporting).toHaveBeenCalledTimes(args.configureReporting[endpoint.ID]?.length ?? 0);
        if (args.configureReporting[endpoint.ID]) {
            args.configureReporting[endpoint.ID].forEach((configureReporting, idx) => {
                const options = configureReporting[2];

                if (options) {
                    expect(endpoint.configureReporting).toHaveBeenNthCalledWith(idx + 1, configureReporting[0], configureReporting[1], options);
                } else {
                    expect(endpoint.configureReporting).toHaveBeenNthCalledWith(idx + 1, configureReporting[0], configureReporting[1]);
                }
            });
        }
    }

    if (definition.endpoint) {
        // @ts-expect-error ignore
        expect(definition.endpoint()).toStrictEqual(args.endpoints);
    }
}
