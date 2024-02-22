import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
import * as utils from '../lib/utils';
import fz from '../converters/fromZigbee';
import {KeyValue, Definition, Tz, Fz} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    TS0225: {
        key: ['motion_detection_distance', 'motion_detection_sensitivity', 'static_detection_sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'motion_detection_distance': {
                utils.assertNumber(value, 'motion_detection_distance');
                await entity.write('manuSpecificTuya_2', {57355: {value, type: 0x21}});
                break;
            }
            case 'motion_detection_sensitivity': {
                utils.assertNumber(value, 'motion_detection_sensitivity');
                await entity.write('manuSpecificTuya_2', {57348: {value, type: 0x20}});
                break;
            }
            case 'static_detection_sensitivity': {
                utils.assertNumber(value, 'static_detection_sensitivity');
                await entity.write('manuSpecificTuya_2', {57349: {value, type: 0x20}});
                break;
            }
            }
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    TS0225_illuminance: {
        cluster: 'msIlluminanceMeasurement',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            const buffer = msg.data;
            return {illuminance: Math.round(0.0001 * Math.pow(Number(buffer[7]), 3.413))};
        },
    } satisfies Fz.Converter,
    TS0225: {
        cluster: 'manuSpecificTuya_2',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('57354')) {
                result['target_distance'] = msg.data['57354'];
            }
            if (msg.data.hasOwnProperty('57355')) {
                result['motion_detection_distance'] = msg.data['57355'];
            }
            if (msg.data.hasOwnProperty('57348')) {
                result['motion_detection_sensitivity'] = msg.data['57348'];
            }
            if (msg.data.hasOwnProperty('57349')) {
                result['static_detection_sensitivity'] = msg.data['57349'];
            }
            if (msg.data.hasOwnProperty('57345')) {
                result['presence_keep_time'] = msg.data['57345'];
            }
            return result;
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS0225', ['_TZ3218_awarhusb', '_TZ3218_t9ynfz4x']),
        model: 'ES1ZZ(TY)',
        vendor: 'Linptech',
        description: 'mmWave Presence sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fzLocal.TS0225, fzLocal.TS0225_illuminance, tuya.fz.datapoints],
        toZigbee: [tzLocal.TS0225, tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.occupancy().withDescription('Presence state'), e.illuminance().withUnit('lx'),
            e.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('cm'),
            e.numeric('motion_detection_distance', ea.STATE_SET).withValueMin(0).withValueMax(600)
                .withValueStep(75).withDescription('Motion detection distance').withUnit('cm'),
            e.numeric('presence_keep_time', ea.STATE).withDescription('Presence keep time').withUnit('min'),
            e.numeric('motion_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(5)
                .withValueStep(1).withDescription('Motion detection sensitivity'),
            e.numeric('static_detection_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(5)
                .withValueStep(1).withDescription('Static detection sensitivity'),
            e.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(10000).withValueStep(1)
                .withUnit('s').withDescription('Time after which the device will check again for presence'),
        ],
        meta: {
            tuyaDatapoints: [
                [101, 'fading_time', tuya.valueConverter.raw],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
