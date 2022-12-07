const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['ZLL-DimmableLight'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
    model: 'ZLED-G2705', // Vendor model number, look on the device for a model number
    vendor: 'Trust', // Vendor of the device (only used for documentation and startup logging)
    description: 'Smart Dimmable LED Spot', // Description of the device, copy from vendor site. (only used for documentation and startup l>
    extend: extend.light_onoff_brightness(),
};

module.exports = definition;