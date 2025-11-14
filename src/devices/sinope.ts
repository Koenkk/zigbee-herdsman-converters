import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import {precisionRound} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const manuSinope = {manufacturerCode: Zcl.ManufacturerCode.SINOPE_TECHNOLOGIES};

const fzLocal = {
    ias_water_leak_alarm: {
        // RM3500ZB specific
        cluster: "ssIasZone",
        type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
            return {
                water_leak: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & (1 << 2)) > 0,
            };
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
    thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            // @ts-expect-error ignore
            delete msg.running_state;
            const result: KeyValue = {};
            const occupancyLookup = {0: "unoccupied", 1: "occupied"};
            const cycleOutputLookup = {15: "15_sec", 300: "5_min", 600: "10_min", 900: "15_min", 1200: "20_min", 1800: "30_min", 65535: "off"};

            if (msg.data["1024"] !== undefined) {
                result.thermostat_occupancy = utils.getFromLookup(msg.data["1024"], occupancyLookup);
            }
            if (msg.data.SinopeOccupancy !== undefined) {
                result.thermostat_occupancy = utils.getFromLookup(msg.data.SinopeOccupancy, occupancyLookup);
            }
            if (msg.data["1025"] !== undefined) {
                result.main_cycle_output = utils.getFromLookup(msg.data["1025"], cycleOutputLookup);
            }
            if (msg.data.SinopeMainCycleOutput !== undefined) {
                result.main_cycle_output = utils.getFromLookup(msg.data.SinopeMainCycleOutput, cycleOutputLookup);
            }
            if (msg.data["1026"] !== undefined) {
                const lookup = {0: "on_demand", 1: "sensing", 2: "off"};
                result.backlight_auto_dim = utils.getFromLookup(msg.data["1026"], lookup);
            }
            if (msg.data.SinopeBacklight !== undefined) {
                const lookup = {0: "on_demand", 1: "sensing", 2: "off"};
                result.backlight_auto_dim = utils.getFromLookup(msg.data.SinopeBacklight, lookup);
            }
            if (msg.data["1028"] !== undefined) {
                result.aux_cycle_output = utils.getFromLookup(msg.data["1028"], cycleOutputLookup);
            }
            if (msg.data.localTemp !== undefined) {
                result.local_temperature = precisionRound(msg.data.localTemp, 2) / 100;
            }
            if (msg.data.localTemperatureCalibration !== undefined) {
                result.local_temperature_calibration = precisionRound(msg.data.localTemperatureCalibration, 2) / 10;
            }
            if (msg.data.outdoorTemp !== undefined) {
                result.outdoor_temperature = precisionRound(msg.data.outdoorTemp, 2) / 100;
            }
            if (msg.data.occupiedHeatingSetpoint !== undefined) {
                result.occupied_heating_setpoint = precisionRound(msg.data.occupiedHeatingSetpoint, 2) / 100;
            }
            if (msg.data.unoccupiedHeatingSetpoint !== undefined) {
                result.unoccupied_heating_setpoint = precisionRound(msg.data.unoccupiedHeatingSetpoint, 2) / 100;
            }
            if (msg.data.occupiedCoolingSetpoint !== undefined) {
                result.occupied_cooling_setpoint = precisionRound(msg.data.occupiedCoolingSetpoint, 2) / 100;
            }
            if (msg.data.unoccupiedCoolingSetpoint !== undefined) {
                result.unoccupied_cooling_setpoint = precisionRound(msg.data.unoccupiedCoolingSetpoint, 2) / 100;
            }
            if (msg.data.ctrlSeqeOfOper !== undefined) {
                result.control_sequence_of_operation = constants.thermostatControlSequenceOfOperations[msg.data.ctrlSeqeOfOper];
            }
            if (msg.data.systemMode !== undefined) {
                result.system_mode = constants.thermostatSystemModes[msg.data.systemMode];
            }
            if (msg.data.pIHeatingDemand !== undefined) {
                result.pi_heating_demand = precisionRound(msg.data.pIHeatingDemand, 0);
            }
            if (msg.data.minHeatSetpointLimit !== undefined) {
                result.min_heat_setpoint_limit = precisionRound(msg.data.minHeatSetpointLimit, 2) / 100;
            }
            if (msg.data.maxHeatSetpointLimit !== undefined) {
                result.max_heat_setpoint_limit = precisionRound(msg.data.maxHeatSetpointLimit, 2) / 100;
            }
            if (msg.data.absMinHeatSetpointLimit !== undefined) {
                result.abs_min_heat_setpoint_limit = precisionRound(msg.data.absMinHeatSetpointLimit, 2) / 100;
            }
            if (msg.data.absMaxHeatSetpointLimit !== undefined) {
                result.abs_max_heat_setpoint_limit = precisionRound(msg.data.absMaxHeatSetpointLimit, 2) / 100;
            }
            if (msg.data.pIHeatingDemand !== undefined) {
                result.running_state = msg.data.pIHeatingDemand >= 10 ? "heat" : "idle";
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    tank_level: {
        cluster: "genAnalogInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.presentValue !== undefined) {
                let x = msg.data.presentValue;
                if (x === -1) {
                    result.tank_level = 0;
                } else {
                    const xMin = 110;
                    const xMax = 406;
                    const delta = 46;
                    if (delta <= x && x <= 70) {
                        x = delta;
                    }
                    if (0 <= x && x <= delta) {
                        x = x + 360;
                    }
                    const y = (x - xMin) / (xMax - xMin);
                    const lowerLimit = 10;
                    const upperLimit = 80;
                    const valueRange = upperLimit - lowerLimit;
                    const pct = y * valueRange + lowerLimit;

                    result.tank_level = utils.precisionRound(pct, 2);
                }
            }
            return result;
        },
    } satisfies Fz.Converter<"genAnalogInput", undefined, ["attributeReport", "readResponse"]>,
    sinope: {
        cluster: "manuSpecificSinope",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.GFCiStatus !== undefined) {
                const lookup = {0: "off", 1: "on"};
                result.gfci_status = utils.getFromLookup(msg.data.GFCiStatus, lookup);
            }
            if (msg.data.floorLimitStatus !== undefined) {
                const lookup = {0: "off", 1: "on"};
                result.floor_limit_status = utils.getFromLookup(msg.data.floorLimitStatus, lookup);
            }
            if (msg.data.secondScreenBehavior !== undefined) {
                const lookup = {0: "auto", 1: "setpoint", 2: "outdoor temp"};
                result.second_display_mode = utils.getFromLookup(msg.data.secondScreenBehavior, lookup);
            }
            if (msg.data.outdoorTempToDisplayTimeout !== undefined) {
                result.outdoor_temperature_timeout = msg.data.outdoorTempToDisplayTimeout;
                // DEPRECATED: Use Second Display Mode or control via set outdoorTempToDisplayTimeout
                result.enable_outdoor_temperature = msg.data.outdoorTempToDisplayTimeout === 12 ? "OFF" : "ON";
            }
            if (msg.data.outdoorTempToDisplay !== undefined) {
                result.thermostat_outdoor_temperature = precisionRound(msg.data.outdoorTempToDisplay, 2) / 100;
            }
            if (msg.data.currentTimeToDisplay !== undefined) {
                result.current_time_to_display = msg.data.currentTimeToDisplay;
            }
            if (msg.data.floorControlMode !== undefined) {
                const lookup = {1: "ambiant", 2: "floor"};
                result.floor_control_mode = utils.getFromLookup(msg.data.floorControlMode, lookup);
            }
            if (msg.data.ambiantMaxHeatSetpointLimit !== undefined) {
                result.ambiant_max_heat_setpoint = msg.data.ambiantMaxHeatSetpointLimit / 100.0;
                if (result.ambiant_max_heat_setpoint === -327.68) {
                    result.ambiant_max_heat_setpoint = "off";
                }
            }
            if (msg.data.floorMinHeatSetpointLimit !== undefined) {
                result.floor_min_heat_setpoint = msg.data.floorMinHeatSetpointLimit / 100.0;
                if (result.floor_min_heat_setpoint === -327.68) {
                    result.floor_min_heat_setpoint = "off";
                }
            }
            if (msg.data.floorMaxHeatSetpointLimit !== undefined) {
                result.floor_max_heat_setpoint = msg.data.floorMaxHeatSetpointLimit / 100.0;
                if (result.floor_max_heat_setpoint === -327.68) {
                    result.floor_max_heat_setpoint = "off";
                }
            }
            if (msg.data.temperatureSensor !== undefined) {
                const lookup = {0: "10k", 1: "12k"};
                result.floor_temperature_sensor = utils.getFromLookup(msg.data.temperatureSensor, lookup);
            }
            if (msg.data.timeFormatToDisplay !== undefined) {
                const lookup = {0: "24h", 1: "12h"};
                result.time_format = utils.getFromLookup(msg.data.timeFormatToDisplay, lookup);
            }
            if (msg.data.connectedLoad !== undefined) {
                result.connected_load = msg.data.connectedLoad;
            }
            if (msg.data.auxConnectedLoad !== undefined) {
                result.aux_connected_load = msg.data.auxConnectedLoad;
                if (result.aux_connected_load === 65535) {
                    result.aux_connected_load = "disabled";
                }
            }
            if (msg.data.pumpProtection !== undefined) {
                result.pump_protection = msg.data.pumpProtection === 1 ? "ON" : "OFF";
            }
            if (msg.data.dimmerTimmer !== undefined) {
                result.timer_seconds = msg.data.dimmerTimmer;
            }
            if (msg.data.ledIntensityOn !== undefined) {
                result.led_intensity_on = msg.data.ledIntensityOn;
            }
            if (msg.data.ledIntensityOff !== undefined) {
                result.led_intensity_off = msg.data.ledIntensityOff;
            }
            if (msg.data.minimumBrightness !== undefined) {
                result.minimum_brightness = msg.data.minimumBrightness;
            }
            if (msg.data.actionReport !== undefined) {
                const lookup = {
                    1: "up_clickdown",
                    2: "up_single",
                    3: "up_hold",
                    4: "up_double",
                    17: "down_clickdown",
                    18: "down_single",
                    19: "down_hold",
                    20: "down_double",
                };
                result.action = utils.getFromLookup(msg.data.actionReport, lookup);
            }
            if (msg.data.keypadLockout !== undefined) {
                const lookup = {0: "unlock", 1: "lock"};
                result.keypad_lockout = utils.getFromLookup(msg.data.keypadLockout, lookup);
            }
            if (msg.data.drConfigWaterTempMin !== undefined) {
                result.low_water_temp_protection = msg.data.drConfigWaterTempMin;
            }
            return result;
        },
    } satisfies Fz.Converter<"manuSpecificSinope", undefined, ["attributeReport", "readResponse"]>,
};
const tzLocal = {
    thermostat_occupancy: {
        key: ["thermostat_occupancy"],
        convertSet: async (entity, key, value, meta) => {
            const sinopeOccupancy = {0: "unoccupied", 1: "occupied"};
            const SinopeOccupancy = utils.getKey(sinopeOccupancy, value, value as number, Number);
            await entity.write("hvacThermostat", {SinopeOccupancy}, manuSinope);
            return {state: {thermostat_occupancy: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["SinopeOccupancy"], manuSinope);
        },
    } satisfies Tz.Converter,
    backlight_autodim: {
        key: ["backlight_auto_dim"],
        convertSet: async (entity, key, value, meta) => {
            const sinopeBacklightParam = {0: "on_demand", 1: "sensing", 2: "off"};
            const SinopeBacklight = utils.getKey(sinopeBacklightParam, value, value as number, Number);
            await entity.write("hvacThermostat", {SinopeBacklight}, manuSinope);
            return {state: {backlight_auto_dim: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["SinopeBacklight"], manuSinope);
        },
    } satisfies Tz.Converter,
    main_cycle_output: {
        key: ["main_cycle_output"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {"15_sec": 15, "5_min": 300, "10_min": 600, "15_min": 900, "20_min": 1200, "30_min": 1800};
            await entity.write("hvacThermostat", {SinopeMainCycleOutput: utils.getFromLookup(value, lookup)}, manuSinope);
            return {state: {main_cycle_output: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["SinopeMainCycleOutput"], manuSinope);
        },
    } satisfies Tz.Converter,
    aux_cycle_output: {
        // TH1400ZB specific
        key: ["aux_cycle_output"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {off: 65535, "15_sec": 15, "5_min": 300, "10_min": 600, "15_min": 900, "20_min": 1200, "30_min": 1800};
            await entity.write("hvacThermostat", {SinopeAuxCycleOutput: utils.getFromLookup(value, lookup)});
            return {state: {aux_cycle_output: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["SinopeAuxCycleOutput"]);
        },
    } satisfies Tz.Converter,
    enable_outdoor_temperature: {
        // DEPRECATED: Use Second Display Mode or control via the timeout
        key: ["enable_outdoor_temperature"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (value.toLowerCase() === "on") {
                await entity.write("manuSpecificSinope", {outdoorTempToDisplayTimeout: 10800}, manuSinope);
            } else if (value.toLowerCase() === "off") {
                // set timer to 12 sec in order to disable outdoor temperature
                await entity.write("manuSpecificSinope", {outdoorTempToDisplayTimeout: 12}, manuSinope);
            }
            return {state: {enable_outdoor_temperature: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["outdoorTempToDisplayTimeout"], manuSinope);
        },
    } satisfies Tz.Converter,
    second_display_mode: {
        key: ["second_display_mode"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {auto: 0, setpoint: 1, "outdoor temp": 2};
            await entity.write("manuSpecificSinope", {secondScreenBehavior: utils.getFromLookup(value, lookup)});
            return {state: {second_display_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["secondScreenBehavior"]);
        },
    } satisfies Tz.Converter,
    thermostat_outdoor_temperature: {
        key: ["thermostat_outdoor_temperature"],
        convertSet: async (entity, key, value, meta) => {
            const number = utils.toNumber(value);
            if (number >= -99.5 && number <= 99.5) {
                await entity.write("manuSpecificSinope", {outdoorTempToDisplay: number * 100}, manuSinope);
            }
            return {state: {thermostat_outdoor_temperature: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["outdoorTempToDisplay"], manuSinope);
        },
    } satisfies Tz.Converter,
    outdoor_temperature_timeout: {
        key: ["outdoor_temperature_timeout"],
        convertSet: async (entity, key, value, meta) => {
            const number = utils.toNumber(value);
            if (number >= 30 && number <= 64800) {
                await entity.write("manuSpecificSinope", {outdoorTempToDisplayTimeout: number});
                return {state: {outdoor_temperature_timeout: number}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["outdoorTempToDisplayTimeout"]);
        },
    } satisfies Tz.Converter,
    thermostat_time: {
        key: ["thermostat_time"],
        convertSet: async (entity, key, value, meta) => {
            if (value === "") {
                const thermostatDate = new Date();
                const thermostatTimeSec = thermostatDate.getTime() / 1000;
                const thermostatTimezoneOffsetSec = thermostatDate.getTimezoneOffset() * 60;
                const currentTimeToDisplay = Math.round(thermostatTimeSec - thermostatTimezoneOffsetSec - 946684800);
                await entity.write("manuSpecificSinope", {currentTimeToDisplay}, manuSinope);
            } else if (value !== "") {
                await entity.write("manuSpecificSinope", {currentTimeToDisplay: value as number}, manuSinope);
            }
        },
    } satisfies Tz.Converter,
    floor_control_mode: {
        // TH1300ZB and TH1400ZB specific
        key: ["floor_control_mode"],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== "string") {
                return;
            }
            const lookup = {ambiant: 1, floor: 2};
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            value = value.toLowerCase();
            // @ts-expect-error ignore
            if (lookup[value] !== undefined) {
                await entity.write("manuSpecificSinope", {floorControlMode: utils.getFromLookup(value, lookup)});
            }
            return {state: {floor_control_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["floorControlMode"]);
        },
    } satisfies Tz.Converter,
    ambiant_max_heat_setpoint: {
        // TH1300ZB and TH1400ZB specific
        key: ["ambiant_max_heat_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            // @ts-expect-error ignore
            if ((value >= 5 && value <= 36) || value === "off") {
                // @ts-expect-error ignore
                await entity.write("manuSpecificSinope", {ambiantMaxHeatSetpointLimit: value === "off" ? -32768 : value * 100});
                return {state: {ambiant_max_heat_setpoint: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["ambiantMaxHeatSetpointLimit"]);
        },
    } satisfies Tz.Converter,
    floor_min_heat_setpoint: {
        // TH1300ZB and TH1400ZB specific
        key: ["floor_min_heat_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            // @ts-expect-error ignore
            if ((value >= 5 && value <= 34) || value === "off") {
                // @ts-expect-error ignore
                await entity.write("manuSpecificSinope", {floorMinHeatSetpointLimit: value === "off" ? -32768 : value * 100});
                return {state: {floor_min_heat_setpoint: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["floorMinHeatSetpointLimit"]);
        },
    } satisfies Tz.Converter,
    floor_max_heat_setpoint: {
        // TH1300ZB and TH1400ZB specific
        key: ["floor_max_heat_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            // @ts-expect-error ignore
            if ((value >= 7 && value <= 36) || value === "off") {
                // @ts-expect-error ignore
                await entity.write("manuSpecificSinope", {floorMaxHeatSetpointLimit: value === "off" ? -32768 : value * 100});
                return {state: {floor_max_heat_setpoint: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["floorMaxHeatSetpointLimit"]);
        },
    } satisfies Tz.Converter,
    temperature_sensor: {
        // TH1300ZB and TH1400ZB specific
        key: ["floor_temperature_sensor"],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== "string") {
                return;
            }
            const lookup = {"10k": 0, "12k": 1};
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            value = value.toLowerCase();
            // @ts-expect-error ignore
            if (lookup[value] !== undefined) {
                await entity.write("manuSpecificSinope", {temperatureSensor: utils.getFromLookup(value, lookup)});
            }
            return {state: {floor_temperature_sensor: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["temperatureSensor"]);
        },
    } satisfies Tz.Converter,
    time_format: {
        key: ["time_format"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("manuSpecificSinope", {timeFormatToDisplay: utils.getFromLookup(value, {"24h": 0, "12h": 1})}, manuSinope);
            return {state: {time_format: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["timeFormatToDisplay"], manuSinope);
        },
    } satisfies Tz.Converter,
    connected_load: {
        // TH1400ZB and SW2500ZB
        key: ["connected_load"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("manuSpecificSinope", {connectedLoad: value as number});
            return {state: {connected_load: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["connectedLoad"]);
        },
    } satisfies Tz.Converter,
    aux_connected_load: {
        // TH1400ZB specific
        key: ["aux_connected_load"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("manuSpecificSinope", {auxConnectedLoad: value as number});
            return {state: {aux_connected_load: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["auxConnectedLoad"]);
        },
    } satisfies Tz.Converter,
    pump_protection: {
        // TH1400ZB specific
        key: ["pump_protection"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (value.toLowerCase() === "on") {
                await entity.write("manuSpecificSinope", {pumpProtection: 1});
            } else if (value.toLowerCase() === "off") {
                await entity.write("manuSpecificSinope", {pumpProtection: 255});
            }
            return {state: {pump_protection: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["pumpProtection"]);
        },
    } satisfies Tz.Converter,
    led_intensity_on: {
        // DM25x0ZB and SW2500ZB
        key: ["led_intensity_on"],
        convertSet: async (entity, key, value, meta) => {
            const number = utils.toNumber(value);
            if (number >= 0 && number <= 100) {
                await entity.write("manuSpecificSinope", {ledIntensityOn: number});
            }
            return {state: {led_intensity_on: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["ledIntensityOn"]);
        },
    } satisfies Tz.Converter,
    led_intensity_off: {
        // DM25x0ZB and SW2500ZB
        key: ["led_intensity_off"],
        convertSet: async (entity, key, value, meta) => {
            const number = utils.toNumber(value);
            if (number >= 0 && number <= 100) {
                await entity.write("manuSpecificSinope", {ledIntensityOff: number});
            }
            return {state: {led_intensity_off: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["ledIntensityOff"]);
        },
    } satisfies Tz.Converter,
    led_color_on: {
        // DM25x0ZB and SW2500ZB
        key: ["led_color_on"],
        convertSet: async (entity, key, value: KeyValueAny, meta) => {
            const r = value.r >= 0 && value.r <= 255 ? value.r : 0;
            const g = value.g >= 0 && value.g <= 255 ? value.g : 0;
            const b = value.b >= 0 && value.b <= 255 ? value.b : 0;

            const valueHex = r + g * 256 + b * 256 ** 2;
            await entity.write("manuSpecificSinope", {ledColorOn: valueHex});
        },
    } satisfies Tz.Converter,
    led_color_off: {
        // DM25x0ZB and SW2500ZB
        key: ["led_color_off"],
        convertSet: async (entity, key, value: KeyValueAny, meta) => {
            const r = value.r >= 0 && value.r <= 255 ? value.r : 0;
            const g = value.g >= 0 && value.g <= 255 ? value.g : 0;
            const b = value.b >= 0 && value.b <= 255 ? value.b : 0;

            const valueHex = r + g * 256 + b * 256 ** 2;
            await entity.write("manuSpecificSinope", {ledColorOff: valueHex});
        },
    } satisfies Tz.Converter,
    minimum_brightness: {
        // DM25x0ZB
        key: ["minimum_brightness"],
        convertSet: async (entity, key, value, meta) => {
            const number = utils.toNumber(value);
            if (number >= 0 && number <= 3000) {
                await entity.write("manuSpecificSinope", {minimumBrightness: number});
            }
            return {state: {minimumBrightness: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["minimumBrightness"]);
        },
    } satisfies Tz.Converter,
    timer_seconds: {
        // DM25x0ZB and SW2500ZB
        key: ["timer_seconds"],
        convertSet: async (entity, key, value, meta) => {
            const number = utils.toNumber(value);
            if (number >= 0 && number <= 65535) {
                await entity.write("manuSpecificSinope", {dimmerTimmer: number});
            }
            return {state: {timer_seconds: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["dimmerTimmer"]);
        },
    } satisfies Tz.Converter,
    keypad_lockout: {
        // SW2500ZB
        key: ["keypad_lockout"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {unlock: 0, lock: 1};
            await entity.write("manuSpecificSinope", {keypadLockout: utils.getFromLookup(value, lookup)});
            return {state: {keypad_lockout: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["keypadLockout"]);
        },
    } satisfies Tz.Converter,
    low_water_temp_protection: {
        // RM3500ZB specific
        key: ["low_water_temp_protection"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("manuSpecificSinope", {drConfigWaterTempMin: value as number});
            return {state: {low_water_temp_protection: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("manuSpecificSinope", ["drConfigWaterTempMin"]);
        },
    } satisfies Tz.Converter,
};
export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TH1123ZB"],
        model: "TH1123ZB",
        vendor: "Sinopé",
        description: "Zigbee line volt thermostat",
        extend: [m.electricityMeter()],
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.hvac_user_interface, fz.ignore_temperature_report],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tzLocal.backlight_autodim,
            tzLocal.thermostat_time,
            tzLocal.time_format,
            tzLocal.enable_outdoor_temperature,
            tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature,
            tzLocal.outdoor_temperature_timeout,
            tzLocal.thermostat_occupancy,
            tzLocal.main_cycle_output,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"], ea.ALL, "Mode of the thermostat")
                .withPiHeatingDemand()
                .withRunningState(["idle", "heat"], ea.STATE),
            e.enum("thermostat_occupancy", ea.ALL, ["unoccupied", "occupied"]).withDescription("Occupancy state of the thermostat"),
            e
                .enum("second_display_mode", ea.ALL, ["auto", "setpoint", "outdoor temp"])
                .withDescription(
                    'Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                        'in "outdoor temp" mode when expired.',
                ),
            e
                .numeric("thermostat_outdoor_temperature", ea.ALL)
                .withUnit("°C")
                .withValueMin(-99.5)
                .withValueMax(99.5)
                .withValueStep(0.5)
                .withDescription("Outdoor temperature for the secondary display"),
            e
                .numeric("outdoor_temperature_timeout", ea.ALL)
                .withUnit("s")
                .withValueMin(30)
                .withValueMax(64800)
                .withPreset("15 min", 900, "15 minutes")
                .withPreset("30 min", 1800, "30 minutes")
                .withPreset("1 hour", 3600, "1 hour")
                .withDescription("Time in seconds after which the outdoor temperature is considered to have expired"),
            e
                .binary("enable_outdoor_temperature", ea.ALL, "ON", "OFF")
                .withDescription("DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e.enum("time_format", ea.ALL, ["24h", "12h"]).withDescription("The time format featured on the thermostat display"),
            e.enum("backlight_auto_dim", ea.ALL, ["on_demand", "sensing"]).withDescription("Control backlight dimming behavior"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables or disables the device’s buttons"),
            e.enum("main_cycle_output", ea.ALL, ["15_sec", "15_min"]).withDescription("The length of the control cycle: 15_sec=normal 15_min=fan"),
        ],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msTemperatureMeasurement",
                "manuSpecificSinope",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            await reporting.temperature(endpoint, {min: 1, max: 0xffff}); // Disable default reporting
            await endpoint.configureReporting("msTemperatureMeasurement", [
                {
                    attribute: "tolerance",
                    minimumReportInterval: 1,
                    maximumReportInterval: 0xffff,
                    reportableChange: 1,
                },
            ]);
            try {
                await reporting.thermostatSystemMode(endpoint);
            } catch {
                /* Not all support this */
            }
        },
    },
    {
        zigbeeModel: ["TH1124ZB"],
        model: "TH1124ZB",
        vendor: "Sinopé",
        description: "Zigbee line volt thermostat",
        extend: [m.electricityMeter()],
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.hvac_user_interface, fz.ignore_temperature_report],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tzLocal.backlight_autodim,
            tzLocal.thermostat_time,
            tzLocal.time_format,
            tzLocal.enable_outdoor_temperature,
            tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature,
            tzLocal.outdoor_temperature_timeout,
            tzLocal.thermostat_occupancy,
            tzLocal.main_cycle_output,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"], ea.ALL, "Mode of the thermostat")
                .withPiHeatingDemand()
                .withRunningState(["idle", "heat"], ea.STATE),
            e.enum("thermostat_occupancy", ea.ALL, ["unoccupied", "occupied"]).withDescription("Occupancy state of the thermostat"),
            e
                .enum("second_display_mode", ea.ALL, ["auto", "setpoint", "outdoor temp"])
                .withDescription(
                    'Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                        'in "outdoor temp" mode when expired.',
                ),
            e
                .numeric("thermostat_outdoor_temperature", ea.ALL)
                .withUnit("°C")
                .withValueMin(-99.5)
                .withValueMax(99.5)
                .withValueStep(0.5)
                .withDescription("Outdoor temperature for the secondary display"),
            e
                .numeric("outdoor_temperature_timeout", ea.ALL)
                .withUnit("s")
                .withValueMin(30)
                .withValueMax(64800)
                .withPreset("15 min", 900, "15 minutes")
                .withPreset("30 min", 1800, "30 minutes")
                .withPreset("1 hour", 3600, "1 hour")
                .withDescription("Time in seconds after which the outdoor temperature is considered to have expired"),
            e
                .binary("enable_outdoor_temperature", ea.ALL, "ON", "OFF")
                .withDescription("DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e.enum("time_format", ea.ALL, ["24h", "12h"]).withDescription("The time format featured on the thermostat display"),
            e.enum("backlight_auto_dim", ea.ALL, ["on_demand", "sensing"]).withDescription("Control backlight dimming behavior"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables or disables the device’s buttons"),
            e.enum("main_cycle_output", ea.ALL, ["15_sec", "15_min"]).withDescription("The length of the control cycle: 15_sec=normal 15_min=fan"),
        ],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msTemperatureMeasurement",
                "manuSpecificSinope",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            await reporting.temperature(endpoint, {min: 1, max: 0xffff}); // Disable default reporting
            await endpoint.configureReporting("msTemperatureMeasurement", [
                {
                    attribute: "tolerance",
                    minimumReportInterval: 1,
                    maximumReportInterval: 0xffff,
                    reportableChange: 1,
                },
            ]);
            try {
                await reporting.thermostatSystemMode(endpoint);
            } catch {
                /* Not all support this */
            }
        },
    },
    {
        zigbeeModel: ["TH1123ZB-G2"],
        model: "TH1123ZB-G2",
        vendor: "Sinopé",
        description: "Zigbee line volt thermostat",
        extend: [m.electricityMeter({energy: {divisor: 1000, multiplier: 1}})],
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.hvac_user_interface, fz.ignore_temperature_report],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tzLocal.backlight_autodim,
            tzLocal.thermostat_time,
            tzLocal.time_format,
            tzLocal.enable_outdoor_temperature,
            tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature,
            tzLocal.outdoor_temperature_timeout,
            tzLocal.thermostat_occupancy,
            tzLocal.main_cycle_output,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"], ea.ALL, "Mode of the thermostat")
                .withPiHeatingDemand()
                .withRunningState(["idle", "heat"], ea.STATE),
            e.enum("thermostat_occupancy", ea.ALL, ["unoccupied", "occupied"]).withDescription("Occupancy state of the thermostat"),
            e
                .enum("second_display_mode", ea.ALL, ["auto", "setpoint", "outdoor temp"])
                .withDescription(
                    'Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                        'in "outdoor temp" mode when expired.',
                ),
            e
                .numeric("thermostat_outdoor_temperature", ea.ALL)
                .withUnit("°C")
                .withValueMin(-99.5)
                .withValueMax(99.5)
                .withValueStep(0.5)
                .withDescription("Outdoor temperature for the secondary display"),
            e
                .numeric("outdoor_temperature_timeout", ea.ALL)
                .withUnit("s")
                .withValueMin(30)
                .withValueMax(64800)
                .withPreset("15 min", 900, "15 minutes")
                .withPreset("30 min", 1800, "30 minutes")
                .withPreset("1 hour", 3600, "1 hour")
                .withDescription("Time in seconds after which the outdoor temperature is considered to have expired"),
            e
                .binary("enable_outdoor_temperature", ea.ALL, "ON", "OFF")
                .withDescription("DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e.enum("time_format", ea.ALL, ["24h", "12h"]).withDescription("The time format featured on the thermostat display"),
            e.enum("backlight_auto_dim", ea.ALL, ["on_demand", "sensing", "off"]).withDescription("Control backlight dimming behavior"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables or disables the device’s buttons"),
            e.enum("main_cycle_output", ea.ALL, ["15_sec", "15_min"]).withDescription("The length of the control cycle: 15_sec=normal 15_min=fan"),
        ],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msTemperatureMeasurement",
                "manuSpecificSinope",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds); // This G2 version has limited memory space
            const thermostatDate = new Date();
            const thermostatTimeSec = thermostatDate.getTime() / 1000;
            const thermostatTimezoneOffsetSec = thermostatDate.getTimezoneOffset() * 60;
            const currentTimeToDisplay = Math.round(thermostatTimeSec - thermostatTimezoneOffsetSec - 946684800);
            await endpoint.write("manuSpecificSinope", {currentTimeToDisplay}, manuSinope);
            await endpoint.write("manuSpecificSinope", {secondScreenBehavior: 0}, manuSinope); // Mode auto

            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);

            await reporting.temperature(endpoint, {min: 1, max: 0xffff}); // Disable default reporting
            await endpoint.configureReporting("msTemperatureMeasurement", [
                {
                    attribute: "tolerance",
                    minimumReportInterval: 1,
                    maximumReportInterval: 0xffff,
                    reportableChange: 1,
                },
            ]);

            // Disable default reporting (not used by Sinope)
            await reporting.thermostatRunningState(endpoint, {min: 1, max: 0xffff});
            try {
                await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            } catch {
                /* Do nothing */
            }
        },
    },
    {
        zigbeeModel: ["TH1124ZB-G2"],
        model: "TH1124ZB-G2",
        vendor: "Sinopé",
        description: "Zigbee line volt thermostat",
        extend: [m.electricityMeter()],
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.hvac_user_interface, fz.ignore_temperature_report],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tzLocal.backlight_autodim,
            tzLocal.thermostat_time,
            tzLocal.time_format,
            tzLocal.enable_outdoor_temperature,
            tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature,
            tzLocal.outdoor_temperature_timeout,
            tzLocal.thermostat_occupancy,
            tzLocal.main_cycle_output,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"], ea.ALL, "Mode of the thermostat")
                .withPiHeatingDemand()
                .withRunningState(["idle", "heat"], ea.STATE),
            e.enum("thermostat_occupancy", ea.ALL, ["unoccupied", "occupied"]).withDescription("Occupancy state of the thermostat"),
            e
                .enum("second_display_mode", ea.ALL, ["auto", "setpoint", "outdoor temp"])
                .withDescription(
                    'Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                        'in "outdoor temp" mode when expired.',
                ),
            e
                .numeric("thermostat_outdoor_temperature", ea.ALL)
                .withUnit("°C")
                .withValueMin(-99.5)
                .withValueMax(99.5)
                .withValueStep(0.5)
                .withDescription("Outdoor temperature for the secondary display"),
            e
                .numeric("outdoor_temperature_timeout", ea.ALL)
                .withUnit("s")
                .withValueMin(30)
                .withValueMax(64800)
                .withPreset("15 min", 900, "15 minutes")
                .withPreset("30 min", 1800, "30 minutes")
                .withPreset("1 hour", 3600, "1 hour")
                .withDescription("Time in seconds after which the outdoor temperature is considered to have expired"),
            e
                .binary("enable_outdoor_temperature", ea.ALL, "ON", "OFF")
                .withDescription("DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e.enum("time_format", ea.ALL, ["24h", "12h"]).withDescription("The time format featured on the thermostat display"),
            e.enum("backlight_auto_dim", ea.ALL, ["on_demand", "sensing", "off"]).withDescription("Control backlight dimming behavior"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables or disables the device’s buttons"),
            e.enum("main_cycle_output", ea.ALL, ["15_sec", "15_min"]).withDescription("The length of the control cycle: 15_sec=normal 15_min=fan"),
        ],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msTemperatureMeasurement",
                "manuSpecificSinope",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds); // This G2 version has limited memory space
            const thermostatDate = new Date();
            const thermostatTimeSec = thermostatDate.getTime() / 1000;
            const thermostatTimezoneOffsetSec = thermostatDate.getTimezoneOffset() * 60;
            const currentTimeToDisplay = Math.round(thermostatTimeSec - thermostatTimezoneOffsetSec - 946684800);
            await endpoint.write("manuSpecificSinope", {currentTimeToDisplay}, manuSinope);
            await endpoint.write("manuSpecificSinope", {secondScreenBehavior: 0}, manuSinope); // Mode auto

            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);

            await reporting.temperature(endpoint, {min: 1, max: 0xffff}); // Disable default reporting
            await endpoint.configureReporting("msTemperatureMeasurement", [
                {
                    attribute: "tolerance",
                    minimumReportInterval: 1,
                    maximumReportInterval: 0xffff,
                    reportableChange: 1,
                },
            ]);

            // Disable default reporting (not used by Sinope)
            await reporting.thermostatRunningState(endpoint, {min: 1, max: 0xffff});
            try {
                await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            } catch {
                /* Do nothing */
            }
        },
    },
    {
        zigbeeModel: ["TH1300ZB", "TH1320ZB-04"],
        model: "TH1300ZB",
        vendor: "Sinopé",
        description: "Zigbee smart floor heating thermostat",
        whiteLabel: [
            {model: "TH1320ZB-04", vendor: "Sinopé", description: "Zigbee smart floor heating thermostat", fingerprint: [{modelID: "TH1320ZB-04"}]},
        ],
        extend: [m.electricityMeter()],
        fromZigbee: [fzLocal.thermostat, fzLocal.sinope, fz.hvac_user_interface, fz.ignore_temperature_report],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tzLocal.backlight_autodim,
            tzLocal.thermostat_time,
            tzLocal.time_format,
            tzLocal.enable_outdoor_temperature,
            tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature,
            tzLocal.outdoor_temperature_timeout,
            tzLocal.thermostat_occupancy,
            tzLocal.floor_control_mode,
            tzLocal.ambiant_max_heat_setpoint,
            tzLocal.floor_min_heat_setpoint,
            tzLocal.floor_max_heat_setpoint,
            tzLocal.temperature_sensor,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 36, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 5, 36, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"], ea.ALL, "Mode of the thermostat")
                .withPiHeatingDemand()
                .withRunningState(["idle", "heat"], ea.STATE),
            e.enum("thermostat_occupancy", ea.ALL, ["unoccupied", "occupied"]).withDescription("Occupancy state of the thermostat"),
            e
                .enum("second_display_mode", ea.ALL, ["auto", "setpoint", "outdoor temp"])
                .withDescription(
                    'Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                        'in "outdoor temp" mode when expired.',
                ),
            e
                .numeric("thermostat_outdoor_temperature", ea.ALL)
                .withUnit("°C")
                .withValueMin(-99.5)
                .withValueMax(99.5)
                .withValueStep(0.5)
                .withDescription("Outdoor temperature for the secondary display"),
            e
                .numeric("outdoor_temperature_timeout", ea.ALL)
                .withUnit("s")
                .withValueMin(30)
                .withValueMax(64800)
                .withPreset("15 min", 900, "15 minutes")
                .withPreset("30 min", 1800, "30 minutes")
                .withPreset("1 hour", 3600, "1 hour")
                .withDescription("Time in seconds after which the outdoor temperature is considered to have expired"),
            e
                .binary("enable_outdoor_temperature", ea.ALL, "ON", "OFF")
                .withDescription("DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e.enum("time_format", ea.ALL, ["24h", "12h"]).withDescription("The time format featured on the thermostat display"),
            e.enum("backlight_auto_dim", ea.ALL, ["on_demand", "sensing"]).withDescription("Control backlight dimming behavior"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables or disables the device’s buttons"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msTemperatureMeasurement",
                "manuSpecificSinope",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            try {
                await reporting.thermostatKeypadLockMode(endpoint);
            } catch {
                // Not all support this: https://github.com/Koenkk/zigbee2mqtt/issues/3760
            }

            await endpoint.configureReporting("manuSpecificSinope", [
                {attribute: "GFCiStatus", minimumReportInterval: 1, maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1},
            ]);
            await endpoint.configureReporting("manuSpecificSinope", [
                {attribute: "floorLimitStatus", minimumReportInterval: 1, maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1},
            ]);
            await reporting.temperature(endpoint, {min: 1, max: 0xffff}); // disable reporting
        },
    },
    {
        zigbeeModel: ["TH1400ZB"],
        model: "TH1400ZB",
        vendor: "Sinopé",
        description: "Zigbee low volt thermostat",
        fromZigbee: [
            fzLocal.thermostat,
            fzLocal.sinope,
            fz.hvac_user_interface,
            fz.electrical_measurement,
            fz.metering,
            fz.ignore_temperature_report,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tzLocal.backlight_autodim,
            tzLocal.thermostat_time,
            tzLocal.time_format,
            tzLocal.enable_outdoor_temperature,
            tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature,
            tzLocal.outdoor_temperature_timeout,
            tzLocal.thermostat_occupancy,
            tzLocal.floor_control_mode,
            tzLocal.ambiant_max_heat_setpoint,
            tzLocal.floor_min_heat_setpoint,
            tzLocal.floor_max_heat_setpoint,
            tzLocal.temperature_sensor,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tzLocal.connected_load,
            tzLocal.aux_connected_load,
            tzLocal.main_cycle_output,
            tzLocal.aux_cycle_output,
            tzLocal.pump_protection,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 36, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 5, 36, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"])
                .withPiHeatingDemand()
                .withRunningState(["idle", "heat"], ea.STATE),
            e.max_heat_setpoint_limit(5, 36, 0.5),
            e.min_heat_setpoint_limit(5, 36, 0.5),
            e.enum("thermostat_occupancy", ea.ALL, ["unoccupied", "occupied"]).withDescription("Occupancy state of the thermostat"),
            e
                .enum("second_display_mode", ea.ALL, ["auto", "setpoint", "outdoor temp"])
                .withDescription(
                    'Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                        'in "outdoor temp" mode when expired.',
                ),
            e
                .numeric("thermostat_outdoor_temperature", ea.ALL)
                .withUnit("°C")
                .withValueMin(-99.5)
                .withValueMax(99.5)
                .withValueStep(0.5)
                .withDescription("Outdoor temperature for the secondary display"),
            e
                .numeric("outdoor_temperature_timeout", ea.ALL)
                .withUnit("s")
                .withValueMin(30)
                .withValueMax(64800)
                .withPreset("15 min", 900, "15 minutes")
                .withPreset("30 min", 1800, "30 minutes")
                .withPreset("1 hour", 3600, "1 hour")
                .withDescription("Time in seconds after which the outdoor temperature is considered to have expired"),
            e
                .binary("enable_outdoor_temperature", ea.ALL, "ON", "OFF")
                .withDescription("DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e.enum("time_format", ea.ALL, ["24h", "12h"]).withDescription("The time format featured on the thermostat display"),
            e.enum("backlight_auto_dim", ea.ALL, ["on_demand", "sensing"]).withDescription("The display backlight behavior"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables or disables the device’s buttons"),
            e
                .numeric("connected_load", ea.ALL)
                .withUnit("W")
                .withValueMin(1)
                .withValueMax(20000)
                .withDescription("The power in watts of the electrical load connected to the device"),
            e.enum("floor_control_mode", ea.ALL, ["ambiant", "floor"]).withDescription("Control mode using floor or ambient temperature"),
            e
                .numeric("floor_max_heat_setpoint", ea.ALL)
                .withUnit("°C")
                .withValueMin(7)
                .withValueMax(36)
                .withValueStep(0.5)
                .withPreset("off", "off", "Use minimum permitted value")
                .withDescription("The maximum floor temperature limit of the floor when in ambient control mode"),
            e
                .numeric("floor_min_heat_setpoint", ea.ALL)
                .withUnit("°C")
                .withValueMin(5)
                .withValueMax(34)
                .withValueStep(0.5)
                .withPreset("off", "off", "Use minimum permitted value")
                .withDescription("The minimum floor temperature limit of the floor when in ambient control mode"),
            e
                .numeric("ambiant_max_heat_setpoint", ea.ALL)
                .withUnit("°C")
                .withValueMin(5)
                .withValueMax(36)
                .withValueStep(0.5)
                .withPreset("off", "off", "Use minimum permitted value")
                .withDescription("The maximum ambient temperature limit when in floor control mode"),
            e.enum("floor_temperature_sensor", ea.ALL, ["10k", "12k"]).withDescription("The floor sensor"),
            e
                .enum("main_cycle_output", ea.ALL, ["15_sec", "5_min", "10_min", "15_min", "20_min", "30_min"])
                .withDescription("The length of the control cycle according to the type of load connected to the thermostats"),
            e
                .enum("aux_cycle_output", ea.ALL, ["off", "15_sec", "5_min", "10_min", "15_min", "20_min", "30_min"])
                .withDescription("The length of the control cycle according to the type of auxiliary load connected to the thermostats"),
            e.binary("pump_protection", ea.ALL, "ON", "OFF").withDescription("This function prevents the seizure of the pump"),
            e
                .numeric("aux_connected_load", ea.ALL)
                .withUnit("W")
                .withValueMin(0)
                .withValueMax(20000)
                .withDescription("The power in watts of the heater connected to the auxiliary output of the thermostat"),
        ],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msTemperatureMeasurement",
                "manuSpecificSinope",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);

            try {
                await reporting.thermostatSystemMode(endpoint);
            } catch {
                /* Not all support this */
            }

            await endpoint.read("hvacThermostat", [
                "occupiedHeatingSetpoint",
                "localTemp",
                "systemMode",
                "pIHeatingDemand",
                "SinopeBacklight",
                "maxHeatSetpointLimit",
                "minHeatSetpointLimit",
                "SinopeMainCycleOutput",
                "SinopeAuxCycleOutput",
            ]);
            await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout", "tempDisplayMode"]);
            await endpoint.read("manuSpecificSinope", [
                "timeFormatToDisplay",
                "connectedLoad",
                "auxConnectedLoad",
                "floorControlMode",
                "floorMinHeatSetpointLimit",
                "floorMaxHeatSetpointLimit",
                "ambiantMaxHeatSetpointLimit",
                "outdoorTempToDisplayTimeout",
                "temperatureSensor",
                "pumpProtection",
            ]);

            await reporting.temperature(endpoint, {min: 1, max: 0xffff}); // disable reporting
        },
    },
    {
        zigbeeModel: ["TH1500ZB"],
        model: "TH1500ZB",
        vendor: "Sinopé",
        description: "Zigbee dual pole line volt thermostat",
        fromZigbee: [
            fzLocal.thermostat,
            fzLocal.sinope,
            fz.hvac_user_interface,
            fz.electrical_measurement,
            fz.metering,
            fz.ignore_temperature_report,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tzLocal.backlight_autodim,
            tzLocal.thermostat_time,
            tzLocal.time_format,
            tzLocal.enable_outdoor_temperature,
            tzLocal.second_display_mode,
            tzLocal.thermostat_outdoor_temperature,
            tzLocal.outdoor_temperature_timeout,
            tzLocal.thermostat_occupancy,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"], ea.ALL, "Mode of the thermostat")
                .withPiHeatingDemand()
                .withRunningState(["idle", "heat"], ea.STATE),
            e.enum("thermostat_occupancy", ea.ALL, ["unoccupied", "occupied"]).withDescription("Occupancy state of the thermostat"),
            e
                .enum("second_display_mode", ea.ALL, ["auto", "setpoint", "outdoor temp"])
                .withDescription(
                    'Displays the outdoor temperature and then returns to the set point in "auto" mode, or clears ' +
                        'in "outdoor temp" mode when expired.',
                ),
            e
                .numeric("thermostat_outdoor_temperature", ea.ALL)
                .withUnit("°C")
                .withValueMin(-99.5)
                .withValueMax(99.5)
                .withValueStep(0.5)
                .withDescription("Outdoor temperature for the secondary display"),
            e
                .numeric("outdoor_temperature_timeout", ea.ALL)
                .withUnit("s")
                .withValueMin(30)
                .withValueMax(64800)
                .withPreset("15 min", 900, "15 minutes")
                .withPreset("30 min", 1800, "30 minutes")
                .withPreset("1 hour", 3600, "1 hour")
                .withDescription("Time in seconds after which the outdoor temperature is considered to have expired"),
            e
                .binary("enable_outdoor_temperature", ea.ALL, "ON", "OFF")
                .withDescription("DEPRECATED: Use second_display_mode or control via outdoor_temperature_timeout"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e.enum("time_format", ea.ALL, ["24h", "12h"]).withDescription("The time format featured on the thermostat display"),
            e.enum("backlight_auto_dim", ea.ALL, ["on_demand", "sensing"]).withDescription("Control backlight dimming behavior"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock1"]).withDescription("Enables or disables the device’s buttons"),
        ],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genIdentify", "genGroups", "hvacThermostat", "hvacUserInterfaceCfg", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
    },
    {
        zigbeeModel: ["SW2500ZB"],
        model: "SW2500ZB",
        vendor: "Sinopé",
        description: "Zigbee smart light switch",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
        fromZigbee: [fzLocal.sinope],
        toZigbee: [
            tzLocal.timer_seconds,
            tzLocal.led_intensity_on,
            tzLocal.led_intensity_off,
            tzLocal.led_color_on,
            tzLocal.led_color_off,
            tzLocal.keypad_lockout,
            tzLocal.connected_load,
        ],
        exposes: [
            e.action(["up_single", "up_double", "up_hold", "down_single", "down_double", "down_hold"]),
            e
                .numeric("timer_seconds", ea.ALL)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(65535)
                .withPreset("Disabled", 0, "disabled")
                .withDescription("Automatically turn off load after x seconds"),
            e
                .numeric("led_intensity_on", ea.ALL)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Control status LED intensity when load ON"),
            e
                .numeric("led_intensity_off", ea.ALL)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Control status LED intensity when load OFF"),
            e
                .composite("led_color_on", "led_color_on", ea.SET)
                .withFeature(e.numeric("r", ea.SET))
                .withFeature(e.numeric("g", ea.SET))
                .withFeature(e.numeric("b", ea.SET))
                .withDescription("Control status LED color when load ON"),
            e
                .composite("led_color_off", "led_color_off", ea.SET)
                .withFeature(e.numeric("r", ea.SET))
                .withFeature(e.numeric("g", ea.SET))
                .withFeature(e.numeric("b", ea.SET))
                .withDescription("Control status LED color when load OFF"),
            e.enum("keypad_lockout", ea.ALL, ["unlock", "lock"]).withDescription("Enables or disables the device’s buttons"),
            e.numeric("connected_load", ea.ALL).withUnit("W").withValueMin(0).withValueMax(1800).withDescription("Load connected in watt"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["manuSpecificSinope"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            const payload = [
                {
                    attribute: "actionReport" as const,
                    minimumReportInterval: 0,
                    maximumReportInterval: 0,
                    reportableChange: 0,
                },
            ];
            await endpoint.configureReporting("manuSpecificSinope", payload);
        },
    },
    {
        zigbeeModel: ["DM2500ZB"],
        model: "DM2500ZB",
        vendor: "Sinopé",
        description: "Zigbee smart dimmer",
        extend: [m.light({configureReporting: true})],
        fromZigbee: [fzLocal.sinope],
        toZigbee: [
            tzLocal.timer_seconds,
            tzLocal.led_intensity_on,
            tzLocal.led_intensity_off,
            tzLocal.minimum_brightness,
            tzLocal.led_color_on,
            tzLocal.led_color_off,
        ],
        exposes: [
            e
                .numeric("timer_seconds", ea.ALL)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(65535)
                .withPreset("Disabled", 0, "disabled")
                .withDescription("Automatically turn off load after x seconds"),
            e
                .numeric("led_intensity_on", ea.ALL)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Control status LED intensity when load ON"),
            e
                .numeric("led_intensity_off", ea.ALL)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Control status LED when load OFF"),
            e.numeric("minimum_brightness", ea.ALL).withValueMin(0).withValueMax(3000).withDescription("Control minimum dimmer brightness"),
            e
                .composite("led_color_on", "led_color_on", ea.SET)
                .withFeature(e.numeric("r", ea.SET))
                .withFeature(e.numeric("g", ea.SET))
                .withFeature(e.numeric("b", ea.SET))
                .withDescription("Control status LED color when load ON"),
            e
                .composite("led_color_off", "led_color_off", ea.SET)
                .withFeature(e.numeric("r", ea.SET))
                .withFeature(e.numeric("g", ea.SET))
                .withFeature(e.numeric("b", ea.SET))
                .withDescription("Control status LED color when load OFF"),
        ],
    },
    {
        zigbeeModel: ["DM2550ZB"],
        model: "DM2550ZB",
        vendor: "Sinopé",
        description: "Zigbee Adaptive phase smart dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter({energy: {divisor: 1000, multiplier: 1}})],
        fromZigbee: [fzLocal.sinope],
        toZigbee: [
            tzLocal.timer_seconds,
            tzLocal.led_intensity_on,
            tzLocal.led_intensity_off,
            tzLocal.minimum_brightness,
            tzLocal.led_color_on,
            tzLocal.led_color_off,
        ],
        exposes: [
            e
                .numeric("timer_seconds", ea.ALL)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(65535)
                .withPreset("Disabled", 0, "disabled")
                .withDescription("Automatically turn off load after x seconds"),
            e
                .numeric("led_intensity_on", ea.ALL)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Control status LED intensity when load ON"),
            e
                .numeric("led_intensity_off", ea.ALL)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Control status LED when load OFF"),
            e.numeric("minimum_brightness", ea.ALL).withValueMin(0).withValueMax(3000).withDescription("Control minimum dimmer brightness"),
            e
                .composite("led_color_on", "led_color_on", ea.SET)
                .withFeature(e.numeric("r", ea.SET))
                .withFeature(e.numeric("g", ea.SET))
                .withFeature(e.numeric("b", ea.SET))
                .withDescription("Control status LED color when load ON"),
            e
                .composite("led_color_off", "led_color_off", ea.SET)
                .withFeature(e.numeric("r", ea.SET))
                .withFeature(e.numeric("g", ea.SET))
                .withFeature(e.numeric("b", ea.SET))
                .withDescription("Control status LED color when load OFF"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["manuSpecificSinope"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
        },
    },
    {
        zigbeeModel: ["SP2600ZB"],
        model: "SP2600ZB",
        vendor: "Sinopé",
        description: "Zigbee smart plug",
        extend: [m.onOff(), m.electricityMeter({energy: {divisor: 1000, multiplier: 1}})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["manuSpecificSinope"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
        },
    },
    {
        zigbeeModel: ["SP2610ZB"],
        model: "SP2610ZB",
        vendor: "Sinopé",
        description: "Zigbee smart plug",
        extend: [m.onOff(), m.electricityMeter({energy: {divisor: 1000, multiplier: 1}})],
    },
    {
        zigbeeModel: ["RM3250ZB"],
        model: "RM3250ZB",
        vendor: "Sinopé",
        description: "50A Smart electrical load controller",
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["WL4200"],
        model: "WL4200",
        vendor: "Sinopé",
        description: "Zigbee smart water leak detector",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        exposes: [e.water_leak(), e.battery_low(), e.temperature(), e.battery()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint, {min: 600, max: constants.repInterval.MAX, change: 100});
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
    },
    {
        zigbeeModel: ["WL4200S"],
        model: "WL4200S",
        vendor: "Sinopé",
        description: "Zigbee smart water leak detector with external sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.temperature(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint, {min: 600, max: constants.repInterval.MAX, change: 100});
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
    },
    {
        zigbeeModel: ["WL4210"],
        model: "WL4210",
        vendor: "Sinopé",
        description: "Zigbee smart water leak detector with external sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.temperature(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint, {min: 600, max: constants.repInterval.MAX, change: 100});
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
    },
    {
        zigbeeModel: ["VA4200WZ"],
        model: "VA4200WZ",
        vendor: "Sinopé",
        description: 'Zigbee smart water valve (3/4")',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff, fz.battery],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.valve_switch(), e.valve_position(), e.battery_low(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genOnOff", "genLevelCtrl", "genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint); // valve position
        },
    },
    {
        zigbeeModel: ["VA4201WZ"],
        model: "VA4201WZ",
        vendor: "Sinopé",
        description: 'Zigbee smart water valve (1")',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff, fz.battery],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.valve_switch(), e.valve_position(), e.battery_low(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genOnOff", "genLevelCtrl", "genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint); // valve position
        },
    },
    {
        zigbeeModel: ["VA4220ZB"],
        model: "VA4220ZB",
        vendor: "Sinopé",
        description: "Sedna smart water valve",
        fromZigbee: [fz.ignore_iaszone_statuschange, fz.cover_position_via_brightness, fz.cover_state_via_onoff, fz.battery, fz.metering],
        toZigbee: [tz.cover_via_brightness],
        meta: {battery: {voltageToPercentage: {min: 5400, max: 6800}}},
        exposes: [e.valve_switch(), e.valve_position(), e.battery_low(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genGroups", "genOnOff", "ssIasZone", "genLevelCtrl", "genPowerCfg", "seMetering", "manuSpecificSinope"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint); // valve position
            try {
                await reporting.batteryVoltage(endpoint);
            } catch {
                /* Do Nothing */
            }
            try {
                await reporting.batteryAlarmState(endpoint);
            } catch {
                /* Do Nothing */
            }
        },
    },
    {
        zigbeeModel: ["RM3500ZB"],
        model: "RM3500ZB",
        vendor: "Sinopé",
        description: "Calypso smart water heater controller",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter({energy: {divisor: 1000, multiplier: 1}})],
        fromZigbee: [fzLocal.ias_water_leak_alarm, fzLocal.sinope, fz.temperature],
        toZigbee: [tzLocal.low_water_temp_protection],
        exposes: [
            e
                .numeric("low_water_temp_protection", ea.ALL)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(65)
                .withValueStep(1)
                .withDescription("Temperature at which water heating will resume automatically (default: 45°C)"),
            e.water_leak(),
            e.temperature(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["msTemperatureMeasurement", "ssIasZone", "manuSpecificSinope"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint, {min: 60, max: 60, change: 0}); // divider 100: 0.1C
            await endpoint.configureReporting("ssIasZone", [
                {attribute: "zoneStatus", minimumReportInterval: 1, maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1},
            ]);
        },
    },
    {
        zigbeeModel: ["LM4110-ZB"],
        model: "LM4110ZB",
        vendor: "Sinopé",
        description: "Tank level monitor",
        fromZigbee: [fz.battery, fz.temperature, fzLocal.tank_level],
        toZigbee: [],
        exposes: [
            e.battery_low(),
            e.battery(),
            e.temperature(),
            e.numeric("tank_level", ea.STATE).withUnit("%").withValueMin(0).withValueMax(100).withDescription("Percent volume remaining in tank"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "msTemperatureMeasurement", "genAnalogInput"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
            await reporting.temperature(endpoint);

            const payload = reporting.payload<"genAnalogInput">("presentValue", 10, constants.repInterval.HOUR, 1);
            await endpoint.configureReporting("genAnalogInput", payload);
            await endpoint.read("genAnalogInput", ["presentValue"]);
        },
    },
];
