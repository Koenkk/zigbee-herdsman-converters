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
    fingerprint: [{modelID: 'CCT Light', manufacturerName: 'ZB/Ajax Online', manufacturerID: 4137},
        {modelID: 'CCT Light', manufacturerName: 'ZB/Ajax Online', manufacturerID: 4137}],
    model: 'ZB-CCT_Filament',
    vendor: 'Ajax Online',
    description: 'Zigbee LED filament light dimmable E27, edison ST64, flame 2200K',
    extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
};

module.exports = definition;