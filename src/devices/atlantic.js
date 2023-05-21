const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const utils = require('../lib/utils');
const assert = require('assert');
const e = exposes.presets;
const ea = exposes.access;


const thermostatPositions = {
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
            await entity.write('hvacFanCtrl', {0x1000: {value: value ? 1 : 0, type: 0x10}}, {manufacturerCode: 0x125b});
            return {state: {quiet_fan: value}};
        },
    },
    ac_louver_position: {
        key: ['ac_louver_position'],
        convertSet: async (entity, key, value, meta) => {
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(thermostatPositions));
            const index = thermostatPositions[value];
            await entity.write('hvacThermostat', {0x4273: {value: index, type: 0x30}}, {manufacturerCode: 0x125b});
            return {state: {ac_louver_position: value}};
        },
    },
    preset: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            value = value.toLowerCase();
            utils.validateValue(value, ['activity', 'boost', 'eco', 'none']);
            const activity = value === 'activity' ? 1 : 0;
            const boost = value === 'boost' ? 1 : 0;
            const eco = value === 'eco' ? 4 : 0;

            await entity.write('hvacThermostat', {0x4275: {value: activity, type: 0x30}}, {manufacturerCode: 0x125b});
            await entity.write('hvacThermostat', {'programingOperMode': eco});
            await entity.write('hvacThermostat', {0x4270: {value: boost, type: 0x10}}, {manufacturerCode: 0x125b});

            return {state: {preset: value}};
        },
    },
    swingMode: {
        key: ['swing_mode'],
        convertSet: async (entity, key, value, meta) => {
            value = value.toLowerCase();
            utils.validateValue(value, ['on', 'off']);
            await entity.write('hvacThermostat', {0x4274: {value: value === 'on' ? 1 : 0, type: 0x10}}, {manufacturerCode: 0x125b});
            return {state: {swing_mode: value}};
        },
    },
};

module.exports = [{
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
        exposes.climate()
            .withLocalTemperature()
            .withSetpoint('occupied_cooling_setpoint', 18, 30, 0.5)
            .withSetpoint('occupied_heating_setpoint', 16, 30, 0.5)
            .withSystemMode(['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'])
            .withPreset(['activity', 'boost', 'eco'])
            .withFanMode(['low', 'medium', 'high', 'auto'])
            .withSwingMode(['on', 'off'], ea.STATE_SET),
        exposes.binary('quiet_fan', ea.STATE_SET, true, false).withDescription('Fan quiet mode'),
        exposes.enum('ac_louver_position', ea.STATE_SET, Object.keys(thermostatPositions))
            .withDescription('Ac louver position of this device'),
    ],
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint1 = device.getEndpoint(1);
        const binds1 = ['hvacFanCtrl', 'genIdentify', 'hvacFanCtrl', 'hvacThermostat', 'manuSpecificPhilips2'];
        await reporting.bind(endpoint1, coordinatorEndpoint, binds1);
        await reporting.thermostatTemperature(endpoint1);
        await reporting.thermostatOccupiedCoolingSetpoint(endpoint1);
        await reporting.thermostatSystemMode(endpoint1);

        const endpoint232 = device.getEndpoint(232);
        await reporting.bind(endpoint232, coordinatorEndpoint, ['haDiagnostic']);
    },
}];
