import {Zcl} from 'zigbee-herdsman';
import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as ota from '../lib/ota';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        // eTRV0100 is the same as Hive TRV001 and Popp eT093WRO. If implementing anything, please consider
        // changing those two too.
        zigbeeModel: ['eTRV0100', 'eTRV0101', 'eTRV0103', 'TRV001', 'TRV003', 'eT093WRO', 'eT093WRG', 'eTRV0103'],
        model: '014G2461',
        vendor: 'Danfoss',
        description: 'Ally thermostat',
        whiteLabel: [
            {vendor: 'Danfoss', model: '014G2463'},
            {vendor: 'Hive', model: 'UK7004240', description: 'Radiator valve', fingerprint: [{modelID: 'TRV001'}, {modelID: 'TRV003'}]},
            {vendor: 'Popp', model: '701721', description: 'Smart thermostat', fingerprint: [{modelID: 'eT093WRO'}, {modelID: 'eT093WRG'}]},
        ],
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        fromZigbee: [fz.battery, fz.thermostat, fz.thermostat_weekly_schedule, fz.hvac_user_interface,
            fz.danfoss_thermostat, fz.danfoss_thermostat_setpoint_scheduled],
        toZigbee: [tz.danfoss_thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature, tz.danfoss_mounted_mode_active,
            tz.danfoss_mounted_mode_control, tz.danfoss_thermostat_vertical_orientation, tz.danfoss_algorithm_scale_factor,
            tz.danfoss_heat_available, tz.danfoss_heat_required, tz.danfoss_day_of_week, tz.danfoss_trigger_time,
            tz.danfoss_window_open_internal, tz.danfoss_window_open_external, tz.danfoss_load_estimate,
            tz.danfoss_viewing_direction, tz.danfoss_external_measured_room_sensor, tz.danfoss_radiator_covered,
            tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.danfoss_load_balancing_enable, tz.danfoss_load_room_mean,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_programming_operation_mode,
            tz.danfoss_window_open_feature, tz.danfoss_preheat_status, tz.danfoss_adaptation_status, tz.danfoss_adaptation_settings,
            tz.danfoss_adaptation_control, tz.danfoss_regulation_setpoint_offset,
            tz.danfoss_thermostat_occupied_heating_setpoint_scheduled],
        exposes: (device, options) => {
            const maxSetpoint = ['TRV001', 'TRV003'].includes(device?.modelID) ? 32 : 35;
            return [
                e.linkquality(),
                e.battery(), e.keypad_lockout(), e.programming_operation_mode(),
                e.binary('mounted_mode_active', ea.STATE_GET, true, false)
                    .withDescription('Is the unit in mounting mode. This is set to `false` for mounted (already on ' +
                        'the radiator) or `true` for not mounted (after factory reset)'),
                e.binary('mounted_mode_control', ea.ALL, true, false)
                    .withDescription('Set the unit mounting mode. `false` Go to Mounted Mode or `true` Go to Mounting Mode'),
                e.binary('thermostat_vertical_orientation', ea.ALL, true, false)
                    .withDescription('Thermostat Orientation. This is important for the PID in how it assesses temperature. ' +
                        '`false` Horizontal or `true` Vertical'),
                e.binary('viewing_direction', ea.ALL, true, false)
                    .withDescription('Viewing/display direction, `false` normal or `true` upside-down'),
                e.binary('heat_available', ea.ALL, true, false)
                    .withDescription('Not clear how this affects operation. However, it would appear that the device does not execute any ' +
                        'motor functions if this is set to false. This may be a means to conserve battery during periods that the heating ' +
                        'system is not energized (e.g. during summer). `false` No Heat Available or `true` Heat Available'),
                e.binary('heat_required', ea.STATE_GET, true, false)
                    .withDescription('Whether or not the unit needs warm water. `false` No Heat Request or `true` Heat Request'),
                e.enum('setpoint_change_source', ea.STATE, ['manual', 'schedule', 'externally'])
                    .withDescription('Values observed are `0` (manual), `1` (schedule) or `2` (externally)'),
                e.climate().withSetpoint('occupied_heating_setpoint', 5, maxSetpoint, 0.5).withLocalTemperature().withPiHeatingDemand()
                    .withSystemMode(['heat']).withRunningState(['idle', 'heat'], ea.STATE),
                e.numeric('occupied_heating_setpoint_scheduled', ea.ALL)
                    .withValueMin(5).withValueMax(maxSetpoint).withValueStep(0.5).withUnit('°C')
                    .withDescription('Scheduled change of the setpoint. Alternative method for changing the setpoint. In the opposite ' +
                      'to occupied_heating_setpoint it does not trigger an aggressive response from the actuator. ' +
                      '(more suitable for scheduled changes)'),
                e.numeric('external_measured_room_sensor', ea.ALL)
                    .withDescription('The temperature sensor of the TRV is — due to its design — relatively close to the heat source ' +
                        '(i.e. the hot water in the radiator). Thus there are situations where the `local_temperature` measured by the ' +
                        'TRV is not accurate enough: If the radiator is covered behind curtains or furniture, if the room is rather big, or ' +
                        'if the radiator itself is big and the flow temperature is high, then the temperature in the room may easily diverge ' +
                        'from the `local_temperature` measured by the TRV by 5°C to 8°C. In this case you might choose to use an external ' +
                        'room sensor and send the measured value of the external room sensor to the `External_measured_room_sensor` property.' +
                        'The way the TRV operates on the `External_measured_room_sensor` depends on the setting of the `Radiator_covered` ' +
                        'property: If `Radiator_covered` is `false` (Auto Offset Mode): You *must* set the `External_measured_room_sensor` ' +
                        'property *at least* every 3 hours. After 3 hours the TRV disables this function and resets the value of the ' +
                        '`External_measured_room_sensor` property to -8000 (disabled). You *should* set the `External_measured_room_sensor` ' +
                        'property *at most* every 30 minutes or every 0.1K change in measured room temperature.' +
                        'If `Radiator_covered` is `true` (Room Sensor Mode): You *must* set the `External_measured_room_sensor` property *at ' +
                        'least* every 30 minutes. After 35 minutes the TRV disables this function and resets the value of the ' +
                        '`External_measured_room_sensor` property to -8000 (disabled). You *should* set the `External_measured_room_sensor` ' +
                        'property *at most* every 5 minutes or every 0.1K change in measured room temperature.')
                    .withValueMin(-8000).withValueMax(3500),
                e.binary('radiator_covered', ea.ALL, true, false)
                    .withDescription('Controls whether the TRV should solely rely on an external room sensor or operate in offset mode. ' +
                    '`false` = Auto Offset Mode (use this e.g. for exposed radiators) or `true` = Room Sensor Mode (use this e.g. for ' +
                    'covered radiators). Please note that this flag only controls how the TRV operates on the value of ' +
                    '`External_measured_room_sensor`; only setting this flag without setting the `External_measured_room_sensor` ' +
                    'has no (noticeable?) effect.'),
                e.binary('window_open_feature', ea.ALL, true, false)
                    .withDescription('Whether or not the window open feature is enabled'),
                e.enum('window_open_internal', ea.STATE_GET,
                    ['quarantine', 'closed', 'hold', 'open', 'external_open'])
                    .withDescription('0=Quarantine, 1=Windows are closed, 2=Hold - Windows are maybe about to open, ' +
                        '3=Open window detected, 4=In window open state from external but detected closed locally'),
                e.binary('window_open_external', ea.ALL, true, false)
                    .withDescription('Set if the window is open or close. This setting will trigger a change in the internal ' +
                        'window and heating demand. `false` (windows are closed) or `true` (windows are open)'),
                e.enum('day_of_week', ea.ALL,
                    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'away_or_vacation'])
                    .withDescription('Exercise day of week: 0=Sun...6=Sat, 7=undefined'),
                e.numeric('trigger_time', ea.ALL).withValueMin(0).withValueMax(65535)
                    .withDescription('Exercise trigger time. Minutes since midnight (65535=undefined). Range 0 to 1439'),
                e.numeric('algorithm_scale_factor', ea.ALL).withValueMin(1).withValueMax(10)
                    .withDescription('Scale factor of setpoint filter timeconstant ("aggressiveness" of control algorithm) '+
                        '1= Quick ...  5=Moderate ... 10=Slow'),
                e.binary('load_balancing_enable', ea.ALL, true, false)
                    .withDescription('Whether or not the thermostat acts as standalone thermostat or shares load with other ' +
                        'thermostats in the room. The gateway must update load_room_mean if enabled.'),
                e.numeric('load_room_mean', ea.ALL)
                    .withDescription('Mean radiator load for room calculated by gateway for load balancing purposes (-8000=undefined)')
                    .withValueMin(-8000).withValueMax(3600),
                e.numeric('load_estimate', ea.STATE_GET)
                    .withDescription('Load estimate on this radiator')
                    .withValueMin(-8000).withValueMax(3600),
                e.binary('preheat_status', ea.STATE_GET, true, false)
                    .withDescription('Specific for pre-heat running in Zigbee Weekly Schedule mode'),
                e.enum('adaptation_run_status', ea.STATE_GET, ['none', 'in_progress', 'found', 'lost'])
                    .withDescription('Status of adaptation run: None (before first run), In Progress, Valve Characteristic Found, ' +
                        'Valve Characteristic Lost'),
                e.binary('adaptation_run_settings', ea.ALL, true, false)
                    .withDescription('Automatic adaptation run enabled (the one during the night)'),
                e.enum('adaptation_run_control', ea.ALL, ['none', 'initiate_adaptation', 'cancel_adaptation'])
                    .withDescription('Adaptation run control: Initiate Adaptation Run or Cancel Adaptation Run'),
                e.numeric('regulation_setpoint_offset', ea.ALL)
                    .withDescription('Regulation SetPoint Offset in range -2.5°C to 2.5°C in steps of 0.1°C. Value 2.5°C = 25.')
                    .withValueMin(-25).withValueMax(25)];
        },
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S};
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
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'danfossAdaptionRunStatus',
                minimumReportInterval: constants.repInterval.MINUTE,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], options);

            try {
                await endpoint.configureReporting('hvacThermostat', [{
                    attribute: 'danfossPreheatStatus',
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.MAX,
                    reportableChange: 1,
                }], options);
            } catch (e) {
                /* not supported by all */
            }

            try {
                await endpoint.read('hvacThermostat', [
                    'danfossWindowOpenFeatureEnable',
                    'danfossWindowOpenExternal',
                    'danfossDayOfWeek',
                    'danfossTriggerTime',
                    'danfossAlgorithmScaleFactor',
                    'danfossHeatAvailable',
                    'danfossMountedModeControl',
                    'danfossMountedModeActive',
                    'danfossExternalMeasuredRoomSensor',
                    'danfossRadiatorCovered',
                    'danfossLoadBalancingEnable',
                    'danfossLoadRoomMean',
                    'danfossAdaptionRunControl',
                    'danfossAdaptionRunSettings',
                    'danfossRegulationSetpointOffset',
                ], options);
            } catch (e) {
                /* not supported by all https://github.com/Koenkk/zigbee2mqtt/issues/11872 */
            }

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
    {
        fingerprint: [
            {modelID: '0x8020', manufacturerName: 'Danfoss'}, // RT24V Display
            {modelID: '0x8021', manufacturerName: 'Danfoss'}, // RT24V Display  Floor sensor
            {modelID: '0x8030', manufacturerName: 'Danfoss'}, // RTbattery Display
            {modelID: '0x8031', manufacturerName: 'Danfoss'}, // RTbattery Display Infrared
            {modelID: '0x8034', manufacturerName: 'Danfoss'}, // RTbattery Dial
            {modelID: '0x8035', manufacturerName: 'Danfoss'}, // RTbattery Dial Infrared
        ],
        model: 'Icon',
        vendor: 'Danfoss',
        description: 'Icon floor heating (regulator, Zigbee module & thermostats)',
        fromZigbee: [
            fz.danfoss_icon_regulator,
            fz.danfoss_thermostat,
            fz.danfoss_icon_battery,
            fz.thermostat],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.danfoss_output_status,
            tz.danfoss_room_status_code,
            tz.danfoss_system_status_water,
            tz.danfoss_system_status_code,
            tz.danfoss_multimaster_role,
        ],
        meta: {multiEndpoint: true, thermostat: {dontMapPIHeatingDemand: true}},
        // ota: ota.zigbeeOTA,
        endpoint: (device) => {
            return {
                'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5,
                'l6': 6, 'l7': 7, 'l8': 8, 'l9': 9, 'l10': 10,
                'l11': 11, 'l12': 12, 'l13': 13, 'l14': 14, 'l15': 15, 'l16': 232,
            };
        },
        exposes: [].concat(((endpointsCount) => {
            const features = [];
            for (let i = 1; i <= endpointsCount; i++) {
                const epName = `l${i}`;
                if (i!=16) {
                    features.push(e.battery().withEndpoint(epName));
                    features.push(e.climate().withSetpoint('occupied_heating_setpoint', 5, 35, 0.5)
                        .withLocalTemperature().withRunningState(['idle', 'heat']).withSystemMode(['heat']).withEndpoint(epName));
                    features.push(e.numeric('abs_min_heat_setpoint_limit', ea.STATE)
                        .withUnit('°C').withEndpoint(epName)
                        .withDescription('Absolute min temperature allowed on the device'));
                    features.push(e.numeric('abs_max_heat_setpoint_limit', ea.STATE)
                        .withUnit('°C').withEndpoint(epName)
                        .withDescription('Absolute max temperature allowed on the device'));
                    features.push(e.numeric('min_heat_setpoint_limit', ea.ALL)
                        .withValueMin(4).withValueMax(35).withValueStep(0.5).withUnit('°C')
                        .withEndpoint(epName).withDescription('Min temperature limit set on the device'));
                    features.push(e.numeric('max_heat_setpoint_limit', ea.ALL)
                        .withValueMin(4).withValueMax(35).withValueStep(0.5).withUnit('°C')
                        .withEndpoint(epName).withDescription('Max temperature limit set on the device'));
                    features.push(e.enum('setpoint_change_source', ea.STATE, ['manual', 'schedule', 'externally'])
                        .withEndpoint(epName));
                    features.push(e.enum('output_status', ea.STATE_GET, ['inactive', 'active'])
                        .withEndpoint(epName).withDescription('Danfoss Output Status [Active vs Inactive])'));
                    features.push(e.enum('room_status_code', ea.STATE_GET, ['no_error', 'missing_rt',
                        'rt_touch_error', 'floor_sensor_short_circuit', 'floor_sensor_disconnected'])
                        .withEndpoint(epName).withDescription('Thermostat status'));
                } else {
                    features.push(e.enum('system_status_code', ea.STATE_GET, ['no_error', 'missing_expansion_board',
                        'missing_radio_module', 'missing_command_module', 'missing_master_rail', 'missing_slave_rail_no_1',
                        'missing_slave_rail_no_2', 'pt1000_input_short_circuit', 'pt1000_input_open_circuit',
                        'error_on_one_or_more_output']).withEndpoint('l16').withDescription('Regulator Status'));
                    features.push(e.enum('system_status_water', ea.STATE_GET, ['hot_water_flow_in_pipes', 'cool_water_flow_in_pipes'])
                        .withEndpoint('l16').withDescription('Water Status of Regulator'));
                    features.push(e.enum('multimaster_role', ea.STATE_GET, ['invalid_unused', 'master', 'slave_1', 'slave_2'])
                        .withEndpoint('l16').withDescription('Regulator role (Master vs Slave)'));
                }
            }

            return features;
        })(16)),
        configure: async (device, coordinatorEndpoint) => {
            const options = {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S};

            for (let i = 1; i <= 15; i++) {
                const endpoint = device.getEndpoint(i);
                if (typeof endpoint !== 'undefined') {
                    await reporting.bind(endpoint, coordinatorEndpoint,
                        ['genPowerCfg', 'hvacThermostat', 'hvacUserInterfaceCfg']);
                    await reporting.batteryPercentageRemaining(endpoint,
                        {min: constants.repInterval.HOUR, max: 43200, change: 1});
                    await reporting.thermostatTemperature(endpoint,
                        {min: 0, max: constants.repInterval.MINUTES_10, change: 10});
                    await reporting.thermostatOccupiedHeatingSetpoint(endpoint,
                        {min: 0, max: constants.repInterval.MINUTES_10, change: 10});

                    await endpoint.configureReporting('hvacThermostat', [{
                        attribute: 'danfossOutputStatus',
                        minimumReportInterval: constants.repInterval.MINUTE,
                        maximumReportInterval: constants.repInterval.MINUTES_10,
                        reportableChange: 1,
                    }], options);

                    // Danfoss Icon Thermostat Specific
                    await endpoint.read('hvacThermostat', [
                        'danfossOutputStatus',
                        'danfossRoomStatusCode'], options);

                    // Standard Thermostat
                    await endpoint.read('hvacThermostat', ['localTemp']);
                    await endpoint.read('hvacThermostat', ['occupiedHeatingSetpoint']);
                    await endpoint.read('hvacThermostat', ['systemMode']);
                    await endpoint.read('hvacThermostat', ['setpointChangeSource']);
                    await endpoint.read('hvacThermostat', ['absMinHeatSetpointLimit']);
                    await endpoint.read('hvacThermostat', ['absMaxHeatSetpointLimit']);
                    await endpoint.read('hvacThermostat', ['minHeatSetpointLimit']);
                    await endpoint.read('hvacThermostat', ['maxHeatSetpointLimit']);
                    await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
                }
            }

            // Danfoss Icon Regulator Specific
            const endpoint232 = device.getEndpoint(232);

            await reporting.bind(endpoint232, coordinatorEndpoint, ['haDiagnostic']);

            await endpoint232.read('haDiagnostic', [
                'danfossSystemStatusCode',
                'danfossSystemStatusWater',
                'danfossMultimasterRole'], options);
        },
    },
    {
        fingerprint: [
            {modelID: '0x0210', manufacturerName: 'Danfoss'}, // Icon2 Basic Main Controller
            {modelID: '0x0211', manufacturerName: 'Danfoss'}, // Icon2 Advanced Main Controller
            {modelID: '0x8040', manufacturerName: 'Danfoss'}, // Icon2 Room Thermostat
            {modelID: '0x8041', manufacturerName: 'Danfoss'}, // Icon2 Featured (Infrared) Room Thermostat
            {modelID: '0x0042', manufacturerName: 'Danfoss'}, // Icon2 Sensor
        ],
        model: 'Icon2',
        vendor: 'Danfoss',
        description: 'Icon2 Main Controller, Room Thermostat or Sensor',
        fromZigbee: [
            fz.danfoss_icon_battery,
            fz.thermostat,
            fz.danfoss_thermostat,
            fz.danfoss_icon_floor_sensor,
            fz.danfoss_icon_hvac_user_interface,
            fz.temperature,
            fz.humidity,
            fz.danfoss_icon_regulator,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_system_mode,
            tz.danfoss_room_status_code,
            tz.danfoss_output_status,
            tz.danfoss_floor_sensor_mode,
            tz.danfoss_floor_min_setpoint,
            tz.danfoss_floor_max_setpoint,
            tz.thermostat_keypad_lockout,
            tz.temperature,
            tz.humidity,
            tz.danfoss_system_status_code,
            tz.danfoss_system_status_water,
            tz.danfoss_multimaster_role,
        ],
        meta: {multiEndpoint: true, thermostat: {dontMapPIHeatingDemand: true}},
        exposes: [].concat(((endpointsCount) => {
            const features = [];

            for (let i = 1; i <= endpointsCount; i++) {
                if (i < 16) {
                    const epName = `${i}`;

                    features.push(e.battery().withEndpoint(epName));

                    features.push(e.climate()
                        .withSetpoint('occupied_heating_setpoint', 5, 35, 0.5)
                        .withLocalTemperature()
                        .withSystemMode(['heat'])
                        .withRunningState(['idle', 'heat'], ea.STATE)
                        .withEndpoint(epName));

                    features.push(e.numeric('min_heat_setpoint_limit', ea.ALL)
                        .withValueMin(4).withValueMax(35).withValueStep(0.5).withUnit('°C')
                        .withEndpoint(epName)
                        .withDescription('Min temperature limit set on the device'));
                    features.push(e.numeric('max_heat_setpoint_limit', ea.ALL)
                        .withValueMin(4).withValueMax(35).withValueStep(0.5).withUnit('°C')
                        .withEndpoint(epName)
                        .withDescription('Max temperature limit set on the device'));

                    features.push(e.enum('setpoint_change_source', ea.STATE, ['manual', 'schedule', 'externally'])
                        .withEndpoint(epName));

                    features.push(e.enum('output_status', ea.STATE_GET, ['inactive', 'active'])
                        .withEndpoint(epName)
                        .withDescription('Actuator status)'));

                    features.push(e.enum('room_status_code', ea.STATE_GET, ['no_error', 'missing_rt', 'rt_touch_error',
                        'floor_sensor_short_circuit', 'floor_sensor_disconnected'])
                        .withEndpoint(epName)
                        .withDescription('Thermostat status'));

                    features.push(e.enum('room_floor_sensor_mode', ea.STATE_GET, ['comfort', 'floor_only', 'dual_mode'])
                        .withEndpoint(epName)
                        .withDescription('Floor sensor mode'));
                    features.push(e.numeric('floor_min_setpoint', ea.ALL)
                        .withValueMin(18).withValueMax(35).withValueStep(0.5).withUnit('°C')
                        .withEndpoint(epName)
                        .withDescription('Min floor temperature'));
                    features.push(e.numeric('floor_max_setpoint', ea.ALL)
                        .withValueMin(18).withValueMax(35).withValueStep(0.5).withUnit('°C')
                        .withEndpoint(epName)
                        .withDescription('Max floor temperature'));

                    features.push(e.numeric('temperature', ea.STATE_GET)
                        .withUnit('°C')
                        .withEndpoint(epName)
                        .withDescription('Floor temperature'));

                    features.push(e.numeric('humidity', ea.STATE_GET)
                        .withUnit('%')
                        .withEndpoint(epName)
                        .withDescription('Humidity'));
                } else {
                    features.push(e.enum('system_status_code', ea.STATE_GET, ['no_error', 'missing_expansion_board',
                        'missing_radio_module', 'missing_command_module', 'missing_master_rail', 'missing_slave_rail_no_1',
                        'missing_slave_rail_no_2', 'pt1000_input_short_circuit', 'pt1000_input_open_circuit',
                        'error_on_one_or_more_output'])
                        .withEndpoint('232')
                        .withDescription('Main Controller Status'));
                    features.push(e.enum('system_status_water', ea.STATE_GET, ['hot_water_flow_in_pipes', 'cool_water_flow_in_pipes'])
                        .withEndpoint('232')
                        .withDescription('Main Controller Water Status'));
                    features.push(e.enum('multimaster_role', ea.STATE_GET, ['invalid_unused', 'master', 'slave_1', 'slave_2'])
                        .withEndpoint('232')
                        .withDescription('Main Controller Role'));
                }
            }
            return features;
        })(16)),
        configure: async (device, coordinatorEndpoint) => {
            const options = {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S};

            // Danfoss Icon2 Main Controller Specific Endpoint
            const mainController = device.getEndpoint(232);

            for (let i = 1; i <= 15; i++) {
                const endpoint = device.getEndpoint(i);

                if (typeof endpoint == 'undefined') {
                    continue;
                }

                await reporting.bind(endpoint, coordinatorEndpoint, [
                    'genPowerCfg',
                    'hvacThermostat',
                    'hvacUserInterfaceCfg',
                    'msTemperatureMeasurement',
                    'msRelativeHumidity',
                ]);

                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.thermostatTemperature(endpoint);
                await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
                await reporting.temperature(endpoint, {change: 10});
                await reporting.humidity(endpoint);

                await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
                await endpoint.read('hvacThermostat', [
                    'localTemp',
                    'occupiedHeatingSetpoint',
                    'minHeatSetpointLimit',
                    'maxHeatSetpointLimit',
                    'systemMode',
                ]);
                await endpoint.read('hvacThermostat', [
                    'danfossRoomFloorSensorMode',
                    'danfossFloorMinSetpoint',
                    'danfossFloorMaxSetpoint',
                ], options);
                await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
                await endpoint.read('msTemperatureMeasurement', ['measuredValue']);
                await endpoint.read('msRelativeHumidity', ['measuredValue']);

                // Different attributes depending on if it's Main Сontroller or a single thermostat
                if (typeof mainController == 'undefined') {
                    await endpoint.read('genBasic', ['modelId', 'powerSource']);
                } else {
                    await endpoint.configureReporting('hvacThermostat', [{
                        attribute: 'danfossOutputStatus',
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 1,
                    }], options);

                    await endpoint.read('hvacThermostat', ['setpointChangeSource']);
                    await endpoint.read('hvacThermostat', ['danfossOutputStatus', 'danfossRoomStatusCode'], options);
                }
            }

            // Danfoss Icon2 Main Controller Specific
            if (typeof mainController != 'undefined') {
                await reporting.bind(mainController, coordinatorEndpoint, ['genBasic', 'haDiagnostic']);

                await mainController.read('genBasic', [
                    'modelId',
                    'powerSource',
                    'appVersion',
                    'stackVersion',
                    'hwVersion',
                    'dateCode',
                ]);

                await mainController.read('haDiagnostic', [
                    'danfossSystemStatusCode',
                    'danfossSystemStatusWater',
                    'danfossMultimasterRole',
                ], options);
            }
        },
    },
];

export default definitions;
module.exports = definitions;
