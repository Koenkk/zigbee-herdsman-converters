import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {
    Configure,
    Definition,
    DefinitionWithExtend,
    Expose,
    Fz,
    KeyValue,
    KeyValueAny,
    KeyValueNumberString,
    ModernExtend,
    Tz,
    Zh,
} from "../lib/types";
import * as utils from "../lib/utils";
import {assertString, getFromLookup, getOptions, postfixWithEndpointName, precisionRound} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const defaultReporting = {min: 0, max: 300, change: 0};
const co2Reporting = {min: 10, max: 300, change: 0.000001};
const batteryReporting = {min: 3600, max: 0, change: 0};

const model_r01 = "Tuya_Thermostat_r01";
const model_r02 = "Tuya_Thermostat_r02";
const model_r03 = "Tuya_Thermostat_r03";
const model_r04 = "Tuya_Thermostat_r04";
const model_r05 = "Tuya_Thermostat_r05";
const model_r06 = "Tuya_Thermostat_r06";
const model_r07 = "Tuya_Thermostat_r07";
const model_r08 = "Tuya_Thermostat_r08";

const attrThermSensorUser = 0xf000;
const attrThermFrostProtect = 0xf001;
const attrThermHeatProtect = 0xf002;
const attrThermEcoMode = 0xf003;
const attrThermEcoModeHeatTemperature = 0xf004;
const attrThermFrostProtectOnOff = 0xf005;
const attrThermSettingsReset = 0xf006;
const attrThermScheduleMode = 0xf007;
const attrThermSound = 0xf008;
const attrThermLevel = 0xf009;
const attrThermInversion = 0xf00a;
const attrThermEcoModeCoolTemperature = 0xf00b;
const attrThermExtTemperatureCalibration = 0xf00c;
const attrFanCtrlControl = 0xf000;

const switchSensorUsed = ["Inner (IN)", "All (AL)", "Outer (OU)"];

const attrElCityMeterModelPreset = 0xf000;
const attrElCityMeterAddressPreset = 0xf001;
const attrElCityMeterMeasurementPreset = 0xf002;
const attrElCityMeterDateRelease = 0xf003;
const attrElCityMeterModelName = 0xf004;
const attrElCityMeterPasswordPreset = 0xf005;

const fzLocal = {
    thermostat_custom_fw: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data[attrThermSensorUser] !== undefined) {
                const lookup = {0: "Inner (IN)", 1: "All (AL)", 2: "Outer (OU)"};
                result.sensor = utils.getFromLookup(msg.data[attrThermSensorUser], lookup);
            }
            if (msg.data.minSetpointDeadBand !== undefined) {
                let data: number;
                if (model.model === model_r06) {
                    data = Number.parseFloat(msg.data.minSetpointDeadBand) / 10;
                    result.histeresis_temperature = data;
                } else {
                    data = Number.parseInt(msg.data.minSetpointDeadBand);
                    result.deadzone_temperature = data;
                }
            }
            if (msg.data[attrThermFrostProtect] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermFrostProtect]) / 100;
                result.frost_protect = data;
            }
            if (msg.data[attrThermHeatProtect] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermHeatProtect]) / 100;
                result.heat_protect = data;
            }
            if (msg.data[attrThermEcoMode] !== undefined) {
                result.eco_mode = msg.data[attrThermEcoMode] === 1 ? "On" : "Off";
            }
            if (msg.data[attrThermEcoModeCoolTemperature] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermEcoModeCoolTemperature]) / 100;
                result.eco_mode_cool_temperature = data;
            }
            if (msg.data[attrThermEcoModeHeatTemperature] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermEcoModeHeatTemperature]) / 100;
                result.eco_mode_heat_temperature = data;
            }
            if (msg.data[attrThermFrostProtectOnOff] !== undefined) {
                result.frost_protect_on_off = msg.data[attrThermFrostProtectOnOff] === 1 ? "On" : "Off";
            }
            if (msg.data[attrThermLevel] !== undefined) {
                const lookup = {0: "Off", 1: "Low", 2: "Medium", 3: "High"};
                result.brightness_level = utils.getFromLookup(msg.data[attrThermLevel], lookup);
            }
            if (msg.data[attrThermSound] !== undefined) {
                result.sound = msg.data[attrThermSound] === 1 ? "On" : "Off";
            }
            if (msg.data[attrThermInversion] !== undefined) {
                result.inversion = msg.data[attrThermInversion] === 1 ? "On" : "Off";
            }
            if (msg.data[attrThermScheduleMode] !== undefined) {
                const lookup = {0: "Off", 1: "5+2", 2: "6+1", 3: "7"};
                result.schedule_mode = utils.getFromLookup(msg.data[attrThermScheduleMode], lookup);
            }
            if (msg.data[attrThermExtTemperatureCalibration] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermExtTemperatureCalibration]) / 10;
                result.external_temperature_calibration = data;
            }
            return result;
        },
    } satisfies Fz.Converter,
    thermostat_schedule: {
        cluster: "hvacThermostat",
        type: ["commandSetWeeklySchedule"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const {data} = msg;

            const daysOfWeekNums = [...Array.from(Array(7).keys()).filter((x) => (2 ** x) & data.dayofweek)];

            // biome-ignore lint/suspicious/noExplicitAny: ignored using `--suppress`
            const schedule = `${data.transitions.map((t: any) => `${String(Math.floor(t.transitionTime / 60)).padStart(2, "0")}:${String(t.transitionTime % 60).padStart(2, "0")}/${t.heatSetpoint / 100.0}°C`).join(" ")}`;
            const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            return Object.fromEntries(daysOfWeekNums.map((d) => [`schedule_${daysOfWeek[d]}`, schedule]));
        },
    } satisfies Fz.Converter,
    fancontrol_control: {
        cluster: "hvacFanCtrl",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data[attrFanCtrlControl] !== undefined) {
                result.fan_control = msg.data[attrFanCtrlControl] === 1 ? "On" : "Off";
            }
            return result;
        },
    } satisfies Fz.Converter,
    display_brightness: {
        cluster: "genLevelCtrl",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.currentLevel !== undefined) {
                const property = `brightness_${utils.getEndpointName(msg, model, meta)}`;
                //logger.info('property: ' + property);
                return {[property]: msg.data.currentLevel};
            }
            return result;
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    display_brightness: {
        key: ["brightness", "brightness_day", "brightness_night"],
        options: [exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            await entity.command("genLevelCtrl", "moveToLevel", {level: value, transtime: 0}, utils.getOptions(meta.mapped, entity));
            return {state: {brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", ["currentLevel"]);
        },
    } satisfies Tz.Converter,
    thermostat_sensor_used: {
        key: ["sensor"],

        convertSet: async (entity, key, value, meta) => {
            const endpoint = meta.device.getEndpoint(1);
            const lookup = {"Inner (IN)": 0, "All (AL)": 1, "Outer (OU)": 2};
            await endpoint.write("hvacThermostat", {[attrThermSensorUser]: {value: utils.getFromLookup(value, lookup), type: 0x30}});
            return {
                state: {[key]: value},
            };
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermSensorUser]);
        },
    } satisfies Tz.Converter,
    thermostat_deadzone: {
        key: ["deadzone_temperature"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            const minSetpointDeadBand = Number.parseInt(value, 10);
            await entity.write("hvacThermostat", {minSetpointDeadBand});
            return {readAfterWriteTime: 250, state: {minSetpointDeadBand: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["minSetpointDeadBand"]);
        },
    } satisfies Tz.Converter,
    thermostat_deadzone_10: {
        key: ["histeresis_temperature"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            const minSetpointDeadBand = Number.parseFloat(value) * 10;
            await entity.write("hvacThermostat", {minSetpointDeadBand});
            return {readAfterWriteTime: 250, state: {minSetpointDeadBand: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["minSetpointDeadBand"]);
        },
    } satisfies Tz.Converter,
    thermostat_frost_protect: {
        key: ["frost_protect"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (!utils.isInRange(0, 10, Number(value))) throw new Error(`Invalid value: ${value} (expected ${0} to ${10})`);
            const frost_protect = Number.parseInt(value, 10) * 100;
            await entity.write("hvacThermostat", {[attrThermFrostProtect]: {value: frost_protect, type: 0x29}});
            return {readAfterWriteTime: 250, state: {frost_protect: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermFrostProtect]);
        },
    } satisfies Tz.Converter,
    thermostat_heat_protect: {
        key: ["heat_protect"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (!utils.isInRange(25, 70, Number(value))) throw new Error(`Invalid value: ${value} (expected ${25} to ${70})`);
            const heat_protect = Number.parseInt(value, 10) * 100;
            await entity.write("hvacThermostat", {[attrThermHeatProtect]: {value: heat_protect, type: 0x29}});
            return {readAfterWriteTime: 250, state: {heat_protect: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermHeatProtect]);
        },
    } satisfies Tz.Converter,
    thermostat_setpoint_raise_lower: {
        key: ["setpoint_raise_lower"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (!utils.isInRange(-5, 5, Number(value))) throw new Error(`Invalid value: ${value} (expected ${-5} to ${5})`);
            const setpoint_raise_lower = Number.parseInt(value, 10) * 10; //Step 0.1°C. 5°C - 50, 1°C - 10 etc.
            await entity.command("hvacThermostat", "setpointRaiseLower", {mode: 0, amount: setpoint_raise_lower});
            return {readAfterWriteTime: 250, state: {setpoint_raise_lower: value}};
        },
    } satisfies Tz.Converter,
    fancontrol_control: {
        key: ["fan_control"],
        convertSet: async (entity, key, value, meta) => {
            const fan_control = Number(value === "On");
            await entity.write("hvacFanCtrl", {[attrFanCtrlControl]: {value: fan_control, type: 0x10}});
            return {readAfterWriteTime: 250, state: {fan_control: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacFanCtrl", [attrFanCtrlControl]);
        },
    } satisfies Tz.Converter,
    thermostat_eco_mode: {
        key: ["eco_mode"],
        convertSet: async (entity, key, value, meta) => {
            const eco_mode = Number(value === "On");
            await entity.write("hvacThermostat", {[attrThermEcoMode]: {value: eco_mode, type: 0x30}});
            return {readAfterWriteTime: 250, state: {eco_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermEcoMode]);
        },
    } satisfies Tz.Converter,
    thermostat_eco_mode_cool_temperature: {
        key: ["eco_mode_cool_temperature"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (!utils.isInRange(5, 45, Number(value))) throw new Error(`Invalid value: ${value} (expected ${5} to ${45})`);
            const eco_mode_cool_temperature = Number.parseInt(value, 10) * 100;
            await entity.write("hvacThermostat", {[attrThermEcoModeCoolTemperature]: {value: eco_mode_cool_temperature, type: 0x29}});
            return {readAfterWriteTime: 250, state: {eco_mode_cool_temperature: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermEcoModeCoolTemperature]);
        },
    } satisfies Tz.Converter,
    thermostat_eco_mode_heat_temperature: {
        key: ["eco_mode_heat_temperature"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (!utils.isInRange(5, 45, Number(value))) throw new Error(`Invalid value: ${value} (expected ${5} to ${45})`);
            const eco_mode_heat_temperature = Number.parseInt(value, 10) * 100;
            await entity.write("hvacThermostat", {[attrThermEcoModeHeatTemperature]: {value: eco_mode_heat_temperature, type: 0x29}});
            return {readAfterWriteTime: 250, state: {eco_mode_heat_temperature: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermEcoModeHeatTemperature]);
        },
    } satisfies Tz.Converter,
    thermostat_frost_protect_onoff: {
        key: ["frost_protect_on_off"],
        convertSet: async (entity, key, value, meta) => {
            const frost_protect_on_off = Number(value === "On");
            await entity.write("hvacThermostat", {[attrThermFrostProtectOnOff]: {value: frost_protect_on_off, type: 0x10}});
            return {readAfterWriteTime: 250, state: {frost_protect_on_off: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermFrostProtectOnOff]);
        },
    } satisfies Tz.Converter,
    thermostat_sound: {
        key: ["sound"],
        convertSet: async (entity, key, value, meta) => {
            const sound = Number(value === "On");
            await entity.write("hvacThermostat", {[attrThermSound]: {value: sound, type: 0x10}});
            return {readAfterWriteTime: 250, state: {sound: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermSound]);
        },
    } satisfies Tz.Converter,
    thermostat_brightness_level: {
        key: ["brightness_level"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value);
            const lookup = {Off: 0, Low: 1, Medium: 2, High: 3};
            await entity.write("hvacThermostat", {[attrThermLevel]: {value: utils.getFromLookup(value, lookup), type: 0x30}});
            return {state: {brightness_level: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermLevel]);
        },
    } satisfies Tz.Converter,
    thermostat_inversion: {
        key: ["inversion"],
        convertSet: async (entity, key, value, meta) => {
            const inversion = Number(value === "On");
            await entity.write("hvacThermostat", {[attrThermInversion]: {value: inversion, type: 0x10}});
            return {readAfterWriteTime: 250, state: {inversion: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermInversion]);
        },
    } satisfies Tz.Converter,
    thermostat_schedule_mode: {
        key: ["schedule_mode"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value);
            const lookup = {Off: 0, "5+2": 1, "6+1": 2, "7": 3};
            await entity.write("hvacThermostat", {[attrThermScheduleMode]: {value: utils.getFromLookup(value, lookup), type: 0x30}});
            return {state: {schedule_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermScheduleMode]);
        },
    } satisfies Tz.Converter,
    thermostat_settings_reset: {
        key: ["settings_reset"],
        convertSet: async (entity, key, value, meta) => {
            const settings_reset = Number(value === "Default");
            await entity.write("hvacThermostat", {[attrThermSettingsReset]: {value: settings_reset, type: 0x10}});
            return {readAfterWriteTime: 250, state: {settings_reset: value}};
        },
    } satisfies Tz.Converter,
    thermostat_ext_temperature_calibration: {
        key: ["external_temperature_calibration"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (!utils.isInRange(-9, 9, Number(value))) throw new Error(`Invalid value: ${value} (expected ${-9} to ${9})`);
            const external_temperature_calibration = Number.parseInt(value, 10) * 10;
            await entity.write("hvacThermostat", {[attrThermExtTemperatureCalibration]: {value: external_temperature_calibration, type: 0x28}});
            return {readAfterWriteTime: 250, state: {external_temperature_calibration: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermExtTemperatureCalibration]);
        },
    } satisfies Tz.Converter,
};

const localFromZigbeeThermostat = [
    fz.ignore_basic_report,
    fz.thermostat,
    fz.fan,
    fz.namron_hvac_user_interface,
    fz.thermostat_weekly_schedule,
    fzLocal.thermostat_custom_fw,
    fzLocal.thermostat_schedule,
    fzLocal.display_brightness,
    fzLocal.fancontrol_control,
];

const localToZigbeeThermostat = [
    tz.thermostat_local_temperature,
    tz.thermostat_outdoor_temperature,
    tz.thermostat_system_mode,
    tz.thermostat_occupied_heating_setpoint,
    tz.thermostat_running_state,
    tz.thermostat_local_temperature_calibration,
    tz.thermostat_min_heat_setpoint_limit,
    tz.thermostat_max_heat_setpoint_limit,
    tz.thermostat_programming_operation_mode,
    tz.namron_thermostat_child_lock,
    tz.thermostat_weekly_schedule,
    tz.fan_mode,
    tzLocal.display_brightness,
    tzLocal.thermostat_sensor_used,
    tzLocal.thermostat_deadzone,
    tzLocal.thermostat_deadzone_10,
    tzLocal.thermostat_setpoint_raise_lower,
    tzLocal.thermostat_frost_protect,
    tzLocal.thermostat_heat_protect,
    tzLocal.thermostat_eco_mode,
    tzLocal.thermostat_eco_mode_cool_temperature,
    tzLocal.thermostat_eco_mode_heat_temperature,
    tzLocal.thermostat_frost_protect_onoff,
    tzLocal.thermostat_brightness_level,
    tzLocal.thermostat_sound,
    tzLocal.thermostat_inversion,
    tzLocal.thermostat_schedule_mode,
    tzLocal.thermostat_settings_reset,
    tzLocal.thermostat_ext_temperature_calibration,
    tzLocal.fancontrol_control,
];

async function configureCommon(device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, definition: Definition) {
    //logger.info(definition.model);
    const endpoint1 = device.getEndpoint(1);
    const endpoint2 = device.getEndpoint(2);
    await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout"]);
    await endpoint1.read("genLevelCtrl", ["currentLevel"]);
    await endpoint2.read("genLevelCtrl", ["currentLevel"]);
    await endpoint1.read("hvacThermostat", ["localTemp"]);
    await endpoint1.read("hvacThermostat", ["outdoorTemp"]);
    await endpoint1.read("hvacThermostat", ["absMinHeatSetpointLimit"]);
    await endpoint1.read("hvacThermostat", ["absMaxHeatSetpointLimit"]);
    await endpoint1.read("hvacThermostat", ["minHeatSetpointLimit"]);
    await endpoint1.read("hvacThermostat", ["maxHeatSetpointLimit"]);
    await endpoint1.read("hvacThermostat", ["localTemperatureCalibration"]);
    await endpoint1.read("hvacThermostat", ["occupiedHeatingSetpoint"]);
    await endpoint1.read("hvacThermostat", ["programingOperMode"]);
    await endpoint1.read("hvacThermostat", ["systemMode"]);
    await endpoint1.read("hvacThermostat", ["runningState"]);
    await endpoint1.read("hvacThermostat", ["minSetpointDeadBand"]);
    await endpoint1.read("hvacThermostat", [attrThermSensorUser]);
    await endpoint1.read("hvacThermostat", [attrThermFrostProtect]);
    await endpoint1.read("hvacThermostat", [attrThermHeatProtect]);
    await endpoint1.read("hvacThermostat", [attrThermEcoMode]);
    await endpoint1.read("hvacThermostat", [attrThermEcoModeCoolTemperature]);
    await endpoint1.read("hvacThermostat", [attrThermEcoModeHeatTemperature]);
    await endpoint1.read("hvacThermostat", [attrThermFrostProtectOnOff]);
    await endpoint1.read("hvacThermostat", [attrThermScheduleMode]);
    await endpoint1.read("hvacThermostat", [attrThermSound]);
    await endpoint1.read("hvacThermostat", [attrThermLevel]);
    await endpoint1.read("hvacThermostat", [attrThermInversion]);
    await endpoint1.read("hvacThermostat", [attrThermExtTemperatureCalibration]);
    await endpoint1.read("hvacFanCtrl", ["fanMode"]);
    await endpoint1.read("hvacFanCtrl", [attrFanCtrlControl]);
    await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat", "hvacUserInterfaceCfg", "hvacFanCtrl"]);
    if (definition.model === model_r03 || definition.model === model_r04) {
        await reporting.bind(endpoint1, coordinatorEndpoint, ["genLevelCtrl"]);
        const payloadCurrentLevel = [
            {attribute: {ID: 0x0000, type: 0x20}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("genLevelCtrl", payloadCurrentLevel);
        if (definition.model === model_r03) {
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genLevelCtrl"]);
            await endpoint2.configureReporting("genLevelCtrl", payloadCurrentLevel);
        }
    }
    await reporting.thermostatTemperature(endpoint1, {min: 0, max: 3600, change: 0});
    await reporting.thermostatOccupiedHeatingSetpoint(endpoint1, {min: 0, max: 3600, change: 0});
    await reporting.thermostatRunningState(endpoint1, {min: 0, max: 3600, change: 0});
    await reporting.thermostatSystemMode(endpoint1, {min: 0, max: 3600, change: 0});
    await reporting.thermostatTemperatureCalibration(endpoint1, {min: 0, max: 3600, change: 0});
    await reporting.thermostatKeypadLockMode(endpoint1, {min: 0, max: 3600, change: 0});
    const payload_oper_mode = [{attribute: "programingOperMode", minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
    await endpoint1.configureReporting("hvacThermostat", payload_oper_mode);
    const payload_sensor_used = [
        {attribute: {ID: attrThermSensorUser, type: 0x30}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
    ];
    await endpoint1.configureReporting("hvacThermostat", payload_sensor_used);
    const payload_deadzone = [{attribute: {ID: 0x0019, type: 0x28}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
    await endpoint1.configureReporting("hvacThermostat", payload_deadzone);
    const payload_min = [{attribute: {ID: 0x0015, type: 0x29}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
    await endpoint1.configureReporting("hvacThermostat", payload_min);
    const payload_max = [{attribute: {ID: 0x0016, type: 0x29}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
    await endpoint1.configureReporting("hvacThermostat", payload_max);
    if (definition.model !== model_r01 && definition.model !== model_r06) {
        const payload_outdoor = [{attribute: {ID: 0x0001, type: 0x29}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
        await endpoint1.configureReporting("hvacThermostat", payload_outdoor);
    }
    const payload_frost_protect = [
        {
            attribute: {ID: attrThermFrostProtect, type: 0x29},
            minimumReportInterval: 0,
            maximumReportInterval: 3600,
            reportableChange: 0,
        },
    ];
    await endpoint1.configureReporting("hvacThermostat", payload_frost_protect);
    const payload_heat_protect = [
        {attribute: {ID: attrThermHeatProtect, type: 0x29}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
    ];
    await endpoint1.configureReporting("hvacThermostat", payload_heat_protect);
    if (definition.model === model_r03 || definition.model === model_r04 || definition.model === model_r07) {
        const payload_eco_mode = [
            {attribute: {ID: attrThermEcoMode, type: 0x30}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_eco_mode);
        const payload_eco_mode_heat_temp = [
            {
                attribute: {ID: attrThermEcoModeHeatTemperature, type: 0x29},
                minimumReportInterval: 0,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_eco_mode_heat_temp);
        if (definition.model === model_r07) {
            const payload_eco_mode_cool_temp = [
                {
                    attribute: {ID: attrThermEcoModeCoolTemperature, type: 0x29},
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                },
            ];
            await endpoint1.configureReporting("hvacThermostat", payload_eco_mode_cool_temp);
            const payload_fan_control = [
                {attribute: {ID: attrFanCtrlControl, type: 0x10}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
            ];
            await endpoint1.configureReporting("hvacFanCtrl", payload_fan_control);
            await reporting.fanMode(endpoint1, {min: 0, max: 3600, change: 0});
        }
    }
    if (definition.model === model_r06) {
        const payload_frost_protect_onoff = [
            {attribute: {ID: attrThermFrostProtectOnOff, type: 0x10}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_frost_protect_onoff);
        const payload_sound = [
            {attribute: {ID: attrThermSound, type: 0x10}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_sound);
        const payload_inversion = [
            {attribute: {ID: attrThermInversion, type: 0x10}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_inversion);
        const payload_level = [
            {attribute: {ID: attrThermLevel, type: 0x30}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_level);
        const payload_schedule_mode = [
            {attribute: {ID: attrThermScheduleMode, type: 0x30}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_schedule_mode);
    }
    if (definition.model === model_r08) {
        const payload_eco_mode = [
            {attribute: {ID: attrThermEcoMode, type: 0x30}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_eco_mode);
        const payload_ext_temp_calibration = [
            {
                attribute: {ID: attrThermExtTemperatureCalibration, type: 0x28},
                minimumReportInterval: 0,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_ext_temp_calibration);
    }
}

const electricityMeterExtend = {
    elMeter: (): ModernExtend => {
        const exposes: Expose[] = [
            e.numeric("energy_tier_1", ea.STATE_GET).withUnit("kWh").withDescription("Energy consumed at Tier 1"),
            e.numeric("energy_tier_2", ea.STATE_GET).withUnit("kWh").withDescription("Energy consumed at Tier 2"),
            e.numeric("energy_tier_3", ea.STATE_GET).withUnit("kWh").withDescription("Energy consumed at Tier 3"),
            e.numeric("energy_tier_4", ea.STATE_GET).withUnit("kWh").withDescription("Energy consumed at Tier 4"),
            e.text("model_name", ea.STATE_GET).withDescription("Meter Model Name"),
            e.text("serial_number", ea.STATE_GET).withDescription("Meter Serial Number"),
            e.text("date_release", ea.STATE_GET).withDescription("Meter Date Release"),
            e.numeric("battery_life", ea.STATE_GET).withUnit("%").withDescription("Battery Life"),
            e.binary("tamper", ea.STATE, true, false).withDescription("Tamper"),
            e.binary("battery_low", ea.STATE, true, false).withDescription("Battery Low"),
            e.numeric("device_address_preset", ea.STATE_SET).withDescription("Device Address").withValueMin(1).withValueMax(9999999),
            e.text("device_password_preset", ea.STATE_SET).withDescription("Meter Password"),
            e.numeric("device_measurement_preset", ea.ALL).withDescription("Measurement Period").withValueMin(1).withValueMax(255),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["energy_tier_1", "energy_tier_2", "energy_tier_3", "energy_tier_4"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [
                        "currentTier1SummDelivered",
                        "currentTier2SummDelivered",
                        "currentTier3SummDelivered",
                        "currentTier4SummDelivered",
                    ]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return await null;
                },
            },
            {
                key: ["model_name"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [attrElCityMeterModelName]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return await null;
                },
            },
            {
                key: ["serial_number"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", ["meterSerialNumber"]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return await null;
                },
            },
            {
                key: ["date_release"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [attrElCityMeterDateRelease]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return await null;
                },
            },
            {
                key: ["battery_life"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", ["remainingBattLife"]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return await null;
                },
            },
            {
                key: ["device_address_preset"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const device_address_preset = Number.parseInt(value, 10);
                    await entity.write("seMetering", {[attrElCityMeterAddressPreset]: {value: device_address_preset, type: 0x23}});
                    return {readAfterWriteTime: 250, state: {device_address_preset: value}};
                },
            },
            {
                key: ["device_password_preset"],
                convertSet: async (entity, key, value, meta) => {
                    const device_password_preset = value.toString();
                    await entity.write("seMetering", {[attrElCityMeterPasswordPreset]: {value: device_password_preset, type: 0x41}});
                    return {readAfterWriteTime: 250, state: {device_password_preset: value}};
                },
            },
            {
                key: ["device_measurement_preset"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const device_measurement_preset = Number.parseInt(value, 10);
                    await entity.write("seMetering", {[attrElCityMeterMeasurementPreset]: {value: device_measurement_preset, type: 0x20}});
                    return {readAfterWriteTime: 250, state: {device_measurement_preset: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [attrElCityMeterMeasurementPreset]);
                },
            },
        ];
        const fromZigbee: Fz.Converter[] = [
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.divisor !== undefined) {
                        const energyDivisor = Number.parseInt(msg.data.divisor);
                        globalStore.putValue(meta.device, "energyDivisor", energyDivisor);
                        result.e_divisor = energyDivisor;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.multiplier !== undefined) {
                        const energyMultiplier = Number.parseInt(msg.data.multiplier);
                        globalStore.putValue(meta.device, "energyMultiplier", energyMultiplier);
                        result.e_multiplier = energyMultiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTier1SummDelivered !== undefined) {
                        let energyDivisor = globalStore.getValue(meta.device, "energyDivisor");
                        let energyMultiplier = globalStore.getValue(meta.device, "energyMultiplier");
                        if (energyDivisor === undefined) {
                            energyDivisor = 1;
                        }
                        if (energyMultiplier === undefined) {
                            energyMultiplier = 1;
                        }
                        const data = msg.data.currentTier1SummDelivered;
                        result.energy_tier_1 = (Number.parseInt(data) / energyDivisor) * energyMultiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTier2SummDelivered !== undefined) {
                        let energyDivisor = globalStore.getValue(meta.device, "energyDivisor");
                        let energyMultiplier = globalStore.getValue(meta.device, "energyMultiplier");
                        if (energyDivisor === undefined) {
                            energyDivisor = 1;
                        }
                        if (energyMultiplier === undefined) {
                            energyMultiplier = 1;
                        }
                        const data = msg.data.currentTier2SummDelivered;
                        result.energy_tier_2 = (Number.parseInt(data) / energyDivisor) * energyMultiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTier3SummDelivered !== undefined) {
                        let energyDivisor = globalStore.getValue(meta.device, "energyDivisor");
                        let energyMultiplier = globalStore.getValue(meta.device, "energyMultiplier");
                        if (energyDivisor === undefined) {
                            energyDivisor = 1;
                        }
                        if (energyMultiplier === undefined) {
                            energyMultiplier = 1;
                        }
                        const data = msg.data.currentTier3SummDelivered;
                        result.energy_tier_3 = (Number.parseInt(data) / energyDivisor) * energyMultiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTier4SummDelivered !== undefined) {
                        let energyDivisor = globalStore.getValue(meta.device, "energyDivisor");
                        let energyMultiplier = globalStore.getValue(meta.device, "energyMultiplier");
                        if (energyDivisor === undefined) {
                            energyDivisor = 1;
                        }
                        if (energyMultiplier === undefined) {
                            energyMultiplier = 1;
                        }
                        const data = msg.data.currentTier4SummDelivered;
                        result.energy_tier_4 = (Number.parseInt(data) / energyDivisor) * energyMultiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data[attrElCityMeterModelName] !== undefined) {
                        const data = msg.data[attrElCityMeterModelName];
                        result.model_name = data.toString();
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.meterSerialNumber !== undefined) {
                        const data = msg.data.meterSerialNumber;
                        result.serial_number = data.toString();
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data[attrElCityMeterDateRelease] !== undefined) {
                        const data = msg.data[attrElCityMeterDateRelease];
                        result.date_release = data.toString();
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.status !== undefined) {
                        const data = msg.data.status;
                        const value = Number.parseInt(data);
                        return {
                            battery_low: (value & (1 << 1)) > 0,
                            tamper: (value & (1 << 2)) > 0,
                        };
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.remainingBattLife !== undefined) {
                        const data = Number.parseInt(msg.data.remainingBattLife);
                        result.battery_life = data;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data[attrElCityMeterMeasurementPreset] !== undefined) {
                        const data = Number.parseInt(msg.data[attrElCityMeterMeasurementPreset]);
                        result.device_measurement_preset = data;
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
};

function waterPreset(): ModernExtend {
    const exposes: Expose[] = [
        e
            .composite("preset", "preset", ea.SET)
            .withFeature(
                e
                    .numeric("hot_water_preset", ea.SET)
                    .withValueMin(0)
                    .withValueMax(99999999)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset hot water"),
            )
            .withFeature(
                e
                    .numeric("cold_water_preset", ea.SET)
                    .withValueMin(0)
                    .withValueMax(99999999)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset cold water"),
            )
            .withFeature(
                e
                    .numeric("step_water_preset", ea.SET)
                    .withValueMin(1)
                    .withValueMax(100)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset step water"),
            ),
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ["preset"],
            convertSet: async (entity, key, value, meta) => {
                const endpoint = meta.device.getEndpoint(3);
                const values = {
                    // biome-ignore lint/suspicious/noExplicitAny: ignored using `--suppress`
                    hot_water: (value as any).hot_water_preset,
                    // biome-ignore lint/suspicious/noExplicitAny: ignored using `--suppress`
                    cold_water: (value as any).cold_water_preset,
                    // biome-ignore lint/suspicious/noExplicitAny: ignored using `--suppress`
                    step_water: (value as any).step_water_preset,
                };
                if (values.hot_water !== undefined && values.hot_water >= 0) {
                    const hot_water_preset = Number.parseInt(values.hot_water);
                    await endpoint.write("seMetering", {61440: {value: hot_water_preset, type: 0x23}});
                }
                if (values.cold_water !== undefined && values.cold_water >= 0) {
                    const cold_water_preset = Number.parseInt(values.cold_water);
                    await endpoint.write("seMetering", {61441: {value: cold_water_preset, type: 0x23}});
                }
                if (values.step_water !== undefined && values.step_water >= 0) {
                    const step_water_preset = Number.parseInt(values.step_water);
                    await endpoint.write("seMetering", {61442: {value: step_water_preset, type: 0x21}});
                }
            },
        },
    ];

    return {toZigbee, exposes, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Tuya_CO2Sensor_r01"],
        model: "SLACKY_DIY_CO2_SENSOR_R01",
        vendor: "Slacky-DIY",
        description: "Tuya CO2 sensor with custom Firmware",
        extend: [m.co2({reporting: co2Reporting})],
        ota: true,
    },
    {
        zigbeeModel: ["Watermeter_TLSR8258"],
        model: "Watermeter_TLSR8258",
        vendor: "Slacky-DIY",
        description: "Water Meter",
        configure: async (device, coordinatorEndpoint, logger) => {
            const thirdEndpoint = device.getEndpoint(3);
            await thirdEndpoint.read("seMetering", [0xf000, 0xf001, 0xf002]);
        },
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    "1": 1,
                    "2": 2,
                    "3": 3,
                    "4": 4,
                    "5": 5,
                },
            }),
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1"]}),
            m.battery({
                voltage: true,
                voltageReporting: true,
                percentageReportingConfig: batteryReporting,
                voltageReportingConfig: batteryReporting,
            }),
            m.enumLookup({
                name: "switch_actions",
                endpointName: "4",
                lookup: {on_off: 0, off_on: 1, toggle: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch 1",
            }),
            m.enumLookup({
                name: "switch_actions",
                endpointName: "5",
                lookup: {on_off: 0, off_on: 1, toggle: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch 2",
            }),
            m.numeric({
                name: "volume",
                endpointNames: ["1"],
                access: "STATE_GET",
                cluster: "seMetering",
                attribute: "currentSummDelivered",
                reporting: {min: 0, max: 300, change: 0},
                unit: "L",
                description: "Hot water",
            }),
            m.numeric({
                name: "volume",
                endpointNames: ["2"],
                access: "STATE_GET",
                cluster: "seMetering",
                attribute: "currentSummDelivered",
                reporting: {min: 0, max: 300, change: 0},
                unit: "L",
                description: "Cold water",
            }),
            waterPreset(),
        ],
        ota: true,
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ["Smoke_Sensor_TLSR8258"],
        model: "Smoke Sensor TLSR8258",
        vendor: "Slacky-DIY",
        description: "Smoke Sensor on Rubezh IP 212-50M2 base",
        extend: [
            m.iasZoneAlarm({zoneType: "smoke", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
            m.battery({
                voltage: true,
                voltageReporting: true,
                percentageReportingConfig: batteryReporting,
                voltageReportingConfig: batteryReporting,
            }),
            m.commandsOnOff(),
            m.enumLookup({
                access: "STATE",
                name: "switch_type",
                lookup: {toggle: 0},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchType",
                description: "Type switch",
            }),
            m.enumLookup({
                name: "switch_actions",
                lookup: {on_off: 0, off_on: 1, toggle: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["ElectricityMeter_DIY"],
        model: "Electricity Meter TLSR8258",
        vendor: "Slacky-DIY",
        description: "Electricity Meter via optical port",
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read("seMetering", ["remainingBattLife", "status", attrElCityMeterMeasurementPreset]);
            await endpoint1.read("seMetering", ["divisor"]);
            await endpoint1.read("seMetering", ["multiplier"]);
            await endpoint1.read("seMetering", ["currentTier1SummDelivered"]);
            await endpoint1.read("seMetering", ["currentTier2SummDelivered"]);
            await endpoint1.read("seMetering", ["currentTier3SummDelivered"]);
            await endpoint1.read("seMetering", ["currentTier4SummDelivered"]);
            await endpoint1.read("seMetering", ["currentSummDelivered"]);
            await endpoint1.read("seMetering", ["meterSerialNumber"]);
            await endpoint1.read("seMetering", [attrElCityMeterMeasurementPreset]);
            await endpoint1.read("seMetering", [attrElCityMeterModelName]);
            //            await endpoint1.read("haElectricalMeasurement", ["acVoltageDivisor"]);
            //            await endpoint1.read("haElectricalMeasurement", ["acVoltageMultiplier"]);
            //            await endpoint1.read("haElectricalMeasurement", ["rmsVoltage"]);
            //            await endpoint1.read("haElectricalMeasurement", ["acCurrentDivisor"]);
            //            await endpoint1.read("haElectricalMeasurement", ["acCurrentMultiplier"]);
            //            await endpoint1.read("haElectricalMeasurement", ["instantaneousLineCurrent"]);
            //            await endpoint1.read("haElectricalMeasurement", ["acPowerDivisor"]);
            //            await endpoint1.read("haElectricalMeasurement", ["acPowerMultiplier"]);
            //            await endpoint1.read("haElectricalMeasurement", ["apparentPower"]);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["seMetering", "haElectricalMeasurement", "genDeviceTempCfg"]);
            const payload_tier1 = [{attribute: {ID: 0x0100, type: 0x25}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0}];
            await endpoint1.configureReporting("seMetering", payload_tier1);
            const payload_tier2 = [{attribute: {ID: 0x0102, type: 0x25}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0}];
            await endpoint1.configureReporting("seMetering", payload_tier2);
            const payload_tier3 = [{attribute: {ID: 0x0104, type: 0x25}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0}];
            await endpoint1.configureReporting("seMetering", payload_tier3);
            const payload_tier4 = [{attribute: {ID: 0x0106, type: 0x25}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0}];
            await endpoint1.configureReporting("seMetering", payload_tier4);
            await reporting.currentSummDelivered(endpoint1, {min: 0, max: 300, change: 0});
            const payload_status = [{attribute: {ID: 0x0200, type: 0x18}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0}];
            await endpoint1.configureReporting("seMetering", payload_status);
            const payload_battery_life = [
                {attribute: {ID: 0x0201, type: 0x20}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_battery_life);
            const payload_serial_number = [
                {attribute: {ID: 0x0308, type: 0x41}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_serial_number);
            const payload_date_release = [
                {attribute: {ID: attrElCityMeterDateRelease, type: 0x41}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_date_release);
            const payload_model_name = [
                {attribute: {ID: attrElCityMeterModelName, type: 0x41}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_model_name);
            //            await reporting.rmsVoltage(endpoint1, {min: 0, max: 300, change: 0});
            //            const payload_current = [
            //                {attribute: {ID: 0x0501, type: 0x21}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            //            ];
            //            await endpoint1.configureReporting("haElectricalMeasurement", payload_current);
            //            await reporting.apparentPower(endpoint1, {min: 0, max: 300, change: 0});
            const payload_temperature = [
                {attribute: {ID: 0x0000, type: 0x29}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("genDeviceTempCfg", payload_temperature);
        },
        extend: [
            m.deviceTemperature(),
            m.electricityMeter(),
            electricityMeterExtend.elMeter(),
            m.enumLookup({
                name: "device_model_preset",
                lookup: {
                    "No Device": 0,
                    "KASKAD-1-MT (MIRTEK)": 1,
                    "KASKAD-11-C1": 2,
                    "MERCURY-206": 3,
                    "ENERGOMERA-CE102M": 4,
                    "ENERGOMERA-CE208BY": 5,
                    "NEVA-MT124": 6,
                    "NARTIS-100": 7,
                },
                cluster: "seMetering",
                attribute: {ID: attrElCityMeterModelPreset, type: 0x30},
                description: "Device Model",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r01"],
        model: "THERM_SLACKY_DIY_R01",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        // Should be empty, unless device can be controlled (e.g. lights, switches).
        exposes: [
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e.enum("sensor", ea.ALL, switchSensorUsed).withDescription("Select temperature sensor to use"),
            e
                .numeric("deadzone_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(1),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(15)
                .withValueMax(45)
                .withValueStep(1),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 45, 1)
                .withLocalTemperatureCalibration(-9, 9, 1)
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"], ea.STATE)
                .withWeeklySchedule(["heat"], ea.ALL),
            e.text("schedule_monday", ea.STATE).withDescription("Schedule for the working week"),
            e.text("schedule_saturday", ea.STATE).withDescription("Saturday's schedule"),
            e.text("schedule_sunday", ea.STATE).withDescription("Sunday's schedule"),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r02"],
        model: "THERM_SLACKY_DIY_R02",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        // Should be empty, unless device can be controlled (e.g. lights, switches).
        exposes: [
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e.enum("sensor", ea.ALL, switchSensorUsed).withDescription("Select temperature sensor to use"),
            e
                .numeric("deadzone_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(1),
            e
                .numeric("min_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Minimum Heating set point limit")
                .withValueMin(5)
                .withValueMax(15)
                .withValueStep(1),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(15)
                .withValueMax(45)
                .withValueStep(1),
            e
                .numeric("frost_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against minimum freezing temperature")
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1),
            e
                .numeric("heat_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against maximum heating temperature")
                .withValueMin(25)
                .withValueMax(70)
                .withValueStep(1),
            e.numeric("outdoor_temperature", ea.STATE_GET).withUnit("°C").withDescription("Current temperature measured from the floor outer sensor"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 45, 0.5)
                .withLocalTemperatureCalibration(-9, 9, 1)
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"], ea.STATE)
                .withWeeklySchedule(["heat"], ea.ALL),
            e.text("schedule_monday", ea.STATE).withDescription("Monday's schedule"),
            e.text("schedule_tuesday", ea.STATE).withDescription("Tuesday's schedule"),
            e.text("schedule_wednesday", ea.STATE).withDescription("Wednesday's schedule"),
            e.text("schedule_thursday", ea.STATE).withDescription("Thursday's schedule"),
            e.text("schedule_friday", ea.STATE).withDescription("Friday's schedule"),
            e.text("schedule_saturday", ea.STATE).withDescription("Saturday's schedule"),
            e.text("schedule_sunday", ea.STATE).withDescription("Sunday's schedule"),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r03"],
        model: "THERM_SLACKY_DIY_R03",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        // Should be empty, unless device can be controlled (e.g. lights, switches).
        exposes: [
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e.enum("sensor", ea.ALL, switchSensorUsed).withDescription("Select temperature sensor to use"),
            e
                .numeric("deadzone_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(1),
            e
                .numeric("min_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Minimum Heating set point limit")
                .withValueMin(5)
                .withValueMax(15)
                .withValueStep(1),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(15)
                .withValueMax(45)
                .withValueStep(1),
            e
                .numeric("frost_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against minimum freezing temperature")
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1),
            e
                .numeric("heat_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against maximum heating temperature")
                .withValueMin(25)
                .withValueMax(70)
                .withValueStep(1),
            e.numeric("brightness", ea.ALL).withValueMin(0).withValueMax(8).withDescription("Screen brightness 06:00 - 22:00").withEndpoint("day"),
            e.numeric("brightness", ea.ALL).withValueMin(0).withValueMax(8).withDescription("Screen brightness 22:00 - 06:00").withEndpoint("night"),
            e.binary("eco_mode", ea.ALL, "On", "Off").withDescription("On/Off Eco Mode"),
            e
                .numeric("eco_mode_heat_temperature", ea.ALL)
                .withUnit("°C")
                .withDescription("Set heat temperature in eco mode")
                .withValueMin(5)
                .withValueMax(45)
                .withValueStep(1),
            e.numeric("outdoor_temperature", ea.STATE_GET).withUnit("°C").withDescription("Current temperature measured from the floor outer sensor"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 45, 0.5)
                .withLocalTemperatureCalibration(-9, 9, 1)
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"], ea.STATE)
                .withWeeklySchedule(["heat"], ea.ALL),
            e.text("schedule_monday", ea.STATE).withDescription("Monday's schedule"),
            e.text("schedule_tuesday", ea.STATE).withDescription("Tuesday's schedule"),
            e.text("schedule_wednesday", ea.STATE).withDescription("Wednesday's schedule"),
            e.text("schedule_thursday", ea.STATE).withDescription("Thursday's schedule"),
            e.text("schedule_friday", ea.STATE).withDescription("Friday's schedule"),
            e.text("schedule_saturday", ea.STATE).withDescription("Saturday's schedule"),
            e.text("schedule_sunday", ea.STATE).withDescription("Sunday's schedule"),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r04"],
        model: "THERM_SLACKY_DIY_R04",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        // Should be empty, unless device can be controlled (e.g. lights, switches).
        exposes: [
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e.enum("sensor", ea.ALL, switchSensorUsed).withDescription("Select temperature sensor to use"),
            e
                .numeric("deadzone_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(1),
            e
                .numeric("min_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Minimum Heating set point limit")
                .withValueMin(5)
                .withValueMax(15)
                .withValueStep(1),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(15)
                .withValueMax(45)
                .withValueStep(1),
            e
                .numeric("frost_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against minimum freezing temperature")
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(1),
            e
                .numeric("heat_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against maximum heating temperature")
                .withValueMin(25)
                .withValueMax(70)
                .withValueStep(1),
            e.numeric("brightness", ea.ALL).withValueMin(0).withValueMax(9).withDescription("Screen brightness").withEndpoint("day"),
            e.binary("eco_mode", ea.ALL, "On", "Off").withDescription("On/Off Eco Mode"),
            e
                .numeric("eco_mode_heat_temperature", ea.ALL)
                .withUnit("°C")
                .withDescription("Set heat temperature in eco mode")
                .withValueMin(5)
                .withValueMax(45)
                .withValueStep(1),
            e.numeric("outdoor_temperature", ea.STATE_GET).withUnit("°C").withDescription("Current temperature measured from the floor outer sensor"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 45, 0.5)
                .withLocalTemperatureCalibration(-9, 9, 1)
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"], ea.STATE)
                .withWeeklySchedule(["heat"], ea.ALL),
            e.text("schedule_monday", ea.STATE).withDescription("Monday's schedule"),
            e.text("schedule_tuesday", ea.STATE).withDescription("Tuesday's schedule"),
            e.text("schedule_wednesday", ea.STATE).withDescription("Wednesday's schedule"),
            e.text("schedule_thursday", ea.STATE).withDescription("Thursday's schedule"),
            e.text("schedule_friday", ea.STATE).withDescription("Friday's schedule"),
            e.text("schedule_saturday", ea.STATE).withDescription("Saturday's schedule"),
            e.text("schedule_sunday", ea.STATE).withDescription("Sunday's schedule"),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r05"],
        model: "THERM_SLACKY_DIY_R05",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        // Should be empty, unless device can be controlled (e.g. lights, switches).
        exposes: [
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e.enum("sensor", ea.ALL, switchSensorUsed).withDescription("Select temperature sensor to use"),
            e
                .numeric("deadzone_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(1),
            e
                .numeric("min_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Minimum Heating set point limit")
                .withValueMin(5)
                .withValueMax(15)
                .withValueStep(1),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(15)
                .withValueMax(45)
                .withValueStep(1),
            e
                .numeric("heat_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against maximum heating temperature")
                .withValueMin(25)
                .withValueMax(70)
                .withValueStep(1),
            e.numeric("outdoor_temperature", ea.STATE_GET).withUnit("°C").withDescription("Current temperature measured from the floor outer sensor"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 45, 0.5)
                .withLocalTemperatureCalibration(-9, 9, 1)
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"], ea.STATE)
                .withWeeklySchedule(["heat"], ea.ALL),
            e.text("schedule_monday", ea.STATE).withDescription("Monday's schedule"),
            e.text("schedule_tuesday", ea.STATE).withDescription("Tuesday's schedule"),
            e.text("schedule_wednesday", ea.STATE).withDescription("Wednesday's schedule"),
            e.text("schedule_thursday", ea.STATE).withDescription("Thursday's schedule"),
            e.text("schedule_friday", ea.STATE).withDescription("Friday's schedule"),
            e.text("schedule_saturday", ea.STATE).withDescription("Saturday's schedule"),
            e.text("schedule_sunday", ea.STATE).withDescription("Sunday's schedule"),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r06"],
        model: "THERM_SLACKY_DIY_R06",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        exposes: [
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.binary("sound", ea.ALL, "On", "Off").withDescription("Sound On/Off"),
            e.binary("inversion", ea.ALL, "On", "Off").withDescription("Inversion of the output"),
            e.enum("brightness_level", ea.ALL, ["Off", "Low", "Medium", "High"]).withDescription("Screen brightness"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e.enum("sensor", ea.ALL, switchSensorUsed).withDescription("Select temperature sensor to use"),
            e
                .numeric("histeresis_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(10)
                .withValueStep(0.5),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(15)
                .withValueMax(95)
                .withValueStep(1),
            e.binary("frost_protect_on_off", ea.ALL, "On", "Off").withDescription("Frost protection"),
            e
                .numeric("heat_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against maximum heating temperature")
                .withValueMin(35)
                .withValueMax(60)
                .withValueStep(1),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 45, 0.5)
                .withLocalTemperatureCalibration(-9.9, 9.9, 0.1)
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"], ea.STATE)
                .withWeeklySchedule(["heat"], ea.ALL),
            e.text("schedule_monday", ea.STATE).withDescription("Schedule for the working week"),
            e.text("schedule_sunday", ea.STATE).withDescription("Weekend schedule"),
            e.enum("schedule_mode", ea.ALL, ["Off", "5+2", "6+1", "7"]).withDescription("Schedule mode"),
            e.enum("settings_reset", ea.SET, ["Default"]).withDescription("Default settings"),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r07"],
        model: "THERM_SLACKY_DIY_R07",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        // Should be empty, unless device can be controlled (e.g. lights, switches).
        exposes: [
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e
                .numeric("deadzone_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(1),
            e
                .numeric("min_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Minimum Heating set point limit")
                .withValueMin(5)
                .withValueMax(15)
                .withValueStep(1),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(15)
                .withValueMax(45)
                .withValueStep(1),
            e.binary("eco_mode", ea.ALL, "On", "Off").withDescription("On/Off Eco Mode"),
            e
                .numeric("eco_mode_cool_temperature", ea.ALL)
                .withUnit("°C")
                .withDescription("Set cool temperature in eco mode")
                .withValueMin(10)
                .withValueMax(30)
                .withValueStep(1),
            e
                .numeric("eco_mode_heat_temperature", ea.ALL)
                .withUnit("°C")
                .withDescription("Set heat temperature in eco mode")
                .withValueMin(10)
                .withValueMax(30)
                .withValueStep(1),
            e.binary("fan_control", ea.ALL, "On", "Off").withDescription("On/Off Fan Control"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 45, 0.5)
                .withLocalTemperatureCalibration(-9, 9, 1)
                .withSystemMode(["off", "heat", "cool", "fan_only"])
                .withRunningState(["idle", "heat", "cool", "fan_only"], ea.STATE)
                .withFanMode(["low", "medium", "high", "auto"])
                .withWeeklySchedule(["cool"], ea.ALL),
            e.text("schedule_monday", ea.STATE).withDescription("Monday's schedule"),
            e.text("schedule_tuesday", ea.STATE).withDescription("Tuesday's schedule"),
            e.text("schedule_wednesday", ea.STATE).withDescription("Wednesday's schedule"),
            e.text("schedule_thursday", ea.STATE).withDescription("Thursday's schedule"),
            e.text("schedule_friday", ea.STATE).withDescription("Friday's schedule"),
            e.text("schedule_saturday", ea.STATE).withDescription("Saturday's schedule"),
            e.text("schedule_sunday", ea.STATE).withDescription("Sunday's schedule"),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r08"],
        model: "THERM_SLACKY_DIY_R08",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        exposes: [
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e
                .numeric("min_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Minimum Heating set point limit")
                .withValueMin(5)
                .withValueMax(15)
                .withValueStep(1),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(15)
                .withValueMax(45)
                .withValueStep(1),
            e.binary("eco_mode", ea.ALL, "On", "Off").withDescription("On/Off Sleep Mode"),
            e
                .numeric("external_temperature_calibration", ea.ALL)
                .withDescription("External temperature calibration")
                .withUnit("°C")
                .withValueMin(-9)
                .withValueMax(9)
                .withValueStep(1),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 45, 0.5)
                .withLocalTemperatureCalibration(-9.9, 9.9, 1)
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"], ea.STATE)
                .withWeeklySchedule(["heat"], ea.ALL),
            e.text("schedule_monday", ea.STATE).withDescription("Schedule for the working week"),
            e.text("schedule_saturday", ea.STATE).withDescription("Saturday's schedule"),
            e.text("schedule_sunday", ea.STATE).withDescription("Sunday's schedule"),
        ],
        meta: {},
        ota: true,
    },
];
