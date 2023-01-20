const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');

const e = exposes.presets;


module.exports = [{
    zigbeeModel: ['SE-SW'], //
    model: 'SEHAZB-DR-SWITCH-2', //
    vendor: 'SolarEdge', //
    description: 'SolarEdge SmartEnergy Switch', //
    fromZigbee: [fz.on_off], //
    toZigbee: [tz.on_off], //
    exposes: [e.switch()], //
}];

