const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_dn5higyl'}],
        model: 'TH008L10RGBCCT',
        vendor: 'UR Lighting',
        description: 'UR Lighting 10W RGB+CCT downlight',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
];
