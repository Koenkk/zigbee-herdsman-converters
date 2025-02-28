import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Power Control Unit"],
        model: "Fire Fence",
        vendor: "Brun Holding",
        description: "Stove guard for safe cooking",
        extend: [
            m.deviceEndpoints({endpoints: {mainSwitch: 1, shortOverride: 2, ota: 10}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["mainSwitch"], description: "Main relay switch"}),
            m.onOff({powerOnBehavior: false, endpointNames: ["shortOverride"], description: "Short override switch"}),
            m.electricityMeter({
                endpointNames: ["mainSwitch"],
                power: {multiplier: 1, divisor: 1},
                voltage: false,
                current: false,
            }),
            m.battery(),
            m.temperature({reporting: undefined}),
        ],
        meta: {multiEndpoint: true},
    },
];
