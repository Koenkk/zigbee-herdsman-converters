import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import {setupConfigureForBinding} from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, ModernExtend} from "../lib/types";
import * as utils from "../lib/utils";
import {addActionGroup, hasAlreadyProcessedMessage, postfixWithEndpointName} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    command_on_double: {
        cluster: "genOnOff",
        type: "commandOnWithRecallGlobalScene",
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const payload = {action: postfixWithEndpointName("on_double", msg, model, meta)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    } satisfies Fz.Converter<"genOnOff", undefined, "commandOnWithRecallGlobalScene">,
    command_off_double: {
        cluster: "genOnOff",
        type: "commandOffWithEffect",
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const payload = {action: postfixWithEndpointName("off_double", msg, model, meta)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    } satisfies Fz.Converter<"genOnOff", undefined, "commandOffWithEffect">,
};

const lsModernExtend = {
    groupIdExpose(): ModernExtend {
        const result: ModernExtend = {
            exposes: [e.numeric("action_group", ea.STATE).withDescription("Group where the action was triggered on")],
            isModernExtend: true,
        };

        return result;
    },
    commandsOnOffDouble(): ModernExtend {
        return {
            exposes: [
                e
                    .enum("action", ea.STATE, ["on_double", "off_double"])
                    .withDescription("Triggered action (e.g. a button click)")
                    .withCategory("diagnostic"),
            ],
            fromZigbee: [fzLocal.command_on_double, fzLocal.command_off_double],
            isModernExtend: true,
            configure: [setupConfigureForBinding("genOnOff", "output")],
        };
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Emotion"],
        model: "A319463",
        vendor: "L&S Lighting",
        description: "Home base",
        fromZigbee: m.light({colorTemp: {range: [153, 454]}, color: true}).fromZigbee,
        toZigbee: m.light({colorTemp: {range: [153, 454]}, color: true}).toZigbee,
        configure: m.light({colorTemp: {range: [153, 454]}, color: true}).configure[0],
        exposes: (device, options) => {
            if (utils.isDummyDevice(device)) return [e.light_brightness_colortemp_colorxy([153, 454])];
            return [
                ...device.endpoints
                    .filter((ep) => ep.ID !== 242)
                    .map((ep) => {
                        return e.light_brightness_colortemp_colorxy([153, 454]).withEndpoint(`l${ep.ID}`);
                    }),
            ];
        },
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return Object.fromEntries(device.endpoints.filter((ep) => ep.ID !== 242).map((ep) => [`l${ep.ID}`, ep.ID]));
        },
    },
    {
        zigbeeModel: ["Mec Driver module"],
        model: "756200027",
        vendor: "L&S Lighting",
        description: "Mec Driver module 1-channel Zigbee (12V)",
        whiteLabel: [{model: "756200028", vendor: "L&S Lighting", description: "Mec Driver module 1-channel Zigbee (24V)"}],
        extend: [m.light({colorTemp: {range: [153, 500]}})],
    },
    {
        fingerprint: [
            {modelID: "Mec Driver module", softwareBuildID: "3.12.25-026"},
            {modelID: "Mec Driver module", softwareBuildID: "4.09.03-027"},
        ],
        model: "756200030",
        vendor: "L&S Lighting",
        description: "Mec Driver module 4-channel Zigbee (12V)",
        whiteLabel: [{model: "756200031", vendor: "L&S Lighting", description: "Mec Driver module 4-channel Zigbee (24V)"}],
        extend: [
            m.deviceEndpoints({endpoints: {11: 11, 12: 12, 13: 13, 14: 14}}),
            m.light({endpointNames: ["11", "12", "13", "14"], colorTemp: {range: [153, 500]}}),
        ],
    },
    {
        zigbeeModel: ["SEMOTE"],
        model: "756200643",
        vendor: "L&S Lighting",
        description: "Zigbee remote",
        extend: [
            m.battery(),
            lsModernExtend.groupIdExpose(),
            lsModernExtend.commandsOnOffDouble(),
            m.commandsOnOff({commands: ["on", "off"]}),
            m.commandsLevelCtrl({commands: ["brightness_step_up", "brightness_step_down", "brightness_stop"]}),
            m.commandsColorCtrl({commands: ["color_temperature_step_up", "color_temperature_step_down", "color_temperature_move_stop"]}),
        ],
    },
];
