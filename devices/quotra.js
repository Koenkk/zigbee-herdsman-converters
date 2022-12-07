const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['Dimmer_us'],
        model: 'Dimmer_us',
        vendor: 'SmartDimmer',
        description: 'Quotra Dimmer',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['QV-RGBCCT'],
        model: 'QV-RGBCCT',
        vendor: 'Quotra-Vision',
        description: 'Quotra Wireless RGB WW LED Strip',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [150, 500]}),
    },
];
