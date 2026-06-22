import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    hzc_thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            const data: KeyValueAny = msg.data;

            const mapAttribute = (id: number, key: string, transform = (v: unknown) => v) => {
                const idStr = id.toString();
                if (Object.hasOwn(data, key)) {
                    result[key] = transform(data[key]);
                } else if (Object.hasOwn(data, idStr)) {
                    result[key] = transform(data[idStr]);
                } else if (Object.hasOwn(data, id)) {
                    result[key] = transform(data[id]);
                }
            };

            mapAttribute(0x0012, "occupied_heating_setpoint", (v) => Number(v) / 100);
            mapAttribute(0x9000, "frost_temp", (v) => Number(v) / 10);
            mapAttribute(0x8001, "frost", (v) => (Number(v) === 1 ? "ON" : "OFF"));
            mapAttribute(0x0025, "programming_operation_mode", (v) => {
                const modes: KeyValueAny = {0: "setpoint", 1: "schedule", 2: "auto", 3: "schedule_with_preheat", 4: "eco"};
                return modes[Number(v)] ?? v;
            });

            if (Object.hasOwn(data, "programingOperMode") || Object.hasOwn(data, 0x0025) || Object.hasOwn(data, "37")) {
                delete data.programingOperMode;
                delete data[0x0025];
                delete data["37"];
            }

            if (Object.hasOwn(data, "localTemperatureCalibration")) {
                result.local_temperature_calibration = Number(data.localTemperatureCalibration) / 10;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    hzc_user_interface: {
        cluster: "hvacUserInterfaceCfg",
        type: ["attributeReport", "readResponse"],
        convert: async (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            const data: KeyValueAny = msg.data;

            const mapAttribute = (id: number, key: string, transform = (v: unknown) => v) => {
                const idStr = id.toString();
                if (Object.hasOwn(data, key)) {
                    result[key] = transform(data[key]);
                } else if (Object.hasOwn(data, idStr)) {
                    result[key] = transform(data[idStr]);
                } else if (Object.hasOwn(data, id)) {
                    result[key] = transform(data[id]);
                }
            };

            mapAttribute(0x8004, "auto_time", (v) => (Number(v) === 1 ? "ON" : "OFF"));
            mapAttribute(0x8002, "holiday_time");
            mapAttribute(0x8000, "display_mode", (v) => (Number(v) === 0 ? "forwardDisplay" : "reverseDisplay"));
            mapAttribute(0x0001, "keypadLockout", (v) => (Number(v) === 1 ? "LOCK" : "UNLOCK"));

            if ((Object.hasOwn(data, 0x8004) && data[0x8004] === 1) || (Object.hasOwn(data, "32772") && data["32772"] === 1)) {
                try {
                    const secondsUTC = Math.round(Date.now() / 1000);
                    const secondsLocal = secondsUTC - new Date().getTimezoneOffset() * 60;
                    await msg.endpoint.write(
                        "hvacThermostat",
                        {
                            32779: {
                                value: secondsLocal,
                                type: Zcl.DataType.UINT32,
                            },
                        },
                        {disableResponse: true},
                    );
                } catch (_error) {
                    // Ignore errors
                }
            }

            return result;
        },
    } satisfies Fz.Converter<"hvacUserInterfaceCfg", undefined, ["attributeReport", "readResponse"]>,
    hzc_window_cluster: {
        cluster: 57344,
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            const data: KeyValueAny = msg.data;

            const mapAttribute = (id: number, key: string, transform = (v: unknown) => v) => {
                const idStr = id.toString();
                if (Object.hasOwn(data, key)) {
                    result[key] = transform(data[key]);
                } else if (Object.hasOwn(data, idStr)) {
                    result[key] = transform(data[idStr]);
                } else if (Object.hasOwn(data, id)) {
                    result[key] = transform(data[id]);
                }
            };

            mapAttribute(0x0000, "window_check", (v) => (Number(v) === 1 ? "true" : "false"));
            mapAttribute(0x0001, "window_status", (v) => (Number(v) === 1 ? "true" : "false"));

            return result;
        },
    } satisfies Fz.Converter<57344, undefined, ["attributeReport", "readResponse"]>,
    hzc_value_cluster: {
        cluster: 57345,
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            const data: KeyValueAny = msg.data;

            const mapAttribute = (id: number, key: string, transform = (v: unknown) => v) => {
                const idStr = id.toString();
                if (Object.hasOwn(data, key)) {
                    result[key] = transform(data[key]);
                } else if (Object.hasOwn(data, idStr)) {
                    result[key] = transform(data[idStr]);
                } else if (Object.hasOwn(data, id)) {
                    result[key] = transform(data[id]);
                }
            };

            mapAttribute(0x0001, "value_switch", (v) => (Number(v) === 1 ? "true" : "false"));
            mapAttribute(0x0002, "control_type", (v) => (Number(v) === 0 ? "PDPID" : "NF"));
            mapAttribute(0x0003, "value_opening", (v) => Number(v) / 10);
            mapAttribute(0x0004, "scale_switch", (v) => (Number(v) === 1 ? "true" : "false"));
            mapAttribute(0x0005, "boost_switch", (v) => (Number(v) === 1 ? "true" : "false"));
            mapAttribute(0x0006, "boost_countdown");

            const workModes: KeyValueAny = {
                0: "manual",
                1: "program",
                2: "holiday",
                3: "comfortable",
                4: "eco",
                5: "off",
            };
            mapAttribute(0x0007, "work_mode", (v) => workModes[Number(v)] ?? v);

            return result;
        },
    } satisfies Fz.Converter<57345, undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    hzc_thermostat: {
        key: ["frost_temp", "local_temperature_calibration", "frost"],
        convertSet: async (entity, key, value, meta) => {
            const payload: KeyValueAny = {};
            const state: KeyValueAny = {};
            for (const [k, v] of Object.entries(meta.message)) {
                switch (k) {
                    case "frost_temp":
                        payload[0x9000] = {
                            value: Number(v) * 10,
                            type: Zcl.DataType.UINT8,
                        };
                        state[k] = v;
                        break;
                    case "local_temperature_calibration":
                        payload[0x0010] = {
                            value: Math.round(Number(v) * 10),
                            type: Zcl.DataType.INT8,
                        };
                        state[k] = v;
                        break;
                    case "frost":
                        payload[0x8001] = {
                            value: v === "ON" ? 1 : 0,
                            type: Zcl.DataType.BOOLEAN,
                        };
                        state[k] = v;
                        break;
                }
            }
            if (Object.keys(payload).length > 0) {
                await entity.write("hvacThermostat", payload, {
                    disableResponse: true,
                });
            }
            return {state};
        },
        convertGet: async (entity, key, meta) => {
            const map: KeyValueAny = {
                frost_temp: 0x9000,
                local_temperature_calibration: 0x0010,
                frost: 0x8001,
            };
            const keysToRead = Object.keys(meta.message).filter((k) => map[k]);
            if (keysToRead.length > 0 && keysToRead[0] === key) {
                await entity.read(
                    "hvacThermostat",
                    keysToRead.map((k) => map[k]),
                );
            }
        },
    } satisfies Tz.Converter,
    hzc_user_interface: {
        key: ["auto_time", "display_mode", "holiday_time", "keypadLockout", "sync_time"],
        convertSet: async (entity, key, value, meta) => {
            const payload: KeyValueAny = {};
            const state: KeyValueAny = {};
            for (const [k, v] of Object.entries(meta.message)) {
                switch (k) {
                    case "auto_time":
                        payload[0x8004] = {value: v === "ON" ? 1 : 0, type: Zcl.DataType.BOOLEAN};
                        if (v === "ON") {
                            // 当设置为 ON 时，同时写入当前时间
                            const secondsUTC = Math.round(Date.now() / 1000);
                            const secondsLocal = secondsUTC - new Date().getTimezoneOffset() * 60;
                            await entity.write(
                                "hvacThermostat",
                                {
                                    32779: {
                                        value: secondsLocal,
                                        type: Zcl.DataType.UINT32,
                                    },
                                },
                                {disableResponse: true},
                            );
                        }
                        state[k] = v;
                        break;
                    case "display_mode":
                        payload[0x8000] = {
                            value: v === "forwardDisplay" ? 0 : 1,
                            type: Zcl.DataType.ENUM8,
                        };
                        state[k] = v;
                        break;
                    case "holiday_time":
                        payload[0x8002] = {value: v, type: Zcl.DataType.UINT8};
                        state[k] = v;
                        break;
                    case "keypadLockout":
                        payload[0x0001] = {value: v === "LOCK" ? 1 : 0, type: Zcl.DataType.ENUM8};
                        state[k] = v;
                        break;
                }
            }
            if (Object.keys(payload).length > 0) {
                await entity.write(0x0204, payload, {disableResponse: true});
            }
            return {state};
        },
        convertGet: async (entity, key, meta) => {
            const map: KeyValueAny = {
                auto_time: 0x8004,
                display_mode: 0x8000,
                holiday_time: 0x8002,
                keypadLockout: 0x0001,
            };
            const keysToRead = Object.keys(meta.message).filter((k) => map[k]);
            if (keysToRead.length > 0 && keysToRead[0] === key) {
                await entity.read(
                    0x0204,
                    keysToRead.map((k) => map[k]),
                );
            }
        },
    } satisfies Tz.Converter,
    hzc_window_cluster: {
        key: ["window_check"],
        convertSet: async (entity, key, value, meta) => {
            const payload: KeyValueAny = {};
            const state: KeyValueAny = {};
            for (const [k, v] of Object.entries(meta.message)) {
                switch (k) {
                    case "window_check":
                        payload[0x0000] = {
                            value: v === "true" ? 1 : 0,
                            type: Zcl.DataType.BOOLEAN,
                        };
                        state[k] = v;
                        break;
                }
            }
            if (Object.keys(payload).length > 0) {
                await entity.write(0xe000, payload, {disableResponse: true});
            }
            return {state};
        },
        convertGet: async (entity, key, meta) => {
            const map: KeyValueAny = {
                window_check: 0x0000,
            };
            const keysToRead = Object.keys(meta.message).filter((k) => map[k]);
            if (keysToRead.length > 0 && keysToRead[0] === key) {
                await entity.read(
                    0xe000,
                    keysToRead.map((k) => map[k]),
                );
            }
        },
    } satisfies Tz.Converter,
    hzc_value_cluster: {
        key: ["value_switch", "control_type", "value_opening", "scale_switch", "boost_switch", "boost_countdown", "work_mode"],
        convertSet: async (entity, key, value, meta) => {
            const payload: KeyValueAny = {};
            const state: KeyValueAny = {};
            for (const [k, v] of Object.entries(meta.message)) {
                switch (k) {
                    case "value_switch":
                        payload[0x0001] = {
                            value: v === "true" ? 1 : 0,
                            type: Zcl.DataType.BOOLEAN,
                        };
                        state[k] = v;
                        break;
                    case "control_type":
                        payload[0x0002] = {
                            value: v === "PDPID" ? 0 : 1,
                            type: Zcl.DataType.ENUM8,
                        };
                        state[k] = v;
                        break;
                    case "value_opening":
                        payload[0x0003] = {
                            value: Number(v) * 10,
                            type: Zcl.DataType.UINT8,
                        };
                        state[k] = v;
                        break;
                    case "scale_switch":
                        payload[0x0004] = {
                            value: v === "true" ? 1 : 0,
                            type: Zcl.DataType.BOOLEAN,
                        };
                        state[k] = v;
                        break;
                    case "boost_switch":
                        payload[0x0005] = {
                            value: v === "true" ? 1 : 0,
                            type: Zcl.DataType.BOOLEAN,
                        };
                        state[k] = v;
                        break;
                    case "boost_countdown":
                        payload[0x0006] = {value: v, type: Zcl.DataType.UINT8};
                        state[k] = v;
                        break;
                    case "work_mode":
                        {
                            const workModes: KeyValueAny = {
                                manual: 0,
                                program: 1,
                                holiday: 2,
                                comfortable: 3,
                                eco: 4,
                                off: 5,
                            };
                            const val = workModes[String(v)];
                            if (val !== undefined) {
                                payload[0x0007] = {value: val, type: Zcl.DataType.ENUM8};
                                state[k] = v;
                            }
                        }
                        break;
                }
            }
            if (Object.keys(payload).length > 0) {
                await entity.write(0xe001, payload, {disableResponse: true});
            }
            return {state};
        },
        convertGet: async (entity, key, meta) => {
            const map: KeyValueAny = {
                value_switch: 0x0001,
                control_type: 0x0002,
                value_opening: 0x0003,
                scale_switch: 0x0004,
                boost_switch: 0x0005,
                boost_countdown: 0x0006,
                work_mode: 0x0007,
            };
            const keysToRead = Object.keys(meta.message).filter((k) => map[k]);
            if (keysToRead.length > 0 && keysToRead[0] === key) {
                await entity.read(
                    0xe001,
                    keysToRead.map((k) => map[k]),
                );
            }
        },
    } satisfies Tz.Converter,
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
        fromZigbee: [fz.temperature, fz.humidity, fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity()], // Unfortunately, battery percentage is not reported by this device
    },
    {
        zigbeeModel: ["WaterLeakageSensor-ZB3.0"],
        model: "S900W-ZG",
        vendor: "HZC Electric",
        description: "Water leak sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["HZC Electric motion sensor"],
        model: "S902M-ZG",
        vendor: "HZC Electric",
        description: "Motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.tamper()],
        extend: [m.illuminance()],
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
        meta: {},
    },
    {
        zigbeeModel: ["T000R_ZG"],
        model: "T000R_ZG",
        vendor: "HZC Electric",
        description: "Thermostat",
        fromZigbee: [
            fzLocal.hzc_thermostat,
            fz.thermostat,
            fz.battery,
            fzLocal.hzc_user_interface,
            fzLocal.hzc_window_cluster,
            fzLocal.hzc_value_cluster,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tzLocal.hzc_thermostat,
            tzLocal.hzc_user_interface,
            tzLocal.hzc_window_cluster,
            tzLocal.hzc_value_cluster,
        ],
        meta: {
            disableDefaultResponse: true,
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            const binds = ["hvacThermostat", "hvacUserInterfaceCfg"];
            for (const cluster of binds) {
                try {
                    await reporting.bind(endpoint, coordinatorEndpoint, [cluster]);
                } catch (_e) {}
            }

            const customBinds = [57344, 57345];
            for (const cluster of customBinds) {
                try {
                    await endpoint.bind(cluster, coordinatorEndpoint);
                } catch (_e) {}
            }
            // read
            try {
                await endpoint.read("hvacThermostat", ["occupiedHeatingSetpoint", "systemMode", 0x8001, 0x9000, 0x0010]);
            } catch (_e) {}

            try {
                await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout", 0x8000, 0x8002, 0x8004]);
            } catch (_e) {}

            try {
                await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            } catch (_e) {}

            try {
                await endpoint.read(57344, [0x0000, 0x0001]);
            } catch (_e) {}

            try {
                await endpoint.read(57345, [0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007]);
            } catch (_e) {}

            // Configure reporting for standard thermostat attributes
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);

            await endpoint.configureReporting("hvacThermostat", [
                {
                    attribute: {ID: 0x0010, type: Zcl.DataType.INT8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 1,
                },
                {
                    attribute: {ID: 0x8001, type: Zcl.DataType.BOOLEAN},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
                {
                    attribute: {ID: 0x9000, type: Zcl.DataType.UINT8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 1,
                },
                {
                    attribute: {ID: 0x0010, type: Zcl.DataType.INT8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 1,
                },
            ]);

            await endpoint.configureReporting("hvacUserInterfaceCfg", [
                {
                    attribute: {ID: 0x0001, type: Zcl.DataType.ENUM8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
                {
                    attribute: {ID: 0x8000, type: Zcl.DataType.ENUM8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
                {
                    attribute: {ID: 0x8002, type: Zcl.DataType.UINT8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 1,
                },
                {
                    attribute: {ID: 0x8004, type: Zcl.DataType.BOOLEAN},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
            ]);

            await endpoint.configureReporting(57344, [
                {
                    attribute: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
                {
                    attribute: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
            ]);

            await endpoint.configureReporting(57345, [
                {
                    attribute: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
                {
                    attribute: {ID: 0x0002, type: Zcl.DataType.ENUM8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
                {
                    attribute: {ID: 0x0003, type: Zcl.DataType.UINT8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 1,
                },
                {
                    attribute: {ID: 0x0004, type: Zcl.DataType.BOOLEAN},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
                {
                    attribute: {ID: 0x0005, type: Zcl.DataType.BOOLEAN},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
                {
                    attribute: {ID: 0x0006, type: Zcl.DataType.UINT8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 1,
                },
                {
                    attribute: {ID: 0x0007, type: Zcl.DataType.ENUM8},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
            ]);
        },
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 40, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "auto"])
                .withLocalTemperatureCalibration(-9, 9, 0.5),
            e.binary("auto_time", ea.ALL, "ON", "OFF").withDescription("Auto Sync Time"),
            e.enum("boost_switch", ea.ALL, ["true", "false"]).withDescription("Boost"),
            e.numeric("boost_countdown", ea.ALL).withValueMin(0).withValueMax(90).withValueStep(1).withUnit("min").withDescription("Boost Countdown"),
            e.enum("window_check", ea.ALL, ["true", "false"]).withDescription("Window check"),
            e.enum("window_status", ea.STATE, ["true", "false"]).withDescription("Window status"),
            e.enum("scale_switch", ea.ALL, ["true", "false"]).withDescription("Anti-limescale"),
            e.enum("control_type", ea.ALL, ["PDPID", "NF"]).withDescription("Value Control Type"),
            e.enum("value_switch", ea.ALL, ["true", "false"]).withDescription("Value Switch"),
            e.numeric("value_opening", ea.ALL).withValueMin(0).withValueMax(10).withValueStep(1).withDescription("Value opening"),
            e.binary("frost", ea.ALL, "ON", "OFF").withDescription("Frost protection"),
            e.numeric("frost_temp", ea.ALL).withValueMin(5).withValueMax(10).withValueStep(1).withDescription("Frost Temperature"),

            e.enum("display_mode", ea.ALL, ["forwardDisplay", "reverseDisplay"]).withDescription("Display Direction"),
            e.binary("keypadLockout", ea.ALL, "LOCK", "UNLOCK").withDescription("Keypad Lockout"),
            e.enum("work_mode", ea.ALL, ["manual", "program", "holiday", "comfortable", "eco", "off"]).withDescription("Work Mode"),
            e.numeric("holiday_time", ea.ALL).withValueMin(0).withValueMax(99).withValueStep(1).withDescription("Holiday Time"),
            e.battery(),
        ],
    },
];
