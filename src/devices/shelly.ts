import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1", "1 Mini"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        fingerprint: [{modelID: "1", manufacturerName: "Shelly"}],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 Gen 4",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["Mini1PM", "1PM Mini"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter({producedEnergy: true, acFrequency: true})],
    },
    {
        zigbeeModel: ["1PM"],
        model: "S4SW-001P16EU",
        vendor: "Shelly",
        description: "1PM Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter({producedEnergy: true, acFrequency: true})],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 514, inputClusters: [0, 3, 4, 5, 258], outputClusters: []},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "S4SW-002P16EU-COVER",
        vendor: "Shelly",
        description: "2PM Gen4 (Cover mode)",
        extend: [m.windowCovering({controls: ["lift", "tilt"]})],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "Shelly",
                modelID: "2PM",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 266, inputClusters: [0, 3, 4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 2, profileID: 260, deviceID: 266, inputClusters: [4, 5, 6, 2820, 1794], outputClusters: []},
                    {ID: 239, profileID: 49153, deviceID: 8193, inputClusters: [64513, 64514], outputClusters: []},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: "S4SW-002P16EU-SWITCH",
        vendor: "Shelly",
        description: "2PM Gen4 (Switch mode)",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["l1", "l2"]}),
            m.electricityMeter({producedEnergy: true, acFrequency: true, endpointNames: ["l1", "l2"]}),
        ],
    },
    {
        zigbeeModel: ["Power Strip"],
        model: "S4PL-00416EU",
        vendor: "Shelly",
        description: "Power strip 4 Gen4",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3", "4"]}),
            m.electricityMeter(),
        ],
    },
    {
        zigbeeModel: ["Flood"],
        model: "S4SN-0071A",
        vendor: "Shelly",
        description: "Flood Gen 4",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "tamper", "battery_low"]})],
        meta: {},
    },
];
