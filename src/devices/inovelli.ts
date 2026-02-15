import * as inovelli from "../lib/inovelli";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["VZM30-SN"],
        model: "VZM30-SN",
        vendor: "Inovelli",
        description: "On/off switch",
        extend: [
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, "3": 3, "4": 4},
                multiEndpointSkip: ["state", "voltage", "power", "current", "energy", "brightness", "temperature", "humidity"],
            }),
            inovelli.m.light(),
            inovelli.m.device({
                attrs: [{attributes: inovelli.VZM30_ATTRIBUTES, clusterName: inovelli.CLUSTER_NAME}],
                supportsLedEffects: true,
                supportsButtonTaps: true,
            }),
            inovelli.m.addCustomCluster(),
            m.identify(),
            inovelli.m.energyReset(),
            m.electricityMeter({energy: {divisor: 1000}}),
            m.temperature(),
            m.humidity(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["VZM31-SN"],
        model: "VZM31-SN",
        vendor: "Inovelli",
        description: "2-in-1 switch + dimmer",
        extend: [
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, "3": 3},
                multiEndpointSkip: ["state", "power", "energy", "brightness"],
            }),
            inovelli.m.light(),
            inovelli.m.device({
                attrs: [{attributes: inovelli.VZM31_ATTRIBUTES, clusterName: inovelli.CLUSTER_NAME}],
                supportsLedEffects: true,
                supportsButtonTaps: true,
            }),
            inovelli.m.addCustomCluster(),
            m.identify(),
            inovelli.m.energyReset(),
            m.electricityMeter({
                current: false,
                voltage: false,
                power: {min: 15, max: 3600, change: 1},
                energy: {min: 15, max: 3600, change: 0},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["VZM32-SN"],
        model: "VZM32-SN",
        vendor: "Inovelli",
        description: "mmWave Zigbee Dimmer",
        extend: [
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, "3": 3},
                multiEndpointSkip: ["state", "voltage", "power", "current", "energy", "brightness", "illuminance", "occupancy"],
            }),
            inovelli.m.light(),
            inovelli.m.device({
                attrs: [
                    {attributes: inovelli.VZM32_ATTRIBUTES, clusterName: inovelli.CLUSTER_NAME},
                    {attributes: inovelli.VZM32_MMWAVE_ATTRIBUTES, clusterName: inovelli.MMWAVE_CLUSTER_NAME},
                ],
                supportsLedEffects: true,
                supportsButtonTaps: true,
            }),
            inovelli.m.mmWave(),
            inovelli.m.addCustomCluster(),
            inovelli.m.addCustomMMWaveCluster(),
            m.identify(),
            inovelli.m.energyReset(),
            m.electricityMeter({
                energy: {divisor: 1000},
            }),
            m.illuminance(),
            m.occupancy(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["VZM35-SN"],
        model: "VZM35-SN",
        vendor: "Inovelli",
        description: "Fan controller",
        extend: [
            inovelli.m.fan({endpointId: 1}),
            inovelli.m.device({
                attrs: [{attributes: inovelli.VZM35_ATTRIBUTES, clusterName: inovelli.CLUSTER_NAME}],
                supportsLedEffects: true,
                supportsButtonTaps: true,
            }),
            inovelli.m.addCustomCluster(),
            m.identify(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["VZM36"],
        model: "VZM36",
        vendor: "Inovelli",
        description: "Fan canopy module",
        fromZigbee: [],
        toZigbee: [],
        extend: [
            inovelli.m.light({splitValuesByEndpoint: true}),
            inovelli.m.fan({endpointId: 2, splitValuesByEndpoint: true}),
            inovelli.m.device({
                attrs: [{attributes: inovelli.VZM36_ATTRIBUTES, clusterName: inovelli.CLUSTER_NAME}],
                supportsLedEffects: false,
                splitValuesByEndpoint: true,
                supportsButtonTaps: false,
            }),
            inovelli.m.addCustomCluster(),
            m.identify(),
        ],
        ota: true,
    },
];
