const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['MS100'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
    model: 'MS100(UN)', // Vendor model number, look on the device for a model number
    vendor: 'TP-Link', // Vendor of the device (only used for documentation and startup logging)
    description: 'Smart Motion Sensor', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
    fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.illuminance], // We will add this later
    toZigbee: [], // Should be empty, unless device can be controlled (e.g. lights, switches).
    exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.illuminance(), e.illuminance_lux(),], // Defines what this device exposes, e.g. Home Assistant discovery and in the frontend
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        await reporting.batteryPercentageRemaining(endpoint);
        await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['msIlluminanceMeasurement']);
        await reporting.illuminance(device.getEndpoint(2));
        device.powerSource = 'Battery';
        device.save();
    },
};

module.exports = definition;
