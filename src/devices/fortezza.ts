const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');
const e = exposes.presets;

const definition = {
    fingerprint: [{
        modelID: 'TY0A01',
        manufacturerName: '_TYST12_udaoihrc',
    }],
    model: 'Fortezza-FZE01BK',
    vendor: 'Fortezza',
    description: 'Smart Door Lock',
    onEvent: tuya.onEventSetTime,
    fromZigbee: [fz.battery],
    toZigbee: [] as any,
    exposes: [e.battery(), e.lock()],
    meta: {
        tuyaDatapoints: [] as any,
    },
};

module.exports = definition;
