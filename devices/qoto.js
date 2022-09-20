const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

const dataPoints = {
    valve_state_auto_shutdown: 2,
    water_flow: 3,
    shutdown_timer: 11,
    remaining_watering_time: 101,
    valve_state: 102,
    last_watering_duration: 107,
    battery: 110,
};

const fzLocal = {
    watering_timer: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp; // First we get the data point ID
                const value = tuya.getDataValue(dpValue); // This function will take care of converting the data to proper JS type
                switch (dp) {
                case dataPoints.water_flow: {
                    result.water_flow = value;
                    break;
                }
                case dataPoints.remaining_watering_time: {
                    result.remaining_watering_time = value;
                    break;
                }
                case dataPoints.last_watering_duration: {
                    result.last_watering_duration = value;
                    break;
                }

                case dataPoints.valve_state: {
                    result.valve_state = value;
                    break;
                }

                case dataPoints.shutdown_timer: {
                    result.shutdown_timer = value;
                    break;
                }
                case dataPoints.valve_state_auto_shutdown: {
                    result.valve_state_auto_shutdown = value;
                    result.valve_state = value;
                    break;
                }

                case dataPoints.battery: {
                    result.battery = value;
                    break;
                }
                default: {
                    meta.logger.debug(`>>> UNKNOWN DP #${dp} with data "${JSON.stringify(dpValue)}"`);
                }
                }
            }
            return result;
        },
    },
};

const tzLocal = {
    valve_state: {
        key: ['valve_state'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, dataPoints.valve_state, value);
        },
    },
    shutdown_timer: {
        key: ['shutdown_timer'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, dataPoints.shutdown_timer, value);
        },
    },
    valve_state_auto_shutdown: {
        key: ['valve_state_auto_shutdown'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, dataPoints.valve_state_auto_shutdown, value);
        },
    },
};

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_arge1ptm'}],
        model: 'QT-05M',
        vendor: 'QOTO',
        description: 'Solar powered garden watering timer',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, fz.ignore_onoff_report, fzLocal.watering_timer],
        toZigbee: [tzLocal.valve_state, tzLocal.shutdown_timer, tzLocal.valve_state_auto_shutdown],
        exposes: [
            exposes.numeric('water_flow', ea.STATE).withUnit('%').withValueMin(0).withDescription('Current water flow in %.'),
            exposes.numeric('last_watering_duration', ea.STATE).withUnit('sec').withValueMin(0)
                .withDescription('Last watering duration in seconds.'),
            exposes.numeric('remaining_watering_time', ea.STATE).withUnit('sec').withValueMin(0)
                .withDescription('Remaning watering time (for auto shutdown). Updates every minute, and every 10s in the last minute.'),
            exposes.numeric('valve_state', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(5).withUnit('%')
                .withDescription('Set valve to %.'),
            exposes.numeric('shutdown_timer', ea.STATE_SET).withValueMin(0).withValueMax(14400).withUnit('sec')
                .withDescription('Auto shutdown in seconds.'),
            exposes.numeric('valve_state_auto_shutdown', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(5).withUnit('%')
                .withDescription('Set valve to % with auto shutdown.'),
            e.battery(),
        ],
    },
];
