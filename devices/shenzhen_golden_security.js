const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['TS0601'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
    model: 'GM46', // Vendor model number, look on the device for a model number
    vendor: 'Shenzhen Golden Security Technology', // Vendor of the device (only used for documentation and startup logging)
    description: 'Curtain Motor', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
    fromZigbee: [fz.tuya_cover, fz.ignore_basic_report], // We will add this later
    toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options], // Should be empty, unless device can be controlled (e.g. lights, switches).
    exposes: [e.cover_position().setAccess('position', ea.STATE_SET),
    exposes.composite('options', 'options')
        .withFeature(exposes.numeric('motor_speed', ea.STATE_SET)
            .withValueMin(0)
            .withValueMax(255)
            .withDescription('Motor speed'))], // Defines what this device exposes, used for e.g. Home Assistant discovery and in the frontend
};

module.exports = definition;

