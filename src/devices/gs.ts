import {Definition} from '../lib/types';
import {
    light, onOff, electricityMeter, iasZoneAlarm,
    temperature, humidity, battery, ignoreClusterReport, iasWarning, identify,
} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['BRHM8E27W70-I1'],
        model: 'BRHM8E27W70-I1',
        vendor: 'GS',
        description: 'Smart color light bulb',
        extend: [
            light({colorTemp: {range: undefined}, color: true}),
            identify(),
        ],
    },
    {
        zigbeeModel: ['BDHM8E27W70-I1'],
        model: 'BDHM8E27W70-I1',
        vendor: 'GS',
        description: 'Smart light bulb',
        extend: [
            light({colorTemp: {range: [153, 370]}}),
            identify(),
        ],
    },
    {
        zigbeeModel: ['SGMHM-I1'],
        model: 'SGMHM-I1',
        vendor: 'GS',
        description: 'Methane gas sensor',
        extend: [iasZoneAlarm({zoneType: 'gas', zoneAttributes: ['alarm_2']})],
    },
    {
        zigbeeModel: ['SGPHM-I1'],
        model: 'SGPHM-I1',
        vendor: 'GS',
        description: 'Propane gas sensor',
        extend: [iasZoneAlarm({zoneType: 'gas', zoneAttributes: ['alarm_2']})],
    },
    {
        zigbeeModel: ['SKHMP30-I1'],
        model: 'SKHMP30-I1',
        vendor: 'GS',
        description: 'Smart socket',
        extend: [
            onOff({powerOnBehavior: false}),
            electricityMeter(),
            identify(),
        ],
    },
    {
        zigbeeModel: ['SMHM-I1'],
        model: 'SMHM-I1',
        vendor: 'GS',
        description: 'Motion sensor',
        extend: [
            iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({voltageToPercentage: '3V_2500', voltage: true}),
        ],
    },
    {
        zigbeeModel: ['SOHM-I1'],
        model: 'SOHM-I1',
        vendor: 'GS',
        description: 'Open and close sensor',
        extend: [
            iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({voltage: true}),
        ],
    },
    {
        zigbeeModel: ['SRHMP-I1'],
        model: 'SRHMP-I1',
        vendor: 'GS',
        description: 'Siren',
        meta: {disableDefaultResponse: true},
        extend: [
            ignoreClusterReport({cluster: 'genBasic'}),
            iasWarning(),
            battery(),
        ],
    },
    {
        zigbeeModel: ['SSHM-I1'],
        model: 'SSHM-I1',
        vendor: 'GS',
        description: 'Smoke detector',
        extend: [
            iasZoneAlarm({zoneType: 'smoke', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery(),
        ],
    },
    {
        zigbeeModel: ['STHM-I1H'],
        model: 'STHM-I1H',
        vendor: 'GS',
        description: 'Temperature and humidity sensor',
        extend: [
            temperature(),
            humidity(),
            battery({voltageToPercentage: '3V_2500', voltage: true}),
        ],
    },
    {
        zigbeeModel: ['SWHM-I1'],
        model: 'SWHM-I1',
        vendor: 'GS',
        description: 'Water leakage sensor',
        extend: [
            iasZoneAlarm({zoneType: 'water_leak', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({voltage: true}),
        ],
    },
];

export default definitions;
module.exports = definitions;
