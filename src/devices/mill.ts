import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Panel gen4", "Mill Wi-Fi Panel Heater Gen4\u0000\u0000\u0000\u0018Mill Int"],
        model: "Mill-gen-4",
        vendor: "Mill",
        description: "WiFi heating panel gen4",
        fromZigbee: [fz.thermostat, fz.identify],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_system_mode, tz.identify],
        exposes: [e.climate().withSetpoint("occupied_heating_setpoint", 5, 35, 0.5).withLocalTemperature().withSystemMode(["off", "heat"])],
    },
];
