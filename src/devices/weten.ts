import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import extend from '../lib/extend';

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
        fingerprint: [
            {
                modelID: 'TS0601',
                manufacturerName: '_TZE204_6fk3gewc',
            },
        ],
        zigbeeModel: ['TS0601'],
    	model: 'PCI E',
        vendor: 'WETEN',
        description: 'PC-SWITCH',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withEndpoint('l1').withDescription('PC Power'),
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withEndpoint('l2').withDescription('Shutdown or Reset? Does not seem to actually do anything'),
/* if possible would be good to swap the values, as currently on means no buzzer noise. */
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withEndpoint('l3').withDescription('Buzzer on means no buzzer noise'),
		    e.binary('child_lock', ea.STATE_SET, 'LOCK', 'UNLOCK').withEndpoint('l4').withDescription('Child safety lock'),
		    e.binary('state', ea.STATE_SET, 'ON', 'OFF').withEndpoint('l5').withDescription('To enable or disable the use of RF remote control, does not seem to actually work'),
		    e.binary('state', ea.STATE_SET, 'ON', 'OFF').withEndpoint('l6').withDescription('To pair a RF 433 remote, such as the one supplied')
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [105, 'state_l2', tuya.valueConverter.onOff],
                [104, 'state_l3', tuya.valueConverter.onOff],
                [106, 'child_lock_l4', tuya.valueConverter.lockUnlock],
                [102, 'state_l5', tuya.valueConverter.onOff],
                [103, 'state_l6', tuya.valueConverter.onOff],
            ],
        },
    };    
];
export default definitions;
module.exports = definitions;
