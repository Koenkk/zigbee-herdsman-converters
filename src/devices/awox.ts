import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
// AJOUT de Fz ici pour avoir le type des convertisseurs fromZigbee
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;

// Notre convertisseur personnalisé pour les actions AwoX
const awox_remote_actions: Fz.Converter = {
    // <--- AJOUT DU TYPE ICI
    cluster: "genOnOff", // Cluster principal, mais les actions dépendent du type et du payload
    type: [
        "commandOn",
        "commandOff",
        "raw",
        "commandStepWithOnOff",
        "commandStep",
        "commandEnhancedMoveHue",
        "commandRecall",
        "commandStepColorTemp",
    ],
    convert: (model, msg, publish, options, meta) => {
        // Le type de 'meta' est maintenant implicitement compris grâce à Fz.Converter
        const payload = msg.data;
        let action = null;

        // Prioriser les actions spécifiques par rapport au ON/OFF générique
        if (msg.cluster === "lightingColorCtrl") {
            if (msg.type === "raw") {
                const colorByte = payload.data[4];
                switch (colorByte) {
                    case 0xd6:
                        action = "color_blue";
                        break; // Bleu (214 décimal)
                    case 0xd4:
                        action = "color_green";
                        break; // Vert (212 décimal)
                    case 0xd2:
                        action = "color_yellow";
                        break; // Jaune (210 décimal)
                    case 0xd0:
                        action = "color_red";
                        break; // Rouge (208 décimal)
                }
            } else if (msg.type === "commandEnhancedMoveHue") {
                action = "light_movement"; // Mouvement lumière
            } else if (msg.type === "commandStepColorTemp") {
                if (payload.stepmode === 1) {
                    action = "color_temp_warm"; // Couleur chaude
                } else if (payload.stepmode === 3) {
                    action = "color_temp_cold"; // Couleur froide
                }
            }
        } else if (msg.cluster === "genLevelCtrl") {
            if (msg.type === "commandStepWithOnOff" && payload.stepmode === 0) {
                action = "brightness_step_up"; // Luminosité+
            } else if (msg.type === "commandStep" && payload.stepmode === 1) {
                action = "brightness_step_down"; // Luminosité-
            } else if (msg.type === "raw" && payload.data && payload.data[1] === 0xdf) {
                action = "refresh"; // Bouton "Refresh"
            }
        } else if (msg.cluster === "genScenes") {
            if (msg.type === "commandRecall") {
                if (payload.sceneid === 1) {
                    action = "scene_1"; // Favoris 1
                } else if (payload.sceneid === 2) {
                    action = "scene_2"; // Favoris 2
                }
            }
        }
        // Gérer les actions ON/OFF en dernier, si aucune action plus spécifique n'a été trouvée
        else if (msg.cluster === "genOnOff") {
            if (msg.type === "commandOn") {
                action = "on";
            } else if (msg.type === "commandOff") {
                action = "off";
            }
        }

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
            // @deprecated This converter provides generic step actions. Use `awox_remote_actions` for specific brightness step actions (up/down).
            fz.command_step,
            // @deprecated This converter provides generic move actions. Use `awox_remote_actions` for the 'light_movement' action.
            fz.command_move,
            fz.command_stop,
            // @deprecated This converter provides generic recall actions. Use `awox_remote_actions` for specific scene recall (scene_1, scene_2).
            fz.command_recall,
            // @deprecated This converter provides generic color temperature step actions. Use `awox_remote_actions` for specific color temperature actions (warm/cold).
            fz.command_step_color_temperature,
            fz.legacy_action_rate,
            awox_remote_actions,
        ],
        toZigbee: [],
        exposes: [
            e.action([
                "on",
                "off",
                /** @deprecated Use 'color_blue', 'color_green', 'color_yellow', 'color_red' from 'awox_remote_actions' instead. */
                "red",
                /** @deprecated Use 'refresh' from 'awox_remote_actions' instead. */
                "refresh",
                /** @deprecated Use 'color_blue', 'color_green', 'color_yellow', 'color_red' from 'awox_remote_actions' instead. */
                "refresh_colored",
                /** @deprecated Use 'color_blue' from 'awox_remote_actions' instead. */
                "blue",
                /** @deprecated Use 'color_yellow' from 'awox_remote_actions' instead. */
                "yellow",
                /** @deprecated Use 'color_green' from 'awox_remote_actions' instead. */
                "green",
                /** @deprecated Use 'brightness_step_up' from 'awox_remote_actions' for specific step actions. */
                "brightness_step_up",
                /** @deprecated Use 'brightness_step_down' from 'awox_remote_actions' for specific step actions. */
                "brightness_step_down",
                /** @deprecated This action is often generic. Consider using 'light_movement' from 'awox_remote_actions' for specific behaviors. */
                "brightness_move_up",
                /** @deprecated This action is often generic. Consider using 'light_movement' from 'awox_remote_actions' for specific behaviors. */
                "brightness_move_down",
                "brightness_stop",
                /** @deprecated Use 'scene_1' or 'scene_2' from 'awox_remote_actions' for specific scene recalls. */
                "recall_1",
                /** @deprecated Use 'color_temp_warm' or 'color_temp_cold' from 'awox_remote_actions' for specific color temperature changes. */
                "color_temperature_step_up",
                /** @deprecated Use 'color_temp_warm' or 'color_temp_cold' from 'awox_remote_actions' for specific color temperature changes. */
                "color_temperature_step_down",

                // Nouvelles actions plus précises exposées par awox_remote_actions
                "color_blue",
                "color_green",
                "color_yellow",
                "color_red",
                "color_temp_warm",
                "color_temp_cold",
                "light_movement",
                "refresh",
                "scene_1",
                "scene_2",
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
