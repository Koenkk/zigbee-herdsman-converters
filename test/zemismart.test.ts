import {describe, expect, it} from "vitest";
import {definitions} from "../src/devices/zemismart";
import type {Expose} from "../src/lib/types";

describe("Zemismart ZMS-206 light colors", () => {
    const keys = ["switch_color_on", "switch_color_off", "delay_off_schedule"];

    it.each(["ZMS-206US-1", "ZMS-206EU-2", "ZMS-206EU-3", "ZMS-206US-4"])("%s round trips every exposed color", (model) => {
        const definition = definitions.find((d) => d.model === model);
        const exposes = (typeof definition.exposes === "function" ? definition.exposes(undefined, {}) : definition.exposes) as Expose[];
        for (const key of keys) {
            const values = (exposes.find((e) => e.name === key) as {values: string[]}).values;
            const converter = definition.meta.tuyaDatapoints.find((row) => row[1] === key)[2];
            for (const value of values) {
                expect(converter.from(converter.to(value, {} as never).valueOf(), {} as never, {})).toStrictEqual(value);
            }
        }
    });
});
