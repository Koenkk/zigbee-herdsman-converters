const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['ZBT-RGBWLight-A0000'],
    model: 'ZBT-RGBWLight-A0000',
    vendor: 'LDS',
    description: 'Ynoa Smart LED E27',
    extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555]}),
};

module.exports = definition;
