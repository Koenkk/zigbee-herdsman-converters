import {describe, expect, it, vi} from "vitest";
import {definitions} from "../src/devices/adeo";

const definition = definitions.find((device) => device.model === "LDSENK06");
if (!definition) throw new Error("LDSENK06 definition is missing");
const converter = definition.toZigbee?.find((candidate) => candidate.key.includes("warning"));
if (!converter?.convertSet) throw new Error("LDSENK06 warning converter is missing");
const convertSet = converter.convertSet as (entity: unknown, key: string, value: unknown, meta: unknown) => Promise<unknown>;

describe("LDSENK06 warning", () => {
    it("sends the physically verified Enki warning payload", async () => {
        const command = vi.fn();
        await convertSet({command}, "warning", {mode: "alarm", duration: 5}, {mapped: definition});
        expect(command).toHaveBeenCalledWith(
            "ssIasWd",
            "startWarning",
            {startwarninginfo: 0x76, warningduration: 5, strobedutycycle: 1, strobelevel: 1},
            expect.objectContaining({disableDefaultResponse: true}),
        );
    });

    it("sends the captured stop payload", async () => {
        const command = vi.fn();
        await convertSet({command}, "warning", {mode: "stop", duration: 5}, {mapped: definition});
        expect(command).toHaveBeenCalledWith(
            "ssIasWd",
            "startWarning",
            {startwarninginfo: 0, warningduration: 0, strobedutycycle: 0, strobelevel: 0},
            expect.objectContaining({disableDefaultResponse: true}),
        );
    });

    it("supports sound without strobe", async () => {
        const command = vi.fn();
        await convertSet({command}, "warning", {mode: "alarm", duration: 2, strobe: false}, {mapped: definition});
        expect(command).toHaveBeenCalledWith(
            "ssIasWd",
            "startWarning",
            {startwarninginfo: 0x72, warningduration: 2, strobedutycycle: 1, strobelevel: 1},
            expect.anything(),
        );
    });

    it.each([
        ["medium", 0x71],
        ["high", 0x72],
        ["very_high", 0x73],
    ])("encodes %s sound level", async (level, expected) => {
        const command = vi.fn();
        await convertSet({command}, "warning", {mode: "alarm", strobe: false, level}, {mapped: definition});
        expect(command).toHaveBeenCalledWith("ssIasWd", "startWarning", expect.objectContaining({startwarninginfo: expected}), expect.anything());
    });

    it("supports flash alone with a specified duty cycle", async () => {
        const command = vi.fn();
        await convertSet({command}, "warning", {mode: "flash", duration: 2, strobe_duty_cycle: 50}, {mapped: definition});
        expect(command).toHaveBeenCalledWith(
            "ssIasWd",
            "startWarning",
            {startwarninginfo: 4, warningduration: 2, strobedutycycle: 50, strobelevel: 1},
            expect.anything(),
        );
    });

    it("rejects unverified modes and invalid durations", async () => {
        const command = vi.fn();
        await expect(convertSet({command}, "warning", {mode: "fire"}, {mapped: definition})).rejects.toThrow();
        await expect(convertSet({command}, "warning", {mode: "alarm", duration: 1801}, {mapped: definition})).rejects.toThrow();
        await expect(convertSet({command}, "warning", {mode: "flash", strobe_duty_cycle: 100}, {mapped: definition})).rejects.toThrow();
        await expect(convertSet({command}, "warning", {mode: "alarm", level: "low"}, {mapped: definition})).rejects.toThrow();
        expect(command).not.toHaveBeenCalled();
    });

    it("propagates command failures", async () => {
        const command = vi.fn().mockRejectedValue(new Error("delivery failed"));
        await expect(convertSet({command}, "warning", {mode: "alarm"}, {mapped: definition})).rejects.toThrow("delivery failed");
    });
});
