const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0121', manufacturerName: '_TYZB01_iuepbmpv'}, {modelID: 'TS011F', manufacturerName: '_TZ3000_zmy1waw6'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_bkfe0bab'}],
        model: 'MS-104Z',
        description: 'Smart light switch module (1 gang)',
        vendor: 'Moes',
        extend: extend.switch(),
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
            {modelID: 'TS0601', manufacturerName: '_TZE200_ztvwu4nk'}],
        model: 'BHT-002-GCLZB',
        vendor: 'Moes',
        description: 'Moes BHT series Thermostat',
        fromZigbee: [fz.moes_thermostat],
        toZigbee: [tz.moes_thermostat_child_lock, tz.moes_thermostat_current_heating_setpoint, tz.moes_thermostat_mode,
            tz.moes_thermostat_standby, tz.moes_thermostat_sensor, tz.moes_thermostat_calibration,
            tz.moes_thermostat_deadzone_temperature, tz.moes_thermostat_max_temperature_limit],
        exposes: [e.child_lock(), e.deadzone_temperature(), e.max_temperature_limit(),
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withLocalTemperatureCalibration(ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat', 'cool'], ea.STATE)
                .withPreset(['hold', 'program']).withSensor(['IN', 'AL', 'OU'], ea.STATE_SET)],
        onEvent: tuya.onEventSetLocalTime,
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_amp6tsvy'}],
        model: 'ZTS-EU_1gang',
        vendor: 'Moes',
        description: 'Wall touch light switch (1 gang)',
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_g1ib5ldv'}],
        model: 'ZTS-EU_2gang',
        vendor: 'Moes',
        description: 'Wall touch light switch (2 gang)',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
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
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
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
        fingerprint: [{modelID: 'TS0222', manufacturerName: '_TYZB01_kvwjujy9'}],
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
            tz.moesS_thermostat_boost_heating_countdown, tz.moesS_thermostat_system_mode,
            tz.moesS_thermostat_boost_heating, tz.moesS_thermostat_boostHeatingCountdownTimeSet,
            tz.moesS_thermostat_eco_temperature, tz.moesS_thermostat_max_temperature,
            tz.moesS_thermostat_min_temperature, tz.moesS_thermostat_moesSecoMode],
        exposes: [
            e.battery(), e.child_lock(), e.eco_mode(), e.eco_temperature(), e.max_temperature(), e.min_temperature(),
            e.position(), e.window_detection(),
            exposes.binary('window', ea.STATE, 'CLOSED', 'OPEN').withDescription('Window status closed or open '),
            exposes.climate()
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(ea.STATE_SET).withPreset(['programming', 'manual', 'temporary_manual', 'holiday'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. '+
                'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                'PROGRAMMING MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                'HOLIDAY MODE ⛱ - In this mode, for example, the vacation mode is set for 10 days and the temperature is set' +
                'to 15 degrees Celsius. After 10 days, the device will automatically switch to programming mode. ' +
                'TEMPORARY MANUAL MODE - In this mode, ☝ icon will flash. At this time, the device executes the manually set ' +
                'temperature and returns to the weekly programming mode in the next time period. '),
            exposes.composite('programming_mode').withDescription('PROGRAMMING MODE ⏱ - In this mode, ' +
                'the device executes a preset week programming temperature time and temperature. ')
                .withFeature(exposes.text('program_weekday', ea.STATE))
                .withFeature(exposes.text('program_saturday', ea.STATE))
                .withFeature(exposes.text('program_sunday', ea.STATE)),
            exposes.binary('boost_heating', ea.STATE_SET, 'ON', 'OFF').withDescription('Boost Heating: press and hold "+" for 3 seconds, ' +
                'the device will enter the boost heating mode, and the ▷╵◁ will flash. The countdown will be displayed in the APP'),
            exposes.numeric('boost_heating_countdown', ea.STATE_SET).withUnit('min').withDescription('Countdown in minutes'),
            exposes.numeric('boost_heating_countdown_time_set', ea.STATE_SET).withUnit('second')
                .withDescription('Boost Time Setting 100 sec - 900 sec, (default = 300 sec)')],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_la2c2uo9'}],
        model: 'MS-105Z',
        vendor: 'Moes',
        description: '1 gang 2 way Zigbee dimmer switch',
        fromZigbee: [fz.moes_105z_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.moes_105z_dimmer],
        meta: {turnsOffAtBrightness1: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
    },
];
