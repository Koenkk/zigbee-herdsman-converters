import type {Endpoint, Group} from "zigbee-herdsman/dist/controller/model";
import type {SunricherHvacThermostat, SunricherRemote} from "../devices/sunricher";
import * as constants from "./constants";
import {repInterval} from "./constants";
import * as exposes from "./exposes";
import {logger} from "./logger";
import * as reporting from "./reporting";
import {payload} from "./reporting";
import * as globalStore from "./store";
import type {Configure, Expose, Fz, KeyValueAny, ModernExtend, Tz} from "./types";
import * as utils from "./utils";
import {precisionRound} from "./utils";

const e = exposes.presets;
const ea = exposes.access;
const NS = "zhc:sunricher";

const sunricherManufacturerCode = 0x1224;

const tz = {
    setModel: {
        key: ["model"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("genBasic", {modelId: value as string});
            return {state: {model: value}};
        },
    } satisfies Tz.Converter,
};

const extend = {
    configureReadModelID: (): ModernExtend => {
        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/3016#issuecomment-1027726604
                const endpoint = device.endpoints[0];
                const oldModel = device.modelID;
                const newModel = (await endpoint.read("genBasic", ["modelId"])).modelId;
                if (oldModel !== newModel) {
                    logger.info(`Detected Sunricher device mode change, from '${oldModel}' to '${newModel}'. Triggering re-interview.`, NS);
                    await device.interview();
                    return;
                }
            },
        ];
        return {configure, isModernExtend: true};
    },

    externalSwitchType: (): ModernExtend => {
        const attribute = 0x8803;
        const data_type = 0x20;
        const value_map: {[key: number]: string} = {
            0: "push_button",
            1: "normal_on_off",
            2: "three_way",
        };
        const value_lookup: {[key: string]: number} = {
            push_button: 0,
            normal_on_off: 1,
            three_way: 2,
        };

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute] as number;
                        return {
                            external_switch_type: value_map[value] || "unknown",
                            external_switch_type_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["external_switch_type"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const numericValue = value_lookup[value] ?? Number.parseInt(value, 10);
                    await entity.write(
                        "genBasic",
                        {[attribute]: {value: numericValue, type: data_type}},
                        {manufacturerCode: sunricherManufacturerCode},
                    );
                    return {state: {external_switch_type: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("genBasic", [attribute], {
                        manufacturerCode: sunricherManufacturerCode,
                    });
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e.enum("external_switch_type", ea.ALL, ["push_button", "normal_on_off", "three_way"]).withLabel("External switch type"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute], {
                        manufacturerCode: sunricherManufacturerCode,
                    });
                } catch (error) {
                    console.warn(`Failed to read external switch type attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    minimumPWM: (): ModernExtend => {
        const attribute = 0x7809;
        const data_type = 0x20;

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        console.log("from ", msg.data[attribute]);
                        const value = Math.round((msg.data[attribute] as number) / 5.1);
                        return {
                            minimum_pwm: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["minimum_pwm"],
                convertSet: async (entity, key, value, meta) => {
                    console.log("to ", value);
                    const numValue = typeof value === "string" ? Number.parseInt(value, 10) : value;
                    utils.assertNumber(numValue);
                    const zgValue = Math.round(numValue * 5.1);
                    await entity.write("genBasic", {[attribute]: {value: zgValue, type: data_type}}, {manufacturerCode: sunricherManufacturerCode});
                    return {state: {minimum_pwm: numValue}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("genBasic", [attribute], {
                        manufacturerCode: sunricherManufacturerCode,
                    });
                },
            },
        ];

        const exposes: Expose[] = [
            e
                .numeric("minimum_pwm", ea.ALL)
                .withLabel("Minimum PWM")
                .withDescription("Power off the device and wait for 3 seconds before reconnecting to apply the settings.")
                .withValueMin(0)
                .withValueMax(50)
                .withUnit("%")
                .withValueStep(1),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute], {
                        manufacturerCode: sunricherManufacturerCode,
                    });
                } catch (error) {
                    console.warn(`Failed to read external switch type attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    SRZG9002KR12Pro: (): ModernExtend => {
        const cluster = 0xff03;

        const fromZigbee = [
            {
                cluster: 0xff03,
                type: ["raw"],
                convert: (model, msg, publish, options, meta) => {
                    const bytes = [...msg.data];
                    const messageType = bytes[3];
                    let action = "unknown";

                    if (messageType === 0x01) {
                        const pressTypeMask: number = bytes[6];
                        const pressTypeLookup: {[key: number]: string} = {
                            1: "short_press",
                            2: "double_press",
                            3: "hold",
                            4: "hold_released",
                        };
                        action = pressTypeLookup[pressTypeMask] || "unknown";

                        const buttonMask = (bytes[4] << 8) | bytes[5];
                        const specialButtonMap: {[key: number]: string} = {
                            9: "knob",
                            11: "k9",
                            12: "k10",
                            15: "k11",
                            16: "k12",
                        };

                        const actionButtons: string[] = [];
                        for (let i = 0; i < 16; i++) {
                            if ((buttonMask >> i) & 1) {
                                const button = i + 1;
                                actionButtons.push(specialButtonMap[button] ?? `k${button}`);
                            }
                        }
                        return {action, action_buttons: actionButtons};
                    }
                    if (messageType === 0x03) {
                        const directionMask = bytes[4];
                        const actionSpeed = bytes[6];

                        const directionMap: {[key: number]: string} = {
                            1: "clockwise",
                            2: "anti_clockwise",
                        };
                        const direction = directionMap[directionMask] || "unknown";

                        action = `${direction}_rotation`;
                        return {action, action_speed: actionSpeed};
                    }

                    return {action};
                },
            } satisfies Fz.Converter<0xff03, undefined, ["raw"]>,
        ];

        const exposes: Expose[] = [
            e.action(["short_press", "double_press", "hold", "hold_released", "clockwise_rotation", "anti_clockwise_rotation"]),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.bind(cluster, coordinatorEndpoint);
            },
        ];

        return {
            fromZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    SRZG2836D5Pro: (): ModernExtend => {
        const cluster = 0xff03;

        const fromZigbee = [
            {
                cluster: 0xff03,
                type: ["raw"],
                convert: (model, msg, publish, options, meta) => {
                    const bytes = [...msg.data];
                    const messageType = bytes[3];
                    let action = "unknown";

                    if (messageType === 0x01) {
                        const pressTypeMask: number = bytes[6];
                        const pressTypeLookup: {[key: number]: string} = {
                            1: "short_press",
                            2: "double_press",
                            3: "hold",
                            4: "hold_released",
                        };
                        action = pressTypeLookup[pressTypeMask] || "unknown";

                        const buttonMask = bytes[5];
                        const specialButtonLookup: {[key: number]: string} = {
                            1: "top_left",
                            2: "top_right",
                            3: "bottom_left",
                            4: "bottom_right",
                            5: "center",
                        };

                        const actionButtons: string[] = [];
                        for (let i = 0; i < 5; i++) {
                            if ((buttonMask >> i) & 1) {
                                const button = i + 1;
                                actionButtons.push(specialButtonLookup[button] || `unknown_${button}`);
                            }
                        }
                        return {action, action_buttons: actionButtons};
                    }
                    if (messageType === 0x03) {
                        const directionMask = bytes[4];
                        const actionSpeed = bytes[6];
                        const isStop = bytes[5] === 0x02;

                        const directionMap: {[key: number]: string} = {
                            1: "clockwise",
                            2: "anti_clockwise",
                        };
                        const direction = isStop ? "stop" : directionMap[directionMask] || "unknown";

                        action = `${direction}_rotation`;
                        return {action, action_speed: actionSpeed};
                    }

                    return {action};
                },
            } satisfies Fz.Converter<0xff03, undefined, ["raw"]>,
        ];

        const exposes: Expose[] = [
            e.action(["short_press", "double_press", "hold", "hold_released", "clockwise_rotation", "anti_clockwise_rotation", "stop_rotation"]),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.bind(cluster, coordinatorEndpoint);
            },
        ];

        return {
            fromZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    SRZG9002K16Pro: (): ModernExtend => {
        const cluster = 0xff03;

        const fromZigbee = [
            {
                cluster,
                type: ["raw"],
                convert: (model, msg, publish, options, meta) => {
                    const bytes = [...msg.data];
                    const messageType = bytes[3];
                    let action = "unknown";

                    if (messageType === 0x01) {
                        const pressTypeMask: number = bytes[6];
                        const pressTypeLookup: {[key: number]: string} = {
                            1: "short_press",
                            2: "double_press",
                            3: "hold",
                            4: "hold_released",
                        };
                        action = pressTypeLookup[pressTypeMask] || "unknown";

                        const buttonMask = (bytes[4] << 8) | bytes[5];
                        const getButtonNumber = (input: number) => {
                            const row = Math.floor((input - 1) / 4);
                            const col = (input - 1) % 4;
                            return col * 4 + row + 1;
                        };

                        const actionButtons: string[] = [];
                        for (let i = 0; i < 16; i++) {
                            if ((buttonMask >> i) & 1) {
                                const button = i + 1;
                                actionButtons.push(`k${getButtonNumber(button)}`);
                            }
                        }
                        return {action, action_buttons: actionButtons};
                    }
                    return {action};
                },
            } satisfies Fz.Converter<typeof cluster, undefined, ["raw"]>,
        ];

        const exposes: Expose[] = [e.action(["short_press", "double_press", "hold", "hold_released"])];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.bind(cluster, coordinatorEndpoint);
            },
        ];

        return {
            fromZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    indicatorLight(): ModernExtend {
        const cluster = 0xfc8b;
        const attribute = 0xf001;
        const data_type = 0x20;
        const manufacturerCode = 0x120b;

        const exposes: Expose[] = [
            e.enum("indicator_light", ea.ALL, ["on", "off"]).withDescription("Enable/disable the LED indicator").withCategory("config"),
        ];

        const fromZigbee = [
            {
                cluster,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!Object.hasOwn(msg.data, attribute)) return;
                    const indicatorLight = msg.data[attribute];
                    const firstBit = indicatorLight & 0x01;
                    return {indicator_light: firstBit === 1 ? "on" : "off"};
                },
            } satisfies Fz.Converter<typeof cluster, undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["indicator_light"],
                convertSet: async (entity, key, value, meta) => {
                    const attributeRead = await entity.read(cluster, [attribute]);
                    if (attributeRead === undefined) return;

                    const currentValue = attributeRead[attribute] as number;
                    const newValue = value === "on" ? currentValue | 0x01 : currentValue & ~0x01;

                    await entity.write(cluster, {[attribute]: {value: newValue, type: data_type}}, {manufacturerCode});

                    return {state: {indicator_light: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read(cluster, [attribute], {manufacturerCode});
                },
            },
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.bind(cluster, coordinatorEndpoint);
                await endpoint.read(cluster, [attribute], {manufacturerCode});
            },
        ];

        return {
            exposes,
            configure,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },

    thermostatWeeklySchedule: (): ModernExtend => {
        const exposes = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) =>
            e
                .text(`schedule_${day}`, ea.ALL)
                .withDescription(`Schedule for ${day.charAt(0).toUpperCase() + day.slice(1)}, example: "06:00/21.0 12:00/21.0 18:00/21.0 22:00/16.0"`)
                .withCategory("config"),
        );

        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["commandGetWeeklyScheduleRsp"],
                convert: (model, msg, publish, options, meta) => {
                    const day = Object.entries(constants.thermostatDayOfWeek).find((d) => msg.data.dayofweek & (1 << +d[0]))[1];

                    const transitions = msg.data.transitions
                        // TODO heatSetpoint is optional, affects return
                        .map((t: {heatSetpoint?: number; transitionTime: number}) => {
                            const hours = Math.floor(t.transitionTime / 60);
                            const minutes = t.transitionTime % 60;
                            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}/${t.heatSetpoint / 100}`;
                        })
                        .sort()
                        .join(" ");

                    return {
                        ...(meta.state.weekly_schedule as Record<string, string>[]),
                        [`schedule_${day}`]: transitions,
                    };
                },
            } satisfies Fz.Converter<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: [
                    "schedule_sunday",
                    "schedule_monday",
                    "schedule_tuesday",
                    "schedule_wednesday",
                    "schedule_thursday",
                    "schedule_friday",
                    "schedule_saturday",
                ],
                convertSet: async (entity, key, value, meta) => {
                    const transitionRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])\/(\d+(\.\d+)?)$/;
                    const dayOfWeekName = key.replace("schedule_", "");
                    utils.assertString(value, dayOfWeekName);

                    const dayKey = utils.getKey(constants.thermostatDayOfWeek, dayOfWeekName.toLowerCase(), null);
                    if (!dayKey) throw new Error(`Invalid schedule: invalid day name, found: ${dayOfWeekName}`);

                    const transitions = value.split(" ").sort();
                    if (transitions.length !== 4) {
                        throw new Error("Invalid schedule: days must have exactly 4 transitions");
                    }

                    const payload = {
                        dayofweek: 1 << Number(dayKey),
                        numoftrans: transitions.length,
                        mode: 1 << 0,
                        transitions: transitions.map((transition) => {
                            const matches = transition.match(transitionRegex);
                            if (!matches) {
                                throw new Error(
                                    `Invalid schedule: transitions must be in format HH:mm/temperature (e.g. 12:00/15.5), found: ${transition}`,
                                );
                            }

                            const [, hours, minutes, temp] = matches;
                            const temperature = Number.parseFloat(temp);
                            if (temperature < 4 || temperature > 35) {
                                throw new Error(`Invalid schedule: temperature value must be between 4-35 (inclusive), found: ${temperature}`);
                            }

                            return {
                                transitionTime: Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10),
                                heatSetpoint: Math.round(temperature * 100),
                            };
                        }),
                    };

                    await entity.command("hvacThermostat", "setWeeklySchedule", payload, utils.getOptions(meta.mapped, entity));
                },
                convertGet: async (entity, key, meta) => {
                    const dayOfWeekName = key.replace("schedule_", "");
                    const dayKey = utils.getKey(constants.thermostatDayOfWeek, dayOfWeekName.toLowerCase(), null);
                    await entity.command(
                        "hvacThermostat",
                        "getWeeklySchedule",
                        {
                            daystoreturn: dayKey !== null ? 1 << Number(dayKey) : 0xff,
                            modetoreturn: 1,
                        },
                        utils.getOptions(meta.mapped, entity),
                    );
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.command("hvacThermostat", "getWeeklySchedule", {
                    daystoreturn: 0xff,
                    modetoreturn: 1,
                });
            },
        ];

        return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
    },

    thermostatChildLock: (): ModernExtend => {
        const exposes = [e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device")];

        const fromZigbee = [
            {
                cluster: "hvacUserInterfaceCfg",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, "keypadLockout")) {
                        return {
                            child_lock: msg.data.keypadLockout === 0 ? "UNLOCK" : "LOCK",
                        };
                    }
                    return {};
                },
            } satisfies Fz.Converter<"hvacUserInterfaceCfg", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["child_lock"],
                convertSet: async (entity, key, value, meta) => {
                    const keypadLockout = Number(value === "LOCK");
                    await entity.write("hvacUserInterfaceCfg", {keypadLockout});
                    return {state: {child_lock: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("hvacUserInterfaceCfg", ["keypadLockout"]);
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ["hvacUserInterfaceCfg"]);
                await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
                await reporting.thermostatKeypadLockMode(endpoint);
            },
        ];

        return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
    },

    thermostatPreset: (): ModernExtend => {
        const systemModeLookup = {
            0: "off",
            1: "auto",
            3: "cool",
            4: "manual",
            5: "emergency_heating",
            6: "precooling",
            7: "fan_only",
            8: "dry",
            9: "sleep",
        };

        const awayOrBoostModeLookup = {0: "normal", 1: "away", 2: "forced"};

        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (!Object.hasOwn(msg.data, "systemMode") && !Object.hasOwn(msg.data, "awayOrBoostMode")) return;

                    const systemMode = msg.data.systemMode ?? globalStore.getValue(msg.device, "systemMode");
                    const awayOrBoostMode = msg.data.awayOrBoostMode ?? globalStore.getValue(msg.device, "awayOrBoostMode");

                    globalStore.putValue(msg.device, "systemMode", systemMode);
                    globalStore.putValue(msg.device, "awayOrBoostMode", awayOrBoostMode);

                    const result: KeyValueAny = {};

                    if (awayOrBoostMode !== undefined && awayOrBoostMode !== 0) {
                        result.preset = utils.getFromLookup(awayOrBoostMode, awayOrBoostModeLookup);
                        result.away_or_boost_mode = utils.getFromLookup(awayOrBoostMode, awayOrBoostModeLookup);
                        if (systemMode !== undefined) {
                            result.system_mode = constants.thermostatSystemModes[systemMode];
                        }
                    } else if (systemMode !== undefined) {
                        result.preset = utils.getFromLookup(systemMode, systemModeLookup);
                        result.system_mode = constants.thermostatSystemModes[systemMode];
                        if (awayOrBoostMode !== undefined) {
                            result.away_or_boost_mode = utils.getFromLookup(awayOrBoostMode, awayOrBoostModeLookup);
                        }
                    }

                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", SunricherHvacThermostat, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["preset"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === "away" || value === "forced") {
                        const awayOrBoostMode = value === "away" ? 1 : 2;
                        globalStore.putValue(entity, "awayOrBoostMode", awayOrBoostMode);
                        if (value === "away") {
                            await entity.read("hvacThermostat", ["unoccupiedHeatingSetpoint"]);
                        }
                        await entity.write<"hvacThermostat", SunricherHvacThermostat>("hvacThermostat", {awayOrBoostMode});
                        return {state: {preset: value, away_or_boost_mode: value}};
                    }
                    globalStore.putValue(entity, "awayOrBoostMode", 0);
                    const systemMode = utils.getKey(systemModeLookup, value, undefined, Number);
                    await entity.write("hvacThermostat", {systemMode});

                    if (typeof systemMode === "number") {
                        return {
                            state: {
                                // @ts-expect-error ignore
                                preset: systemModeLookup[systemMode],
                                system_mode: constants.thermostatSystemModes[systemMode],
                            },
                        };
                    }
                },
            },
            {
                key: ["system_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const systemMode = utils.getKey(constants.thermostatSystemModes, value, undefined, Number);
                    if (systemMode === undefined || typeof systemMode !== "number") {
                        throw new Error(`Invalid system mode: ${value}`);
                    }
                    await entity.write("hvacThermostat", {systemMode});
                    return {
                        state: {
                            // @ts-expect-error ignore
                            preset: systemModeLookup[systemMode],
                            system_mode: constants.thermostatSystemModes[systemMode],
                        },
                    };
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("hvacThermostat", ["systemMode"]);
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read("hvacThermostat", ["systemMode"]);
                await endpoint.read<"hvacThermostat", SunricherHvacThermostat>("hvacThermostat", ["awayOrBoostMode"]);

                await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat"]);
                await reporting.thermostatSystemMode(endpoint);
                await endpoint.configureReporting<"hvacThermostat", SunricherHvacThermostat>(
                    "hvacThermostat",
                    payload<"hvacThermostat", SunricherHvacThermostat>("awayOrBoostMode", 10, repInterval.HOUR, null),
                );
            },
        ];

        return {fromZigbee, toZigbee, configure, isModernExtend: true};
    },

    thermostatCurrentHeatingSetpoint: (): ModernExtend => {
        const getAwayOrBoostMode = async (entity: Endpoint | Group) => {
            let result = globalStore.getValue(entity, "awayOrBoostMode");
            if (result === undefined) {
                const attributeRead = await entity.read<"hvacThermostat", SunricherHvacThermostat>("hvacThermostat", ["awayOrBoostMode"]);
                result = attributeRead.awayOrBoostMode;
                globalStore.putValue(entity, "awayOrBoostMode", result);
            }
            return result;
        };

        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: async (model, msg, publish, options, meta) => {
                    const hasHeatingSetpoints =
                        Object.hasOwn(msg.data, "occupiedHeatingSetpoint") || Object.hasOwn(msg.data, "unoccupiedHeatingSetpoint");
                    if (!hasHeatingSetpoints) return;

                    const processSetpoint = (value: number | undefined) => {
                        if (value === undefined) return undefined;
                        return precisionRound(value, 2) / 100;
                    };

                    const occupiedSetpoint = processSetpoint(msg.data.occupiedHeatingSetpoint);
                    const unoccupiedSetpoint = processSetpoint(msg.data.unoccupiedHeatingSetpoint);

                    const awayOrBoostMode = msg.data.awayOrBoostMode ?? (await getAwayOrBoostMode(msg.device.getEndpoint(1)));

                    const result: KeyValueAny = {};

                    if (awayOrBoostMode === 1 && unoccupiedSetpoint !== undefined) {
                        result.current_heating_setpoint = unoccupiedSetpoint;
                    } else if (occupiedSetpoint !== undefined) {
                        result.current_heating_setpoint = occupiedSetpoint;
                    }

                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", SunricherHvacThermostat, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["current_heating_setpoint"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertNumber(value, key);
                    const awayOrBoostMode = await getAwayOrBoostMode(entity);

                    let convertedValue: number;
                    if (meta.options.thermostat_unit === "fahrenheit") {
                        convertedValue = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
                    } else {
                        convertedValue = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
                    }

                    if (awayOrBoostMode === 1) {
                        await entity.write("hvacThermostat", {unoccupiedHeatingSetpoint: convertedValue});
                    } else {
                        await entity.write("hvacThermostat", {occupiedHeatingSetpoint: convertedValue});
                    }
                    return {state: {current_heating_setpoint: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("hvacThermostat", ["occupiedHeatingSetpoint", "unoccupiedHeatingSetpoint"]);
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read("hvacThermostat", ["occupiedHeatingSetpoint", "unoccupiedHeatingSetpoint"]);
                await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat"]);
                await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
                await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            },
        ];

        return {fromZigbee, toZigbee, configure, isModernExtend: true};
    },

    SRZG2856Pro: (): ModernExtend => {
        const fromZigbee = [
            {
                cluster: "sunricherRemote",
                type: ["commandPress"],
                convert: (model, msg, publish, options, meta) => {
                    let action = "unknown";

                    if (msg.data.messageType === 0x01) {
                        const pressTypeLookup: {[key: number]: string} = {
                            1: "short_press",
                            2: "double_press",
                            3: "hold",
                            4: "hold_released",
                        };
                        action = pressTypeLookup[msg.data.pressType] || "unknown";

                        const buttonMask = (msg.data.button2 << 8) | msg.data.button1;
                        const actionButtons: string[] = [];
                        for (let i = 0; i < 16; i++) {
                            if ((buttonMask >> i) & 1) {
                                const button = i + 1;
                                actionButtons.push(`k${button}`);
                            }
                        }
                        return {action, action_buttons: actionButtons};
                    }
                    return {action};
                },
            } satisfies Fz.Converter<"sunricherRemote", SunricherRemote, ["commandPress"]>,
        ];

        const exposes: Expose[] = [e.action(["short_press", "double_press", "hold", "hold_released"])];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.bind("sunricherRemote", coordinatorEndpoint);
            },
        ];

        return {
            fromZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    motorControl: (): ModernExtend => {
        const toZigbee: Tz.Converter[] = [
            {
                key: ["calibrate"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === "calibrate") {
                        // Read current value to preserve other bits
                        const current = await entity.read("closuresWindowCovering", [0x0017]);
                        let currentValue = (current as KeyValueAny)?.[0x0017] || 0;

                        // Set only the calibration bit (bit 1 = 0x02)
                        currentValue |= 0x02;

                        await entity.write("closuresWindowCovering", {
                            [0x0017]: {value: currentValue, type: 0x18}, // BITMAP8
                        });
                    }
                    return {};
                },
            },
        ];

        const exposes: Expose[] = [
            e
                .enum("calibrate", ea.SET, ["calibrate"])
                .withDescription("Calibrate curtain (motor will learn travel limits automatically)")
                .withCategory("config"),
        ];

        return {
            toZigbee,
            exposes,
            isModernExtend: true,
        };
    },
};

export {tz, extend};
