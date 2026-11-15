import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import type {Fz, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const bulb = (modelID: string) =>
    mockDevice({
        modelID,
        manufacturerName: "Control4",
        endpoints: [
            {
                ID: 1,
                inputClusters: ["genBasic", "genIdentify", "genGroups", "genScenes", "genOnOff", "genLevelCtrl", "lightingColorCtrl"],
            },
        ],
    });

async function setup(modelID: string) {
    const device = bulb(modelID);
    const definition = await findByDevice(device);
    const endpoint = device.getEndpoint(1);
    const tz = definition.toZigbee.find((c) => c.key?.includes("brightness") && c.key.includes("state"));
    const fzBrightness = definition.fromZigbee.find((c) => c.cluster === "genLevelCtrl" && c.type.includes("attributeReport"));
    return {device, definition, endpoint, tz, fzBrightness};
}

async function set(modelID: string, message: KeyValueAny, state: KeyValueAny) {
    const {device, definition, endpoint, tz} = await setup(modelID);
    const meta = {
        message,
        state,
        options: {},
        mapped: definition,
        device,
        endpoint_name: undefined,
        publish: () => {},
    } as unknown as Tz.Meta;
    const key = "state" in message ? "state" : Object.keys(message)[0];
    const result = await tz.convertSet(endpoint, key, message[key], meta);
    return {endpoint, result};
}

describe.each(["C4-VB-FTW-A19", "C4-VB-RGBTW-A19"])("Control4 Vibrant %s", (modelID) => {
    it("is supported with OTA", async () => {
        const {definition} = await setup(modelID);
        expect(definition.vendor).toBe("Control4");
        expect(definition.ota).toBeTruthy();
    });

    it("sends brightness on the bulb's 0-100 scale", async () => {
        const {endpoint, result} = await set(modelID, {brightness: 254}, {state: "ON", brightness: 50});
        const call = endpoint.command.mock.calls.find((c: unknown[]) => c[0] === "genLevelCtrl");
        expect(call[2].level).toBe(100);
        expect(result.state.brightness).toBe(254);
    });

    it("turns on at the previous level instead of full brightness", async () => {
        const {endpoint, result} = await set(modelID, {state: "ON"}, {state: "OFF", brightness: 66});
        const call = endpoint.command.mock.calls.find((c: unknown[]) => c[0] === "genLevelCtrl");
        expect(call[1]).toBe("moveToLevelWithOnOff");
        expect(call[2].level).toBe(26);
        expect(result.state).toMatchObject({state: "ON", brightness: 66});
    });

    it("still turns off with a plain off", async () => {
        const {endpoint} = await set(modelID, {state: "OFF"}, {state: "ON", brightness: 66});
        expect(endpoint.command.mock.calls.some((c: unknown[]) => c[0] === "genOnOff" && c[1] === "off")).toBe(true);
    });

    it("reports currentLevel 0-100 as brightness 0-254", async () => {
        const {definition, device, endpoint, fzBrightness} = await setup(modelID);
        const msg = {data: {currentLevel: 50}, endpoint, device, type: "attributeReport", cluster: "genLevelCtrl"} as unknown as Fz.Message;
        const out = fzBrightness.convert(definition, msg, () => {}, {}, {state: {}, device, deviceExposesChanged: () => {}}) as KeyValueAny;
        expect(out.brightness).toBe(127);
    });
});
