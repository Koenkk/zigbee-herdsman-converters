const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;

module.exports = {
    zigbeeModel: ['WM25WM25\u002FL-Z'],
    model: 'WM25\u002FL-Z',
    vendor: 'Smartwings',
    description: 'Roller Shade',
    fromZigbee: [fz.cover_position_tilt, fz.battery],
    toZigbee: [tz.cover_state, tz.cover_position_tilt],
    meta: {battery: {dontDividePercentage: true}},
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
        await reporting.batteryPercentageRemaining(endpoint);
        await reporting.currentPositionLiftPercentage(endpoint);
    },
    exposes: [e.cover_position(), e.battery()],
};
