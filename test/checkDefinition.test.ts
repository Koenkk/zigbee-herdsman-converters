import {describe, it} from "vitest";
import {Zcl} from "zigbee-herdsman";
import * as fz from "../src/converters/fromZigbee";
import {repInterval} from "../src/lib/constants";
import {assertDefinition, mockDevice, reportingItem} from "./utils";

describe("Check definition", () => {
    it("IM6001-MPP01", async () => {
        await assertDefinition({
            device: mockDevice({
                modelID: "multi",
                endpoints: [{ID: 1, inputClusters: ["msTemperatureMeasurement", "genPowerCfg", "manuSpecificSamsungAccelerometer", "genPollCtrl"]}],
            }),
            meta: undefined,
            fromZigbee: [fz.temperature, fz.battery, fz.ias_contact_alarm_1, fz.smartthings_acceleration],
            toZigbee: [],
            exposes: ["battery", "battery_low", "contact", "moving", "tamper", "temperature", "x_axis", "y_axis", "z_axis"],
            bind: {1: ["msTemperatureMeasurement", "genPowerCfg", "manuSpecificSamsungAccelerometer"]},
            read: {1: [["genPowerCfg", ["batteryPercentageRemaining"]]]},
            write: {
                1: [
                    ["manuSpecificSamsungAccelerometer", {0: {value: 0x14, type: 0x20}}, {manufacturerCode: Zcl.ManufacturerCode.SAMJIN_CO_LTD}],
                    ["genPollCtrl", {checkinInterval: 14400}],
                    ["genPollCtrl", {longPollInterval: 3600}],
                ],
            },
            configureReporting: {
                1: [
                    ["msTemperatureMeasurement", [reportingItem("measuredValue", 10, repInterval.HOUR, 100)]],
                    ["genPowerCfg", [reportingItem("batteryPercentageRemaining", repInterval.HOUR, repInterval.MAX, 0)]],
                    [
                        "manuSpecificSamsungAccelerometer",
                        [reportingItem("acceleration", 10, repInterval.HOUR, 5)],
                        {manufacturerCode: Zcl.ManufacturerCode.SAMJIN_CO_LTD},
                    ],
                    [
                        "manuSpecificSamsungAccelerometer",
                        [reportingItem("x_axis", 10, repInterval.HOUR, 5)],
                        {manufacturerCode: Zcl.ManufacturerCode.SAMJIN_CO_LTD},
                    ],
                    [
                        "manuSpecificSamsungAccelerometer",
                        [reportingItem("y_axis", 10, repInterval.HOUR, 5)],
                        {manufacturerCode: Zcl.ManufacturerCode.SAMJIN_CO_LTD},
                    ],
                    [
                        "manuSpecificSamsungAccelerometer",
                        [reportingItem("z_axis", 10, repInterval.HOUR, 5)],
                        {manufacturerCode: Zcl.ManufacturerCode.SAMJIN_CO_LTD},
                    ],
                ],
            },
        });
    });
});
