const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['SCM-2_00.00.03.15', 'SCM-R_00.00.03.15TC', 'SCM_00.00.03.14TC', 'SCM_00.00.03.05TC'],
        model: 'SCM-S1',
        vendor: 'Blaupunkt',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
            try {
                await reporting.brightness(endpoint);
            } catch (e) {
                // Some version don't support this: https://github.com/Koenkk/zigbee2mqtt/issues/4246
            }
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },
    {
        zigbeeModel: ['TMSTB_00.00.03.07TC'],
        model: 'TMST-S1',
        vendor: 'Blaupunkt',
        description: 'Blaupunkt Smart Thermostat TMST-S1',
        fromZigbee: [fz.thermostat, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_programming_operation_mode,
        ],
        exposes: [
            e.programming_operation_mode(),
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 9, 30, 1)
                .withSetpoint('occupied_cooling_setpoint', 11, 32, 1)
                .withSetpoint('unoccupied_heating_setpoint', 9, 30, 1)
                .withSetpoint('unoccupied_cooling_setpoint', 11, 32, 1)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat', 'cool', 'auto'])
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genTime', 'genPowerCfg', 'genIdentify', 'hvacThermostat', 'hvacFanCtrl']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
        },
    },
];
