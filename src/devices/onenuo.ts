import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
import {Definition} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_kgaxpvxr'}],
        model: '288WZ',
        vendor: 'ONENUO',
        description: 'Smoke detector',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.smoke(),
            e.enum('smoke_state', ea.STATE, ['alarm', 'normal', 'detecting', 'unknown'])
                .withLabel('Smoke state')
                .withDescription('Possible states: alarm, normal, detecting, unknown'),
            e.battery(),
            tuya.exposes.silence(),
            tuya.exposes.selfTestResult(),
            e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high'])
                .withLabel('Sensitivity')
                .withDescription('Smoke detection sensitivity'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, null, function (lookup) {
                    return {
                        from: (v: number) => {
                            const smokeState = lookup.from(v);
                            return {
                                'smoke': (smokeState === 'alarm'),
                                'smoke_state': smokeState
                            };
                        }
                    }
                }(tuya.valueConverterBasic.lookup({
                    'alarm': tuya.enum(0),
                    'normal': tuya.enum(1),
                    'detecting': tuya.enum(2),
                    'unknown': tuya.enum(3)
                }))],
                [15, 'battery', tuya.valueConverter.raw],
                [16, 'silence', tuya.valueConverter.raw],
                [101, 'self_test_result', tuya.valueConverterBasic.lookup({'failure': false, 'success': true})],
                [102, 'sensitivity', tuya.valueConverterBasic.lookup({
                    'low': tuya.enum(0),
                    'medium': tuya.enum(1),
                    'high': tuya.enum(2)
                })],
            ],
        },
    },
];

module.exports = definitions;
