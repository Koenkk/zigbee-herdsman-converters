const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const globalStore = require('../lib/store');
const tuya = require('../lib/tuya');
const utils = require('../lib/utils');
const e = exposes.presets;
const ea = exposes.access;


/*
reversesd engineered DP's from Tuya:
====================================

1 - Switch
2 - Regulating water volume
3 - Flow state
10 - Weather Delay
11 - Irrigation time

101 - 倒计时剩余时间  countdown time remaining
102 - 倒计时剩余时间设置 countdown remaining time setting
103 - 开到底状态 open to the end
104 - 故障告警 fault alarm
105 - 默认倒计时开启 by default countdown is on
106 - 默认倒计时设置 default countdown settings
107 - 月使用时长 monthly usage time
108 - 月使用水容量 monthly water capacity
109 - 定时灌溉 regular irrigation
110 - 电池电量 battery power

Tuya developer GUI sends:
=========================

switch | Boolean | "{true,false}"
percent_control | Integer | {   "unit": "%",   "min": 0,   "max": 100,   "scale": 0,   "step": 5 }
weather_delay | Enum | {   "range": [     "cancel",     "24h",     "48h",     "72h"   ] }
countdown | Integer | {   "unit": "s",   "min": 0,   "max": 86400,   "scale": 0,   "step": 1
*/

const tuyaLocal = {
    dataPoints: {

        // DP guessed based on Tuya and 
        automatic: 2,
        state: 3,

        timer: 11,
        remaining: 101,
        manual: 102,
        
        used: 107,
        battery: 110,

        // DP received but not usefull for HA
        //error :104
        //max_min :108
    },
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
                    case tuyaLocal.dataPoints.state: {
                        result.state = value;
                        break;
                    }
                    case tuyaLocal.dataPoints.remaining: {
                        result.remaining = value;
                        break;
                    }
                    case tuyaLocal.dataPoints.used: {
                        result.used = value;
                        break;
                    }

                    case tuyaLocal.dataPoints.manual: {
                        result.manual = value;
                        break;
                    }

                    case tuyaLocal.dataPoints.timer: {
                        result.timer = value;
                        break;
                    }
                    case tuyaLocal.dataPoints.automatic: {
                        result.automatic = value;
                        result.manual = value;
                        break;
                    }

                    case tuyaLocal.dataPoints.battery: {
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
    manual: {
        key: ['manual'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.manual, value);
        },
    },      
    timer: {
        key: ['timer'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.timer, value);

        },
    },      
    automatic: {
        key: ['automatic'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.automatic, value);
        },
    },   
    
};

const definition = {
    fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_arge1ptm'}],
    model: 'QT-05M',
    vendor: 'QOTO',
    description: 'Solar power garden waterering timer',
    fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, fz.ignore_onoff_report, fzLocal.watering_timer],
    toZigbee: [
        tzLocal.manual,
        tzLocal.timer,
        tzLocal.automatic,
    ],
    configure: async (device, coordinatorEndpoint, logger) => {
        //const endpoint = device.getEndpoint(1);
        //await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
    },
    exposes: [
        
        exposes.numeric('state', ea.STATE).withUnit('%').withValueMin(0).withDescription('Current water flow in %.'),
        exposes.numeric('used', ea.STATE).withUnit('sec').withValueMin(0).withDescription('How long did the last watering last in seconds.'),
        exposes.numeric('remaining', ea.STATE).withUnit('sec').withValueMin(0).withDescription('Updates every minute, and every 10s in the last minute.'),

        exposes.numeric('manual', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(5).withUnit('%').withDescription('Set valve to %.'),

        exposes.numeric('timer', ea.STATE_SET).withValueMin(0).withValueMax(14400).withUnit('sec').withDescription('Auto shutdown in seconds.'),
        exposes.numeric('automatic', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(5).withUnit('%').withDescription('Set valve to % with auto shutdown.'),
                
        e.battery(),        
    ]
};

module.exports = definition;


