import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition} from "../src/lib/types";
import {mockDevice} from "./utils";

const sparseEndpoints = [
    {
        ID: 1,
        profileID: 0x0104,
        deviceID: 0x0051,
        inputClusterIDs: [0x0000, 0x0004, 0x0005, 0xef00],
        outputClusterIDs: [0x000a, 0x0019],
    },
    {
        ID: 242,
        profileID: 0xa1e0,
        deviceID: 0x0061,
        inputClusterIDs: [],
        outputClusterIDs: [0x0021],
    },
];

function smtonoffDevice(
    overrides: {manufacturerName?: string; applicationVersion?: number; hardwareVersion?: number; endpoints?: typeof sparseEndpoints} = {},
) {
    const device = mockDevice({
        modelID: "TS0601",
        manufacturerName: overrides.manufacturerName ?? "_TZE204_wbhaespm",
        applicationVersion: overrides.applicationVersion ?? 74,
        endpoints: overrides.endpoints ?? sparseEndpoints,
    });
    Object.assign(device, {hardwareVersion: overrides.hardwareVersion ?? 1, stackVersion: 0, zclVersion: 3});
    return device;
}

function endpointWithExtraCluster() {
    return sparseEndpoints
        .map((endpoint) => ({...endpoint, inputClusterIDs: [...endpoint.inputClusterIDs]}))
        .map((endpoint) => (endpoint.ID === 1 ? {...endpoint, inputClusterIDs: [...endpoint.inputClusterIDs, 0xed00]} : endpoint));
}

function endpointWithExtraEndpoint() {
    return [...sparseEndpoints, {ID: 3, profileID: 0x0104, deviceID: 0x0051, inputClusterIDs: [0x0000], outputClusterIDs: []}];
}

function endpointWithDifferentOutput() {
    return sparseEndpoints.map((endpoint) => (endpoint.ID === 242 ? {...endpoint, outputClusterIDs: [0x0022]} : endpoint));
}

function converterFor(definition: Definition, dp: number) {
    const item = definition.meta?.tuyaDatapoints?.find(([id, property]) => id === dp && property === null);
    if (!item) throw new Error(`Missing DP${dp}`);
    return item[2];
}

function requireDefinition(definition: Definition | undefined): Definition {
    if (!definition) throw new Error("Expected a matching definition");
    return definition;
}

const samplePayload = Buffer.from([0x59, 0xd8, 0x00, 0x05, 0xdc, 0x00, 0x04, 0xd2]).toString("base64");

describe("SMTONOFF ZXB3-125 endpoint fingerprint", () => {
    it("selects SMTONOFF from the synthetic sparse signature", async () => {
        const definition = await findByDevice(smtonoffDevice());
        expect(definition).toMatchObject({model: "ZXB3-125", vendor: "SMTONOFF"});
        expect(definition?.fingerprint?.[0].priority).toBe(1);
    });

    it.each([
        ["application version", {applicationVersion: 73}],
        ["hardware version", {hardwareVersion: 2}],
    ])("rejects a different %s", async (_name, override) => {
        const definition = await findByDevice(smtonoffDevice(override));
        expect(definition?.model).not.toBe("ZXB3-125");
    });

    it("rejects the public SUTON ED00 topology and preserves SUTON selection", async () => {
        const definition = await findByDevice(smtonoffDevice({endpoints: endpointWithExtraCluster()}));
        expect(definition).toMatchObject({model: "STB3L-125-ZJ", vendor: "SUTON"});
        const suton = requireDefinition(definition);
        expect(converterFor(suton, 6).from?.(samplePayload)).toMatchObject({voltage_a: 2300});
        expect(converterFor(suton, 8).from?.(samplePayload)).toMatchObject({voltage_c: 2300});
    });

    it.each([
        ["synthetic richer topology", endpointWithExtraEndpoint()],
        ["altered sparse topology", endpointWithDifferentOutput()],
    ])("rejects %s", async (_name, endpoints) => {
        const definition = await findByDevice(smtonoffDevice({endpoints}));
        expect(definition?.model).not.toBe("ZXB3-125");
    });

    it.each(["_TZE200_wbhaespm", "_TZE284_wbhaespm"])("preserves existing %s SUTON selection", async (manufacturerName) => {
        const definition = await findByDevice(smtonoffDevice({manufacturerName}));
        expect(definition).toMatchObject({model: "STB3L-125-ZJ", vendor: "SUTON"});
    });

    it("decodes SMTONOFF DP6/7/8 as C/B/A", async () => {
        const definition = await findByDevice(smtonoffDevice());
        const smtonoff = requireDefinition(definition);
        expect(converterFor(smtonoff, 6).from?.(samplePayload)).toMatchObject({voltage_c: 2300, current_c: 1.5, power_c: 1234});
        expect(converterFor(smtonoff, 7).from?.(samplePayload)).toMatchObject({voltage_b: 2300, current_b: 1.5, power_b: 1234});
        expect(converterFor(smtonoff, 8).from?.(samplePayload)).toMatchObject({voltage_a: 2300, current_a: 1.5, power_a: 1234});
    });
});
