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
    'Off': 0,
    'Solid': 1,
    'Fast Blink': 2,
    'Slow Blink': 3,
    'Pulse': 4,
    'Chase': 5,
    'Open/Close': 6,
    'Small to Big': 7,
    'Clear': 255,
};

const individualLedEffects = {
    'Off': 0,
    'Solid': 1,
    'Fast Blink': 2,
    'Slow Blink': 3,
    'Pulse': 4,
    'Chase': 5,
    'Clear': 255,
};

const UINT8 = 32;
const BOOLEAN = 16;
const UINT16 = 33;
const INOVELLI = 0x122f;

const ATTRIBUTES = {
    dimming_speed_up_remote: {
        ID: 1,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light dims up when controlled from the hub. ' +
      'A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 25 (2.5s)',
    },
    dimming_speed_up_local: {
        ID: 2,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light dims up when controlled at the switch. ' +
      'A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimming_speed_up_remote setting.',
    },
    ramp_rate_off_to_on_remote: {
        ID: 3,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light turns on when controlled from the hub. ' +
      'A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimming_speed_up_remote setting.',
    },
    ramp_rate_off_to_on_local: {
        ID: 4,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light turns on when controlled at the switch. ' +
      'A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimming_speed_up_remote setting.',
    },
    dimming_speed_down_remote: {
        ID: 5,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light dims down when controlled from the hub. ' +
      'A setting of 0 turns the light immediately off. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimming_speed_up_remote setting.',
    },
    dimming_speed_down_local: {
        ID: 6,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light dims down when controlled at the switch. ' +
      'A setting of 0 turns the light immediately off. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with dimming_speed_up_local setting.',
    },
    ramp_rate_on_to_off_remote: {
        ID: 7,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light turns off when controlled from the hub. ' +
      'A setting of \'instant\' turns the light immediately off. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with ramp_rate_off_to_on_remote setting.',
    },
    ramp_rate_on_to_off_local: {
        ID: 8,
        dataType: UINT8,
        min: 0,
        max: 127,
        description:
      'This changes the speed that the light turns off when controlled at the switch. ' +
      'A setting of \'instant\' turns the light immediately off. Increasing the value slows down the transition speed. ' +
      'Every number represents 100ms. Default = 127 - Keep in sync with ramp_rate_off_to_on_local setting.',
    },
    minimum_level: {
        ID: 9,
        dataType: UINT8,
        min: 1,
        max: 253,
        description:
      'The minimum level that the dimmer allows the bulb to be dimmed to. ' +
      'Useful when the user has an LED bulb that does not turn on or flickers at a lower level.',
    },
    maximum_level: {
        ID: 10,
        dataType: UINT8,
        min: 2,
        max: 254,
        description:
      'The maximum level that the dimmer allows the bulb to be dimmed to.' +
      'Useful when the user has an LED bulb that reaches its maximum level before the ' +
      'dimmer value of 99 or when the user wants to limit the maximum brightness.',
    },
    invert_switch: {
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
    auto_timer_off: {
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
    default_level_local: {
        ID: 13,
        dataType: UINT8,
        min: 0,
        max: 100,
        description:
      'Default level for the dimmer when it is turned on at the switch.' +
      ' A setting of 0 means that the switch will return to the level that it was on before it was turned off.',
    },
    default_level_remote: {
        ID: 14,
        dataType: UINT8,
        min: 0,
        max: 100,
        description:
      'Default level for the dimmer when it is turned on from the hub.' +
      ' A setting of 0 means that the switch will return to the level that it was on before it was turned off.',
    },
    state_after_power_restored: {
        ID: 15,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      'The state the switch should return to when power is restored after power failure. 0 = off, 1-100 = level, 101 = previous.',
    },
    load_level_indicator_timeout: {
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
    active_power_reports: {
        ID: 18,
        dataType: UINT16,
        min: 0,
        max: 32767,
        description:
      'Power level change that will result in a new power report being sent. ' +
      'The value is a percentage of the previous report. \n0 = disabled, 1-32767 = 0.1W-3276.7W.',
    },
    periodic_power_and_energy_reports: {
        ID: 19,
        min: 0,
        max: 32767,
        dataType: UINT16,
        description:
      'Time period between consecutive power & energy reports being sent (in seconds). The timer is reset after each report is sent.',
    },
    active_energy_reports: {
        ID: 20,
        dataType: UINT16,
        min: 0,
        max: 32767,
        description:
      'Energy reports Energy level change which will result in sending a new energy report.' +
      '0 = disabled, 1-32767 = 0.01kWh-327.67kWh. Default setting: 10 (0.1 kWh)',
    },
    power_type: {
        ID: 21,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Non Neutral': 0, 'Neutral': 1},
        min: 0,
        max: 1,
        description: 'Set the power type for the device.',
    },
    switch_type: {
        ID: 22,
        dataType: UINT8,
        displayType: 'enum',
        values: {'Single Pole': 0, '3-Way Dumb Switch': 1, '3-Way Aux Switch': 2},
        min: 0,
        max: 2,
        description: 'Set the switch configuration.',
    },
    physical_on_off_delay: {
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
      'This will set the button press delay. 0 = no delay, 1 = 100ms, 2 = 200ms, 3 = 300ms, etc. up to 900ms. Default = 500ms.',
    },
    smart_bulb_mode: {
        ID: 52,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Disabled': 0, 'Smart Bulb Mode': 1},
        description:
      'For use with Smart Bulbs that need constant power and are controlled via commands rather than power.',
    },
    led_color_when_on: {
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
    led_color_when_off: {
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
    led_intensity_when_on: {
        ID: 97,
        dataType: UINT8,
        min: 0,
        max: 100,
        description: 'Set the intensity of the LED Indicator when the load is on.',
    },
    led_intensity_when_off: {
        ID: 98,
        dataType: UINT8,
        min: 0,
        max: 100,
        description: 'Set the intensity of the LED Indicator when the load is off.',
    },
    local_protection: {
        ID: 256,
        dataType: BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        description: 'Ability to control switch from the wall.',
        displayType: 'enum',
    },
    remote_protection: {
        ID: 257,
        dataType: BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        readOnly: true,
        description: 'Ability to control switch from the hub.',
        displayType: 'enum',
    },
    output_mode: {
        ID: 258,
        min: 0,
        max: 1,
        values: {'Dimmer': 0, 'On/Off': 1},
        dataType: BOOLEAN,
        description: 'Use device as a Dimmer or an On/Off switch.',
        displayType: 'enum',
    },
    on_off_led_mode: {
        ID: 259,
        min: 0,
        max: 1,
        values: {All: 0, One: 1},
        dataType: BOOLEAN,
        description:
      'When the device is in On/Off mode, use full LED bar or just one LED.',
        displayType: 'enum',
    },
    firmware_update_in_progress_indicator: {
        ID: 260,
        dataType: BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        description: 'Display progress on LED bar during firmware update.',
        displayType: 'enum',
    },
    default_led_1_color_when_on: {
        ID: 60,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_1_color_when_off: {
        ID: 61,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_1_intensity_when_on: {
        ID: 62,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_1_intensity_when_off: {
        ID: 63,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_2_color_when_on: {
        ID: 65,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_2_color_when_off: {
        ID: 66,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_2_intensity_when_on: {
        ID: 67,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_2_intensity_when_off: {
        ID: 68,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_3_color_when_on: {
        ID: 70,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_3_color_when_off: {
        ID: 71,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_3_intensity_when_on: {
        ID: 72,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_3_intensity_when_off: {
        ID: 73,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_4_color_when_on: {
        ID: 75,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_4_color_when_off: {
        ID: 76,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_4_intensity_when_on: {
        ID: 77,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_4_intensity_when_off: {
        ID: 78,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_5_color_when_on: {
        ID: 80,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_5_color_when_off: {
        ID: 81,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_5_intensity_when_on: {
        ID: 82,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_5_intensity_when_off: {
        ID: 83,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_6_color_when_on: {
        ID: 85,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_6_color_when_off: {
        ID: 86,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_6_intensity_when_on: {
        ID: 87,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_6_intensity_when_off: {
        ID: 88,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_7_color_when_on: {
        ID: 90,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_7_color_when_off: {
        ID: 91,
        dataType: UINT8,
        min: 0,
        max: 255,
        description:
      '0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.',
    },
    default_led_7_intensity_when_on: {
        ID: 92,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when on. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    default_led_7_intensity_when_off: {
        ID: 93,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Syncronized with default all LED strip intensity parameter.',
    },
    double_tap_up_event: {
        ID: 53,
        dataType: BOOLEAN,
        min: 0,
        max: 1,
        description: 'Result of a double tap on the up button.',
        values: {
            'Button Press Event Only': 0,
            'Button Press Event + Set Load to 100%': 1,
        },
    },
};

const tzLocal = {};

// Generate toZigbee items from attribute list.

tzLocal.inovelli_vzw31sn_parameters = {
    key: Object.keys(ATTRIBUTES),
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

tzLocal.inovelli_led_effect = {
    key: ['led_effect'],
    convertSet: async (entity, key, values, meta) => {
        await entity.command(
            'manuSpecificInovelliVZM31SN',
            'led_effect',
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
            'individual_led_effect',
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
    // options: [exposes.options.transition()], this is a setting on the device
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
                    return {state: {state: 'ON'}, readAfterWriteTime: 5 * 100}; // Need to read parameter to get value here.
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

            return {
                state: {
                    state: brightness === 0 ? 'OFF' : 'ON',
                    brightness: Number(brightness),
                },
                readAfterWriteTime:
          transition.time === 0 ? 5 * 100 : transition.time * 100, // need on speed
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
                    'Off',
                    'Solid',
                    'Chase',
                    'Fast Blink',
                    'Slow Blink',
                    'Pulse',
                    'Open/Close',
                    'Small to Big',
                    'Clear Effect',
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
                    'Off',
                    'Solid',
                    'Fast Blink',
                    'Slow Blink',
                    'Pulse',
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
    tz.ignore_transition,
    tz.ignore_rate,
    tz.power_on_behavior,
    tz.inovelli_led_effect,
    tzLocal.inovelli_individual_led_effect,
    tzLocal.inovelli_vzw31sn_parameters,
];

// Create Expose list with Inovelli Parameters
Object.keys(ATTRIBUTES).forEach((key) => {
    if (ATTRIBUTES[key].displayType === 'enum') {
        const enumE = exposes
            .enum(
                key,
                ATTRIBUTES[key].readOnly ? ea.GET_STATE : ea.ALL,
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
                    ATTRIBUTES[key].readOnly ? ea.GET_STATE : ea.ALL,
                    ATTRIBUTES[key].values.Enabled,
                    ATTRIBUTES[key].values.Disabled,
                )
                .withDescription(ATTRIBUTES[key].description),
        );
    } else {
        let numeric = exposes.numeric(
            key,
            ATTRIBUTES[key].readOnly ? ea.GET_STATE : ea.ALL,
        );
        if (ATTRIBUTES[key].min) {
            numeric = numeric.withValueMin(ATTRIBUTES[key].min);
        }
        if (ATTRIBUTES[key].max) {
            numeric = numeric.withValueMax(ATTRIBUTES[key].max);
        }
        if (ATTRIBUTES[key].values) {
            Object.keys(ATTRIBUTES[key].values).forEach((value) => {
                numeric = numeric.withPreset(value, ATTRIBUTES[key].values[value], '');
            });
        }
        if (ATTRIBUTES[key].unit) {
            numeric = numeric.withUnit(ATTRIBUTES[key].unit);
        }
        numeric.withDescription(ATTRIBUTES[key].description);
        exposesList.push(numeric);
    }
});

module.exports = [
    {
        zigbeeModel: ['VZM31-SN'],
        model: 'VZM31-SN',
        vendor: 'Inovelli',
        description: 'Inovelli 2-in-1 Switch + Dimmer',
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
            const options = {manufacturerCode: INOVELLI};
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genOnOff',
                'genLevelCtrl',
                'haElectricalMeasurement',
                'manuSpecificInovelliVZM31SN',
            ]);

            // Bind for Event Reporting
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, [
                'manuSpecificInovelliVZM31SN',
            ]);

            await reporting.onOff(endpoint, {
                min: 1,
                max: 3600,
                change: 0,
            });

            await reporting.brightness(endpoint, {
                min: 1,
                max: 3600,
                change: 1,
            });

            await reporting.activePower(endpoint);
            await reporting.currentSummDelivered(endpoint);

            // Read in All Current ATTRIBUTES
            await endpoint.read('genLevelCtrl', ['currentLevel']);

            // Split ATTRIBUTES to prevent timeout
            const readATTRIBUTES = Object.keys(ATTRIBUTES);
            const SECTIONS = 5;
            const ATTRIBUTES_PER_SECTION = Math.ceil(
                readATTRIBUTES.length / SECTIONS,
            );
            await Promise.all(
                readATTRIBUTES
                    .reduce((acc, cur, i) => {
                        if (i % ATTRIBUTES_PER_SECTION === 0) {
                            acc.push([]);
                        }
                        acc[acc.length - 1].push(cur);
                        return acc;
                    }, [])
                    .map((ATTRIBUTES) =>
                        endpoint.read('manuSpecificInovelliVZM31SN', ATTRIBUTES, options),
                    ),
            );
        },
    },
];
