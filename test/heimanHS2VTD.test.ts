import assert from "node:assert";
import {describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {definitions} from "../src/devices/heiman";
import {prepareDefinition} from "../src/index";
import {mockDevice} from "./utils";

const cluster = "heimanClusterSpecial";
const manufacturerCode = Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD;

function target() {
    const device = mockDevice({modelID: "HS2VTD", manufacturerName: "HEIMAN", endpoints: [{ID: 1, inputClusterIDs: [0xfc90]}]}, "EndDevice");
    const definition = definitions.find((entry) => entry.model === "HS2VTD");
    assert(definition);
    const prepared = prepareDefinition(definition);
    return {device, definition: prepared, endpoint: device.getEndpoint(1)};
}

describe("Heiman HS2VTD", () => {
    it("registers the private cluster before reading the ten-level sensitivity and gesture attributes", async () => {
        const {device, definition, endpoint} = target();
        vi.mocked(endpoint.read).mockImplementation((name) => {
            if (name === cluster) expect(device.customClusters[cluster].attributes.motionSensitivityLevel.ID).toBe(0x0056);
            return Promise.resolve({});
        });
        await definition.configure?.(device, endpoint, definition);
        expect(endpoint.read).toHaveBeenCalledWith(
            cluster,
            ["motionSensitivityLevel", "tapEnabled", "gestureEnabled", "gestureState", "gestureLastId"],
            {manufacturerCode},
        );
    });

    it("writes levels 1–10 as integers and rejects out-of-range or fractional values", async () => {
        const {device, definition, endpoint} = target();
        const converter = definition.toZigbee.find((entry) => entry.key.includes("sensitivity_level"));
        assert(converter?.convertSet);
        const meta = {device, mapped: definition, state: {}} as never;
        for (const level of [1, 5, 7, 10]) {
            await expect(converter.convertSet(endpoint, "sensitivity_level", level, meta)).resolves.toEqual({state: {sensitivity_level: level}});
            expect(endpoint.write).toHaveBeenLastCalledWith(cluster, {motionSensitivityLevel: level}, {manufacturerCode});
        }
        for (const invalid of [0, 11, 1.5, "7"]) await expect(converter.convertSet(endpoint, "sensitivity_level", invalid, meta)).rejects.toThrow();
        expect(endpoint.write).toHaveBeenCalledTimes(4);
    });

    it("stages the name without Zigbee traffic and starts learning only on explicit START", async () => {
        const {device, definition, endpoint} = target();
        const converter = definition.toZigbee.find((entry) => entry.key.includes("gesture_learn_start"));
        assert(converter?.convertSet);
        assert(Array.isArray(definition.exposes));
        expect(definition.exposes.find((entry) => "property" in entry && entry.property === "gesture_learn_name")).toMatchObject({
            type: "text",
            access: 3,
        });
        expect(definition.exposes.find((entry) => "property" in entry && entry.property === "gesture_learn_start")).toMatchObject({
            type: "enum",
            access: 2,
            values: ["START"],
        });
        const meta = {device, mapped: definition, state: {}} as never;
        vi.mocked(endpoint.command).mockResolvedValue({status: Zcl.Status.UNSUP_COMMAND, requestId: 0, gestureId: 0});
        const gestureName = "Wave \u{1f44b}";
        await expect(converter.convertSet(endpoint, "gesture_learn_start", "START", meta)).rejects.toThrow("1 to 32 UTF-8 bytes");
        await expect(converter.convertSet(endpoint, "gesture_learn_name", "W", meta)).resolves.toEqual({state: {gesture_learn_name: "W"}});
        await expect(converter.convertSet(endpoint, "gesture_learn_name", gestureName, meta)).resolves.toEqual({
            state: {gesture_learn_name: gestureName},
        });
        expect(endpoint.command).not.toHaveBeenCalled();
        await expect(converter.convertSet(endpoint, "gesture_learn_start", "START", meta)).resolves.toEqual({
            state: {gesture_learn_result: "UNSUPPORTED"},
        });
        expect(endpoint.command).toHaveBeenLastCalledWith(cluster, "gestureLearnStart", {name: gestureName}, {manufacturerCode, timeout: 20000});
        await expect(converter.convertSet(endpoint, "gesture_learn_start", "old direct text", meta)).rejects.toThrow("must be START");
        const oversizedName = `${"a".repeat(29)}\u{1f44b}`; // 33 UTF-8 bytes
        await converter.convertSet(endpoint, "gesture_learn_name", oversizedName, meta);
        await expect(converter.convertSet(endpoint, "gesture_learn_start", "START", meta)).rejects.toThrow("1 to 32 UTF-8 bytes");
        await converter.convertSet(endpoint, "gesture_learn_name", "", meta);
        await expect(converter.convertSet(endpoint, "gesture_learn_start", "START", meta)).rejects.toThrow("1 to 32 UTF-8 bytes");
        expect(endpoint.command).toHaveBeenCalledTimes(1);
    });

    it("exposes an ON/OFF gesture switch whose state follows device acknowledgement and reads", async () => {
        const {device, definition, endpoint} = target();
        assert(Array.isArray(definition.exposes));
        expect(definition.exposes.find((entry) => "property" in entry && entry.property === "gesture_enabled")).toMatchObject({
            type: "binary",
            access: 7,
            value_on: "ON",
            value_off: "OFF",
        });
        const converter = definition.toZigbee.find((entry) => entry.key.includes("gesture_enabled"));
        assert(converter?.convertSet && converter.convertGet);
        const meta = {device, mapped: definition, state: {}} as never;
        vi.mocked(endpoint.command).mockResolvedValue({statusCode: Zcl.Status.SUCCESS});
        for (const [value, wire] of [
            ["ON", 1],
            ["OFF", 0],
        ] as const) {
            await expect(converter.convertSet(endpoint, "gesture_enabled", value, meta)).resolves.toEqual({state: {gesture_enabled: value}});
            expect(endpoint.command).toHaveBeenLastCalledWith(
                cluster,
                "setGestureEnabled",
                {value: wire},
                {manufacturerCode, disableDefaultResponse: false},
            );
        }
        vi.mocked(endpoint.command).mockResolvedValue({statusCode: Zcl.Status.FAILURE});
        await expect(converter.convertSet(endpoint, "gesture_enabled", "ON", meta)).rejects.toThrow("setGestureEnabled failed");
        await converter.convertGet(endpoint, "gesture_enabled", meta);
        expect(endpoint.read).toHaveBeenCalledWith(cluster, ["gestureEnabled"], {manufacturerCode});
    });

    it("converts real gesture status and recognition notifications without inventing events on reads", () => {
        const {device, definition, endpoint} = target();
        const meta = {device, state: {}} as never;
        const convert = (type: string, data: Record<string, unknown>) => {
            const msg = {device, endpoint, cluster, type, data, meta: {}} as never;
            return Object.assign(
                {},
                ...definition.fromZigbee
                    .filter((entry) => entry.cluster === cluster && entry.type.includes(type as never))
                    .map((entry) => entry.convert(definition, msg, () => {}, {}, meta)),
            );
        };
        expect(convert("readResponse", {gestureEnabled: 0, gestureState: 0, gestureLastId: 0})).toEqual({
            gesture_enabled: "OFF",
            gesture_state: "UNKNOWN",
            gesture_id: 0,
        });
        expect(convert("attributeReport", {gestureEnabled: 1, gestureState: 0})).toEqual({gesture_enabled: "ON", gesture_state: "UNKNOWN"});
        expect(convert("commandGestureStatus", {state: 1, phase: 2, requestId: 3, sampleCount: 2})).toEqual({
            gesture_state: "LEARNING",
            gesture_learning_progress: "Recording (2/3 complete)",
        });
        expect(convert("commandGestureRecognized", {gestureId: 7, eventSequence: 41})).toEqual({action: "gesture", gesture_id: 7});
        expect(convert("commandGestureRecognized", {gestureId: 7, eventSequence: 41})).toEqual({});
        expect(convert("commandGestureRecognized", {gestureId: 7, eventSequence: 42})).toEqual({action: "gesture", gesture_id: 7});
    });
});
