import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {Definition, DefinitionWithExtend, Expose, Fz, KeyValue, KeyValueAny, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

//import {logger} from "../lib/logger";

const e = exposes.presets;
const ea = exposes.access;

//const NS = "zhc:slacky_diy";

const ppmReporting = {min: 10, max: 300, change: 0.000001};
const batteryReporting = {min: 3600, max: 21600, change: 0};
const temperatureReporting = {min: 10, max: 3600, change: 10};
const humidityReporting = {min: 10, max: 3600, change: 10};

const model_r01 = "THERM_SLACKY_DIY_R01";
//const model_r02 = "THERM_SLACKY_DIY_R02";
const model_r03 = "THERM_SLACKY_DIY_R03";
const model_r04 = "THERM_SLACKY_DIY_R04";
//const model_r05 = "THERM_SLACKY_DIY_R05";
const model_r06 = "THERM_SLACKY_DIY_R06";
const model_r07 = "THERM_SLACKY_DIY_R07";
const model_r08 = "THERM_SLACKY_DIY_R08";
const model_r09 = "THERM_SLACKY_DIY_R09";
//const model_r0a = "THERM_SLACKY_DIY_R0A";
const model_r0b = "THERM_SLACKY_DIY_R0B";

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
const attrThermModeKeyLock = 0xf00d;
const attrThermManufName = 0xf00e;
const attrFanCtrlControl = 0xf000;

const switchSensorUsed = ["Inner (IN)", "All (AL)", "Outer (OU)"];

const attrElCityMeterModelPreset = 0xf000;
const attrElCityMeterAddressPreset = 0xf001;
const attrElCityMeterMeasurementPreset = 0xf002;
const attrElCityMeterDateRelease = 0xf003;
const attrElCityMeterModelName = 0xf004;
const attrElCityMeterPasswordPreset = 0xf005;

const attrSensorReadPeriod = 0xf000;
const attrTemperatureOffset = 0xf001;
const attrTemperatureOnOff = 0xf002;
const attrTemperatureLow = 0xf003;
const attrTemperatureHigh = 0xf004;
const attrHumidityOffset = 0xf005;
const attrHumidityOnOff = 0xf006;
const attrHumidityLow = 0xf007;
const attrHumidityHigh = 0xf008;

const attrCo2Calibration = 0xf008;
const attrFeaturesSensors = 0xf009;
const attrDisplayRotate = 0xf00a;
const attrDisplayInversion = 0xf00b;

const switchFeatures = ["nothing", "co2_forced_calibration", "co2_factory_reset", "bind_reset", ""];

const fzLocal = {
    thermostat_custom_fw: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data[attrThermSensorUser] !== undefined) {
                const lookup2 = {0: "Inner (IN)", 1: "Outer (OU)"};
                const lookup3 = {0: "Inner (IN)", 1: "All (AL)", 2: "Outer (OU)"};
                if (model.model === model_r0b) {
                    result.sensor = utils.getFromLookup(msg.data[attrThermSensorUser], lookup2);
                } else {
                    result.sensor = utils.getFromLookup(msg.data[attrThermSensorUser], lookup3);
                }
            }
            if (msg.data.minSetpointDeadBand !== undefined) {
                //logger.info(`Model: ${model.model}`, NS);
                let data: number;
                if (model.model === model_r06 || model.model === model_r09 || model.model === model_r0b) {
                    data = msg.data.minSetpointDeadBand / 10;
                    result.hysteresis_temperature = data;
                } else {
                    data = msg.data.minSetpointDeadBand;
                    result.deadzone_temperature = data;
                }
                //logger.info(`DeadBand: ${data}`, NS);
            }
            if (msg.data[attrThermFrostProtect] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermFrostProtect] as string, 10) / 100;
                result.frost_protect = data;
            }
            if (msg.data[attrThermHeatProtect] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermHeatProtect] as string, 10) / 100;
                result.heat_protect = data;
            }
            if (msg.data[attrThermEcoMode] !== undefined) {
                result.eco_mode = msg.data[attrThermEcoMode] === 1 ? "On" : "Off";
            }
            if (msg.data[attrThermEcoModeCoolTemperature] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermEcoModeCoolTemperature] as string, 10) / 100;
                result.eco_mode_cool_temperature = data;
            }
            if (msg.data[attrThermEcoModeHeatTemperature] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermEcoModeHeatTemperature] as string, 10) / 100;
                result.eco_mode_heat_temperature = data;
            }
            if (msg.data[attrThermFrostProtectOnOff] !== undefined) {
                result.frost_protect_on_off = msg.data[attrThermFrostProtectOnOff] === 1 ? "On" : "Off";
            }
            if (msg.data[attrThermLevel] !== undefined) {
                if (model.model === model_r0b) {
                    const lookup_sleep = {0: "Off", 1: "Dim", 2: "On"};
                    result.screen_sleep_mode = utils.getFromLookup(msg.data[attrThermLevel], lookup_sleep);
                } else {
                    const lookup = {0: "Off", 1: "Low", 2: "Medium", 3: "High"};
                    result.brightness_level = utils.getFromLookup(msg.data[attrThermLevel], lookup);
                }
            }
            if (msg.data[attrThermSound] !== undefined) {
                result.sound = msg.data[attrThermSound] === 1 ? "On" : "Off";
            }
            if (msg.data[attrThermInversion] !== undefined) {
                result.relay_type = msg.data[attrThermInversion] === 1 ? "NO" : "NC";
            }
            if (msg.data[attrThermModeKeyLock] !== undefined) {
                result.mode_child_lock = msg.data[attrThermModeKeyLock] === 1 ? "all" : "partial";
            }
            if (msg.data[attrThermScheduleMode] !== undefined) {
                const lookup = {0: "Off", 1: "5+2", 2: "6+1", 3: "7"};
                result.schedule_mode = utils.getFromLookup(msg.data[attrThermScheduleMode], lookup);
            }
            if (msg.data[attrThermExtTemperatureCalibration] !== undefined) {
                const data = Number.parseInt(msg.data[attrThermExtTemperatureCalibration] as string, 10) / 10;
                result.external_temperature_calibration = data;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    thermostat_schedule: {
        cluster: "hvacThermostat",
        type: ["commandSetWeeklySchedule", "commandGetWeeklyScheduleRsp"],
        convert: (model, msg, publish, options, meta) => {
            const {data} = msg;

            const daysOfWeekNums = [...Array.from(Array(7).keys()).filter((x) => (2 ** x) & data.dayofweek)];

            // biome-ignore lint/suspicious/noExplicitAny: ignored using `--suppress`
            const schedule = `${data.transitions.map((t: any) => `${String(Math.floor(t.transitionTime / 60)).padStart(2, "0")}:${String(t.transitionTime % 60).padStart(2, "0")}/${t.heatSetpoint / 100.0}°C`).join(" ")}`;
            const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
            return Object.fromEntries(daysOfWeekNums.map((d) => [`schedule_${daysOfWeek[d]}`, schedule]));
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["commandSetWeeklySchedule", "commandGetWeeklyScheduleRsp"]>,
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
    } satisfies Fz.Converter<"hvacFanCtrl", undefined, ["attributeReport", "readResponse"]>,
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
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    display_brightness: {
        key: ["brightness", "brightness_day", "brightness_night"],
        options: [exposes.options.transition()],
        convertSet: async (entity, key, value, meta) => {
            await entity.command("genLevelCtrl", "moveToLevel", {level: value as number, transtime: 0}, utils.getOptions(meta.mapped, entity));
            return {state: {brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genLevelCtrl", ["currentLevel"]);
        },
    } satisfies Tz.Converter,
    thermostat_sensor_used: {
        key: ["sensor"],

        convertSet: async (entity, key, value, meta) => {
            //const endpoint = meta.device.getEndpoint(1);
            const lookup2 = {"Inner (IN)": 0, "Outer (OU)": 1};
            const lookup3 = {"Inner (IN)": 0, "All (AL)": 1, "Outer (OU)": 2};
            if ((meta.mapped as Definition).model === model_r0b) {
                await entity.write("hvacThermostat", {[attrThermSensorUser]: {value: utils.getFromLookup(value, lookup2), type: 0x30}});
            } else {
                await entity.write("hvacThermostat", {[attrThermSensorUser]: {value: utils.getFromLookup(value, lookup3), type: 0x30}});
            }
            return {readAfterWriteTime: 250, state: {sensor: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermSensorUser]);
        },
    } satisfies Tz.Converter,
    thermostat_deadzone: {
        key: ["deadzone_temperature"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value);
            const minSetpointDeadBand = Number(Math.round(value));
            await entity.write("hvacThermostat", {minSetpointDeadBand});
            return {readAfterWriteTime: 250, state: {minSetpointDeadBand: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["minSetpointDeadBand"]);
        },
    } satisfies Tz.Converter,
    thermostat_deadzone_10: {
        key: ["hysteresis_temperature"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value);
            const minSetpointDeadBand = Number(value) * 10;
            await entity.write("hvacThermostat", {minSetpointDeadBand});
            return {readAfterWriteTime: 250, state: {hysteresis_temperature: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["minSetpointDeadBand"]);
        },
    } satisfies Tz.Converter,
    thermostat_frost_protect: {
        key: ["frost_protect"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value);
            //if (!utils.isInRange(0, 10, Number(value))) throw new Error(`Invalid value: ${value} (expected ${0} to ${10})`);
            const frost_protect = Number(Math.round(value)) * 100;
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
            utils.assertNumber(value);
            //if (!utils.isInRange(25, 70, Number(value))) throw new Error(`Invalid value: ${value} (expected ${25} to ${70})`);
            const heat_protect = Number(Math.round(value)) * 100;
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
            utils.assertNumber(value);
            //if (!utils.isInRange(-5, 5, Number(value))) throw new Error(`Invalid value: ${value} (expected ${-5} to ${5})`);
            const setpoint_raise_lower = Number(Math.fround(value)) * 10; //Step 0.1°C. 5°C - 50, 1°C - 10 etc.
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
            utils.assertNumber(value);
            //if (!utils.isInRange(5, 45, Number(value))) throw new Error(`Invalid value: ${value} (expected ${5} to ${45})`);
            const eco_mode_cool_temperature = Number(Math.round(value)) * 100;
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
            utils.assertNumber(value);
            //if (!utils.isInRange(5, 45, Number(value))) throw new Error(`Invalid value: ${value} (expected ${5} to ${45})`);
            const eco_mode_heat_temperature = Number(Math.round(value)) * 100;
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
            //utils.assertNumber(value);
            const lookup = {Off: 0, Low: 1, Medium: 2, High: 3};
            await entity.write("hvacThermostat", {[attrThermLevel]: {value: utils.getFromLookup(value, lookup), type: 0x30}});
            return {state: {brightness_level: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermLevel]);
        },
    } satisfies Tz.Converter,
    thermostat_screen_sleep_mode: {
        key: ["screen_sleep_mode"],
        convertSet: async (entity, key, value, meta) => {
            //utils.assertNumber(value);
            const lookup = {Off: 0, Dim: 1, On: 2};
            await entity.write("hvacThermostat", {[attrThermLevel]: {value: utils.getFromLookup(value, lookup), type: 0x30}});
            return {state: {screen_sleep_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermLevel]);
        },
    } satisfies Tz.Converter,
    thermostat_inversion: {
        key: ["relay_type"],
        convertSet: async (entity, key, value, meta) => {
            const relay_type = Number(value === "NO");
            await entity.write("hvacThermostat", {[attrThermInversion]: {value: relay_type, type: 0x10}});
            return {readAfterWriteTime: 250, state: {relay_type: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermInversion]);
        },
    } satisfies Tz.Converter,
    thermostat_mode_child_lock: {
        key: ["mode_child_lock"],
        convertSet: async (entity, key, value, meta) => {
            const mode_child_lock = Number(value === "all");
            await entity.write("hvacThermostat", {[attrThermModeKeyLock]: {value: mode_child_lock, type: 0x10}});
            return {readAfterWriteTime: 250, state: {mode_child_lock: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermModeKeyLock]);
        },
    } satisfies Tz.Converter,
    thermostat_schedule_mode: {
        key: ["schedule_mode"],
        convertSet: async (entity, key, value, meta) => {
            //utils.assertNumber(value);
            const lookup = {off: 0, "5+2": 1, "6+1": 2, "7": 3};
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
            utils.assertNumber(value);
            //if (!utils.isInRange(-9, 9, Number(value))) throw new Error(`Invalid value: ${value} (expected ${-9} to ${9})`);
            const external_temperature_calibration = Number(Math.round(value)) * 10;
            await entity.write("hvacThermostat", {[attrThermExtTemperatureCalibration]: {value: external_temperature_calibration, type: 0x28}});
            return {readAfterWriteTime: 250, state: {external_temperature_calibration: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermExtTemperatureCalibration]);
        },
    } satisfies Tz.Converter,
    thermostat_manuf_name: {
        key: ["manuf_name"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {r0: 0, r1: 1, r2: 2, r3: 3, r4: 4, r5: 5, r6: 6, r7: 7, r8: 8, r9: 9, r10: 10, r11: 11};
            await entity.write("hvacThermostat", {[attrThermManufName]: {value: utils.getFromLookup(value, lookup), type: 0x30}});
            return {state: {manuf_name: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [attrThermManufName]);
        },
    } satisfies Tz.Converter,
};

const localFromZigbeeThermostat = [
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
    tzLocal.thermostat_screen_sleep_mode,
    tzLocal.thermostat_sound,
    tzLocal.thermostat_inversion,
    tzLocal.thermostat_schedule_mode,
    tzLocal.thermostat_settings_reset,
    tzLocal.thermostat_ext_temperature_calibration,
    tzLocal.thermostat_mode_child_lock,
    tzLocal.thermostat_manuf_name,
    tzLocal.fancontrol_control,
];

interface LocalActionExtendArgs {
    localAction?: string[]; //("hold" | "single" | "double" | "triple" | "quadruple" | "quintuple" | "release")[];
    reporting?: boolean;
    reportingConfig?: m.ReportingConfigWithoutAttribute;
    endpointNames?: string[];
}

function localActionExtend(args: LocalActionExtendArgs = {}): ModernExtend {
    const {
        localAction = ["hold", "single", "double", "triple", "quadruple", "quintuple", "release"],
        reporting = true,
        reportingConfig = {min: 10, max: 0, change: 1},
        endpointNames = undefined,
    } = args;
    let actions: string[] = localAction;

    if (endpointNames) {
        actions = localAction.flatMap((c) => endpointNames.map((e) => `${c}_${e}`));
    }
    const exposes: Expose[] = [e.enum("action", ea.STATE, actions)];

    const actionPayloadLookup: {[key: number]: string} = {
        0: "hold",
        1: "single",
        2: "double",
        3: "triple",
        4: "quadruple",
        5: "quintuple",
        255: "release",
    };

    const fromZigbee = [
        {
            cluster: "genMultistateInput",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if (utils.hasAlreadyProcessedMessage(msg, model)) return;
                const value = msg.data.presentValue;
                //logger.logger.info('msg.data: ' + data[attribute]);
                if (value === 300) return {action: "N/A"};
                const payload = {action: utils.postfixWithEndpointName(actionPayloadLookup[value], msg, model, meta)};
                return payload;
            },
        } satisfies Fz.Converter<"genMultistateInput", undefined, ["attributeReport", "readResponse"]>,
    ];
    const result: ModernExtend = {exposes, fromZigbee, isModernExtend: true};
    if (reporting)
        result.configure = [
            m.setupConfigureForBinding("genMultistateInput", "output", endpointNames),
            m.setupConfigureForReporting("genMultistateInput", "presentValue", {config: reportingConfig, access: ea.GET, endpointNames}),
        ];

    return result;
}

async function configureCommon(device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, definition: Definition) {
    //logger.info(definition.model, NS);
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
    if (definition.model === model_r09) {
        await endpoint1.read("hvacThermostat", [attrThermModeKeyLock]);
    }
    await endpoint1.read("hvacFanCtrl", ["fanMode"]);
    await endpoint1.read("hvacFanCtrl", [attrFanCtrlControl]);
    await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat", "hvacUserInterfaceCfg", "hvacFanCtrl"]);
    if (definition.model === model_r03 || definition.model === model_r04 || definition.model === model_r09) {
        await reporting.bind(endpoint1, coordinatorEndpoint, ["genLevelCtrl"]);
        const payloadCurrentLevel = [
            {attribute: {ID: 0x0000, type: 0x20}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("genLevelCtrl", payloadCurrentLevel);
        if (definition.model === model_r03 || definition.model === model_r09) {
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
    const payload_oper_mode = [
        {attribute: "programingOperMode" as const, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
    ];
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
    if (definition.model !== model_r01 && definition.model !== model_r06 && definition.model !== model_r0b) {
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
    if (definition.model === model_r09) {
        const payload_inversion = [
            {attribute: {ID: attrThermInversion, type: 0x10}, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
        ];
        await endpoint1.configureReporting("hvacThermostat", payload_inversion);
    }
    if (definition.model === model_r08 || definition.model === model_r09) {
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
                    const device_address_preset = value;
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
                    const device_measurement_preset = value;
                    await entity.write("seMetering", {[attrElCityMeterMeasurementPreset]: {value: device_measurement_preset, type: 0x20}});
                    return {readAfterWriteTime: 250, state: {device_measurement_preset: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [attrElCityMeterMeasurementPreset]);
                },
            },
        ];
        const fromZigbee = [
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.divisor !== undefined) {
                        const energyDivisor = msg.data.divisor;
                        globalStore.putValue(meta.device, "energyDivisor", energyDivisor);
                        result.e_divisor = energyDivisor;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.multiplier !== undefined) {
                        const energyMultiplier = msg.data.multiplier;
                        globalStore.putValue(meta.device, "energyMultiplier", energyMultiplier);
                        result.e_multiplier = energyMultiplier;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
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
                        result.energy_tier_1 = (data / energyDivisor) * energyMultiplier;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
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
                        result.energy_tier_2 = (data / energyDivisor) * energyMultiplier;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
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
                        result.energy_tier_3 = (data / energyDivisor) * energyMultiplier;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
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
                        result.energy_tier_4 = (data / energyDivisor) * energyMultiplier;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
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
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
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
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
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
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.status !== undefined) {
                        const data = msg.data.status;
                        return {
                            battery_low: (data & (1 << 1)) > 0,
                            tamper: (data & (1 << 2)) > 0,
                        };
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.remainingBattLife !== undefined) {
                        const data = msg.data.remainingBattLife;
                        result.battery_life = data;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
            {
                cluster: "seMetering",
                type: ["readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data[attrElCityMeterMeasurementPreset] !== undefined) {
                        const data = Number.parseInt(msg.data[attrElCityMeterMeasurementPreset] as string, 10);
                        result.device_measurement_preset = data;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["readResponse"]>,
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
                if (values.hot_water != null && values.hot_water >= 0) {
                    const hot_water_preset = Number.parseInt(values.hot_water, 10);
                    await endpoint.write("seMetering", {61440: {value: hot_water_preset, type: 0x23}});
                }
                if (values.cold_water != null && values.cold_water >= 0) {
                    const cold_water_preset = Number.parseInt(values.cold_water, 10);
                    await endpoint.write("seMetering", {61441: {value: cold_water_preset, type: 0x23}});
                }
                if (values.step_water != null && values.step_water >= 0) {
                    const step_water_preset = Number.parseInt(values.step_water, 10);
                    await endpoint.write("seMetering", {61442: {value: step_water_preset, type: 0x21}});
                }
            },
        },
    ];

    return {toZigbee, exposes, isModernExtend: true};
}

const air_extend = {
    led_brightness: (): ModernExtend => {
        const exposes: Expose[] = [e.numeric("brightness", ea.ALL).withValueMin(0).withValueMax(255).withDescription("LED brightness")];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["brightness"],
                convertSet: async (entity, key, value, meta) => {
                    await entity.command(
                        "genLevelCtrl",
                        "moveToLevel",
                        {level: value as number, transtime: 0},
                        utils.getOptions(meta.mapped, entity),
                    );
                    return {state: {brightness: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("genLevelCtrl", ["currentLevel"]);
                },
            },
        ];

        const fromZigbee = [
            {
                cluster: "genLevelCtrl",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (Object.hasOwn(msg.data, "currentLevel")) {
                        const data = msg.data.currentLevel;
                        result.brightness = data;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]>,
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },

    features_sensors: (): ModernExtend => {
        const exposes: Expose[] = [
            e.composite("features_sensors", "features_sensors", ea.SET).withFeature(e.enum("features", ea.STATE_SET, switchFeatures)),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["features_sensors"],
                convertSet: async (entity, key, rawValue, meta) => {
                    const endpoint = meta.device.getEndpoint(1);
                    // biome-ignore lint/suspicious/noExplicitAny: ignored using `--suppress`
                    const value = (rawValue as any).features;
                    if (value != null) {
                        const lookup = {
                            nothing: 0,
                            co2_forced_calibration: 1,
                            co2_factory_reset: 2,
                            bind_reset: 3,
                        };

                        const value_lookup = utils.getFromLookup(value, lookup);
                        //logger.logger.info("value_lookup: " + value_lookup);
                        if (value_lookup >= 1 && value_lookup <= 3) {
                            await endpoint.write("hvacUserInterfaceCfg", {[attrFeaturesSensors]: {value: value_lookup, type: 0x30}});
                            return {
                                state: {[key]: value},
                            };
                        }
                    }
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("hvacUserInterfaceCfg", [attrFeaturesSensors]);
                },
            },
        ];

        return {
            exposes,
            fromZigbee: [],
            toZigbee,
            isModernExtend: true,
        };
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Tuya_CO2Sensor_r01"],
        model: "SLACKY_DIY_CO2_SENSOR_R01",
        vendor: "Slacky-DIY",
        description: "Tuya CO2 sensor with custom Firmware",
        extend: [m.co2({reporting: ppmReporting})],
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_CO2Sensor_r02"],
        model: "SLACKY_DIY_CO2_SENSOR_R02",
        vendor: "Slacky-DIY",
        description: "Tuya CO2 sensor with custom Firmware",
        extend: [
            m.co2({reporting: ppmReporting}),
            m.numeric({
                name: "formaldehyde",
                access: "STATE_GET",
                cluster: "msFormaldehyde",
                attribute: "measuredValue",
                reporting: ppmReporting,
                unit: "ppm",
                scale: 0.000001,
                precision: 2,
                description: "Measured Formaldehyde value",
            }),
            m.numeric({
                name: "voc",
                access: "STATE_GET",
                cluster: "genAnalogInput",
                attribute: "presentValue",
                reporting: ppmReporting,
                unit: "ppm",
                scale: 0.000001,
                precision: 2,
                description: "Measured VOC value",
            }),
            m.temperature(),
            m.humidity(),
        ],
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
                    no_device: 0,
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
        zigbeeModel: ["ElectricityMeterABC_DIY"],
        model: "ElectricityMeter-ABC-DIY",
        vendor: "Slacky-DIY",
        description: "Three phase Electricity Meter via optical port",
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
            m.electricityMeter({threePhase: true}),
            electricityMeterExtend.elMeter(),
            m.enumLookup({
                name: "device_model_preset",
                lookup: {
                    no_device: 0,
                    "NARTIS-I300": 1,
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
            e.binary("relay_type", ea.ALL, "NC", "NO").withDescription("Relay type NC/NO"),
            e.enum("brightness_level", ea.ALL, ["Off", "Low", "Medium", "High"]).withDescription("Screen brightness"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e.enum("sensor", ea.ALL, switchSensorUsed).withDescription("Select temperature sensor to use"),
            e
                .numeric("hysteresis_temperature", ea.ALL)
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
    {
        zigbeeModel: ["Tuya_Thermostat_r09"],
        model: "THERM_SLACKY_DIY_R09",
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
            e.binary("mode_child_lock", ea.ALL, "partial", "all").withDescription("Child lock mode - all/partial"),
            e.binary("relay_type", ea.ALL, "NC", "NO").withDescription("Relay type NC/NO"),
            e.programming_operation_mode(["setpoint", "schedule"]).withDescription("Setpoint or Schedule mode"),
            e.enum("sensor", ea.ALL, switchSensorUsed).withDescription("Select temperature sensor to use"),
            e
                .numeric("hysteresis_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(0.5),
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
            e.binary("eco_mode", ea.ALL, "On", "Off").withDescription("On/Off Sleep Mode"),
            e
                .numeric("eco_mode_heat_temperature", ea.ALL)
                .withUnit("°C")
                .withDescription("Set heat temperature in eco mode")
                .withValueMin(5)
                .withValueMax(45)
                .withValueStep(1),
            e
                .numeric("external_temperature_calibration", ea.ALL)
                .withDescription("External temperature calibration")
                .withUnit("°C")
                .withValueMin(-9)
                .withValueMax(9)
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
            e.enum("settings_reset", ea.SET, ["Default"]).withDescription("Default settings"),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["Tuya_Thermostat_r0A"],
        model: "THERM_SLACKY_DIY_R0A",
        vendor: "Slacky-DIY",
        description: "Tuya Thermostat for Floor Heating with custom Firmware",
        endpoint: (device) => {
            return {day: 1, night: 2};
        },
        fromZigbee: localFromZigbeeThermostat,
        toZigbee: localToZigbeeThermostat,
        configure: configureCommon,
        exposes: [
            e.binary("child_lock", ea.ALL, "Lock", "Unlock").withDescription("Enables/disables physical input on the device"),
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
                .withValueMin(0)
                .withValueMax(20)
                .withValueStep(1),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(20)
                .withValueMax(50)
                .withValueStep(1),
            e
                .numeric("heat_protect", ea.ALL)
                .withUnit("°C")
                .withDescription("Protection against maximum heating temperature")
                .withValueMin(25)
                .withValueMax(70)
                .withValueStep(1),
            e.binary("eco_mode", ea.ALL, "On", "Off").withDescription("On/Off Eco Mode"),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 1, 50, 1)
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
        zigbeeModel: ["Tuya_Thermostat_r0B"],
        model: "THERM_SLACKY_DIY_R0B",
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
            e.enum("sensor", ea.ALL, ["Inner (IN)", "Outer (OU)"]).withDescription("Select temperature sensor to use"),
            e.enum("screen_sleep_mode", ea.ALL, ["Off", "Dim", "On"]).withDescription("Screen sleep mode of brightness"),
            e
                .numeric("hysteresis_temperature", ea.ALL)
                .withDescription("The delta between local_temperature and current_heating_setpoint to trigger activity")
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(5)
                .withValueStep(0.5),
            e
                .numeric("min_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Minimum Heating set point limit")
                .withValueMin(1)
                .withValueMax(5)
                .withValueStep(0.5),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withDescription("Maximum Heating set point limit")
                .withUnit("°C")
                .withValueMin(35)
                .withValueMax(50)
                .withValueStep(0.5),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 1, 50, 1)
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
        zigbeeModel: ["TS0201-z-SlD"],
        model: "TS0201-z-SlD",
        vendor: "Slacky-DIY",
        description: "Tuya temperature and humidity sensor with custom Firmware",
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    "1": 1,
                    "2": 2,
                },
            }),
            m.battery({
                voltage: true,
                voltageReporting: true,
                percentageReportingConfig: batteryReporting,
                voltageReportingConfig: batteryReporting,
            }),
            m.temperature({reporting: temperatureReporting}),
            m.humidity({reporting: humidityReporting}),
            m.numeric({
                name: "temperature_offset",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: attrTemperatureOffset, type: 0x29},
                unit: "°C",
                valueMin: -5,
                valueMax: 5,
                valueStep: 0.1,
                scale: 100,
                description: "Offset to add/subtract to the inside temperature",
            }),
            m.numeric({
                name: "humidity_offset",
                cluster: "msRelativeHumidity",
                attribute: {ID: attrHumidityOffset, type: 0x29},
                unit: "%",
                valueMin: -10,
                valueMax: 10,
                valueStep: 1,
                scale: 100,
                description: "Offset to add/subtract to the inside temperature",
            }),
            m.numeric({
                name: "read_interval",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: attrSensorReadPeriod, type: 0x21},
                unit: "Sec",
                valueMin: 15,
                valueMax: 600,
                valueStep: 1,
                description: "Sensors reading period",
            }),
            m.binary({
                name: "enabling_temperature_control",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: attrTemperatureOnOff, type: 0x10},
                description: "Enables/disables Tempearure control",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
            }),
            m.numeric({
                name: "low_temperature",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: attrTemperatureLow, type: 0x29},
                unit: "°C",
                valueMin: -40,
                valueMax: 125,
                valueStep: 0.1,
                scale: 100,
                description: "Temperature low turn-off limit",
            }),
            m.numeric({
                name: "high_temperature",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: attrTemperatureHigh, type: 0x29},
                unit: "°C",
                valueMin: -40,
                valueMax: 125,
                valueStep: 0.1,
                scale: 100,
                description: "Temperature high turn-on limit",
            }),
            m.enumLookup({
                name: "temperature_actions",
                endpointName: "1",
                lookup: {heat: 0, cool: 1},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Heat or cool",
            }),
            m.binary({
                name: "enabling_humidity_control",
                cluster: "msRelativeHumidity",
                attribute: {ID: attrHumidityOnOff, type: 0x10},
                description: "Enables/disables Humidity control",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
            }),
            m.numeric({
                name: "low_humidity",
                cluster: "msRelativeHumidity",
                attribute: {ID: attrHumidityLow, type: 0x29},
                unit: "%",
                valueMin: 1,
                valueMax: 100,
                valueStep: 1,
                scale: 100,
                description: "Humidity low turn-off limit",
            }),
            m.numeric({
                name: "high_humidity",
                cluster: "msRelativeHumidity",
                attribute: {ID: attrHumidityHigh, type: 0x29},
                unit: "%",
                valueMin: 1,
                valueMax: 100,
                valueStep: 1,
                scale: 100,
                description: "Humidity high turn-on limit",
            }),
            m.enumLookup({
                name: "humidity_actions",
                endpointName: "2",
                lookup: {wet: 0, dry: 1},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Wet or dry",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["ZG-222ZA-z-SlD", "ZG-222Z-z-SlD", "SNZB-05-z-SlD"],
        model: "ZG-222ZA-z-SlD",
        vendor: "Slacky-DIY",
        description: "Tuya water leak sensor with custom firmware",
        extend: [
            m.battery({
                voltage: true,
                voltageReporting: true,
                percentageReportingConfig: batteryReporting,
                voltageReportingConfig: batteryReporting,
            }),
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1", "battery_low"]}),
            m.commandsOnOff(),
            m.enumLookup({
                name: "switch_actions",
                lookup: {off: 0, on: 1},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch",
            }),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["AirQ_Monitor_S01"],
        model: "AirQ_Monitor_S01",
        vendor: "Slacky-DIY",
        description: "Air quality monitor",
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genLevelCtrl", ["currentLevel"]);
        },
        extend: [
            m.co2({reporting: {min: 10, max: 3600, change: 0.00001}}),
            m.numeric({
                name: "voc_index",
                access: "STATE_GET",
                cluster: "genAnalogInput",
                attribute: "presentValue",
                reporting: {min: 10, max: 3600, change: 30},
                unit: "VOC Index points",
                description: "VOC index",
            }),
            m.temperature(),
            m.humidity(),
            m.pressure(),
            m.illuminance(),
            m.enumLookup({
                name: "display_rotate",
                lookup: {horizontal: 0, vertical: 1},
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: attrDisplayRotate, type: 0x30},
                reporting: {min: 0, max: 65000, change: 0},
                description: "Display orientation (horizontal/vertical)",
            }),
            m.enumLookup({
                name: "display_inversion",
                lookup: {black_on_white: 0, white_on_black: 1},
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: attrDisplayInversion, type: 0x30},
                reporting: {min: 0, max: 65000, change: 0},
                description: "Display inversion (black on white/white on black)",
            }),
            m.enumLookup({
                name: "temperature_display_mode",
                lookup: {celsius: 0, fahrenheit: 1},
                cluster: "hvacUserInterfaceCfg",
                attribute: "tempDisplayMode",
                reporting: {min: 0, max: 65000, change: 0},
                description: "The units of the temperature displayed on the device screen",
            }),
            m.numeric({
                name: "temperature_offset",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: 0xf000, type: 0x29},
                unit: "°C",
                valueMin: -5,
                valueMax: 5,
                valueStep: 0.1,
                scale: 100,
                description: "Offset to add/subtract to the inside temperature",
            }),
            m.numeric({
                name: "read_interval",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: 0xf001, type: 0x21},
                unit: "Sec",
                valueMin: 5,
                valueMax: 600,
                valueStep: 1,
                description: "Sensors reading period",
            }),
            m.binary({
                name: "enabling_co2_control",
                cluster: "msCO2",
                attribute: {ID: 0xf002, type: 0x10},
                description: "Enables/disables CO2 control",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
            }),
            m.numeric({
                name: "low_co2",
                cluster: "msCO2",
                attribute: {ID: 0xf003, type: 0x21},
                unit: "ppm",
                valueMin: 400,
                valueMax: 2000,
                valueStep: 1,
                description: "CO2 low turn-off limit",
            }),
            m.numeric({
                name: "high_co2",
                cluster: "msCO2",
                attribute: {ID: 0xf004, type: 0x21},
                unit: "ppm",
                valueMin: 400,
                valueMax: 2000,
                valueStep: 1,
                description: "CO2 high turn-on limit",
            }),
            m.binary({
                name: "enabling_voc_control",
                cluster: "genAnalogInput",
                attribute: {ID: 0xf005, type: 0x10},
                description: "Enables/disables VOC control",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
            }),
            m.numeric({
                name: "low_voc",
                cluster: "genAnalogInput",
                attribute: {ID: 0xf006, type: 0x21},
                unit: "VOC index points",
                valueMin: 1,
                valueMax: 500,
                valueStep: 1,
                description: "VOC low turn-off limit",
            }),
            m.numeric({
                name: "high_voc",
                cluster: "genAnalogInput",
                attribute: {ID: 0xf007, type: 0x21},
                unit: "VOC index points",
                valueMin: 1,
                valueMax: 500,
                valueStep: 1,
                description: "VOC high turn-on limit",
            }),
            m.enumLookup({
                name: "switch_actions",
                lookup: {off: 0, on: 1},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch",
            }),
            air_extend.led_brightness(),
            m.binary({
                name: "enabling_sound",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0xf00c, type: 0x10},
                description: "Enables/disables sound",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
            }),
            m.numeric({
                name: "frc_co2_correction",
                access: "STATE_GET",
                cluster: "msCO2",
                attribute: {ID: attrCo2Calibration, type: 0x29},
                reporting: {min: 0, max: 3600, change: 0},
                unit: "ppm",
                description: "FRC CO2 correction",
            }),
            air_extend.features_sensors(),
            m.numeric({
                name: "life_time",
                access: "STATE_GET",
                cluster: "genTime",
                attribute: "time",
                reporting: {min: 60, max: 3600, change: 0},
                unit: "h",
                description: "Life time of device",
            }),
        ],
        meta: {},
        ota: true,
    },
    {
        zigbeeModel: ["QS-Zigbee-SEC02-Mod"],
        model: "QS-Zigbee-SEC02-Mod",
        vendor: "Svetomaniya",
        description: "Smart light switch module 2 gang",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.onOff({powerOnBehavior: true, endpointNames: ["1", "2"]}),
            m.commandsOnOff({endpointNames: ["1", "2"]}),
            localActionExtend({endpointNames: ["1", "2"]}),
            m.enumLookup({
                name: "switch_actions",
                endpointName: "1",
                lookup: {off: 0, on: 1},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch 1",
            }),
            m.enumLookup({
                name: "switch_actions",
                endpointName: "2",
                lookup: {off: 0, on: 1},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch 2",
            }),
            m.enumLookup({
                name: "switch_type",
                endpointName: "1",
                lookup: {toggle: 0, momentary: 1, multifunction: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: {ID: 0xf000, type: 0x30},
                description: "Switch 1 type",
            }),
            m.enumLookup({
                name: "switch_type",
                endpointName: "2",
                lookup: {toggle: 0, momentary: 1, multifunction: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: {ID: 0xf000, type: 0x30},
                description: "Switch 2 type",
            }),
            m.enumLookup({
                name: "operation_mode",
                endpointName: "1",
                lookup: {control_relay: 0, decoupled: 1},
                cluster: "genOnOffSwitchCfg",
                attribute: {ID: 0xf001, type: 0x30},
                reporting: {min: 0, max: 65000, change: 0},
                description: "Relay 1 decoupled",
            }),
            m.enumLookup({
                name: "operation_mode",
                endpointName: "2",
                lookup: {control_relay: 0, decoupled: 1},
                cluster: "genOnOffSwitchCfg",
                attribute: {ID: 0xf001, type: 0x30},
                reporting: {min: 0, max: 65000, change: 0},
                description: "Relay 2 decoupled",
            }),
        ],
        meta: {multiEndpoint: true},
        ota: true,
    },
];
