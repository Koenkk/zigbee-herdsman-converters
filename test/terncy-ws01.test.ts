import {describe, expect, test} from "vitest";
import {findByDevice} from "../src";
import {mockDevice} from "./utils";

const WS01_RELAY_COUNTS: Record<string, number> = {
    "TERNCY-WS01-S1": 1,
    "TERNCY-WS01-S2": 2,
    "TERNCY-WS01-S3": 3,
    "TERNCY-WS01-S4": 4,
    "TERNCY-WS01-D1": 1,
    "TERNCY-WS01-D2": 2,
    "TERNCY-WS01-D3": 3,
    "TERNCY-WS01-D4": 4,
};

const clickActions = ["single", "double", "triple", "quadruple", "5_click", "6_click", "7_click"];

function deviceFor(modelID: string, relayCount: number) {
    return mockDevice(
        {
            modelID,
            manufacturerName: "Xiaoyan",
            endpoints: Array.from({length: 4}, (_, index) => ({
                ID: index + 1,
                inputClusterIDs: index < relayCount ? [6, 64716] : [64716],
                outputClusterIDs: [],
            })),
        },
        "Router",
    );
}

describe("TERNCY WS01 family", () => {
    test.each(Object.entries(WS01_RELAY_COUNTS))("resolves %s with the correct relay/action boundary", async (modelID, relayCount) => {
        const definition = await findByDevice(deviceFor(modelID, relayCount));

        expect(definition).toBeDefined();
        expect(definition.model).toBe(modelID);
        expect(definition.vendor).toBe("TERNCY");
        expect(definition.endpoint?.()).toEqual({l1: 1, l2: 2, l3: 3, l4: 4});

        const relaySwitches = definition.exposes.filter((expose) => expose.type === "switch").map((expose) => expose.endpoint);
        expect(relaySwitches).toEqual(Array.from({length: relayCount}, (_, index) => `l${index + 1}`));

        const relayConfigProperties = ["operation_mode", "wireless_led_status", "led_feedback_mode"];
        for (const property of relayConfigProperties) {
            expect(definition.exposes.filter((expose) => expose.property?.startsWith(`${property}_`)).map((expose) => expose.property)).toEqual(
                Array.from({length: relayCount}, (_, index) => `${property}_l${index + 1}`),
            );
        }

        const expectedActions = Array.from({length: 4}, (_, index) =>
            [...clickActions, "hold", "release"].map((action) => `${action}_l${index + 1}`),
        ).flat();
        const actionExpose = definition.exposes.find((expose) => expose.property === "action");
        expect((actionExpose as unknown as {values: string[]}).values).toEqual(expectedActions);
        expect(definition.exposes.some((expose) => expose.property === "action_duration")).toBe(true);

        expect(definition.exposes.some((expose) => expose.property === "relay_enabled")).toBe(false);
        expect(definition.exposes.some((expose) => expose.property === "relay_constant_power")).toBe(false);
        expect(definition.exposes.some((expose) => expose.property === "button_relay_binding")).toBe(false);
    });

    test("decodes a click reported by a non-relay private endpoint", async () => {
        const definition = await findByDevice(deviceFor("TERNCY-WS01-S1", 1));
        const actionConverter = definition.fromZigbee.find(
            (converter) => converter.cluster === "manuSpecificClusterAduroSmart" && converter.type === "raw",
        );

        expect(actionConverter).toBeDefined();
        const result = actionConverter?.convert(
            definition,
            {data: [0x0d, 0x28, 0x12, 0x00, 0x00, 0x00, 0x01], endpoint: {ID: 4}} as never,
            () => undefined,
            {},
            {},
        );
        expect(result).toEqual({action: "single_l4"});
    });
});
