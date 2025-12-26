import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import {binary, deviceAddCustomCluster, deviceEndpoints, electricityMeter, enumLookup, identify, numeric, thermostat} from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import {getFromLookup, getKey, postfixWithEndpointName, precisionRound, toNumber} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const manufacturerOptions = {manufacturerCode: 0x7777};
const sensorTypes = ["3.3", "5", "6.8", "10", "12", "14.8", "15", "20", "33", "47"];

interface LytoThermostat {
    attributes: {
        occupiedSetback: number;
        lytkoSensor: number;
        lytkoTargetFirst: boolean;
    };
    commands: never;
    commandResponses: never;
}

interface LytoUIThermostat {
    attributes: {
        brignessActive: number;
        brignessStandby: number;
    };
    commands: never;
    commandResponses: never;
}

const fzLocal = {
    thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const ep = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const result: KeyValue = {};

            if (msg.data.minSetpointDeadBand !== undefined) {
                result[postfixWithEndpointName("min_setpoint_deadband", msg, model, meta)] = precisionRound(msg.data.minSetpointDeadBand, 2) / 10;
            }
            // sensor type
            if (msg.data["30464"] !== undefined) {
                result[`sensor_type_${ep}`] = sensorTypes[toNumber(msg.data["30464"])];
            }
            if (msg.data["30465"] !== undefined) {
                result[postfixWithEndpointName("target_temp_first", msg, model, meta)] = msg.data["30465"] === 1;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    thermostat_ui: {
        cluster: "hvacUserInterfaceCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data["30464"] !== undefined) {
                result[postfixWithEndpointName("brightness", msg, model, meta)] = msg.data["30464"];
            }
            if (msg.data["30465"] !== undefined) {
                result[postfixWithEndpointName("brightness_standby", msg, model, meta)] = msg.data["30465"];
            }
            if (msg.data.keypadLockout !== undefined) {
                result[postfixWithEndpointName("keypad_lockout", msg, model, meta)] = getFromLookup(
                    msg.data.keypadLockout,
                    constants.keypadLockoutMode,
                );
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacUserInterfaceCfg", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    thermostat: {
        key: ["sensor_type", "target_temp_first", "min_setpoint_deadband"],
        convertGet: async (entity, key, meta) => {
            const lookup = {
                sensor_type: 30464,
                target_temp_first: 30465,
            };
            switch (key) {
                case "sensor_type":
                    await entity.read("hvacThermostat", [lookup[key]], manufacturerOptions);
                    break;
                case "target_temp_first":
                    await entity.read("hvacThermostat", [lookup[key]], manufacturerOptions);
                    break;
                case "min_setpoint_deadband":
                    await entity.read("hvacThermostat", ["minSetpointDeadBand"]);
                    break;
                default:
                    break;
            }
        },
        convertSet: async (entity, key, value, meta) => {
            let newValue = value;
            switch (key) {
                case "sensor_type": {
                    newValue = sensorTypes.indexOf(value as string);
                    const payload = {30464: {value: newValue, type: Zcl.DataType.ENUM8}};
                    await entity.write("hvacThermostat", payload, manufacturerOptions);
                    break;
                }
                case "target_temp_first": {
                    const payload = {30465: {value: newValue, type: Zcl.DataType.BOOLEAN}};
                    await entity.write("hvacThermostat", payload, manufacturerOptions);
                    break;
                }
                case "min_setpoint_deadband":
                    await entity.write("hvacThermostat", {minSetpointDeadBand: Math.round(toNumber(value) * 10)});
                    break;
                default:
                    break;
            }
            return {state: {[key]: value}};
        },
    } satisfies Tz.Converter,
    thermostat_ui: {
        key: ["brightness", "brightness_standby"],
        convertGet: async (entity, key, meta) => {
            const lookup = {
                brightness: 30464,
                brightness_standby: 30465,
            };
            switch (key) {
                case "brightness":
                    await entity.read("hvacUserInterfaceCfg", [lookup[key]], manufacturerOptions);
                    break;
                case "brightness_standby":
                    await entity.read("hvacUserInterfaceCfg", [lookup[key]], manufacturerOptions);
                    break;
                default:
                    break;
            }
        },
        convertSet: async (entity, key, value, meta) => {
            const newValue = value;
            switch (key) {
                case "brightness": {
                    const payload = {30464: {value: newValue, type: Zcl.DataType.ENUM8}};
                    await entity.write("hvacUserInterfaceCfg", payload, manufacturerOptions);
                    break;
                }
                case "brightness_standby": {
                    const payload = {30465: {value: newValue, type: Zcl.DataType.ENUM8}};
                    await entity.write("hvacUserInterfaceCfg", payload, manufacturerOptions);
                    break;
                }
                default:
                    break;
            }
            return {state: {[key]: value}};
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["L101Z-SBI"],
        model: "L101Z-SBI",
        vendor: "Lytko",
        ota: true,
        description: "Single channel Zigbee thermostat",
        fromZigbee: [fz.humidity, fz.temperature, fz.thermostat, fzLocal.thermostat, fzLocal.thermostat_ui],
        toZigbee: [
            tz.thermostat_keypad_lockout,
            tz.temperature,
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tzLocal.thermostat,
            tzLocal.thermostat_ui,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l3: 3, l2: 2, l1: 1};
        },
        exposes: [
            e.temperature().withAccess(ea.STATE_GET).withEndpoint("l2"),
            e.humidity().withEndpoint("l2"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l3"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l3"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l3"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l3"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables/disables physical input on the device").withEndpoint("l1"),
            e
                .numeric("brightness", ea.ALL)
                .withUnit("%")
                .withValueMax(100)
                .withValueMin(0)
                .withValueStep(1)
                .withDescription("Display brightness")
                .withEndpoint("l1"),
            e
                .numeric("brightness_standby", ea.ALL)
                .withUnit("%")
                .withValueMax(100)
                .withValueMin(0)
                .withValueStep(1)
                .withDescription("Display brightness in standby mode")
                .withEndpoint("l1"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msTemperatureMeasurement", "msRelativeHumidity"]);
            await endpoint2.read("msRelativeHumidity", ["measuredValue"]);
            await endpoint2.read("msTemperatureMeasurement", ["measuredValue"]);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint3.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
            await endpoint3.read("hvacThermostat", [30464, 30465], manufacturerOptions);
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint1.read("hvacUserInterfaceCfg", [30464, 30465], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ["L101Z-SBN"],
        model: "L101Z-SBN",
        vendor: "Lytko",
        description: "Single channel Zigbee thermostat",
        ota: true,
        fromZigbee: [fz.thermostat, fzLocal.thermostat, fzLocal.thermostat_ui],
        toZigbee: [
            tz.thermostat_keypad_lockout,
            tz.temperature,
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tzLocal.thermostat,
            tzLocal.thermostat_ui,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l3: 3, l1: 1};
        },
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l3"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l3"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l3"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l3"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables/disables physical input on the device").withEndpoint("l1"),
            e
                .numeric("brightness", ea.ALL)
                .withUnit("%")
                .withValueMax(100)
                .withValueMin(0)
                .withValueStep(1)
                .withDescription("Display brightness")
                .withEndpoint("l1"),
            e
                .numeric("brightness_standby", ea.ALL)
                .withUnit("%")
                .withValueMax(100)
                .withValueMin(0)
                .withValueStep(1)
                .withDescription("Display brightness in standby mode")
                .withEndpoint("l1"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint3.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
            await endpoint3.read("hvacThermostat", [30464, 30465], manufacturerOptions);
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint1.read("hvacUserInterfaceCfg", [30464, 30465], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ["L101Z-SLN"],
        model: "L101Z-SLN",
        vendor: "Lytko",
        description: "Single channel Zigbee thermostat without screen",
        ota: true,
        fromZigbee: [fz.thermostat, fzLocal.thermostat],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tzLocal.thermostat,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l3: 3, l1: 1};
        },
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l3"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l3"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l3"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l3"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint3.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
        },
    },
    {
        zigbeeModel: ["L101Z-DBI"],
        model: "L101Z-DBI",
        vendor: "Lytko",
        description: "Dual channel Zigbee thermostat",
        ota: true,
        fromZigbee: [fz.humidity, fz.temperature, fz.thermostat, fzLocal.thermostat, fzLocal.thermostat_ui],
        toZigbee: [
            tz.thermostat_keypad_lockout,
            tz.temperature,
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tzLocal.thermostat,
            tzLocal.thermostat_ui,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l4: 4, l3: 3, l2: 2, l1: 1};
        },
        exposes: [
            e.temperature().withAccess(ea.STATE_GET).withEndpoint("l2"),
            e.humidity().withEndpoint("l2"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l3"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l3"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l3"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l3"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l4"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l4"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l4"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l4"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables/disables physical input on the device").withEndpoint("l1"),
            e
                .numeric("brightness", ea.ALL)
                .withUnit("%")
                .withValueMax(100)
                .withValueMin(0)
                .withValueStep(1)
                .withDescription("Display brightness")
                .withEndpoint("l1"),
            e
                .numeric("brightness_standby", ea.ALL)
                .withUnit("%")
                .withValueMax(100)
                .withValueMin(0)
                .withValueStep(1)
                .withDescription("Display brightness in standby mode")
                .withEndpoint("l1"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msTemperatureMeasurement", "msRelativeHumidity"]);
            await endpoint2.read("msRelativeHumidity", ["measuredValue"]);
            await endpoint2.read("msTemperatureMeasurement", ["measuredValue"]);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint3.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
            await endpoint3.read("hvacThermostat", [30464, 30465], manufacturerOptions);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint4.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
            await endpoint4.read("hvacThermostat", [30464, 30465], manufacturerOptions);
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint1.read("hvacUserInterfaceCfg", [30464, 30465], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ["L101Z-DBN"],
        model: "L101Z-DBN",
        vendor: "Lytko",
        description: "Dual channel zigbee thermostat",
        ota: true,
        fromZigbee: [fz.thermostat, fzLocal.thermostat, fzLocal.thermostat_ui],
        toZigbee: [
            tz.thermostat_keypad_lockout,
            tz.temperature,
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tzLocal.thermostat,
            tzLocal.thermostat_ui,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l4: 4, l3: 3, l1: 1};
        },
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l3"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l3"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l3"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l3"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l4"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l4"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l4"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l4"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables/disables physical input on the device").withEndpoint("l1"),
            e
                .numeric("brightness", ea.ALL)
                .withUnit("%")
                .withValueMax(100)
                .withValueMin(0)
                .withValueStep(1)
                .withDescription("Display brightness")
                .withEndpoint("l1"),
            e
                .numeric("brightness_standby", ea.ALL)
                .withUnit("%")
                .withValueMax(100)
                .withValueMin(0)
                .withValueStep(1)
                .withDescription("Display brightness in standby mode")
                .withEndpoint("l1"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint3.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
            await endpoint3.read("hvacThermostat", [30464, 30465], manufacturerOptions);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint4.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
            await endpoint4.read("hvacThermostat", [30464, 30465], manufacturerOptions);
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint1.read("hvacUserInterfaceCfg", [30464, 30465], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ["L101Z-DLN"],
        model: "L101Z-DLN",
        vendor: "Lytko",
        description: "Dual channel Zigbee thermostat without screen",
        ota: true,
        fromZigbee: [fz.thermostat, fzLocal.thermostat],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tzLocal.thermostat,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l4: 4, l3: 3, l1: 1};
        },
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l3"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l3"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l3"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l3"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3.0, 3.0, 0.1)
                .withEndpoint("l4"),
            e
                .numeric("min_setpoint_deadband", ea.ALL)
                .withUnit("C")
                .withValueMax(3)
                .withValueMin(0)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting")
                .withEndpoint("l4"),
            e.enum("sensor_type", ea.ALL, sensorTypes).withDescription("Type of sensor. Sensor resistance value (kOhm)").withEndpoint("l4"),
            e
                .binary("target_temp_first", ea.ALL, true, false)
                .withDescription("Display current temperature or target temperature")
                .withEndpoint("l4"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint3);
            await endpoint3.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint3.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
            await endpoint3.read("hvacThermostat", [30464, 30465], manufacturerOptions);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint4, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "localTemp", minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "occupiedHeatingSetpoint", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 50},
            ]);
            await reporting.thermostatSystemMode(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "systemMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await reporting.thermostatRunningMode(endpoint4);
            await endpoint4.configureReporting("hvacThermostat", [
                {attribute: "runningMode", minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1},
            ]);
            await endpoint4.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode", "runningMode"]);
        },
    },
    {
        zigbeeModel: ["L101Ze-SLN"],
        model: "L101Ze-SLN",
        vendor: "LYTKO",
        description: "Single channel thermostat without display",
        ota: true,
        meta: {multiEndpoint: true},
        extend: [
            deviceAddCustomCluster("hvacThermostat", {
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    occupiedSetback: {
                        ID: 0x0034,
                        type: Zcl.DataType.UINT8,

                        write: true,
                        max: 0xff,
                    },
                    lytkoSensor: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceEndpoints({
                endpoints: {1: 1, 3: 3},
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "3",
            }),
            identify(),
            numeric<"hvacThermostat", LytoThermostat>({
                name: "occupied_setback",
                description: "Hysteresis",
                unit: "°C",
                cluster: "hvacThermostat",
                attribute: "occupiedSetback",
                scale: 10,
                valueMin: 1.0,
                valueMax: 2.5,
                valueStep: 0.1,
                precision: 1,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointNames: ["3"],
                entityCategory: "config",
            }),
            enumLookup({
                name: "remote_sensing",
                label: "Remote sensing",
                description: "",
                lookup: {internally: 0, remotely: 1},
                cluster: "hvacThermostat",
                attribute: "remoteSensing",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["L101Ze-SLM"],
        model: "L101Ze-SLM",
        vendor: "LYTKO",
        description: "Single channel thermostat without display",
        ota: true,
        meta: {multiEndpoint: true},
        extend: [
            deviceAddCustomCluster("hvacThermostat", {
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    occupiedSetback: {
                        ID: 0x0034,
                        type: Zcl.DataType.UINT8,

                        write: true,
                        max: 0xff,
                    },
                    lytkoSensor: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceEndpoints({
                endpoints: {1: 1, 3: 3},
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "3",
            }),
            identify(),
            numeric<"hvacThermostat", LytoThermostat>({
                name: "occupied_setback",
                description: "Hysteresis",
                unit: "°C",
                cluster: "hvacThermostat",
                attribute: "occupiedSetback",
                scale: 10,
                valueMin: 1.0,
                valueMax: 2.5,
                valueStep: 0.1,
                precision: 1,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointNames: ["3"],
                entityCategory: "config",
            }),
            enumLookup({
                name: "remote_sensing",
                label: "Remote sensing",
                description: "",
                lookup: {internally: 0, remotely: 1},
                cluster: "hvacThermostat",
                attribute: "remoteSensing",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            numeric({
                name: "power_apparent",
                label: "Power Apparent",
                description: "Power apparent",
                unit: "VA",
                cluster: "haElectricalMeasurement",
                attribute: "apparentPower",
                precision: 1,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                access: "STATE_GET",
                endpointNames: ["3"],
            }),
            electricityMeter({
                type: "electricity",
                cluster: "both",
                voltage: false,
                power: false,
                endpointNames: ["3"],
                configureReporting: true,
            }),
        ],
    },
    {
        zigbeeModel: ["L101Ze-SBN"],
        model: "L101Ze-SBN",
        vendor: "LYTKO",
        description: "Single channel thermostat with big display",
        ota: true,
        meta: {multiEndpoint: true},
        extend: [
            deviceAddCustomCluster("hvacThermostat", {
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    occupiedSetback: {
                        ID: 0x0034,
                        type: Zcl.DataType.UINT8,

                        write: true,
                        max: 0xff,
                    },
                    lytkoSensor: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                    lytkoTargetFirst: {
                        ID: 0xff01,
                        type: Zcl.DataType.BOOLEAN,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceAddCustomCluster("hvacUserInterfaceCfg", {
                ID: Zcl.Clusters.hvacUserInterfaceCfg.ID,
                attributes: {
                    brignessActive: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                    brignessStandby: {
                        ID: 0xff01,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceEndpoints({
                endpoints: {1: 1, 3: 3},
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "3",
            }),
            identify(),
            binary({
                name: "child_lock",
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                description: "Enables/disables physical input on the device",
                access: "ALL",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                valueOn: ["lock", 1],
                valueOff: ["unlock", 0],
                entityCategory: "config",
            }),
            numeric<"hvacUserInterfaceCfg", LytoUIThermostat>({
                name: "brigness_Active",
                label: "Brigness Active",
                description: "Display brightness in work mode",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: "brignessActive",
                valueMin: 0,
                valueMax: 100,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                access: "ALL",
                entityCategory: "config",
            }),
            numeric<"hvacUserInterfaceCfg", LytoUIThermostat>({
                name: "brigness_Standby",
                label: "Brigness Standby",
                description: "Display brightness in standby mode",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: "brignessStandby",
                valueMin: 0,
                valueMax: 100,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                access: "ALL",
                entityCategory: "config",
            }),
            numeric<"hvacThermostat", LytoThermostat>({
                name: "occupied_setback",
                description: "Hysteresis",
                unit: "°C",
                cluster: "hvacThermostat",
                attribute: "occupiedSetback",
                scale: 10,
                valueMin: 1.0,
                valueMax: 2.5,
                valueStep: 0.1,
                precision: 1,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointNames: ["3"],
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "target_first",
                label: "First temperature",
                description: "Display target/current temperature first",
                lookup: {Target: 0, Current: 1},
                cluster: "hvacThermostat",
                attribute: "lytkoTargetFirst",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["L101Ze-DLN"],
        model: "L101Ze-DLN",
        vendor: "LYTKO",
        description: "Dual channel thermostat without display",
        ota: true,
        meta: {multiEndpoint: true},
        extend: [
            deviceAddCustomCluster("hvacThermostat", {
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    occupiedSetback: {
                        ID: 0x0034,
                        type: Zcl.DataType.UINT8,

                        write: true,
                        max: 0xff,
                    },
                    lytkoSensor: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceEndpoints({
                endpoints: {1: 1, 3: 3, 4: 4},
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "3",
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "4",
            }),
            identify(),
            numeric<"hvacThermostat", LytoThermostat>({
                name: "occupied_setback",
                description: "Hysteresis",
                unit: "°C",
                cluster: "hvacThermostat",
                attribute: "occupiedSetback",
                scale: 10,
                valueMin: 1.0,
                valueMax: 2.5,
                valueStep: 0.1,
                precision: 1,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointNames: ["3", "4"],
                entityCategory: "config",
            }),
            enumLookup({
                name: "remote_sensing",
                label: "Remote sensing",
                description: "",
                lookup: {internally: 0, remotely: 1},
                cluster: "hvacThermostat",
                attribute: "remoteSensing",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                entityCategory: "config",
            }),
            enumLookup({
                name: "remote_sensing",
                label: "Remote sensing",
                description: "",
                lookup: {internally: 0, remotely: 1},
                cluster: "hvacThermostat",
                attribute: "remoteSensing",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "4",
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "4",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["L101Ze-DLM"],
        model: "L101Ze-DLM",
        vendor: "LYTKO",
        description: "Dual channel thermostat without display",
        ota: true,
        meta: {multiEndpoint: true},
        extend: [
            deviceAddCustomCluster("hvacThermostat", {
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    occupiedSetback: {
                        ID: 0x0034,
                        type: Zcl.DataType.UINT8,

                        write: true,
                        max: 0xff,
                    },
                    lytkoSensor: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceEndpoints({
                endpoints: {1: 1, 3: 3, 4: 4},
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "3",
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "4",
            }),
            identify(),
            numeric<"hvacThermostat", LytoThermostat>({
                name: "occupied_setback",
                description: "Hysteresis",
                unit: "°C",
                cluster: "hvacThermostat",
                attribute: "occupiedSetback",
                scale: 10,
                valueMin: 1.0,
                valueMax: 2.5,
                valueStep: 0.1,
                precision: 1,
                reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
                endpointNames: ["3", "4"],
                entityCategory: "config",
            }),
            enumLookup({
                name: "remote_sensing",
                label: "Remote sensing",
                description: "",
                lookup: {internally: 0, remotely: 1},
                cluster: "hvacThermostat",
                attribute: "remoteSensing",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                entityCategory: "config",
            }),
            enumLookup({
                name: "remote_sensing",
                label: "Remote sensing",
                description: "",
                lookup: {internally: 0, remotely: 1},
                cluster: "hvacThermostat",
                attribute: "remoteSensing",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "4",
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "4",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            numeric({
                name: "power_apparent",
                label: "Power Apparent",
                description: "Power apparent",
                unit: "VA",
                cluster: "haElectricalMeasurement",
                attribute: "apparentPower",
                precision: 1,
                reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
                access: "STATE_GET",
                endpointNames: ["3", "4"],
            }),
            electricityMeter({
                type: "electricity",
                cluster: "both",
                voltage: false,
                power: false,
                endpointNames: ["3", "4"],
                configureReporting: true,
            }),
        ],
    },
    {
        zigbeeModel: ["L101Ze-DBN"],
        model: "L101Ze-DBN",
        vendor: "LYTKO",
        description: "Dual channel thermostat with big display",
        ota: true,
        meta: {multiEndpoint: true},
        extend: [
            deviceAddCustomCluster("hvacThermostat", {
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    occupiedSetback: {
                        ID: 0x0034,
                        type: Zcl.DataType.UINT8,

                        write: true,
                        max: 0xff,
                    },
                    lytkoSensor: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                    lytkoTargetFirst: {
                        ID: 0xff01,
                        type: Zcl.DataType.BOOLEAN,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceAddCustomCluster("hvacUserInterfaceCfg", {
                ID: Zcl.Clusters.hvacUserInterfaceCfg.ID,
                attributes: {
                    brignessActive: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                    brignessStandby: {
                        ID: 0xff01,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceEndpoints({
                endpoints: {1: 1, 3: 3, 4: 4},
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "3",
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "4",
            }),
            identify(),
            binary({
                name: "child_lock",
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                description: "Enables/disables physical input on the device",
                access: "ALL",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                valueOn: ["lock", 1],
                valueOff: ["unlock", 0],
                entityCategory: "config",
            }),
            numeric<"hvacUserInterfaceCfg", LytoUIThermostat>({
                name: "brigness_Active",
                label: "Brigness Active",
                description: "Display brightness in work mode",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: "brignessActive",
                valueMin: 0,
                valueMax: 100,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                access: "ALL",
                entityCategory: "config",
            }),
            numeric<"hvacUserInterfaceCfg", LytoUIThermostat>({
                name: "brigness_Standby",
                label: "Brigness Standby",
                description: "Display brightness in standby mode",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: "brignessStandby",
                valueMin: 0,
                valueMax: 100,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                access: "ALL",
                entityCategory: "config",
            }),
            numeric<"hvacThermostat", LytoThermostat>({
                name: "occupied_setback",
                description: "Hysteresis",
                unit: "°C",
                cluster: "hvacThermostat",
                attribute: "occupiedSetback",
                scale: 10,
                valueMin: 1.0,
                valueMax: 2.5,
                valueStep: 0.1,
                precision: 1,
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointNames: ["3", "4"],
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type_3",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type_4",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "4",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "target_first_3",
                label: "First temperature",
                description: "Display target/current temperature first",
                lookup: {Target: 0, Current: 1},
                cluster: "hvacThermostat",
                attribute: "lytkoTargetFirst",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "target_first_4",
                label: "First temperature",
                description: "Display target/current temperature first",
                lookup: {Target: 0, Current: 1},
                cluster: "hvacThermostat",
                attribute: "lytkoTargetFirst",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "4",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["L101Ze-SMN"],
        model: "L101Ze-SMN",
        vendor: "LYTKO",
        description: "Single channel thermostat with small display",
        ota: true,
        meta: {multiEndpoint: true},
        extend: [
            deviceAddCustomCluster("hvacThermostat", {
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    occupiedSetback: {
                        ID: 0x0034,
                        type: Zcl.DataType.UINT8,

                        write: true,
                        max: 0xff,
                    },
                    lytkoSensor: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                    lytkoTargetFirst: {
                        ID: 0xff01,
                        type: Zcl.DataType.BOOLEAN,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceAddCustomCluster("hvacUserInterfaceCfg", {
                ID: Zcl.Clusters.hvacUserInterfaceCfg.ID,
                attributes: {
                    brignessActive: {
                        ID: 0xff00,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                    brignessStandby: {
                        ID: 0xff01,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: manufacturerOptions.manufacturerCode,

                        write: true,
                        max: 0xff,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            deviceEndpoints({
                endpoints: {1: 1, 3: 3},
            }),
            thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                systemMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                runningMode: {
                    values: ["off", "heat"],
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperatureCalibration: {
                    values: {min: -2.5, max: 2.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: "2_MINUTES", change: 50}},
                },
                localTemperature: {
                    configure: {reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 50}},
                },
                endpoint: "3",
            }),
            identify(),
            binary({
                name: "child_lock",
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                description: "Enables/disables physical input on the device",
                access: "ALL",
                reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
                valueOn: ["lock", 1],
                valueOff: ["unlock", 0],
                entityCategory: "config",
            }),
            numeric<"hvacThermostat", LytoThermostat>({
                name: "occupied_setback",
                description: "Hysteresis",
                unit: "°C",
                cluster: "hvacThermostat",
                attribute: "occupiedSetback",
                scale: 10,
                valueMin: 1.0,
                valueMax: 2.5,
                valueStep: 0.1,
                precision: 1,
                reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
                endpointNames: ["3"],
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "sensor_type",
                label: "Sensor",
                description: "Sensor type",
                lookup: {"3.3K": 0, "5.0K": 1, "6.8K": 2, "10.0K": 3, "12.0K": 4, "14.8K": 5, "15.0K": 6, "20.0K": 7, "33.0K": 8, "47.0K": 9},
                cluster: "hvacThermostat",
                attribute: "lytkoSensor",
                reporting: {min: "1_MINUTE", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            enumLookup<"hvacThermostat", LytoThermostat>({
                name: "target_first",
                label: "First temperature",
                description: "Display target/current temperature first",
                lookup: {Target: 0, Current: 1},
                cluster: "hvacThermostat",
                attribute: "lytkoTargetFirst",
                reporting: {min: "1_SECOND", max: "1_HOUR", change: 1},
                endpointName: "3",
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
        ],
    },
];
