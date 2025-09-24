import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    custom_command_move_to_level: {
        cluster: "genLevelCtrl",
        type: ["commandMoveToLevel", "commandMoveToLevelWithOnOff"],
        options: [exposes.options.simulated_brightness()],
        convert: (model, msg, publish, options, meta) => {
            // Map null to 255
            // https://github.com/Koenkk/zigbee2mqtt/issues/28450
            const newMsg = {...msg, data: {...msg.data, level: Number.isNaN(msg.data.level) ? 255 : msg.data.level}};
            return fz.command_move_to_level.convert(model, newMsg, publish, options, meta);
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandMoveToLevel", "commandMoveToLevelWithOnOff"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["LZL4BWHL01 Remote"],
        model: "LZL4BWHL01",
        vendor: "Lutron",
        description: "Connected bulb remote control",
        fromZigbee: [fz.command_step, fz.command_step, fzLocal.custom_command_move_to_level, fz.command_stop],
        toZigbee: [],
        exposes: [e.action(["brightness_step_down", "brightness_step_up", "brightness_stop", "brightness_move_to_level"])],
    },
    {
        zigbeeModel: ["Z3-1BRL"],
        model: "Z3-1BRL",
        vendor: "Lutron",
        description: "Aurora smart bulb dimmer",
        fromZigbee: [fzLocal.custom_command_move_to_level],
        extend: [m.battery()],
        exposes: [e.action(["brightness"]), e.numeric("brightness", ea.STATE)],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genLevelCtrl"]);
        },
        ota: true,
    },
];
