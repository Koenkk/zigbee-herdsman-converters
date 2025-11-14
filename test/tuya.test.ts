import {describe, expect, it} from "vitest";
import {findByDevice, type Tz} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("lib/tuya", () => {
    describe("dpTHZBSettings", async () => {
        const {toZigbee, fromZigbee} = tuya.modernExtend.dpTHZBSettings();
        const device = mockDevice({modelID: "TS000F", manufacturerName: "_TZ3218_7fiyo3kv", endpoints: [{}]});
        const definition = await findByDevice(device);

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
            const msg = {data: {dpValues: [data.to]}} as Fz.Message;
            const result = await fromZigbee[0].convert(definition, msg, null, null, null);
            expect(result).toStrictEqual(data.from);
        });
    });
});
