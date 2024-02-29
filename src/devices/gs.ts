import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {light, onOff, electricityMeter, iasZoneAlarm, temperature, humidity} from '../lib/modernExtend';

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
        extend: [iasZoneAlarm({variant: 'alarm_2'})],
    },
    {
        zigbeeModel: ['SGPHM-I1'],
        model: 'SGPHM-I1',
        vendor: 'GS',
        description: 'Propane gas sensor',
        extend: [iasZoneAlarm({variant: 'alarm_1'})],
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
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage(), e.tamper()],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['SOHM-I1'],
        model: 'SOHM-I1',
        vendor: 'GS',
        description: 'Open and close sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['SRHMP-I1'],
        model: 'SRHMP-I1',
        vendor: 'GS',
        description: 'Siren',
        fromZigbee: [fz.battery, fz.ignore_basic_report],
        toZigbee: [tz.warning],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.warning()],
    },
    {
        zigbeeModel: ['SSHM-I1'],
        model: 'SSHM-I1',
        vendor: 'GS',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['STHM-I1H'],
        model: 'STHM-I1H',
        vendor: 'GS',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.battery],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery()],
        extend: [temperature(), humidity()],
    },
    {
        zigbeeModel: ['SWHM-I1'],
        model: 'SWHM-I1',
        vendor: 'GS',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
];

export default definitions;
module.exports = definitions;
