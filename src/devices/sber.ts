import {Definition} from '../lib/types';
import {battery, humidity, iasZoneAlarm, ignoreClusterReport, temperature} from 'src/lib/modernExtend';
import {modernExtend as tuyaModernExtend} from 'src/lib/tuya';
const {tuyaMagicPacket, tuyaOnOffAction} = tuyaModernExtend;

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
        fingerprint: [{modelID: 'TS0041', manufacturerName: '_TYZB01_ub7urdza'}],
        model: 'SBDV-00032',
        vendor: 'Sber',
        description: 'Smart button',
        extend: [
            tuyaMagicPacket(),
            tuyaOnOffAction(),
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
    // Sber SBDV-00154 Smart leak sensor (fingerprint unknown)
];

export default definitions;
module.exports = definitions;
