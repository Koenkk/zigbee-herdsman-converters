/* eslint-disable @typescript-eslint/no-unused-vars */
/* TODO : remove eslint-disable when dev is done */

import {Zcl} from 'zigbee-herdsman';
import {ClusterDefinition} from 'zigbee-herdsman/dist/zspec/zcl/definition/tstype';

import {repInterval} from '../lib/constants';
import * as exposes from '../lib/exposes';
import {logger} from '../lib/logger';
import {
    binary,
    commandsLevelCtrl,
    commandsOnOff,
    commandsWindowCovering,
    deviceEndpoints,
    enumLookup,
    forcePowerSource,
    identify,
    light,
    numeric,
    onOff,
    ota,
    windowCovering,
} from '../lib/modernExtend';
import {DefinitionWithExtend, KeyValue, KeyValueAny, ModernExtend, OnEvent, Tz} from '../lib/types';
import * as utils from '../lib/utils';

// #region Constants

const e = exposes.presets;
const ea = exposes.access;

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.YOKIS};
const NS = 'zhc:yokis';

// PowerFailureMode (manuSpecificYokisSubSystem)
const powerFailureModeEnum: {[s: string]: number} = {
    last_state: 0x00,
    off: 0x01,
    on: 0x02,
    blink: 0x03,
};

// timeTypeEnum (manuSpecificYokisLightControl)
const timeTypeEnum: {[s: string]: number} = {
    Seconds: 0x00,
    Minutes: 0x01,
};

// operatingModeEnum (manuSpecificYokisLightControl)
const operatingModeEnum: {[s: string]: number} = {
    Timer: 0x00,
    Staircase: 0x01,
    Pulse: 0x02,
};

// stateAfterBlinkEnum (manuSpecificYokisLightControl)
const stateAfterBlinkEnum: {[s: string]: number} = {
    Previous: 0x00,
    OFF: 0x01,
    ON: 0x02,
    INFINITE: 0x03,
};

// resetActionEnum (manuSpecificYokisDevice)
const resetActionEnum: {[s: string]: number} = {
    'Factory reset': 0x00,
    'Configuration Reset': 0x01,
    'Network Reset': 0x02,
};

// inputModeEnum (manuSpecificYokisInput)
const inputModeEnum: {[s: string]: number} = {
    Unknown: 0x00,
    'Push button': 0x01, // default
    Switch: 0x02,
    Relay: 0x03,
    FP_IN: 0x04, // Fil pilote
};

// contactModeEnum (manuSpecificYokisInput)
const contactModeEnum: {[s: string]: number} = {
    NC: 0x00,
    NO: 0x01, // default
};

// onOffClusterModeEnum (manuSpecificYokisChannel)
const onOffClusterModeEnum: {[s: number]: string} = {
    0x00: 'toggle',
    0x01: 'on',
    0x02: 'off',
    0x03: 'off',
};

// levelControlClusterModeEnum (manuSpecificYokisChannel)
const levelControlClusterModeEnum: {[s: number]: string} = {
    0x00: 'nothing',
    0x01: 'move up',
    0x02: 'move down',
    0x03: 'stop',
};

// windowCoveringClusterModeEnum (manuSpecificYokisChannel)
const windowCoveringClusterModeEnum: {[s: number]: string} = {
    0x00: 'toggle',
    0x01: 'up/open',
    0x02: 'down/close',
    0x03: 'stop',
};

// sendingModeEnum (manuSpecificYokisChannel)
const sendingModeEnum: {[s: number]: string} = {
    0x00: 'direct',
    0x01: 'broadcast',
    0x02: 'group',
};

// yokisLightControlModeEnum (manuSpecificYokisChannel)
const yokisLightControlModeEnum: {[s: number]: string} = {
    0x00: 'pulse',
    0x01: 'deaf',
};

// yokisPilotWireClusterModeEnum (manuSpecificYokisChannel)
const yokisPilotWireClusterModeEnum: {[s: number]: string} = {
    0x00: 'toggle',
    0x01: 'confort',
    0x02: 'eco',
};
// #endregion

// #region Custom cluster definition

const YokisClustersDefinition: {
    [s: string]: ClusterDefinition;
} = {
    manuSpecificYokisDevice: {
        ID: 0xfc01,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Indicate if the device configuration has changed. 0 to 0xFFFE -> No Change, 0xFFFF -> Change have been detected
            configurationChanged: {ID: 0x0005, type: Zcl.DataType.ENUM16},
        },
        commands: {
            // Reset setting depending on RESET ACTION value
            resetToFactorySettings: {
                ID: 0x00,
                response: 0,
                parameters: [
                    // 0x00 -> Factory reset, 0x01 -> Configuration Reset, 0x02 -> Network Reset
                    {name: 'uc_ResetAction', type: Zcl.DataType.INT8},
                ],
            },
            // Relaunch BLE advertising for 15 minutes
            relaunchBleAdvert: {
                ID: 0x11,
                response: 0,
                parameters: [],
            },
            // Open ZigBee network
            openNetwork: {
                ID: 0x12,
                response: 0,
                parameters: [
                    // Opening time wanted from 1 to 255 seconds,0 means closing the network.
                    {name: 'uc_OpeningTime', type: Zcl.DataType.INT8},
                ],
            },
        },
        commandsResponse: {},
    },
    manuSpecificYokisInput: {
        ID: 0xfc02,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Indicate how the input should be handle: 0 -> Unknow, 1 -> Push button, 2 -> Switch, 3 -> Relay, 4 -> FP_IN
            inputMode: {ID: 0x0000, type: Zcl.DataType.ENUM8},
            // Indicate the contact nature of the entry: 0 -> NC, 1 -> NO
            contactMode: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
            // Indicate the last known state of the local BP (Bouton Poussoir, or Push Button)
            lastLocalCommandState: {ID: 0x0002, type: Zcl.DataType.BOOLEAN},
            // Indicate the last known state of the Bp connect
            lastBPConnectState: {ID: 0x0003, type: Zcl.DataType.BOOLEAN},
            // Indicate the backlight intensity applied on the keys. Only use for “Simon” product. Default: 0x0A, Min-Max: 0x00 - 0x64
            backlightIntensity: {ID: 0x0004, type: Zcl.DataType.UINT8},
        },
        commands: {
            // Send to the server cluster a button press
            sendPress: {
                ID: 0x00,
                parameters: [],
            },
            // Send to the server cluster a button release
            sendRelease: {
                ID: 0x01,
                parameters: [],
            },
            // Change the Input mode to use switch input, wired relay or simple push button
            selectInputMode: {
                ID: 0x02,
                parameters: [
                    // Input mode to be set. See @inputMode
                    {name: 'uc_InputMode', type: Zcl.DataType.UINT8},
                ],
            },
        },
        commandsResponse: {},
    },
    manuSpecificYokisEntryConfigurator: {
        ID: 0xfc03,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Use to enable short press action
            eShortPress: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
            // Use to enable long press action
            eLongPress: {ID: 0x0002, type: Zcl.DataType.BOOLEAN},
            // Define long Press duration in milliseconds. Default: 0x0BB8, Min-Max: 0x00 - 0x1388
            longPressDuration: {ID: 0x0003, type: Zcl.DataType.UINT16},
            // Define the maximum time between 2 press to keep in a sequence (In milliseconds). Default: 0x01F4, Min-Max: 0x0064 - 0x0258
            timeBetweenPress: {ID: 0x0004, type: Zcl.DataType.UINT16},
            // Enable R12M Long Press action
            eR12MLongPress: {ID: 0x0005, type: Zcl.DataType.BOOLEAN},
            // Disable local configuration
            eLocalConfigLock: {ID: 0x0006, type: Zcl.DataType.BOOLEAN},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificYokisSubSystem: {
        ID: 0xfc04,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Define the device behavior after power failure : 0 -> LAST STATE, 1 -> OFF, 2 -> ON, 3-> BLINK
            powerFailureMode: {ID: 0x0001, type: Zcl.DataType.ENUM8},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificYokisLoadManager: {
        ID: 0xfc05, // Details coming soon
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {},
        commands: {},
        commandsResponse: {},
    },
    manuSpecificYokisLightControl: {
        ID: 0xfc06,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Use to know which state is the relay
            onOff: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
            // Indicate the previous state before action
            prevState: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
            // Define the ON embedded timer duration in seconds.  Default: 0x00, Min-Max: 0x00 – 0x00409980
            onTimer: {ID: 0x0002, type: Zcl.DataType.UINT32},
            // Enable (0x01) / Disable (0x00) use of onTimer.
            eOnTimer: {ID: 0x0003, type: Zcl.DataType.BOOLEAN},
            // Define the PRE-ON embedded delay in seconds.  Default: 0x00, Min-Max: 0x00 – 0x00409980
            preOnDelay: {ID: 0x0004, type: Zcl.DataType.UINT32},
            // Enable (0x01) / Disable (0x00) use of PreOnTimer.
            ePreOnDelay: {ID: 0x0005, type: Zcl.DataType.BOOLEAN},
            // Define the PRE-OFF embedded delay in seconds.  Default: 0x00, Min-Max: 0x00 – 0x00409980
            preOffDelay: {ID: 0x0008, type: Zcl.DataType.UINT32},
            // Enable (0x01) / Disable (0x00) PreOff delay.
            ePreOffDelay: {ID: 0x0009, type: Zcl.DataType.BOOLEAN},
            // Set the value of ON pulse length. Default: 0x01F4, Min-Max: 0x0014 – 0xFFFE
            pulseDuration: {ID: 0x000a, type: Zcl.DataType.UINT16},
            // Indicates the current Type of time selected that will be used during push button configuration: 0x00 -> Seconds, 0x01 -> Minutes
            timeType: {ID: 0x000b, type: Zcl.DataType.ENUM8},
            // Set the value of the LONG ON embedded timer in seconds.  Default: 0x5460 (1h), Min-Max: 0x00 – 0x00409980
            longOnDuration: {ID: 0x000c, type: Zcl.DataType.UINT32},
            // Indicates the operating mode: 0x00 -> Timer, 0x01 -> Staircase, 0x02 -> Pulse
            operatingMode: {ID: 0x000d, type: Zcl.DataType.ENUM8},
            // Time before goes off after the stop announce blinking. (In seconds).  Default: 0x0000, Min-Max: 0x00 – 0x00409980
            stopAnnounceTime: {ID: 0x0013, type: Zcl.DataType.UINT32},
            // Enable (0x01) / Disable (0x00) the announcement before turning OFF.
            eStopAnnounce: {ID: 0x0014, type: Zcl.DataType.BOOLEAN},
            // Enable (0x01) / Disable (0x00) Deaf Actions.
            eDeaf: {ID: 0x0015, type: Zcl.DataType.BOOLEAN},
            // Enable (0x01) / Disable (0x00) Blink Actions.
            eBlink: {ID: 0x0016, type: Zcl.DataType.BOOLEAN},
            // Number of blinks done when receiving the corresponding order. One blink is considered as one ON step followed by one OFF step.
            // Default: 0x03, Min-Max: 0x00 – 0x14
            blinkAmount: {ID: 0x0017, type: Zcl.DataType.UINT8},
            // Duration for the ON time on a blink period (In millisecond).  Default: 0x000001F4, Min-Max: 0x00 – 0x00409980
            blinkOnTime: {ID: 0x0018, type: Zcl.DataType.UINT32},
            // Duration for the OFF time on a blink period (In millisecond).  Default: 0x000001F4, Min-Max: 0x00 – 0x00409980
            blinkOffTime: {ID: 0x0019, type: Zcl.DataType.UINT32},
            // Define number of blink to do when receiving the DEAF action. One blink is considered as one ON step followed by one OFF step.
            // Default: 0x03, Min-Max: 0x00 – 0x14
            deafBlinkAmount: {ID: 0x001a, type: Zcl.DataType.UINT8},
            // Define duration of a blink ON (In millisecond). Default: 0x0320, Min-Max: 0x0064– 0x4E20
            deafBlinkTime: {ID: 0x001b, type: Zcl.DataType.UINT16},
            // Indicate which state must be apply after a blink sequence: 0x00 -> State before blinking, 0x01 -> OFF, 0x02 -> ON
            stateAfterBlink: {ID: 0x001c, type: Zcl.DataType.ENUM8},
            // Define the output relay as Normaly close.
            eNcCommand: {ID: 0x001d, type: Zcl.DataType.BOOLEAN},
        },
        commands: {
            // Move to position specified in uc_BrightnessEnd parameter.
            // If TOR mode or MTR is set (no dimming) : if uc_BrightnessEnd under 50% will set to OFF else will be set to ON
            moveToPosition: {
                ID: 0x02,
                parameters: [
                    {name: 'uc_BrightnessStart', type: Zcl.DataType.UINT8},
                    {name: 'uc_BrightnessEnd', type: Zcl.DataType.UINT8},
                    {name: 'ul_PreTimerValue', type: Zcl.DataType.UINT32},
                    {name: 'b_PreTimerEnable', type: Zcl.DataType.BOOLEAN},
                    {name: 'ul_TimerValue', type: Zcl.DataType.UINT32},
                    {name: 'b_TimerEnable', type: Zcl.DataType.BOOLEAN},
                    {name: 'ul_TransitionTime', type: Zcl.DataType.UINT32},
                ],
            },
            // This command allows the relay to be controlled with an impulse. The pulse time is defined by PulseLength.
            pulse: {
                ID: 0x04,
                parameters: [{name: 'PulseLength', type: Zcl.DataType.UINT16}],
            },
            // With this command, the module is asked to perform a blinking sequence.
            blink: {
                ID: 0x05,
                parameters: [
                    {name: 'uc_BlinkAmount', type: Zcl.DataType.UINT8},
                    {name: 'ul_BlinkOnPeriod', type: Zcl.DataType.UINT32},
                    {name: 'ul_BlinkOffPeriod', type: Zcl.DataType.UINT32},
                    {name: 'uc_StateAfterSequence', type: Zcl.DataType.UINT8},
                    {name: 'b_DoPeriodicCycle', type: Zcl.DataType.BOOLEAN},
                ],
            },
            // Start a deaf sequene on a device only if the attribute “eDeaf” is set to Enable.
            deafBlink: {
                ID: 0x06,
                parameters: [
                    {name: 'uc_BlinkAmount', type: Zcl.DataType.UINT8},
                    {name: 'ul_BlinkOnTime', type: Zcl.DataType.UINT16},
                    {name: 'uc_SequenceAmount', type: Zcl.DataType.UINT8},
                    {name: 'tuc_BlinkAmount', type: Zcl.DataType.ARRAY},
                ],
            },
            // Switch output ON for LONG ON DURATION time.
            longOn: {
                ID: 0x07,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    manuSpecificYokisDimmer: {
        ID: 0xfc07, // Details coming soon
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // This attribute defines the current position, in %. Default: 0x00, Min-Max: 0x00 - 0x64
            currentPosition: {ID: 0x0000, type: Zcl.DataType.UINT8},
            // This attribute defines the memory position, in %. Default: 0x00, Min-Max: 0x00 - 0x64
            memoryPosition: {ID: 0x0001, type: Zcl.DataType.UINT8},
            // This attribute defines if a ramp up should be used or not.
            eRampUp: {ID: 0x0002, type: Zcl.DataType.BOOLEAN},
            // This attribute defines the time taken during the ramp up in ms. Default: 0x000003E8, Min-Max: 0x00000000 – 0x05265C00
            rampUp: {ID: 0x0003, type: Zcl.DataType.UINT32},
            // This attribute defines if a ramp down should be used or not.
            eRampDown: {ID: 0x0004, type: Zcl.DataType.BOOLEAN},
            // This attribute defines the time taken during the ramp down in ms. Default: 0x000003E8, Min-Max: 0x00000000 – 0x05265C00
            rampDown: {ID: 0x0005, type: Zcl.DataType.UINT32},
            // This attribute defines the time taken during the ramp loop in ms. Default: 0x00000FA0, Min-Max: 0x00000000 – 0x05265C00
            rampContinuousTime: {ID: 0x0006, type: Zcl.DataType.UINT32},
            // This attribute defines the value of each step during a dimming up. This value is set in %. Default: 0x01, Min-Max: 0x00 - 0x64
            stepUp: {ID: 0x0007, type: Zcl.DataType.UINT8},
            // This attribute defines the value of the low dim limit, used during a dimming loop, on a long press for example. This value is set in %. Default: 0x06, Min-Max: 0x00 - 0x64
            lowDimLimit: {ID: 0x0008, type: Zcl.DataType.UINT8},
            // This attribute defines the value of the high dim limit, used during a dimming loop, on a long press for example. This value is set in %. Default: 0x64, Min-Max: 0x00 - 0x64
            highDimLimit: {ID: 0x0009, type: Zcl.DataType.UINT8},
            // This attribute defines the time before the nightlight begin. This value is set in seconds. Default: 0x00000000, Min-Max: 0x00000000 – 0xFFFFFFFE
            nightLightStartingDelay: {ID: 0x000c, type: Zcl.DataType.UINT32},
            // This attribute defines the dimming value at the start of the nightlight. This value is set in %. Default: 0x28, Min-Max: 0x00 - 0x64
            nightLightStartingBrightness: {ID: 0x000d, type: Zcl.DataType.UINT8},
            // This attribute defines the dimming value at the last step of the nightlight. This attribute must be lower than 0x000D :Nightlight starting brightness. This value is set in %. Default: 0x05, Min-Max: 0x00 - 0x64
            nightLightEndingBrightness: {ID: 0x000e, type: Zcl.DataType.UINT8},
            // This attribute defines the ramp duration of the nightlight. The ramp is running after the end of the starting delay and until the ending bright is reached. This value is set in seconds. Default: 0x00000E10, Min-Max: 0x00000000 – 0x05265C00
            nightLightRampTime: {ID: 0x000f, type: Zcl.DataType.UINT32},
            // This attribute defines the total duration of the nightlight. It must not be lower than 0x000F : Nightlight ramp time. This value is set in seconds. Default: 0x00000E10, Min-Max: 0x00000000 – 0x05265C00
            nightLightOnTime: {ID: 0x0010, type: Zcl.DataType.UINT32},
            // This attribute defines the value of the favorite position 1. This value is set in %. Default: 0x19, Min-Max: 0x00 - 0x64
            favoritePosition1: {ID: 0x0011, type: Zcl.DataType.UINT8},
            // This attribute defines the value of the favorite position 2. This value is set in %. Default: 0x32, Min-Max: 0x00 - 0x64
            favoritePosition2: {ID: 0x0012, type: Zcl.DataType.UINT8},
            // This attribute defines the value of the favorite position 3. This value is set in %. Default: 0x4B, Min-Max: 0x00 - 0x64
            favoritePosition3: {ID: 0x0013, type: Zcl.DataType.UINT8},
            // This attribute enables or disables the 2-step controller mode. This mode enable product to run without any ramp before and after ON or OFF. It acts like a relay.
            stepControllerMode: {ID: 0x0014, type: Zcl.DataType.BOOLEAN},
            // This attribute enables or disables the memory position mode at first push button release.
            memoryPositionMode: {ID: 0x0015, type: Zcl.DataType.BOOLEAN},
            // This attribute defines the value of each step during a dimming down. This value is set in %. Default: 0x01, Min-Max: 0x01 - 0x64
            stepDown: {ID: 0x0016, type: Zcl.DataType.UINT8},
            // This attribute defines the value of each step during a dimming loop. This value is set in %. Default: 0x01, Min-Max: 0x01 - 0x64
            stepContinuous: {ID: 0x0017, type: Zcl.DataType.UINT8},
            // This attribute defines the value of each step during the ramp down of the nightlight mode. This value is set in %. Default: 0x01, Min-Max: 0x01 - 0x64
            stepNightLigth: {ID: 0x0018, type: Zcl.DataType.UINT8},
        },
        commands: {
            // Start dimming up, from current position to the upper dim limit. When the limit is reached, stay at this position.
            dimUp: {
                ID: 0x00,
                parameters: [],
            },
            // Start dimming down, from current position to the lower dim limit. When the limit is reached, stay at this position.
            dimDown: {
                ID: 0x01,
                parameters: [],
            },
            // Start the dimming loop process for the selected duration.
            dim: {
                ID: 0x02,
                parameters: [
                    // Set the duration of the ramp for the continuous variation, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: 'ul_RampContinuousDuration', type: Zcl.DataType.UINT32},
                    // Set the step size, otherwise use 0xFF to use the one configured in the product.. Value is in %.
                    {name: 'uc_StepContinuous', type: Zcl.DataType.UINT8},
                ],
            },
            // Stop the actual dimming process.
            dimStop: {
                ID: 0x04,
                parameters: [],
            },
            // Start dimming to the min value set in the device.
            dimToMin: {
                ID: 0x05,
                parameters: [
                    // Set the transition time to the selected value, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: 'ul_TransitionTime', type: Zcl.DataType.UINT32},
                ],
            },
            // Start dimming to the max value set in the device.
            dimToMax: {
                ID: 0x06,
                parameters: [
                    // Set the transition time to the selected value, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: 'ul_TransitionTime', type: Zcl.DataType.UINT32},
                ],
            },
            // Start the nightlight mode with the given parameters.
            startNightLightMode: {
                ID: 0x07,
                parameters: [
                    // Set the starting delay value, used before the start of the nightlight, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: 'ul_ChildModeStartingDelay', type: Zcl.DataType.UINT32},
                    // Set the brightness at the beginning of the ramp, otherwise use 0xFF to use the one configured in the product. Value is in %.
                    {name: 'uc_ChildModeBrightnessStart', type: Zcl.DataType.UINT8},
                    // Set the brightness at the end of the ramp, otherwise use 0xFF to use the one configured in the product. Value is in %.
                    {name: 'uc_ChildModeBrightnessEnd', type: Zcl.DataType.UINT8},
                    // Set the ramp duration, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: 'ul_ChildModeRampDuration', type: Zcl.DataType.UINT32},
                    // Set the total duration of the nightlight, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: 'ul_ChildModeOnDuration', type: Zcl.DataType.UINT32},
                    // Set the step size between each dim, otherwise use 0xFF to use the one configured in the product. Value is in %.
                    {name: 'uc_ChildStep', type: Zcl.DataType.UINT8},
                ],
            },
            // Start the nightlight mode from the current dimming value.
            startNightLightModeCurrent: {
                ID: 0x08,
                parameters: [],
            },
            // Start dimming to the favorite position 1.
            moveToFavorite1: {
                ID: 0x09,
                parameters: [],
            },
            // Start dimming to the favorite position 2.
            moveToFavorite2: {
                ID: 0x0a,
                parameters: [],
            },
            // Start dimming to the favorite position 3.
            moveToFavorite3: {
                ID: 0x0b,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    manuSpecificYokisWindowCovering: {
        ID: 0xfc08, // Details coming soon
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {},
        commands: {},
        commandsResponse: {},
    },
    manuSpecificYokisChannel: {
        ID: 0xfc09, // Details coming soon
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Define the command to send to the servers using cluster On/Off. 0x00 -> toggle, 0x01 -> ON, 0x02 -> OFF, 0x03 -> OFF
            onOffClusterMode: {ID: 0x0000, type: Zcl.DataType.ENUM8},
            // Define the command to send to the servers using cluster Level control. 0x00 -> nothing, 0x01 -> Move up, 0x02 -> Move down, 0x03 -> stop
            levelControlClusterMode: {ID: 0x0001, type: Zcl.DataType.ENUM8},
            // Define the command to send to the servers using cluster Window Covering. 0x00 -> toggle, 0x01 -> up/open, 0x02 -> down/close, 0x03 -> stop
            windowCoveringClusterMode: {ID: 0x0002, type: Zcl.DataType.ENUM8},
            // Defines the cluster that will be used by the channel to create an order. Default: 0xFFF0, Min-Max: 0x0000 – 0xFFFF
            clusterToBeUsed: {ID: 0x0003, type: Zcl.DataType.UINT16},
            // Define the channel sending mode. 0x00 -> Direct, 0x01 -> Broadcast, 0x02 -> Group
            sendingMode: {ID: 0x0004, type: Zcl.DataType.ENUM8},
            // Define the light control mode used between remote and the binded device. 0x00 -> Mode pulse, 0x01 -> Mode deaf
            yokisLightControlMode: {ID: 0x0005, type: Zcl.DataType.ENUM8},
            // Define the command to send to the servers using cluster Yokis Pilot Wire. 0x00 -> toggle, 0x01 -> confort, 0x02 -> eco
            yokisPilotWireClusterMode: {ID: 0x0006, type: Zcl.DataType.ENUM8},
            // Indicate the group id who will receive the command from the dedicated endpoint. Default: 0x0000, Min-Max: 0x0000 – 0xFFFF
            groupId: {ID: 0x0007, type: Zcl.DataType.UINT16},
        },
        commands: {},
        commandsResponse: {},
    },
    manuSpecificYokisPilotWire: {
        ID: 0xfc0a, // Details coming soon
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {},
        commands: {},
        commandsResponse: {},
    },
    manuSpecificYokisStats: {
        ID: 0xfcf0, // Details coming soon
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {},
        commands: {},
        commandsResponse: {},
    },
};

function deviceAddCustomClusters(clusterNames: string[]): ModernExtend {
    // Follow-up with https://github.com/Koenkk/zigbee2mqtt/issues/22425
    // The onEvent is creating a race conditions at startup : this implementation may change in the future.
    const onEvent: OnEvent = async (type, data, device, options, state: KeyValue) => {
        logger.debug(`Loading Custom Clusters for ${device.modelID} (event: ${type})`, NS);

        for (const name of clusterNames) {
            if (!device.customClusters[name]) {
                logger.debug(`Adding custom cluster '${name}' : ${YokisClustersDefinition[name]}`, NS);
                device.addCustomCluster(name, YokisClustersDefinition[name]);
            }
        }
    };

    return {onEvent, isModernExtend: true};
}

// #endregion

// #region Extension definition

const yokisExtendChecks = {
    parseResetInput: (input: string) => {
        if (!input) {
            return yokisExtendChecks.failure({reason: 'MISSING_INPUT'});
        }

        if (!Object.keys(resetActionEnum).includes(input)) {
            return yokisExtendChecks.failure({reason: 'INVALID_RESET_ACTION'});
        }

        return {
            isSuccess: true,
            payload: {
                uc_ResetAction: utils.getFromLookup(input, resetActionEnum),
            },
        };
    },
    parseOpenNetworkInput: (input: KeyValueAny) => {
        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('uc_OpeningTime' in input) || !utils.isNumber(input.uc_OpeningTime)) {
            return yokisExtendChecks.failure({reason: 'INVALID_OPENNETWORK_OPENINGTIME'});
        }

        return {
            isSuccess: true,
            payload: {
                uc_OpeningTime: input.uc_OpeningTime,
            },
        };
    },
    parseInputModeInput: (input: KeyValueAny) => {
        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('uc_InputMode' in input) || !Object.keys(inputModeEnum).includes(input.uc_InputMode)) {
            return yokisExtendChecks.failure({reason: 'INVALID_INPUTMODE'});
        }

        return {
            isSuccess: true,
            payload: {
                uc_InputMode: utils.getFromLookup(input.uc_InputMode, inputModeEnum),
            },
        };
    },
    parseMoveToPositionInput: (input: KeyValueAny) => {
        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('uc_BrightnessStart' in input) || !utils.isNumber(input.uc_BrightnessStart)) {
            return yokisExtendChecks.failure({reason: 'INVALID_MOVE_BRIGHTNESSSTART'});
        }

        if (!('uc_BrightnessEnd' in input) || !utils.isNumber(input.uc_BrightnessEnd)) {
            return yokisExtendChecks.failure({reason: 'INVALID_MOVE_BRIGHTNESSEND'});
        }

        if (!('ul_PreTimerValue' in input) || !utils.isNumber(input.ul_PreTimerValue)) {
            return yokisExtendChecks.failure({reason: 'INVALID_MOVE_PRETIMERVALUE'});
        }

        if (!('b_PreTimerEnable' in input) || !utils.isBoolean(input.b_PreTimerEnable)) {
            return yokisExtendChecks.failure({reason: 'INVALID_MOVE_PRETIMERENABLE'});
        }

        if (!('ul_TimerValue' in input) || !utils.isNumber(input.ul_TimerValue)) {
            return yokisExtendChecks.failure({reason: 'INVALID_MOVE_TIMERVALUE'});
        }

        if (!('b_TimerEnable' in input) || !utils.isBoolean(input.b_TimerEnable)) {
            return yokisExtendChecks.failure({reason: 'INVALID_MOVE_TIMERENABLE'});
        }

        if (!('ul_TransitionTime' in input) || !utils.isNumber(input.ul_TransitionTime)) {
            return yokisExtendChecks.failure({reason: 'INVALID_MOVE_TRANSITIONTIME'});
        }

        return {
            isSuccess: true,
            payload: {
                uc_BrightnessStart: input.uc_BrightnessStart,
                uc_BrightnessEnd: input.uc_BrightnessEnd,
                ul_PreTimerValue: input.ul_PreTimerValue,
                b_PreTimerEnable: input.b_PreTimerEnable ? 1 : 0,
                ul_TimerValue: input.ul_TimerValue,
                b_TimerEnable: input.b_TimerEnable ? 1 : 0,
                ul_TransitionTime: input.ul_TransitionTime,
            },
        };
    },
    parseBlinkInput: (input: KeyValueAny) => {
        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('uc_BlinkAmount' in input) || !utils.isNumber(input.uc_BlinkAmount)) {
            return yokisExtendChecks.failure({reason: 'INVALID_BLINK_BLINKAMOUNT'});
        }

        if (!('ul_BlinkOnPeriod' in input) || !utils.isNumber(input.ul_BlinkOnPeriod)) {
            return yokisExtendChecks.failure({reason: 'INVALID_BLINK_BLINKONPERIOD'});
        }

        if (!('ul_BlinkOffPeriod' in input) || !utils.isNumber(input.ul_BlinkOffPeriod)) {
            return yokisExtendChecks.failure({reason: 'INVALID_BLINK_BLINKOFFPERIOD'});
        }

        if (!('uc_StateAfterSequence' in input)) {
            return yokisExtendChecks.failure({reason: 'MISSING_BLINK_STATEAFTERSEQUENCE'});
        }

        if (!('b_DoPeriodicCycle' in input) || !utils.isBoolean(input.b_DoPeriodicCycle)) {
            return yokisExtendChecks.failure({reason: 'INVALID_BLINK_DOPERIODICYCLE'});
        }

        return {
            isSuccess: true,
            payload: {
                uc_BlinkAmount: input.uc_BlinkAmount,
                ul_BlinkOnPeriod: input.ul_BlinkOnPeriod,
                ul_BlinkOffPeriod: input.ul_BlinkOffPeriod,
                uc_StateAfterSequence: utils.getFromLookup(input.uc_StateAfterSequence, stateAfterBlinkEnum),
                b_DoPeriodicCycle: input.b_DoPeriodicCycle ? 1 : 0,
            },
        };
    },
    parsePulseInput: (input: KeyValueAny) => {
        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('pulseLength' in input) || !utils.isNumber(input.pulseLength)) {
            return yokisExtendChecks.failure({reason: 'INVALID_PULSE_PULSELENGTH'});
        }

        return {
            isSuccess: true,
            payload: {
                PulseLength: input.pulseLength,
            },
        };
    },
    parseDeafBlinkPropInput: (input: KeyValueAny) => {
        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('uc_BlinkAmount' in input) || !utils.isNumber(input.uc_BlinkAmount)) {
            return yokisExtendChecks.failure({reason: 'INVALID_BLINK_AMOUNT'});
        }

        if (!('uc_BlinkAmount' in input) || !utils.isNumber(input.ul_BlinkOnTime)) {
            return yokisExtendChecks.failure({reason: 'INVALID_BLINK_ONTIME'});
        }

        if (!('uc_BlinkAmount' in input) || !utils.isNumber(input.uc_SequenceAmount)) {
            return yokisExtendChecks.failure({reason: 'INVALID_SEQUENCE_AMOUNT'});
        }

        if (input.tuc_BlinkAmount && Array.isArray(input.tuc_BlinkAmount)) {
            // if (input.uc_SequenceAmount < input.tuc_BlinkAmount.length) {
            //     // more sequences configured than expected, pop extragenous
            //     for(let i = 0; i < input.tuc_BlinkAmount.length - input.uc_SequenceAmount; i++) {
            //         input.tuc_BlinkAmount.pop();
            //     }
            // }

            // if (input.uc_SequenceAmount > input.tuc_BlinkAmount.length) {
            //     // more sequences than configured, pad with additionals
            //     for(let i = 0; i < input.uc_SequenceAmount - input.tuc_BlinkAmount.length; i++) {
            //         input.tuc_BlinkAmount.push({"uc_BlinkAmountItem":1}); //puke
            //     }
            // }

            // Updating number of elements
            input.uc_SequenceAmount = input.tuc_BlinkAmount.length;
        } else {
            return yokisExtendChecks.failure({reason: 'INVALID_TUC_BLINKAMOUNT'});
        }

        if (!('uc_BlinkAmount' in input) || !utils.isNumber(input.uc_SequenceAmount)) {
            return yokisExtendChecks.failure({reason: 'INVALID_SEQUENCE_AMOUNT'});
        }

        return {
            isSuccess: true,
            payload: {
                uc_BlinkAmount: input.uc_BlinkAmount,
                ul_BlinkOnTime: input.ul_BlinkOnTime,
                uc_SequenceAmount: input.tuc_BlinkAmount.length,
                // [{"undefined":1},{"undefined":1}] > [1,1]
                tuc_BlinkAmount: input.tuc_BlinkAmount.map((elem) => (typeof elem === 'object' ? Object.values(elem).shift() : elem)),
            },
        };
    },
    parseDim: (input: KeyValueAny) => {
        let _ul_RampContinuousDuration, _uc_StepContinuous;

        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('ul_RampContinuousDuration' in input) || !utils.isNumber(input.ul_RampContinuousDuration)) {
            _ul_RampContinuousDuration = 0xffffffff; // use default value
        } else _ul_RampContinuousDuration = input.ul_RampContinuousDuration;

        if (!('uc_StepContinuous' in input) || !utils.isNumber(input.uc_StepContinuous)) {
            _uc_StepContinuous = 0xff; // use default value
        } else _uc_StepContinuous = input.uc_StepContinuous;

        return {
            isSuccess: true,
            payload: {
                ul_RampContinuousDuration: _ul_RampContinuousDuration,
                uc_StepContinuous: _uc_StepContinuous,
            },
        };
    },
    parseDimMinMax: (input: KeyValueAny) => {
        let _ul_TransitionTime, _action;

        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('ul_TransitionTime' in input) || !utils.isNumber(input.ul_TransitionTime)) {
            _ul_TransitionTime = 0xffffffff; // use default value
        } else _ul_TransitionTime = input.ul_TransitionTime;

        if (!('action' in input)) {
            return yokisExtendChecks.failure({reason: 'MISSING_ACTION'});
        } else {
            _action = input.action;
        }

        return {
            isSuccess: true,
            action: _action,
            payload: {
                ul_TransitionTime: _ul_TransitionTime,
            },
        };
    },
    parseStartNightLightMode: (input: KeyValueAny) => {
        let _ul_ChildModeStartingDelay,
            _uc_ChildModeBrightnessStart,
            _uc_ChildModeBrightnessEnd,
            _ul_ChildModeRampDuration,
            _ul_ChildModeOnDuration,
            _uc_ChildStep;

        if (!input || typeof input !== 'object') {
            return yokisExtendChecks.failure({reason: 'NOT_OBJECT'});
        }

        if (!('ul_ChildModeStartingDelay' in input) || !utils.isNumber(input.ul_ChildModeStartingDelay)) {
            _ul_ChildModeStartingDelay = 0xffffffff; // use default value
        } else _ul_ChildModeStartingDelay = input.ul_ChildModeStartingDelay;

        if (!('uc_ChildModeBrightnessStart' in input) || !utils.isNumber(input.uc_ChildModeBrightnessStart)) {
            _uc_ChildModeBrightnessStart = 0xff; // use default value
        } else _uc_ChildModeBrightnessStart = input.uc_ChildModeBrightnessStart;

        if (!('uc_ChildModeBrightnessEnd' in input) || !utils.isNumber(input.uc_ChildModeBrightnessEnd)) {
            _uc_ChildModeBrightnessEnd = 0xff; // use default value
        } else _uc_ChildModeBrightnessEnd = input.uc_ChildModeBrightnessEnd;

        if (!('ul_ChildModeRampDuration' in input) || !utils.isNumber(input.ul_ChildModeRampDuration)) {
            _ul_ChildModeRampDuration = 0xffffffff; // use default value
        } else _ul_ChildModeRampDuration = input.ul_ChildModeRampDuration;

        if (!('ul_ChildModeOnDuration' in input) || !utils.isNumber(input.ul_ChildModeOnDuration)) {
            _ul_ChildModeOnDuration = 0xffffffff; // use default value
        } else _ul_ChildModeOnDuration = input.ul_ChildModeOnDuration;

        if (!('uc_ChildStep' in input) || !utils.isNumber(input.uc_ChildStep)) {
            _uc_ChildStep = 0xff; // use default value
        } else _uc_ChildStep = input.uc_ChildStep;

        return {
            isSuccess: true,
            payload: {
                ul_ChildModeStartingDelay: _ul_ChildModeStartingDelay,
                uc_ChildModeBrightnessStart: _uc_ChildModeBrightnessStart,
                uc_ChildModeBrightnessEnd: _uc_ChildModeBrightnessEnd,
                ul_ChildModeRampDuration: _ul_ChildModeRampDuration,
                ul_ChildModeOnDuration: _ul_ChildModeOnDuration,
                uc_ChildStep: _uc_ChildStep,
            },
        };
    },
    failure: (error: {reason: string}): {isSuccess: false; error: {reason: string}} => {
        return {
            isSuccess: false,
            error,
        };
    },
    log: (key: string, value: KeyValueAny | string, payload?: KeyValueAny) => {
        logger.debug(`Invoked converter with key: '${key}'`, NS);
        logger.debug('Invoked converter with values:' + JSON.stringify(value), NS);
        if (payload) logger.debug('Invoked converter with payload:' + JSON.stringify(payload), NS);
    },
};

// Local ModernExtend and Options
const yokisCommandsExtend = {
    resetToFactorySettings: (): ModernExtend => {
        const exposes = e
            .enum('uc_ResetAction', ea.SET, Object.keys(resetActionEnum))
            .withDescription('Ititiate long duration on')
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['uc_ResetAction'],
                convertSet: async (entity, key, value: string, meta) => {
                    const commandWrapper = yokisExtendChecks.parseResetInput(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value);

                    await entity.command('manuSpecificYokisDevice', 'resetToFactorySettings', commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    relaunchBleAdvert: (): ModernExtend => {
        const exposes = e
            .enum('RelaunchBleAdvert', ea.SET, ['RelaunchBle'])
            .withDescription('Relaunch BLE advertising for 15 minutes')
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['RelaunchBleAdvert'],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command('manuSpecificYokisDevice', 'relaunchBleAdvert', {});
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    openNetwork: (): ModernExtend => {
        const exposes = e
            .composite('OpenNetworkCommand', 'OpenNetworkProp', ea.SET)
            .withDescription('Open ZigBee network')
            .withFeature(
                e
                    .numeric('uc_OpeningTime', ea.SET)
                    .withValueMin(0)
                    .withValueMax(255)
                    .withUnit('s')
                    .withDescription('Opening time wanted from 1 to 255 seconds,0 means closing the network.'),
            )
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['OpenNetworkProp'],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseOpenNetworkInput(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error  CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value);

                    await entity.command('manuSpecificYokisDevice', 'OpenNetwork', commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    moveToPosition: (): ModernExtend => {
        const exposes = e
            .composite('moveToPositionCommand', 'moveToPositionProp', ea.SET)
            .withDescription(
                'Move to position specified in uc_BrightnessEnd parameter.' +
                    'If TOR mode is set (no dimming) or MTR : if uc_BrightnessEnd under 50% will set to OFF else will be set to ON',
            )
            .withFeature(e.numeric('uc_BrightnessStart', ea.SET).withDescription(''))
            .withFeature(e.numeric('uc_BrightnessEnd', ea.SET).withDescription(''))
            .withFeature(
                e
                    .numeric('ul_PreTimerValue', ea.SET)
                    .withUnit('s')
                    .withDescription('If defined will force the pretimer value (only for this order) if not the device will use its own value.'),
            )
            .withFeature(
                e
                    .binary('b_PreTimerEnable', ea.SET, true, false)
                    .withDescription('If defined will force the pretimer use (only for this order) if not the device will use its own value.'),
            )
            .withFeature(
                e
                    .numeric('ul_TimerValue', ea.SET)
                    .withUnit('s')
                    .withDescription('If defined will force the OnTimer value (only for this order) if not the device will use its own value.'),
            )
            .withFeature(
                e
                    .binary('b_TimerEnable', ea.SET, true, false)
                    .withDescription('If defined will force the OnTimer use (only for this order) if not the device will use its own value.'),
            )
            .withFeature(e.numeric('ul_TransitionTime', ea.SET).withDescription(''))
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['moveToPositionProp'],
                convertSet: async (entity, key, value, meta) => {
                    // const options = utils.getOptions(meta.mapped, entity);
                    // logger.debug('Invoked converter with options:' + JSON.stringify(options));

                    const commandWrapper = yokisExtendChecks.parseMoveToPositionInput(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error  CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    // NB: we are using the Cluster name defined in ZH over Cluster hexcode (due to conflict on cluster ID)
                    await entity.command('manuSpecificYokisLightControl', 'moveToPosition', commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    blink: (): ModernExtend => {
        const exposes = e
            .composite('blinkCommand', 'blinkProp', ea.SET)
            .withDescription('With this command, the module is asked to perform a blinking sequence.')
            .withFeature(
                e
                    .numeric('uc_BlinkAmount', ea.SET)
                    .withDescription(
                        'If defined will force the number of blink to be done (only for this order).' + 'if not the device will use its own value.',
                    ),
            )
            .withFeature(
                e
                    .numeric('ul_BlinkOnPeriod', ea.SET)
                    .withDescription('If defined will force the blink’s “on time” (only for this order) if not the device will use its own value.'),
            )
            .withFeature(
                e
                    .numeric('ul_BlinkOffPeriod', ea.SET)
                    .withDescription('If defined will force the blink’s “off time” (only for this order) if not the device will use its own value.'),
            )
            .withFeature(
                e
                    .enum('uc_StateAfterSequence', ea.SET, Object.keys(stateAfterBlinkEnum))
                    .withDescription(
                        'If defined will force the state after the sequence (only for this order).' + 'if not the device will use its own value-',
                    ),
            )
            .withFeature(e.binary('b_DoPeriodicCycle', ea.SET, true, false).withDescription('If set to true the blinking will be “infinite”'))
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['blinkProp'],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseBlinkInput(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command('manuSpecificYokisLightControl', 'blink', commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    pulse: (): ModernExtend => {
        const exposes = e
            .composite('pulseCommand', 'pulseProp', ea.SET)
            .withDescription('This command allows the relay to be controlled with an impulse. The pulse time is defined by PulseLength.')
            .withFeature(e.numeric('pulseLength', ea.SET).withValueMax(65535).withUnit('ms').withDescription('Pulse length'))
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['pulseProp'],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parsePulseInput(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    // await entity.command('manuSpecificYokisLightControl', 'pulse', commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    deafBlink: (): ModernExtend => {
        const exposes = e
            .composite('deafBlinkCommand', 'deafBlinkProp', ea.SET)
            .withDescription('Start a deaf sequene on a device only if the attribute “eDeaf” is set to Enable.')
            .withFeature(
                e
                    .numeric('uc_BlinkAmount', ea.SET)
                    .withDescription(
                        'If defined will force the number of blink to be done during one sequence (only for this order).' +
                            'if not the device will use its own value.',
                    ),
            )
            .withFeature(
                e
                    .numeric('ul_BlinkOnTime', ea.SET)
                    .withDescription('If defined will force the blink’s “on time” (only for this order) if not the device will use its own value'),
            )
            .withFeature(
                e
                    .numeric('uc_SequenceAmount', ea.STATE)
                    .withValueMin(0)
                    .withValueMax(6)
                    .withDescription('If defined will set the number of sequence to be done. Each sequence is spaced by 1 second. (Max 6)'),
            )
            .withFeature(
                e
                    .list(
                        'tuc_BlinkAmount',
                        ea.SET,
                        e
                            .composite('uc_BlinkAmountItems', 'uc_BlinkAmountItems', ea.SET)
                            .withLabel('')
                            .withFeature(e.numeric('uc_BlinkAmountItem', ea.SET).withLabel('Blinks')),
                    )
                    .withLengthMin(0)
                    .withLengthMax(6)
                    .withDescription('Array with the number of blink to be done for each sequence. Will override “uc_BlinkAmount“.'),
            )
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['deafBlinkProp'],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseDeafBlinkPropInput(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command('manuSpecificYokisLightControl', 'deafBlink', commandWrapper.payload);

                    // return {state: {deafBlinkProp: commandWrapper.value}};
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    longOnCommand: (): ModernExtend => {
        const exposes = e.enum('longOnCommand', ea.SET, ['longOnAction']).withDescription('Ititiate long duration on').withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['longOnCommand'],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command('manuSpecificYokisLightControl', 'longOn', {});
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    sendPress: (): ModernExtend => {
        const exposes = e
            .enum('SendPress', ea.SET, ['SendPress'])
            .withDescription('Send to the server cluster a button press')
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['SendPress'],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command('manuSpecificYokisDevice', 'sendPress', {});
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    sendRelease: (): ModernExtend => {
        const exposes = e
            .enum('SendRelease', ea.SET, ['SendRelease'])
            .withDescription('Send to the server cluster a button release')
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['SendRelease'],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command('manuSpecificYokisDevice', 'sendRelease', {});
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    selectInputMode: (): ModernExtend => {
        const exposes = e
            .enum('uc_InputMode', ea.SET, Object.keys(inputModeEnum))
            .withDescription('Change the Input mode to use switch input, wired relay or simple push button')
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['uc_InputMode'],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseInputModeInput(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value);

                    await entity.command('manuSpecificYokisLightControl', 'selectInputMode', commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    dimmerDim: (): ModernExtend => {
        const exposes = e
            .composite('dimmerDim', 'dimProp', ea.SET)
            .withDescription('Start the dimming loop process for the selected duration.')
            .withFeature(
                e
                    .numeric('ul_RampContinuousDuration', ea.SET)
                    .withUnit('ms')
                    .withDescription(
                        'Set the duration of the ramp for the continuous variation, otherwise use 0xFFFFFFFF to use the one configured in the product.',
                    ),
            )
            .withFeature(
                e
                    .numeric('uc_StepContinuous', ea.SET)
                    .withUnit('s')
                    .withDescription('Set the step size, otherwise use 0xFF to use the one configured in the product.. Value is in %.'),
            )
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['dimProp'],
                convertSet: async (entity, key, value, meta) => {
                    // const options = utils.getOptions(meta.mapped, entity);
                    // logger.debug('Invoked converter with options:' + JSON.stringify(options));

                    const commandWrapper = yokisExtendChecks.parseDim(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error  CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    // NB: we are using the Cluster name defined in ZH over Cluster hexcode (due to conflict on cluster ID)
                    await entity.command('manuSpecificYokisDimmer', 'dim', commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    dimmerDimMinMax: (): ModernExtend => {
        const exposes = e
            .composite('dimmerDimMinMax', 'dimMinMaxProp', ea.SET)
            .withDescription('Start dimming to the min or max value set in the device')
            .withFeature(
                e
                    .numeric('ul_TransitionTime', ea.SET)
                    .withUnit('ms')
                    .withDescription(
                        'Set the transition time to the selected value, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.',
                    ),
            )
            .withFeature(e.enum('action', ea.SET, ['dimToMin', 'dimToMax']))
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['dimMinMaxProp'],
                convertSet: async (entity, key, value, meta) => {
                    // const options = utils.getOptions(meta.mapped, entity);
                    // logger.debug('Invoked converter with options:' + JSON.stringify(options));

                    const commandWrapper = yokisExtendChecks.parseDimMinMax(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error  CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    // NB: we are using the Cluster name defined in ZH over Cluster hexcode (due to conflict on cluster ID)
                    await entity.command('manuSpecificYokisDimmer', commandWrapper.action, commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    dimmerUpDown: (): ModernExtend => {
        const exposes = e.enum('DimmerUpDown', ea.SET, ['dimUp', 'dimDown']).withDescription('Dim up or Down').withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['DimmerUpDown'],
                convertSet: async (entity, key, value: string, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command('manuSpecificYokisDimmer', value, {});
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    dimmerMoveToFavorite: (): ModernExtend => {
        const exposes = e
            .enum('DimmerMoveToFavorite1', ea.SET, ['moveToFavorite1', 'moveToFavorite2', 'moveToFavorite3'])
            .withDescription('Start dimming to the favorite position 1, 2 or 3')
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['DimmerMoveToFavorite1'],
                convertSet: async (entity, key, value: string, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command('manuSpecificYokisDimmer', value, {});
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    dimmerStartNightLightModeCurrent: (): ModernExtend => {
        const exposes = e
            .enum('DimmerStarnightModeCurrent', ea.SET, ['startNightLightModeCurrent'])
            .withDescription('Trigger Starnight mode from the current diming value')
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['DimmerStarnightModeCurrent'],
                convertSet: async (entity, key, value: string, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command('manuSpecificYokisDimmer', value, {});
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    dimmerStartNightLightMode: (): ModernExtend => {
        const exposes = e
            .composite('dimmerStartNightLightMode', 'dimmerStartNightLightModeProp', ea.SET)
            .withDescription('Start the nightlight mode with the given parameters')
            .withFeature(
                e
                    .numeric('ul_ChildModeStartingDelay', ea.SET)
                    .withUnit('ms')
                    .withDescription(
                        'Set the starting delay value, used before the start of the nightlight, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.',
                    ),
            )
            .withFeature(
                e
                    .numeric('uc_ChildModeBrightnessStart', ea.SET)
                    .withUnit('%')
                    .withDescription(
                        'Set the brightness at the beginning of the ramp, otherwise use 0xFF to use the one configured in the product. Value is in %.',
                    ),
            )
            .withFeature(
                e
                    .numeric('uc_ChildModeBrightnessEnd', ea.SET)
                    .withUnit('%')
                    .withDescription(
                        'Set the brightness at the end of the ramp, otherwise use 0xFF to use the one configured in the product. Value is in %.',
                    ),
            )
            .withFeature(
                e
                    .numeric('ul_ChildModeRampDuration', ea.SET)
                    .withUnit('ms')
                    .withDescription('Set the ramp duration, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.'),
            )
            .withFeature(
                e
                    .numeric('ul_ChildModeOnDuration', ea.SET)
                    .withUnit('ms')
                    .withDescription(
                        'Set the total duration of the nightlight, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.',
                    ),
            )
            .withFeature(
                e
                    .numeric('uc_ChildStep', ea.SET)
                    .withUnit('%')
                    .withDescription(
                        'Set the step size between each dim, otherwise use 0xFF to use the one configured in the product. Value is in %.',
                    ),
            )
            .withCategory('config');

        const toZigbee: Tz.Converter[] = [
            {
                key: ['dimmerStartNightLightModeProp'],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseStartNightLightMode(value);

                    if (!commandWrapper.isSuccess) {
                        logger.warning(
                            // @ts-expect-error  CommandWrapper contains always contains the error attribute only when isSuccess is false
                            `encountered an error (${commandWrapper.error.reason}) ` +
                                `while parsing configuration commands (input: ${JSON.stringify(value)})`,
                            NS,
                        );

                        return;
                    }

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command('manuSpecificYokisDimmer', 'startNightLightMode', commandWrapper.payload);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
};

const yokisLightControlExtend: ModernExtend[] = [
    // OnOff => this is redundant from the GenOnOff state
    // binary({
    //     name: 'OnOff',
    //     cluster: 'manuSpecificYokisLightControl',
    //     attribute: 'onOff',
    //     description: 'Use to know which state is the relay',
    //     valueOn: ['ON', 0x01],
    //     valueOff: ['OFF', 0x00],
    //     access: 'STATE_GET',
    //     reporting: {min: 0, max: repInterval.HOUR, change: 0, attribute: 'onOff'},
    //     entityCategory: 'diagnostic',
    // }),

    // PrevState
    binary({
        name: 'PrevState',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'prevState',
        description: 'Indicate the previous state before action',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        access: 'STATE_GET',
        entityCategory: 'diagnostic',
    }),

    // onTimer
    binary({
        name: 'eOnTimer',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'eOnTimer',
        description: 'Enable (0x01) / Disable (0x00) use of onTimer.',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
    numeric({
        name: 'onTimer',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'onTimer',
        description: 'Define the ON embedded timer duration in seconds.',
        valueMin: 0,
        valueMax: 3600,
        valueStep: 1,
        unit: 's',
        entityCategory: 'config',
    }),

    // preOnDelay
    binary({
        name: 'ePreOnDelay',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'ePreOnDelay',
        description: 'Enable (0x01) / Disable (0x00) PreOn delay.',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
    numeric({
        name: 'PreOnDelay',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'preOnDelay',
        description: 'Define the PreOn embedded delay in seconds.',
        valueMin: 0,
        valueMax: 3600,
        valueStep: 1,
        unit: 's',
        entityCategory: 'config',
    }),

    // preOffDelay
    binary({
        name: 'ePreOffDelay',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'ePreOffDelay',
        description: 'Enable (0x01) / Disable (0x00) PreOff delay.',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
    numeric({
        name: 'PreOffDelay',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'preOffDelay',
        description: 'Define the PreOff embedded delay in seconds.',
        valueMin: 0,
        valueMax: 3600,
        valueStep: 1,
        unit: 's',
        entityCategory: 'config',
    }),

    // Pulseduration
    numeric({
        name: 'PulseDuration',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'pulseDuration',
        description: 'Set the value of ON pulse length.',
        valueMin: 0x0014,
        valueMax: 0xfffe,
        valueStep: 1,
        unit: 'ms',
        entityCategory: 'config',
    }),

    // TimeType
    enumLookup({
        name: 'TimeType',
        lookup: timeTypeEnum,
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'timeType',
        description: `Indicates the current Type of time selected that will be used during push button configuration:
        - 0x00 -> Seconds
        - 0x01 -> Minutes`,
        entityCategory: 'config',
    }),

    // LongOnDuration
    numeric({
        name: 'LongOnDuration',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'longOnDuration',
        description: 'Set the value of the LONG ON embedded timer in seconds',
        valueMin: 0x00,
        valueMax: 0x00409980,
        valueStep: 1,
        unit: 's',
        entityCategory: 'config',
    }),

    // OperatingMode
    enumLookup({
        name: 'OperatingMode',
        lookup: operatingModeEnum,
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'operatingMode',
        description: `Indicates the operating mode: 
        - 0x00 -> Timer 
        - 0x01 -> Staircase
        - 0x02 -> Pulse`,
        entityCategory: 'config',
    }),

    // stopAnnounce
    binary({
        name: 'eStopAnnounce',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'eStopAnnounce',
        description: 'Enable (0x01) / Disable (0x00) the announcement before turning OFF',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
    numeric({
        name: 'StopAnnounceTime',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'stopAnnounceTime',
        description: 'Time before goes off after the stop announce blinking. (In seconds)',
        valueMin: 0x00,
        valueMax: 0x00409980,
        valueStep: 1,
        unit: 's',
        entityCategory: 'config',
    }),

    // eDeaf
    binary({
        name: 'eDeaf',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'eDeaf',
        description: 'Enable (0x01) / Disable (0x00) Deaf Actions',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
    numeric({
        name: 'DeafBlinkAmount',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'deafBlinkAmount',
        description: 'Define number of blink to do when receiving the DEAF action. One blink is considered as one ON step followed by one OFF step.',
        valueMin: 0x00,
        valueMax: 0x14,
        valueStep: 1,
        entityCategory: 'config',
    }),
    numeric({
        name: 'DeafBlinkTime',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'deafBlinkTime',
        description: 'Define duration of a blink ON (In millisecond)',
        valueMin: 0x0064,
        valueMax: 0x4e20,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // Blink
    binary({
        name: 'eBlink',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'eBlink',
        description: 'Enable (0x01) / Disable (0x00) Blink  Actions',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
    numeric({
        name: 'BlinkAmount',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'blinkAmount',
        description: 'Number of blinks done when receiving the corresponding order. One blink is considered as one ON step followed by one OFF step.',
        valueMin: 0x00,
        valueMax: 0x14,
        valueStep: 1,
        entityCategory: 'config',
    }),
    numeric({
        name: 'BlinkOnTime',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'blinkOnTime',
        description: 'Duration for the ON time on a blink period (In millisecond)',
        valueMin: 0x00,
        valueMax: 0x00409980,
        valueStep: 1,
        entityCategory: 'config',
    }),
    numeric({
        name: 'BlinkOffTime',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'blinkOffTime',
        description: 'Duration for the OFF time on a blink period (In millisecond)',
        valueMin: 0x00,
        valueMax: 0x00409980,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // StateAfterBlink
    enumLookup({
        name: 'StateAfterBlink',
        lookup: stateAfterBlinkEnum,
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'stateAfterBlink',
        description: `Indicate which state must be apply after a blink sequence:
        - 0x00 -> State before blinking
        - 0x01 -> OFF
        - 0x02 -> ON
        - 0x03 -> Infinite blinking`,
        entityCategory: 'config',
    }),

    // eNcCommand
    binary({
        name: 'eNcCommand',
        cluster: 'manuSpecificYokisLightControl',
        attribute: 'eNcCommand',
        description: 'Define the output relay as Normaly close',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),

    yokisCommandsExtend.moveToPosition(),
    yokisCommandsExtend.pulse(),
    yokisCommandsExtend.blink(),
    yokisCommandsExtend.deafBlink(),
    yokisCommandsExtend.longOnCommand(),
];

const YokisDeviceExtend: ModernExtend[] = [
    numeric({
        name: 'ConfigurationChanged',
        cluster: 'manuSpecificYokisDevice',
        attribute: 'configurationChanged',
        description: 'Indicate if the device configuration has changed. 0 to 0xFFFE -> No Change, 0xFFFF -> Change have been detected',
        access: 'STATE_GET',
        valueMin: 0,
        valueMax: 3600,
        entityCategory: 'diagnostic',
    }),

    yokisCommandsExtend.resetToFactorySettings(),
    yokisCommandsExtend.relaunchBleAdvert(),
    yokisCommandsExtend.openNetwork(),
];

const YokisInputExtend: ModernExtend[] = [
    // InputMode
    enumLookup({
        name: 'InputMode',
        lookup: inputModeEnum,
        cluster: 'manuSpecificYokisInput',
        attribute: 'inputMode',
        description: `Indicate how the input should be handle:
        - 0 -> Unknow
        - 1 -> Push button
        - 2 -> Switch
        - 3 -> Relay
        - 4 -> FP_IN`,
        entityCategory: 'config',
    }),

    // InputMode
    enumLookup({
        name: 'ContactMode',
        lookup: contactModeEnum,
        cluster: 'manuSpecificYokisInput',
        attribute: 'contactMode',
        description: `Indicate the contact nature of the entry:
        - 0 -> NC
        - 1 -> NO`,
        entityCategory: 'config',
    }),

    // LastLocalCommandState
    binary({
        name: 'LastLocalCommandState',
        cluster: 'manuSpecificYokisInput',
        attribute: 'lastLocalCommandState',
        description: 'Indicate the last known state of the local BP',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        access: 'STATE_GET',
        entityCategory: 'diagnostic',
    }),

    // LastBPConnectState
    binary({
        name: 'LastBPConnectState',
        cluster: 'manuSpecificYokisInput',
        attribute: 'lastBPConnectState',
        description: 'Indicate the last known state of the Bp connect',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        access: 'STATE_GET',
        entityCategory: 'diagnostic',
    }),

    // BacklightIntensity
    numeric({
        name: 'BacklightIntensity',
        cluster: 'manuSpecificYokisDevice',
        attribute: 'BacklightIntensity',
        description: 'Indicate the backlight intensity applied on the keys. Only use for “Simon” product',
        valueMin: 0x00,
        valueMax: 0x64,
        entityCategory: 'config',
    }),

    yokisCommandsExtend.sendPress(),
    yokisCommandsExtend.sendRelease(),
    yokisCommandsExtend.selectInputMode(),
];

const YokisEntryExtend: ModernExtend[] = [
    // eShortPress
    binary({
        name: 'eShortPress',
        cluster: 'manuSpecificYokisEntryConfigurator',
        attribute: 'eShortPress',
        description: 'Use to enable short press action',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),

    // eLongPress
    binary({
        name: 'eLongPress',
        cluster: 'manuSpecificYokisEntryConfigurator',
        attribute: 'eLongPress',
        description: 'Use to enable long press action',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),

    // LongPressDuration
    numeric({
        name: 'LongPressDuration',
        cluster: 'manuSpecificYokisEntryConfigurator',
        attribute: 'longPressDuration',
        description: 'Define long Press duration in milliseconds',
        valueMin: 0x00,
        valueMax: 0x1388,
        valueStep: 1,
        unit: 'ms',
        entityCategory: 'config',
    }),

    // TimeBetweenPress
    numeric({
        name: 'TimeBetweenPress',
        cluster: 'manuSpecificYokisEntryConfigurator',
        attribute: 'timeBetweenPress',
        description: 'Define the maximum time between 2 press to keep in a sequence (In milliseconds)',
        valueMin: 0x0064,
        valueMax: 0x0258,
        valueStep: 1,
        unit: 'ms',
        entityCategory: 'config',
    }),

    // eR12MLongPress
    binary({
        name: 'eR12MLongPress',
        cluster: 'manuSpecificYokisEntryConfigurator',
        attribute: 'eR12MLongPress',
        description: 'Enable R12M Long Press action',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),

    // eLocalConfigLock
    binary({
        name: 'eLocalConfigLock',
        cluster: 'manuSpecificYokisEntryConfigurator',
        attribute: 'eLocalConfigLock',
        description: 'Disable local configuration',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
];

const YokisSubSystemExtend: ModernExtend[] = [
    enumLookup({
        name: 'powerFailureMode',
        lookup: powerFailureModeEnum,
        cluster: 'manuSpecificYokisSubSystem',
        attribute: 'powerFailureMode',
        description: 'Define the device behavior after power failure ',
        entityCategory: 'config',
        // zigbeeCommandOptions: manufacturerOptions,
    }),
];

const YokisDimmerExtend: ModernExtend[] = [
    // currentPosition
    numeric({
        name: 'CurrentPosition',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'currentPosition',
        description: 'This attribute defines the current position, in %',
        access: 'STATE_GET',
        entityCategory: 'diagnostic',
    }),

    // memoryPosition
    numeric({
        name: 'MemoryPosition',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'memoryPosition',
        description: 'This attribute defines the memory position, in %',
        access: 'STATE_GET',
        entityCategory: 'diagnostic',
    }),

    // RampUp
    binary({
        name: 'eRampUp',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'eRampUp',
        description: 'This attribute defines if a ramp up should be used or not.',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
    numeric({
        name: 'RampUp',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'rampUp',
        description: 'This attribute defines the time taken during the ramp up in ms.',
        valueMin: 0x00000000,
        valueMax: 0x05265c00,
        valueStep: 1000,
        entityCategory: 'config',
    }),

    // RampDown
    binary({
        name: 'eRampDown',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'eRampDown',
        description: 'This attribute defines if a ramp down should be used or not.',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),
    numeric({
        name: 'RampDown',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'rampDown',
        description: 'This attribute defines the time taken during the ramp down in ms.',
        valueMin: 0x00000000,
        valueMax: 0x05265c00,
        valueStep: 1000,
        entityCategory: 'config',
    }),

    // rampContinuousTime
    numeric({
        name: 'RampContinuousTime',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'rampContinuousTime',
        description: 'This attribute defines the time taken during the ramp loop in ms.',
        valueMin: 0x00000000,
        valueMax: 0x05265c00,
        valueStep: 1000,
        entityCategory: 'config',
    }),

    // stepUp
    numeric({
        name: 'StepUp',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'stepUp',
        description: 'This attribute defines the value of each step during a dimming up. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // lowDimLimit
    numeric({
        name: 'LowDimLimit',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'lowDimLimit',
        description:
            'This attribute defines the value of the low dim limit, used during a dimming loop, on a long press for example. This value is set in %',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // highDimLimit
    numeric({
        name: 'HighDimLimit',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'highDimLimit',
        description:
            'This attribute defines the value of the high dim limit, used during a dimming loop, on a long press for example. This value is set in %',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // nightLightStartingDelay
    numeric({
        name: 'NightLightStartingDelay',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'nightLightStartingDelay',
        description: 'This attribute defines the time before the nightlight begin. This value is set in seconds.',
        valueMin: 0x00000000,
        valueMax: 0xfffffffe,
        valueStep: 10,
        entityCategory: 'config',
    }),

    // nightLightStartingBrightness
    numeric({
        name: 'NightLightStartingBrightness',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'nightLightStartingBrightness',
        description: 'This attribute defines the dimming value at the start of the nightlight. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // nightLightEndingBrightness
    numeric({
        name: 'NightLightEndingBrightness',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'nightLightEndingBrightness',
        description:
            'This attribute defines the dimming value at the last step of the nightlight. This attribute must be lower than 0x000D : Nightlight starting brightness. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // nightLightRampTime
    numeric({
        name: 'NightLightRampTime',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'nightLightRampTime',
        description:
            'This attribute defines the ramp duration of the nightlight. The ramp is running after the end of the starting delay and until the ending bright is reached. This value is set in seconds.',
        valueMin: 0x00000000,
        valueMax: 0x05265c00,
        valueStep: 10,
        entityCategory: 'config',
    }),

    // nightLightOnTime
    numeric({
        name: 'NightLightOnTime',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'nightLightOnTime',
        description:
            'This attribute defines the total duration of the nightlight. It must not be lower than 0x000F : Nightlight ramp time. This value is set in seconds.',
        valueMin: 0x00000000,
        valueMax: 0x00409980,
        valueStep: 10,
        entityCategory: 'config',
    }),

    // favoritePosition1
    numeric({
        name: 'FavoritePosition1',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'favoritePosition1',
        description: 'This attribute defines the value of the favorite position 1. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // favoritePosition2
    numeric({
        name: 'FavoritePosition2',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'favoritePosition2',
        description: 'This attribute defines the value of the favorite position 2. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // favoritePosition3
    numeric({
        name: 'FavoritePosition3',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'favoritePosition3',
        description: 'This attribute defines the value of the favorite position 3. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // stepControllerMode
    binary({
        name: 'StepControllerMode',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'stepControllerMode',
        description:
            'This attribute enables or disables the 2-step controller mode. This mode enable product to run without any ramp before and after ON or OFF. It acts like a relay.',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),

    // memoryPositionMode
    binary({
        name: 'MemoryPositionMode',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'memoryPositionMode',
        description: 'This attribute enables or disables the memory position mode at first push button release. ',
        valueOn: ['ON', 0x01],
        valueOff: ['OFF', 0x00],
        entityCategory: 'config',
    }),

    // stepDown
    numeric({
        name: 'StepDown',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'stepDown',
        description: 'This attribute defines the value of each step during a dimming down. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // stepContinuous
    numeric({
        name: 'StepContinuous',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'stepContinuous',
        description: 'This attribute defines the value of each step during a dimming loop. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    // stepNightLigth
    numeric({
        name: 'StepNightLigth',
        cluster: 'manuSpecificYokisDimmer',
        attribute: 'stepNightLigth',
        description: 'This attribute defines the value of each step during the ramp down of the nightlight mode. This value is set in %.',
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: 'config',
    }),

    yokisCommandsExtend.dimmerDim(),
    yokisCommandsExtend.dimmerUpDown(),
    yokisCommandsExtend.dimmerDimMinMax(),
    yokisCommandsExtend.dimmerMoveToFavorite(),
    yokisCommandsExtend.dimmerStartNightLightModeCurrent(),
    yokisCommandsExtend.dimmerStartNightLightMode(),
];

const YokisWindowCoveringExtend: ModernExtend[] = [
    // TODO : Placeholder - pending documentation
];

const YokisChannelExtend: ModernExtend[] = [
    // On/Off cluster mode
    enumLookup({
        name: 'On/Off cluster mode',
        lookup: onOffClusterModeEnum,
        cluster: 'manuSpecificYokisChannel',
        attribute: 'onOffClusterMode',
        description: `Define the command to send to the servers using cluster On/Off. Values are: 
-	0x00 – TOGGLE (1)
-	0x01 – ON
-	0x02 – OFF
-	0x03 – OFF 
`,
        entityCategory: 'config',
    }),

    // Level control cluster mode
    enumLookup({
        name: 'Level control cluster mode',
        lookup: levelControlClusterModeEnum,
        cluster: 'manuSpecificYokisChannel',
        attribute: 'levelControlClusterMode',
        description: `Define the command to send to the servers using cluster Level control. Values are: 
-	0x00 – Nothing 
-	0x01 – Move up
-	0x02 – Move down
-	0x03 – Stop
`,
        entityCategory: 'config',
    }),

    // Window covering cluster mode
    enumLookup({
        name: 'Window covering cluster mode',
        lookup: windowCoveringClusterModeEnum,
        cluster: 'manuSpecificYokisChannel',
        attribute: 'windowCoveringClusterMode',
        description: `Define the command to send to the servers using cluster Window Covering. Values are: 
-	0x00 – TOGGLE (1)
-	0x01 – UP/OPEN
-	0x02 – DOWN/CLOSE
-	0x03 – STOP
`,
        entityCategory: 'config',
    }),

    // Cluster to be used
    // Supports reporting
    numeric({
        name: 'ClusterToBeUsed',
        cluster: 'manuSpecificYokisChannel',
        attribute: 'clusterToBeUsed',
        description: `Defines the cluster that will be used by the channel to create an order. 

If the value is set to 0xFFF0 the device will use a cluster priority list in order to choose the correct cluster and create the order associate depending on the target binded to the channel. The device will check which cluster the target declares and use the highest priority

The priority list is:
-	Yokis Input cluster (0xFC02)
-	Window covering (0x0102)
-	On Off (0x0006)
-	Level Control (0x0008)
-	Yokis Pilot Wire (0xFC0A)
-	Yokis Light Control (0xFC06)

This mode allows the user to “mix” multiple device type on the same channel.

When a cluster is specified, the channel will only “control” the device binded with this specific cluster.
`,
        entityCategory: 'config',
    }),

    // Sending mode
    enumLookup({
        name: 'Sending mode ',
        lookup: sendingModeEnum,
        cluster: 'manuSpecificYokisChannel',
        attribute: 'sendingMode',
        description: `Define the channel sending mode:
-	0x00 : DIRECT
-	0x01 : BROADCAST
-	0x02: GROUP (Will use the Group Id)
`,
        entityCategory: 'config',
    }),

    // Yokis light control mode
    enumLookup({
        name: 'Yokis light control mode',
        lookup: yokisLightControlModeEnum,
        cluster: 'manuSpecificYokisChannel',
        attribute: 'yokisLightControlMode',
        description: `Define the light control mode used between remote and the binded device. Values are: 
-	0x00 – Mode pulse
-	0x01 – Mode deaf
`,
        entityCategory: 'config',
    }),

    // Yokis pilot wire cluster mode
    enumLookup({
        name: 'Yokis pilot wire cluster mode',
        lookup: yokisPilotWireClusterModeEnum,
        cluster: 'manuSpecificYokisChannel',
        attribute: 'yokisPilotWireClusterMode',
        description: `Define the command to send to the servers using cluster Yokis Pilot Wire. Values are: 
-	0x00 – TOGGLE (1) 
-	0x01 – CONFORT
-	0x02 – ECO
`,
        entityCategory: 'config',
    }),

    // Group id
    numeric({
        name: 'GroupId',
        cluster: 'manuSpecificYokisChannel',
        attribute: 'groupId',
        description: `Indicate the group id who will receive the command from the dedicated endpoint. Only used when the sending mode is set to “GROUP” (0x02)`,
        entityCategory: 'config',
    }),
];

const YokisPilotWireExtend: ModernExtend[] = [
    // TODO : Placeholder - pending documentation
];

const YokisStatsExtend: ModernExtend[] = [
    // TODO : Placeholder - pending documentation
];

// #endregion

const definitions: DefinitionWithExtend[] = [
    {
        // MTR500E-UP
        zigbeeModel: ['MTR500E-UP'],
        model: 'MTR500E-UP',
        vendor: 'YOKIS',
        description: 'Remote power switch with timer 500W',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisEntryConfigurator',
                'manuSpecificYokisSubSystem',
                'manuSpecificYokisLoadManager',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisStats',
            ]),
            onOff({powerOnBehavior: false}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            identify(),
            ...yokisLightControlExtend,
            ...YokisDeviceExtend,
            ...YokisInputExtend,
            ...YokisEntryExtend,
            ...YokisSubSystemExtend,
            ...YokisStatsExtend,
        ],
    },
    {
        // MTR1300E-UP
        zigbeeModel: ['MTR1300E-UP'],
        model: 'MTR1300E-UP',
        vendor: 'YOKIS',
        description: 'Remote power switch with timer 1300W',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisEntryConfigurator',
                'manuSpecificYokisSubSystem',
                'manuSpecificYokisLoadManager',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisStats',
            ]),
            onOff({powerOnBehavior: false}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            identify(),
            ...yokisLightControlExtend,
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisEntryExtend,
            // ...YokisSubSystemExtend,
            // ...YokisStatsExtend,
        ],
    },
    {
        // MTR2000E-UP
        zigbeeModel: ['MTR2000E-UP'],
        model: 'MTR2000E-UP',
        vendor: 'YOKIS',
        description: 'Remote power switch with timer 2000W',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisEntryConfigurator',
                'manuSpecificYokisSubSystem',
                'manuSpecificYokisLoadManager',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisStats',
            ]),
            onOff({powerOnBehavior: false}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            identify(),
            ...yokisLightControlExtend,
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisEntryExtend,
            // ...YokisSubSystemExtend,
            // ...YokisStatsExtend,
        ],
    },
    {
        // MTV300E-UP
        zigbeeModel: ['MTV300E-UP'],
        model: 'MTV300E-UP',
        vendor: 'YOKIS',
        description: 'Remote dimmer with timer 300W',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisEntryConfigurator',
                'manuSpecificYokisSubSystem',
                'manuSpecificYokisLoadManager',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisStats',
            ]),
            light({configureReporting: true, powerOnBehavior: false}), // TODO: review dimmer cluster instead
            identify(),
            ...yokisLightControlExtend,
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisEntryExtend,
            // ...YokisSubSystemExtend,
            ...YokisDimmerExtend,
            // ...YokisStatsExtend,
        ],
    },
    {
        // MVR500E-UP
        zigbeeModel: ['MVR500E-UP'],
        model: 'MVR500E-UP',
        vendor: 'YOKIS',
        description: 'Roller shutter module 500W',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisEntryConfigurator',
                'manuSpecificYokisSubSystem',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisStats',
            ]),
            identify(),
            windowCovering({controls: ['lift']}),
            commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisEntryExtend,
            // ...YokisSubSystemExtend,
            // ...YokisWindowCoveringExtend,
            // ...YokisStatsExtend
        ],
    },
    {
        // E2BPA-UP
        zigbeeModel: ['E2BPA-UP', 'E2BP-UP'],
        model: 'E2BP-UP',
        vendor: 'YOKIS',
        description: 'Flush-mounted independent 2-channel transmitter',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
                'manuSpecificYokisStats',
            ]),
            deviceEndpoints({endpoints: {'1': 1, '2': 2}}),
            identify(),
            forcePowerSource({powerSource: 'Battery'}),
            commandsOnOff({endpointNames: ['1', '2']}),
            // commandsLevelCtrl(),
            // commandsWindowCovering(),
            // ...yokisLightControlExtend,
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
        ],
    },
    {
        // E4BPA-UP
        zigbeeModel: ['E4BPA-UP', 'E4BP-UP', 'E4BPX-UP'],
        model: 'E4BP-UP',
        vendor: 'YOKIS',
        description: 'Flush-mounted independent 4-channel transmitter',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
                'manuSpecificYokisStats',
            ]),
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '4': 4}}),
            identify(),
            forcePowerSource({powerSource: 'Battery'}),
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsWindowCovering(),
            // ...yokisLightControlExtend,
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
        ],
    },
    {
        // TLC1-UP
        zigbeeModel: ['TLC1-UP'],
        model: 'TLC1-UP',
        vendor: 'YOKIS',
        description: 'Tabletop Design series 1-button remote control',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
            ]),
            identify(),
            forcePowerSource({powerSource: 'Battery'}), // until Battery cluster is implemented
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsWindowCovering(),
        ],
    },
    {
        // TLC2-UP
        zigbeeModel: ['TLC2-UP'],
        model: 'TLC2-UP',
        vendor: 'YOKIS',
        description: 'Keyring Design series 2-button remote control',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
            ]),
            deviceEndpoints({endpoints: {'1': 1, '2': 2}}),
            identify(),
            forcePowerSource({powerSource: 'Battery'}), // until Battery cluster is implemented
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsWindowCovering(),
        ],
    },
    {
        // TLC4-UP
        zigbeeModel: ['TLC4-UP'],
        model: 'TLC4-UP',
        vendor: 'YOKIS',
        description: 'Keyring Design series 4-button remote control',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
            ]),
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '4': 4}}),
            identify(),
            forcePowerSource({powerSource: 'Battery'}), // until Battery cluster is implemented
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsWindowCovering(),
        ],
    },
    {
        // TLC8-UP
        zigbeeModel: ['TLC8-UP'],
        model: 'TLC8-UP',
        vendor: 'YOKIS',
        description: 'Keyring Design series 8-button remote control',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
            ]),
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8}}),
            identify(),
            forcePowerSource({powerSource: 'Battery'}), // until Battery cluster is implemented
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsWindowCovering(),
            ...YokisDeviceExtend,
        ],
    },
    {
        // TLM1-UP
        zigbeeModel: ['TLM1-UP'],
        model: 'TLM1-UP',
        vendor: 'YOKIS',
        description: 'Wall-mounted 1-button transmitter',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
            ]),
            identify(),
            forcePowerSource({powerSource: 'Battery'}), // until Battery cluster is implemented
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsWindowCovering(),
        ],
    },
    {
        // TLM2-UP
        zigbeeModel: ['TLM2-UP'],
        model: 'TLM2-UP',
        vendor: 'YOKIS',
        description: 'Wall-mounted 2-button transmitter',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
            ]),
            deviceEndpoints({endpoints: {'1': 1, '2': 2}}),
            identify(),
            forcePowerSource({powerSource: 'Battery'}), // until Battery cluster is implemented
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsWindowCovering(),
        ],
    },
    {
        // TLM4-UP
        zigbeeModel: ['TLM4-UP'],
        model: 'TLM4-UP',
        vendor: 'YOKIS',
        description: 'Wall-mounted 4-button transmitter',
        extend: [
            deviceAddCustomClusters([
                'manuSpecificYokisDevice',
                'manuSpecificYokisInput',
                'manuSpecificYokisLightControl',
                'manuSpecificYokisDimmer',
                'manuSpecificYokisWindowCovering',
                'manuSpecificYokisChannel',
                'manuSpecificYokisPilotWire',
            ]),
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '4': 4}}),
            identify(),
            forcePowerSource({powerSource: 'Battery'}), // until Battery cluster is implemented
            commandsOnOff(),
            commandsLevelCtrl(),
            commandsWindowCovering(),
        ],
    },
];

export default definitions;
module.exports = definitions;
