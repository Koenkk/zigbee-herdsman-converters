import {Zcl} from "zigbee-herdsman";

import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const defaultReporting = {min: 0, max: 300, change: 0};
const co2Reporting = {min: 10, max: 300, change: 0.000001};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Tuya_CO2Sensor_r01"],
        model: "Tuya_CO2Sensor_r01",
        vendor: "Slacky-DIY",
        description: "Tuya CO2 sensor with custom Firmware",
        extend: [m.co2({reporting: co2Reporting})],
        ota: true,
    },
];
