const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = {
    fingerprint: [{type: 'Router', manufacturerID: 4368, endpoints: [{ID: 1, profileID: 260, deviceID: 512},]}],
    model: '4368-512',
    vendor: 'Profalux',
    description: 'Visio cover with position control',
    fromZigbee: [fz.identify, fz.cover_state_via_onoff, fz.cover_position_via_brightness],
    toZigbee: [tz.profalux_cover_state, tz.cover_via_brightness],
    exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);

        await endpoint.configureReporting('genOnOff', [{
            attribute: 'onOff',
            minimumReportInterval: 0,
            maximumReportInterval: 3600,
            reportableChange: 0,
        }]);

        await endpoint.configureReporting('genLevelCtrl', [{
            attribute: 'currentLevel',
            minimumReportInterval: 0,
            maximumReportInterval: 3600,
            reportableChange: 0,
        }]);
    }
};