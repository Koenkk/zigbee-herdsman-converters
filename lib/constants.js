const OneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();

const defaultBindGroup = 901;

const repInterval = {
    MAX: 62000,
    HOUR: 3600,
    MINUTES_30: 1800,
    MINUTES_15: 900,
    MINUTES_10: 600,
    MINUTES_5: 300,
    MINUTE: 60,
};

const thermostatControlSequenceOfOperations = {
    0: 'cooling_only',
    1: 'cooling_with_reheat',
    2: 'heating_only',
    3: 'heating_with_reheat',
    4: 'cooling_and_heating_4-pipes',
    5: 'cooling_and_heating_4-pipes_with_reheat',
};

const thermostatSystemModes = {
    0: 'off',
    1: 'auto',
    3: 'cool',
    4: 'heat',
    5: 'emergency_heating',
    6: 'precooling',
    7: 'fan_only',
    8: 'dry',
    9: 'sleep',
};

const thermostatRunningMode= {
    0: 'off',
    3: 'cool',
    4: 'heat',
};

const dayOfWeek = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'away_or_vacation',
};

const thermostatRunningStates = {
    0: 'idle',
    1: 'heat',
    2: 'cool',
    4: 'fan_only',
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

const danfossWindowOpen = {
    0: 'quarantine',
    1: 'closing',
    2: 'hold',
    3: 'open',
    4: 'external_open',
};

const keypadLockoutMode = {
    0: 'unlock',
    1: 'lock1',
    2: 'lock2',
    3: 'lock3',
    4: 'lock4',
    5: 'lock5',
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
    4: 'exit_delay',
    5: 'entry_delay',
    6: 'not_ready',
    7: 'in_alarm',
    8: 'arming_stay',
    9: 'arming_night',
    10: 'arming_away',
};

// ID's from ZCL mapped to ha names where appropriate
// https://github.com/home-assistant/core/pull/47720
const colorMode = {
    0: 'hs',
    1: 'xy',
    2: 'color_temp',
};

const lockSoundVolume = ['silent_mode', 'low_volume', 'high_volume'];

const lockUserStatus = {
    0: 'available',
    1: 'enabled',
    3: 'disabled',
};

module.exports = {
    OneJanuary2000,
    repInterval,
    defaultBindGroup,
    thermostatControlSequenceOfOperations,
    thermostatSystemModes,
    thermostatRunningStates,
    thermostatRunningMode,
    dayOfWeek,
    fanMode,
    temperatureDisplayMode,
    danfossWindowOpen,
    keypadLockoutMode,
    lockSourceName,
    armMode,
    colorMode,
    lockSoundVolume,
    lockUserStatus,
};
