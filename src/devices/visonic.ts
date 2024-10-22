import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {battery, iasZoneAlarm, temperature} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['MP-840'],
        model: 'MP-840',
        vendor: 'Visonic',
        description: 'Long range pet immune PIR motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery_voltage(), e.linkquality(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['MP-841'],
        model: 'MP-841',
        vendor: 'Visonic',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['MCT-370 SMA'],
        model: 'MCT-370 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['MCT-350 SMA'],
        model: 'MCT-350 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
    },
    {
        zigbeeModel: ['MCT-340 E'],
        model: 'MCT-340 E',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery, fz.ignore_zclversion_read],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['MCT-340 SMA'],
        model: 'MCT-340 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery, fz.ignore_zclversion_read],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['GB-540'],
        model: 'GB-540',
        vendor: 'Visonic',
        description: 'Glass break detector',
        fromZigbee: [fz.ias_vibration_alarm_1],
        toZigbee: [],
        exposes: [e.vibration(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['MCT-302 SMA'],
        model: 'MCT-302 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact senso',
        extend: [temperature(), battery(), iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']})],
    },
];

export default definitions;
module.exports = definitions;
