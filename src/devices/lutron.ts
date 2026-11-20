import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue} from "../lib/types";
import {addActionGroup, hasAlreadyProcessedMessage, postfixWithEndpointName} from "../lib/utils";

const e = exposes.presets;

const fzLocal = {
    aurora_dimmer: {
        cluster: "genLevelCtrl",
        type: ["commandMoveToLevel", "commandMoveToLevelWithOnOff"],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;

            // device reports 255 -> herdsman treats as invalid -> converter sees NaN -> map to 254
            const level = Number.isNaN(msg.data.level) ? 254 : msg.data.level;

            const payload: KeyValue = {};
            if (msg.data.transtime === 7) {
                const actionName = level === 0 ? "off_press" : "on_press";
                payload.action = postfixWithEndpointName(actionName, msg, model, meta);
            } else {
                payload.action = postfixWithEndpointName("rotate", msg, model, meta);
                payload.brightness = level; // note: device min level is 2, so the range is 2-254
            }
            addActionGroup(payload, msg, model);
            return payload;
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandMoveToLevel", "commandMoveToLevelWithOnOff"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["LZL4BWHL01 Remote"],
        model: "LZL4BWHL01",
        vendor: "Lutron",
        description: "Connected bulb remote control",
        fromZigbee: [fz.command_step, fz.command_step, fz.command_move_to_level, fz.command_stop],
        toZigbee: [],
        exposes: [e.action(["brightness_step_down", "brightness_step_up", "brightness_stop", "brightness_move_to_level"])],
    },
    {
        zigbeeModel: ["Z3-1BRL"],
        model: "Z3-1BRL",
        vendor: "Lutron",
        description: "Aurora smart bulb dimmer",
        fromZigbee: [fzLocal.aurora_dimmer],
        extend: [m.battery()],
        exposes: [e.action(["on_press", "off_press", "rotate"])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genLevelCtrl"]);
        },
        ota: true,
    },
];
