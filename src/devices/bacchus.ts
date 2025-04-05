import {Zcl} from "zigbee-herdsman";

import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const defaultReporting = {min: 0, max: 3600, change: 0};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Flower_Sensor_v2"],
        model: "Flower_Sensor_v2",
        vendor: "Bacchus",
        description: "Flower soil moisture sensor",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1}}),
            m.soilMoisture({
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.temperature({
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.illuminance({
                access: "STATE",
                reporting: defaultReporting,
            }),
            m.numeric({
                name: "report_delay",
                unit: "min",
                valueMin: 1,
                valueMax: 600,
                cluster: "msSoilMoisture",
                attribute: {ID: 0x0203, type: 0x21},
                description: "Reporting interval",
                access: "STATE_SET",
            }),
            m.numeric({
                name: "threshold",
                unit: "%",
                valueMin: 0,
                valueMax: 100,
                cluster: "msSoilMoisture",
                attribute: {ID: 0x0202, type: 0x21},
                description: "Reporting interval",
                access: "STATE_SET",
            }),
            m.battery({
                voltage: true,
                voltageReportingConfig: defaultReporting,
                percentageReportingConfig: defaultReporting,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).read("msSoilMoisture", [0x0202, 0x0203]);
        },
    },
];
