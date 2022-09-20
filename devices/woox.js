const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    R7049_status: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp; // First we get the data point ID
                const value = tuya.getDataValue(dpValue); // This function will take care of converting the data to proper JS type
                switch (dp) {
                case 1:
                    result.smoke = Boolean(!value);
                    break;
                case 8:
                    result.test_alarm = value;
                    break;
                case 9: {
                    const testAlarmResult = {0: 'checking', 1: 'check_success', 2: 'check_failure', 3: 'others'};
                    result.test_alarm_result = testAlarmResult[value];
                    break;
                }
                case 11:
                    result.fault_alarm = Boolean(value);
                    break;
                case 14: {
                    const batteryLevels = {0: 'low', 1: 'middle', 2: 'high'};
                    result.battery_level = batteryLevels[value];
                    result.battery_low = value === 0;
                    break;
                }
                case 16:
                    result.silence_siren = value;
                    break;
                case 20: {
                    const alarm = {0: true, 1: false};
                    result.alarm = alarm[value];
                    break;
                }
                default:
                    meta.logger.warn(`zigbee-herdsman-converters:Woox Smoke Detector: NOT RECOGNIZED DP #${
                        dp} with data ${JSON.stringify(dpValue)}`);
                }
            }
            return result;
        },
    },
    woox_R7060: {
        cluster: 'manuSpecificTuya',
        type: ['commandActiveStatusReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'woox_R7060');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);

            switch (dp) {
            case tuya.dataPoints.wooxSwitch:
                return {state: value === 2 ? 'OFF' : 'ON'};
            case 101:
                return {battery: value};
            default:
                meta.logger.warn(`zigbee-herdsman-converters:WooxR7060: Unrecognized DP #${
                    dp} with data ${JSON.stringify(dpValue)}`);
            }
        },
    },
};

const tzLocal = {
    R7049_silenceSiren: {
        key: ['silence_siren'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, 16, value);
        },
    },
    R7049_testAlarm: {
        key: ['test_alarm'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, 8, value);
        },
    },
    R7049_alarm: {
        key: ['alarm'],
        convertSet: async (entity, key, value, meta) => {
            const linkAlarm = {true: 0, false: 1};
            await tuya.sendDataPointEnum(entity, 20, linkAlarm[value]);
        },
    },
};

module.exports = [
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TZ3210_eymunffl'}],
        model: 'R7060',
        vendor: 'Woox',
        description: 'Smart garden irrigation control',
        fromZigbee: [fz.on_off, fz.ignore_tuya_set_time, fz.ignore_basic_report, fzLocal.woox_R7060],
        toZigbee: [tz.on_off],
        onEvent: tuya.onEventSetTime,
        exposes: [e.switch(), e.battery()],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_keabpigv'}],
        model: 'R9077',
        vendor: 'Woox',
        description: 'RGB+CCT LED',
        extend: extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
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
        fromZigbee: [fzLocal.R7049_status, fz.ignore_tuya_set_time, fz.ignore_time_read],
        toZigbee: [tzLocal.R7049_silenceSiren, tzLocal.R7049_testAlarm, tzLocal.R7049_alarm],
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
        fingerprint: [{modelID: 'TS0219', manufacturerName: '_TYZB01_ynsiasng'}, {modelID: 'TS0219', manufacturerName: '_TYZB01_bwsijaty'}],
        model: 'R7051',
        vendor: 'Woox',
        description: 'Smart siren',
        fromZigbee: [fz.battery, fz.ts0216_siren, fz.ias_alarm_only_alarm_1, fz.power_source],
        toZigbee: [tz.warning, tz.ts0216_volume],
        exposes: [e.battery(), e.battery_voltage(), e.warning(), exposes.binary('alarm', ea.STATE, true, false),
            exposes.binary('ac_connected', ea.STATE, true, false).withDescription('Is the device plugged in'),
            exposes.numeric('volume', ea.ALL).withValueMin(0).withValueMax(100).withDescription('Volume of siren')],
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
