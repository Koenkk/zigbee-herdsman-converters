const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const exposes = require('../lib/exposes');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['PSE03-V1.1.0'],
        model: 'PSE03-V1.1.0',
        vendor: 'EVOLOGY',
        description: 'Sound and flash siren',
        fromZigbee: [fz.ignore_basic_report, fz.ias_wd, fz.ias_enroll, fz.ias_siren],
        toZigbee: [tz.warning],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'ssIasWd', 'genBasic']);
            await endpoint.read('ssIasZone', ['zoneState', 'iasCieAddr', 'zoneId', 'zoneStatus']);
            await endpoint.read('ssIasWd', ['maxDuration']);
        },
        exposes: [e.warning().removeFeature('strobe_level').removeFeature('strobe').removeFeature('strobe_duty_cycle')],
    },
];
