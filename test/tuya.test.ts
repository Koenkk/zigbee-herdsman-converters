import {describe, expect, it} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice, type Tz} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("lib/tuya", () => {
    describe("dpTHZBSettings", () => {
        const {toZigbee, fromZigbee} = tuya.modernExtend.dpTHZBSettings();

        // 0000 disable   writeInt32LE(temp_greater_value * 10)  01 on      unknown   writeInt32LE(temp_lower_value * 10)   01 on
        // 8000 enable                                           00 off     01                                              00 off
        // 2 bytes        4 bytes                                1 byte     1 byte    4 byte                                1 byte

        const enable20OnMinus10Off = {
            to: tuya.dpValueFromString(119, "8000" + "c8000000" + "0101" + "9cffffff" + "00"),
            from: {auto_settings: {enabled: true, temp_greater_then: "ON", temp_greater_value: 20, temp_lower_value: -10, temp_lower_then: "OFF"}},
        };

        const disable0Off0Dot2On = {
            to: tuya.dpValueFromString(119, "0000" + "00000000" + "0001" + "02000000" + "01"),
            from: {auto_settings: {enabled: false, temp_greater_then: "OFF", temp_greater_value: 0, temp_lower_value: 0.2, temp_lower_then: "ON"}},
        };

        it.each([enable20OnMinus10Off, disable0Off0Dot2On])("toZigbee", async (data) => {
            const device = mockDevice({modelID: "TS000F", manufacturerName: "_TZ3218_7fiyo3kv", endpoints: [{}]});
            const definition = await findByDevice(device);
            const meta: Tz.Meta = {state: {}, device, message: null, mapped: definition, options: null, publish: null, endpoint_name: null};
            await toZigbee[0].convertSet(device.endpoints[0], "auto_settings", data.from.auto_settings, {
                ...meta,
                message: data.from,
            });
            // Should disable manual mode
            expect(device.endpoints[0].command).toHaveBeenNthCalledWith(
                1,
                "manuSpecificTuya",
                "sendData",
                {seq: 1, dpValues: [{data: Buffer.from([0]), datatype: 4, dp: 101}]},
                {disableDefaultResponse: true},
            );
            expect(device.endpoints[0].command).toHaveBeenNthCalledWith(
                2,
                "manuSpecificTuya",
                "sendData",
                {seq: 1, dpValues: [data.to]},
                {disableDefaultResponse: true},
            );
        });

        it.each([enable20OnMinus10Off, disable0Off0Dot2On])("fromZigbee", async (data) => {
            const device = mockDevice({modelID: "TS000F", manufacturerName: "_TZ3218_7fiyo3kv", endpoints: [{}]});
            const definition = await findByDevice(device);
            // biome-ignore lint/suspicious/noExplicitAny: generic
            const msg = {data: {dpValues: [data.to]}} as Fz.Message<any, any, any>;
            const result = await fromZigbee[0].convert(definition, msg, null, null, null);
            expect(result).toStrictEqual(data.from);
        });
    });

    describe("closuresWindowCovering custom cluster (Tuya covers)", () => {
        // Regression: moesCalibrationTime was declared as ENUM8 (a single byte,
        // max 255). The calibration_time converter writes value * 10 and the
        // exposed max is 500 s -> 5000, which does not fit in a byte:
        //   - calibration_time 26 -> 260 throws RangeError (> 255) before sending
        //   - smaller values (e.g. 25 -> 250) are rejected on-air as
        //     INVALID_DATA_TYPE
        // The attribute must be UINT16 for value * 10 (up to 5000) to encode.
        it("declares moesCalibrationTime as UINT16 so value*10 fits", async () => {
            const device = mockDevice({
                modelID: "TS130F",
                manufacturerName: "_TZ3000_1dd0d5yi",
                endpoints: [{ID: 1, inputClusters: ["closuresWindowCovering"]}],
            });
            const definition = await findByDevice(device);
            // Registers the custom cluster on the device (deviceAddCustomCluster).
            await definition.configure?.(device, device.getEndpoint(1), definition);

            const cluster = device.customClusters.closuresWindowCovering;
            expect(cluster.attributes.moesCalibrationTime).toMatchObject({ID: 0xf003, type: Zcl.DataType.UINT16});
        });
    });

    describe("phaseVariant2WithPhase", () => {
        // Regression: the payload is 8 bytes -- voltage (2), current (3), power (3) --
        // the same layout already decoded by phaseVariant3/phaseVariant4. Only the low
        // 2 bytes of current and power were read, so:
        //   - current wrapped above 65.536 A (68.783 A was reported as 3.247 A)
        //   - the negative power branch used 0x999a, which is the low 16 bits of the
        //     real 24-bit offset 0x19999a, so it only produced negative values between
        //     32768 and 39321 and corrupted any legitimate reading above 32767 W

        // voltage in 0.1 V, current in mA, power in W
        const payload = (voltage: number, current: number, power: number) =>
            Buffer.from([
                (voltage >> 8) & 0xff,
                voltage & 0xff,
                (current >> 16) & 0xff,
                (current >> 8) & 0xff,
                current & 0xff,
                (power >> 16) & 0xff,
                (power >> 8) & 0xff,
                power & 0xff,
            ]).toString("base64");

        const decode = (phase: string, voltage: number, current: number, power: number) =>
            tuya.valueConverter.phaseVariant2WithPhase(phase).from(payload(voltage, current, power));

        it("suffixes every key with the phase", () => {
            expect(decode("b", 1234, 4252, 519)).toStrictEqual({voltage_b: 123.4, current_b: 4.252, power_b: 519});
        });

        it("decodes readings below the 16 bit boundary", () => {
            expect(decode("l1", 1234, 4252, 519)).toStrictEqual({voltage_l1: 123.4, current_l1: 4.252, power_l1: 519});
            expect(decode("l1", 1200, 65535, 1000)).toStrictEqual({voltage_l1: 120, current_l1: 65.535, power_l1: 1000});
        });

        it.each([
            // captured on TS0601 / _TZE284_x8diwkqb with a 5.5 kW and a 7.5 kW heater running
            {voltage: 1190, current: 69610, power: 8270, expected: {voltage_l1: 119, current_l1: 69.61, power_l1: 8270}},
            {voltage: 1195, current: 65951, power: 7867, expected: {voltage_l1: 119.5, current_l1: 65.951, power_l1: 7867}},
            // just past the wrap point, previously reported as 0.0 A / 0.001 A
            {voltage: 1200, current: 65536, power: 1000, expected: {voltage_l1: 120, current_l1: 65.536, power_l1: 1000}},
            {voltage: 1200, current: 65537, power: 1000, expected: {voltage_l1: 120, current_l1: 65.537, power_l1: 1000}},
        ])("does not wrap currents above 65.536 A ($current mA)", ({voltage, current, power, expected}) => {
            expect(decode("l1", voltage, current, power)).toStrictEqual(expected);
        });

        it("keeps current consistent with power and voltage under high load", () => {
            const {voltage_l1, current_l1, power_l1} = decode("l1", 1190, 69610, 8270) as Record<string, number>;
            expect(power_l1).toBeCloseTo(voltage_l1 * current_l1, -2);
        });

        it.each([
            // raw values and expected results reported in
            // https://github.com/Koenkk/zigbee2mqtt/issues/18603#issuecomment-2277697295
            {raw: 1677525, expected: -197},
            {raw: 1677524, expected: -198},
            {raw: 1677523, expected: -199},
        ])("reports negative power ($raw -> $expected W)", ({raw, expected}) => {
            expect(decode("l1", 1200, 0, raw)).toStrictEqual({voltage_l1: 120, current_l1: 0, power_l1: expected});
        });

        it("does not turn a large positive power into a negative one", () => {
            // 40000 W was decoded as 678 W before: 40000 > 0x7fff took the negative
            // branch, giving (0x999a - 40000) * -1
            expect(decode("l1", 1200, 300000, 40000)).toStrictEqual({voltage_l1: 120, current_l1: 300, power_l1: 40000});
        });
    });
});
