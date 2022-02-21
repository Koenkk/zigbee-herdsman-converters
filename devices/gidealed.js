const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['A11'], 
    model: 'ZC05M', 
    vendor: 'GIDEALED', 
    description: 'Smart Zigbee RGB LED strip controller',
    extend: extend.light_onoff_brightness_colortemp_color({supportsHS: true, colorTempRange: [153, 500]}), 
};

module.exports = definition;
