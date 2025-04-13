const tuya = require('zigbee-herdsman-converters/lib/tuya');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;

module.exports = {
    fingerprint: [
        ...tuya.fingerprint('TS0601', ['_TZE200_oc7xqqbs']),
    ],
    model: 'Homcloud HY-SZLUMPIR',
    vendor: 'Tuya',
    description: 'Homcloud HY-SZLUMPIR PIR sensor (custom with *TZE200*oc7xqqbs)',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    onEvent: tuya.onEvent(),
    configure: tuya.configureMagicPacket,
    exposes: [e.occupancy(), e.illuminance(), e.battery()],
    meta: {
        tuyaDatapoints: [
            [1, 'occupancy', tuya.valueConverter.trueFalse0],
            [4, 'battery', tuya.valueConverter.raw],
            [101, 'illuminance', tuya.valueConverter.raw],
        ],
    },
};