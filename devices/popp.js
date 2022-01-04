const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        // eT093WRO is the same as Hive TRV001 and Danfoss Ally (eTRV0100). If implementing anything, please consider
        // changing those two too.
        zigbeeModel: ['eT093WRO'],
        model: '701721',
        vendor: 'Popp',
        description: 'Smart thermostat',
        fromZigbee: [fz.battery, fz.thermostat, fz.thermostat_weekly_schedule, fz.hvac_user_interface, fz.danfoss_thermostat],
        toZigbee: [tz.danfoss_thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature, tz.danfoss_mounted_mode_active,
            tz.danfoss_mounted_mode_control, tz.danfoss_thermostat_vertical_orientation, tz.danfoss_algorithm_scale_factor,
            tz.danfoss_heat_available, tz.danfoss_heat_required, tz.danfoss_day_of_week, tz.danfoss_trigger_time,
            tz.danfoss_window_open_internal, tz.danfoss_window_open_external, tz.danfoss_load_estimate,
            tz.danfoss_viewing_direction, tz.danfoss_external_measured_room_sensor, tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode, tz.danfoss_load_balancing_enable, tz.danfoss_load_room_mean,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_programming_operation_mode],
        exposes: [e.battery(), e.keypad_lockout(), e.programming_operation_mode(),
            exposes.binary('mounted_mode_active', ea.STATE_GET, true, false)
                .withDescription('Is the unit in mounting mode. This is set to `false` for mounted (already on ' +
                    'the radiator) or `true` for not mounted (after factory reset)'),
            exposes.binary('mounted_mode_control', ea.ALL, true, false)
                .withDescription('Set the unit mounting mode. `false` Go to Mounted Mode or `true` Go to Mounting Mode'),
            exposes.binary('thermostat_vertical_orientation', ea.ALL, true, false)
                .withDescription('Thermostat Orientation. This is important for the PID in how it assesses temperature. ' +
                    '`false` Horizontal or `true` Vertical'),
            exposes.binary('viewing_direction', ea.ALL, true, false)
                .withDescription('Viewing/Display Direction. `false` Horizontal or `true` Vertical'),
            exposes.binary('heat_available', ea.ALL, true, false)
                .withDescription('Not clear how this affects operation. `false` No Heat Available or `true` Heat Available'),
            exposes.binary('heat_required', ea.STATE_GET, true, false)
                .withDescription('Whether or not the unit needs warm water. `false` No Heat Request or `true` Heat Request'),
            exposes.enum('setpoint_change_source', ea.STATE, ['manual', 'schedule', 'externally'])
                .withDescription('Values observed are `0` (manual), `1` (schedule) or `2` (externally)'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 32, 0.5).withLocalTemperature().withPiHeatingDemand()
                .withSystemMode(['heat']).withRunningState(['idle', 'heat'], ea.STATE),
            exposes.numeric('external_measured_room_sensor', ea.ALL)
                .withDescription('Set at maximum 3 hours interval but not more often than every 30 minutes and 0.1 ' +
                    'degrees difference. Resets every 3hours to standard. e.g. 21C = 2100 (-8000=undefined).')
                .withValueMin(-8000).withValueMax(3500),
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
            exposes.binary('load_balancing_enable', ea.ALL, true, false)
                .withDescription('Whether or not the thermostat acts as standalone thermostat or shares load with other ' +
                    'thermostats in the room. The gateway must update load_room_mean if enabled.'),
            exposes.numeric('load_room_mean', ea.ALL)
                .withDescription('Mean radiator load for room calculated by gateway for load balancing purposes (-8000=undefined)')
                .withValueMin(-8000).withValueMax(2000),
            exposes.numeric('load_estimate', ea.STATE_GET)
                .withDescription('Load estimate on this radiator')],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x1246};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);

            // standard ZCL attributes
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            // danfoss attributes
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'danfossMountedModeActive',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.MAX,
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
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], options);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'danfossExternalMeasuredRoomSensor',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.MAX,
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
                'danfossExternalMeasuredRoomSensor',
                'danfossLoadBalancingEnable',
                'danfossLoadRoomMean',
            ], options);

            // read systemMode to have an initial value
            await endpoint.read('hvacThermostat', ['systemMode']);

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
];
