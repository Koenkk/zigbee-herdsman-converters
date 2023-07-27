const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;

const definition = {
    zigbeeModel: ['Sonesse Ultra 30 WF Li-Ion Rolle'],
    model: 'SOMFY-1241752',
    vendor: 'SOMFY',
    description: 'Blinds from vendors using this roller',
    fromZigbee: [fz.battery,fz.power_source,fz.cover_position_tilt],
    toZigbee: [tz.cover_state,tz.cover_position_tilt],
    exposes: [e.cover_position()],
};

module.exports = definition;
