import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import {light, onOff, electricityMeter, iasZoneAlarm, temperature, humidity, battery, ignoreClusterReport} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['BRHM8E27W70-I1'],
        model: 'BRHM8E27W70-I1',
        vendor: 'GS',
        description: 'Smart color light bulb',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['BDHM8E27W70-I1'],
        model: 'BDHM8E27W70-I1',
        vendor: 'GS',
        description: 'Smart light bulb',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['SGMHM-I1'],
        model: 'SGMHM-I1',
        vendor: 'GS',
        description: 'Methane gas sensor',
        extend: [iasZoneAlarm({zoneType: 'gas', zoneAttributes: ['alarm_2', 'tamper', 'battery_low']})],
    },
    {
        zigbeeModel: ['SGPHM-I1'],
        model: 'SGPHM-I1',
        vendor: 'GS',
        description: 'Propane gas sensor',
        extend: [iasZoneAlarm({zoneType: 'gas', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']})],
    },
    {
        zigbeeModel: ['SKHMP30-I1'],
        model: 'SKHMP30-I1',
        vendor: 'GS',
        description: 'Smart socket',
        extend: [onOff({powerOnBehavior: false}), electricityMeter()],
    },
    {
        zigbeeModel: ['SMHM-I1', 'PIR_TPV12'],
        model: 'SMHM-I1',
        vendor: 'GS',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
        extend: [battery({voltageToPercentage: '3V_2500', batteryAlarm: false})],
    },
    {
        zigbeeModel: ['SOHM-I1'],
        model: 'SOHM-I1',
        vendor: 'GS',
        description: 'Open and close sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        extend: [battery({batteryAlarm: false})],
    },
    {
        zigbeeModel: ['SRHMP-I1'],
        model: 'SRHMP-I1',
        vendor: 'GS',
        description: 'Siren',
        toZigbee: [tz.warning],
        meta: {disableDefaultResponse: true},
        exposes: [e.warning()],
        extend: [
            battery({batteryAlarm: false}),
            ignoreClusterReport({cluster: 'genBasic'}),
        ],
    },
    {
        zigbeeModel: ['SSHM-I1'],
        model: 'SSHM-I1',
        vendor: 'GS',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1],
        exposes: [e.smoke(), e.battery_low(), e.tamper()],
        extend: [battery({batteryAlarm: false})],
    },
    {
        zigbeeModel: ['STHM-I1H'],
        model: 'STHM-I1H',
        vendor: 'GS',
        description: 'Temperature and humidity sensor',
        extend: [
            temperature(),
            humidity(),
            battery({voltageToPercentage: '3V_2500', batteryAlarm: false}),
        ],
    },
    {
        zigbeeModel: ['SWHM-I1'],
        model: 'SWHM-I1',
        vendor: 'GS',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
        extend: [battery({batteryAlarm: false})],
    },
];

export default definitions;
module.exports = definitions;
