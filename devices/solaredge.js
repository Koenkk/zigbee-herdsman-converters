const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');

const e = exposes.presets;


module.exports = [{
    zigbeeModel: ['SE-SW'], //
    model: 'SEHAZB-DR-SWITCH-2', //
    vendor: 'SolarEdge', //
    description: 'SolarEdge SmartEnergy Switch', //
    fromZigbee: [fz.on_off], //
    toZigbee: [tz.on_off], //
    exposes: [e.switch()], //
},];

