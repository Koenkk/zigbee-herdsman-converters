const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');

const {presets: ep, access: ea} = exposes;

const CAPACITY = 'capacity';
const DURATION = 'duration';
const MINUTES_IN_A_DAY = 1440;
const OFF = 'OFF';
const ON = 'ON';
const SAFETY_MIN_SECS = 10;
const SECONDS_IN_12_HOURS = 43200;

const toLocalTime = (time, timezone) => {
    if (time === '--:--:--') {
        return time;
    }

    const local = new Date(`2000-01-01T${time}.000${timezone}`); // Using 1970 instead produces edge cases
    return local.toTimeString().split(' ').shift();
};

const keys = {
    giexWaterValve: {
        battery: 'battery',
        currentTemperature: 'current_temperature',
        cycleIrrigationInterval: 'cycle_irrigation_interval',
        cycleIrrigationNumTimes: 'cycle_irrigation_num_times',
        irrigationEndTime: 'irrigation_end_time',
        irrigationStartTime: 'irrigation_start_time',
        irrigationTarget: 'irrigation_target',
        lastIrrigationDuration: 'last_irrigation_duration',
        mode: 'mode',
        state: 'state',
        waterConsumed: 'water_consumed',
    },
};

const dataPoints = {
    giexWaterValve: {
        battery: 108,
        currentTemperature: 106,
        cycleIrrigationInterval: 105,
        cycleIrrigationNumTimes: 103,
        irrigationEndTime: 102,
        irrigationStartTime: 101,
        irrigationTarget: 104,
        lastIrrigationDuration: 114,
        mode: 1,
        state: 2,
        waterConsumed: 111,
    },
};

const fzModelConverters = {
    QT06_1: {
        // _TZE200_sh1btabb timezone is GMT+8
        time: (value) => toLocalTime(value, '+08:00'),
    },
};

const fzLocal = {
    giexWaterValve: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const modelConverters = fzModelConverters[model.model] || {};
            for (const dpValue of msg.data.dpValues) {
                const value = tuya.getDataValue(dpValue);
                const {dp} = dpValue;
                switch (dp) {
                case dataPoints.giexWaterValve.state:
                    return {[keys.giexWaterValve.state]: value ? ON: OFF};
                case dataPoints.giexWaterValve.mode:
                    return {[keys.giexWaterValve.mode]: value ? CAPACITY: DURATION};
                case dataPoints.giexWaterValve.irrigationTarget:
                    return {[keys.giexWaterValve.irrigationTarget]: value};
                case dataPoints.giexWaterValve.cycleIrrigationNumTimes:
                    return {[keys.giexWaterValve.cycleIrrigationNumTimes]: value};
                case dataPoints.giexWaterValve.cycleIrrigationInterval:
                    return {[keys.giexWaterValve.cycleIrrigationInterval]: value};
                case dataPoints.giexWaterValve.waterConsumed:
                    return {[keys.giexWaterValve.waterConsumed]: value};
                case dataPoints.giexWaterValve.irrigationStartTime:
                    return {[keys.giexWaterValve.irrigationStartTime]: modelConverters.time?.(value) || value};
                case dataPoints.giexWaterValve.irrigationEndTime:
                    return {[keys.giexWaterValve.irrigationEndTime]: modelConverters.time?.(value) || value};
                case dataPoints.giexWaterValve.lastIrrigationDuration:
                    return {[keys.giexWaterValve.lastIrrigationDuration]: value.split(',').shift()}; // Remove meaningless ,0 suffix
                case dataPoints.giexWaterValve.battery:
                    return {[keys.giexWaterValve.battery]: value};
                case dataPoints.giexWaterValve.currentTemperature:
                    return; // Do Nothing - value ignored because it isn't a valid temperature reading (misdocumented and usage unclear)
                default: // Unknown data point warning
                    meta.logger.warn(`fzLocal.giexWaterValve: Unrecognized DP #${dp} with VALUE = ${value}`);
                }
            }
        },
    },
};

const tzModelConverters = {
    QT06_2: {
        // _TZE200_a7sghmms irrigation time should not be less than 10 secs as per GiEX advice
        irrigationTarget: (value, mode) => value > 0 && value < SAFETY_MIN_SECS && mode === DURATION ? SAFETY_MIN_SECS : value,
    },
};

const tzLocal = {
    giexWaterValve:
    {
        key: [
            keys.giexWaterValve.mode,
            keys.giexWaterValve.irrigationTarget,
            keys.giexWaterValve.state,
            keys.giexWaterValve.cycleIrrigationNumTimes,
            keys.giexWaterValve.cycleIrrigationInterval,
        ],
        convertSet: async (entity, key, value, meta) => {
            const modelConverters = tzModelConverters[meta.mapped?.model] || {};
            switch (key) {
            case keys.giexWaterValve.state:
                await tuya.sendDataPointBool(entity, dataPoints.giexWaterValve.state, value === ON);
                break;
            case keys.giexWaterValve.mode:
                await tuya.sendDataPointBool(entity, dataPoints.giexWaterValve.mode, value === CAPACITY);
                return {state: {[keys.giexWaterValve.mode]: value}};
            case keys.giexWaterValve.irrigationTarget: {
                const mode = meta.state?.[keys.giexWaterValve.mode];
                const sanitizedValue = modelConverters.irrigationTarget?.(value, mode) || value;
                await tuya.sendDataPointValue(entity, dataPoints.giexWaterValve.irrigationTarget, sanitizedValue);
                return {state: {[keys.giexWaterValve.irrigationTarget]: sanitizedValue}};
            }
            case keys.giexWaterValve.cycleIrrigationNumTimes:
                await tuya.sendDataPointValue(entity, dataPoints.giexWaterValve.cycleIrrigationNumTimes, value);
                return {state: {[keys.giexWaterValve.cycleIrrigationNumTimes]: value}};
            case keys.giexWaterValve.cycleIrrigationInterval:
                await tuya.sendDataPointValue(entity, dataPoints.giexWaterValve.cycleIrrigationInterval, value);
                return {state: {[keys.giexWaterValve.cycleIrrigationInterval]: value}};
            default: // Unknown key warning
                meta.logger.warn(`tzLocal.giexWaterValve: Unhandled KEY ${key}`);
            }
        },
    },
};

const exportTemplates = {
    giexWaterValve: {
        vendor: 'GiEX',
        description: 'Water irrigation valve',
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fzLocal.giexWaterValve],
        toZigbee: [tzLocal.giexWaterValve],
        exposes: [
            ep.battery(),
            exposes.binary(keys.giexWaterValve.state, ea.STATE_SET, ON, OFF)
                .withDescription('State'),
            exposes.enum(keys.giexWaterValve.mode, ea.STATE_SET, [DURATION, CAPACITY])
                .withDescription('Irrigation mode'),
            exposes.numeric(keys.giexWaterValve.cycleIrrigationNumTimes, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Number of cycle irrigation times, set to 0 for single cycle'),
            exposes.numeric(keys.giexWaterValve.irrigationStartTime, ea.STATE)
                .withDescription('Last irrigation start time'),
            exposes.numeric(keys.giexWaterValve.irrigationEndTime, ea.STATE)
                .withDescription('Last irrigation end time'),
            exposes.numeric(keys.giexWaterValve.lastIrrigationDuration, ea.STATE)
                .withDescription('Last irrigation duration'),
            exposes.numeric(keys.giexWaterValve.waterConsumed, ea.STATE)
                .withUnit('L')
                .withDescription('Last irrigation water consumption'),
        ],
    },
};

module.exports = [
    // _TZE200_sh1btabb uses minutes, timezone is GMT+8
    {
        ...exportTemplates.giexWaterValve,
        model: 'QT06_1',
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_sh1btabb'},
        ],
        exposes: [
            ...exportTemplates.giexWaterValve.exposes,
            exposes.numeric(keys.giexWaterValve.irrigationTarget, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(MINUTES_IN_A_DAY)
                .withUnit('minutes or litres')
                .withDescription('Irrigation target, duration in minutes or capacity in litres (depending on mode)'),
            exposes.numeric(keys.giexWaterValve.cycleIrrigationInterval, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(MINUTES_IN_A_DAY)
                .withUnit('min')
                .withDescription('Cycle irrigation interval'),
        ],
    },
    // _TZE200_a7sghmms uses seconds, timezone is local
    {
        ...exportTemplates.giexWaterValve,
        model: 'QT06_2',
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_a7sghmms'},
        ],
        exposes: [
            ...exportTemplates.giexWaterValve.exposes,
            exposes.numeric(keys.giexWaterValve.irrigationTarget, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(SECONDS_IN_12_HOURS)
                .withUnit('seconds or litres')
                .withDescription('Irrigation target, duration in seconds or capacity in litres (depending on mode), ' +
                    'set to 0 to leave the valve on indefinitely, ' +
                    'for safety reasons the target will be forced to a minimum of 10 seconds in duration mode'),
            exposes.numeric(keys.giexWaterValve.cycleIrrigationInterval, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(SECONDS_IN_12_HOURS)
                .withUnit('sec')
                .withDescription('Cycle irrigation interval'),
        ],
    },
];
