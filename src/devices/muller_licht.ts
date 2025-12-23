import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Zh} from "../lib/types";

const e = exposes.presets;

function mullerLichtLight(args: m.LightArgs) {
    const result = m.light(args);
    result.toZigbee.push(tz.tint_scene);
    return result;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["tint-Spotlights"],
        model: "404051",
        vendor: "Müller Licht",
        description: "Tint LED-Spotlights, white+color 3x (1800-6500K+RGB) 19W",
        extend: [mullerLichtLight({colorTemp: {range: [153, 556]}, color: true})],
    },
    {
        zigbeeModel: ["tint-ExtendedColor"],
        model: "404036/45327/45317/45328",
        vendor: "Müller Licht",
        description: "Tint LED white+color",
        extend: [mullerLichtLight({colorTemp: {range: [153, 556]}, color: true})],
    },
    {
        zigbeeModel: ["Retro Bulb Gold XXL white+ambiance"],
        model: "404065",
        vendor: "Müller Licht",
        description: "tint LED-Globe Retro Gold XXL E27",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}})],
    },
    {
        zigbeeModel: ["ZBT-DIMLight-A4700001"],
        model: "404023",
        vendor: "Müller Licht",
        description: "LED bulb E27 470 lumen, dimmable, clear",
        extend: [mullerLichtLight({})],
    },
    {
        zigbeeModel: ["Smart Socket"],
        model: "404017",
        vendor: "Müller Licht",
        description: "Smart power strip",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["tint smart power strip"],
        model: "45391",
        vendor: "Müller Licht",
        description: "Smart power strip",
        extend: [m.onOff()],
    },
    {
        // Identify through fingerprint as modelID is the same as Airam 4713407
        fingerprint: [{modelID: "ZBT-DimmableLight", manufacturerName: "MLI"}],
        model: "404001",
        vendor: "Müller Licht",
        description: "LED bulb E27 806 lumen, dimmable",
        extend: [mullerLichtLight({})],
    },
    {
        zigbeeModel: ["ZBT-ExtendedColor", "Bulb white+color"],
        model: "404000/404005/404012/404019",
        vendor: "Müller Licht",
        description: "Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, color, opal white",
        extend: [mullerLichtLight({colorTemp: {range: [153, 556]}, color: {modes: ["xy", "hs"]}})],
        // GU10 bulb does not support supportsEnhancedHue,
        // we can identify these based on the presence of haDiagnostic input cluster
        meta: {supportsEnhancedHue: (entity: Zh.Endpoint) => !entity.getDevice().getEndpoint(1).inputClusters.includes(2821)},
    },
    {
        zigbeeModel: ["ZBT-ColorTemperature"],
        model: "404006/404008/404004",
        vendor: "Müller Licht",
        description: "Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, opal white",
        extend: [mullerLichtLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["ZBT-CCTLight-GU100000"],
        model: "404024",
        vendor: "Müller Licht",
        description: "Tint retro LED bulb GU10, dimmable",
        extend: [mullerLichtLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["RGBW Lighting"],
        model: "44435",
        vendor: "Müller Licht",
        description: "Tint LED Stripe, color, opal white",
        extend: [mullerLichtLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        fingerprint: [{manufacturerName: "MLI", modelID: "LED Strip"}],
        model: "404127",
        vendor: "Müller Licht",
        description: "Tint LED-Strip white+color, 3 m / 6W RGB",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ["RGB-CCT"],
        model: "404028/44435",
        vendor: "Müller Licht",
        description: "Tint LED Panel, color, opal white",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        fingerprint: tuya.fingerprint("TS0505B", ["_TZ3210_mntza0sw", "_TZ3210_r0vzq1oj"]),
        model: "404062",
        vendor: "Müller Licht",
        description: "Kea RGB+CCT",
        toZigbee: [tz.tint_scene],
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: true})],
    },
    {
        fingerprint: [{manufacturerName: "_TZ3000_bdbb0fon"}],
        zigbeeModel: ["ZBT-Remote-ALL-RGBW", "TS1001"],
        model: "MLI-404011/MLI-404049",
        description: "Tint remote control",
        vendor: "Müller Licht",
        fromZigbee: [
            fz.command_on,
            fz.command_off,
            fz.command_toggle,
            fz.command_step,
            fz.tint404011_move_to_color_temp,
            fz.command_move_to_color,
            fz.tint_scene,
            fz.command_stop,
            fz.command_move,
        ],
        exposes: [
            e.action([
                "on",
                "off",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "color_temperature_move",
                "color_move",
                "scene_1",
                "scene_2",
                "scene_3",
                "scene_4",
                "scene_5",
                "scene_6",
            ]),
            e.action_group(),
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ["ZBT-DIMController-D0800"],
        model: "404002",
        description: "Tint dim remote control",
        vendor: "Müller Licht",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall, fz.command_store],
        exposes: [
            e.action([
                "on",
                "off",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "recall_1",
                "store_1",
            ]),
        ],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genOnOff", "genLevelCtrl", "genScenes"]);
        },
    },
    {
        zigbeeModel: ["tint Smart Switch"],
        model: "404021",
        description: "Tint smart switch",
        vendor: "Müller Licht",
        extend: [m.onOff()],
    },
    {
        fingerprint: [{modelID: "Remote Control", manufacturerName: "MLI"}],
        zigbeeModel: ["tint-Remote-white"],
        model: "404022/404049C",
        description: "Tint dim remote control",
        vendor: "Müller Licht",
        fromZigbee: [
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_move,
            fz.command_stop,
            fz.command_move_to_color_temp,
            fz.command_move_to_color,
            fz.tint_scene,
        ],
        exposes: [
            e.action([
                "on",
                "off",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "color_temperature_move",
                "color_move",
                "scene_1",
                "scene_2",
                "scene_3",
                "scene_4",
                "scene_5",
                "scene_6",
                "scene_7",
                "scene_8",
                "scene_9",
                "scene_10",
            ]),
            e.action_group(),
        ],
        extend: [m.forcePowerSource({powerSource: "Battery"})],
        whiteLabel: [
            {
                vendor: "Müller Licht",
                model: "404049D",
                description: "Tint dim remote control",
                fingerprint: [{modelID: "Remote Control", manufacturerName: "MLI"}],
            },
        ],
    },
    {
        zigbeeModel: ["tint-ColorTemperature", "tint-ColorTemperature2"],
        model: "404037/404038",
        vendor: "Müller Licht",
        description: "CCT LED-bulb",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}})],
    },
    {
        fingerprint: [
            {
                // Identify through fingerprint as modelID is the same as Sunricher ZG192910-4
                type: "Router",
                manufacturerID: 4635,
                manufacturerName: "MLI",
                modelID: "CCT Lighting",
                powerSource: "Mains (single phase)",
                endpoints: [
                    {ID: 1, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768, 2821, 4096], outputClusters: [25]},
                    {ID: 242, profileID: 41440, deviceID: 102, inputClusters: [33], outputClusters: [33]},
                ],
            },
        ],
        model: "404031",
        vendor: "Müller Licht",
        description: "Tint Armaro",
        extend: [mullerLichtLight({colorTemp: {range: undefined}})],
    },
    {
        fingerprint: [{manufacturerName: "MLI", modelID: "Bulb white"}],
        model: "45727",
        vendor: "Müller Licht",
        description: "Tint Amela 42cm, white+ambiance (1800-6500K)",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}})],
    },
    {
        fingerprint: [{manufacturerName: "MLI", modelID: "Candle white+color"}],
        model: "45730",
        vendor: "Müller Licht",
        description: "Tint candle E14 white+color",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        fingerprint: [{manufacturerName: "MLI", modelID: "Bulb white+color"}],
        model: "45728",
        vendor: "Müller Licht",
        description: "Tint bulb E27 white+color",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        fingerprint: [{manufacturerName: "MLI", modelID: "GU10 white+color"}],
        model: "45723",
        vendor: "Müller Licht",
        description: "Tint spotlight GU10 white+color",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
    {
        fingerprint: [{manufacturerName: "MLI", modelID: "Ceiling light"}],
        model: "404122/404123",
        vendor: "Müller Licht",
        description: "Tint smart ceiling light Cano black/silver, white+color (1800-6500K+RGB), 21w",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
    {
        fingerprint: [{manufacturerName: "MLI", modelID: "Garden light"}],
        model: "MDGARD401",
        vendor: "Müller Licht",
        description: "tint Flores Gen2 garden light",
        extend: [mullerLichtLight({colorTemp: {range: [153, 555]}, color: {modes: ["xy", "hs"]}, effect: false, powerOnBehavior: false})],
    },
];
