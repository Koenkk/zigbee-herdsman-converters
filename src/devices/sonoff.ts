import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import {modernExtend as ewelinkModernExtend} from "../lib/ewelink";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";
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
    };
    commands: never;
    commandResponses: never;
}

const fzLocal = {
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

type EntityCategoryArgs = {
    entityCategory?: "config" | "diagnostic";
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
    };
    commands: {
        protocolData: {data: number[]};
    };
    commandResponses: never;
}

const sonoffExtend = {
    addCustomClusterEwelink: () =>
        m.deviceAddCustomCluster("customClusterEwelink", {
            ID: 0xfc11,
            attributes: {
                networkLed: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
                backLight: {ID: 0x0002, type: Zcl.DataType.BOOLEAN},
                faultCode: {ID: 0x0010, type: Zcl.DataType.INT32},
                radioPower: {ID: 0x0012, type: Zcl.DataType.INT16},
                radioPowerWithManuCode: {
                    ID: 0x0012,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD,
                },
                delayedPowerOnState: {ID: 0x0014, type: Zcl.DataType.BOOLEAN},
                delayedPowerOnTime: {ID: 0x0015, type: Zcl.DataType.UINT16},
                externalTriggerMode: {ID: 0x0016, type: Zcl.DataType.UINT8},
                detachRelayMode: {ID: 0x0017, type: Zcl.DataType.BOOLEAN},
                deviceWorkMode: {ID: 0x0018, type: Zcl.DataType.UINT8},
                detachRelayMode2: {ID: 0x0019, type: Zcl.DataType.BITMAP8},
                lackWaterCloseValveTimeout: {ID: 0x5011, type: Zcl.DataType.UINT16},
                motorTravelCalibrationStatus: {ID: 0x5012, type: Zcl.DataType.UINT8},
                motorRunStatus: {ID: 0x5013, type: Zcl.DataType.UINT8},
                acCurrentCurrentValue: {ID: 0x7004, type: Zcl.DataType.UINT32},
                acCurrentVoltageValue: {ID: 0x7005, type: Zcl.DataType.UINT32},
                acCurrentPowerValue: {ID: 0x7006, type: Zcl.DataType.UINT32},
                outlet_control_protect: {ID: 0x7007, type: Zcl.DataType.UINT8},
                energyToday: {ID: 0x7009, type: Zcl.DataType.UINT32},
                energyMonth: {ID: 0x700a, type: Zcl.DataType.UINT32},
                energyYesterday: {ID: 0x700b, type: Zcl.DataType.UINT32},
            },
            commands: {
                protocolData: {ID: 0x01, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
            },
            commandsResponse: {},
        }),
    inchingControlSet: (args: EntityCategoryArgs = {}): ModernExtend => {
        const {entityCategory} = args;

        const clusterName = "customClusterEwelink";
        const commandName = "protocolData";
        let exposes = e
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
                    .withValueMax(3599.5)
                    .withValueStep(0.5),
            )
            .withFeature(e.binary("inching_mode", ea.SET, "ON", "OFF").withDescription("Set inching off or inching on mode.").withValueToggle("ON"));

        if (entityCategory) exposes = exposes.withCategory(entityCategory);

        const toZigbee: Tz.Converter[] = [
            {
                key: ["inching_control_set"],
                convertSet: async (entity, key, value, meta) => {
                    const inchingControl: string = "inching_control";
                    const inchingTime: string = "inching_time";
                    const inchingMode: string = "inching_mode";

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

                    payloadValue[5] = 0x00; // Channel

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
            exposes: [exposes],
            fromZigbee: [],
            toZigbee,
            isModernExtend: true,
        };
    },
    weeklySchedule: (): ModernExtend => {
        const exposes = e
            .composite("schedule", "weekly_schedule", ea.STATE_SET)
            .withDescription(
                'The preset heating schedule to use when the system mode is set to "auto" (indicated with ⏲ on the TRV). ' +
                    "Up to 6 transitions can be defined per day, where a transition is expressed in the format 'HH:mm/temperature', each " +
                    "separated by a space. The first transition for each day must start at 00:00 and the valid temperature range is 4-35°C " +
                    "(in 0.5°C steps). The temperature will be set at the time of the first transition until the time of the next transition, " +
                    "e.g. '04:00/20 10:00/25' will result in the temperature being set to 20°C at 04:00 until 10:00, when it will change to 25°C.",
            )
            .withFeature(e.text("sunday", ea.STATE_SET))
            .withFeature(e.text("monday", ea.STATE_SET))
            .withFeature(e.text("tuesday", ea.STATE_SET))
            .withFeature(e.text("wednesday", ea.STATE_SET))
            .withFeature(e.text("thursday", ea.STATE_SET))
            .withFeature(e.text("friday", ea.STATE_SET))
            .withFeature(e.text("saturday", ea.STATE_SET));

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
                        weekly_schedule: {
                            ...(meta.state.weekly_schedule as Record<string, string>[]),
                            [day]: transitions,
                        },
                    };
                },
            } satisfies Fz.Converter<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["weekly_schedule"],
                convertSet: async (entity, key, value, meta) => {
                    // Transition format: HH:mm/temperature
                    const transitionRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])\/(\d+(\.5)?)$/;

                    utils.assertObject(value, key);

                    for (const dayOfWeekName of Object.keys(value)) {
                        const dayKey = utils.getKey(constants.thermostatDayOfWeek, dayOfWeekName.toLowerCase(), null);

                        if (dayKey === null) {
                            throw new Error(`Invalid schedule: invalid day name, found: ${dayOfWeekName}`);
                        }

                        const dayOfWeekBit = Number(dayKey);

                        const rawTransitions = value[dayOfWeekName].split(" ").sort();

                        if (rawTransitions.length > 6) {
                            throw new Error("Invalid schedule: days must have no more than 6 transitions");
                        }

                        const transitions = [];

                        for (const transition of rawTransitions) {
                            const matches = transition.match(transitionRegex);

                            if (!matches) {
                                throw new Error(
                                    `Invalid schedule: transitions must be in format HH:mm/temperature (e.g. 12:00/15.5), found: ${transition}`,
                                );
                            }

                            const hour = Number.parseInt(matches[1], 10);
                            const mins = Number.parseInt(matches[2], 10);
                            const temp = Number.parseFloat(matches[3]);

                            if (temp < 4 || temp > 35) {
                                throw new Error(`Invalid schedule: temperature value must be between 4-35 (inclusive), found: ${temp}`);
                            }

                            transitions.push({
                                transitionTime: hour * 60 + mins,
                                heatSetpoint: Math.round(temp * 100),
                            });
                        }

                        if (transitions[0].transitionTime !== 0) {
                            throw new Error("Invalid schedule: the first transition of each day should start at 00:00");
                        }

                        await entity.command(
                            "hvacThermostat",
                            "setWeeklySchedule",
                            {
                                dayofweek: 1 << Number(dayOfWeekBit),
                                numoftrans: rawTransitions.length,
                                mode: 1 << 0, // heat
                                transitions,
                            },
                            utils.getOptions(meta.mapped, entity),
                        );
                    }
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
    externalSwitchTriggerMode: (args: EntityCategoryArgs = {}): ModernExtend => {
        const {entityCategory} = args;

        const clusterName = "customClusterEwelink" as const;
        const attributeName = "externalTriggerMode" as const;
        let exposes = e
            .enum("external_trigger_mode", ea.ALL, ["edge", "pulse", "following(off)", "following(on)"])
            .withDescription(
                "External trigger mode, which can be one of edge, pulse, " +
                    "following(off), following(on). The appropriate triggering mode can be selected according to the type of " +
                    "external switch to achieve a better use experience.",
            );
        if (entityCategory) exposes = exposes.withCategory(entityCategory);

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
                    // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
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
            exposes: [exposes],
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
                    logger.debug("value:", JSON.stringify(value, null, 2)); // 将 value 转换为格式化的 JSON 字符串

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
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["NSPanelP-Router"],
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
                await reporting.temperature(endpoint, {min: 30, max: constants.repInterval.MINUTES_5, change: 20});
                await reporting.humidity(endpoint, {min: 30, max: constants.repInterval.MINUTES_5, change: 100});
                await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
                await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
            } catch (e) {
                /* Not required for all: https://github.com/Koenkk/zigbee2mqtt/issues/5562 */
                logger.error(`Configure failed: ${e}`, NS);
            }
        },
    },
    {
        zigbeeModel: ["Dongle-PMG24_ZBRouter"],
        model: "PMG24_router",
        vendor: "SONOFF",
        description: "Router",
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
                    comfortTemperatureMax: {ID: 0x0003, type: Zcl.DataType.INT16},
                    comfortTemperatureMin: {ID: 0x0004, type: Zcl.DataType.INT16},
                    comfortHumidityMin: {ID: 0x0005, type: Zcl.DataType.UINT16},
                    comfortHumidityMax: {ID: 0x0006, type: Zcl.DataType.UINT16},
                    temperatureUnits: {ID: 0x0007, type: Zcl.DataType.UINT16},
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16},
                    humidityCalibration: {ID: 0x2004, type: Zcl.DataType.INT16},
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
                description:
                    "The unit of the temperature displayed on the device screen. Note: wake up the device by pressing the button on the back before changing this value.",
            }),
            m.numeric<"customSonoffSnzb02d", SonoffSnzb02d>({
                name: "temperature_calibration",
                cluster: "customSonoffSnzb02d",
                attribute: "temperatureCalibration",
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
                    temperatureUnits: {ID: 0x0007, type: Zcl.DataType.UINT16},
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16},
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
                description:
                    "The unit of the temperature displayed on the device screen. Note: wake up the device by pressing the button on the back before changing this value.",
            }),
            m.numeric<"customSonoffSnzb02ld", SonoffSnzb02ld>({
                name: "temperature_calibration",
                cluster: "customSonoffSnzb02ld",
                attribute: "temperatureCalibration",
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
        extend: [
            m.deviceAddCustomCluster("customSonoffSnzb02wd", {
                ID: 0xfc11,
                attributes: {
                    temperatureUnits: {ID: 0x0007, type: Zcl.DataType.UINT16},
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16},
                    humidityCalibration: {ID: 0x2004, type: Zcl.DataType.INT16},
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
                description:
                    "The unit of the temperature displayed on the device screen. Note: wake up the device by pressing the button on the back before changing this value.",
            }),
            m.numeric<"customSonoffSnzb02wd", SonoffSnzb02wd>({
                name: "temperature_calibration",
                cluster: "customSonoffSnzb02wd",
                attribute: "temperatureCalibration",
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
        zigbeeModel: ["SNZB-02P"],
        model: "SNZB-02P",
        vendor: "SONOFF",
        description: "Temperature and humidity sensor",
        ota: true,
        extend: [
            m.deviceAddCustomCluster("customSonoffSnzb02p", {
                ID: 0xfc11,
                attributes: {
                    temperatureCalibration: {ID: 0x2003, type: Zcl.DataType.INT16},
                    humidityCalibration: {ID: 0x2004, type: Zcl.DataType.INT16},
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
                description: "Unoccupied to occupied delay",
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
        zigbeeModel: ["TRVZB"],
        model: "TRVZB",
        vendor: "SONOFF",
        description: "Zigbee thermostatic radiator valve",
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 35, 0.5)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-12.8, 12.7, 0.2)
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
            m.deviceAddCustomCluster("customSonoffTrvzb", {
                ID: 0xfc11,
                attributes: {
                    childLock: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
                    tamper: {ID: 0x2000, type: Zcl.DataType.UINT8},
                    illumination: {ID: 0x2001, type: Zcl.DataType.UINT8},
                    openWindow: {ID: 0x6000, type: Zcl.DataType.BOOLEAN},
                    frostProtectionTemperature: {ID: 0x6002, type: Zcl.DataType.INT16},
                    idleSteps: {ID: 0x6003, type: Zcl.DataType.UINT16},
                    closingSteps: {ID: 0x6004, type: Zcl.DataType.UINT16},
                    valveOpeningLimitVoltage: {ID: 0x6005, type: Zcl.DataType.UINT16},
                    valveClosingLimitVoltage: {ID: 0x6006, type: Zcl.DataType.UINT16},
                    valveMotorRunningVoltage: {ID: 0x6007, type: Zcl.DataType.UINT16},
                    valveOpeningDegree: {ID: 0x600b, type: Zcl.DataType.UINT8},
                    valveClosingDegree: {ID: 0x600c, type: Zcl.DataType.UINT8},
                    tempAccuracy: {ID: 0x6011, type: Zcl.DataType.INT16},
                    externalTemperatureInput: {
                        ID: 0x600d,
                        type: Zcl.DataType.INT16,
                    },
                    temperatureSensorSelect: {
                        ID: 0x600e,
                        type: Zcl.DataType.UINT8,
                    },
                },
                commands: {},
                commandsResponse: {},
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
        fromZigbee: [fzLocal.on_off_clear_electricity],
        extend: [
            m.onOff({
                powerOnBehavior: true,
                skipDuplicateTransaction: true,
                configureReporting: true,
            }),
            // m.electricityMeter({current: {divisor: 100}, voltage: {divisor: 100}, power: {divisor: 1}, energy: {divisor: 1000}}),
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
                cluster: "customClusterEwelink",
                attribute: "energyYesterday",
                description: "Electricity consumption for the yesterday",
                unit: "kWh",
                scale: 1000,
                access: "STATE_GET",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "energy_today",
                cluster: "customClusterEwelink",
                attribute: "energyToday",
                description: "Electricity consumption for the day",
                unit: "kWh",
                scale: 1000,
                access: "STATE_GET",
            }),
            m.numeric<"customClusterEwelink", SonoffEwelink>({
                name: "energy_month",
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
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "customClusterEwelink"]);
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
            sonoffExtend.externalSwitchTriggerMode({entityCategory: "config"}),
            sonoffExtend.inchingControlSet({entityCategory: "config"}),
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
            sonoffExtend.externalSwitchTriggerMode({entityCategory: "config"}),
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
];
