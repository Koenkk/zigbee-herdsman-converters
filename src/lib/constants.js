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

const thermostatProgrammingOperationModes = {
    0: 'setpoint',
    1: 'schedule',
    4: 'eco',
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
    22: 'cool',
};

const thermostatAcLouverPositions = {
    0: 'fully_closed',
    1: 'fully_closed',
    2: 'fully_open',
    3: 'quarter_open',
    4: 'half_open',
    5: 'three_quarters_open',
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

const danfossAdaptionRunStatus= {
    0: 'none',
    1: 'in_progress',
    2: 'found',
    4: 'lost',
};

const danfossAdaptionRunControl = {
    0: 'none',
    1: 'initiate_adaptation',
    2: 'cancel_adaptation',
};

const danfossWindowOpen = {
    0: 'quarantine',
    1: 'closed',
    2: 'hold',
    3: 'open',
    4: 'external_open',
};

const danfossRoomStatusCode = {
    0x0000: 'no_error',
    0x0101: 'missing_rt',
    0x0201: 'rt_touch_error',
    0x0401: 'floor_sensor_short_circuit',
    0x0801: 'floor_sensor_disconnected',
};

const danfossOutputStatus = {
    0: 'inactive',
    1: 'active',
};

const danfossSystemStatusWater = {
    0: 'hot_water_flow_in_pipes',
    1: 'cool_water_flow_in_pipes',
};

const danfossSystemStatusCode = {
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

const danfossMultimasterRole = {
    0: 'invalid_unused',
    1: 'master',
    2: 'slave_1',
    3: 'slave_2',
};

const develcoInterfaceMode = {
    0: 'electricity',
    1: 'gas',
    2: 'water',
    256: 'kamstrup-kmp',
    257: 'linky',
    258: 'IEC62056-21',
    259: 'DSMR-2.3',
    260: 'DSMR-4.0',
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

const armNotification = {
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

const easyCodeTouchActions = {
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

const wiserDimmerControlMode = {
    0: 'auto',
    1: 'rc',
    2: 'rl',
    3: 'rl_led',
};

module.exports = {
    OneJanuary2000,
    repInterval,
    defaultBindGroup,
    thermostatControlSequenceOfOperations,
    thermostatProgrammingOperationModes,
    thermostatSystemModes,
    thermostatRunningStates,
    thermostatRunningMode,
    thermostatAcLouverPositions,
    dayOfWeek,
    fanMode,
    temperatureDisplayMode,
    danfossAdaptionRunControl,
    danfossAdaptionRunStatus,
    danfossWindowOpen,
    danfossRoomStatusCode,
    danfossOutputStatus,
    danfossSystemStatusWater,
    danfossSystemStatusCode,
    danfossMultimasterRole,
    develcoInterfaceMode,
    keypadLockoutMode,
    lockSourceName,
    armMode,
    armNotification,
    colorMode,
    lockSoundVolume,
    lockUserStatus,
    easyCodeTouchActions,
    wiserDimmerControlMode,
};
