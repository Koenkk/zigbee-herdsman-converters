import * as fz from "../converters/fromZigbee";
import * as awox from "../devices/awox";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const setActionGroup = (result: KeyValueAny | Promise<void> | void | undefined, groupID: number) => {
    if (result && !(result instanceof Promise)) {
        result.action_group = groupID - 32777;
    }
    return result;
};

const fzLocal = {
    eglo99099_command_on: {
        cluster: "genOnOff",
        type: ["commandOn"] as const,
        // Filters out spurious 'on' events that the remote sends after other actions.
        // The remote sends an 'on' command after many actions (color changes, color temperature
        // steps, refresh buttons) which would otherwise trigger unintended light-on behavior.
        convert: (model, msg, publish, options, meta) => {
            const lastNonOn = globalStore.getValue(msg.endpoint, "last_non_on_action", 0) as number;
            if (Date.now() - lastNonOn < 500) return;
            return {action: "on", action_group: msg.groupID - 32777};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn"]>,
    eglo99099_awox_colors: {
        cluster: "lightingColorCtrl",
        type: ["raw"] as const,
        // Wraps awox_colors to suppress the spurious 'on' event that follows color button presses.
        convert: (model, msg, publish, options, meta) => {
            const result = awox.fzLocal.awox_colors.convert(model, msg, publish, options, meta);
            if (result && !(result instanceof Promise)) {
                globalStore.putValue(msg.endpoint, "last_non_on_action", Date.now());
            }
            return setActionGroup(result, msg.groupID);
        },
    } satisfies Fz.Converter<"lightingColorCtrl", undefined, ["raw"]>,
    eglo99099_awox_refresh: {
        cluster: "genLevelCtrl",
        type: ["raw"] as const,
        // Wraps awox_refresh to suppress the spurious 'on' event that follows refresh button
        // presses, and corrects the action_group value.
        convert: (model, msg, publish, options, meta) => {
            const buffer = msg.data as Buffer;
            const isRefresh = buffer[0] === 17 && buffer[2] === 16 && (buffer[3] === 1 || buffer[3] === 0) && buffer[4] === 1;
            const isRefreshLong = buffer[0] === 17 && buffer[2] === 16 && buffer[3] === 1 && buffer[4] === 2;
            if (isRefresh) {
                globalStore.putValue(msg.endpoint, "last_non_on_action", Date.now());
                return {action: "refresh", action_group: msg.groupID - 32777};
            }
            if (isRefreshLong) {
                globalStore.putValue(msg.endpoint, "last_non_on_action", Date.now());
                return {action: "refresh_long", action_group: msg.groupID - 32777};
            }
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["raw"]>,
    eglo99099_awox_refresh_colored: {
        cluster: "lightingColorCtrl",
        type: ["commandMoveHue"] as const,
        // Wraps awox_refreshColored to suppress the spurious 'on' event that follows.
        convert: (model, msg, publish, options, meta) => {
            const result = awox.fzLocal.awox_refreshColored.convert(model, msg, publish, options, meta);
            if (result && !(result instanceof Promise)) {
                globalStore.putValue(msg.endpoint, "last_non_on_action", Date.now());
            }
            return setActionGroup(result, msg.groupID);
        },
    } satisfies Fz.Converter<"lightingColorCtrl", undefined, ["commandMoveHue"]>,
    eglo99099_command_off: {
        cluster: "genOnOff",
        type: ["commandOff"] as const,
        convert: (model, msg, publish, options, meta) => {
            return setActionGroup(fz.command_off.convert(model, msg, publish, options, meta), msg.groupID);
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOff"]>,
    eglo99099_command_step: {
        cluster: "genLevelCtrl",
        type: ["commandStep", "commandStepWithOnOff"] as const,
        convert: (model, msg, publish, options, meta) => {
            return setActionGroup(fz.command_step.convert(model, msg, publish, options, meta), msg.groupID);
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandStep", "commandStepWithOnOff"]>,
    eglo99099_command_move_to_level: {
        cluster: "genLevelCtrl",
        type: ["commandMoveToLevel", "commandMoveToLevelWithOnOff"] as const,
        // Adds brightness_move_to_level action (triggered by long press on brightness buttons).
        convert: (model, msg, publish, options, meta) => {
            return setActionGroup(fz.command_move_to_level.convert(model, msg, publish, options, meta), msg.groupID);
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandMoveToLevel", "commandMoveToLevelWithOnOff"]>,
    eglo99099_command_move_to_color_temp: {
        cluster: "lightingColorCtrl",
        type: ["commandMoveToColorTemp"] as const,
        // Suppresses spurious 'on' event that follows color temperature move actions.
        convert: (model, msg, publish, options, meta) => {
            globalStore.putValue(msg.endpoint, "last_non_on_action", Date.now());
            return setActionGroup(fz.command_move_to_color_temp.convert(model, msg, publish, options, meta), msg.groupID);
        },
    } satisfies Fz.Converter<"lightingColorCtrl", undefined, ["commandMoveToColorTemp"]>,
    eglo99099_command_recall: {
        cluster: "genScenes",
        type: ["commandRecall"] as const,
        convert: (model, msg, publish, options, meta) => {
            return setActionGroup(fz.command_recall.convert(model, msg, publish, options, meta), msg.groupID);
        },
    } satisfies Fz.Converter<"genScenes", undefined, ["commandRecall"]>,
    eglo99099_color_temp_step: {
        cluster: "lightingColorCtrl",
        type: ["commandStepColorTemp"] as const,
        // Fixes inverted color temperature step direction: the remote sends stepmode=1 for
        // decrease and stepmode=3 for increase, which is the opposite of the ZCL specification.
        // Also suppresses the spurious 'on' event that follows.
        convert: (model, msg, publish, options, meta) => {
            globalStore.putValue(msg.endpoint, "last_non_on_action", Date.now());
            const direction = msg.data.stepmode === 1 ? "down" : "up";
            return {
                action: `color_temperature_step_${direction}`,
                action_color_temperature_delta: msg.data.stepsize,
                action_group: msg.groupID - 32777,
            };
        },
    } satisfies Fz.Converter<"lightingColorCtrl", undefined, ["commandStepColorTemp"]>,
    eglo99099_color_long_press: {
        cluster: "lightingColorCtrl",
        type: ["commandMoveToHueAndSaturation"] as const,
        // Long press on color buttons sends commandMoveToHueAndSaturation instead of the
        // raw commandMoveHue used for short press. Hue values match the short press colors.
        convert: (model, msg, publish, options, meta) => {
            globalStore.putValue(msg.endpoint, "last_non_on_action", Date.now());
            const hue = msg.data.hue as number;
            let color: string | null = null;
            if ([254, 255].includes(hue)) color = "red";
            else if ([84, 85].includes(hue)) color = "green";
            else if ([169, 170].includes(hue)) color = "blue";
            if (color) return {action: `${color}_long`, action_group: msg.groupID - 32777};
        },
    } satisfies Fz.Converter<"lightingColorCtrl", undefined, ["commandMoveToHueAndSaturation"]>,
    eglo99099_refresh_colored_button: {
        cluster: "lightingColorCtrl",
        type: ["commandEnhancedMoveHue"] as const,
        // The refresh_colored button sends commandEnhancedMoveHue.
        // movemode=1 is short press, movemode=3 is long press.
        convert: (model, msg, publish, options, meta) => {
            globalStore.putValue(msg.endpoint, "last_non_on_action", Date.now());
            const action = msg.data.movemode === 1 ? "refresh_colored" : "refresh_colored_long";
            return {action, action_group: msg.groupID - 32777};
        },
    } satisfies Fz.Converter<"lightingColorCtrl", undefined, ["commandEnhancedMoveHue"]>,
    eglo99099_recall_long_press: {
        cluster: "genScenes",
        type: ["commandStore"] as const,
        // Long press on recall buttons sends commandStore with sceneid 1 or 2.
        // No spurious 'on' event follows these actions.
        convert: (model, msg, publish, options, meta) => {
            const sceneId = msg.data.sceneid as number;
            if ([1, 2].includes(sceneId)) {
                return {action: `recall_${sceneId}_long`, action_group: msg.groupID - 32777};
            }
        },
    } satisfies Fz.Converter<"genScenes", undefined, ["commandStore"]>,
};

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
        zigbeeModel: ["EBF-RGB-ZMB-CLB"],
        model: "901471",
        vendor: "EGLO",
        description: "ROVITO-Z ceiling light",
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 3: 3}}),
            m.light({
                colorTemp: {range: [153, 370]},
                color: {modes: ["xy", "hs"], enhancedHue: true},
            }),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsColorCtrl(),
        ],
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
            fzLocal.eglo99099_command_on,
            fzLocal.eglo99099_awox_colors,
            fzLocal.eglo99099_awox_refresh,
            fzLocal.eglo99099_awox_refresh_colored,
            fzLocal.eglo99099_command_off,
            fzLocal.eglo99099_command_step,
            fzLocal.eglo99099_command_move_to_level,
            fzLocal.eglo99099_command_move_to_color_temp,
            fzLocal.eglo99099_command_recall,
            fzLocal.eglo99099_color_temp_step,
            fzLocal.eglo99099_color_long_press,
            fzLocal.eglo99099_refresh_colored_button,
            fzLocal.eglo99099_recall_long_press,
        ],
        toZigbee: [],
        exposes: [
            e.action([
                "on",
                "off",
                "red",
                "red_long",
                "refresh",
                "refresh_long",
                "refresh_colored",
                "refresh_colored_long",
                "blue",
                "blue_long",
                "green",
                "green_long",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_to_level",
                "color_temperature_step_up",
                "color_temperature_step_down",
                "color_temperature_move",
                "recall_1",
                "recall_1_long",
                "recall_2",
                "recall_2_long",
            ]),
            e.numeric("action_group", ea.STATE),
            e.numeric("action_level", ea.STATE),
            e.numeric("action_color_temperature", ea.STATE),
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
