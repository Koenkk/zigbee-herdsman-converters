import {describe, expect, it} from "vitest";
import {definitions as avatto} from "../src/devices/avatto";
import {definitions as tuya} from "../src/devices/tuya";
import type {Expose} from "../src/lib/types";
import {mockDevice} from "./utils";

const findEnum = (exposes: Expose[], name: string): {values: string[]} | undefined => {
    for (const expose of exposes) {
        if (expose.name === name && "values" in expose) return expose as {values: string[]};
        const nested = "features" in expose && expose.features ? findEnum(expose.features as Expose[], name) : undefined;
        if (nested) return nested;
    }
};

describe("Tuya exposed enum values", () => {
    it.each([
        ["TO-Q-SYS-JZT", "_TZE284_6ocnqlhn", "lcd_rotation"],
        ["PRO-900Z", "_TZE204_tagezcph", "factory_reset"],
        ["MTD085-ZB", "_TZ321C_fkzihax8", "scene_preset"],
        ["TRV26", "_TZE204_xdtnpp1a", "preset"],
    ])("%s (%s) accepts every exposed %s value", (model, manufacturerName, key) => {
        const device = mockDevice({modelID: "TS0601", manufacturerName, endpoints: [{ID: 1}]});
        const definition = [...tuya, ...avatto].find((d) => d.model === model);
        const exposes = (typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes) as Expose[];
        const converter = definition.meta.tuyaDatapoints.find((row) => row[1] === key)[2];
        for (const value of findEnum(exposes, key).values) {
            expect(converter.from(converter.to(value, {} as never).valueOf(), {} as never, {})).toStrictEqual(value);
        }
    });
});
