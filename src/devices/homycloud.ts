import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const modeLookup: Record<number, string> = {0: "auto", 1: "cool", 2: "heat", 3: "dry", 4: "fan_only"};
const modeReverse: Record<string, number> = {auto: 0, cool: 1, heat: 2, dry: 3, fan_only: 4};

const fanLookup: Record<number, string> = {0: "low", 1: "medium", 2: "high", 3: "auto"};
const fanReverse: Record<string, number> = {low: 0, medium: 1, high: 2, auto: 3};

const freshAirFanLookup: Record<number, string> = {0: "low", 1: "medium", 2: "high"};
const freshAirFanReverse: Record<string, number> = {low: 0, medium: 1, high: 2};

const displayPageLookup: Record<number, string> = {0: "ac", 1: "fresh_air", 2: "floor"};
const displayPageReverse: Record<string, number> = {ac: 0, fresh_air: 1, floor: 2};

const backlightStateLookup: Record<number, string> = {0: "full", 1: "low", 2: "off"};
const backlightStateReverse: Record<string, number> = {full: 0, low: 1, off: 2};

const backlightTimeoutLookup: Record<number, string> = {
    0: "always_on",
    1: "10s",
    2: "30s",
    3: "1min",
    4: "5min",
    5: "10min",
    6: "30min",
};
const backlightTimeoutReverse: Record<string, number> = {
    always_on: 0,
    "10s": 1,
    "30s": 2,
    "1min": 3,
    "5min": 4,
    "10min": 5,
    "30min": 6,
};

const systemConfigLookup: Record<number, string> = {
    0: "AC",
    1: "HE",
    2: "AH",
    3: "NF",
    4: "AN",
    5: "NH",
    6: "AL",
};
const systemConfigReverse: Record<string, number> = {
    AC: 0,
    HE: 1,
    AH: 2,
    NF: 3,
    AN: 4,
    NH: 5,
    AL: 6,
};

const stateCache = {acPower: false, acMode: "cool"};

const fzLocal = {
    hvac_3in1: {
        cluster: "manuSpecificTuya",
        type: ["commandDataResponse", "commandDataReport", "commandActiveStatusReport"],
        convert: (model, msg, publish, options, meta) => {
            const result: Record<string, unknown> = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = tuya.getDataValue(dpValue);

                switch (dp) {
                    case 1:
                        stateCache.acPower = Boolean(value);
                        result.system_mode_ac = stateCache.acPower ? stateCache.acMode : "off";
                        break;
                    case 2:
                        result.current_heating_setpoint_ac = Number(((value as number) / 10).toFixed(1));
                        break;
                    case 3:
                        result.local_temperature_ac = Number(((value as number) / 10).toFixed(1));
                        result.local_temperature_floor = Number(((value as number) / 10).toFixed(1));
                        break;
                    case 4:
                        if (modeLookup[value as number] !== undefined) {
                            stateCache.acMode = modeLookup[value as number];
                            result.system_mode_ac = stateCache.acPower ? stateCache.acMode : "off";
                        }
                        break;
                    case 5:
                        if (fanLookup[value as number] !== undefined) {
                            result.fan_mode_ac = fanLookup[value as number];
                        }
                        break;
                    case 101:
                        result.master_power = value ? "ON" : "OFF";
                        break;
                    case 102:
                        result.frost_protection = value ? "ON" : "OFF";
                        break;
                    case 103:
                        if (backlightStateLookup[value as number] !== undefined) {
                            result.backlight_state = backlightStateLookup[value as number];
                        }
                        break;
                    case 104:
                        if (backlightTimeoutLookup[value as number] !== undefined) {
                            result.backlight_timeout = backlightTimeoutLookup[value as number];
                        }
                        break;
                    case 105:
                        result.state_fresh_air = value ? "ON" : "OFF";
                        break;
                    case 106:
                        if (freshAirFanLookup[value as number] !== undefined) {
                            result.fresh_air_speed = freshAirFanLookup[value as number];
                        }
                        break;
                    case 107:
                        if (displayPageLookup[value as number] !== undefined) {
                            result.display_page = displayPageLookup[value as number];
                        }
                        break;
                    case 108:
                        result.system_mode_floor = value ? "heat" : "off";
                        break;
                    case 109:
                        result.current_heating_setpoint_floor = Number(((value as number) / 10).toFixed(1));
                        break;
                    case 111:
                        if (systemConfigLookup[value as number] !== undefined) {
                            result.system_config = systemConfigLookup[value as number];
                        }
                        break;
                    case 210:
                        if (value === 1) {
                            result.action = "screen_wake";
                        }
                        break;
                }
            }
            return result;
        },
    } satisfies Fz.Converter<"manuSpecificTuya", undefined, ["commandDataResponse", "commandDataReport", "commandActiveStatusReport"]>,
};

const tzLocal = {
    hvac_3in1: {
        key: [
            "system_mode",
            "current_heating_setpoint",
            "fan_mode",
            "state",
            "fresh_air_speed",
            "master_power",
            "frost_protection",
            "backlight_state",
            "backlight_timeout",
            "display_page",
            "system_config",
        ],
        convertSet: async (entity, key, value, meta) => {
            const endpointName = meta.endpoint_name;

            if (endpointName === "ac") {
                if (key === "system_mode") {
                    const mode = value as string;
                    if (mode === "off") {
                        await tuya.sendDataPointBool(entity, 1, false);
                        stateCache.acPower = false;
                        return {state: {system_mode_ac: "off"}};
                    }
                    if (modeReverse[mode] !== undefined) {
                        await tuya.sendDataPointBool(entity, 1, true);
                        await tuya.sendDataPointEnum(entity, 4, modeReverse[mode]);
                        stateCache.acPower = true;
                        stateCache.acMode = mode;
                        return {state: {system_mode_ac: mode}};
                    }
                } else if (key === "current_heating_setpoint") {
                    const temp = Number(value);
                    await tuya.sendDataPointValue(entity, 2, Math.round(temp * 10));
                    return {state: {current_heating_setpoint_ac: temp}};
                } else if (key === "fan_mode" && fanReverse[value as string] !== undefined) {
                    const fan = value as string;
                    await tuya.sendDataPointEnum(entity, 5, fanReverse[fan]);
                    return {state: {fan_mode_ac: fan}};
                }
            }

            if (endpointName === "floor") {
                if (key === "system_mode") {
                    const mode = value as string;
                    await tuya.sendDataPointBool(entity, 108, mode === "heat");
                    return {state: {system_mode_floor: mode}};
                }
                if (key === "current_heating_setpoint") {
                    const temp = Number(value);
                    await tuya.sendDataPointValue(entity, 109, Math.round(temp * 10));
                    return {state: {current_heating_setpoint_floor: temp}};
                }
            }

            if (endpointName === "fresh_air" && key === "state") {
                const state = value as string;
                await tuya.sendDataPointBool(entity, 105, state === "ON");
                return {state: {state_fresh_air: state}};
            }

            if (key === "fresh_air_speed" && freshAirFanReverse[value as string] !== undefined) {
                const speed = value as string;
                await tuya.sendDataPointEnum(entity, 106, freshAirFanReverse[speed]);
                return {state: {fresh_air_speed: speed}};
            }
            if (key === "master_power") {
                const state = value as string;
                await tuya.sendDataPointBool(entity, 101, state === "ON");
                return {state: {master_power: state}};
            }
            if (key === "frost_protection") {
                const state = value as string;
                await tuya.sendDataPointBool(entity, 102, state === "ON");
                return {state: {frost_protection: state}};
            }
            if (key === "backlight_state" && backlightStateReverse[value as string] !== undefined) {
                const state = value as string;
                await tuya.sendDataPointEnum(entity, 103, backlightStateReverse[state]);
                return {state: {backlight_state: state}};
            }
            if (key === "backlight_timeout" && backlightTimeoutReverse[value as string] !== undefined) {
                const timeout = value as string;
                await tuya.sendDataPointEnum(entity, 104, backlightTimeoutReverse[timeout]);
                return {state: {backlight_timeout: timeout}};
            }
            if (key === "display_page" && displayPageReverse[value as string] !== undefined) {
                const page = value as string;
                await tuya.sendDataPointEnum(entity, 107, displayPageReverse[page]);
                return {state: {display_page: page}};
            }
            if (key === "system_config" && systemConfigReverse[value as string] !== undefined) {
                const config = value as string;
                await tuya.sendDataPointEnum(entity, 111, systemConfigReverse[config]);
                return {state: {system_config: config}};
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.command("manuSpecificTuya", "dataQuery", {}, {disableDefaultResponse: true});
        },
    } satisfies Tz.Converter,
};
// Product page: homycloud.com
export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {
                modelID: "TS0601",
                manufacturerName: "_TZE200_urvgsb2x",
            },
        ],
        model: "EPT-A30Z/GY-PL",
        vendor: "HomyCloud",
        description: "3-in-1 HVAC touch thermostat controller (AC, fresh air, and floor heating; OEM: D3-DPWK-TY)",
        fromZigbee: [fzLocal.hvac_3in1],
        toZigbee: [tzLocal.hvac_3in1],
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "1970"})],
        ota: true,
        exposes: [
            e
                .climate()
                .withEndpoint("ac")
                .withSetpoint("current_heating_setpoint", 16, 32, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "auto", "cool", "heat", "dry", "fan_only"], ea.STATE_SET)
                .withFanMode(["low", "medium", "high", "auto"], ea.STATE_SET)
                .withDescription("Air conditioner control"),
            e
                .climate()
                .withEndpoint("floor")
                .withSetpoint("current_heating_setpoint", 16, 32, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "heat"], ea.STATE_SET)
                .withDescription("Floor heating control"),
            e.switch().withEndpoint("fresh_air").withDescription("Fresh air switch"),
            e.enum("fresh_air_speed", ea.STATE_SET, ["low", "medium", "high"]).withDescription("Fresh air fan speed"),
            e.binary("master_power", ea.STATE_SET, "ON", "OFF").withDescription("Master power for all HVAC systems"),
            e.binary("frost_protection", ea.STATE_SET, "ON", "OFF").withDescription("Low temperature frost protection"),
            e.enum("display_page", ea.STATE_SET, ["ac", "fresh_air", "floor"]).withDescription("Active display page on screen"),
            e.action(["screen_wake"]).withDescription("Triggered when screen backlight wakes up"),
            e.enum("backlight_state", ea.STATE_SET, ["full", "low", "off"]).withCategory("config").withDescription("Idle backlight brightness"),
            e
                .enum("backlight_timeout", ea.STATE_SET, ["always_on", "10s", "30s", "1min", "5min", "10min", "30min"])
                .withCategory("config")
                .withDescription("Backlight idle timeout"),
            e
                .enum("system_config", ea.STATE_SET, ["AC", "HE", "AH", "NF", "AN", "NH", "AL"])
                .withCategory("config")
                .withDescription("Enabled HVAC system combination"),
        ],
        endpoint: (device) => {
            return {
                ac: 1,
                floor: 1,
                fresh_air: 1,
            };
        },
        meta: {
            multiEndpoint: true,
        },
    },
];
