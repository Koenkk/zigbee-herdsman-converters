import {Zcl} from "zigbee-herdsman";

import * as utils from "../lib/utils";
import * as modernExtend from "./modernExtend";
import type {Fz, KeyValue, Tz} from "./types";

// Namron relay with NTC sensors and water detection (4512785 and similar models)
const NAMRON_RELAY_NTC_WATER_CLUSTER = 0x04e0;

const namronRelayNtcWaterLookups = {
    ntcType: {None: 0, "NTC-10K": 1, "NTC-12K": 2, "NTC-15K": 3, "NTC-22K": 4, "NTC-33K": 5, "NTC-47K": 6} as const,
    ntcTypeInv: {0: "None", 1: "NTC-10K", 2: "NTC-12K", 3: "NTC-15K", 4: "NTC-22K", 5: "NTC-33K", 6: "NTC-47K"} as const,
    waterAction: {
        "No action": 0,
        "Water alarm: Turn OFF (restore when dry)": 1,
        "Water alarm: Turn ON (restore when dry)": 2,
        "Water alarm: Turn OFF (stay off)": 3,
        "Water alarm: Turn ON (stay on)": 4,
        "No water: Turn OFF": 5,
        "No water: Turn ON": 6,
    } as const,
    waterActionInv: {
        0: "No action",
        1: "Water alarm: Turn OFF (restore when dry)",
        2: "Water alarm: Turn ON (restore when dry)",
        3: "Water alarm: Turn OFF (stay off)",
        4: "Water alarm: Turn ON (stay on)",
        5: "No water: Turn OFF",
        6: "No water: Turn ON",
    } as const,
    ntcOperation: {
        "No action": 0,
        "OFF when hot, ON when cold": 1,
        "ON when hot, OFF when cold": 2,
        "OFF when hot (stay off)": 3,
        "ON when hot (stay on)": 4,
    } as const,
    ntcOperationInv: {
        0: "No action",
        1: "OFF when hot, ON when cold",
        2: "ON when hot, OFF when cold",
        3: "OFF when hot (stay off)",
        4: "ON when hot (stay on)",
    } as const,
    overrideOption: {"No priority": 0, "Water alarm has priority": 1, "Temperature (NTC) has priority": 2} as const,
    overrideOptionInv: {0: "No priority", 1: "Water alarm has priority", 2: "Temperature (NTC) has priority"} as const,
};

function toDate(value: number): string {
    if (value === undefined) {
        return;
    }
    const date = new Date(value * 86400000);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Månedene er 0-indeksert
    const year = date.getFullYear();
    return `${year}.${month}.${day}`;
}

function fromDate(value: string): number {
    // Ekstrakt `attrId` og `key` direkte fra attributtobjektet
    const dateParts = value.split(/[.\-/]/);
    if (dateParts.length !== 3) {
        throw new Error("Invalid date format");
    }

    let date: Date;
    if (dateParts[0].length === 4) {
        date = new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
    } else if (dateParts[2].length === 4) {
        date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
    } else {
        throw new Error("Invalid date format");
    }

    return date.getTime() / 86400000 + 1;
}

export const fromZigbee = {
    namron_edge_thermostat_vacation_date: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data[0x8020] !== undefined) {
                result.vacation_start_date = toDate(msg.data[0x8020] as number);
            }
            if (msg.data[0x8021] !== undefined) {
                result.vacation_end_date = toDate(msg.data[0x8021] as number);
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    namron_edge_thermostat_holiday_temp: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.programingOperMode !== undefined) {
                result.operating_mode = utils.getFromLookup(msg.data.programingOperMode, {0: "manual", 1: "program", 5: "eco"});
            }
            if (msg.data[0x8013] !== undefined) {
                result.holiday_temp_set = Number.parseInt(msg.data[0x8013] as string, 10) / 100;
            }
            if (msg.data[0x801b] !== undefined) {
                result.holiday_temp_set_f = Number.parseInt(msg.data[0x801b] as string, 10) / 100;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    namron_relay_ntc_water_sensor: {
        cluster: "1248",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            if (!data) return;

            // NTC2 temperature (attr 0x0000, ÷100)
            if (data[0x0000] !== undefined) {
                const raw = data[0x0000];
                if (typeof raw === "number" && raw !== -32768 && raw !== 0x8000) {
                    result.ntc2_temperature = Math.round((raw / 100) * 10) / 10;
                }
            }

            // NTC sensor types (attr 0x0001, 0x0002)
            if (data[0x0001] !== undefined) result.ntc1_sensor_type = utils.getFromLookup(data[0x0001], namronRelayNtcWaterLookups.ntcTypeInv);
            if (data[0x0002] !== undefined) result.ntc2_sensor_type = utils.getFromLookup(data[0x0002], namronRelayNtcWaterLookups.ntcTypeInv);

            // Water sensor (attr 0x0003, inverted logic)
            if (data[0x0003] !== undefined) {
                result.water_sensor = !data[0x0003]; // true = water detected
            }

            // Calibration values (attr 0x0004, 0x0005)
            if (typeof data[0x0004] === "number") result.ntc1_calibration = data[0x0004];
            if (typeof data[0x0005] === "number") result.ntc2_calibration = data[0x0005];

            // Water alarm relay action (attr 0x0006)
            if (data[0x0006] !== undefined)
                result.water_alarm_relay_action = utils.getFromLookup(data[0x0006], namronRelayNtcWaterLookups.waterActionInv);

            // NTC operation modes (attr 0x0007, 0x0008)
            if (data[0x0007] !== undefined)
                result.ntc1_operation_mode = utils.getFromLookup(data[0x0007], namronRelayNtcWaterLookups.ntcOperationInv);
            if (data[0x0008] !== undefined)
                result.ntc2_operation_mode = utils.getFromLookup(data[0x0008], namronRelayNtcWaterLookups.ntcOperationInv);

            // Relay auto temperatures (attr 0x0009, 0x000A, ÷100)
            if (typeof data[0x0009] === "number" && data[0x0009] !== -32768 && data[0x0009] !== 0x8000) {
                result.ntc1_relay_auto_temp = Math.round((data[0x0009] / 100) * 10) / 10;
            }
            if (typeof data[0x000a] === "number" && data[0x000a] !== -32768 && data[0x000a] !== 0x8000) {
                result.ntc2_relay_auto_temp = Math.round((data[0x000a] / 100) * 10) / 10;
            }

            // Override option (attr 0x000B)
            if (data[0x000b] !== undefined) result.override_option = utils.getFromLookup(data[0x000b], namronRelayNtcWaterLookups.overrideOptionInv);

            // Temperature hysteresis (attr 0x000C, 0x000D)
            if (typeof data[0x000c] === "number") result.ntc1_temp_hysteresis = data[0x000c];
            if (typeof data[0x000d] === "number") result.ntc2_temp_hysteresis = data[0x000d];

            // Condition alarms (attr 0x000E, 0x000F, 0x0010)
            if (data[0x000e] !== undefined) result.water_condition_alarm = !!data[0x000e];
            if (data[0x000f] !== undefined) result.ntc_condition_alarm = !!data[0x000f];
            if (data[0x0010] !== undefined) result.is_execute_condition = !!data[0x0010];

            return Object.keys(result).length ? result : undefined;
        },
    } satisfies Fz.Converter<"1248", undefined, ["attributeReport", "readResponse"]>,
};

export const toZigbee = {
    namron_edge_thermostat_vacation_date: {
        key: ["vacation_start_date", "vacation_end_date"],
        convertGet: async (entity, key, meta) => {
            switch (key) {
                case "vacation_start_date":
                    await entity.read("hvacThermostat", [0x8020]);
                    break;
                case "vacation_end_date":
                    await entity.read("hvacThermostat", [0x8021]);
                    break;
            }
        },
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
                case "vacation_start_date":
                    await entity.write("hvacThermostat", {32800: {value: fromDate(String(value)), type: Zcl.DataType.UINT32}});
                    break;
                case "vacation_end_date":
                    await entity.write("hvacThermostat", {32801: {value: fromDate(String(value)), type: Zcl.DataType.UINT32}});
                    break;
            }
        },
    } satisfies Tz.Converter,
    namron_edge_thermostat_holiday_temp: {
        key: ["operating_mode", "holiday_temp_set", "holiday_temp_set_f"],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
                case "operating_mode":
                    await entity.write("hvacThermostat", {
                        programingOperMode: utils.getFromLookup(value, {manual: 0, program: 1, eco: 5}),
                    });
                    break;
                case "holiday_temp_set":
                    await entity.write("hvacThermostat", {32787: {value: Number(value) * 100, type: Zcl.DataType.INT16}});
                    break;
                case "holiday_temp_set_f":
                    await entity.write("hvacThermostat", {32795: {value: Number(value) * 100, type: Zcl.DataType.INT16}});
                    break;
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
                case "operating_mode":
                    await entity.read("hvacThermostat", ["programingOperMode"]);
                    break;
                case "holiday_temp_set":
                    await entity.read("hvacThermostat", [0x8013]);
                    break;
                case "holiday_temp_set_f":
                    await entity.read("hvacThermostat", [0x801b]);
                    break;
            }
        },
    } satisfies Tz.Converter,
    namron_relay_ntc_water_sensor: {
        key: [
            "ntc1_sensor_type",
            "ntc2_sensor_type",
            "water_alarm_relay_action",
            "ntc1_operation_mode",
            "ntc2_operation_mode",
            "ntc1_relay_auto_temp",
            "ntc2_relay_auto_temp",
            "override_option",
            "ntc1_calibration",
            "ntc2_calibration",
            "ntc1_temp_hysteresis",
            "ntc2_temp_hysteresis",
        ],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
                case "ntc1_sensor_type": {
                    const val = utils.getFromLookup(value, namronRelayNtcWaterLookups.ntcType);
                    // 0x0001
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {1: {value: val, type: Zcl.DataType.ENUM8}});
                    return {state: {ntc1_sensor_type: value}};
                }
                case "ntc2_sensor_type": {
                    const val = utils.getFromLookup(value, namronRelayNtcWaterLookups.ntcType);
                    // 0x0002
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {2: {value: val, type: Zcl.DataType.ENUM8}});
                    return {state: {ntc2_sensor_type: value}};
                }
                case "water_alarm_relay_action": {
                    const val = utils.getFromLookup(value, namronRelayNtcWaterLookups.waterAction);
                    // 0x0006
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {6: {value: val, type: Zcl.DataType.ENUM8}});
                    return {state: {water_alarm_relay_action: value}};
                }
                case "ntc1_operation_mode": {
                    const val = utils.getFromLookup(value, namronRelayNtcWaterLookups.ntcOperation);
                    // 0x0007
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {7: {value: val, type: Zcl.DataType.ENUM8}});
                    return {state: {ntc1_operation_mode: value}};
                }
                case "ntc2_operation_mode": {
                    const val = utils.getFromLookup(value, namronRelayNtcWaterLookups.ntcOperation);
                    // 0x0008
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {8: {value: val, type: Zcl.DataType.ENUM8}});
                    return {state: {ntc2_operation_mode: value}};
                }
                case "ntc1_relay_auto_temp": {
                    const val = Math.round(utils.toNumber(value, key) * 100);
                    // 0x0009
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {9: {value: val, type: Zcl.DataType.INT16}});
                    return {state: {ntc1_relay_auto_temp: value}};
                }
                case "ntc2_relay_auto_temp": {
                    const val = Math.round(utils.toNumber(value, key) * 100);
                    // 0x000a
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {10: {value: val, type: Zcl.DataType.INT16}});
                    return {state: {ntc2_relay_auto_temp: value}};
                }
                case "override_option": {
                    const val = utils.getFromLookup(value, namronRelayNtcWaterLookups.overrideOption);
                    // 0x000b
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {11: {value: val, type: Zcl.DataType.ENUM8}});
                    return {state: {override_option: value}};
                }
                case "ntc1_calibration": {
                    const val = utils.toNumber(value, key);
                    // 0x0004
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {4: {value: val, type: Zcl.DataType.INT8}});
                    return {state: {ntc1_calibration: value}};
                }
                case "ntc2_calibration": {
                    const val = utils.toNumber(value, key);
                    // 0x0005
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {5: {value: val, type: Zcl.DataType.INT8}});
                    return {state: {ntc2_calibration: value}};
                }
                case "ntc1_temp_hysteresis": {
                    const val = utils.toNumber(value, key);
                    // 0x000c
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {12: {value: val, type: Zcl.DataType.INT8}});
                    return {state: {ntc1_temp_hysteresis: value}};
                }
                case "ntc2_temp_hysteresis": {
                    const val = utils.toNumber(value, key);
                    // 0x000d
                    await entity.write(NAMRON_RELAY_NTC_WATER_CLUSTER, {13: {value: val, type: Zcl.DataType.INT8}});
                    return {state: {ntc2_temp_hysteresis: value}};
                }
                default:
                    throw new Error(`Unhandled key toZigbee.namron_relay_ntc_water_sensor.convertSet ${key}`);
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
                case "ntc1_sensor_type":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x0001]);
                    break;
                case "ntc2_sensor_type":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x0002]);
                    break;
                case "water_alarm_relay_action":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x0006]);
                    break;
                case "ntc1_operation_mode":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x0007]);
                    break;
                case "ntc2_operation_mode":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x0008]);
                    break;
                case "ntc1_relay_auto_temp":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x0009]);
                    break;
                case "ntc2_relay_auto_temp":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x000a]);
                    break;
                case "override_option":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x000b]);
                    break;
                case "ntc1_calibration":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x0004]);
                    break;
                case "ntc2_calibration":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x0005]);
                    break;
                case "ntc1_temp_hysteresis":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x000c]);
                    break;
                case "ntc2_temp_hysteresis":
                    await entity.read(NAMRON_RELAY_NTC_WATER_CLUSTER, [0x000d]);
                    break;
                default:
                    throw new Error(`Unhandled key toZigbee.namron_relay_ntc_water_sensor.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
};

export const edgeThermostat = {
    windowOpenDetection: (args?: Partial<modernExtend.BinaryArgs<"hvacThermostat">>) =>
        modernExtend.binary({
            name: "window_open_check",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            cluster: "hvacThermostat",
            attribute: {ID: 0x8000, type: Zcl.DataType.BOOLEAN},
            description: "Enables or disables the window open detection",
            access: "ALL",
            ...args,
        }),
    antiFrost: (args?: Partial<modernExtend.BinaryArgs<"hvacThermostat">>) =>
        modernExtend.binary({
            name: "anti_frost",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            cluster: "hvacThermostat",
            attribute: {ID: 0x8001, type: Zcl.DataType.BOOLEAN},
            description: "Enables or disables the anti-frost mode",
            access: "ALL",
            ...args,
        }),
    summerWinterSwitch: (args?: Partial<modernExtend.BinaryArgs<"hvacThermostat">>) =>
        modernExtend.binary({
            name: "summer_winter_switch",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            cluster: "hvacThermostat",
            attribute: {ID: 0x801e, type: Zcl.DataType.BOOLEAN},
            description: "Summer/winter switch",
            access: "ALL",
            ...args,
        }),
    vacationMode: (args?: Partial<modernExtend.BinaryArgs<"hvacThermostat">>) =>
        modernExtend.binary({
            name: "vacation_mode",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            cluster: "hvacThermostat",
            attribute: {ID: 0x801f, type: Zcl.DataType.BOOLEAN},
            description: "Vacation mode",
            access: "ALL",
            ...args,
        }),
    timeSync: (args?: Partial<modernExtend.BinaryArgs<"hvacThermostat">>) =>
        modernExtend.binary({
            name: "time_sync",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            cluster: "hvacThermostat",
            attribute: {ID: 0x800a, type: Zcl.DataType.BOOLEAN},
            description: "Time sync",
            access: "ALL",
            ...args,
        }),
    autoTime: (args?: Partial<modernExtend.BinaryArgs<"hvacThermostat">>) =>
        modernExtend.binary({
            name: "auto_time",
            valueOn: ["ON", 1],
            valueOff: ["OFF", 0],
            cluster: "hvacThermostat",
            attribute: {ID: 0x8022, type: Zcl.DataType.BOOLEAN},
            description: "Auto time",
            access: "ALL",
            ...args,
        }),

    displayActiveBacklight: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "display_active_backlight",
            cluster: "hvacThermostat",
            attribute: {ID: 0x8005, type: Zcl.DataType.UINT8},
            description: "Display active backlight",
            valueMin: 1,
            valueMax: 100,
            valueStep: 1,
            unit: "%",
            access: "ALL",
            ...args,
        }),
    regulatorPercentage: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "regulator_percentage",
            cluster: "hvacThermostat",
            attribute: {ID: 0x801d, type: Zcl.DataType.INT16},
            description: "Regulator percentage",
            unit: "%",
            valueMax: 100,
            valueMin: 0,
            valueStep: 1,
            access: "ALL",
            ...args,
        }),
    regulationMode: (args?: Partial<modernExtend.EnumLookupArgs<"hvacThermostat">>) =>
        modernExtend.enumLookup({
            name: "regulation_mode",
            cluster: "hvacThermostat",
            attribute: {ID: 0x801c, type: Zcl.DataType.ENUM8},
            description: "Regulation mode",
            lookup: {off: 0, heat: 1, cool: 2},
            access: "ALL",
            ...args,
        }),
    displayAutoOff: (args?: Partial<modernExtend.EnumLookupArgs<"hvacThermostat">>) =>
        modernExtend.enumLookup({
            name: "display_auto_off",
            cluster: "hvacThermostat",
            attribute: {ID: 0x8029, type: Zcl.DataType.ENUM8},
            description: "Display auto off",
            lookup: {always_on: 0, auto_off_after_10s: 1, auto_off_after_30s: 2, auto_off_after_60s: 3},
            access: "ALL",
            ...args,
        }),
    sensorMode: (args?: Partial<modernExtend.EnumLookupArgs<"hvacThermostat">>) =>
        modernExtend.enumLookup({
            name: "sensor_mode",
            cluster: "hvacThermostat",
            attribute: {ID: 0x8004, type: Zcl.DataType.ENUM8},
            description: "Sensor mode",
            lookup: {air: 0, floor: 1, external: 3, regulator: 6},
            access: "ALL",
            ...args,
        }),
    boostTime: (args?: Partial<modernExtend.EnumLookupArgs<"hvacThermostat">>) =>
        modernExtend.enumLookup({
            name: "boost_time_set",
            cluster: "hvacThermostat",
            attribute: {ID: 0x8023, type: Zcl.DataType.ENUM8},
            description: "Boost time",
            lookup: {
                off: 0,
                "5min": 1,
                "10min": 2,
                "15min": 3,
                "20min": 4,
                "25min": 5,
                "30min": 6,
                "35min": 7,
                "40min": 8,
                "45min": 9,
                "50min": 10,
                "55min": 11,
                "1h": 12,
                "1h_5min": 13,
                "1h_10min": 14,
                "1h_15min": 15,
                "1h_20min": 16,
                "1h_25min": 17,
                "1h_30min": 18,
                "1h_35min": 19,
                "1h_40min": 20,
                "1h_45min": 21,
                "1h_50min": 22,
                "1h_55min": 23,
                "2h": 24,
            },
            access: "ALL",
            ...args,
        }),
    systemMode: (args?: Partial<modernExtend.EnumLookupArgs<"hvacThermostat">>) =>
        modernExtend.enumLookup({
            name: "system_mode",
            cluster: "hvacThermostat",
            attribute: {ID: 0x001c, type: Zcl.DataType.ENUM8},
            description: "System mode",
            lookup: {off: 0x00, auto: 0x01, cool: 0x03, heat: 0x04},
            access: "ALL",
            ...args,
        }),

    deviceTime: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "time_sync_value",
            cluster: "hvacThermostat",
            attribute: {ID: 0x800b, type: Zcl.DataType.UINT32},
            description: "Device time",
            valueMin: 0,
            valueMax: 4294967295,
            access: "ALL",
            ...args,
        }),
    absMinHeatSetpointLimitF: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "abs_min_heat_setpoint_limit_f",
            cluster: "hvacThermostat",
            attribute: {ID: 0x800c, type: Zcl.DataType.INT16},
            description: "Absolute min heat setpoint limit",
            unit: "°F",
            access: "ALL",
            ...args,
        }),
    absMaxHeatSetpointLimitF: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "abs_max_heat_setpoint_limit_f",
            cluster: "hvacThermostat",
            attribute: {ID: 0x800d, type: Zcl.DataType.INT16},
            description: "Absolute max heat setpoint limit",
            unit: "°F",
            access: "ALL",
            ...args,
        }),
    absMinCoolSetpointLimitF: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "abs_min_cool_setpoint_limit_f",
            cluster: "hvacThermostat",
            attribute: {ID: 0x800e, type: Zcl.DataType.INT16},
            description: "Absolute min cool setpoint limit",
            unit: "°F",
            access: "ALL",
            ...args,
        }),
    absMaxCoolSetpointLimitF: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "abs_max_cool_setpoint_limit_f",
            cluster: "hvacThermostat",
            attribute: {ID: 0x800f, type: Zcl.DataType.INT16},
            description: "Absolute max cool setpoint limit",
            unit: "°F",
            access: "ALL",
            ...args,
        }),
    occupiedCoolingSetpointF: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "occupied_cooling_setpoint_f",
            cluster: "hvacThermostat",
            attribute: {ID: 0x8010, type: Zcl.DataType.INT16},
            description: "Occupied cooling setpoint",
            unit: "°F",
            access: "ALL",
            ...args,
        }),
    occupiedHeatingSetpointF: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "occupied_heating_setpoint_f",
            cluster: "hvacThermostat",
            attribute: {ID: 0x8011, type: Zcl.DataType.INT16},
            description: "Occupied heating setpoint",
            unit: "°F",
            access: "ALL",
            ...args,
        }),
    localTemperatureF: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
        modernExtend.numeric({
            name: "local_temperature_f",
            cluster: "hvacThermostat",
            attribute: {ID: 0x8012, type: Zcl.DataType.INT16},
            description: "Local temperature",
            unit: "°F",
            access: "ALL",
            ...args,
        }),

    readOnly: {
        windowState: (args?: Partial<modernExtend.BinaryArgs<"hvacThermostat">>) =>
            modernExtend.binary({
                name: "window_state",
                valueOn: ["OPEN", 1],
                valueOff: ["CLOSED", 0],
                cluster: "hvacThermostat",
                attribute: {ID: 0x8002, type: Zcl.DataType.BOOLEAN},
                description: "Window state",
                access: "STATE_GET",
                ...args,
            }),
        deviceFault: (args?: Partial<modernExtend.EnumLookupArgs<"hvacThermostat">>) =>
            modernExtend.enumLookup({
                name: "fault",
                cluster: "hvacThermostat",
                attribute: {ID: 0x8006, type: Zcl.DataType.ENUM8},
                description: "Device fault",
                lookup: {
                    no_fault: 0,
                    over_current_error: 1,
                    over_heat_error: 2,
                    "built-in_sensor_error": 3,
                    air_sensor_error: 4,
                    floor_sensor_error: 5,
                },
                access: "STATE_GET",
                ...args,
            }),
        workDays: (args?: Partial<modernExtend.EnumLookupArgs<"hvacThermostat">>) =>
            modernExtend.enumLookup({
                name: "work_days",
                cluster: "hvacThermostat",
                attribute: {ID: 0x8003, type: Zcl.DataType.ENUM8},
                description: "Work days",
                lookup: {"monday-friday_saturday-sunday": 0, "monday-saturday_sunday": 1, no_time_off: 2, time_off: 3},
                access: "STATE_GET",
                ...args,
            }),
        boostTimeRemaining: (args?: Partial<modernExtend.NumericArgs<"hvacThermostat">>) =>
            modernExtend.numeric({
                name: "boost_time_remaining",
                cluster: "hvacThermostat",
                attribute: {ID: 0x8024, type: Zcl.DataType.UINT8},
                description: "Boost time remaining",
                unit: "min",
                access: "STATE_GET",
                ...args,
            }),
    },
};
