import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Power Control Unit"],
        model: "Fire Fence",
        vendor: "Brun Holding",
        description: "Stove guard for safe cooking",
        extend: [
            m.deviceEndpoints({endpoints: {main_switch: 1, short_override: 2}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["main_switch"], description: "Main relay switch"}),
            m.onOff({powerOnBehavior: false, endpointNames: ["short_override"], description: "Short override switch"}),
            m.electricityMeter({
                endpointNames: ["main_switch"],
                power: {multiplier: 1, divisor: 1},
                voltage: false,
                current: false,
            }),
            m.battery(),
            m.temperature({reporting: undefined}),
        ],
    },
];
