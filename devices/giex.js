const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

const dataPoints = {
    // GIEX Water Valve
    giexWaterValveState: 2,
    giexWaterValveMode: 1,
    giexWaterValveIrrigationTarget: 104,
    giexWaterValveWaterConsumed: 111,
    giexWaterValveIrrigationStartTime: 101,
    giexWaterValveIrrigationEndTime: 102,
    giexWaterValveLastIrrigationDuration: 114,
    giexWaterValveBattery: 108,
    giexWaterValveCycleIrrigationNumTimes: 103,
    giexWaterValveCycleIrrigationInterval: 105,
    giexWaterValveCurrentTempurature: 106,
};

const fzLocal = {
    giex_water_valve:
    {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            for (const dpValue of msg.data.dpValues) {
                const value = tuya.getDataValue(dpValue);
                const dp = dpValue.dp;
                switch (dp) {
                case dataPoints.giexWaterValveState: {
                    return {state: value ? 'ON': 'OFF'};
                }
                case dataPoints.giexWaterValveMode: {
                    return {mode: value ? 'capacity': 'duration'};
                }
                case dataPoints.giexWaterValveIrrigationTarget: {
                    return {irrigation_target: value};
                }
                case dataPoints.giexWaterValveCycleIrrigationNumTimes: {
                    return {cycle_irrigation_num_times: value};
                }
                case dataPoints.giexWaterValveCycleIrrigationInterval: {
                    return {cycle_irrigation_interval: value};
                }
                case dataPoints.giexWaterValveWaterConsumed: {
                    return {water_consumed: value};
                }
                case dataPoints.giexWaterValveIrrigationStartTime: {
                    return {irrigation_start_time: value};
                }
                case dataPoints.giexWaterValveIrrigationEndTime: {
                    return {irrigation_end_time: value};
                }
                case dataPoints.giexWaterValveLastIrrigationDuration: {
                    return {last_irrigation_duration: value};
                }
                case dataPoints.giexWaterValveBattery: {
                    return {battery: value};
                }
                case dataPoints.giexWaterValveCurrentTempurature: {
                    return; // Do Nothing - value ignored because isn't a valid tempurature reading.  Misdocumented and usage unclear
                }
                default: {
                    meta.logger.warn(`fz:giex_water_valve: NOT RECOGNIZED DP #${dp} with VALUE = ${value}`);
                }
                }
            }
        },
    },
};

const tzLocal = {
    giex_water_valve:
    {
        key: ['mode', 'irrigation_target', 'state', 'cycle_irrigation_num_times', 'cycle_irrigation_interval'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'mode': {
                let mode = 0;
                if (value === 'duration') mode = 0;
                else if (value === 'capacity') mode = 1;
                await tuya.sendDataPointBool(entity, dataPoints.giexWaterValveMode, mode);
                return {state: {mode: value}};
            }
            case 'irrigation_target':
                await tuya.sendDataPointValue(entity, dataPoints.giexWaterValveIrrigationTarget, value);
                return {state: {irrigation_target: value}};
            case 'state':
                await tuya.sendDataPointBool(entity, dataPoints.giexWaterValveState, value === 'ON');
                break;
            case 'cycle_irrigation_num_times':
                await tuya.sendDataPointValue(entity, dataPoints.giexWaterValveCycleIrrigationNumTimes, value);
                return {state: {cycle_irrigation_num_times: value}};
            case 'cycle_irrigation_interval':
                await tuya.sendDataPointValue(entity, dataPoints.giexWaterValveCycleIrrigationInterval, value);
                return {state: {cycle_irrigation_interval: value}};
            default: // Unknown key warning
                meta.logger.warn(`tz.GIEX_water_valve: Unhandled key ${key}`);
            }
        },
    },
};

module.exports = [
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_sh1btabb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_a7sghmms'},
        ],
        model: 'QT06',
        vendor: 'GiEX',
        description: 'Water irrigation valve',
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fzLocal.giex_water_valve],
        toZigbee: [tzLocal.giex_water_valve],
        exposes: [
            e.battery(),
            exposes.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('State'),
            exposes.enum('mode', ea.STATE_SET, ['duration', 'capacity']).withDescription('Irrigation mode'),
            exposes.numeric('irrigation_target', exposes.access.STATE_SET).withValueMin(0).withValueMax(1440).withUnit('minutes or Litres')
                .withDescription('Irrigation Target, duration in minutes or capacity in Litres (depending on mode)'),
            exposes.numeric('cycle_irrigation_num_times', exposes.access.STATE_SET).withValueMin(0).withValueMax(100).withUnit('#')
                .withDescription('Number of cycle irrigation times, set to 0 for single cycle'),
            exposes.numeric('cycle_irrigation_interval', exposes.access.STATE_SET).withValueMin(0).withValueMax(1440).withUnit('min')
                .withDescription('Cycle irrigation interval'),
            exposes.numeric('irrigation_start_time', ea.STATE).withUnit('GMT+8').withDescription('Irrigation start time'),
            exposes.numeric('irrigation_end_time', ea.STATE).withUnit('GMT+8').withDescription('Irrigation end time'),
            exposes.numeric('last_irrigation_duration', exposes.access.STATE).withUnit('min')
                .withDescription('Last irrigation duration'),
            exposes.numeric('water_consumed', exposes.access.STATE).withUnit('L')
                .withDescription('Water consumed (Litres)'),
        ],
    },
];
