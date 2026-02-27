import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import {modernExtend as ewelinkModernExtend} from "../lib/ewelink";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import {
    deviceLocal2000ToUTCSeconds,
    formatUtcSecondsToIsoWithOffset,
    parseIsoOffsetSeconds,
    parseIsoWithOffsetToUtcSeconds,
    parseRawZclCommand,
    utcToDeviceLocal2000Seconds,
    YEAR_2000_IN_UTC,
} from "../lib/sonoff";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Expose, Fz, KeyValue, KeyValueAny, ModernExtend, OnEvent, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const {ewelinkAction, ewelinkBattery} = ewelinkModernExtend;

const NS = "zhc:sonoff";
const manufacturerOptions = {
    manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD,
    disableDefaultResponse: false,
};
const defaultResponseOptions = {disableDefaultResponse: false};
const e = exposes.presets;
const ea = exposes.access;

interface SonoffSnzb02d {
    attributes: {
        comfortTemperatureMax: number;
        comfortTemperatureMin: number;
        comfortHumidityMin: number;
        comfortHumidityMax: number;
        temperatureUnits: number;
        temperatureCalibration: number;
        humidityCalibration: number;
    };
    commands: never;
    commandResponses: never;
}

interface SonoffSnzb02p {
    attributes: {
        temperatureCalibration: number;
        humidityCalibration: number;
    };
    commands: never;
    commandResponses: never;
}

interface SonoffSnzb02ld {
    attributes: {
        temperatureUnits: number;
        temperatureCalibration: number;
    };
    commands: never;
    commandResponses: never;
}

interface SonoffSnzb02wd {
    attributes: {
        temperatureUnits: number;
        temperatureCalibration: number;
        humidityCalibration: number;
    };
    commands: never;
    commandResponses: never;
}

interface SonoffSnzb02dr2 {
    attributes: {
        comfortTemperatureMax: number;
        comfortTemperatureMin: number;
        comfortHumidityMin: number;
        comfortHumidityMax: number;
        temperatureUnits: number;
        temperatureCalibration: number;
        humidityCalibration: number;
    };
    commands: never;
    commandResponses: never;
}

interface SonoffTrvzb {
    attributes: {
        childLock: number;
        tamper: number;
        illumination: number;
        openWindow: number;
        frostProtectionTemperature: number;
        idleSteps: number;
        closingSteps: number;
        valveOpeningLimitVoltage: number;
        valveClosingLimitVoltage: number;
        valveMotorRunningVoltage: number;
        valveOpeningDegree: number;
        valveClosingDegree: number;
        tempAccuracy: number;
        externalTemperatureInput: number;
        temperatureSensorSelect: number;
        temporaryMode: number;
        temporaryModeTime: number;
        temporaryModeTemp: number;
    };
    commands: never;
    commandResponses: never;
}

interface SonoffSnzb01m {
    attributes: {
        keyActionEvent: number;
    };
    commands: never;
    commandResponses: never;
}

interface SonoffSwvzn {
    attributes: {
        childLock: number;
        realTimeIrrigationDuration: number;
        realTimeIrrigationVolume: number;
        valveAbnormalState: number;
        irrigationStartTime: number;
        irrigationEndTime: number;
        dailyIrrigationVolume: number;
        valveWorkState: number;
        rainDelayEndDatetime: number;
        weatherDelayEndDatetime: number[];
        longitude: number;
        latitude: number;
        weatherBasedAdjustment: number[];
        dailyIrrigationDuration: number;
        hourIrrigationVolume: number;
        hourIrrigationDuration: number;
        manualDefaultSettings: number[];
        seasonalWateringAdjustment: number[];
        irrigationScheduleStatus: number[];
        valveAlarmSettings: number[];
    };
    commands: {
        readRecord: {data: number[]};
        irrigationPlanSettings?: {data: number[]};
        irrigationPlanRemove?: {data: number[]};
        rainDelay?: {data: number[]};
    };
    commandResponses: {
        irrigationPlanReport?: {data: number[]};
    };
}

// SWV-ZN/ZF response type
type SonoffSwvHistoryRecord = {
    duration: number | null;
    volume: number | null;
    start: string | Date;
    end: string | Date;
};
// SWV-ZN/ZF request cache
const swvzfReqCache: Record<
    string,
    Record<
        number,
        {
            startDevice: number;
            endDevice: number;
            startUTC: number;
            endUTC: number;
            updatedAt: number;
        }
    >
> = {};
// SWV-ZN/ZF 30-day history multi-package merge
const swvzfRespCache: Record<
    string,
    {
        packets: Record<number, SonoffSwvHistoryRecord[]>;
        updatedAt: number;
    }
> = {};
// SWV-ZN/ZF multi-package merge cache expiration time
const swvzfCacheExpireTime = 5 * 1000; // 5s

const fzLocal = {
    key_action_event: {
        cluster: "customSonoffSnzb01m",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if ("keyActionEvent" in msg.data) {
                const event = utils.getFromLookup(msg.data.keyActionEvent, {1: "single", 2: "double", 3: "long", 4: "triple"});
                return {action: `${event}_button_${msg.endpoint.ID}`};
            }
        },
    } satisfies Fz.Converter<"customSonoffSnzb01m", SonoffSnzb01m, ["attributeReport", "readResponse"]>,
    router_config: {
        cluster: "genLevelCtrl",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.currentLevel !== undefined) {
                result.light_indicator_level = msg.data.currentLevel;
            }
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]>,
    on_off_clear_electricity: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        options: [exposes.options.state_action()],
        convert: (model, msg, publish, options, meta) => {
            // Device keeps reporting a acCurrentPowerValue after turning OFF.
            // Make sure power = 0 when turned OFF
            // https://github.com/Koenkk/zigbee2mqtt/issues/28470
            let result = fz.on_off.convert(model, msg, publish, options, meta);
            if (msg.data.onOff === 0) {
                result = {...result, power: 0, current: 0};
            }
            return result;
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    on_off_fixed_on_time: {
        ...tz.on_off,
        convertSet: async (entity, key, value, meta) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/27980
            const localMeta = meta;
            if (localMeta.message.on_time != null) {
                utils.assertNumber(localMeta.message.on_time, "on_time");
                localMeta.message = {...localMeta.message, on_time: localMeta.message.on_time / 10};
            }
            return await tz.on_off.convertSet(entity, key, value, localMeta);
        },
    } satisfies Tz.Converter,
};

type ExternalSwitchTypeCfgAgs = {
    endpointNames?: string[];
};
type ExternalInchingAgs = {
    endpointNames?: string[];
};

export interface SonoffEwelink {
    attributes: {
        networkLed: number;
        backLight: number;
        faultCode: number;
        radioPower: number;
        radioPowerWithManuCode: number;
        delayedPowerOnState: number;
        delayedPowerOnTime: number;
        externalTriggerMode: number;
        detachRelayMode: number;
        deviceWorkMode: number;
        detachRelayMode2: number;
        motorTravelCalibrationAction: number;
        lackWaterCloseValveTimeout: number;
        motorTravelCalibrationStatus: number;
        motorRunStatus: number;
        acCurrentCurrentValue: number;
        acCurrentVoltageValue: number;
        acCurrentPowerValue: number;
        // biome-ignore lint/style/useNamingConvention: TODO
        outlet_control_protect: number;
        energyToday: number;
        energyMonth: number;
        energyYesterday: number;
        setCalibrationAction: number[];
        calibrationStatus: number;
        calibrationProgress: number;
        minBrightnessThreshold: number;
        transitionTime: number;
        dimmingLightRate: number;
        programmableStepperSequence: number[];
    };
    commands: {
        protocolData: {data: number[]};
    };
    commandResponses: never;
}

const sonoffExtend = {
    addCustomClusterEwelink: () => {
        return m.deviceAddCustomCluster("customClusterEwelink", {
            ID: 0xfc11,
            attributes: {
                networkLed: {ID: 0x0001, type: Zcl.DataType.BOOLEAN, write: true},
                backLight: {ID: 0x0002, type: Zcl.DataType.BOOLEAN, write: true},
                faultCode: {ID: 0x0010, type: Zcl.DataType.INT32, write: true, min: -2147483648},
                radioPower: {ID: 0x0012, type: Zcl.DataType.INT16, write: true, min: -32768},
                radioPowerWithManuCode: {
                    ID: 0x0012,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD,

                    write: true,
                    min: -32768,
                },
                delayedPowerOnState: {ID: 0x0014, type: Zcl.DataType.BOOLEAN, write: true},
                delayedPowerOnTime: {ID: 0x0015, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                externalTriggerMode: {ID: 0x0016, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                detachRelayMode: {ID: 0x0017, type: Zcl.DataType.BOOLEAN, write: true},
                deviceWorkMode: {ID: 0x0018, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                detachRelayMode2: {ID: 0x0019, type: Zcl.DataType.BITMAP8, write: true},
                motorTravelCalibrationAction: {ID: 0x5001, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                lackWaterCloseValveTimeout: {ID: 0x5011, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                motorTravelCalibrationStatus: {ID: 0x5012, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                motorRunStatus: {ID: 0x5013, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                acCurrentCurrentValue: {ID: 0x7004, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                acCurrentVoltageValue: {ID: 0x7005, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                acCurrentPowerValue: {ID: 0x7006, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                outlet_control_protect: {ID: 0x7007, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                energyToday: {ID: 0x7009, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                energyMonth: {ID: 0x700a, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                energyYesterday: {ID: 0x700b, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                setCalibrationAction: {ID: 0x001d, type: Zcl.DataType.CHAR_STR, write: true},
                calibrationStatus: {ID: 0x001e, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                calibrationProgress: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                minBrightnessThreshold: {ID: 0x4001, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                dimmingLightRate: {ID: 0x4003, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                transitionTime: {ID: 0x001f, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                programmableStepperSequence: {ID: 0x0022, type: Zcl.DataType.ARRAY, write: true},
            },
            commands: {
                protocolData: {ID: 0x01, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
            },
            commandsResponse: {},
        });
    },
    programmableStepperSequence(sequences: string[]): ModernExtend {
        const stepComposite = (n: number) => {
            return e
                .composite(`step_${n}`, `step_${n}`, ea.ALL)
                .withFeature(e.binary("enable_step", ea.ALL, true, false).withDescription("Enable/disable this step."))
                .withFeature(e.binary("relay_outlet_1", ea.ALL, true, false).withDescription("Outlet 1 relay state."))
                .withFeature(e.binary("relay_outlet_2", ea.ALL, true, false).withDescription("Outlet 2 relay state."));
        };

        const exposes = sequences.map((seq) => {
            return e
                .composite(`programmable_stepper_seq${seq}`, `programmable_stepper_seq${seq}`, ea.ALL)
                .withDescription(`Configure programmable stepper sequence ${seq}.`)
                .withFeature(e.binary("enable_stepper", ea.ALL, true, false).withDescription("Enable/disable the stepper sequence."))
                .withFeature(
                    e
                        .numeric("switch_outlet", ea.ALL)
                        .withValueMin(1)
                        .withValueMax(2)
                        .withValueStep(1)
                        .withDescription("The outlet channel of the external trigger switch bound to this sequence."),
                )
                .withFeature(e.binary("enable_double_press", ea.ALL, true, false).withDescription("Enable/disable double press to switch steps."))
                .withFeature(
                    e
                        .numeric("double_press_interval", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(32767)
                        .withValueStep(1)
                        .withUnit("ms")
                        .withDescription("Set the double press interval for step switching."),
                )
                .withFeature(stepComposite(1))
                .withFeature(stepComposite(2))
                .withFeature(stepComposite(3))
                .withFeature(stepComposite(4));
        });

        const toZigbee: Tz.Converter[] = [
            {
                key: [...sequences.map((seq) => `programmable_stepper_seq${seq}`)],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertObject(value, key);

                    const array: Uint8Array = new Uint8Array(11);

                    // ZCL Array
                    array[0] = 0x01;
                    array[1] = 9;
                    array[2] = 1;

                    // Sequence configs
                    const seqStr = key.replace("programmable_stepper_seq", "");
                    const seqIndex = Number.parseInt(seqStr as string, 10) - 1;

                    array[3] = (value.enable_stepper ? 0x80 : 0x00) | (seqIndex & 0x7f);
                    array[4] = (value.switch_outlet - 1) & 0xff;
                    array[5] = (value.enable_double_press ? 0x80 : 0x00) | ((value.double_press_interval >> 8) & 0x7f);
                    array[6] = value.double_press_interval & 0xff;

                    // Steps
                    for (let i = 0; i < 4; i++) {
                        const step = value[`step_${i + 1}`] ?? {};
                        array[7 + i] = (step.enable_step ? 0x80 : 0x00) | (step.relay_outlet_1 ? 0x01 : 0x00) | (step.relay_outlet_2 ? 0x02 : 0x00);
                    }

                    await entity.write(
                        "customClusterEwelink",
                        {
                            [0x0022]: {
                                value: {
                                    elementType: 0x20,
                                    elements: array,
                                },
                                type: 0x48,
                            },
                        },
                        utils.getOptions(meta.mapped, entity),
                    );

                    return {
                        state: {
                            [key]: value,
                        },
                    };
                },
            },
        ];

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffEwelink, ["attributeReport"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport"],
                convert: (model, msg) => {
                    if (!msg.data?.programmableStepperSequence) {
                        return;
                    }

                    const array = new Uint8Array(msg.data.programmableStepperSequence);
                    if (array[0] !== 0x01) {
                        return;
                    }

                    const seqCount = array[2];
                    const seqDataOffset = 3;
                    const result: KeyValueAny = {};

                    for (let i = 0; i < seqCount; i++) {
                        const offset = seqDataOffset + i * 8;

                        // Steps
                        const steps: KeyValueAny = {};
                        for (let j = 0; j < 4; j++) {
                            const currentBuffer = array[offset + 4 + j];
                            steps[`step_${j + 1}`] = {
                                enable_step: !!(currentBuffer & 0x80),
                                relay_outlet_1: !!(currentBuffer & 0x01),
                                relay_outlet_2: !!(currentBuffer & 0x02),
                            };
                        }

                        // Sequence configs
                        const seqNum = (array[offset] & 0x7f) + 1;
                        result[`programmable_stepper_seq${seqNum}`] = {
                            enable_stepper: !!(array[offset] & 0x80),
                            switch_outlet: array[offset + 1] + 1,
                            enable_double_press: !!(array[offset + 2] & 0x80),
                            double_press_interval: ((array[offset + 2] & 0x7f) << 8) | array[offset + 3],
                            ...steps,
                        };
                    }
                    return result;
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    inchingControlSet: (args: ExternalInchingAgs = {}, maxTime = 3599.5): ModernExtend => {
        const {endpointNames = undefined} = args;
        const clusterName = "customClusterEwelink";
        const commandName = "protocolData";
        const exposes = utils.exposeEndpoints(
            e
                .composite("inching_control_set", "inching_control_set", ea.SET)
                .withDescription(
                    "Device Inching function Settings. The device will automatically turn off (turn on) " +
                        "after each turn on (turn off) for a specified period of time.",
                )
                .withFeature(e.binary("inching_control", ea.SET, "ENABLE", "DISABLE").withDescription("Enable/disable inching function."))
                .withFeature(
                    e
                        .numeric("inching_time", ea.SET)
                        .withDescription("Delay time for executing a inching action.")
                        .withUnit("seconds")
                        .withValueMin(0.5)
                        .withValueMax(maxTime)
                        .withValueStep(0.5),
                )
                .withFeature(
                    e.binary("inching_mode", ea.SET, "ON", "OFF").withDescription("Set inching off or inching on mode.").withValueToggle("ON"),
                ),
            endpointNames,
        );

        const toZigbee: Tz.Converter[] = [
            {
                key: ["inching_control_set"],
                convertSet: async (entity, key, value, meta) => {
                    let inchingControl = "inching_control";
                    let inchingTime = "inching_time";
                    let inchingMode = "inching_mode";

                    if (meta.endpoint_name) {
                        inchingControl = `inching_control_${meta.endpoint_name}`;
                        inchingTime = `inching_time_${meta.endpoint_name}`;
                        inchingMode = `inching_mode_${meta.endpoint_name}`;
                    }

                    const tmpTime = Number(Math.round(Number((value[inchingTime as keyof typeof value] * 2).toFixed(1))).toFixed(1));

                    const payloadValue: number[] = [];
                    payloadValue[0] = 0x01; // Cmd
                    payloadValue[1] = 0x17; // SubCmd
                    payloadValue[2] = 0x07; // Length
                    payloadValue[3] = 0x80; // SeqNum

                    payloadValue[4] = 0x00; // Mode
                    if (value[inchingControl as keyof typeof value] !== "DISABLE") {
                        payloadValue[4] |= 0x80;
                    }
                    if (value[inchingMode as keyof typeof value] !== "OFF") {
                        payloadValue[4] |= 0x01;
                    }

                    if (meta.endpoint_name === "l2") {
                        payloadValue[5] = 0x01; // Channel 2
                    } else {
                        payloadValue[5] = 0x00; // Channel 1
                    }

                    payloadValue[6] = tmpTime & 0xff; // Timeout
                    payloadValue[7] = (tmpTime >> 8) & 0xff;

                    payloadValue[8] = 0x00; // Reserve
                    payloadValue[9] = 0x00;

                    payloadValue[10] = 0x00; // CheckCode
                    for (let i = 0; i < payloadValue[2] + 3; i++) {
                        payloadValue[10] ^= payloadValue[i];
                    }

                    await entity.command<typeof clusterName, typeof commandName, SonoffEwelink>(
                        clusterName,
                        commandName,
                        {data: payloadValue},
                        {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                    );
                    return {state: {[key]: value}};
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee: [],
            toZigbee,
            isModernExtend: true,
        };
    },
    weeklySchedule: (): ModernExtend => {
        const scheduleDescription =
            'The preset heating schedule to use when the system mode is set to "auto" (indicated with ⏲ on the TRV). ' +
            "Up to 6 transitions can be defined per day, where a transition is expressed in the format 'HH:mm/temperature', each " +
            "separated by a space. The first transition for each day must start at 00:00 and the valid temperature range is 4-35°C " +
            "(in 0.5°C steps). The temperature will be set at the time of the first transition until the time of the next transition, " +
            "e.g. '04:00/20 10:00/25' will result in the temperature being set to 20°C at 04:00 until 10:00, when it will change to 25°C.";

        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
        type DayName = (typeof days)[number];

        const exposes = days.map((day) => e.text(`weekly_schedule_${day}`, ea.STATE_SET).withCategory("config").withDescription(scheduleDescription));

        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["commandGetWeeklyScheduleRsp"],
                convert: (model, msg, publish, options, meta) => {
                    const day = Object.entries(constants.thermostatDayOfWeek).find((d) => msg.data.dayofweek & (1 << +d[0]))[1];

                    const transitions = msg.data.transitions
                        // TODO: heatSetpoint is optional, that possibly affects the return
                        .map((t: {heatSetpoint?: number; transitionTime: number}) => {
                            const totalMinutes = t.transitionTime;
                            const hours = totalMinutes / 60;
                            const rHours = Math.floor(hours);
                            const minutes = (hours - rHours) * 60;
                            const rMinutes = Math.round(minutes);
                            const strHours = rHours.toString().padStart(2, "0");
                            const strMinutes = rMinutes.toString().padStart(2, "0");

                            return `${strHours}:${strMinutes}/${t.heatSetpoint / 100}`;
                        })
                        .sort()
                        .join(" ");

                    return {
                        [`weekly_schedule_${day}`]: transitions,
                    };
                },
            } satisfies Fz.Converter<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]>,
        ];

        // Helper function to parse and validate a schedule string
        const parseScheduleString = (scheduleValue: string, dayName: string) => {
            // Transition format: HH:mm/temperature
            const transitionRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])\/(\d+(\.5)?)$/;

            const rawTransitions = scheduleValue.split(" ").sort();

            if (rawTransitions.length > 6) {
                throw new Error(`Invalid schedule for ${dayName}: days must have no more than 6 transitions`);
            }

            const transitions = [];

            for (const transition of rawTransitions) {
                const matches = transition.match(transitionRegex);

                if (!matches) {
                    throw new Error(
                        `Invalid schedule for ${dayName}: transitions must be in format HH:mm/temperature (e.g. 12:00/15.5), found: ${transition}`,
                    );
                }

                const hour = Number.parseInt(matches[1], 10);
                const mins = Number.parseInt(matches[2], 10);
                const temp = Number.parseFloat(matches[3]);

                if (temp < 4 || temp > 35) {
                    throw new Error(`Invalid schedule for ${dayName}: temperature value must be between 4-35 (inclusive), found: ${temp}`);
                }

                transitions.push({
                    transitionTime: hour * 60 + mins,
                    heatSetpoint: Math.round(temp * 100),
                });
            }

            if (transitions[0].transitionTime !== 0) {
                throw new Error(`Invalid schedule for ${dayName}: the first transition of each day should start at 00:00`);
            }

            return {
                numoftrans: rawTransitions.length,
                transitions,
            };
        };

        // Helper function to get day bit from day name
        const getDayBit = (dayName: string): number => {
            const dayKey = utils.getKey(constants.thermostatDayOfWeek, dayName, null);
            if (dayKey === null) {
                throw new Error(`Invalid schedule: invalid day name, found: ${dayName}`);
            }
            return Number(dayKey);
        };

        // Helper function to send setWeeklySchedule command
        const sendScheduleCommand = async (
            entity: Parameters<Tz.Converter["convertSet"]>[0],
            dayofweek: number,
            numoftrans: number,
            transitions: Array<{transitionTime: number; heatSetpoint: number}>,
            meta: Parameters<Tz.Converter["convertSet"]>[3],
        ) => {
            await entity.command(
                "hvacThermostat",
                "setWeeklySchedule",
                {
                    dayofweek,
                    numoftrans,
                    mode: 1 << 0, // heat
                    transitions,
                },
                utils.getOptions(meta.mapped, entity),
            );
        };

        const toZigbee: Tz.Converter[] = [
            // Single/multi day converter with batching support
            {
                key: days.map((day) => `weekly_schedule_${day}`),
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value, key);

                    // Extract all weekly_schedule keys from the message (if message exists)
                    const message = meta.message as Record<string, unknown> | null;
                    const scheduleKeys = message
                        ? Object.keys(message).filter(
                              (k) => k.startsWith("weekly_schedule_") && days.includes(k.replace("weekly_schedule_", "") as DayName),
                          )
                        : [];

                    // For single-key messages or when message is not available, process normally (original behavior)
                    if (scheduleKeys.length <= 1) {
                        const dayName = key.replace("weekly_schedule_", "");
                        const dayBit = getDayBit(dayName);
                        const parsed = parseScheduleString(value, dayName);

                        await sendScheduleCommand(entity, 1 << dayBit, parsed.numoftrans, parsed.transitions, meta);

                        return {state: {[key]: value}};
                    }

                    // Process all schedule keys from the message with batching
                    // Group days by their schedule string to optimize Zigbee commands
                    const scheduleGroups = new Map<string, string[]>();
                    for (const scheduleKey of scheduleKeys) {
                        const dayName = scheduleKey.replace("weekly_schedule_", "");
                        const schedule = message[scheduleKey] as string;
                        utils.assertString(schedule, scheduleKey);

                        const existing = scheduleGroups.get(schedule);
                        if (existing) {
                            existing.push(dayName);
                        } else {
                            scheduleGroups.set(schedule, [dayName]);
                        }
                    }

                    const stateUpdates: Record<string, string> = {};

                    // Send one command per unique schedule, combining days with identical schedules
                    for (const [schedule, daysWithSchedule] of scheduleGroups) {
                        // Parse and validate the schedule (only need to do once per unique schedule)
                        const parsed = parseScheduleString(schedule, daysWithSchedule.join(", "));

                        // Build dayofweek bitmask for all days with this schedule
                        let dayofweek = 0;
                        for (const dayName of daysWithSchedule) {
                            dayofweek |= 1 << getDayBit(dayName);
                            stateUpdates[`weekly_schedule_${dayName}`] = schedule;
                        }

                        await sendScheduleCommand(entity, dayofweek, parsed.numoftrans, parsed.transitions, meta);
                    }

                    return {state: stateUpdates};
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    cyclicTimedIrrigation: (): ModernExtend => {
        const exposes = e
            .composite("cyclic_timed_irrigation", "cyclic_timed_irrigation", ea.ALL)
            .withDescription("Smart water valve cycle timing irrigation")
            .withFeature(e.numeric("current_count", ea.STATE).withDescription("Number of times it has been executed").withUnit("times"))
            .withFeature(
                e
                    .numeric("total_number", ea.STATE_SET)
                    .withDescription("Total times of circulating irrigation")
                    .withUnit("times")
                    .withValueMin(0)
                    .withValueMax(100),
            )
            .withFeature(
                e
                    .numeric("irrigation_duration", ea.STATE_SET)
                    .withDescription("Single irrigation duration")
                    .withUnit("seconds")
                    .withValueMin(0)
                    .withValueMax(86400),
            )
            .withFeature(
                e
                    .numeric("irrigation_interval", ea.STATE_SET)
                    .withDescription("Time interval between two adjacent irrigation")
                    .withUnit("seconds")
                    .withValueMin(0)
                    .withValueMax(86400),
            );
        const fromZigbee = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const attributeKey = 0x5008; // attr
                    if (attributeKey in msg.data) {
                        // logger.debug(` from zigbee 0x5008 cluster ${msg.data[attributeKey]} `, NS);
                        // logger.debug(msg.data[attributeKey]);

                        //logger.debug(`meta.rawData details:`, NS);
                        //logger.debug(`  - Hex: ${msg.meta.rawData.toString('hex')}`, NS);
                        const rawData = msg.meta.rawData;

                        /*eg：raw data: 082b0a0850420a0101000000ef00000064*/
                        /*zcl frame: 082b0a  attrid: 0850  data type :42   data payload:0a0101000000ef00000064*/
                        /*0a:data len 01:currentCount 01:totalNumber 00 00 00 ef:irrigationDurationBuffer 00 00 00 64:irrigationIntervalBuffer*/
                        const dataStartIndex = 7; /*data payload start index*/

                        //logger.debug(`rawData====> ${rawData[0+dataStartIndex]} ${rawData[1+dataStartIndex]} ${rawData[2+dataStartIndex]} ${rawData[3+dataStartIndex]} ${rawData[4+dataStartIndex]} ${rawData[5+dataStartIndex]} `, NS);
                        //logger.debug(`rawData====> ${rawData[6+dataStartIndex]} ${rawData[7+dataStartIndex]} ${rawData[8+dataStartIndex]} ${rawData[9+dataStartIndex]} `, NS);

                        const currentCountBuffer = rawData.readUInt8(0 + dataStartIndex);
                        const totalNumberBuffer = rawData.readUInt8(1 + dataStartIndex);

                        const irrigationDurationBuffer = rawData.readUInt32BE(2 + dataStartIndex);

                        const irrigationIntervalBuffer = rawData.readUInt32BE(6 + dataStartIndex);

                        //logger.debug(`currentCountBuffer ${currentCountBuffer}`, NS);
                        //logger.debug(`totalNumberOfTimesBuffer ${totalNumberBuffer}`, NS);
                        //logger.debug(`irrigationDurationBuffer ${irrigationDurationBuffer}`, NS);
                        //logger.debug(`irrigationIntervalBuffer ${irrigationIntervalBuffer}`, NS);

                        return {
                            cyclic_timed_irrigation: {
                                current_count: currentCountBuffer,
                                total_number: totalNumberBuffer,
                                irrigation_duration: irrigationDurationBuffer,
                                irrigation_interval: irrigationIntervalBuffer,
                            },
                        };
                    }
                },
            } satisfies Fz.Converter<"customClusterEwelink", undefined, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["cyclic_timed_irrigation"],
                convertSet: async (entity, key, value, meta) => {
                    // logger.debug(`to zigbee cyclic_timed_irrigation ${key}`, NS);
                    // const currentCount:string = 'current_count';
                    // logger.debug(`to zigbee cyclic_timed_irrigation ${value[currentCount as keyof typeof value]}`, NS);
                    const totalNumber: string = "total_number";
                    // logger.debug(`to zigbee cyclic_timed_irrigation ${value[totalNumber as keyof typeof value]}`, NS);
                    const irrigationDuration: string = "irrigation_duration";
                    // logger.debug(`to zigbee cyclic_timed_irrigation ${value[irrigationDuration as keyof typeof value]}`, NS);
                    const irrigationInterval: string = "irrigation_interval";
                    // logger.debug(`to zigbee cyclic_timed_irrigation ${value[irrigationInterval as keyof typeof value]}`, NS);

                    // const payloadValue = [];
                    const payloadValue: Uint8Array = new Uint8Array(11);
                    payloadValue[0] = 0x0a;
                    payloadValue[1] = 0x00;
                    payloadValue[2] = value[totalNumber as keyof typeof value] & 0xff;

                    payloadValue[3] = (value[irrigationDuration as keyof typeof value] >> 24) & 0xff;
                    payloadValue[4] = (value[irrigationDuration as keyof typeof value] >> 16) & 0xff;
                    payloadValue[5] = (value[irrigationDuration as keyof typeof value] >> 8) & 0xff;
                    payloadValue[6] = value[irrigationDuration as keyof typeof value] & 0xff;

                    payloadValue[7] = (value[irrigationInterval as keyof typeof value] >> 24) & 0xff;
                    payloadValue[8] = (value[irrigationInterval as keyof typeof value] >> 16) & 0xff;
                    payloadValue[9] = (value[irrigationInterval as keyof typeof value] >> 8) & 0xff;
                    payloadValue[10] = value[irrigationInterval as keyof typeof value] & 0xff;

                    const payload = {[0x5008]: {value: payloadValue, type: 0x42}};
                    await entity.write("customClusterEwelink", payload, defaultResponseOptions);
                    return {state: {[key]: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("customClusterEwelink", [0x5008], defaultResponseOptions);
                },
            },
        ];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    cyclicQuantitativeIrrigation: (): ModernExtend => {
        const exposes = e
            .composite("cyclic_quantitative_irrigation", "cyclic_quantitative_irrigation", ea.ALL)
            .withDescription("Smart water valve circulating quantitative irrigation")
            .withFeature(e.numeric("current_count", ea.STATE).withDescription("Number of times it has been executed").withUnit("times"))
            .withFeature(
                e
                    .numeric("total_number", ea.STATE_SET)
                    .withDescription("Total times of circulating irrigation")
                    .withUnit("times")
                    .withValueMin(0)
                    .withValueMax(100),
            )
            .withFeature(
                e
                    .numeric("irrigation_capacity", ea.STATE_SET)
                    .withDescription("Single irrigation capacity")
                    .withUnit("liter")
                    .withValueMin(0)
                    .withValueMax(6500),
            )
            .withFeature(
                e
                    .numeric("irrigation_interval", ea.STATE_SET)
                    .withDescription("Time interval between two adjacent irrigation")
                    .withUnit("seconds")
                    .withValueMin(0)
                    .withValueMax(86400),
            );
        const fromZigbee = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const attributeKey = 0x5009; // attr
                    if (attributeKey in msg.data) {
                        // logger.debug(` from zigbee 0x5009 cluster ${msg.data[attributeKey]} `, NS);
                        // logger.debug(msg.data[attributeKey]);
                        const rawData = msg.meta.rawData;

                        /*eg：raw data: 082b0a0850420a0101000000ef00000064*/
                        /*zcl frame: 082b0a  attrid: 0850  data type :42   data payload:0a0101000000ef00000064*/
                        /*0a:data len 01:currentCount 01:totalNumber 00 00 00 ef:irrigationCapacityBuffer 00 00 00 64:irrigationIntervalBuffer*/
                        const dataStartIndex = 7; /*data payload start index*/

                        //logger.debug(`rawData====> ${rawData[0+dataStartIndex]} ${rawData[1+dataStartIndex]} ${rawData[2+dataStartIndex]} ${rawData[3+dataStartIndex]} ${rawData[4+dataStartIndex]} ${rawData[5+dataStartIndex]} `, NS);
                        //logger.debug(`rawData====> ${rawData[6+dataStartIndex]} ${rawData[7+dataStartIndex]} ${rawData[8+dataStartIndex]} ${rawData[9+dataStartIndex]} `, NS);
                        const currentCountBuffer = rawData.readUInt8(0 + dataStartIndex);
                        const totalNumberBuffer = rawData.readUInt8(1 + dataStartIndex);

                        const irrigationCapacityBuffer = rawData.readUInt32BE(2 + dataStartIndex);

                        const irrigationIntervalBuffer = rawData.readUInt32BE(6 + dataStartIndex);

                        //logger.debug(`currentCountBuffer ${currentCountBuffer}`, NS);
                        //logger.debug(`totalNumberBuffer ${totalNumberBuffer}`, NS);
                        //logger.debug(`irrigationCapacityBuffer ${irrigationCapacityBuffer}`, NS);
                        //logger.debug(`irrigationIntervalBuffer ${irrigationIntervalBuffer}`, NS);

                        return {
                            cyclic_quantitative_irrigation: {
                                current_count: currentCountBuffer,
                                total_number: totalNumberBuffer,
                                irrigation_capacity: irrigationCapacityBuffer,
                                irrigation_interval: irrigationIntervalBuffer,
                            },
                        };
                    }
                },
            } satisfies Fz.Converter<"customClusterEwelink", undefined, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["cyclic_quantitative_irrigation"],
                convertSet: async (entity, key, value, meta) => {
                    // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${key}`, NS);
                    // const currentCount:string = 'current_count';
                    // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${value[currentCount as keyof typeof value]}`, NS);
                    const totalNumber: string = "total_number";
                    // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${value[totalNumber as keyof typeof value]}`, NS);
                    const irrigationCapacity: string = "irrigation_capacity";
                    // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${value[irrigationCapacity as keyof typeof value]}`, NS);
                    const irrigationInterval: string = "irrigation_interval";
                    // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${value[irrigationInterval as keyof typeof value]}`, NS);

                    const payloadValue: Uint8Array = new Uint8Array(11);
                    payloadValue[0] = 0x0a;
                    payloadValue[1] = 0x00;
                    payloadValue[2] = value[totalNumber as keyof typeof value] & 0xff;

                    payloadValue[3] = (value[irrigationCapacity as keyof typeof value] >> 24) & 0xff;
                    payloadValue[4] = (value[irrigationCapacity as keyof typeof value] >> 16) & 0xff;
                    payloadValue[5] = (value[irrigationCapacity as keyof typeof value] >> 8) & 0xff;
                    payloadValue[6] = value[irrigationCapacity as keyof typeof value] & 0xff;

                    payloadValue[7] = (value[irrigationInterval as keyof typeof value] >> 24) & 0xff;
                    payloadValue[8] = (value[irrigationInterval as keyof typeof value] >> 16) & 0xff;
                    payloadValue[9] = (value[irrigationInterval as keyof typeof value] >> 8) & 0xff;
                    payloadValue[10] = value[irrigationInterval as keyof typeof value] & 0xff;

                    const payload = {[0x5009]: {value: payloadValue, type: 0x42}};
                    await entity.write("customClusterEwelink", payload, defaultResponseOptions);
                    return {state: {[key]: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("customClusterEwelink", [0x5009], defaultResponseOptions);
                },
            },
        ];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    externalSwitchTriggerMode: (args: ExternalSwitchTypeCfgAgs = {}): ModernExtend => {
        const clusterName = "customClusterEwelink" as const;
        const attributeName = "externalTriggerMode" as const;
        const {endpointNames = undefined} = args;
        const description: string =
            "External trigger mode, which can be one of edge, pulse, " +
            "following(off), following(on). The appropriate triggering mode can be selected according to the type of " +
            "external switch to achieve a better use experience.";

        const exposes: Expose[] = utils.exposeEndpoints(
            e
                .enum("external_trigger_mode", ea.ALL, ["edge", "pulse", "following(off)", "following(on)"])
                .withDescription(description)
                .withCategory("config"),
            endpointNames,
        );

        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const lookup: KeyValue = {edge: 0, pulse: 1, "following(off)": 2, "following(on)": 130};
                    // logger.debug(`from zigbee msg.data['externalTriggerMode'] ${msg.data['externalTriggerMode']}`, NS);
                    if (msg.data.externalTriggerMode !== undefined) {
                        let switchType = "edge";
                        for (const name in lookup) {
                            if (lookup[name] === msg.data.externalTriggerMode) {
                                switchType = name;
                                break;
                            }
                        }
                        // logger.debug(`form zigbee switchType ${switchType}`, NS);
                        return {external_trigger_mode: switchType};
                    }
                },
            } satisfies Fz.Converter<typeof clusterName, SonoffEwelink, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["external_trigger_mode"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value, key);
                    value = value.toLowerCase();
                    const lookup = {edge: 0, pulse: 1, "following(off)": 2, "following(on)": 130};
                    const tmpValue = utils.getFromLookup(value, lookup);
                    await entity.write<typeof clusterName, SonoffEwelink>(clusterName, {[attributeName]: tmpValue}, defaultResponseOptions);
                    return {state: {[key]: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, SonoffEwelink>(clusterName, [attributeName], defaultResponseOptions);
                },
            },
        ];
        return {
            exposes: exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    detachRelayModeControl: (relayCount: number): ModernExtend => {
        const clusterName = "customClusterEwelink";
        const attributeName = "detachRelayMode2";
        const exposes = e.composite("detach_relay_mode", "detach_relay_mode", ea.ALL);
        if (1 === relayCount) {
            exposes
                .withDescription(
                    "Relay separation mode. Can be used when the load is a smart device (such as smart light), " +
                        "when we control the wall switch, do not want to turn off the power of the smart light, but through " +
                        "a scene command to control the smart light on or off, then we can enable the relay separation mode.",
                )
                .withFeature(e.binary("detach_relay_outlet1", ea.SET, "ENABLE", "DISABLE").withDescription("Enable/disable detach relay."));
        } else if (2 === relayCount) {
            exposes
                .withDescription(
                    "Relay separation mode. Can be used when the load is a smart device (such as smart light), " +
                        "when we control the wall switch, do not want to turn off the power of the smart light, but through " +
                        "a scene command to control the smart light on or off, then we can enable the relay separation mode.",
                )
                .withFeature(e.binary("detach_relay_outlet1", ea.SET, "ENABLE", "DISABLE").withDescription("Enable/disable detach relay."))
                .withFeature(e.binary("detach_relay_outlet2", ea.SET, "ENABLE", "DISABLE").withDescription("Enable/disable detach relay."));
        } else if (3 === relayCount) {
            exposes
                .withDescription(
                    "Relay separation mode. Can be used when the load is a smart device (such as smart light), " +
                        "when we control the wall switch, do not want to turn off the power of the smart light, but through " +
                        "a scene command to control the smart light on or off, then we can enable the relay separation mode.",
                )
                .withFeature(e.binary("detach_relay_outlet1", ea.SET, "ENABLE", "DISABLE").withDescription("Enable/disable detach relay."))
                .withFeature(e.binary("detach_relay_outlet2", ea.SET, "ENABLE", "DISABLE").withDescription("Enable/disable detach relay."))
                .withFeature(e.binary("detach_relay_outlet3", ea.SET, "ENABLE", "DISABLE").withDescription("Enable/disable detach relay."));
        }

        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.detachRelayMode2 !== undefined) {
                        const detachMode = msg.data.detachRelayMode2;
                        logger.debug(`form zigbee detachRelayMode2 ${detachMode}`, NS);

                        const datachRelayStatus = {
                            detach_relay_outlet1: "DISABLE",
                            detach_relay_outlet2: "DISABLE",
                            detach_relay_outlet3: "DISABLE",
                        };

                        if ((detachMode & 0x01) !== 0) {
                            datachRelayStatus.detach_relay_outlet1 = "ENABLE";
                        }
                        if ((detachMode & 0x02) !== 0) {
                            datachRelayStatus.detach_relay_outlet2 = "ENABLE";
                        }
                        if ((detachMode & 0x04) !== 0) {
                            datachRelayStatus.detach_relay_outlet3 = "ENABLE";
                        }
                        return {detach_relay_mode: datachRelayStatus};
                    }
                },
            } satisfies Fz.Converter<typeof clusterName, SonoffEwelink, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["detach_relay_mode"],
                convertSet: async (entity, key, value, meta) => {
                    // logger.debug(`from zigbee 'key' ${key}`, NS);
                    const detachRelay1 = "detach_relay_outlet1";
                    // logger.debug(`from zigbee detachRelay1: ${value[detachRelay1 as keyof typeof value]}`, NS);
                    const detachRelay2 = "detach_relay_outlet2";
                    // logger.debug(`from zigbee detachRelay2: ${value[detachRelay2 as keyof typeof value]}`, NS);
                    const detachRelay3 = "detach_relay_outlet3";
                    // logger.debug(`from zigbee detachRelay3: ${value[detachRelay3 as keyof typeof value]}`, NS);
                    let detachRelayMask = 0;

                    if (value[detachRelay1 as keyof typeof value] === "ENABLE") {
                        detachRelayMask |= 0x01;
                    } else {
                        detachRelayMask &= ~0x01;
                    }
                    if (value[detachRelay2 as keyof typeof value] === "ENABLE") {
                        detachRelayMask |= 0x02;
                    } else {
                        detachRelayMask &= ~0x02;
                    }
                    if (value[detachRelay3 as keyof typeof value] === "ENABLE") {
                        detachRelayMask |= 0x04;
                    } else {
                        detachRelayMask &= ~0x04;
                    }
                    // logger.info(`from zigbee detachRelayMask: ${detachRelayMask}`, NS);
                    await entity.write<typeof clusterName, SonoffEwelink>(clusterName, {[attributeName]: detachRelayMask}, defaultResponseOptions);
                    return {state: {[key]: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<typeof clusterName, SonoffEwelink>(clusterName, [attributeName], defaultResponseOptions);
                },
            },
        ];
        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    overloadProtection: (powerMaxLimit: number, currentMaxLimit: number): ModernExtend => {
        const exposes = e
            .composite("overload_protection", "overload_protection", ea.ALL)
            .withDescription("Over load protection, max power and max current are required,other is optional")
            .withFeature(
                e
                    .numeric("max_power", ea.SET)
                    .withDescription("max power")
                    .withUnit("W")
                    .withValueMin(0.1)
                    .withValueMax(powerMaxLimit)
                    .withValueStep(0.1),
            )
            .withFeature(
                e.binary("enable_min_power", ea.SET, "ENABLE", "DISABLE").withDescription("Enable/disable lower limit of power overload protection."),
            )
            .withFeature(
                e
                    .numeric("min_power", ea.SET)
                    .withDescription("Lower limit of power overload protection")
                    .withUnit("W")
                    .withValueMin(0.1)
                    .withValueMax(powerMaxLimit)
                    .withValueStep(0.1),
            )
            .withFeature(
                e
                    .binary("enable_max_voltage", ea.SET, "ENABLE", "DISABLE")
                    .withDescription("Enable/disable upper limit of voltage overload protection.."),
            )
            .withFeature(
                e
                    .numeric("max_voltage", ea.SET)
                    .withDescription("Upper limit of voltage overload protection.")
                    .withUnit("V")
                    .withValueMin(165)
                    .withValueMax(277)
                    .withValueStep(1),
            )
            .withFeature(
                e
                    .binary("enable_min_voltage", ea.SET, "ENABLE", "DISABLE")
                    .withDescription("Enable/disable lower limit of voltage overload protection."),
            )
            .withFeature(
                e
                    .numeric("min_voltage", ea.SET)
                    .withDescription("Lower limit of voltage overload protection.")
                    .withUnit("V")
                    .withValueMin(165)
                    .withValueMax(277)
                    .withValueStep(1),
            )
            .withFeature(
                e
                    .numeric("max_current", ea.SET)
                    .withDescription("Upper limit of current overload protection.")
                    .withUnit("A")
                    .withValueMin(0.1)
                    .withValueMax(currentMaxLimit)
                    .withValueStep(0.1),
            )
            .withFeature(
                e
                    .binary("enable_min_current", ea.SET, "ENABLE", "DISABLE")
                    .withDescription("Enable/disable lower limit of current overload protection."),
            )
            .withFeature(
                e
                    .numeric("min_current", ea.SET)
                    .withDescription("Lower limit of current overload protection.")
                    .withUnit("A")
                    .withValueMin(0.1)
                    .withValueMax(currentMaxLimit)
                    .withValueStep(0.1),
            );
        const fromZigbee = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const attributeKey = 0x7003; // attr
                    if (attributeKey in msg.data) {
                        //     "enable_max_voltage": "ENABLE",
                        //     "enable_min_current": "ENABLE",
                        //     "enable_min_power": "ENABLE",
                        //     "enable_min_voltage": "ENABLE",
                        //     "max_current": 23,
                        //     "max_power": 23,
                        //     "max_voltage": 23,
                        //     "min_current": 23,
                        //     "min_power": 23,
                        //     "min_voltage": 23
                        //   }: value:

                        logger.debug("attr_value is:", JSON.stringify(msg.data[attributeKey]));
                        const buffer = Buffer.from(msg.data[attributeKey], "binary");

                        const hexString = buffer.toString("hex").toUpperCase();
                        console.log(`Hex: ${hexString}`);

                        let index = 0;
                        let enableMaxVoltageBuffer = "DISABLE";
                        let enableMinCurrentBuffer = "DISABLE";
                        let enableMinPowerBuffer = "DISABLE";
                        let enableMinVoltageBuffer = "DISABLE";

                        if (buffer[index++] === 3) {
                            enableMinCurrentBuffer = "ENABLE";
                        }

                        const voltage_set_flag = buffer[index++];
                        if (voltage_set_flag & 0x01) {
                            enableMaxVoltageBuffer = "ENABLE";
                        }
                        if (voltage_set_flag & 0x02) {
                            enableMinVoltageBuffer = "ENABLE";
                        }
                        if (buffer[index++] === 3) {
                            enableMinPowerBuffer = "ENABLE";
                        }

                        let minCurrentBuffer = 0;
                        let maxVoltageBuffer = 0;
                        let minVoltageBuffer = 0;
                        let maxPowerBuffer = 0;
                        let minPowerBuffer = 0;

                        let maxCurrentBuffer: number = buffer[index++];
                        maxCurrentBuffer |= buffer[index++] << 8;
                        maxCurrentBuffer |= buffer[index++] << 16;
                        maxCurrentBuffer |= buffer[index++] << 24;

                        maxCurrentBuffer /= 1000;

                        if (enableMinCurrentBuffer === "ENABLE") {
                            minCurrentBuffer = buffer[index++];
                            minCurrentBuffer |= buffer[index++] << 8;
                            minCurrentBuffer |= buffer[index++] << 16;
                            minCurrentBuffer |= buffer[index++] << 24;

                            minCurrentBuffer /= 1000;
                        }

                        if (enableMaxVoltageBuffer === "ENABLE") {
                            for (let i = 0; i < 4; i++) {
                                logger.debug("max voltage is:", JSON.stringify(buffer[index + i]));
                            }
                            logger.debug("index is", JSON.stringify(index));
                            maxVoltageBuffer = buffer[index++];
                            maxVoltageBuffer |= buffer[index++] << 8;
                            maxVoltageBuffer |= buffer[index++] << 16;
                            maxVoltageBuffer |= buffer[index++] << 24;

                            maxVoltageBuffer /= 1000;
                        }

                        if (enableMinVoltageBuffer === "ENABLE") {
                            minVoltageBuffer = buffer[index++];
                            minVoltageBuffer |= buffer[index++] << 8;
                            minVoltageBuffer |= buffer[index++] << 16;
                            minVoltageBuffer |= buffer[index++] << 24;

                            minVoltageBuffer /= 1000;
                        }
                        maxPowerBuffer = buffer[index++];
                        maxPowerBuffer |= buffer[index++] << 8;
                        maxPowerBuffer |= buffer[index++] << 16;
                        maxPowerBuffer |= buffer[index++] << 24;

                        maxPowerBuffer /= 1000;

                        if (enableMinPowerBuffer === "ENABLE") {
                            minPowerBuffer = buffer[index++];
                            minPowerBuffer |= buffer[index++] << 8;
                            minPowerBuffer |= buffer[index++] << 16;
                            minPowerBuffer |= buffer[index++] << 24;

                            minPowerBuffer /= 1000;
                        }

                        return {
                            overload_protection: {
                                enable_max_voltage: enableMaxVoltageBuffer,
                                enable_min_current: enableMinCurrentBuffer,
                                enable_min_power: enableMinPowerBuffer,
                                enable_min_voltage: enableMinPowerBuffer,
                                max_current: maxCurrentBuffer,
                                max_power: maxPowerBuffer,
                                max_voltage: maxVoltageBuffer,
                                min_current: minCurrentBuffer,
                                min_power: minPowerBuffer,
                                min_voltage: minVoltageBuffer,
                            },
                        };
                    }
                },
            } satisfies Fz.Converter<"customClusterEwelink", undefined, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["overload_protection"],
                convertSet: async (entity, key, value, meta) => {
                    const maxC = 1000 * value["max_current" as keyof typeof value];
                    const minC = 1000 * value["min_current" as keyof typeof value];
                    const maxV = 1000 * value["max_voltage" as keyof typeof value];
                    const minV = 1000 * value["min_voltage" as keyof typeof value];
                    const maxP = 1000 * value["max_power" as keyof typeof value];
                    const minP = 1000 * value["min_power" as keyof typeof value];

                    const enMinC = value["enable_min_current" as keyof typeof value];
                    const enMaxV = value["enable_max_voltage" as keyof typeof value];
                    const enMinV = value["enable_min_voltage" as keyof typeof value];
                    const enMinP = value["enable_min_power" as keyof typeof value];

                    const params = {maxC, minC, maxV, minV, maxP, minP, enMinC, enMaxV, enMinV, enMinP};
                    logger.debug("value:", JSON.stringify(params));

                    const payloadValue = [];
                    let index = 0;
                    payloadValue[index++] = 0;
                    payloadValue[index++] = 0x04;
                    payloadValue[index++] = 27;
                    payloadValue[index++] = 1;
                    payloadValue[index++] = 0;
                    payloadValue[index++] = 1;

                    payloadValue[index++] = maxC & 0xff;
                    payloadValue[index++] = (maxC >> 8) & 0xff;
                    payloadValue[index++] = (maxC >> 16) & 0xff;
                    payloadValue[index++] = (maxC >> 24) & 0xff;

                    if (enMinC === "ENABLE") {
                        payloadValue[3] |= 2;

                        payloadValue[index++] = minC & 0xff;
                        payloadValue[index++] = (minC >> 8) & 0xff;
                        payloadValue[index++] = (minC >> 16) & 0xff;
                        payloadValue[index++] = (minC >> 24) & 0xff;
                    }

                    if (enMaxV === "ENABLE") {
                        payloadValue[4] |= 1;

                        payloadValue[index++] = maxV & 0xff;
                        payloadValue[index++] = (maxV >> 8) & 0xff;
                        payloadValue[index++] = (maxV >> 16) & 0xff;
                        payloadValue[index++] = (maxV >> 24) & 0xff;
                    }

                    if (enMinV === "ENABLE") {
                        payloadValue[4] |= 2;

                        payloadValue[index++] = minV & 0xff;
                        payloadValue[index++] = (minV >> 8) & 0xff;
                        payloadValue[index++] = (minV >> 16) & 0xff;
                        payloadValue[index++] = (minV >> 24) & 0xff;
                    }

                    payloadValue[index++] = maxP & 0xff;
                    payloadValue[index++] = (maxP >> 8) & 0xff;
                    payloadValue[index++] = (maxP >> 16) & 0xff;
                    payloadValue[index++] = (maxP >> 24) & 0xff;

                    if (enMinP === "ENABLE") {
                        payloadValue[5] |= 2;

                        payloadValue[index++] = minP & 0xff;
                        payloadValue[index++] = (minP >> 8) & 0xff;
                        payloadValue[index++] = (minP >> 16) & 0xff;
                        payloadValue[index++] = (minP >> 24) & 0xff;
                    }

                    payloadValue[0] = index - 1;
                    payloadValue[2] = payloadValue[0] - 2;

                    if (payloadValue[3] === 3) {
                        if (minC >= maxC) {
                            throw new Error("Invalid input: maximum current must be greater than the minimum current ");
                        }
                    }

                    if (payloadValue[4] === 3) {
                        if (minV >= maxV) {
                            throw new Error("Invalid input: maximum voltage must be greater than the minimum voltage ");
                        }
                    }

                    if (payloadValue[5] === 3) {
                        if (minP >= maxP) {
                            throw new Error("Invalid input: maximum power must be greater than the minimum power ");
                        }
                    }

                    const payload = {[0x7003]: {value: payloadValue, type: 0x42}};
                    await entity.write("customClusterEwelink", payload, defaultResponseOptions);
                    return {state: {[key]: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("customClusterEwelink", [0x7003], defaultResponseOptions);
                },
            },
        ];

        return {
            exposes: [exposes],
            toZigbee,
            fromZigbee,
            isModernExtend: true,
        };
    },
    swvznGenTimeCompatResponse: (): ModernExtend => {
        const onEvent: OnEvent.Handler[] = [
            (event) => {
                if (event.type === "start" && !event.data.device.customReadResponse) {
                    event.data.device.customReadResponse = (frame, endpoint) => {
                        if (!frame.isCluster("genTime")) {
                            return false;
                        }

                        const time = Math.floor(Date.now() / 1000) - YEAR_2000_IN_UTC;
                        const timezone = -new Date().getTimezoneOffset() * 60;
                        const payload = {
                            time,
                            timeZone: timezone,
                            localTime: time + timezone,
                            dstStart: 0,
                            dstEnd: 0,
                            dstShift: timezone,
                        };

                        endpoint.readResponse("genTime", frame.header.transactionSequenceNumber, payload).catch((e) => {
                            logger.warning(`SWV custom time response failed: ${e}`, NS);
                        });
                        return true;
                    };
                }
            },
        ];

        return {
            onEvent,
            isModernExtend: true,
        };
    },
    irrigationStartTime: (): ModernExtend => {
        const expose = e.text("irrigation_start_time", ea.STATE).withDescription("Time when irrigation starts");

        const toZigbee: Tz.Converter[] = [];
        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!msg.data.irrigationStartTime) return;

                    const value = msg.data.irrigationStartTime;
                    utils.assertNumber(value);

                    const time = formatUtcSecondsToIsoWithOffset(deviceLocal2000ToUTCSeconds(value));
                    return {
                        irrigation_start_time: time,
                    };
                },
            },
        ];

        return {
            exposes: [expose],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    irrigationEndTime: (): ModernExtend => {
        const exposes = [e.text("irrigation_end_time", ea.STATE).withDescription("Time when irrigation ends")];

        const toZigbee: Tz.Converter[] = [];
        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!msg.data.irrigationEndTime) return;

                    const value = msg.data.irrigationEndTime;
                    utils.assertNumber(value);

                    const time = formatUtcSecondsToIsoWithOffset(deviceLocal2000ToUTCSeconds(value));
                    return {
                        irrigation_end_time: time,
                    };
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    rainDelayEndDatetime: (): ModernExtend => {
        const exposes = [e.text("rain_delay_end_datetime", ea.STATE).withDescription("User triggered delay end time")];

        const toZigbee: Tz.Converter[] = [];

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.rainDelayEndDatetime === undefined || msg.data.rainDelayEndDatetime === null) return;

                    const value = msg.data.rainDelayEndDatetime;
                    utils.assertNumber(value);

                    // When the set end time is reached, the device will report 0
                    if (value === 0) {
                        return {rain_delay_end_datetime: ""};
                    }

                    // Device seconds since 2000-01-01 UTC -> Unix UTC seconds.
                    const seconds = deviceLocal2000ToUTCSeconds(value);
                    return {
                        rain_delay_end_datetime: formatUtcSecondsToIsoWithOffset(seconds),
                    };
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    weatherDelayEndDatetime: (): ModernExtend => {
        const exposes = [
            e
                .composite("weather_delay_end_datetime", "weather_delay_end_datetime", ea.STATE_GET)
                .withDescription("Weather delay end time and trigger types.")
                .withFeature(e.binary("delay_due_to_rain", ea.STATE, true, false).withDescription("Delay due to rain"))
                .withFeature(e.binary("delay_due_to_humidity", ea.STATE, true, false).withDescription("Delay due to humidity"))
                .withFeature(e.binary("delay_due_to_frost", ea.STATE, true, false).withDescription("Delay due to frost"))
                .withFeature(e.text("delay_end_time", ea.STATE).withDescription("Delay end time.")),
        ];

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!msg.data.weatherDelayEndDatetime) return;

                    const array = new Uint8Array(msg.data.weatherDelayEndDatetime);
                    if (array.length < 5) return;

                    const delayType = array[0];
                    const endTimeSeconds = (array[1] << 24) | (array[2] << 16) | (array[3] << 8) | array[4];
                    const seconds = deviceLocal2000ToUTCSeconds(endTimeSeconds);

                    return {
                        weather_delay_end_datetime: {
                            delay_due_to_rain: !!(delayType & 0b001),
                            delay_due_to_humidity: !!(delayType & 0b010),
                            delay_due_to_frost: !!(delayType & 0b100),
                            delay_end_time: formatUtcSecondsToIsoWithOffset(seconds),
                        },
                    };
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["weather_delay_end_datetime"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<"customClusterEwelink", SonoffSwvzn>("customClusterEwelink", ["weatherDelayEndDatetime"]);
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    valveAbnormalState: (): ModernExtend => {
        const valveAbnormalStates = ["water_shortage", "water_leakage", "frost_protection", "fail_safe"];

        // Generate all combinations (0b0000 to 0b1111)
        const allCombinations: string[] = ["normal"];
        for (let i = 0b0001; i <= 0b1111; i++) {
            const states: string[] = [];
            if (i & 0b0001) states.push("water_shortage");
            if (i & 0b0010) states.push("water_leakage");
            if (i & 0b0100) states.push("frost_protection");
            if (i & 0b1000) states.push("fail_safe");
            allCombinations.push(states.join(","));
        }

        const exposes = [e.enum("valve_abnormal_state", ea.STATE, allCombinations).withDescription("Valve abnormal state")];

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.valveAbnormalState === undefined) return;

                    const value = msg.data.valveAbnormalState;
                    utils.assertNumber(value);

                    if (value === 0b0000) {
                        return {valve_abnormal_state: "normal"};
                    }

                    const states: string[] = [];
                    valveAbnormalStates.forEach((state, index) => {
                        if (value & (1 << index)) {
                            states.push(state);
                        }
                    });

                    return {
                        valve_abnormal_state: states.join(","),
                    };
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee: [],
            isModernExtend: true,
        };
    },
    weatherBasedAdjustment: (): ModernExtend => {
        const exposes = e
            .composite("weather_based_adjustment", "weather_based_adjustment", ea.ALL)
            .withDescription("Weather-based irrigation delay settings")
            .withFeature(e.binary("enable_rain_delay", ea.ALL, true, false).withDescription("Enable rain-based 24h delay"))
            .withFeature(e.binary("enable_humidity_delay", ea.ALL, true, false).withDescription("Enable humidity-based 24h delay"))
            .withFeature(e.binary("enable_frost_delay", ea.ALL, true, false).withDescription("Enable frost-based 24h delay"))
            .withFeature(
                e
                    .numeric("rain_probability_threshold", ea.ALL)
                    .withValueMin(10)
                    .withValueMax(90)
                    .withUnit("%")
                    .withDescription("Rain probability threshold to trigger 24h delay"),
            )
            .withFeature(
                e
                    .numeric("frost_temperature_threshold", ea.ALL)
                    .withValueMin(0)
                    .withValueMax(10)
                    .withUnit("°C")
                    .withDescription("Temperature threshold to trigger 24h delay when below this value"),
            )
            .withFeature(
                e
                    .numeric("humidity_delay_threshold", ea.ALL)
                    .withValueMin(40)
                    .withValueMax(90)
                    .withUnit("%")
                    .withDescription("Humidity threshold to trigger 24h delay when exceeded"),
            );

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!msg.data.weatherBasedAdjustment) return;

                    const array = new Uint8Array(msg.data.weatherBasedAdjustment);
                    if (array.length < 4) {
                        logger.error(`weatherBasedAdjustment invalid length=${array.length}, expected>=4`, NS);
                        return;
                    }
                    const enableBits = array[0];

                    return {
                        weather_based_adjustment: {
                            enable_rain_delay: !!(enableBits & 0b001),
                            enable_humidity_delay: !!(enableBits & 0b100),
                            enable_frost_delay: !!(enableBits & 0b010),
                            rain_probability_threshold: array[1],
                            humidity_delay_threshold: array[3],
                            frost_temperature_threshold: array[2],
                        },
                    };
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["weather_based_adjustment"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertObject(value, key);

                    const parseRequiredIntInRange = (fieldName: string, min: number, max: number): number | undefined => {
                        const parsed = Number(value[fieldName]);
                        if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
                            logger.error(`weather_based_adjustment invalid ${fieldName}, expected integer in range [${min}, ${max}].`, NS);
                            return;
                        }
                        return parsed;
                    };

                    const rainThreshold = parseRequiredIntInRange("rain_probability_threshold", 10, 90);
                    const humidityThreshold = parseRequiredIntInRange("humidity_delay_threshold", 40, 90);
                    const temperatureThreshold = parseRequiredIntInRange("frost_temperature_threshold", 0, 10);
                    if (rainThreshold === undefined || humidityThreshold === undefined || temperatureThreshold === undefined) {
                        return;
                    }

                    const array = new Uint8Array(4);

                    let enableBits = 0;
                    if (value.enable_rain_delay) enableBits |= 0b001;
                    if (value.enable_frost_delay) enableBits |= 0b010;
                    if (value.enable_humidity_delay) enableBits |= 0b100;

                    array[0] = enableBits;
                    array[1] = rainThreshold;
                    array[2] = temperatureThreshold;
                    array[3] = humidityThreshold;

                    await entity.write(
                        "customClusterEwelink",
                        {
                            [0x5018]: {
                                value: {
                                    elementType: 0x20,
                                    elements: array,
                                },
                                type: 0x48,
                            },
                        },
                        utils.getOptions(meta.mapped, entity),
                    );

                    return {
                        state: {
                            [key]: value,
                        },
                    };
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"customClusterEwelink", SonoffSwvzn>("customClusterEwelink", ["weatherBasedAdjustment"]);
                },
            },
        ];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    manualDefaultSettings: (): ModernExtend => {
        const exposes = e
            .composite("manual_default_settings", "manual_default_settings", ea.ALL)
            .withDescription("Single irrigation settings")
            .withFeature(
                e
                    .enum("irrigation_mode", ea.ALL, ["duration", "capacity", "duration_with_interval"])
                    .withDescription("Irrigation mode: duration, capacity, or duration with interval"),
            )
            .withFeature(
                e
                    .numeric("irrigation_total_duration", ea.ALL)
                    .withValueMin(0)
                    .withValueMax(719)
                    .withUnit("min")
                    .withDescription("Total irrigation duration"),
            )
            .withFeature(
                e.numeric("irrigation_duration", ea.ALL).withValueMin(1).withValueMax(60).withUnit("min").withDescription("Irrigation duration"),
            )
            .withFeature(
                e.numeric("interval_duration", ea.ALL).withValueMin(1).withValueMax(60).withUnit("min").withDescription("Irrigation interval"),
            )
            .withFeature(e.enum("irrigation_amount_unit", ea.ALL, ["gallon", "liter"]).withDescription("Capacity unit"))
            .withFeature(e.numeric("irrigation_amount", ea.ALL).withValueMin(0).withValueMax(10000).withDescription("Irrigation volume"))
            .withFeature(
                e.numeric("fail_safe", ea.ALL).withValueMin(0).withValueMax(719).withUnit("min").withDescription("Safety protection timeout"),
            );

        const modeMap: {[key: string]: number} = {
            duration: 0,
            capacity: 1,
            duration_with_interval: 2,
        };
        const modeMapReverse: {[key: number]: string} = {
            0: "duration",
            1: "capacity",
            2: "duration_with_interval",
        };

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!msg.data.manualDefaultSettings) return;

                    const array = new Uint8Array(msg.data.manualDefaultSettings);
                    if (array.length < 12) {
                        logger.error(`manualDefaultSettings invalid length=${array.length}, expected>=12`, NS);
                        return;
                    }
                    const mode = array[0];
                    const totalDuration = (array[1] << 8) | array[2];
                    const irrigationDuration = (array[3] << 8) | array[4];
                    const irrigationInterval = (array[5] << 8) | array[6];
                    const capacityUnit = array[7];
                    const irrigationVolume = (array[8] << 8) | array[9];
                    const safetyTimeoutLimit = (array[10] << 8) | array[11];

                    return {
                        manual_default_settings: {
                            irrigation_mode: modeMapReverse[mode] ?? "duration",
                            irrigation_total_duration: totalDuration,
                            irrigation_duration: irrigationDuration,
                            interval_duration: irrigationInterval,
                            irrigation_amount_unit: capacityUnit === 0 ? "gallon" : "liter",
                            irrigation_amount: irrigationVolume,
                            fail_safe: safetyTimeoutLimit,
                        },
                    };
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["manual_default_settings"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertObject(value, key);

                    if (typeof value.irrigation_mode !== "string" || modeMap[value.irrigation_mode] === undefined) {
                        logger.error(
                            "manual_default_settings invalid irrigation_mode, expected one of: duration, capacity, duration_with_interval.",
                            NS,
                        );
                        return;
                    }
                    if (value.irrigation_amount_unit !== "gallon" && value.irrigation_amount_unit !== "liter") {
                        logger.error("manual_default_settings invalid irrigation_amount_unit, expected one of: gallon, liter.", NS);
                        return;
                    }

                    const parseRequiredIntInRange = (fieldName: string, min: number, max: number): number | undefined => {
                        const parsed = Number(value[fieldName]);
                        if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
                            logger.error(`manual_default_settings invalid ${fieldName}, expected integer in range [${min}, ${max}].`, NS);
                            return;
                        }
                        return parsed;
                    };

                    const totalDuration = parseRequiredIntInRange("irrigation_total_duration", 0, 719);
                    const irrigationDuration = parseRequiredIntInRange("irrigation_duration", 1, 60);
                    const irrigationInterval = parseRequiredIntInRange("interval_duration", 1, 60);
                    const irrigationVolume = parseRequiredIntInRange("irrigation_amount", 0, 10000);
                    const safetyTimeoutLimit = parseRequiredIntInRange("fail_safe", 0, 719);
                    if (
                        totalDuration === undefined ||
                        irrigationDuration === undefined ||
                        irrigationInterval === undefined ||
                        irrigationVolume === undefined ||
                        safetyTimeoutLimit === undefined
                    ) {
                        return;
                    }

                    const mode = modeMap[value.irrigation_mode];
                    const capacityUnit = value.irrigation_amount_unit === "gallon" ? 0 : 1;

                    const array = new Uint8Array(12);
                    array[0] = mode;
                    array[1] = (totalDuration >> 8) & 0xff;
                    array[2] = totalDuration & 0xff;
                    array[3] = (irrigationDuration >> 8) & 0xff;
                    array[4] = irrigationDuration & 0xff;
                    array[5] = (irrigationInterval >> 8) & 0xff;
                    array[6] = irrigationInterval & 0xff;
                    array[7] = capacityUnit;
                    array[8] = (irrigationVolume >> 8) & 0xff;
                    array[9] = irrigationVolume & 0xff;
                    array[10] = (safetyTimeoutLimit >> 8) & 0xff;
                    array[11] = safetyTimeoutLimit & 0xff;

                    await entity.write(
                        "customClusterEwelink",
                        {
                            [0x501d]: {
                                value: {
                                    elementType: 0x20,
                                    elements: array,
                                },
                                type: 0x48,
                            },
                        },
                        utils.getOptions(meta.mapped, entity),
                    );

                    return {
                        state: {
                            [key]: value,
                        },
                    };
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"customClusterEwelink", SonoffSwvzn>("customClusterEwelink", ["manualDefaultSettings"]);
                },
            },
        ];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    seasonalWateringAdjustment: (): ModernExtend => {
        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

        let exposesComposite = e
            .composite("seasonal_watering_adjustment", "seasonal_watering_adjustment", ea.ALL)
            .withDescription("Monthly watering adjustment multiplier (1.0 = 100%, 2.0 = 200%)");

        for (const month of months) {
            exposesComposite = exposesComposite.withFeature(
                e.numeric(month, ea.ALL).withValueMin(0.1).withValueMax(2).withValueStep(0.1).withDescription(`Adjustment multiplier for ${month}`),
            );
        }

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!msg.data.seasonalWateringAdjustment) return;

                    const array = new Uint8Array(msg.data.seasonalWateringAdjustment);
                    if (array.length < 12) {
                        logger.error(`seasonalWateringAdjustment invalid length=${array.length}, expected>=12`, NS);
                        return;
                    }
                    const result: {[key: string]: number} = {};

                    for (let i = 0; i < 12; i++) {
                        result[months[i]] = array[i] / 10;
                    }

                    return {
                        seasonal_watering_adjustment: result,
                    };
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["seasonal_watering_adjustment"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertObject(value, key);

                    const array = new Uint8Array(12);
                    for (let i = 0; i < 12; i++) {
                        const rawMonthValue = Number(value[months[i]]);
                        const monthValue = Number.isFinite(rawMonthValue) ? rawMonthValue : 1;
                        const boundedMonthValue = Math.min(2, Math.max(0.1, monthValue));
                        array[i] = Math.round(boundedMonthValue * 10);
                    }

                    await entity.write(
                        "customClusterEwelink",
                        {
                            [0x501e]: {
                                value: {
                                    elementType: 0x20,
                                    elements: array,
                                },
                                type: 0x48,
                            },
                        },
                        utils.getOptions(meta.mapped, entity),
                    );

                    return {
                        state: {
                            [key]: value,
                        },
                    };
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"customClusterEwelink", SonoffSwvzn>("customClusterEwelink", ["seasonalWateringAdjustment"]);
                },
            },
        ];

        return {
            exposes: [exposesComposite],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    irrigationScheduleStatus: (): ModernExtend => {
        const exposes = e
            .composite("irrigation_schedule_status", "irrigation_schedule_status", ea.STATE_GET)
            .withDescription("Irrigation schedule execution status")
            .withFeature(e.enum("schedule_status", ea.STATE, ["start", "end", "running", "standby"]).withDescription("Schedule status"))
            .withFeature(e.numeric("schedule_index", ea.STATE).withDescription("Schedule index"))
            .withFeature(e.enum("schedule_type", ea.STATE, ["automatic", "manual"]).withDescription("Schedule type"))
            .withFeature(e.enum("irrigation_mode", ea.STATE, ["duration", "capacity", "duration_with_interval"]).withDescription("Irrigation mode"))
            .withFeature(e.text("start_time", ea.STATE).withDescription("Schedule start time in ISO format with timezone"))
            .withFeature(e.text("expected_end_time", ea.STATE).withDescription("Expected end time in ISO format with timezone"))
            .withFeature(e.text("actual_end_time", ea.STATE).withDescription("Actual end time in ISO format with timezone"))
            .withFeature(e.enum("irrigation_amount_unit", ea.STATE, ["gallon", "liter"]).withDescription("Irrigation amount unit"))
            .withFeature(e.numeric("expected_irrigation_amount", ea.STATE).withDescription("Expected irrigation amount"))
            .withFeature(e.numeric("actual_irrigation_amount", ea.STATE).withDescription("Actual irrigation amount"));

        const scheduleStatusMap = {
            start: 0x00,
            end: 0x01,
            running: 0x02,
            standby: 0x03,
        };

        const scheduleStatusMapReverse: {[key: number]: string} = {
            [0x00]: "start",
            [0x01]: "end",
            [0x02]: "running",
            [0x03]: "standby",
        };

        const modeMap: {[key: number]: string} = {
            0: "duration",
            1: "capacity",
            2: "duration_with_interval",
        };

        const scheduleTypeMap: {[key: number]: string} = {
            0: "automatic",
            1: "manual",
        };

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!msg.data.irrigationScheduleStatus) return;

                    const array = new Uint8Array(msg.data.irrigationScheduleStatus);
                    const scheduleStatus = array[0];
                    const scheduleIndex = array[1];
                    const isStartOrStandby = scheduleStatus === scheduleStatusMap.start || scheduleStatus === scheduleStatusMap.standby;
                    const hasScheduleType =
                        (isStartOrStandby ? array.length >= 15 : array.length >= 21) &&
                        (array[2] === 0x00 || array[2] === 0x01) &&
                        modeMap[array[3]] !== undefined;
                    const dataOffset = hasScheduleType ? 1 : 0;
                    const scheduleType = hasScheduleType ? scheduleTypeMap[array[2]] : undefined;
                    const scheduleMode = array[2 + dataOffset];

                    // Start or Standby: 14 bytes
                    if (isStartOrStandby) {
                        const minLength = hasScheduleType ? 15 : 14;
                        if (array.length < minLength) {
                            logger.error(`irrigationScheduleStatus invalid length=${array.length}, expected>=${minLength} for start/standby`, NS);
                            return;
                        }

                        const expectedStartTime =
                            (array[3 + dataOffset] << 24) | (array[4 + dataOffset] << 16) | (array[5 + dataOffset] << 8) | array[6 + dataOffset];
                        const expectedEndTime =
                            (array[7 + dataOffset] << 24) | (array[8 + dataOffset] << 16) | (array[9 + dataOffset] << 8) | array[10 + dataOffset];
                        const expectedStartTimeISO = formatUtcSecondsToIsoWithOffset(deviceLocal2000ToUTCSeconds(expectedStartTime));
                        const expectedEndTimeISO = formatUtcSecondsToIsoWithOffset(deviceLocal2000ToUTCSeconds(expectedEndTime));
                        const volumeUnit = array[11 + dataOffset];
                        const expectedVolume = (array[12 + dataOffset] << 8) | array[13 + dataOffset];

                        return {
                            irrigation_schedule_status: {
                                schedule_status: scheduleStatusMapReverse[scheduleStatus],
                                schedule_index: scheduleIndex,
                                ...(scheduleType ? {schedule_type: scheduleType} : {}),
                                irrigation_mode: modeMap[scheduleMode] ?? "duration",
                                start_time: expectedStartTimeISO,
                                expected_end_time: expectedEndTimeISO,
                                actual_end_time: null,
                                irrigation_amount_unit: volumeUnit === 0 ? "gallon" : "liter",
                                expected_irrigation_amount: expectedVolume,
                                actual_irrigation_amount: null,
                            },
                        };
                    }

                    // End or Running: 20 bytes
                    if (scheduleStatus === scheduleStatusMap.end || scheduleStatus === scheduleStatusMap.running) {
                        const minLength = hasScheduleType ? 21 : 20;
                        if (array.length < minLength) {
                            logger.error(`irrigationScheduleStatus invalid length=${array.length}, expected>=${minLength} for end/running`, NS);
                            return;
                        }

                        const expectedStartTime =
                            (array[3 + dataOffset] << 24) | (array[4 + dataOffset] << 16) | (array[5 + dataOffset] << 8) | array[6 + dataOffset];
                        const expectedEndTime =
                            (array[7 + dataOffset] << 24) | (array[8 + dataOffset] << 16) | (array[9 + dataOffset] << 8) | array[10 + dataOffset];
                        const actualEndTime =
                            (array[11 + dataOffset] << 24) | (array[12 + dataOffset] << 16) | (array[13 + dataOffset] << 8) | array[14 + dataOffset];
                        const expectedStartTimeISO = formatUtcSecondsToIsoWithOffset(deviceLocal2000ToUTCSeconds(expectedStartTime));
                        const expectedEndTimeISO = formatUtcSecondsToIsoWithOffset(deviceLocal2000ToUTCSeconds(expectedEndTime));
                        const actualEndTimeISO = formatUtcSecondsToIsoWithOffset(deviceLocal2000ToUTCSeconds(actualEndTime));
                        const volumeUnit = array[15 + dataOffset];
                        const expectedVolume = (array[16 + dataOffset] << 8) | array[17 + dataOffset];
                        const actualVolume = (array[18 + dataOffset] << 8) | array[19 + dataOffset];

                        return {
                            irrigation_schedule_status: {
                                schedule_status: scheduleStatusMapReverse[scheduleStatus] ?? "end",
                                schedule_index: scheduleIndex,
                                ...(scheduleType ? {schedule_type: scheduleType} : {}),
                                irrigation_mode: modeMap[scheduleMode] ?? "duration",
                                start_time: expectedStartTimeISO,
                                expected_end_time: expectedEndTimeISO,
                                actual_end_time: actualEndTimeISO,
                                irrigation_amount_unit: volumeUnit === 0 ? "gallon" : "liter",
                                expected_irrigation_amount: expectedVolume,
                                actual_irrigation_amount: actualVolume,
                            },
                        };
                    }
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["irrigation_schedule_status"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<"customClusterEwelink", SonoffSwvzn>("customClusterEwelink", ["irrigationScheduleStatus"]);
                },
            },
        ];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    valveAlarmSettings: (): ModernExtend => {
        const exposes = e
            .composite("valve_alarm_settings", "valve_alarm_settings", ea.ALL)
            .withDescription("Valve alarm settings")
            .withFeature(e.binary("enable_alarm_water_shortage", ea.ALL, true, false).withDescription("Water shortage alarm"))
            .withFeature(e.binary("enable_alarm_water_leak", ea.ALL, true, false).withDescription("Water leak alarm"))
            .withFeature(e.binary("enable_frost_protection", ea.ALL, true, false).withDescription("Frost protection"))
            .withFeature(e.binary("enable_water_shortage_auto_close", ea.ALL, true, false).withDescription("Auto close valve on water shortage"))
            .withFeature(e.binary("enable_water_leak_auto_close", ea.ALL, true, false).withDescription("Auto close valve on water leak"))
            .withFeature(
                e
                    .numeric("alarm_water_shortage_duration", ea.ALL)
                    .withValueMin(1)
                    .withValueMax(10)
                    .withUnit("min")
                    .withDescription("Water shortage trigger alarm duration"),
            )
            .withFeature(
                e
                    .numeric("alarm_water_leak_duration", ea.ALL)
                    .withValueMin(1)
                    .withValueMax(3)
                    .withUnit("min")
                    .withDescription("Water leak trigger alarm duration"),
            )
            .withFeature(
                e
                    .numeric("set_frost_temperature", ea.ALL)
                    .withValueMin(0)
                    .withValueMax(10)
                    .withUnit("°C")
                    .withDescription("Frost protection temperature"),
            );

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["attributeReport", "readResponse"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!msg.data.valveAlarmSettings) return;

                    const array = new Uint8Array(msg.data.valveAlarmSettings);
                    if (array.length < 4) {
                        logger.error(`valveAlarmSettings invalid length=${array.length}, expected>=4`, NS);
                        return;
                    }
                    const enableBits = array[0];

                    return {
                        valve_alarm_settings: {
                            enable_alarm_water_shortage: !!(enableBits & 0b00001),
                            enable_alarm_water_leak: !!(enableBits & 0b00010),
                            enable_frost_protection: !!(enableBits & 0b00100),
                            enable_water_shortage_auto_close: !!(enableBits & 0b01000),
                            enable_water_leak_auto_close: !!(enableBits & 0b10000),
                            alarm_water_shortage_duration: array[1],
                            alarm_water_leak_duration: array[2],
                            set_frost_temperature: array[3],
                        },
                    };
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["valve_alarm_settings"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertObject(value, key);

                    let enableBits = 0;
                    if (value.enable_alarm_water_shortage) enableBits |= 0b00001;
                    if (value.enable_alarm_water_leak) enableBits |= 0b00010;
                    if (value.enable_frost_protection) enableBits |= 0b00100;
                    if (value.enable_water_shortage_auto_close) enableBits |= 0b01000;
                    if (value.enable_water_leak_auto_close) enableBits |= 0b10000;

                    const array = new Uint8Array(4);
                    array[0] = enableBits;
                    array[1] = Number(value.alarm_water_shortage_duration) || 0;
                    array[2] = Number(value.alarm_water_leak_duration) || 0;
                    array[3] = Number(value.set_frost_temperature) || 0;

                    await entity.write(
                        "customClusterEwelink",
                        {
                            [0x5020]: {
                                value: {
                                    elementType: 0x20,
                                    elements: array,
                                },
                                type: 0x48,
                            },
                        },
                        utils.getOptions(meta.mapped, entity),
                    );

                    return {
                        state: {
                            [key]: value,
                        },
                    };
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"customClusterEwelink", SonoffSwvzn>("customClusterEwelink", ["valveAlarmSettings"]);
                },
            },
        ];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    readSWVZFRecord: (): ModernExtend => {
        const clusterName = "customClusterEwelink";
        const commandName = "readRecord";
        const exposes = [
            e.text("24_hours_records", ea.STATE),
            e.text("30_days_records", ea.STATE),
            e.text("180_days_records", ea.STATE),
            e
                .composite("read_swvzf_records", "read_swvzf_records", ea.STATE_SET)
                .withDescription("Read irrigation water volume and duration in the past 24 hours, 30 days, and 6 months.")
                .withFeature(e.enum("type", ea.SET, ["24_hours", "30_days", "6_months"]).withDescription("Reading type"))
                .withFeature(e.text("time_start", ea.SET).withDescription("Start time"))
                .withFeature(e.text("time_end", ea.SET).withDescription("End time")),
        ];

        const normalizeUtcEpochSeconds = (input: unknown, label: string): number | undefined => {
            if (typeof input !== "string") {
                logger.error(`read_swvzf_records invalid ${label}: expected ISO 8601 string.`, NS);
                return;
            }
            const seconds = parseIsoWithOffsetToUtcSeconds(input);
            if (seconds === undefined) {
                logger.error(`read_swvzf_records invalid ${label}: expected ISO 8601 datetime with timezone offset (Z or ±HH:mm).`, NS);
                return;
            }
            return seconds;
        };

        const parseHistoryRecords = (
            mode: "24_hours" | "30_days" | "6_months",
            recordData: number[],
            args: {startSec: number; dayOffset?: number},
        ): SonoffSwvHistoryRecord[] => {
            const records: SonoffSwvHistoryRecord[] = [];
            const count = Math.floor(recordData.length / (mode === "24_hours" ? 3 : 5));
            const startSec = args.startSec;
            const dayOffset = args.dayOffset ?? 0;

            if (mode === "24_hours") {
                let startMs = startSec * 1000;
                for (let i = 0; i < count; i++) {
                    const index = i * 3;
                    const volume = (recordData[index] << 8) + recordData[index + 1];
                    const duration = recordData[index + 2];
                    const endMs = startMs + 3600 * 1000;
                    const start = formatUtcSecondsToIsoWithOffset(Math.floor(startMs / 1000));
                    const end = formatUtcSecondsToIsoWithOffset(Math.floor(endMs / 1000));
                    records.push({duration, volume, start, end});
                    startMs = endMs;
                }
                return records;
            }

            if (mode === "30_days") {
                let startMs = (startSec + dayOffset * 86400) * 1000;
                for (let i = 0; i < count; i++) {
                    const index = i * 5;
                    const volume = (recordData[index] << 16) + (recordData[index + 1] << 8) + recordData[index + 2];
                    const duration = (recordData[index + 3] << 8) + recordData[index + 4];
                    const endMs = startMs + 86400 * 1000;
                    const start = formatUtcSecondsToIsoWithOffset(Math.floor(startMs / 1000));
                    const end = formatUtcSecondsToIsoWithOffset(Math.floor(endMs / 1000));
                    records.push({duration, volume, start, end});
                    startMs = endMs;
                }
                return records;
            }

            if (mode === "6_months") {
                let startDate = new Date(startSec * 1000);
                for (let i = 0; i < count; i++) {
                    const index = i * 5;
                    const volume = (recordData[index] << 16) + (recordData[index + 1] << 8) + recordData[index + 2];
                    const duration = (recordData[index + 3] << 8) + recordData[index + 4];
                    const endDate = new Date(startDate);
                    endDate.setMonth(endDate.getMonth() + 1);
                    const start = formatUtcSecondsToIsoWithOffset(Math.floor(startDate.getTime() / 1000));
                    const end = formatUtcSecondsToIsoWithOffset(Math.floor(endDate.getTime() / 1000));
                    records.push({duration, volume, start, end});
                    startDate = endDate;
                }
                return records;
            }
        };

        const toZigbee: Tz.Converter[] = [
            {
                key: ["read_swvzf_records"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertObject(value, key);
                    const type = value?.type;
                    if (!["24_hours", "30_days", "6_months"].includes(type)) {
                        logger.error(`read_swvzf_records invalid type: ${type}`, NS);
                        return;
                    }
                    if (value?.time_start === undefined || value?.time_end === undefined) {
                        logger.error("read_swvzf_records requires time_start and time_end", NS);
                        return;
                    }

                    const startUtcSec = normalizeUtcEpochSeconds(value.time_start, "time_start");
                    const endUtcSec = normalizeUtcEpochSeconds(value.time_end, "time_end");
                    if (startUtcSec === undefined || endUtcSec === undefined) {
                        return;
                    }
                    const startOffsetSec = utils.isString(value.time_start) ? parseIsoOffsetSeconds(value.time_start) : undefined;
                    const endOffsetSec = utils.isString(value.time_end) ? parseIsoOffsetSeconds(value.time_end) : undefined;
                    if (startOffsetSec === undefined || endOffsetSec === undefined) {
                        logger.error("read_swvzf_records invalid timezone offset in time_start/time_end", NS);
                        return;
                    }

                    const startDeviceSec = utcToDeviceLocal2000Seconds(startUtcSec, startOffsetSec);
                    const endDeviceSec = utcToDeviceLocal2000Seconds(endUtcSec, endOffsetSec);
                    if (startDeviceSec < 0 || startDeviceSec > 0xffffffff || endDeviceSec < 0 || endDeviceSec > 0xffffffff) {
                        logger.error("read_swvzf_records time range out of supported 2000-local uint32 range", NS);
                        return;
                    }
                    if (endDeviceSec < startDeviceSec) {
                        logger.error("read_swvzf_records time_end earlier than time_start", NS);
                        return;
                    }

                    let subCmd = 0x00;
                    if (type === "24_hours") subCmd = 0x00;
                    if (type === "30_days") subCmd = 0x01;
                    if (type === "6_months") subCmd = 0x02;

                    const payloadBuffer = Buffer.alloc(9);
                    payloadBuffer[0] = subCmd;
                    payloadBuffer.writeUInt32BE(startDeviceSec, 1);
                    payloadBuffer.writeUInt32BE(endDeviceSec, 5);
                    const payloadValue = Array.from(payloadBuffer);

                    const ieeeAddr = meta?.device?.ieeeAddr;
                    if (ieeeAddr) {
                        swvzfReqCache[ieeeAddr] = swvzfReqCache[ieeeAddr] ?? {};
                        swvzfReqCache[ieeeAddr][subCmd] = {
                            startDevice: startDeviceSec,
                            endDevice: endDeviceSec,
                            startUTC: startUtcSec,
                            endUTC: endUtcSec,
                            updatedAt: Date.now(),
                        };

                        if (subCmd === 0x01) {
                            delete swvzfRespCache[ieeeAddr];
                        }
                    }

                    await entity.command<"customClusterEwelink", "readRecord", SonoffSwvzn>(
                        clusterName,
                        commandName,
                        {data: payloadValue},
                        {disableDefaultResponse: true},
                    );
                },
            },
        ];

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["raw"]>[] = [
            {
                cluster: "customClusterEwelink",
                type: ["raw"],
                convert: (model, msg, publish, options, meta) => {
                    if (!(msg.data instanceof Buffer)) return;
                    const parsedRawCommand = parseRawZclCommand(msg.data);
                    if (!parsedRawCommand) return;
                    if (parsedRawCommand.commandId !== 0x00) return;

                    const body = parsedRawCommand.payload;
                    if (body.length < 3) return;
                    const subCmd = body[0];
                    const status = body[1];
                    const recordIndex = body[2];
                    const payload = body.subarray(3);
                    const ieeeAddr = meta?.device?.ieeeAddr;

                    if (![0, 1, 2].includes(subCmd)) return;
                    if (status > 0x03) return;
                    if (status !== 0x00) {
                        if (ieeeAddr && subCmd === 1) {
                            delete swvzfRespCache[ieeeAddr];
                        }

                        let errorReason = "";
                        if (status === 0x01) errorReason = "timestamp_invalid";
                        else if (status === 0x02) errorReason = "watering_amount_invalid";
                        else if (status === 0x03) errorReason = "irrigation_duration_invalid";
                        logger.error(`readSWVZFRecord invalid status=${status}===${errorReason} subCmd=${subCmd} recordIndex=${recordIndex}`, NS);
                        return;
                    }

                    const now = Date.now();
                    if (ieeeAddr && swvzfReqCache[ieeeAddr]) {
                        const req = swvzfReqCache[ieeeAddr][subCmd];
                        if (req && now - req.updatedAt > swvzfCacheExpireTime) {
                            delete swvzfReqCache[ieeeAddr][subCmd];
                        }
                    }
                    const request = ieeeAddr ? swvzfReqCache[ieeeAddr]?.[subCmd] : undefined;
                    if (!request || typeof request.startUTC !== "number" || typeof request.endUTC !== "number") {
                        logger.error(`readSWVZFRecord missing request context subCmd=${subCmd}`, NS);
                        return;
                    }
                    const startSec = request.startUTC;

                    if (subCmd === 0) {
                        if (recordIndex !== 0) return;

                        const rawRecordData = [...payload];
                        const slicedRecordData = rawRecordData.slice(0, 24 * 3);
                        const alignedLength = slicedRecordData.length - (slicedRecordData.length % 3);
                        const recordData = slicedRecordData.slice(0, alignedLength);
                        if (recordData.length < 3) return;

                        const value = parseHistoryRecords("24_hours", recordData, {startSec});
                        if (ieeeAddr && swvzfReqCache[ieeeAddr]) {
                            delete swvzfReqCache[ieeeAddr][subCmd];
                        }
                        return {"24_hours_records": value};
                    }

                    if (subCmd === 2) {
                        if (recordIndex !== 0) return;

                        const rawRecordData = [...payload];
                        const slicedRecordData = rawRecordData.slice(0, 6 * 5);
                        const alignedLength = slicedRecordData.length - (slicedRecordData.length % 5);
                        const recordData = slicedRecordData.slice(0, alignedLength);
                        if (recordData.length < 5) return;

                        const value = parseHistoryRecords("6_months", recordData, {startSec});
                        if (ieeeAddr && swvzfReqCache[ieeeAddr]) {
                            delete swvzfReqCache[ieeeAddr][subCmd];
                        }
                        return {"180_days_records": value};
                    }

                    if (subCmd === 1) {
                        if (recordIndex > 2) return;
                        if (payload.length === 0) return;

                        const dayCount = payload[0];
                        let parsedDayCount = 0;
                        let recordData: number[] = [];

                        if (recordIndex === 0 || recordIndex === 1) {
                            if (payload.length % 5 !== 0) {
                                logger.info(`readSWVZFRecord invalid 30_days payloadLen=${payload.length} recordIndex=${recordIndex}`, NS);
                                return;
                            }

                            parsedDayCount = Math.floor(payload.length / 5);
                            if (parsedDayCount !== 10) {
                                logger.info(`readSWVZFRecord invalid fixed dayCount=${parsedDayCount} recordIndex=${recordIndex}`, NS);
                                return;
                            }

                            recordData = [...payload];
                        } else {
                            if ((payload.length - 1) % 5 !== 0) {
                                logger.info(`readSWVZFRecord invalid 30_days payloadLen=${payload.length} recordIndex=2`, NS);
                                return;
                            }

                            parsedDayCount = dayCount;
                            if (parsedDayCount < 8 || parsedDayCount > 11) {
                                logger.info(`readSWVZFRecord invalid dayCount=${parsedDayCount} recordIndex=2`, NS);
                                return;
                            }

                            const actualCount = Math.floor((payload.length - 1) / 5);
                            if (actualCount !== parsedDayCount) {
                                logger.info(
                                    `readSWVZFRecord dayCount mismatch dayCount=${parsedDayCount} actualCount=${actualCount} recordIndex=2`,
                                    NS,
                                );
                                return;
                            }

                            recordData = [...payload.subarray(1)];
                        }

                        const dayOffset = recordIndex * 10;
                        const records = parseHistoryRecords("30_days", recordData, {startSec, dayOffset});

                        if (!ieeeAddr) return {"30_days_records": records};

                        const oldCache = swvzfRespCache[ieeeAddr];
                        const isCacheExpire = !oldCache || now - oldCache.updatedAt > swvzfCacheExpireTime;
                        const newCache = isCacheExpire ? {packets: {}, updatedAt: now} : oldCache;
                        newCache.packets[recordIndex] = records;
                        newCache.updatedAt = now;
                        swvzfRespCache[ieeeAddr] = newCache;

                        const hasAll = newCache.packets[0] && newCache.packets[1] && newCache.packets[2];
                        if (!hasAll) return;

                        const combined = [...(newCache.packets[0] ?? []), ...(newCache.packets[1] ?? []), ...(newCache.packets[2] ?? [])];
                        delete swvzfRespCache[ieeeAddr];
                        if (swvzfReqCache[ieeeAddr]) {
                            delete swvzfReqCache[ieeeAddr][subCmd];
                        }

                        return {"30_days_records": combined};
                    }
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    irrigationPlanSettingsAndReport: (): ModernExtend => {
        const clusterName = "customClusterEwelink";
        const commandId = {
            irrigationPlanSettings: 0x06,
            irrigationPlanReport: 0x09,
        };

        const loopTypeModeMapping: Record<number, "odd_days" | "even_days" | "day_interval" | "weekdays"> = {
            0: "odd_days",
            1: "even_days",
            2: "day_interval",
            3: "weekdays",
        };
        const loopTypeModeMappingReverse = {
            odd_days: 0,
            even_days: 1,
            day_interval: 2,
            weekdays: 3,
        };
        const irrigationModeMapping: Record<number, "duration" | "capacity" | "duration_with_interval"> = {
            0: "duration",
            1: "capacity",
            2: "duration_with_interval",
        };
        const irrigationModeMappingReverse = {
            duration: 0,
            capacity: 1,
            duration_with_interval: 2,
        };
        const irrigationAmountUnitMapping: Record<number, "gallon" | "liter"> = {
            0: "gallon",
            1: "liter",
        };
        const irrigationAmountUnitMappingReverse = {
            gallon: 0,
            liter: 1,
        };
        const loopTypeWeekDayBitMapping = {
            sunday: 0b0000001,
            monday: 0b0000010,
            tuesday: 0b0000100,
            wednesday: 0b0001000,
            thursday: 0b0010000,
            friday: 0b0100000,
            saturday: 0b1000000,
        } as const;

        type LoopTypeWeekDay = keyof typeof loopTypeWeekDayBitMapping;
        type LoopTypeWeekDays = {[K in LoopTypeWeekDay]: boolean};

        const loopTypeWeekDayNames = Object.keys(loopTypeWeekDayBitMapping) as LoopTypeWeekDay[];
        const decodeLoopTypeWeekDays = (mask: number): LoopTypeWeekDays => ({
            sunday: (mask & loopTypeWeekDayBitMapping.sunday) > 0,
            monday: (mask & loopTypeWeekDayBitMapping.monday) > 0,
            tuesday: (mask & loopTypeWeekDayBitMapping.tuesday) > 0,
            wednesday: (mask & loopTypeWeekDayBitMapping.wednesday) > 0,
            thursday: (mask & loopTypeWeekDayBitMapping.thursday) > 0,
            friday: (mask & loopTypeWeekDayBitMapping.friday) > 0,
            saturday: (mask & loopTypeWeekDayBitMapping.saturday) > 0,
        });

        const exposes = [
            e
                .composite("irrigation_plan_settings", "irrigation_plan_settings", ea.STATE_SET)
                .withDescription("Set irrigation plan")
                .withFeature(e.numeric("plan_index", ea.SET).withValueMin(0).withValueMax(5).withDescription("Plan index"))
                .withFeature(e.binary("enable_state", ea.SET, true, false))
                .withFeature(e.enum("loop_type_mode", ea.SET, ["odd_days", "even_days", "day_interval", "weekdays"]))
                .withFeature(
                    e
                        .numeric("loop_type_interval_days", ea.SET)
                        .withValueMin(1)
                        .withValueMax(30)
                        .withDescription("Only effective when loop_type_mode is day_interval"),
                )
                .withFeature(
                    e
                        .composite("loop_type_week_days", "loop_type_week_days", ea.SET)
                        .withDescription("Only effective when loop_type_mode is weekdays")
                        .withFeature(e.binary("sunday", ea.SET, true, false))
                        .withFeature(e.binary("monday", ea.SET, true, false))
                        .withFeature(e.binary("tuesday", ea.SET, true, false))
                        .withFeature(e.binary("wednesday", ea.SET, true, false))
                        .withFeature(e.binary("thursday", ea.SET, true, false))
                        .withFeature(e.binary("friday", ea.SET, true, false))
                        .withFeature(e.binary("saturday", ea.SET, true, false)),
                )
                .withFeature(
                    e
                        .text("enable_date", ea.SET)
                        .withDescription(
                            "Enable date in local YYYY-MM-DD format (fixed at 00:00:00 local day start). Omit to use current local date",
                        ),
                )
                .withFeature(
                    e
                        .text("start_time", ea.SET)
                        .withDescription(
                            "Start time in local HH:mm format (24-hour, zero-padded), converted to seconds from start of local day. Omit to use current local time rounded to minute",
                        ),
                )
                .withFeature(e.enum("irrigation_mode", ea.SET, ["duration", "capacity", "duration_with_interval"]))
                .withFeature(e.numeric("irrigation_total_duration", ea.SET).withValueMin(0).withValueMax(719).withUnit("min"))
                .withFeature(e.numeric("irrigation_duration", ea.SET).withValueMin(1).withValueMax(60).withUnit("min"))
                .withFeature(e.numeric("interval_duration", ea.SET).withValueMin(1).withValueMax(60).withUnit("min"))
                .withFeature(e.enum("irrigation_amount_unit", ea.SET, ["gallon", "liter"]))
                .withFeature(e.numeric("irrigation_amount", ea.SET).withValueMin(1).withValueMax(10000))
                .withFeature(e.numeric("fail_safe", ea.SET).withValueMin(0).withValueMax(719).withUnit("min"))
                .withFeature(
                    e.text("create_datetime", ea.SET).withDescription("Create datetime in ISO format with timezone (e.g. YYYY-MM-DDTHH:mm:ss+08:00)"),
                ),
            e
                .composite("irrigation_plan_report", "irrigation_plan_report", ea.STATE)
                .withDescription("Irrigation plan report")
                .withFeature(e.numeric("plan_index", ea.STATE))
                .withFeature(e.binary("enable_state", ea.STATE, true, false))
                .withFeature(e.enum("loop_type_mode", ea.STATE, ["odd_days", "even_days", "day_interval", "weekdays"]))
                .withFeature(e.numeric("loop_type_interval_days", ea.STATE).withDescription("Effective when loop_type_mode is day_interval"))
                .withFeature(
                    e
                        .composite("loop_type_week_days", "loop_type_week_days", ea.STATE)
                        .withDescription("Effective when loop_type_mode is weekdays")
                        .withFeature(e.binary("sunday", ea.STATE, true, false))
                        .withFeature(e.binary("monday", ea.STATE, true, false))
                        .withFeature(e.binary("tuesday", ea.STATE, true, false))
                        .withFeature(e.binary("wednesday", ea.STATE, true, false))
                        .withFeature(e.binary("thursday", ea.STATE, true, false))
                        .withFeature(e.binary("friday", ea.STATE, true, false))
                        .withFeature(e.binary("saturday", ea.STATE, true, false)),
                )
                .withFeature(e.text("enable_date", ea.STATE).withDescription("Enable date in local YYYY-MM-DD format (local day start)"))
                .withFeature(e.text("start_time", ea.STATE).withDescription("Start time in local HH:mm format (24-hour)"))
                .withFeature(e.enum("irrigation_mode", ea.STATE, ["duration", "capacity", "duration_with_interval"]))
                .withFeature(e.numeric("irrigation_total_duration", ea.STATE))
                .withFeature(e.numeric("irrigation_duration", ea.STATE))
                .withFeature(e.numeric("interval_duration", ea.STATE))
                .withFeature(e.enum("irrigation_amount_unit", ea.STATE, ["gallon", "liter"]))
                .withFeature(e.numeric("irrigation_amount", ea.STATE))
                .withFeature(e.numeric("fail_safe", ea.STATE))
                .withFeature(
                    e
                        .text("create_datetime", ea.STATE)
                        .withDescription("Create datetime in ISO format with timezone (e.g. YYYY-MM-DDTHH:mm:ss+08:00)"),
                ),
        ];

        const fromZigbee: Fz.Converter<
            "customClusterEwelink",
            SonoffSwvzn,
            ["raw", "commandIrrigationPlanSettings", "commandIrrigationPlanReport"]
        >[] = [
            {
                cluster: clusterName,
                type: ["raw", "commandIrrigationPlanSettings", "commandIrrigationPlanReport"],
                convert: (model, msg, publish, options, meta) => {
                    let cmdId: number | undefined;
                    let payload: Buffer | undefined;

                    if (msg.type === "raw") {
                        if (!(msg.data instanceof Buffer)) return;
                        const parsedRawCommand = parseRawZclCommand(msg.data);
                        if (!parsedRawCommand) return;
                        cmdId = parsedRawCommand.commandId;
                        payload = parsedRawCommand.payload;
                    } else if (msg.type === "commandIrrigationPlanSettings") {
                        cmdId = commandId.irrigationPlanSettings;
                        const dataField = (msg.data as {data?: number[] | Buffer})?.data ?? msg.data;
                        if (Buffer.isBuffer(dataField)) payload = dataField;
                        else if (Array.isArray(dataField)) payload = Buffer.from(dataField);
                        if (!payload) return;
                    } else if (msg.type === "commandIrrigationPlanReport") {
                        cmdId = commandId.irrigationPlanReport;
                        const dataField = (msg.data as {data?: number[] | Buffer})?.data ?? msg.data;
                        if (Buffer.isBuffer(dataField)) payload = dataField;
                        else if (Array.isArray(dataField)) payload = Buffer.from(dataField);
                        if (!payload) return;
                    }

                    if (cmdId === commandId.irrigationPlanSettings) {
                        if (payload.length < 1) {
                            logger.error("irrigationPlanSettingsReply invalid payload length", NS);
                            return;
                        }

                        const status = payload.readUInt8(0);
                        if (status !== 0) {
                            logger.error(`irrigationPlanSettingsReply failed, status=${status}`, NS);
                        }
                        return;
                    }
                    if (cmdId === commandId.irrigationPlanReport) {
                        if (payload.length < 28) return;

                        // Payload byte offset
                        let offset = 0;
                        // Plan index
                        const planIndex = payload.readUInt8(offset);
                        offset += 1;
                        // Whether schedule is enabled
                        const enableState = payload.readUInt8(offset);
                        offset += 1;
                        // Loop type
                        const loopType = payload.readUInt16BE(offset);
                        const loopTypeMode = (loopType >> 8) & 0xff; // Loop mode
                        const loopTypeValue = loopType & 0xff; // Loop configuration
                        offset += 2;
                        // Enable date(day start): device 2000-local seconds -> Unix UTC seconds
                        const enableDatetimeDevice = payload.readUInt32BE(offset);
                        const enableDatetimeUTC = deviceLocal2000ToUTCSeconds(enableDatetimeDevice);
                        offset += 4;
                        // Irrigation mode
                        const irrigationMode = payload.readUInt8(offset);
                        offset += 1;
                        // Effective start time (seconds from 00:00)
                        const startSeconds = payload.readUInt32BE(offset);
                        const enableDateISO = formatUtcSecondsToIsoWithOffset(enableDatetimeUTC);
                        const enableDate = enableDateISO.slice(0, 10);
                        const startHours = Math.floor(startSeconds / 3600);
                        const startMinutes = Math.floor((startSeconds % 3600) / 60);
                        const startTime = `${String(startHours).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}`;
                        offset += 4;
                        // Irrigation duration
                        const irrigationTotalDuration = payload.readUInt16BE(offset);
                        offset += 2;
                        const irrigationDuration = payload.readUInt16BE(offset);
                        offset += 2;
                        // Interval duration
                        const intervalDuration = payload.readUInt16BE(offset);
                        offset += 2;
                        // Irrigation amount unit
                        const irrigationAmountUnit = payload.readUInt8(offset);
                        offset += 1;
                        // Irrigation amount
                        const irrigationAmount = payload.readUInt16BE(offset);
                        offset += 2;
                        // Fail-safe timeout (1-60 minutes)
                        const failSafe = payload.readUInt16BE(offset);
                        offset += 2;
                        // Creation time -> UTC
                        const createDatetimeDevice = payload.readUInt32BE(offset);
                        const createDatetimeISO = formatUtcSecondsToIsoWithOffset(createDatetimeDevice);

                        return {
                            irrigation_plan_report: {
                                plan_index: planIndex,
                                enable_state: enableState === 1,
                                loop_type_mode: loopTypeModeMapping[loopTypeMode],
                                loop_type_interval_days: loopTypeMode === loopTypeModeMappingReverse.day_interval ? loopTypeValue : 0,
                                loop_type_week_days:
                                    loopTypeMode === loopTypeModeMappingReverse.weekdays
                                        ? decodeLoopTypeWeekDays(loopTypeValue)
                                        : decodeLoopTypeWeekDays(0),
                                enable_date: enableDate,
                                start_time: startTime,
                                irrigation_mode: irrigationModeMapping[irrigationMode],
                                irrigation_total_duration: irrigationTotalDuration,
                                irrigation_duration: irrigationDuration,
                                interval_duration: intervalDuration,
                                irrigation_amount_unit: irrigationAmountUnitMapping[irrigationAmountUnit],
                                irrigation_amount: irrigationAmount,
                                fail_safe: failSafe,
                                create_datetime: createDatetimeISO,
                            },
                        };
                    }
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["irrigation_plan_settings"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertObject(value, key);
                    const parseIntWithDefault = (fieldName: string, defaultValue: number, min: number, max: number): number | undefined => {
                        const raw = value[fieldName];
                        const parsed = raw === undefined || raw === null ? defaultValue : Number(raw);
                        if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
                            logger.error(`irrigation_plan_settings invalid ${fieldName}, expected integer in range [${min}, ${max}].`, NS);
                            return;
                        }
                        return parsed;
                    };

                    const payloadValue: Uint8Array = new Uint8Array(28);
                    let i = 0;
                    // Plan index
                    const planIndex = parseIntWithDefault("plan_index", 0, 0, 5);
                    if (planIndex === undefined) {
                        return;
                    }
                    payloadValue[i++] = planIndex & 0xff;
                    // Whether schedule is enabled
                    payloadValue[i++] = value.enable_state ? 0x01 : 0x00;
                    // Loop type
                    const loopTypeModeKey =
                        typeof value.loop_type_mode === "string" ? (value.loop_type_mode as keyof typeof loopTypeModeMappingReverse) : "odd_days";
                    const loopTypeMode = loopTypeModeMappingReverse[loopTypeModeKey] ?? loopTypeModeMappingReverse.odd_days;
                    let loopTypeValueCode = 0;
                    if (loopTypeMode === loopTypeModeMappingReverse.day_interval) {
                        const loopTypeIntervalDays = parseIntWithDefault("loop_type_interval_days", 1, 1, 30);
                        if (loopTypeIntervalDays === undefined) {
                            return;
                        }
                        loopTypeValueCode = loopTypeIntervalDays;
                    } else if (loopTypeMode === loopTypeModeMappingReverse.weekdays) {
                        const weekDays = value.loop_type_week_days;
                        if (utils.isObject(weekDays)) {
                            for (const dayName of loopTypeWeekDayNames) {
                                if (weekDays[dayName] === true) {
                                    loopTypeValueCode |= loopTypeWeekDayBitMapping[dayName];
                                }
                            }
                        }
                    }
                    const loopTypeWord = (loopTypeMode << 8) | loopTypeValueCode;
                    payloadValue[i++] = (loopTypeWord >> 8) & 0xff;
                    payloadValue[i++] = loopTypeWord & 0xff;
                    // Enable date: start of local day -> device local-2000 seconds
                    let nowUtcSeconds = Math.floor(Date.now() / 1000);
                    let offsetSeconds = -new Date(nowUtcSeconds * 1000).getTimezoneOffset() * 60;
                    const getLocalTime = meta?.options?.getLocalTime;
                    if (typeof getLocalTime === "function") {
                        const localTimeInfo = getLocalTime() ?? {};
                        if (typeof localTimeInfo.timeStamp === "number" && Number.isFinite(localTimeInfo.timeStamp)) {
                            nowUtcSeconds = Math.floor(localTimeInfo.timeStamp / 1000);
                        }
                        if (typeof localTimeInfo.offset === "number" && Number.isFinite(localTimeInfo.offset)) {
                            offsetSeconds = localTimeInfo.offset * 60;
                        }
                    }
                    const nowLocalDate = new Date((nowUtcSeconds + offsetSeconds) * 1000);
                    const defaultEnableDate = `${nowLocalDate.getUTCFullYear()}-${String(nowLocalDate.getUTCMonth() + 1).padStart(2, "0")}-${String(nowLocalDate.getUTCDate()).padStart(2, "0")}`;
                    const defaultStartSeconds = Math.floor(((((nowUtcSeconds + offsetSeconds) % 86400) + 86400) % 86400) / 60) * 60;
                    const defaultStartHours = Math.floor(defaultStartSeconds / 3600);
                    const defaultStartMinutes = Math.floor((defaultStartSeconds % 3600) / 60);
                    const defaultStartTime = `${String(defaultStartHours).padStart(2, "0")}:${String(defaultStartMinutes).padStart(2, "0")}`;

                    const enableDateValue = value.enable_date ?? defaultEnableDate;
                    if (!utils.isString(enableDateValue)) {
                        logger.error("irrigation_plan_settings invalid enable_date, expected local date in YYYY-MM-DD format.", NS);
                        return;
                    }
                    const enableDateMatch = enableDateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (!enableDateMatch) {
                        logger.error("irrigation_plan_settings invalid enable_date, expected local date in YYYY-MM-DD format.", NS);
                        return;
                    }
                    const enableYear = Number(enableDateMatch[1]);
                    const enableMonth = Number(enableDateMatch[2]);
                    const enableDay = Number(enableDateMatch[3]);
                    const enableDateUtcMs = Date.UTC(enableYear, enableMonth - 1, enableDay, 0, 0, 0);
                    const enableDateUtc = new Date(enableDateUtcMs);
                    if (
                        enableDateUtc.getUTCFullYear() !== enableYear ||
                        enableDateUtc.getUTCMonth() !== enableMonth - 1 ||
                        enableDateUtc.getUTCDate() !== enableDay
                    ) {
                        logger.error("irrigation_plan_settings invalid enable_date, expected local date in YYYY-MM-DD format.", NS);
                        return;
                    }
                    const enableDatetime = Math.floor(enableDateUtcMs / 1000) - YEAR_2000_IN_UTC;
                    if (enableDatetime < 0 || enableDatetime > 0xffffffff) {
                        logger.error("irrigation_plan_settings invalid enable_date, converted 2000-local value out of uint32 range.", NS);
                        return;
                    }
                    payloadValue[i++] = (enableDatetime >> 24) & 0xff;
                    payloadValue[i++] = (enableDatetime >> 16) & 0xff;
                    payloadValue[i++] = (enableDatetime >> 8) & 0xff;
                    payloadValue[i++] = enableDatetime & 0xff;
                    // Irrigation mode
                    const irrigationModeKey =
                        typeof value.irrigation_mode === "string" ? (value.irrigation_mode as keyof typeof irrigationModeMappingReverse) : "duration";
                    const irrigationModeCode = irrigationModeMappingReverse[irrigationModeKey] ?? irrigationModeMappingReverse.duration;
                    payloadValue[i++] = irrigationModeCode & 0xff;
                    // Start time offset from start of local day.
                    const startTimeValue = value.start_time ?? defaultStartTime;
                    if (!utils.isString(startTimeValue)) {
                        logger.error("irrigation_plan_settings invalid start_time, expected HH:mm.", NS);
                        return;
                    }
                    const startTimeMatch = startTimeValue.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
                    if (!startTimeMatch) {
                        logger.error("irrigation_plan_settings invalid start_time, expected HH:mm.", NS);
                        return;
                    }
                    const startSeconds = Number(startTimeMatch[1]) * 3600 + Number(startTimeMatch[2]) * 60;
                    payloadValue[i++] = (startSeconds >> 24) & 0xff;
                    payloadValue[i++] = (startSeconds >> 16) & 0xff;
                    payloadValue[i++] = (startSeconds >> 8) & 0xff;
                    payloadValue[i++] = startSeconds & 0xff;
                    // Total irrigation duration
                    const irrigationTotalDuration = parseIntWithDefault("irrigation_total_duration", 10, 0, 719);
                    if (irrigationTotalDuration === undefined) {
                        return;
                    }
                    payloadValue[i++] = (irrigationTotalDuration >> 8) & 0xff;
                    payloadValue[i++] = irrigationTotalDuration & 0xff;
                    // Irrigation duration
                    const irrigationDuration = parseIntWithDefault("irrigation_duration", 2, 1, 60);
                    if (irrigationDuration === undefined) {
                        return;
                    }
                    payloadValue[i++] = (irrigationDuration >> 8) & 0xff;
                    payloadValue[i++] = irrigationDuration & 0xff;
                    // Interval duration
                    const intervalDuration = parseIntWithDefault("interval_duration", 3, 1, 60);
                    if (intervalDuration === undefined) {
                        return;
                    }
                    payloadValue[i++] = (intervalDuration >> 8) & 0xff;
                    payloadValue[i++] = intervalDuration & 0xff;
                    // Irrigation amount unit
                    const irrigationAmountUnitKey =
                        typeof value.irrigation_amount_unit === "string"
                            ? (value.irrigation_amount_unit as keyof typeof irrigationAmountUnitMappingReverse)
                            : "gallon";
                    const irrigationAmountUnitCode =
                        irrigationAmountUnitMappingReverse[irrigationAmountUnitKey] ?? irrigationAmountUnitMappingReverse.gallon;
                    payloadValue[i++] = irrigationAmountUnitCode & 0xff;
                    // Irrigation amount
                    const irrigationAmountValue = parseIntWithDefault("irrigation_amount", 30, 1, 10000);
                    if (irrigationAmountValue === undefined) {
                        return;
                    }
                    const irrigationAmount = irrigationAmountValue;
                    payloadValue[i++] = (irrigationAmount >> 8) & 0xff;
                    payloadValue[i++] = irrigationAmount & 0xff;
                    // Fail-safe timeout
                    const failSafe = parseIntWithDefault("fail_safe", 10, 0, 719);
                    if (failSafe === undefined) {
                        return;
                    }
                    payloadValue[i++] = (failSafe >> 8) & 0xff;
                    payloadValue[i++] = failSafe & 0xff;
                    // Create datetime: Unix UTC seconds.
                    if (!utils.isString(value.create_datetime)) {
                        logger.error(
                            "irrigation_plan_settings invalid create_datetime, expected ISO 8601 datetime with timezone offset (Z or ±HH:mm).",
                            NS,
                        );
                        return;
                    }
                    const createDatetimeUTC = parseIsoWithOffsetToUtcSeconds(value.create_datetime);
                    if (createDatetimeUTC === undefined) {
                        logger.error(
                            "irrigation_plan_settings invalid create_datetime, expected ISO 8601 datetime with timezone offset (Z or ±HH:mm).",
                            NS,
                        );
                        return;
                    }
                    if (createDatetimeUTC < 0 || createDatetimeUTC > 0xffffffff) {
                        logger.error("irrigation_plan_settings invalid create_datetime, converted unix out of uint32 range.", NS);
                        return;
                    }
                    payloadValue[i++] = (createDatetimeUTC >> 24) & 0xff;
                    payloadValue[i++] = (createDatetimeUTC >> 16) & 0xff;
                    payloadValue[i++] = (createDatetimeUTC >> 8) & 0xff;
                    payloadValue[i++] = createDatetimeUTC & 0xff;

                    await entity.command<typeof clusterName, "irrigationPlanSettings", SonoffSwvzn>(
                        clusterName,
                        "irrigationPlanSettings",
                        {data: Array.from(payloadValue)},
                        defaultResponseOptions,
                    );

                    return {state: {[key]: value}};
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    irrigationPlanRemove: (): ModernExtend => {
        const clusterName = "customClusterEwelink";
        const commandId = 0x07;

        const exposes = [
            e.numeric("irrigation_plan_remove", ea.SET).withValueMin(0).withValueMax(5).withDescription("The index of the irrigation plan to remove"),
        ];

        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["raw", "commandIrrigationPlanRemove"]>[] = [
            {
                cluster: clusterName,
                type: ["raw", "commandIrrigationPlanRemove"],
                convert: (model, msg, publish, options, meta) => {
                    let cmdId: number | undefined;
                    let payload: Buffer | undefined;

                    if (msg.type === "raw") {
                        if (!(msg.data instanceof Buffer)) return;
                        const parsedRawCommand = parseRawZclCommand(msg.data);
                        if (!parsedRawCommand) return;
                        cmdId = parsedRawCommand.commandId;
                        payload = parsedRawCommand.payload;
                    } else if (msg.type === "commandIrrigationPlanRemove") {
                        cmdId = commandId;
                        const dataField = (msg.data as {data?: number[] | Buffer})?.data ?? msg.data;
                        if (Buffer.isBuffer(dataField)) payload = dataField;
                        else if (Array.isArray(dataField)) payload = Buffer.from(dataField);
                        if (!payload) return;
                    }

                    if (cmdId !== commandId || !payload || payload.length < 1) return;

                    const status = payload.readUInt8(0);
                    if (status !== 0) {
                        logger.error(`irrigationPlanRemoveReply failed, status=${status}`, NS);
                    }
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["irrigation_plan_remove"],
                convertSet: async (entity, key, value, meta) => {
                    const planIndex = Number(value);
                    const data = Buffer.alloc(1);
                    data.writeUInt8(planIndex & 0xff, 0);
                    await entity.command<"customClusterEwelink", "irrigationPlanRemove", SonoffSwvzn>(
                        clusterName,
                        "irrigationPlanRemove",
                        {data: Array.from(data)},
                        {disableDefaultResponse: true},
                    );

                    return {
                        state: {
                            [key]: planIndex,
                            [`irrigation_plan_settings_${planIndex}`]: null, // Clear the state of deleted plans
                        },
                    };
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    rainDelay: (): ModernExtend => {
        const clusterName = "customClusterEwelink";
        const commandId = 0x08;

        const exposes = [
            e.text("rain_delay", ea.SET).withDescription("Schedule delay end time in ISO format with timezone (e.g. YYYY-MM-DDTHH:mm:ss+08:00)"),
        ];
        const fromZigbee: Fz.Converter<"customClusterEwelink", SonoffSwvzn, ["raw", "commandRainDelay"]>[] = [
            {
                cluster: clusterName,
                type: ["raw", "commandRainDelay"],
                convert: (model, msg, publish, options, meta) => {
                    let cmdId: number | undefined;
                    let payload: Buffer | undefined;

                    if (msg.type === "raw") {
                        if (!(msg.data instanceof Buffer)) return;
                        const parsedRawCommand = parseRawZclCommand(msg.data);
                        if (!parsedRawCommand) return;
                        cmdId = parsedRawCommand.commandId;
                        payload = parsedRawCommand.payload;
                    } else if (msg.type === "commandRainDelay") {
                        cmdId = commandId;
                        const dataField = (msg.data as {data?: number[] | Buffer})?.data ?? msg.data;
                        if (Buffer.isBuffer(dataField)) payload = dataField;
                        else if (Array.isArray(dataField)) payload = Buffer.from(dataField);
                        if (!payload) return;
                    }

                    if (cmdId !== commandId || !payload || payload.length < 1) return;

                    const status = payload.readUInt8(0);
                    if (status !== 0) {
                        logger.error(`rainDelayReply failed, status=${status}`, NS);
                    }
                },
            },
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["rain_delay"],
                convertSet: async (entity, key, value, meta) => {
                    if (!utils.isString(value)) {
                        logger.error("Invalid rain_delay, expected ISO 8601 datetime with timezone offset (Z or ±HH:mm).", NS);
                        return;
                    }

                    const delayEndTimeUTC = parseIsoWithOffsetToUtcSeconds(value);
                    if (delayEndTimeUTC === undefined) {
                        logger.error("Invalid rain_delay, expected ISO 8601 datetime with timezone offset (Z or ±HH:mm).", NS);
                        return;
                    }

                    const delayEndOffset = parseIsoOffsetSeconds(value);
                    if (delayEndOffset === undefined) {
                        logger.error("Invalid rain_delay, expected ISO 8601 datetime with timezone offset (Z or ±HH:mm).", NS);
                        return;
                    }

                    const delayEndTimeDevice = utcToDeviceLocal2000Seconds(delayEndTimeUTC, delayEndOffset);
                    if (delayEndTimeDevice < 0 || delayEndTimeDevice > 0xffffffff) {
                        logger.error("Invalid rain_delay, converted device 2000-local value out of uint32 range.", NS);
                        return;
                    }
                    const data = [
                        (delayEndTimeDevice >>> 24) & 0xff,
                        (delayEndTimeDevice >>> 16) & 0xff,
                        (delayEndTimeDevice >>> 8) & 0xff,
                        delayEndTimeDevice & 0xff,
                    ];
                    await entity.command<"customClusterEwelink", "rainDelay", SonoffSwvzn>(
                        clusterName,
                        "rainDelay",
                        {data},
                        {disableDefaultResponse: true},
                    );

                    return {state: {[key]: formatUtcSecondsToIsoWithOffset(delayEndTimeUTC)}};
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["NSPanelP-Router", "Cuber ZLI Router"],
        model: "NSPanelP-Router",
        vendor: "SONOFF",
        description: "Router",
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ["BASICZBR3"],
        model: "BASICZBR3",
        vendor: "SONOFF",
        description: "Zigbee smart switch",
        // configureReporting fails for this device
        extend: [m.onOff({powerOnBehavior: false, skipDuplicateTransaction: true, configureReporting: false})],
    },
    {
        zigbeeModel: ["ZBMINI-L"],
        model: "ZBMINI-L",
        vendor: "SONOFF",
        description: "Zigbee smart switch (no neutral)",
        extend: [m.onOff()],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            // Unbind genPollCtrl to prevent device from sending checkin message.
            // Zigbee-herdsmans responds to the checkin message which causes the device
            // to poll slower.
            // https://github.com/Koenkk/zigbee2mqtt/issues/11676
            const endpoint = device.getEndpoint(1);
            if (endpoint.binds.some((b) => b.cluster.name === "genPollCtrl")) {
                await device.getEndpoint(1).unbind("genPollCtrl", coordinatorEndpoint);
            }
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        zigbeeModel: ["ZBMINIL2"],
        model: "ZBMINIL2",
        vendor: "SONOFF",
        description: "Zigbee smart switch (no neutral)",
        extend: [m.onOff()],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            // Unbind genPollCtrl to prevent device from sending checkin message.
            // Zigbee-herdsmans responds to the checkin message which causes the device
            // to poll slower.
            // https://github.com/Koenkk/zigbee2mqtt/issues/11676
            const endpoint = device.getEndpoint(1);
            if (endpoint.binds.some((b) => b.cluster.name === "genPollCtrl")) {
                await device.getEndpoint(1).unbind("genPollCtrl", coordinatorEndpoint);
            }
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        zigbeeModel: ["01MINIZB"],
        model: "ZBMINI",
        vendor: "SONOFF",
        description: "Zigbee two way smart switch",
        extend: [m.onOff({powerOnBehavior: false}), m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
    {
        zigbeeModel: ["S31 Lite zb"],
        model: "S31ZB",
        vendor: "SONOFF",
        description: "Zigbee smart plug (US version)",
        extend: [m.onOff({powerOnBehavior: false, skipDuplicateTransaction: true, configureReporting: false})],
        configure: async (device, coordinatorEndpoint) => {
            // Device does not support configureReporting for onOff, therefore just bind here.
            // https://github.com/Koenkk/zigbee2mqtt/issues/20618
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        fingerprint: [
            // ModelID is from the temperature/humidity sensor (SNZB-02) but this is SNZB-04, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
            {
                type: "EndDevice",
                manufacturerName: "eWeLink",
                modelID: "TH01",
                endpoints: [{ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]}],
            },
        ],
        zigbeeModel: ["DS01", "SNZB-04", "CK-TLSR8656-SS5-01(7003)"],
        model: "SNZB-04",
        vendor: "SONOFF",
        whiteLabel: [
            {vendor: "eWeLink", model: "RHK06"},
            {
                vendor: "eWeLink",
                model: "SNZB-04_eWeLink",
                fingerprint: [{modelID: "SNZB-04", manufacturerName: "eWeLink"}],
            },
            {
                vendor: "eWeLink",
                model: "CK-TLSR8656-SS5-01(7003)",
                fingerprint: [{modelID: "CK-TLSR8656-SS5-01(7003)", manufacturerName: "eWeLink"}],
            },
            tuya.whitelabel("Tuya", "WL-19DWZ", "Contact sensor", ["_TZ3000_n2egfsli"]),
            tuya.whitelabel("zbeacon", "DS01", "Contact sensor", ["zbeacon"]),
        ],
        description: "Contact sensor",
        extend: [ewelinkBattery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]})],
    },
    {
        zigbeeModel: ["WB01", "WB-01", "SNZB-01", "CK-TLSR8656-SS5-01(7000)"],
        model: "SNZB-01",
        vendor: "SONOFF",
        whiteLabel: [
            {vendor: "eWeLink", model: "RHK07"},
            {
                vendor: "eWeLink",
                model: "SNZB-01_eWeLink",
                fingerprint: [{modelID: "SNZB-01", manufacturerName: "eWeLink"}],
            },
            {
                vendor: "eWeLink",
                model: "CK-TLSR8656-SS5-01(7000)",
                fingerprint: [{modelID: "CK-TLSR8656-SS5-01(7000)", manufacturerName: "eWeLink"}],
            },
        ],
        description: "Wireless button",
        extend: [ewelinkBattery()],
        exposes: [e.action(["single", "double", "long"])],
        fromZigbee: [fz.ewelink_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["KF01", "KF-01"],
        model: "SNZB-01-KF",
        vendor: "SONOFF",
        description: "Wireless button",
        extend: [ewelinkBattery()],
        exposes: [e.action(["off", "single"])],
        fromZigbee: [fz.command_status_change_notification_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["ssIasZone"]);
        },
    },
    {
        fingerprint: [
            // ModelID is from the button (SNZB-01) but this is SNZB-02, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee2mqtt/issues/4338
            {
                type: "EndDevice",
                manufacturerName: "eWeLink",
                modelID: "WB01",
                endpoints: [{ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]}],
            },
            {
                type: "EndDevice",
                manufacturerName: "eWeLink",
                modelID: "66666",
                endpoints: [{ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]}],
            },
            {
                type: "EndDevice",
                manufacturerName: "eWeLink",
                modelID: "DS01",
                endpoints: [{ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]}],
            },
            {
                type: "EndDevice",
                manufacturerName: "Zbeacon",
                modelID: "TH01",
            },
        ],
        zigbeeModel: ["TH01", "SNZB-02", "CK-TLSR8656-SS5-01(7014)"],
        model: "SNZB-02",
        vendor: "SONOFF",
        whiteLabel: [
            {vendor: "eWeLink", model: "RHK08"},
            {
                vendor: "eWeLink",
                model: "SNZB-02_eWeLink",
                fingerprint: [{modelID: "SNZB-02", manufacturerName: "eWeLink"}],
            },
            {
                vendor: "eWeLink",
                model: "CK-TLSR8656-SS5-01(7014)",
                fingerprint: [{modelID: "CK-TLSR8656-SS5-01(7014)", manufacturerName: "eWeLink"}],
            },
            {
                vendor: "Zbeacon",
                model: "TH01",
                fingerprint: [{modelID: "TH01", manufacturerName: "Zbeacon"}],
            },
        ],
        description: "Temperature and humidity sensor",
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        fromZigbee: [fz.SNZB02_temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = "Battery";
            device.save();
            try {
                const endpoint = device.getEndpoint(1);
                const bindClusters = ["msTemperatureMeasurement", "msRelativeHumidity", "genPowerCfg"];
                await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                await reporting.temperature(endpoint, {min: 30, max: 3600, change: 20});
                await reporting.humidity(endpoint, {min: 30, max: constants.repInterval.HOUR, change: 100});
                await reporting.batteryVoltage(endpoint, {min: 3600, max: constants.repInterval.MAX});
                await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 65000});
            } catch (e) {
                /* Not required for all: https://github.com/Koenkk/zigbee2mqtt/issues/5562 */
                logger.error(`Configure failed: ${e}`, NS);
            }
        },
    },
    {
        zigbeeModel: ["Dongle-PMG24_ZBRouter"],
        model: "Dongle-PMG24",
        vendor: "SONOFF",
        description: "Zigbee Dongle Plus MG24 (EFR32MG24) with router firmware",
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ["SNZB-02D"],
        model: "SNZB-02D",
        vendor: "SONOFF",
        description: "Temperature and humidity sensor with screen",
        ota: true,
        extend: [
            m.deviceAddCustomCluster("customSonoffSnzb02d", {
                ID: 0xfc11,
                attributes: {
                    comfortTemperatureMax: {ID: 0x0003, type: Zcl.DataType.INT16, write: true, min: -32768},
                    comfortTemperatureMin: {ID: 0x0004, type: Zcl.DataType.INT16, write: true, min: -32768},
                    comfortHumidityMin: {ID: 0x0005, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    comfortHumidityMax: {ID: 0x0006, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    temperatureUnits: {ID: 0x0007, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16, write: true, min: -32768},
                    humidityCalibration: {ID: 0x2004, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.battery(),
            m.temperature(),
            m.humidity(),
            m.bindCluster({cluster: "genPollCtrl", clusterType: "input"}),
            m.numeric<"customSonoffSnzb02d", SonoffSnzb02d>({
                name: "comfort_temperature_min",
                cluster: "customSonoffSnzb02d",
                attribute: "comfortTemperatureMin",
                entityCategory: "config",
                description:
                    "Minimum temperature that is considered comfortable. The device will display ❄️ when the temperature is lower than this value. Note: wake up the device by pressing the button on the back before changing this value.",
                valueMin: -10,
                valueMax: 60,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
            m.numeric<"customSonoffSnzb02d", SonoffSnzb02d>({
                name: "comfort_temperature_max",
                cluster: "customSonoffSnzb02d",
                attribute: "comfortTemperatureMax",
                entityCategory: "config",
                description:
                    "Maximum temperature that is considered comfortable. The device will display 🔥 when the temperature is higher than this value. Note: wake up the device by pressing the button on the back before changing this value.",
                valueMin: -10,
                valueMax: 60,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
            m.numeric<"customSonoffSnzb02d", SonoffSnzb02d>({
                name: "comfort_humidity_min",
                cluster: "customSonoffSnzb02d",
                attribute: "comfortHumidityMin",
                entityCategory: "config",
                description:
                    "Minimum relative humidity that is considered comfortable. The device will display ☀️ when the humidity is lower than this value. Note: wake up the device by pressing the button on the back before changing this value.",
                valueMin: 5,
                valueMax: 95,
                scale: 100,
                valueStep: 0.1,
                unit: "%",
            }),
            m.numeric<"customSonoffSnzb02d", SonoffSnzb02d>({
                name: "comfort_humidity_max",
                cluster: "customSonoffSnzb02d",
                attribute: "comfortHumidityMax",
                entityCategory: "config",
                description:
                    "Maximum relative humidity that is considered comfortable. The device will display 💧 when the humidity is higher than this value. Note: wake up the device by pressing the button on the back before changing this value.",
                valueMin: 5,
                valueMax: 95,
                scale: 100,
                valueStep: 0.1,
                unit: "%",
            }),
            m.enumLookup<"customSonoffSnzb02d", SonoffSnzb02d>({
                name: "temperature_units",
                lookup: {celsius: 0, fahrenheit: 1},
                cluster: "customSonoffSnzb02d",
                attribute: "temperatureUnits",
                entityCategory: "config",
                description:
                    "The unit of the temperature displayed on the device screen. Note: wake up the device by pressing the button on the back before changing this value.",
            }),
            m.numeric<"customSonoffSnzb02d", SonoffSnzb02d>({
                name: "temperature_calibration",
                cluster: "customSonoffSnzb02d",
                attribute: "temperatureCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported temperature",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
            m.numeric<"customSonoffSnzb02d", SonoffSnzb02d>({
                name: "humidity_calibration",
                cluster: "customSonoffSnzb02d",
                attribute: "humidityCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported relative humidity",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "%",
            }),
        ],
    },
    {
        zigbeeModel: ["SNZB-02LD"],
        model: "SNZB-02LD",
        vendor: "SONOFF",
        description: "Waterproof (IP65) sensor with screen and probe temperature detection",
        extend: [
            m.deviceAddCustomCluster("customSonoffSnzb02ld", {
                ID: 0xfc11,
                attributes: {
                    temperatureUnits: {ID: 0x0007, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.battery(),
            m.temperature(),
            m.bindCluster({cluster: "genPollCtrl", clusterType: "input"}),
            m.enumLookup<"customSonoffSnzb02ld", SonoffSnzb02ld>({
                name: "temperature_units",
                lookup: {celsius: 0, fahrenheit: 1},
                cluster: "customSonoffSnzb02ld",
                attribute: "temperatureUnits",
                entityCategory: "config",
                description:
                    "The unit of the temperature displayed on the device screen. Note: wake up the device by pressing the button on the back before changing this value.",
            }),
            m.numeric<"customSonoffSnzb02ld", SonoffSnzb02ld>({
                name: "temperature_calibration",
                cluster: "customSonoffSnzb02ld",
                attribute: "temperatureCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported temperature",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
        ],
    },
    {
        zigbeeModel: ["SNZB-02WD"],
        model: "SNZB-02WD",
        vendor: "SONOFF",
        description: "Waterproof (IP65) temperature and humidity sensor with screen",
        ota: true,
        extend: [
            m.deviceAddCustomCluster("customSonoffSnzb02wd", {
                ID: 0xfc11,
                attributes: {
                    temperatureUnits: {ID: 0x0007, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16, write: true, min: -32768},
                    humidityCalibration: {ID: 0x2004, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.battery({voltage: true, voltageReporting: true}),
            m.temperature(),
            m.humidity(),
            m.bindCluster({cluster: "genPollCtrl", clusterType: "input"}),
            m.enumLookup<"customSonoffSnzb02wd", SonoffSnzb02wd>({
                name: "temperature_units",
                lookup: {celsius: 0, fahrenheit: 1},
                cluster: "customSonoffSnzb02wd",
                attribute: "temperatureUnits",
                entityCategory: "config",
                description:
                    "The unit of the temperature displayed on the device screen. Note: wake up the device by pressing the button on the back before changing this value.",
            }),
            m.numeric<"customSonoffSnzb02wd", SonoffSnzb02wd>({
                name: "temperature_calibration",
                cluster: "customSonoffSnzb02wd",
                attribute: "temperatureCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported temperature",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
            m.numeric<"customSonoffSnzb02wd", SonoffSnzb02wd>({
                name: "humidity_calibration",
                cluster: "customSonoffSnzb02wd",
                attribute: "humidityCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported relative humidity",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "%",
            }),
        ],
    },
    {
        zigbeeModel: ["SNZB-02DR2"],
        model: "SNZB-02DR2",
        vendor: "SONOFF",
        description: "Temperature and humidity sensor with display and relay control",
        extend: [
            m.deviceAddCustomCluster("customSonoffSnzb02dr2", {
                ID: 0xfc11,
                attributes: {
                    comfortTemperatureMax: {ID: 0x0003, type: Zcl.DataType.INT16, write: true, min: -32768},
                    comfortTemperatureMin: {ID: 0x0004, type: Zcl.DataType.INT16, write: true, min: -32768},
                    comfortHumidityMin: {ID: 0x0005, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    comfortHumidityMax: {ID: 0x0006, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    temperatureUnits: {ID: 0x0007, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16, write: true, min: -32768},
                    humidityCalibration: {ID: 0x2004, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.battery({voltage: true, voltageReporting: true}),
            m.temperature(),
            m.humidity(),
            m.bindCluster({cluster: "genPollCtrl", clusterType: "input"}),
            m.numeric<"customSonoffSnzb02dr2", SonoffSnzb02dr2>({
                name: "comfort_temperature_min",
                cluster: "customSonoffSnzb02dr2",
                attribute: "comfortTemperatureMin",
                entityCategory: "config",
                description:
                    "Minimum temperature that is considered comfortable. The device will display ❄️ when the temperature is lower than this value. Note: wake up the device by pressing the button on the back before changing this value.",
                valueMin: -10,
                valueMax: 60,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
            m.numeric<"customSonoffSnzb02dr2", SonoffSnzb02dr2>({
                name: "comfort_temperature_max",
                cluster: "customSonoffSnzb02dr2",
                attribute: "comfortTemperatureMax",
                entityCategory: "config",
                description:
                    "Maximum temperature that is considered comfortable. The device will display 🔥 when the temperature is higher than this value. Note: wake up the device by pressing the button on the back before changing this value.",
                valueMin: -10,
                valueMax: 60,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
            m.numeric<"customSonoffSnzb02dr2", SonoffSnzb02dr2>({
                name: "comfort_humidity_min",
                cluster: "customSonoffSnzb02dr2",
                attribute: "comfortHumidityMin",
                entityCategory: "config",
                description:
                    "Minimum relative humidity that is considered comfortable. The device will display ☀️ when the humidity is lower than this value. Note: wake up the device by pressing the button on the back before changing this value.",
                valueMin: 5,
                valueMax: 95,
                scale: 100,
                valueStep: 0.1,
                unit: "%",
            }),
            m.numeric<"customSonoffSnzb02dr2", SonoffSnzb02dr2>({
                name: "comfort_humidity_max",
                cluster: "customSonoffSnzb02dr2",
                attribute: "comfortHumidityMax",
                entityCategory: "config",
                description:
                    "Maximum relative humidity that is considered comfortable. The device will display 💧 when the humidity is higher than this value. Note: wake up the device by pressing the button on the back before changing this value.",
                valueMin: 5,
                valueMax: 95,
                scale: 100,
                valueStep: 0.1,
                unit: "%",
            }),
            m.enumLookup<"customSonoffSnzb02dr2", SonoffSnzb02dr2>({
                name: "temperature_units",
                lookup: {celsius: 0, fahrenheit: 1},
                cluster: "customSonoffSnzb02dr2",
                attribute: "temperatureUnits",
                entityCategory: "config",
                description:
                    "The unit of the temperature displayed on the device screen. Note: wake up the device by pressing the button on the back before changing this value.",
            }),
            m.numeric<"customSonoffSnzb02dr2", SonoffSnzb02dr2>({
                name: "temperature_calibration",
                cluster: "customSonoffSnzb02dr2",
                attribute: "temperatureCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported temperature",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
            m.numeric<"customSonoffSnzb02dr2", SonoffSnzb02dr2>({
                name: "humidity_calibration",
                cluster: "customSonoffSnzb02dr2",
                attribute: "humidityCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported relative humidity",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "%",
            }),
        ],
        ota: true,
    },
    {
        fingerprint: [
            {
                type: "EndDevice",
                manufacturerName: "eWeLink",
                modelID: "66666",
                endpoints: [{ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]}],
            },
            {
                // SNZB-O3 OUVOPO Wireless Motion Sensor (2023)
                type: "EndDevice",
                manufacturerName: "eWeLink",
                modelID: "SNZB-03",
                endpoints: [{ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]}],
            },
            {
                type: "EndDevice",
                manufacturerName: "eWeLink",
                modelID: "SNZB-03",
                endpoints: [{ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1, 1280, 32], outputClusters: [25]}],
            },
        ],
        zigbeeModel: ["MS01", "MSO1", "SNZB-03", "CK-TLSR8656-SS5-01(7002)"],
        model: "SNZB-03",
        vendor: "SONOFF",
        whiteLabel: [
            {vendor: "eWeLink", model: "RHK09"},
            {vendor: "eWeLink", model: "SQ510A"},
            {
                vendor: "eWeLink",
                model: "SNZB-03_eWeLink",
                fingerprint: [
                    {
                        // SNZB-O3 OUVOPO Wireless Motion Sensor (2023)
                        type: "EndDevice",
                        manufacturerName: "eWeLink",
                        modelID: "SNZB-03",
                        endpoints: [{ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]}],
                    },
                    {
                        type: "EndDevice",
                        manufacturerName: "eWeLink",
                        modelID: "SNZB-03",
                        endpoints: [{ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1, 1280, 32], outputClusters: [25]}],
                    },
                ],
            },
            {
                vendor: "eWeLink",
                model: "CK-TLSR8656-SS5-01(7002)",
                fingerprint: [
                    {
                        type: "EndDevice",
                        manufacturerName: "eWeLink",
                        modelID: "CK-TLSR8656-SS5-01(7002)",
                    },
                ],
            },
        ],
        description: "Motion sensor",
        extend: [ewelinkBattery(), m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "battery_low"]})],
    },
    {
        zigbeeModel: ["S26R2ZB"],
        model: "S26R2ZB",
        vendor: "SONOFF",
        description: "Zigbee smart plug",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["S40LITE"],
        model: "S40ZBTPB",
        vendor: "SONOFF",
        description: "15A Zigbee smart plug",
        extend: [m.onOff({powerOnBehavior: false, skipDuplicateTransaction: true})],
        ota: true,
    },
    {
        zigbeeModel: ["DONGLE-E_R"],
        model: "ZBDongle-E",
        vendor: "SONOFF",
        description: "Sonoff Zigbee 3.0 USB Dongle Plus (EFR32MG21) with router firmware",
        fromZigbee: [fz.linkquality_from_basic, fzLocal.router_config],
        toZigbee: [],
        exposes: [e.numeric("light_indicator_level", ea.STATE).withDescription("Brightness of the indicator light").withAccess(ea.STATE)],
        extend: [m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
    {
        zigbeeModel: ["Dongle-M_ZBRouter"],
        model: "Dongle-M",
        vendor: "SONOFF",
        description: "Dongle Max MG24 (EFR32MG24) with router firmware",
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        extend: [m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
    {
        zigbeeModel: ["Dongle-LMG21_ZBRouter"],
        model: "Dongle-LMG21",
        vendor: "SONOFF",
        description: "Dongle Lite Zigbee MG21 (EFR32MG21) with router firmware",
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        extend: [m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
    {
        zigbeeModel: ["ZBCurtain"],
        model: "ZBCurtain",
        vendor: "SONOFF",
        description: "Zigbee smart curtain motor",
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ["SA-029-1", "SA-028-1"],
        model: "SA-028/SA-029",
        vendor: "SONOFF",
        whiteLabel: [{vendor: "Woolley", model: "SA-029-1"}],
        description: "Smart Plug",
        extend: [m.onOff(), m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
    {
        zigbeeModel: ["Z111PL0H-1JX"],
        model: "Z111PL0H-1JX",
        vendor: "SONOFF",
        whiteLabel: [{vendor: "Woolley", model: "SA-028-1"}],
        description: "Smart Plug",
        extend: [m.onOff({powerOnBehavior: false}), m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
    {
        zigbeeModel: ["SNZB-01P"],
        model: "SNZB-01P",
        vendor: "SONOFF",
        description: "Wireless button",
        extend: [
            ewelinkAction(),
            m.battery({
                percentageReportingConfig: {min: 3600, max: 7200, change: 0},
                voltage: true,
                voltageReporting: true,
                voltageReportingConfig: {min: 3600, max: 7200, change: 0},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SNZB-01M"],
        model: "SNZB-01M",
        vendor: "SONOFF",
        description: "Four-way wireless button",
        fromZigbee: [fzLocal.key_action_event],
        exposes: [
            e.action([
                "single_button_1",
                "double_button_1",
                "long_button_1",
                "triple_button_1",
                "single_button_2",
                "double_button_2",
                "long_button_2",
                "triple_button_2",
                "single_button_3",
                "double_button_3",
                "long_button_3",
                "triple_button_3",
                "single_button_4",
                "double_button_4",
                "long_button_4",
                "triple_button_4",
            ]),
        ],
        extend: [
            m.battery({percentage: true, percentageReporting: true}),
            m.deviceAddCustomCluster("customSonoffSnzb01m", {
                ID: 0xfc12,
                attributes: {
                    keyActionEvent: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SNZB-02P"],
        model: "SNZB-02P",
        vendor: "SONOFF",
        description: "Temperature and humidity sensor",
        ota: true,
        extend: [
            m.deviceAddCustomCluster("customSonoffSnzb02p", {
                ID: 0xfc11,
                attributes: {
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16, write: true, min: -32768},
                    humidityCalibration: {ID: 0x2004, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.battery({percentage: true}),
            m.temperature(),
            m.humidity(),
            m.bindCluster({cluster: "genPollCtrl", clusterType: "input"}),
            m.numeric<"customSonoffSnzb02p", SonoffSnzb02p>({
                name: "temperature_calibration",
                cluster: "customSonoffSnzb02p",
                attribute: "temperatureCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported temperature",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "°C",
            }),
            m.numeric<"customSonoffSnzb02p", SonoffSnzb02p>({
                name: "humidity_calibration",
                cluster: "customSonoffSnzb02p",
                attribute: "humidityCalibration",
                entityCategory: "config",
                description: "Offset to add/subtract to the reported relative humidity",
                valueMin: -50,
                valueMax: 50,
                scale: 100,
                valueStep: 0.1,
                unit: "%",
            }),
        ],
    },
    {
        zigbeeModel: ["SNZB-04P"],
        model: "SNZB-04P",
        vendor: "SONOFF",
        description: "Contact sensor",
        extend: [
            m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]}),
            m.binary({
                name: "tamper",
                cluster: 0xfc11,
                attribute: {ID: 0x2000, type: 0x20},
                description: "Tamper-proof status",
                valueOn: [true, 0x01],
                valueOff: [false, 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                access: "STATE_GET",
            }),
            ewelinkBattery(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SNZB-04PR2"],
        model: "SNZB-04PR2",
        vendor: "SONOFF",
        description: "Contact sensor",
        extend: [
            m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]}),
            m.binary({
                name: "tamper",
                cluster: 0xfc11,
                attribute: {ID: 0x2000, type: 0x20},
                description: "Tamper-proof status",
                valueOn: [true, 0x01],
                valueOff: [false, 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                access: "STATE_GET",
            }),
            ewelinkBattery(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SNZB-03P"],
        model: "SNZB-03P",
        vendor: "SONOFF",
        description: "Zigbee PIR sensor",
        extend: [
            m.occupancy(),
            m.numeric({
                name: "motion_timeout",
                cluster: 0x0406,
                attribute: {ID: 0x0020, type: 0x21},
                description: "Occupied to unoccupied delay",
                valueMin: 5,
                valueMax: 60,
            }),
            m.enumLookup({
                name: "illumination",
                lookup: {dim: 0, bright: 1},
                cluster: 0xfc11,
                attribute: {ID: 0x2001, type: 0x20},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                description: "Only updated when occupancy is detected",
                access: "STATE",
            }),
            ewelinkBattery(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SNZB-05P"],
        model: "SNZB-05P",
        vendor: "SONOFF",
        ota: true,
        description: "Zigbee water sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "battery_low"]})],
    },
    {
        zigbeeModel: ["SNZB-06P"],
        model: "SNZB-06P",
        vendor: "SONOFF",
        description: "Zigbee occupancy sensor",
        extend: [
            m.occupancy({reporting: false}),
            m.numeric({
                name: "occupancy_timeout",
                cluster: 0x0406,
                attribute: {ID: 0x0020, type: 0x21},
                description: "Occupied to unoccupied delay",
                valueMin: 15,
                valueMax: 65535,
            }),
            m.enumLookup({
                name: "occupancy_sensitivity",
                lookup: {low: 1, medium: 2, high: 3},
                cluster: 0x0406,
                attribute: {ID: 0x0022, type: 0x20},
                description: "Sensitivity of human presence detection",
            }),
            m.enumLookup({
                name: "illumination",
                lookup: {dim: 0, bright: 1},
                cluster: 0xfc11,
                attribute: {ID: 0x2001, type: 0x20},
                description: "Only updated when occupancy is detected",
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                access: "STATE",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["MG1_5RZ"],
        model: "MG1_5RZ",
        vendor: "SONOFF",
        description: "Zigbee human presence radar (5.8 GHz)",
        extend: [
            m.occupancy({reporting: false}),
            m.numeric({
                name: "occupied_to_unoccupied_delay",
                cluster: 0x0406,
                attribute: {ID: 0x0020, type: 0x21},
                description: "Ultrasonic occupied → unoccupied delay (seconds)",
                valueMin: 60,
                valueMax: 65535,
            }),
            m.numeric({
                name: "unoccupied_to_occupied_delay",
                cluster: 0x0406,
                attribute: {ID: 0x0021, type: 0x21},
                description: "Ultrasonic unoccupied → occupied delay (seconds)",
                valueMin: 0,
                valueMax: 65535,
            }),
            m.enumLookup({
                name: "occupancy_sensitivity",
                lookup: {low: 1, medium: 2, high: 3},
                cluster: 0x0406,
                attribute: {ID: 0x0022, type: 0x20},
                description: "Sensitivity of human presence detection",
            }),
        ],
        ota: false,
    },
    {
        zigbeeModel: ["TRVZB"],
        model: "TRVZB",
        vendor: "SONOFF",
        description: "Zigbee thermostatic radiator valve",
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 35, 0.5)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-12.7, 12.7, 0.2)
                .withSystemMode(["off", "auto", "heat"], ea.ALL, "Mode of the thermostat")
                .withRunningState(["idle", "heat"], ea.STATE_GET),
            e.battery(),
        ],
        fromZigbee: [fz.thermostat, fz.battery],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
        ],
        extend: [
            m.customLocalTemperatureCalibrationRange({min: -12.7, max: 12.7}),
            m.deviceAddCustomCluster("customSonoffTrvzb", {
                ID: 0xfc11,
                attributes: {
                    childLock: {ID: 0x0000, type: Zcl.DataType.BOOLEAN, write: true},
                    tamper: {ID: 0x2000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    illumination: {ID: 0x2001, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    openWindow: {ID: 0x6000, type: Zcl.DataType.BOOLEAN, write: true},
                    frostProtectionTemperature: {ID: 0x6002, type: Zcl.DataType.INT16, write: true, min: -32768},
                    idleSteps: {ID: 0x6003, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    closingSteps: {ID: 0x6004, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    valveOpeningLimitVoltage: {ID: 0x6005, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    valveClosingLimitVoltage: {ID: 0x6006, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    valveMotorRunningVoltage: {ID: 0x6007, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    valveOpeningDegree: {ID: 0x600b, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    valveClosingDegree: {ID: 0x600c, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    tempAccuracy: {ID: 0x6011, type: Zcl.DataType.INT16, write: true, min: -32768},
                    temporaryMode: {ID: 0x6014, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    temporaryModeTime: {ID: 0x6015, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                    temporaryModeTemp: {ID: 0x6016, type: Zcl.DataType.INT16, write: true, min: -32768},
                    externalTemperatureInput: {
                        ID: 0x600d,
                        type: Zcl.DataType.INT16,

                        write: true,
                        min: -32768,
                    },
                    temperatureSensorSelect: {
                        ID: 0x600e,
                        type: Zcl.DataType.UINT8,

                        write: true,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "timer_mode_target_temp",
                cluster: "customSonoffTrvzb",
                attribute: "temporaryModeTemp",
                entityCategory: "config",
                description: "In timer mode, the temperature can be set to 4-35 ℃.",
                valueMin: 4.0,
                valueMax: 35.0,
                valueStep: 0.5,
                unit: "°C",
                scale: 100,
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "temporary_mode_duration",
                cluster: "customSonoffTrvzb",
                attribute: "temporaryModeTime",
                entityCategory: "config",
                description:
                    "Boost Mode: Sets maximum TRV temperature for up to 180 minutes." +
                    "Timer Mode: Customizes temperature and duration, up to 24 hours.",
                valueMin: 0,
                valueMax: 1440,
                valueStep: 1,
                unit: "minutes",
                scale: 60,
            }),
            m.enumLookup<"customSonoffTrvzb", SonoffTrvzb>({
                name: "temporary_mode_select",
                label: "Temporary mode ",
                lookup: {boost: 0, timer: 1},
                cluster: "customSonoffTrvzb",
                attribute: "temporaryMode",
                entityCategory: "config",
                description:
                    "Boost mode: Activates maximum TRV temperature for a user-defined duration, enabling rapid heating. " +
                    "Timer Mode: Allows customization of temperature and duration for precise heating control." +
                    "After the set duration, the system will return to its previous normal mode and temperature.",
            }),
            m.binary<"customSonoffTrvzb", SonoffTrvzb>({
                name: "child_lock",
                cluster: "customSonoffTrvzb",
                attribute: "childLock",
                entityCategory: "config",
                description: "Enables/disables physical input on the device",
                valueOn: ["LOCK", 0x01],
                valueOff: ["UNLOCK", 0x00],
            }),
            m.binary<"customSonoffTrvzb", SonoffTrvzb>({
                name: "open_window",
                cluster: "customSonoffTrvzb",
                attribute: "openWindow",
                entityCategory: "config",
                description: "Automatically turns off the radiator when local temperature drops by more than 1.5°C in 4.5 minutes.",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "frost_protection_temperature",
                cluster: "customSonoffTrvzb",
                attribute: "frostProtectionTemperature",
                entityCategory: "config",
                description: "Minimum temperature at which to automatically turn on the radiator, if system mode is off, to prevent pipes freezing.",
                valueMin: 4.0,
                valueMax: 35.0,
                valueStep: 0.5,
                unit: "°C",
                scale: 100,
            }),
            m.enumLookup<"customSonoffTrvzb", SonoffTrvzb>({
                name: "temperature_sensor_select",
                label: "Temperature sensor",
                lookup: {internal: 0, external: 1, external_2: 2, external_3: 3},
                cluster: "customSonoffTrvzb",
                attribute: "temperatureSensorSelect",
                description:
                    "Whether to use the value of the internal temperature sensor or an external temperature sensor for the perceived local temperature. Using an external sensor does not require local temperature calibration.",
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "external_temperature_input",
                label: "External temperature",
                cluster: "customSonoffTrvzb",
                attribute: "externalTemperatureInput",
                entityCategory: "config",
                description:
                    "The value of an external temperature sensor. Note: synchronisation of this value with the external temperature sensor needs to happen outside of Zigbee2MQTT.",
                valueMin: 0.0,
                valueMax: 99.9,
                valueStep: 0.1,
                unit: "°C",
                scale: 100,
                precision: 1,
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "idle_steps",
                cluster: "customSonoffTrvzb",
                attribute: "idleSteps",
                entityCategory: "diagnostic",
                description: "Number of steps used for calibration (no-load steps)",
                access: "STATE_GET",
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "closing_steps",
                cluster: "customSonoffTrvzb",
                attribute: "closingSteps",
                entityCategory: "diagnostic",
                description: "Number of steps it takes to close the valve",
                access: "STATE_GET",
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "valve_opening_limit_voltage",
                cluster: "customSonoffTrvzb",
                attribute: "valveOpeningLimitVoltage",
                entityCategory: "diagnostic",
                description: "Valve opening limit voltage",
                unit: "mV",
                access: "STATE_GET",
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "valve_closing_limit_voltage",
                cluster: "customSonoffTrvzb",
                attribute: "valveClosingLimitVoltage",
                entityCategory: "diagnostic",
                description: "Valve closing limit voltage",
                unit: "mV",
                access: "STATE_GET",
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "valve_motor_running_voltage",
                cluster: "customSonoffTrvzb",
                attribute: "valveMotorRunningVoltage",
                entityCategory: "diagnostic",
                description: "Valve motor running voltage",
                unit: "mV",
                access: "STATE_GET",
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "valve_opening_degree",
                cluster: "customSonoffTrvzb",
                attribute: "valveOpeningDegree",
                entityCategory: "config",
                description:
                    "Valve open position (percentage) control. " +
                    "If the opening degree is set to 100%, the valve is fully open when it is opened. " +
                    "If the opening degree is set to 0%, the valve is fully closed when it is opened, " +
                    "and the default value is 100%. " +
                    "Note: only version v1.1.4 or higher is supported.",
                valueMin: 0.0,
                valueMax: 100.0,
                valueStep: 1.0,
                unit: "%",
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "valve_closing_degree",
                cluster: "customSonoffTrvzb",
                attribute: "valveClosingDegree",
                entityCategory: "config",
                description:
                    "Valve closed position (percentage) control. " +
                    "If the closing degree is set to 100%, the valve is fully closed when it is closed. " +
                    "If the closing degree is set to 0%, the valve is fully opened when it is closed, " +
                    "and the default value is 100%. " +
                    "Note: Only version v1.1.4 or higher is supported.",
                valueMin: 0.0,
                valueMax: 100.0,
                valueStep: 1.0,
                unit: "%",
            }),
            m.numeric<"customSonoffTrvzb", SonoffTrvzb>({
                name: "temperature_accuracy",
                cluster: "customSonoffTrvzb",
                attribute: "tempAccuracy",
                entityCategory: "config",
                description:
                    "Temperature control accuracy. " +
                    "The range is -0.2 ~ -1°C, with an interval of 0.2, and the default is -1. " +
                    "If the temperature control accuracy is selected as -1°C (default value) and the target temperature is 26 degrees, " +
                    "then TRVZB will close the valve when the room temperature reaches 26 degrees and open the valve at 25 degrees. " +
                    "If -0.4°C is chosen as the temperature control accuracy, then the valve will close when the room temperature reaches 26 degrees and open at 25.6 degrees." +
                    "Note: Only version v1.3.0 or higher is supported.",
                valueMin: -1.0,
                valueMax: -0.2,
                valueStep: 0.2,
                unit: "°C",
                scale: 100,
            }),
            sonoffExtend.weeklySchedule(),
            m.customTimeResponse("1970_UTC"),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await endpoint.read("hvacThermostat", ["localTemperatureCalibration"]);
            await endpoint.read(0xfc11, [0x0000, 0x6000, 0x6002, 0x6003, 0x6004, 0x6005, 0x6006, 0x6007, 0x600e]);
        },
    },
    {
        zigbeeModel: ["S60ZBTPF", "S60ZBTPG"],
        model: "S60ZBTPF",
        vendor: "SONOFF",
        description: "Zigbee smart plug",
        whiteLabel: [{vendor: "SONOFF", model: "S60ZBTPG", fingerprint: [{modelID: "S60ZBTPG"}]}],
        fromZigbee: [fzLocal.on_off_clear_electricity, fz.metering],
        exposes: [e.energy()],
        extend: [
            m.onOff({
                powerOnBehavior: true,
                skipDuplicateTransaction: true,
                configureReporting: true,
            }),
            sonoffExtend.addCustomClusterEwelink(),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "current",
                cluster: "customClusterEwelink",
                attribute: "acCurrentCurrentValue",
                description: "Current",
                unit: "A",
                access: "STATE_GET",
                // https://github.com/Koenkk/zigbee2mqtt/issues/28470#issuecomment-3369116710
                reporting: {min: "10_SECONDS", max: "MAX", change: 2},
                fzConvert: (model, msg, publish, options, meta) => {
                    // Device keeps reporting a acCurrentCurrentValue after turning OFF.
                    // Make sure power = 0 when turned OFF
                    // https://github.com/Koenkk/zigbee2mqtt/issues/28470
                    if ("acCurrentCurrentValue" in msg.data) {
                        return {current: meta.state.state === "ON" ? msg.data.acCurrentCurrentValue / 1000 : 0};
                    }
                },
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "voltage",
                cluster: "customClusterEwelink",
                attribute: "acCurrentVoltageValue",
                description: "Voltage",
                unit: "V",
                scale: 1000,
                access: "STATE_GET",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "power",
                cluster: "customClusterEwelink",
                attribute: "acCurrentPowerValue",
                description: "Active power",
                unit: "W",
                access: "STATE_GET",
                reporting: {min: "10_SECONDS", max: "MAX", change: 0},
                fzConvert: (model, msg, publish, options, meta) => {
                    // Device keeps reporting a acCurrentPowerValue after turning OFF.
                    // Make sure power = 0 when turned OFF
                    // https://github.com/Koenkk/zigbee2mqtt/issues/28470
                    if ("acCurrentPowerValue" in msg.data) {
                        return {power: meta.state.state === "ON" ? msg.data.acCurrentPowerValue / 1000 : 0};
                    }
                },
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "energy_yesterday",
                label: "Energy yesterday",
                cluster: "customClusterEwelink",
                attribute: "energyYesterday",
                description: "Electricity consumption for the yesterday",
                unit: "kWh",
                scale: 1000,
                access: "STATE_GET",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "energy_today",
                label: "Energy today",
                cluster: "customClusterEwelink",
                attribute: "energyToday",
                description: "Electricity consumption for the day",
                unit: "kWh",
                scale: 1000,
                access: "STATE_GET",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "energy_month",
                label: "Energy month",
                cluster: "customClusterEwelink",
                attribute: "energyMonth",
                description: "Electricity consumption for the month",
                unit: "kWh",
                scale: 1000,
                access: "STATE_GET",
            }),
            sonoffExtend.inchingControlSet(),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "outlet_control_protect",
                cluster: "customClusterEwelink",
                attribute: "outlet_control_protect",
                description: "Outlet overload protection Settings",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.overloadProtection(4000, 17),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "customClusterEwelink", "seMetering"]);
            await reporting.onOff(endpoint, {min: 1, max: 1800, change: 0});
            await endpoint.read<"customClusterEwelink", SonoffEwelink>(
                "customClusterEwelink",
                ["acCurrentCurrentValue", "acCurrentVoltageValue", "acCurrentPowerValue", 0x7003, "outlet_control_protect"],
                defaultResponseOptions,
            );
            await endpoint.configureReporting<"customClusterEwelink", SonoffEwelink>("customClusterEwelink", [
                {attribute: "energyMonth", minimumReportInterval: 60, maximumReportInterval: 3600, reportableChange: 50},
                {attribute: "energyYesterday", minimumReportInterval: 60, maximumReportInterval: 3600, reportableChange: 50},
                {attribute: "energyToday", minimumReportInterval: 60, maximumReportInterval: 3600, reportableChange: 50},
            ]);
            await endpoint.read("seMetering", ["multiplier", "divisor"]);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ["SWV"],
        model: "SWV",
        vendor: "SONOFF",
        description: "Zigbee smart water valve",
        fromZigbee: [fz.flow],
        toZigbee: [tzLocal.on_off_fixed_on_time],
        exposes: [e.numeric("flow", ea.STATE).withDescription("Current water flow").withUnit("m³/h")],
        extend: [
            m.battery(),
            m.onOff({
                powerOnBehavior: false,
                skipDuplicateTransaction: true,
                configureReporting: true,
            }),
            sonoffExtend.addCustomClusterEwelink(),
            m.enumLookup({
                name: "current_device_status",
                lookup: {normal_state: 0, water_shortage: 1, water_leakage: 2, "water_shortage & water_leakage": 3},
                cluster: "customClusterEwelink",
                attribute: {ID: 0x500c, type: 0x20},
                description: "The water valve is in normal state, water shortage or water leakage",
                access: "STATE_GET",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "auto_close_when_water_shortage",
                cluster: "customClusterEwelink",
                attribute: "lackWaterCloseValveTimeout",
                description:
                    "Automatically shut down the water valve after the water shortage exceeds 30 minutes. Requires firmware version 1.0.4 or later!",
                valueOff: ["DISABLE", 0],
                valueOn: ["ENABLE", 30],
            }),
            sonoffExtend.cyclicTimedIrrigation(),
            sonoffExtend.cyclicQuantitativeIrrigation(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msFlowMeasurement"]);
            await reporting.onOff(endpoint, {min: 1, max: 1800, change: 0});
            await endpoint.read("customClusterEwelink", [0x500c, 0x5011]);
        },
    },
    {
        zigbeeModel: ["ZBMicro"],
        model: "ZBMicro",
        vendor: "SONOFF",
        description: "Zigbee USB repeater plug",
        extend: [
            m.onOff(),
            sonoffExtend.addCustomClusterEwelink(),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "rf_turbo_mode",
                cluster: "customClusterEwelink",
                attribute: "radioPowerWithManuCode",
                zigbeeCommandOptions: manufacturerOptions,
                description: "Enable/disable Radio power turbo mode",
                valueOff: [false, 0x09],
                valueOn: [true, 0x14],
                entityCategory: "config",
            }),
            sonoffExtend.inchingControlSet(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint, {min: 1, max: 1800, change: 0});
            await endpoint.read<"customClusterEwelink", SonoffEwelink>("customClusterEwelink", ["radioPowerWithManuCode"], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ["ZBMINIR2"],
        model: "ZBMINIR2",
        vendor: "SONOFF",
        description: "Zigbee smart switch",
        exposes: [],
        extend: [
            m.commandsOnOff({commands: ["toggle"]}),
            m.onOff({configureReporting: false}),
            sonoffExtend.addCustomClusterEwelink(),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "network_indicator",
                cluster: "customClusterEwelink",
                attribute: "networkLed",
                description: "Network indicator Settings, turn off/turn on the online network indicator.",
                entityCategory: "config",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "turbo_mode",
                cluster: "customClusterEwelink",
                attribute: "radioPower",
                description: "Enable/disable Radio power turbo mode",
                entityCategory: "config",
                valueOff: [false, 0x09],
                valueOn: [true, 0x14],
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_state",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnState",
                description: "Delayed Power-on State",
                entityCategory: "config",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_time",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnTime",
                description: "Delayed Power-on time",
                entityCategory: "config",
                valueMin: 0.5,
                valueMax: 3599.5,
                valueStep: 0.5,
                unit: "seconds",
                scale: 2,
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "detach_relay_mode",
                cluster: "customClusterEwelink",
                attribute: "detachRelayMode",
                description: "Enable/Disable detach relay mode",
                entityCategory: "config",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.externalSwitchTriggerMode(),
            sonoffExtend.inchingControlSet(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint, {min: 1, max: 1800, change: 0});
            await endpoint.read<"customClusterEwelink", SonoffEwelink>(
                "customClusterEwelink",
                ["radioPower", 0x0001, 0x0014, 0x0015, 0x0016, 0x0017],
                defaultResponseOptions,
            );
        },
    },
    {
        zigbeeModel: ["ZBM5-1C-120"],
        model: "ZBM5-1C-120",
        vendor: "SONOFF",
        description: "Zigbee Smart one-channel wall switch (type 120).",
        ota: true,
        extend: [
            m.commandsOnOff({commands: ["toggle"]}),
            m.onOff(),
            sonoffExtend.addCustomClusterEwelink(),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "device_work_mode",
                lookup: {"Zigbee end device": 0, "Zigbee router": 1},
                cluster: "customClusterEwelink",
                attribute: "deviceWorkMode",
                description: "The device runs as a Zigbee End device or Zigbee router.",
                access: "STATE_GET",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "network_indicator",
                cluster: "customClusterEwelink",
                attribute: "networkLed",
                description: "Network indicator settings, turn off/on the blue online status network indicator.",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.detachRelayModeControl(1),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint1, {min: 1, max: 1800, change: 0});
            await endpoint1.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0010, 0x0018, 0x0019], defaultResponseOptions);
        },
    },
    {
        zigbeeModel: ["ZBM5-2C-120"],
        model: "ZBM5-2C-120",
        vendor: "SONOFF",
        description: "Zigbee Smart two-channel wall switch (type 120).",
        exposes: [],
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.commandsOnOff({commands: ["toggle"], endpointNames: ["l1", "l2"]}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            sonoffExtend.addCustomClusterEwelink(),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "device_work_mode",
                lookup: {"Zigbee end device": 0, "Zigbee router": 1},
                cluster: "customClusterEwelink",
                attribute: "deviceWorkMode",
                description: "The device runs as a Zigbee End device or Zigbee router.",
                access: "STATE_GET",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "network_indicator",
                cluster: "customClusterEwelink",
                attribute: "networkLed",
                description: "Network indicator settings, turn off/on the blue online status network indicator.",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.detachRelayModeControl(2),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint1, {min: 1, max: 1800, change: 0});
            await endpoint1.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0010, 0x0018, 0x0019], defaultResponseOptions);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint2, {min: 1, max: 1805, change: 0});
            await endpoint2.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
        },
    },
    {
        zigbeeModel: ["ZBM5-3C-120"],
        model: "ZBM5-3C-120",
        vendor: "SONOFF",
        description: "Zigbee Smart three-channel wall switch (type 120).",
        exposes: [],
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            m.commandsOnOff({commands: ["toggle"], endpointNames: ["l1", "l2", "l3"]}),
            m.onOff({endpointNames: ["l1", "l2", "l3"]}),
            sonoffExtend.addCustomClusterEwelink(),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "device_work_mode",
                lookup: {"Zigbee end device": 0, "Zigbee router": 1},
                cluster: "customClusterEwelink",
                attribute: "deviceWorkMode",
                description: "The device runs as a Zigbee End device or Zigbee router.",
                access: "STATE_GET",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "network_indicator",
                cluster: "customClusterEwelink",
                attribute: "networkLed",
                description: "Network indicator settings, turn off/on the blue online status network indicator.",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.detachRelayModeControl(3),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint1, {min: 1, max: 1800, change: 0});
            await endpoint1.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0010, 0x0018, 0x0019], defaultResponseOptions);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint2, {min: 1, max: 1805, change: 0});
            await endpoint2.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint3, {min: 1, max: 1810, change: 0});
            await endpoint3.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
        },
    },
    {
        zigbeeModel: ["ZBM5-1C-80/86"],
        model: "ZBM5-1C-80/86",
        vendor: "SONOFF",
        description: "Zigbee Smart one-channel wall switch (type 80/86).",
        ota: true,
        extend: [
            m.commandsOnOff({commands: ["toggle"]}),
            m.onOff(),
            sonoffExtend.addCustomClusterEwelink(),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "device_work_mode",
                lookup: {"Zigbee end device": 0, "Zigbee router": 1},
                cluster: "customClusterEwelink",
                attribute: "deviceWorkMode",
                description: "The device runs as a Zigbee End device or Zigbee router.",
                access: "STATE_GET",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "network_indicator",
                cluster: "customClusterEwelink",
                attribute: "networkLed",
                description: "Network indicator settings, turn off/on the blue online status network indicator.",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.detachRelayModeControl(1),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint1, {min: 1, max: 1800, change: 0});
            await endpoint1.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0010, 0x0018, 0x0019], defaultResponseOptions);
        },
    },
    {
        zigbeeModel: ["ZBM5-2C-80/86"],
        model: "ZBM5-2C-80/86",
        vendor: "SONOFF",
        description: "Zigbee Smart two-channel wall switch (type 80/86).",
        exposes: [],
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.commandsOnOff({commands: ["toggle"], endpointNames: ["l1", "l2"]}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            sonoffExtend.addCustomClusterEwelink(),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "device_work_mode",
                lookup: {"Zigbee end device": 0, "Zigbee router": 1},
                cluster: "customClusterEwelink",
                attribute: "deviceWorkMode",
                description: "The device runs as a Zigbee End device or Zigbee router.",
                access: "STATE_GET",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "network_indicator",
                cluster: "customClusterEwelink",
                attribute: "networkLed",
                description: "Network indicator settings, turn off/on the blue online status network indicator.",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.detachRelayModeControl(2),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint1, {min: 1, max: 1800, change: 0});
            await endpoint1.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0010, 0x0018, 0x0019], defaultResponseOptions);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint2, {min: 1, max: 1805, change: 0});
            await endpoint2.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
        },
    },
    {
        zigbeeModel: ["ZBM5-3C-80/86"],
        model: "ZBM5-3C-80/86",
        vendor: "SONOFF",
        description: "Zigbee Smart three-channel wall switch (type 80/86).",
        exposes: [],
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            m.commandsOnOff({commands: ["toggle"], endpointNames: ["l1", "l2", "l3"]}),
            m.onOff({endpointNames: ["l1", "l2", "l3"]}),
            sonoffExtend.addCustomClusterEwelink(),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "device_work_mode",
                lookup: {"Zigbee end device": 0, "Zigbee router": 1},
                cluster: "customClusterEwelink",
                attribute: "deviceWorkMode",
                description: "The device runs as a Zigbee End device or Zigbee router.",
                access: "STATE_GET",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "network_indicator",
                cluster: "customClusterEwelink",
                attribute: "networkLed",
                description: "Network indicator settings, turn off/on the blue online status network indicator.",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.detachRelayModeControl(3),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint1, {min: 1, max: 1800, change: 0});
            await endpoint1.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0010, 0x0018, 0x0019], defaultResponseOptions);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint2, {min: 1, max: 1805, change: 0});
            await endpoint2.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint3, {min: 1, max: 1810, change: 0});
            await endpoint3.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
        },
    },
    {
        zigbeeModel: ["MINI-ZBRBS"],
        model: "MINI-ZBRBS",
        vendor: "SONOFF",
        description: "Zigbee smart roller shutter switch",
        extend: [
            sonoffExtend.addCustomClusterEwelink(),
            m.windowCovering({controls: ["lift"], coverInverted: false}),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "motor_travel_calibration_action",
                lookup: {
                    start_automatic: 2,
                    start_manual: 3,
                    clear: 4,
                    manual_2_fully_opened: 7,
                    manual_3_fully_closed: 8,
                },
                cluster: "customClusterEwelink",
                attribute: "motorTravelCalibrationAction",
                description: "Calibrates the motor stroke, or clears the current one.",
                access: "ALL",
            }),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "motor_travel_calibration_status",
                lookup: {Uncalibrated: 0, Calibrated: 1},
                cluster: "customClusterEwelink",
                attribute: "motorTravelCalibrationStatus",
                description: "The calibration status of the curtain motor's stroke.",
                access: "STATE_GET",
            }),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "motor_run_status",
                lookup: {Stop: 0, Forward: 1, Reverse: 2},
                cluster: "customClusterEwelink",
                attribute: "motorRunStatus",
                description: "The motor's current operating status, such as forward rotation, reverse rotation, and stop.",
                access: "STATE_GET",
            }),
            sonoffExtend.externalSwitchTriggerMode(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read<"customClusterEwelink", SonoffEwelink>(
                "customClusterEwelink",
                ["radioPower", 0x0016, 0x5012, 0x5013],
                defaultResponseOptions,
            );
        },
    },
    {
        zigbeeModel: ["MINI-ZB2GS"],
        model: "MINI-ZB2GS",
        vendor: "SONOFF",
        description: "Zigbee dual-channel smart switch",
        exposes: [],
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.commandsOnOff({commands: ["toggle"], endpointNames: ["l1", "l2"]}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            sonoffExtend.addCustomClusterEwelink(),
            sonoffExtend.externalSwitchTriggerMode({endpointNames: ["l1", "l2"]}),
            sonoffExtend.detachRelayModeControl(2),
            sonoffExtend.inchingControlSet({endpointNames: ["l1", "l2"]}),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "network_indicator",
                cluster: "customClusterEwelink",
                attribute: "networkLed",
                description: "Network indicator settings, turn off/on the blue online status network indicator.",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "turbo_mode",
                cluster: "customClusterEwelink",
                attribute: "radioPower",
                description: "Enable/disable Radio power turbo mode",
                entityCategory: "config",
                valueOff: [false, 0x09],
                valueOn: [true, 0x14],
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_state_channel_1",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnState",
                description: "Delayed Power-on State(Channel 1)",
                entityCategory: "config",
                valueOff: [false, 0],
                valueOn: [true, 1],
                endpointName: "l1",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_state_channel_2",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnState",
                description: "Delayed Power-on State(Channel 2)",
                entityCategory: "config",
                valueOff: [false, 0],
                valueOn: [true, 1],
                endpointName: "l2",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_time",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnTime",
                description: "Delayed Power-on time",
                entityCategory: "config",
                valueMin: 0.5,
                valueMax: 3599.5,
                valueStep: 0.5,
                unit: "seconds",
                scale: 2,
                endpointNames: ["l1", "l2"],
            }),
            sonoffExtend.programmableStepperSequence(["1", "2", "3", "4"]),
        ],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint1, {min: 1, max: 1800, change: 0});
            await endpoint1.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0014, 0x0015, 0x0016, 0x0019], defaultResponseOptions);
            await endpoint1.configureReporting<"customClusterEwelink", SonoffEwelink>("customClusterEwelink", [
                {attribute: "externalTriggerMode", minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 1},
            ]);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint2, {min: 1, max: 1800, change: 0});
            await endpoint2.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0014, 0x0015, 0x0016], defaultResponseOptions);
            await endpoint2.configureReporting<"customClusterEwelink", SonoffEwelink>("customClusterEwelink", [
                {attribute: "externalTriggerMode", minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 1},
            ]);
        },
    },
    {
        zigbeeModel: ["MINI-ZB2GS-L"],
        model: "MINI-ZB2GS-L",
        vendor: "SONOFF",
        description: "Zigbee dual-channel smart switch",
        exposes: [],
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.commandsOnOff({commands: ["toggle"], endpointNames: ["l1", "l2"]}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            sonoffExtend.addCustomClusterEwelink(),
            sonoffExtend.externalSwitchTriggerMode({endpointNames: ["l1", "l2"]}),
            sonoffExtend.detachRelayModeControl(2),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_state_channel_1",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnState",
                description: "Delayed Power-on State(Channel 1)",
                entityCategory: "config",
                valueOff: [false, 0],
                valueOn: [true, 1],
                endpointName: "l1",
            }),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_state_channel_2",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnState",
                description: "Delayed Power-on State(Channel 2)",
                entityCategory: "config",
                valueOff: [false, 0],
                valueOn: [true, 1],
                endpointName: "l2",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_time",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnTime",
                description: "Delayed Power-on time",
                entityCategory: "config",
                valueMin: 0.5,
                valueMax: 3599.5,
                valueStep: 0.5,
                unit: "seconds",
                scale: 2,
                endpointNames: ["l1", "l2"],
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint1, {min: 1, max: 1800, change: 0});
            await endpoint1.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0014, 0x0015, 0x0016, 0x0019], defaultResponseOptions);
            await endpoint1.configureReporting<"customClusterEwelink", SonoffEwelink>("customClusterEwelink", [
                {attribute: "externalTriggerMode", minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 1},
            ]);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
            await reporting.onOff(endpoint2, {min: 1, max: 1800, change: 0});
            await endpoint2.read("genOnOff", [0x0000, 0x4003], defaultResponseOptions);
            await endpoint1.read("customClusterEwelink", [0x0014, 0x0015, 0x0016], defaultResponseOptions);
            await endpoint2.configureReporting<"customClusterEwelink", SonoffEwelink>("customClusterEwelink", [
                {attribute: "externalTriggerMode", minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 1},
            ]);
        },
    },
    {
        zigbeeModel: ["MINI-ZBDIM"],
        model: "MINI-ZBDIM",
        vendor: "SONOFF",
        description: "Zigbee smart mini dimmer switch",
        extend: [
            m.light({
                effect: false,
                powerOnBehavior: true,
                configureReporting: true,
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "current",
                cluster: "customClusterEwelink",
                attribute: "acCurrentCurrentValue",
                description: "Current",
                unit: "A",
                valueStep: 0.01,
                scale: 1000,
                access: "STATE_GET",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "voltage",
                cluster: "customClusterEwelink",
                attribute: "acCurrentVoltageValue",
                description: "Voltage",
                unit: "V",
                scale: 1000,
                access: "STATE_GET",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "power",
                cluster: "customClusterEwelink",
                attribute: "acCurrentPowerValue",
                description: "Active power",
                unit: "W",
                scale: 1000,
                access: "STATE_GET",
                reporting: {min: "10_SECONDS", max: "MAX", change: 0},
            }),
            sonoffExtend.addCustomClusterEwelink(),
            m.binary<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_state",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnState",
                description: "Delayed Power-on State",
                entityCategory: "config",
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "delayed_power_on_time",
                cluster: "customClusterEwelink",
                attribute: "delayedPowerOnTime",
                description: "Delayed Power-on time",
                entityCategory: "config",
                valueMin: 0.5,
                valueMax: 3599.5,
                valueStep: 0.5,
                unit: "seconds",
                scale: 2,
            }),
            sonoffExtend.inchingControlSet({}, 86399.5),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "external_trigger_mode",
                lookup: {edge: 0, pulse: 1, "double pulse": 3, "triple pulse": 4},
                cluster: "customClusterEwelink",
                attribute: "externalTriggerMode",
                access: "ALL",
                entityCategory: "config",
                description:
                    "External trigger mode, which can be one of edge, pulse,double pulse,triple pulse." +
                    "The appropriate triggering mode can be selected according to the type of external switch to achieve a better use experience.",
            }),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "set_calibration_action",
                lookup: {start: [0x03, 0x01, 0x01, 0x01], stop: [0x03, 0x01, 0x01, 0x02], clear: [0x03, 0x01, 0x01, 0x03]},
                cluster: "customClusterEwelink",
                attribute: "setCalibrationAction",
                description:
                    "After calibration, the light adjustment becomes smooth and consistent.. Takes about 2 minutes; device unavailable during calibration.",
                access: "ALL",
                entityCategory: "config",
            }),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "calibration_status",
                lookup: {uncalibrate: 0, cailbrating: 1, calibration_failed: 2, calibrated: 3},
                cluster: "customClusterEwelink",
                attribute: "calibrationStatus",
                description: "Calibration status.",
                access: "STATE_GET",
                entityCategory: "diagnostic",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "calibration_progress",
                access: "STATE_GET",
                cluster: "customClusterEwelink",
                attribute: "calibrationProgress",
                description: "Calibration progress.",
                entityCategory: "diagnostic",
                valueMin: 0,
                valueMax: 100,
                valueStep: 1,
                unit: "%",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "min_brightness_threshold",
                access: "ALL",
                cluster: "customClusterEwelink",
                attribute: "minBrightnessThreshold",
                description: "Lowest brightness level mapped to 1 % on the dimmer slider.",
                entityCategory: "config",
                valueMin: 1,
                valueMax: 50,
                valueStep: 1,
                unit: "%",
                scale: 2.55,
                precision: 0,
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "transition_time",
                access: "ALL",
                cluster: "customClusterEwelink",
                attribute: "transitionTime",
                description: "Transition time",
                entityCategory: "config",
                valueMin: 0,
                valueMax: 5,
                valueStep: 0.1,
                unit: "s",
                scale: 10,
            }),
            m.enumLookup<"customClusterEwelink", SonoffEwelink>({
                name: "dimming_light_rate",
                lookup: {"1x": 1, "2x": 2, "3x": 3, "4x": 4, "5x": 5},
                cluster: "customClusterEwelink",
                attribute: "dimmingLightRate",
                description: "Speed of brightness change via external switch.",
                access: "ALL",
                entityCategory: "config",
            }),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read<"customClusterEwelink", SonoffEwelink>(
                "customClusterEwelink",
                [0x0016, 0x001e, 0x4001, 0x4003],
                defaultResponseOptions,
            );
        },
    },
    {
        zigbeeModel: ["SWV-ZNE", "SWV-ZFE", "SWV-ZNU", "SWV-ZFU"],
        model: "SWV-ZNE",
        vendor: "SONOFF",
        whiteLabel: [
            {model: "SWV-ZNU", vendor: "SONOFF", fingerprint: [{modelID: "SWV-ZNU"}]},
            {model: "SWV-ZFE", vendor: "SONOFF", fingerprint: [{modelID: "SWV-ZFE"}]},
            {model: "SWV-ZFU", vendor: "SONOFF", fingerprint: [{modelID: "SWV-ZFU"}]},
        ],
        description: "Zigbee smart water valve",
        extend: [
            m.deviceAddCustomCluster("customClusterEwelink", {
                ID: 0xfc11,
                attributes: {
                    childLock: {ID: 0x0000, type: Zcl.DataType.BOOLEAN, write: true},
                    realTimeIrrigationDuration: {ID: 0x5006, type: Zcl.DataType.UINT32},
                    realTimeIrrigationVolume: {ID: 0x5007, type: Zcl.DataType.UINT32},
                    valveAbnormalState: {ID: 0x500c, type: Zcl.DataType.UINT8},
                    irrigationStartTime: {ID: 0x500d, type: Zcl.DataType.UINT32},
                    irrigationEndTime: {ID: 0x500e, type: Zcl.DataType.UINT32},
                    dailyIrrigationVolume: {ID: 0x500f, type: Zcl.DataType.UINT32},
                    valveWorkState: {ID: 0x5010, type: Zcl.DataType.BOOLEAN},
                    rainDelayEndDatetime: {ID: 0x5014, type: Zcl.DataType.UINT32},
                    weatherDelayEndDatetime: {ID: 0x5015, type: Zcl.DataType.ARRAY},
                    longitude: {ID: 0x5016, type: Zcl.DataType.INT32, write: true},
                    latitude: {ID: 0x5017, type: Zcl.DataType.INT32, write: true},
                    weatherBasedAdjustment: {ID: 0x5018, type: Zcl.DataType.ARRAY, write: true},
                    dailyIrrigationDuration: {ID: 0x501a, type: Zcl.DataType.UINT32},
                    hourIrrigationVolume: {ID: 0x501b, type: Zcl.DataType.UINT32},
                    hourIrrigationDuration: {ID: 0x501c, type: Zcl.DataType.UINT32},
                    manualDefaultSettings: {ID: 0x501d, type: Zcl.DataType.ARRAY, write: true},
                    seasonalWateringAdjustment: {ID: 0x501e, type: Zcl.DataType.ARRAY, write: true},
                    irrigationScheduleStatus: {ID: 0x501f, type: Zcl.DataType.ARRAY},
                    valveAlarmSettings: {ID: 0x5020, type: Zcl.DataType.ARRAY, write: true},
                },
                commands: {
                    readRecord: {ID: 0x00, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
                    irrigationPlanSettings: {ID: 0x06, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
                    irrigationPlanRemove: {ID: 0x07, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
                    rainDelay: {ID: 0x08, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
                },
                commandsResponse: {
                    getWeatherInfoReply: {ID: 0x05, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
                    irrigationPlanReport: {ID: 0x09, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
                },
            }),
            // official cluster
            m.battery(),
            m.onOff({
                powerOnBehavior: false,
                skipDuplicateTransaction: true,
                configureReporting: false,
            }),
            m.bindCluster({cluster: "genPollCtrl", clusterType: "input"}),
            sonoffExtend.swvznGenTimeCompatResponse(),

            // attributes
            m.binary<"customClusterEwelink", SonoffSwvzn>({
                name: "child_lock",
                cluster: "customClusterEwelink",
                attribute: "childLock",
                description: "Enables/disables physical input on the device",
                valueOn: ["LOCK", 0x01],
                valueOff: ["UNLOCK", 0x00],
                entityCategory: "config",
            }),
            sonoffExtend.valveAbnormalState(),
            sonoffExtend.irrigationStartTime(),
            sonoffExtend.irrigationEndTime(),
            m.numeric<"customClusterEwelink", SonoffSwvzn>({
                name: "daily_irrigation_volume",
                cluster: "customClusterEwelink",
                attribute: "dailyIrrigationVolume",
                description: "The amount of water irrigated today",
                access: "STATE_GET",
                unit: "L",
            }),
            m.binary<"customClusterEwelink", SonoffSwvzn>({
                name: "valve_work_state",
                cluster: "customClusterEwelink",
                attribute: "valveWorkState",
                description: "The water valve work state",
                access: "STATE_GET",
                valueOn: ["working", 1],
                valueOff: ["idle", 0],
            }),
            sonoffExtend.rainDelayEndDatetime(),
            sonoffExtend.weatherDelayEndDatetime(),
            m.numeric<"customClusterEwelink", SonoffSwvzn>({
                name: "longitude",
                cluster: "customClusterEwelink",
                attribute: "longitude",
                description: "Longitude coordinate",
                access: "ALL",
                valueMin: -180,
                valueMax: 180,
                unit: "°",
            }),
            m.numeric<"customClusterEwelink", SonoffSwvzn>({
                name: "latitude",
                cluster: "customClusterEwelink",
                attribute: "latitude",
                description: "Latitude coordinate",
                access: "ALL",
                valueMin: -90,
                valueMax: 90,
                unit: "°",
            }),
            sonoffExtend.weatherBasedAdjustment(),
            m.numeric<"customClusterEwelink", SonoffSwvzn>({
                name: "daily_irrigation_duration",
                cluster: "customClusterEwelink",
                attribute: "dailyIrrigationDuration",
                description: "Daily irrigation duration",
                access: "STATE_GET",
                unit: "min",
            }),
            m.numeric<"customClusterEwelink", SonoffSwvzn>({
                name: "hour_irrigation_volume",
                cluster: "customClusterEwelink",
                attribute: "hourIrrigationVolume",
                description: "Hourly irrigation volume",
                access: "STATE_GET",
                unit: "L",
            }),
            m.numeric<"customClusterEwelink", SonoffSwvzn>({
                name: "hour_irrigation_duration",
                cluster: "customClusterEwelink",
                attribute: "hourIrrigationDuration",
                description: "Hourly irrigation duration",
                access: "STATE_GET",
                unit: "min",
            }),
            sonoffExtend.manualDefaultSettings(),
            sonoffExtend.seasonalWateringAdjustment(),
            sonoffExtend.irrigationScheduleStatus(),
            sonoffExtend.valveAlarmSettings(),

            // commands
            sonoffExtend.readSWVZFRecord(),
            sonoffExtend.irrigationPlanSettingsAndReport(),
            sonoffExtend.irrigationPlanRemove(),
            sonoffExtend.rainDelay(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint) {
                try {
                    await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
                    await reporting.onOff(endpoint, {min: 1, max: 1800, change: 0});
                } catch (error) {
                    logger.warning(`SWV-ZN genOnOff bind/reporting failed, continuing without reporting: ${error}`, NS);
                }

                await endpoint.read("genOnOff", ["onOff"]).catch((error) => {
                    logger.warning(`SWV-ZN read genOnOff.onOff failed: ${error}`, NS);
                });
                await endpoint.read("customClusterEwelink", [0x500c]).catch((error) => {
                    logger.warning(`SWV-ZN read customClusterEwelink(0x500c) failed: ${error}`, NS);
                });
            }
        },
    },
];
