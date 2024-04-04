/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import * as globalStore from './store';
import * as utils from './utils';
import fromZigbeeConverters from '../converters/fromZigbee';
const fromZigbeeStore: KeyValueAny = {};
import * as exposes from './exposes';
import * as constants from './constants';
import * as light from './light';
import {Zh, KeyValueNumberString, Definition, Fz, Publish, Tz} from './types';
import {logger} from './logger';

interface KeyValueAny {[s: string]: any}

// get object property name (key) by it's value
const getKey = (object: KeyValueAny, value: any) => {
    for (const key in object) {
        if (object[key]==value) return key;
    }
};

const dataTypes = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks: any) => {
    // Destructuring "chunks" is needed because it's a Buffer
    // and we need a simple array.
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

function getDataValue(dpValue: any) {
    switch (dpValue.datatype) {
    case dataTypes.raw:
        return dpValue.data;
    case dataTypes.bool:
        return dpValue.data[0] === 1;
    case dataTypes.value:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
        // eslint-disable-next-line
        let dataString = '';
        // Don't use .map here, doesn't work: https://github.com/Koenkk/zigbee-herdsman-converters/pull/1799/files#r530377091
        for (let i = 0; i < dpValue.data.length; ++i) {
            dataString += String.fromCharCode(dpValue.data[i]);
        }
        return dataString;
    case dataTypes.enum:
        return dpValue.data[0];
    case dataTypes.bitmap:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    }
}

function getTypeName(dpValue: any) {
    const entry = Object.entries(dataTypes).find(([typeName, typeId]) => typeId === dpValue.datatype);
    return (entry ? entry[0] : 'unknown');
}

function logUnexpectedDataPoint(where: string, msg: KeyValueAny, dpValue: any, meta: Fz.Meta) {
    logger.debug(`Received unexpected Tuya DataPoint #${dpValue.dp} from ${meta.device.ieeeAddr} with raw data '${JSON.stringify(dpValue)}': \
        type='${msg.type}', datatype='${getTypeName(dpValue)}', value='${getDataValue(dpValue)}', known DP# usage: \
        ${JSON.stringify(getDataPointNames(dpValue))}`, `zhc:${where}`);
}

function logUnexpectedDataType(where: any, msg: any, dpValue: any, meta: Fz.Meta, expectedDataType?: any) {
    logger.debug(`Received Tuya DataPoint #${dpValue.dp} with unexpected datatype from ${meta.device.ieeeAddr} with raw data \
        '${JSON.stringify(dpValue)}': type='${msg.type}', datatype='${getTypeName(dpValue)}' (instead of '${expectedDataType}'), \
        value='${getDataValue(dpValue)}', known DP# usage: ${JSON.stringify(getDataPointNames(dpValue))}`, `zhc:${where}`);
}

function getDataPointNames(dpValue: any) {
    const entries = Object.entries(dataPoints).filter(([dpName, dpId]) => dpId === dpValue.dp);
    return entries.map(([dpName, dpId]) => dpName);
}

const coverStateOverride: KeyValueAny = {
    // Contains all covers which differentiate from the default enum states
    // Use manufacturerName to identify device!
    // https://github.com/Koenkk/zigbee2mqtt/issues/5596#issuecomment-759408189
    '_TZE200_rddyvrci': {close: 1, open: 2, stop: 0},
    '_TZE200_wmcdj3aq': {close: 0, open: 2, stop: 1},
    '_TZE200_cowvfni3': {close: 0, open: 2, stop: 1},
    '_TYST11_cowvfni3': {close: 0, open: 2, stop: 1},
};

// Gets an array containing which enums have to be used in order for the correct close/open/stop commands to be sent
function getCoverStateEnums(manufacturerName: string) {
    if (manufacturerName in coverStateOverride) {
        return coverStateOverride[manufacturerName];
    } else {
        return {close: 2, open: 0, stop: 1}; // defaults
    }
}

function convertDecimalValueTo4ByteHexArray(value: number) {
    const hexValue = Number(value).toString(16).padStart(8, '0');
    const chunk1 = hexValue.substring(0, 2);
    const chunk2 = hexValue.substring(2, 4);
    const chunk3 = hexValue.substring(4, 6);
    const chunk4 = hexValue.substring(6);
    return [chunk1, chunk2, chunk3, chunk4].map((hexVal) => parseInt(hexVal, 16));
}

let gSec: number = undefined;
async function sendDataPoints(entity: Zh.Endpoint | Zh.Group, dpValues: any, cmd='dataRequest', seq:number=undefined) {
    if (seq === undefined) {
        if (gSec === undefined) {
            gSec = 0;
        } else {
            gSec++;
            gSec %= 0xFFFF;
        }
        seq = gSec;
    }

    await entity.command(
        'manuSpecificTuya',
        cmd || 'dataRequest',
        {
            seq,
            dpValues,
        },
        {disableDefaultResponse: true},
    );
    return seq;
}

function convertStringToHexArray(value: string) {
    const asciiKeys = [];
    for (let i = 0; i < value.length; i ++) {
        asciiKeys.push(value[i].charCodeAt(0));
    }
    return asciiKeys;
}

function dpValueFromIntValue(dp: number, value: number) {
    return {dp, datatype: dataTypes.value, data: convertDecimalValueTo4ByteHexArray(value)};
}

function dpValueFromBool(dp: number, value: boolean|number) {
    return {dp, datatype: dataTypes.bool, data: [value ? 1 : 0]};
}

function dpValueFromEnum(dp: number, value: number) {
    return {dp, datatype: dataTypes.enum, data: [value]};
}

function dpValueFromStringBuffer(dp: number, stringBuffer: string) {
    return {dp, datatype: dataTypes.string, data: stringBuffer};
}

function dpValueFromRaw(dp: number, rawBuffer: any) {
    return {dp, datatype: dataTypes.raw, data: rawBuffer};
}

function dpValueFromBitmap(dp: number, bitmapBuffer: any) {
    return {dp, datatype: dataTypes.bitmap, data: bitmapBuffer};
}

// Return `seq` - transaction ID for handling concrete response
async function sendDataPoint(entity: Zh.Endpoint | Zh.Group, dpValue: any, cmd?:string, seq:number=undefined) {
    return await sendDataPoints(entity, [dpValue], cmd, seq);
}

async function sendDataPointValue(entity: Zh.Endpoint | Zh.Group, dp:number, value:any, cmd?:string, seq:number=undefined) {
    return await sendDataPoints(entity, [dpValueFromIntValue(dp, value)], cmd, seq);
}

async function sendDataPointBool(entity: Zh.Endpoint | Zh.Group, dp:number, value:boolean|number, cmd?:string, seq:number=undefined) {
    return await sendDataPoints(entity, [dpValueFromBool(dp, value)], cmd, seq);
}

async function sendDataPointEnum(entity: Zh.Endpoint | Zh.Group, dp:number, value:number, cmd?:string, seq:number=undefined) {
    return await sendDataPoints(entity, [dpValueFromEnum(dp, value)], cmd, seq);
}

async function sendDataPointRaw(entity: Zh.Endpoint | Zh.Group, dp:number, value:any, cmd?:string, seq:number=undefined) {
    return await sendDataPoints(entity, [dpValueFromRaw(dp, value)], cmd, seq);
}

async function sendDataPointBitmap(entity: Zh.Endpoint | Zh.Group, dp:number, value:any, cmd?:string, seq:number=undefined) {
    return await sendDataPoints(entity, [dpValueFromBitmap(dp, value)], cmd, seq);
}

async function sendDataPointStringBuffer(entity: Zh.Endpoint | Zh.Group, dp:number, value:any, cmd?:string, seq:number=undefined) {
    return await sendDataPoints(entity, [dpValueFromStringBuffer(dp, value)], cmd, seq);
}

function convertRawToCycleTimer(value: any) {
    let timernr = 0;
    let starttime = '00:00';
    let endtime = '00:00';
    let irrigationDuration = 0;
    let pauseDuration = 0;
    let weekdays = 'once';
    let timeractive = 0;
    if (value.length > 11) {
        timernr = value[1];
        timeractive = value[2];
        if (value[3] > 0) {
            weekdays = (value[3] & 0x01 ? 'Su' : '') +
            (value[3] & 0x02 ? 'Mo' : '') +
            (value[3] & 0x04 ? 'Tu' : '') +
            (value[3] & 0x08 ? 'We' : '') +
            (value[3] & 0x10 ? 'Th' : '') +
            (value[3] & 0x20 ? 'Fr' : '') +
            (value[3] & 0x40 ? 'Sa' : '');
        } else {
            weekdays = 'once';
        }
        let minsincemidnight: any = value[4] * 256 + value[5];
        // @ts-ignore
        starttime = String(parseInt(minsincemidnight / 60)).padStart(2, '0') + ':' + String(minsincemidnight % 60).padStart(2, '0');
        minsincemidnight = value[6] * 256 + value[7];
        // @ts-ignore
        endtime = String(parseInt(minsincemidnight / 60)).padStart(2, '0') + ':' + String(minsincemidnight % 60).padStart(2, '0');
        irrigationDuration = value[8] * 256 + value[9];
        pauseDuration = value[10] * 256 + value[11];
    }
    return {
        timernr: timernr,
        starttime: starttime,
        endtime: endtime,
        irrigationDuration: irrigationDuration,
        pauseDuration: pauseDuration,
        weekdays: weekdays,
        active: timeractive,
    };
}


function logDataPoint(where: string, msg: KeyValueAny, dpValue: any, meta: any) {
    logger.info(`Received Tuya DataPoint #${dpValue.dp} from ${meta.device.ieeeAddr} with raw data '${JSON.stringify(dpValue)}': \
        type='${msg.type}', datatype='${getTypeName(dpValue)}', value='${getDataValue(dpValue)}', known DP# usage: \
        ${JSON.stringify(getDataPointNames(dpValue))}`, `zhc:${where}`);
}

const thermostatSystemModes2: KeyValueAny = {
    0: 'auto',
    1: 'cool',
    2: 'heat',
    3: 'dry',
    4: 'fan',
};

const thermostatSystemModes3: KeyValueAny = {
    0: 'auto',
    1: 'heat',
    2: 'off',
};

const thermostatSystemModes4: KeyValueNumberString = {
    0: 'off',
    1: 'auto',
    2: 'heat',
};

const thermostatWeekFormat: KeyValueAny = {
    0: '5+2',
    1: '6+1',
    2: '7',
};

const thermostatForceMode: KeyValueAny = {
    0: 'normal',
    1: 'open',
    2: 'close',
};

const thermostatPresets: KeyValueNumberString = {
    0: 'away',
    1: 'schedule',
    2: 'manual',
    3: 'comfort',
    4: 'eco',
    5: 'boost',
    6: 'complex',
};

const thermostatScheduleMode: KeyValueAny = {
    1: 'single', // One schedule for all days
    2: 'weekday/weekend', // Weekdays(2-5) and Holidays(6-1)
    3: 'weekday/sat/sun', // Weekdays(2-6), Saturday(7), Sunday(1)
    4: '7day', // 7 day schedule
};

const silvercrestModes: KeyValueAny = {
    white: 0,
    color: 1,
    effect: 2,
};

const silvercrestEffects: KeyValueAny = {
    steady: '00',
    snow: '01',
    rainbow: '02',
    snake: '03',
    twinkle: '04',
    firework: '05',
    horizontal_flag: '06',
    waves: '07',
    updown: '08',
    vintage: '09',
    fading: '0a',
    collide: '0b',
    strobe: '0c',
    sparkles: '0d',
    carnaval: '0e',
    glow: '0f',
};

const fanModes: KeyValueAny = {
    0: 'low',
    1: 'medium',
    2: 'high',
    3: 'auto',
};

// Motion sensor lookups
const msLookups: KeyValueAny = {
    OSensitivity: {
        0: 'sensitive',
        1: 'normal',
        2: 'cautious',
    },
    VSensitivity: {
        0: 'speed_priority',
        1: 'normal_priority',
        2: 'accuracy_priority',
    },
    Mode: {
        0: 'general_model',
        1: 'temporaty_stay',
        2: 'basic_detection',
        3: 'sensor_test',
    },
};

const tvThermostatMode: KeyValueAny = {
    0: 'off',
    1: 'heat',
    2: 'auto',
};


const tvThermostatPreset: KeyValueAny = {
    0: 'auto',
    1: 'manual',
    2: 'holiday',
    3: 'holiday',
};
// Zemismart ZM_AM02 Roller Shade Converter
const ZMLookups: KeyValueAny = {
    AM02Mode: {
        0: 'morning',
        1: 'night',
    },
    AM02Control: {
        0: 'open',
        1: 'stop',
        2: 'close',
        3: 'continue',
    },
    AM02Direction: {
        0: 'forward',
        1: 'back',
    },
    AM02WorkState: {
        0: 'opening',
        1: 'closing',
    },
    AM02Border: {
        0: 'up',
        1: 'down',
        2: 'down_delete',
    },
    AM02Situation: {
        0: 'fully_open',
        1: 'fully_close',
    },
    AM02MotorWorkingMode: {
        0: 'continuous',
        1: 'intermittently',
    },
};

const moesSwitch: KeyValueAny = {
    powerOnBehavior: {
        0: 'off',
        1: 'on',
        2: 'previous',
    },
    indicateLight: {
        0: 'off',
        1: 'switch',
        2: 'position',
        3: 'freeze',
    },
};
const tuyaHPSCheckingResult: KeyValueAny = {
    0: 'checking',
    1: 'check_success',
    2: 'check_failure',
    3: 'others',
    4: 'comm_fault',
    5: 'radar_fault',
};

function convertWeekdaysTo1ByteHexArray(weekdays: string) {
    let nr = 0;
    if (weekdays == 'once') {
        return nr;
    }
    if (weekdays.includes('Mo')) {
        nr |= 0x40;
    }
    if (weekdays.includes('Tu')) {
        nr |= 0x20;
    }
    if (weekdays.includes('We')) {
        nr |= 0x10;
    }
    if (weekdays.includes('Th')) {
        nr |= 0x08;
    }
    if (weekdays.includes('Fr')) {
        nr |= 0x04;
    }
    if (weekdays.includes('Sa')) {
        nr |= 0x02;
    }
    if (weekdays.includes('Su')) {
        nr |= 0x01;
    }
    return [nr];
}

function convertRawToTimer(value: any) {
    let timernr = 0;
    let starttime = '00:00';
    let duration = 0;
    let weekdays = 'once';
    let timeractive = '';
    if (value.length > 12) {
        timernr = value[1];
        const minsincemidnight = value[2] * 256 + value[3];
        // @ts-ignore
        starttime = String(parseInt(minsincemidnight / 60)).padStart(2, '0') + ':' + String(minsincemidnight % 60).padStart(2, '0');
        duration = value[4] * 256 + value[5];
        if (value[6] > 0) {
            weekdays = (value[6] & 0x01 ? 'Su' : '') +
            (value[6] & 0x02 ? 'Mo' : '') +
            (value[6] & 0x04 ? 'Tu' : '') +
            (value[6] & 0x08 ? 'We' : '') +
            (value[6] & 0x10 ? 'Th' : '') +
            (value[6] & 0x20 ? 'Fr' : '') +
            (value[6] & 0x40 ? 'Sa' : '');
        } else {
            weekdays = 'once';
        }
        timeractive = value[8];
    }
    return {timernr: timernr, time: starttime, duration: duration, weekdays: weekdays, active: timeractive};
}

function logUnexpectedDataValue(where: string, msg: KeyValueAny, dpValue: any, meta: Fz.Meta, valueKind: any,
    expectedMinValue:any=null, expectedMaxValue:any=null) {
    if (expectedMinValue === null) {
        if (expectedMaxValue === null) {
            logger.debug(`Received Tuya DataPoint #${dpValue.dp} with invalid value ${getDataValue(dpValue)} for ${valueKind} \
                from ${meta.device.ieeeAddr}`, `zhc:${where}`);
        } else {
            logger.debug(`Received Tuya DataPoint #${dpValue.dp} with invalid value ${getDataValue(dpValue)} for ${valueKind} \
                from ${meta.device.ieeeAddr} which is higher than the expected maximum of ${expectedMaxValue}`, `zhc:${where}`);
        }
    } else {
        if (expectedMaxValue === null) {
            logger.debug(`Received Tuya DataPoint #${dpValue.dp} with invalid value ${getDataValue(dpValue)} for ${valueKind} \
                from ${meta.device.ieeeAddr} which is lower than the expected minimum of ${expectedMinValue}`, `zhc:${where}`);
        } else {
            logger.debug(`Received Tuya DataPoint #${dpValue.dp} with invalid value ${getDataValue(dpValue)} for ${valueKind} \
                from ${meta.device.ieeeAddr} which is outside the expected range from ${expectedMinValue} to ${expectedMaxValue}`, `zhc:${where}`);
        }
    }
}

// Contains all covers which need their position inverted by default
// Default is 100 = open, 0 = closed; Devices listed here will use 0 = open, 100 = closed instead
// Use manufacturerName to identify device!
// Don't invert _TZE200_cowvfni3: https://github.com/Koenkk/zigbee2mqtt/issues/6043
const coverPositionInvert = ['_TZE200_wmcdj3aq', '_TZE200_nogaemzt', '_TZE200_xuzcvlku', '_TZE200_xaabybja', '_TZE200_rmymn92d',
    '_TZE200_gubdgai2', '_TZE200_r0jdjrvi'];

// Gets a boolean indicating whether the cover by this manufacturerName needs reversed positions
function isCoverInverted(manufacturerName: string) {
    // Return true if cover is listed in coverPositionInvert
    // Return false by default, not inverted
    return coverPositionInvert.includes(manufacturerName);
}

function convertDecimalValueTo2ByteHexArray(value: any) {
    const hexValue = Number(value).toString(16).padStart(4, '0');
    const chunk1 = hexValue.substr(0, 2);
    const chunk2 = hexValue.substr(2);
    return [chunk1, chunk2].map((hexVal) => parseInt(hexVal, 16));
}


function convertTimeTo2ByteHexArray(time: string) {
    const timeArray = time.split(':');
    if (timeArray.length != 2) {
        throw new Error('Time format incorrect');
    }
    const timeHour = parseInt(timeArray[0]);
    const timeMinute = parseInt(timeArray[1]);

    if (timeHour > 23 || timeMinute > 59) {
        throw new Error('Time incorrect');
    }
    return convertDecimalValueTo2ByteHexArray(timeHour * 60 + timeMinute);
}

const dataPoints = {
    wateringTimer: {
        valve_state_auto_shutdown: 2,
        water_flow: 3,
        shutdown_timer: 11,
        remaining_watering_time: 101,
        valve_state: 102,
        last_watering_duration: 107,
        battery: 110,
    },
    // Common data points
    // Below data points are usually shared between devices
    state: 1,
    heatingSetpoint: 2,
    coverPosition: 2,
    dimmerLevel: 3,
    dimmerMinLevel: 3,
    localTemp: 3,
    coverArrived: 3,
    occupancy: 3,
    mode: 4,
    fanMode: 5,
    dimmerMaxLevel: 5,
    motorDirection: 5,
    config: 5,
    childLock: 7,
    coverChange: 7,
    runningState: 14,
    valveDetection: 20,
    battery: 21,
    tempCalibration: 44,
    // Data points above 100 are usually custom function data points
    waterLeak: 101,
    minTemp: 102,
    maxTemp: 103,
    windowDetection: 104,
    boostTime: 105,
    coverSpeed: 105,
    forceMode: 106,
    comfortTemp: 107,
    ecoTemp: 108,
    valvePos: 109,
    batteryLow: 110,
    weekFormat: 111,
    scheduleWorkday: 112,
    scheduleHoliday: 113,
    awayTemp: 114,
    windowOpen: 115,
    autoLock: 116,
    awayDays: 117,
    // Manufacturer specific
    // Earda
    eardaDimmerLevel: 2,
    // Siterwell Thermostat
    siterwellWindowDetection: 18,
    // Moes Thermostat
    moesHold: 2,
    moesScheduleEnable: 3,
    moesHeatingSetpoint: 16,
    moesMaxTempLimit: 18,
    moesMaxTemp: 19,
    moesDeadZoneTemp: 20,
    moesLocalTemp: 24,
    moesMinTempLimit: 26,
    moesTempCalibration: 27,
    moesValve: 36,
    moesChildLock: 40,
    moesSensor: 43,
    moesSchedule: 101,
    etopErrorStatus: 13,
    // MoesS Thermostat
    moesSsystemMode: 1,
    moesSheatingSetpoint: 2,
    moesSlocalTemp: 3,
    moesSboostHeating: 4,
    moesSboostHeatingCountdown: 5,
    moesSreset: 7,
    moesSwindowDetectionFunktion_A2: 8,
    moesSwindowDetection: 9,
    moesSchildLock: 13,
    moesSbattery: 14,
    moesSschedule: 101,
    moesSvalvePosition: 104,
    moesSboostHeatingCountdownTimeSet: 103,
    moesScompensationTempSet: 105,
    moesSecoMode: 106,
    moesSecoModeTempSet: 107,
    moesSmaxTempSet: 108,
    moesSminTempSet: 109,
    moesCoverCalibration: 3,
    moesCoverBacklight: 7,
    moesCoverMotorReversal: 8,
    // Neo T&H
    neoOccupancy: 101,
    neoPowerType: 101,
    neoMelody: 102,
    neoDuration: 103,
    neoTamper: 103,
    neoAlarm: 104,
    neoTemp: 105,
    neoTempScale: 106,
    neoHumidity: 106,
    neoMinTemp: 107,
    neoMaxTemp: 108,
    neoMinHumidity: 109,
    neoMaxHumidity: 110,
    neoUnknown2: 112,
    neoTempAlarm: 113,
    neoTempHumidityAlarm: 113,
    neoHumidityAlarm: 114,
    neoUnknown3: 115,
    neoVolume: 116,
    // Neo AlarmOnly
    neoAOBattPerc: 15,
    neoAOMelody: 21,
    neoAODuration: 7,
    neoAOAlarm: 13,
    neoAOVolume: 5,
    // Saswell TRV
    saswellHeating: 3,
    saswellWindowDetection: 8,
    saswellFrostDetection: 10,
    saswellTempCalibration: 27,
    saswellChildLock: 40,
    saswellState: 101,
    saswellLocalTemp: 102,
    saswellHeatingSetpoint: 103,
    saswellValvePos: 104,
    saswellBatteryLow: 105,
    saswellAwayMode: 106,
    saswellScheduleMode: 107,
    saswellScheduleEnable: 108,
    saswellScheduleSet: 109,
    saswellSetpointHistoryDay: 110,
    saswellTimeSync: 111,
    saswellSetpointHistoryWeek: 112,
    saswellSetpointHistoryMonth: 113,
    saswellSetpointHistoryYear: 114,
    saswellLocalHistoryDay: 115,
    saswellLocalHistoryWeek: 116,
    saswellLocalHistoryMonth: 117,
    saswellLocalHistoryYear: 118,
    saswellMotorHistoryDay: 119,
    saswellMotorHistoryWeek: 120,
    saswellMotorHistoryMonth: 121,
    saswellMotorHistoryYear: 122,
    saswellScheduleSunday: 123,
    saswellScheduleMonday: 124,
    saswellScheduleTuesday: 125,
    saswellScheduleWednesday: 126,
    saswellScheduleThursday: 127,
    saswellScheduleFriday: 128,
    saswellScheduleSaturday: 129,
    saswellAntiScaling: 130,
    // HY thermostat
    hyHeating: 102,
    hyExternalTemp: 103,
    hyAwayDays: 104,
    hyAwayTemp: 105,
    hyMaxTempProtection: 106,
    hyMinTempProtection: 107,
    hyTempCalibration: 109,
    hyHysteresis: 110,
    hyProtectionHysteresis: 111,
    hyProtectionMaxTemp: 112,
    hyProtectionMinTemp: 113,
    hyMaxTemp: 114,
    hyMinTemp: 115,
    hySensor: 116,
    hyPowerOnBehavior: 117,
    hyWeekFormat: 118,
    hyWorkdaySchedule1: 119,
    hyWorkdaySchedule2: 120,
    hyHolidaySchedule1: 121,
    hyHolidaySchedule2: 122,
    hyState: 125,
    hyHeatingSetpoint: 126,
    hyLocalTemp: 127,
    hyMode: 128,
    hyChildLock: 129,
    hyAlarm: 130,
    // Silvercrest
    silvercrestChangeMode: 2,
    silvercrestSetBrightness: 3,
    silvercrestSetColorTemp: 4,
    silvercrestSetColor: 5,
    silvercrestSetEffect: 6,
    // Fantem
    fantemPowerSupplyMode: 101,
    fantemReportingTime: 102,
    fantemExtSwitchType: 103,
    fantemTempCalibration: 104,
    fantemHumidityCalibration: 105,
    fantemLoadDetectionMode: 105,
    fantemLuxCalibration: 106,
    fantemExtSwitchStatus: 106,
    fantemTemp: 107,
    fantemHumidity: 108,
    fantemMotionEnable: 109,
    fantemControlMode: 109,
    fantemBattery: 110,
    fantemLedEnable: 111,
    fantemReportingEnable: 112,
    fantemLoadType: 112,
    fantemLoadDimmable: 113,
    // Woox
    wooxSwitch: 102,
    wooxBattery: 14,
    wooxSmokeTest: 8,
    // FrankEver
    frankEverTimer: 9,
    frankEverTreshold: 101,
    // Dinrail power meter switch
    dinrailPowerMeterTotalEnergy: 17,
    dinrailPowerMeterCurrent: 18,
    dinrailPowerMeterPower: 19,
    dinrailPowerMeterVoltage: 20,
    dinrailPowerMeterTotalEnergy2: 101,
    dinrailPowerMeterPower2: 103,
    // tuya smart air box
    tuyaSabCO2: 2,
    tuyaSabTemp: 18,
    tuyaSabHumidity: 19,
    tuyaSabVOC: 21,
    tuyaSabFormaldehyd: 22,
    // tuya Smart Air House Keeper, Multifunctionale air quality detector.
    // CO2, Temp, Humidity, VOC and Formaldehyd same as Smart Air Box
    tuyaSahkMP25: 2,
    tuyaSahkCO2: 22,
    tuyaSahkFormaldehyd: 20,
    // Tuya CO (carbon monoxide) smart air box
    tuyaSabCOalarm: 1,
    tuyaSabCO: 2,
    // Moes MS-105 Dimmer
    moes105DimmerState1: 1,
    moes105DimmerLevel1: 2,
    moes105DimmerState2: 7,
    moes105DimmerLevel2: 8,
    // TuYa Radar Sensor
    trsPresenceState: 1,
    trsSensitivity: 2,
    trsMotionState: 102,
    trsIlluminanceLux: 103,
    trsDetectionData: 104,
    trsScene: 112,
    trsMotionDirection: 114,
    trsMotionSpeed: 115,
    // TuYa Radar Sensor with fall function
    trsfPresenceState: 1,
    trsfSensitivity: 2,
    trsfMotionState: 102,
    trsfIlluminanceLux: 103,
    trsfTumbleSwitch: 105,
    trsfTumbleAlarmTime: 106,
    trsfScene: 112,
    trsfMotionDirection: 114,
    trsfMotionSpeed: 115,
    trsfFallDownStatus: 116,
    trsfStaticDwellAlarm: 117,
    trsfFallSensitivity: 118,
    // Human Presence Sensor AIR
    msVSensitivity: 101,
    msOSensitivity: 102,
    msVacancyDelay: 103,
    msMode: 104,
    msVacantConfirmTime: 105,
    msReferenceLuminance: 106,
    msLightOnLuminancePrefer: 107,
    msLightOffLuminancePrefer: 108,
    msLuminanceLevel: 109,
    msLedStatus: 110,
    // TV01 Moes Thermostat
    tvMode: 2,
    tvWindowDetection: 8,
    tvFrostDetection: 10,
    tvHeatingSetpoint: 16,
    tvLocalTemp: 24,
    tvTempCalibration: 27,
    tvWorkingDay: 31,
    tvHolidayTemp: 32,
    tvBattery: 35,
    tvChildLock: 40,
    tvErrorStatus: 45,
    tvHolidayMode: 46,
    tvBoostTime: 101,
    tvOpenWindowTemp: 102,
    tvComfortTemp: 104,
    tvEcoTemp: 105,
    tvWeekSchedule: 106,
    tvHeatingStop: 107,
    tvMondaySchedule: 108,
    tvWednesdaySchedule: 109,
    tvFridaySchedule: 110,
    tvSundaySchedule: 111,
    tvTuesdaySchedule: 112,
    tvThursdaySchedule: 113,
    tvSaturdaySchedule: 114,
    tvBoostMode: 115,
    // HOCH / WDYK DIN Rail
    hochCountdownTimer: 9,
    hochFaultCode: 26,
    hochRelayStatus: 27,
    hochChildLock: 29,
    hochVoltage: 101,
    hochCurrent: 102,
    hochActivePower: 103,
    hochLeakageCurrent: 104,
    hochTemperature: 105,
    hochRemainingEnergy: 106,
    hochRechargeEnergy: 107,
    hochCostParameters: 108,
    hochLeakageParameters: 109,
    hochVoltageThreshold: 110,
    hochCurrentThreshold: 111,
    hochTemperatureThreshold: 112,
    hochTotalActivePower: 113,
    hochEquipmentNumberType: 114,
    hochClearEnergy: 115,
    hochLocking: 116,
    hochTotalReverseActivePower: 117,
    hochHistoricalVoltage: 118,
    hochHistoricalCurrent: 119,
    // NOUS SMart LCD Temperature and Humidity Sensor E6
    nousTemperature: 1,
    nousHumidity: 2,
    nousBattery: 4,
    nousTempUnitConvert: 9,
    nousMaxTemp: 10,
    nousMinTemp: 11,
    nousMaxHumi: 12,
    nousMinHumi: 13,
    nousTempAlarm: 14,
    nousHumiAlarm: 15,
    nousHumiSensitivity: 20,
    nousTempSensitivity: 19,
    nousTempReportInterval: 17,
    nousHumiReportInterval: 18,
    // TUYA Temperature and Humidity Sensor
    tthTemperature: 1,
    tthHumidity: 2,
    tthBatteryLevel: 3,
    tthBattery: 4,
    // TUYA / HUMIDITY/ILLUMINANCE/TEMPERATURE SENSOR
    thitBatteryPercentage: 3,
    thitIlluminanceLux: 7,
    tIlluminanceLux: 2,
    thitHumidity: 9,
    thitTemperature: 8,
    // TUYA SMART VIBRATION SENSOR
    tuyaVibration: 10,
    // TUYA WLS-100z Water Leak Sensor
    wlsWaterLeak: 1,
    wlsBatteryPercentage: 4,
    // Evanell
    evanellMode: 2,
    evanellHeatingSetpoint: 4,
    evanellLocalTemp: 5,
    evanellBattery: 6,
    evanellChildLock: 8,
    // ZMAM02 Zemismart RF Courtain Converter
    AM02Control: 1,
    AM02PercentControl: 2,
    AM02PercentState: 3,
    AM02Mode: 4,
    AM02Direction: 5,
    AM02WorkState: 7,
    AM02CountdownLeft: 9,
    AM02TimeTotal: 10,
    AM02SituationSet: 11,
    AM02Fault: 12,
    AM02Border: 16,
    AM02MotorWorkingMode: 20,
    AM02AddRemoter: 101,
    // Matsee Tuya Garage Door Opener
    garageDoorTrigger: 1,
    garageDoorContact: 3,
    garageDoorStatus: 12,
    // Moes switch with optional neutral
    moesSwitchPowerOnBehavior: 14,
    moesSwitchIndicateLight: 15,
    // X5H thermostat
    x5hState: 1,
    x5hMode: 2,
    x5hWorkingStatus: 3,
    x5hSound: 7,
    x5hFrostProtection: 10,
    x5hSetTemp: 16,
    x5hSetTempCeiling: 19,
    x5hCurrentTemp: 24,
    x5hTempCorrection: 27,
    x5hWeeklyProcedure: 30,
    x5hWorkingDaySetting: 31,
    x5hFactoryReset: 39,
    x5hChildLock: 40,
    x5hSensorSelection: 43,
    x5hFaultAlarm: 45,
    x5hTempDiff: 101,
    x5hProtectionTempLimit: 102,
    x5hOutputReverse: 103,
    x5hBackplaneBrightness: 104,
    // Connected thermostat
    connecteState: 1,
    connecteMode: 2,
    connecteHeatingSetpoint: 16,
    connecteLocalTemp: 24,
    connecteTempCalibration: 28,
    connecteChildLock: 30,
    connecteTempFloor: 101,
    connecteSensorType: 102,
    connecteHysteresis: 103,
    connecteRunningState: 104,
    connecteTempProgram: 105,
    connecteOpenWindow: 106,
    connecteMaxProtectTemp: 107,
    // TuYa Smart Human Presence Sensor
    tshpsPresenceState: 1,
    tshpscSensitivity: 2,
    tshpsMinimumRange: 3,
    tshpsMaximumRange: 4,
    tshpsTargetDistance: 9,
    tshpsDetectionDelay: 101,
    tshpsFadingTime: 102,
    tshpsIlluminanceLux: 104,
    tshpsCLI: 103, // not recognize
    tshpsSelfTest: 6, // not recognize
    // TuYa Luminance Motion sensor
    lmsState: 1,
    lmsBattery: 4,
    lmsSensitivity: 9,
    lmsKeepTime: 10,
    lmsIlluminance: 12,
    // Alecto SMART-SMOKE10
    alectoSmokeState: 1,
    alectoSmokeValue: 2,
    alectoSelfChecking: 8,
    alectoCheckingResult: 9,
    alectoSmokeTest: 11,
    alectoLifecycle: 12,
    alectoBatteryState: 14,
    alectoBatteryPercentage: 15,
    alectoSilence: 16,
    // BAC-002-ALZB - Moes like thermostat with Fan control
    bacFanMode: 28,
    // Human Presence Sensor Zigbee Radiowave Tuya
    HPSZInductionState: 1,
    HPSZPresenceTime: 101,
    HPSZLeavingTime: 102,
    HPSZLEDState: 103,
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
    zsHeatingSetpoint: 16,
    zsChildLock: 40,
    zsTempCalibration: 104,
    zsLocalTemp: 24,
    zsBatteryVoltage: 35,
    zsComfortTemp: 101,
    zsEcoTemp: 102,
    zsHeatingSetpointAuto: 105,
    zsOpenwindowTemp: 116,
    zsOpenwindowTime: 117,
    zsErrorStatus: 45,
    zsMode: 2,
    zsAwaySetting: 103,
    zsBinaryOne: 106,
    zsBinaryTwo: 107,
    zsScheduleMonday: 109,
    zsScheduleTuesday: 110,
    zsScheduleWednesday: 111,
    zsScheduleThursday: 112,
    zsScheduleFriday: 113,
    zsScheduleSaturday: 114,
    zsScheduleSunday: 115,
};

function firstDpValue(msg: any, meta: any, converterName: any) {
    const dpValues = msg.data.dpValues;
    for (let index = 1; index < dpValues.length; index++) {
        logger.debug(
            `Additional DP #${dpValues[index].dp} with data ${JSON.stringify(dpValues[index])} will be ignored! \
                Use a for loop in the fromZigbee converter (see \
                https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html)`,
            `zhc:${converterName}`,
        );
    }
    return dpValues[0];
}

const numberWithinRange = (number: number, min: number, max: number) => {
    if (number > max) {
        return max;
    } else if (number < min) {
        return min;
    } else {
        return number;
    }
};

const holdUpdateBrightness324131092621 = (deviceID: any) => {
    if (fromZigbeeStore[deviceID] && fromZigbeeStore[deviceID].brightnessSince && fromZigbeeStore[deviceID].brightnessDirection) {
        const duration = Date.now() - fromZigbeeStore[deviceID].brightnessSince;
        const delta = (duration / 10) * (fromZigbeeStore[deviceID].brightnessDirection === 'up' ? 1 : -1);
        const newValue = fromZigbeeStore[deviceID].brightnessValue + delta;
        fromZigbeeStore[deviceID].brightnessValue = numberWithinRange(newValue, 1, 255);
    }
};

function getMetaValue(entity: any, definition: any, key: string, groupStrategy='first') {
    if (entity.constructor.name === 'Group' && entity.members.length > 0) {
        const values = [];
        for (const memberMeta of definition) {
            if (memberMeta.meta && memberMeta.meta.hasOwnProperty(key)) {
                if (groupStrategy === 'first') {
                    return memberMeta.meta[key];
                }

                values.push(memberMeta.meta[key]);
            } else {
                values.push(undefined);
            }
        }

        if (groupStrategy === 'allEqual' && (new Set(values)).size === 1) {
            return values[0];
        }
    } else if (definition && definition.meta && definition.meta.hasOwnProperty(key)) {
        return definition.meta[key];
    }

    return undefined;
}

const tuyaGetDataValue = (dataType: any, data: any) => {
    switch (dataType) {
    case dataTypes.raw:
        return data;
    case dataTypes.bool:
        return data[0] === 1;
    case dataTypes.value:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(data);
    case dataTypes.string:
        // eslint-disable-next-line
        let dataString = '';
        // Don't use .map here, doesn't work: https://github.com/Koenkk/zigbee-herdsman-converters/pull/1799/files#r530377091
        for (let i = 0; i < data.length; ++i) {
            dataString += String.fromCharCode(data[i]);
        }
        return dataString;
    case dataTypes.enum:
        return data[0];
    case dataTypes.bitmap:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(data);
    }
};

const toPercentage = (value: number, min: number, max: number) => {
    if (value > max) {
        value = max;
    } else if (value < min) {
        value = min;
    }

    const normalised = (value - min) / (max - min);
    return Math.round(normalised * 100);
};

const postfixWithEndpointName = (name: string, msg: KeyValueAny, definition: Definition) => {
    if (definition.meta && definition.meta.multiEndpoint) {
        const endpointName = definition.hasOwnProperty('endpoint') ?
            getKey(definition.endpoint(msg.device), msg.endpoint.ID) : msg.endpoint.ID;
        return `${name}_${endpointName}`;
    } else {
        return name;
    }
};

const transactionStore: KeyValueAny = {};
const hasAlreadyProcessedMessage = (msg: KeyValueAny, model: Definition, transaction:number=null, key:string=null) => {
    if (model.meta && model.meta.publishDuplicateTransaction) return false;
    const current = transaction !== null ? transaction : msg.meta.zclTransactionSequenceNumber;
    key = key || msg.device.ieeeAddr;
    if (transactionStore[key] === current) return true;
    transactionStore[key] = current;
    return false;
};

const addActionGroup = (payload: any, msg: any, definition: any) => {
    const disableActionGroup = definition.meta && definition.meta.disableActionGroup;
    if (!disableActionGroup && msg.groupID) {
        payload.action_group = msg.groupID;
    }
};

const ratelimitedDimmer = (model: any, msg: any, publish: any, options: any, meta: any) => {
    const deviceID = msg.device.ieeeAddr;
    const payload: KeyValueAny = {};
    let duration = 0;

    if (!fromZigbeeStore[deviceID]) {
        fromZigbeeStore[deviceID] = {lastmsg: false};
    }
    const s = fromZigbeeStore[deviceID];

    if (s.lastmsg) {
        duration = Date.now() - s.lastmsg;
    } else {
        s.lastmsg = Date.now();
    }

    if (duration > 500) {
        s.lastmsg = Date.now();
        payload.action = 'brightness';
        payload.brightness = msg.data.level;
        publish(payload);
    }
};

const ictcg1 = (model: any, msg: any, publish: any, options: any, action: any) => {
    const deviceID = msg.device.ieeeAddr;
    const payload: KeyValueAny = {};

    if (!fromZigbeeStore[deviceID]) {
        fromZigbeeStore[deviceID] = {since: false, direction: false, value: 255, publish: publish};
    }

    const s = fromZigbeeStore[deviceID];
    // if rate == 70 so we rotate slowly
    const rate = (msg.data.rate == 70) ? 0.3 : 1;

    if (action === 'move') {
        s.since = Date.now();
        const direction = msg.data.movemode === 1 ? 'left' : 'right';
        s.direction = direction;
        payload.action = `rotate_${direction}`;
    } else if (action === 'level') {
        s.value = msg.data.level;
        const direction = s.value === 0 ? 'left' : 'right';
        payload.action = `rotate_${direction}_quick`;
        payload.brightness = s.value;
    } else if (action === 'stop') {
        if (s.direction) {
            const duration = Date.now() - s.since;
            const delta = Math.round(rate * (duration / 10) * (s.direction === 'left' ? -1 : 1));
            const newValue = s.value + delta;
            if (newValue >= 0 && newValue <= 255) {
                s.value = newValue;
            }
        }
        payload.action = 'rotate_stop';
        payload.brightness = s.value;
        s.direction = false;
    }
    if (s.timerId) {
        clearInterval(s.timerId);
        s.timerId = false;
    }
    if (action === 'move') {
        s.timerId = setInterval(() => {
            const duration = Date.now() - s.since;
            const delta = Math.round(rate * (duration / 10) * (s.direction === 'left' ? -1 : 1));
            const newValue = s.value + delta;
            if (newValue >= 0 && newValue <= 255) {
                s.value = newValue;
            }
            payload.brightness = s.value;
            s.since = Date.now();
            s.publish(payload);
        }, 200);
    }
    return payload.brightness;
};

const SAFETY_MIN_SECS = 10;
const CAPACITY = 'capacity';
const DURATION = 'duration';
const OFF = 'OFF';
const ON = 'ON';

const toLocalTime = (time: any, timezone: any) => {
    if (time === '--:--:--') {
        return time;
    }

    const local = new Date(`2000-01-01T${time}.000${timezone}`); // Using 1970 instead produces edge cases
    return local.toTimeString().split(' ').shift();
};


const giexFzModelConverters = {
    QT06_1: {
        // _TZE200_sh1btabb timezone is GMT+8
        time: (value: any) => toLocalTime(value, '+08:00'),
    },
};

const giexTzModelConverters: KeyValueAny = {
    QT06_2: {
        // _TZE200_a7sghmms irrigation time should not be less than 10 secs as per GiEX advice
        irrigationTarget: (value: any, mode: any) => value > 0 && value < SAFETY_MIN_SECS && mode === DURATION ? SAFETY_MIN_SECS : value,
    },
};

const giexWaterValve = {
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
};

const fromZigbee1 = {
    TS0222: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = getDataValue(dpValue);
                switch (dp) {
                case 2:
                    result.illuminance = value;
                    result.illuminance_lux = value;
                    break;
                case 4:
                    result.battery = value;
                    break;
                default:
                    logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:ts0222');
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    watering_timer: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp; // First we get the data point ID
                const value = getDataValue(dpValue); // This function will take care of converting the data to proper JS type
                switch (dp) {
                case dataPoints.wateringTimer.water_flow: {
                    result.water_flow = value;
                    break;
                }
                case dataPoints.wateringTimer.remaining_watering_time: {
                    result.remaining_watering_time = value;
                    break;
                }
                case dataPoints.wateringTimer.last_watering_duration: {
                    result.last_watering_duration = value;
                    break;
                }

                case dataPoints.wateringTimer.valve_state: {
                    result.valve_state = value;
                    break;
                }

                case dataPoints.wateringTimer.shutdown_timer: {
                    result.shutdown_timer = value;
                    break;
                }
                case dataPoints.wateringTimer.valve_state_auto_shutdown: {
                    result.valve_state_auto_shutdown = value;
                    result.valve_state = value;
                    break;
                }

                case dataPoints.wateringTimer.battery: {
                    result.battery = value;
                    break;
                }
                default: {
                    logger.debug(`>>> UNKNOWN DP #${dp} with data "${JSON.stringify(dpValue)}"`, 'zhc:legacy:fz:watering_timer');
                }
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    ZM35HQ_battery: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'ZM35HQ');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            if (dp === 4) return {battery: value};
            else {
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:zm35hq');
            }
        },
    } satisfies Fz.Converter,
    ZMRM02: {
        cluster: 'manuSpecificTuya',
        type: ['commandGetData', 'commandSetDataResponse', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'ZMRM02');
            if (dpValue.dp === 10) {
                return {battery: getDataValue(dpValue)};
            } else {
                const button = dpValue.dp;
                const actionValue = getDataValue(dpValue);
                const lookup: KeyValueAny = {0: 'single', 1: 'double', 2: 'hold'};
                const action = lookup[actionValue];
                return {action: `button_${button}_${action}`};
            }
        },
    } satisfies Fz.Converter,
    SA12IZL: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = getDataValue(dpValue);
                switch (dp) {
                case dataPoints.state:
                    result.smoke = value === 0;
                    break;
                case 15:
                    result.battery = value;
                    break;
                case 16:
                    result.silence_siren = value;
                    break;
                case 20: {
                    const alarm: KeyValueAny = {0: true, 1: false};
                    result.alarm = alarm[value];
                    break;
                }
                default:
                    logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:sa12izl');
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    R7049_status: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp; // First we get the data point ID
                const value = getDataValue(dpValue); // This function will take care of converting the data to proper JS type
                switch (dp) {
                case 1:
                    result.smoke = Boolean(!value);
                    break;
                case 8:
                    result.test_alarm = value;
                    break;
                case 9: {
                    const testAlarmResult: KeyValueAny = {0: 'checking', 1: 'check_success', 2: 'check_failure', 3: 'others'};
                    result.test_alarm_result = testAlarmResult[value];
                    break;
                }
                case 11:
                    result.fault_alarm = Boolean(value);
                    break;
                case 14: {
                    const batteryLevels: KeyValueAny = {0: 'low', 1: 'middle', 2: 'high'};
                    result.battery_level = batteryLevels[value];
                    result.battery_low = value === 0;
                    break;
                }
                case 16:
                    result.silence_siren = value;
                    break;
                case 20: {
                    const alarm: KeyValueAny = {0: true, 1: false};
                    result.alarm = alarm[value];
                    break;
                }
                default:
                    logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:r7049_status');
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    woox_R7060: {
        cluster: 'manuSpecificTuya',
        type: ['commandActiveStatusReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'woox_R7060');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);

            switch (dp) {
            case dataPoints.wooxSwitch:
                return {state: value === 2 ? 'OFF' : 'ON'};
            case 101:
                return {battery: value};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:woox_r7060');
            }
        },
    } satisfies Fz.Converter,
    hpsz: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'hpsz');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            let result = null;
            switch (dp) {
            case dataPoints.HPSZInductionState:
                result = {presence: value === 1};
                break;
            case dataPoints.HPSZPresenceTime:
                result = {duration_of_attendance: value};
                break;
            case dataPoints.HPSZLeavingTime:
                result = {duration_of_absence: value};
                break;
            case dataPoints.HPSZLEDState:
                result = {led_state: value};
                break;
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:hpsz');
            }
            return result;
        },
    } satisfies Fz.Converter,
    zb_sm_cover: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = getDataValue(dpValue);

                switch (dp) {
                case dataPoints.coverPosition: // Started moving to position (triggered from Zigbee)
                case dataPoints.coverArrived: { // Arrived at position
                    const invert = (meta.state) ? !meta.state.invert_cover : false;
                    const position = invert ? 100 - (value & 0xFF) : (value & 0xFF);
                    if (position > 0 && position <= 100) {
                        result.position = position;
                        result.state = 'OPEN';
                    } else if (position == 0) { // Report fully closed
                        result.position = position;
                        result.state = 'CLOSE';
                    }
                    break;
                }
                case 1: // report state
                    // @ts-ignore
                    result.state = {0: 'OPEN', 1: 'STOP', 2: 'CLOSE'}[value];
                    break;
                case dataPoints.motorDirection: // reverse direction
                    result.reverse_direction = (value == 1);
                    break;
                case 10: // cycle time
                    result.cycle_time = value;
                    break;
                case 101: // model
                    // @ts-ignore
                    result.motor_type = {0: '', 1: 'AM0/6-28R-Sm', 2: 'AM0/10-19R-Sm',
                        3: 'AM1/10-13R-Sm', 4: 'AM1/20-13R-Sm', 5: 'AM1/30-13R-Sm'}[value];
                    break;
                case 102: // cycles
                    result.cycle_count = value;
                    break;
                case 103: // set or clear bottom limit
                    // @ts-ignore
                    result.bottom_limit = {0: 'SET', 1: 'CLEAR'}[value];
                    break;
                case 104: // set or clear top limit
                    // @ts-ignore
                    result.top_limit = {0: 'SET', 1: 'CLEAR'}[value];
                    break;
                case 109: // active power
                    result.active_power = value;
                    break;
                case 115: // favorite_position
                    result.favorite_position = (value != 101) ? value : null;
                    break;
                case 116: // report confirmation
                    break;
                case 121: // running state
                    // @ts-ignore
                    result.motor_state = {0: 'OPENING', 1: 'STOPPED', 2: 'CLOSING'}[value];
                    result.running = (value !== 1) ? true : false;
                    break;
                default: // Unknown code
                    logger.debug(
                        `Unhandled DP #${dp} for ${meta.device.manufacturerName}: ${JSON.stringify(dpValue)}`,
                        'zhc:legacy:fz:zb_sm_cover',
                    );
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    x5h_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'x5h_thermostat');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);

            switch (dp) {
            case dataPoints.x5hState: {
                return {system_mode: value ? 'heat' : 'off'};
            }
            case dataPoints.x5hWorkingStatus: {
                return {running_state: value ? 'heat' : 'idle'};
            }
            case dataPoints.x5hSound: {
                return {sound: value ? 'ON' : 'OFF'};
            }
            case dataPoints.x5hFrostProtection: {
                return {frost_protection: value ? 'ON' : 'OFF'};
            }
            case dataPoints.x5hWorkingDaySetting: {
                return {week: thermostatWeekFormat[value]};
            }
            case dataPoints.x5hFactoryReset: {
                if (value) {
                    clearTimeout(globalStore.getValue(msg.endpoint, 'factoryResetTimer'));
                    const timer = setTimeout(() => publish({factory_reset: 'OFF'}), 60 * 1000);
                    globalStore.putValue(msg.endpoint, 'factoryResetTimer', timer);
                    logger.info('The thermostat is resetting now. It will be available in 1 minute.', 'zhc:legacy:fz:x5h_thermostat');
                }

                return {factory_reset: value ? 'ON' : 'OFF'};
            }
            case dataPoints.x5hTempDiff: {
                return {deadzone_temperature: parseFloat((value / 10).toFixed(1))};
            }
            case dataPoints.x5hProtectionTempLimit: {
                return {heating_temp_limit: value};
            }
            case dataPoints.x5hBackplaneBrightness: {
                const lookup: KeyValueAny = {0: 'off', 1: 'low', 2: 'medium', 3: 'high'};

                if (value >= 0 && value <= 3) {
                    globalStore.putValue(msg.endpoint, 'brightnessState', value);
                    return {brightness_state: lookup[value]};
                }

                // Sometimes, for example on thermostat restart, it sends message like:
                // {"dpValues":[{"data":{"data":[90],"type":"Buffer"},"datatype":4,"dp":104}
                // It doesn't represent any brightness value and brightness remains the previous value
                const lastValue = globalStore.getValue(msg.endpoint, 'brightnessState') || 1;
                return {brightness_state: lookup[lastValue]};
            }
            case dataPoints.x5hWeeklyProcedure: {
                const periods = [];
                const periodSize = 4;
                const periodsNumber = 8;

                for (let i = 0; i < periodsNumber; i++) {
                    const hours = value[i * periodSize];
                    const minutes = value[i * periodSize + 1];
                    const tempHexArray = [value[i * periodSize + 2], value[i * periodSize + 3]];
                    const tempRaw = Buffer.from(tempHexArray).readUIntBE(0, tempHexArray.length);
                    const strHours = hours.toString().padStart(2, '0');
                    const strMinutes = minutes.toString().padStart(2, '0');
                    const temp = parseFloat((tempRaw / 10).toFixed(1));
                    periods.push(`${strHours}:${strMinutes}/${temp}`);
                }

                const schedule = periods.join(' ');
                return {schedule};
            }
            case dataPoints.x5hChildLock: {
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            }
            case dataPoints.x5hSetTemp: {
                const setpoint = parseFloat((value / 10).toFixed(1));
                globalStore.putValue(msg.endpoint, 'currentHeatingSetpoint', setpoint);
                return {current_heating_setpoint: setpoint};
            }
            case dataPoints.x5hSetTempCeiling: {
                return {upper_temp: value};
            }
            case dataPoints.x5hCurrentTemp: {
                const temperature = value & (1 << 15) ? value - (1 << 16) + 1 : value;
                return {local_temperature: parseFloat((temperature / 10).toFixed(1))};
            }
            case dataPoints.x5hTempCorrection: {
                return {local_temperature_calibration: parseFloat((value / 10).toFixed(1))};
            }
            case dataPoints.x5hMode: {
                const lookup: KeyValueAny = {0: 'manual', 1: 'program'};
                return {preset: lookup[value]};
            }
            case dataPoints.x5hSensorSelection: {
                const lookup: KeyValueAny = {0: 'internal', 1: 'external', 2: 'both'};
                return {sensor: lookup[value]};
            }
            case dataPoints.x5hOutputReverse: {
                return {output_reverse: value};
            }
            default: {
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:x5h_thermostat');
            }
            }
        },
    } satisfies Fz.Converter,
    zs_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'zs_thermostat');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            const ret: KeyValueAny = {};
            const daysMap: KeyValueAny = {1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 7: 'sunday'};
            const day = daysMap[value[0]];

            switch (dp) {
            case dataPoints.zsChildLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};

            case dataPoints.zsHeatingSetpoint:
                if (value==0) ret.system_mode='off';
                if (value==60) {
                    ret.system_mode='heat';
                    ret.preset = 'boost';
                }

                ret.current_heating_setpoint= (value / 2).toFixed(1);
                if (value>0 && value<60) globalStore.putValue(msg.endpoint, 'current_heating_setpoint', ret.current_heating_setpoint);
                return ret;
            case dataPoints.zsHeatingSetpointAuto:
                return {current_heating_setpoint_auto: (value / 2).toFixed(1)};

            case dataPoints.zsOpenwindowTemp:
                return {detectwindow_temperature: (value / 2).toFixed(1)};

            case dataPoints.zsOpenwindowTime:
                return {detectwindow_timeminute: value};

            case dataPoints.zsLocalTemp:
                return {local_temperature: (value / 10).toFixed(1)};

            case dataPoints.zsBatteryVoltage:
                return {voltage: Math.round(value * 10)};

            case dataPoints.zsTempCalibration:
                return {local_temperature_calibration: value > 55 ?
                    ((value - 0x100000000)/10).toFixed(1): (value/ 10).toFixed(1)};

            case dataPoints.zsBinaryOne:
                return {binary_one: value ? 'ON' : 'OFF'};

            case dataPoints.zsBinaryTwo:
                return {binary_two: value ? 'ON' : 'OFF'};

            case dataPoints.zsComfortTemp:
                return {comfort_temperature: (value / 2).toFixed(1)};

            case dataPoints.zsEcoTemp:
                return {eco_temperature: (value / 2).toFixed(1)};

                // case dataPoints.zsAwayTemp:
                //     return {away_preset_temperature: (value / 2).toFixed(1)};

            case dataPoints.zsMode:
                switch (value) {
                case 1: // manual
                    return {system_mode: 'heat', away_mode: 'OFF', preset: 'manual'};
                case 2: // away
                    return {system_mode: 'auto', away_mode: 'ON', preset: 'holiday'};
                case 0: // auto
                    return {system_mode: 'auto', away_mode: 'OFF', preset: 'schedule'};
                default:
                    logger.warning(`Preset ${value} is not recognized.`, 'zhc:legacy:fz:zs_thermostat');
                    break;
                }
                break;
            case dataPoints.zsScheduleMonday:
            case dataPoints.zsScheduleTuesday:
            case dataPoints.zsScheduleWednesday:
            case dataPoints.zsScheduleThursday:
            case dataPoints.zsScheduleFriday:
            case dataPoints.zsScheduleSaturday:
            case dataPoints.zsScheduleSunday:
                for (let i = 1; i <= 9; i++) {
                    const tempId = ((i-1) * 2) +1;
                    const timeId = ((i-1) * 2) +2;
                    ret[`${day}_temp_${i}`] = (value[tempId] / 2).toFixed(1);
                    if (i!=9) {
                        ret[`${day}_hour_${i}`] = Math.floor(value[timeId] / 4).toString().padStart(2, '0');
                        ret[`${day}_minute_${i}`] = ((value[timeId] % 4) *15).toString().padStart(2, '0');
                    }
                }
                return ret;
            case dataPoints.zsAwaySetting:
                ret.away_preset_year = value[0];
                ret.away_preset_month = value[1];
                ret.away_preset_day = value[2];
                ret.away_preset_hour = value[3];
                ret.away_preset_minute = value[4];
                ret.away_preset_temperature = (value[5] / 2).toFixed(1);
                ret.away_preset_days = (value[6]<<8)+value[7];
                return ret;
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:zs_thermostat');
            }
        },
    } satisfies Fz.Converter,
    giexWaterValve: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            // @ts-ignore
            const modelConverters = giexFzModelConverters[model.model] || {};
            for (const dpValue of msg.data.dpValues) {
                const value = getDataValue(dpValue);
                const {dp} = dpValue;
                switch (dp) {
                case dataPoints.giexWaterValve.state:
                    return {[giexWaterValve.state]: value ? ON: OFF};
                case dataPoints.giexWaterValve.mode:
                    return {[giexWaterValve.mode]: value ? CAPACITY: DURATION};
                case dataPoints.giexWaterValve.irrigationTarget:
                    return {[giexWaterValve.irrigationTarget]: value};
                case dataPoints.giexWaterValve.cycleIrrigationNumTimes:
                    return {[giexWaterValve.cycleIrrigationNumTimes]: value};
                case dataPoints.giexWaterValve.cycleIrrigationInterval:
                    return {[giexWaterValve.cycleIrrigationInterval]: value};
                case dataPoints.giexWaterValve.waterConsumed:
                    return {[giexWaterValve.waterConsumed]: value};
                case dataPoints.giexWaterValve.irrigationStartTime:
                    return {[giexWaterValve.irrigationStartTime]: modelConverters.time?.(value) || value};
                case dataPoints.giexWaterValve.irrigationEndTime:
                    return {[giexWaterValve.irrigationEndTime]: modelConverters.time?.(value) || value};
                case dataPoints.giexWaterValve.lastIrrigationDuration:
                    return {[giexWaterValve.lastIrrigationDuration]: value.split(',').shift()}; // Remove meaningless ,0 suffix
                case dataPoints.giexWaterValve.battery:
                    return {[giexWaterValve.battery]: value};
                case dataPoints.giexWaterValve.currentTemperature:
                    return; // Do Nothing - value ignored because it isn't a valid temperature reading (misdocumented and usage unclear)
                default: // Unknown data point warning
                    logger.debug(`Unrecognized DP #${dp} with VALUE = ${value}`, 'legacy:fz:giex_water_valve');
                }
            }
        },
    } satisfies Fz.Converter,
    tuya_alecto_smoke: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_alecto_smoke');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.alectoSmokeState:
                // @ts-ignore
                return {smoke_state: {0: 'alarm', 1: 'normal'}[value]};
            case dataPoints.alectoSmokeValue:
                return {smoke_value: value};
            case dataPoints.alectoSelfChecking:
                return {self_checking: value};
            case dataPoints.alectoCheckingResult:
                // @ts-ignore
                return {checking_result: {0: 'checking', 1: 'check_success', 2: 'check_failure', 3: 'others'}[value]};
            case dataPoints.alectoSmokeTest:
                return {smoke_test: value};
            case dataPoints.alectoLifecycle:
                return {lifecycle: value};
            case dataPoints.alectoBatteryPercentage:
                return {battery: value};
            case dataPoints.alectoBatteryState:
                // @ts-ignore
                return {battery_state: {0: 'low', 1: 'middle', 2: 'high'}[value]};
            case dataPoints.alectoSilence:
                return {silence: value};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(msg.data)}`, 'zhc:legacy:fz:tuya_alecto_smoke');
            }
        },
    } satisfies Fz.Converter,
    SmartButton_skip: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const direction = msg.data.stepmode === 1 ? 'backward' : 'forward';
                return {
                    action: `skip_${direction}`,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    konke_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const value = msg.data['onOff'];
                const lookup: KeyValueAny = {
                    128: {click: 'single'}, // single click
                    129: {click: 'double'}, // double and many click
                    130: {click: 'long'}, // hold
                };

                return lookup[value] ? lookup[value] : null;
            }
        },
    } satisfies Fz.Converter,
    terncy_raw: {
        cluster: 'manuSpecificClusterAduroSmart',
        type: 'raw',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                // 13,40,18,104, 0,8,1 - click
                // 13,40,18,22,  0,17,1
                // 13,40,18,32,  0,18,1
                // 13,40,18,6,   0,16,1
                // 13,40,18,111, 0,4,2 - double click
                // 13,40,18,58,  0,7,2
                // 13,40,18,6,   0,2,3 - triple click
                // motion messages:
                // 13,40,18,105, 4,167,0,7 - motion on right side
                // 13,40,18,96,  4,27,0,5
                // 13,40,18,101, 4,27,0,7
                // 13,40,18,125, 4,28,0,5
                // 13,40,18,85,  4,28,0,7
                // 13,40,18,3,   4,24,0,5
                // 13,40,18,81,  4,10,1,7
                // 13,40,18,72,  4,30,1,5
                // 13,40,18,24,  4,25,0,40 - motion on left side
                // 13,40,18,47,  4,28,0,56
                // 13,40,18,8,   4,32,0,40
                let value: any = {};
                if (msg.data[4] == 0) {
                    value = msg.data[6];
                    if (1 <= value && value <= 3) {
                        const actionLookup: any = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                        return {click: actionLookup[value]};
                    }
                }
            }
        },
    } satisfies Fz.Converter,
    CCTSwitch_D0001_on_off: {
        cluster: 'genOnOff',
        type: ['commandOn', 'commandOff'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: 'power'};
            }
        },
    } satisfies Fz.Converter,
    ptvo_switch_buttons: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                const value = msg.data['presentValue'];

                const actionLookup: KeyValueAny = {
                    0: 'release',
                    1: 'single',
                    2: 'double',
                    3: 'tripple',
                    4: 'hold',
                };

                const action = actionLookup[value];

                if (button) {
                    return {click: button + (action ? `_${action}` : '')};
                }
            }
        },
    } satisfies Fz.Converter,
    ZGRC013_brightness_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                const direction = msg.data.movemode == 0 ? 'up' : 'down';
                if (button) {
                    return {click: `${button}_${direction}`};
                }
            }
        },
    } satisfies Fz.Converter,
    ZGRC013_brightness_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                if (button) {
                    return {click: `${button}_stop`};
                }
            }
        },
    } satisfies Fz.Converter,
    ZGRC013_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
            }
        },
    } satisfies Fz.Converter,
    ZGRC013_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                if (button) {
                    return {click: `${button}_on`};
                }
            }
        },
    } satisfies Fz.Converter,
    ZGRC013_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                if (button) {
                    return {click: `${button}_off`};
                }
            }
        },
    } satisfies Fz.Converter,
    ZGRC013_brightness: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                const direction = msg.data.movemode == 0 ? 'up' : 'down';
                if (button) {
                    return {click: `${button}_${direction}`};
                }
            }
        },
    } satisfies Fz.Converter,
    CTR_U_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
            }
        },
    } satisfies Fz.Converter,
    st_button_state: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const buttonStates: KeyValueAny = {
                    0: 'off',
                    1: 'single',
                    2: 'double',
                    3: 'hold',
                };

                if (msg.data.hasOwnProperty('data')) {
                    const zoneStatus = msg.data.zonestatus;
                    return {click: buttonStates[zoneStatus]};
                } else {
                    const zoneStatus = msg.data.zonestatus;
                    return {click: buttonStates[zoneStatus]};
                }
            }
        },
    } satisfies Fz.Converter,
    cover_stop: {
        cluster: 'closuresWindowCovering',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: 'release'};
            }
        },
    } satisfies Fz.Converter,
    cover_open: {
        cluster: 'closuresWindowCovering',
        type: 'commandUpOpen',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: 'open'};
            }
        },
    } satisfies Fz.Converter,
    cover_close: {
        cluster: 'closuresWindowCovering',
        type: 'commandDownClose',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: 'close'};
            }
        },
    } satisfies Fz.Converter,
    TS0218_click: {
        cluster: 'ssIasAce',
        type: 'commandEmergency',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'click'};
            } else {
                return fromZigbeeConverters.command_emergency.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    scenes_recall_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: msg.data.sceneid};
            }
        },
    } satisfies Fz.Converter,
    AV2010_34_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: msg.data.groupid};
            }
        },
    } satisfies Fz.Converter,
    genOnOff_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: 'on'};
            }
        },
    } satisfies Fz.Converter,
    genOnOff_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {click: 'off'};
            }
        },
    } satisfies Fz.Converter,
    RM01_on_click: {
        cluster: 'genOnOff',
        type: 'commandOn',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {action: `${button}_on`};
            } else {
                return fromZigbeeConverters.command_on.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    RM01_off_click: {
        cluster: 'genOnOff',
        type: 'commandOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {action: `${button}_off`};
            } else {
                return fromZigbeeConverters.command_off.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    RM01_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {
                    action: `${button}_down`,
                    step_mode: msg.data.stepmode,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    RM01_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {
                    action: `${button}_up`,
                    step_mode: msg.data.stepmode,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    RM01_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {action: `${button}_stop`};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    cmd_move: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        options: [exposes.options.legacy(), exposes.options.simulated_brightness(' Note: will only work when legacy: false is set.')],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            if (utils.isLegacyEnabled(options)) {
                ictcg1(model, msg, publish, options, 'move');
                const direction = msg.data.movemode === 1 ? 'left' : 'right';
                return {action: `rotate_${direction}`, rate: msg.data.rate};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    cmd_move_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        options: [exposes.options.legacy(), exposes.options.simulated_brightness(' Note: will only work when legacy: false is set.')],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                ictcg1(model, msg, publish, options, 'move');
                const direction = msg.data.movemode === 1 ? 'left' : 'right';
                return {action: `rotate_${direction}`, rate: msg.data.rate};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    cmd_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            if (utils.isLegacyEnabled(options)) {
                const value = ictcg1(model, msg, publish, options, 'stop');
                return {action: `rotate_stop`, brightness: value};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    cmd_stop_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const value = ictcg1(model, msg, publish, options, 'stop');
                return {action: `rotate_stop`, brightness: value};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    cmd_move_to_level_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const value = ictcg1(model, msg, publish, options, 'level');
                const direction = msg.data.level === 0 ? 'left' : 'right';
                return {action: `rotate_${direction}_quick`, level: msg.data.level, brightness: value};
            } else {
                return fromZigbeeConverters.command_move_to_level.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    immax_07046L_arm: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const action = msg.data['armmode'];
                delete msg.data['armmode'];
                const modeLookup: KeyValueAny = {
                    0: 'disarm',
                    1: 'arm_stay',
                    3: 'arm_away',
                };
                return {action: modeLookup[action]};
            } else {
                return fromZigbeeConverters.command_arm.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    KEF1PA_arm: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const action = msg.data['armmode'];
                delete msg.data['armmode'];
                const modeLookup: KeyValueAny = {
                    0: 'home',
                    2: 'sleep',
                    3: 'away',
                };
                return {action: modeLookup[action]};
            } else {
                return fromZigbeeConverters.command_arm.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    CTR_U_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                const direction = msg.data.stepmode === 1 ? 'down' : 'up';

                // Save last direction for release event
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {};
                }
                fromZigbeeStore[deviceID].direction = direction;

                return {
                    action: `brightness_${direction}_click`,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    CTR_U_brightness_updown_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                const direction = msg.data.movemode === 1 ? 'down' : 'up';

                // Save last direction for release event
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {};
                }
                fromZigbeeStore[deviceID].direction = direction;

                return {
                    action: `brightness_${direction}_hold`,
                    rate: msg.data.rate,
                };
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    CTR_U_brightness_updown_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    return null;
                }

                const direction = fromZigbeeStore[deviceID].direction;
                return {
                    action: `brightness_${direction}_release`,
                };
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'up'};
            } else {
                return fromZigbeeConverters.command_on.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'down'};
            } else {
                return fromZigbeeConverters.command_off.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_cmdMoveWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {direction: null};
                }
                fromZigbeeStore[deviceID].direction = 'up';
                return {action: 'up_hold'};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AC0251100NJ_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const map: KeyValueAny = {
                    1: 'up_release',
                    2: 'down_release',
                };

                return {action: map[msg.endpoint.ID]};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_cmdMove: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {direction: null};
                }
                fromZigbeeStore[deviceID].direction = 'down';
                return {action: 'down_hold'};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_cmdMoveHue: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                if (msg.data.movemode === 0) {
                    return {action: 'circle_release'};
                }
            } else {
                return fromZigbeeConverters.command_move_hue.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_cmdMoveToSaturation: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToSaturation',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'circle_hold'};
            } else {
                return fromZigbeeConverters.command_move_to_saturation.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_cmdMoveToLevelWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'circle_click'};
            } else {
                return fromZigbeeConverters.command_move_to_level.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_cmdMoveToColorTemp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return null;
            } else {
                return fromZigbeeConverters.command_move_to_color_temp.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_73743_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {direction: null};
                }
                let direction;
                if (fromZigbeeStore[deviceID].direction) {
                    direction = `${fromZigbeeStore[deviceID].direction}_`;
                }
                return {action: `${direction}release`};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AB371860355_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'left_top_click'};
            } else {
                return fromZigbeeConverters.command_on.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AB371860355_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'left_bottom_click'};
            } else {
                return fromZigbeeConverters.command_off.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AB371860355_cmdStepColorTemp: {
        cluster: 'lightingColorCtrl',
        type: 'commandStepColorTemp',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const pos = (msg.data.stepmode === 1) ? 'top' : 'bottom';
                return {action: `right_${pos}_click`};
            } else {
                return fromZigbeeConverters.command_step_color_temperature.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AB371860355_cmdMoveWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'left_top_hold'};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AB371860355_cmdMove: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'left_bottom_hold'};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AB371860355_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const pos = (msg.endpoint.ID === 1) ? 'top' : 'bottom';
                return {action: `left_${pos}_release`};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AB371860355_cmdMoveHue: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const pos = (msg.endpoint.ID === 2) ? 'top' : 'bottom';
                const action = (msg.data.movemode === 0) ? 'release' : 'hold';
                return {action: `right_${pos}_${action}`};
            } else {
                return fromZigbeeConverters.command_move_hue.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    osram_lightify_switch_AB371860355_cmdMoveSat: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToSaturation',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const pos = (msg.endpoint.ID === 2) ? 'top' : 'bottom';
                return {action: `right_${pos}_hold`};
            } else {
                return fromZigbeeConverters.command_move_to_saturation.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    insta_scene_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {
                    action: `select_${msg.data.sceneid}`,
                };
            } else {
                return fromZigbeeConverters.command_recall.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    insta_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {
                    action: 'down',
                    step_mode: msg.data.stepmode,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    insta_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {
                    action: 'up',
                    step_mode: msg.data.stepmode,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    insta_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {
                    action: 'stop',
                };
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    tint404011_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const direction = msg.data.stepmode === 1 ? 'down' : 'up';
                const payload = {
                    action: `brightness_${direction}_click`,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    tint404011_brightness_updown_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                const direction = msg.data.movemode === 1 ? 'down' : 'up';

                // Save last direction for release event
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {};
                }
                fromZigbeeStore[deviceID].movemode = direction;

                const payload = {
                    action: `brightness_${direction}_hold`,
                    rate: msg.data.rate,
                };
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    tint404011_brightness_updown_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    return null;
                }

                const direction = fromZigbeeStore[deviceID].movemode;
                const payload = {action: `brightness_${direction}_release`};
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    tint404011_move_to_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const payload = {
                    action: `color_temp`,
                    action_color_temperature: msg.data.colortemp,
                    transition_time: msg.data.transtime,
                };
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.tint404011_move_to_color_temp.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    tint404011_move_to_color: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColor',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const payload = {
                    action_color: {
                        x: utils.precisionRound(msg.data.colorx / 65535, 3),
                        y: utils.precisionRound(msg.data.colory / 65535, 3),
                    },
                    action: 'color_wheel',
                    transition_time: msg.data.transtime,
                };
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_move_to_color.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    heiman_smart_controller_armmode: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                if (msg.data.armmode != null) {
                    const lookup: KeyValueAny = {
                        0: 'disarm',
                        1: 'arm_partial_zones',
                        3: 'arm_all_zones',
                    };

                    const value = msg.data.armmode;
                    return {action: lookup[value] || `armmode_${value}`};
                }
            } else {
                return fromZigbeeConverters.command_arm.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    LZL4B_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {
                    action: msg.data.level,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_move_to_level.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    eria_81825_updown: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const direction = msg.data.stepmode === 0 ? 'up' : 'down';
                return {action: `${direction}`};
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    ZYCT202_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'stop', action_group: msg.groupID};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    ZYCT202_up_down: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                const value = msg.data['movemode'];
                let action = null;
                if (value === 0) action = {'action': 'up-press', 'action_group': msg.groupID};
                else if (value === 1) action = {'action': 'down-press', 'action_group': msg.groupID};
                return action ? action : null;
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    STS_PRS_251_beeping: {
        cluster: 'genIdentify',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                return {action: 'beeping'};
            } else {
                return fromZigbeeConverters.identify.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    dimmer_passthru_brightness: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.isLegacyEnabled(options)) {
                ratelimitedDimmer(model, msg, publish, options, meta);
            } else {
                return fromZigbeeConverters.command_move_to_level.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    bitron_thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.thermostat.convert(model, msg, publish, options, meta);
            }

            const result: KeyValueAny = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result.local_temperature = utils.precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['localTemperatureCalibration'] == 'number') {
                result.local_temperature_calibration =
                    utils.precisionRound(msg.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    utils.precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['runningState'] == 'number') {
                result.running_state = msg.data['runningState'];
            }
            if (typeof msg.data['batteryAlarmState'] == 'number') {
                result.battery_alarm_state = msg.data['batteryAlarmState'];
            }
            return result;
        },
    } satisfies Fz.Converter,
    thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.thermostat.convert(model, msg, publish, options, meta);
            }

            const result: KeyValueAny = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result[postfixWithEndpointName('local_temperature', msg, model)] = utils.precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['localTemperatureCalibration'] == 'number') {
                result[postfixWithEndpointName('local_temperature_calibration', msg, model)] =
                    utils.precisionRound(msg.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data['occupancy'] == 'number') {
                result[postfixWithEndpointName('occupancy', msg, model)] = msg.data['occupancy'];
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                let ohs = utils.precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
                // Stelpro will return -325.65 when set to off
                ohs = ohs < - 250 ? 0 : ohs;
                result[postfixWithEndpointName('occupied_heating_setpoint', msg, model)] = ohs;
            }
            if (typeof msg.data['unoccupiedHeatingSetpoint'] == 'number') {
                result[postfixWithEndpointName('unoccupied_heating_setpoint', msg, model)] =
                    utils.precisionRound(msg.data['unoccupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['occupiedCoolingSetpoint'] == 'number') {
                result[postfixWithEndpointName('occupied_cooling_setpoint', msg, model)] =
                    utils.precisionRound(msg.data['occupiedCoolingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['unoccupiedCoolingSetpoint'] == 'number') {
                result[postfixWithEndpointName('unoccupied_cooling_setpoint', msg, model)] =
                    utils.precisionRound(msg.data['unoccupiedCoolingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['weeklySchedule'] == 'number') {
                result[postfixWithEndpointName('weekly_schedule', msg, model)] = msg.data['weeklySchedule'];
            }
            if (typeof msg.data['setpointChangeAmount'] == 'number') {
                result[postfixWithEndpointName('setpoint_change_amount', msg, model)] = msg.data['setpointChangeAmount'] / 100;
            }
            if (typeof msg.data['setpointChangeSource'] == 'number') {
                result[postfixWithEndpointName('setpoint_change_source', msg, model)] = msg.data['setpointChangeSource'];
            }
            if (typeof msg.data['setpointChangeSourceTimeStamp'] == 'number') {
                result[postfixWithEndpointName('setpoint_change_source_timestamp', msg, model)] =
                    msg.data['setpointChangeSourceTimeStamp'];
            }
            if (typeof msg.data['remoteSensing'] == 'number') {
                result[postfixWithEndpointName('remote_sensing', msg, model)] = msg.data['remoteSensing'];
            }
            const ctrl = msg.data['ctrlSeqeOfOper'];
            if (typeof ctrl == 'number' && thermostatControlSequenceOfOperations.hasOwnProperty(ctrl)) {
                result[postfixWithEndpointName('control_sequence_of_operation', msg, model)] =
                    // @ts-ignore
                    thermostatControlSequenceOfOperations[ctrl];
            }
            const smode = msg.data['systemMode'];
            if (typeof smode == 'number' && thermostatSystemModes.hasOwnProperty(smode)) {
                // @ts-ignore
                result[postfixWithEndpointName('system_mode', msg, model)] = thermostatSystemModes[smode];
            }
            const rmode = msg.data['runningMode'];
            if (typeof rmode == 'number' && thermostatSystemModes.hasOwnProperty(rmode)) {
                // @ts-ignore
                result[postfixWithEndpointName('running_mode', msg, model)] = thermostatSystemModes[rmode];
            }
            const state = msg.data['runningState'];
            if (typeof state == 'number' && constants.thermostatRunningStates.hasOwnProperty(state)) {
                // @ts-ignore
                result[postfixWithEndpointName('running_state', msg, model)] = constants.thermostatRunningStates[state];
            }
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result[postfixWithEndpointName('pi_heating_demand', msg, model)] =
                    utils.precisionRound(msg.data['pIHeatingDemand'] / 255.0 * 100.0, 0);
            }
            if (typeof msg.data['tempSetpointHold'] == 'number') {
                result[postfixWithEndpointName('temperature_setpoint_hold', msg, model)] = msg.data['tempSetpointHold'];
            }
            if (typeof msg.data['tempSetpointHoldDuration'] == 'number') {
                result[postfixWithEndpointName('temperature_setpoint_hold_duration', msg, model)] =
                    msg.data['tempSetpointHoldDuration'];
            }
            return result;
        },
    } satisfies Fz.Converter,
    stelpro_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.stelpro_thermostat.convert(model, msg, publish, options, meta);
            }

            const result = fromZigbee.thermostat_att_report.convert(model, msg, publish, options, meta) as KeyValueAny;
            const mode = msg.data['StelproSystemMode'];
            if (mode == 'number') {
                result.stelpro_mode = mode;
                switch (mode) {
                case 5:
                    // 'Eco' mode is translated into 'auto' here
                    result.system_mode = thermostatSystemModes[1];
                    break;
                }
            }
            const piHeatingDemand = msg.data['pIHeatingDemand'];
            if (typeof piHeatingDemand == 'number') {
                // DEPRECATED: only return running_state here (change operation -> running_state)
                result.operation = piHeatingDemand >= 10 ? 'heating' : 'idle';
                result.running_state = piHeatingDemand >= 10 ? 'heat' : 'idle';
            }
            return result;
        },
    } satisfies Fz.Converter,
    viessmann_thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.viessmann_thermostat.convert(model, msg, publish, options, meta);
            }

            const result = fromZigbee.thermostat_att_report.convert(model, msg, publish, options, meta) as KeyValueAny;

            // ViessMann TRVs report piHeatingDemand from 0-5
            // NOTE: remove the result for now, but leave it configure for reporting
            //       it will show up in the debug log still to help try and figure out
            //       what this value potentially means.
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                delete result.pi_heating_demand;
            }

            return result;
        },
    } satisfies Fz.Converter,
    eurotronic_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.eurotronic_thermostat.convert(model, msg, publish, options, meta);
            }

            const result = fromZigbee.thermostat_att_report.convert(model, msg, publish, options, meta) as KeyValueAny;
            // system_mode is always 'heat', we set it below based on eurotronic_host_flags
            if (result.system_mode) {
                delete result['system_mode'];
            }
            if (typeof msg.data[0x4003] == 'number') {
                result.current_heating_setpoint =
                    utils.precisionRound(msg.data[0x4003], 2) / 100;
            }
            if (typeof msg.data[0x4008] == 'number') {
                result.eurotronic_host_flags = msg.data[0x4008];
                const resultHostFlags = {
                    'mirror_display': false,
                    'boost': false,
                    'window_open': false,
                    'child_protection': false,
                };
                if ((result.eurotronic_host_flags & 1 << 2) != 0) {
                    // system_mode => 'heat', boost mode
                    result.system_mode = thermostatSystemModes[4];
                    resultHostFlags.boost = true;
                } else if ((result.eurotronic_host_flags & (1 << 4)) != 0 ) {
                    // system_mode => 'off', window open detected
                    result.system_mode = thermostatSystemModes[0];
                    resultHostFlags.window_open = true;
                } else {
                    // system_mode => 'auto', default
                    result.system_mode = thermostatSystemModes[1];
                }
                if ((result.eurotronic_host_flags & (1 << 1)) != 0 ) {
                    // mirror_display
                    resultHostFlags.mirror_display = true;
                }
                if ((result.eurotronic_host_flags & (1 << 7)) != 0 ) {
                    // child protection
                    resultHostFlags.child_protection = true;
                }
                // keep eurotronic_system_mode for compatibility (is there a way to mark this as deprecated?)
                result.eurotronic_system_mode = result.eurotronic_host_flags;
                result.eurotronic_host_flags = resultHostFlags;
            }
            if (typeof msg.data[0x4002] == 'number') {
                result.eurotronic_error_status = msg.data[0x4002];
            }
            if (typeof msg.data[0x4000] == 'number') {
                result.eurotronic_trv_mode = msg.data[0x4000];
            }
            if (typeof msg.data[0x4001] == 'number') {
                result.eurotronic_valve_position = msg.data[0x4001];
            }
            return result;
        },
    } satisfies Fz.Converter,
    wiser_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.thermostat.convert(model, msg, publish, options, meta);
            }

            const result: KeyValueAny = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result.local_temperature = utils.precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    utils.precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = utils.precisionRound(msg.data['pIHeatingDemand'], 2);
            }
            return result;
        },
    } satisfies Fz.Converter,
    hvac_user_interface: {
        cluster: 'hvacUserInterfaceCfg',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.hvac_user_interface.convert(model, msg, publish, options, meta);
            }

            const result: KeyValueAny = {};
            const lockoutMode = msg.data['keypadLockout'];
            if (typeof lockoutMode == 'number') {
                result.keypad_lockout = lockoutMode;
            }
            return result;
        },
    } satisfies Fz.Converter,
    thermostat_weekly_schedule_rsp: {
        cluster: 'hvacThermostat',
        type: ['commandGetWeeklyScheduleRsp'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.thermostat_weekly_schedule.convert(model, msg, publish, options, meta);
            }

            const result: KeyValueAny = {};
            const key = postfixWithEndpointName('weekly_schedule', msg, model);
            result[key] = {};
            if (typeof msg.data['dayofweek'] == 'number') {
                result[key][msg.data['dayofweek']] = msg.data;
                for (const elem of result[key][msg.data['dayofweek']]['transitions']) {
                    if (typeof elem['heatSetpoint'] == 'number') {
                        elem['heatSetpoint'] /= 100;
                    }
                    if (typeof elem['coolSetpoint'] == 'number') {
                        elem['coolSetpoint'] /= 100;
                    }
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    terncy_knob: {
        cluster: 'manuSpecificClusterAduroSmart',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.terncy_knob.convert(model, msg, publish, options, meta);
            }
            if (typeof msg.data['27'] === 'number') {
                return {
                    action: 'rotate',
                    direction: (msg.data['27'] > 0 ? 'clockwise' : 'counterclockwise'),
                    number: (Math.abs(msg.data['27']) / 12),
                };
            }
        },
    } satisfies Fz.Converter,
    wiser_itrv_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.battery.convert(model, msg, publish, options, meta);
            }

            const result: KeyValueAny = {};
            if (typeof msg.data['batteryVoltage'] == 'number') {
                const battery = {max: 30, min: 22};
                const voltage = msg.data['batteryVoltage'];
                result.battery = toPercentage(voltage, battery.min, battery.max);
                result.voltage = voltage / 10;
            }
            if (typeof msg.data['batteryAlarmState'] == 'number') {
                const battLow = msg.data['batteryAlarmState'];
                if (battLow) {
                    result['battery_low'] = true;
                } else {
                    result['battery_low'] = false;
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    ubisys_c4_scenes: {
        cluster: 'genScenes',
        type: 'commandRecall',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.command_recall.convert(model, msg, publish, options, meta);
            }
            return {action: `${msg.endpoint.ID}_scene_${msg.data.groupid}_${msg.data.sceneid}`};
        },
    } satisfies Fz.Converter,
    ubisys_c4_onoff: {
        cluster: 'genOnOff',
        type: ['commandOn', 'commandOff', 'commandToggle'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                if (msg.type === 'commandOn') {
                    return fromZigbeeConverters.command_on.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandOff') {
                    return fromZigbeeConverters.command_off.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandToggle') {
                    return fromZigbeeConverters.command_toggle.convert(model, msg, publish, options, meta);
                }
            }
            return {action: `${msg.endpoint.ID}_${msg.type.substr(7).toLowerCase()}`};
        },
    } satisfies Fz.Converter,
    ubisys_c4_level: {
        cluster: 'genLevelCtrl',
        type: ['commandMoveWithOnOff', 'commandStopWithOnOff'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                if (msg.type === 'commandMoveWithOnOff') {
                    return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandStopWithOnOff') {
                    return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
                }
            }

            switch (msg.type) {
            case 'commandMoveWithOnOff':
                return {action: `${msg.endpoint.ID}_level_move_${msg.data.movemode ? 'down' : 'up'}`};
            case 'commandStopWithOnOff':
                return {action: `${msg.endpoint.ID}_level_stop`};
            }
        },
    } satisfies Fz.Converter,
    ubisys_c4_cover: {
        cluster: 'closuresWindowCovering',
        type: ['commandUpOpen', 'commandDownClose', 'commandStop'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                if (msg.type === 'commandUpOpen') {
                    return fromZigbeeConverters.command_cover_open.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandDownClose') {
                    return fromZigbeeConverters.command_cover_close.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandStop') {
                    return fromZigbeeConverters.command_cover_stop.convert(model, msg, publish, options, meta);
                }
            }

            const lookup: KeyValueAny = {
                'commandUpOpen': 'open',
                'commandDownClose': 'close',
                'commandStop': 'stop',
            };
            return {action: `${msg.endpoint.ID}_cover_${lookup[msg.type]}`};
        },
    } satisfies Fz.Converter,
    hue_dimmer_switch: {
        cluster: 'manuSpecificPhilips',
        type: 'commandHueNotification',
        options: [exposes.options.legacy(), exposes.options.simulated_brightness('Only works when legacy is false.')],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                return fromZigbeeConverters.hue_dimmer_switch.convert(model, msg, publish, options, meta);
            }

            const multiplePressTimeout = options && options.hasOwnProperty('multiple_press_timeout') ?
                options.multiple_press_timeout : 0.25;

            const getPayload = function(button: any, pressType: any, pressDuration: any, pressCounter: any,
                brightnessSend: any, brightnessValue: any) {
                const payLoad: KeyValueAny = {};
                payLoad['action'] = `${button}-${pressType}`;
                payLoad['duration'] = pressDuration / 1000;
                if (pressCounter) {
                    payLoad['counter'] = pressCounter;
                }
                if (brightnessSend) {
                    payLoad['brightness'] = fromZigbeeStore[deviceID].brightnessValue;
                }
                return payLoad;
            };

            const deviceID = msg.device.ieeeAddr;
            const buttonLookup: KeyValueAny = {1: 'on', 2: 'up', 3: 'down', 4: 'off'};
            const button = buttonLookup[msg.data['button']];

            const typeLookup: KeyValueAny = {0: 'press', 1: 'hold', 2: 'release', 3: 'release'};
            const type = typeLookup[msg.data['type']];

            const brightnessEnabled = options && options.hasOwnProperty('send_brightess') ?
                options.send_brightess : true;
            const brightnessSend = brightnessEnabled && button && (button == 'up' || button == 'down');

            // Initialize store
            if (!fromZigbeeStore[deviceID]) {
                fromZigbeeStore[deviceID] = {pressStart: null, pressType: null,
                    delayedButton: null, delayedBrightnessSend: null, delayedType: null,
                    delayedCounter: 0, delayedTimerStart: null, delayedTimer: null};
                if (brightnessEnabled) {
                    fromZigbeeStore[deviceID].brightnessValue = 255;
                    fromZigbeeStore[deviceID].brightnessSince = null;
                    fromZigbeeStore[deviceID].brightnessDirection = null;
                }
            }

            if (button && type) {
                if (type == 'press') {
                    fromZigbeeStore[deviceID].pressStart = Date.now();
                    fromZigbeeStore[deviceID].pressType = 'press';
                    if (brightnessSend) {
                        const newValue = fromZigbeeStore[deviceID].brightnessValue + (button === 'up' ? 32 : -32);
                        fromZigbeeStore[deviceID].brightnessValue = numberWithinRange(newValue, 1, 255);
                    }
                } else if (type == 'hold') {
                    fromZigbeeStore[deviceID].pressType = 'hold';
                    if (brightnessSend) {
                        holdUpdateBrightness324131092621(deviceID);
                        fromZigbeeStore[deviceID].brightnessSince = Date.now();
                        fromZigbeeStore[deviceID].brightnessDirection = button;
                    }
                } else if (type == 'release') {
                    if (brightnessSend) {
                        fromZigbeeStore[deviceID].brightnessSince = null;
                        fromZigbeeStore[deviceID].brightnessDirection = null;
                    }
                    if (fromZigbeeStore[deviceID].pressType == 'hold') {
                        fromZigbeeStore[deviceID].pressType += '-release';
                    }
                }
                if (type == 'press') {
                    // pressed different button
                    if (fromZigbeeStore[deviceID].delayedTimer && (fromZigbeeStore[deviceID].delayedButton != button)) {
                        clearTimeout(fromZigbeeStore[deviceID].delayedTimer);
                        fromZigbeeStore[deviceID].delayedTimer = null;
                        publish(getPayload(fromZigbeeStore[deviceID].delayedButton,
                            fromZigbeeStore[deviceID].delayedType, 0, fromZigbeeStore[deviceID].delayedCounter,
                            fromZigbeeStore[deviceID].delayedBrightnessSend,
                            fromZigbeeStore[deviceID].brightnessValue));
                    }
                } else {
                    // released after press: start timer
                    if (fromZigbeeStore[deviceID].pressType == 'press') {
                        if (fromZigbeeStore[deviceID].delayedTimer) {
                            clearTimeout(fromZigbeeStore[deviceID].delayedTimer);
                            fromZigbeeStore[deviceID].delayedTimer = null;
                        } else {
                            fromZigbeeStore[deviceID].delayedCounter = 0;
                        }
                        fromZigbeeStore[deviceID].delayedButton = button;
                        fromZigbeeStore[deviceID].delayedBrightnessSend = brightnessSend;
                        fromZigbeeStore[deviceID].delayedType = fromZigbeeStore[deviceID].pressType;
                        fromZigbeeStore[deviceID].delayedCounter++;
                        fromZigbeeStore[deviceID].delayedTimerStart = Date.now();
                        fromZigbeeStore[deviceID].delayedTimer = setTimeout(() => {
                            publish(getPayload(fromZigbeeStore[deviceID].delayedButton,
                                fromZigbeeStore[deviceID].delayedType, 0, fromZigbeeStore[deviceID].delayedCounter,
                                fromZigbeeStore[deviceID].delayedBrightnessSend,
                                fromZigbeeStore[deviceID].brightnessValue));
                            fromZigbeeStore[deviceID].delayedTimer = null;
                            // @ts-expect-error
                        }, multiplePressTimeout * 1000);
                    } else {
                        const pressDuration =
                            (fromZigbeeStore[deviceID].pressType == 'hold' || fromZigbeeStore[deviceID].pressType == 'hold-release') ?
                                Date.now() - fromZigbeeStore[deviceID].pressStart : 0;
                        return getPayload(button,
                            fromZigbeeStore[deviceID].pressType, pressDuration, null, brightnessSend,
                            fromZigbeeStore[deviceID].brightnessValue);
                    }
                }
            }

            return {};
        },
    } satisfies Fz.Converter,
    blitzwolf_occupancy_with_timeout: {
        cluster: 'manuSpecificTuya',
        type: 'commandDataResponse',
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'blitzwolf_occupancy_with_timeout');
            msg.data.occupancy = dpValue.dp === dataPoints.occupancy ? 1 : 0;
            return fromZigbeeConverters.occupancy_with_timeout.convert(model, msg, publish, options, meta) as KeyValueAny;
        },
    } satisfies Fz.Converter,
    moes_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'moes_thermostat');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            const stateLookup: KeyValueAny = {'0': 'cool', '1': 'heat', '2': 'fan_only'};
            let temperature;
            /* See tuyaThermostat above for message structure comment */
            switch (dp) {
            case dataPoints.moesSchedule:
                return {
                    program: {
                        weekdays_p1_hour: value[0],
                        weekdays_p1_minute: value[1],
                        weekdays_p1_temperature: value[2] / 2,
                        weekdays_p2_hour: value[3],
                        weekdays_p2_minute: value[4],
                        weekdays_p2_temperature: value[5] / 2,
                        weekdays_p3_hour: value[6],
                        weekdays_p3_minute: value[7],
                        weekdays_p3_temperature: value[8] / 2,
                        weekdays_p4_hour: value[9],
                        weekdays_p4_minute: value[10],
                        weekdays_p4_temperature: value[11] / 2,
                        saturday_p1_hour: value[12],
                        saturday_p1_minute: value[13],
                        saturday_p1_temperature: value[14] / 2,
                        saturday_p2_hour: value[15],
                        saturday_p2_minute: value[16],
                        saturday_p2_temperature: value[17] / 2,
                        saturday_p3_hour: value[18],
                        saturday_p3_minute: value[19],
                        saturday_p3_temperature: value[20] / 2,
                        saturday_p4_hour: value[21],
                        saturday_p4_minute: value[22],
                        saturday_p4_temperature: value[23] / 2,
                        sunday_p1_hour: value[24],
                        sunday_p1_minute: value[25],
                        sunday_p1_temperature: value[26] / 2,
                        sunday_p2_hour: value[27],
                        sunday_p2_minute: value[28],
                        sunday_p2_temperature: value[29] / 2,
                        sunday_p3_hour: value[30],
                        sunday_p3_minute: value[31],
                        sunday_p3_temperature: value[32] / 2,
                        sunday_p4_hour: value[33],
                        sunday_p4_minute: value[34],
                        sunday_p4_temperature: value[35] / 2,
                    },
                };
            case dataPoints.state: // Thermostat on standby = OFF, running = ON
                if (model.model === 'BAC-002-ALZB') {
                    if (!value) {
                        return {system_mode: 'off'};
                    }
                    return;
                } else {
                    return {system_mode: value ? 'heat' : 'off'};
                }
            case dataPoints.tvMode:
                if (model.model === 'BAC-002-ALZB') {
                    return {system_mode: stateLookup[value]};
                }
                return {preset_mode: value ? 'program' : 'hold', preset: value ? 'program' : 'hold'};
            case dataPoints.moesChildLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            case dataPoints.moesHeatingSetpoint:
                if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                    return {current_heating_setpoint: value / 10};
                } else {
                    return {current_heating_setpoint: value};
                }
            case dataPoints.moesMinTempLimit:
                if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                    return {min_temperature_limit: value / 10};
                } else {
                    return {min_temperature_limit: value};
                }
            case dataPoints.moesMaxTempLimit:
                if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                    return {max_temperature_limit: value / 10};
                } else {
                    return {max_temperature_limit: value};
                }
            case dataPoints.moesMaxTemp:
                if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                    return {max_temperature: value / 10};
                } else {
                    return {max_temperature: value};
                }
            case dataPoints.moesDeadZoneTemp:
                if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                    return {deadzone_temperature: value / 10};
                } else {
                    return {deadzone_temperature: value};
                }
            case dataPoints.moesLocalTemp:
                if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                    temperature = value / 10;
                } else {
                    temperature = value & 1<<15 ? value - (1<<16) + 1 : value;
                    if (!['_TZE200_ztvwu4nk', '_TZE200_ye5jkfsb'].includes(meta.device.manufacturerName)) {
                        // https://github.com/Koenkk/zigbee2mqtt/issues/11980
                        temperature = temperature / 10;
                    }
                }
                temperature = parseFloat(temperature.toFixed(1));
                if (temperature < 100) {
                    return {local_temperature: parseFloat(temperature.toFixed(1))};
                }
                break;
            case dataPoints.moesTempCalibration:
                temperature = value;
                // for negative values produce complimentary hex (equivalent to negative values)
                if (temperature > 4000) temperature = temperature - 4096;
                return {local_temperature_calibration: temperature};
            case dataPoints.moesScheduleEnable: // state is inverted, preset_mode is deprecated
                return {preset_mode: value ? 'hold' : 'program', preset: value ? 'hold' : 'program'};
            case dataPoints.moesValve:
                return {heat: value ? 'OFF' : 'ON', running_state: (value ? 'idle' : (model.model === 'BAC-002-ALZB' ? 'cool' : 'heat'))};
            case dataPoints.moesSensor:
                switch (value) {
                case 0:
                    return {sensor: 'IN'};
                case 1:
                    return {sensor: 'AL'};
                case 2:
                    return {sensor: 'OU'};
                default:
                    return {sensor: 'not_supported'};
                }
            case dataPoints.bacFanMode:
                return {fan_mode: fanModes[value]};
            default: // DataPoint 17 is unknown
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:moes_bht_022');
            }
        },
    } satisfies Fz.Converter,
    moesS_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'moesS_thermostat');
            const dp = dpValue.dp; // First we get the data point ID
            const value = getDataValue(dpValue);
            const presetLookup = {0: 'programming', 1: 'manual', 2: 'temporary_manual', 3: 'holiday'};
            switch (dp) {
            case dataPoints.moesSsystemMode:
                // @ts-ignore
                return {preset: presetLookup[value], system_mode: 'heat'};
            case dataPoints.moesSheatingSetpoint:
                return {current_heating_setpoint: value};
            case dataPoints.moesSlocalTemp:
                return {local_temperature: (value / 10)};
            case dataPoints.moesSboostHeating:
                return {boost_heating: value ? 'ON' : 'OFF'};
            case dataPoints.moesSboostHeatingCountdown:
                return {boost_heating_countdown: value};
            case dataPoints.moesSreset:
                return {running_state: value ? 'idle' : 'heat', valve_state: value ? 'CLOSED' : 'OPEN'};
            case dataPoints.moesSwindowDetectionFunktion_A2:
                return {window_detection: value ? 'ON' : 'OFF'};
            case dataPoints.moesSwindowDetection:
                return {window: value ? 'CLOSED' : 'OPEN'};
            case dataPoints.moesSchildLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            case dataPoints.moesSbattery:
                return {battery: value};
            case dataPoints.moesSboostHeatingCountdownTimeSet:
                return {boost_heating_countdown_time_set: (value)};
            case dataPoints.moesSvalvePosition:
                return {position: value};
            case dataPoints.moesScompensationTempSet:
                return {
                    local_temperature_calibration: value,
                    // local_temperature is now stale: the valve does not report the re-calibrated value until an actual temperature change
                    // so update local_temperature by subtracting the old calibration and adding the new one
                    ...(meta && meta.state && meta.state.local_temperature != null && meta.state.local_temperature_calibration != null) ?
                        // @ts-expect-error
                        {local_temperature: meta.state.local_temperature + (value - meta.state.local_temperature_calibration)} :
                        {},
                };
            case dataPoints.moesSecoMode:
                return {eco_mode: value ? 'ON' : 'OFF'};
            case dataPoints.moesSecoModeTempSet:
                return {eco_temperature: value};
            case dataPoints.moesSmaxTempSet:
                return {max_temperature: value};
            case dataPoints.moesSminTempSet:
                return {min_temperature: value};
            case dataPoints.moesSschedule: {
                const items = [];
                const pMode = [];
                for (let i = 0; i < 12; i++) {
                    const item = {h: value[i*3], m: value[i*3+1], temp: value[i*3+2] / 2};
                    items[i] = item;
                    pMode[i] = item['h'].toString().padStart(2, '0') + ':' +
                        item['m'].toString().padStart(2, '0') + '/' +
                        item['temp'] + '°C';
                }
                return {programming_mode: pMode.join('  ')};
            }
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:moes_s_thermostat');
            }
        },
    } satisfies Fz.Converter,
    tuya_air_quality: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_air_quality');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.tuyaSabTemp:
                return {temperature: (value > 0x2000 ? value - 0xFFFF : value) / 10};
            case dataPoints.tuyaSabHumidity:
                return {humidity: value / 10};
                // DP22: Smart Air Box: Formaldehyd, Smart Air Housekeeper: co2
            case dataPoints.tuyaSabFormaldehyd:
                if (['_TZE200_dwcarsat', '_TZE200_ryfmq5rl', '_TZE200_mja3fuja'].includes(meta.device.manufacturerName)) {
                    return {co2: value};
                } else {
                    return {formaldehyd: value};
                }
                // DP2: Smart Air Box: co2, Smart Air Housekeeper: MP25
            case dataPoints.tuyaSabCO2:
                if (['_TZE200_dwcarsat'].includes(meta.device.manufacturerName)) {
                    // Ignore: https://github.com/Koenkk/zigbee2mqtt/issues/11033#issuecomment-1109808552
                    if (value === 0xaaac || value === 0xaaab) return;
                    return {pm25: value};
                } else if (meta.device.manufacturerName === '_TZE200_ryfmq5rl') {
                    return {formaldehyd: value / 100};
                } else if (meta.device.manufacturerName === '_TZE200_mja3fuja') {
                    return {formaldehyd: value};
                } else {
                    return {co2: value};
                }
            case dataPoints.tuyaSabVOC:
                if (meta.device.manufacturerName === '_TZE200_ryfmq5rl') {
                    return {voc: value / 10};
                } else {
                    return {voc: value};
                }
            case dataPoints.tuyaSahkFormaldehyd:
                return {formaldehyd: value};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_air_quality');
            }
        },
    } satisfies Fz.Converter,
    tuya_CO: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_CO');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.tuyaSabCO:
                return {co: value / 100};
            case dataPoints.tuyaSabCOalarm:
                return {carbon_monoxide: value ? 'OFF' : 'ON'};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_co');
            }
        },
    } satisfies Fz.Converter,
    connecte_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'connecte_thermostat');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);

            switch (dp) {
            case dataPoints.connecteState:
                return {state: value ? 'ON' : 'OFF'};
            case dataPoints.connecteMode:
                switch (value) {
                case 0: // manual
                    return {system_mode: 'heat', away_mode: 'OFF'};
                case 1: // home (auto)
                    return {system_mode: 'auto', away_mode: 'OFF'};
                case 2: // away (auto)
                    return {system_mode: 'auto', away_mode: 'ON'};
                }
                break;
            case dataPoints.connecteHeatingSetpoint:
                return {current_heating_setpoint: value};
            case dataPoints.connecteLocalTemp:
                return {local_temperature: value};
            case dataPoints.connecteTempCalibration:
                return {local_temperature_calibration: value};
            case dataPoints.connecteChildLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            case dataPoints.connecteTempFloor:
                return {external_temperature: value};
            case dataPoints.connecteSensorType:
                // @ts-ignore
                return {sensor: {0: 'internal', 1: 'external', 2: 'both'}[value]};
            case dataPoints.connecteHysteresis:
                return {hysteresis: value};
            case dataPoints.connecteRunningState:
                return {running_state: value ? 'heat' : 'idle'};
            case dataPoints.connecteTempProgram:
                break;
            case dataPoints.connecteOpenWindow:
                return {window_detection: value ? 'ON' : 'OFF'};
            case dataPoints.connecteMaxProtectTemp:
                return {max_temperature_protection: value};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:connecte_thermostat');
            }
        },
    } satisfies Fz.Converter,
    saswell_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'saswell_thermostat');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);

            switch (dp) {
            case dataPoints.saswellHeating:
                // heating status 1 - heating
                return {'heating': value ? 'ON' : 'OFF'};
            case dataPoints.saswellWindowDetection:
                return {window_detection: value ? 'ON' : 'OFF'};
            case dataPoints.saswellFrostDetection:
                return {frost_detection: value ? 'ON' : 'OFF'};
            case dataPoints.saswellTempCalibration:
                return {local_temperature_calibration: value > 6 ? 0xFFFFFFFF - value : value};
            case dataPoints.saswellChildLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            case dataPoints.saswellState:
                return {system_mode: value ? 'heat' : 'off'};
            case dataPoints.saswellLocalTemp:
                return {local_temperature: parseFloat((value / 10).toFixed(1))};
            case dataPoints.saswellHeatingSetpoint:
                return {current_heating_setpoint: parseFloat((value / 10).toFixed(1))};
            case dataPoints.saswellValvePos:
                // single value 1-100%
                break;
            case dataPoints.saswellBatteryLow:
                return {battery_low: value ? true : false};
            case dataPoints.saswellAwayMode:
                if (value) {
                    return {away_mode: 'ON', preset_mode: 'away'};
                } else {
                    return {away_mode: 'OFF', preset_mode: 'none'};
                }
            case dataPoints.saswellScheduleMode:
                if (thermostatScheduleMode.hasOwnProperty(value)) {
                    return {schedule_mode: thermostatScheduleMode[value]};
                } else {
                    logger.warning(`Unknown schedule mode ${value}`, 'zhc:legacy:fz:saswell_thermostat');
                }
                break;
            case dataPoints.saswellScheduleEnable:
                if ( value ) {
                    return {system_mode: 'auto'};
                }
                break;
            case dataPoints.saswellScheduleSet:
                // Never seen being reported, but put here to prevent warnings
                break;
            case dataPoints.saswellSetpointHistoryDay:
                // 24 values - 1 value for each hour
                break;
            case dataPoints.saswellTimeSync:
                // uint8: year - 2000
                // uint8: month (1-12)
                // uint8: day (1-21)
                // uint8: hour (0-23)
                // uint8: minute (0-59)
                break;
            case dataPoints.saswellSetpointHistoryWeek:
                // 7 values - 1 value for each day
                break;
            case dataPoints.saswellSetpointHistoryMonth:
                // 31 values - 1 value for each day
                break;
            case dataPoints.saswellSetpointHistoryYear:
                // 12 values - 1 value for each month
                break;
            case dataPoints.saswellLocalHistoryDay:
                // 24 values - 1 value for each hour
                break;
            case dataPoints.saswellLocalHistoryWeek:
                // 7 values - 1 value for each day
                break;
            case dataPoints.saswellLocalHistoryMonth:
                // 31 values - 1 value for each day
                break;
            case dataPoints.saswellLocalHistoryYear:
                // 12 values - 1 value for each month
                break;
            case dataPoints.saswellMotorHistoryDay:
                // 24 values - 1 value for each hour
                break;
            case dataPoints.saswellMotorHistoryWeek:
                // 7 values - 1 value for each day
                break;
            case dataPoints.saswellMotorHistoryMonth:
                // 31 values - 1 value for each day
                break;
            case dataPoints.saswellMotorHistoryYear:
                // 12 values - 1 value for each month
                break;
            case dataPoints.saswellScheduleSunday:
            case dataPoints.saswellScheduleMonday:
            case dataPoints.saswellScheduleTuesday:
            case dataPoints.saswellScheduleWednesday:
            case dataPoints.saswellScheduleThursday:
            case dataPoints.saswellScheduleFriday:
            case dataPoints.saswellScheduleSaturday:
                // Handled by tuya_thermostat_weekly_schedule
                // Schedule for each day
                // [
                //     uint8: schedule mode - see above,
                //     uint16: time (60 * hour + minute)
                //     uint16: temperature * 10
                //     uint16: time (60 * hour + minute)
                //     uint16: temperature * 10
                //     uint16: time (60 * hour + minute)
                //     uint16: temperature * 10
                //     uint16: time (60 * hour + minute)
                //     uint16: temperature * 10
                // ]
                break;
            case dataPoints.saswellAntiScaling:
                return {anti_scaling: value ? 'ON' : 'OFF'};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:saswell_thermostat');
            }
        },
    } satisfies Fz.Converter,
    evanell_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const value = getDataValue(dpValue);
                switch (dpValue.dp) {
                case dataPoints.evanellChildLock:
                    result.child_lock = value ? 'LOCK' : 'UNLOCK';
                    break;
                case dataPoints.evanellBattery:
                    result.battery = value;
                    break;
                case dataPoints.evanellHeatingSetpoint:
                    result.current_heating_setpoint = value/10;
                    break;
                case dataPoints.evanellLocalTemp:
                    result.local_temperature = value/10;
                    break;
                case dataPoints.evanellMode:
                    switch (value) {
                    case 0: // manual
                        result.system_mode = 'auto';
                        break;
                    case 2: // away
                        result.system_mode = 'heat';
                        break;
                    case 3: // auto
                        result.system_mode = 'off';
                        break;
                    default:
                        logger.warning(`Mode ${value} is not recognized.`, 'zhc:legacy:fz:evanell_thermostat');
                        break;
                    }
                    break;
                default:
                    logger.debug(`Unrecognized DP #${dpValue.dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:evanell_thermostat');
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    etop_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'etop_thermostat');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);

            if (dp >= 101 && dp <=107) return; // handled by tuya_thermostat_weekly_schedule

            switch (dp) {
            case dataPoints.state: // on/off
                return !value ? {system_mode: 'off'} : {};
            case dataPoints.etopErrorStatus:
                return {
                    high_temperature: (value & 1<<0) > 0 ? 'ON' : 'OFF',
                    low_temperature: (value & 1<<1) > 0 ? 'ON' : 'OFF',
                    internal_sensor_error: (value & 1<<2) > 0 ? 'ON' : 'OFF',
                    external_sensor_error: (value & 1<<3) > 0 ? 'ON' : 'OFF',
                    battery_low: (value & 1<<4) > 0,
                    device_offline: (value & 1<<5) > 0 ? 'ON' : 'OFF',
                };
            case dataPoints.childLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            case dataPoints.heatingSetpoint:
                return {current_heating_setpoint: (value / 10).toFixed(1)};
            case dataPoints.localTemp:
                return {local_temperature: (value / 10).toFixed(1)};
            case dataPoints.mode:
                switch (value) {
                case 0: // manual
                    return {system_mode: 'heat', away_mode: 'OFF', preset: 'none'};
                case 1: // away
                    return {system_mode: 'heat', away_mode: 'ON', preset: 'away'};
                case 2: // auto
                    return {system_mode: 'auto', away_mode: 'OFF', preset: 'none'};
                default:
                    logger.warning(`Preset ${value} is not recognized.`, 'zhc:legacy:fz:etop_thermostat');
                    break;
                }
                break;
            case dataPoints.runningState:
                return {running_state: value ? 'heat' : 'idle'};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:etop_thermostat');
            }
        },
    } satisfies Fz.Converter,
    tuya_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_thermostat');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.windowOpen:
                return {window_open: value};
            case dataPoints.windowDetection:
                return {
                    window_detection: value[0] ? 'ON' : 'OFF',
                    window_detection_params: {
                        temperature: value[1],
                        minutes: value[2],
                    },
                };
            case dataPoints.scheduleWorkday: // set schedule for workdays/holidays [6,0,20,8,0,15,11,30,15,12,30,15,17,30,20,22,0,15]
            case dataPoints.scheduleHoliday: {
                // 6:00 - 20*, 8:00 - 15*, 11:30 - 15*, 12:30 - 15*, 17:30 - 20*, 22:00 - 15*
                // Top bits in hours have special meaning
                // 6: Current schedule indicator
                const items = [];
                const programmingMode = [];

                for (let i = 0; i < 6; i++) {
                    const item: KeyValueAny = {hour: value[i*3] & 0x3F, minute: value[i*3+1], temperature: value[i*3+2]};
                    if (value[i*3] & 0x40) {
                        item['current'] = true;
                    }

                    items[i] = item;
                    programmingMode[i] =
                        item['hour'].toString().padStart(2, '0') + ':' +
                        item['minute'].toString().padStart(2, '0') + '/' +
                        item['temperature'] + '°C';
                }

                if (dp == dataPoints.scheduleWorkday) {
                    return {workdays: items, workdays_schedule: programmingMode.join(' ')};
                } else {
                    return {holidays: items, holidays_schedule: programmingMode.join(' ')};
                }
            }
            case dataPoints.childLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            case dataPoints.siterwellWindowDetection:
                return {window_detection: value ? 'ON' : 'OFF'};
            case dataPoints.valveDetection:
                return {valve_detection: value ? 'ON' : 'OFF'};
            case dataPoints.autoLock: // 0x7401 auto lock mode
                return {auto_lock: value ? 'AUTO' : 'MANUAL'};
            case dataPoints.heatingSetpoint:
                return {current_heating_setpoint: parseFloat((value / 10).toFixed(1))};
            case dataPoints.localTemp:
                return {local_temperature: parseFloat((value / 10).toFixed(1))};
            case dataPoints.tempCalibration:
                return {local_temperature_calibration: parseFloat((value / 10).toFixed(1))};
            case dataPoints.battery: // 0x1502 MCU reporting battery status
                return {battery: value};
            case dataPoints.batteryLow:
                return {battery_low: value};
            case dataPoints.minTemp:
                return {min_temperature: value};
            case dataPoints.maxTemp:
                return {max_temperature: value};
            case dataPoints.boostTime: // 0x6902 boost time
                return {boost_time: value};
            case dataPoints.comfortTemp:
                return {comfort_temperature: value};
            case dataPoints.ecoTemp:
                return {eco_temperature: value};
            case dataPoints.valvePos:
                return {position: value, running_state: value ? 'heat' : 'idle'};
            case dataPoints.awayTemp:
                return {away_preset_temperature: value};
            case dataPoints.awayDays:
                return {away_preset_days: value};
            case dataPoints.mode: {
                const ret: KeyValueAny = {};
                const presetOk = getMetaValue(msg.endpoint, model, 'tuyaThermostatPreset').hasOwnProperty(value);
                if (presetOk) {
                    ret.preset = getMetaValue(msg.endpoint, model, 'tuyaThermostatPreset')[value];
                    ret.away_mode = ret.preset == 'away' ? 'ON' : 'OFF'; // Away is special HA mode
                    const presetToSystemMode = utils.getMetaValue(msg.endpoint, model, 'tuyaThermostatPresetToSystemMode', null, {});
                    if (value in presetToSystemMode) {
                        // @ts-expect-error
                        ret.system_mode = presetToSystemMode[value];
                    }
                } else {
                    logger.warning(`TRV preset ${value} is not recognized.`, 'zhc:legacy:fz:tuya_thermostat');
                    return;
                }
                return ret;
            }
            // fan mode 0 - low , 1 - medium , 2 - high , 3 - auto ( tested on 6dfgetq TUYA zigbee module )
            case dataPoints.fanMode:
                return {fan_mode: fanModes[value]};
            case dataPoints.forceMode: // force mode 0 - normal, 1 - open, 2 - close
                return {system_mode: thermostatSystemModes3[value], force: thermostatForceMode[value]};
            case dataPoints.weekFormat: // Week select 0 - 5 days, 1 - 6 days, 2 - 7 days
                return {week: thermostatWeekFormat[value]};
            default: // The purpose of the dps 17 & 19 is still unknown
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_thermostat');
            }
        },
    } satisfies Fz.Converter,
    tuya_dimmer: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_dimmer');
            const value = getDataValue(dpValue);
            if (dpValue.dp === dataPoints.state) {
                return {state: value ? 'ON': 'OFF'};
            } else if (meta.device.manufacturerName === '_TZE200_swaamsoy') {
                // https://github.com/Koenkk/zigbee-herdsman-converters/pull/3004
                if (dpValue.dp === 2) {
                    if (value < 10) {
                        logUnexpectedDataValue('tuya_dimmer', msg, dpValue, meta, 'brightness', 10, 1000);
                    }
                    return {brightness: utils.mapNumberRange(value, 10, 1000, 0, 254)};
                }
            } else if (['_TZE200_3p5ydos3', '_TZE200_9i9dt8is', '_TZE200_dfxkcots', '_TZE200_w4cryh2i']
                .includes(meta.device.manufacturerName)) {
                if (dpValue.dp === dataPoints.eardaDimmerLevel) {
                    return {brightness: utils.mapNumberRange(value, 0, 1000, 0, 254)};
                } else if (dpValue.dp === dataPoints.dimmerMinLevel) {
                    return {min_brightness: utils.mapNumberRange(value, 0, 1000, 1, 255)};
                } else if (dpValue.dp === dataPoints.dimmerMaxLevel) {
                    return {max_brightness: utils.mapNumberRange(value, 0, 1000, 1, 255)};
                } else {
                    logUnexpectedDataPoint('tuya_dimmer', msg, dpValue, meta);
                }
            } else {
                if (dpValue.dp !== dataPoints.dimmerLevel) {
                    logUnexpectedDataPoint('tuya_dimmer', msg, dpValue, meta);
                }
                if (dpValue.datatype !== dataTypes.value) {
                    logUnexpectedDataType('tuya_dimmer', msg, dpValue, meta);
                } else {
                    if (value < 10) {
                        logUnexpectedDataValue('tuya_dimmer', msg, dpValue, meta, 'brightness', 10, 1000);
                    }
                    return {brightness: utils.mapNumberRange(value, 10, 1000, 0, 254), level: value};
                }
            }
        },
    } satisfies Fz.Converter,
    tuya_motion_sensor: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_motion_sensor');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            let result = null;
            switch (dp) {
            case dataPoints.state:
                // @ts-ignore
                result = {occupancy: {1: true, 0: false}[value]};
                break;
            case dataPoints.msReferenceLuminance:
                result = {reference_luminance: value};
                break;
            case dataPoints.msOSensitivity:
                result = {o_sensitivity: msLookups.OSensitivity[value]};
                break;
            case dataPoints.msVSensitivity:
                result = {v_sensitivity: msLookups.VSensitivity[value]};
                break;
            case dataPoints.msLedStatus:
                // @ts-ignore
                result = {led_status: {1: 'OFF', 0: 'ON'}[value]};
                break;
            case dataPoints.msVacancyDelay:
                result = {vacancy_delay: value};
                break;
            case dataPoints.msLightOnLuminancePrefer:
                result = {light_on_luminance_prefer: value};
                break;
            case dataPoints.msLightOffLuminancePrefer:
                result = {light_off_luminance_prefer: value};
                break;
            case dataPoints.msMode:
                result = {mode: msLookups.Mode[value]};
                break;
            case dataPoints.msVacantConfirmTime:
                result = {vacant_confirm_time: value};
                break;
            case dataPoints.msLuminanceLevel:
                result = {luminance_level: value};
                break;
            default:
                logger.debug(`Unrecognized DP ${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_motion_sensor');
            }

            return result;
        },
    } satisfies Fz.Converter,
    tuya_smart_vibration_sensor: {
        cluster: 'manuSpecificTuya',
        type: ['commandGetData', 'commandDataResponse', 'raw'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const value = getDataValue(dpValue);
                switch (dpValue.dp) {
                case dataPoints.state:
                    result.contact = !value;
                    break;
                case dataPoints.thitBatteryPercentage:
                    result.battery = value;
                    break;
                case dataPoints.tuyaVibration:
                    result.vibration = Boolean(value);
                    break;
                default:
                    logger.debug(
                        `Unrecognized DP #${dpValue.dp} with data ${JSON.stringify(dpValue)}`,
                        'zhc:legacy:fz:tuya_smart_vibration_sensor',
                    );
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    matsee_garage_door_opener: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'raw'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const value = getDataValue(dpValue);
                switch (dpValue.dp) {
                case dataPoints.garageDoorTrigger:
                    result.action = 'trigger';
                    break;
                case dataPoints.garageDoorContact:
                    result.garage_door_contact = Boolean(!value);
                    break;
                case dataPoints.garageDoorStatus:
                    // This reports a garage door status (open, closed), but it is very naive and misleading
                    break;
                default:
                    logger.debug(
                        `Unrecognized DP #${dpValue.dp} with data ${JSON.stringify(dpValue)}`,
                        'zhc:legacy:fz:matsee_garage_door_opener',
                    );
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    moes_thermostat_tv: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport', 'raw'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'moes_thermostat_tv');
            const dp = dpValue.dp;
            let value = getDataValue(dpValue);
            let result = null;
            switch (dp) {
            case dataPoints.tvMode:
                switch (value) {
                case 1: // manual
                    result = {system_mode: 'heat', preset: 'manual'};
                    break;
                case 2: // holiday
                    result = {system_mode: 'heat', preset: 'holiday'};
                    break;
                case 0: // auto
                    result = {system_mode: 'auto', preset: 'schedule'};
                    break;
                default:
                    logger.warning(`Preset ${value} is not recognized.`, 'zhc:legacy:fz:moes_thermostat_tv');
                    break;
                }
                break;
            case dataPoints.tvWindowDetection:
                // @ts-ignore
                result = {window_detection: {1: true, 0: false}[value]};
                break;
            case dataPoints.tvFrostDetection:
                // @ts-ignore
                result = {frost_detection: {1: true, 0: false}[value]};
                break;
            case dataPoints.tvHeatingSetpoint:
                result = {current_heating_setpoint: (value / 10).toFixed(1)};
                break;
            case dataPoints.tvLocalTemp:
                result = {local_temperature: (value / 10).toFixed(1)};
                break;
            case dataPoints.tvTempCalibration:
                value = value > 0x7FFFFFFF ? 0xFFFFFFFF - value : value;
                result = {local_temperature_calibration: (value / 10).toFixed(1)};
                break;
            case dataPoints.tvHolidayTemp:
                result = {holiday_temperature: (value / 10).toFixed(1)};
                break;
            case dataPoints.tvBattery:
                result = {battery: value};
                break;
            case dataPoints.tvChildLock:
                // @ts-ignore
                result = {child_lock: {1: 'LOCK', 0: 'UNLOCK'}[value]};
                break;
            case dataPoints.tvErrorStatus:
                result = {error: value};
                break;
            case dataPoints.tvHolidayMode:
                result = {holiday_mode: value};
                break;
            // case dataPoints.tvBoostMode:
            //     result = {boost_mode: {1: false, 0: true}[value]};
            //     break;
            case dataPoints.tvBoostTime:
                result = {boost_heating_countdown: value};
                break;
            case dataPoints.tvOpenWindowTemp:
                result = {open_window_temperature: (value / 10).toFixed(1)};
                break;
            case dataPoints.tvComfortTemp:
                result = {comfort_temperature: (value / 10).toFixed(1)};
                break;
            case dataPoints.tvEcoTemp:
                result = {eco_temperature: (value / 10).toFixed(1)};
                break;
            case dataPoints.tvHeatingStop:
                if (value == 1) {
                    result = {system_mode: 'off', heating_stop: true};
                } else {
                    result = {heating_stop: false};
                }
                break;
            default:
                logger.debug(`Unrecognized DP ${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:moes_thermostat_tv');
            }

            return result;
        },
    } satisfies Fz.Converter,
    hoch_din: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'hoch_din');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            const result: KeyValueAny = {};
            logger.debug(`dp=[${dp}], datatype=[${dpValue.datatype}], value=[${value}]`, 'zhc:legacy:fz::hoch_din');

            if (dp === dataPoints.state) {
                result.state = value ? 'ON' : 'OFF';
                if (value) {
                    result.trip = 'clear';
                }
            }
            if (dp === dataPoints.hochChildLock) {
                result.child_lock = value ? 'ON' : 'OFF';
            }
            if (dp === dataPoints.hochVoltage) {
                result.voltage = (value[1] | value[0] << 8) / 10;
            }
            if (dp === dataPoints.hochHistoricalVoltage) {
                result.voltage_rms = (value[1] | value[0] << 8) / 10;
            }
            if (dp === dataPoints.hochCurrent) {
                result.current = (value[2] | value[1] << 8) / 1000;
            }
            if (dp === dataPoints.hochHistoricalCurrent) {
                result.current_average = (value[2] | value[1] << 8) / 1000;
            }
            if (dp === dataPoints.hochActivePower) {
                result.power = (value[2] | value[1] << 8) / 10;
                if (value.length > 3) {
                    result.power_l1 = (value[5] | value[4] << 8) / 10;
                }
                if (value.length > 6) {
                    result.power_l2 = (value[8] | value[7] << 8) / 10;
                }
                if (value.length > 9) {
                    result.power_l3 = (value[11] | value[10] << 8) / 10;
                }
            }
            if (dp === dataPoints.hochTotalActivePower) {
                result.energy_consumed = value / 100;
                result.energy = result.energy_consumed;
            }
            if (dp === dataPoints.hochLocking) {
                result.trip = value ? 'trip' : 'clear';
            }
            if (dp === dataPoints.hochCountdownTimer) {
                result.countdown_timer = value;
            }
            if (dp === dataPoints.hochTemperature) {
                result.temperature = value;
            }
            if (dp === dataPoints.hochRelayStatus) {
                const lookup: KeyValueAny = {
                    0: 'off',
                    1: 'on',
                    2: 'previous',
                };
                result.power_on_behavior = lookup[value];
            }
            if (dp === dataPoints.hochFaultCode) {
                const lookup: KeyValueAny = {
                    0: 'clear',
                    1: 'over voltage threshold',
                    2: 'under voltage threshold',
                    4: 'over current threshold',
                    8: 'over temperature threshold',
                    10: 'over leakage current threshold',
                    16: 'trip test',
                    128: 'safety lock',
                };
                result.alarm = lookup[value];
            }
            if (dp === dataPoints.hochEquipmentNumberType) {
                result.meter_number = value.trim();
            }
            if (dp === dataPoints.hochVoltageThreshold) {
                result.over_voltage_threshold = (value[1] | value[0] << 8) / 10;
                result.over_voltage_trip = value[2] ? 'ON' : 'OFF';
                result.over_voltage_alarm = value[3] ? 'ON' : 'OFF';
                result.under_voltage_threshold = (value[5] | value[4] << 8) / 10;
                result.under_voltage_trip = value[6] ? 'ON' : 'OFF';
                result.under_voltage_alarm = value[7] ? 'ON' : 'OFF';
            }
            if (dp === dataPoints.hochCurrentThreshold) {
                let overCurrentValue = 0;
                for (let i = 0; i < 3; i++) {
                    overCurrentValue = overCurrentValue << 8;
                    overCurrentValue += value[i];
                }
                result.over_current_threshold = overCurrentValue / 1000;
                result.over_current_trip = value[3] ? 'ON' : 'OFF';
                result.over_current_alarm = value[4] ? 'ON' : 'OFF';
            }
            if (dp === dataPoints.hochTemperatureThreshold) {
                result.over_temperature_threshold = value[0] > 127 ? (value[0] - 128) * -1 : value[0];
                result.over_temperature_trip = value[1] ? 'ON' : 'OFF';
                result.over_temperature_alarm = value[2] ? 'ON' : 'OFF';
            }
            if (dp === dataPoints.hochLeakageParameters) {
                result.self_test_auto_days = value[0];
                result.self_test_auto_hours = value[1];
                result.self_test_auto = value[2] ? 'ON' : 'OFF';
                result.over_leakage_current_threshold = value[4] | value[3] << 8;
                result.over_leakage_current_trip = value[5] ? 'ON' : 'OFF';
                result.over_leakage_current_alarm = value[6] ? 'ON' : 'OFF';
                result.self_test = value[7] ? 'test' : 'clear';
            }
            return result;
        },
    } satisfies Fz.Converter,
    tuya_light_wz5: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const separateWhite = (model.meta && model.meta.separateWhite);
            const result: KeyValueAny = {};
            // eslint-disable-next-line no-unused-vars
            for (const [i, dpValue] of msg.data.dpValues.entries()) {
                const dp = dpValue.dp;
                const value = getDataValue(dpValue);
                if (dp === dataPoints.state) {
                    result.state = value ? 'ON': 'OFF';
                } else if (dp === dataPoints.silvercrestSetBrightness) {
                    const brightness = utils.mapNumberRange(value, 0, 1000, 0, 255);
                    if (separateWhite) {
                        result.white_brightness = brightness;
                    } else {
                        result.brightness = brightness;
                    }
                } else if (dp === dataPoints.silvercrestSetColor) {
                    const h = parseInt(value.substring(0, 4), 16);
                    const s = parseInt(value.substring(4, 8), 16);
                    const b = parseInt(value.substring(8, 12), 16);
                    result.color_mode = 'hs';
                    result.color = {hue: h, saturation: utils.mapNumberRange(s, 0, 1000, 0, 100)};
                    result.brightness = utils.mapNumberRange(b, 0, 1000, 0, 255);
                } else if (dp === dataPoints.silvercrestSetColorTemp) {
                    const [colorTempMin, colorTempMax] = [250, 454];
                    result.color_temp = utils.mapNumberRange(value, 0, 1000, colorTempMax, colorTempMin);
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    ZMAM02_cover: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        options: [exposes.options.invert_cover()],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'ZMAM02_cover');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.coverPosition: // Started moving to position (triggered from Zigbee)
            case dataPoints.coverArrived: { // Arrived at position
                const running = dp === dataPoints.coverArrived ? false : true;
                const invert = isCoverInverted(meta.device.manufacturerName) ? !options.invert_cover : options.invert_cover;
                const position = invert ? 100 - (value & 0xFF) : (value & 0xFF);
                if (position > 0 && position <= 100) {
                    return {running, position, state: 'OPEN'};
                } else if (position == 0) { // Report fully closed
                    return {running, position, state: 'CLOSE'};
                } else {
                    return {running}; // Not calibrated yet, no position is available
                }
            }
            case dataPoints.coverSpeed: // Cover is reporting its current speed setting
                return {motor_speed: value};
            case dataPoints.state: // Ignore the cover state, it's not reliable between different covers!
            case dataPoints.coverChange: // Ignore manual cover change, it's not reliable between different covers!
                break;
            case dataPoints.config: // Returned by configuration set; ignore
                break;
            case dataPoints.AM02MotorWorkingMode:
                switch (value) {
                case 0: // continuous 1
                    return {motor_working_mode: 'continuous'};
                case 1: // intermittently
                    return {motor_working_mode: 'intermittently'};
                default:
                    logger.warning(`Mode ${value} is not recognized.`, 'zhc:legacy:fz:zmam02_cover');
                    break;
                }
                break;
            case dataPoints.AM02Border:
                switch (value) {
                case 0: // up
                    return {border: 'up'};
                case 1: // down
                    return {border: 'down'};
                case 2: // down_delete
                    return {border: 'down_delete'};
                default:
                    logger.warning(`Mode ${value} is not recognized.`, 'zhc:legacy:fz:zmam02_cover');
                    break;
                }
                break;
            case dataPoints.AM02Direction:
                switch (value) {
                case 0:
                    return {motor_direction: 'forward'};
                case 1:
                    return {motor_direction: 'back'};
                default:
                    logger.warning(`Mode ${value} is not recognized.`, 'zhc:legacy:fz:zmam02_cover');
                    break;
                }
                break;
            case dataPoints.AM02Mode:
                switch (value) {
                case 0: // morning
                    return {mode: 'morning'};
                case 1: // night
                    return {mode: 'night'};
                default:
                    logger.warning(`Mode ${value} is not recognized.`, 'zhc:legacy:fz:zmam02_cover');
                    break;
                }
                break;
            case dataPoints.AM02AddRemoter: // DP 101: Ignore until need is defined
            case dataPoints.AM02TimeTotal: // DP 10: Ignore until need is defined
                break;
            default: // Unknown code
                logger.debug(`Unrecognized DP #${dp} ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:zmam02_cover');
            }
        },
    } satisfies Fz.Converter,
    tm081: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tm0801');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            if (dp === 1) return {contact: value === true ? false : true};
            if (dp === 2) return {battery: value};
            else {
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tm081');
            }
        },
    } satisfies Fz.Converter,
    tuya_remote: {
        cluster: 'manuSpecificTuya',
        type: ['commandGetData', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            const clickMapping: KeyValueAny = {0: 'single', 1: 'double', 2: 'hold'};
            const buttonMapping: KeyValueAny = {1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6'};
            for (const dpValue of msg.data.dpValues) {
                const value = getDataValue(dpValue);
                // battery DP
                if (dpValue.dp == 10) {
                    result.battery = value;
                } else {
                    result.action = `${buttonMapping[dpValue.dp]}_${clickMapping[value]}`;
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    tuya_smart_human_presense_sensor: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_smart_human_presense_sensor');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            let result = null;
            switch (dp) {
            case dataPoints.tshpsPresenceState:
                // @ts-ignore
                result = {presence: {0: false, 1: true}[value]};
                break;
            case dataPoints.tshpscSensitivity:
                result = {radar_sensitivity: value};
                break;
            case dataPoints.tshpsMinimumRange:
                result = {minimum_range: value/100};
                break;
            case dataPoints.tshpsMaximumRange:
                result = {maximum_range: value/100};
                break;
            case dataPoints.tshpsTargetDistance:
                result = {target_distance: value/100};
                break;
            case dataPoints.tshpsDetectionDelay:
                result = {detection_delay: value/10};
                break;
            case dataPoints.tshpsFadingTime:
                result = {fading_time: value/10};
                break;
            case dataPoints.tshpsIlluminanceLux:
                result = {illuminance_lux: value};
                break;
            case dataPoints.tshpsCLI: // not recognize
                result = {cli: value};
                break;
            case dataPoints.tshpsSelfTest:
                result = {self_test: tuyaHPSCheckingResult [value]};
                break;
            default:
                logger.debug(`Unrecognized DP ${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_smart_human_presense_sensor');
            }
            return result;
        },
    } satisfies Fz.Converter,
    ZG204ZL_lms: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = getDataValue(dpValue);
                switch (dp) {
                case dataPoints.lmsState:
                    result.occupancy = (value === 0);
                    break;
                case dataPoints.lmsBattery:
                    result.battery = value;
                    break;
                case dataPoints.lmsSensitivity:
                    // @ts-ignore
                    result.sensitivity = {'0': 'low', '1': 'medium', '2': 'high'}[value];
                    break;
                case dataPoints.lmsKeepTime:
                    // @ts-ignore
                    result.keep_time = {'0': '10', '1': '30', '2': '60', '3': '120'}[value];
                    break;
                case dataPoints.lmsIlluminance:
                    result.illuminance = value;
                    break;
                default:
                    logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:zg204zl_lms');
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    moes_cover: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        options: [exposes.options.invert_cover()],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'moes_cover');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            let result = null;
            switch (dp) {
            case dataPoints.coverPosition: {
                const invert = !isCoverInverted(meta.device.manufacturerName) ?
                    !options.invert_cover : options.invert_cover;
                const position = invert ? 100 - value : value;
                result = {position: position};
                break;
            }
            case dataPoints.state:
                // @ts-ignore
                result = {state: {0: 'OPEN', 1: 'STOP', 2: 'CLOSE'}[value], running: {0: true, 1: false, 2: true}[value]};
                break;
            case dataPoints.moesCoverBacklight:
                // @ts-ignore
                result = {backlight: value ? 'ON' : 'OFF'};
                break;
            case dataPoints.moesCoverCalibration:
                // @ts-ignore
                result = {calibration: {0: 'ON', 1: 'OFF'}[value]};
                break;
            case dataPoints.moesCoverMotorReversal:
                // @ts-ignore
                result = {motor_reversal: {0: 'OFF', 1: 'ON'}[value]};
                break;
            default:
                logger.debug(`Unrecognized DP ${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:moes_cover');
            }
            return result;
        },
    } satisfies Fz.Converter,
    tuya_temperature_humidity_sensor: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_temperature_humidity_sensor');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.tthTemperature:
                return {temperature: (value > 0x2000 ? value - 0xFFFF : value) / 10};
            case dataPoints.tthHumidity:
                return {humidity: (value / (['_TZE200_bjawzodf', '_TZE200_zl1kmjqx'].includes(meta.device.manufacturerName) ? 10 : 1))};
            case dataPoints.tthBatteryLevel:
                return {
                    // @ts-ignore
                    battery_level: {0: 'low', 1: 'middle', 2: 'high'}[value],
                    battery_low: value === 0 ? true : false,
                };
            case dataPoints.tthBattery:
                return {battery: value};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_temperature_humidity_sensor');
            }
        },
    } satisfies Fz.Converter,
    nous_lcd_temperature_humidity_sensor: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = getDataValue(dpValue);
                switch (dp) {
                case dataPoints.nousTemperature:
                    result.temperature = value / 10;
                    break;
                case dataPoints.nousHumidity:
                    result.humidity = value;
                    break;
                case dataPoints.nousBattery:
                    result.battery = value;
                    break;
                case dataPoints.nousTempUnitConvert:
                    // @ts-ignore
                    result.temperature_unit_convert = {0x00: 'celsius', 0x01: 'fahrenheit'}[value];
                    break;
                case dataPoints.nousMaxTemp:
                    result.max_temperature = value / 10;
                    break;
                case dataPoints.nousMinTemp:
                    result.min_temperature = value / 10;
                    break;
                case dataPoints.nousMaxHumi:
                    result.max_humidity = value;
                    break;
                case dataPoints.nousMinHumi:
                    result.min_humidity = value;
                    break;
                case dataPoints.nousTempAlarm:
                    // @ts-ignore
                    result.temperature_alarm = {0x00: 'lower_alarm', 0x01: 'upper_alarm', 0x02: 'canceled'}[value];
                    break;
                case dataPoints.nousHumiAlarm:
                    // @ts-ignore
                    result.humidity_alarm = {0x00: 'lower_alarm', 0x01: 'upper_alarm', 0x02: 'canceled'}[value];
                    break;
                case dataPoints.nousTempSensitivity:
                    result.temperature_sensitivity = value / 10;
                    break;
                case dataPoints.nousHumiSensitivity:
                    result.humidity_sensitivity = value;
                    break;
                case dataPoints.nousTempReportInterval:
                    result.temperature_report_interval = value;
                    break;
                case dataPoints.nousHumiReportInterval:
                    result.humidity_report_interval = value;
                    break;
                default:
                    logger.debug(
                        `Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`,
                        'zhc:legacy:fz:nous_lcd_temperature_humidity_sensor',
                    );
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    tuya_illuminance_temperature_humidity_sensor: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_illuminance_temperature_humidity_sensor');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.thitTemperature:
                return {temperature: value / 10};
            case dataPoints.thitHumidity:
                return {humidity: value};
            case dataPoints.thitBatteryPercentage:
                return {battery: value};
            case dataPoints.thitIlluminanceLux:
                return {illuminance_lux: value};
            default:
                logger.debug(
                    `Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`,
                    'zhc:legacy:fz:tuya_illuminance_temperature_humidity_sensor',
                );
            }
        },
    } satisfies Fz.Converter,
    tuya_illuminance_sensor: {
        cluster: `manuSpecificTuya`,
        type: [`commandDataReport`, `commandDataResponse`],
        convert: (() => {
            const brightnessState: KeyValueAny = {
                0: 'low',
                1: 'middle',
                2: 'high',
                3: 'strong',
            };
            return (model: Definition, msg: KeyValueAny, publish: Publish, options: KeyValueAny, meta: Fz.Meta) => {
                const dpValue = firstDpValue(msg, meta, `tuya_illuminance_sensor`);
                const dp = dpValue.dp;
                const value = getDataValue(dpValue);
                switch (dp) {
                case dataPoints.state:
                    return {brightness_state: brightnessState[value]};
                case dataPoints.tIlluminanceLux:
                    return {illuminance_lux: value};
                default:
                    logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_illuminance_sensor');
                }
            };
        })(),
    } satisfies Fz.Converter,
    hy_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'hy_thermostat');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);

            switch (dp) {
            case dataPoints.hyWorkdaySchedule1: // schedule for workdays [5,9,12,8,0,15,10,0,15]
                return {workdays: [
                    {hour: value[0], minute: value[1], temperature: value[2]},
                    {hour: value[3], minute: value[4], temperature: value[5]},
                    {hour: value[6], minute: value[7], temperature: value[8]},
                ], range: 'am'};
            case dataPoints.hyWorkdaySchedule2: // schedule for workdays [15,0,25,145,2,17,22,50,14]
                return {workdays: [
                    {hour: value[0], minute: value[1], temperature: value[2]},
                    {hour: value[3], minute: value[4], temperature: value[5]},
                    {hour: value[6], minute: value[7], temperature: value[8]},
                ], range: 'pm'};
            case dataPoints.hyHolidaySchedule1: // schedule for holidays [5,5,20,8,4,13,11,30,15]
                return {holidays: [
                    {hour: value[0], minute: value[1], temperature: value[2]},
                    {hour: value[3], minute: value[4], temperature: value[5]},
                    {hour: value[6], minute: value[7], temperature: value[8]},
                ], range: 'am'};
            case dataPoints.hyHolidaySchedule2: // schedule for holidays [13,30,15,17,0,15,22,0,15]
                return {holidays: [
                    {hour: value[0], minute: value[1], temperature: value[2]},
                    {hour: value[3], minute: value[4], temperature: value[5]},
                    {hour: value[6], minute: value[7], temperature: value[8]},
                ], range: 'pm'};
            case dataPoints.hyHeating: // heating
                return {heating: value ? 'ON' : 'OFF'};
            case dataPoints.hyMaxTempProtection: // max temperature protection
                return {max_temperature_protection: value ? 'ON' : 'OFF'};
            case dataPoints.hyMinTempProtection: // min temperature protection
                return {min_temperature_protection: value ? 'ON' : 'OFF'};
            case dataPoints.hyState: // 0x017D work state
                return {state: value ? 'ON' : 'OFF'};
            case dataPoints.hyChildLock: // 0x0181 Changed child lock status
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            case dataPoints.hyExternalTemp: // external sensor temperature
                return {external_temperature: (value / 10).toFixed(1)};
            case dataPoints.hyAwayDays: // away preset days
                return {away_preset_days: value};
            case dataPoints.hyAwayTemp: // away preset temperature
                return {away_preset_temperature: value};
            case dataPoints.hyTempCalibration: // 0x026D Temperature correction
                return {local_temperature_calibration: (value / 10).toFixed(1)};
            case dataPoints.hyHysteresis: // 0x026E Temperature hysteresis
                return {hysteresis: (value / 10).toFixed(1)};
            case dataPoints.hyProtectionHysteresis: // 0x026F Temperature protection hysteresis
                return {hysteresis_for_protection: value};
            case dataPoints.hyProtectionMaxTemp: // 0x027A max temperature for protection
                return {max_temperature_for_protection: value};
            case dataPoints.hyProtectionMinTemp: // 0x027B min temperature for protection
                return {min_temperature_for_protection: value};
            case dataPoints.hyMaxTemp: // 0x027C max temperature limit
                return {max_temperature: value};
            case dataPoints.hyMinTemp: // 0x027D min temperature limit
                return {min_temperature: value};
            case dataPoints.hyHeatingSetpoint: // 0x027E Changed target temperature
                return {current_heating_setpoint: (value / 10).toFixed(1)};
            case dataPoints.hyLocalTemp: // 0x027F MCU reporting room temperature
                return {local_temperature: (value / 10).toFixed(1)};
            case dataPoints.hySensor: // Sensor type
                // @ts-ignore
                return {sensor_type: {0: 'internal', 1: 'external', 2: 'both'}[value]};
            case dataPoints.hyPowerOnBehavior: // 0x0475 State after power on
                // @ts-ignore
                return {power_on_behavior: {0: 'restore', 1: 'off', 2: 'on'}[value]};
            case dataPoints.hyWeekFormat: // 0x0476 Week select 0 - 5 days, 1 - 6 days, 2 - 7 days
                return {week: thermostatWeekFormat[value]};
            case dataPoints.hyMode: // 0x0480 mode
                // @ts-ignore
                return {system_mode: {0: 'manual', 1: 'auto', 2: 'away'}[value]};
            case dataPoints.hyAlarm: // [16] [0]
                return {alarm: (value > 0) ? true : false};
            default: // The purpose of the codes 17 & 19 are still unknown
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:hy_thermostat');
            }
        },
    } satisfies Fz.Converter,
    neo_nas_pd07: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'neo_nas_pd07');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.neoOccupancy:
                return {occupancy: value > 0 ? true : false};
            case 102:
                return {
                    // @ts-ignore
                    power_type: {0: 'battery_full', 1: 'battery_high', 2: 'battery_medium', 3: 'battery_low', 4: 'usb'}[value],
                    battery_low: value === 3,
                };
            case dataPoints.neoTamper:
                return {tamper: value > 0 ? true : false};
            case 104:
                return {temperature: value / 10};
            case 105:
                return {humidity: value};
            case dataPoints.neoMinTemp:
                return {temperature_min: value};
            case dataPoints.neoMaxTemp:
                return {temperature_max: value};
            case dataPoints.neoMinHumidity:
                return {humidity_min: value};
            case dataPoints.neoMaxHumidity:
                return {humidity_max: value};
            case dataPoints.neoTempScale:
                return {temperature_scale: value ? '°C' : '°F'};
            case 111:
                return {unknown_111: value ? 'ON' : 'OFF'};
            case 112:
                return {unknown_112: value ? 'ON' : 'OFF'};
            case dataPoints.neoTempHumidityAlarm:
                // @ts-ignore
                return {alarm: {0: 'over_temperature', 1: 'over_humidity',
                    2: 'below_min_temperature', 3: 'below_min_humdity', 4: 'off'}[value]};
            default: // Unknown code
                logger.debug(`Unrecognized DP #${dp}: ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:neo_nas_pd07');
            }
        },
    } satisfies Fz.Converter,
    neo_t_h_alarm: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'neo_t_h_alarm');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.neoAlarm:
                return {alarm: value};
            case dataPoints.neoUnknown2: // 0x0170 [0]
                break;
            case dataPoints.neoTempAlarm:
                return {temperature_alarm: value};
            case dataPoints.neoHumidityAlarm: // 0x0172 [0]/[1] Disable/Enable alarm by humidity
                return {humidity_alarm: value};
            case dataPoints.neoDuration: // 0x0267 [0,0,0,10] duration alarm in second
                return {duration: value};
            case dataPoints.neoTemp: // 0x0269 [0,0,0,240] temperature
                return {temperature: (value / 10)};
            case dataPoints.neoHumidity: // 0x026A [0,0,0,36] humidity
                return {humidity: value};
            case dataPoints.neoMinTemp: // 0x026B [0,0,0,18] min alarm temperature
                return {temperature_min: value};
            case dataPoints.neoMaxTemp: // 0x026C [0,0,0,27] max alarm temperature
                return {temperature_max: value};
            case dataPoints.neoMinHumidity: // 0x026D [0,0,0,45] min alarm humidity
                return {humidity_min: value};
            case dataPoints.neoMaxHumidity: // 0x026E [0,0,0,80] max alarm humidity
                return {humidity_max: value};
            case dataPoints.neoPowerType: // 0x0465 [4]
                return {
                    // @ts-ignore
                    power_type: {0: 'battery_full', 1: 'battery_high', 2: 'battery_medium', 3: 'battery_low', 4: 'usb'}[value],
                    battery_low: value === 3,
                };
            case dataPoints.neoMelody: // 0x0466 [5] Melody
                return {melody: value};
            case dataPoints.neoUnknown3: // 0x0473 [0]
                break;
            case dataPoints.neoVolume: // 0x0474 [0]/[1]/[2] Volume 0-max, 2-low
                // @ts-ignore
                return {volume: {2: 'low', 1: 'medium', 0: 'high'}[value]};
            default: // Unknown code
                logger.debug(`Unrecognized DP #${dp}: ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:neo_t_h_alarm');
            }
        },
    } satisfies Fz.Converter,
    neo_alarm: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'neo_alarm');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);

            switch (dp) {
            case dataPoints.neoAOAlarm: // 0x13 [TRUE,FALSE]
                return {alarm: value};
            case dataPoints.neoAODuration: // 0x7 [0,0,0,10] duration alarm in second
                return {duration: value};
            case dataPoints.neoAOBattPerc: // 0x15 [0,0,0,100] battery percentage
                return {battpercentage: value};
            case dataPoints.neoAOMelody: // 0x21 [5] Melody
                return {melody: value};
            case dataPoints.neoAOVolume: // 0x5 [0]/[1]/[2] Volume 0-low, 2-max
                // @ts-ignore
                return {volume: {0: 'low', 1: 'medium', 2: 'high'}[value]};
            default: // Unknown code
                logger.debug(`Unrecognized DP #${dp}: ${JSON.stringify(msg.data)}`, 'zhc:legacy:fz:neo_alarm');
            }
        },
    } satisfies Fz.Converter,
    ZB006X_settings: {
        cluster: 'manuSpecificTuya',
        type: ['commandActiveStatusReport', 'commandActiveStatusReportAlt'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'ZB006X_settings');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.fantemPowerSupplyMode:
                // @ts-ignore
                return {power_supply_mode: {0: 'unknown', 1: 'no_neutral', 2: 'with_neutral'}[value]};
            case dataPoints.fantemExtSwitchType:
                // @ts-ignore
                return {switch_type: {0: 'unknown', 1: 'toggle', 2: 'momentary', 3: 'rotary', 4: 'auto_config'}[value]};
            case dataPoints.fantemLoadDetectionMode:
                // @ts-ignore
                return {load_detection_mode: {0: 'none', 1: 'first_power_on', 2: 'every_power_on'}[value]};
            case dataPoints.fantemExtSwitchStatus:
                return {switch_status: value};
            case dataPoints.fantemControlMode:
                // @ts-ignore
                return {control_mode: {0: 'ext_switch', 1: 'remote', 2: 'both'}[value]};
            case 111:
                // Value 0 is received after each device power-on. No idea what it means.
                return;
            case dataPoints.fantemLoadType:
                // Not sure if 0 is 'resistive' and 2 is 'resistive_inductive'.
                // If you see 'unknown', pls. check with Tuya gateway and app and update with label shown in Tuya app.
                // @ts-ignore
                return {load_type: {0: 'unknown', 1: 'resistive_capacitive', 2: 'unknown', 3: 'detecting'}[value]};
            case dataPoints.fantemLoadDimmable:
                // @ts-ignore
                return {load_dimmable: {0: 'unknown', 1: 'dimmable', 2: 'not_dimmable'}[value]};
            default:
                logger.debug(`Unrecognized DP|Value [${dp}|${value}][${JSON.stringify(dpValue)}]`, 'zhc:legacy:fz:zb006x_settings');
            }
        },
    } satisfies Fz.Converter,
    tuya_cover: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        options: [exposes.options.invert_cover()],
        convert: (model, msg, publish, options, meta) => {
            // Protocol description
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1159#issuecomment-614659802

            const result: KeyValueAny = {};

            // Iterate through dpValues in case of some zigbee models returning multiple dp values in one message
            // For example: [TS0601, _TZE200_3ylew7b4]
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = getDataValue(dpValue);

                switch (dp) {
                case dataPoints.coverPosition: // Started moving to position (triggered from Zigbee)
                case dataPoints.coverArrived: { // Arrived at position
                    const invert = isCoverInverted(meta.device.manufacturerName) ? !options.invert_cover : options.invert_cover;
                    const position = invert ? 100 - (value & 0xff) : value & 0xff;
                    const running = dp !== dataPoints.coverArrived;

                    // Not all covers report coverArrived, so set running to false if device doesn't report position
                    // for a few seconds
                    clearTimeout(globalStore.getValue(msg.endpoint, 'running_timer'));
                    if (running) {
                        const timer = setTimeout(() => publish({running: false}), 3 * 1000);
                        globalStore.putValue(msg.endpoint, 'running_timer', timer);
                    }

                    if (position > 0 && position <= 100) {
                        result.running = running;
                        result.position = position;
                        result.state = 'OPEN';
                    } else if (position == 0) {
                    // Report fully closed
                        result.running = running;
                        result.position = position;
                        result.state = 'CLOSE';
                    } else {
                        result.running = running; // Not calibrated yet, no position is available
                    }
                }
                    break;
                case dataPoints.coverSpeed: // Cover is reporting its current speed setting
                    result.motor_speed = value;
                    break;
                case dataPoints.state: // Ignore the cover state, it's not reliable between different covers!
                    break;
                case dataPoints.coverChange: // Ignore manual cover change, it's not reliable between different covers!
                    break;
                case dataPoints.config: // Returned by configuration set; ignore
                    break;
                default: // Unknown code
                    logger.debug(`Unrecognized DP #${dp}: ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_cover');
                }
            }

            return result;
        },
    } satisfies Fz.Converter,
    moes_switch: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'moes_switch');
            const dp = dpValue.dp;

            // tuya_switch datapoints
            if (dp >= 1 && dp <= 4) {
                return null;
            }

            const value = getDataValue(dpValue);

            switch (dp) {
            case dataPoints.moesSwitchPowerOnBehavior:
                return {power_on_behavior: moesSwitch.powerOnBehavior[value]};
            case dataPoints.moesSwitchIndicateLight:
                return {indicate_light: moesSwitch.indicateLight[value]};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:moes_switch');
                break;
            }
        },
    } satisfies Fz.Converter,
    tuya_water_leak: {
        cluster: 'manuSpecificTuya',
        type: 'commandDataReport',
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_water_leak');
            if (dpValue.dp === dataPoints.waterLeak) {
                return {water_leak: getDataValue(dpValue)};
            }
        },
    } satisfies Fz.Converter,
    wls100z_water_leak: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            for (const dpValue of msg.data.dpValues) {
                const value = getDataValue(dpValue);
                switch (dpValue.dp) {
                case dataPoints.wlsWaterLeak:
                    result.water_leak = value < 1;
                    break;
                case dataPoints.wlsBatteryPercentage:
                    result.battery = value;
                    break;
                default:
                    logger.debug(`Unrecognized DP #${dpValue.dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:wls100z_water_leak');
                }
            }
            return result;
        },
    } satisfies Fz.Converter,
    silvercrest_smart_led_string: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'silvercrest_smart_led_string');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            const result: KeyValueAny = {};

            if (dp === dataPoints.silvercrestChangeMode) {
                if (value !== silvercrestModes.effect) {
                    result.effect = null;
                }
            } if (dp === dataPoints.silvercrestSetBrightness) {
                result.brightness = utils.mapNumberRange(value, 0, 1000, 0, 255);
            } else if (dp === dataPoints.silvercrestSetColor) {
                const h = parseInt(value.substring(0, 4), 16);
                const s = parseInt(value.substring(4, 8), 16);
                const b = parseInt(value.substring(8, 12), 16);
                result.color_mode = 'hs';
                result.color = {b: utils.mapNumberRange(b, 0, 1000, 0, 255), h, s: utils.mapNumberRange(s, 0, 1000, 0, 100)};
                result.brightness = result.color.b;
            } else if (dp === dataPoints.silvercrestSetEffect) {
                result.effect = {
                    effect: utils.getKey(silvercrestEffects, value.substring(0, 2), '', String),
                    speed: utils.mapNumberRange(parseInt(value.substring(2, 4)), 0, 64, 0, 100),
                    colors: [],
                };

                const colorsString = value.substring(4);
                // Colors are 6 characters.
                const n = Math.floor(colorsString.length / 6);

                // The incoming message can contain anywhere between 0 to 6 colors.
                // In the following loop we're extracting every color the led
                // string gives us.
                for (let i = 0; i < n; ++i) {
                    const part = colorsString.substring(i * 6, (i + 1) * 6);
                    const r = part[0]+part[1]; const g = part[2]+part[3]; const b = part[4]+part[5];
                    result.effect.colors.push({
                        r: parseInt(r, 16),
                        g: parseInt(g, 16),
                        b: parseInt(b, 16),
                    });
                }
            }

            return result;
        },
    } satisfies Fz.Converter,
    frankever_valve: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport', 'commandActiveStatusReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'frankever_valve');
            const value = getDataValue(dpValue);
            const dp = dpValue.dp;
            switch (dp) {
            case dataPoints.state: {
                return {state: value ? 'ON': 'OFF'};
            }
            case dataPoints.frankEverTreshold: {
                return {threshold: value};
            }
            case dataPoints.frankEverTimer: {
                return {timer: value / 60};
            }
            default: {
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:frankever_valve');
            }
            }
        },
    } satisfies Fz.Converter,
    tuya_woox_smoke: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_woox_smoke');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.wooxBattery:
                return {battery_low: value === 0};
            case dataPoints.state:
                return {smoke: value === 0};
            case dataPoints.wooxSmokeTest:
                return {smoke: value};
            default:
                logger.debug(`Unrecognized DP #${ dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_smoke');
            }
        },
    } satisfies Fz.Converter,
    tuya_switch: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse', 'commandActiveStatusReport'],
        convert: (model, msg, publish, options, meta) => {
            const multiEndpoint = model.meta && model.meta.multiEndpoint;
            const dpValue = firstDpValue(msg, meta, 'tuya_switch');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            const state = value ? 'ON' : 'OFF';
            if (multiEndpoint) {
                const lookup: KeyValueAny = {1: 'l1', 2: 'l2', 3: 'l3', 4: 'l4', 5: 'l5', 6: 'l6'};
                const endpoint = lookup[dp];
                if (endpoint in model.endpoint(msg.device)) {
                    return {[`state_${endpoint}`]: state};
                }
            } else if (dp === dataPoints.state) {
                return {state: state};
            }
            return null;
        },
    } satisfies Fz.Converter,
    tuya_dinrail_switch: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse', 'commandActiveStatusReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_dinrail_switch');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            const state = value ? 'ON' : 'OFF';

            switch (dp) {
            case dataPoints.state: // DPID that we added to common
                return {state: state};
            case dataPoints.dinrailPowerMeterTotalEnergy:
                return {energy: value/100};
            case dataPoints.dinrailPowerMeterCurrent:
                return {current: value/1000};
            case dataPoints.dinrailPowerMeterPower:
                return {power: value/10};
            case dataPoints.dinrailPowerMeterVoltage:
                return {voltage: value/10};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tuya_dinrail_switch');
            }

            return null;
        },
    } satisfies Fz.Converter,
    ZVG1: {
        cluster: 'manuSpecificTuya',
        type: 'commandDataResponse',
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'ZVG1');
            const value = getDataValue(dpValue);
            const dp = dpValue.dp;
            switch (dp) {
            case dataPoints.state: {
                return {state: value ? 'ON': 'OFF'};
            }
            case 5: {
                // Assume value is reported in fl. oz., converter to litres
                return {water_consumed: (value / 33.8140226).toFixed(2)};
            }
            case 7: {
                return {battery: value};
            }
            case 10: {
                let data = 'disabled';
                if (value == 1) {
                    data = '24h';
                } else if (value == 2) {
                    data = '48h';
                } else if (value == 3) {
                    data = '72h';
                }
                return {weather_delay: data};
            }
            case 11: {
                // value reported in seconds
                return {timer_time_left: value / 60};
            }
            case 12: {
                if (value === 0) return {timer_state: 'disabled'};
                else if (value === 1) return {timer_state: 'active'};
                else return {timer_state: 'enabled'};
            }
            case 15: {
                // value reported in seconds
                return {last_valve_open_duration: value / 60};
            }
            case 16: {
                const tresult: KeyValueAny = {
                    cycle_timer_1: '',
                    cycle_timer_2: '',
                    cycle_timer_3: '',
                    cycle_timer_4: '',
                };
                for (let index = 0; index < 40; index += 12) {
                    const timer = convertRawToCycleTimer(value.slice(index));
                    if (timer.irrigationDuration > 0) {
                        tresult['cycle_timer_' + (index / 13 + 1)] = timer.starttime +
                            ' / ' + timer.endtime + ' / ' +
                            timer.irrigationDuration + ' / ' +
                            timer.pauseDuration + ' / ' +
                            timer.weekdays + ' / ' + timer.active;
                    }
                }
                return tresult;
            }
            case 17: {
                const tresult: KeyValueAny = {
                    normal_schedule_timer_1: '',
                    normal_schedule_timer_2: '',
                    normal_schedule_timer_3: '',
                    normal_schedule_timer_4: '',
                };
                for (let index = 0; index < 40; index += 13) {
                    const timer = convertRawToTimer(value.slice(index));
                    if (timer.duration > 0) {
                        tresult['normal_schedule_timer_' + (index / 13 + 1)] = timer.time +
                        ' / ' + timer.duration +
                        ' / ' + timer.weekdays +
                        ' / ' + timer.active;
                    }
                }
                return tresult;
            }
            default: {
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:rtx_zvg1_valve');
            }
            }
        },
    } satisfies Fz.Converter,
    ZB003X: {
        cluster: 'manuSpecificTuya',
        type: ['commandActiveStatusReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'ZB003X');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            switch (dp) {
            case dataPoints.fantemTemp:
                return {temperature: (value / 10)};
            case dataPoints.fantemHumidity:
                return {humidity: value};
            case dataPoints.fantemBattery:
                // second battery level, first battery is reported by fz.battery
                return {battery2: value};
            case dataPoints.fantemReportingTime:
                return {reporting_time: value};
            case dataPoints.fantemTempCalibration:
                return {
                    temperature_calibration: (
                        (value > 0x7FFFFFFF ? 0xFFFFFFFF - value : value) / 10
                    ).toFixed(1),
                };
            case dataPoints.fantemHumidityCalibration:
                return {humidity_calibration: value > 0x7FFFFFFF ? 0xFFFFFFFF - value : value};
            case dataPoints.fantemLuxCalibration:
                return {illuminance_calibration: value > 0x7FFFFFFF ? 0xFFFFFFFF - value : value};
            case dataPoints.fantemMotionEnable:
                return {pir_enable: value};
            case dataPoints.fantemLedEnable:
                return {led_enable: value ? false : true};
            case dataPoints.fantemReportingEnable:
                return {reporting_enable: value};
            default:
                logger.debug(`Unrecognized DP #${dp}: ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:zb003x');
            }
        },
    } satisfies Fz.Converter,
    tuya_thermostat_weekly_schedule_2: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'tuya_thermostat_weekly_schedule');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);

            const thermostatMeta = getMetaValue(msg.endpoint, model, 'thermostat');
            const firstDayDpId = thermostatMeta.weeklyScheduleFirstDayDpId;
            const maxTransitions = thermostatMeta.weeklyScheduleMaxTransitions;
            let dataOffset = 0;
            let conversion = 'generic';

            function dataToTransitions(data: any, maxTransitions: any, offset: any) {
                // Later it is possible to move converter to meta or to other place outside if other type of converter
                // will be needed for other device. Currently this converter is based on ETOP HT-08 thermostat.
                // see also toZigbee.tuya_thermostat_weekly_schedule()
                function dataToTransition(data: any, index: number) {
                    return {
                        time: (data[index+0] << 8) + data [index+1],
                        heating_setpoint: (parseFloat((data[index+2] << 8) + data [index+3]) / 10.0).toFixed(1),
                    };
                }
                const result = [];
                for (let i = 0; i < maxTransitions; i++) {
                    result.push(dataToTransition(data, i * 4 + offset));
                }
                return result;
            }

            if (thermostatMeta.hasOwnProperty('weeklyScheduleConversion')) {
                conversion = thermostatMeta.weeklyScheduleConversion;
            }
            if (conversion == 'saswell') {
                // Saswell has scheduling mode in the first byte
                dataOffset = 1;
            }
            if (dp >= firstDayDpId && dp < firstDayDpId+7) {
                const dayOfWeek = dp - firstDayDpId + 1;
                return {
                    // Same as in hvacThermostat:getWeeklyScheduleRsp hvacThermostat:setWeeklySchedule cluster format
                    weekly_schedule: {
                        // @ts-ignore
                        days: [constants.thermostatDayOfWeek[dayOfWeek]],
                        transitions: dataToTransitions(value, maxTransitions, dataOffset),
                    },
                };
            }
        },
    } satisfies Fz.Converter,
    tuya_data_point_dump: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport', 'commandActiveStatusReport', 'commandActiveStatusReportAlt'],
        convert: (model, msg, publish, options, meta) => {
            // Don't use in production!
            // Used in: https://www.zigbee2mqtt.io/how_tos/how_to_support_new_tuya_devices.html
            const getHex = (value: number) => {
                let hex = value.toString(16);
                if (hex.length < 2) {
                    hex = '0' + hex;
                }
                return hex;
            };
            const now = Date.now().toString();
            let dataStr = '';
            for (const [i, dpValue] of msg.data.dpValues.entries()) {
                logDataPoint('tuya_data_point_dump', msg, dpValue, meta);
                dataStr +=
                    now + ' ' +
                    meta.device.ieeeAddr + ' ' +
                    getHex(msg.data.seq) + ' ' +
                    getHex(i) + ' ' +
                    getHex(dpValue.dp) + ' ' +
                    getHex(dpValue.datatype);

                dpValue.data.forEach((elem: any) => {
                    dataStr += ' ' + getHex(elem);
                });
                dataStr += '\n';
            }
            fs.appendFile('data/tuya.dump.txt', dataStr, (err) => {
                if (err) throw err;
            });
        },
    } satisfies Fz.Converter,
    javis_microwave_sensor: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'javis_microwave_sensor');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            const lookup: KeyValueAny = {
                0: 'no_motion',
                1: 'big_motion',
                2: 'minor_motion',
                3: 'breathing',
                4: 'abnormal_state',
                5: 'initializing',
                6: 'initialization_completed',
            };
            switch (dp) {
            case 1:
                return {
                    states: lookup[value],
                    occupancy: (0 < value && value < 5) ? true: false,
                };
            case 2:
                return {
                    sensitivity: value,
                };
            case 101:
                return {
                    illuminance_lux: value,
                };
            case 102:
                if (meta.device.manufacturerName === '_TZE200_kagkgk0i') {
                    return {
                        illuminance_calibration: value,
                    };
                } else {
                    return {
                        keep_time: value,
                    };
                }
            case 103:
                return {
                    led_enable: value == 1 ? true : false,
                };
            case 104:
                return {illuminance_lux: value};
            case 105:
                return {
                    illuminance_calibration: value,
                };
            case 106:
                if (meta.device.manufacturerName === '_TZE200_kagkgk0i') {
                    return {
                        keep_time: value,
                    };
                } else {
                    break;
                }
            case 107:
                if (meta.device.manufacturerName === '_TZE200_kagkgk0i') {
                    return {
                        led_enable: value == 1 ? true : false,
                    };
                } else {
                    break;
                }
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:javis_microwave_sensor');
            }
        },
    } satisfies Fz.Converter,
    SLUXZB: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = firstDpValue(msg, meta, 'SLUXZB');
            const dp = dpValue.dp;
            const value = getDataValue(dpValue);
            const brightnesStateLookup: KeyValueAny = {'0': 'low', '1': 'middle', '2': 'high'};
            switch (dp) {
            case 2:
                return {illuminance_lux: value};
            case 4:
                return {battery: value};
            case 1:
                return {brightness_level: brightnesStateLookup[value]};
            default:
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:s_lux_zb');
            }
        },
    } satisfies Fz.Converter,
};

const fromZigbee2 = {
    tuya_thermostat_weekly_schedule_1: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (!utils.isLegacyEnabled(options)) {
                // @ts-ignore
                return fromZigbee1.tuya_thermostat_weekly_schedule_2.convert(model, msg, publish, options, meta);
            }

            const dpValue = firstDpValue(msg, meta, 'tuya_thermostat_weekly_schedule');
            const dp = dpValue.dp;
            const value = tuyaGetDataValue(dpValue.datatype, dpValue.data);

            const thermostatMeta = getMetaValue(msg.endpoint, model, 'thermostat');
            const firstDayDpId = thermostatMeta.weeklyScheduleFirstDayDpId;
            const maxTransitions = thermostatMeta.weeklyScheduleMaxTransitions;
            let dataOffset = 0;
            let conversion = 'generic';

            function dataToTransitions(data: any, maxTransitions: any, offset: any) {
                // Later it is possible to move converter to meta or to other place outside if other type of converter
                // will be needed for other device. Currently this converter is based on ETOP HT-08 thermostat.
                // see also toZigbee.tuya_thermostat_weekly_schedule()
                function dataToTransition(data: any, index: any) {
                    return {
                        transitionTime: (data[index+0] << 8) + data [index+1],
                        heatSetpoint: (parseFloat((data[index+2] << 8) + data [index+3]) / 10.0).toFixed(1),
                    };
                }
                const result = [];
                for (let i = 0; i < maxTransitions; i++) {
                    result.push(dataToTransition(data, i * 4 + offset));
                }
                return result;
            }

            if (thermostatMeta.hasOwnProperty('weeklyScheduleConversion')) {
                conversion = thermostatMeta.weeklyScheduleConversion;
            }
            if (conversion == 'saswell') {
                // Saswell has scheduling mode in the first byte
                dataOffset = 1;
            }
            if (dp >= firstDayDpId && dp < firstDayDpId+7) {
                const dayOfWeek = dp - firstDayDpId + 1;
                return {
                    // Same as in hvacThermostat:getWeeklyScheduleRsp hvacThermostat:setWeeklySchedule cluster format
                    weekly_schedule: {
                        [dayOfWeek]: {
                            dayofweek: dayOfWeek,
                            numoftrans: maxTransitions,
                            mode: 1, // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                            transitions: dataToTransitions(value, maxTransitions, dataOffset),
                        },
                    },
                };
            }
        },
    } satisfies Fz.Converter,
};

const toZigbee1 = {
    SA12IZL_silence_siren: {
        key: ['silence_siren'],
        convertSet: async (entity, key, value: any, meta) => {
            await sendDataPointBool(entity, 16, value);
        },
    } satisfies Tz.Converter,
    SA12IZL_alarm: {
        key: ['alarm'],
        convertSet: async (entity, key, value: any, meta) => {
            // @ts-ignore
            await sendDataPointEnum(entity, 20, value ? 0 : 1);
        },
    } satisfies Tz.Converter,
    R7049_silenceSiren: {
        key: ['silence_siren'],
        convertSet: async (entity, key, value: any, meta) => {
            await sendDataPointBool(entity, 16, value);
        },
    } satisfies Tz.Converter,
    R7049_testAlarm: {
        key: ['test_alarm'],
        convertSet: async (entity, key, value: any, meta) => {
            await sendDataPointBool(entity, 8, value);
        },
    } satisfies Tz.Converter,
    R7049_alarm: {
        key: ['alarm'],
        convertSet: async (entity, key, value: any, meta) => {
            await sendDataPointEnum(entity, 20, value ? 0 : 1);
        },
    } satisfies Tz.Converter,
    valve_state: {
        key: ['valve_state'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.wateringTimer.valve_state, value);
        },
    } satisfies Tz.Converter,
    shutdown_timer: {
        key: ['shutdown_timer'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.wateringTimer.shutdown_timer, value);
        },
    } satisfies Tz.Converter,
    valve_state_auto_shutdown: {
        key: ['valve_state_auto_shutdown'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.wateringTimer.valve_state_auto_shutdown, value);
        },
    } satisfies Tz.Converter,
    hpsz: {
        key: ['led_state'],
        convertSet: async (entity, key, value: any, meta) => {
            await sendDataPointBool(entity, dataPoints.HPSZLEDState, value);
        },
    } satisfies Tz.Converter,
    tuya_cover_control: {
        key: ['state', 'position'],
        options: [exposes.options.invert_cover()],
        convertSet: async (entity, key, value: any, meta) => {
            // Protocol description
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1159#issuecomment-614659802

            if (key === 'position') {
                if (value >= 0 && value <= 100) {
                    const invert = isCoverInverted(meta.device.manufacturerName) ?
                        !meta.options.invert_cover : meta.options.invert_cover;

                    value = invert ? 100 - value : value;
                    await sendDataPointValue(entity, dataPoints.coverPosition, value);
                } else {
                    throw new Error('TuYa_cover_control: Curtain motor position is out of range');
                }
            } else if (key === 'state') {
                const stateEnums = getCoverStateEnums(meta.device.manufacturerName);
                logger.debug(
                    `Using state enums for ${meta.device.manufacturerName}: ${JSON.stringify(stateEnums)}`,
                    'zhc:legacy:tz:tuya_cover_control',
                );

                value = value.toLowerCase();
                switch (value) {
                case 'close':
                    await sendDataPointEnum(entity, dataPoints.state, stateEnums.close);
                    break;
                case 'open':
                    await sendDataPointEnum(entity, dataPoints.state, stateEnums.open);
                    break;
                case 'stop':
                    await sendDataPointEnum(entity, dataPoints.state, stateEnums.stop);
                    break;
                default:
                    throw new Error('TuYa_cover_control: Invalid command received');
                }
            }
        },
    } satisfies Tz.Converter,
};

const toZigbee2 = {
    zb_sm_cover: {
        key: ['state', 'position', 'reverse_direction', 'top_limit', 'bottom_limit', 'favorite_position', 'goto_positon', 'report'],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'position': {
                const invert = (meta.state) ? !meta.state.invert_cover : false;
                value = invert ? 100 - value : value;
                if (value >= 0 && value <= 100) {
                    await sendDataPointValue(entity, dataPoints.coverPosition, value);
                } else {
                    throw new Error('TuYa_cover_control: Curtain motor position is out of range');
                }
                break;
            }
            case 'state': {
                const stateEnums = getCoverStateEnums(meta.device.manufacturerName);
                logger.debug(
                    `Using state enums for ${meta.device.manufacturerName}: ${JSON.stringify(stateEnums)}`,
                    'zhc:legacy:tz:zb_sm_cover',
                );

                value = value.toLowerCase();
                switch (value) {
                case 'close':
                    await sendDataPointEnum(entity, dataPoints.state, stateEnums.close);
                    break;
                case 'open':
                    await sendDataPointEnum(entity, dataPoints.state, stateEnums.open);
                    break;
                case 'stop':
                    await sendDataPointEnum(entity, dataPoints.state, stateEnums.stop);
                    break;
                default:
                    throw new Error('TuYa_cover_control: Invalid command received');
                }
                break;
            }
            case 'reverse_direction': {
                logger.info(`Motor direction ${(value) ? 'reverse' : 'forward'}`, 'zhc:legacy:tz:zb_sm_cover');
                await sendDataPointEnum(entity, dataPoints.motorDirection, (value) ? 1 : 0);
                break;
            }
            case 'top_limit': {
                // @ts-ignore
                await sendDataPointEnum(entity, 104, {'SET': 0, 'CLEAR': 1}[value]);
                break;
            }
            case 'bottom_limit': {
                // @ts-ignore
                await sendDataPointEnum(entity, 103, {'SET': 0, 'CLEAR': 1}[value]);
                break;
            }
            case 'favorite_position': {
                await sendDataPointValue(entity, 115, value);
                break;
            }
            case 'goto_positon': {
                if (value == 'FAVORITE') {
                    value = (meta.state) ? meta.state.favorite_position : null;
                } else {
                    value = parseInt(value);
                }
                return toZigbee1.tuya_cover_control.convertSet(entity, 'position', value, meta);
            }
            case 'report': {
                await sendDataPointBool(entity, 116, 0);
                break;
            }
            }
        },
    } satisfies Tz.Converter,
    x5h_thermostat: {
        key: ['system_mode', 'current_heating_setpoint', 'sensor', 'brightness_state', 'sound', 'frost_protection', 'week', 'factory_reset',
            'local_temperature_calibration', 'heating_temp_limit', 'deadzone_temperature', 'upper_temp', 'preset', 'child_lock',
            'schedule'],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'system_mode':
                await sendDataPointBool(entity, dataPoints.x5hState, value === 'heat');
                break;
            case 'preset': {
                value = value.toLowerCase();
                const lookup: KeyValueAny = {manual: 0, program: 1};
                utils.validateValue(value, Object.keys(lookup));
                value = lookup[value];
                await sendDataPointEnum(entity, dataPoints.x5hMode, value);
                break;
            }
            case 'upper_temp':
                if (value >= 35 && value <= 95) {
                    await sendDataPointValue(entity, dataPoints.x5hSetTempCeiling, value);
                    const setpoint = globalStore.getValue(entity, 'currentHeatingSetpoint', 20);
                    const setpointRaw = Math.round(setpoint * 10);
                    await new Promise((r) => setTimeout(r, 500));
                    await sendDataPointValue(entity, dataPoints.x5hSetTemp, setpointRaw);
                } else {
                    throw new Error('Supported values are in range [35, 95]');
                }
                break;
            case 'deadzone_temperature':
                if (value >= 0.5 && value <= 9.5) {
                    value = Math.round(value * 10);
                    await sendDataPointValue(entity, dataPoints.x5hTempDiff, value);
                } else {
                    throw new Error('Supported values are in range [0.5, 9.5]');
                }
                break;
            case 'heating_temp_limit':
                if (value >= 5 && value <= 60) {
                    await sendDataPointValue(entity, dataPoints.x5hProtectionTempLimit, value);
                } else {
                    throw new Error('Supported values are in range [5, 60]');
                }
                break;
            case 'local_temperature_calibration':
                if (value >= -9.9 && value <= 9.9) {
                    value = Math.round(value * 10);

                    if (value < 0) {
                        value = 0xFFFFFFFF + value + 1;
                    }

                    await sendDataPointValue(entity, dataPoints.x5hTempCorrection, value);
                } else {
                    throw new Error('Supported values are in range [-9.9, 9.9]');
                }
                break;
            case 'factory_reset':
                await sendDataPointBool(entity, dataPoints.x5hFactoryReset, value === 'ON');
                break;
            case 'week':
                await sendDataPointEnum(entity, dataPoints.x5hWorkingDaySetting,
                    utils.getKey(thermostatWeekFormat, value, value, Number));
                break;
            case 'frost_protection':
                await sendDataPointBool(entity, dataPoints.x5hFrostProtection, value === 'ON');
                break;
            case 'sound':
                await sendDataPointBool(entity, dataPoints.x5hSound, value === 'ON');
                break;
            case 'brightness_state': {
                value = value.toLowerCase();
                const lookup: KeyValueAny = {off: 0, low: 1, medium: 2, high: 3};
                utils.validateValue(value, Object.keys(lookup));
                value = lookup[value];
                await sendDataPointEnum(entity, dataPoints.x5hBackplaneBrightness, value);
                break;
            }
            case 'sensor': {
                value = value.toLowerCase();
                const lookup: KeyValueAny = {'internal': 0, 'external': 1, 'both': 2};
                utils.validateValue(value, Object.keys(lookup));
                value = lookup[value];
                await sendDataPointEnum(entity, dataPoints.x5hSensorSelection, value);
                break;
            }
            case 'current_heating_setpoint':
                if (value >= 5 && value <= 60) {
                    value = Math.round(value * 10);
                    await sendDataPointValue(entity, dataPoints.x5hSetTemp, value);
                } else {
                    throw new Error(`Unsupported value: ${value}`);
                }
                break;
            case 'child_lock':
                await sendDataPointBool(entity, dataPoints.x5hChildLock, value === 'LOCK');
                break;
            case 'schedule': {
                const periods = value.split(' ');
                const periodsNumber = 8;
                const payload = [];

                for (let i = 0; i < periodsNumber; i++) {
                    const timeTemp = periods[i].split('/');
                    const hm = timeTemp[0].split(':', 2);
                    const h = parseInt(hm[0]);
                    const m = parseInt(hm[1]);
                    const temp = parseFloat(timeTemp[1]);

                    if (h < 0 || h >= 24 || m < 0 || m >= 60 || temp < 5 || temp > 60) {
                        throw new Error('Invalid hour, minute or temperature of: ' + periods[i]);
                    }

                    const tempHexArray = convertDecimalValueTo2ByteHexArray(Math.round(temp * 10));
                    // 1 byte for hour, 1 byte for minutes, 2 bytes for temperature
                    payload.push(h, m, ...tempHexArray);
                }

                await sendDataPointRaw(entity, dataPoints.x5hWeeklyProcedure, payload);
                break;
            }
            default:
                break;
            }
        },
    } satisfies Tz.Converter,
    zs_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.zsChildLock, value === 'LOCK');
        },
    } satisfies Tz.Converter,
    zs_thermostat_binary_one: {
        key: ['binary_one'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.zsBinaryOne, value === 'ON');
        },
    } satisfies Tz.Converter,
    zs_thermostat_binary_two: {
        key: ['binary_two'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.zsBinaryTwo, value === 'ON');
        },
    } satisfies Tz.Converter,
    zs_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value: number, meta) => {
            let temp = Math.round(value * 2);
            if (temp<=0) temp = 1;
            if (temp>=60) temp = 59;
            await sendDataPointValue(entity, dataPoints.zsHeatingSetpoint, temp);
        },
    } satisfies Tz.Converter,
    zs_thermostat_current_heating_setpoint_auto: {
        key: ['current_heating_setpoint_auto'],
        convertSet: async (entity, key, value: number, meta) => {
            let temp = Math.round(value * 2);
            if (temp<=0) temp = 1;
            if (temp>=60) temp = 59;
            await sendDataPointValue(entity, dataPoints.zsHeatingSetpointAuto, temp);
        },
    } satisfies Tz.Converter,
    zs_thermostat_comfort_temp: {
        key: ['comfort_temperature'],
        convertSet: async (entity, key, value: number, meta) => {
            logger.debug(JSON.stringify(entity), 'zhc:legacy:tz:zs_thermostat_comfort_temp');
            const temp = Math.round(value * 2);
            await sendDataPointValue(entity, dataPoints.zsComfortTemp, temp);
        },
    } satisfies Tz.Converter,
    zs_thermostat_openwindow_temp: {
        key: ['detectwindow_temperature'],
        convertSet: async (entity, key, value: number, meta) => {
            let temp = Math.round(value * 2);
            if (temp<=0) temp = 1;
            if (temp>=60) temp = 59;
            await sendDataPointValue(entity, dataPoints.zsOpenwindowTemp, temp);
        },
    } satisfies Tz.Converter,
    zs_thermostat_openwindow_time: {
        key: ['detectwindow_timeminute'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.zsOpenwindowTime, value);
        },
    } satisfies Tz.Converter,
    zs_thermostat_eco_temp: {
        key: ['eco_temperature'],
        convertSet: async (entity, key, value: number, meta) => {
            const temp = Math.round(value * 2);
            await sendDataPointValue(entity, dataPoints.zsEcoTemp, temp);
        },
    } satisfies Tz.Converter,
    zs_thermostat_preset_mode: {
        key: ['preset'],
        convertSet: async (entity, key, value: any, meta) => {
            const lookup: KeyValueAny = {'schedule': 0, 'manual': 1, 'holiday': 2};
            if (value == 'boost') {
                await sendDataPointEnum(entity, dataPoints.zsMode, lookup['manual']);
                await sendDataPointValue(entity, dataPoints.zsHeatingSetpoint, 60);
            } else {
                await sendDataPointEnum(entity, dataPoints.zsMode, lookup[value]);
                if (value == 'manual') {
                    const temp = globalStore.getValue(entity, 'current_heating_setpoint');
                    await sendDataPointValue(entity, dataPoints.zsHeatingSetpoint, temp ? Math.round(temp * 2) : 43 );
                }
            }
        },
    } satisfies Tz.Converter,
    zs_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (value == 'off') {
                await sendDataPointEnum(entity, dataPoints.zsMode, 1);
                await sendDataPointValue(entity, dataPoints.zsHeatingSetpoint, 0);
            } else if (value == 'auto') {
                await sendDataPointEnum(entity, dataPoints.zsMode, 0);
            } else if (value == 'heat') {
                // manual
                const temp = globalStore.getValue(entity, 'current_heating_setpoint');
                await sendDataPointEnum(entity, dataPoints.zsMode, 1);
                await sendDataPointValue(entity, dataPoints.zsHeatingSetpoint, temp ? Math.round(temp * 2) : 43 );
            }
        },
    } satisfies Tz.Converter,
    zs_thermostat_local_temperature_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value: number, meta) => {
            if (value > 0) value = value*10;
            if (value < 0) value = value*10 + 0x100000000;
            await sendDataPointValue(entity, dataPoints.zsTempCalibration, value);
        },
    } satisfies Tz.Converter,
    zs_thermostat_away_setting: {
        key: ['away_setting'],
        convertSet: async (entity, key, value: KeyValueAny, meta) => {
            const result: any = [];
            const daysInMonth = new Date(2000+result[0], result[1], 0).getDate();

            for (const attrName of ['away_preset_year',
                'away_preset_month',
                'away_preset_day',
                'away_preset_hour',
                'away_preset_minute',
                'away_preset_temperature',
                'away_preset_days']) {
                let v = 0;
                if (value.hasOwnProperty(attrName)) {
                    v = value[attrName];
                } else if (meta.state.hasOwnProperty(attrName)) {
                    // @ts-expect-error
                    v = meta.state[attrName];
                }
                switch (attrName) {
                case 'away_preset_year':
                    if (v<17 || v>99) v = 17;
                    result.push(Math.round(v));
                    break;
                case 'away_preset_month':
                    if (v<1 || v>12) v = 1;
                    result.push(Math.round(v));
                    break;
                case 'away_preset_day':
                    if (v<1) {
                        v = 1;
                    } else if (v>daysInMonth) {
                        v = daysInMonth;
                    }
                    result.push(Math.round(v));
                    break;
                case 'away_preset_hour':
                    if (v<0 || v>23) v = 0;
                    result.push(Math.round(v));
                    break;
                case 'away_preset_minute':
                    if (v<0 || v>59) v = 0;
                    result.push(Math.round(v));
                    break;
                case 'away_preset_temperature':
                    if (v<0.5 || v>29.5) v = 17;
                    result.push(Math.round(v * 2));
                    break;
                case 'away_preset_days':
                    if (v<1 || v>9999) v = 1;
                    result.push((v & 0xff00)>>8);
                    result.push((v & 0x00ff));
                    break;
                }
            }

            await sendDataPointRaw(entity, dataPoints.zsAwaySetting, result);
        },
    } satisfies Tz.Converter,
    zs_thermostat_local_schedule: {
        key: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        convertSet: async (entity, key, value: any, meta) => {
            const daysMap: KeyValueAny = {'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7};
            const day = daysMap[key];
            const results = [];
            results.push(day);
            for (let i = 1; i <= 9; i++) {
                // temperature
                const attrName = `${key}_temp_${i}`;
                let v = 17;
                if (value.hasOwnProperty(attrName)) {
                    v = value[attrName];
                } else if (meta.state.hasOwnProperty(attrName)) {
                    // @ts-expect-error
                    v = meta.state[attrName];
                }
                if (v<0.5 || v>29.5) v = 17;
                results.push(Math.round(v * 2));
                if (i!=9) {
                    // hour
                    let attrName = `${key}_hour_${i}`;
                    let h = 0;
                    if (value.hasOwnProperty(attrName)) {
                        h = value[attrName];
                    } else if (meta.state.hasOwnProperty(attrName)) {
                        // @ts-expect-error
                        h = meta.state[attrName];
                    }
                    // minute
                    attrName = `${key}_minute_${i}`;
                    let m = 0;
                    if (value.hasOwnProperty(attrName)) {
                        m = value[attrName];
                    } else if (meta.state.hasOwnProperty(attrName)) {
                        // @ts-expect-error
                        m = meta.state[attrName];
                    }
                    let rt = h*4 + m/15;
                    if (rt<1) {
                        rt =1;
                    } else if (rt>96) {
                        rt = 96;
                    }
                    results.push(Math.round(rt));
                }
            }
            if (value > 0) value = value*10;
            if (value < 0) value = value*10 + 0x100000000;
            await sendDataPointRaw(entity, (109+day-1), results);
        },
    } satisfies Tz.Converter,
    giexWaterValve:
    {
        key: [
            giexWaterValve.mode,
            giexWaterValve.irrigationTarget,
            giexWaterValve.state,
            giexWaterValve.cycleIrrigationNumTimes,
            giexWaterValve.cycleIrrigationInterval,
        ],
        convertSet: async (entity, key, value, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            const modelConverters = giexTzModelConverters[meta.mapped?.model] || {};
            switch (key) {
            case giexWaterValve.state:
                await sendDataPointBool(entity, dataPoints.giexWaterValve.state, value === ON);
                break;
            case giexWaterValve.mode:
                await sendDataPointBool(entity, dataPoints.giexWaterValve.mode, value === CAPACITY);
                return {state: {[giexWaterValve.mode]: value}};
            case giexWaterValve.irrigationTarget: {
                const mode = meta.state?.[giexWaterValve.mode];
                const sanitizedValue = modelConverters.irrigationTarget?.(value, mode) || value;
                await sendDataPointValue(entity, dataPoints.giexWaterValve.irrigationTarget, sanitizedValue);
                return {state: {[giexWaterValve.irrigationTarget]: sanitizedValue}};
            }
            case giexWaterValve.cycleIrrigationNumTimes:
                await sendDataPointValue(entity, dataPoints.giexWaterValve.cycleIrrigationNumTimes, value);
                return {state: {[giexWaterValve.cycleIrrigationNumTimes]: value}};
            case giexWaterValve.cycleIrrigationInterval:
                await sendDataPointValue(entity, dataPoints.giexWaterValve.cycleIrrigationInterval, value);
                return {state: {[giexWaterValve.cycleIrrigationInterval]: value}};
            default: // Unknown key warning
                logger.warning(`Unhandled KEY ${key}`, 'zhc:legacy:tz:giex_water_Valve');
            }
        },
    } satisfies Tz.Converter,
    tuya_alecto_smoke: {
        key: ['self_checking', 'silence'],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'self_checking':
                await sendDataPointBool(entity, dataPoints.alectoSelfChecking, value);
                break;
            case 'silence':
                await sendDataPointBool(entity, dataPoints.alectoSilence, value);
                break;
            default: // Unknown key
                throw new Error(`zigbee-herdsman-converters:tuya_alecto_smoke: Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    matsee_garage_door_opener: {
        key: ['trigger'],
        convertSet: async (entity, key, value, meta) => {
            const state = meta.message.hasOwnProperty('trigger') ? meta.message.trigger : true;
            // @ts-expect-error
            await sendDataPointBool(entity, dataPoints.garageDoorTrigger, state);
            return {state: {trigger: state}};
        },
    } satisfies Tz.Converter,
    connecte_thermostat: {
        key: [
            'child_lock', 'current_heating_setpoint', 'local_temperature_calibration', 'max_temperature_protection', 'window_detection',
            'hysteresis', 'state', 'away_mode', 'sensor', 'system_mode',
        ],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'state':
                await sendDataPointBool(entity, dataPoints.connecteState, value === 'ON');
                break;
            case 'child_lock':
                await sendDataPointBool(entity, dataPoints.connecteChildLock, value === 'LOCK');
                break;
            case 'local_temperature_calibration':
                // @ts-ignore
                if (value < 0) value = 0xFFFFFFFF + value + 1;
                await sendDataPointValue(entity, dataPoints.connecteTempCalibration, value);
                break;
            case 'hysteresis':
                // value = Math.round(value * 10);
                await sendDataPointValue(entity, dataPoints.connecteHysteresis, value);
                break;
            case 'max_temperature_protection':
                // @ts-ignore
                await sendDataPointValue(entity, dataPoints.connecteMaxProtectTemp, Math.round(value));
                break;
            case 'current_heating_setpoint':
                await sendDataPointValue(entity, dataPoints.connecteHeatingSetpoint, value);
                break;
            case 'sensor':
                await sendDataPointEnum(
                    entity,
                    dataPoints.connecteSensorType,
                    // @ts-ignore
                    {'internal': 0, 'external': 1, 'both': 2}[value]);
                break;
            case 'system_mode':
                switch (value) {
                case 'heat':
                    await sendDataPointEnum(entity, dataPoints.connecteMode, 0 /* manual */);
                    break;
                case 'auto':
                    await sendDataPointEnum(entity, dataPoints.connecteMode, 1 /* auto */);
                    break;
                }
                break;
            case 'away_mode':
                switch (value) {
                case 'ON':
                    await sendDataPointEnum(entity, dataPoints.connecteMode, 2 /* auto */);
                    break;
                case 'OFF':
                    await sendDataPointEnum(entity, dataPoints.connecteMode, 0 /* manual */);
                    break;
                }
                break;
            case 'window_detection':
                await sendDataPointBool(entity, dataPoints.connecteOpenWindow, value === 'ON');
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.connecte_thermostat ${key}`);
            }
        },
    } satisfies Tz.Converter,

    moes_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.moesChildLock, value === 'LOCK');
        },
    } satisfies Tz.Converter,
    moes_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value: any, meta) => {
            if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                await sendDataPointValue(entity, dataPoints.moesHeatingSetpoint, value * 10);
            } else {
                await sendDataPointValue(entity, dataPoints.moesHeatingSetpoint, value);
            }
        },
    } satisfies Tz.Converter,
    moes_thermostat_deadzone_temperature: {
        key: ['deadzone_temperature'],
        convertSet: async (entity, key, value: any, meta) => {
            if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                await sendDataPointValue(entity, dataPoints.moesDeadZoneTemp, value * 10);
            } else {
                await sendDataPointValue(entity, dataPoints.moesDeadZoneTemp, value);
            }
        },
    } satisfies Tz.Converter,
    moes_thermostat_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value: any, meta) => {
            if (value < 0) value = 4096 + value;
            await sendDataPointValue(entity, dataPoints.moesTempCalibration, value);
        },
    } satisfies Tz.Converter,
    moes_thermostat_min_temperature_limit: {
        key: ['min_temperature_limit'],
        convertSet: async (entity, key, value: any, meta) => {
            if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                await sendDataPointValue(entity, dataPoints.moesMinTempLimit, value * 10);
            } else {
                await sendDataPointValue(entity, dataPoints.moesMinTempLimit, value);
            }
        },
    } satisfies Tz.Converter,
    moes_thermostat_max_temperature_limit: {
        key: ['max_temperature_limit'],
        convertSet: async (entity, key, value: any, meta) => {
            if (['_TZE200_5toc8efa', '_TZE204_5toc8efa'].includes(meta.device.manufacturerName)) {
                await sendDataPointValue(entity, dataPoints.moesMaxTempLimit, value * 10);
            } else {
                await sendDataPointValue(entity, dataPoints.moesMaxTempLimit, value);
            }
        },
    } satisfies Tz.Converter,
    moes_thermostat_mode: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            const hold = value === 'hold' ? 0 : 1;
            const schedule = value === 'program' ? 0 : 1;
            await sendDataPointEnum(entity, dataPoints.moesHold, hold);
            await sendDataPointEnum(entity, dataPoints.moesScheduleEnable, schedule);
        },
    } satisfies Tz.Converter,
    moes_thermostat_mode2: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            // const stateLookup: KeyValueAny = {'0': 'cool', '1': 'heat', '2': 'fan_only'};
            switch (value) {
            case 'off':
                await sendDataPointBool(entity, dataPoints.moesSsystemMode, 0);
                break;
            case 'cool':
                // turn on
                await sendDataPointBool(entity, dataPoints.moesSsystemMode, 1);
                await sendDataPointEnum(entity, dataPoints.tvMode, 0);
                break;
            case 'heat':
                // turn on
                await sendDataPointBool(entity, dataPoints.moesSsystemMode, 1);
                await sendDataPointEnum(entity, dataPoints.tvMode, 1);
                break;
            case 'fan_only':
                // turn on
                await sendDataPointBool(entity, dataPoints.moesSsystemMode, 1);
                await sendDataPointEnum(entity, dataPoints.tvMode, 2);
                // await sendDataPointEnum(entity, dataPoints.moesScheduleEnable, 0);
                break;
            }
        },
    } satisfies Tz.Converter,
    moes_thermostat_standby: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.state, value === 'heat');
        },
    } satisfies Tz.Converter,
    moes_thermostat_program_schedule: {
        key: ['program'],
        convertSet: async (entity, key, value: any, meta) => {
            if (!meta.state.program) {
                logger.warning(`Existing program state not set.`, 'zhc:legacy:tz:moes_bht_002');
                return;
            }

            /* Merge modified value into existing state and send all over in one go */
            const newProgram = {
                // @ts-expect-error
                ...meta.state.program,
                ...value,
            };

            const payload = [
                Math.floor(newProgram.weekdays_p1_hour),
                Math.floor(newProgram.weekdays_p1_minute),
                Math.round(newProgram.weekdays_p1_temperature * 2),
                Math.floor(newProgram.weekdays_p2_hour),
                Math.floor(newProgram.weekdays_p2_minute),
                Math.round(newProgram.weekdays_p2_temperature * 2),
                Math.floor(newProgram.weekdays_p3_hour),
                Math.floor(newProgram.weekdays_p3_minute),
                Math.round(newProgram.weekdays_p3_temperature * 2),
                Math.floor(newProgram.weekdays_p4_hour),
                Math.floor(newProgram.weekdays_p4_minute),
                Math.round(newProgram.weekdays_p4_temperature * 2),
                Math.floor(newProgram.saturday_p1_hour),
                Math.floor(newProgram.saturday_p1_minute),
                Math.round(newProgram.saturday_p1_temperature * 2),
                Math.floor(newProgram.saturday_p2_hour),
                Math.floor(newProgram.saturday_p2_minute),
                Math.round(newProgram.saturday_p2_temperature * 2),
                Math.floor(newProgram.saturday_p3_hour),
                Math.floor(newProgram.saturday_p3_minute),
                Math.round(newProgram.saturday_p3_temperature * 2),
                Math.floor(newProgram.saturday_p4_hour),
                Math.floor(newProgram.saturday_p4_minute),
                Math.round(newProgram.saturday_p4_temperature * 2),
                Math.floor(newProgram.sunday_p1_hour),
                Math.floor(newProgram.sunday_p1_minute),
                Math.round(newProgram.sunday_p1_temperature * 2),
                Math.floor(newProgram.sunday_p2_hour),
                Math.floor(newProgram.sunday_p2_minute),
                Math.round(newProgram.sunday_p2_temperature * 2),
                Math.floor(newProgram.sunday_p3_hour),
                Math.floor(newProgram.sunday_p3_minute),
                Math.round(newProgram.sunday_p3_temperature * 2),
                Math.floor(newProgram.sunday_p4_hour),
                Math.floor(newProgram.sunday_p4_minute),
                Math.round(newProgram.sunday_p4_temperature * 2),
            ];
            await sendDataPointRaw(entity, dataPoints.moesSchedule, payload);
        },
    } satisfies Tz.Converter,
    moesS_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            return {state: {system_mode: 'heat'}};
        },
    } satisfies Tz.Converter,
    moesS_thermostat_preset: {
        key: ['preset'],
        convertSet: async (entity, key, value: any, meta) => {
            const lookup: KeyValueAny = {'programming': 0, 'manual': 1, 'temporary_manual': 2, 'holiday': 3};
            await sendDataPointEnum(entity, dataPoints.moesSsystemMode, lookup[value]);
        },
    } satisfies Tz.Converter,
    moesS_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value: number, meta) => {
            const temp = Math.round(value);
            await sendDataPointValue(entity, dataPoints.moesSheatingSetpoint, temp);
        },
    } satisfies Tz.Converter,
    moesS_thermostat_boost_heating: {
        key: ['boost_heating'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.moesSboostHeating, value === 'ON');
        },
    } satisfies Tz.Converter,
    moesS_thermostat_window_detection: {
        key: ['window_detection'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.moesSwindowDetectionFunktion_A2, value === 'ON');
        },
    } satisfies Tz.Converter,
    moesS_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.moesSchildLock, value === 'LOCK');
        },
    } satisfies Tz.Converter,
    moesS_thermostat_boostHeatingCountdownTimeSet: {
        key: ['boost_heating_countdown_time_set'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.moesSboostHeatingCountdownTimeSet, value);
        },
    } satisfies Tz.Converter,
    moesS_thermostat_temperature_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value: number, meta) => {
            let temp = Math.round(value * 1);
            if (temp < 0) {
                temp = 0xFFFFFFFF + temp + 1;
            }
            await sendDataPointValue(entity, dataPoints.moesScompensationTempSet, temp);
        },
    } satisfies Tz.Converter,
    moesS_thermostat_moesSecoMode: {
        key: ['eco_mode'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.moesSecoMode, value === 'ON');
        },
    } satisfies Tz.Converter,
    moesS_thermostat_eco_temperature: {
        key: ['eco_temperature'],
        convertSet: async (entity, key, value: any, meta) => {
            const temp = Math.round(value);
            await sendDataPointValue(entity, dataPoints.moesSecoModeTempSet, temp);
        },
    } satisfies Tz.Converter,
    moesS_thermostat_max_temperature: {
        key: ['max_temperature'],
        convertSet: async (entity, key, value: any, meta) => {
            const temp = Math.round(value);
            await sendDataPointValue(entity, dataPoints.moesSmaxTempSet, temp);
        },
    } satisfies Tz.Converter,
    moesS_thermostat_min_temperature: {
        key: ['min_temperature'],
        convertSet: async (entity, key, value: any, meta) => {
            const temp = Math.round(value);
            await sendDataPointValue(entity, dataPoints.moesSminTempSet, temp);
        },
    } satisfies Tz.Converter,
    moesS_thermostat_schedule_programming: {
        key: ['programming_mode'],
        convertSet: async (entity, key, value: string, meta) => {
            const payload = [];
            const items = value.split('  ');
            for (let i = 0; i < 12; i++) {
                const hourTemperature = items[i].split('/');
                const hourMinute = hourTemperature[0].split(':', 2);
                const h = parseInt(hourMinute[0]);
                const m = parseInt(hourMinute[1]);
                const temp = parseInt(hourTemperature[1]);
                if (h < 0 || h >= 24 || m < 0 || m >= 60 || temp < 5 || temp >= 35) {
                    throw new Error('Invalid hour, minute or temperature of:' + items[i]);
                }
                payload[i*3] = h; payload[i*3+1] = m; payload[i*3+2] = temp * 2;
            }
            await sendDataPointRaw(entity, dataPoints.moesSschedule, payload);
        },
    } satisfies Tz.Converter,
    hgkg_thermostat_standby: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.state, value === 'cool');
        },
    } satisfies Tz.Converter,
    moes_switch: {
        key: ['power_on_behavior', 'indicate_light'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'power_on_behavior':
                await sendDataPointEnum(
                    entity,
                    dataPoints.moesSwitchPowerOnBehavior,
                    // @ts-expect-error
                    utils.getKey(moesSwitch.powerOnBehavior, value),
                );
                break;
            case 'indicate_light':
                await sendDataPointEnum(
                    entity,
                    dataPoints.moesSwitchIndicateLight,
                    // @ts-expect-error
                    utils.getKey(moesSwitch.indicateLight, value),
                );
                break;
            default:
                logger.warning(`Unhandled Key ${key}`, 'zhc:legacy:tz:moes_switch');
                break;
            }
        },
    } satisfies Tz.Converter,
    moes_thermostat_sensor: {
        key: ['sensor'],
        convertSet: async (entity, key, value: any, meta) => {
            if (typeof value === 'string') {
                value = value.toLowerCase();
                const lookup: KeyValueAny = {'in': 0, 'al': 1, 'ou': 2};
                utils.validateValue(value, Object.keys(lookup));
                value = lookup[value];
            }
            if ((typeof value === 'number') && (value >= 0) && (value <= 2)) {
                await sendDataPointEnum(entity, dataPoints.moesSensor, value);
            } else {
                throw new Error(`Unsupported value: ${value}`);
            }
        },
    } satisfies Tz.Converter,
    tuya_dimmer_state: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            // Always use same transid as tuya_dimmer_level (https://github.com/Koenkk/zigbee2mqtt/issues/6366)
            await sendDataPointBool(entity, dataPoints.state, value === 'ON', 'dataRequest', 1);
        },
    } satisfies Tz.Converter,
    tuya_dimmer_level: {
        key: ['brightness_min', 'min_brightness', 'max_brightness', 'brightness', 'brightness_percent', 'level'],
        convertSet: async (entity, key, value: any, meta) => {
            // upscale to 1000
            let newValue;
            let dp = dataPoints.dimmerLevel;
            if (['_TZE200_3p5ydos3', '_TZE200_9i9dt8is', '_TZE200_dfxkcots', '_TZE200_w4cryh2i'].includes(meta.device.manufacturerName)) {
                dp = dataPoints.eardaDimmerLevel;
            }
            if (key === 'brightness_min') {
                if (value >= 0 && value <= 100) {
                    newValue = utils.mapNumberRange(value, 0, 100, 0, 1000);
                    dp = dataPoints.dimmerLevel;
                } else {
                    throw new Error('Dimmer brightness_min is out of range 0..100');
                }
            } else if (key === 'min_brightness') {
                if (value >= 1 && value <= 255) {
                    newValue = utils.mapNumberRange(value, 1, 255, 0, 1000);
                    dp = dataPoints.dimmerMinLevel;
                } else {
                    throw new Error('Dimmer min_brightness is out of range 1..255');
                }
            } else if (key === 'max_brightness') {
                if (value >= 1 && value <= 255) {
                    newValue = utils.mapNumberRange(value, 1, 255, 0, 1000);
                    dp = dataPoints.dimmerMaxLevel;
                } else {
                    throw new Error('Dimmer min_brightness is out of range 1..255');
                }
            } else if (key === 'level') {
                if (value >= 0 && value <= 1000) {
                    newValue = Math.round(Number(value));
                } else {
                    throw new Error('Dimmer level is out of range 0..1000');
                }
            } else if (key === 'brightness_percent') {
                if (value >= 0 && value <= 100) {
                    newValue = utils.mapNumberRange(value, 0, 100, 0, 1000);
                } else {
                    throw new Error('Dimmer brightness_percent is out of range 0..100');
                }
            } else { // brightness
                if (value >= 0 && value <= 254) {
                    newValue = utils.mapNumberRange(value, 0, 254, 0, 1000);
                } else {
                    throw new Error('Dimmer brightness is out of range 0..254');
                }
            }
            // Always use same transid as tuya_dimmer_state (https://github.com/Koenkk/zigbee2mqtt/issues/6366)
            await sendDataPointValue(entity, dp, newValue, 'dataRequest', 1);
        },
    } satisfies Tz.Converter,
    tuya_switch_state: {
        key: ['state'],
        convertSet: async (entity, key, value: any, meta) => {
            const lookup: KeyValueAny = {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5, l6: 6};
            const multiEndpoint = utils.getMetaValue(entity, meta.mapped, 'multiEndpoint', 'allEqual', false);
            const keyid = multiEndpoint ? lookup[meta.endpoint_name] : 1;
            await sendDataPointBool(entity, keyid, value === 'ON');
            return {state: {state: value.toUpperCase()}};
        },
    } satisfies Tz.Converter,
    frankever_threshold: {
        key: ['threshold'],
        convertSet: async (entity, key, value: number, meta) => {
            // input to multiple of 10 with max value of 100
            const thresh = Math.abs(Math.min(10 * (Math.floor(value / 10)), 100));
            await sendDataPointValue(entity, dataPoints.frankEverTreshold, thresh, 'dataRequest', 1);
            return {state: {threshold: value}};
        },
    } satisfies Tz.Converter,
    frankever_timer: {
        key: ['timer'],
        convertSet: async (entity, key, value: number, meta) => {
            // input in minutes with maximum of 600 minutes (equals 10 hours)
            const timer = 60 * Math.abs(Math.min(value, 600));
            // sendTuyaDataPoint* functions take care of converting the data to proper format
            await sendDataPointValue(entity, dataPoints.frankEverTimer, timer, 'dataRequest', 1);
            return {state: {timer: value}};
        },
    } satisfies Tz.Converter,
    ZVG1_timer: {
        key: ['timer'],
        convertSet: async (entity, key, value: number, meta) => {
            // input in minutes with maximum of 600 minutes (equals 10 hours)
            const timer = 60 * Math.abs(Math.min(value, 600));
            // sendTuyaDataPoint* functions take care of converting the data to proper format
            await sendDataPointValue(entity, 11, timer, 'dataRequest', 1);
            return {state: {timer: value}};
        },
    } satisfies Tz.Converter,
    ZVG1_weather_delay: {
        key: ['weather_delay'],
        convertSet: async (entity, key, value: string, meta) => {
            const lookup: KeyValueAny = {'disabled': 0, '24h': 1, '48h': 2, '72h': 3};
            await sendDataPointEnum(entity, 10, lookup[value]);
        },
    } satisfies Tz.Converter,
    ZVG1_cycle_timer: {
        key: ['cycle_timer_1', 'cycle_timer_2', 'cycle_timer_3', 'cycle_timer_4'],
        convertSet: async (entity, key, value: string, meta) => {
            let data = [0];
            const footer = [0x64];
            if (value == '') {
                // delete
                data.push(0x04);
                data.push(parseInt(key.substr(-1)));
                await sendDataPointRaw(entity, 16, data);
                const ret: KeyValueAny = {state: {}};
                ret['state'][key] = value;
                return ret;
            } else {
                if ((meta.state.hasOwnProperty(key) && meta.state[key] == '') ||
                    !meta.state.hasOwnProperty(key)) {
                    data.push(0x03);
                } else {
                    data.push(0x02);
                    data.push(parseInt(key.substr(-1)));
                }
            }

            const tarray = value.replace(/ /g, '').split('/');
            if (tarray.length < 4) {
                throw new Error('Please check the format of the timer string');
            }
            if (tarray.length < 5) {
                tarray.push('MoTuWeThFrSaSu');
            }

            if (tarray.length < 6) {
                tarray.push('1');
            }

            const starttime = tarray[0];
            const endtime = tarray[1];
            const irrigationDuration = tarray[2];
            const pauseDuration = tarray[3];
            const weekdays = tarray[4];
            const active = parseInt(tarray[5]);

            if (!(active == 0 || active == 1)) {
                throw new Error('Active value only 0 or 1 allowed');
            }
            data.push(active);

            const weekdaysPart = convertWeekdaysTo1ByteHexArray(weekdays);
            data = data.concat(weekdaysPart);

            data = data.concat(convertTimeTo2ByteHexArray(starttime));
            data = data.concat(convertTimeTo2ByteHexArray(endtime));

            data = data.concat(convertDecimalValueTo2ByteHexArray(irrigationDuration));
            data = data.concat(convertDecimalValueTo2ByteHexArray(pauseDuration));

            data = data.concat(footer);
            await sendDataPointRaw(entity, 16, data);
            const ret: KeyValueAny = {state: {}};
            ret['state'][key] = value;
            return ret;
        },
    } satisfies Tz.Converter,
    ZVG1_normal_schedule_timer: {
        key: ['normal_schedule_timer_1', 'normal_schedule_timer_2', 'normal_schedule_timer_3', 'normal_schedule_timer_4'],
        convertSet: async (entity, key, value: string, meta) => {
            let data = [0];
            const footer = [0x07, 0xe6, 0x08, 0x01, 0x01];
            if (value == '') {
                // delete
                data.push(0x04);
                data.push(parseInt(key.substr(-1)));
                await sendDataPointRaw(entity, 17, data);
                const ret: KeyValueAny = {state: {}};
                ret['state'][key] = value;
                return ret;
            } else {
                if ((meta.state.hasOwnProperty(key) && meta.state[key] == '') || !meta.state.hasOwnProperty(key)) {
                    data.push(0x03);
                } else {
                    data.push(0x02);
                    data.push(parseInt(key.substr(-1)));
                }
            }

            const tarray = value.replace(/ /g, '').split('/');
            if (tarray.length < 2) {
                throw new Error('Please check the format of the timer string');
            }
            if (tarray.length < 3) {
                tarray.push('MoTuWeThFrSaSu');
            }

            if (tarray.length < 4) {
                tarray.push('1');
            }

            const time = tarray[0];
            const duration = tarray[1];
            const weekdays = tarray[2];
            const active = parseInt(tarray[3]);

            if (!(active == 0 || active == 1)) {
                throw new Error('Active value only 0 or 1 allowed');
            }

            data = data.concat(convertTimeTo2ByteHexArray(time));

            const durationPart = convertDecimalValueTo2ByteHexArray(duration);
            data = data.concat(durationPart);

            const weekdaysPart = convertWeekdaysTo1ByteHexArray(weekdays);
            data = data.concat(weekdaysPart);
            data = data.concat([64, active]);
            data = data.concat(footer);
            await sendDataPointRaw(entity, 17, data);
            const ret: KeyValueAny = {state: {}};
            ret['state'][key] = value;
            return ret;
        },
    } satisfies Tz.Converter,
    etop_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            switch (value) {
            case 'off':
                await sendDataPointBool(entity, dataPoints.state, false);
                break;
            case 'heat':
                await sendDataPointBool(entity, dataPoints.state, true);
                await utils.sleep(500);
                await sendDataPointEnum(entity, dataPoints.mode, 0 /* manual */);
                break;
            case 'auto':
                await sendDataPointBool(entity, dataPoints.state, true);
                await utils.sleep(500);
                await sendDataPointEnum(entity, dataPoints.mode, 2 /* auto */);
                break;
            }
        },
    } satisfies Tz.Converter,
    etop_thermostat_away_mode: {
        key: ['away_mode'],
        convertSet: async (entity, key, value, meta) => {
            switch (value) {
            case 'ON':
                await sendDataPointBool(entity, dataPoints.state, true);
                await utils.sleep(500);
                await sendDataPointEnum(entity, dataPoints.mode, 1 /* away */);
                break;
            case 'OFF':
                await sendDataPointEnum(entity, dataPoints.mode, 0 /* manual */);
                break;
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_weekly_schedule: {
        key: ['weekly_schedule'],
        convertSet: async (entity, key, value, meta) => {
            const thermostatMeta = utils.getMetaValue(entity, meta.mapped, 'thermostat');
            // @ts-expect-error
            const maxTransitions = thermostatMeta.weeklyScheduleMaxTransitions;
            // @ts-expect-error
            const supportedModes = thermostatMeta.weeklyScheduleSupportedModes;
            // @ts-expect-error
            const firstDayDpId = thermostatMeta.weeklyScheduleFirstDayDpId;
            let conversion = 'generic';
            if (thermostatMeta.hasOwnProperty('weeklyScheduleConversion')) {
                // @ts-expect-error
                conversion = thermostatMeta.weeklyScheduleConversion;
            }

            function transitionToData(transition: KeyValueAny) {
                // Later it is possible to move converter to meta or to other place outside if other type of converter
                // will be needed for other device. Currently this converter is based on ETOP HT-08 thermostat.
                // see also fromZigbee.tuya_thermostat_weekly_schedule()
                const minutesSinceMidnight = transition.transitionTime;
                const heatSetpoint = Math.floor(transition.heatSetpoint * 10);
                return [
                    (minutesSinceMidnight & 0xff00) >> 8,
                    minutesSinceMidnight & 0xff,
                    (heatSetpoint & 0xff00) >> 8,
                    heatSetpoint & 0xff,
                ];
            }

            for (const [, daySchedule] of Object.entries(value)) {
                const dayofweek = parseInt(daySchedule.dayofweek);
                const numoftrans = parseInt(daySchedule.numoftrans);
                let transitions = [...daySchedule.transitions];
                const mode = parseInt(daySchedule.mode);
                if (!supportedModes.includes(mode)) {
                    throw new Error(`Invalid mode: ${mode} for device ${meta.options.friendly_name}`);
                }
                if (numoftrans != transitions.length) {
                    throw new Error(`Invalid numoftrans provided. Real: ${transitions.length} ` +
                        `provided ${numoftrans} for device ${meta.options.friendly_name}`);
                }
                if (transitions.length > maxTransitions) {
                    throw new Error(`Too more transitions provided. Provided: ${transitions.length} ` +
                        `but supports only ${numoftrans} for device ${meta.options.friendly_name}`);
                }
                if (transitions.length < maxTransitions) {
                    logger.warning(
                        `Padding transitions from ${transitions.length} to ${maxTransitions} with last item for device ${meta.options.friendly_name}`,
                        'zhc:legacy:tz:tuya_thermostat_weekly_schedule',
                    );
                    const lastTransition = transitions[transitions.length - 1];
                    while (transitions.length != maxTransitions) {
                        transitions = [...transitions, lastTransition];
                    }
                }
                const payload = [];
                if (conversion == 'saswell') {
                    // Single data point for setting schedule
                    // [
                    //     bitmap of days: |  7|  6|  5|  4|  3|  2|  1|
                    //                     |Sat|Fri|Thu|Wed|Tue|Mon|Sun|,
                    //     schedule mode - see legacy.thermostatScheduleMode, currently
                    //                     no known devices support modes other than "7 day"
                    //     4 transitions:
                    //       minutes from midnight high byte
                    //       minutes from midnight low byte
                    //       temperature * 10 high byte
                    //       temperature * 10 low byte
                    // ]
                    payload.push(1 << (dayofweek - 1), 4);
                }
                transitions.forEach((transition) => {
                    payload.push(...transitionToData(transition));
                });
                if (conversion == 'saswell') {
                    await sendDataPointRaw(
                        entity,
                        dataPoints.saswellScheduleSet,
                        payload);
                } else {
                    await sendDataPointRaw(
                        entity,
                        firstDayDpId - 1 + dayofweek,
                        payload);
                }
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.childLock, value === 'LOCK');
        },
    } satisfies Tz.Converter,
    tuya_thermostat_window_detection: {
        key: ['window_detection'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointRaw(
                entity,
                dataPoints.windowDetection,
                [value === 'ON' ? 1 : 0]);
        },
    } satisfies Tz.Converter,
    siterwell_thermostat_window_detection: {
        key: ['window_detection'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(
                entity,
                dataPoints.siterwellWindowDetection,
                value === 'ON');
        },
    } satisfies Tz.Converter,
    tuya_thermostat_valve_detection: {
        key: ['valve_detection'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.valveDetection, value === 'ON');
        },
    } satisfies Tz.Converter,
    tuya_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value: number, meta) => {
            const temp = Math.round(value * 10);
            await sendDataPointValue(entity, dataPoints.heatingSetpoint, temp);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKey(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatSystemMode'), value, null, Number);
            if (modeId !== null) {
                // @ts-expect-error
                await sendDataPointEnum(entity, dataPoints.mode, parseInt(modeId));
            } else {
                throw new Error(`TRV system mode ${value} is not recognized.`);
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_preset: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            const presetId = utils.getKey(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatPreset'), value, null, Number);
            if (presetId !== null) {
                // @ts-expect-error
                await sendDataPointEnum(entity, dataPoints.mode, parseInt(presetId));
            } else {
                throw new Error(`TRV preset ${value} is not recognized.`);
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_away_mode: {
        key: ['away_mode'],
        convertSet: async (entity, key, value, meta) => {
            // HA has special behavior for the away mode
            // @ts-expect-error
            const awayPresetId = utils.getKey(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatPreset'), 'away', null, Number);
            const schedulePresetId = utils.getKey(
                // @ts-expect-error
                utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatPreset'), 'schedule', null, Number,
            );
            if (awayPresetId !== null) {
                if (value == 'ON') {
                    await sendDataPointEnum(entity, dataPoints.mode, parseInt(awayPresetId));
                } else if (schedulePresetId != null) {
                    await sendDataPointEnum(entity, dataPoints.mode, parseInt(schedulePresetId));
                }
                // In case 'OFF' tuya_thermostat_preset() should be called with another preset
            } else {
                throw new Error(`TRV preset ${value} is not recognized.`);
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_fan_mode: {
        key: ['fan_mode'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKey(fanModes, value, null, Number);
            if (modeId !== null) {
                // @ts-expect-error
                await sendDataPointEnum(entity, dataPoints.fanMode, parseInt(modeId));
            } else {
                throw new Error(`TRV fan mode ${value} is not recognized.`);
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_bac_fan_mode: {
        key: ['fan_mode'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKey(fanModes, value, null, Number);
            if (modeId !== null) {
                // @ts-expect-error
                await sendDataPointEnum(entity, dataPoints.bacFanMode, parseInt(modeId));
            } else {
                throw new Error(`TRV fan mode ${value} is not recognized.`);
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_auto_lock: {
        key: ['auto_lock'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.autoLock, value === 'AUTO');
        },
    } satisfies Tz.Converter,
    tuya_thermostat_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value: number, meta) => {
            let temp = Math.round(value * 10);
            if (temp < 0) {
                temp = 0xFFFFFFFF + temp + 1;
            }
            await sendDataPointValue(entity, dataPoints.tempCalibration, temp);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_min_temp: {
        key: ['min_temperature'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.minTemp, value);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_max_temp: {
        key: ['max_temperature'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.maxTemp, value);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_boost_time: {
        key: ['boost_time'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.boostTime, value);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_comfort_temp: {
        key: ['comfort_temperature'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.comfortTemp, value);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_eco_temp: {
        key: ['eco_temperature'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointValue(entity, dataPoints.ecoTemp, value);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_force: {
        key: ['force'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKey(thermostatForceMode, value, null, Number);
            if (modeId !== null) {
                // @ts-expect-error
                await sendDataPointEnum(entity, dataPoints.forceMode, parseInt(modeId));
            } else {
                throw new Error(`TRV force mode ${value} is not recognized.`);
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_force_to_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            const modeId = utils.getKey(utils.getMetaValue(entity, meta.mapped, 'tuyaThermostatSystemMode'), value, null, Number);
            if (modeId !== null) {
                // @ts-expect-error
                await sendDataPointEnum(entity, dataPoints.forceMode, parseInt(modeId));
            } else {
                throw new Error(`TRV system mode ${value} is not recognized.`);
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_away_preset: {
        key: ['away_preset_temperature', 'away_preset_days'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'away_preset_days':
                await sendDataPointValue(entity, dataPoints.awayDays, value);
                break;
            case 'away_preset_temperature':
                await sendDataPointValue(entity, dataPoints.awayTemp, value);
                break;
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_window_detect: { // payload example { "detect":"OFF", "temperature":5, "minutes":8}
        key: ['window_detect'],
        convertSet: async (entity, key, value: KeyValueAny, meta) => {
            const detect = value.detect.toUpperCase() === 'ON' ? 1 : 0;
            await sendDataPointRaw(entity, dataPoints.windowDetection, [detect, value.temperature, value.minutes]);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_schedule: { // payload example {"holidays":[{"hour":6,"minute":0,"temperature":20},{"hour":8,"minute":0,....  6x
        key: ['schedule'],
        convertSet: async (entity, key, value: any, meta) => {
            const prob = Object.keys(value)[0]; // "workdays" or "holidays"
            if ((prob === 'workdays') || (prob === 'holidays')) {
                const dpId =
                    (prob === 'workdays') ?
                        dataPoints.scheduleWorkday :
                        dataPoints.scheduleHoliday;
                const payload = [];
                for (let i = 0; i < 6; i++) {
                    if ((value[prob][i].hour >= 0) && (value[prob][i].hour < 24)) {
                        payload[i * 3] = value[prob][i].hour;
                    }
                    if ((value[prob][i].minute >= 0) && (value[prob][i].minute < 60)) {
                        payload[i * 3 + 1] = value[prob][i].minute;
                    }
                    if ((value[prob][i].temperature >= 5) && (value[prob][i].temperature < 35)) {
                        payload[i * 3 + 2] = value[prob][i].temperature;
                    }
                }
                await sendDataPointRaw(entity, dpId, payload);
            }
        },
    } satisfies Tz.Converter,
    tuya_thermostat_schedule_programming_mode: { // payload example "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"
        key: ['workdays_schedule', 'holidays_schedule'],
        convertSet: async (entity, key, value: any, meta) => {
            const dpId =
                (key === 'workdays_schedule') ?
                    dataPoints.scheduleWorkday :
                    dataPoints.scheduleHoliday;
            const payload = [];
            const items = value.split(' ');

            for (let i = 0; i < 6; i++) {
                const hourTemperature = items[i].split('/');
                const hourMinute = hourTemperature[0].split(':', 2);
                const hour = parseInt(hourMinute[0]);
                const minute = parseInt(hourMinute[1]);
                const temperature = parseInt(hourTemperature[1]);

                if (hour < 0 || hour >= 24 || minute < 0 || minute >= 60 || temperature < 5 || temperature >= 35) {
                    throw new Error('Invalid hour, minute or temperature of:' + items[i]);
                }

                payload[i*3] = hour;
                payload[i*3+1] = minute;
                payload[i*3+2] = temperature;
            }
            await sendDataPointRaw(entity, dpId, payload);
        },
    } satisfies Tz.Converter,
    tuya_thermostat_week: {
        key: ['week'],
        convertSet: async (entity, key, value: any, meta) => {
            const lookup: KeyValueAny = {'5+2': 0, '6+1': 1, '7': 2};
            const week = lookup[value];
            await sendDataPointEnum(entity, dataPoints.weekFormat, week);
            return {state: {week: value}};
        },
    } satisfies Tz.Converter,
    tuya_cover_options: {
        key: ['options'],
        convertSet: async (entity, key, value: any, meta) => {
            if (value.reverse_direction != undefined) {
                if (value.reverse_direction) {
                    logger.info('Motor direction reverse', 'zhc:legacy:tz:tuya_cover_options');
                    await sendDataPointEnum(entity, dataPoints.motorDirection, 1);
                } else {
                    logger.info('Motor direction forward', 'zhc:legacy:tz:tuya_cover_options');
                    await sendDataPointEnum(entity, dataPoints.motorDirection, 0);
                }
            }

            if (value.motor_speed != undefined) {
                if (value.motor_speed < 0 || value.motor_speed > 255) {
                    throw new Error('TuYa_cover_control: Motor speed is out of range');
                }

                logger.info(`Setting motor speed to ${value.motor_speed}`, 'zhc:legacy:tz:tuya_cover_options');
                await sendDataPointValue(entity, dataPoints.coverSpeed, value.motor_speed);
            }
        },
    } satisfies Tz.Converter,
    neo_nas_pd07: {
        key: ['temperature_max', 'temperature_min', 'humidity_max', 'humidity_min', 'temperature_scale', 'unknown_111', 'unknown_112'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'temperature_max':
                await sendDataPointValue(entity, dataPoints.neoMaxTemp, value);
                break;
            case 'temperature_min':
                await sendDataPointValue(entity, dataPoints.neoMinTemp, value);
                break;
            case 'humidity_max':
                await sendDataPointValue(entity, dataPoints.neoMaxHumidity, value);
                break;
            case 'humidity_min':
                await sendDataPointValue(entity, dataPoints.neoMinHumidity, value);
                break;
            case 'temperature_scale':
                await sendDataPointBool(entity, dataPoints.neoTempScale, value === '°C');
                break;
            case 'unknown_111':
                await sendDataPointBool(entity, 111, value === 'ON');
                break;
            case 'unknown_112':
                await sendDataPointBool(entity, 112, value === 'ON');
                break;
            default: // Unknown key
                throw new Error(`tz.neo_nas_pd07: Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    neo_t_h_alarm: {
        key: [
            'alarm', 'melody', 'volume', 'duration',
            'temperature_max', 'temperature_min', 'humidity_min', 'humidity_max',
            'temperature_alarm', 'humidity_alarm',
        ],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'alarm':
                await sendDataPointBool(entity, dataPoints.neoAlarm, value);
                break;
            case 'melody':
                await sendDataPointEnum(entity, dataPoints.neoMelody, parseInt(value, 10));
                break;
            case 'volume':
                await sendDataPointEnum(
                    entity,
                    dataPoints.neoVolume,
                    // @ts-ignore
                    {'low': 2, 'medium': 1, 'high': 0}[value]);
                break;
            case 'duration':
                await sendDataPointValue(entity, dataPoints.neoDuration, value);
                break;
            case 'temperature_max':
                await sendDataPointValue(entity, dataPoints.neoMaxTemp, value);
                break;
            case 'temperature_min':
                await sendDataPointValue(entity, dataPoints.neoMinTemp, value);
                break;
            case 'humidity_max':
                await sendDataPointValue(entity, dataPoints.neoMaxHumidity, value);
                break;
            case 'humidity_min':
                await sendDataPointValue(entity, dataPoints.neoMinHumidity, value);
                break;
            case 'temperature_alarm':
                await sendDataPointBool(entity, dataPoints.neoTempAlarm, value);
                break;
            case 'humidity_alarm':
                await sendDataPointBool(entity, dataPoints.neoHumidityAlarm, value);
                break;
            default: // Unknown key
                throw new Error(`tz.neo_t_h_alarm: Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    neo_alarm: {
        key: [
            'alarm', 'melody', 'volume', 'duration',
        ],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'alarm':
                await sendDataPointBool(entity, dataPoints.neoAOAlarm, value);
                break;
            case 'melody':
                await sendDataPointEnum(entity, dataPoints.neoAOMelody, parseInt(value, 10));
                break;
            case 'volume':
                await sendDataPointEnum(
                    entity,
                    dataPoints.neoAOVolume,
                    // @ts-ignore
                    {'low': 0, 'medium': 1, 'high': 2}[value]);
                break;
            case 'duration':
                await sendDataPointValue(entity, dataPoints.neoAODuration, value);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    nous_lcd_temperature_humidity_sensor: {
        key: [
            'min_temperature', 'max_temperature', 'temperature_sensitivity', 'temperature_unit_convert', 'temperature_report_interval',
            'min_humidity', 'max_humidity', 'humidity_sensitivity', 'humidity_report_interval',
        ],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'temperature_unit_convert':
                await sendDataPointEnum(entity, dataPoints.nousTempUnitConvert, ['celsius', 'fahrenheit'].indexOf(value));
                break;
            case 'min_temperature':
                await sendDataPointValue(entity, dataPoints.nousMinTemp, Math.round(value * 10));
                break;
            case 'max_temperature':
                await sendDataPointValue(entity, dataPoints.nousMaxTemp, Math.round(value * 10));
                break;
            case 'temperature_sensitivity':
                await sendDataPointValue(entity, dataPoints.nousTempSensitivity, Math.round(value * 10));
                break;
            case 'humidity_sensitivity':
                await sendDataPointValue(entity, dataPoints.nousHumiSensitivity, value);
                break;
            case 'min_humidity':
                await sendDataPointValue(entity, dataPoints.nousMinHumi, Math.round(value));
                break;
            case 'max_humidity':
                await sendDataPointValue(entity, dataPoints.nousMaxHumi, Math.round(value));
                break;
            case 'temperature_report_interval':
                await sendDataPointValue(entity, dataPoints.nousTempReportInterval, value);
                break;
            case 'humidity_report_interval':
                await sendDataPointValue(entity, dataPoints.nousHumiReportInterval, value);
                break;
            default: // Unknown key
                logger.warning(`Unhandled key ${key}`, 'zhc:legacy:tz:nous_lcd_temperature_humidity_sensor');
            }
        },
    } satisfies Tz.Converter,
    saswell_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value: any, meta) => {
            const temp = Math.round(value * 10);
            await sendDataPointValue(entity, dataPoints.saswellHeatingSetpoint, temp);
        },
    } satisfies Tz.Converter,
    saswell_thermostat_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            const schedule = (value === 'auto');
            const enable = !(value === 'off');
            await sendDataPointBool(entity, dataPoints.saswellState, enable);
            // Older versions of Saswell TRVs need the delay to work reliably
            await utils.sleep(3000);
            await sendDataPointBool(entity, dataPoints.saswellScheduleEnable, schedule);
        },
    } satisfies Tz.Converter,
    saswell_thermostat_away: {
        key: ['away_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (value == 'ON') {
                await sendDataPointBool(entity, dataPoints.saswellAwayMode, true);
            } else {
                await sendDataPointBool(entity, dataPoints.saswellAwayMode, false);
            }
        },
    } satisfies Tz.Converter,
    saswell_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            // It seems that currently child lock can be sent and device responds,
            // but it's not entering lock state
            await sendDataPointBool(entity, dataPoints.saswellChildLock, value === 'LOCK');
        },
    } satisfies Tz.Converter,
    saswell_thermostat_window_detection: {
        key: ['window_detection'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.saswellWindowDetection, value === 'ON');
        },
    } satisfies Tz.Converter,
    saswell_thermostat_frost_detection: {
        key: ['frost_detection'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.saswellFrostDetection, value === 'ON');
        },
    } satisfies Tz.Converter,
    saswell_thermostat_anti_scaling: {
        key: ['anti_scaling'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.saswellAntiScaling, value === 'ON');
        },
    } satisfies Tz.Converter,
    saswell_thermostat_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value: any, meta) => {
            if (value < 0) value = 0xFFFFFFFF + value + 1;
            await sendDataPointValue(entity, dataPoints.saswellTempCalibration, value);
        },
    } satisfies Tz.Converter,
    evanell_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value: any, meta) => {
            const temp = Math.round(value * 10);
            await sendDataPointValue(entity, dataPoints.evanellHeatingSetpoint, temp);
        },
    } satisfies Tz.Converter,
    evanell_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            switch (value) {
            case 'off':
                await sendDataPointEnum(entity, dataPoints.evanellMode, 3 /* off */);
                break;
            case 'heat':
                await sendDataPointEnum(entity, dataPoints.evanellMode, 2 /* manual */);
                break;
            case 'auto':
                await sendDataPointEnum(entity, dataPoints.evanellMode, 0 /* auto */);
                break;
            }
        },
    } satisfies Tz.Converter,
    evanell_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await sendDataPointBool(entity, dataPoints.evanellChildLock, value === 'LOCK');
        },
    } satisfies Tz.Converter,
    silvercrest_smart_led_string: {
        key: ['color', 'brightness', 'effect'],
        convertSet: async (entity, key, value: any, meta) => {
            if (key === 'effect') {
                await sendDataPointEnum(entity, dataPoints.silvercrestChangeMode, silvercrestModes.effect);

                let data: any = [];
                const effect = silvercrestEffects[value.effect];
                data = data.concat(convertStringToHexArray(effect));
                let speed = utils.mapNumberRange(value.speed, 0, 100, 0, 64);

                // Max speed what the gateways sends is 64.
                if (speed > 64) {
                    speed = 64;
                }

                // Make it a string and attach a leading zero (0x30)
                let speedString = String(speed);
                if (speedString.length === 1) {
                    speedString = '0' + speedString;
                }
                if (!speedString) {
                    speedString = '00';
                }

                data = data.concat(convertStringToHexArray(speedString));
                let colors = value.colors;
                // @ts-expect-error
                if (!colors && meta.state && meta.state.effect && meta.state.effect.colors) {
                    // @ts-expect-error
                    colors = meta.state.effect.colors;
                }

                if (colors) {
                    for (const color of colors) {
                        let r = '00';
                        let g = '00';
                        let b = '00';

                        if (color.r) {
                            r = color.r.toString(16);
                        }
                        if (r.length === 1) {
                            r = '0' + r;
                        }

                        if (color.g) {
                            g = color.g.toString(16);
                        }
                        if (g.length === 1) {
                            g = '0' + g;
                        }

                        if (color.b) {
                            b = color.b.toString(16);
                        }
                        if (b.length === 1) {
                            b = '0' + b;
                        }

                        data = data.concat(convertStringToHexArray(r));
                        data = data.concat(convertStringToHexArray(g));
                        data = data.concat(convertStringToHexArray(b));
                    }
                }

                await sendDataPointStringBuffer(entity, dataPoints.silvercrestSetEffect, data);
            } else if (key === 'brightness') {
                await sendDataPointEnum(entity, dataPoints.silvercrestChangeMode, silvercrestModes.white);
                // It expects 2 leading zero's.
                let data = [0x00, 0x00];

                // Scale it to what the device expects (0-1000 instead of 0-255)
                const scaled = utils.mapNumberRange(value, 0, 255, 0, 1000);
                data = data.concat(convertDecimalValueTo2ByteHexArray(scaled));

                await sendDataPoint(
                    entity,
                    {dp: dataPoints.silvercrestSetBrightness, datatype: dataTypes.value, data: data},
                );
            } else if (key === 'color') {
                await sendDataPointEnum(entity, dataPoints.silvercrestChangeMode, silvercrestModes.color);

                const make4sizedString = (v: string) => {
                    if (v.length >= 4) {
                        return v;
                    } else if (v.length === 3) {
                        return '0' + v;
                    } else if (v.length === 2) {
                        return '00' + v;
                    } else if (v.length === 1) {
                        return '000' + v;
                    } else {
                        return '0000';
                    }
                };

                const fillInHSB = (h: any, s: any, b: any, state: any) => {
                    // Define default values. Device expects leading zero in string.
                    const hsb = {
                        h: '0168', // 360
                        s: '03e8', // 1000
                        b: '03e8', // 1000
                    };

                    if (h) {
                        // The device expects 0-359
                        // The device expects a round number, otherwise everything breaks
                        hsb.h = make4sizedString(utils.numberWithinRange(utils.precisionRound(h, 0), 0, 359).toString(16));
                    } else if (state.color && state.color.h) {
                        hsb.h = make4sizedString(utils.numberWithinRange(utils.precisionRound(state.color.h, 0), 0, 359).toString(16));
                    }

                    // Device expects 0-1000, saturation normally is 0-100 so we expect that from the user
                    // The device expects a round number, otherwise everything breaks
                    if (s) {
                        hsb.s = make4sizedString(utils.mapNumberRange(s, 0, 100, 0, 1000).toString(16));
                    } else if (state.color && state.color.s) {
                        hsb.s = make4sizedString(utils.mapNumberRange(state.color.s, 0, 100, 0, 1000).toString(16));
                    }

                    // Scale 0-255 to 0-1000 what the device expects.
                    if (b) {
                        hsb.b = make4sizedString(utils.mapNumberRange(b, 0, 255, 0, 1000).toString(16));
                    } else if (state.brightness) {
                        hsb.b = make4sizedString(utils.mapNumberRange(state.brightness, 0, 255, 0, 1000).toString(16));
                    }

                    return hsb;
                };

                let hsb: KeyValueAny = {};

                if (value.hasOwnProperty('hsb')) {
                    const split = value.hsb.split(',').map((i: string) => parseInt(i));
                    hsb = fillInHSB(split[0], split[1], split[2], meta.state);
                } else {
                    hsb = fillInHSB(
                        value.h || value.hue || null,
                        value.s || value.saturation || null,
                        value.b || value.brightness || null,
                        meta.state);
                }

                let data: any = [];
                data = data.concat(convertStringToHexArray(hsb.h));
                data = data.concat(convertStringToHexArray(hsb.s));
                data = data.concat(convertStringToHexArray(hsb.b));

                await sendDataPointStringBuffer(entity, dataPoints.silvercrestSetColor, data);
            }
        },
    } satisfies Tz.Converter,
    tuya_data_point_test: {
        key: ['tuya_data_point_test'],
        convertSet: async (entity, key, value: string, meta) => {
            const args = value.split(',');
            const mode = args[0];
            const dp = parseInt(args[1]);
            const data = [];

            switch (mode) {
            case 'raw':
                for (let i = 2; i < args.length; i++) {
                    data.push(parseInt(args[i]));
                }
                await sendDataPointRaw(entity, dp, data);
                break;
            case 'bool':
                await sendDataPointBool(entity, dp, args[2] === '1');
                break;
            case 'value':
                await sendDataPointValue(entity, dp, parseInt(args[2]));
                break;
            case 'enum':
                await sendDataPointEnum(entity, dp, parseInt(args[2]));
                break;
            case 'bitmap':
                for (let i = 2; i < args.length; i++) {
                    data.push(parseInt(args[i]));
                }
                await sendDataPointBitmap(entity, dp, data);
                break;
            }
        },
    } satisfies Tz.Converter,
    hy_thermostat: {
        key: [
            'child_lock', 'current_heating_setpoint', 'local_temperature_calibration',
            'max_temperature_protection', 'min_temperature_protection', 'state',
            'hysteresis', 'hysteresis_for_protection',
            'max_temperature_for_protection', 'min_temperature_for_protection',
            'max_temperature', 'min_temperature',
            'sensor_type', 'power_on_behavior', 'week', 'system_mode',
            'away_preset_days', 'away_preset_temperature',
        ],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'max_temperature_protection':
                await sendDataPointBool(entity, dataPoints.hyMaxTempProtection, value === 'ON');
                break;
            case 'min_temperature_protection':
                await sendDataPointBool(entity, dataPoints.hyMinTempProtection, value === 'ON');
                break;
            case 'state':
                await sendDataPointBool(entity, dataPoints.hyState, value === 'ON');
                break;
            case 'child_lock':
                await sendDataPointBool(entity, dataPoints.hyChildLock, value === 'LOCK');
                break;
            case 'away_preset_days':
                await sendDataPointValue(entity, dataPoints.hyAwayDays, value);
                break;
            case 'away_preset_temperature':
                await sendDataPointValue(entity, dataPoints.hyAwayTemp, value);
                break;
            case 'local_temperature_calibration':
                value = Math.round(value * 10);
                if (value < 0) value = 0xFFFFFFFF + value + 1;
                await sendDataPointValue(entity, dataPoints.hyTempCalibration, value);
                break;
            case 'hysteresis':
                value = Math.round(value * 10);
                await sendDataPointValue(entity, dataPoints.hyHysteresis, value);
                break;
            case 'hysteresis_for_protection':
                await sendDataPointValue(entity, dataPoints.hyProtectionHysteresis, value);
                break;
            case 'max_temperature_for_protection':
                await sendDataPointValue(entity, dataPoints.hyProtectionMaxTemp, value);
                break;
            case 'min_temperature_for_protection':
                await sendDataPointValue(entity, dataPoints.hyProtectionMinTemp, value);
                break;
            case 'max_temperature':
                await sendDataPointValue(entity, dataPoints.hyMaxTemp, value);
                break;
            case 'min_temperature':
                await sendDataPointValue(entity, dataPoints.hyMinTemp, value);
                break;
            case 'current_heating_setpoint':
                value = Math.round(value * 10);
                await sendDataPointValue(entity, dataPoints.hyHeatingSetpoint, value);
                break;
            case 'sensor_type':
                await sendDataPointEnum(
                    entity,
                    dataPoints.hySensor,
                    // @ts-ignore
                    {'internal': 0, 'external': 1, 'both': 2}[value]);
                break;
            case 'power_on_behavior':
                await sendDataPointEnum(
                    entity,
                    dataPoints.hyPowerOnBehavior,
                    // @ts-ignore
                    {'restore': 0, 'off': 1, 'on': 2}[value]);
                break;
            case 'week':
                await sendDataPointEnum(
                    entity,
                    dataPoints.hyWeekFormat,
                    utils.getKey(thermostatWeekFormat, value, value, Number));
                break;
            case 'system_mode':
                await sendDataPointEnum(
                    entity,
                    dataPoints.hyMode,
                    // @ts-ignore
                    {'manual': 0, 'auto': 1, 'away': 2}[value]);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    ZB003X: {
        key: [
            'reporting_time', 'temperature_calibration', 'humidity_calibration',
            'illuminance_calibration', 'pir_enable', 'led_enable',
            'reporting_enable', 'sensitivity', 'keep_time',
        ],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'reporting_time':
                await sendDataPointValue(entity, dataPoints.fantemReportingTime, value, 'sendData');
                break;
            case 'temperature_calibration':
                value = Math.round(value * 10);
                if (value < 0) value = 0xFFFFFFFF + value + 1;
                await sendDataPointValue(entity, dataPoints.fantemTempCalibration, value, 'sendData');
                break;
            case 'humidity_calibration':
                if (value < 0) value = 0xFFFFFFFF + value + 1;
                await sendDataPointValue(entity, dataPoints.fantemHumidityCalibration, value, 'sendData');
                break;
            case 'illuminance_calibration':
                if (value < 0) value = 0xFFFFFFFF + value + 1;
                await sendDataPointValue(entity, dataPoints.fantemLuxCalibration, value, 'sendData');
                break;
            case 'pir_enable':
                await sendDataPointBool(entity, dataPoints.fantemMotionEnable, value, 'sendData');
                break;
            case 'led_enable':
                await sendDataPointBool(entity, dataPoints.fantemLedEnable, value === false, 'sendData');
                break;
            case 'reporting_enable':
                await sendDataPointBool(entity, dataPoints.fantemReportingEnable, value, 'sendData');
                break;
            case 'sensitivity':
                // @ts-ignore
                await entity.write('ssIasZone', {currentZoneSensitivityLevel: {'low': 0, 'medium': 1, 'high': 2}[value]});
                break;
            case 'keep_time':
                // @ts-ignore
                await entity.write('ssIasZone', {61441: {value: {'0': 0, '30': 1, '60': 2, '120': 3,
                    '240': 4, '480': 5}[value], type: 0x20}});
                break;
            default: // Unknown key
                throw new Error(`tz.ZB003X: Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    ZB006X_settings: {
        key: ['switch_type', 'load_detection_mode', 'control_mode'],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'switch_type':
                // @ts-ignore
                await sendDataPointEnum(entity, dataPoints.fantemExtSwitchType, {'unknown': 0, 'toggle': 1,
                    'momentary': 2, 'rotary': 3, 'auto_config': 4}[value], 'sendData');
                break;
            case 'load_detection_mode':
                // @ts-ignore
                await sendDataPointEnum(entity, dataPoints.fantemLoadDetectionMode, {'none': 0, 'first_power_on': 1,
                    'every_power_on': 2}[value], 'sendData');
                break;
            case 'control_mode':
                // @ts-ignore
                await sendDataPointEnum(entity, dataPoints.fantemControlMode, {'ext_switch': 0, 'remote': 1,
                    'both': 2}[value], 'sendData');
                break;
            default: // Unknown key
                throw new Error(`tz.ZB006X_settings: Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    tuya_motion_sensor: {
        key: ['o_sensitivity', 'v_sensitivity', 'led_status', 'vacancy_delay',
            'light_on_luminance_prefer', 'light_off_luminance_prefer', 'mode'],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'o_sensitivity':
                await sendDataPointEnum(entity, dataPoints.msOSensitivity, utils.getKey(msLookups.OSensitivity, value));
                break;
            case 'v_sensitivity':
                await sendDataPointEnum(entity, dataPoints.msVSensitivity, utils.getKey(msLookups.VSensitivity, value));
                break;
            case 'led_status':
                // @ts-ignore
                await sendDataPointEnum(entity, dataPoints.msLedStatus, {'on': 0, 'off': 1}[value.toLowerCase()]);
                break;
            case 'vacancy_delay':
                await sendDataPointValue(entity, dataPoints.msVacancyDelay, value);
                break;
            case 'light_on_luminance_prefer':
                await sendDataPointValue(entity, dataPoints.msLightOnLuminancePrefer, value);
                break;
            case 'light_off_luminance_prefer':
                await sendDataPointValue(entity, dataPoints.msLightOffLuminancePrefer, value);
                break;
            case 'mode':
                await sendDataPointEnum(entity, dataPoints.msMode, utils.getKey(msLookups.Mode, value));
                break;
            default: // Unknown key
                logger.warning(`toZigbee.tuya_motion_sensor: Unhandled key ${key}`, 'zhc:legacy:tz:tuya_motion_sensor');
            }
        },
    } satisfies Tz.Converter,
    javis_microwave_sensor: {
        key: [
            'illuminance_calibration', 'led_enable',
            'sensitivity', 'keep_time',
        ],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'illuminance_calibration':// (10--100) sensor illuminance sensitivity
                if (meta.device.manufacturerName === '_TZE200_kagkgk0i') {
                    await sendDataPointRaw(entity, 102, [value]);
                    break;
                } else {
                    await sendDataPointRaw(entity, 105, [value]);
                    break;
                }
            case 'led_enable':// OK (value true/false or 1/0)
                if (meta.device.manufacturerName === '_TZE200_kagkgk0i') {
                    await sendDataPointRaw(entity, 107, [value ? 1 : 0]);
                    break;
                } else {
                    await sendDataPointRaw(entity, 103, [value ? 1 : 0]);
                    break;
                }

            case 'sensitivity':// value: 25, 50, 75, 100
                await sendDataPointRaw(entity, 2, [value]);
                break;
            case 'keep_time': // value 0 --> 7 corresponding 5s, 30s, 1, 3, 5, 10, 20, 30 min
                if (meta.device.manufacturerName === '_TZE200_kagkgk0i') {
                    await sendDataPointRaw(entity, 106, [value]);
                    break;
                } else {
                    await sendDataPointRaw(entity, 102, [value]);
                    break;
                }
            default: // Unknown key
                throw new Error(`Unhandled key ${key}`);
            }
        },
    } satisfies Tz.Converter,
    moes_thermostat_tv: {
        key: [
            'system_mode', 'window_detection', 'frost_detection', 'child_lock',
            'current_heating_setpoint', 'local_temperature_calibration',
            'holiday_temperature', 'comfort_temperature', 'eco_temperature',
            'open_window_temperature', 'heating_stop', 'preset',
        ],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'system_mode':
                if (value != 'off') {
                    await sendDataPointBool(entity, dataPoints.tvHeatingStop, 0);
                    await sendDataPointEnum(entity, dataPoints.tvMode, utils.getKey(tvThermostatMode, value));
                } else {
                    await sendDataPointBool(entity, dataPoints.tvHeatingStop, 1);
                }
                break;
            case 'window_detection':
                await sendDataPointBool(entity, dataPoints.tvWindowDetection, value);
                break;
            case 'frost_detection':
                if (value == false) {
                    await sendDataPointBool(entity, dataPoints.tvFrostDetection, 0);
                    await sendDataPointEnum(entity, dataPoints.tvMode, 1);
                } else {
                    await sendDataPointBool(entity, dataPoints.tvFrostDetection, 1);
                }
                break;
            case 'child_lock':
                await sendDataPointBool(entity, dataPoints.tvChildLock, value === 'LOCK');
                break;
            case 'local_temperature_calibration':
                value = Math.round(value * 10);
                value = (value < 0) ? 0xFFFFFFFF + value + 1 : value;
                await sendDataPointValue(entity, dataPoints.tvTempCalibration, value);
                break;
            case 'current_heating_setpoint':
                value = Math.round(value * 10);
                await sendDataPointValue(entity, dataPoints.tvHeatingSetpoint, value);
                break;
            case 'holiday_temperature':
                value = Math.round(value * 10);
                await sendDataPointValue(entity, dataPoints.tvHolidayTemp, value);
                break;
            case 'comfort_temperature':
                value = Math.round(value * 10);
                await sendDataPointValue(entity, dataPoints.tvComfortTemp, value);
                break;
            case 'eco_temperature':
                value = Math.round(value * 10);
                await sendDataPointValue(entity, dataPoints.tvEcoTemp, value);
                break;
            case 'heating_stop':
                if (value == true) {
                    await sendDataPointBool(entity, dataPoints.tvHeatingStop, 1);
                } else {
                    await sendDataPointBool(entity, dataPoints.tvHeatingStop, 0);
                    await sendDataPointEnum(entity, dataPoints.tvMode, 1);
                }
                break;
            // case 'boost_mode':
            //     // set 300sec boost time
            //     await sendDataPointValue(entity, dataPoints.tvBoostTime, 300);
            //     await sendDataPointEnum(entity, dataPoints.tvBoostMode, (value) ? 0 : 1);
            //     break;
            case 'open_window_temperature':
                value = Math.round(value * 10);
                await sendDataPointValue(entity, dataPoints.tvOpenWindowTemp, value);
                break;
            case 'preset':
                await sendDataPointBool(entity, dataPoints.tvHeatingStop, 0);
                await sendDataPointEnum(entity, dataPoints.tvMode, utils.getKey(tvThermostatPreset, value));
                break;
            default: // Unknown key
                logger.warning(`Unhandled key ${key}`, 'zhc:legacy:tz:moes_thermostat_tv');
            }
        },
    } satisfies Tz.Converter,
    tuya_light_wz5: {
        key: ['color', 'color_temp', 'brightness', 'white_brightness'],
        convertSet: async (entity, key, value: any, meta) => {
            if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
            const separateWhite = (meta.mapped.meta && meta.mapped.meta.separateWhite);
            if (key == 'white_brightness' || (!separateWhite && (key == 'brightness'))) {
                // upscale to 1000
                let newValue;
                if (value >= 0 && value <= 255) {
                    newValue = utils.mapNumberRange(value, 0, 255, 0, 1000);
                } else {
                    throw new Error('Dimmer brightness is out of range 0..255');
                }
                await sendDataPoints(entity, [
                    dpValueFromEnum(dataPoints.silvercrestChangeMode, silvercrestModes.white),
                    dpValueFromIntValue(dataPoints.dimmerLevel, newValue),
                ], 'dataRequest');

                return {state: (key == 'white_brightness') ? {white_brightness: value} : {brightness: value}};
            } else if (key == 'color_temp') {
                const [colorTempMin, colorTempMax] = [250, 454];
                const preset: KeyValueAny = {
                    'warmest': colorTempMax,
                    'warm': 454,
                    'neutral': 370,
                    'cool': 250,
                    'coolest': colorTempMin,
                };
                // @ts-ignore
                if (typeof value === 'string' && isNaN(value)) {
                    const presetName = value.toLowerCase();
                    if (presetName in preset) {
                        value = preset[presetName];
                    } else {
                        throw new Error(`Unknown preset '${value}'`);
                    }
                } else {
                    value = light.clampColorTemp(Number(value), colorTempMin, colorTempMax);
                }
                const data = utils.mapNumberRange(value, colorTempMax, colorTempMin, 0, 1000);

                await sendDataPoints(entity, [
                    dpValueFromEnum(dataPoints.silvercrestChangeMode, silvercrestModes.white),
                    dpValueFromIntValue(dataPoints.silvercrestSetColorTemp, data),
                ], 'dataRequest');

                return {state: {color_temp: value}};
            } else if (key == 'color' || (separateWhite && (key == 'brightness'))) {
                const newState: KeyValueAny = {};
                if (key == 'brightness') {
                    newState.brightness = value;
                } else if (key == 'color') {
                    newState.color = value;
                    newState.color_mode = 'hs';
                }

                const make4sizedString = (v: string) => {
                    if (v.length >= 4) {
                        return v;
                    } else if (v.length === 3) {
                        return '0' + v;
                    } else if (v.length === 2) {
                        return '00' + v;
                    } else if (v.length === 1) {
                        return '000' + v;
                    } else {
                        return '0000';
                    }
                };

                const fillInHSB = (h: number, s: number, b: number, state: KeyValueAny) => {
                    // Define default values. Device expects leading zero in string.
                    const hsb = {
                        h: '0168', // 360
                        s: '03e8', // 1000
                        b: '03e8', // 1000
                    };

                    if (h) {
                        // The device expects 0-359
                        if (h >= 360) {
                            h = 359;
                        }
                        hsb.h = make4sizedString(h.toString(16));
                    } else if (state.color && state.color.hue) {
                        hsb.h = make4sizedString(state.color.hue.toString(16));
                    }

                    // Device expects 0-1000, saturation normally is 0-100 so we expect that from the user
                    // The device expects a round number, otherwise everything breaks
                    if (s) {
                        hsb.s = make4sizedString(utils.mapNumberRange(s, 0, 100, 0, 1000).toString(16));
                    } else if (state.color && state.color.saturation) {
                        hsb.s = make4sizedString(utils.mapNumberRange(state.color.saturation, 0, 100, 0, 1000).toString(16));
                    }

                    // Scale 0-255 to 0-1000 what the device expects.
                    if (b != null) {
                        hsb.b = make4sizedString(utils.mapNumberRange(b, 0, 255, 0, 1000).toString(16));
                    } else if (state.brightness != null) {
                        hsb.b = make4sizedString(utils.mapNumberRange(state.brightness, 0, 255, 0, 1000).toString(16));
                    }
                    return hsb;
                };

                const hsb = fillInHSB(
                    value.h || value.hue || null,
                    value.s || value.saturation || null,
                    value.b || value.brightness || (key == 'brightness') ? value : null,
                    meta.state,
                );


                let data: any = [];
                data = data.concat(convertStringToHexArray(hsb.h));
                data = data.concat(convertStringToHexArray(hsb.s));
                data = data.concat(convertStringToHexArray(hsb.b));

                const commands = [
                    dpValueFromEnum(dataPoints.silvercrestChangeMode, silvercrestModes.color),
                    dpValueFromStringBuffer(dataPoints.silvercrestSetColor, data),
                ];

                await sendDataPoints(entity, commands, 'dataRequest');

                return {state: newState};
            }
        },
    } satisfies Tz.Converter,
    ZMAM02_cover: {
        key: ['state', 'position', 'mode', 'motor_direction', 'border', 'motor_working_mode'],
        options: [exposes.options.invert_cover()],
        convertSet: async (entity, key, value: any, meta) => {
            if (key === 'position') {
                if (value >= 0 && value <= 100) {
                    const invert = isCoverInverted(meta.device.manufacturerName) ?
                        !meta.options.invert_cover : meta.options.invert_cover;

                    value = invert ? 100 - value : value;
                    await sendDataPointValue(entity, dataPoints.coverPosition, value);
                } else {
                    throw new Error('TuYa_cover_control: Curtain motor position is out of range');
                }
            } else if (key === 'state') {
                const stateEnums = getCoverStateEnums(meta.device.manufacturerName);
                logger.debug(`Using state enums for ${meta.device.manufacturerName}: ${JSON.stringify(stateEnums)}`, 'zhc:legacy:tz:zmam02');
                value = value.toLowerCase();
                switch (value) {
                case 'close':
                    await sendDataPointEnum(entity, dataPoints.AM02Control, stateEnums.close);
                    break;
                case 'open':
                    await sendDataPointEnum(entity, dataPoints.AM02Control, stateEnums.open);
                    break;
                case 'stop':
                    await sendDataPointEnum(entity, dataPoints.AM02Control, stateEnums.stop);
                    break;
                default:
                    throw new Error('ZMAM02: Invalid command received');
                }
            }
            switch (key) {
            case 'mode':
                await sendDataPointEnum(entity, dataPoints.AM02Mode, utils.getKey(ZMLookups.AM02Mode, value));
                break;
            case 'motor_direction':
                await sendDataPointEnum(entity, dataPoints.AM02Direction, utils.getKey(ZMLookups.AM02Direction, value));
                break;
            case 'border':
                await sendDataPointEnum(entity, dataPoints.AM02Border, utils.getKey(ZMLookups.AM02Border, value));
                break;
            case 'motor_working_mode':
                await sendDataPointEnum(
                    entity,
                    dataPoints.AM02MotorWorkingMode,
                    utils.getKey(ZMLookups.AM02MotorWorkingMode,
                        value));
                break;
            }
        },
    } satisfies Tz.Converter,
    tuya_smart_human_presense_sensor: {
        key: ['radar_sensitivity', 'minimum_range', 'maximum_range', 'detection_delay', 'fading_time'],
        convertSet: async (entity, key, value:any, meta) => {
            switch (key) {
            case 'radar_sensitivity':
                await sendDataPointValue(entity, dataPoints.tshpscSensitivity, value);
                break;
            case 'minimum_range':
                await sendDataPointValue(entity, dataPoints.tshpsMinimumRange, value*100);
                break;
            case 'maximum_range':
                await sendDataPointValue(entity, dataPoints.tshpsMaximumRange, value*100);
                break;
            case 'detection_delay':
                await sendDataPointValue(entity, dataPoints.tshpsDetectionDelay, value*10);
                break;
            case 'fading_time':
                await sendDataPointValue(entity, dataPoints.tshpsFadingTime, value*10);
                break;
            default: // Unknown Key
                logger.warning(`Unhandled Key ${key}`, 'zhc:legacy:tz:tuya_smart_human_presense_sensor');
            }
        },
    } satisfies Tz.Converter,
    ZG204ZL_lms: {
        key: ['sensitivity', 'keep_time'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'sensitivity':
                // @ts-ignore
                await sendDataPointEnum(entity, dataPoints.lmsSensitivity, {'low': 0, 'medium': 1, 'high': 2}[value]);
                break;
            case 'keep_time':
                // @ts-ignore
                await sendDataPointEnum(entity, dataPoints.lmsKeepTime, {'10': 0, '30': 1, '60': 2, '120': 3}[value]);
                break;
            default: // Unknown key
                logger.warning(`Unhandled SET key ${key}`, 'zhc:legacy:tz:zg204zl_lms');
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'sensitivity':
                await sendDataPointEnum(entity, dataPoints.lmsSensitivity, 0, 'dataQuery' );
                break;
            case 'keep_time':
                await sendDataPointEnum(entity, dataPoints.lmsKeepTime, 0, 'dataQuery' );
                break;
            default: // Unknown key
                logger.warning(`Unhandled GET key ${key}`, 'zhc:legacy:tz:zg204zl_lms');
            }
        },
    } satisfies Tz.Converter,
    moes_cover: {
        key: ['backlight', 'calibration', 'motor_reversal', 'state', 'position'],
        options: [exposes.options.invert_cover()],
        convertSet: async (entity, key, value: any, meta) => {
            switch (key) {
            case 'position':
                if (value >= 0 && value <= 100) {
                    const invert = !isCoverInverted(meta.device.manufacturerName) ?
                        !meta.options.invert_cover : meta.options.invert_cover;
                    const position = invert ? 100 - value : value;
                    await sendDataPointValue(entity, dataPoints.coverPosition, position);
                    return {state: {position: value}};
                }
                break;
            case 'state': {
                // @ts-ignore
                const state = {'OPEN': 0, 'STOP': 1, 'CLOSE': 2}[value.toUpperCase()];
                await sendDataPointEnum(entity, dataPoints.state, state);
                break;
            }
            case 'backlight': {
                const backlight = value.toUpperCase() === 'ON' ? true : false;
                await sendDataPointBool(entity, dataPoints.moesCoverBacklight, backlight);
                return {state: {backlight: value}};
            }
            case 'calibration': {
                const calibration = value.toUpperCase() === 'ON' ? 0 : 1;
                await sendDataPointEnum(entity, dataPoints.moesCoverCalibration, calibration);
                break;
            }
            case 'motor_reversal': {
                const motorReversal = value.toUpperCase() === 'ON' ? 1 : 0;
                await sendDataPointEnum(entity, dataPoints.moesCoverMotorReversal, motorReversal);
                return {state: {motor_reversal: value}};
            }
            }
        },
    } satisfies Tz.Converter,
    hoch_din: {
        key: ['state',
            'child_lock',
            'countdown_timer',
            'power_on_behavior',
            'trip',
            'clear_device_data',
            /* TODO: Add the below keys when toZigbee converter work has been completed
            'voltage_setting',
            'current_setting',
            'temperature_setting',
            'leakage_current_setting'*/
        ],
        convertSet: async (entity, key, value: any, meta) => {
            if (key === 'state') {
                await sendDataPointBool(entity, dataPoints.state, value === 'ON');
                return {state: {state: value}};
            } else if (key === 'child_lock') {
                await sendDataPointBool(entity, dataPoints.hochChildLock, value === 'ON');
                return {state: {child_lock: value}};
            } else if (key === 'countdown_timer') {
                await sendDataPointValue(entity, dataPoints.hochCountdownTimer, value);
                return {state: {countdown_timer: value}};
            } else if (key === 'power_on_behavior') {
                const lookup: KeyValueAny = {'off': 0, 'on': 1, 'previous': 2};
                await sendDataPointEnum(entity, dataPoints.hochRelayStatus, lookup[value], 'sendData');
                return {state: {power_on_behavior: value}};
            } else if (key === 'trip') {
                if (value === 'clear') {
                    await sendDataPointBool(entity, dataPoints.hochLocking, true, 'sendData');
                }
                return {state: {trip: 'clear'}};
            } else if (key === 'clear_device_data') {
                await sendDataPointBool(entity, dataPoints.hochClearEnergy, true, 'sendData');
            /* TODO: Release the below with other toZigbee converters for device composites
            } else if (key === 'temperature_setting') {
                if (value.over_temperature_threshold && value.over_temperature_trip && value.over_temperature_alarm){
                    const payload = [];
                    payload.push(value.over_temperature_threshold < 1
                        ? ((value.over_temperature_threshold * -1) + 128)
                        : value.over_temperature_threshold);
                    payload.push(value.over_temperature_trip === 'ON' ? 1 : 0);
                    payload.push(value.over_temperature_alarm === 'ON' ? 1 : 0);
                    await sendDataPointRaw(entity, dataPoints.hochTemperatureThreshold, payload, 'sendData');
                    return {state: {over_temperature_threshold: value.over_temperature_threshold,
                        over_temperature_trip: value.over_temperature_trip,
                        over_temperature_alarm: value.over_temperature_alarm}};
                }*/
            } else {
                throw new Error(`Not supported: '${key}'`);
            }
        },
    } satisfies Tz.Converter,
};

const thermostatControlSequenceOfOperations = {
    0: 'cooling only',
    1: 'cooling with reheat',
    2: 'heating only',
    3: 'heating with reheat',
    4: 'cooling and heating 4-pipes',
    5: 'cooling and heating 4-pipes with reheat',
};

const thermostatSystemModes = {
    0: 'off',
    1: 'auto',
    3: 'cool',
    4: 'heat',
    5: 'emergency heating',
    6: 'precooling',
    7: 'fan_only',
    8: 'dry',
    9: 'Sleep',
};

const fromZigbee = {...fromZigbee1, ...fromZigbee2};
const toZigbee = {...toZigbee1, ...toZigbee2};


export {
    fromZigbee as fz,
    fromZigbee,
    toZigbee as tz,
    toZigbee,
    thermostatControlSequenceOfOperations,
    thermostatSystemModes,
    tuyaHPSCheckingResult,
    thermostatSystemModes2,
    thermostatSystemModes3,
    thermostatSystemModes4,
    thermostatPresets,
    giexWaterValve,
    msLookups,
    ZMLookups,
    firstDpValue,
    dpValueFromEnum,
    dataPoints,
    dpValueFromBool,
    dpValueFromIntValue,
    dpValueFromRaw,
    dpValueFromBitmap,
    dpValueFromStringBuffer,
    moesSwitch,
    getDataValue,
    getTypeName,
    logUnexpectedDataPoint,
    logUnexpectedDataType,
    getDataPointNames,
    getCoverStateEnums,
    convertDecimalValueTo4ByteHexArray,
    sendDataPoints,
    convertStringToHexArray,
    sendDataPoint,
    sendDataPointValue,
    sendDataPointBool,
    sendDataPointEnum,
    sendDataPointRaw,
    sendDataPointBitmap,
    sendDataPointStringBuffer,
    convertRawToCycleTimer,
    logDataPoint,
    convertWeekdaysTo1ByteHexArray,
    convertRawToTimer,
    logUnexpectedDataValue,
    isCoverInverted,
    convertDecimalValueTo2ByteHexArray,
    convertTimeTo2ByteHexArray,
    getMetaValue,
    tuyaGetDataValue,
};
