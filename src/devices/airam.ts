import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZBT-DimmableLight"],
        model: "4713407",
        vendor: "Airam",
        description: "LED OP A60 ZB 9W/827 E27",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["ZBT-Remote-EU-DIMV1A2"],
        model: "AIRAM-CTR.U",
        vendor: "Airam",
        description: "CTR.U remote",
        exposes: [
            e.action([
                "on",
                "off",
                "brightness_down_click",
                "brightness_up_click",
                "brightness_down_hold",
                "brightness_up_hold",
                "brightness_down_release",
                "brightness_up_release",
            ]),
        ],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall],
        toZigbee: [],
    },
    {
        zigbeeModel: ["ZBT-Remote-EU-DIMV2A2"],
        model: "CTR.UBX",
        vendor: "Airam",
        description: "CTR.U remote BX",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall],
        exposes: [
            e.action([
                "on",
                "off",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "recall_*",
            ]),
        ],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genOnOff", "genLevelCtrl", "genScenes"]);
        },
    },
    {
        zigbeeModel: ["Dimmable-GU10-4713404"],
        model: "4713406",
        vendor: "Airam",
        description: "GU10 spot 4.8W 2700K 385lm",
        extend: [m.light()],
    },
];
