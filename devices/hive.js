const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
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
        zigbeeModel: ['TRV001'],
        model: 'UK7004240',
        vendor: 'Hive',
        description: 'Radiator valve based on Danfos Ally',
        fromZigbee: [fz.battery, fz.thermostat, fz.hvac_user_interface, fz.danfoss_thermostat],
        toZigbee: [tz.danfoss_thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature, tz.danfoss_mounted_mode_active,
            tz.danfoss_mounted_mode_control, tz.danfoss_thermostat_vertical_orientation, tz.danfoss_algorithm_scale_factor,
            tz.danfoss_heat_available, tz.danfoss_heat_required, tz.danfoss_day_of_week, tz.danfoss_trigger_time,
            tz.danfoss_window_open_internal, tz.danfoss_window_open_external, tz.danfoss_load_estimate,
            tz.danfoss_viewing_direction, tz.thermostat_keypad_lockout, tz.thermostat_system_mode],
        exposes: [e.battery(), e.keypad_lockout(),
            exposes.binary('mounted_mode_active', ea.STATE_GET, true, false)
                .withDescription('Is the unit in mounting mode. This is set to `false` for mounted (already on ' +
                    'the radiator) or `true` for not mounted (after factory reset)'),
            exposes.binary('mounted_mode_control', ea.ALL, true, false)
                .withDescription('Set the unit mounting mode. `false` Go to Mounted Mode or `true` Go to Mounting Mode'),
            exposes.binary('thermostat_vertical_orientation', ea.ALL, true, false)
                .withDescription('Thermostat Orientation. This is important for the PID in how it assesses temperature. ' +
                    '`false` Horizontal or `true` Vertical'),
            exposes.numeric('viewing_direction', ea.ALL).withValueMin(0).withValueMax(1)
                .withDescription('Viewing/Display Direction. `0` Horizontal or `1` Vertical'),
            exposes.binary('heat_available', ea.ALL, true, false)
                .withDescription('Not clear how this affects operation. `false` No Heat Available or `true` Heat Available'),
            exposes.binary('heat_required', ea.STATE_GET, true, false)
                .withDescription('Whether or not the unit needs warm water. `false` No Heat Request or `true` Heat Request'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature().withPiHeatingDemand()
                .withSystemMode(['heat']),
            exposes.numeric('window_open_internal', ea.STATE_GET).withValueMin(0).withValueMax(4)
                .withDescription('0=Quarantine, 1=Windows are closed, 2=Hold - Windows are maybe about to open, ' +
                    '3=Open window detected, 4=In window open state from external but detected closed locally'),
            exposes.binary('window_open_external', ea.ALL, true, false)
                .withDescription('Set if the window is open or close. This setting will trigger a change in the internal ' +
                    'window and heating demand. `false` (windows are closed) or `true` (windows are open)'),
            exposes.enum('day_of_week', ea.ALL,
                ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'away_or_vacation'])
                .withDescription('Exercise day of week: 0=Sun...6=Sat, 7=undefined'),
            exposes.numeric('trigger_time', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Exercise trigger time. Minutes since midnight (65535=undefined). Range 0 to 1439'),
            exposes.numeric('algorithm_scale_factor', ea.ALL).withValueMin(1).withValueMax(10)
                .withDescription('Scale factor of setpoint filter timeconstant ("aggressiveness" of control algorithm) '+
                    '1= Quick ...  5=Moderate ... 10=Slow'),
            exposes.numeric('load_estimate', ea.STATE_GET)
                .withDescription('Load estimate on this radiator')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x1246};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);

            // standard ZCL attributes
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});

            // danfoss attributes
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'danfossMountedModeActive',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: 43200,
                reportableChange: 1,
            }], options);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'danfossWindowOpenInternal',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], options);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'danfossHeatRequired',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.MINUTES_10,
                reportableChange: 1,
            }], options);

            await endpoint.read('hvacThermostat', [
                'danfossWindowOpenExternal',
                'danfossDayOfWeek',
                'danfossTriggerTime',
                'danfossAlgorithmScaleFactor',
                'danfossHeatAvailable',
                'danfossMountedModeControl',
                'danfossMountedModeActive',
            ], options);
            // read keypadLockout, we don't need reporting as it cannot be set physically on the device
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);

            // Seems that it is bug in Danfoss, device does not asks for the time with binding
            // So, we need to write time during configure (same as for HEIMAN devices)
            const time = Math.round(((new Date()).getTime() - constants.OneJanuary2000) / 1000);
            // Time-master + synchronised
            const values = {timeStatus: 3, time: time, timeZone: ((new Date()).getTimezoneOffset() * -1) * 60};
            endpoint.write('genTime', values);
        },
    },
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
                .withDescription('Set if the occupied_heating_setpoint is active or not. Must be set to `false` when system_mode off' +
                    ' or `true` for all other system_modes'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Set the duration of the setpoint. Used in boost. Minutes remaining (65535 used when system_mode = heat)' +
                    '. Range 0 to 360')],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            const binds = ['genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatRunningState(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatSystemMode(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatTemperatureSetpointHold(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
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
                .withDescription('Set if the occupied_heating_setpoint is active or not. Must be set to `false` when system_mode off' +
                    ' or `true` for all other system_modes'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Set the duration of the setpoint. Used in boost. Minutes remaining (65535 used when system_mode = heat)' +
                    '. Range 0 to 360')],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            const binds = ['genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatRunningState(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatSystemMode(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatTemperatureSetpointHold(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
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
            await reporting.thermostatTemperature(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatRunningState(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatSystemMode(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatRunningState(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatSystemMode(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
        },
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('heat'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false).withEndpoint('heat')
                .withDescription('Set if the occupied_heating_setpoint is active or not. Must be set to `false` when system_mode off' +
                    ' or `true` for all other system_modes'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Set the duration of the setpoint. Used in boost. Minutes remaining (65535 used when system_mode = heat)' +
                    '. Range 0 to 360').withEndpoint('heat'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 22, 22, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('water'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false).withEndpoint('water')
                .withDescription('Set if the occupied_heating_setpoint is active or not. Must be set to `false` when system_mode off' +
                    ' or `true` for all other system_modes'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Set the duration of the setpoint. Used in boost. Minutes remaining (65535 used when system_mode = heat)' +
                    '. Range 0 to 360').withEndpoint('water')],
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
            await reporting.thermostatTemperature(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatRunningState(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatSystemMode(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatRunningState(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatSystemMode(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 5});
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint, {min: 0, max: constants.repInterval.HOUR, change: 1});
        },
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('heat'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false).withEndpoint('heat')
                .withDescription('Set if the occupied_heating_setpoint is active or not. Must be set to `false` when system_mode off' +
                    ' or `true` for all other system_modes'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Set the duration of the setpoint. Used in boost. Minutes remaining (65535 used when system_mode = heat)' +
                    '. Range 0 to 360').withEndpoint('heat'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 22, 22, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withEndpoint('water'),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false).withEndpoint('water')
                .withDescription('Set if the occupied_heating_setpoint is active or not. Must be set to `false` when system_mode off' +
                    ' or `true` for all other system_modes'),
            exposes.numeric('temperature_setpoint_hold_duration', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Set the duration of the setpoint. Used in boost. Minutes remaining (65535 used when system_mode = heat)' +
                    '. Range 0 to 360').withEndpoint('water')],
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
