const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const globalStore = require('../lib/store');
const reporting = require('../lib/reporting');
const ota = require('../lib/ota');
const utils = require('../lib/utils');

const e = exposes.presets;
const ea = exposes.access;

const clickLookup = {
    0: 'single',
    1: 'release',
    2: 'held',
    3: 'double',
    4: 'triple',
    5: 'quadruple',
    6: 'quintuple',
};
const buttonLookup = {
    1: 'down',
    2: 'up',
    3: 'config',
};

const ledEffects = {
    'off': 0,
    'solid': 1,
    'fast_blink': 2,
    'slow_blink': 3,
    'pulse': 4,
    'chase': 5,
    'open_close': 6,
    'small_to_big': 7,
    'clear_effect': 255,
};

const individualLedEffects = {
    'off': 0,
    'solid': 1,
    'fast_blink': 2,
    'slow_blink': 3,
    'pulse': 4,
    'chase': 5,
    'clear_effect': 255,
};

const UINT8 = 32;
const BOOLEAN = 16;
const UINT16 = 33;
const INOVELLI = 0x122f;

const ATTRIBUTES = {
    dimmingSpeedUpRemote: {
        ID: 1,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light dims up when controlled from the hub. ' +
      'A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 25 (2.5s)',
    },
    dimmingSpeedUpLocal: {
        ID: 2,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light dims up when controlled at the switch. ' +
      'A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.',
    },
    rampRateOffToOnRemote: {
        ID: 3,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light turns on when controlled from the hub. ' +
      'A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.',
    },
    rampRateOffToOnLocal: {
        ID: 4,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light turns on when controlled at the switch. ' +
      'A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.',
    },
    dimmingSpeedDownRemote: {
        ID: 5,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light dims down when controlled from the hub. ' +
      'A setting of 0 turns the light immediately off. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.',
    },
    dimmingSpeedDownLocal: {
        ID: 6,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light dims down when controlled at the switch. ' +
      'A setting of 0 turns the light immediately off. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpLocal setting.',
    },
    rampRateOnToOffRemote: {
        ID: 7,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light turns off when controlled from the hub. ' +
      'A setting of \'instant\' turns the light immediately off. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with rampRateOffToOnRemote setting.',
    },
    rampRateOnToOffLocal: {
        ID: 8,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light turns off when controlled at the switch. ' +
      'A setting of \'instant\' turns the light immediately off. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with rampRateOffToOnLocal setting.',
    },
    minimumLevel: {
        ID: 9,
        dataType: UINT8,
        min: 1,
        max: 253,
        description:
      'The minimum level that the dimmer allows the bulb to be dimmed to. ' +
      'Useful when the user has an LED bulb that does not turn on or flickers at a lower level.',
    },
    maximumLevel: {
        ID: 10,
        dataType: UINT8,
        min: 2,
        max: 254,
        description:
      'The maximum level that the dimmer allows the bulb to be dimmed to.' +
      'Useful when the user has an LED bulb that reaches its maximum level before the ' +
      'dimmer value of 99 or when the user wants to limit the maximum brightness.',
    },
    invertSwitch: {
        ID: 11,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {Yes: 1, No: 0},
        min: 0,
        max: 1,
        description:
      'Inverts the orientation of the switch.' +
      ' Useful when the switch is installed upside down. Essentially up becomes down and down becomes up.',
    },
    autoTimerOff: {
        ID: 12,
        min: 0,
        max: 32767,
        dataType: UINT16,
        unit: 'seconds',
        values: {Disabled: 0},
        description:
      'Automatically turns the switch off after this many seconds.' +
      ' When the switch is turned on a timer is started. When the timer expires, the switch is turned off. 0 = Auto off is disabled.',
    },
    defaultLevelLocal: {
        ID: 13,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      'Default level for the dimmer when it is turned on at the switch.' +
      ' A setting of 255 means that the switch will return to the level that it was on before it was turned off.',
    },
    defaultLevelRemote: {
        ID: 14,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      'Default level for the dimmer when it is turned on from the hub.' +
      ' A setting of 255 means that the switch will return to the level that it was on before it was turned off.',
    },
    stateAfterPowerRestored: {
        ID: 15,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      'The state the switch should return to when power is restored after power failure. 0 = off, 1-254 = level, 255 = previous.',
    },
    loadLevelIndicatorTimeout: {
        ID: 17,
        dataType: UINT8,
        description:
      'Shows the level that the load is at for x number of seconds after the load is adjusted' +
      ' and then returns to the Default LED state. 0 = Stay Off, 1-10 = seconds, 11 = Stay On.',
        displayType: 'enum',
        values: {
            'Stay Off': 0,
            '1 Second': 1,
            '2 Seconds': 2,
            '3 Seconds': 3,
            '4 Seconds': 4,
            '5 Seconds': 5,
            '6 Seconds': 6,
            '7 Seconds': 7,
            '8 Seconds': 8,
            '9 Seconds': 9,
            '10 Seconds': 10,
            'Stay On': 11,
        },
        min: 0,
        max: 11,
    },
    activePowerReports: {
        ID: 18,
        dataType: UINT8,
        min: 0,
        max: 100,
        description:
      'Percent power level change that will result in a new power report being sent. 0 = Disabled',
    },
    periodicPowerAndEnergyReports: {
        ID: 19,
        min: 0,
        max: 32767,
        dataType: UINT16,
        description:
      'Time period between consecutive power & energy reports being sent (in seconds). The timer is reset after each report is sent.',
    },
    activeEnergyReports: {
        ID: 20,
        dataType: UINT16,
        min: 0,
        max: 32767,
        description:
      'Energy reports Energy level change which will result in sending a new energy report.' +
      '0 = disabled, 1-32767 = 0.01kWh-327.67kWh. Default setting: 10 (0.1 kWh)',
    },
    powerType: {
        ID: 21,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Non Neutral': 0, 'Neutral': 1},
        min: 0,
        max: 1,
        readOnly: true,
        description: 'Set the power type for the device.',
    },
    switchType: {
        ID: 22,
        dataType: UINT8,
        displayType: 'enum',
        values: {'Single Pole': 0, '3-Way Dumb Switch': 1, '3-Way Aux Switch': 2},
        min: 0,
        max: 2,
        description: 'Set the switch configuration.',
    },
    buttonDelay: {
        ID: 50,
        dataType: UINT8,
        values: {
            '0ms': 0,
            '100ms': 1,
            '200ms': 2,
            '300ms': 3,
            '400ms': 4,
            '500ms': 5,
            '600ms': 6,
            '700ms': 7,
            '800ms': 8,
            '900ms': 9,
        },
        displayType: 'enum',
        min: 0,
        max: 9,
        description:
      'This will set the button press delay. 0 = no delay (Disables Button Press Events),' +
      'Default = 500ms.',
    },
    smartBulbMode: {
        ID: 52,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Disabled': 0, 'Smart Bulb Mode': 1},
        description:
      'For use with Smart Bulbs that need constant power and are controlled via commands rather than power.',
    },
    ledColorWhenOn: {
        ID: 95,
        dataType: UINT8,
        min: 0,
        max: 255,
        values: {
            Red: 0,
            Orange: 21,
            Yellow: 42,
            Green: 85,
            Cyan: 127,
            Blue: 170,
            Violet: 212,
            Pink: 234,
            White: 255,
        },
        description: 'Set the color of the LED Indicator when the load is on.',
    },
    ledColorWhenOff: {
        ID: 96,
        dataType: UINT8,
        min: 0,
        max: 255,
        values: {
            Red: 0,
            Orange: 21,
            Yellow: 42,
            Green: 85,
            Cyan: 127,
            Blue: 170,
            Violet: 212,
            Pink: 234,
            White: 255,
        },
        description: 'Set the color of the LED Indicator when the load is off.',
    },
    ledIntensityWhenOn: {
        ID: 97,
        dataType: UINT8,
        min: 0,
        max: 100,
        description: 'Set the intensity of the LED Indicator when the load is on.',
    },
    ledIntensityWhenOff: {
        ID: 98,
        dataType: UINT8,
        min: 0,
        max: 100,
        description: 'Set the intensity of the LED Indicator when the load is off.',
    },
    localProtection: {
        ID: 256,
        dataType: BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        description: 'Ability to control switch from the wall.',
        displayType: 'enum',
    },
    remoteProtection: {
        ID: 257,
        dataType: BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        readOnly: true,
        description: 'Ability to control switch from the hub.',
        displayType: 'enum',
    },
    outputMode: {
        ID: 258,
        min: 0,
        max: 1,
        values: {'Dimmer': 0, 'On/Off': 1},
        dataType: BOOLEAN,
        description: 'Use device as a Dimmer or an On/Off switch.',
        displayType: 'enum',
    },
    onOffLedMode: {
        ID: 259,
        min: 0,
        max: 1,
        values: {All: 0, One: 1},
        dataType: BOOLEAN,
        description:
      'When the device is in On/Off mode, use full LED bar or just one LED.',
        displayType: 'enum',
    },
    firmwareUpdateInProgressIndicator: {
        ID: 260,
        dataType: BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        description: 'Display progress on LED bar during firmware update.',
        displayType: 'enum',
    },
    defaultLed1ColorWhenOn: {
        ID: 60,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed1ColorWhenOff: {
        ID: 61,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed1IntensityWhenOn: {
        ID: 62,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed1IntensityWhenOff: {
        ID: 63,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed2ColorWhenOn: {
        ID: 65,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed2ColorWhenOff: {
        ID: 66,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed2IntensityWhenOn: {
        ID: 67,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed2IntensityWhenOff: {
        ID: 68,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed3ColorWhenOn: {
        ID: 70,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed3ColorWhenOff: {
        ID: 71,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed3IntensityWhenOn: {
        ID: 72,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed3IntensityWhenOff: {
        ID: 73,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed4ColorWhenOn: {
        ID: 75,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed4ColorWhenOff: {
        ID: 76,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed4IntensityWhenOn: {
        ID: 77,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed4IntensityWhenOff: {
        ID: 78,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed5ColorWhenOn: {
        ID: 80,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed5ColorWhenOff: {
        ID: 81,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed5IntensityWhenOn: {
        ID: 82,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed5IntensityWhenOff: {
        ID: 83,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed6ColorWhenOn: {
        ID: 85,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed6ColorWhenOff: {
        ID: 86,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed6IntensityWhenOn: {
        ID: 87,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed6IntensityWhenOff: {
        ID: 88,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed7ColorWhenOn: {
        ID: 90,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed7ColorWhenOff: {
        ID: 91,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    defaultLed7IntensityWhenOn: {
        ID: 92,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    defaultLed7IntensityWhenOff: {
        ID: 93,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    doubleTapUpForFullBrightness: {
        ID: 53,
        dataType: BOOLEAN,
        min: 0,
        max: 1,
        description: 'Result of a double tap on the up button.',
        values: {
            'Button Press Event Only': 0,
            'Button Press Event + Set Load to 100%': 1,
        },
        displayType: 'enum',
    },
    relayClick: {
        ID: 261,
        dataType: BOOLEAN,
        min: 0,
        max: 1,
        description: 'Audible Click in On/Off mode.',
        values: {'Enabled (Default)': 1, 'Disabled': 0},
        displayType: 'enum',
    },
};

const tzLocal = {};

// Generate toZigbee items from attribute list.

tzLocal.inovelli_vzw31sn_parameters = {
    key: Object.keys(ATTRIBUTES).filter((a) => !ATTRIBUTES[a].readOnly),
    convertSet: async (entity, key, value, meta) => {
        const payload = {
            [ATTRIBUTES[key].ID]: {
                value:
          ATTRIBUTES[key].displayType === 'enum' ?
              ATTRIBUTES[key].values[value] :
              value,
                type: ATTRIBUTES[key].dataType,
            },
        };

        await entity.write('manuSpecificInovelliVZM31SN', payload, {
            manufacturerCode: INOVELLI,
        });

        return {
            state: {
                [key]:
          ATTRIBUTES[key].displayType === 'enum' ?
              ATTRIBUTES[key].values[value] :
              value,
            },
        };
    },
    convertGet: async (entity, key, meta) => {
        const value = await entity.read('manuSpecificInovelliVZM31SN', [key], {
            manufacturerCode: INOVELLI,
        });

        if (ATTRIBUTES[key].displayType === 'enum') {
            const valueState = Object.keys(ATTRIBUTES[key].values).find(
                (a) => ATTRIBUTES[key].values[a] === value[key],
            );
            meta.state[key] = valueState;
            return {
                state: {
                    [key]: valueState,
                },
            };
        } else {
            meta.state[key] = value[key];
            return {state: value};
        }
    },
};

tzLocal.inovelli_vzw31sn_parameters_readOnly = {
    key: Object.keys(ATTRIBUTES).filter((a) => ATTRIBUTES[a].readOnly),
    convertGet: async (entity, key, meta) => {
        const value = await entity.read('manuSpecificInovelliVZM31SN', [key], {
            manufacturerCode: INOVELLI,
        });

        if (ATTRIBUTES[key].displayType === 'enum') {
            const valueState = Object.keys(ATTRIBUTES[key].values).find(
                (a) => ATTRIBUTES[key].values[a] === value[key],
            );
            meta.state[key] = valueState;
            return {
                state: {
                    [key]: valueState,
                },
            };
        } else {
            meta.state[key] = value[key];
            return {state: value};
        }
    },
    convertSet: undefined,
};

tzLocal.inovelli_led_effect = {
    key: ['led_effect'],
    convertSet: async (entity, key, values, meta) => {
        await entity.command(
            'manuSpecificInovelliVZM31SN',
            'ledEffect',
            {
                effect: ledEffects[values.effect],
                color: Math.min(Math.max(0, values.color), 255),
                level: Math.min(Math.max(0, values.level), 100),
                duration: Math.min(Math.max(0, values.duration), 255),
            },
            {disableResponse: true, disableDefaultResponse: true},
        );
        return {state: {[key]: values}};
    },
};

tzLocal.inovelli_individual_led_effect = {
    key: ['individual_led_effect'],
    convertSet: async (entity, key, values, meta) => {
        await entity.command(
            'manuSpecificInovelliVZM31SN',
            'individualLedEffect',
            {
                led: Math.min(Math.max(0, parseInt(values.led)), 7),
                effect: individualLedEffects[values.effect],
                color: Math.min(Math.max(0, values.color), 255),
                level: Math.min(Math.max(0, values.level), 100),
                duration: Math.min(Math.max(0, values.duration), 255),
            },
            {disableResponse: true, disableDefaultResponse: true},
        );
        return {state: {[key]: values}};
    },
};

/*
 * Inovelli VZM31SN has a default transition property that the device should
 * fallback to if a transition is not specified by passing 0xffff
 */
const inovelliOnOffConvertSet = async (entity, key, value, meta) => {
    const state = meta.message.hasOwnProperty('state') ?
        meta.message.state.toLowerCase() :
        null;
    utils.validateValue(state, ['toggle', 'off', 'on']);

    if (
        state === 'on' &&
    (meta.message.hasOwnProperty('on_time') ||
      meta.message.hasOwnProperty('off_wait_time'))
    ) {
        const onTime = meta.message.hasOwnProperty('on_time') ?
            meta.message.on_time :
            0;
        const offWaitTime = meta.message.hasOwnProperty('off_wait_time') ?
            meta.message.off_wait_time :
            0;

        if (typeof onTime !== 'number') {
            throw Error('The on_time value must be a number!');
        }
        if (typeof offWaitTime !== 'number') {
            throw Error('The off_wait_time value must be a number!');
        }

        const payload = {
            ctrlbits: 0,
            ontime: meta.message.hasOwnProperty('on_time') ?
                Math.round(onTime * 10) :
                0xffff,
            offwaittime: meta.message.hasOwnProperty('off_wait_time') ?
                Math.round(offWaitTime * 10) :
                0xffff,
        };
        await entity.command(
            'genOnOff',
            'onWithTimedOff',
            payload,
            utils.getOptions(meta.mapped, entity),
        );
    } else {
        await entity.command(
            'genOnOff',
            state,
            {},
            utils.getOptions(meta.mapped, entity),
        );
        if (state === 'toggle') {
            const currentState =
        meta.state[
            `state${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`
        ];
            return currentState ?
                {state: {state: currentState === 'OFF' ? 'ON' : 'OFF'}} :
                {};
        } else {
            return {state: {state: state.toUpperCase()}};
        }
    }
};

/**
 * Inovelli VZM31SN has a default transition property that the device should
 * fallback to if a transition is not specified by passing 0xffff
 */
tzLocal.light_onoff_brightness_inovelli = {
    key: ['state', 'brightness', 'brightness_percent'],
    convertSet: async (entity, key, value, meta) => {
        const {message} = meta;
        const transition = utils.getTransition(entity, 'brightness', meta);
        const turnsOffAtBrightness1 = utils.getMetaValue(
            entity,
            meta.mapped,
            'turnsOffAtBrightness1',
            'allEqual',
            false,
        );
        let state = message.hasOwnProperty('state') ?
            message.state.toLowerCase() :
            undefined;
        let brightness = undefined;
        if (message.hasOwnProperty('brightness')) {
            brightness = Number(message.brightness);
        } else if (message.hasOwnProperty('brightness_percent')) {
            brightness = utils.mapNumberRange(
                Number(message.brightness_percent),
                0,
                100,
                0,
                255,
            );
        }

        if (
            brightness !== undefined &&
      (isNaN(brightness) || brightness < 0 || brightness > 255)
        ) {
            // Allow 255 value, changing this to 254 would be a breaking change.
            throw new Error(
                `Brightness value of message: '${JSON.stringify(
                    message,
                )}' invalid, must be a number >= 0 and =< 254`,
            );
        }

        if (
            state !== undefined &&
      ['on', 'off', 'toggle'].includes(state) === false
        ) {
            throw new Error(
                `State value of message: '${JSON.stringify(
                    message,
                )}' invalid, must be 'ON', 'OFF' or 'TOGGLE'`,
            );
        }

        if (
            state === 'toggle' ||
      state === 'off' ||
      (brightness === undefined && state === 'on')
        ) {
            if (transition.specified && transition.time > 0) {
                if (state === 'toggle') {
                    state = meta.state.state === 'ON' ? 'off' : 'on';
                }

                if (
                    state === 'off' &&
          meta.state.brightness &&
          meta.state.state === 'ON'
                ) {
                    // https://github.com/Koenkk/zigbee2mqtt/issues/2850#issuecomment-580365633
                    // We need to remember the state before turning the device off as we need to restore
                    // it once we turn it on again.
                    // We cannot rely on the meta.state as when reporting is enabled the bulb will reports
                    // it brightness while decreasing the brightness.
                    globalStore.putValue(entity, 'brightness', meta.state.brightness);
                    globalStore.putValue(entity, 'turnedOffWithTransition', true);
                }

                const fallbackLevel = utils.getObjectProperty(
                    meta.state,
                    'brightness',
                    254,
                );
                let level =
          state === 'off' ?
              0 :
              globalStore.getValue(entity, 'brightness', fallbackLevel);
                if (state === 'on' && level === 0) {
                    level = turnsOffAtBrightness1 ? 2 : 1;
                }

                const payload = {level, transtime: transition.time};
                await entity.command(
                    'genLevelCtrl',
                    'moveToLevelWithOnOff',
                    payload,
                    utils.getOptions(meta.mapped, entity),
                );
                const result = {state: {state: state.toUpperCase()}};
                if (state === 'on') result.state.brightness = level;
                return result;
            } else {
                if (
                    state === 'on' &&
          globalStore.getValue(entity, 'turnedOffWithTransition') === true
                ) {
                    /**
           * In case the bulb it turned OFF with a transition and turned ON WITHOUT
           * a transition, the brightness is not recovered as it turns on with brightness 1.
           * https://github.com/Koenkk/../issues/1073
           */
                    globalStore.putValue(entity, 'turnedOffWithTransition', false);
                    await entity.command(
                        'genLevelCtrl',
                        'moveToLevelWithOnOff',
                        {
                            level: globalStore.getValue(entity, 'brightness'),
                            transtime: transition.specified ? transition.time : 0xffff,
                        },
                        utils.getOptions(meta.mapped, entity),
                    );
                    const defaultTransitionTime = await entity.read(
                        'manuSpecificInovelliVZM31SN',
                        ['rampRateOffToOnRemote'],
                    );
                    return {
                        state: {state: 'ON'},
                        readAfterWriteTime: transition.specified ?
                            transition.time * 100 :
                            defaultTransitionTime.rampRateOffToOnRemote * 100,
                    };
                } else {
                    // Store brightness where the bulb was turned off with as we need it when the bulb is turned on
                    // with transition.
                    if (meta.state.hasOwnProperty('brightness') && state === 'off') {
                        globalStore.putValue(entity, 'brightness', meta.state.brightness);
                        globalStore.putValue(entity, 'turnedOffWithTransition', true);
                    }

                    const result = await inovelliOnOffConvertSet(
                        entity,
                        'state',
                        state,
                        meta,
                    );

                    result.readAfterWriteTime = 0;
                    if (
                        result.state &&
            result.state.state === 'ON' &&
            meta.state.brightness === 0
                    ) {
                        result.state.brightness = 1;
                    }

                    return result;
                }
            }
        } else {
            brightness = Math.min(254, brightness);
            if (brightness === 1 && turnsOffAtBrightness1) {
                brightness = 2;
            }

            globalStore.putValue(entity, 'brightness', brightness);
            await entity.command(
                'genLevelCtrl',
                'moveToLevelWithOnOff',
                {
                    level: Number(brightness),
                    transtime: !transition.specified ? 0xffff : transition.time,
                },
                utils.getOptions(meta.mapped, entity),
            );

            const defaultTransitionTime = await entity.read(
                'manuSpecificInovelliVZM31SN',
                ['rampRateOnToOffRemote'],
            );

            return {
                state: {
                    state: brightness === 0 ? 'OFF' : 'ON',
                    brightness: Number(brightness),
                },
                readAfterWriteTime:
          transition.time === 0 ?
              defaultTransitionTime.rampRateOnToOffRemote * 100 :
              transition.time * 100, // need on speed
            };
        }
    },
    convertGet: async (entity, key, meta) => {
        if (key === 'brightness') {
            await entity.read('genLevelCtrl', ['currentLevel']);
        } else if (key === 'state') {
            await tz.on_off.convertGet(entity, key, meta);
        }
    },
};

const fzLocal = {
    inovelli_vzm31sn: {
        cluster: 'manuSpecificInovelliVZM31SN',
        type: ['raw', 'readResponse', 'commandQueryNextImageRequest'],
        convert: (model, msg, publish, options, meta) => {
            const command = msg.data[4]; // maybe 0
            if (msg.endpoint.ID == 2 && command === 0x00) {
                // Scene Event
                // # byte 1 - msg.data[6]
                // # 0 - pressed
                // # 1 - released
                // # 2 - held
                // # 3 - 2x
                // # 4 - 3x
                // # 5 - 4x
                // # 6 - 5x

                // # byte 2 - msg.data[5]
                // # 1 - down button
                // # 2 - up button
                // # 3 - config button

                const button = buttonLookup[msg.data[5]];
                const action = clickLookup[msg.data[6]];
                return {action: `${button}_${action}`};
            }
        },
    },
};

const exposesList = [
    e.light_brightness(),
    e.power(),
    e.energy(),
    exposes
        .composite('led_effect', 'led_effect')
        .withFeature(
            exposes
                .enum('effect', ea.SET_STATE, [
                    'off',
                    'solid',
                    'chase',
                    'fast_blink',
                    'slow_blink',
                    'pulse',
                    'open_close',
                    'small_to_big',
                    'clear_effect',
                ])
                .withDescription('Animation Effect to use for the LEDs'),
        )
        .withFeature(
            exposes
                .numeric('color', ea.SET_STATE)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    'Calculated by using a hue color circle(value/255*360) If color = 255 display white',
                ),
        )
        .withFeature(
            exposes
                .numeric('level', ea.SET_STATE)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Brightness of the LEDs'),
        )
        .withFeature(
            exposes
                .numeric('duration', ea.SET_STATE)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    '1-60 is in seconds calculated 61-120 is in minutes calculated by(value-60) ' +
            'Example a value of 65 would be 65-60 = 5 minutes - 120-254 Is in hours calculated by(value-120) ' +
            'Example a value of 132 would be 132-120 would be 12 hours. - 255 Indefinitely',
                ),
        ),
    exposes
        .composite('individual_led_effect', 'individual_led_effect')
        .withFeature(
            exposes
                .enum('led', ea.SET_STATE, ['1', '2', '3', '4', '5', '6', '7'])
                .withDescription('Individual LED to target.'),
        )
        .withFeature(
            exposes
                .enum('effect', ea.SET_STATE, [
                    'off',
                    'solid',
                    'fast_blink',
                    'slow_blink',
                    'pulse',
                    'chase',
                    'clear_effect',
                ])
                .withDescription('Animation Effect to use for the LED'),
        )
        .withFeature(
            exposes
                .numeric('color', ea.SET_STATE)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    'Calculated by using a hue color circle(value/255*360) If color = 255 display white',
                ),
        )
        .withFeature(
            exposes
                .numeric('level', ea.SET_STATE)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Brightness of the LED'),
        )
        .withFeature(
            exposes
                .numeric('duration', ea.SET_STATE)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    '1-60 is in seconds calculated 61-120 is in minutes calculated by(value-60) ' +
            'Example a value of 65 would be 65-60 = 5 minutes - 120-254 Is in hours calculated by(value-120) ' +
            ' Example a value of 132 would be 132-120 would be 12 hours. - 255 Indefinitely',
                ),
        ),
];

const toZigbee = [
    tzLocal.light_onoff_brightness_inovelli,
    tz.power_on_behavior,
    tzLocal.inovelli_led_effect,
    tzLocal.inovelli_individual_led_effect,
    tzLocal.inovelli_vzw31sn_parameters,
    tzLocal.inovelli_vzw31sn_parameters_readOnly,
];

// Create Expose list with Inovelli Parameters
Object.keys(ATTRIBUTES).forEach((key) => {
    if (ATTRIBUTES[key].displayType === 'enum') {
        const enumE = exposes
            .enum(
                key,
                ATTRIBUTES[key].readOnly ? ea.STATE_GET : ea.ALL,
                Object.keys(ATTRIBUTES[key].values),
            )
            .withDescription(ATTRIBUTES[key].description);
        exposesList.push(enumE);
    } else if (
        ATTRIBUTES[key].displayType === 'binary' ||
    ATTRIBUTES[key].displayType === 'switch'
    ) {
        exposesList.push(
            exposes
                .binary(
                    key,
                    ATTRIBUTES[key].readOnly ? ea.STATE_GET : ea.ALL,
                    ATTRIBUTES[key].values.Enabled,
                    ATTRIBUTES[key].values.Disabled,
                )
                .withDescription(ATTRIBUTES[key].description),
        );
    } else {
        const numeric = exposes
            .numeric(key, ATTRIBUTES[key].readOnly ? ea.STATE_GET : ea.ALL)
            .withValueMin(ATTRIBUTES[key].min)
            .withValueMax(ATTRIBUTES[key].max);

        if (ATTRIBUTES[key].values) {
            Object.keys(ATTRIBUTES[key].values).forEach((value) => {
                numeric.withPreset(value, ATTRIBUTES[key].values[value], '');
            });
        }
        if (ATTRIBUTES[key].unit) {
            numeric.withUnit(ATTRIBUTES[key].unit);
        }
        numeric.withDescription(ATTRIBUTES[key].description);
        exposesList.push(numeric);
    }
});

// Put actions at the bottom of ui
exposesList.push(
    e.action([
        'down_single',
        'up_single',
        'config_single',
        'down_release',
        'up_release',
        'config_release',
        'down_held',
        'up_held',
        'config_held',
        'down_double',
        'up_double',
        'config_double',
        'down_triple',
        'up_triple',
        'config_triple',
        'down_quadruple',
        'up_quadruple',
        'config_quadruple',
        'down_quintuple',
        'up_quintuple',
        'config_quintuple',
    ]),
);

module.exports = [
    {
        zigbeeModel: ['VZM31-SN'],
        model: 'VZM31-SN',
        vendor: 'Inovelli',
        description: 'Inovelli 2-in-1 switch + dimmer',
        exposes: exposesList,
        toZigbee: toZigbee,
        fromZigbee: [
            fz.on_off,
            fz.brightness,
            fz.level_config,
            fz.power_on_behavior,
            fz.ignore_basic_report,
            fz.electrical_measurement,
            fz.metering,
            fzLocal.inovelli_vzm31sn,
        ],
        ota: ota.inovelli,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'seMetering',
                'haElectricalMeasurement',
            ]);
            // Bind for Button Event Reporting
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, [
                'manuSpecificInovelliVZM31SN',
            ]);
            await endpoint.read('haElectricalMeasurement', [
                'acPowerMultiplier',
                'acPowerDivisor',
            ]);
            await reporting.readMeteringMultiplierDivisor(endpoint);

            await reporting.activePower(endpoint, {min: 1, max: 3600, change: 1});
            await reporting.currentSummDelivered(endpoint, {
                min: 1,
                max: 3600,
                change: 0,
            });
        },
    },
];
