const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['DTB-ED2011-014'], 
    model: 'Touch4',
    vendor: 'databyte.ch',
    description: 'Wall Touchsensor with 4 keys (https://databyte.ch/zigbee-touch-key)',
    fromZigbee: [fz.DTB2011014, fz.battery], 
    exposes: [e.battery(), e.linkquality()],
};

module.exports = definition;
