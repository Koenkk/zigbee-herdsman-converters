const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const zosung = require('../lib/zosung');
const utils = require('../lib/utils');
const fzZosung = zosung.fzZosung;
const tzZosung = zosung.tzZosung;
const ez = zosung.presetsZosung;

const fzLocal = {
    ZSEUD: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: async (model, msg, publish, options, meta) => {
            const result = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = tuya.getDataValue(dpValue);
                switch (dp) {
                case 1:
                    result.state_l1 = value ? 'ON' : 'OFF';
                    break;
                case 2:
                    result.brightness_l1 = utils.mapNumberRange(value, 0, 1000, 0, 254);
                    break;
                case 7:
                    result.state_l2 = value ? 'ON' : 'OFF';
                    break;
                case 8:
                    result.brightness_l2 = utils.mapNumberRange(value, 0, 1000, 0, 254);
                    break;
                default:
                    meta.logger.warn(`zigbee-herdsman-converters:ZSEUD: NOT RECOGNIZED DP #${dp} with data ${JSON.stringify(dpValue)}`);
                }
            }
            return result;
        },
    },
};

const tzLocal = {
    ZSEUD_state: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {l1: 1, l2: 7};
            const dp = lookup[meta.endpoint_name];
            await tuya.sendDataPointBool(entity, dp, value === 'ON');
        },
    },
    ZSEUD_brightness: {
        key: ['brightness'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {l1: 2, l2: 8};
            const dp = lookup[meta.endpoint_name];

            if (key == 'brightness') {
                // upscale to 1000
                if (value >= 0 && value <= 254) {
                    const newValue = utils.mapNumberRange(value, 0, 254, 0, 1000);
                    // Always use same transid as tuya_dimmer_state (https://github.com/Koenkk/zigbee2mqtt/issues/6366)
                    if (meta.state[`state_${meta.endpoint_name}`] === 'ON') {
                        await tuya.sendDataPointValue(entity, dp, newValue, 'dataRequest', 1);
                    } else {
                        await tuya.sendDataPoints(entity, [tuya.dpValueFromBool(dp-1, true), tuya.dpValueFromIntValue(dp, newValue)],
                            'dataRequest', 1);
                    }
                } else {
                    throw new Error('Dimmer brightness is out of range 0..254');
                }
            } else {
                meta.logger.warn(`ZSEUD TZ unsupported key=${key} value=${value}`);
            }
        },
    },
};

module.exports = [
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_cymsnfvf'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_2xlvlnez'}],
        model: 'ZP-LZ-FR2U',
        vendor: 'Moes',
        description: 'Zigbee 3.0 dual USB wireless socket plug',
        fromZigbee: [fz.on_off, fz.tuya_switch_power_outage_memory, fz.ts011f_plug_child_mode],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory, tz.ts011f_plug_child_mode],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'), e.child_lock()],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genBasic',
                ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        fingerprint: [{modelID: 'TS0121', manufacturerName: '_TYZB01_iuepbmpv'}, {modelID: 'TS011F', manufacturerName: '_TZ3000_zmy1waw6'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_bkfe0bab'}],
        model: 'MS-104Z',
        description: 'Smart light switch module (1 gang)',
        vendor: 'Moes',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        extend: extend.switch(),
        exposes: [e.switch(),
            exposes.enum('power_on_behavior', ea.ALL, ['on', 'off', 'previous'])
                .withDescription('Controls the behaviour when the device is powered on')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            try {
                // Fails for some devices.
                // https://github.com/Koenkk/zigbee2mqtt/issues/4598
                await reporting.onOff(endpoint);
            } catch (e) {
                e;
            }
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_pmz6mjyu'}],
        model: 'MS-104BZ',
        description: 'Smart light switch module (2 gang)',
        vendor: 'Moes',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        extend: extend.switch(),
        meta: {multiEndpoint: true},
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            exposes.enum('power_on_behavior', ea.ALL, ['on', 'off', 'previous'])
                .withDescription('Controls the behaviour when the device is powered on')],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['TS0112'],
        model: 'ZK-EU-2U',
        vendor: 'Moes',
        description: 'Zigbee 3.0 dual USB wireless socket plug',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            const hasEndpoint2 = !!device.getEndpoint(2);
            return {l1: 1, l2: hasEndpoint2 ? 2 : 7};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_aoclfnxz'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ztvwu4nk'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ye5jkfsb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_u9bfwha0'}],
        model: 'BHT-002-GCLZB',
        vendor: 'Moes',
        description: 'Moes BHT series Thermostat',
        fromZigbee: [fz.moes_thermostat],
        toZigbee: [tz.moes_thermostat_child_lock, tz.moes_thermostat_current_heating_setpoint, tz.moes_thermostat_mode,
            tz.moes_thermostat_standby, tz.moes_thermostat_sensor, tz.moes_thermostat_calibration,
            tz.moes_thermostat_deadzone_temperature, tz.moes_thermostat_max_temperature_limit, tz.moes_thermostat_min_temperature_limit],
        exposes: [e.child_lock(), e.deadzone_temperature(), e.max_temperature_limit(), e.min_temperature_limit(),
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat', 'cool'], ea.STATE)
                .withPreset(['hold', 'program']).withSensor(['IN', 'AL', 'OU'], ea.STATE_SET)],
        onEvent: tuya.onEventSetLocalTime,
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_amp6tsvy'}, {modelID: 'TS0601', manufacturerName: '_TZE200_tviaymwx'}],
        model: 'ZTS-EU_1gang',
        vendor: 'Moes',
        description: 'Wall touch light switch (1 gang)',
        exposes: [e.switch().setAccess('state', ea.STATE_SET),
            exposes.enum('indicate_light', ea.STATE_SET, Object.values(tuya.moesSwitch.indicateLight))
                .withDescription('Indicator light status'),
            exposes.enum('power_on_behavior', ea.STATE_SET, Object.values(tuya.moesSwitch.powerOnBehavior))
                .withDescription('Controls the behavior when the device is powered on')],
        fromZigbee: [fz.tuya_switch, fz.moes_switch],
        toZigbee: [tz.tuya_switch_state, tz.moes_switch],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_g1ib5ldv'}],
        model: 'ZTS-EU_2gang',
        vendor: 'Moes',
        description: 'Wall touch light switch (2 gang)',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            exposes.enum('indicate_light', ea.STATE_SET, Object.values(tuya.moesSwitch.indicateLight))
                .withDescription('Indicator light status'),
            exposes.enum('power_on_behavior', ea.STATE_SET, Object.values(tuya.moesSwitch.powerOnBehavior))
                .withDescription('Controls the behavior when the device is powered on')],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch, fz.moes_switch],
        toZigbee: [tz.tuya_switch_state, tz.moes_switch],
        onEvent: tuya.onEventSetLocalTime,
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_tz32mtza'}],
        model: 'ZTS-EU_3gang',
        vendor: 'Moes',
        description: 'Wall touch light switch (3 gang)',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            exposes.enum('indicate_light', ea.STATE_SET, Object.values(tuya.moesSwitch.indicateLight))
                .withDescription('Indicator light status'),
            exposes.enum('power_on_behavior', ea.STATE_SET, Object.values(tuya.moesSwitch.powerOnBehavior))
                .withDescription('Controls the behavior when the device is powered on')],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch, fz.moes_switch],
        toZigbee: [tz.tuya_switch_state, tz.moes_switch],
        onEvent: tuya.onEventSetLocalTime,
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_1ozguk6x'}],
        model: 'ZTS-EU_4gang',
        vendor: 'Moes',
        description: 'Wall touch light switch (4 gang)',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET),
            exposes.enum('indicate_light', ea.STATE_SET, Object.values(tuya.moesSwitch.indicateLight))
                .withDescription('Indicator light status'),
            exposes.enum('power_on_behavior', ea.STATE_SET, Object.values(tuya.moesSwitch.powerOnBehavior))
                .withDescription('Controls the behavior when the device is powered on')],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch, fz.moes_switch],
        toZigbee: [tz.tuya_switch_state, tz.moes_switch],
        onEvent: tuya.onEventSetLocalTime,
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0222', manufacturerName: '_TYZB01_kvwjujy9'}, {modelID: 'TS0222', manufacturerName: '_TYZB01_ftdkanlj'}],
        model: 'ZSS-ZK-THL',
        vendor: 'Moes',
        description: 'Smart temperature and humidity meter with display',
        fromZigbee: [fz.battery, fz.illuminance, fz.humidity, fz.temperature],
        toZigbee: [],
        exposes: [e.battery(), e.illuminance(), e.illuminance_lux().withUnit('lx'), e.humidity(), e.temperature()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_b6wax7g0'}],
        model: 'BRT-100-TRV',
        vendor: 'Moes',
        description: 'Thermostatic radiator valve',
        ota: ota.zigbeeOTA,
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, fz.moesS_thermostat],
        toZigbee: [tz.moesS_thermostat_current_heating_setpoint, tz.moesS_thermostat_child_lock,
            tz.moesS_thermostat_window_detection, tz.moesS_thermostat_temperature_calibration,
            tz.moesS_thermostat_boost_heating, tz.moesS_thermostat_boostHeatingCountdownTimeSet,
            tz.moesS_thermostat_eco_temperature, tz.moesS_thermostat_max_temperature,
            tz.moesS_thermostat_min_temperature, tz.moesS_thermostat_moesSecoMode,
            tz.moesS_thermostat_system_mode, tz.moesS_thermostat_schedule_programming],
        exposes: [
            e.battery(), e.child_lock(), e.eco_mode(), e.eco_temperature(), e.max_temperature().withValueMax(45), e.min_temperature(),
            e.valve_state(), e.position(), e.window_detection(),
            exposes.binary('window', ea.STATE, 'CLOSED', 'OPEN').withDescription('Window status closed or open '),
            exposes.climate()
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withPreset(['programming', 'manual', 'temporary_manual', 'holiday'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. '+
                'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                'PROGRAMMING MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                'HOLIDAY MODE ⛱ - In this mode, for example, the vacation mode is set for 10 days and the temperature is set' +
                'to 15 degrees Celsius. After 10 days, the device will automatically switch to programming mode. ' +
                'TEMPORARY MANUAL MODE - In this mode, ☝ icon will flash. At this time, the device executes the manually set ' +
                'temperature and returns to the weekly programming mode in the next time period. '),
            exposes.text('programming_mode', ea.STATE_SET).withDescription('PROGRAMMING MODE ⏱ - In this mode, ' +
                'the device executes a preset week programming temperature time and temperature. ' +
                'You can set up to 4 stages of temperature every for WEEKDAY ➀➁➂➃➄,  SATURDAY ➅ and SUNDAY ➆.'),
            exposes.binary('boost_heating', ea.STATE_SET, 'ON', 'OFF').withDescription('Boost Heating: press and hold "+" for 3 seconds, ' +
                'the device will enter the boost heating mode, and the ▷╵◁ will flash. The countdown will be displayed in the APP'),
            exposes.numeric('boost_heating_countdown', ea.STATE).withUnit('Min').withDescription('Countdown in minutes')
                .withValueMin(0).withValueMax(15),
            exposes.numeric('boost_heating_countdown_time_set', ea.STATE_SET).withUnit('second')
                .withDescription('Boost Time Setting 100 sec - 900 sec, (default = 300 sec)').withValueMin(100).withValueMax(900)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_la2c2uo9'}],
        model: 'MS-105Z',
        vendor: 'Moes',
        description: '1 gang 2 way Zigbee dimmer switch',
        fromZigbee: [fz.moes_105_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.moes_105_dimmer],
        meta: {turnsOffAtBrightness1: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_fjjbhx9d'}],
        model: 'ZS-EUD',
        vendor: 'Moes',
        description: '2 gang light dimmer switch',
        fromZigbee: [fzLocal.ZSEUD, fz.ignore_basic_report],
        toZigbee: [tzLocal.ZSEUD_brightness, tzLocal.ZSEUD_state],
        meta: {turnsOffAtBrightness1: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.light_brightness().withEndpoint('l1').setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET),
            e.light_brightness().withEndpoint('l2').setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_e3oitdyu'}],
        model: 'MS-105B',
        vendor: 'Moes',
        description: 'Smart dimmer module (2 gang)',
        fromZigbee: [fz.moes_105_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.moes_105_dimmer],
        meta: {turnsOffAtBrightness1: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.light_brightness().withEndpoint('l1').setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET),
            e.light_brightness().withEndpoint('l2').setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_7hcgjxpc'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_rcggc0ys'}],
        model: 'ZLD-RCW',
        vendor: 'Moes',
        description: 'RGB+CCT Zigbee LED Controller',
        toZigbee: extend.light_onoff_brightness_colortemp_color().toZigbee.concat([
            tz.tuya_do_not_disturb, tz.tuya_color_power_on_behavior,
        ]),
        meta: {applyRedFix: true, enhancedHue: false},
        fromZigbee: extend.light_onoff_brightness_colortemp_color().fromZigbee,
        exposes: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500], disableColorTempStartup: true}).exposes.concat([
            exposes.binary('do_not_disturb', ea.STATE_SET, true, false)
                .withDescription('Do not disturb mode'),
            exposes.enum('color_power_on_behavior', ea.STATE_SET, ['initial', 'previous', 'cutomized'])
                .withDescription('Power on behavior state'),
        ]),
    },
    {
        fingerprint: [{modelID: 'TS130F', manufacturerName: '_TZ3000_1dd0d5yi'}],
        model: 'MS-108ZR',
        vendor: 'Moes',
        description: 'Zigbee + RF curtain switch module',
        meta: {coverInverted: true},
        fromZigbee: [fz.tuya_cover_options, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.moes_cover_calibration, tz.cover_position_tilt, tz.tuya_cover_reversal],
        exposes: [e.cover_position(), exposes.numeric('calibration_time', ea.ALL).withValueMin(0).withValueMax(100),
            exposes.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']), exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF')],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_nhyj64w2'}],
        model: 'ZTS-EUR-C',
        vendor: 'Moes',
        description: 'Zigbee + RF curtain switch',
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.moes_cover, fz.ignore_basic_report],
        toZigbee: [tz.moes_cover],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET), exposes.enum('backlight', ea.STATE_SET, ['OFF', 'ON']),
            exposes.enum('calibration', ea.STATE_SET, ['OFF', 'ON']), exposes.enum('motor_reversal', ea.STATE_SET, ['OFF', 'ON'])],
    },
    {
        fingerprint: [
            {modelID: 'TS1201', manufacturerName: '_TZ3290_j37rooaxrcdcqo5n'},
            {modelID: 'TS1201', manufacturerName: '_TZ3290_ot6ewjvmejq5ekhl'},
        ],
        model: 'UFO-R11',
        vendor: 'Moes',
        description: 'Universal smart IR remote control',
        fromZigbee: [
            fzZosung.zosung_send_ir_code_00, fzZosung.zosung_send_ir_code_01, fzZosung.zosung_send_ir_code_02,
            fzZosung.zosung_send_ir_code_03, fzZosung.zosung_send_ir_code_04, fzZosung.zosung_send_ir_code_05,
            fz.battery,
        ],
        toZigbee: [tzZosung.zosung_ir_code_to_send, tzZosung.zosung_learn_ir_code],
        exposes: [ez.learn_ir_code(), ez.learned_ir_code(), ez.ir_code_to_send(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0011', manufacturerName: '_TZ3000_hhiodade'}],
        model: 'ZS-EUB_1gang',
        vendor: 'Moes',
        description: 'Wall light switch (1 gang)',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type, tz.tuya_backlight_mode]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type, fz.tuya_backlight_mode]),
        exposes: [
            e.switch(),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH'])
                .withDescription('Indicator light status: LOW: Off | MEDIUM: On| HIGH: Inverted'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];
