import {Zcl} from 'zigbee-herdsman';
import {Definition, KeyValue, Tz} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import assert from 'assert';
const e = exposes.presets;
const ea = exposes.access;


const thermostatPositions: KeyValue = {
    'quarter_open': 1,
    'half_open': 2,
    'three_quarters_open': 3,
    'fully_open': 4,
};

const tzLocal = {
    quiet_fan: {
        key: ['quiet_fan'],
        convertSet: async (entity, key, value, meta) => {
            assert(typeof value === 'boolean');
            await entity.write('hvacFanCtrl', {0x1000: {value: value ? 1 : 0, type: 0x10}}, {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP});
            return {state: {quiet_fan: value}};
        },
    } satisfies Tz.Converter,
    ac_louver_position: {
        key: ['ac_louver_position'],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, 'ac_louver_position');
            utils.validateValue(value, Object.keys(thermostatPositions));
            const index = thermostatPositions[value.toLowerCase()];
            await entity.write('hvacThermostat', {0x4273: {value: index, type: 0x30}}, {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP});
            return {state: {ac_louver_position: value}};
        },
    } satisfies Tz.Converter,
    preset: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, 'preset');
            value = value.toLowerCase();
            utils.validateValue(value, ['activity', 'boost', 'eco', 'none']);
            const activity = value === 'activity' ? 1 : 0;
            const boost = value === 'boost' ? 1 : 0;
            const eco = value === 'eco' ? 4 : 0;

            await entity.write('hvacThermostat', {0x4275: {value: activity, type: 0x30}}, {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP});
            await entity.write('hvacThermostat', {'programingOperMode': eco});
            await entity.write('hvacThermostat', {0x4270: {value: boost, type: 0x10}}, {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP});

            return {state: {preset: value}};
        },
    } satisfies Tz.Converter,
    swingMode: {
        key: ['swing_mode'],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, 'swing_mode');
            value = value.toLowerCase();
            utils.validateValue(value, ['on', 'off']);
            await entity.write(
                'hvacThermostat',
                {0x4274: {value: value === 'on' ? 1 : 0, type: 0x10}},
                {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP},
            );
            return {state: {swing_mode: value}};
        },
    } satisfies Tz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['Adapter Zigbee FUJITSU'],
        model: 'GW003-AS-IN-TE-FC',
        vendor: 'Atlantic Group',
        description: 'Interface Naviclim for Takao air conditioners',
        fromZigbee: [
            fz.thermostat,
            fz.fan,
        ],
        toZigbee: [
            tzLocal.ac_louver_position,
            tzLocal.preset,
            tzLocal.quiet_fan,
            tzLocal.swingMode,
            tz.fan_mode,
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_programming_operation_mode,
            tz.thermostat_system_mode,
        ],
        exposes: [
            e.programming_operation_mode(),
            e.climate()
                .withLocalTemperature()
                .withSetpoint('occupied_cooling_setpoint', 18, 30, 0.5)
                .withSetpoint('occupied_heating_setpoint', 16, 30, 0.5)
                .withSystemMode(['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'])
                .withPreset(['activity', 'boost', 'eco'])
                .withFanMode(['low', 'medium', 'high', 'auto'])
                .withSwingMode(['on', 'off'], ea.STATE_SET),
            e.binary('quiet_fan', ea.STATE_SET, true, false).withDescription('Fan quiet mode'),
            e.enum('ac_louver_position', ea.STATE_SET, Object.keys(thermostatPositions))
                .withDescription('Ac louver position of this device'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const binds1 = ['hvacFanCtrl', 'genIdentify', 'hvacFanCtrl', 'hvacThermostat', 'manuSpecificPhilips2'];
            await reporting.bind(endpoint1, coordinatorEndpoint, binds1);
            await reporting.thermostatTemperature(endpoint1);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint1);
            await reporting.thermostatSystemMode(endpoint1);

            const endpoint232 = device.getEndpoint(232);
            await reporting.bind(endpoint232, coordinatorEndpoint, ['haDiagnostic']);
        },
    },
];

export default definitions;
module.exports = definitions;
