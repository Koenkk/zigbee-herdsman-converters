'use strict';

const constants = require('./constants');
const globalStore = require('./store');

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
const coverPositionInvert = ['_TZE200_wmcdj3aq', '_TZE200_nogaemzt', '_TZE200_xuzcvlku', '_TZE200_xaabybja'];

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
    localTemp: 3,
    coverArrived: 3,
    occupancy: 3,
    mode: 4,
    fanMode: 5,
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
    // Neo T&H
    neoPowerType: 101,
    neoMelody: 102,
    neoDuration: 103,
    neoAlarm: 104,
    neoTemp: 105,
    neoHumidity: 106,
    neoMinTemp: 107,
    neoMaxTemp: 108,
    neoMinHumidity: 109,
    neoMaxHumidity: 110,
    neoUnknown2: 112,
    neoTempAlarm: 113,
    neoHumidityAlarm: 114,
    neoUnknown3: 115,
    neoVolume: 116,
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
    fantemReportingTime: 102,
    fantemTempCalibration: 104,
    fantemHumidityCalibration: 105,
    fantemLuxCalibration: 106,
    fantemTemp: 107,
    fantemHumidity: 108,
    fantemMotionEnable: 109,
    fantemBattery: 110,
    fantemLedEnable: 111,
    fantemReportingEnable: 112,
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
    // tuya smart air box
    tuyaSabCO2: 2,
    tuyaSabTemp: 18,
    tuyaSabHumidity: 19,
    tuyaSabVOC: 21,
    tuyaSabFormaldehyd: 22,
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
    trsScene: 112,
    trsMotionDirection: 114,
    trsMotionSpeed: 115,
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
    nousTempAlarm: 14,
    nousTempSensitivity: 19,
    // TUYA / HUMIDITY/ILLUMINANCE/TEMPERATURE SENSOR
    thitBatteryPercentage: 3,
    thitIlluminanceLux: 7,
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

module.exports = {
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
    dataTypes,
    dataPoints,
    dpValueFromIntValue,
    dpValueFromBool,
    dpValueFromEnum,
    dpValueFromStringBuffer,
    dpValueFromRaw,
    dpValueFromBitmap,
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
};
