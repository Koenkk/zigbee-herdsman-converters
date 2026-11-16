import {describe, expect, it} from "vitest";
import {definitions} from "../src/devices/girier";
import {findByDevice} from "../src/index";
import {mockDevice} from "./utils";

const definition = definitions.find((d) => d.model === "TS0601_GIRIER");
const converter = (dp: number) => {
    const result = definition?.meta?.tuyaDatapoints?.find((row) => row[0] === dp)?.[2];
    if (!result?.from || (!result.to && dp !== 1)) throw new Error(`Missing converter for DP ${dp}`);
    return result;
};

describe("Girier TS0601_GIRIER", () => {
    it("matches the tested fingerprint without claiming the different TS0225 variant", async () => {
        const device = mockDevice({modelID: "TS0601", manufacturerName: "_TZE28C1000000_ntqql63p", endpoints: [{ID: 1}]});
        expect((await findByDevice(device))?.model).toBe("TS0601_GIRIER");
    });

    it.each([
        [0, false, "absence"],
        [1, true, "presence"],
        [2, true, "sensor_close"],
    ])("converts presence enum %s", (value, present, state) => {
        expect(converter(1).from?.(value)).toStrictEqual({presence: present, occupancy: present, presence_state: state});
    });

    it("round trips every supported contiguous detection mask", () => {
        const range = converter(117);
        for (let count = 0; count <= 10; count++) {
            const distance = Math.round(count * 7) / 10;
            const mask = Array.from({length: 10}, (_, i) => (i < count ? 1 : 0));
            expect(range.to?.(distance)).toStrictEqual(mask);
            expect(range.from?.(Buffer.from(mask))).toBe(distance);
        }
        expect(range.to?.(2.8)).toStrictEqual([1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
    });

    it("does not invent a maximum distance for malformed or noncontiguous masks", () => {
        for (const mask of [[1], [1, 0, 1, 0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0, 0, 0]]) {
            expect(converter(117).from?.(Buffer.from(mask))).toBeNull();
        }
        for (const distance of [-0.7, 3, 7.7, Number.NaN, Number.POSITIVE_INFINITY, "2.8"]) {
            expect(() => converter(117).to?.(distance)).toThrow();
        }
    });

    it("validates the absence delay without changing its units", () => {
        const delay = converter(106);
        for (const value of [0, 5, 10, 1800]) {
            expect(delay.from?.(value)).toBe(value);
            expect(delay.to?.(value)).toBe(value);
        }
        for (const value of [-1, 1801, 0.5, Number.NaN, "5"]) expect(() => delay.to?.(value)).toThrow();
    });
});
