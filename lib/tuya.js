'use strict';

const constants = require('./constants');
const globalStore = require('./store');
const exposes = require('./exposes');
const utils = require('./utils');
const e = exposes.presets;
const ea = exposes.access;

const dataTypes = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    // Destructuring "chunks" is needed because it's a Buffer
    // and we need a simple array.
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

function firstDpValue(msg, meta, converterName) {
    const dpValues = msg.data.dpValues;
    for (let index = 1; index < dpValues.length; index++) {
        meta.logger.warn(`zigbee-herdsman-converters:${converterName}: Additional DP #${
            dpValues[index].dp} with data ${JSON.stringify(dpValues[index])} will be ignored! ` +
            'Use a for loop in the fromZigbee converter (see ' +
            'https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html)');
    }
    return dpValues[0];
}


function getDataValue(dpValue) {
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

function getTypeName(dpValue) {
    const entry = Object.entries(dataTypes).find(([typeName, typeId]) => typeId === dpValue.datatype);
    return (entry ? entry[0] : 'unknown');
}

function getDataPointNames(dpValue) {
    const entries = Object.entries(dataPoints).filter(([dpName, dpId]) => dpId === dpValue.dp);
    return entries.map(([dpName, dpId]) => dpName);
}

function logDataPoint(where, msg, dpValue, meta) {
    meta.logger.info(`zigbee-herdsman-converters:${where}: Received Tuya DataPoint #${
        dpValue.dp} from ${meta.device.ieeeAddr} with raw data '${JSON.stringify(dpValue)}': type='${
        msg.type}', datatype='${getTypeName(dpValue)}', value='${
        getDataValue(dpValue)}', known DP# usage: ${JSON.stringify(getDataPointNames(dpValue))}`);
}

function logUnexpectedDataPoint(where, msg, dpValue, meta) {
    meta.logger.warn(`zigbee-herdsman-converters:${where}: Received unexpected Tuya DataPoint #${
        dpValue.dp} from ${meta.device.ieeeAddr} with raw data '${JSON.stringify(dpValue)}': type='${
        msg.type}', datatype='${getTypeName(dpValue)}', value='${
        getDataValue(dpValue)}', known DP# usage: ${JSON.stringify(getDataPointNames(dpValue))}`);
}

function logUnexpectedDataType(where, msg, dpValue, meta, expectedDataType) {
    meta.logger.warn(`zigbee-herdsman-converters:${where}: Received Tuya DataPoint #${
        dpValue.dp} with unexpected datatype from ${meta.device.ieeeAddr} with raw data '${
        JSON.stringify(dpValue)}': type='${msg.type}', datatype='${
        getTypeName(dpValue)}' (instead of '${expectedDataType}'), value='${
        getDataValue(dpValue)}', known DP# usage: ${JSON.stringify(getDataPointNames(dpValue))}`);
}

function logUnexpectedDataValue(where, msg, dpValue, meta, valueKind, expectedMinValue=null, expectedMaxValue=null) {
    if (expectedMinValue === null) {
        if (expectedMaxValue === null) {
            meta.logger.warn(`zigbee-herdsman-converters:${where}: Received Tuya DataPoint #${dpValue.dp
            } with invalid value ${getDataValue(dpValue)} for ${valueKind} from ${meta.device.ieeeAddr}`);
        } else {
            meta.logger.warn(`zigbee-herdsman-converters:${where}: Received Tuya DataPoint #${dpValue.dp
            } with invalid value ${getDataValue(dpValue)} for ${valueKind} from ${meta.device.ieeeAddr
            } which is higher than the expected maximum of ${expectedMaxValue}`);
        }
    } else {
        if (expectedMaxValue === null) {
            meta.logger.warn(`zigbee-herdsman-converters:${where}: Received Tuya DataPoint #${dpValue.dp
            } with invalid value ${getDataValue(dpValue)} for ${valueKind} from ${meta.device.ieeeAddr
            } which is lower than the expected minimum of ${expectedMinValue}`);
        } else {
            meta.logger.warn(`zigbee-herdsman-converters:${where}: Received Tuya DataPoint #${dpValue.dp
            } with invalid value ${getDataValue(dpValue)} for ${valueKind} from ${meta.device.ieeeAddr
            } which is outside the expected range from ${expectedMinValue} to ${expectedMaxValue}`);
        }
    }
}

function convertRawToCycleTimer(value) {
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
            weekdays = (value[3] & 0x40 ? 'Sa' : '') +
            (value[3] & 0x20 ? 'Fr' : '') +
            (value[3] & 0x10 ? 'Th' : '') +
            (value[3] & 0x08 ? 'We' : '') +
            (value[3] & 0x04 ? 'Tu' : '') +
            (value[3] & 0x02 ? 'Mo' : '') +
            (value[3] & 0x01 ? 'Su' : '');
        } else {
            weekdays = 'once';
        }
        let minsincemidnight = value[4] * 256 + value[5];
        starttime = String(parseInt(minsincemidnight / 60)).padStart(2, '0') + ':' + String(minsincemidnight % 60).padStart(2, '0');
        minsincemidnight = value[6] * 256 + value[7];
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

function convertRawToTimer(value) {
    let timernr = 0;
    let starttime = '00:00';
    let duration = 0;
    let weekdays = 'once';
    let timeractive = '';
    if (value.length > 12) {
        timernr = value[1];
        const minsincemidnight = value[2] * 256 + value[3];
        starttime = String(parseInt(minsincemidnight / 60)).padStart(2, '0') + ':' + String(minsincemidnight % 60).padStart(2, '0');
        duration = value[4] * 256 + value[5];
        if (value[6] > 0) {
            weekdays = (value[6] & 0x40 ? 'Sa' : '') +
            (value[6] & 0x20 ? 'Fr' : '') +
            (value[6] & 0x10 ? 'Th' : '') +
            (value[6] & 0x08 ? 'We' : '') +
            (value[6] & 0x04 ? 'Tu' : '') +
            (value[6] & 0x02 ? 'Mo' : '') +
            (value[6] & 0x01 ? 'Su' : '');
        } else {
            weekdays = 'once';
        }
        timeractive = value[8];
    }
    return {timernr: timernr, time: starttime, duration: duration, weekdays: weekdays, active: timeractive};
}

function convertTimeTo2ByteHexArray(time) {
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

function convertWeekdaysTo1ByteHexArray(weekdays) {
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

function convertDecimalValueTo4ByteHexArray(value) {
    const hexValue = Number(value).toString(16).padStart(8, '0');
    const chunk1 = hexValue.substr(0, 2);
    const chunk2 = hexValue.substr(2, 2);
    const chunk3 = hexValue.substr(4, 2);
    const chunk4 = hexValue.substr(6);
    return [chunk1, chunk2, chunk3, chunk4].map((hexVal) => parseInt(hexVal, 16));
}

function convertDecimalValueTo2ByteHexArray(value) {
    const hexValue = Number(value).toString(16).padStart(4, '0');
    const chunk1 = hexValue.substr(0, 2);
    const chunk2 = hexValue.substr(2);
    return [chunk1, chunk2].map((hexVal) => parseInt(hexVal, 16));
}

async function onEventMeasurementPoll(type, data, device, options) {
    const endpoint = device.getEndpoint(1);
    if (type === 'stop') {
        clearInterval(globalStore.getValue(device, 'interval'));
        globalStore.clearValue(device, 'interval');
    } else if (!globalStore.hasValue(device, 'interval')) {
        const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 60;
        if (seconds === -1) return;
        const interval = setInterval(async () => {
            try {
                await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
            } catch (error) {/* Do nothing*/}
        }, seconds*1000);
        globalStore.putValue(device, 'interval', interval);
    }
}

async function onEventSetTime(type, data, device) {
    // FIXME: Need to join onEventSetTime/onEventSetLocalTime to one command

    if (data.type === 'commandMcuSyncTime' && data.cluster === 'manuSpecificTuya') {
        try {
            const utcTime = Math.round(((new Date()).getTime() - constants.OneJanuary2000) / 1000);
            const localTime = utcTime - (new Date()).getTimezoneOffset() * 60;
            const endpoint = device.getEndpoint(1);

            const payload = {
                payloadSize: 8,
                payload: [
                    ...convertDecimalValueTo4ByteHexArray(utcTime),
                    ...convertDecimalValueTo4ByteHexArray(localTime),
                ],
            };
            await endpoint.command('manuSpecificTuya', 'mcuSyncTime', payload, {});
        } catch (error) {
            // endpoint.command can throw an error which needs to
            // be caught or the zigbee-herdsman may crash
            // Debug message is handled in the zigbee-herdsman
        }
    }
}

// set UTC and Local Time as total number of seconds from 00: 00: 00 on January 01, 1970
// force to update every device time every hour due to very poor clock
async function onEventSetLocalTime(type, data, device) {
    // FIXME: What actually nextLocalTimeUpdate/forceTimeUpdate do?
    //  I did not find any timers or something else where it was used.
    //  Actually, there are two ways to set time on TuYa MCU devices:
    //  1. Respond to the `commandMcuSyncTime` event
    //  2. Just send `mcuSyncTime` anytime (by 1-hour timer or something else)

    const nextLocalTimeUpdate = globalStore.getValue(device, 'nextLocalTimeUpdate');
    const forceTimeUpdate = nextLocalTimeUpdate == null || nextLocalTimeUpdate < new Date().getTime();

    if ((data.type === 'commandMcuSyncTime' && data.cluster === 'manuSpecificTuya') || forceTimeUpdate) {
        globalStore.putValue(device, 'nextLocalTimeUpdate', new Date().getTime() + 3600 * 1000);

        try {
            const utcTime = Math.round(((new Date()).getTime()) / 1000);
            const localTime = utcTime - (new Date()).getTimezoneOffset() * 60;
            const endpoint = device.getEndpoint(1);

            const payload = {
                payloadSize: 8,
                payload: [
                    ...convertDecimalValueTo4ByteHexArray(utcTime),
                    ...convertDecimalValueTo4ByteHexArray(localTime),
                ],
            };
            await endpoint.command('manuSpecificTuya', 'mcuSyncTime', payload, {});
        } catch (error) {
            // endpoint.command can throw an error which needs to
            // be caught or the zigbee-herdsman may crash
            // Debug message is handled in the zigbee-herdsman
        }
    }
}

function convertStringToHexArray(value) {
    const asciiKeys = [];
    for (let i = 0; i < value.length; i ++) {
        asciiKeys.push(value[i].charCodeAt(0));
    }
    return asciiKeys;
}

// Contains all covers which need their position inverted by default
// Default is 100 = open, 0 = closed; Devices listed here will use 0 = open, 100 = closed instead
// Use manufacturerName to identify device!
// Dont' invert _TZE200_cowvfni3: https://github.com/Koenkk/zigbee2mqtt/issues/6043
const coverPositionInvert = ['_TZE200_wmcdj3aq', '_TZE200_nogaemzt', '_TZE200_xuzcvlku', '_TZE200_xaabybja', '_TZE200_rmymn92d',
    '_TZE200_gubdgai2'];

// Gets a boolean indicating whether the cover by this manufacturerName needs reversed positions
function isCoverInverted(manufacturerName) {
    // Return true if cover is listed in coverPositionInvert
    // Return false by default, not inverted
    return coverPositionInvert.includes(manufacturerName);
}

const coverStateOverride = {
    // Contains all covers which differentiate from the default enum states
    // Use manufacturerName to identify device!
    // https://github.com/Koenkk/zigbee2mqtt/issues/5596#issuecomment-759408189
    '_TZE200_rddyvrci': {close: 1, open: 2, stop: 0},
    '_TZE200_wmcdj3aq': {close: 0, open: 2, stop: 1},
    '_TZE200_cowvfni3': {close: 0, open: 2, stop: 1},
    '_TYST11_cowvfni3': {close: 0, open: 2, stop: 1},
};

// Gets an array containing which enums have to be used in order for the correct close/open/stop commands to be sent
function getCoverStateEnums(manufacturerName) {
    if (manufacturerName in coverStateOverride) {
        return coverStateOverride[manufacturerName];
    } else {
        return {close: 2, open: 0, stop: 1}; // defaults
    }
}

const thermostatSystemModes = {
    0: 'off',
    1: 'auto',
    2: 'manual',
    3: 'comfort',
    4: 'eco',
    5: 'boost',
    6: 'complex',
};

const thermostatSystemModes2 = {
    0: 'auto',
    1: 'cool',
    2: 'heat',
    3: 'dry',
    4: 'fan',
};

const thermostatSystemModes3 = {
    0: 'auto',
    1: 'heat',
    2: 'off',
};

const thermostatSystemModes4 = {
    0: 'off',
    1: 'auto',
    2: 'heat',
};

const dataPoints = {
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
    lidlTimer: 5,
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
    // Haozee TS0601 TRV
    haozeeSystemMode: 1,
    haozeeHeatingSetpoint: 2,
    haozeeLocalTemp: 3,
    haozeeBoostHeating: 4,
    haozeeBoostHeatingCountdown: 5,
    haozeeRunningState: 6,
    haozeeWindowState: 7,
    haozeeWindowDetection: 8,
    haozeeChildLock: 12,
    haozeeBattery: 13,
    haozeeFaultAlarm: 14,
    haozeeMinTemp: 15,
    haozeeMaxTemp: 16,
    haozeeScheduleMonday: 17,
    haozeeScheduleTuesday: 18,
    haozeeScheduleWednesday: 19,
    haozeeScheduleThursday: 20,
    haozeeScheduleFriday: 21,
    haozeeScheduleSaturday: 22,
    haozeeScheduleSunday: 23,
    haozeeTempCalibration: 101,
    haozeeValvePosition: 102,
    haozeeSoftVersion: 150,
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
    // Connecte thermostat
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
    // TuYa Smart Human Presense Sensor
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
};

const thermostatWeekFormat = {
    0: '5+2',
    1: '6+1',
    2: '7',
};

const thermostatForceMode = {
    0: 'normal',
    1: 'open',
    2: 'close',
};

const thermostatPresets = {
    0: 'away',
    1: 'schedule',
    2: 'manual',
    3: 'comfort',
    4: 'eco',
    5: 'boost',
    6: 'complex',
};

const thermostatScheduleMode = {
    1: 'single', // One schedule for all days
    2: 'weekday/weekend', // Weekdays(2-5) and Holidays(6-1)
    3: 'weekday/sat/sun', // Weekdays(2-6), Saturday(7), Sunday(1)
    4: '7day', // 7 day schedule
};

const silvercrestModes = {
    white: 0,
    color: 1,
    effect: 2,
};

const silvercrestEffects = {
    steady: '00',
    snow: '01',
    rainbow: '02',
    snake: '03',
    twinkle: '04',
    firework: '08',
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

const fanModes = {
    0: 'low',
    1: 'medium',
    2: 'high',
    3: 'auto',
};

// Radar sensor lookups
const tuyaRadar = {
    radarScene: {
        0: 'default',
        1: 'area',
        2: 'toilet',
        3: 'bedroom',
        4: 'parlour',
        5: 'office',
        6: 'hotel',
    },
    motionDirection: {
        0: 'standing_still',
        1: 'moving_forward',
        2: 'moving_backward',
    },
    fallDown: {
        0: 'none',
        1: 'maybe_fall',
        2: 'fall',
    },
};

// Motion sensor lookups
const msLookups = {
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

const tvThermostatMode = {
    0: 'off',
    1: 'heat',
    2: 'auto',
};


const tvThermostatPreset = {
    0: 'auto',
    1: 'manual',
    3: 'holiday',
};
// Zemismart ZM_AM02 Roller Shade Converter
const ZMLookups = {
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

const moesSwitch = {
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
const tuyaHPSCheckingResult = {
    0: 'checking',
    1: 'check_success',
    2: 'check_failure',
    3: 'others',
    4: 'comm_fault',
    5: 'radar_fault',
};

// Return `seq` - transaction ID for handling concrete response
async function sendDataPoints(entity, dpValues, cmd, seq=undefined) {
    if (seq === undefined) {
        if (sendDataPoints.seq === undefined) {
            sendDataPoints.seq = 0;
        } else {
            sendDataPoints.seq++;
            sendDataPoints.seq %= 0xFFFF;
        }
        seq = sendDataPoints.seq;
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

function dpValueFromIntValue(dp, value) {
    return {dp, datatype: dataTypes.value, data: convertDecimalValueTo4ByteHexArray(value)};
}

function dpValueFromBool(dp, value) {
    return {dp, datatype: dataTypes.bool, data: [value ? 1 : 0]};
}

function dpValueFromEnum(dp, value) {
    return {dp, datatype: dataTypes.enum, data: [value]};
}

function dpValueFromStringBuffer(dp, stringBuffer) {
    return {dp, datatype: dataTypes.string, data: stringBuffer};
}

function dpValueFromRaw(dp, rawBuffer) {
    return {dp, datatype: dataTypes.raw, data: rawBuffer};
}

function dpValueFromBitmap(dp, bitmapBuffer) {
    return {dp, datatype: dataTypes.bitmap, data: bitmapBuffer};
}

// Return `seq` - transaction ID for handling concrete response
async function sendDataPoint(entity, dpValue, cmd, seq=undefined) {
    return await sendDataPoints(entity, [dpValue], cmd, seq);
}

async function sendDataPointValue(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(
        entity,
        [dpValueFromIntValue(dp, value)],
        cmd,
        seq,
    );
}

async function sendDataPointBool(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(
        entity,
        [dpValueFromBool(dp, value)],
        cmd,
        seq,
    );
}

async function sendDataPointEnum(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(
        entity,
        [dpValueFromEnum(dp, value)],
        cmd,
        seq,
    );
}

async function sendDataPointRaw(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(
        entity,
        [dpValueFromRaw(dp, value)],
        cmd,
        seq,
    );
}

async function sendDataPointBitmap(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(
        entity,
        [dpValueFromBitmap(dp, value)],
        cmd,
        seq,
    );
}

async function sendDataPointStringBuffer(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(
        entity,
        [dpValueFromStringBuffer(dp, value)],
        cmd,
        seq,
    );
}

const tuyaExposes = {
    powerOnBehavior: () => exposes.enum('power_on_behavior', ea.STATE_SET, ['off', 'on', 'previous'])
        .withDescription('Controls the behavior when the device is powered on'),
    lightType: () => exposes.enum('light_type', ea.STATE_SET, ['led', 'incandescent', 'halogen'])
        .withDescription('Type of light attached to the device'),
    lightBrightnessWithMinMax: () => e.light_brightness().withMinBrightness().withMaxBrightness()
        .setAccess('state', ea.STATE_SET)
        .setAccess('brightness', ea.STATE_SET)
        .setAccess('min_brightness', ea.STATE_SET)
        .setAccess('max_brightness', ea.STATE_SET),
    lightBrightness: () => e.light_brightness()
        .setAccess('state', ea.STATE_SET)
        .setAccess('brightness', ea.STATE_SET),
    countdown: () => exposes.numeric('countdown', ea.STATE_SET).withValueMin(0).withValueMax(43200).withValueStep(1).withUnit('s')
        .withDescription('Countdown to turn device off after a certain time'),
    switch: () => e.switch().setAccess('state', ea.STATE_SET),
    selfTest: () => exposes.binary('self_test', ea.STATE_SET, true, false)
        .withDescription('Indicates whether the device is being self-tested'),
    selfTestResult: () => exposes.enum('self_test_result', ea.STATE, ['checking', 'success', 'failure', 'others'])
        .withDescription('Result of the self-test'),
    faultAlarm: () => exposes.binary('fault_alarm', ea.STATE, true, false).withDescription('Indicates whether a fault was detected'),
    silence: () => exposes.binary('silence', ea.STATE_SET, true, false).withDescription('Silence the alarm'),
};

const skip = {
    // Prevent state from being published when already ON and brightness is also published.
    // This prevents 100% -> X% brightness jumps when the switch is already on
    // https://github.com/Koenkk/zigbee2mqtt/issues/13800#issuecomment-1263592783
    stateOnAndBrightnessPresent: (meta) => meta.message.hasOwnProperty('brightness') && meta.state.state === 'ON',
};

const configureMagicPacket = async (device, coordinatorEndpoint, logger) => {
    const endpoint = device.endpoints[0];
    await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
};

const fingerprint = (modelID, manufacturerNames) => {
    return manufacturerNames.map((manufacturerName) => {
        return {modelID, manufacturerName};
    });
};

class Base {
    constructor(value) {
        this.value = value;
    }

    valueOf() {
        return this.value;
    }
}
class Enum extends Base {
    constructor(value) {
        super(value);
    }
}

class Bitmap extends Base {
    constructor(value) {
        super(value);
    }
}

const valueConverterBasic = {
    lookup: (map) => {
        return {
            to: (v) => {
                if (map[v] === undefined) throw new Error(`Value '${v}' is not allowed, expected one of ${Object.keys(map)}`);
                return map[v];
            },
            from: (v) => {
                const value = Object.entries(map).find((i) => i[1].valueOf() === v);
                if (!value) throw new Error(`Value '${v}' is not allowed, expected one of ${Object.values(map)}`);
                return value[0];
            },
        };
    },
    scale: (min1, max1, min2, max2) => {
        return {to: (v) => utils.mapNumberRange(v, min1, max1, min2, max2), from: (v) => utils.mapNumberRange(v, min2, max2, min1, max1)};
    },
    raw: () => {
        return {to: (v) => v, from: (v) => v};
    },
    divideBy: (value) => {
        return {to: (v) => v * value, from: (v) => v / value};
    },
};

const valueConverter = {
    trueFalse: valueConverterBasic.lookup({1: true, 0: false}),
    onOff: valueConverterBasic.lookup({'ON': true, 'OFF': false}),
    powerOnBehavior: valueConverterBasic.lookup({'off': 0, 'on': 1, 'previous': 2}),
    lightType: valueConverterBasic.lookup({'led': 0, 'incandescent': 1, 'halogen': 2}),
    countdown: valueConverterBasic.raw,
    scale0_254to0_1000: valueConverterBasic.scale(0, 254, 0, 1000),
    scale0_1to0_1000: valueConverterBasic.scale(0, 1, 0, 1000),
    divideBy100: valueConverterBasic.divideBy(100),
    divideBy10: valueConverterBasic.divideBy(10),
    raw: valueConverterBasic.raw(),
    phaseA: {
        from: (v) => {
            const buffer = Buffer.from(v, 'base64');
            return {voltage: (buffer[14] | buffer[13] << 8) / 10, current: (buffer[12] | buffer[11] << 8) / 1000};
        },
    },
    true0ElseFalse: {from: (v) => v === 0},
    selfTestResult: valueConverterBasic.lookup({'checking': 0, 'success': 1, 'failure': 2, 'others': 3}),
    lockUnlock: valueConverterBasic.lookup({'LOCK': true, 'UNLOCK': false}),
    localTempCalibration: {
        from: (v) => {
            if (v > 55) v -= 0x100000000;
            return v / 10;
        },
        to: (v) => {
            if (v > 0) return v * 10;
            if (v < 0) return v * 10 + 0x100000000;
            return v;
        },
    },
    thermostatHolidayStartStop: {
        from: (v) => {
            const start = {
                year: v.slice(0, 4), month: v.slice(4, 6), day: v.slice(6, 8),
                hours: v.slice(8, 10), minutes: v.slice(10, 12),
            };
            const end = {
                year: v.slice(12, 16), month: v.slice(16, 18), day: v.slice(18, 20),
                hours: v.slice(20, 22), minutes: v.slice(22, 24),
            };
            const startStr = `${start.year}/${start.month}/${start.day} ${start.hours}:${start.minutes}`;
            const endStr = `${end.year}/${end.month}/${end.day} ${end.hours}:${end.minutes}`;
            return `${startStr} | ${endStr}`;
        },
        to: (v) => {
            const numberPattern = /\d+/g;
            return v.match(numberPattern).join([]).toString();
        },
    },
    thermostatScheduleDay: {
        from: (v) => {
            // day splitted to 10 min segments = total 144 segments
            const maxPeriodsInDay = 10;
            const periodSize = 3;
            const schedule = [];

            for (let i = 0; i < maxPeriodsInDay; i++) {
                const time = v[i * periodSize];
                const totalMinutes = time * 10;
                const hours = totalMinutes / 60;
                const rHours = Math.floor(hours);
                const minutes = (hours - rHours) * 60;
                const rMinutes = Math.round(minutes);
                const strHours = rHours.toString().padStart(2, '0');
                const strMinutes = rMinutes.toString().padStart(2, '0');
                const temp = parseFloat(v[i * periodSize + 2] / 10);
                schedule.push(`${strHours}:${strMinutes}/${temp}`);
                if (rHours === 24) break;
            }

            return schedule.join(' ');
        },
        to: (v, meta) => {
            const dayByte = {
                monday: 1, tuesday: 2, wednesday: 4, thursday: 8,
                friday: 16, saturday: 32, sunday: 64,
            };
            const weekDay = v.week_day;
            if (Object.keys(dayByte).indexOf(weekDay) === -1) {
                throw new Error('Invalid "week_day" property value: ' + weekDay);
            }
            let weekScheduleType;
            if (meta.state && meta.state.working_day) weekScheduleType = meta.state.working_day;
            const payload = [];

            switch (weekScheduleType) {
            case 'mon_sun':
                payload.push(127);
                break;
            case 'mon_fri+sat+sun':
                if (['saturday', 'sunday'].indexOf(weekDay) === -1) {
                    payload.push(31);
                    break;
                }
                payload.push(dayByte[weekDay]);
                break;
            case 'separate':
                payload.push(dayByte[weekDay]);
                break;
            default:
                throw new Error('Invalid "working_day" property, need to set it before');
            }

            // day splitted to 10 min segments = total 144 segments
            const maxPeriodsInDay = 10;
            const schedule = v.schedule.split(' ');
            const schedulePeriods = schedule.length;
            if (schedulePeriods > 10) throw new Error('There cannot be more than 10 periods in the schedule: ' + v);
            if (schedulePeriods < 2) throw new Error('There cannot be less than 2 periods in the schedule: ' + v);
            let prevHour;

            for (const period of schedule) {
                const timeTemp = period.split('/');
                const hm = timeTemp[0].split(':', 2);
                const h = parseInt(hm[0]);
                const m = parseInt(hm[1]);
                const temp = parseFloat(timeTemp[1]);
                if (h < 0 || h > 24 || m < 0 || m >= 60 || m % 10 !== 0 || temp < 5 || temp > 30 || temp % 0.5 !== 0) {
                    throw new Error('Invalid hour, minute or temperature of: ' + period);
                } else if (prevHour > h) {
                    throw new Error(`The hour of the next segment can't be less than the previous one: ${prevHour} > ${h}`);
                }
                prevHour = h;
                const segment = (h * 60 + m) / 10;
                payload.push(segment, 0, temp * 10);
            }

            // Add "technical" periods to be valid payload
            for (let i = 0; i < maxPeriodsInDay - schedulePeriods; i++) {
                // by default it sends 9000b2, it's 24 hours and 18 degrees
                payload.push(144, 0, 180);
            }

            return payload;
        },
    },
    TV02SystemMode: {
        from: (v) => {
            return {system_mode: v === false ? 'heat' : 'off', heating_stop: v === false ? 'OFF' : 'ON'};
        },
    },
    onOffNotStrict: {from: (v) => v ? 'ON' : 'OFF', to: (v) => v === 'ON'},
};

const tzDataPoints = {
    key: [
        'state', 'brightness', 'min_brightness', 'max_brightness', 'power_on_behavior',
        'countdown', 'light_type', 'silence', 'self_test', 'child_lock', 'open_window', 'open_window_temperature', 'frost_protection',
        'system_mode', 'heating_stop', 'current_heating_setpoint', 'local_temperature_calibration', 'preset', 'boost_timeset_countdown',
        'holiday_start_stop', 'holiday_temperature', 'comfort_temperature', 'eco_temperature', 'working_day', 'week_schedule_programming',
        'online', 'holiday_mode_date', 'schedule',
    ],
    convertSet: async (entity, key, value, meta) => {
        // A set converter is only called once; therefore we need to loop
        const state = {};
        if (!meta.mapped.meta || !meta.mapped.meta.tuyaDatapoints) throw new Error('No datapoints map defined');
        const datapoints = meta.mapped.meta.tuyaDatapoints;
        for (const [key, value] of Object.entries(meta.message)) {
            const convertedKey = meta.mapped.meta.multiEndpoint ? `${key}_${meta.endpoint_name}` : key;
            const dpEntry = datapoints.find((d) => d[1] === convertedKey);
            if (!dpEntry || !dpEntry[1]) {
                throw new Error(`No datapoint defined for '${key}'`);
            }
            if (dpEntry[3] && dpEntry[3].skip && dpEntry[3].skip(meta)) continue;
            const dpId = dpEntry[0];
            const convertedValue = dpEntry[2].to(value, meta);
            if (typeof convertedValue === 'boolean') {
                await sendDataPointBool(entity, dpId, convertedValue, 'dataRequest', 1);
            } else if (typeof convertedValue === 'number') {
                await sendDataPointValue(entity, dpId, convertedValue, 'dataRequest', 1);
            } else if (typeof convertedValue === 'string') {
                await sendDataPointStringBuffer(entity, dpId, convertedValue, 'dataRequest', 1);
            } else if (Array.isArray(convertedValue)) {
                await sendDataPointRaw(entity, dpId, convertedValue, 'dataRequest', 1);
            } else if (convertedValue instanceof Enum) {
                await sendDataPointEnum(entity, dpId, convertedValue.valueOf(), 'dataRequest', 1);
            } else if (convertedValue instanceof Bitmap) {
                await sendDataPointBitmap(entity, dpId, convertedValue.valueOf(), 'dataRequest', 1);
            } else {
                throw new Error(`Don't know how to send type '${typeof convertedValue}'`);
            }
            state[key] = value;
        }
        return {state};
    },
};

const fzDataPoints = {
    cluster: 'manuSpecificTuya',
    type: ['commandDataResponse', 'commandDataReport'],
    convert: (model, msg, publish, options, meta) => {
        let result = {};
        if (!model.meta || !model.meta.tuyaDatapoints) throw new Error('No datapoints map defined');
        const datapoints = model.meta.tuyaDatapoints;
        for (const dpValue of msg.data.dpValues) {
            const dpId = dpValue.dp;
            const dpEntry = datapoints.find((d) => d[0] === dpId);
            if (dpEntry) {
                const value = getDataValue(dpValue);
                if (dpEntry[1]) {
                    result[dpEntry[1]] = dpEntry[2].from(value, meta);
                } else if (dpEntry[2]) {
                    result = {...result, ...dpEntry[2].from(value, meta)};
                }
            } else {
                meta.logger.warn(`Datapoint ${dpId} not defined for '${meta.device.manufacturerName}' ` +
                    `with data ${JSON.stringify(dpValue)}`);
            }
        }
        return result;
    },
};

module.exports = {
    exposes: tuyaExposes,
    skip,
    configureMagicPacket,
    fingerprint,
    enum: (value) => new Enum(value),
    bitmap: (value) => new Bitmap(value),
    valueConverter,
    valueConverterBasic,
    tzDataPoints,
    fzDataPoints,
    sendDataPoint,
    sendDataPoints,
    sendDataPointValue,
    sendDataPointBool,
    sendDataPointEnum,
    sendDataPointBitmap,
    sendDataPointRaw,
    sendDataPointStringBuffer,
    firstDpValue,
    getDataValue,
    getTypeName,
    getDataPointNames,
    logDataPoint,
    logUnexpectedDataPoint,
    logUnexpectedDataType,
    logUnexpectedDataValue,
    dataTypes,
    dataPoints,
    dpValueFromIntValue,
    dpValueFromBool,
    dpValueFromEnum,
    dpValueFromStringBuffer,
    dpValueFromRaw,
    dpValueFromBitmap,
    convertRawToCycleTimer,
    convertRawToTimer,
    convertTimeTo2ByteHexArray,
    convertWeekdaysTo1ByteHexArray,
    convertDecimalValueTo4ByteHexArray,
    convertDecimalValueTo2ByteHexArray,
    onEventSetTime,
    onEventSetLocalTime,
    onEventMeasurementPoll,
    convertStringToHexArray,
    isCoverInverted,
    getCoverStateEnums,
    thermostatSystemModes4,
    thermostatSystemModes3,
    thermostatSystemModes2,
    thermostatSystemModes,
    thermostatWeekFormat,
    thermostatForceMode,
    thermostatPresets,
    thermostatScheduleMode,
    silvercrestModes,
    silvercrestEffects,
    fanModes,
    msLookups,
    tvThermostatMode,
    tvThermostatPreset,
    tuyaRadar,
    ZMLookups,
    moesSwitch,
    tuyaHPSCheckingResult,
};
