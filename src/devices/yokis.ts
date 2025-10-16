import {Zcl} from "zigbee-herdsman";
import type {ClusterDefinition, ZclArray} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";

import * as tz from "../converters/toZigbee";
import {repInterval} from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, KeyValueAny, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

// #region Constants

const e = exposes.presets;
const ea = exposes.access;

// const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.YOKIS};
const NS = "zhc:yokis";

// stateAfterBlinkEnum (manuSpecificYokisLightControl)
const stateAfterBlinkEnum: {[s: string]: number} = {
    previous: 0x00,
    off: 0x01,
    on: 0x02,
    infinite: 0x03,
};

// resetActionEnum (manuSpecificYokisDevice)
const resetActionEnum: {[s: string]: number} = {
    factory_reset: 0x00,
    configuration_reset: 0x01,
    network_reset: 0x02,
};

// inputModeEnum (manuSpecificYokisInput)
const inputModeEnum: {[s: string]: number} = {
    unknown: 0x00,
    push_button: 0x01, // default
    switch: 0x02,
    relay: 0x03,
    fp_in: 0x04, // Fil pilote
};

// pilotwireOrderEnun (manuSpecificYokisPilotWire)
const pilotwireOrderEnun: {[s: string]: number} = {
    stop: 0x00,
    frost_off: 0x01,
    eco: 0x02,
    confort_2: 0x03,
    confort_1: 0x04,
    confort: 0x05,
};

// #endregion

// #region Custom cluster definition

interface YokisDevice {
    attributes: {
        configurationChanged: number;
    };
    commands: {
        // biome-ignore lint/style/useNamingConvention: TODO
        resetToFactorySettings: {uc_ResetAction: number};
        relaunchBleAdvert: Record<string, never>;
        // biome-ignore lint/style/useNamingConvention: TODO
        openNetwork: {uc_OpeningTime: number};
    };
    commandResponses: never;
}
interface YokisInput {
    attributes: {
        inputMode: number;
        contactMode: number;
        lastLocalCommandState: number;
        lastBPConnectState: number;
        backlightIntensity: number;
    };
    commands: {
        sendPress: Record<string, never>;
        sendRelease: Record<string, never>;
        // biome-ignore lint/style/useNamingConvention: TODO
        selectInputMode: {uc_InputMode: number};
    };
    commandResponses: never;
}
interface YokisEntryConfigurator {
    attributes: {
        eShortPress: number;
        eLongPress: number;
        longPressDuration: number;
        timeBetweenPress: number;
        eR12MLongPress: number;
        eLocalConfigLock: number;
    };
    commands: never;
    commandResponses: never;
}
interface YokisLightControl {
    attributes: {
        onOff: number;
        prevState: number;
        onTimer: number;
        eOnTimer: number;
        preOnDelay: number;
        ePreOnDelay: number;
        preOffDelay: number;
        ePreOffDelay: number;
        pulseDuration: number;
        timeType: number;
        longOnDuration: number;
        operatingMode: number;
        stopAnnounceTime: number;
        eStopAnnounce: number;
        eDeaf: number;
        eBlink: number;
        blinkAmount: number;
        blinkOnTime: number;
        blinkOffTime: number;
        deafBlinkAmount: number;
        deafBlinkTime: number;
        stateAfterBlink: number;
        eNcCommand: number;
    };
    commands: {
        moveToPosition: {
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_BrightnessStart: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_BrightnessEnd: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_PreTimerValue: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            b_PreTimerEnable: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_TimerValue: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            b_TimerEnable: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_TransitionTime: number;
        };
        pulse: {
            // biome-ignore lint/style/useNamingConvention: TODO
            PulseLength: number;
        };
        blink: {
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_BlinkAmount: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_BlinkOnPeriod: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_BlinkOffPeriod: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_StateAfterSequence: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            b_DoPeriodicCycle: number;
        };
        deafBlink: {
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_BlinkAmount: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_BlinkOnTime: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_SequenceAmount: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            tuc_BlinkAmount: ZclArray | unknown[];
        };
        longOn: Record<string, never>;
    };
    commandResponses: never;
}
interface YokisDimmer {
    attributes: {
        currentPosition: number;
        memoryPosition: number;
        eRampUp: number;
        rampUp: number;
        eRampDown: number;
        rampDown: number;
        rampContinuousTime: number;
        stepUp: number;
        lowDimLimit: number;
        highDimLimit: number;
        nightLightStartingDelay: number;
        nightLightStartingBrightness: number;
        nightLightEndingBrightness: number;
        nightLightRampTime: number;
        nightLightOnTime: number;
        favoritePosition1: number;
        favoritePosition2: number;
        favoritePosition3: number;
        stepControllerMode: number;
        memoryPositionMode: number;
        stepDown: number;
        stepContinuous: number;
        stepNightLight: number;
    };
    commands: {
        dimUp: Record<string, never>;
        dimDown: Record<string, never>;
        dim: {
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_RampContinuousDuration: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_StepContinuous: number;
        };
        dimStop: Record<string, never>;
        dimToMin: {
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_TransitionTime: number;
        };
        dimToMax: {
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_TransitionTime: number;
        };
        startNightLightMode: {
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_ChildModeStartingDelay: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_ChildModeBrightnessStart: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_ChildModeBrightnessEnd: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_ChildModeRampDuration: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            ul_ChildModeOnDuration: number;
            // biome-ignore lint/style/useNamingConvention: TODO
            uc_ChildStep: number;
        };
        startNightLightModeCurrent: Record<string, never>;
        moveToFavorite1: Record<string, never>;
        moveToFavorite2: Record<string, never>;
        moveToFavorite3: Record<string, never>;
    };
    commandResponses: never;
}
interface YokisSubSystem {
    attributes: {
        powerFailureMode: number;
    };
    commands: never;
    commandResponses: never;
}
interface YokisTemperatureMeasurement {
    attributes: {
        currentValue: number;
        minMeasuredValue: number;
        maxMeasuredValue: number;
        offset: number;
        samplingNumber: number;
        samplingPeriod: number;
        deltaTemp: number;
        minimalSendingPeriod: number;
        maximalSendingPeriod: number;
    };
    commands: {
        minMaxReset: Record<string, never>;
    };
    commandResponses: never;
}
interface YokisPilotWire {
    attributes: {
        actualOrder: number;
        orderTimer: number;
        preOrderTimer: number;
        timerUnit: number;
        ledMode: number;
        pilotWireRelayMode: number;
        orderScrollingMode: number;
        orderNumberSupported: number;
        fallbackOrder: number;
    };
    commands: {
        setOrder: {
            order: number;
        };
        toggleOrder: Record<string, never>;
    };
    commandResponses: never;
}

const YokisClustersDefinition: {
    [s: string]: ClusterDefinition;
} = {
    manuSpecificYokisDevice: {
        ID: 0xfc01,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Indicate if the device configuration has changed. 0 to 0xFFFE -> No Change, 0xFFFF -> Change have been detected
            configurationChanged: {ID: 0x0005, type: Zcl.DataType.UINT16},
        },
        commands: {
            // Reset setting depending on RESET ACTION value
            resetToFactorySettings: {
                ID: 0x00,
                response: 0,
                parameters: [
                    // 0x00 -> Factory reset, 0x01 -> Configuration Reset, 0x02 -> Network Reset
                    {name: "uc_ResetAction", type: Zcl.DataType.INT8},
                ],
            },
            // Relaunch BLE advertising for 15 minutes
            relaunchBleAdvert: {
                ID: 0x11,
                response: 0,
                parameters: [],
            },
            // Open Zigbee network
            openNetwork: {
                ID: 0x12,
                response: 0,
                parameters: [
                    // Opening time wanted from 1 to 255 seconds,0 means closing the network.
                    {name: "uc_OpeningTime", type: Zcl.DataType.INT8},
                ],
            },
        },
        commandsResponse: {},
    },
    manuSpecificYokisInput: {
        ID: 0xfc02,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Indicate how the input should be handle: 0 -> Unknown, 1 -> Push button, 2 -> Switch, 3 -> Relay, 4 -> FP_IN
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
                    {name: "uc_InputMode", type: Zcl.DataType.UINT8},
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
                    {name: "uc_BrightnessStart", type: Zcl.DataType.UINT8},
                    {name: "uc_BrightnessEnd", type: Zcl.DataType.UINT8},
                    {name: "ul_PreTimerValue", type: Zcl.DataType.UINT32},
                    {name: "b_PreTimerEnable", type: Zcl.DataType.BOOLEAN},
                    {name: "ul_TimerValue", type: Zcl.DataType.UINT32},
                    {name: "b_TimerEnable", type: Zcl.DataType.BOOLEAN},
                    {name: "ul_TransitionTime", type: Zcl.DataType.UINT32},
                ],
            },
            // This command allows the relay to be controlled with an impulse. The pulse time is defined by PulseLength.
            pulse: {
                ID: 0x04,
                parameters: [{name: "PulseLength", type: Zcl.DataType.UINT16}],
            },
            // With this command, the module is asked to perform a blinking sequence.
            blink: {
                ID: 0x05,
                parameters: [
                    {name: "uc_BlinkAmount", type: Zcl.DataType.UINT8},
                    {name: "ul_BlinkOnPeriod", type: Zcl.DataType.UINT32},
                    {name: "ul_BlinkOffPeriod", type: Zcl.DataType.UINT32},
                    {name: "uc_StateAfterSequence", type: Zcl.DataType.UINT8},
                    {name: "b_DoPeriodicCycle", type: Zcl.DataType.BOOLEAN},
                ],
            },
            // Start a deaf sequence on a device only if the attribute “eDeaf” is set to Enable.
            deafBlink: {
                ID: 0x06,
                parameters: [
                    {name: "uc_BlinkAmount", type: Zcl.DataType.UINT8},
                    {name: "ul_BlinkOnTime", type: Zcl.DataType.UINT16},
                    {name: "uc_SequenceAmount", type: Zcl.DataType.UINT8},
                    {name: "tuc_BlinkAmount", type: Zcl.DataType.ARRAY},
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
        ID: 0xfc07,
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
            stepNightLight: {ID: 0x0018, type: Zcl.DataType.UINT8},
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
                    {name: "ul_RampContinuousDuration", type: Zcl.DataType.UINT32},
                    // Set the step size, otherwise use 0xFF to use the one configured in the product.. Value is in %.
                    {name: "uc_StepContinuous", type: Zcl.DataType.UINT8},
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
                    {name: "ul_TransitionTime", type: Zcl.DataType.UINT32},
                ],
            },
            // Start dimming to the max value set in the device.
            dimToMax: {
                ID: 0x06,
                parameters: [
                    // Set the transition time to the selected value, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: "ul_TransitionTime", type: Zcl.DataType.UINT32},
                ],
            },
            // Start the nightlight mode with the given parameters.
            startNightLightMode: {
                ID: 0x07,
                parameters: [
                    // Set the starting delay value, used before the start of the nightlight, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: "ul_ChildModeStartingDelay", type: Zcl.DataType.UINT32},
                    // Set the brightness at the beginning of the ramp, otherwise use 0xFF to use the one configured in the product. Value is in %.
                    {name: "uc_ChildModeBrightnessStart", type: Zcl.DataType.UINT8},
                    // Set the brightness at the end of the ramp, otherwise use 0xFF to use the one configured in the product. Value is in %.
                    {name: "uc_ChildModeBrightnessEnd", type: Zcl.DataType.UINT8},
                    // Set the ramp duration, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: "ul_ChildModeRampDuration", type: Zcl.DataType.UINT32},
                    // Set the total duration of the nightlight, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms.
                    {name: "ul_ChildModeOnDuration", type: Zcl.DataType.UINT32},
                    // Set the step size between each dim, otherwise use 0xFF to use the one configured in the product. Value is in %.
                    {name: "uc_ChildStep", type: Zcl.DataType.UINT8},
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
        ID: 0xfc0a,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // Represent the actual order used by the device. Default: 0x02, Min-Max: 0x00 - 0xF1. Reportable, not writable
            actualOrder: {ID: 0x0000, type: Zcl.DataType.UINT8},
            // Define the “Order” embedded timer duration. This timer is set when the device changes its order (in second). After that duration, the device is set back to its fallback order. Default: 0x00000000, Min-Max: 0x00000000 - 0xFFFFFFFF
            orderTimer: {ID: 0x0001, type: Zcl.DataType.UINT32},
            // Define the duration before an order is set. This timer is used when a new order is asked, it corresponds to the time before this order is applied. The duration is set in second. Default: 0x00000000, Min-Max: 0x00000000 - 0xFFFFFFFF
            preOrderTimer: {ID: 0x0002, type: Zcl.DataType.UINT32},
            // Represent the actual unit used for local command configuration: 0x00 -> Second, 0x01 -> Minutes. Default: 0x00, Min-Max: 0x00 - 0x01.
            timerUnit: {ID: 0x0003, type: Zcl.DataType.UINT8},
            // Define the product’s LED behavior: 0x00 -> LED is always ON and blink during radio activity, 0x01 -> LED is only OFF during few seconds after a mode transition. Default: 0x00, Min-Max: 0x00 - 0x01.
            ledMode: {ID: 0x0004, type: Zcl.DataType.UINT8},
            // Define if the product must be set into pilot wire relay mode: 0x00 -> Relay mode is deactivated, 0x01 -> Relay mode is activated. Default: 0x00, Min-Max: 0x00 - 0x01.
            pilotWireRelayMode: {ID: 0x0005, type: Zcl.DataType.UINT8},
            // Define the order scrolling sense: 0x00 -> Forward : Confort -> Confort – 1 -> Confort – 2 -> Eco -> Hors-Gel -> Arrêt, 0x01 -> Backward : Arrêt -> Hors-Gel -> Eco -> Confort – 2 -> Confort – 1 -> Confort. Default: 0x00, Min-Max: 0x00 - 0x01.
            orderScrollingMode: {ID: 0x0006, type: Zcl.DataType.UINT8},
            // Define the number of orders supported by the device: 0x00 -> 4 orders (Confort, Eco, Hors-Gel, Arrêt), 0x01 -> 6 orders (Confort, Confort – 1, Confort – 2, Eco, Hors-Gel, Arrêt). Default: 0x01, Min-Max: 0x00 - 0x01.
            orderNumberSupported: {ID: 0x0007, type: Zcl.DataType.UINT8},
            // Represent the fallback order used by the device after the end of an order timer is reached: 0x00 -> Stop, 0x01 -> Frost-off, 0x02 -> Eco, 0x03 -> Confort-2, 0x04 -> Confort-1, 0x05 -> Confort. Default: 0x02, Min-Max: 0x00 - 0x05.
            fallbackOrder: {ID: 0x0008, type: Zcl.DataType.UINT8},
        },
        commands: {
            // Set the device in the specified order.
            setOrder: {
                ID: 0x00,
                parameters: [
                    // Order to be set: 0x00 -> Stop, 0x01 -> Frost-off, 0x02 -> Eco, 0x03 -> Confort-2, 0x04 -> Confort-1, 0x05 -> Confort
                    {name: "order", type: Zcl.DataType.UINT8},
                ],
            },
            // Toggle between order by respecting the scrolling order.
            toggleOrder: {
                ID: 0x01,
                parameters: [],
            },
        },
        commandsResponse: {},
    },
    manuSpecificYokisTemperatureMeasurement: {
        ID: 0xfc0b,
        manufacturerCode: Zcl.ManufacturerCode.YOKIS,
        attributes: {
            // This attribute represents the last value measured. The unit is in 0.01 °C (12,25°C -> 1225). Default: 0x0000, Min-Max: 0x954D - 0x7FFE. Reportable, not writable
            currentValue: {ID: 0x0000, type: Zcl.DataType.INT16},
            // Represent the minimal value set since the last power-on/reset. The unit is in 0.01 °C (12,25°C -> 1225). Default: 0x7FFE , Min-Max: 0x954D - 0x7FFE. Reportable, not writable
            minMeasuredValue: {ID: 0x0001, type: Zcl.DataType.INT16},
            // Represent the maximal value set since the last power-on/reset. The unit is in 0.01 °C (12,25°C -> 1225). Default: 0x954D , Min-Max: 0x954D - 0x7FFE. Reportable, not writable
            maxMeasuredValue: {ID: 0x0002, type: Zcl.DataType.INT16},
            // Represent the offset applicated to the temperature measured. The unit is in 0,1°C (1,5°C -> 15). Default: 0x00, Min-Max: 0xCE (-50) - 0x32 (50).
            offset: {ID: 0x0003, type: Zcl.DataType.INT8},
            // Represent the sampling period used to process the temperature measurement. The unit is in seconds. Default: 0x0A, Min-Max: 0x01 - 0x78.
            samplingPeriod: {ID: 0x0004, type: Zcl.DataType.UINT8},
            // Represents the sampling number to sense per sampling period defined before. Default: 0x03, Min-Max: 0x01 - 0x14.
            samplingNumber: {ID: 0x0005, type: Zcl.DataType.UINT8},
            // Represents the temperature variation to request a new temperature sending through reports. The unit is in 0,1°C (0,5°C ->5). Default: 0x00, Min-Max: 0x00 - 0x0A.
            deltaTemp: {ID: 0x0006, type: Zcl.DataType.UINT8},
            // Represents the minimal sending period that the device must respect before sending a new value through reporting. A writing on this attribute will update all reporting entries related to the temperature measurement. Default: 0x0A, Min-Max: 0x0000 - 0xFFFF.
            minimalSendingPeriod: {ID: 0x0007, type: Zcl.DataType.UINT16},
            // Represents the maximal sending period. The device must send a new value through reporting before the end of this period. A writing on this attribute will update all reporting entries related to the temperature measurement. Default: 0x0A, Min-Max: 0x0000 - 0xFFFF.
            maximalSendingPeriod: {ID: 0x0008, type: Zcl.DataType.UINT16},
        },
        commands: {
            // Reset the Min and Max temperature value information.
            minMaxReset: {
                ID: 0x00,
                parameters: [],
            },
        },
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

// #endregion

// #region Extension definition

// Checks definition
const yokisExtendChecks = {
    parseResetInput: (input: string) => {
        if (!input) {
            throw new Error("MISSING_INPUT");
        }

        if (!Object.keys(resetActionEnum).includes(input)) {
            throw new Error("INVALID_RESET_ACTION");
        }

        return {
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_ResetAction: utils.getFromLookup(input, resetActionEnum),
            },
        };
    },
    parseOpenNetworkInput: (input: KeyValueAny) => {
        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("opening_time" in input) || !utils.isNumber(input.opening_time)) {
            throw new Error("INVALID_OPENNETWORK_OPENINGTIME");
        }

        return {
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_OpeningTime: input.opening_time,
            },
        };
    },
    parseInputModeInput: (input: KeyValueAny) => {
        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("select_input_mode" in input) || !Object.keys(inputModeEnum).includes(input.select_input_mode)) {
            throw new Error("INVALID_INPUTMODE");
        }

        return {
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_InputMode: utils.getFromLookup(input.select_input_mode, inputModeEnum),
            },
        };
    },
    parseMoveToPositionInput: (input: KeyValueAny) => {
        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("brightness_start" in input) || !utils.isNumber(input.brightness_start)) {
            throw new Error("INVALID_MOVE_BRIGHTNESSSTART");
        }

        if (!("brightness_end" in input) || !utils.isNumber(input.brightness_end)) {
            throw new Error("INVALID_MOVE_BRIGHTNESSEND");
        }

        if (!("pre_timer_value" in input) || !utils.isNumber(input.pre_timer_value)) {
            throw new Error("INVALID_MOVE_PRETIMERVALUE");
        }

        if (!("enable_pre_timer" in input) || !utils.isBoolean(input.enable_pre_timer)) {
            throw new Error("INVALID_MOVE_PRETIMERENABLE");
        }

        if (!("timer_value" in input) || !utils.isNumber(input.timer_value)) {
            throw new Error("INVALID_MOVE_TIMERVALUE");
        }

        if (!("enable_timer" in input) || !utils.isBoolean(input.enable_timer)) {
            throw new Error("INVALID_MOVE_TIMERENABLE");
        }

        if (!("transition_time" in input) || !utils.isNumber(input.transition_time)) {
            throw new Error("INVALID_MOVE_TRANSITIONTIME");
        }

        return {
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_BrightnessStart: input.brightness_start,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_BrightnessEnd: input.brightness_end,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_PreTimerValue: input.pre_timer_value,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                b_PreTimerEnable: input.enable_pre_timer ? 1 : 0,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_TimerValue: input.timer_value,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                b_TimerEnable: input.enable_timer ? 1 : 0,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_TransitionTime: input.transition_time,
            },
        };
    },
    parseBlinkInput: (input: KeyValueAny) => {
        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("blink_amount" in input) || !utils.isNumber(input.blink_amount)) {
            throw new Error("INVALID_BLINK_BLINKAMOUNT");
        }

        if (!("blink_on_period" in input) || !utils.isNumber(input.blink_on_period)) {
            throw new Error("INVALID_BLINK_BLINKONPERIOD");
        }

        if (!("blink_off_period" in input) || !utils.isNumber(input.blink_off_period)) {
            throw new Error("INVALID_BLINK_BLINKOFFPERIOD");
        }

        if (!("state_after_sequence" in input) || !Object.keys(stateAfterBlinkEnum).includes(input.state_after_sequence)) {
            throw new Error("MISSING_BLINK_STATEAFTERSEQUENCE");
        }

        if (!("do_periodic_cycle" in input) || !utils.isBoolean(input.do_periodic_cycle)) {
            throw new Error("INVALID_BLINK_DOPERIODICYCLE");
        }

        return {
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_BlinkAmount: input.blink_amount,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_BlinkOnPeriod: input.blink_on_period,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_BlinkOffPeriod: input.blink_off_period,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_StateAfterSequence: utils.getFromLookup(input.state_after_sequence, stateAfterBlinkEnum),
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                b_DoPeriodicCycle: input.do_periodic_cycle ? 1 : 0,
            },
        };
    },
    parsePulseInput: (input: KeyValueAny) => {
        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("pulse_length" in input) || !utils.isNumber(input.pulse_length)) {
            throw new Error("INVALID_PULSE_PULSELENGTH");
        }

        return {
            payload: {
                PulseLength: input.pulse_length,
            },
        };
    },
    parseDeafBlinkPropInput: (input: KeyValueAny) => {
        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("blink_amount" in input) || !utils.isNumber(input.blink_amount)) {
            throw new Error("INVALID_BLINK_AMOUNT");
        }

        if (!("blink_on_time" in input) || !utils.isNumber(input.blink_on_time)) {
            throw new Error("INVALID_BLINK_ONTIME");
        }

        if (!("sequence_amount" in input) || !utils.isNumber(input.sequence_amount)) {
            throw new Error("INVALID_SEQUENCE_AMOUNT");
        }

        if (input.sequence_of_blinks && Array.isArray(input.sequence_of_blinks)) {
            // if (input.uc_SequenceAmount < input.tuc_BlinkAmount.length) {
            //     // more sequences configured than expected, pop extragenous
            //     for(let i = 0; i < input.tuc_BlinkAmount.length - input.uc_SequenceAmount; i++) {
            //         input.tuc_BlinkAmount.pop();
            //     }
            // }

            // if (input.uc_SequenceAmount > input.tuc_BlinkAmount.length) {
            //     // more sequences than configured, pad with additional
            //     for(let i = 0; i < input.uc_SequenceAmount - input.tuc_BlinkAmount.length; i++) {
            //         input.tuc_BlinkAmount.push({"uc_BlinkAmountItem":1}); //puke
            //     }
            // }

            // Updating number of elements
            input.sequence_amount = input.sequence_of_blinks.length;
        } else {
            throw new Error("INVALID_TUC_BLINKAMOUNT");
        }

        if (!("uc_BlinkAmount" in input) || !utils.isNumber(input.uc_SequenceAmount)) {
            throw new Error("INVALID_SEQUENCE_AMOUNT");
        }

        return {
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_BlinkAmount: input.blink_amount,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_BlinkOnTime: input.blink_on_time,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_SequenceAmount: input.sequence_of_blinks.length,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                tuc_BlinkAmount: input.sequence_of_blinks.map((elem) => (typeof elem === "object" ? Object.values(elem).shift() : elem)), // [{"undefined":1},{"undefined":1}] > [1,1]
            },
        };
    },
    parseDim: (input: KeyValueAny) => {
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ulRampContinuousDuration;
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ucStepContinuous;

        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("ramp_continuous_duration" in input) || !utils.isNumber(input.ramp_continuous_duration)) {
            _ulRampContinuousDuration = 0xffffffff; // use default value
        } else _ulRampContinuousDuration = input.ramp_continuous_duration;

        if (!("step_continuous" in input) || !utils.isNumber(input.step_continuous)) {
            _ucStepContinuous = 0xff; // use default value
        } else _ucStepContinuous = input.step_continuous;

        return {
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_RampContinuousDuration: _ulRampContinuousDuration,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_StepContinuous: _ucStepContinuous,
            },
        };
    },
    parseDimMinMax: (input: KeyValueAny) => {
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ulTransitionTime;

        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("transition_time" in input) || !utils.isNumber(input.transition_time)) {
            _ulTransitionTime = 0xffffffff; // use default value
        } else _ulTransitionTime = input.transition_time;

        if (!("action" in input)) {
            throw new Error("MISSING_ACTION");
        }

        return {
            action: input.action,
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_TransitionTime: _ulTransitionTime,
            },
        };
    },
    parseStartNightLightMode: (input: KeyValueAny) => {
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ulChildModeStartingDelay;
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ucChildModeBrightnessStart;
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ucChildModeBrightnessEnd;
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ulChildModeRampDuration;
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ulChildModeOnDuration;
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let _ucChildStep;

        if (!input || typeof input !== "object") {
            throw new Error("NOT_OBJECT");
        }

        if (!("childmode_starting_delay" in input) || !utils.isNumber(input.childmode_starting_delay)) {
            _ulChildModeStartingDelay = 0xffffffff; // use default value
        } else _ulChildModeStartingDelay = input.childmode_starting_delay;

        if (!("childmode_brightness_start" in input) || !utils.isNumber(input.childmode_brightness_start)) {
            _ucChildModeBrightnessStart = 0xff; // use default value
        } else _ucChildModeBrightnessStart = input.childmode_brightness_start;

        if (!("childmode_brightness_end" in input) || !utils.isNumber(input.childmode_brightness_end)) {
            _ucChildModeBrightnessEnd = 0xff; // use default value
        } else _ucChildModeBrightnessEnd = input.childmode_brightness_end;

        if (!("childmode_ramp_duration" in input) || !utils.isNumber(input.childmode_ramp_duration)) {
            _ulChildModeRampDuration = 0xffffffff; // use default value
        } else _ulChildModeRampDuration = input.childmode_ramp_duration;

        if (!("childmode_on_duration" in input) || !utils.isNumber(input.childmode_on_duration)) {
            _ulChildModeOnDuration = 0xffffffff; // use default value
        } else _ulChildModeOnDuration = input.childmode_on_duration;

        if (!("childmode_step" in input) || !utils.isNumber(input.childmode_step)) {
            _ucChildStep = 0xff; // use default value
        } else _ucChildStep = input.childmode_step;

        return {
            payload: {
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_ChildModeStartingDelay: _ulChildModeStartingDelay,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_ChildModeBrightnessStart: _ucChildModeBrightnessStart,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_ChildModeBrightnessEnd: _ucChildModeBrightnessEnd,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_ChildModeRampDuration: _ulChildModeRampDuration,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                ul_ChildModeOnDuration: _ulChildModeOnDuration,
                // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
                uc_ChildStep: _ucChildStep,
            },
        };
    },
    parsePilotwireOrder: (input: string) => {
        if (!input) {
            throw new Error("MISSING_INPUT");
        }

        if (!Object.keys(pilotwireOrderEnun).includes(input)) {
            throw new Error("INVALID_ORDER_ACTION");
        }

        return {
            payload: {
                order: utils.getFromLookup(input, pilotwireOrderEnun),
            },
        };
    },
    log: (key: string, value: KeyValueAny | string, payload?: KeyValueAny) => {
        logger.debug(`Invoked converter with key: '${key}'`, NS);
        logger.debug(`Invoked converter with values:${JSON.stringify(value)}`, NS);
        if (payload) logger.debug(`Invoked converter with payload:${JSON.stringify(payload)}`, NS);
    },
};

// Command definition
const yokisCommandsExtend = {
    resetToFactorySettings: (): ModernExtend => {
        const exposes = e
            .enum("reset_to_factory_settings", ea.SET, Object.keys(resetActionEnum))
            .withDescription("Reset setting depending on RESET ACTION value")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["reset_to_factory_settings"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const commandWrapper = yokisExtendChecks.parseResetInput(value);

                    yokisExtendChecks.log(key, value);

                    await entity.command<"manuSpecificYokisDevice", "resetToFactorySettings", YokisDevice>(
                        "manuSpecificYokisDevice",
                        "resetToFactorySettings",
                        commandWrapper.payload,
                    );
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
            .enum("relaunch_ble_advert", ea.SET, ["relaunch_ble_advert"])
            .withDescription("Relaunch BLE advertising for 15 minutes")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["relaunch_ble_advert"],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command<"manuSpecificYokisDevice", "relaunchBleAdvert", YokisDevice>(
                        "manuSpecificYokisDevice",
                        "relaunchBleAdvert",
                        {},
                    );
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
            .composite("open_network_command", "open_network_prop", ea.SET)
            .withDescription("Open Zigbee network")
            .withFeature(
                e
                    .numeric("opening_time", ea.SET) //uc_OpeningTime
                    .withValueMin(0)
                    .withValueMax(255)
                    .withUnit("s")
                    .withDescription("Opening time wanted from 1 to 255 seconds,0 means closing the network."),
            )
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["open_network_prop"],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseOpenNetworkInput(value);

                    yokisExtendChecks.log(key, value);

                    await entity.command<"manuSpecificYokisDevice", "openNetwork", YokisDevice>(
                        "manuSpecificYokisDevice",
                        "openNetwork",
                        commandWrapper.payload,
                    );
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
            .composite("move_to_position_command", "move_to_position_prop", ea.SET)
            .withDescription(
                "Move to position specified in uc_BrightnessEnd parameter." +
                    "If TOR mode is set (no dimming) or MTR : if uc_BrightnessEnd under 50% will set to OFF else will be set to ON",
            )
            .withFeature(
                e
                    .numeric("brightness_start", ea.SET) // uc_BrightnessStart
                    .withDescription("Define the brightness at the beginning of the transition, in %"),
            )
            .withFeature(
                e
                    .numeric("brightness_end", ea.SET) // uc_BrightnessEnd
                    .withDescription("Define the brightness at the end of the transition, in %"),
            )
            .withFeature(
                e
                    .numeric("pre_timer_value", ea.SET) // ul_PreTimerValue
                    .withUnit("s")
                    .withDescription("Define the pre timer value, otherwise use 0xFFFFFFFF to use the one configured in the product"),
            )
            .withFeature(
                e
                    .binary("enable_pre_timer", ea.SET, true, false) // b_PreTimerEnable
                    .withDescription("Define whether the device should use the pre timer or not, if 0xFF then use the one configured in product"),
            )
            .withFeature(
                e
                    .numeric("timer_value", ea.SET) // ul_TimerValue
                    .withUnit("s")
                    .withDescription("Define the timer ON value, otherwise use 0xFFFFFFFF to use the one configured in the product"),
            )
            .withFeature(
                e
                    .binary("enable_timer", ea.SET, true, false) // b_TimerEnable
                    .withDescription("Define whether the device should use the timer ON or not, if 0xFF then use the one configured in product"),
            )
            .withFeature(
                e
                    .numeric("transition_time", ea.SET) // ul_TransitionTime
                    .withDescription("Define the transition time from the brightness start to the brightness end, in ms"),
            )
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["move_to_position_prop"],
                convertSet: async (entity, key, value, meta) => {
                    // const options = utils.getOptions(meta.mapped, entity);
                    // logger.debug('Invoked converter with options:' + JSON.stringify(options));

                    const commandWrapper = yokisExtendChecks.parseMoveToPositionInput(value);

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command<"manuSpecificYokisLightControl", "moveToPosition", YokisLightControl>(
                        "manuSpecificYokisLightControl",
                        "moveToPosition",
                        commandWrapper.payload,
                    );
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
            .composite("blink_command", "blink_prop", ea.SET)
            .withDescription("With this command, the module is asked to perform a blinking sequence.")
            .withFeature(
                e
                    .numeric("blink_amount", ea.SET) // uc_BlinkAmount
                    .withDescription(
                        "If defined will force the number of blink to be done (only for this order) if not the device will use its own value.",
                    ),
            )
            .withFeature(
                e
                    .numeric("blink_on_period", ea.SET) // ul_BlinkOnPeriod
                    .withDescription("If defined will force the blink’s “on time” (only for this order) if not the device will use its own value."),
            )
            .withFeature(
                e
                    .numeric("blink_off_period", ea.SET) // ul_BlinkOffPeriod
                    .withDescription("If defined will force the blink’s “off time” (only for this order) if not the device will use its own value."),
            )
            .withFeature(
                e
                    .enum("state_after_sequence", ea.SET, Object.keys(stateAfterBlinkEnum)) // uc_StateAfterSequence
                    .withDescription(
                        "If defined will force the state after the sequence (only for this order). if not the device will use its own value-",
                    ),
            )
            .withFeature(
                e
                    .binary("do_periodic_cycle", ea.SET, true, false) // b_DoPeriodicCycle
                    .withDescription("If set to true the blinking will be “infinite”"),
            )
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["blink_prop"],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseBlinkInput(value);

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command<"manuSpecificYokisLightControl", "blink", YokisLightControl>(
                        "manuSpecificYokisLightControl",
                        "blink",
                        commandWrapper.payload,
                    );
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
            .composite("pulse_command", "pulse_prop", ea.SET)
            .withDescription("This command allows the relay to be controlled with an impulse. The pulse time is defined by PulseLength")
            .withFeature(
                e
                    .numeric("pulse_length", ea.SET) // pulseLength
                    .withValueMax(65535)
                    .withUnit("ms")
                    .withDescription("Pulse length"),
            )
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["pulse_prop"],
                convertSet: (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parsePulseInput(value);

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
            .composite("deaf_blink_command", "deaf_blink_prop", ea.SET)
            .withDescription("Start a deaf sequence on a device only if the attribute “eDeaf” is set to Enable")
            .withFeature(
                e
                    .numeric("blink_amount", ea.SET) // uc_BlinkAmount
                    .withDescription(
                        "If defined will force the number of blink to be done during one sequence (only for this order) if not the device will use its own value",
                    ),
            )
            .withFeature(
                e
                    .numeric("blink_on_time", ea.SET) // ul_BlinkOnTime
                    .withDescription("If defined will force the blink’s “on time” (only for this order) if not the device will use its own value"),
            )
            .withFeature(
                e
                    .numeric("sequence_amount", ea.STATE) // uc_SequenceAmount
                    .withValueMin(0)
                    .withValueMax(6)
                    .withDescription("If defined will set the number of sequence to be done. Each sequence is spaced by 1 second. (Max 6)"),
            )
            .withFeature(
                e
                    .list(
                        "sequence_of_blinks", // tuc_BlinkAmount
                        ea.SET,
                        e
                            .composite("uc_BlinkAmountItems", "uc_BlinkAmountItems", ea.SET)
                            .withLabel("Number of blink items for the sequence")
                            .withFeature(e.numeric("uc_BlinkAmountItem", ea.SET).withLabel("Blinks")),
                    )
                    .withLengthMin(0)
                    .withLengthMax(6)
                    .withDescription("Array with the number of blink to be done for each sequence. Will override “uc_BlinkAmount“"),
            )
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["deaf_blink_prop"],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseDeafBlinkPropInput(value);

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command<"manuSpecificYokisLightControl", "deafBlink", YokisLightControl>(
                        "manuSpecificYokisLightControl",
                        "deafBlink",
                        commandWrapper.payload,
                    );
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
        const exposes = e
            .enum("long_on_command", ea.SET, ["longOnAction"])
            .withDescription("Switch output ON for LONG ON DURATION time")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["long_on_command"],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command<"manuSpecificYokisLightControl", "longOn", YokisLightControl>("manuSpecificYokisLightControl", "longOn", {});
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
            .enum("send_press", ea.SET, ["SendPress"])
            .withDescription("Send to the server cluster a button press")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["send_press"],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command<"manuSpecificYokisInput", "sendPress", YokisInput>("manuSpecificYokisInput", "sendPress", {});
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
            .enum("send_release", ea.SET, ["SendRelease"])
            .withDescription("Send to the server cluster a button release")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["send_release"],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command<"manuSpecificYokisInput", "sendRelease", YokisInput>("manuSpecificYokisInput", "sendRelease", {});
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
            .enum("select_input_mode", ea.SET, Object.keys(inputModeEnum))
            .withDescription("Change the Input mode to use switch input, wired relay or simple push button")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["select_input_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseInputModeInput(value);

                    yokisExtendChecks.log(key, value);

                    await entity.command<"manuSpecificYokisInput", "selectInputMode", YokisInput>(
                        "manuSpecificYokisInput",
                        "selectInputMode",
                        commandWrapper.payload,
                    );
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
            .composite("dimmer_loop_command", "dimmer_prop", ea.SET)
            .withDescription("Start the dimming loop process for the selected duration.")
            .withFeature(
                e
                    .numeric("ramp_continuous_duration", ea.SET) // ul_RampContinuousDuration
                    .withUnit("ms")
                    .withDescription(
                        "Set the duration of the ramp for the continuous variation, otherwise use 0xFFFFFFFF to use the one configured in the product",
                    ),
            )
            .withFeature(
                e
                    .numeric("step_continuous", ea.SET) // uc_StepContinuous
                    .withUnit("s")
                    .withDescription("Set the step size, otherwise use 0xFF to use the one configured in the product. Value is in %"),
            )
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_prop"],
                convertSet: async (entity, key, value, meta) => {
                    // const options = utils.getOptions(meta.mapped, entity);
                    // logger.debug('Invoked converter with options:' + JSON.stringify(options));

                    const commandWrapper = yokisExtendChecks.parseDim(value);

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command<"manuSpecificYokisDimmer", "dim", YokisDimmer>("manuSpecificYokisDimmer", "dim", commandWrapper.payload);
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
            .composite("dimmer_min_max_command", "dimmer_min_max_prop", ea.SET)
            .withDescription("Start dimming to the min or max value set in the device")
            .withFeature(
                e
                    .numeric("transition_time", ea.SET) // ul_TransitionTime
                    .withUnit("ms")
                    .withDescription(
                        "Set the transition time to the selected value, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms",
                    ),
            )
            .withFeature(e.enum("action", ea.SET, ["dimToMin", "dimToMax"]))
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_min_max_prop"],
                convertSet: async (entity, key, value, meta) => {
                    // const options = utils.getOptions(meta.mapped, entity);
                    // logger.debug('Invoked converter with options:' + JSON.stringify(options));

                    const commandWrapper = yokisExtendChecks.parseDimMinMax(value);

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command("manuSpecificYokisDimmer", commandWrapper.action, commandWrapper.payload);
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
        const exposes = e.enum("dimmer_Up_down_command", ea.SET, ["dimUp", "dimDown"]).withDescription("Dim up or Down").withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_Up_down_command"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    yokisExtendChecks.log(key, value);
                    await entity.command<"manuSpecificYokisDimmer", "dimUp" | "dimDown", YokisDimmer>(
                        "manuSpecificYokisDimmer",
                        value as "dimUp" | "dimDown",
                        {},
                    );
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
            .enum("dimmer_move_to_favorite", ea.SET, ["moveToFavorite1", "moveToFavorite2", "moveToFavorite3"])
            .withDescription("Start dimming to the favorite position 1, 2 or 3")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_move_to_favorite"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    yokisExtendChecks.log(key, value);
                    await entity.command<"manuSpecificYokisDimmer", "moveToFavorite1" | "moveToFavorite2" | "moveToFavorite3", YokisDimmer>(
                        "manuSpecificYokisDimmer",
                        value as "moveToFavorite1" | "moveToFavorite2" | "moveToFavorite3",
                        {},
                    );
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
            .enum("dimmer_start_nightlight_command", ea.SET, ["startNightLightModeCurrent"])
            .withDescription("Trigger Starnight mode from the current diming value")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_start_nightlight_command"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    yokisExtendChecks.log(key, value);
                    await entity.command<"manuSpecificYokisDimmer", "startNightLightModeCurrent", YokisDimmer>(
                        "manuSpecificYokisDimmer",
                        value as "startNightLightModeCurrent",
                        {},
                    );
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
            .composite("dimmer_start_nightlight_custom_command", "dimmer_start_nightlight_custom_prop", ea.SET)
            .withDescription("Start the nightlight mode with the given parameters")
            .withFeature(
                e
                    .numeric("childmode_starting_delay", ea.SET) // ul_ChildModeStartingDelay
                    .withUnit("ms")
                    .withDescription(
                        "Set the starting delay value, used before the start of the nightlight, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms",
                    ),
            )
            .withFeature(
                e
                    .numeric("childmode_brightness_start", ea.SET) // uc_ChildModeBrightnessStart
                    .withUnit("%")
                    .withDescription(
                        "Set the brightness at the beginning of the ramp, otherwise use 0xFF to use the one configured in the product. Value is in %",
                    ),
            )
            .withFeature(
                e
                    .numeric("childmode_brightness_end", ea.SET) // uc_ChildModeBrightnessEnd
                    .withUnit("%")
                    .withDescription(
                        "Set the brightness at the end of the ramp, otherwise use 0xFF to use the one configured in the product. Value is in %",
                    ),
            )
            .withFeature(
                e
                    .numeric("childmode_ramp_duration", ea.SET) // ul_ChildModeRampDuration
                    .withUnit("ms")
                    .withDescription("Set the ramp duration, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms"),
            )
            .withFeature(
                e
                    .numeric("childmode_on_duration", ea.SET) // ul_ChildModeOnDuration
                    .withUnit("ms")
                    .withDescription(
                        "Set the total duration of the nightlight, otherwise use 0xFFFFFFFF to use the one configured in the product. Value is in ms",
                    ),
            )
            .withFeature(
                e
                    .numeric("childmode_step", ea.SET) // uc_ChildStep
                    .withUnit("%")
                    .withDescription(
                        "Set the step size between each dim, otherwise use 0xFF to use the one configured in the product. Value is in %",
                    ),
            )
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_start_nightlight_custom_prop"],
                convertSet: async (entity, key, value, meta) => {
                    const commandWrapper = yokisExtendChecks.parseStartNightLightMode(value);

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command<"manuSpecificYokisDimmer", "startNightLightMode", YokisDimmer>(
                        "manuSpecificYokisDimmer",
                        "startNightLightMode",
                        commandWrapper.payload,
                    );
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    // biome-ignore lint/style/useNamingConvention: The current naming convention is currently matching the Yokis documentation
    pilotwire_setOrder: (): ModernExtend => {
        const exposes = e
            .enum("pilotwire_set_order", ea.SET, Object.keys(pilotwireOrderEnun))
            .withDescription("Set the device in the specified order.")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["pilotwire_set_order"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const commandWrapper = yokisExtendChecks.parsePilotwireOrder(value);

                    yokisExtendChecks.log(key, value, commandWrapper.payload);

                    await entity.command<"manuSpecificYokisPilotWire", "setOrder", YokisPilotWire>(
                        "manuSpecificYokisPilotWire",
                        "setOrder",
                        commandWrapper.payload,
                    );
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            isModernExtend: true,
        };
    },
    // biome-ignore lint/style/useNamingConvention: The current naming convention is currently matching the Yokis documentation
    pilotwire_toggleOrder: (): ModernExtend => {
        const exposes = e
            .enum("pilotwire_toggle_order", ea.SET, ["pilotwire_toggle_order"])
            .withDescription("Toggle between order by respecting the scrolling order")
            .withCategory("config");

        const toZigbee: Tz.Converter[] = [
            {
                key: ["pilotwire_toggle_order"],
                convertSet: async (entity, key, value, meta) => {
                    yokisExtendChecks.log(key, value);
                    await entity.command<"manuSpecificYokisPilotWire", "toggleOrder", YokisPilotWire>(
                        "manuSpecificYokisPilotWire",
                        "toggleOrder",
                        {},
                    );
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

// Yokis specific definition

// Yokis does not support the timer OnOff cluster. It uses a custom cluster instead.
// Dereferencing the `on_time` and `off_wait_time` from the keys of the converter.
const yokisTz = {
    on_off: {
        ...tz.on_off,
        key: ["state"],
    } satisfies Tz.Converter,
};

function YokisOnOff(args?: m.OnOffArgs): ModernExtend {
    const result: ModernExtend = {...m.onOff(args), toZigbee: [yokisTz.on_off]};
    return result;
}

// Custom cluster exposition
const YokisDeviceExtend: ModernExtend[] = [
    // ConfigurationChanged => This attribute is used by Yokis-based controller and probably not very useful at the moment, as we don't know which configuration was changed.
    // Leaving it here for future evaluation
    //
    // numeric({
    //     name: configuration_changed,
    //     cluster: 'manuSpecificYokisDevice',
    //     attribute: 'configurationChanged',
    //     description: `Indicate if the device configuration has changed:
    //     - 0 to 0xFFFE -> No Change
    //     - 0xFFFF -> Change have been detected`,
    //     access: 'STATE_SET',
    //     valueMin: 0,
    //     valueMax: 3600,
    //     reporting: {min: 0, max: repInterval.HOUR, change: 1},
    //     entityCategory: 'config',
    // }),

    yokisCommandsExtend.resetToFactorySettings(),
    yokisCommandsExtend.relaunchBleAdvert(),

    // openNetwork command : very specific case where the Yokis devices can create their own Zigbee network without the need of a coordinator
    // Leaving it here for future evaluation
    //
    // yokisCommandsExtend.openNetwork(),
];

const YokisInputExtend: ModernExtend[] = [
    // InputMode
    m.enumLookup<"manuSpecificYokisInput", YokisInput>({
        name: "input_mode",
        lookup: inputModeEnum,
        cluster: "manuSpecificYokisInput",
        attribute: "inputMode",
        description: "Indicate how the input should be handled",
        entityCategory: "config",
    }),

    // InputMode
    m.enumLookup<"manuSpecificYokisInput", YokisInput>({
        name: "contact_mode",
        lookup: {nc: 0x00, no: 0x01},
        cluster: "manuSpecificYokisInput",
        attribute: "contactMode",
        description: "Indicate the contact nature of the entry",
        entityCategory: "config",
    }),

    // LastLocalCommandState
    m.binary<"manuSpecificYokisInput", YokisInput>({
        name: "last_local_command_state",
        cluster: "manuSpecificYokisInput",
        attribute: "lastLocalCommandState",
        description: "Indicate the last known state of the local BP",
        valueOn: ["PRESSED", 0x01],
        valueOff: ["RELEASED", 0x00],
        access: "STATE_GET",
        entityCategory: "diagnostic",
    }),

    // LastBPConnectState
    m.binary<"manuSpecificYokisInput", YokisInput>({
        name: "last_bp_connect_state",
        cluster: "manuSpecificYokisInput",
        attribute: "lastBPConnectState",
        description: "Indicate the last known state of the Bp connect",
        valueOn: ["PRESSED", 0x01],
        valueOff: ["RELEASED", 0x00],
        access: "STATE_GET",
        entityCategory: "diagnostic",
    }),

    yokisCommandsExtend.sendPress(),
    yokisCommandsExtend.sendRelease(),
    yokisCommandsExtend.selectInputMode(),
];

/* Pending checks for a specific device
const YokisInputExtendWithBacklight: ModernExtend[] = [
    // BacklightIntensity
    numeric({
        name: 'backlight_intensity',
        cluster: 'manuSpecificYokisDevice',
        attribute: 'BacklightIntensity',
        description: 'Indicate the backlight intensity applied on the keys. Only use for “Simon” product',
        valueMin: 0x00,
        valueMax: 0x64,
        entityCategory: 'config',
    }),

    ...YokisInputExtend,
];
*/

const YokisEntryExtend: ModernExtend[] = [
    // eShortPress
    m.binary<"manuSpecificYokisEntryConfigurator", YokisEntryConfigurator>({
        name: "enable_short_press",
        cluster: "manuSpecificYokisEntryConfigurator",
        attribute: "eShortPress",
        description: "Use to enable short press action",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),

    // eLongPress
    m.binary<"manuSpecificYokisEntryConfigurator", YokisEntryConfigurator>({
        name: "enable_long_press",
        cluster: "manuSpecificYokisEntryConfigurator",
        attribute: "eLongPress",
        description: "Use to enable long press action",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),

    // LongPressDuration
    m.numeric<"manuSpecificYokisEntryConfigurator", YokisEntryConfigurator>({
        name: "long_press_duration",
        cluster: "manuSpecificYokisEntryConfigurator",
        attribute: "longPressDuration",
        description: "Define long Press duration in milliseconds",
        valueMin: 0x00,
        valueMax: 0x1388,
        valueStep: 1,
        unit: "ms",
        entityCategory: "config",
    }),

    // TimeBetweenPress
    m.numeric<"manuSpecificYokisEntryConfigurator", YokisEntryConfigurator>({
        name: "time_between_press",
        cluster: "manuSpecificYokisEntryConfigurator",
        attribute: "timeBetweenPress",
        description: "Define the maximum time between 2 press to keep in a sequence (In milliseconds)",
        valueMin: 0x0064,
        valueMax: 0x0258,
        valueStep: 1,
        unit: "ms",
        entityCategory: "config",
    }),

    // eR12MLongPress
    m.binary<"manuSpecificYokisEntryConfigurator", YokisEntryConfigurator>({
        name: "enable_R12M_long_press",
        cluster: "manuSpecificYokisEntryConfigurator",
        attribute: "eR12MLongPress",
        description: "Enable R12M Long Press action",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),

    // eLocalConfigLock
    m.binary<"manuSpecificYokisEntryConfigurator", YokisEntryConfigurator>({
        name: "enable_local_config_lock",
        cluster: "manuSpecificYokisEntryConfigurator",
        attribute: "eLocalConfigLock",
        description: "Disable local configuration",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),
];

const YokisSubSystemExtend: ModernExtend[] = [
    m.enumLookup<"manuSpecificYokisSubSystem", YokisSubSystem>({
        name: "power_failure_mode",
        lookup: {last_state: 0x00, off: 0x01, on: 0x02, blink: 0x03},
        cluster: "manuSpecificYokisSubSystem",
        attribute: "powerFailureMode",
        description: "Define the device behavior after power failure",
        entityCategory: "config",
        // zigbeeCommandOptions: manufacturerOptions,
    }),
];

const yokisLightControlExtend: ModernExtend[] = [
    // OnOff => this is redundant from the GenOnOff state
    // Leaving it here for future evaluation
    //
    // binary({
    //     name: 'on_off',
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
    m.binary<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "prev_state",
        cluster: "manuSpecificYokisLightControl",
        attribute: "prevState",
        description: "Indicate the previous state before action",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        access: "STATE_GET",
        entityCategory: "diagnostic",
    }),

    // onTimer
    // eOnTimer => This attribute has been superseded by just using onTimer (a "0" onTimer will deactivate it)
    // Leaving it here for future evaluation
    //
    // binary({
    //     name: 'e_on_timer',
    //     cluster: 'manuSpecificYokisLightControl',
    //     attribute: 'eOnTimer',
    //     description: 'Enable (0x01) / Disable (0x00) use of onTimer',
    //     valueOn: ['ON', 0x01],
    //     valueOff: ['OFF', 0x00],
    //     entityCategory: 'config',
    // }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "on_timer",
        cluster: "manuSpecificYokisLightControl",
        attribute: "onTimer",
        description: "Define the ON embedded timer duration in seconds. A `0` value will deactivate the timer",
        valueMin: 0,
        valueMax: 3600,
        valueStep: 1,
        unit: "s",
        entityCategory: "config",
    }),

    // preOnDelay
    m.binary<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "enable_pre_on_delay",
        cluster: "manuSpecificYokisLightControl",
        attribute: "ePreOnDelay",
        description: "Enable (`0x01`) / Disable (`0x00`) PreOn delay",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "pre_on_delay",
        cluster: "manuSpecificYokisLightControl",
        attribute: "preOnDelay",
        description: "Define the PreOn embedded delay in seconds",
        valueMin: 0,
        valueMax: 3600,
        valueStep: 1,
        unit: "s",
        entityCategory: "config",
    }),

    // preOffDelay
    m.binary<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "enable_pre_off_delay",
        cluster: "manuSpecificYokisLightControl",
        attribute: "ePreOffDelay",
        description: "Enable (`0x01`) / Disable (`0x00`) PreOff delay",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "pre_off_delay",
        cluster: "manuSpecificYokisLightControl",
        attribute: "preOffDelay",
        description: "Define the PreOff embedded delay in seconds",
        valueMin: 0,
        valueMax: 3600,
        valueStep: 1,
        unit: "s",
        entityCategory: "config",
    }),

    // Pulseduration
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "pulse_duration",
        cluster: "manuSpecificYokisLightControl",
        attribute: "pulseDuration",
        description: "Set the value of ON pulse length",
        valueMin: 0x0014,
        valueMax: 0xfffe,
        valueStep: 1,
        unit: "ms",
        entityCategory: "config",
    }),

    // TimeType
    m.enumLookup<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "time_type",
        lookup: {seconds: 0x00, minutes: 0x01},
        cluster: "manuSpecificYokisLightControl",
        attribute: "timeType",
        description: `Indicates the current Type of time selected that will be used during push button configuration:
        - 0x00 -> Seconds
        - 0x01 -> Minutes`,
        entityCategory: "config",
    }),

    // LongOnDuration
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "long_on_duration",
        cluster: "manuSpecificYokisLightControl",
        attribute: "longOnDuration",
        description: "Set the value of the LONG ON embedded timer in seconds",
        valueMin: 0x00,
        valueMax: 0x00409980,
        valueStep: 1,
        unit: "s",
        entityCategory: "config",
    }),

    // OperatingMode
    m.enumLookup<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "operating_mode",
        lookup: {timer: 0x00, staircase: 0x01, pulse: 0x02},
        cluster: "manuSpecificYokisLightControl",
        attribute: "operatingMode",
        description: "Indicates the operating mode",
        entityCategory: "config",
    }),

    // stopAnnounce
    m.binary<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "enable_stop_announce",
        cluster: "manuSpecificYokisLightControl",
        attribute: "eStopAnnounce",
        description: "Enable (`0x01`) / Disable (`0x00`) the announcement before turning OFF",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "stop_announce_time",
        cluster: "manuSpecificYokisLightControl",
        attribute: "stopAnnounceTime",
        description: "Time before goes off after the stop announce blinking. (In seconds)",
        valueMin: 0x00,
        valueMax: 0x00409980,
        valueStep: 1,
        unit: "s",
        entityCategory: "config",
    }),

    // eDeaf
    m.binary<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "enable_deaf",
        cluster: "manuSpecificYokisLightControl",
        attribute: "eDeaf",
        description: "Enable (`0x01`) / Disable (`0x00`) Deaf Actions",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "deaf_blink_amount",
        cluster: "manuSpecificYokisLightControl",
        attribute: "deafBlinkAmount",
        description: "Define number of blink to do when receiving the DEAF action. One blink is considered as one ON step followed by one OFF step",
        valueMin: 0x00,
        valueMax: 0x14,
        valueStep: 1,
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "deaf_blink_time",
        cluster: "manuSpecificYokisLightControl",
        attribute: "deafBlinkTime",
        description: "Define duration of a blink ON (In millisecond)",
        valueMin: 0x0064,
        valueMax: 0x4e20,
        valueStep: 1,
        entityCategory: "config",
    }),

    // Blink
    m.binary<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "enable_blink",
        cluster: "manuSpecificYokisLightControl",
        attribute: "eBlink",
        description: "Enable (`0x01`) / Disable (`0x00`) Blink  Actions",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "blink_amount",
        cluster: "manuSpecificYokisLightControl",
        attribute: "blinkAmount",
        description: "Number of blinks done when receiving the corresponding order. One blink is considered as one ON step followed by one OFF step",
        valueMin: 0x00,
        valueMax: 0x14,
        valueStep: 1,
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "blink_on_time",
        cluster: "manuSpecificYokisLightControl",
        attribute: "blinkOnTime",
        description: "Duration for the ON time on a blink period (In millisecond)",
        valueMin: 0x00,
        valueMax: 0x00409980,
        valueStep: 1,
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "blink_off_time",
        cluster: "manuSpecificYokisLightControl",
        attribute: "blinkOffTime",
        description: "Duration for the OFF time on a blink period (In millisecond)",
        valueMin: 0x00,
        valueMax: 0x00409980,
        valueStep: 1,
        entityCategory: "config",
    }),

    // StateAfterBlink
    m.enumLookup<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "state_after_blink",
        lookup: stateAfterBlinkEnum,
        cluster: "manuSpecificYokisLightControl",
        attribute: "stateAfterBlink",
        description: "Indicate which state must be apply after a blink sequence",
        entityCategory: "config",
    }),

    // eNcCommand
    m.binary<"manuSpecificYokisLightControl", YokisLightControl>({
        name: "enable_nc_command",
        cluster: "manuSpecificYokisLightControl",
        attribute: "eNcCommand",
        description: "Define the output relay as Normally close",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),

    yokisCommandsExtend.moveToPosition(),
    yokisCommandsExtend.pulse(),
    yokisCommandsExtend.blink(),
    yokisCommandsExtend.deafBlink(),
    yokisCommandsExtend.longOnCommand(),
];

const YokisDimmerExtend: ModernExtend[] = [
    // currentPosition
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "current_position",
        cluster: "manuSpecificYokisDimmer",
        attribute: "currentPosition",
        description: "This attribute defines the current position, in %",
        access: "STATE_GET",
        entityCategory: "diagnostic",
    }),

    // memoryPosition
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "memory_position",
        cluster: "manuSpecificYokisDimmer",
        attribute: "memoryPosition",
        description: "This attribute defines the memory position, in %",
        access: "STATE_GET",
        entityCategory: "diagnostic",
    }),

    // RampUp
    m.binary<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "enable_ramp_up",
        cluster: "manuSpecificYokisDimmer",
        attribute: "eRampUp",
        description: "This attribute defines if a ramp up should be used or not",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "ramp_up",
        cluster: "manuSpecificYokisDimmer",
        attribute: "rampUp",
        description: "This attribute defines the time taken during the ramp up in ms",
        valueMin: 0x00000000,
        valueMax: 0x05265c00,
        valueStep: 1000,
        entityCategory: "config",
    }),

    // RampDown
    m.binary<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "enable_ramp_down",
        cluster: "manuSpecificYokisDimmer",
        attribute: "eRampDown",
        description: "This attribute defines if a ramp down should be used or not",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "ramp_down",
        cluster: "manuSpecificYokisDimmer",
        attribute: "rampDown",
        description: "This attribute defines the time taken during the ramp down in ms",
        valueMin: 0x00000000,
        valueMax: 0x05265c00,
        valueStep: 1000,
        entityCategory: "config",
    }),

    // rampContinuousTime
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "ramp_continuous_time",
        cluster: "manuSpecificYokisDimmer",
        attribute: "rampContinuousTime",
        description: "This attribute defines the time taken during the ramp loop in ms",
        valueMin: 0x00000000,
        valueMax: 0x05265c00,
        valueStep: 1000,
        entityCategory: "config",
    }),

    // stepUp
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "step_up",
        cluster: "manuSpecificYokisDimmer",
        attribute: "stepUp",
        description: "This attribute defines the value of each step during a dimming up. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // lowDimLimit
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "low_dim_limit",
        cluster: "manuSpecificYokisDimmer",
        attribute: "lowDimLimit",
        description:
            "This attribute defines the value of the low dim limit, used during a dimming loop, on a long press for example. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // highDimLimit
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "high_dim_limit",
        cluster: "manuSpecificYokisDimmer",
        attribute: "highDimLimit",
        description:
            "This attribute defines the value of the high dim limit, used during a dimming loop, on a long press for example. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // nightLightStartingDelay
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "nightlight_starting_delay",
        cluster: "manuSpecificYokisDimmer",
        attribute: "nightLightStartingDelay",
        description: "This attribute defines the time before the nightlight begin. This value is set in seconds",
        valueMin: 0x00000000,
        valueMax: 0xfffffffe,
        valueStep: 10,
        entityCategory: "config",
    }),

    // nightLightStartingBrightness
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "nightlight_starting_brightness",
        cluster: "manuSpecificYokisDimmer",
        attribute: "nightLightStartingBrightness",
        description: "This attribute defines the dimming value at the start of the nightlight. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // nightLightEndingBrightness
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "nightlight_ending_brightness",
        cluster: "manuSpecificYokisDimmer",
        attribute: "nightLightEndingBrightness",
        description:
            "This attribute defines the dimming value at the last step of the nightlight. This attribute must be lower than 0x000D : Nightlight starting brightness. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // nightLightRampTime
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "nightlight_ramp_time",
        cluster: "manuSpecificYokisDimmer",
        attribute: "nightLightRampTime",
        description:
            "This attribute defines the ramp duration of the nightlight. The ramp is running after the end of the starting delay and until the ending bright is reached. This value is set in seconds",
        valueMin: 0x00000000,
        valueMax: 0x05265c00,
        valueStep: 10,
        entityCategory: "config",
    }),

    // nightLightOnTime
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "nightlight_on_time",
        cluster: "manuSpecificYokisDimmer",
        attribute: "nightLightOnTime",
        description:
            "This attribute defines the total duration of the nightlight. It must not be lower than 0x000F : Nightlight ramp time. This value is set in seconds",
        valueMin: 0x00000000,
        valueMax: 0x00409980,
        valueStep: 10,
        entityCategory: "config",
    }),

    // favoritePosition1
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "favorite_position_1",
        cluster: "manuSpecificYokisDimmer",
        attribute: "favoritePosition1",
        description: "This attribute defines the value of the favorite position 1. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // favoritePosition2
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "favorite_position_2",
        cluster: "manuSpecificYokisDimmer",
        attribute: "favoritePosition2",
        description: "This attribute defines the value of the favorite position 2. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // favoritePosition3
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "favorite_position_3",
        cluster: "manuSpecificYokisDimmer",
        attribute: "favoritePosition3",
        description: "This attribute defines the value of the favorite position 3. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // stepControllerMode
    m.binary<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "step_controller_mode",
        cluster: "manuSpecificYokisDimmer",
        attribute: "stepControllerMode",
        description:
            "This attribute enables or disables the 2-step controller mode. This mode enable product to run without any ramp before and after ON or OFF. It acts like a relay",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),

    // memoryPositionMode
    m.binary<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "memory_position_mode",
        cluster: "manuSpecificYokisDimmer",
        attribute: "memoryPositionMode",
        description: "This attribute enables or disables the memory position mode at first push button release",
        valueOn: ["ON", 0x01],
        valueOff: ["OFF", 0x00],
        entityCategory: "config",
    }),

    // stepDown
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "step_down",
        cluster: "manuSpecificYokisDimmer",
        attribute: "stepDown",
        description: "This attribute defines the value of each step during a dimming down. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // stepContinuous
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "step_continuous",
        cluster: "manuSpecificYokisDimmer",
        attribute: "stepContinuous",
        description: "This attribute defines the value of each step during a dimming loop. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
    }),

    // stepNightLigth
    m.numeric<"manuSpecificYokisDimmer", YokisDimmer>({
        name: "step_nightlight",
        cluster: "manuSpecificYokisDimmer",
        attribute: "stepNightLight",
        description: "This attribute defines the value of each step during the ramp down of the nightlight mode. This value is set in %",
        valueMin: 0x00,
        valueMax: 0x64,
        valueStep: 1,
        entityCategory: "config",
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

/* Pending checks for a specific device
const YokisChannelExtend: ModernExtend[] = [
    // On/Off cluster mode
    enumLookup({
        name: 'on_off_cluster_mode',
        lookup: {toggle: 0x00, on: 0x01, off: 0x02, off2: 0x03},
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
        name: 'level_control_cluster_mode',
        lookup: {nothing: 0x00, move_up: 0x01, move_down: 0x02, stop: 0x03},
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
        name: 'window_covering_cluster_mode',
        lookup: {toggle: 0x00, up_open: 0x01, down_close: 0x02, stop: 0x03},
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
        name: 'cluster_to_be_used',
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
        name: 'sending_mode',
        lookup: {direct: 0x00, broadcast: 0x01, group: 0x02},
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
        name: 'yokis_light_control_mode',
        lookup: {pulse: 0x00, deaf: 0x01},
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
        name: 'yokis_pilot_wire_cluster_mode',
        lookup: {toggle: 0x00, confort: 0x01, eco: 0x02},
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
        name: 'group_id',
        cluster: 'manuSpecificYokisChannel',
        attribute: 'groupId',
        description: `Indicate the group id who will receive the command from the dedicated endpoint. Only used when the sending mode is set to “GROUP” (0x02)`,
        entityCategory: 'config',
    }),
];
*/

// biome-ignore lint/correctness/noUnusedVariables: Placeholder for potential futur implementation
const YokisLoadManagerExtend: ModernExtend[] = [
    // Not implemented (probably never will)
];

const YokisPilotWireExtend: ModernExtend[] = [
    // Actual Order
    m.enumLookup<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "actual_order",
        lookup: {
            stop: 0x00,
            frost_off: 0x01,
            eco: 0x02,
            confort_2: 0x03,
            confort_1: 0x04,
            confort: 0x05,
            shortcut_error: 0x06,
            temperature_error: 0x07,
        },
        cluster: "manuSpecificYokisPilotWire",
        attribute: "actualOrder",
        description: "Represent the actual order used by the device",
        access: "STATE_GET",
        reporting: {min: repInterval.MINUTE, max: repInterval.HOUR, change: 1},
        entityCategory: "diagnostic",
    }),

    // Order timer
    m.numeric<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "order_timer",
        cluster: "manuSpecificYokisPilotWire",
        attribute: "orderTimer",
        description:
            "Define the “Order” embedded timer duration. This timer is set when the device changes its order (in second). After that duration, the device is set back to its fallback order.",
        valueMin: 0x00000000,
        valueMax: 0xffffffff,
        valueStep: 1,
        // reporting: {min: repInterval.SECONDS_5, max: repInterval.MINUTES_15, change: 1}, // we probably dont need to do a reporting for configuration attribute
        entityCategory: "config",
    }),

    // Pre-Order timer
    m.numeric<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "pre_order_timer",
        cluster: "manuSpecificYokisPilotWire",
        attribute: "preOrderTimer",
        description:
            "Define the duration before an order is set. This timer is used when a new order is asked, it corresponds to the time before this order is applied. The duration is set in second.",
        valueMin: 0x00000000,
        valueMax: 0xffffffff,
        valueStep: 1,
        // reporting: {min: repInterval.SECONDS_5, max: repInterval.MINUTES_15, change: 1}, // we probably dont need to do a reporting for configuration attribute
        entityCategory: "config",
    }),

    // Timer unit
    m.enumLookup<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "timer_unit",
        lookup: {
            second: 0x00,
            minutes: 0x01,
        },
        cluster: "manuSpecificYokisPilotWire",
        attribute: "timerUnit",
        description: "Represent the actual unit used for local command configuration",
        // reporting: {min: repInterval.MINUTE, max: repInterval.HOUR, change: 1}, // we probably dont need to do a reporting for configuration attribute
        entityCategory: "config",
    }),

    // Led mode
    m.enumLookup<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "led_mode",
        lookup: {
            led_on: 0x00,
            led_off: 0x01,
        },
        cluster: "manuSpecificYokisPilotWire",
        attribute: "ledMode",
        description: `Define the product’s LED behavior:
- 0x00 -> LED is always ON and blink during radio activity (default)
- 0x01 -> LED is only OFF during few seconds after a mode transition`,
        // reporting: {min: repInterval.MINUTE, max: repInterval.HOUR, change: 1}, // we probably dont need to do a reporting for configuration attribute
        entityCategory: "config",
    }),

    // Pilot-wire relay mode
    m.enumLookup<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "pilot_wire_relay_mode",
        lookup: {
            relay_on: 0x00,
            relay_off: 0x01,
        },
        cluster: "manuSpecificYokisPilotWire",
        attribute: "pilotWireRelayMode",
        description: `Define if the product must be set into pilot wire relay mode:
- 0x00 -> Relay mode is deactivated (default)
- 0x01 -> Relay mode is activated`,
        // reporting: {min: repInterval.MINUTE, max: repInterval.HOUR, change: 1}, // we probably dont need to do a reporting for configuration attribute
        entityCategory: "config",
    }),

    // Order scrolling mode
    m.enumLookup<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "order_scrolling_mode",
        lookup: {
            forward: 0x00,
            backward: 0x01,
        },
        cluster: "manuSpecificYokisPilotWire",
        attribute: "orderScrollingMode",
        description: `Define the order scrolling sense:
- 0x00 -> Forward : Confort -> Confort – 1 -> Confort – 2 -> Eco -> Hors-Gel -> Arrêt (default)
- 0x01 -> Backward : Arrêt -> Hors-Gel -> Eco -> Confort – 2 -> Confort – 1 -> Confort`,
        // reporting: {min: repInterval.MINUTE, max: repInterval.HOUR, change: 1}, // we probably dont need to do a reporting for configuration attribute
        entityCategory: "config",
    }),

    // Order number supported
    m.enumLookup<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "order_number_supported",
        lookup: {
            four_orders: 0x00,
            six_orders: 0x01,
        },
        cluster: "manuSpecificYokisPilotWire",
        attribute: "orderNumberSupported",
        description: `Define the number of orders supported by the device:
- 0x00 -> 4 orders (Confort, Eco, Hors-Gel, Arrêt)
- 0x01 -> 6 orders (Confort, Confort – 1, Confort – 2, Eco, Hors-Gel, Arrêt) - (default)`,
        // reporting: {min: repInterval.MINUTE, max: repInterval.HOUR, change: 1}, // we probably dont need to do a reporting for configuration attribute
        entityCategory: "config",
    }),

    // Fallback Order
    m.enumLookup<"manuSpecificYokisPilotWire", YokisPilotWire>({
        name: "fallback_order",
        lookup: pilotwireOrderEnun,
        cluster: "manuSpecificYokisPilotWire",
        attribute: "fallbackOrder",
        description: "Represent the fallback order used by the device after the end of an order timer is reached",
        // reporting: {min: repInterval.MINUTE, max: repInterval.HOUR, change: 1}, // we probably dont need to do a reporting for configuration attribute
        entityCategory: "config",
    }),

    yokisCommandsExtend.pilotwire_setOrder(),
    yokisCommandsExtend.pilotwire_toggleOrder(),
];

// biome-ignore lint/correctness/noUnusedVariables: Placeholder for potential futur implementation
const YokisStatsExtend: ModernExtend[] = [
    // Not implemented (probably never will)
];

const YokisTemperatureMeasurementExtend: ModernExtend[] = [
    // currentValue > this is probably redundant with msTemperatureMeasurement
    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "current_value",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "currentValue",
        description: "This attribute represents the last value measured.",
        access: "STATE_GET",
        entityCategory: "diagnostic",
        //endpointNames: ["9"],
        unit: "°C",
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 100,
        // reporting: {min: "10_SECONDS", max: "1_HOUR", change: 100},
    }),

    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "min_measured_value",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "minMeasuredValue",
        description: "Represent the minimal value set since the last power-on/reset.",
        access: "STATE_GET",
        entityCategory: "diagnostic",
        //endpointNames: ["9"],
        unit: "°C",
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 100,
    }),

    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "max_measured_value",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "maxMeasuredValue",
        description: "Represent the maximal value set since the last power-on/reset.",
        access: "STATE_GET",
        entityCategory: "diagnostic",
        //endpointNames: ["9"],
        unit: "°C",
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 100,
    }),

    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "offset",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "offset",
        description: "Represent the offset applicated to the temperature measured.",
        entityCategory: "config",
        //endpointNames: ["9"],
        unit: "°C",
        valueMin: -50.0,
        valueMax: 50.0,
        valueStep: 0.1,
        scale: 10,
    }),

    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "samplingPeriod",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "samplingPeriod",
        description: "Represent the sampling period used to process the temperature measurement.",
        entityCategory: "config",
        //endpointNames: ["9"],
        unit: "s",
        valueMin: 1,
        valueMax: 120,
        valueStep: 1,
    }),

    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "samplingNumber",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "samplingNumber",
        description: "Represents the sampling number to sense per sampling period defined before.",
        entityCategory: "config",
        //endpointNames: ["9"],
        valueMin: 1,
        valueMax: 20,
        valueStep: 1,
    }),

    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "deltaTemp",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "deltaTemp",
        description: "Represents the temperature variation to request a new temperature sending through reports.",
        entityCategory: "config",
        //endpointNames: ["9"],
        unit: "°C",
        valueMin: 0,
        valueMax: 10,
        valueStep: 0.1,
        scale: 10,
    }),

    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "minimalSendingPeriod",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "minimalSendingPeriod",
        description: "Represents the minimal sending period that the device must respect before sending a new value through reporting.",
        entityCategory: "config",
        //endpointNames: ["9"],
        valueMin: 0,
        valueMax: 65535,
        valueStep: 1,
    }),

    m.numeric<"manuSpecificYokisTemperatureMeasurement", YokisTemperatureMeasurement>({
        name: "maximalSendingPeriod",
        cluster: "manuSpecificYokisTemperatureMeasurement",
        attribute: "maximalSendingPeriod",
        description: "Represents the maximal sending period. The device must send a new value through reporting before the end of this period.",
        entityCategory: "config",
        //endpointNames: ["9"],
        valueMin: 0,
        valueMax: 65535,
        valueStep: 1,
    }),
];

// #endregion

export const definitions: DefinitionWithExtend[] = [
    {
        // MTR500E-UP
        zigbeeModel: ["MTR500E-UP"],
        model: "MTR500E-UP",
        vendor: "YOKIS",
        description: "Remote power switch with timer 500W",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisEntryConfigurator", YokisClustersDefinition.manuSpecificYokisEntryConfigurator),
            m.deviceAddCustomCluster("manuSpecificYokisSubSystem", YokisClustersDefinition.manuSpecificYokisSubSystem),
            m.deviceAddCustomCluster("manuSpecificYokisLoadManager", YokisClustersDefinition.manuSpecificYokisLoadManager), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisStats", YokisClustersDefinition.manuSpecificYokisStats), // Pending implementation
            YokisOnOff({powerOnBehavior: false}), // StartupOnOff is not supported
            m.identify(),
            ...YokisSubSystemExtend,
            ...yokisLightControlExtend,
            ...YokisDeviceExtend,
            ...YokisInputExtend,
            ...YokisEntryExtend,
        ],
    },
    {
        // MTR1300E-UP
        zigbeeModel: ["MTR1300E-UP", "MTR1300EB-UP"],
        model: "MTR1300E-UP",
        vendor: "YOKIS",
        description: "Remote power switch with timer 1300W",
        whiteLabel: [
            {
                model: "MTR1300EB-UP",
                vendor: "YOKIS",
                description: "Remote power switch with timer 1300W with screw terminals",
                fingerprint: [{modelID: "MTR1300EB-UP"}],
            },
        ],
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisEntryConfigurator", YokisClustersDefinition.manuSpecificYokisEntryConfigurator),
            m.deviceAddCustomCluster("manuSpecificYokisSubSystem", YokisClustersDefinition.manuSpecificYokisSubSystem),
            m.deviceAddCustomCluster("manuSpecificYokisLoadManager", YokisClustersDefinition.manuSpecificYokisLoadManager), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisStats", YokisClustersDefinition.manuSpecificYokisStats), // Pending implementation
            YokisOnOff({powerOnBehavior: false}), // StartupOnOff is not supported
            m.identify(),
            ...YokisSubSystemExtend,
            ...yokisLightControlExtend,
            ...YokisDeviceExtend,
            ...YokisInputExtend,
            ...YokisEntryExtend,
        ],
    },
    {
        // MTR2000E-UP
        zigbeeModel: ["MTR2000E-UP"],
        model: "MTR2000E-UP",
        vendor: "YOKIS",
        description: "Remote power switch with timer 2000W",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisEntryConfigurator", YokisClustersDefinition.manuSpecificYokisEntryConfigurator),
            m.deviceAddCustomCluster("manuSpecificYokisSubSystem", YokisClustersDefinition.manuSpecificYokisSubSystem),
            m.deviceAddCustomCluster("manuSpecificYokisLoadManager", YokisClustersDefinition.manuSpecificYokisLoadManager), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisStats", YokisClustersDefinition.manuSpecificYokisStats), // Pending implementation
            YokisOnOff({powerOnBehavior: false}), // StartupOnOff is not supported
            m.identify(),
            ...YokisSubSystemExtend,
            ...yokisLightControlExtend,
            ...YokisDeviceExtend,
            ...YokisInputExtend,
            ...YokisEntryExtend,
        ],
    },
    {
        // MTV300E-UP
        zigbeeModel: ["MTV300E-UP"],
        model: "MTV300E-UP",
        vendor: "YOKIS",
        description: "Remote dimmer with timer 300W",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisEntryConfigurator", YokisClustersDefinition.manuSpecificYokisEntryConfigurator),
            m.deviceAddCustomCluster("manuSpecificYokisSubSystem", YokisClustersDefinition.manuSpecificYokisSubSystem),
            m.deviceAddCustomCluster("manuSpecificYokisLoadManager", YokisClustersDefinition.manuSpecificYokisLoadManager), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisStats", YokisClustersDefinition.manuSpecificYokisStats), // Pending implementation
            m.light({
                effect: false, // related to the identify cluster
                configureReporting: true,
                powerOnBehavior: false,
            }), // StartupOnOff is not supported, TODO: review dimmer cluster instead
            m.identify(),
            ...yokisLightControlExtend,
            ...YokisSubSystemExtend,
            ...YokisDimmerExtend,
            ...YokisDeviceExtend,
            ...YokisInputExtend,
            ...YokisEntryExtend,
        ],
    },
    {
        // MVR500E-UP
        zigbeeModel: ["MVR500E-UP"],
        model: "MVR500E-UP",
        vendor: "YOKIS",
        description: "Roller shutter module 500W",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisEntryConfigurator", YokisClustersDefinition.manuSpecificYokisEntryConfigurator),
            m.deviceAddCustomCluster("manuSpecificYokisSubSystem", YokisClustersDefinition.manuSpecificYokisSubSystem),
            m.deviceAddCustomCluster("manuSpecificYokisLoadManager", YokisClustersDefinition.manuSpecificYokisLoadManager), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering),
            m.deviceAddCustomCluster("manuSpecificYokisStats", YokisClustersDefinition.manuSpecificYokisStats), // Pending implementation
            m.identify(),
            m.windowCovering({controls: ["lift"]}),
            m.commandsWindowCovering(),
            ...YokisSubSystemExtend,
            ...YokisWindowCoveringExtend,
            ...YokisDeviceExtend,
            ...YokisInputExtend,
            ...YokisEntryExtend,
        ],
    },
    {
        // E2BP-UP
        zigbeeModel: ["E2BP-UP"],
        model: "E2BP-UP",
        vendor: "YOKIS",
        description: "Flush-mounted independent 2-channel transmitter",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
        ],
    },
    {
        // E2BPA-UP
        zigbeeModel: ["E2BPA-UP"],
        model: "E2BPA-UP",
        vendor: "YOKIS",
        description: "Flush-mounted independent 2-channel transmitter (main powered)",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
        ],
    },
    {
        // E4BP-UP
        zigbeeModel: ["E4BP-UP"],
        model: "E4BP-UP",
        vendor: "YOKIS",
        description: "Flush-mounted independent 4-channel transmitter",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
        ],
    },
    {
        // E4BPX-UP
        zigbeeModel: ["E4BPX-UP"],
        model: "E4BPX-UP",
        vendor: "YOKIS",
        description: "Flush-mounted independent 4-channel transmitter (with antenna)",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
        ],
    },
    {
        // TLC1-UP
        zigbeeModel: ["TLC1-UP"],
        model: "TLC1-UP",
        vendor: "YOKIS",
        description: "Tabletop Design series 1-button remote control",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisTemperatureMeasurement", YokisClustersDefinition.manuSpecificYokisTemperatureMeasurement), // Pending implementation
            //m.deviceEndpoints({endpoints: {"1": 1, "9": 9}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
            // ...YokisPilotWireExtend,
            m.temperature({reporting: {min: "5_MINUTES", max: "1_HOUR", change: 10}}), // Slow update to save some battery
            m.battery({
                percentage: false,
                lowStatus: true,
                percentageReporting: false,
                lowStatusReportingConfig: {min: "1_HOUR", max: "MAX", change: 10},
            }), // Yokis only provides low level status
            ...YokisTemperatureMeasurementExtend,
        ],
    },
    {
        // TLC2-UP
        zigbeeModel: ["TLC2-UP"],
        model: "TLC2-UP",
        vendor: "YOKIS",
        description: "Keyring Design series 2-button remote control",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
            // ...YokisPilotWireExtend,
        ],
    },
    {
        // TLC4-UP
        zigbeeModel: ["TLC4-UP"],
        model: "TLC4-UP",
        vendor: "YOKIS",
        description: "Keyring Design series 4-button remote control",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
        ],
    },
    {
        // TLC8-UP
        zigbeeModel: ["TLC8-UP"],
        model: "TLC8-UP",
        vendor: "YOKIS",
        description: "Keyring Design series 8-button remote control",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
        ],
    },
    {
        // TLM1-UP
        zigbeeModel: ["TLM1-UP", "TLM1T503-UP", "TLM1TNO-UP", "TLM1TDK-UP"],
        model: "TLM1-UP",
        vendor: "YOKIS",
        description: "Wall-mounted 1-button transmitter",
        whiteLabel: [
            {
                model: "TLM1T503-UP",
                vendor: "YOKIS",
                description: "Wall-mounted 1-button transmitter (503 format)",
                fingerprint: [{modelID: "TLM1T503-UP"}],
            },
            {
                model: "TLM1TNO-UP",
                vendor: "YOKIS",
                description: "Wall-mounted 1-button transmitter (NO format)",
                fingerprint: [{modelID: "TLM1TNO-UP"}],
            },
            {
                model: "TLM1TDK-UP",
                vendor: "YOKIS",
                description: "Wall-mounted 1-button transmitter (DK format)",
                fingerprint: [{modelID: "TLM1TDK-UP"}],
            },
        ],
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire),
            m.deviceAddCustomCluster("manuSpecificYokisTemperatureMeasurement", YokisClustersDefinition.manuSpecificYokisTemperatureMeasurement),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
            // ...YokisPilotWireExtend,
            m.temperature({reporting: {min: "5_MINUTES", max: "1_HOUR", change: 10}}), // Slow update to save some battery
            m.battery({
                percentage: false,
                lowStatus: true,
                percentageReporting: false,
                lowStatusReportingConfig: {min: "1_HOUR", max: "MAX", change: 10},
            }), // Yokis only provides low level status
            ...YokisTemperatureMeasurementExtend,
        ],
    },
    {
        // TLM2-UP
        zigbeeModel: ["TLM2-UP", "TLM2T503-UP", "TLM2TNO-UP"],
        model: "TLM2-UP",
        vendor: "YOKIS",
        description: "Wall-mounted 2-button transmitter",
        whiteLabel: [
            {
                model: "TLM2T503-UP",
                vendor: "YOKIS",
                description: "Wall-mounted 2-button transmitter (503 format)",
                fingerprint: [{modelID: "TLM2T503-UP"}],
            },
            {
                model: "TLM2TNO-UP",
                vendor: "YOKIS",
                description: "Wall-mounted 2-button transmitter (NO format)",
                fingerprint: [{modelID: "TLM2TNO-UP"}],
            },
        ],
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisTemperatureMeasurement", YokisClustersDefinition.manuSpecificYokisTemperatureMeasurement), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
            // ...YokisPilotWireExtend,
            m.temperature({reporting: {min: "5_MINUTES", max: "1_HOUR", change: 10}}), // Slow update to save some battery
            m.battery({
                percentage: false,
                lowStatus: true,
                percentageReporting: false,
                lowStatusReportingConfig: {min: "1_HOUR", max: "MAX", change: 10},
            }), // Yokis only provides low level status
            ...YokisTemperatureMeasurementExtend,
        ],
    },
    {
        // TLM4-UP
        zigbeeModel: ["TLM4-UP", "TLM4T503-UP", "TLM4TNO-UP", "TLM4TDK-UP"],
        model: "TLM4-UP",
        vendor: "YOKIS",
        description: "Wall-mounted 4-button transmitter",
        whiteLabel: [
            {
                model: "TLM4T503-UP",
                vendor: "YOKIS",
                description: "Wall-mounted 4-button transmitter (503 format)",
                fingerprint: [{modelID: "TLM4T503-UP"}],
            },
            {
                model: "TLM4TNO-UP",
                vendor: "YOKIS",
                description: "Wall-mounted 4-button transmitter (NO format)",
                fingerprint: [{modelID: "TLM4TNO-UP"}],
            },
            {
                model: "TLM4TDK-UP",
                vendor: "YOKIS",
                description: "Wall-mounted 4-button transmitter (DK format)",
                fingerprint: [{modelID: "TLM4TDK-UP"}],
            },
        ],
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisTemperatureMeasurement", YokisClustersDefinition.manuSpecificYokisTemperatureMeasurement), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
            // ...YokisPilotWireExtend,
            m.temperature({reporting: {min: "5_MINUTES", max: "1_HOUR", change: 10}}), // Slow update to save some battery
            m.battery({
                percentage: false,
                lowStatus: true,
                percentageReporting: false,
                lowStatusReportingConfig: {min: "1_HOUR", max: "MAX", change: 10},
            }), // Yokis only provides low level status
            ...YokisTemperatureMeasurementExtend,
        ],
    },
    {
        // GALET4-UP
        zigbeeModel: ["GALET4-UP"],
        model: "GALET4-UP",
        vendor: "YOKIS",
        description: "4-button remote control",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisLightControl", YokisClustersDefinition.manuSpecificYokisLightControl),
            m.deviceAddCustomCluster("manuSpecificYokisDimmer", YokisClustersDefinition.manuSpecificYokisDimmer),
            m.deviceAddCustomCluster("manuSpecificYokisWindowCovering", YokisClustersDefinition.manuSpecificYokisWindowCovering), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisChannel", YokisClustersDefinition.manuSpecificYokisChannel),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire), // Pending implementation
            m.deviceAddCustomCluster("manuSpecificYokisTemperatureMeasurement", YokisClustersDefinition.manuSpecificYokisTemperatureMeasurement), // Pending implementation
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4}}),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsWindowCovering(),
            // ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisChannelExtend,
            // ...YokisPilotWireExtend,
            m.temperature({reporting: {min: "5_MINUTES", max: "1_HOUR", change: 10}}), // Slow update to save some battery
            m.battery({
                percentage: false,
                lowStatus: true,
                percentageReporting: false,
                lowStatusReportingConfig: {min: "1_HOUR", max: "MAX", change: 10},
            }), // Yokis only provides low level status
            ...YokisTemperatureMeasurementExtend,
        ],
    },
    {
        // MFP-UP
        zigbeeModel: ["MFP-UP"],
        model: "MFP-UP",
        vendor: "YOKIS",
        description: "Remote module for pilot wire heating system",
        extend: [
            m.deviceAddCustomCluster("manuSpecificYokisDevice", YokisClustersDefinition.manuSpecificYokisDevice),
            m.deviceAddCustomCluster("manuSpecificYokisInput", YokisClustersDefinition.manuSpecificYokisInput),
            m.deviceAddCustomCluster("manuSpecificYokisEntryConfigurator", YokisClustersDefinition.manuSpecificYokisEntryConfigurator),
            m.deviceAddCustomCluster("manuSpecificYokisSubSystem", YokisClustersDefinition.manuSpecificYokisSubSystem),
            m.deviceAddCustomCluster("manuSpecificYokisPilotWire", YokisClustersDefinition.manuSpecificYokisPilotWire),
            m.deviceAddCustomCluster("manuSpecificYokisStats", YokisClustersDefinition.manuSpecificYokisStats), // Pending implementation
            m.identify(),
            m.electricityMeter({voltage: false}),
            ...YokisSubSystemExtend,
            ...YokisPilotWireExtend,
            ...YokisDeviceExtend,
            // ...YokisInputExtend,
            // ...YokisEntryExtend,
        ],
    },
];
