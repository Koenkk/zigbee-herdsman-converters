import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {electricityMeter, onOff} from '../lib/modernExtend';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SPE600'],
        model: 'SPE600',
        vendor: 'Salus Controls',
        description: 'Smart plug (EU socket)',
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['SP600'],
        model: 'SP600',
        vendor: 'Salus Controls',
        description: 'Smart plug (UK socket)',
        extend: [onOff(), electricityMeter({cluster: 'metering', fzMetering: fz.SP600_power})],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['SX885ZB'],
        model: 'SX885ZB',
        vendor: 'Salus Controls',
        description: 'miniSmartPlug',
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['SR600'],
        model: 'SR600',
        vendor: 'Salus Controls',
        description: 'Relay switch',
        extend: [onOff({ota: ota.salus})],
    },
    {
        zigbeeModel: ['SW600'],
        model: 'SW600',
        vendor: 'Salus Controls',
        description: 'Door or window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['WLS600'],
        model: 'WLS600',
        vendor: 'Salus Controls',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['OS600'],
        model: 'OS600',
        vendor: 'Salus Controls',
        description: 'Door or window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['SS909ZB', 'PS600'],
        model: 'PS600',
        vendor: 'Salus Controls',
        description: 'Pipe temperature sensor',
        fromZigbee: [fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.battery(), e.temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        ota: ota.salus,
    },
    {
        zigbeeModel: ['RE600'],
        model: 'RE600',
        vendor: 'Salus Controls',
        description: 'Router Zigbee',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        ota: ota.salus,
    },
];

export default definitions;
module.exports = definitions;
