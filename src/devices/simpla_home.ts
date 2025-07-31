import * as m from "../lib/modernExtend";

import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

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
            m.illuminance(),
        ],
        exposes: (device, options) => {
            const dynExposes = [];
            if (utils.isDummyDevice(device) || Number(`0x${device?.softwareBuildID}`) > 0x01010101) {
                dynExposes.push(
                    e
                        .numeric("measurementInterval", ea.ALL)
                        .withLabel("Measurement Interval")
                        .withUnit("s")
                        .withValueMin(5)
                        .withValueMax(4 * 60 * 60)
                        .withCategory("config")
                        .withDescription("Defines how often the device performs measurements"),
                );
            }
            return dynExposes;
        },
        fromZigbee: [
            {
                cluster: "genAnalogOutput",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.endpoint.ID === 2 && Object.hasOwn(msg.data, "presentValue")) {
                        return {measurementInterval: msg.data.presentValue};
                    }
                },
            },
        ],
        toZigbee: [
            {
                key: ["measurementInterval"],
                convertSet: async (entity, key, value, meta) => {
                    const endpoint = meta.device.getEndpoint(2);
                    await endpoint.write("genAnalogOutput", {presentValue: value});
                    return {state: {measurementInterval: value}};
                },
                convertGet: async (entity, key, meta) => {
                    const endpoint = meta.device.getEndpoint(2);
                    await endpoint.read("genAnalogOutput", ["presentValue"]);
                },
            },
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
