const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['FB56-ZCW11HG1.2', 'FB56-ZCW11HG1.4'],
        model: 'HGZB-07A',
        vendor: 'Smart Home Pty',
        description: 'RGBW Downlight',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['FNB56-SKT1EHG1.2'],
        model: 'HGZB-20-DE',
        vendor: 'Smart Home Pty',
        description: 'Power plug',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['LXN56-1S27LX1.2'],
        model: 'NUE-ZBFLB',
        vendor: 'Nue / 3A',
        description: 'Smart fan light switch',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('button_light'), e.switch().withEndpoint('button_fan_high'),
            e.switch().withEndpoint('button_fan_med'), e.switch().withEndpoint('button_fan_low')],
        endpoint: (device) => {
            return {'button_light': 1, 'button_fan_high': 2, 'button_fan_med': 3, 'button_fan_low': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    
    {
        zigbeeModel: ['LXN-2S27LX1.0'],
        model: 'JZ-ZB-002',
        vendor: '3A Smart Home',
        description: 'Intelligent Curtain Shutter Switch to Upgrade Normal Blinds',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('button_aus'), e.switch().withEndpoint('button_ein')],
        endpoint: (device) => {
            return {'button_aus': 2, 'button_ein': 1};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
];
