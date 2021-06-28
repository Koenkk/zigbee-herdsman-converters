const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['511.050'],
        model: '511.050',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 LED controller for 5in1 RGB+CCT LEDs',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [155, 450]}),
    },
    {
        zigbeeModel: ['DIM Lighting'],
        model: '511.10',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller ',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['511.201'],
        model: '511.201',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 Dimm-Aktor mini 1x 230V',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['5120.1100'],
        model: '5120.1100',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 Dimm-Aktor mini 1x 230V',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['5120.1110'],
        model: '5120.1110',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 Dimm-Aktor mini 1x 230V',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['511.010'],
        model: '511.010',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['511.012'],
        model: '511.012',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['511.202'],
        model: '511.202',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V, 200W/400W',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['5120.1200'],
        model: '5120.1200',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V with neutral, 200W/400W',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['5120.1210'],
        model: '5120.1210',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V without neutral, 200W/400W',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2801K2-G1-RGB-CCT-LEAD'],
        model: '511.557',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 wall dimmer',
        fromZigbee: [fz.command_off, fz.command_on, fz.command_move_to_color_temp, fz.command_move_to_color],
        toZigbee: [],
        exposes: [e.action(['off', 'on', 'color_temperature_move', 'color_move'])],
    },
    {
        zigbeeModel: ['RGBW-CCT', '511.040'],
        model: '511.040',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 LED-controller, 4 channel 5A, RGBW LED',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['HK-ZD-RGBCCT-A', '511.000'],
        model: '511.000',
        vendor: 'Iluminize',
        whiteLabel: [{vendor: 'Sunricher', model: 'HK-ZD-RGBCCT-A'}],
        description: 'Zigbee 3.0 universal LED-controller, 5 channel, RGBCCT LED',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['ZG2819S-RGBW'],
        model: '511.344',
        vendor: 'Iluminize',
        description: 'Zigbee handheld remote RGBW 4 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.ZG2819S_command_on, fz.ZG2819S_command_off],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down', 'recall_*', 'on', 'off'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },
];
