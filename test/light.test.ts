import {describe, expect, it} from "vitest";
import * as exposes from "../src/lib/exposes";
import {exposedColorModes, toExposedColorMode} from "../src/lib/light";
import type {Definition} from "../src/lib/types";
import {mockDevice} from "./utils";

const e = exposes.presets;

describe("lib/light color modes", () => {
    const device = mockDevice({modelID: "dummy", endpoints: [{}]});
    const definition = (exp: Definition["exposes"]) => ({exposes: exp}) as Definition;

    it("exposedColorModes collects the color modes of the light", () => {
        const light = e.light().withBrightness().withColorTemp([153, 500]).withColor(["xy", "hs"]);
        expect(exposedColorModes(definition([light]), device, {})).toStrictEqual(new Set(["color_temp", "xy", "hs"]));
        expect(exposedColorModes(definition([e.light().withBrightness()]), device, {})).toStrictEqual(new Set());
    });

    it("exposedColorModes uses the light of the given endpoint", () => {
        const exp = [e.light().withColorTemp([153, 500]).withEndpoint("l1"), e.light().withColor(["xy"]).withEndpoint("l2")];
        expect(exposedColorModes(definition(exp), device, {}, "l1")).toStrictEqual(new Set(["color_temp"]));
        expect(exposedColorModes(definition(exp), device, {}, "l2")).toStrictEqual(new Set(["xy"]));
        expect(exposedColorModes(definition(exp), device, {}, "l3")).toBeUndefined();
        expect(exposedColorModes(definition(exp), device, {})).toBeUndefined();
    });

    it("exposedColorModes resolves exposes functions", () => {
        const exp = () => [e.light().withColorTemp([153, 500])];
        expect(exposedColorModes(definition(exp), device, {})).toStrictEqual(new Set(["color_temp"]));
    });

    it("exposedColorModes returns undefined when the exposes function throws", () => {
        const exp = () => {
            throw new Error("failed");
        };
        expect(exposedColorModes(definition(exp), device, {})).toBeUndefined();
    });

    it.each([
        ["hs", ["hs", "color_temp"], "hs"],
        ["hs", ["xy", "color_temp"], "xy"],
        ["xy", ["hs", "color_temp"], "hs"],
        ["hs", ["color_temp"], "color_temp"],
        ["xy", ["color_temp"], "color_temp"],
        ["color_temp", ["xy"], "xy"],
        ["color_temp", ["hs"], "hs"],
        ["hs", [], undefined],
    ] as const)("toExposedColorMode(%s, %j) = %s", (mode, exposed, expected) => {
        expect(toExposedColorMode(mode, new Set(exposed))).toStrictEqual(expected);
    });
});
