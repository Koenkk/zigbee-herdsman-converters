import {Zcl} from "zigbee-herdsman";
import type {Attribute, Command} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const mapAttribute = <T>(
    data: Record<string | number, unknown>,
    id: number,
    key: string,
    transform: (v: unknown) => T = (v) => v as T,
): T | undefined => {
    const idStr = id.toString();
    if (Object.hasOwn(data, key)) {
        return transform(data[key]);
    }
    if (Object.hasOwn(data, idStr)) {
        return transform(data[idStr]);
    }
    if (Object.hasOwn(data, id)) {
        return transform(data[id]);
    }
    return undefined;
};

const hzcExtend = {
    addHzcThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            name: "hvacThermostat",
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                frost_temp: {name: "frost_temp", ID: 0x9000, type: Zcl.DataType.UINT8},
                frost: {name: "frost", ID: 0x8001, type: Zcl.DataType.BOOLEAN},
                local_temperature_calibration: {name: "local_temperature_calibration", ID: 0x0010, type: Zcl.DataType.INT8},
            },
            commands: {},
            commandsResponse: {},
            getAttribute: (key: number | string): Attribute | undefined => {
                throw new Error("Function not implemented.");
            },
            getCommand: (key: number | string): Command => {
                throw new Error("Function not implemented.");
            },
            getCommandResponse: (key: number | string): Command => {
                throw new Error("Function not implemented.");
            },
        }),
    addHzcUserInterfaceCluster: () =>
        m.deviceAddCustomCluster("hvacUserInterfaceCfg", {
            name: "hvacUserInterfaceCfg",
            ID: Zcl.Clusters.hvacUserInterfaceCfg.ID,
            attributes: {
                auto_time: {name: "auto_time", ID: 0x8004, type: Zcl.DataType.BOOLEAN},
                holiday_time: {name: "holiday_time", ID: 0x8002, type: Zcl.DataType.UINT8},
                display_mode: {name: "display_mode", ID: 0x8000, type: Zcl.DataType.ENUM8},
            },
            commands: {},
            commandsResponse: {},
            getAttribute: (key: number | string): Attribute | undefined => {
                throw new Error("Function not implemented.");
            },
            getCommand: (key: number | string): Command => {
                throw new Error("Function not implemented.");
            },
            getCommandResponse: (key: number | string): Command => {
                throw new Error("Function not implemented.");
            },
        }),
    addHzcWindowCluster: () =>
        m.deviceAddCustomCluster("hzcWindow", {
            name: "hzcWindow",
            ID: 0xe000,
            attributes: {
                window_check: {name: "window_check", ID: 0x0000, type: Zcl.DataType.BOOLEAN},
                window_status: {name: "window_status", ID: 0x0001, type: Zcl.DataType.BOOLEAN},
            },
            commands: {},
            commandsResponse: {},
            getAttribute: (key: number | string): Attribute | undefined => {
                throw new Error("Function not implemented.");
            },
            getCommand: (key: number | string): Command => {
                throw new Error("Function not implemented.");
            },
            getCommandResponse: (key: number | string): Command => {
                throw new Error("Function not implemented.");
            },
        }),
    addHzcValueCluster: () =>
        m.deviceAddCustomCluster("hzcValue", {
            name: "hzcValue",
            ID: 0xe001,
            attributes: {
                value_switch: {name: "value_switch", ID: 0x0001, type: Zcl.DataType.BOOLEAN},
                control_type: {name: "control_type", ID: 0x0002, type: Zcl.DataType.ENUM8},
                value_opening: {name: "value_opening", ID: 0x0003, type: Zcl.DataType.UINT8},
                scale_switch: {name: "scale_switch", ID: 0x0004, type: Zcl.DataType.BOOLEAN},
                boost_switch: {name: "boost_switch", ID: 0x0005, type: Zcl.DataType.BOOLEAN},
                boost_countdown: {name: "boost_countdown", ID: 0x0006, type: Zcl.DataType.UINT8},
                work_mode: {name: "work_mode", ID: 0x0007, type: Zcl.DataType.ENUM8},
            },
            commands: {},
            commandsResponse: {},
            getAttribute: (key: number | string): Attribute | undefined => {
                throw new Error("Function not implemented.");
            },
            getCommand: (key: number | string): Command => {
                throw new Error("Function not implemented.");
            },
            getCommandResponse: (key: number | string): Command => {
                throw new Error("Function not implemented.");
            },
        }),
    hzcThermostatFromZigbee: () => {
        return {
            fromZigbee: [
                {
                    cluster: "hvacThermostat",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        const result: Record<string, unknown> = {};
                        const data = msg.data;

                        // frost_temp (0x9000 = 36864)
                        const frostTemp = mapAttribute(data, 0x9000, "frost_temp", (v) => Number(v) / 10);
                        if (frostTemp !== undefined) {
                            result.frost_temp = frostTemp;
                        }

                        // frost (0x8001 = 32769)
                        const frost = mapAttribute(data, 0x8001, "frost", (v) => (Number(v) === 1 ? "ON" : "OFF"));
                        if (frost !== undefined) {
                            result.frost = frost;
                        }

                        // local_temperature_calibration (0x0010 = 16)
                        const localTempCal = mapAttribute(data, 0x0010, "local_temperature_calibration", (v) => Number(v) / 10);
                        if (localTempCal !== undefined) {
                            result.local_temperature_calibration = localTempCal;
                        }
                        return result;
                    },
                } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
            ],
            isModernExtend: true as const,
        };
    },
    hzcUserInterfaceFromZigbee: () => {
        return {
            fromZigbee: [
                {
                    cluster: "hvacUserInterfaceCfg",
                    type: ["attributeReport", "readResponse"],
                    convert: async (model, msg, publish, options, meta) => {
                        const result: Record<string, unknown> = {};
                        const data = msg.data;

                        // auto_time (0x8004 = 32772)
                        const autoTime = mapAttribute(data, 0x8004, "auto_time", (v) => (Number(v) === 1 ? "ON" : "OFF"));
                        if (autoTime !== undefined) {
                            result.auto_time = autoTime;
                        }

                        // holiday_time (0x8002 = 32770)
                        const holidayTime = mapAttribute(data, 0x8002, "holiday_time");
                        if (holidayTime !== undefined) {
                            result.holiday_time = holidayTime;
                        }

                        // display_mode (0x8000 = 32768)
                        const displayMode = mapAttribute(data, 0x8000, "display_mode", (v) =>
                            Number(v) === 0 ? "forwardDisplay" : "reverseDisplay",
                        );
                        if (displayMode !== undefined) {
                            result.display_mode = displayMode;
                        }

                        // keypadLockout (0x0001 = 1)
                        const keypadLockout = mapAttribute(data, 0x0001, "keypadLockout", (v) => (Number(v) === 1 ? "LOCK" : "UNLOCK"));
                        if (keypadLockout !== undefined) {
                            result.keypadLockout = keypadLockout;
                        }

                        // Sync time when auto_time is enabled
                        if ((Object.hasOwn(data, 0x8004) && data[0x8004] === 1) || (Object.hasOwn(data, "32772") && data["32772"] === 1)) {
                            try {
                                const secondsUTC = Math.round(Date.now() / 1000);
                                const secondsLocal = secondsUTC - new Date().getTimezoneOffset() * 60;
                                await msg.endpoint.write(
                                    "hvacThermostat",
                                    {32779: {value: secondsLocal, type: Zcl.DataType.UINT32}},
                                    {disableResponse: true, timeout: 30000},
                                );
                            } catch {
                                // Ignore errors
                            }
                        }

                        return result;
                    },
                } satisfies Fz.Converter<"hvacUserInterfaceCfg", undefined, ["attributeReport", "readResponse"]>,
            ],
            isModernExtend: true as const,
        };
    },
    hzcWindowFromZigbee: () => {
        return {
            fromZigbee: [
                {
                    cluster: "hzcWindow",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        const result: Record<string, unknown> = {};
                        const data = msg.data;

                        // window_check (0x0000)
                        const windowCheck = mapAttribute(data, 0x0000, "window_check", (v) => (Number(v) === 1 ? "true" : "false"));
                        if (windowCheck !== undefined) {
                            result.window_check = windowCheck;
                        }

                        // window_status (0x0001)
                        const windowStatus = mapAttribute(data, 0x0001, "window_status", (v) => (Number(v) === 1 ? "true" : "false"));
                        if (windowStatus !== undefined) {
                            result.window_status = windowStatus;
                        }

                        return result;
                    },
                } satisfies Fz.Converter<"hzcWindow", undefined, ["attributeReport", "readResponse"]>,
            ],
            isModernExtend: true as const,
        };
    },
    hzcValueFromZigbee: () => {
        return {
            fromZigbee: [
                {
                    cluster: "hzcValue",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        const result: Record<string, unknown> = {};
                        const data = msg.data;

                        // value_switch (0x0001)
                        const valueSwitch = mapAttribute(data, 0x0001, "value_switch", (v) => (Number(v) === 1 ? "true" : "false"));
                        if (valueSwitch !== undefined) {
                            result.value_switch = valueSwitch;
                        }

                        // control_type (0x0002)
                        const controlType = mapAttribute(data, 0x0002, "control_type", (v) => (Number(v) === 0 ? "PDPID" : "NF"));
                        if (controlType !== undefined) {
                            result.control_type = controlType;
                        }

                        // value_opening (0x0003)
                        const valueOpening = mapAttribute(data, 0x0003, "value_opening", (v) => Number(v) / 10);
                        if (valueOpening !== undefined) {
                            result.value_opening = valueOpening;
                        }

                        // scale_switch (0x0004)
                        const scaleSwitch = mapAttribute(data, 0x0004, "scale_switch", (v) => (Number(v) === 1 ? "true" : "false"));
                        if (scaleSwitch !== undefined) {
                            result.scale_switch = scaleSwitch;
                        }

                        // boost_switch (0x0005)
                        const boostSwitch = mapAttribute(data, 0x0005, "boost_switch", (v) => (Number(v) === 1 ? "true" : "false"));
                        if (boostSwitch !== undefined) {
                            result.boost_switch = boostSwitch;
                        }

                        // boost_countdown (0x0006)
                        const boostCountdown = mapAttribute(data, 0x0006, "boost_countdown");
                        if (boostCountdown !== undefined) {
                            result.boost_countdown = boostCountdown;
                        }

                        // work_mode (0x0007)
                        const workModes: Record<number, string> = {
                            0: "manual",
                            1: "program",
                            2: "holiday",
                            3: "comfortable",
                            4: "eco",
                            5: "off",
                        };
                        const workMode = mapAttribute(data, 0x0007, "work_mode", (v) => workModes[Number(v)] || v);
                        if (workMode !== undefined) {
                            result.work_mode = workMode;
                        }

                        return result;
                    },
                } satisfies Fz.Converter<"hzcValue", undefined, ["attributeReport", "readResponse"]>,
            ],
            isModernExtend: true as const,
        };
    },
    frostTemp: () =>
        m.numeric({
            name: "frost_temp",
            cluster: "hvacThermostat",
            attribute: {ID: 0x9000, type: Zcl.DataType.UINT8},
            description: "Frost protection temperature",
            unit: "°C",
            scale: 10,
            valueMin: 5,
            valueMax: 10,
            valueStep: 0.5,
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
        }),
    frost: () =>
        m.binary({
            name: "frost",
            cluster: "hvacThermostat",
            attribute: {ID: 0x8001, type: Zcl.DataType.BOOLEAN},
            description: "Frost protection enable",
            valueOn: ["ON", true],
            valueOff: ["OFF", false],
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    localTemperatureCalibration: () =>
        m.numeric({
            name: "local_temperature_calibration",
            cluster: "hvacThermostat",
            attribute: {ID: 0x0010, type: Zcl.DataType.INT8},
            description: "Local temperature calibration",
            unit: "°C",
            scale: 10,
            valueMin: -9,
            valueMax: 9,
            valueStep: 0.5,
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
        }),
    autoTime: () => {
        return {
            exposes: [e.binary("auto_time", ea.ALL, "ON", "OFF").withDescription("Auto time sync enable")],
            toZigbee: [
                {
                    key: ["auto_time"],
                    convertSet: async (entity, key, value, meta) => {
                        const payloadValue = value === "ON";
                        await entity.write(
                            "hvacUserInterfaceCfg",
                            {32772: {value: payloadValue, type: Zcl.DataType.BOOLEAN}},
                            {disableResponse: true, timeout: 30000},
                        );
                        if (value === "ON") {
                            const secondsUTC = Math.round(Date.now() / 1000);
                            const secondsLocal = secondsUTC - new Date().getTimezoneOffset() * 60;
                            await entity.write(
                                "hvacThermostat",
                                {32779: {value: secondsLocal, type: Zcl.DataType.UINT32}},
                                {disableResponse: true, timeout: 30000},
                            );
                        }
                        return {state: {auto_time: value}};
                    },
                    convertGet: async (entity, key, meta) => {
                        await entity.read("hvacUserInterfaceCfg", [32772]);
                    },
                } satisfies Tz.Converter,
            ],
            isModernExtend: true as const,
        };
    },
    displayMode: () =>
        m.enumLookup({
            name: "display_mode",
            cluster: "hvacUserInterfaceCfg",
            attribute: {ID: 0x8000, type: Zcl.DataType.ENUM8},
            description: "Display mode",
            lookup: {forwardDisplay: 0, reverseDisplay: 1},
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    holidayTime: () =>
        m.numeric({
            name: "holiday_time",
            cluster: "hvacUserInterfaceCfg",
            attribute: {ID: 0x8002, type: Zcl.DataType.UINT8},
            description: "Holiday time in days",
            valueMin: 0,
            valueMax: 99,
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
        }),
    keypadLockout: () =>
        m.binary({
            name: "keypadLockout",
            cluster: "hvacUserInterfaceCfg",
            attribute: "keypadLockout",
            description: "Keypad lockout",
            valueOn: ["LOCK", 1],
            valueOff: ["UNLOCK", 0],
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    windowCheck: () =>
        m.binary({
            name: "window_check",
            cluster: "hzcWindow",
            attribute: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
            description: "Enable/disable window check",
            valueOn: ["true", true],
            valueOff: ["false", false],
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    windowStatus: () =>
        m.binary({
            name: "window_status",
            cluster: "hzcWindow",
            attribute: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
            description: "Window status",
            valueOn: ["true", true],
            valueOff: ["false", false],
            access: "STATE_GET",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    valueSwitch: () =>
        m.binary({
            name: "value_switch",
            cluster: "hzcValue",
            attribute: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
            description: "Value switch",
            valueOn: ["true", true],
            valueOff: ["false", false],
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    controlType: () =>
        m.enumLookup({
            name: "control_type",
            cluster: "hzcValue",
            attribute: {ID: 0x0002, type: Zcl.DataType.ENUM8},
            description: "Control type",
            lookup: {PDPID: 0, NF: 1},
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    valueOpening: () =>
        m.numeric({
            name: "value_opening",
            cluster: "hzcValue",
            attribute: {ID: 0x0003, type: Zcl.DataType.UINT8},
            description: "Value opening",
            scale: 10,
            valueMin: 0,
            valueMax: 10,
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
        }),
    scaleSwitch: () =>
        m.binary({
            name: "scale_switch",
            cluster: "hzcValue",
            attribute: {ID: 0x0004, type: Zcl.DataType.BOOLEAN},
            description: "Scale switch",
            valueOn: ["true", true],
            valueOff: ["false", false],
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    boostSwitch: () =>
        m.binary({
            name: "boost_switch",
            cluster: "hzcValue",
            attribute: {ID: 0x0005, type: Zcl.DataType.BOOLEAN},
            description: "Boost switch",
            valueOn: ["true", true],
            valueOff: ["false", false],
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
    boostCountdown: () =>
        m.numeric({
            name: "boost_countdown",
            cluster: "hzcValue",
            attribute: {ID: 0x0006, type: Zcl.DataType.UINT8},
            description: "Boost countdown",
            access: "ALL",
            valueMin: 1,
            valueMax: 90,
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
        }),
    workMode: () =>
        m.enumLookup({
            name: "work_mode",
            cluster: "hzcValue",
            attribute: {ID: 0x0007, type: Zcl.DataType.ENUM8},
            description: "Work mode",
            lookup: {manual: 0, program: 1, holiday: 2, comfortable: 3, eco: 4, off: 5},
            access: "ALL",
            reporting: {min: "1_MINUTE", max: "1_HOUR", change: 0},
        }),
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["DimmerSwitch-2Gang-ZB3.0"],
        model: "D086-ZG",
        vendor: "HZC Electric",
        description: "Zigbee dual dimmer",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.light({endpointNames: ["l1", "l2"], configureReporting: true})],
    },
    {
        zigbeeModel: ["TempAndHumSensor-ZB3.0"],
        model: "S093TH-ZG",
        vendor: "HZC Electric",
        description: "Temperature and humidity sensor",
        extend: [m.temperature(), m.humidity()],
    },
    {
        zigbeeModel: ["WaterLeakageSensor-ZB3.0"],
        model: "S900W-ZG",
        vendor: "HZC Electric",
        description: "Water leak sensor",
        extend: [m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "alarm_2", "tamper"]}), m.battery()],
    },
    {
        zigbeeModel: ["HZC Electric motion sensor"],
        model: "S902M-ZG",
        vendor: "HZC Electric",
        description: "Motion sensor",
        extend: [m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "alarm_2", "tamper"]}), m.battery(), m.illuminance()],
    },
    {
        fingerprint: [{type: "Router", manufacturerName: "Shyugj", modelID: "Dimmer-Switch-ZB3.0"}],
        model: "D077-ZG",
        vendor: "HZC Electric",
        description: "Zigbee dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["Meter-Dimmer-Switch-ZB3.0"],
        model: "D692-ZG",
        vendor: "HZC Electric",
        description: "Rotary dimmer with screen",
        extend: [
            m.light({effect: false, configureReporting: true, powerOnBehavior: false}),
            m.electricityMeter({voltage: false, current: false, configureReporting: true}),
        ],
    },
    {
        zigbeeModel: ["T000R_ZG"],
        model: "T000R_ZG",
        vendor: "HZC Electric",
        description: "Thermostat",
        meta: {timeout: 30000},
        extend: [
            hzcExtend.addHzcThermostatCluster(),
            hzcExtend.addHzcUserInterfaceCluster(),
            hzcExtend.addHzcWindowCluster(),
            hzcExtend.addHzcValueCluster(),
            hzcExtend.hzcThermostatFromZigbee(),
            hzcExtend.hzcUserInterfaceFromZigbee(),
            hzcExtend.hzcWindowFromZigbee(),
            hzcExtend.hzcValueFromZigbee(),
            m.thermostat({
                setpoints: {values: {occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5}}},
                systemMode: {values: ["heat", "off"]},
            }),
            m.battery(),
            hzcExtend.frostTemp(),
            hzcExtend.frost(),
            hzcExtend.localTemperatureCalibration(),
            hzcExtend.autoTime(),
            hzcExtend.displayMode(),
            hzcExtend.holidayTime(),
            hzcExtend.keypadLockout(),
            hzcExtend.windowCheck(),
            hzcExtend.windowStatus(),
            hzcExtend.valueSwitch(),
            hzcExtend.valueOpening(),
            hzcExtend.controlType(),
            hzcExtend.scaleSwitch(),
            hzcExtend.boostSwitch(),
            hzcExtend.boostCountdown(),
            hzcExtend.workMode(),
            m.skipDefaultResponse(),
            m.bindCluster({cluster: "hvacThermostat", clusterType: "input"}),
            m.bindCluster({cluster: "hvacUserInterfaceCfg", clusterType: "input"}),
            m.bindCluster({cluster: "hzcWindow", clusterType: "input"}),
        ],
    },
];
