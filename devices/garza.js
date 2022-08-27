const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const ota = require('zigbee-herdsman-converters/lib/ota');
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    fingerprint: [
        {
            modelID: 'TS0505B',
            manufacturerName: '_TZ3210_sln7ah6r'
        },
    ],
    zigbeeModel: ['TS0505B'],
    model: 'Garza-Standard-A60',
    vendor: 'Garza Smart',
    description: 'Garza Smart Zigbee Standard A60',
    extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
};

module.exports = definition;