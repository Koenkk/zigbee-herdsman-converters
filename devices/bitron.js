const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['AV2010/34'],
        model: 'AV2010/34',
        vendor: 'Bitron',
        description: '4-Touch single click buttons',
        fromZigbee: [fz.ignore_power_report, fz.command_recall, fz.legacy.AV2010_34_click],
        toZigbee: [],
        exposes: [e.action(['recall_*'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['902010/22', 'IR_00.00.03.12TC'],
        model: 'AV2010/22',
        vendor: 'Bitron',
        description: 'Wireless motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
        whiteLabel: [{vendor: 'ClimaxTechnology', model: 'IR-9ZBS-SL'}],
    },
    {
        zigbeeModel: ['AV2010/22A'],
        model: 'AV2010/22A',
        vendor: 'Bitron',
        description: 'Wireless motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['902010/25'],
        model: 'AV2010/25',
        vendor: 'Bitron',
        description: 'Video wireless socket',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 10000, multiplier: 1});
        },
    },
    {
        zigbeeModel: ['902010/26'],
        model: 'AV2010/26',
        vendor: 'Bitron',
        description: 'Wireless socket and brightness regulator',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['902010/28'],
        model: '902010/128',
        vendor: 'Bitron',
        description: 'Home wireless socket',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['AV2010/29A'],
        model: 'AV2010/29A',
        vendor: 'Bitron',
        description: 'SMaBiT Zigbee outdoor siren',
        fromZigbee: [fz.ias_no_alarm],
        toZigbee: [tz.warning],
        exposes: [e.warning(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['902010/32'],
        model: 'AV2010/32',
        vendor: 'Bitron',
        description: 'Wireless wall thermostat with relay',
        fromZigbee: [fz.legacy.bitron_thermostat_att_report, fz.battery],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature_calibration, tz.thermostat_local_temperature,
            tz.thermostat_running_state, tz.thermostat_temperature_display_mode, tz.thermostat_system_mode],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat', 'cool']).withLocalTemperatureCalibration()],
        meta: {battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genPollCtrl', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 900, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatTemperatureCalibration(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.batteryAlarmState(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['902010/21A'],
        model: 'AV2010/21A',
        vendor: 'Bitron',
        description: 'Compact magnetic contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['902010/24A'],
        model: 'AV2010/24A',
        vendor: 'Bitron',
        description: 'Optical smoke detector (hardware version v2)',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [tz.warning],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['902010/24'],
        model: '902010/24',
        vendor: 'Bitron',
        description: 'Optical smoke detector (hardware version v1)',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [tz.warning],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['902010/29'],
        model: '902010/29',
        vendor: 'Bitron',
        description: 'Zigbee outdoor siren',
        fromZigbee: [fz.battery],
        toZigbee: [tz.warning],
        exposes: [e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['902010/23'],
        model: '902010/23',
        vendor: 'Bitron',
        description: '4 button Zigbee remote control',
        fromZigbee: [fz.ias_no_alarm, fz.command_on, fz.command_off, fz.command_step, fz.command_recall],
        toZigbee: [],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'recall_*']), e.battery_low()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBasic', 'genOnOff', 'genLevelCtrl']);
        },
    },
];
