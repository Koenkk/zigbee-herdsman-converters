const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    tuya_alecto_smoke: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'tuya_alecto_smoke');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);
            switch (dp) {
            case tuya.dataPoints.alectoSmokeState:
                return {smoke_state: {0: 'alarm', 1: 'normal'}[value]};
            case tuya.dataPoints.alectoSmokeValue:
                return {smoke_value: value};
            case tuya.dataPoints.alectoSelfChecking:
                return {self_checking: value};
            case tuya.dataPoints.alectoCheckingResult:
                return {checking_result: {0: 'checking', 1: 'check_success', 2: 'check_failure', 3: 'others'}[value]};
            case tuya.dataPoints.alectoSmokeTest:
                return {smoke_test: value};
            case tuya.dataPoints.alectoLifecycle:
                return {lifecycle: value};
            case tuya.dataPoints.alectoBatteryPercentage:
                return {battery: value};
            case tuya.dataPoints.alectoBatteryState:
                return {battery_state: {0: 'low', 1: 'middle', 2: 'high'}[value]};
            case tuya.dataPoints.alectoSilence:
                return {silence: value};
            default:
                meta.logger.warn(`zigbee-herdsman-converters:tuya_alecto_smoke: Unrecognized ` +
                    `DP #${ dp} with data ${JSON.stringiy(msg.data)}`);
            }
        },
    },
};

const tzLocal = {
    tuya_alecto_smoke: {
        key: ['self_checking', 'silence'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'self_checking':
                await tuya.sendDataPointBool(entity, tuya.dataPoints.alectoSelfChecking, value);
                break;
            case 'silence':
                await tuya.sendDataPointBool(entity, tuya.dataPoints.alectoSilence, value);
                break;
            default: // Unknown key
                throw new Error(`zigbee-herdsman-converters:tuya_alecto_smoke: Unhandled key ${key}`);
            }
        },
    },
};

module.exports = [
    {
        fingerprint: [
            {modelID: 'daqwrsj\u0000', manufacturerName: '_TYST11_8daqwrsj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_qtbrwrfv'},
        ],
        model: 'SMART-HEAT10',
        vendor: 'Alecto',
        description: 'Radiator valve with thermostat',
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report],
        meta: {tuyaThermostatSystemMode: tuya.thermostatSystemModes4, tuyaThermostatPreset: tuya.thermostatPresets,
            tuyaThermostatPresetToSystemMode: tuya.thermostatSystemModes4},
        toZigbee: [tz.tuya_thermostat_child_lock, tz.siterwell_thermostat_window_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_system_mode,
        ],
        exposes: [e.child_lock(), e.window_detection(), e.battery(), exposes.climate()
            .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'tbrwrfv\u0000', manufacturerName: '_TYST11_qtbrwrfv'}],
        model: 'SMART-SMOKE10',
        vendor: 'Alecto',
        description: 'Smoke detector',
        fromZigbee: [fzLocal.tuya_alecto_smoke],
        toZigbee: [tzLocal.tuya_alecto_smoke],
        meta: {},
        exposes: [exposes.text('smoke_state', ea.STATE, ['alarm', 'normal']),
            exposes.text('battery_state', ea.STATE, ['low', 'middle', 'high']),
            exposes.text('checking_result', ea.STATE, ['checking', 'check_success', 'check_failure', 'others']),
            exposes.numeric('smoke_value', ea.STATE),
            exposes.numeric('battery', ea.STATE),
            exposes.binary('lifecycle', ea.STATE, true, false),
            exposes.binary('self_checking', ea.STATE_SET, true, false),
            exposes.binary('silence', ea.STATE_SET, true, false)],
    },
];
