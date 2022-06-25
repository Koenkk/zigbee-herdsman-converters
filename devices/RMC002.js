const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['Bouffalolab'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
    model: 'RMC002', // Vendor model number, look on the device for a model number
    vendor: 'Bouffalolab', // Vendor of the device (only used for documentation and startup logging)
    description: 'US Plug Smart Socket', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
    fromZigbee: [fz.on_off], // We will add this later
    toZigbee: [tz.on_off], // Should be empty, unless device can be controlled (e.g. lights, switches).
    exposes: [e.switch()], // Defines what this device exposes, used for e.g. Home Assistant discovery and in the frontend
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        await reporting.onOff(endpoint);
    },
};

module.exports = definition;