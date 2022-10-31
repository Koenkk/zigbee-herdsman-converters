const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['tint-ExtendedColor'],
        model: '404036/45327/45317',
        vendor: 'Müller Licht',
        description: 'Tint LED white+color',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 556]}),
        toZigbee: extend.light_onoff_brightness_colortemp_color().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['Retro Bulb Gold XXL white+ambiance'],
        model: '404065',
        vendor: 'Müller Licht',
        description: 'tint LED-Globe Retro Gold XXL E27',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        toZigbee: extend.light_onoff_brightness_colortemp().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-DIMLight-A4700001'],
        model: '404023',
        vendor: 'Müller Licht',
        description: 'LED bulb E27 470 lumen, dimmable, clear',
        extend: extend.light_onoff_brightness(),
        toZigbee: extend.light_onoff_brightness().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['Smart Socket'],
        model: '404017',
        vendor: 'Müller Licht',
        description: 'Smart power strip',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11) || device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['tint smart power strip'],
        model: '45391',
        vendor: 'Müller Licht',
        description: 'Smart power strip',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        // Identify through fingerprint as modelID is the same as Airam 4713407
        fingerprint: [{modelID: 'ZBT-DimmableLight', manufacturerName: 'MLI'}],
        model: '404001',
        vendor: 'Müller Licht',
        description: 'LED bulb E27 806 lumen, dimmable',
        extend: extend.light_onoff_brightness(),
        toZigbee: extend.light_onoff_brightness().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-ExtendedColor'],
        model: '404000/404005/404012/404019',
        vendor: 'Müller Licht',
        description: 'Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, color, opal white',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 556], supportsHS: true}),
        toZigbee: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 556], supportsHS: true}).toZigbee
            .concat([tz.tint_scene]),
        // GU10 bulb does not support enhancedHue,
        // we can identify these based on the presense of haDiagnostic input cluster
        meta: {enhancedHue: (entity) => !entity.getDevice().getEndpoint(1).inputClusters.includes(2821)},
    },
    {
        zigbeeModel: ['ZBT-ColorTemperature'],
        model: '404006/404008/404004',
        vendor: 'Müller Licht',
        description: 'Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, opal white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        toZigbee: extend.light_onoff_brightness_colortemp().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-CCTLight-GU100000'],
        model: '404024',
        vendor: 'Müller Licht',
        description: 'Tint retro LED bulb GU10, dimmable',
        extend: extend.light_onoff_brightness_colortemp(),
        toZigbee: extend.light_onoff_brightness_colortemp().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['RGBW Lighting'],
        model: '44435',
        vendor: 'Müller Licht',
        description: 'Tint LED Stripe, color, opal white',
        extend: extend.light_onoff_brightness_colortemp_color(),
        toZigbee: extend.light_onoff_brightness_colortemp_color().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['RGB-CCT'],
        model: '404028',
        vendor: 'Müller Licht',
        description: 'Tint LED Panel, color, opal white',
        extend: extend.light_onoff_brightness_colortemp_color(),
        toZigbee: extend.light_onoff_brightness_colortemp_color().toZigbee.concat([tz.tint_scene]),
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_mntza0sw'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_r0vzq1oj'}],
        model: '404062',
        vendor: 'Müller Licht',
        description: 'Kea RGB+CCT',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        toZigbee: extend.light_onoff_brightness_colortemp_color().toZigbee.concat([tz.tint_scene]),
    },
    {
        fingerprint: [{manufacturerName: '_TZ3000_bdbb0fon'}],
        zigbeeModel: ['ZBT-Remote-ALL-RGBW', 'TS1001'],
        model: 'MLI-404011/MLI-404049',
        description: 'Tint remote control',
        vendor: 'Müller Licht',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_toggle, fz.legacy.tint404011_brightness_updown_click,
            fz.legacy.tint404011_move_to_color_temp, fz.legacy.tint404011_move_to_color, fz.tint_scene,
            fz.legacy.tint404011_brightness_updown_release, fz.legacy.tint404011_brightness_updown_hold],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'color_temperature_move', 'color_move', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ZBT-DIMController-D0800'],
        model: '404002',
        description: 'Tint dim remote control',
        vendor: 'Müller Licht',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'recall_1'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genOnOff', 'genLevelCtrl', 'genScenes']);
        },
    },
    {
        zigbeeModel: ['tint Smart Switch'],
        model: '404021',
        description: 'Tint smart switch',
        vendor: 'Müller Licht',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['tint-Remote-white'],
        model: '404022/404049C',
        description: 'Tint dim remote control',
        vendor: 'Müller Licht',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_move_to_color_temp,
            fz.command_move_to_color, fz.tint_scene],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'color_temperature_move', 'color_move', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['tint-ColorTemperature', 'tint-ColorTemperature2'],
        model: '404037/404038',
        vendor: 'Müller Licht',
        description: 'CCT LED-bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        toZigbee: extend.light_onoff_brightness_colortemp().toZigbee.concat([tz.tint_scene]),
    },
    {
        fingerprint: [{
            // Identify through fingerprint as modelID is the same as Sunricher ZG192910-4
            type: 'Router', manufacturerID: 4635, manufacturerName: 'MLI', modelID: 'CCT Lighting',
            powerSource: 'Mains (single phase)', endpoints: [
                {ID: 1, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768, 2821, 4096], outputClusters: [25]},
                {ID: 242, profileID: 41440, deviceID: 102, inputClusters: [33], outputClusters: [33]},
            ],
        }],
        model: '404031',
        vendor: 'Müller Licht',
        description: 'Tint Armaro',
        extend: extend.light_onoff_brightness_colortemp(),
    },
];
