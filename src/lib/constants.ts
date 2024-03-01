import {KeyValueAny, KeyValueNumberString} from './types';

export const OneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();

export const defaultBindGroup = 901;

export const repInterval = {
    HOUR: 3600,
    MAX: 65000,
    MINUTE: 60,
    SECONDS_10: 10,
    MINUTES_10: 600,
    MINUTES_15: 900,
    MINUTES_30: 1800,
    MINUTES_5: 300,
    SECONDS_5: 5,
};

export const thermostatControlSequenceOfOperations: KeyValueNumberString = {
    0: 'cooling_only',
    1: 'cooling_with_reheat',
    2: 'heating_only',
    3: 'heating_with_reheat',
    4: 'cooling_and_heating_4-pipes',
    5: 'cooling_and_heating_4-pipes_with_reheat',
};

export const thermostatProgrammingOperationModes: KeyValueNumberString = {
    0: 'setpoint',
    1: 'schedule',
    3: 'schedule_with_preheat',
    4: 'eco',
};

export const thermostatSystemModes: KeyValueNumberString = {
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

export const acovaThermostatSystemModes: KeyValueNumberString = {
    0: 'off',
    1: 'heat',
    3: 'auto',
    4: 'away_or_vacation',
};


export const thermostatRunningMode: KeyValueNumberString= {
    0: 'off',
    3: 'cool',
    4: 'heat',
};

export const thermostatDayOfWeek: KeyValueNumberString = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'away_or_vacation',
};

export const thermostatRunningStates: KeyValueAny = {
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
    22: 'cool',
};

export const thermostatAcLouverPositions: KeyValueNumberString = {
    0: 'fully_closed',
    1: 'fully_closed',
    2: 'fully_open',
    3: 'quarter_open',
    4: 'half_open',
    5: 'three_quarters_open',
};

export const thermostatScheduleMode: KeyValueNumberString = {
    0: 'heat',
    1: 'cool',
};

export const fanMode = {
    'off': 0,
    'low': 1,
    'medium': 2,
    'high': 3,
    'on': 4,
    'auto': 5,
    'smart': 6,
};

export const temperatureDisplayMode: KeyValueNumberString = {
    0: 'celsius',
    1: 'fahrenheit',
};

export const danfossAdaptionRunStatus: KeyValueNumberString= {
    0: 'none',
    1: 'in_progress',
    2: 'found',
    4: 'lost',
};

export const danfossAdaptionRunControl: KeyValueNumberString = {
    0: 'none',
    1: 'initiate_adaptation',
    2: 'cancel_adaptation',
};

export const danfossWindowOpen: KeyValueNumberString = {
    0: 'quarantine',
    1: 'closed',
    2: 'hold',
    3: 'open',
    4: 'external_open',
};

export const danfossRoomStatusCode: KeyValueNumberString = {
    0x0000: 'no_error',
    0x0101: 'missing_rt',
    0x0201: 'rt_touch_error',
    0x0401: 'floor_sensor_short_circuit',
    0x0801: 'floor_sensor_disconnected',
};

export const danfossOutputStatus: KeyValueNumberString = {
    0: 'inactive',
    1: 'active',
};

export const danfossSystemStatusWater: KeyValueNumberString = {
    0: 'hot_water_flow_in_pipes',
    1: 'cool_water_flow_in_pipes',
};

export const danfossSystemStatusCode: KeyValueNumberString = {
    0x0000: 'no_error',
    0x0101: 'missing_expansion_board',
    0x0201: 'missing_radio_module',
    0x0401: 'missing_command_module',
    0x0801: 'missing_master_rail',
    0x1001: 'missing_slave_rail_no_1',
    0x2001: 'missing_slave_rail_no_2',
    0x4001: 'pt1000_input_short_circuit',
    0x8001: 'pt1000_input_open_circuit',
    0x0102: 'error_on_one_or_more_output',
};

export const danfossMultimasterRole: KeyValueNumberString = {
    0: 'invalid_unused',
    1: 'master',
    2: 'slave_1',
    3: 'slave_2',
};

export const develcoInterfaceMode: KeyValueAny = {
    0: 'electricity',
    1: 'gas',
    2: 'water',
    256: 'kamstrup-kmp',
    257: 'linky',
    258: 'IEC62056-21',
    259: 'DSMR-2.3',
    260: 'DSMR-4.0',
};

export const keypadLockoutMode: KeyValueAny = {
    0: 'unlock',
    1: 'lock1',
    2: 'lock2',
    3: 'lock3',
    4: 'lock4',
    5: 'lock5',
};

export const lockSourceName: KeyValueNumberString = {
    0: 'keypad',
    1: 'rf',
    2: 'manual',
    3: 'rfid',
    4: 'fingerprint',
};

export const armMode: KeyValueNumberString = {
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

export const armNotification = {
    0: 'disarm',
    1: 'arm_day_zones',
    2: 'arm_night_zones',
    3: 'arm_all_zones',
    4: 'invalid_code',
    5: 'not_ready',
    6: 'already_disarmed',
};

// ID's from ZCL mapped to ha names where appropriate
// https://github.com/home-assistant/core/pull/47720
export const ColorMode = {
    HS: 0,
    XY: 1,
    ColorTemp: 2,
};

export const colorModeLookup = {
    [ColorMode.HS]: 'hs',
    [ColorMode.XY]: 'xy',
    [ColorMode.ColorTemp]: 'color_temp',
};

export const lockSoundVolume = ['silent_mode', 'low_volume', 'high_volume'];

export const lockUserStatus: KeyValueNumberString = {
    0: 'available',
    1: 'enabled',
    3: 'disabled',
};

export const easyCodeTouchActions: KeyValueNumberString = {
    // First byte are source / msg.data[3]
    // 0x00 KeyPad: If the user uses the code panel.
    // 0x02 Manual: If the user used a key, button or fingerprint.
    // 0x03 RFID: If the user used an RFID tag.
    // 0xFF Other: If the user used an unknown method

    // Last byte are eventCode / msg.data[4]
    // 0x00 Lock: The device was locked using either button, code panel or RFID.
    // 0x01 Unlock: The device was unlocked using either button, code panel or RFID.
    // 0x08 Key Lock: If the user locked with a key.
    // 0x09 Key Unlock: If the user unlocked with a key.
    // 0x10 Fingerprint Lock: The device was locked using fingerprint.
    // 0x11 Fingerprint Unlock: The device was unlocked using fingerprint.

    0x0000: 'keypad_lock',
    0x0001: 'keypad_unlock',

    // Manual says 0x0001 but the lock sends 0x0002 when you unlock it using the keypad
    0x0002: 'keypad_unlock',

    0x0200: 'manual_lock',
    0x0201: 'manual_unlock',

    0x0208: 'key_lock',
    0x0209: 'key_unlock',

    0x0210: 'fingerprint_lock',
    0x0211: 'fingerprint_unlock',

    0x0300: 'rfid_lock',
    0x0301: 'rfid_unlock',

    0xFF0D: 'lock',
    0xFF0E: 'zigbee_unlock',
};

export const wiserDimmerControlMode: KeyValueNumberString = {
    0: 'auto',
    1: 'rc',
    2: 'rl',
    3: 'rl_led',
};

exports.OneJanuary2000 = OneJanuary2000;
exports.repInterval = repInterval;
exports.defaultBindGroup = defaultBindGroup;
exports.thermostatControlSequenceOfOperations = thermostatControlSequenceOfOperations;
exports.thermostatProgrammingOperationModes = thermostatProgrammingOperationModes;
exports.thermostatSystemModes = thermostatSystemModes;
exports.thermostatRunningStates = thermostatRunningStates;
exports.thermostatRunningMode = thermostatRunningMode;
exports.thermostatAcLouverPositions = thermostatAcLouverPositions;
exports.thermostatScheduleMode = thermostatScheduleMode;
exports.thermostatDayOfWeek = thermostatDayOfWeek;
exports.fanMode = fanMode;
exports.temperatureDisplayMode = temperatureDisplayMode;
exports.danfossAdaptionRunControl = danfossAdaptionRunControl;
exports.danfossAdaptionRunStatus = danfossAdaptionRunStatus;
exports.danfossWindowOpen = danfossWindowOpen;
exports.danfossRoomStatusCode = danfossRoomStatusCode;
exports.danfossOutputStatus = danfossOutputStatus;
exports.danfossSystemStatusWater = danfossSystemStatusWater;
exports.danfossSystemStatusCode = danfossSystemStatusCode;
exports.danfossMultimasterRole = danfossMultimasterRole;
exports.develcoInterfaceMode = develcoInterfaceMode;
exports.keypadLockoutMode = keypadLockoutMode;
exports.lockSourceName = lockSourceName;
exports.armMode = armMode;
exports.armNotification = armNotification;
exports.colorModeLookup = colorModeLookup;
exports.ColorMode = ColorMode;
exports.lockSoundVolume = lockSoundVolume;
exports.lockUserStatus = lockUserStatus;
exports.easyCodeTouchActions = easyCodeTouchActions;
exports.wiserDimmerControlMode = wiserDimmerControlMode;
