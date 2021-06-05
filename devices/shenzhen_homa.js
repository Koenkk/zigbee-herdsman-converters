const exposes = require('../lib/exposes');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['HOMA1008', '00A'],
        model: 'HLD812-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1009'],
        model: 'HLD503-Z-CT',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['HOMA1002', 'HOMA0019', 'HOMA0006', 'HOMA000F', '019'],
        model: 'HLC610-Z',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1031'],
        model: 'HLC821-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'ZigBee AC phase-cut dimmer',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1005'],
        model: 'HLC614-ZLL',
        vendor: 'Shenzhen Homa',
        description: '3 channel relay module',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
    },
    {
        zigbeeModel: ['HOMA1064', '012'],
        model: 'HLC833-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: extend.light_onoff_brightness(),
    },
];
