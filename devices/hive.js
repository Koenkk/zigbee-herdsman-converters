const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const {extendDevice} = require('../lib/utils');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['MOT003'],
        model: 'MOT003',
        vendor: 'Hive',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report,
            fz.ignore_iaszone_statuschange, fz.ignore_iaszone_attreport],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(6);
            const binds = ['msTemperatureMeasurement', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['DWS003'],
        model: 'DWS003',
        vendor: 'Hive',
        description: 'Contact sensor',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(6);
            const binds = ['msTemperatureMeasurement', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FWBulb01'],
        model: 'HALIGHTDIMWWE27',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (E27)',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FWCLBulb01UK'],
        model: 'HALIGHTDIMWWE14',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (E14)',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FWBulb02UK'],
        model: 'HALIGHTDIMWWB22',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (B22)',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TWBulb02UK'],
        model: 'HV-GSCXZB229B',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (E27 & B22)',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TWCLBulb01UK'],
        model: 'HV-CE14CXZB6',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (E14)',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['SLP2', 'SLP2b', 'SLP2c'],
        model: '1613V',
        vendor: 'Hive',
        description: 'Active plug',
        fromZigbee: [fz.on_off, fz.metering, fz.temperature],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy(), e.temperature()],
    },
    {
        zigbeeModel: ['TWBulb01US'],
        model: 'HV-GSCXZB269',
        vendor: 'Hive',
        description: 'Active light cool to warm white (E26) ',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TWBulb01UK'],
        model: 'HV-GSCXZB279_HV-GSCXZB229_HV-GSCXZB229K',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (E27 & B22)',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TWGU10Bulb01UK'],
        model: 'HV-GUCXZB5',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (GU10)',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['KEYPAD001'],
        model: 'KEYPAD001',
        vendor: 'Hive',
        description: 'Alarm security keypad',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.command_arm_with_transaction, fz.command_panic, fz.battery, fz.ias_occupancy_alarm_1, fz.identify,
            fz.ias_contact_alarm_1, fz.ias_ace_occupancy_with_timeout],
        toZigbee: [tz.arm_mode],
        exposes: [e.battery(), e.battery_voltage(), e.battery_low(), e.occupancy(), e.tamper(), e.contact(),
            exposes.numeric('action_code', ea.STATE).withDescription('Pin code introduced.'),
            exposes.numeric('action_transaction', ea.STATE).withDescription('Last action transaction number.'),
            exposes.text('action_zone', ea.STATE).withDescription('Alarm zone. Default value 23'),
            e.action([
                'panic', 'disarm', 'arm_day_zones', 'arm_all_zones', 'exit_delay', 'entry_delay'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['genPowerCfg', 'ssIasZone', 'ssIasAce', 'genIdentify'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.batteryVoltage(endpoint);
        },
        onEvent: async (type, data, device) => {
            if (data.type === 'commandGetPanelStatus' && data.cluster === 'ssIasAce') {
                const payload = {
                    panelstatus: globalStore.getValue(data.endpoint, 'panelStatus'),
                    secondsremain: 0x00, audiblenotif: 0x00, alarmstatus: 0x00,
                };
                await data.endpoint.commandResponse(
                    'ssIasAce', 'getPanelStatusRsp', payload, {}, data.meta.zclTransactionSequenceNumber,
                );
            }
        },
    },
    extendDevice(require('./danfoss'), '014G2461', {
        zigbeeModel: ['TRV001'],
        model: 'UK7004240',
        vendor: 'Hive',
        description: 'Radiator valve based on Danfoss Ally (014G2461)',
    }),
    {
        zigbeeModel: ['SLR1'],
        model: 'SLR1',
        vendor: 'Hive',
        description: 'Heating thermostat',
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display')],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            const binds = ['genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ['SLR1b'],
        model: 'SLR1b',
        vendor: 'Hive',
        description: 'Heating thermostat',
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display')],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            const binds = ['genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ['SLR1c'],
        model: 'SLR1c',
        vendor: 'Hive',
        description: 'Heating thermostat',
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display')],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            const binds = ['genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ['SLR2'],
        model: 'SLR2',
        vendor: 'Hive',
        description: 'Dual channel heating and hot water thermostat',
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        endpoint: (device) => {
            return {'heat': 5, 'water': 6};
        },
        meta: {disableDefaultResponse: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const heatEndpoint = device.getEndpoint(5);
            const waterEndpoint = device.getEndpoint(6);
            const binds = [
                'genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat',
            ];
            await reporting.bind(heatEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(heatEndpoint);
            await reporting.thermostatRunningState(heatEndpoint);
            await reporting.thermostatSystemMode(heatEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint);
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatRunningState(waterEndpoint);
            await reporting.thermostatSystemMode(waterEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint);
        },
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('heat'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat').withEndpoint('heat'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display').withEndpoint('heat'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 22, 22, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('water'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat').withEndpoint('water'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display').withEndpoint('water')],
    },
    {
        zigbeeModel: ['SLR2b'],
        model: 'SLR2b',
        vendor: 'Hive',
        description: 'Dual channel heating and hot water thermostat',
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        endpoint: (device) => {
            return {'heat': 5, 'water': 6};
        },
        meta: {disableDefaultResponse: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const heatEndpoint = device.getEndpoint(5);
            const waterEndpoint = device.getEndpoint(6);
            const binds = [
                'genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat',
            ];
            await reporting.bind(heatEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(heatEndpoint);
            await reporting.thermostatRunningState(heatEndpoint);
            await reporting.thermostatSystemMode(heatEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint);
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatRunningState(waterEndpoint);
            await reporting.thermostatSystemMode(waterEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint);
        },
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('heat'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat').withEndpoint('heat'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display').withEndpoint('heat'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 22, 22, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('water'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat').withEndpoint('water'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display').withEndpoint('water')],
    },
    {
        zigbeeModel: ['SLR2c'],
        model: 'SLR2c',
        vendor: 'Hive',
        description: 'Dual channel heating and hot water thermostat',
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        endpoint: (device) => {
            return {'heat': 5, 'water': 6};
        },
        meta: {disableDefaultResponse: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const heatEndpoint = device.getEndpoint(5);
            const waterEndpoint = device.getEndpoint(6);
            const binds = [
                'genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat',
            ];
            await reporting.bind(heatEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(heatEndpoint);
            await reporting.thermostatRunningState(heatEndpoint);
            await reporting.thermostatSystemMode(heatEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint);
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatRunningState(waterEndpoint);
            await reporting.thermostatSystemMode(waterEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint);
        },
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('heat'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat').withEndpoint('heat'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display').withEndpoint('heat'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 22, 22, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('water'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.' +
                    ' Must be set to `false` when system_mode = off or `true` for heat').withEndpoint('water'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Period in minutes for which the setpoint hold will be active. 65535 = attribute not' +
                    ' used. 0 to 360 to match the remote display').withEndpoint('water')],
    },
    {
        zigbeeModel: ['WPT1'],
        model: 'WPT1',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SLT2'],
        model: 'SLT2',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['SLT3'],
        model: 'SLT3',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SLT3B'],
        model: 'SLT3B',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SLT3C'],
        model: 'SLT3C',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SLB2'],
        model: 'SLB2',
        vendor: 'Hive',
        description: 'Signal booster',
        toZigbee: [],
        fromZigbee: [fz.linkquality_from_basic],
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await device.endpoints[0].read('genBasic', ['zclVersion']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 1000 * 60 * 30); // Every 30 minutes
                globalStore.putValue(device, 'interval', interval);
            }
        },
        exposes: [],
    },
];
