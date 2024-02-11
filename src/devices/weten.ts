import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as tuya from '../lib/tuya';
import extend from '../lib/extend';
import * as exposes from '../lib/exposes';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_wrhhi5h2'}],
        model: '1GNNTS',
        vendor: 'WETEN',
        description: '1 gang no neutral touch wall switch',
        extend: extend.switch(),
        fromZigbee: [fz.on_off, fz.ignore_basic_report, fz.ignore_time_read],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_6fk3gewc']),
        model: 'PCI E',
        vendor: 'WETEN',
        description: 'PC switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('PC Power'),
            e.binary('buzzer_feedback', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Enable buzzer feedback. It sounds on device actions like power state changes, child lock activation, etc.'),
            e.child_lock(),
            e.binary('rf_pairing', ea.STATE_SET, 'ON', 'OFF').withDescription('Enables/disables RF 433 remote pairing mode'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [104, 'buzzer_feedback', tuya.valueConverter.onOff],
                [106, 'child_lock', tuya.valueConverter.lockUnlock],
                [103, 'rf_pairing', tuya.valueConverter.onOff],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
