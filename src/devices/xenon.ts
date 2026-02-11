import {Definition} from '../lib/types';
import * as tuya from '../lib/tuya';
import * as exposes from '../lib/exposes';

const e = exposes.presets;
const ea = exposes.access;

const temperatureAutoScale = {
    from: (v: number) => (typeof v === 'number' && v > 100 ? v / 10 : v),
    to: (v: number) => v,
};

const positionInvert = {
    from: (v: number) => {
        const n = Number(v);
        if (Number.isNaN(n)) return v;
        return Math.max(0, Math.min(100, 100 - n));
    },
    to: (v: number) => {
        const n = Number(v);
        if (Number.isNaN(n)) return v;
        return Math.max(0, Math.min(100, 100 - n));
    },
};

const definition: Definition = {
    fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE284_hbjwgkdh'}],
    model: 'X7726',
    vendor: 'Xenon Smart',
    description: 'Zigbee curtain motor (TS0601)',

    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    configure: tuya.configureMagicPacket,

    exposes: [
        e.cover_position().setAccess('position', ea.STATE_SET),
        e.enum('calibration', ea.STATE_SET, ['start', 'finish']),
        e.temperature(),
    ],

    meta: {
        tuyaDatapoints: [
            [1, 'state', tuya.valueConverterBasic.lookup({
                OPEN: tuya.enum(0),
                STOP: tuya.enum(1),
                CLOSE: tuya.enum(2),
            })],

            [2, 'position', positionInvert],
            [3, 'position', positionInvert],

            [102, 'calibration', tuya.valueConverterBasic.lookup({
                start: tuya.enum(0),
                finish: tuya.enum(1),
            })],

            [103, 'temperature', temperatureAutoScale],
        ],
    },
};

export default definition;
