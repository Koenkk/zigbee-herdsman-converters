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
const tzDatapoints = {
    ...tuya.tz.datapoints,
        key: ['PC_Power', 'shutdown_reset', 'buzzer', 'child_lock', 'RF', 'pair_RF_remote']
}
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_6fk3gewc']),
        model: 'PCI E',
        vendor: 'WETEN',
        description: 'PC switch',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tzDatapoints],
        exposes: [
            e.binary('PC_Power', ea.STATE_SET, 'ON', 'OFF').withDescription('PC Power'),		
	    e.binary('shutdown_reset', ea.STATE_SET, 'ON', 'OFF').withDescription('Shutdown or Reset? Does not seem to actually do anything'),
            e.binary('buzzer', ea.STATE_SET, 'ON', 'OFF').withDescription('Buzzer on means no buzzer noise'),
	    e.binary('child_lock', ea.STATE_SET, 'LOCK', 'UNLOCK').withDescription('Child safety lock'),
	    e.binary('RF', ea.STATE_SET, 'ON', 'OFF').withDescription('To enable or disable the use of RF remote control, does not seem to actually work'),
	    e.binary('pair_RF_remote', ea.STATE_SET, 'ON', 'OFF').withDescription('To pair a RF 433 remote, such as the one supplied')
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'PC_Power', tuya.valueConverter.onOff],
            	[105, 'shutdown_reset', tuya.valueConverter.onOff],
            	[104, 'buzzer', tuya.valueConverter.onOff],
            	[106, 'child_lock', tuya.valueConverter.lockUnlock],
            	[102, 'RF', tuya.valueConverter.onOff],
            	[103, 'pair_RF_remote', tuya.valueConverter.onOff],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
