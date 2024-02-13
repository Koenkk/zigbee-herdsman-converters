import {Definition, Expose, Fz, Tz, Zh} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as globalStore from '../lib/store';
import * as reporting from '../lib/reporting';
import * as ota from '../lib/ota';
import * as utils from '../lib/utils';

const e = exposes.presets;
const ea = exposes.access;

const clickLookup: { [key: number]: string } = {
    0: 'single',
    1: 'release',
    2: 'held',
    3: 'double',
    4: 'triple',
    5: 'quadruple',
    6: 'quintuple',
};
const buttonLookup: { [key: number]: string } = {
    1: 'down',
    2: 'up',
    3: 'config',
    4: 'aux_down',
    5: 'aux_up',
    6: 'aux_config',
};

const ledEffects: { [key: string]: number } = {
    off: 0,
    solid: 1,
    fast_blink: 2,
    slow_blink: 3,
    pulse: 4,
    chase: 5,
    open_close: 6,
    small_to_big: 7,
    aurora: 8,
    slow_falling: 9,
    medium_falling: 10,
    fast_falling: 11,
    slow_rising: 12,
    medium_rising: 13,
    fast_rising: 14,
    medium_blink: 15,
    slow_chase: 16,
    fast_chase: 17,
    fast_siren: 18,
    slow_siren: 19,
    clear_effect: 255,
};

const individualLedEffects: { [key: string]: number } = {
    off: 0,
    solid: 1,
    fast_blink: 2,
    slow_blink: 3,
    pulse: 4,
    chase: 5,
    falling: 6,
    rising: 7,
    aurora: 8,
    clear_effect: 255,
};

const fanModes: { [key: string]: number } = {low: 2, smart: 4, medium: 85, high: 254, on: 255};
const breezemodes: string[] = ['off', 'low', 'medium', 'high'];

const UINT8 = 32;
const BOOLEAN = 16;
const UINT16 = 33;
const INOVELLI = 0x122f;

interface Attribute {
    ID: number, dataType: number, min?: number, max?: number, description: string, unit?: string, displayType?: string,
    values?: {[s: string]: number}, readOnly?: boolean,
}

interface BreezeModeValues {
    speed1: string,
    speed2: string,
    speed3: string,
    speed4: string,
    speed5: string,
    time1: number,
    time2: number,
    time3: number,
    time4: number,
    time5: number,
}

// Converts brightness level to a fan mode
const intToFanMode = (value: number) => {
    let selectedMode = 'Low';

    Object.values(fanModes).forEach((mode) => {
        if (value >= mode) {
            selectedMode = Object.keys(fanModes).find(
                (key) => fanModes[key] === mode,
            ) || 'Low';
        }
    });

    return selectedMode;
};

/**
 * Convert speed string to int needed for breeze mode calculation.
 * @param speedIn - speed string
 * @returns low = 1, medium = 2, high = 3, off = 0
 */
const speedToInt = (speedIn: string): number => {
    switch (speedIn) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    default: return 0;
    }
};

// Create Expose list with Inovelli Parameters definitions
const attributesToExposeList = (ATTRIBUTES: {[s: string]: Attribute}, exposesList: Expose[]) =>{
    Object.keys(ATTRIBUTES).forEach((key) => {
        if (ATTRIBUTES[key].displayType === 'enum') {
            const enumE = e
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
                e
                    .binary(
                        key,
                        ATTRIBUTES[key].readOnly ? ea.STATE_GET : ea.ALL,
                        // @ts-expect-error
                        ATTRIBUTES[key].values.Enabled,
                        ATTRIBUTES[key].values.Disabled,
                    )
                    .withDescription(ATTRIBUTES[key].description),
            );
        } else {
            const numeric = e
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
};

/**
 * Common Attributes
 *
 * These attributes are shared between all devices with the manufacturer specific Inovelli cluster
 * Some of the descriptions, max, min or value properties may be overridden for each device
 */
const COMMON_ATTRIBUTES: {[s: string]: Attribute} = {
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
        values: {'Single Pole': 0, '3-Way Dumb Switch': 1, '3-Way Aux Switch': 2, 'Single-Pole Full Sine Wave': 3},
        min: 0,
        max: 3,
        description: 'Set the switch configuration.',
    },
    quickStartFan: {
        ID: 23,
        dataType: UINT8,
        min: 0,
        max: 60,
        description:
        'Duration of full power output while fan tranisitions from Off to On. In 60th of second. 0 = disable, 1 = 1/60s, 60 = 1s',
    },
    higherOutputInNonNeutral: {
        ID: 25,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Disabled (default)': 0, 'Enabled': 1},
        min: 0,
        max: 1,
        description: 'Increase level in non-neutral mode',
    },
    internalTemperature: {
        ID: 32,
        dataType: UINT8,
        min: 0,
        max: 127,
        readOnly: true,
        description: 'The temperature measured by the temperature sensor inside the chip, in degrees Celsius',
    },
    overheat: {
        ID: 33,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'No Alert': 0, 'Overheated': 1},
        min: 0,
        max: 1,
        readOnly: true,
        description: 'Indicates if the internal chipset is currently in an overheated state.',
    },
    quickStartLightTime: {
        ID: 34,
        dataType: UINT8,
        min: 0,
        max: 60,
        description:
        'Duration of full power output while lamp tranisitions from Off to On. In 60th of second. 0 = disable, 1 = 1/60s, 60 = 1s',
    },
    quickStartLightLevel: {
        ID: 35,
        dataType: UINT8,
        min: 1,
        max: 254,
        description:
        'Level of power output during Quick Start Light time (P34).',
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
    deviceBindNumber: {
        ID: 51,
        dataType: UINT8,
        readOnly: true,
        description: 'The number of devices currently bound (excluding gateways) and counts one group as two devices',
    },
    smartBulbMode: {
        ID: 52,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Disabled': 0, 'Smart Bulb Mode': 1},
        description:
      'For use with Smart Bulbs that need constant power and are controlled via commands rather than power.',
    },
    doubleTapUpToParam55: {
        ID: 53,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Disabled': 0, 'Enabled': 1},
        description: 'Enable or Disable setting brightness to parameter 55 on double-tap UP.',
    },
    doubleTapDownToParam56: {
        ID: 54,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Disabled': 0, 'Enabled': 1},
        description: 'Enable or Disable setting brightness to parameter 56 on double-tap DOWN.',
    },
    brightnessLevelForDoubleTapUp: {
        ID: 55,
        dataType: UINT8,
        min: 2,
        max: 254,
        description: 'Set this level on double-tap UP (if enabled by P53).',
    },
    brightnessLevelForDoubleTapDown: {
        ID: 56,
        dataType: UINT8,
        min: 0,
        max: 254,
        description: 'Set this level on double-tap DOWN (if enabled by P54).',
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
    auxSwitchUniqueScenes: {
        ID: 123,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Disabled': 0, 'Enabled': 1},
        description: 'Have unique scene numbers for scenes activated with the aux switch.',
    },
    bindingOffToOnSyncLevel: {
        ID: 125,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Disabled': 0, 'Enabled': 1},
        description: 'Send Move_To_Level using Default Level with Off/On to bound devices.',
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
      'Intesity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.',
    },
    defaultLed1IntensityWhenOff: {
        ID: 63,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.',
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
      'Intesity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.',
    },
    defaultLed2IntensityWhenOff: {
        ID: 68,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.',
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
      'Intesity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.',
    },
    defaultLed3IntensityWhenOff: {
        ID: 73,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.',
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
      'Intesity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.',
    },
    defaultLed4IntensityWhenOff: {
        ID: 78,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.',
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
      'Intesity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.',
    },
    defaultLed5IntensityWhenOff: {
        ID: 83,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.',
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
      'Intesity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.',
    },
    defaultLed6IntensityWhenOff: {
        ID: 88,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.',
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
      'Intesity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.',
    },
    defaultLed7IntensityWhenOff: {
        ID: 93,
        dataType: UINT8,
        min: 0,
        max: 101,
        description:
      'Intesity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.',
    },
    doubleTapClearNotifications: {
        ID: 262,
        dataType: BOOLEAN,
        min: 0,
        max: 1,
        description: 'Double-Tap the Config button to clear notifications.',
        values: {'Enabled (Default)': 0, 'Disabled': 1},
        displayType: 'enum',
    },

};

const VZM31_ATTRIBUTES: {[s: string]: Attribute} = {
    ...COMMON_ATTRIBUTES,
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
    ledBarScaling: {
        ID: 100,
        dataType: BOOLEAN,
        displayType: 'enum',
        values: {'Gen3 method (VZM-style)': 0, 'Gen2 method (LZW-style)': 1},
        description: 'Method used for scaling.',
    },
    relayClick: {
        ID: 261,
        dataType: BOOLEAN,
        min: 0,
        max: 1,
        description:
      'In neutral on/off setups, the default is to have a clicking sound to notify you that the relay ' +
      'is open or closed. You may disable this sound by creating a, “simulated” on/off where the switch ' +
      'only will turn onto 100 or off to 0.',
        values: {'Disabled (Click Sound On)': 0, 'Enabled (Click Sound Off)': 1},
        displayType: 'enum',
    },
};

const VZM35_ATTRIBUTES : {[s: string]: Attribute} = {
    ...COMMON_ATTRIBUTES,
    minimumLevel: {
        ...COMMON_ATTRIBUTES.minimumLevel,
        description: '1-84: The level corresponding to the fan is Low, Medium, High. ' +
        '85-170: The level corresponding to the fan is Medium, Medium, High. '+
        '170-254: The level corresponding to the fan is High, High, High ',
    },
    maximumLevel: {
        ...COMMON_ATTRIBUTES.maximumLevel,
        description: '2-84: The level corresponding to the fan is Low, Medium, High.',
    },
    switchType: {
        ...COMMON_ATTRIBUTES.switchType,
        values: {'Single Pole': 0, 'Aux Switch': 1},
        max: 1,
    },
    smartBulbMode: {
        ...COMMON_ATTRIBUTES.smartBulbMode,
        description: 'Use this mode to synchronize and control other fan switches or controllers.',
        values: {'Disabled': 0, 'Remote Control Mode': 1},
    },
    nonNeutralAuxMediumGear: {
        ID: 30,
        dataType: UINT8,
        min: 42,
        max: 135,
        description: 'Identification value in Non-nuetral, medium gear, aux switch',
    },
    nonNeutralAuxLowGear: {
        ID: 31,
        dataType: UINT8,
        min: 42,
        max: 135,
        description: 'Identification value in Non-nuetral, low gear, aux switch',
    },
    fanLedLevelType: {
        ID: 263,
        dataType: UINT8,
        min: 0,
        max: 10,
        values: {'Limitless (like VZM31)': 0, 'Adaptive LED': 10},
        description: 'Level display of the LED Strip',
    },
    singleTapBehavior: {
        ID: 120,
        dataType: UINT8,
        displayType: 'enum',
        values: {'Old Behavior': 0, 'New Behavior': 1},
        description: 'Behavior of single tapping the on or off button. Old behavior turns the switch on or off. ' +
        'New behavior cycles through the levels set by P131-133.',
    },
    fanControlMode: {
        ID: 130,
        dataType: UINT8,
        displayType: 'enum',
        values: {'Disabled': 0, 'Multi Tap': 1, 'Cycle': 2},
        description: 'Which mode to use when binding EP3 to a fan module.',
    },
    lowLevelForFanControlMode: {
        ID: 131,
        dataType: UINT8,
        min: 2,
        max: 254,
        description: 'Level to send to device bound to EP3 when set to low.',
    },
    mediumLevelForFanControlMode: {
        ID: 132,
        dataType: UINT8,
        min: 2,
        max: 254,
        description: 'Level to send to device bound to EP3 when set to medium.',
    },
    highLevelForFanControlMode: {
        ID: 133,
        dataType: UINT8,
        min: 2,
        max: 254,
        description: 'Level to send to device bound to EP3 when set to high.',
    },
    ledColorForFanControlMode: {
        ID: 134,
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
        description: 'LED color used to display fan control mode.',
    },
};

const VZM36_ATTRIBUTES : {[s: string]: Attribute} = {
    dimmingSpeedUpRemote_1: {...COMMON_ATTRIBUTES.dimmingSpeedUpRemote},
    rampRateOffToOnRemote_1: {...COMMON_ATTRIBUTES.rampRateOffToOnRemote},
    dimmingSpeedDownRemote_1: {...COMMON_ATTRIBUTES.dimmingSpeedDownRemote},
    rampRateOnToOffRemote_1: {...COMMON_ATTRIBUTES.rampRateOnToOffRemote},
    minimumLevel_1: {...COMMON_ATTRIBUTES.minimumLevel},
    maximumLevel_1: {...COMMON_ATTRIBUTES.maximumLevel},
    autoTimerOff_1: {
        ...COMMON_ATTRIBUTES.autoTimerOff,
        description:
        'Automatically turns the light off after this many seconds.' +
        ' When the light is turned on a timer is started. When the timer expires, the light is turned off. 0 = Auto off is disabled.',
    },
    defaultLevelRemote_1: {
        ...COMMON_ATTRIBUTES.defaultLevelRemote,
        description:
        'Default level for the light when it is turned on from the hub.' +
        ' A setting of 255 means that the light will return to the level that it was on before it was turned off.',
    },
    stateAfterPowerRestored_1: {
        ...COMMON_ATTRIBUTES.stateAfterPowerRestored,
        description:
            'The state the light should return to when power is restored after power failure. 0 = off, 1-254 = level, 255 = previous.',
    },
    higherOutputInNonNeutral_1: {...COMMON_ATTRIBUTES.higherOutputInNonNeutral},
    quickStartLightTime_1: {...COMMON_ATTRIBUTES.quickStartLightTime},
    quickStartLightLevel_1: {...COMMON_ATTRIBUTES.quickStartLightLevel},
    smartBulbMode_1: {...COMMON_ATTRIBUTES.smartBulbMode},
    ledColorWhenOn_1: {...COMMON_ATTRIBUTES.ledColorWhenOn},
    ledIntensityWhenOn_1: {...COMMON_ATTRIBUTES.ledIntensityWhenOn},
    // remote protection is readonly...
    outputMode_1: {...COMMON_ATTRIBUTES.outputMode},
    // Endpoint 2 (Fan)
    dimmingSpeedUpRemote_2: {
        ...COMMON_ATTRIBUTES.dimmingSpeedUpRemote,
        description:
        'This changes the speed that the fan ramps up when controlled from the hub. ' +
        'A setting of 0 turns the fan immediately on. Increasing the value slows down the transition speed. ' +
        'Every number represents 100ms. Default = 25 (2.5s)',
    },
    rampRateOffToOnRemote_2: {
        ...COMMON_ATTRIBUTES.rampRateOffToOnRemote,
        description:
        'This changes the speed that the fan turns on when controlled from the hub. ' +
        'A setting of 0 turns the fan immediately on. Increasing the value slows down the transition speed. ' +
        'Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.',
    },
    dimmingSpeedDownRemote_2: {
        ...COMMON_ATTRIBUTES.dimmingSpeedDownRemote,
        description:
        'This changes the speed that the fan ramps down when controlled from the hub. ' +
        'A setting of 0 turns the fan immediately off. Increasing the value slows down the transition speed. ' +
        'Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.',
    },
    rampRateOnToOffRemote_2: {
        ...COMMON_ATTRIBUTES.rampRateOnToOffRemote,
        description:
        'This changes the speed that the fan turns off when controlled from the hub. ' +
        'A setting of \'instant\' turns the fan immediately off. Increasing the value slows down the transition speed. ' +
        'Every number represents 100ms. Default = 127 - Keep in sync with rampRateOffToOnRemote setting.',
    },
    minimumLevel_2: {
        ...COMMON_ATTRIBUTES.minimumLevel,
        description: 'The minimum level that the fan can be set to.',
    },
    maximumLevel_2: {
        ...COMMON_ATTRIBUTES.maximumLevel,
        description: 'The maximum level that the fan can be set to.',
    },
    autoTimerOff_2: {
        ...COMMON_ATTRIBUTES.autoTimerOff,
        description:
        'Automatically turns the fan off after this many seconds.' +
        ' When the fan is turned on a timer is started. When the timer expires, the switch is turned off. 0 = Auto off is disabled.',
    },
    defaultLevelRemote_2: {
        ...COMMON_ATTRIBUTES.defaultLevelRemote,
        description:
        'Default level for the fan when it is turned on from the hub.' +
        ' A setting of 255 means that the fan will return to the level that it was on before it was turned off.',
    },
    stateAfterPowerRestored_2: {
        ...COMMON_ATTRIBUTES.stateAfterPowerRestored,
        description:
        'The state the fan should return to when power is restored after power failure. 0 = off, 1-254 = level, 255 = previous.',
    },
    // power type readonly
    quickStartFan_2: {...COMMON_ATTRIBUTES.quickStartFan},
    // internal temp readonly
    // overheat readonly
    smartBulbMode_2: {
        ...COMMON_ATTRIBUTES.smartBulbMode,
        values: {'Disabled': 0, 'Smart Fan Mode': 1},
        description:
        'For use with Smart Fans that need constant power and are controlled via commands rather than power.',
    },
    // remote protection readonly..
    outputMode_2: {...COMMON_ATTRIBUTES.outputMode},
};

const tzLocal = {
    inovelli_parameters: (ATTRIBUTES: {[s: string]: Attribute})=>({
        key: Object.keys(ATTRIBUTES).filter((a) => !ATTRIBUTES[a].readOnly),
        convertSet: async (entity, key, value, meta) => {
            // Check key to see if there is an endpoint postfix for the VZM36
            const keysplit = key.split('_');
            let entityToUse = entity;
            if (keysplit.length === 2) {
                entityToUse = meta.device.getEndpoint(Number(keysplit[1]));
            }

            if (!(key in ATTRIBUTES)) {
                return;
            }

            const payload = {
                [ATTRIBUTES[key].ID]: {
                    value:
              ATTRIBUTES[key].displayType === 'enum' ?
                  // @ts-expect-error
                  ATTRIBUTES[key].values[value] :
                  value,
                    type: ATTRIBUTES[key].dataType,
                },
            };

            await entityToUse.write('manuSpecificInovelli', payload, {
                manufacturerCode: INOVELLI,
            });

            return {
                state: {
                    [key]: value,
                },
            };
        },
        convertGet: async (entity, key, meta) => {
            // Check key to see if there is an endpoint postfix for the VZM36
            const keysplit = key.split('_');
            let entityToUse = entity;
            let keyToUse = key;
            if (keysplit.length === 2) {
                entityToUse = meta.device.getEndpoint(Number(keysplit[1]));
                keyToUse = keysplit[0];
            }
            await entityToUse.read('manuSpecificInovelli', [keyToUse], {
                manufacturerCode: INOVELLI,
            });
        },
    }) satisfies Tz.Converter,
    inovelli_parameters_readOnly: (ATTRIBUTES: {[s: string]: Attribute})=>({
        key: Object.keys(ATTRIBUTES).filter((a) => ATTRIBUTES[a].readOnly),
        convertGet: async (entity, key, meta) => {
            // Check key to see if there is an endpoint postfix for the VZM36
            const keysplit = key.split('_');
            let entityToUse = entity;
            let keyToUse = key;
            if (keysplit.length === 2) {
                entityToUse = meta.device.getEndpoint(Number(keysplit[1]));
                keyToUse = keysplit[0];
            }
            await entityToUse.read('manuSpecificInovelli', [keyToUse], {
                manufacturerCode: INOVELLI,
            });
        },
    }) satisfies Tz.Converter,
    inovelli_led_effect: {
        key: ['led_effect'],
        convertSet: async (entity, key, values, meta) => {
            await entity.command(
                'manuSpecificInovelli',
                'ledEffect',
                {
                    // @ts-expect-error
                    effect: ledEffects[values.effect],
                    // @ts-expect-error
                    color: Math.min(Math.max(0, values.color), 255),
                    // @ts-expect-error
                    level: Math.min(Math.max(0, values.level), 100),
                    // @ts-expect-error
                    duration: Math.min(Math.max(0, values.duration), 255),
                },
                {disableResponse: true, disableDefaultResponse: true},
            );
            return {state: {[key]: values}};
        },
    } satisfies Tz.Converter,
    inovelli_individual_led_effect: {
        key: ['individual_led_effect'],
        convertSet: async (entity, key, values, meta) => {
            await entity.command(
                'manuSpecificInovelli',
                'individualLedEffect',
                {
                    // @ts-expect-error
                    led: Math.min(Math.max(0, parseInt(values.led)), 7),
                    // @ts-expect-error
                    effect: individualLedEffects[values.effect],
                    // @ts-expect-error
                    color: Math.min(Math.max(0, values.color), 255),
                    // @ts-expect-error
                    level: Math.min(Math.max(0, values.level), 100),
                    // @ts-expect-error
                    duration: Math.min(Math.max(0, values.duration), 255),
                },
                {disableResponse: true, disableDefaultResponse: true},
            );
            return {state: {[key]: values}};
        },
    } satisfies Tz.Converter,
    /**
     * Inovelli VZM31SN has a default transition property that the device should
     * fallback to if a transition is not specified by passing 0xffff
     */
    light_onoff_brightness_inovelli: {
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
                // @ts-expect-error
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
                    // @ts-expect-error
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
                            'manuSpecificInovelli',
                            ['rampRateOffToOnRemote'],
                        );
                        return {
                            state: {state: 'ON'},
                            readAfterWriteTime: transition.specified ?
                                transition.time * 100 :
                                // @ts-expect-error
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
                        // @ts-expect-error
                        result.readAfterWriteTime = 0;
                        if (
                            result.state &&
                result.state.state === 'ON' &&
                meta.state.brightness === 0
                        ) {
                            // @ts-expect-error
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
                    'manuSpecificInovelli',
                    ['rampRateOnToOffRemote'],
                );

                return {
                    state: {
                        state: brightness === 0 ? 'OFF' : 'ON',
                        brightness: Number(brightness),
                    },
                    readAfterWriteTime:
            transition.time === 0 ?
                // @ts-expect-error
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
    } satisfies Tz.Converter,
    fan_mode: {
        key: ['fan_mode'],
        convertSet: async (entity, key, value :string, meta) => {
            await entity.command(
                'genLevelCtrl',
                'moveToLevelWithOnOff',
                {
                    level: fanModes[value],
                    transtime: 0xffff,
                },
                utils.getOptions(meta.mapped, entity),
            );
            return {
                state: {
                    [key]: value,
                    state: 'ON',
                },
            };
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genLevelCtrl', ['currentLevel']);
        },
    } satisfies Tz.Converter,
    fan_state: {
        key: ['fan_state'],
        convertSet: async (entity, key, value, meta) => {
            const state = meta.message.hasOwnProperty('fan_state')?
                meta.message.fan_state.toString().toLowerCase() :
                null;
            utils.validateValue(state, ['toggle', 'off', 'on']);

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
                    {state: {fan_state: currentState === 'OFF' ? 'ON' : 'OFF'}}:
                    {};
            } else {
                return {state: {fan_state: state.toString().toUpperCase()}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['onOff']);
        },
    } satisfies Tz.Converter,
    vzm36_fan_mode: {
        key: ['fan_mode'],
        convertSet: async (entity, key, value: string, meta) => {
            const endpoint = meta.device.getEndpoint(2);

            await endpoint.command(
                'genLevelCtrl',
                'moveToLevelWithOnOff',
                {
                    level: fanModes[parseInt(value) || 0],
                    transtime: 0xffff,
                },
                utils.getOptions(meta.mapped, entity),
            );

            meta.state[key] = value;

            return {
                state: {
                    [key]: value,
                    fan_state: 'ON',
                },
            };
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = meta.device.getEndpoint(2);
            await endpoint.read('genLevelCtrl', ['currentLevel']);
        },
    } satisfies Tz.Converter,
    /**
     * On the VZM36, When turning the fan on and off, we must ensure that we are sending these
     * commands to endpoint 2 on the canopy module.
     */
    vzm36_fan_on_off: {
        key: ['fan_state', 'on_time', 'off_wait_time'],
        convertSet: async (entity, key, value, meta) => {
            const endpoint = meta.device.getEndpoint(2);

            // is entity an endpoint, or just the device? may need to get the actual endpoint..
            utils.assertEndpoint(entity);
            const state = typeof meta.message.fan_state === 'string' ? meta.message.fan_state.toLowerCase() : null;
            utils.validateValue(state, ['toggle', 'off', 'on']);

            if (state === 'on' && (meta.message.hasOwnProperty('on_time') || meta.message.hasOwnProperty('off_wait_time'))) {
                const onTime = meta.message.hasOwnProperty('on_time') ? meta.message.on_time : 0;
                const offWaitTime = meta.message.hasOwnProperty('off_wait_time') ? meta.message.off_wait_time : 0;

                if (typeof onTime !== 'number') {
                    throw Error('The on_time value must be a number!');
                }
                if (typeof offWaitTime !== 'number') {
                    throw Error('The off_wait_time value must be a number!');
                }

                const payload = {ctrlbits: 0, ontime: Math.round(onTime * 10), offwaittime: Math.round(offWaitTime * 10)};
                await endpoint.command('genOnOff', 'onWithTimedOff', payload, utils.getOptions(meta.mapped, entity));
            } else {
                await endpoint.command('genOnOff', state, {}, utils.getOptions(meta.mapped, endpoint));
                if (state === 'toggle') {
                    const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
                    return currentState ? {state: {fan_state: currentState === 'OFF' ? 'ON' : 'OFF'}} : {};
                } else {
                    return {state: {fan_state: state.toUpperCase()}};
                }
            }
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = meta.device.getEndpoint(2);
            await endpoint.read('genOnOff', ['onOff']);
        },
    } satisfies Tz.Converter,
    breezeMode: {
        key: ['breezeMode'],
        convertSet: async (entity, key, values: BreezeModeValues, meta) => {
        // Calculate the value..
            let configValue = 0;
            let term = false;
            configValue += speedToInt(values.speed1);
            configValue += Number(values.time1) / 5 * 4;

            let speed = speedToInt(values.speed2);

            if (speed !== 0) {
                configValue += speed * 64;
                configValue += values.time2 / 5 * 256;
            } else {
                term = true;
            }

            speed = speedToInt(values.speed3);

            if (speed !== 0 && ! term) {
                configValue += speed * 4096;
                configValue += values.time3 / 5 * 16384;
            } else {
                term = true;
            }

            speed = speedToInt(values.speed4);

            if (speed !== 0 && ! term) {
                configValue += speed * 262144;
                configValue += values.time4 / 5 * 1048576;
            } else {
                term = true;
            }

            speed = speedToInt(values.speed5);

            if (speed !== 0 && ! term) {
                configValue += speed * 16777216;
                configValue += values.time5 / 5 * 67108864;
            } else {
                term = true;
            }

            const endpoint = meta.device.getEndpoint(2);

            const payload = {breezeMode: configValue.toString()};
            await endpoint.write('manuSpecificInovelli', payload, {
                manufacturerCode: INOVELLI,
            });

            return {state: {[key]: values}};
        },
    } satisfies Tz.Converter,
};

/*
 * Inovelli VZM31SN has a default transition property that the device should
 * fallback to if a transition is not specified by passing 0xffff
 */
const inovelliOnOffConvertSet = async (entity: Zh.Endpoint | Zh.Group, key: string, value: unknown, meta: Tz.Meta) => {
    // @ts-expect-error
    const state = meta.message.hasOwnProperty('state') ? meta.message.state.toLowerCase() : null;
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

const fzLocal = {
    inovelli: (ATTRIBUTES: {[s: string]: Attribute})=>({
        cluster: 'manuSpecificInovelli',
        type: ['raw', 'readResponse', 'commandQueryNextImageRequest'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.type === 'raw' && msg.endpoint.ID == 2 && msg.data[4] === 0x00) {
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
            } else if (msg.type === 'readResponse') {
                return Object.keys(msg.data).reduce((p, c) => {
                    if (ATTRIBUTES[c].displayType === 'enum') {
                        return {
                            ...p,
                            [c]: Object.keys(ATTRIBUTES[c].values).find(
                                (k) => ATTRIBUTES[c].values[k] === msg.data[c],
                            ),
                        };
                    }
                    return {...p, [c]: msg.data[c]};
                }, {});
            } else {
                return msg.data;
            }
        },
    }) satisfies Fz.Converter,
    fan_mode: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('currentLevel')) {
                const mode = intToFanMode(msg.data['currentLevel'] || 1);
                return {
                    fan_mode: mode,
                };
            }
            return msg.data;
        },
    } satisfies Fz.Converter,
    fan_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                return {fan_state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
            return msg.data;
        },
    } satisfies Fz.Converter,
    brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID == 1) {
                if (msg.data.hasOwnProperty('currentLevel')) {
                    return {brightness: msg.data['currentLevel']};
                }
            }
        },
    } satisfies Fz.Converter,
    /**
     * Decode breeze mode value:
     *
     * 0: disable
     * 1~0xffffffff: custom (using user configuration parameters) 4bytes
     * Up to 5 different options. First two bits determine the speed. Next four bits is time * 5 seconds.
     * 1111 11 1111 11 1111 11 1111 11 1111 11
     * Setting byte: 00-off, 01-low, 10-meduim, 11-high
     * Each 6 bit word is stored in ascending order, step one word being LSB
     *
     * Extract each nybble of the word, then reverse the calculation to get the settig for each.
     */
    breeze_mode: {
        cluster: 'manuSpecificInovelli',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID == 2) {
                if (msg.data.hasOwnProperty('breeze_mode')) {
                    const bitmasks = [3, 60, 192, 3840, 12288, 245760, 786432, 15728640, 50331648, 1006632960];
                    const raw = msg.data['breeze_mode'];
                    const s1 = breezemodes[raw & bitmasks[0]];
                    const s2 = breezemodes[(raw & bitmasks[2]) / 64];
                    const s3 = breezemodes[(raw & bitmasks[4]) / 4096];
                    const s4 = breezemodes[(raw & bitmasks[6]) / 262144];
                    const s5 = breezemodes[(raw & bitmasks[8]) / 16777216];

                    const d1 = (raw & bitmasks[1]) / 4 * 5;
                    const d2 = (raw & bitmasks[3]) / 256 * 5;
                    const d3 = (raw & bitmasks[5]) / 16384 * 5;
                    const d4 = (raw & bitmasks[7]) / 1048576 * 5;
                    const d5 = (raw & bitmasks[9]) / 67108864 * 5;

                    return {
                        breeze_mode: {
                            speed1: s1,
                            duration1: d1,
                            speed2: s2,
                            duration2: d2,
                            speed3: s3,
                            duration3: d3,
                            speed4: s4,
                            duration4: d4,
                            speed5: s5,
                            duration5: d5,
                        },
                    };
                }
            }
        },
    } satisfies Fz.Converter,
    vzm36_fan_light_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID === 1) {
                if (msg.data.hasOwnProperty('onOff')) {
                    return {state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
                }
            } else if (msg.endpoint.ID === 2) {
                if (msg.data.hasOwnProperty('onOff')) {
                    return {fan_state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
                }
            } else {
                return msg.data;
            }
        },
    } satisfies Fz.Converter,
};

const exposesList: Expose[] = [
    e.light_brightness(),
    e.power(),
    e.energy(),
    e
        .composite('led_effect', 'led_effect', ea.STATE_SET)
        .withFeature(
            e
                .enum('effect', ea.STATE_SET, [
                    'off',
                    'solid',
                    'fast_blink',
                    'slow_blink',
                    'pulse',
                    'chase',
                    'open_close',
                    'small_to_big',
                    'aurora',
                    'slow_falling',
                    'medium_falling',
                    'fast_falling',
                    'slow_rising',
                    'medium_rising',
                    'fast_rising',
                    'medium_blink',
                    'slow_chase',
                    'fast_chase',
                    'fast_siren',
                    'slow_siren',
                    'clear_effect',
                ])
                .withDescription('Animation Effect to use for the LEDs'),
        )
        .withFeature(
            e
                .numeric('color', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    'Calculated by using a hue color circle(value/255*360) If color = 255 display white',
                ),
        )
        .withFeature(
            e
                .numeric('level', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Brightness of the LEDs'),
        )
        .withFeature(
            e
                .numeric('duration', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    '1-60 is in seconds calculated 61-120 is in minutes calculated by(value-60) ' +
            'Example a value of 65 would be 65-60 = 5 minutes - 120-254 Is in hours calculated by(value-120) ' +
            'Example a value of 132 would be 132-120 would be 12 hours. - 255 Indefinitely',
                ),
        ),
    e
        .composite('individual_led_effect', 'individual_led_effect', ea.STATE_SET)
        .withFeature(
            e
                .enum('led', ea.STATE_SET, ['1', '2', '3', '4', '5', '6', '7'])
                .withDescription('Individual LED to target.'),
        )
        .withFeature(
            e
                .enum('effect', ea.STATE_SET, [
                    'off',
                    'solid',
                    'fast_blink',
                    'slow_blink',
                    'pulse',
                    'chase',
                    'falling',
                    'rising',
                    'aurora',
                    'clear_effect',
                ])
                .withDescription('Animation Effect to use for the LED'),
        )
        .withFeature(
            e
                .numeric('color', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    'Calculated by using a hue color circle(value/255*360) If color = 255 display white',
                ),
        )
        .withFeature(
            e
                .numeric('level', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Brightness of the LED'),
        )
        .withFeature(
            e
                .numeric('duration', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    '1-60 is in seconds calculated 61-120 is in minutes calculated by(value-60) ' +
            'Example a value of 65 would be 65-60 = 5 minutes - 120-254 Is in hours calculated by(value-120) ' +
            ' Example a value of 132 would be 132-120 would be 12 hours. - 255 Indefinitely',
                ),
        ),
];

const exposesListVZM35: Expose[] = [
    e.fan().withModes(Object.keys(fanModes)),
    e
        .composite('led_effect', 'led_effect', ea.STATE_SET)
        .withFeature(
            e
                .enum('effect', ea.STATE_SET, [
                    'off',
                    'solid',
                    'fast_blink',
                    'slow_blink',
                    'pulse',
                    'chase',
                    'open_close',
                    'small_to_big',
                    'aurora',
                    'slow_falling',
                    'medium_falling',
                    'fast_falling',
                    'slow_rising',
                    'medium_rising',
                    'fast_rising',
                    'medium_blink',
                    'slow_chase',
                    'fast_chase',
                    'fast_siren',
                    'slow_siren',
                    'clear_effect',
                ])
                .withDescription('Animation Effect to use for the LEDs'),
        )
        .withFeature(
            e
                .numeric('color', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    'Calculated by using a hue color circle(value/255*360) If color = 255 display white',
                ),
        )
        .withFeature(
            e
                .numeric('level', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Brightness of the LEDs'),
        )
        .withFeature(
            e
                .numeric('duration', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    '1-60 is in seconds calculated 61-120 is in minutes calculated by(value-60) ' +
            'Example a value of 65 would be 65-60 = 5 minutes - 120-254 Is in hours calculated by(value-120) ' +
            'Example a value of 132 would be 132-120 would be 12 hours. - 255 Indefinitely',
                ),
        ),
    e
        .composite('individual_led_effect', 'individual_led_effect', ea.STATE_SET)
        .withFeature(
            e
                .enum('led', ea.STATE_SET, ['1', '2', '3', '4', '5', '6', '7'])
                .withDescription('Individual LED to target.'),
        )
        .withFeature(
            e
                .enum('effect', ea.STATE_SET, [
                    'off',
                    'solid',
                    'fast_blink',
                    'slow_blink',
                    'pulse',
                    'chase',
                    'falling',
                    'rising',
                    'aurora',
                    'clear_effect',
                ])
                .withDescription('Animation Effect to use for the LED'),
        )
        .withFeature(
            e
                .numeric('color', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    'Calculated by using a hue color circle(value/255*360) If color = 255 display white',
                ),
        )
        .withFeature(
            e
                .numeric('level', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Brightness of the LED'),
        )
        .withFeature(
            e
                .numeric('duration', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    '1-60 is in seconds calculated 61-120 is in minutes calculated by(value-60) ' +
            'Example a value of 65 would be 65-60 = 5 minutes - 120-254 Is in hours calculated by(value-120) ' +
            ' Example a value of 132 would be 132-120 would be 12 hours. - 255 Indefinitely',
                ),
        ),
];

const exposesListVZM36: Expose[] = [
    e.light_brightness(),
    e.fan().withModes(Object.keys(fanModes)),

    // Breezee
    e.composite('breeze mode', 'breezeMode', ea.STATE_SET)
        .withFeature(
            e
                .enum('speed1', ea.STATE_SET, [
                    'low',
                    'medium',
                    'high',
                ])
                .withDescription('Step 1 Speed'),
        )
        .withFeature(
            e
                .numeric('time1', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(80)
                .withDescription(
                    'Duration (s) for fan in Step 1  ',
                ),
        )
        .withFeature(
            e
                .enum('speed2', ea.STATE_SET, [
                    'low',
                    'medium',
                    'high',
                ])
                .withDescription('Step 2 Speed'),
        )
        .withFeature(
            e
                .numeric('time2', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(80)
                .withDescription(
                    'Duration (s) for fan in Step 2  ',
                ),
        )
        .withFeature(
            e
                .enum('speed3', ea.STATE_SET, [
                    'low',
                    'medium',
                    'high',
                ])
                .withDescription('Step 3 Speed'),
        )
        .withFeature(
            e
                .numeric('time3', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(80)
                .withDescription(
                    'Duration (s) for fan in Step 3  ',
                ),
        )
        .withFeature(
            e
                .enum('speed4', ea.STATE_SET, [
                    'low',
                    'medium',
                    'high',
                ])
                .withDescription('Step 4 Speed'),
        )
        .withFeature(
            e
                .numeric('time4', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(80)
                .withDescription(
                    'Duration (s) for fan in Step 4  ',
                ),
        )
        .withFeature(
            e
                .enum('speed5', ea.STATE_SET, [
                    'low',
                    'medium',
                    'high',
                ])
                .withDescription('Step 5 Speed'),
        )
        .withFeature(
            e
                .numeric('time5', ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(80)
                .withDescription(
                    'Duration (s) for fan in Step 5  ',
                ),
        ),
];

// Populate exposes list from the attributes description
attributesToExposeList(VZM31_ATTRIBUTES, exposesList);
attributesToExposeList(VZM35_ATTRIBUTES, exposesListVZM35);
attributesToExposeList(VZM36_ATTRIBUTES, exposesListVZM36);

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

exposesListVZM35.push(
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

const definitions: Definition[] = [
    {
        zigbeeModel: ['VZM31-SN'],
        model: 'VZM31-SN',
        vendor: 'Inovelli',
        description: '2-in-1 switch + dimmer',
        exposes: exposesList,
        toZigbee: [
            tzLocal.light_onoff_brightness_inovelli,
            tz.power_on_behavior,
            tz.ignore_transition,
            tzLocal.inovelli_led_effect,
            tzLocal.inovelli_individual_led_effect,
            tzLocal.inovelli_parameters(VZM31_ATTRIBUTES),
            tzLocal.inovelli_parameters_readOnly(VZM31_ATTRIBUTES),
        ],
        fromZigbee: [
            fz.on_off,
            fz.brightness,
            fz.level_config,
            fz.power_on_behavior,
            fz.ignore_basic_report,
            fz.electrical_measurement,
            fz.metering,
            fzLocal.inovelli(VZM31_ATTRIBUTES),
        ],
        ota: ota.inovelli,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'seMetering',
                'haElectricalMeasurement',
                'genOnOff',
                'genLevelCtrl',
            ]);
            await reporting.onOff(endpoint);

            // Bind for Button Event Reporting
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, [
                'manuSpecificInovelli',
            ]);
            await endpoint.read('haElectricalMeasurement', [
                'acPowerMultiplier',
                'acPowerDivisor',
            ]);
            await reporting.readMeteringMultiplierDivisor(endpoint);

            await reporting.activePower(endpoint, {min: 15, max: 3600, change: 1});
            await reporting.currentSummDelivered(endpoint, {
                min: 15,
                max: 3600,
                change: 0,
            });
        },
    },
    {
        zigbeeModel: ['VZM35-SN'],
        model: 'VZM35-SN',
        vendor: 'Inovelli',
        description: 'Fan controller',
        fromZigbee: [
            fzLocal.fan_state,
            fzLocal.fan_mode,
            fzLocal.breeze_mode,
            fzLocal.inovelli(VZM35_ATTRIBUTES),
        ],
        toZigbee: [
            tzLocal.fan_state,
            tzLocal.fan_mode,
            tzLocal.inovelli_led_effect,
            tzLocal.inovelli_individual_led_effect,
            tzLocal.inovelli_parameters(VZM35_ATTRIBUTES),
            tzLocal.inovelli_parameters_readOnly(VZM35_ATTRIBUTES),
            tzLocal.breezeMode,
        ],
        exposes: exposesListVZM35,
        ota: ota.inovelli,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genOnOff',
                'genLevelCtrl',
            ]);
            // Bind for Button Event Reporting
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, [
                'manuSpecificInovelli',
            ]);
        },
    },
    {
        zigbeeModel: ['VZM36'],
        model: 'VZM36',
        vendor: 'Inovelli',
        description: 'Fan canopy module',
        fromZigbee: [
            fz.identify,
            fzLocal.brightness,
            fzLocal.vzm36_fan_light_state,
            fzLocal.fan_mode,
            fzLocal.breeze_mode,
            fzLocal.inovelli(VZM36_ATTRIBUTES),
        ],
        toZigbee: [
            tzLocal.vzm36_fan_on_off, // Need to use VZM36 specific converter
            tzLocal.vzm36_fan_mode, // Need to use VZM36 specific converter
            tzLocal.light_onoff_brightness_inovelli,
            tzLocal.inovelli_parameters(VZM36_ATTRIBUTES),
            tzLocal.inovelli_parameters_readOnly(VZM36_ATTRIBUTES),
            tzLocal.breezeMode,
        ],
        exposes: exposesListVZM36,
        ota: ota.inovelli,
        // The configure method below is needed to make the device reports on/off state changes
        // when the device is controlled manually through the button on it.
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
    },
];

export default definitions;
module.exports = definitions;
