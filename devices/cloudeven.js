const fz = {
    ...require('../converters/fromZigbee'),
    legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const ea = exposes.access;

const fzLocal = {
    cloudeven_ignore_tuya_set_time: {
        cluster: 'manuSpecificTuya',
        type: ['commandMcuSyncTime'],
        convert: (model, msg, publish, options, meta) => {
            console.log(`raw: ${JSON.stringify(msg)}`);
            return null;
        },
    },
    cloudeven_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport', 'raw'],
        convert: (model, msg, publish, options, meta) => {
            // meta.logger.debug(`got dp data: '${JSON.stringify(msg.data, undefined, 2)}'`);
            const dpValue = tuya.firstDpValue(msg, meta, 'tuya_thermostat');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);
            const presetLookup = {0: 'manual', 1: 'holiday', 2: 'program'};
            switch (dp) {
            case tuya.dataPoints.state:
                return {system_mode: value ? 'heat' : 'off'};
            case tuya.dataPoints.tvMode:
                return {preset: presetLookup[value]};
            case tuya.dataPoints.moesScheduleEnable:
                return {preset_mode: value ? 'hold' : 'program', preset: value ? 'hold' : 'program'};
            case tuya.dataPoints.tvHeatingSetpoint:
                return {current_heating_setpoint: parseFloat((value / 10).toFixed(1))};
            case tuya.dataPoints.tvLocalTemp:
                return {local_temperature: parseFloat((value / 10).toFixed(1))};
            case tuya.dataPoints.tvErrorStatus:
                return {error_status: value};
            case tuya.dataPoints.tvTempCalibration:
                return {local_temperature_calibration: value > 8 ? 0xFFFFFFFF - value / 10.0 : value / 10.0};
            default:
                // Still need to debug some dps
                console.log(`cloudevenThermostat: Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`);
            }
        },
    },

};

const tzLocal = {
    cloudeven_thermostat: {
        key: [
            'current_heating_setpoint', 'system_mode', 'preset',
        ],
        convertSet: async (entity, key, value, meta) => {
            const presetLookup = {'manual': 0, 'holiday': 1, 'program': 2};
            switch (key) {
            case 'system_mode':
                await tuya.sendDataPointBool(entity, tuya.dataPoints.state, value === 'heat');
                break;
            case 'preset':
                await tuya.sendDataPointEnum(entity, tuya.dataPoints.tvMode, presetLookup[value]);
                break;
            case 'current_heating_setpoint':
                await tuya.sendDataPointValue(entity, tuya.dataPoints.tvHeatingSetpoint, value * 10);
                break;
            default: // Unknown key
                meta.logger.warn(`toZigbee.cloudeven_thermostat: Unhandled key ${key}`);
            }
        },
    },
    cloudeven_thermostat_local_temperature: {
        key: ['local_temperature'],
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', ['tvLocalTemp']);
        },
    },
    cloudeven_thermostat_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value, meta) => {
            value = value * 10;
            if (value < 0) value = 0xFFFFFFFF + value + 1;
            await tuya.sendDataPointValue(entity, tuya.dataPoints.saswellTempCalibration, value);
        },
    },
};

const exposesList = [
    exposes.climate()
        .withLocalTemperature(ea.STATE)
        .withLocalTemperatureCalibration(-8, 8, 0.5, ea.STATE_SET)
        .withSetpoint('current_heating_setpoint', 0, 30, 0.5, ea.STATE_SET)
        .withSystemMode(['off', 'heat'], ea.STATE_SET)
        .withPreset(['manual', 'holiday', 'program'], ea.STATE),
    exposes.numeric('error_status', ea.STATE).withDescription('Error status'),
];

const definition = [{
    zigbeeModel: ['TS0601'],
    fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_0hg58wyk'}],
    model: 'TS0601',
    vendor: 'Cloud Even',
    description: 'Cloud Even Thermostatic Radiator Valve',
    fromZigbee: [
        fz.ignore_basic_report,
        fz.ignore_tuya_set_time,
        fzLocal.cloudeven_thermostat,
        fz.legacy.tuya_thermostat_weekly_schedule,
    ],
    toZigbee: [
        tzLocal.cloudeven_thermostat,
        tzLocal.cloudeven_thermostat_calibration,
        tz.tuya_thermostat_weekly_schedule,
    ],
    meta: {
        timeout: 20000,
        thermostat: {
            weeklyScheduleMaxTransitions: 4,
            weeklyScheduleSupportedModes: [1],
            weeklyScheduleFirstDayDpId: tuya.dataPoints.moesSchedule,
            weeklyScheduleConversion: 'saswell',
        },
    },
    onEvent: tuya.onEventSetTime,
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genTime']);
    },
    exposes: exposesList,
}];

module.exports = definition;
