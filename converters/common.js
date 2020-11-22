'use strict';

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
    7: 'fan only',
    8: 'dry',
    9: 'Sleep',
};
const thermostatRunningStates = {
    0: 'idle',
    1: 'heat',
    2: 'cool',
    4: 'fan only',
    5: 'heat',
    6: 'cool',
    8: 'heat',
    9: 'heat',
    A: 'heat',
    D: 'heat',
    10: 'cool',
    12: 'cool',
    14: 'cool',
    15: 'cool',
};
const fanMode = {
    'off': 0,
    'low': 1,
    'medium': 2,
    'high': 3,
    'on': 4,
    'auto': 5,
    'smart': 6,
};
const temperatureDisplayMode = {
    0: 'celsius',
    1: 'fahrenheit',
};
const keypadLockoutMode = {
    0: 'unlock',
    1: 'lock1',
    2: 'lock2',
    3: 'lock3',
    4: 'lock4',
    5: 'lock5',
};

const TuyaThermostatSystemModes = {
    0: 'off',
    1: 'auto',
    2: 'manual',
    3: 'comfort',
    4: 'eco',
    5: 'boost',
    6: 'complex',
};
const TuyaThermostatPresets = {
    0: 'away',
    1: 'schedule',
    2: 'manual',
    3: 'comfort',
    4: 'eco',
    5: 'boost',
    6: 'complex',
};

const TuyaThermostatSystemModes2 = {
    0: 'auto',
    1: 'cool',
    2: 'heat',
    3: 'dry',
    4: 'fan',
};

const TuyaFanModes = {
    0: 'low',
    1: 'medium',
    2: 'high',
    3: 'auto',
};

const TuyaThermostatWeekFormat = {
    0: '5+2',
    1: '6+1',
    2: '7',
};

const TuyaThermostatForceMode = {
    0: 'normal',
    1: 'open',
    2: 'close',
};

const TuyaThermostatScheduleMode = {
    1: 'single', // One schedule for all days
    2: 'weekday/weekend', // Weekdays(2-5) and Holidays(6-1)
    3: 'weekday/sat/sun', // Weekdays(2-6), Saturday(7), Sunday(1)
    4: '7day', // 7 day schedule
};

const TuyaDataTypes = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const TuyaDataPoints = {
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
    moesMinTemp: 20,
    moesLocalTemp: 24,
    moesTempCalibration: 27,
    moesValve: 36,
    moesChildLock: 40,
    moesSensor: 43,
    moesSchedule: 101,
    etopErrorStatus: 13,
    // Neo T&H
    neoUnknown1: 101,
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
};

const lockSourceName = {
    0: 'keypad',
    1: 'rf',
    2: 'manual',
    3: 'rfid',
};

const armMode = {
    0: 'disarm',
    1: 'arm_day_zones',
    2: 'arm_night_zones',
    3: 'arm_all_zones',
    4: 'invalid_code',
};

const zclStatus = {
    0: 'SUCCESS',
    1: 'FAILURE',
    126: 'NOT_AUTHORIZED',
    127: 'RESERVED_FIELD_NOT_ZERO',
    128: 'MALFORMED_COMMAND',
    129: 'UNSUP_CLUSTER_COMMAND',
    130: 'UNSUP_GENERAL_COMMAND',
    131: 'UNSUP_MANUF_CLUSTER_COMMAND',
    132: 'UNSUP_MANUF_GENERAL_COMMAND',
    133: 'INVALID_FIELD',
    134: 'UNSUPPORTED_ATTRIBUTE',
    135: 'INVALID_VALUE',
    136: 'READ_ONLY',
    137: 'INSUFFICIENT_SPACE',
    138: 'DUPLICATE_EXISTS',
    139: 'NOT_FOUND',
    140: 'UNREPORTABLE_ATTRIBUTE',
    141: 'INVALID_DATA_TYPE',
    142: 'INVALID_SELECTOR',
    143: 'WRITE_ONLY',
    144: 'INCONSISTENT_STARTUP_STATE',
    145: 'DEFINED_OUT_OF_BAND',
    146: 'INCONSISTENT',
    147: 'ACTION_DENIED',
    148: 'TIMEOUT',
    149: 'ABORT',
    150: 'INVALID_IMAGE',
    151: 'WAIT_FOR_DATA',
    152: 'NO_IMAGE_AVAILABLE',
    153: 'REQUIRE_MORE_IMAGE',
    154: 'NOTIFICATION_PENDING',
    192: 'HARDWARE_FAILURE',
    193: 'SOFTWARE_FAILURE',
    194: 'CALIBRATION_ERROR',
    195: 'UNSUPPORTED_CLUSTER',
};


module.exports = {
    thermostatControlSequenceOfOperations,
    thermostatSystemModes,
    thermostatRunningStates,
    fanMode,
    temperatureDisplayMode,
    keypadLockoutMode,
    TuyaThermostatSystemModes,
    TuyaThermostatWeekFormat,
    TuyaThermostatForceMode,
    TuyaThermostatPresets,
    TuyaThermostatScheduleMode,
    TuyaDataTypes,
    TuyaDataPoints,
    lockSourceName,
    armMode,
    TuyaFanModes,
    TuyaThermostatSystemModes2,
    zclStatus,
};
