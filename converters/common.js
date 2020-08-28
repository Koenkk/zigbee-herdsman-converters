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
    lockSourceName,
    armMode,
    TuyaFanModes,
    TuyaThermostatSystemModes2,
};
