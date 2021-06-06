const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['E-Wand'],
        model: 'CP180335E-01',
        vendor: 'Current Products Corp',
        description: 'Gen. 2 hybrid E-Wand',
        fromZigbee: [fz.battery, fz.cover_state_via_onoff, fz.cover_tilt],
        toZigbee: [tz.cover_position_tilt,tz.cover_state],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering', 'genOnOff', 'genPowerCfg']);
            await reporting.currentPositionTiltPercentage(endpoint);
            await reporting.onOff(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.cover_tilt()],
    },
];
