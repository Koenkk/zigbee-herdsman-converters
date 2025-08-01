import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const measurementIntervalMin = 5;
const measurementIntervalMax = 4 * 60 * 60;

export const simplaHomeModernExtend = {
    measurementInterval: (args?: Partial<m.NumericArgs>) => {
        const resultName = "measurement_interval";
        const resultUnit = "s";
        const resultDescription = "Defines how often the device performs measurements";

        const result: ModernExtend = m.numeric({
            name: resultName,
            access: "ALL",
            unit: resultUnit,
            cluster: "genAnalogOutput",
            attribute: "presentValue",
            scale: 1,
            valueMin: measurementIntervalMin,
            valueMax: measurementIntervalMax,
            description: resultDescription,
            ...args,
        });

        // exposes is dynamic based on fw version
        result.exposes = [
            (device, options) => {
                if (!utils.isDummyDevice(device) && device.softwareBuildID && Number(`0x${device?.softwareBuildID}`) > 0x01010101) {
                    return [
                        e
                            .numeric(resultName, ea.ALL)
                            .withDescription(resultDescription)
                            .withUnit(resultUnit)
                            .withValueMin(measurementIntervalMin)
                            .withValueMax(measurementIntervalMax),
                    ];
                }
                return [];
            },
        ];

        return result;
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Soil Pro"],
        model: "Soil Pro",
        vendor: "Simpla Home",
        description: "Soil moisture sensor: Simpla Home Soil Pro",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, z1_top: 2, z2_bottom: 3}}),
            m.identify(),
            m.temperature({
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
            simplaHomeModernExtend.measurementInterval(),
            m.illuminance({
                reporting: {min: measurementIntervalMin, max: measurementIntervalMax, change: 5},
            }),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpointId = device.getEndpoint(1);
            await endpointId.read("genBasic", ["swBuildId"]);

            if (Number(`0x${device?.softwareBuildID}`) > 0x01010101) {
                const endpointAnalogOutput = device.getEndpoint(2);
                await endpointAnalogOutput.bind("genAnalogOutput", coordinatorEndpoint);
                await endpointAnalogOutput.read("genAnalogOutput", ["presentValue"]);
            }
        },
        meta: {multiEndpoint: true},
        ota: true,
    },
];
