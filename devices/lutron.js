const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const ota = require('../lib/ota');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['LZL4BWHL01 Remote'],
        model: 'LZL4BWHL01',
        vendor: 'Lutron',
        description: 'Connected bulb remote control',
        fromZigbee: [fz.legacy.insta_down_hold, fz.legacy.insta_up_hold, fz.legacy.LZL4B_onoff, fz.legacy.insta_stop],
        toZigbee: [],
        exposes: [e.action(['down', 'up', 'stop'])],
    },
    {
        zigbeeModel: ['Z3-1BRL'],
        model: 'Z3-1BRL',
        vendor: 'Lutron',
        description: 'Aurora smart bulb dimmer',
        fromZigbee: [fz.legacy.dimmer_passthru_brightness],
        toZigbee: [],
        exposes: [e.action(['brightness']), exposes.numeric('brightness', ea.STATE)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
        },
        ota: ota.zigbeeOTA,
    },
];
