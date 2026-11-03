import {beforeEach, describe, expect, it} from "vitest";
import {findByDevice, type Tz} from "../src/index";
import * as store from "../src/lib/store";
import * as tuya from "../src/lib/tuya";
import type {KeyValue} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Lidl 14149505L/14149506L_2", () => {
    beforeEach(() => store.clear());

    async function setup(message: KeyValue) {
        const device = mockDevice({modelID: "TS0505B", manufacturerName: "_TZ3210_iystcadi", endpoints: [{ID: 1}]});
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        const meta: Tz.Meta = {
            device,
            mapped: definition,
            message,
            state: {brightness: 120, color_mode: "hs", color: {hue: 120, saturation: 100}},
            options: {color_sync: false},
            endpoint_name: undefined,
            publish: () => {},
            deviceExposesChanged: () => {},
        };
        store.putValue(endpoint, "brightness", 120);
        return {definition, endpoint, meta};
    }

    it.each([153, 250, 370, 500])("sends %i mireds without Tuya 0-254 scaling", async (colorTemp) => {
        const {definition, endpoint, meta} = await setup({color_temp: colorTemp});
        const converter = definition.toZigbee.find((converter) => converter.key.includes("color_temp"));
        const result = await converter.convertSet(endpoint, "color_temp", colorTemp, meta);

        expect(endpoint.command).toHaveBeenNthCalledWith(1, "lightingColorCtrl", "tuyaRgbMode", {enable: 0});
        expect(endpoint.command).toHaveBeenNthCalledWith(
            2,
            "lightingColorCtrl",
            "moveToColorTemp",
            {colortemp: colorTemp, transtime: 0, optionsMask: 0, optionsOverride: 0},
            {},
        );
        expect(endpoint.command).toHaveBeenNthCalledWith(
            3,
            "genLevelCtrl",
            "moveToLevel",
            {level: 120, transtime: 0, optionsMask: 0, optionsOverride: 0},
            {},
        );
        expect(result).toEqual({state: {color_mode: "color_temp", color_temp: colorTemp}});
    });

    it("uses mireds when brightness and color temperature are sent together", async () => {
        const {definition, endpoint, meta} = await setup({brightness: 180, color_temp: 370});
        const converter = definition.toZigbee.find((converter) => converter.key.includes("brightness"));
        const result = await converter.convertSet(endpoint, "brightness", 180, meta);

        expect(endpoint.command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveToColorTemp",
            {colortemp: 370, transtime: 0, optionsMask: 0, optionsOverride: 0},
            {},
        );
        expect(result).toEqual({state: {color_mode: "color_temp", color_temp: 370}});
        expect(store.getValue(endpoint, "brightness")).toBe(180);
    });

    it.each(["color_temp", "brightness"])("preserves TS0505A scaling for %s commands", async (key) => {
        const device = mockDevice({modelID: "TS0505A", manufacturerName: "_TZ3000_sosdczdl", endpoints: [{ID: 1}]});
        const definition = await findByDevice(device);
        const {meta} = await setup({brightness: 180, color_temp: 500});
        meta.device = device;
        meta.mapped = definition;
        const endpoint = device.getEndpoint(1);

        await tuya.tz.led_control.convertSet(endpoint, key, key === "color_temp" ? 500 : 180, meta);

        expect(endpoint.command).toHaveBeenCalledWith(
            "lightingColorCtrl",
            "moveToColorTemp",
            {colortemp: 0, transtime: 0, optionsMask: 0, optionsOverride: 0},
            {},
        );
    });
});
