import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

export const simplaHomeModernExtend = {
    measurementInterval: (args?: Partial<m.NumericArgs>) => {
        const resultName = "measurement_interval";
        const resultUnit = "s";
        const resultValueMin = 5;
        const resultValueMax = 4 * 60 * 60;
        const resultDescription = "Defines how often the device performs measurements";

        const result: ModernExtend = m.numeric({
            name: resultName,
            access: "ALL",
            unit: resultUnit,
            cluster: "genAnalogOutput",
            attribute: "presentValue",
            scale: 1,
            valueMin: resultValueMin,
            valueMax: resultValueMax,
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
                            .withValueMin(resultValueMin)
                            .withValueMax(resultValueMax),
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
        fingerprint: [
            {
                type: "EndDevice",
                manufacturerName: "Simpla",
                modelID: "Soil Pro",
                hardwareVersion: 2,
            },
        ],
        model: "Soil Pro",
        vendor: "Simpla Home",
        description: "Soil moisture sensor: Simpla Home Soil Pro",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, z1_top: 2, z2_bottom: 3}}),
            m.identify(),
            m.temperature(),
            m.soilMoisture({
                description: "Soil Moisture of Zone 1 (Top Zone)",
                endpointNames: ["z1_top"],
            }),
            m.soilMoisture({
                description: "Soil Moisture of Zone 2 (Bottom Zone)",
                endpointNames: ["z2_bottom"],
            }),
            m.battery(),
            simplaHomeModernExtend.measurementInterval(),
            m.illuminance(),
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
