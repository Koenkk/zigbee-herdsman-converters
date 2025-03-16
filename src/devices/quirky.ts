import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend} from "../lib/types";
const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Overflow"],
        model: "Smart_Water_Leak_Sensor_Quirky_Inc",
        vendor: "Quirky",
        description: "Smart water leak sensor with a long cable and a seperate sensing end and body. It accepts 2 AA batteries.",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low()],
        meta: {},
    },
];
