const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    merrytek_microwave_sensor: {
        key: [
            'illuminance_calibration', 'led_enable',
            'sensitivity', 'keep_time',
        ],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'illuminance_calibration':// (10--100) sensor illuminance sensitivity
                await tuya.sendDataPointRaw(entity, 102, [value]);
                break;
            case 'led_enable':// OK (value true/false or 1/0)
                await tuya.sendDataPointRaw(entity, 107, [value ? 1 : 0]);
                break;
            case 'sensitivity':// value: 25, 50, 75, 100
                await tuya.sendDataPointRaw(entity, 2, [value]);
                break;
            case 'keep_time': // value 0 --> 7 corresponding 5s, 30s, 1, 3, 5, 10, 20, 30 min
                await tuya.sendDataPointRaw(entity, 106, [value]);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key ${key}`);
            }
        },
    },
};

const fzLocal = {
    merrytek_microwave_sensor: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'merrytek_microwave_sensor');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);
            const lookup = {
                0: 'no_motion',
                1: 'big_motion',
                2: 'minor_motion',
                3: 'breathing',
                4: 'abnormal_state',
                5: 'initializing',
                6: 'initialization_completed',
            };
            switch (dp) {
            case tuya.dataPoints.mrytPresenceState:
                return {
                    occupancy: value > 0 ? true : false,
                };
            case tuya.dataPoints.mrytSensitivity:
                return {
                    sensitivity: value,
                };
            case tuya.dataPoints.mrytIlluminanceLux:
                return {
                    illuminance_lux: value,
                };
            case tuya.dataPoints.mrytIlluminanceCalibration:
                return {
                    illuminance_calibration: value,
                };
            case tuya.dataPoints.mrytKeepTime:
                return {
                    keep_time: value,
                };
            case tuya.dataPoints.mrytLED_Enable:
                return {
                    led_enable: value == 1 ? true : false,
                };
            case tuya.dataPoints.mrytMotionState:
                return {
                    states: lookup[value],
                };
            case 102:
                return {
                    LuxChangeTrigger: value,
                };
            case 106:
                return {
                    HoldTime: value,
                };
            case 108:
                return {
                    Scene: value,
                };
            case 110:
                return {
                    Minormotion: value,
                };
            case 111:
                return {
                    Breathing: value,
                };
            case 112:
                return {
                    Linght: value,
                };
            case 113:
                return {
                    Behavior: value,
                };
            default:
                meta.logger.warn(`zigbee-herdsman-converters:tuya_smart_vibration_sensor: NOT RECOGNIZED ` +
                        `DP #${dpValue.dp} with data ${JSON.stringify(dpValue)}`);
            }
        },
    },
};

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_9xejegcy'}],
        model: 'MSA201_Z',
        vendor: 'Merrytek',
        description: 'Large beam microwave occupancy sensor 24GHz',
        fromZigbee: [fzLocal.merrytek_microwave_sensor],
        toZigbee: [tzLocal.merrytek_microwave_sensor],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.occupancy(),
            exposes.enum('states', ea.STATE).withDescription('Motion state')
                .withDescription('No motion, big motion, minor motion, breathing'),
            e.illuminance_lux(),
            exposes.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enabled LED'),
            exposes.enum('keep_time', ea.STATE_SET, ['0', '1', '2', '3', '4', '5', '6', '7'])
                .withDescription('PIR keep time 0:5s|1:30s|2:60s|3:180s|4:300s|5:600s|6:1200s|7:1800s'),
            exposes.enum('sensitivity', ea.STATE_SET, ['25', '50', '75', '100']),
            exposes.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration')
                .withValueMin(-10000).withValueMax(10000),
        ],
    },
];
