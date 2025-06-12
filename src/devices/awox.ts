import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;

const awox_remote_actions: Fz.Converter = {
    cluster: "genOnOff", // The main cluster can be generic; 'type' and 'convert' are important here.
    type: ["raw", "commandEnhancedMoveHue", "commandStepColorTemp"], // Limit types to messages we specifically handle
    convert: (model, msg, publish, options, meta) => {
        const payload = msg.data;
        let action = null;

        if (msg.cluster === "lightingColorCtrl") {
            if (msg.type === "raw") {
                const colorByte = payload.data[4];
                switch (colorByte) {
                    case 0xd6:
                        action = "color_blue";
                        break;
                    case 0xd4:
                        action = "color_green";
                        break;
                    case 0xd2:
                        action = "color_yellow";
                        break;
                    case 0xd0:
                        action = "color_red";
                        break;
                }
            } else if (msg.type === "commandEnhancedMoveHue") {
                action = "light_movement";
            }
            // DEVELOPER NOTE: 'commandStepColorTemp' is no longer handled here.
            // It is handled by fz.command_step_color_temperature.
            // NOTE: I've kept the raw for refresh as it was a specific case not handled by another converter.
        } else if (msg.cluster === "genLevelCtrl" && msg.type === "raw" && payload.data && payload.data[1] === 0xdf) {
            action = "refresh"; // Unique "Refresh" button
        }
        // DEVELOPER NOTE: Handling for genOnOff, genLevelCtrl (step/move), and genScenes is removed
        // as it's already covered by standard fz converters.

        if (action) {
            return {action: action};
        }
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ESMLFzm_w6_Dimm"],
        model: "12226",
        vendor: "AwoX",
        description: "Dimmable filament lamp",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["TLSR82xx"],
        model: "33951/33948",
        vendor: "AwoX",
        description: "LED white",
        extend: [m.light()],
        whiteLabel: [{vendor: "EGLO", model: "12229"}],
    },
    {
        zigbeeModel: ["ERCU_Zm"],
        fingerprint: [
            {
                type: "EndDevice",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                powerSource: "Battery",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 2048, inputClusters: [0, 3, 4, 4096], outputClusters: [0, 3, 4, 5, 6, 8, 768, 4096]},
                    {ID: 3, profileID: 4751, deviceID: 2048, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
        ],
        model: "33952",
        vendor: "AwoX",
        description: "AwoX Remote Controller (Enhanced)",
        fromZigbee: [
            fz.command_on,
            // @deprecated This converter provides generic color actions. Use `awox_remote_actions` for specific color buttons (blue, green, yellow, red).
            fz.awox_colors,
            // @deprecated This converter provides a generic refresh. Use `awox_remote_actions` for the dedicated 'refresh' action.
            fz.awox_refresh,
            // @deprecated This converter provides a generic colored refresh. Use `awox_remote_actions` for specific color buttons.
            fz.awox_refreshColored,
            fz.command_off,
            fz.command_step, // Now handled by fz.command_step
            fz.command_move, // Now handled by fz.command_move
            fz.command_stop,
            fz.command_recall, // Now handled by fz.command_recall
            fz.command_step_color_temperature, // Now handled by fz.command_step_color_temperature
            awox_remote_actions, // Always at the end to prioritize specific actions.
        ],
        toZigbee: [],
        exposes: [
            e.action([
                "on",
                "off",
                /** @deprecated Use 'color_blue', 'color_green', 'color_yellow', 'color_red' from 'awox_remote_actions' instead. */
                "red", // Deprecated if awox_colors is less precise than the new specific actions.
                /** @deprecated Use 'refresh' from 'awox_remote_actions' instead. */
                "refresh", // Deprecated if fz.awox_refresh is less precise than the new refresh action.
                /** @deprecated Use 'color_blue', 'color_green', 'color_yellow', 'color_red' from 'awox_remote_actions' instead. */
                "refresh_colored", // Deprecated if fz.awox_refreshColored is less precise.
                /** @deprecated Use 'color_blue' from 'awox_remote_actions' instead. */
                "blue",
                /** @deprecated Use 'color_yellow' from 'awox_remote_actions' instead. */
                "yellow",
                /** @deprecated Use 'color_green' from 'awox_remote_actions' instead. */
                "green",
                // The actions below are no longer deprecated by awox_remote_actions as it no longer directly handles them.
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "recall_1",
                "color_temperature_step_up",
                "color_temperature_step_down",

                // New, more precise actions exposed by awox_remote_actions
                "color_blue",
                "color_green",
                "color_yellow",
                "color_red",
                // The actions below are no longer in awox_remote_actions; they are handled by standard converters.
                // "color_temp_warm",
                // "color_temp_cold",
                "light_movement", // This specific action is kept as it's handled by awox_remote_actions
                "refresh", // This specific action is kept as it's handled by awox_remote_actions
                "scene_1", // These actions are handled by fz.command_recall, not awox_remote_actions
                "scene_2", // Same
            ]),
        ],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361, 4], outputClusters: [65360, 65361]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [6, 25]},
                    {ID: 3, profileID: 49152, deviceID: 258, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
        ],
        model: "33943/33944/33946",
        vendor: "AwoX",
        description: "LED RGB & brightness",
        extend: [m.light({colorTemp: {range: [153, 370]}, color: {modes: ["xy", "hs"]}})],
    },
    {
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                    {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                    {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                    {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599, 10], outputClusters: [6]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                    {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361, 4], outputClusters: [65360, 65361]},
                ],
            },
        ],
        model: "33957",
        vendor: "AwoX",
        description: "LED light with color temperature",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
        whiteLabel: [{vendor: "EGLO", model: "12239"}],
    },
    {
        zigbeeModel: ["EGLO_ZM_TW"],
        fingerprint: [
            {
                type: "Router",
                manufacturerName: "AwoX",
                modelID: "TLSR82xx",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [6, 25]},
                    {ID: 3, profileID: 49152, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
                ],
            },
        ],
        model: "33955",
        vendor: "AwoX",
        description: "LED light with color temperature",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
        whiteLabel: [
            {vendor: "EGLO", model: "900316"},
            {vendor: "EGLO", model: "900317"},
            {vendor: "EGLO", model: "900053"},
        ],
    },
    {
        zigbeeModel: ["EPIR_Zm"],
        model: "EPIR_Zm",
        vendor: "AwoX",
        description: "Connect-Z motion (PIR) sensor",
        extend: [m.battery(), m.occupancy(), m.commandsOnOff(), m.commandsLevelCtrl()],
        whiteLabel: [{vendor: "EGLO", model: "99106"}],
    },
];
