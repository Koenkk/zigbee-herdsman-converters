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
    'swing': 5,
};

const energyMode = {
    'eco': 0,
    'normal': 1,
    'powerful': 2,
};

const tzLocal = {
    quiet_fan: {
        key: ['quiet_fan'],
        convertSet: async (entity, key, value, meta) => {
            assert(typeof value === 'boolean');
            // todo: failed (Status 'UNSUPPORTED_ATTRIBUTE')
            await entity.write('hvacFanCtrl', {0x1000: {value: 1, type: 0x10}});
            return {state: {quiet_fan: value}};
        },
    },
    ac_louver_position: {
        key: ['ac_louver_position'],
        convertSet: async (entity, key, value, meta) => {
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(thermostatPositions));
            const index = thermostatPositions[value];
            if (index === 5) {
                // todo: failed (Status 'UNSUPPORTED_ATTRIBUTE')
                await entity.write('hvacFanCtrl', {0x4274: {value: 1, type: 0x10}});
            } else {
                // todo: failed (Status 'UNSUPPORTED_ATTRIBUTE')
                await entity.write('hvacFanCtrl', {0x4274: {value: 0, type: 0x10}});
                // todo: failed (Status 'UNSUPPORTED_ATTRIBUTE')
                await entity.write('hvacFanCtrl', {0x4273: {value: index, type: 0x04}});
            }
            return {state: {ac_louver_position: value}};
        },
    },
    energy_mode: {
        key: ['energy_mode'],
        convertSet: async (entity, key, value, meta) => {
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(energyMode));
            const index = energyMode[value];
            switch (index) {
            case energyMode.eco:
                await entity.write('hvacThermostat', {'programingOperMode': 4});
                // todo: failed (Status 'UNSUPPORTED_ATTRIBUTE')
                await entity.write('hvacThermostat', {0x4270: {value: 0, type: 0x10}});
                break;
            case energyMode.normal:
                await entity.write('hvacThermostat', {'programingOperMode': 0});
                // todo: failed (Status 'UNSUPPORTED_ATTRIBUTE')
                await entity.write('hvacThermostat', {0x4270: {value: 0, type: 0x10}});
                break;
            case energyMode.powerful:
                await entity.write('hvacThermostat', {'programingOperMode': 0});
                // todo: failed (Status 'UNSUPPORTED_ATTRIBUTE')
                await entity.write('hvacThermostat', {0x4270: {value: 1, type: 0x10}});
                break;
            }
            return {state: {energy_mode: value}};
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
        tzLocal.quiet_fan,
        tzLocal.ac_louver_position,
        tzLocal.energy_mode,
        tz.thermostat_local_temperature,
        tz.fan_mode,
        tz.thermostat_occupied_heating_setpoint,
        tz.thermostat_occupied_cooling_setpoint,
        tz.thermostat_system_mode,
        tz.thermostat_programming_operation_mode,
        tz.thermostat_weekly_schedule,
    ],
    exposes: [
        e.programming_operation_mode(),
        exposes.climate()
            .withLocalTemperature()
            .withSetpoint('occupied_cooling_setpoint', 18, 30, 0.5)
            .withSetpoint('occupied_heating_setpoint', 16, 30, 0.5)
            .withSystemMode(['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'])
            .withFanMode(['low', 'medium', 'high', 'auto']),
        exposes.binary('quiet_fan', ea.STATE_SET, true, false).withDescription('Fan quiet mode'),
        exposes.enum('ac_louver_position', ea.STATE_SET, Object.keys(thermostatPositions))
            .withDescription('Ac louver position of this device'),
        exposes.enum('energy_mode', ea.STATE_SET, Object.keys(energyMode)),
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
