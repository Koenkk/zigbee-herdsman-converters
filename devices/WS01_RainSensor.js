const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['WS01'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
        model: 'WS01', // Vendor model number, look on the device for a model number
        vendor: 'eWeLink', // Vendor of the device (only used for documentation and startup logging)
        description: 'eWeLink Rain Sensor', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
        fromZigbee: [fz.WS01_rain], // We will add this later
        toZigbee: [], // Should be empty, unless device can be controlled (e.g. lights, switches).
        exposes: [e.rain()], // Defines what this device exposes, used for e.g. Home Assistant discovery and in the frontend    
    },
];