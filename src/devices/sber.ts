import * as m from '../lib/modernExtend';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const {tuyaMagicPacket, tuyaOnOffActionLegacy} = tuya.modernExtend;

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint('SM0202', ['_TYZB01_2jzbhomb']),
        model: 'SBDV-00029',
        vendor: 'Sber',
        description: 'Smart motion sensor',
        extend: [
            m.iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1', 'tamper', 'battery_low'], alarmTimeout: true}),
            m.battery({voltage: true, voltageReporting: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0203', ['_TYZB01_epni2jgy']),
        model: 'SBDV-00030',
        vendor: 'Sber',
        description: 'Smart opening sensor',
        extend: [
            m.ignoreClusterReport({cluster: 'genBasic'}),
            m.iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            m.battery({voltage: true, voltageReporting: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0041A', ['_TYZB01_ub7urdza']),
        model: 'SBDV-00032',
        vendor: 'Sber',
        description: 'Smart button',
        extend: [
            tuyaMagicPacket(),
            tuyaOnOffActionLegacy({actions: ['single', 'double', 'hold']}),
            m.battery({percentageReporting: false}),
            /*
             * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
             * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
             * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
             * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
             */
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0201', ['_TZ3000_zfirri2d']),
        model: 'SBDV-00079',
        vendor: 'Sber',
        description: 'Smart temperature and humidity sensor',
        extend: [m.temperature(), m.humidity(), m.battery({voltage: true, voltageReporting: true})],
    },
    {
        fingerprint: tuya.fingerprint('TS0207', ['_TZ3000_c8bqthpo']),
        model: 'SBDV-00154',
        vendor: 'Sber',
        description: 'Smart water leak sensor',
        extend: [
            m.ignoreClusterReport({cluster: 'genBasic'}),
            m.iasZoneAlarm({zoneType: 'water_leak', zoneAttributes: ['alarm_1', 'battery_low']}),
            m.battery(),
        ],
    },
];

export default definitions;
module.exports = definitions;
