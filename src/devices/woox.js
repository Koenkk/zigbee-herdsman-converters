const exposes = require('../lib/exposes');
const legacy = require('../lib/legacy');
const reporting = require('../lib/reporting');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TZ3210_eymunffl'}],
        model: 'R7060',
        vendor: 'Woox',
        description: 'Smart garden irrigation control',
        fromZigbee: [fz.on_off, fz.ignore_tuya_set_time, fz.ignore_basic_report, legacy.fromZigbee.woox_R7060],
        toZigbee: [tz.on_off],
        onEvent: tuya.onEventSetTime,
        exposes: [e.switch(), e.battery()],
        meta: {disableDefaultResponse: true},
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_keabpigv'}],
        model: 'R9077',
        vendor: 'Woox',
        description: 'RGB+CCT LED',
        extend: tuya.extend.light_onoff_brightness_colortemp_color(),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_rusu2vzb'}],
        model: 'R7048',
        vendor: 'Woox',
        description: 'Smart humidity & temperature sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_aycxwiau'}],
        model: 'R7049',
        vendor: 'Woox',
        description: 'Smart smoke alarm',
        meta: {timeout: 30000, disableDefaultResponse: true},
        fromZigbee: [legacy.fromZigbee.R7049_status, fz.ignore_tuya_set_time, fz.ignore_time_read],
        toZigbee: [legacy.toZigbee.R7049_silenceSiren, legacy.toZigbee.R7049_testAlarm, legacy.toZigbee.R7049_alarm],
        exposes: [e.battery_low(),
            exposes.binary('smoke', ea.STATE, true, false).withDescription('Smoke alarm status'),
            exposes.binary('test_alarm', ea.STATE_SET, true, false).withDescription('Test alarm'),
            exposes.enum('test_alarm_result', ea.STATE, ['checking', 'check_success', 'check_failure', 'others'])
                .withDescription('Test alarm result'),
            exposes.enum('battery_level', ea.STATE, ['low', 'middle', 'high']).withDescription('Battery level state'),
            exposes.binary('alarm', ea.STATE_SET, true, false).withDescription('Alarm enable'),
            exposes.binary('fault_alarm', ea.STATE, true, false).withDescription('Fault alarm status'),
            exposes.binary('silence_siren', ea.STATE_SET, true, false).withDescription('Silence siren')],
        onEvent: tuya.onEventsetTime,
    },
    {
        fingerprint: [{modelID: 'TS0219', manufacturerName: '_TYZB01_ynsiasng'}, {modelID: 'TS0219', manufacturerName: '_TYZB01_bwsijaty'},
            {modelID: 'TS0219', manufacturerName: '_TYZB01_rs7ff6o7'}],
        model: 'R7051',
        vendor: 'Woox',
        description: 'Smart siren',
        fromZigbee: [fz.battery, fz.ts0216_siren, fz.ias_alarm_only_alarm_1, fz.power_source],
        toZigbee: [tz.warning, tz.ts0216_volume, tz.ts0216_duration],
        exposes: [e.battery(), e.battery_voltage(), e.warning(), exposes.binary('alarm', ea.STATE, true, false),
            exposes.binary('ac_connected', ea.STATE, true, false).withDescription('Is the device plugged in'),
            exposes.numeric('volume', ea.ALL).withValueMin(0).withValueMax(100).withDescription('Volume of siren'),
            exposes.numeric('duration', ea.ALL).withValueMin(0).withValueMax(3600).withDescription('Duration of siren')],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
];
