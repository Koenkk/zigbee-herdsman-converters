const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const constants = require('../lib/constants');
const utils = require('../lib/utils');
const e = exposes.presets;
const ea = exposes.access;

const dataType = {
    boolean: 16,
    uint8: 32,
    uint16: 33,
    int8: 40,
    int16: 41,
    enum8: 48,
    charStr: 66,
    ieeeAddr: 240,
};

const fzLocal = {
    ctm_device_mode: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x2200)) {
                const deviceModeLookup = {0: 'astro_clock', 1: 'timer', 2: 'daily_timer', 3: 'weekly_timer'};
                result.device_mode = deviceModeLookup[data[0x2200]];
            }

            return result;
        },
    },
    ctm_device_enabled: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x2201)) {
                result.device_enabled = data[0x2201] ? 'ON' : 'OFF';
            }

            return result;
        },
    },
    ctm_child_lock: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x2202)) {
                result.child_lock = data[0x2202] ? 'locked' : 'unlocked';
            }

            return result;
        },
    },
    ctm_current_flag: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x5000)) {
                result.current_flag = data[0x5000];
            }

            return result;
        },
    },
    ctm_temperature_offset: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x0400)) {
                result.temperature_offset = data[0x0400];
            }

            return result;
        },
    },
    ctm_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x0401)) { // Load
                result.load = data[0x0401];
            }
            if (data.hasOwnProperty(0x0402)) { // Display text
                result.display_text = data[0x0402];
            }
            if (data.hasOwnProperty(0x0403)) { // Sensor
                const sensorModeLookup = {
                    0: 'air', 1: 'floor', 2: 'external', 3: 'regulator', 4: 'mv_air', 5: 'mv_external', 6: 'mv_regulator'};
                result.sensor = sensorModeLookup[data[0x0403]];
            }
            if (data.hasOwnProperty(0x0405)) { // Regulator mode
                result.regulator_mode = data[0x0405] ? 'regulator' : 'thermostat';
            }
            if (data.hasOwnProperty(0x0406)) { // Power status
                result.power_status = data[0x0406] ? 'ON' : 'OFF';
            }
            if (data.hasOwnProperty(0x0408)) { // Mean power
                result.mean_power = data[0x0408];
            }
            if (data.hasOwnProperty(0x0409)) { // Floor temp
                result.floor_temp = utils.precisionRound(data[0x0409], 2) /100;
            }
            if (data.hasOwnProperty(0x0411)) { // Night switching
                result.night_switching = data[0x0411] ? 'ON' : 'OFF';
            }
            if (data.hasOwnProperty(0x0412)) { // Frost guard
                result.frost_guard = data[0x0412] ? 'ON' : 'OFF';
            }
            if (data.hasOwnProperty(0x0413)) { // Child lock
                result.child_lock = data[0x0413] ? 'LOCK' : 'UNLOCK';
            }
            if (data.hasOwnProperty(0x0414)) { // Max floor temp
                result.max_floor_temp = data[0x0414];
            }
            if (data.hasOwnProperty(0x0415)) { // Heating
                result.heating = data[0x0415] ? 'heating' : 'idle';
            }
            if (data.hasOwnProperty(0x0420)) { // Regulator setpoint
                result.regulator_setpoint = data[0x0420];
            }
            if (data.hasOwnProperty(0x0421)) { // Regulation mode
                const regulationModeLookup = {0: 'thermostat', 1: 'regulator', 2: 'zzilent'};
                result.regulation_mode= regulationModeLookup[data[0x0421]];
            }
            if (data.hasOwnProperty(0x0422)) { // Operation mode
                const presetLookup = {0: 'off', 1: 'away', 2: 'sleep', 3: 'home'};
                const systemModeLookup = {0: 'off', 1: 'off', 2: 'off', 3: 'heat'};
                result.preset = presetLookup[data[0x0422]];
                result.system_mode = systemModeLookup[data[0x0422]];
            }
            if (data.hasOwnProperty(0x0423)) { // Maximum floor temp guard
                result.max_floor_guard = data[0x0423] ? 'ON' : 'OFF';
            }
            if (data.hasOwnProperty(0x0424)) { // Weekly timer enabled
                result.weekly_timer = data[0x0424] ? 'ON' : 'OFF';
            }
            if (data.hasOwnProperty(0x0425)) { // Frost guard setpoint
                result.frost_guard_setpoint = data[0x0425];
            }
            if (data.hasOwnProperty(0x0426)) { // External temperature
                result.external_temp = utils.precisionRound(data[0x0426], 2) /100;
            }
            if (data.hasOwnProperty(0x0428)) { // Exteral sensor source
                result.exteral_sensor_source = data[0x0428];
            }
            if (data.hasOwnProperty(0x0429)) { // Current air temperature
                result.air_temp = utils.precisionRound(data[0x0429], 2) /100;
            }
            if (data.hasOwnProperty(0x0424)) { // Floor Sensor Error
                result.floor_sensor_error = data[0x042B] ? 'error' : 'ok';
            }
            if (data.hasOwnProperty(0x0424)) { // External Air Sensor Error
                result.exteral_sensor_error = data[0x042C] ? 'error' : 'ok';
            }

            return result;
        },
    },
    ctm_group_config: {
        cluster: '65191', // 0xFEA7 ctmGroupConfig
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x0000)) {
                result.group_id = data[0x0000];
            }

            return result;
        },
    },
    ctm_sove_guard: {
        cluster: '65481', // 0xFFC9 ctmSoveGuard
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x0001)) { // Alarm status
                const alarmStatusLookup = {
                    0: 'ok', 1: 'tamper', 2: 'high_temperatur', 3: 'timer', 4: 'battery_alarm', 5: 'error', 0xFF: 'unknown'};
                result.alarm_status = alarmStatusLookup[data[0x0001]];
            }
            if (data.hasOwnProperty(0x0002)) { // Change battery
                result.battery_low = data[0x0002] ? true : false;
            }
            if (data.hasOwnProperty(0x0003)) { // Stove temperature
                result.stove_temperature = data[0x0003];
            }
            if (data.hasOwnProperty(0x0004)) { // Ambient temperature
                result.ambient_temperature = data[0x0004];
            }
            if (data.hasOwnProperty(0x0005)) { // Active
                result.active = data[0x0005] ? true : false;
            }
            if (data.hasOwnProperty(0x0006)) { // Runtime
                result.runtime = data[0x0006];
            }
            if (data.hasOwnProperty(0x0007)) { // Runtime timeout
                result.runtime_timeout = data[0x0007];
            }
            if (data.hasOwnProperty(0x0008)) { // Reset reason
                const resetReasonLookup = {
                    0: 'unknown', 1: 'power_on', 2: 'external', 3: 'brown_out', 4: 'watchdog', 5: 'program_interface',
                    6: 'software', 0xFF: 'unknown'};
                result.reset_reason = resetReasonLookup[data[0x0008]];
            }
            if (data.hasOwnProperty(0x0009)) { // Dip switch
                result.dip_switch = data[0x0009];
            }
            if (data.hasOwnProperty(0x000A)) { // Software version
                result.sw_version = data[0x000A];
            }
            if (data.hasOwnProperty(0x000B)) { // Hardware version
                result.hw_version = data[0x000B];
            }
            if (data.hasOwnProperty(0x000C)) { // Bootloader version
                result.bootloader_version = data[0x000C];
            }
            if (data.hasOwnProperty(0x000D)) { // Model
                const modelLookup = {0: 'unknown', 1: '1_8', 2: 'infinity', 3: 'hybrid', 4: 'tak', 0xFF: 'unknown'};
                result.model = modelLookup[data[0x000D]];
            }
            if (data.hasOwnProperty(0x0010)) { // Relay address
                result.relay_address = data[0x0010];
            }
            if (data.hasOwnProperty(0x0100)) { // Relay current flag
                const currentFlagLookup = {0: 'false', 1: 'true', 0xFF: 'unknown'};
                result.current_flag = currentFlagLookup[data[0x0100]];
            }
            if (data.hasOwnProperty(0x0101)) { // Relay current
                result.relay_current = data[0x0101];
            }
            if (data.hasOwnProperty(0x0102)) { // Relay status
                const relayStatusLookup = {0: 'off', 1: 'on', 2: 'not_present', 0xFF: 'unknown'};
                result.relay_status = relayStatusLookup[data[0x0102]];
            }
            if (data.hasOwnProperty(0x0103)) { // Relay external button
                const relayStatusLookup = {0: 'not_clicked', 1: 'clicked', 0xFF: 'unknown'};
                result.external_button = relayStatusLookup[data[0x0103]];
            }
            if (data.hasOwnProperty(0x0104)) { // Relay alarm
                const relayAlarmLookup = {0: 'ok', 1: 'no_communication', 2: 'over_current', 3: 'over_temperature', 0xFF: 'unknown'};
                result.relay_alarm = relayAlarmLookup[data[0x0104]];
            }
            if (data.hasOwnProperty(0x0105)) { // Alarm status (from relay)
                const relayAlarmStatusLookup = {
                    0: 'ok', 1: 'tamper', 2: 'high_temperatur', 3: 'timer', 4: 'battery_alarm', 5: 'error', 0xFF: 'unknown'};
                result.relay_alarm_status = relayAlarmStatusLookup[data[0x0105]];
            }

            return result;
        },
    },
    ctm_water_leak_alarm: {
        cluster: 'ssIasZone',
        type: ['commandStatusChangeNotification', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                active_water_leak: (zoneStatus & 1) > 0,
                water_leak: (zoneStatus & 1<<1) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
};


const tzLocal = {
    ctm_device_mode: {
        key: ['device_mode'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', [0x2200]);
        },
    },
    ctm_device_enabled: {
        key: ['device_enabled'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genOnOff', {0x2201: {value: {'OFF': 0, 'ON': 1}[value], type: dataType.boolean}});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', [0x2201]);
        },
    },
    ctm_child_lock: {
        key: ['child_lock'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', [0x2202]);
        },
    },
    ctm_current_flag: {
        key: ['current_flag'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', [0x5000], {manufacturerCode: 0x1337});
        },
    },
    ctm_temperature_offset: {
        key: ['temperature_offset'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('msTemperatureMeasurement',
                {0x0400: {value: value, type: dataType.int8}}, {manufacturerCode: 0x1337, sendWhen: 'active'});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('msTemperatureMeasurement', [0x0400], {manufacturerCode: 0x1337, sendWhen: 'active'});
            await entity.read('msTemperatureMeasurement', ['measuredValue'], {sendWhen: 'active'});
        },
    },
    ctm_thermostat: {
        key: ['load', 'display_text', 'sensor', 'regulator_mode', 'power_status', 'system_mode', 'night_switching', 'frost_guard',
            'max_floor_temp', 'regulator_setpoint', 'regulation_mode', 'max_floor_guard', 'weekly_timer', 'exteral_sensor_source',
        ],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'load':
                await entity.write('hvacThermostat', {0x0401: {value: value, type: dataType.uint16}});
                break;
            case 'display_text':
                await entity.write('hvacThermostat', {0x0402: {value: value, type: dataType.charStr}});
                break;
            case 'sensor':
                await entity.write('hvacThermostat', {0x0403: {
                    value: {'air': 0, 'floor': 1, 'external': 2, 'regulator': 3, 'mv_air': 4, 'mv_external': 5, 'mv_regulator': 6}[value],
                    type: dataType.enum8}});
                break;
            case 'regulator_mode':
                await entity.write('hvacThermostat', {0x0405: {value: {'thermostat': 0, 'regulator': 1}[value], type: dataType.boolean}});
                break;
            case 'power_status':
                await entity.write('hvacThermostat', {0x0406: {value: {'OFF': 0, 'ON': 1}[value], type: dataType.boolean}});
                break;
            case 'system_mode':
                if (value === 'off') {
                    await entity.write('hvacThermostat', {0x0406: {value: 0, type: dataType.boolean}});
                } else if (value === 'heat') {
                    await entity.write('hvacThermostat', {0x0422: {value: 3, type: dataType.uint8}});
                }
                break;
            case 'night_switching':
                await entity.write('hvacThermostat', {0x0411: {value: {'OFF': 0, 'ON': 1}[value], type: dataType.boolean}});
                break;
            case 'frost_guard':
                await entity.write('hvacThermostat', {0x0412: {value: {'OFF': 0, 'ON': 1}[value], type: dataType.boolean}});
                break;
            case 'max_floor_temp':
                await entity.write('hvacThermostat', {0x0414: {value: value, type: dataType.uint8}});
                break;
            case 'regulator_setpoint':
                await entity.write('hvacThermostat', {0x0420: {value: value, type: dataType.uint8}});
                break;
            case 'regulation_mode':
                await entity.write('hvacThermostat', {0x0421: {
                    value: {'thermostat': 0, 'regulator': 1, 'zzilent': 2}[value],
                    type: dataType.uint8}});
                break;
            case 'max_floor_guard':
                await entity.write('hvacThermostat', {0x0423: {value: {'OFF': 0, 'ON': 1}[value], type: dataType.boolean}});
                break;
            case 'weekly_timer':
                await entity.write('hvacThermostat', {0x0424: {value: {'OFF': 0, 'ON': 1}[value], type: dataType.boolean}});
                break;
            case 'exteral_sensor_source':
                await entity.write('hvacThermostat', {0x0428: {value: value, type: dataType.uint16}});
                break;

            default: // Unknown key
                throw new Error(`Unhandled key tzLocal.ctm_thermostat.convertSet ${key}`);
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'load':
                await entity.read('hvacThermostat', [0x0401]);
                break;
            case 'display_text':
                await entity.read('hvacThermostat', [0x0402]);
                break;
            case 'sensor':
                await entity.read('hvacThermostat', [0x0403]);
                break;
            case 'regulator_mode':
                await entity.read('hvacThermostat', [0x0405]);
                break;
            case 'power_status':
                await entity.read('hvacThermostat', [0x0406]);
                break;
            case 'night_switching':
                await entity.read('hvacThermostat', [0x0411]);
                break;
            case 'frost_guard':
                await entity.read('hvacThermostat', [0x0412]);
                break;
            case 'max_floor_temp':
                await entity.read('hvacThermostat', [0x0414]);
                break;
            case 'regulator_setpoint':
                await entity.read('hvacThermostat', [0x0420]);
                break;
            case 'regulation_mode':
                await entity.read('hvacThermostat', [0x0421]);
                break;
            case 'system_mode':
                await entity.read('hvacThermostat', [0x0422]);
                break;
            case 'max_floor_guard':
                await entity.read('hvacThermostat', [0x0423]);
                break;
            case 'weekly_timer':
                await entity.read('hvacThermostat', [0x0424]);
                break;
            case 'exteral_sensor_source':
                await entity.read('hvacThermostat', [0x0428]);
                break;

            default: // Unknown key
                throw new Error(`Unhandled key tzLocal.ctm_thermostat.convertGet ${key}`);
            }
        },
    },
    ctm_thermostat_preset: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            const presetLookup = {'off': 0, 'away': 1, 'sleep': 2, 'home': 3};
            await entity.write('hvacThermostat', {0x0422: {value: presetLookup[value], type: dataType.uint8}});
        },
    },
    ctm_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('hvacThermostat', {0x0413: {value: {'UNLOCK': 0, 'LOCK': 1}[value], type: dataType.boolean}});
        },
    },
    ctm_thermostat_gets: {
        key: ['mean_power', 'floor_temp', 'heating', 'frost_guard_setpoint', 'external_temp',
            'air_temp', 'floor_sensor_error', 'exteral_sensor_error',
        ],
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'mean_power':
                await entity.read('hvacThermostat', [0x0408]);
                break;
            case 'floor_temp':
                await entity.read('hvacThermostat', [0x0409]);
                break;
            case 'heating':
                await entity.read('hvacThermostat', [0x0415]);
                break;
            case 'frost_guard_setpoint':
                await entity.read('hvacThermostat', [0x0425]);
                break;
            case 'external_temp':
                await entity.read('hvacThermostat', [0x0426]);
                break;
            case 'air_temp':
                await entity.read('hvacThermostat', [0x0429]);
                break;
            case 'floor_sensor_error':
                await entity.read('hvacThermostat', [0x042B]);
                break;
            case 'exteral_sensor_error':
                await entity.read('hvacThermostat', [0x042C]);
                break;

            default: // Unknown key
                throw new Error(`Unhandled key tzLocal.ctm_thermostat.convertGet ${key}`);
            }
        },
    },
    ctm_group_config: {
        key: ['group_id'],
        convertGet: async (entity, key, meta) => {
            await entity.read(0xFEA7, [0x0000], {manufacturerCode: 0x1337, sendWhen: 'active'});
        },
    },
    ctm_sove_guard: {
        key: [
            'alarm_status', 'change_battery', 'stove_temperature', 'ambient_temperature', 'active', 'runtime', 'runtime_timeout',
            'reset_reason', 'dip_switch', 'sw_version', 'hw_version', 'bootloader_version', 'model', 'relay_address',
            'current_flag', 'relay_current', 'relay_status', 'external_button', 'relay_alarm', 'relay_alarm_status',
        ],
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'alarm_status':
                await entity.read(0xFFC9, [0x0001], {manufacturerCode: 0x1337});
                break;
            case 'battery_low':
                await entity.read(0xFFC9, [0x0002], {manufacturerCode: 0x1337});
                break;
            case 'stove_temperature':
                await entity.read(0xFFC9, [0x0003], {manufacturerCode: 0x1337});
                break;
            case 'ambient_temperature':
                await entity.read(0xFFC9, [0x0004], {manufacturerCode: 0x1337});
                break;
            case 'active':
                await entity.read(0xFFC9, [0x0005], {manufacturerCode: 0x1337});
                break;
            case 'runtime':
                await entity.read(0xFFC9, [0x0006], {manufacturerCode: 0x1337});
                break;
            case 'runtime_timeout':
                await entity.read(0xFFC9, [0x0007], {manufacturerCode: 0x1337});
                break;
            case 'reset_reason':
                await entity.read(0xFFC9, [0x0008], {manufacturerCode: 0x1337});
                break;
            case 'dip_switch':
                await entity.read(0xFFC9, [0x0009], {manufacturerCode: 0x1337});
                break;
            case 'sw_version':
                await entity.read(0xFFC9, [0x000A], {manufacturerCode: 0x1337});
                break;
            case 'hw_version':
                await entity.read(0xFFC9, [0x000B], {manufacturerCode: 0x1337});
                break;
            case 'bootloader_version':
                await entity.read(0xFFC9, [0x000C], {manufacturerCode: 0x1337});
                break;
            case 'model':
                await entity.read(0xFFC9, [0x000D], {manufacturerCode: 0x1337});
                break;
            case 'relay_address':
                await entity.read(0xFFC9, [0x0010], {manufacturerCode: 0x1337});
                break;
            case 'current_flag':
                await entity.read(0xFFC9, [0x0100], {manufacturerCode: 0x1337});
                break;
            case 'relay_current':
                await entity.read(0xFFC9, [0x0101], {manufacturerCode: 0x1337});
                break;
            case 'relay_status':
                await entity.read(0xFFC9, [0x0102], {manufacturerCode: 0x1337});
                break;
            case 'external_button':
                await entity.read(0xFFC9, [0x0103], {manufacturerCode: 0x1337});
                break;
            case 'relay_alarm':
                await entity.read(0xFFC9, [0x0104], {manufacturerCode: 0x1337});
                break;
            case 'relay_alarm_status':
                await entity.read(0xFFC9, [0x0105], {manufacturerCode: 0x1337});
                break;

            default: // Unknown key
                throw new Error(`Unhandled key tzLocal.ctm_sove_guard.convertGet ${key}`);
            }
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['mTouch Dim'],
        model: 'mTouch_Dim',
        vendor: 'CTM Lyng',
        description: 'mTouch Dim OP, touch dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.lighting_ballast_configuration],
        toZigbee: [tz.on_off, tz.light_onoff_brightness, tz.light_brightness_move, tz.ballast_config],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'lightingBallastCfg']);
            await endpoint.read('genOnOff', ['onOff']);
            await reporting.onOff(endpoint);
            await endpoint.read('genLevelCtrl', ['currentLevel']);
            await reporting.brightness(endpoint);
            await endpoint.read('lightingBallastCfg', ['minLevel', 'maxLevel', 'powerOnLevel']);
            await endpoint.configureReporting('lightingBallastCfg', [{
                attribute: 'minLevel',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null}]);
            await endpoint.configureReporting('lightingBallastCfg', [{
                attribute: 'maxLevel',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null}]);
            await endpoint.configureReporting('lightingBallastCfg', [{
                attribute: 'powerOnLevel',
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null}]);
        },
        exposes: [e.light_brightness(),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(99)
                .withDescription('Specifies the minimum brightness value'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(99)
                .withDescription('Specifies the maximum brightness value'),
            exposes.numeric('ballast_power_on_level', ea.ALL).withValueMin(1).withValueMax(99)
                .withDescription('Specifies the initialisation light level. Can not be set lower than "ballast_minimum_level"')],
    },
    {
        zigbeeModel: ['mTouch Bryter'],
        model: 'mTouch_Bryter',
        vendor: 'CTM Lyng',
        description: 'mTouch Bryter OP, 3 channel switch',
        fromZigbee: [fz.temperature, fz.battery, fz.command_recall, fz.command_on, fz.command_off, fz.command_toggle,
            fz.command_move, fz.command_stop, fzLocal.ctm_group_config],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('msTemperatureMeasurement', ['measuredValue']);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTES_10, max: constants.repInterval.HOUR, change: 100});
            await endpoint.read(0xFEA7, [0x0000], {manufacturerCode: 0x1337});
        },
        exposes: [e.battery(), e.temperature(),
            e.action(['recall_1', 'recall_2', 'recall_3', 'on', 'off', 'toggle',
                'brightness_move_down', 'brightness_move_up', 'brightness_stop']),
            exposes.numeric('group_id', ea.STATE)
                .withDescription('The device sends commands with this group ID. Put dvices in this group to control them.')],
    },
    {
        zigbeeModel: ['mTouch One'],
        model: 'mTouch_One',
        vendor: 'CTM Lyng',
        description: 'mTouch One OP, touch thermostat',
        fromZigbee: [fz.thermostat, fzLocal.ctm_thermostat],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature, tzLocal.ctm_thermostat,
            tzLocal.ctm_thermostat_preset, tzLocal.ctm_thermostat_child_lock, tzLocal.ctm_thermostat_gets],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat']);
            await endpoint.read('hvacThermostat', ['localTemp', 'occupiedHeatingSetpoint']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await endpoint.read('hvacThermostat', [0x0401]);
            await endpoint.read('hvacThermostat', [0x0402]);
            // Regulator mode
            await endpoint.read('hvacThermostat', [0x0405]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x0405, type: dataType.boolean},
                minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: null}]);
            // Power consumption
            await endpoint.read('hvacThermostat', [0x0408]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x0408, type: dataType.uint16},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 5}]);
            // Floor temp sensor
            await endpoint.read('hvacThermostat', [0x0409]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x0409, type: dataType.int16},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 10}]);
            // Frost guard
            await endpoint.read('hvacThermostat', [0x0412]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x0412, type: dataType.boolean},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: null}]);
            // Child lock active/inactive
            await endpoint.read('hvacThermostat', [0x0413]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x0413, type: dataType.boolean},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: null}]);
            // Regulator setpoint
            await endpoint.read('hvacThermostat', [0x0420]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x0420, type: dataType.uint8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1}]);
            // Operation mode
            await endpoint.read('hvacThermostat', [0x0422]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x0422, type: dataType.uint8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1}]);
            // Air temp sensor
            await endpoint.read('hvacThermostat', [0x0429]);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x0429, type: dataType.int16},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 10}]);
        },
        exposes: [e.child_lock(),
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 40, 1)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'])
                .withPreset(['off', 'away', 'sleep', 'home']),
            exposes.numeric('load', ea.ALL).withUnit('W')
                .withDescription('Load in W when heating is on (between 0-3600 W). The thermostat uses the value as input to the ' +
                'mean_power calculation.')
                .withValueMin(0).withValueMax(3600),
            exposes.text('display_text', ea.ALL)
                .withDescription('Displayed text on thermostat display (zone). Max 19 characters'),
            exposes.binary('regulator_mode', ea.ALL, 'regulator', 'thermostat')
                .withDescription('Device in regulator or thermostat mode.'),
            exposes.numeric('mean_power', ea.STATE_GET).withUnit('W')
                .withDescription('Reports average power usage last 10 minutes'),
            exposes.numeric('floor_temp', ea.STATE_GET).withUnit('°C')
                .withDescription('Current temperature measured from the floor sensor'),
            exposes.binary('frost_guard', ea.ALL, 'ON', 'OFF')
                .withDescription('When frost guard is ON, it is activated when the thermostat is switched OFF with the ON/OFF button.' +
                'At the same time, the display will fade and the text "Frostsikring x °C" appears in the display and remains until the ' +
                'thermostat is switched on again.'),
            exposes.numeric('regulator_setpoint', ea.ALL).withUnit('%')
                .withDescription('Setpoint in %, use only when the thermostat is in regulator mode.')
                .withValueMin(1).withValueMax(99),
            exposes.numeric('air_temp', ea.STATE_GET).withUnit('°C')
                .withDescription('Current temperature measured from the air sensor'),
        ],
    },
    {
        zigbeeModel: ['mStikk Outlet'],
        model: 'mStikk_Outlet',
        vendor: 'CTM Lyng',
        description: 'mStikk OP, wall socket',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await endpoint.read('genOnOff', ['onOff']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint, {change: 100});
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.power(), e.current(), e.voltage(), e.switch(), e.energy()],
    },
    {
        zigbeeModel: ['mKomfy'],
        model: 'mKomfy_Sensor',
        vendor: 'CTM Lyng',
        description: 'mKomfy, stove guard',
        fromZigbee: [fz.temperature, fz.battery, fzLocal.ctm_sove_guard],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 0xFFC9]);
            await reporting.batteryPercentageRemaining(endpoint);
            // await endpoint.read('msTemperatureMeasurement', ['measuredValue']);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTES_10, max: constants.repInterval.HOUR, change: 100});
            // Alarm status
            // await endpoint.read(0xFFC9, [0x0001], {manufacturerCode: 0x1337});
            await endpoint.configureReporting(0xFFC9, [{
                attribute: {ID: 0x0001, type: dataType.uint8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 0}], {manufacturerCode: 0x1337});
            // Change battery
            // await endpoint.read(0xFFC9, [0x0002], {manufacturerCode: 0x1337});
            await endpoint.configureReporting(0xFFC9, [{
                attribute: {ID: 0x0002, type: dataType.uint8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.MAX,
                reportableChange: 0}], {manufacturerCode: 0x1337});
            // Active
            // await endpoint.read(0xFFC9, [0x0005], {manufacturerCode: 0x1337});
            await endpoint.configureReporting(0xFFC9, [{
                attribute: {ID: 0x0005, type: dataType.uint8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 0}], {manufacturerCode: 0x1337});
        },
        exposes: [e.battery(), e.battery_low(), e.temperature(),
            exposes.enum('alarm_status', ea.STATE, ['ok', 'tamper', 'high_temperatur', 'timer', 'battery_alarm', 'error', 'unknown'])
                .withDescription('Alarm status.'),
            exposes.binary('active', ea.STATE, true, false)
                .withDescription('Stove guard active/inactive (Stove in use)')],
    },
    {
        zigbeeModel: ['mTouch Astro'],
        model: 'mTouch_Astro',
        vendor: 'CTM Lyng',
        description: 'mTouch Astro OP, astro clock',
        fromZigbee: [fz.on_off, fz.command_on, fz.command_off, fzLocal.ctm_device_mode, fzLocal.ctm_device_enabled,
            fzLocal.ctm_child_lock, fzLocal.ctm_group_config],
        toZigbee: [tz.on_off, tzLocal.ctm_device_enabled],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await endpoint.read('genOnOff', ['onOff']);
            await reporting.onOff(endpoint);
            // Device mode
            await endpoint.read('genOnOff', [0x2200]);
            await endpoint.configureReporting('genOnOff', [{
                attribute: {ID: 0x2200, type: dataType.uint8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 0}]);
            await endpoint.read('genOnOff', [0x2201]);
            await endpoint.configureReporting('genOnOff', [{
                attribute: {ID: 0x2201, type: dataType.boolean},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null}]);
            await endpoint.read('genOnOff', [0x2202]);
            await endpoint.configureReporting('genOnOff', [{
                attribute: {ID: 0x2202, type: dataType.boolean},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null}]);
            await endpoint.read(0xFEA7, [0x0000], {manufacturerCode: 0x1337});
        },
        exposes: [e.switch(), e.action(['on', 'off']),
            exposes.enum('device_mode', ea.STATE, ['astro_clock', 'timer', 'daily_timer', 'weekly_timer'])
                .withDescription('Device mode.'),
            exposes.binary('device_enabled', ea.ALL, 'ON', 'OFF')
                .withDescription('Turn the device on or off'),
            exposes.binary('child_lock', ea.STATE, 'locked', 'unlocked')
                .withDescription('Physical input on the device enabled/disabled'),
            exposes.numeric('group_id', ea.STATE)
                .withDescription('The device sends commands with this group ID. Put dvices in this group to control them.'),
        ],
    },
    {
        zigbeeModel: ['AX Water Sensor'],
        model: 'AX_Water_Sensor',
        vendor: 'CTM Lyng',
        description: 'AX Water Sensor, water leakage detector',
        fromZigbee: [fz.battery, fz.ias_enroll, fzLocal.ctm_water_leak_alarm],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
        },
        exposes: [e.battery(), e.battery_low(), e.water_leak(),
            exposes.binary('active_water_leak', ea.STATE, true, false)
                .withDescription('Indicates whether there is an active water leak'),
        ],
    },
    {
        zigbeeModel: ['AX Valve Controller'],
        model: 'AX_Valve_Controller',
        vendor: 'CTM Lyng',
        description: 'AX Valve Controller, water shutoff valve controller',
        fromZigbee: [fz.on_off, fz.ias_enroll, fzLocal.ctm_water_leak_alarm],
        toZigbee: [tz.on_off],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'ssIasZone']);
            await endpoint.read('genOnOff', ['onOff']);
            await reporting.onOff(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
        },
        exposes: [e.switch(), e.water_leak(),
            exposes.binary('active_water_leak', ea.STATE, true, false)
                .withDescription('Indicates whether there is an active water leak'),
        ],
    },
    {
        zigbeeModel: ['Mikrofon'],
        model: 'mSwitch_Mic',
        vendor: 'CTM Lyng',
        description: 'Mikrofon, alarm detection microphone',
        fromZigbee: [fz.temperature, fz.battery, fz.command_on, fz.command_off, fz.ias_enroll, fz.ias_smoke_alarm_1,
            fzLocal.ctm_group_config],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'msTemperatureMeasurement']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await endpoint.read('msTemperatureMeasurement', ['measuredValue']);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTES_10, max: constants.repInterval.HOUR, change: 100});
            await endpoint.read(0xFEA7, [0x0000], {manufacturerCode: 0x1337});
        },
        exposes: [e.temperature(), e.battery(), e.battery_low(), e.smoke(),
            e.action(['on', 'off']),
            exposes.numeric('group_id', ea.STATE)
                .withDescription('The device sends commands with this group ID. Put dvices in this group to control them.'),
        ],
    },
    {
        zigbeeModel: ['Air Sensor'],
        model: 'mTouch_Air_Sensor',
        vendor: 'CTM Lyng',
        description: 'Air Sensor, temperature & humidity sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('msTemperatureMeasurement', ['measuredValue']);
            await reporting.temperature(endpoint);
            await endpoint.read('msRelativeHumidity', ['measuredValue']);
            await reporting.humidity(endpoint);
        },
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['MBD-S'],
        model: 'MBD-S',
        vendor: 'CTM Lyng',
        description: 'MBD-S, motion detector with 16A relay',
        fromZigbee: [fz.on_off, fz.illuminance, fz.occupancy, fzLocal.ctm_device_enabled],
        toZigbee: [tz.on_off, tzLocal.ctm_device_enabled],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'msIlluminanceMeasurement', 'msOccupancySensing']);
            await endpoint.read('genOnOff', ['onOff']);
            await reporting.onOff(endpoint);
            await endpoint.read('msIlluminanceMeasurement', ['measuredValue']);
            await reporting.illuminance(endpoint);
            await endpoint.read('msOccupancySensing', ['occupancy']);
            await reporting.occupancy(endpoint);
            // Device enabled
            await endpoint.read('genOnOff', [0x2201]);
            await endpoint.configureReporting('genOnOff', [{
                attribute: {ID: 0x2201, type: dataType.boolean},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: null}]);
        },
        exposes: [e.switch(), e.illuminance(), e.illuminance_lux(), e.occupancy(),
            exposes.binary('device_enabled', ea.ALL, 'ON', 'OFF')
                .withDescription('Turn the device on or off'),
        ],
    },
];
