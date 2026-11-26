import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

// Skydance WZ5 (TS0505B / _TZB210_3zfp8mki): genLevelCtrl only drives the white channel, so colour
// (with or without brightness) must go through tuyaMoveToHueAndSaturationBrightness2.
// https://github.com/Koenkk/zigbee2mqtt/issues/18301
const wz5 = () =>
    mockDevice({
        modelID: "TS0505B",
        manufacturerName: "_TZB210_3zfp8mki",
        endpoints: [{ID: 1, inputClusters: ["genBasic", "genOnOff", "genLevelCtrl", "lightingColorCtrl"]}],
    });

const setup = async () => {
    const device = wz5();
    const endpoint = device.getEndpoint(1);
    vi.mocked(endpoint.command).mockResolvedValue(undefined as never);
    const definition = (await findByDevice(device)) as Definition;
    const set = (message: KeyValueAny, state: KeyValueAny) => {
        const key = Object.keys(message)[0];
        const converter = definition.toZigbee.find((c) => c.key.includes(key));
        return converter.convertSet(endpoint, key, message[key], {message, state, mapped: definition, options: {}, device} as never);
    };
    return {endpoint, definition, set};
};

const commands = (endpoint: ReturnType<ReturnType<typeof wz5>["getEndpoint"]>) =>
    vi.mocked(endpoint.command).mock.calls.map((c) => `${c[0]}.${c[1]}`);

describe("Skydance WZ5_dim_2 colour handling", () => {
    it("is matched as WZ5_dim_2", async () => {
        const {definition} = await setup();
        expect(definition.model).toBe("WZ5_dim_2");
    });

    it("colour + brightness is sent as one Tuya HSB command, no moveToLevel", async () => {
        const {endpoint, set} = await setup();
        const result = await set({state: "ON", color: {h: 0, s: 100}, brightness: 25}, {state: "ON", color_mode: "hs"});
        expect(endpoint.command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "tuyaMoveToHueAndSaturationBrightness2",
            {hue: 0, saturation: 1000, brightness: 98},
            expect.anything(),
        );
        expect(commands(endpoint)).not.toContain("genLevelCtrl.moveToLevelWithOnOff");
        expect((result as KeyValueAny).state).toMatchObject({state: "ON", brightness: 25, color_mode: "hs"});
    });

    it("turns the light on first when it is off", async () => {
        const {endpoint, set} = await setup();
        await set({color: {hue: 120, saturation: 100}, brightness: 254}, {state: "OFF", color_mode: "hs"});
        expect(commands(endpoint)).toEqual(["genOnOff.on", "lightingColorCtrl.tuyaMoveToHueAndSaturationBrightness2"]);
    });

    it("brightness only while in hs mode keeps the current colour", async () => {
        const {endpoint, set} = await setup();
        await set({brightness: 254}, {state: "ON", color_mode: "hs", color: {hue: 240, saturation: 50}, brightness: 25});
        expect(endpoint.command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "tuyaMoveToHueAndSaturationBrightness2",
            {hue: 240, saturation: 500, brightness: 1000},
            expect.anything(),
        );
        expect(commands(endpoint)).not.toContain("genLevelCtrl.moveToLevelWithOnOff");
    });

    it("brightness in colour temperature mode still uses genLevelCtrl", async () => {
        const {endpoint, set} = await setup();
        await set({brightness: 128}, {state: "ON", color_mode: "color_temp", color_temp: 250});
        expect(commands(endpoint)).toContain("genLevelCtrl.moveToLevelWithOnOff");
        expect(commands(endpoint)).not.toContain("lightingColorCtrl.tuyaMoveToHueAndSaturationBrightness2");
    });

    it("off is a plain off", async () => {
        const {endpoint, set} = await setup();
        await set({state: "OFF"}, {state: "ON", color_mode: "hs", color: {hue: 0, saturation: 100}});
        expect(commands(endpoint)).toEqual(["genOnOff.off"]);
    });
});
