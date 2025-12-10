import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["EZMB-RGB-TW-CLB"],
        model: "300686",
        vendor: "EGLO",
        description: "MASSIGNANO-Z ceiling light",
        extend: [
            m.light({colorTemp: {range: [153, 370]}, color: {modes: ["xy", "hs"], enhancedHue: true}}),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsColorCtrl(),
        ],
    },
    {
        zigbeeModel: ["EBF_RGB_Zm_CLP"],
        model: "900091",
        vendor: "EGLO",
        description: "ROVITO-Z ceiling light",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ESMLFzm_w6_TW"],
        model: "12242",
        vendor: "EGLO",
        description: "ST64 adjustable white filament bulb",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["EGLO_ZM_RGB_TW"],
        model: "900024/12253",
        vendor: "EGLO",
        description: "RGB light",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: {modes: ["xy", "hs"]}})],
    },
    {
        zigbeeModel: ["EGLO_ZM_TW_CLP"],
        model: "98847",
        vendor: "EGLO",
        description: "FUEVA-Z ceiling light IP44",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["ERCU_3groups_Zm"],
        model: "99099",
        vendor: "EGLO",
        description: "3 groups remote controller",
        fromZigbee: [
            fz.command_on,
            fz.awox_colors,
            fz.awox_refresh,
            fz.awox_refreshColored,
            fz.command_off,
            fz.command_step,
            fz.command_move,
            fz.command_move_to_level,
            fz.command_move_to_color_temp,
            fz.command_stop,
            fz.command_recall,
            fz.command_step_color_temperature,
        ],
        toZigbee: [],
        exposes: [
            e.action([
                "on",
                "off",
                "red",
                "refresh",
                "refresh_colored",
                "blue",
                "yellow",
                "green",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "recall_1",
                "color_temperature_step_up",
                "color_temperature_step_down",
            ]),
            e.numeric("action_group", ea.STATE),
        ],
    },
    {
        fingerprint: [
            {
                type: "EndDevice",
                manufacturerID: 4417,
                modelID: "TLSR82xx",
                endpoints: [{ID: 1, profileID: 260, deviceID: 263, inputClusters: [0, 3, 4, 4096], outputClusters: [0, 3, 4, 5, 6, 8, 768, 4096]}],
            },
        ],
        model: "99106",
        vendor: "EGLO",
        description: "Connect-Z motion (PIR) sensor",
        fromZigbee: [fz.command_on, fz.command_move_to_level, fz.command_move_to_color_temp],
        toZigbee: [],
        exposes: [e.action(["on", "brightness_move_to_level", "color_temperature_move"])],
    },
];
