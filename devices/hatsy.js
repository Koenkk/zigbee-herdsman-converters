const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require("zigbee-herdsman-converters/lib/tuya");

const definition = {
    fingerprint: [
        {
            modelID: 'TS011F',
            manufacturerName: '_TZ3000_anhq0jsb'
        },
    ],
    model: 'BS-500Z',
    vendor: 'Hatsy',
    description: 'Smart Light Socket',
    fromZigbee: [fz.on_off],
    toZigbee: [tz.on_off],    
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
    },
    exposes: [e.switch()],
};

module.exports = definition;

