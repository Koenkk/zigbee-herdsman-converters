import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as tuya from '../lib/tuya';
import * as exposes from '../lib/exposes';
import {onOff} from '../lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_wrhhi5h2'}],
        model: '1GNNTS',
        vendor: 'WETEN',
        description: '1 gang no neutral touch wall switch',
        extend: [onOff()],
        fromZigbee: [fz.ignore_basic_report, fz.ignore_time_read],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_6fk3gewc']),
        model: 'PCI E',
        vendor: 'WETEN',
        description: 'Remote Control PCI E Card for PC',
        whiteLabel: [{vendor: 'Weten', model: 'Tuya PRO'}],

        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.switch().setAccess('state', ea.STATE_SET),
            e.enum('restart_mode', ea.STATE_SET, ['restart', 'force restart', '–']).withDescription('Restart Mode'),
            e.binary('rf_pairing', ea.STATE_SET, 'ON', 'OFF').withDescription('Enables/disables RF 433 remote pairing mode').withCategory('config'),
            e.binary('rf_remote_control', ea.STATE_SET, 'ON', 'OFF').withDescription('Enables/disables RF 433 remote control').withCategory('config'),
            e.binary('buzzer_feedback', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable buzzer feedback.').withCategory('config'),
            e.enum('power_on_behavior', ea.STATE_SET, ['on', 'off']).withDescription('Power On Behavior').withCategory('config'),
            e.binary('child_lock', ea.STATE_SET, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device')
                .withCategory('config'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff],
                [101, 'restart_mode', tuya.valueConverterBasic.lookup({'restart': tuya.enum(0), 'force restart': tuya.enum(1), '–': tuya.enum(2)})],
                [102, 'rf_remote_control', tuya.valueConverterBasic.lookup({'ON': tuya.enum(0), 'OFF': tuya.enum(1)})],
                [103, 'rf_pairing', tuya.valueConverter.onOff],
                [104, 'buzzer_feedback', tuya.valueConverter.onOff],
                [105, 'power_on_behavior', tuya.valueConverterBasic.lookup({'off': tuya.enum(0), 'on': tuya.enum(1)})],
                [106, 'child_lock', tuya.valueConverter.lockUnlock],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
