import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
const e = exposes.presets;
const ea = exposes.access;

const definition: Definition = {
    fingerprint: [
        {
            modelID: 'TS0601',
            manufacturerName: '_TZE200_gjldowol',
        },
    ],
    zigbeeModel: ['TS0601'],
    model: 'TS0601_pir_sensor',
    vendor: '_TZE200_gjldowol',
    description: 'Luminance motion sensor',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    onEvent: tuya.onEventSetTime,
    configure: tuya.configureMagicPacket,
    exposes: [
        e.occupancy(),
        e.illuminance().withUnit('lx'),
        e.battery(),
        e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high'])
            .withDescription('PIR sensor sensitivity (refresh and update only while active)'),
        e.numeric('keep_time', ea.STATE_SET)
            .withValueMin(5)
            .withValueMax(3600)
            .withValueStep(1)
            .withUnit('seconds')
            .withDescription('PIR keep time in seconds (refresh and update only while active)'),
        e.numeric('illuminance_interval', ea.STATE_SET)
            .withValueMin(1)
            .withValueMax(720)
            .withValueStep(1)
            .withUnit('minutes')
            .withDescription('Brightness acquisition interval (refresh and update only while active)'),
    ],
    meta: {
        tuyaDatapoints: [
            [1, 'occupancy', tuya.valueConverterBasic.lookup({pir: true, none: false})],
            [4, 'battery', tuya.valueConverter.raw],
            [9, 'sensitivity', tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2)})],
            [12, 'illuminance', tuya.valueConverter.raw],
            [101, 'illuminance_interval', tuya.valueConverter.raw],
            [102, 'keep_time', tuya.valueConverter.raw],
        ],
    },
};

export default definition;
