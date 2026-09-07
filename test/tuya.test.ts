import {describe, expect, it} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice, type Tz} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("lib/tuya", () => {
    describe("tuyaWeatherForecast", () => {
        it("uses forecast fields 1 through 3 and includes their humidity in the payload", async () => {
            const {toZigbee} = tuya.modernExtend.tuyaWeatherForecast();
            const converter = toZigbee?.[0];
            expect(converter?.key).toStrictEqual([
                "temperature_0",
                "humidity_0",
                "condition_0",
                "temperature_1",
                "humidity_1",
                "condition_1",
                "temperature_2",
                "humidity_2",
                "condition_2",
                "temperature_3",
                "humidity_3",
                "condition_3",
            ]);

            const device = mockDevice({modelID: "TS0601", manufacturerName: "_TZE28C1000000_o409r73p", endpoints: [{ID: 1}]});
            const definition = await findByDevice(device);
            const state = {
                temperature_0: 27,
                humidity_0: 78,
                condition_0: "sunny",
                temperature_1: 31,
                humidity_1: 80,
                condition_1: "rain",
                temperature_2: 29,
                humidity_2: 75,
                condition_2: "yin",
                temperature_3: 28,
                humidity_3: 85,
                condition_3: "thunder_shower",
            };
            const meta: Tz.Meta = {state, device, message: null, mapped: definition, options: null, publish: null, endpoint_name: null};

            await converter?.convertSet?.(device.endpoints[0], "humidity_3", 85, meta);

            expect(device.endpoints[0].command).toHaveBeenCalledWith("manuSpecificTuya", "tuyaWeatherSync", {
                payload: Buffer.from([
                    0x11, 0x00, 0x12, 0x03, 0x13, 0x01, 0x01, 0x00, 27, 0x00, 31, 0x00, 29, 0x00, 28, 0x02, 0x00, 78, 0x00, 80, 0x00, 75, 0x00, 85,
                    0x03, 100, 118, 114, 143, 0x00,
                ]),
            });
        });
    });

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

    describe("tuyaOnOff power-on behaviour selection", () => {
        const resolveExposes = async (manufacturerName: string) => {
            const device = mockDevice({modelID: "TS0003", manufacturerName, endpoints: [{ID: 1}, {ID: 2}, {ID: 3}]});
            const definition = await findByDevice(device);
            const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
            return {definition, properties: exposes.map((expose) => expose.property)};
        };

        it("exposes power_on_behavior for manufacturers using the manuSpecificTuya3 attribute", async () => {
            // `TS0003_switch_3_gang_with_backlight` passes `powerOutageMemory` and `powerOnBehavior2` as
            // complementary predicates. Both are functions, so branching on the option itself always chose
            // `powerOutageMemory`, whose expose is then gated off for these manufacturers, leaving them with
            // no power-on control at all.
            const {properties} = await resolveExposes("_TZ3000_uilitwsy");

            expect(properties).toContain("power_on_behavior_l1");
            expect(properties).toContain("power_on_behavior_l2");
            expect(properties).toContain("power_on_behavior_l3");
            expect(properties).not.toContain("power_outage_memory");
        });

        it("still exposes power_outage_memory for the legacy manufacturers on the same definition", async () => {
            const {properties} = await resolveExposes("_TZ3000_nwidmc4n");

            expect(properties).toContain("power_outage_memory");
            expect(properties).not.toContain("power_on_behavior_l1");
        });

        it("lets power_on_behavior_2 win the shared power_on_behavior key", async () => {
            // Both converters answer to `power_on_behavior`; the first match wins, so the manuSpecificTuya3
            // one has to be registered first or these devices would write moesStartUpOnOff instead.
            const {definition} = await resolveExposes("_TZ3000_uilitwsy");
            const keys = definition.toZigbee.map((converter) => converter.key);
            const powerOnBehavior2 = keys.findIndex((key) => key?.includes("power_on_behavior") && !key.includes("power_outage_memory"));
            const powerOnBehavior1 = keys.findIndex((key) => key?.includes("power_outage_memory"));

            expect(powerOnBehavior2).toBeGreaterThanOrEqual(0);
            expect(powerOnBehavior1).toBeGreaterThanOrEqual(0);
            expect(powerOnBehavior2).toBeLessThan(powerOnBehavior1);
        });
    });
});
