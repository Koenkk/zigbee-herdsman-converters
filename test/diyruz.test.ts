import {describe, expect, test, vi} from "vitest";
import {findByDevice} from "../src";
import {mockDevice} from "./utils";

describe("DIYRuZ FreePad", () => {
    async function getClicksConverter() {
        const device = mockDevice({modelID: "DIYRuZ_FreePad", endpoints: [{ID: 1, outputClusters: ["genMultistateInput"]}]}, "EndDevice");
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee?.find((item) => item.cluster === "genMultistateInput");
        expect(converter).toBeDefined();
        return (type: "attributeReport" | "readResponse", data: Record<string, unknown>) =>
            converter?.convert(definition, {type, data, device, endpoint: device.endpoints[0]} as never, vi.fn(), {}, {device} as never);
    }

    test("publishes the action that presentValue maps to", async () => {
        const convert = await getClicksConverter();
        expect(convert("attributeReport", {presentValue: 1})).toStrictEqual({action: "button_1_single"});
        // presentValue 0 is a real press, so a falsy check must not be used as the guard
        expect(convert("attributeReport", {presentValue: 0})).toStrictEqual({action: "button_1_hold"});
        // A readResponse that carries presentValue is still converted
        expect(convert("readResponse", {presentValue: 2})).toStrictEqual({action: "button_1_double"});
        // A count outside the lookup is still reported as many_<count>
        expect(convert("attributeReport", {presentValue: 5})).toStrictEqual({action: "button_1_many_5"});
    });

    test("does not publish an action for a readResponse without presentValue", async () => {
        const convert = await getClicksConverter();
        // zigbee-herdsman drops non-success records, so a failed read of presentValue arrives as empty data
        expect(convert("readResponse", {})).toBeUndefined();
        // A read of another attribute of the cluster
        expect(convert("readResponse", {statusFlags: 0})).toBeUndefined();
    });
});
