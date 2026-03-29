import {beforeEach, describe, expect, it} from "vitest";
import type {Device} from "zigbee-herdsman/dist/controller/model";
import type {Tz} from "../src/lib/types";
import {batteryVoltageToPercentage, getFromLookup, getFromLookupByValue, getTransition, mapNumberRange, toNumber} from "../src/lib/utils";
import {mockDevice} from "./utils";

describe("utils", () => {
    describe("mapNumberRange", () => {
        it("should map value (0..100)->(0..200)", () => {
            expect(mapNumberRange(50, 0, 100, 0, 200)).toEqual(100);
        });
        it("should map value (100..200)->(300..400)", () => {
            expect(mapNumberRange(150, 100, 200, 300, 400)).toEqual(350);
        });
        it("should map value (0..100)->(0..200) outside range", () => {
            expect(mapNumberRange(200, 0, 100, 0, 200)).toEqual(400);
        });
        it("should map value (0..100)->(100..0)", () => {
            expect(mapNumberRange(20, 0, 100, 100, 0)).toEqual(80);
        });
        it("should map value (100..200)->(200..100)", () => {
            expect(mapNumberRange(120, 100, 200, 200, 100)).toEqual(180);
        });
        it("should round to specified precision", () => {
            expect(mapNumberRange(3.14, 0, 10, 0, 100, 1)).toEqual(31.4);
        });
    });

    describe("getTransition", () => {
        let entity: Device;
        let key: string;
        let meta: Tz.Meta;

        beforeEach(() => {
            entity = mockDevice({modelID: "abcd", manufacturerID: 4476, endpoints: [{}]});
            key = "brightness";
            // @ts-expect-error minimal mock
            meta = {
                options: {},
                message: {},
            };
        });

        it("should return {time: 0, specified: false} if manufacturerID is 4476 and key is brightness and message has color or color_temp", () => {
            meta.message = {
                color: "red",
            };

            const result = getTransition(entity.endpoints[0], key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });

        it("should return {time: 0, specified: false} if manufacturerID is 4476 and key is brightness and message has color_temp", () => {
            meta.message = {
                color_temp: 3000,
            };

            const result = getTransition(entity.endpoints[0], key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });

        it("should return {time: 0, specified: false} if options.transition is an empty string", () => {
            meta.options = {
                transition: "",
            };

            const result = getTransition(entity.endpoints[0], key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });

        it("should return {time: 0, specified: false} if options.transition is not specified", () => {
            const result = getTransition(entity.endpoints[0], key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });

        it("should return {time: 100, specified: true} if message.transition is specified", () => {
            meta.message = {
                transition: 10,
            };

            const result = getTransition(entity.endpoints[0], key, meta);

            expect(result).toEqual({time: 100, specified: true});
        });

        it("should return {time: 200, specified: true} if options.transition is specified", () => {
            meta.options = {
                transition: 20,
            };

            const result = getTransition(entity.endpoints[0], key, meta);

            expect(result).toEqual({time: 200, specified: true});
        });

        it("should return {time: 0, specified: false} if neither message.transition nor options.transition is specified", () => {
            const result = getTransition(entity.endpoints[0], key, meta);

            expect(result).toEqual({time: 0, specified: false});
        });
    });

    describe("batteryVoltageToPercentage", () => {
        it("gets linear", () => {
            expect(batteryVoltageToPercentage(2760, {min: 2500, max: 3000})).toStrictEqual(52);
            expect(batteryVoltageToPercentage(3100, {min: 2500, max: 3000})).toStrictEqual(100);
            expect(batteryVoltageToPercentage(2400, {min: 2500, max: 3000})).toStrictEqual(0);
        });

        it("gets linear with offset", () => {
            expect(batteryVoltageToPercentage(3045, {min: 2900, max: 4100, vOffset: 1000})).toStrictEqual(95);
            expect(batteryVoltageToPercentage(3145, {min: 2900, max: 4100, vOffset: 1000})).toStrictEqual(100);
            expect(batteryVoltageToPercentage(1800, {min: 2900, max: 4100, vOffset: 1000})).toStrictEqual(0);
        });

        it("gets non-linear", () => {
            expect(batteryVoltageToPercentage(2300, "3V_2100")).toStrictEqual(4);
            expect(batteryVoltageToPercentage(3000, "3V_2100")).toStrictEqual(100);
            expect(batteryVoltageToPercentage(2000, "3V_2100")).toStrictEqual(0);

            expect(batteryVoltageToPercentage(2300, "3V_1500_2800")).toStrictEqual(74);
            expect(batteryVoltageToPercentage(3000, "3V_1500_2800")).toStrictEqual(100);
            expect(batteryVoltageToPercentage(1400, "3V_1500_2800")).toStrictEqual(0);
        });
    });

    it("toNumber", () => {
        expect(toNumber("1")).toBe(1);
        expect(toNumber(5)).toBe(5);
        expect(() => toNumber("notanumber")).toThrowError("Value is not a number, got string (notanumber)");
        expect(toNumber("0")).toBe(0);
        expect(toNumber(0)).toBe(0);
        expect(() => toNumber("")).toThrowError("Value is not a number, got string ()");
    });

    describe("getFromLookup", () => {
        describe("string keys", () => {
            it("should match with case insensitive lookup (lowercase key)", () => {
                expect(getFromLookup("OFF", {off: 0, on: 1, previous: 2})).toStrictEqual(0);
            });

            it("should match with case insensitive lookup (mixed case key)", () => {
                expect(getFromLookup("On", {off: 0, on: 1, previous: 2})).toStrictEqual(1);
            });

            it("should match with case insensitive lookup (uppercase key)", () => {
                expect(getFromLookup("previous", {OFF: 0, ON: 1, PREVIOUS: 2})).toStrictEqual(2);
            });
        });

        describe("number keys", () => {
            it("should match numeric key", () => {
                expect(getFromLookup(1, {0: "OFF", 1: "on"})).toStrictEqual("on");
            });
        });

        describe("boolean keys", () => {
            it("should match true with exact match", () => {
                expect(getFromLookup(true, {true: "enabled", false: "disabled"}, undefined, true)).toStrictEqual("enabled");
            });

            it("should match false with exact match", () => {
                expect(getFromLookup(false, {true: "enabled", false: "disabled"}, undefined, true)).toStrictEqual("disabled");
            });

            it("should match true with case insensitive lookup", () => {
                expect(getFromLookup(true, {TRUE: "yes", FALSE: "no"}, undefined, true)).toStrictEqual("yes");
            });

            it("should throw when keyIsBool is true but key is not boolean", () => {
                expect(() => getFromLookup("true", {true: "enabled", false: "disabled"}, undefined, true)).toThrowError(
                    "Expected boolean, got: string",
                );
                expect(() => getFromLookup(1, {true: "enabled", false: "disabled"}, undefined, true)).toThrowError("Expected boolean, got: number");
            });
        });

        describe("invalid key types", () => {
            it("should throw when key is not string or number", () => {
                expect(() => getFromLookup(null, {off: 0, on: 1})).toThrowError("Expected string or number, got: object");
                expect(() => getFromLookup(undefined, {off: 0, on: 1})).toThrowError("Expected string or number, got: undefined");
                expect(() => getFromLookup({}, {off: 0, on: 1})).toThrowError("Expected string or number, got: object");
            });
        });

        describe("key not found", () => {
            it("should throw when key not found and no default provided", () => {
                expect(() => getFromLookup("unknown", {off: 0, on: 1})).toThrowError("Key 'unknown' not found in: [off, on]");
                expect(() => getFromLookup(99, {0: "OFF", 1: "on"})).toThrowError("Key '99' not found in: [0, 1]");
                expect(() => getFromLookup(false, {true: "yes"}, undefined, true)).toThrowError("Key 'false' not found in: [true]");
            });

            it("should return default value when key not found and default provided", () => {
                expect(getFromLookup("unknown", {off: 0, on: 1}, 99)).toStrictEqual(99);
                expect(getFromLookup(99, {0: "OFF", 1: "on"}, "default")).toStrictEqual("default");
                expect(getFromLookup(false, {true: "yes"}, "no", true)).toStrictEqual("no");
            });
        });
    });

    describe("getFromLookupByValue", () => {
        describe("value found", () => {
            it("should return key when value matches", () => {
                expect(getFromLookupByValue(0, {off: 0, on: 1})).toStrictEqual("off");
                expect(getFromLookupByValue(1, {off: 0, on: 1})).toStrictEqual("on");
                expect(getFromLookupByValue("enabled", {mode_a: "enabled", mode_b: "disabled"})).toStrictEqual("mode_a");
            });
        });

        describe("value not found", () => {
            it("should throw when value not found and no default provided", () => {
                expect(() => getFromLookupByValue(99, {off: 0, on: 1})).toThrowError("Expected one of: 0, 1, got: '99'");
                expect(() => getFromLookupByValue("unknown", {mode_a: "enabled", mode_b: "disabled"})).toThrowError(
                    "Expected one of: enabled, disabled, got: 'unknown'",
                );
            });

            it("should return default value when value not found and default provided", () => {
                expect(getFromLookupByValue(99, {off: 0, on: 1}, "default_key")).toStrictEqual("default_key");
                expect(getFromLookupByValue("unknown", {mode_a: "enabled", mode_b: "disabled"}, "fallback")).toStrictEqual("fallback");
            });
        });

        describe("multiple keys with same value", () => {
            it("should return first matching key", () => {
                expect(getFromLookupByValue("same", {first: "same", second: "same", third: "different"})).toStrictEqual("first");
            });
        });
    });
});
