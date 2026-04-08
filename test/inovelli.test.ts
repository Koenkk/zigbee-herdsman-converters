import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, Fz, KeyValue} from "../src/lib/types";
import {mockDevice} from "./utils";

function processFromZigbeeMessage(definition: Definition, cluster: string, type: string, data: KeyValue, endpointID: number) {
    const converters = definition.fromZigbee.filter((c) => {
        const typeMatch = Array.isArray(c.type) ? c.type.includes(type) : c.type === type;
        return c.cluster === cluster && typeMatch;
    });

    let payload: KeyValue = {};
    for (const converter of converters) {
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        const msg: Fz.Message<any, any, any> = {
            data,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            endpoint: {ID: endpointID} as any,
            device: null,
            meta: null,
            groupID: 0,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            type: type as any,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            cluster: cluster as any,
            linkquality: 0,
        };
        const converted = converter.convert(definition, msg, () => {}, {}, {state: {}, device: null, deviceExposesChanged: () => {}});
        if (converted) {
            payload = {...payload, ...converted};
        }
    }
    return payload;
}

describe("Inovelli VZM36", () => {
    let definition: Definition;

    it("should find definition", async () => {
        const device = mockDevice({
            modelID: "VZM36",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                {ID: 2, inputClusters: ["genOnOff", "genLevelCtrl"]},
            ],
        });
        definition = await findByDevice(device);
        expect(definition.model).toBe("VZM36");
    });

    describe("genOnOff from endpoint 2 (fan)", () => {
        it("should set fan_state without affecting light state", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 2);
            expect(payload).toStrictEqual({fan_state: "ON"});
        });

        it("should not leak raw onOff data", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 2);
            expect(payload).not.toHaveProperty("onOff");
            expect(payload).toStrictEqual({fan_state: "OFF"});
        });
    });

    describe("genOnOff from endpoint 1 (light)", () => {
        it("should set light state without affecting fan_state", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 1);
            expect(payload).toStrictEqual({state: "ON"});
        });

        it("should not leak raw onOff data", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 1);
            expect(payload).not.toHaveProperty("onOff");
            expect(payload).toStrictEqual({state: "OFF"});
        });
    });

    describe("genLevelCtrl from endpoint 2 (fan)", () => {
        it("should set fan_mode without affecting light brightness", () => {
            const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 33}, 2);
            expect(payload).not.toHaveProperty("brightness");
            expect(payload).not.toHaveProperty("currentLevel");
            expect(payload).toHaveProperty("fan_mode");
        });
    });

    describe("genLevelCtrl from endpoint 1 (light)", () => {
        it("should set brightness without affecting fan_mode", () => {
            const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 200}, 1);
            expect(payload).not.toHaveProperty("fan_mode");
            expect(payload).not.toHaveProperty("currentLevel");
            expect(payload).toStrictEqual({brightness: 200});
        });
    });
});
