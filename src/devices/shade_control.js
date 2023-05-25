const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = {
    zigbeeModel: ['SC-02'],
    model: 'MC-02',
    vendor: 'Shade Control',
    description: 'Automate shades and blinds with beaded chains',
    fromZigbee: [fz.battery, fz.cover_position_tilt],
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
        await reporting.batteryPercentageRemaining(endpoint);
        await reporting.currentPositionLiftPercentage(endpoint);
        device.powerSource = 'Battery';
        device.save();
    },
    toZigbee: [tz.cover_state, tz.cover_position_tilt],
    exposes: [e.battery(), e.cover_position()],
};

