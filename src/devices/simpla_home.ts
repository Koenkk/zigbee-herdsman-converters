import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const measurementIntervalMin = 5;
const measurementIntervalMax = 4 * 60 * 60;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Soil Pro"],
        model: "Soil Pro",
        vendor: "Simpla Home",
        description: "Soil Pro",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, z1_top: 2, z2_bottom: 3}}),
            m.identify(),
            m.temperature({
                // the device allows to set the internal measurement interval in the specified range
                // the Min/Max reporting interval needs to be aligned in order to synchronize the
                // value reporting interval to the measurements
                reporting: {min: measurementIntervalMin, max: measurementIntervalMax, change: 10},
            }),
            m.soilMoisture({
                description: "Soil Moisture of Zone 1 (Top Zone)",
                endpointNames: ["z1_top"],
                reporting: {min: measurementIntervalMin, max: measurementIntervalMax, change: 100},
            }),
            m.soilMoisture({
                description: "Soil Moisture of Zone 2 (Bottom Zone)",
                endpointNames: ["z2_bottom"],
                reporting: {min: measurementIntervalMin, max: measurementIntervalMax, change: 100},
            }),
            m.battery(),
            m.numeric({
                name: "measurement_interval",
                access: "ALL",
                unit: "s",
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                scale: 1,
                valueMin: measurementIntervalMin,
                valueMax: measurementIntervalMax,
                description: "Defines how often the device performs measurements",
                reporting: {min: measurementIntervalMin, max: measurementIntervalMax, change: 100},
                entityCategory: "config",
            }),
            m.binary({
                name: "linear_mode",
                cluster: "genBinaryOutput",
                attribute: "presentValue",
                description: "Soil moisture measurement mode: Volumetric Water Content (VWC) (0-45 %) or linear (0-100 %)",
                valueOn: ["linear", 1],
                valueOff: ["VWC", 0],
                access: "ALL",
                entityCategory: "config",
            }),
            m.illuminance({
                reporting: {min: measurementIntervalMin, max: measurementIntervalMax, change: 5},
            }),
        ],
        meta: {multiEndpoint: true},
        ota: true,
    },
];
