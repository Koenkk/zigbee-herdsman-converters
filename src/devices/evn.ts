import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZBHS4RGBW"],
        model: "ZBHS4RGBW",
        vendor: "EVN",
        description: "Zigbee 4 channel RGBW remote control",
        fromZigbee: [
            fz.battery,
            fz.command_move_to_color,
            fz.command_move_to_color_temp,
            fz.command_move_hue,
            fz.command_step,
            fz.command_stop,
            fz.command_move,
            fz.command_recall,
            fz.command_on,
            fz.command_off,
        ],
        exposes: [
            e.battery(),
            e.action([
                "color_move",
                "color_temperature_move",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "hue_move",
                "hue_stop",
                "recall_*",
                "on",
                "off",
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },
    {
        zigbeeModel: ["ZB24100VS"],
        model: "ZB24100VS",
        vendor: "EVN",
        description: "Zigbee multicolor controller with power supply",
        extend: [m.light({colorTemp: {range: [160, 450]}, color: {modes: ["xy", "hs"]}})],
    },
    {
        zigbeeModel: ["ZBPD23400"],
        model: "ZBPD23400",
        vendor: "EVN",
        description: "Zigbee AC dimmer",
        extend: [m.light({configureReporting: true})],
    },
];
