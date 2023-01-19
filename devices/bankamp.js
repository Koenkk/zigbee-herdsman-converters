const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['Bankamp Dimm-Leuchte'],
        model: 'Grazia',
        vendor: 'Bankamp Leuchten',
        description: 'Bankamp Grazia Ceiling Light',       
        extend: extend.light_onoff_brightness(),
    },
];
