const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;

const definition = {
    zigbeeModel: ['Ford'],
    model: 'Ford',
    vendor: 'Yunding',
    description: 'Wyze Lock',
    fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
    toZigbee: [tz.lock],
    meta: {configureKey: 1, options: {disableDefaultResponse: true}},
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.endpoints[0];
        await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
        await reporting.lockState(endpoint);
        await reporting.batteryPercentageRemaining(endpoint);
    },
    exposes: [e.lock(), e.battery()],
};

module.exports = definition;