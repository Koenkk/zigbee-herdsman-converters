import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, Fz} from "../src/lib/types";
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

function smtonoffDevice(endpoints = sparseEndpoints) {
    const device = mockDevice({
        modelID: "TS0601",
        manufacturerName: "_TZE204_wbhaespm",
        applicationVersion: 74,
        endpoints,
    });
    Object.assign(device, {hardwareVersion: 1, stackVersion: 0, zclVersion: 3});
    vi.spyOn(device, "save").mockImplementation(() => {});
    return device;
}

function sutonEd00Endpoints() {
    return sparseEndpoints.map((endpoint) =>
        endpoint.ID === 1 ? {...endpoint, inputClusterIDs: [...endpoint.inputClusterIDs, 0xed00]} : {...endpoint},
    );
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

function tuyaMessage(dps: number[]) {
    return {
        data: {
            dpValues: dps.map((dp) => ({dp, datatype: 0, data: Buffer.alloc(0)})),
        },
    } as unknown as Fz.Message<"manuSpecificTuya">;
}

function converterMeta(device: ReturnType<typeof smtonoffDevice>) {
    return {
        state: {},
        device,
        deviceExposesChanged: vi.fn(),
    } satisfies Fz.Meta;
}

function exposeProperties(definition: Definition) {
    return (typeof definition.exposes === "function" ? definition.exposes(undefined as never, {}) : definition.exposes)
        .map((expose) => expose.property)
        .filter((property): property is string => property !== undefined);
}

const samplePayload = Buffer.from([0x59, 0xd8, 0x00, 0x05, 0xdc, 0x00, 0x04, 0xd2]).toString("base64");

describe("shared _TZE204_wbhaespm phase mapping", () => {
    it("uses the broad shared definition without a dedicated priority matcher", async () => {
        const shared = requireDefinition(await findByDevice(smtonoffDevice()));
        expect(shared).toMatchObject({model: "STB3L-125-ZJ", vendor: "SUTON"});
        expect(shared.fingerprint?.[0].priority).toBeUndefined();
        expect(shared.options?.find((option) => option.name === "phase_mapping")).toMatchObject({
            type: "enum",
            values: ["abc", "cba"],
        });

        const suton = await findByDevice(smtonoffDevice(sutonEd00Endpoints()));
        expect(suton).toMatchObject({model: shared.model, vendor: shared.vendor});
    });

    it("uses legacy abc mapping by default", async () => {
        const device = smtonoffDevice();
        const definition = requireDefinition(await findByDevice(device));
        const meta = converterMeta(device);

        expect(converterFor(definition, 6).from?.(samplePayload, meta, {}, () => {}, tuyaMessage([6]))).toMatchObject({
            voltage_a: 2300,
            current_a: 1.5,
            power_a: 1234,
        });
        expect(converterFor(definition, 7).from?.(samplePayload, meta, {}, () => {}, tuyaMessage([7]))).toMatchObject({
            voltage_b: 2300,
            current_b: 1.5,
            power_b: 1234,
        });
        expect(converterFor(definition, 8).from?.(samplePayload, meta, {}, () => {}, tuyaMessage([8]))).toMatchObject({
            voltage_c: 2300,
            current_c: 1.5,
            power_c: 1234,
        });
        expect(meta.deviceExposesChanged).not.toHaveBeenCalled();
        expect(device.save).not.toHaveBeenCalled();
    });

    it("maps cba devices without changing the stable expose set", async () => {
        const device = smtonoffDevice();
        const definition = requireDefinition(await findByDevice(device));
        const meta = converterMeta(device);
        const options = {phase_mapping: "cba"};

        expect(converterFor(definition, 6).from?.(samplePayload, meta, options, () => {}, tuyaMessage([6]))).toMatchObject({
            voltage_c: 2300,
            current_c: 1.5,
            power_c: 1234,
        });
        expect(converterFor(definition, 7).from?.(samplePayload, meta, options, () => {}, tuyaMessage([7]))).toMatchObject({
            voltage_b: 2300,
            current_b: 1.5,
            power_b: 1234,
        });
        expect(converterFor(definition, 8).from?.(samplePayload, meta, options, () => {}, tuyaMessage([8]))).toMatchObject({
            voltage_a: 2300,
            current_a: 1.5,
            power_a: 1234,
        });
        const abcExposes = exposeProperties(definition);
        const cbaExposes = exposeProperties(definition);
        expect(cbaExposes).toEqual(abcExposes);
        expect(abcExposes).toEqual(expect.arrayContaining(["power_a", "power_b", "power_c", "current_a", "current_b", "current_c"]));
        expect(exposeProperties(definition)).not.toContain("power");
        expect(meta.deviceExposesChanged).not.toHaveBeenCalled();
        expect(device.save).not.toHaveBeenCalled();
    });

    it("falls back to abc for an omitted or unknown option", async () => {
        const definition = requireDefinition(await findByDevice(smtonoffDevice()));

        for (const options of [{}, {phase_mapping: "invalid"}]) {
            const device = smtonoffDevice();
            const meta = converterMeta(device);
            expect(converterFor(definition, 6).from?.(samplePayload, meta, options, () => {}, tuyaMessage([6]))).toMatchObject({
                power_a: 1234,
            });
        }
    });
});
