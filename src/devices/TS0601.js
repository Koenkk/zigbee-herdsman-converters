const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const modernExtend = require('zigbee-herdsman-converters/lib/modernExtend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_8eazvzo6']),
        model: 'SWS6TZ-WHITE',
        vendor: 'TuYa',
        //zigbeeModel: ['TS0601'],
        //model: 'TS0601',
        //vendor: '_TZE204_8eazvzo6',
        description: '6 gang wall switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.switch().withEndpoint('l6'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.current(), e.power(), e.voltage(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [21, 'current', tuya.valueConverter.divideBy1000],
                [22, 'power', tuya.valueConverter.divideBy10],
                [23, 'voltage', tuya.valueConverter.divideBy10],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    };

module.exports = definition;

const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const modernExtend = require('zigbee-herdsman-converters/lib/modernExtend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_8eazvzo6']),
        model: 'SWS6TZ-WHITE',
        vendor: 'TuYa',
        //zigbeeModel: ['TS0601'],
        //model: 'TS0601',
        //vendor: '_TZE204_8eazvzo6',
        description: '6 gang wall switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.switch().withEndpoint('l6'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.current(), e.power(), e.voltage(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [21, 'current', tuya.valueConverter.divideBy1000],
                [22, 'power', tuya.valueConverter.divideBy10],
                [23, 'voltage', tuya.valueConverter.divideBy10],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    };

module.exports = definition;

const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const modernExtend = require('zigbee-herdsman-converters/lib/modernExtend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_8eazvzo6']),
        model: 'SWS6TZ-WHITE',
        vendor: 'TuYa',
        //zigbeeModel: ['TS0601'],
        //model: 'TS0601',
        //vendor: '_TZE204_8eazvzo6',
        description: '6 gang wall switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.switch().withEndpoint('l6'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.current(), e.power(), e.voltage(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [21, 'current', tuya.valueConverter.divideBy1000],
                [22, 'power', tuya.valueConverter.divideBy10],
                [23, 'voltage', tuya.valueConverter.divideBy10],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    };

module.exports = definition;

const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const modernExtend = require('zigbee-herdsman-converters/lib/modernExtend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_8eazvzo6']),
        model: 'SWS6TZ-WHITE',
        vendor: 'TuYa',
        //zigbeeModel: ['TS0601'],
        //model: 'TS0601',
        //vendor: '_TZE204_8eazvzo6',
        description: '6 gang wall switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.switch().withEndpoint('l6'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.current(), e.power(), e.voltage(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [21, 'current', tuya.valueConverter.divideBy1000],
                [22, 'power', tuya.valueConverter.divideBy10],
                [23, 'voltage', tuya.valueConverter.divideBy10],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    };

module.exports = definition;

const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const modernExtend = require('zigbee-herdsman-converters/lib/modernExtend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_8eazvzo6']),
        model: 'SWS6TZ-WHITE',
        vendor: 'TuYa',
        //zigbeeModel: ['TS0601'],
        //model: 'TS0601',
        //vendor: '_TZE204_8eazvzo6',
        description: '6 gang wall switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.switch().withEndpoint('l6'),
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.current(), e.power(), e.voltage(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, backlight: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
                [6, 'state_l6', tuya.valueConverter.onOff],
                [21, 'current', tuya.valueConverter.divideBy1000],
                [22, 'power', tuya.valueConverter.divideBy10],
                [23, 'voltage', tuya.valueConverter.divideBy10],
                [16, 'backlight_mode', tuya.valueConverter.onOff],
            ],
        },
    };

module.exports = definition;

