import {Definition} from '../lib/types';
import {battery, humidity, iasZoneAlarm, ignoreClusterReport, temperature} from '../lib/modernExtend';
import {modernExtend as tuyaModernExtend} from '../lib/tuya';
const {tuyaMagicPacket, tuyaOnOffActionLegacy} = tuyaModernExtend;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'SM0202', manufacturerName: '_TYZB01_2jzbhomb'}],
        model: 'SBDV-00029',
        vendor: 'Sber',
        description: 'Smart motion sensor',
        extend: [
            iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1', 'tamper', 'battery_low'], alarmTimeout: true}),
            battery({voltage: true, voltageReporting: true}),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0203', manufacturerName: '_TYZB01_epni2jgy'}],
        model: 'SBDV-00030',
        vendor: 'Sber',
        description: 'Smart opening sensor',
        extend: [
            ignoreClusterReport({cluster: 'genBasic'}),
            iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({voltage: true, voltageReporting: true}),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0041A', manufacturerName: '_TYZB01_ub7urdza'}],
        model: 'SBDV-00032',
        vendor: 'Sber',
        description: 'Smart button',
        extend: [
            tuyaMagicPacket(),
            tuyaOnOffActionLegacy({actions: ['single', 'double', 'hold']}),
            battery({percentageReporting: false}),
            /*
            * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
            * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
            * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
            * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
            */
        ],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_zfirri2d'}],
        model: 'SBDV-00079',
        vendor: 'Sber',
        description: 'Smart temperature and humidity sensor',
        extend: [
            temperature(),
            humidity(),
            battery({voltage: true, voltageReporting: true}),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0207', manufacturerName: '_TZ3000_c8bqthpo'}],
        model: 'SBDV-00154',
        vendor: 'Sber',
        description: 'Smart water leak sensor',
        extend: [
            ignoreClusterReport({cluster: 'genBasic'}),
            iasZoneAlarm({zoneType: 'water_leak', zoneAttributes: ['alarm_1', 'battery_low']}),
            battery(),
        ],
    },
];

export default definitions;
module.exports = definitions;
