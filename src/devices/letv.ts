import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["qlwz.letv8key.10"],
        model: "LeTV.8KEY",
        vendor: "LeTV",
        description: "8key switch",
        fromZigbee: [fz.qlwz_letv8key_switch],
        exposes: [
            e.action([
                "hold_up",
                "single_up",
                "double_up",
                "triple_up",
                "hold_down",
                "single_down",
                "double_down",
                "triple_down",
                "hold_left",
                "single_left",
                "double_left",
                "triple_left",
                "hold_right",
                "single_right",
                "double_right",
                "triple_right",
                "hold_center",
                "single_center",
                "double_center",
                "triple_center",
                "hold_back",
                "single_back",
                "double_back",
                "triple_back",
                "hold_play",
                "single_play",
                "double_play",
                "triple_play",
                "hold_voice",
                "single_voice",
                "double_voice",
                "triple_voice",
            ]),
        ],
        toZigbee: [],
    },
];
