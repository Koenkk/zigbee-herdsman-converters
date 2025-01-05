import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ykgar0ow']),
        model: 'TS0601_dimmer_1_gang_3',
        vendor: 'Tuya',
        description: '1 gang smart dimmer',
        fromZigbee: [
            tuya.fz.datapoints,
            tuya.fz.brightness,
        ],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax(),
            tuya.exposes.countdown(),
            e.power_on_behavior().withAccess(ea.STATE_SET),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness', tuya.valueConverter.scale0_254to0_1000],
                [5, 'max_brightness', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehavior],
            ],
        },
        whiteLabel: [
            tuya.whitelabel('ION Industries', 'ID200W-ZIGB', 'LED Zigbee Dimmer', ['_TZE200_ykgar0ow']),
        ],
    },
];

export default definitions;
module.exports = definitions;
