import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as namron from "../lib/namron";
import * as reporting from "../lib/reporting";
import * as store from "../lib/store";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const ea = exposes.access;
const e = exposes.presets;

const sunricherManufacturer = {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_SUNRICHER_TECHNOLOGY_LTD};

interface NamronPrivate04E0 {
    attributes: {
        ntc2Temperature: number;
        ntcSensorType1: number;
        ntcSensorType2: number;
        waterSensorValue: number;
        ntcCalibration1: number;
        ntcCalibration2: number;
        waterAlarmRelayAction: number;
        ntc1OperationSelect: number;
        ntc2OperationSelect: number;
        ntc1RelayAutoTemp: number;
        ntc2RelayAutoTemp: number;
        overrideOption: number;
        ntc1TempHysteresis: number;
        ntc2TempHysteresis: number;
        waterConditionAlarm: number;
        ntcConditionAlarm: number;
        isExecuteCondition: number;
    };
    commands: never;
    commandResponses: never;
}

const fzLocal = {
    namron_panelheater: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            const isPro = model.model === "4512776/4512777";

            if (data.operateDisplayBrightness !== undefined) {
                // OperateDisplayBrightness
                if (isPro) {
                    result.display_brightness = data.operateDisplayBrightness;
                } else {
                    result.display_brightnesss = data.operateDisplayBrightness;
                }
            }
            if (data.displayAutoOff !== undefined) {
                // DisplayAutoOffActivation
                if (isPro) {
                    result.display_auto_off = data.displayAutoOff === 1;
                } else {
                    const lookup = {0: "deactivated", 1: "activated"};
                    result.display_auto_off = utils.getFromLookup(data.displayAutoOff, lookup);
                }
            }
            if (data.powerUpStatus !== undefined) {
                // PowerUpStatus (non-PRO only)
                const lookup = {0: "manual", 1: "last_state"};
                result.power_up_status = utils.getFromLookup(data.powerUpStatus, lookup);
            }
            if (data.windowOpenCheck2 !== undefined) {
                // WindowOpenCheck
                if (isPro) {
                    // PRO: 0=enable, 1=disable
                    result.window_open_detection = data.windowOpenCheck2 === 0;
                } else {
                    // Non-PRO: According to real life testing 0: disable, 1: enable
                    result.window_detection = data.windowOpenCheck2 === 1;
                }
            }
            if (data.hysterersis !== undefined) {
                // Hysteresis
                const value = utils.precisionRound(data.hysterersis, 2) / 10;
                if (isPro) {
                    result.hysteresis = value;
                } else {
                    result.hysterersis = value;
                }
            }
            if (data.windowOpen !== undefined) {
                // WindowOpen, 0: Window is not opened, 1: Window is opened
                result.window_open = data.windowOpen === 1;
            }
            // PRO-specific attributes
            if (data.controlMethod !== undefined) {
                // System control method: 0=PID, 1=Hysteresis
                result.control_method = data.controlMethod === 0 ? "pid" : "hysteresis";
            }
            if (data.adaptiveFunction !== undefined) {
                // Adaptive function AS: 0=Enable, 1=Disable
                result.adaptive_function = data.adaptiveFunction === 0;
            }
            if (data.pidKp !== undefined) {
                result.pid_kp = data.pidKp / 1000.0;
            }
            if (data.pidKd !== undefined) {
                result.pid_kd = data.pidKd / 1000.0;
            }
            if (data.pidKi !== undefined) {
                result.pid_ki = data.pidKi / 1000.0;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", namron.NamronHvacThermostat, ["attributeReport", "readResponse"]>,
    namron_thermostat2: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        options: [exposes.options.local_temperature_based_on_sensor()],
        convert: (model, msg, publish, options, meta) => {
            const runningModeStateMap: Record<number, number> = {0: 0, 3: 2, 4: 5};
            // override mode "idle" - not a supported running mode
            if (msg.data.runningMode === 0x10) msg.data.runningMode = 0;
            // map running *mode* to *state*, as that's what used
            // in homeAssistant climate ui card (red background)
            if (msg.data.runningMode !== undefined) msg.data.runningState = runningModeStateMap[msg.data.runningMode];
            return fz.thermostat.convert(model, msg, publish, options, meta); // as KeyValue;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    namronSimplifyRemote: {
        cluster: "namronPrivateE004",
        type: ["raw"],
        convert(model, msg, publish, _options, meta) {
            const bytes = parseNamronBytes(msg);
            if (bytes.length === 0) return;

            const btn = bytes.at(-2);
            const raw = bytes.at(-1);
            if (btn == null || raw == null) return;

            const kind = NAMRON_SIMPLIFY_ACTIONS[raw as 0x00 | 0x01 | 0x02];
            const base = `button_${simplify_col(btn)}_${simplify_sub(btn)}_`;

            // Firmware sometimes sends empty action after hold: synthesize release
            if (!kind) {
                const lastHold = store.getValue(meta.device, HOLD_KEY_SIMPLIFY) as string | undefined;
                if (lastHold?.endsWith("_hold")) {
                    publish({action: lastHold.replace("_hold", "_release")});
                    store.putValue(meta.device, HOLD_KEY_SIMPLIFY, null);
                }
                return;
            }
            if (kind === "hold") {
                store.putValue(meta.device, HOLD_KEY_SIMPLIFY, `${base}hold`);
                publish({action: `${base}hold`});
                return;
            }
            if (kind === "release") {
                publish({action: `${base}press`});
                publish({action: `${base}release`});
                return;
            }
            publish({action: `${base}press`});
        },
    } satisfies Fz.Converter<"namronPrivateE004", NamronPrivateE004, ["raw"]>,
};
// Namron Simplify 3-button remote (4512793 / 4512794)
// -----------------------------------------------------------
const NAMRON_SIMPLIFY_ACTIONS: Record<number, "press" | "release" | "hold"> = {
    0: "press",
    1: "release",
    2: "hold",
};

const HOLD_KEY_SIMPLIFY = "namron_simplify_lastHold";
const simplify_col = (n: number) => Math.floor((n - 1) / 2) + 1;
const simplify_sub = (n: number) => (n % 2 === 1 ? "up" : "down");

// Minimal custom-cluster shape to satisfy Fz.Converter generic constraints
type NamronPrivateE004 = {
    attributes: Record<string, never>;
    commands: Record<string, never>;
    commandResponses: Record<string, never>;
};

// Helper to safely parse bytes from msg without any/unknown
function parseNamronBytes(msg: Fz.Message<"namronPrivateE004", NamronPrivateE004, ["raw"]>): number[] {
    type RawContainer = {data?: number[]};
    type DataShape = RawContainer | number[] | Record<string, number>;
    const m = msg as {type?: string; data?: DataShape};

    if (
        m.type === "raw" &&
        m.data &&
        typeof m.data === "object" &&
        "data" in (m.data as RawContainer) &&
        Array.isArray((m.data as RawContainer).data)
    ) {
        return (m.data as RawContainer).data as number[];
    }

    if (Array.isArray(m.data)) {
        return m.data as number[];
    }

    if (m.data && typeof m.data === "object") {
        const obj = m.data as Record<string, number>;
        const keys = Object.keys(obj)
            .filter((k) => !Number.isNaN(Number(k)))
            .sort((a, b) => Number(a) - Number(b));
        return keys.map((k) => obj[k]);
    }

    return [];
}
// END SimplifyBryter
const tzLocal = {
    namron_panelheater: {
        key: ["display_brightnesss", "display_auto_off", "power_up_status", "window_detection", "hysterersis", "window_open"],
        convertSet: async (entity, key, value, meta) => {
            if (key === "display_brightnesss") {
                const payload = {4096: {value: value, type: Zcl.DataType.ENUM8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            } else if (key === "display_auto_off") {
                const lookup = {deactivated: 0, activated: 1};
                const payload = {4097: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            } else if (key === "power_up_status") {
                const lookup = {manual: 0, last_state: 1};
                const payload = {4100: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            } else if (key === "window_detection") {
                const payload = {4105: {value: value ? 1 : 0, type: Zcl.DataType.ENUM8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            } else if (key === "hysterersis") {
                const payload = {4106: {value: utils.toNumber(value, "hysterersis") * 10, type: Zcl.DataType.UINT8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
                case "display_brightnesss":
                    await entity.read<"hvacThermostat", namron.NamronHvacThermostat>(
                        "hvacThermostat",
                        ["operateDisplayBrightness"],
                        sunricherManufacturer,
                    );
                    break;
                case "display_auto_off":
                    await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["displayAutoOff"], sunricherManufacturer);
                    break;
                case "power_up_status":
                    await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["powerUpStatus"], sunricherManufacturer);
                    break;
                case "window_detection":
                    await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["windowOpenCheck2"], sunricherManufacturer);
                    break;
                case "hysterersis":
                    await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["hysterersis"], sunricherManufacturer);
                    break;
                case "window_open":
                    await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["windowOpen"], sunricherManufacturer);
                    break;

                default: // Unknown key
                    throw new Error(`Unhandled key toZigbee.namron_panelheater.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_hysteresis: {
        key: ["hysteresis"],
        convertSet: async (entity, key, value, meta) => {
            let num = utils.toNumber(value, "hysteresis");
            if (num < 0.5) num = 0.5;
            if (num > 5.0) num = 5.0;
            const raw = Math.round(num * 10);
            await entity.write("hvacThermostat", {4106: {value: raw, type: Zcl.DataType.UINT8}}, sunricherManufacturer);
            return {state: {hysteresis: num}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["hysterersis"], sunricherManufacturer);
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_window_open_detection: {
        key: ["window_open_detection"],
        convertSet: async (entity, key, value, meta) => {
            const enable = value === true || String(value).toUpperCase() === "ON";
            // 0=enable, 1=disable
            const raw = enable ? 0 : 1;
            await entity.write("hvacThermostat", {4105: {value: raw, type: Zcl.DataType.ENUM8}}, sunricherManufacturer);
            return {state: {window_open_detection: enable}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", namron.NamronHvacThermostat>(
                "hvacThermostat",
                ["windowOpenCheck2", "windowOpen"],
                sunricherManufacturer,
            );
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_display_auto_off: {
        key: ["display_auto_off"],
        convertSet: async (entity, key, value, meta) => {
            const enable = value === true || String(value).toUpperCase() === "ON";
            const raw = enable ? 1 : 0;
            await entity.write("hvacThermostat", {4097: {value: raw, type: Zcl.DataType.ENUM8}}, sunricherManufacturer);
            return {state: {display_auto_off: enable}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["displayAutoOff"], sunricherManufacturer);
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_control_method: {
        key: ["control_method"],
        convertSet: async (entity, key, value, meta) => {
            const mode = String(value).toLowerCase();
            let raw: number;
            if (mode === "pid" || mode === "0") raw = 0;
            else if (mode === "hysteresis" || mode === "1") raw = 1;
            else return;
            await entity.write("hvacThermostat", {8201: {value: raw, type: Zcl.DataType.ENUM8}}, sunricherManufacturer);
            return {state: {control_method: raw === 0 ? "pid" : "hysteresis"}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["controlMethod"], sunricherManufacturer);
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_adaptive_function: {
        key: ["adaptive_function"],
        convertSet: async (entity, key, value, meta) => {
            const enable = value === true || String(value).toUpperCase() === "ON";
            // 0=Enable, 1=Disable
            const raw = enable ? 0 : 1;
            await entity.write("hvacThermostat", {4108: {value: raw, type: Zcl.DataType.ENUM8}}, sunricherManufacturer);
            return {state: {adaptive_function: enable}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["adaptiveFunction"], sunricherManufacturer);
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_pid_kp: {
        key: ["pid_kp"],
        convertSet: async (entity, key, value, meta) => {
            let num = utils.toNumber(value, "pid_kp");
            num = Math.min(Math.max(num, 0), 1);
            await entity.write("hvacThermostat", {8198: {value: Math.round(num * 1000), type: Zcl.DataType.UINT16}}, sunricherManufacturer);
            return {state: {pid_kp: num}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["pidKp"], sunricherManufacturer);
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_pid_ki: {
        key: ["pid_ki"],
        convertSet: async (entity, key, value, meta) => {
            let num = utils.toNumber(value, "pid_ki");
            num = Math.min(Math.max(num, 0), 1);
            await entity.write("hvacThermostat", {8200: {value: Math.round(num * 1000), type: Zcl.DataType.UINT16}}, sunricherManufacturer);
            return {state: {pid_ki: num}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["pidKi"], sunricherManufacturer);
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_pid_kd: {
        key: ["pid_kd"],
        convertSet: async (entity, key, value, meta) => {
            let num = utils.toNumber(value, "pid_kd");
            num = Math.min(Math.max(num, 0), 1);
            await entity.write("hvacThermostat", {8199: {value: Math.round(num * 1000), type: Zcl.DataType.UINT16}}, sunricherManufacturer);
            return {state: {pid_kd: num}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", ["pidKd"], sunricherManufacturer);
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_state: {
        key: ["state"],
        convertSet: async (entity, key, value, meta) => {
            const v = String(value).toUpperCase();
            const isOn = v === "ON";
            const systemMode = isOn ? 0x04 : 0x00; // 0x04=heat, 0x00=off
            await entity.write("hvacThermostat", {systemMode}, {disableDefaultResponse: true});
            return {state: {state: isOn ? "ON" : "OFF"}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["systemMode"]);
        },
    } satisfies Tz.Converter,
    namron_panelheater_pro_frost_mode: {
        key: ["frost_mode"],
        convertSet: async (entity, key, value, meta) => {
            const enable = value === true || String(value).toUpperCase() === "ON";

            if (enable) {
                // Save current state before enabling frost mode
                if (meta.state) {
                    if (meta.state._prev_system_mode === undefined && meta.state.system_mode !== undefined) {
                        meta.state._prev_system_mode = meta.state.system_mode;
                    }
                    if (meta.state._prev_occupied_heating_setpoint === undefined && meta.state.occupied_heating_setpoint !== undefined) {
                        meta.state._prev_occupied_heating_setpoint = meta.state.occupied_heating_setpoint;
                    }
                }
                // Set to heat mode with 7°C setpoint (700 = 7.00°C)
                await entity.write("hvacThermostat", {systemMode: 0x04, occupiedHeatingSetpoint: 700}, {disableDefaultResponse: true});
            } else {
                // Restore previous state
                let systemMode = 0x04; // Default to heat
                let occupiedHeatingSetpoint = 2100; // Default to 21°C

                if (meta.state) {
                    if (meta.state._prev_system_mode !== undefined) {
                        const sm = meta.state._prev_system_mode;

                        if (typeof sm === "number") {
                            systemMode = sm;
                        } else {
                            const smStr = String(sm);
                            if (smStr === "off") systemMode = 0x00;
                            else if (smStr === "auto") systemMode = 0x01;
                            else if (smStr === "heat") systemMode = 0x04;
                        }
                    }

                    if (meta.state._prev_occupied_heating_setpoint !== undefined) {
                        let sp = meta.state._prev_occupied_heating_setpoint as number;
                        // Convert to centidegrees if needed
                        if (typeof sp === "number" && sp < 100) {
                            sp = Math.round(sp * 100);
                        }
                        occupiedHeatingSetpoint = sp;
                    }

                    delete meta.state._prev_system_mode;
                    delete meta.state._prev_occupied_heating_setpoint;
                }

                await entity.write("hvacThermostat", {systemMode, occupiedHeatingSetpoint}, {disableDefaultResponse: true});
            }

            return {state: {frost_mode: enable}};
        },
    } satisfies Tz.Converter,
};
// Namron Simplify Dimmer (4512791) helpers + toZigbee converters
type TzConvertSet = NonNullable<Tz.Converter["convertSet"]>;
type TzEntity = Parameters<TzConvertSet>[0];
type TzMeta = Parameters<TzConvertSet>[3];

const sdClamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const sdPctToLevel = (pct: number) => sdClamp(Math.round((Number(pct) / 100) * 254), 1, 254);
const sdLevelToPct = (lvl: number) => sdClamp(Math.round((Number(lvl) / 254) * 100), 1, 100);

const tzLocalSimplifyDimmer4512791 = {
    // Device supports off-spec writing to minLevel (0x0002).
    // Requires read-before-write pattern - device returns NOT_AUTHORIZED without prior read.
    min_brightness: {
        key: ["min_brightness"],
        convertSet: async (entity: TzEntity, key: string, value: unknown, meta: TzMeta) => {
            const pct = Number(value);
            if (!Number.isFinite(pct) || pct < 1 || pct > 50) throw new Error("min_brightness must be 1..50 (%)");
            const lvl = sdClamp(sdPctToLevel(pct), 1, 127);
            // Device requires read-before-write to accept the write (off-spec HZC firmware behavior)
            await entity.read("genLevelCtrl", ["minLevel"]);
            await entity.write("genLevelCtrl", {[0x0002]: {value: lvl, type: 0x20}}, {disableDefaultResponse: true, disableResponse: false});
            return {state: {min_brightness: sdLevelToPct(lvl)}};
        },
        convertGet: async (entity: TzEntity, key: string, meta: TzMeta) => {
            await entity.read("genLevelCtrl", ["minLevel"]);
        },
    } satisfies Tz.Converter,

    // Device supports off-spec writing to maxLevel (0x0003).
    // Requires read-before-write pattern - device returns NOT_AUTHORIZED without prior read.
    max_brightness: {
        key: ["max_brightness"],
        convertSet: async (entity: TzEntity, key: string, value: unknown, meta: TzMeta) => {
            const pct = Number(value);
            if (!Number.isFinite(pct) || pct < 51 || pct > 100) throw new Error("max_brightness must be 51..100 (%)");
            const lvl = sdClamp(sdPctToLevel(pct), 127, 254);
            // Device requires read-before-write to accept the write (off-spec HZC firmware behavior)
            await entity.read("genLevelCtrl", ["maxLevel"]);
            await entity.write("genLevelCtrl", {[0x0003]: {value: lvl, type: 0x20}}, {disableDefaultResponse: true, disableResponse: false});
            return {state: {max_brightness: sdLevelToPct(lvl)}};
        },
        convertGet: async (entity: TzEntity, key: string, meta: TzMeta) => {
            await entity.read("genLevelCtrl", ["maxLevel"]);
        },
    } satisfies Tz.Converter,

    // Device supports writing to defaultMoveRate (0x0014)
    dimming_speed: {
        key: ["dimming_speed"],
        convertSet: async (entity: TzEntity, key: string, value: unknown, meta: TzMeta) => {
            const s = Number(value);
            if (!Number.isFinite(s) || s < 1 || s > 10) throw new Error("dimming_speed must be 1..10 seconds");
            await entity.write("genLevelCtrl", {[0x0014]: {value: s, type: 0x20}}, {disableDefaultResponse: true});
            return {state: {dimming_speed: s}};
        },
        convertGet: async (entity: TzEntity, key: string, meta: TzMeta) => {
            await entity.read("genLevelCtrl", ["defaultMoveRate"]);
        },
    } satisfies Tz.Converter,

    // start_brightness maps to onLevel (0x0011)
    start_brightness: {
        key: ["start_brightness"],
        convertSet: async (entity: TzEntity, key: string, value: unknown, meta: TzMeta) => {
            const lvl = sdClamp(Math.round(Number(value)), 1, 254);
            if (!Number.isFinite(lvl)) throw new Error("start_brightness must be 1..254");
            await entity.write("genLevelCtrl", {[0x0011]: {value: lvl, type: 0x20}}, {disableDefaultResponse: true});
            return {state: {start_brightness: lvl}};
        },
        convertGet: async (entity: TzEntity, key: string, meta: TzMeta) => {
            await entity.read("genLevelCtrl", ["onLevel"]);
        },
    } satisfies Tz.Converter,
};
// End Simplify Dimmer (4512791)
// ─── Namron Zigbee Edge Thermostat (4566702/4566703/4512783/4512784) ──────────
const ZIGBEE_EPOCH_OFFSET = 946684800; // seconds between 1970-01-01 and 2000-01-01

function smartDateDecode(value: number): string | null {
    if (!value) return null;
    try {
        if (value > 100000) {
            const s = String(value).padStart(6, "0");
            return `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
        }
        return new Date(946684800000 + value * 86400000).toISOString().slice(0, 10);
    } catch (_) {
        return null;
    }
}

function dateToYymmdd(value: string): number {
    const match = String(value).match(/^20(\d{2})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD format, e.g. 2026-06-05.`);
    return Number(match[1] + match[2] + match[3]);
}

function deriveEdgeThermostatMode(frost: string, vacationMode: string, sensorMode: string, progOpMode: string, boostTimeSet: number): string {
    if (frost === "ON") return "frost";
    if (vacationMode === "ON") return "holiday";
    if (sensorMode === "percent") return "regulator";
    if (boostTimeSet > 0) return "boost";
    if (progOpMode === "schedule") return "schedule";
    if (progOpMode === "eco") return "eco";
    return "manual";
}

const edgeSensorModeLookup: KeyValue = {"0": "air", "1": "floor", "2": "both", "3": "air2", "4": "both2", "5": "floor_percent", "6": "percent"};
const edgeOnOffLookup: KeyValue = {OFF: 0, ON: 1};
const edgeOnOffReverseLookup: KeyValue = {"0": "OFF", "1": "ON"};
const edgeScreenOnTimeLookup: KeyValue = {"0": "always_on", "1": "10s", "2": "60s", "3": "30s"};
const edgeScreenOnTimeValueLookup: KeyValue = {always_on: 0, "10s": 1, "60s": 2, "30s": 3};

// biome-ignore lint/suspicious/noExplicitAny: endpoint type is complex generic
async function safeReadEdge(endpoint: any, cluster: string, attrs: (string | number)[]): Promise<void> {
    try {
        await endpoint.read(cluster, attrs);
    } catch (_) {}
}
// biome-ignore lint/suspicious/noExplicitAny: entity type is complex generic
async function writeEdgeHvac(entity: any, attr: number, value: number, type: number): Promise<void> {
    await entity.write("hvacThermostat", {[attr]: {value, type}});
}

const fzEdge = {
    basic: {
        cluster: "genBasic",
        type: ["attributeReport", "readResponse"] as const,
        convert: (model, msg): KeyValue => {
            const result: KeyValue = {};
            if (msg.data["swBuildId"] !== undefined) result["firmware_version"] = msg.data["swBuildId"];
            if (msg.data["dateCode"] !== undefined) result["firmware_date"] = msg.data["dateCode"];
            return result;
        },
    } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,

    namron_private: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"] as const,
        convert: (model, msg, publish, options, meta): KeyValue => {
            const result: KeyValue = {};
            for (const [key, value] of Object.entries(msg.data)) {
                switch (Number(key)) {
                    case 0x8000:
                        result["window_open_check"] = edgeOnOffReverseLookup[String(value as number)] ?? String(value);
                        break;
                    case 0x8001:
                        result["frost"] = edgeOnOffReverseLookup[String(value as number)] ?? String(value);
                        break;
                    case 0x8002:
                        result["window_state"] = value ? "open" : "closed";
                        break;
                    case 0x8004:
                        result["sensor_mode"] = edgeSensorModeLookup[String(value as number)] ?? String(value);
                        break;
                    case 0x8005:
                        result["panel_brightness"] = value;
                        break;
                    case 0x8007:
                        result["regulator_cycle"] = value;
                        break;
                    case 0x8013:
                        result["holiday_temp_set"] = (value as number) / 100;
                        break;
                    case 0x801d:
                        result["regulator_percentage"] = value;
                        break;
                    case 0x801f:
                        result["vacation_mode"] = edgeOnOffReverseLookup[String(value as number)] ?? String(value);
                        break;
                    case 0x8020:
                        result["vacation_start"] = smartDateDecode(value as number);
                        break;
                    case 0x8021:
                        result["vacation_end"] = smartDateDecode(value as number);
                        break;
                    case 0x800a:
                        result["time_sync_flag"] = edgeOnOffReverseLookup[String(value as number)] ?? String(value);
                        if (value === 1) {
                            const ts = Math.round(Date.now() / 1000) - ZIGBEE_EPOCH_OFFSET;
                            msg.endpoint
                                .write("hvacThermostat", {32779: {value: ts, type: 0x23}})
                                .then(() => msg.endpoint.write("hvacThermostat", {32778: {value: 0, type: 0x10}}))
                                .catch(() => {});
                        }
                        break;
                    case 0x800b:
                        try {
                            result["time_sync_value"] =
                                `${new Date(((value as number) + ZIGBEE_EPOCH_OFFSET) * 1000).toISOString().replace("T", " ").slice(0, 19)} UTC`;
                        } catch (_) {
                            result["time_sync_value"] = String(value);
                        }
                        break;
                    case 0x8022:
                        result["auto_time"] = edgeOnOffReverseLookup[String(value as number)] ?? String(value);
                        break;
                    case 0x8023:
                        result["boost_time_set"] = value;
                        break;
                    case 0x8024:
                        result["boost_time_remaining"] = value;
                        break;
                    case 0x8025:
                        result["max_heat_temp"] = (value as number) / 10;
                        break;
                    case 0x8029:
                        result["screen_on_time"] = edgeScreenOnTimeLookup[String(value as number)] ?? String(value);
                        break;
                }
            }
            const merged = Object.assign({}, meta?.state ?? {}, result) as KeyValue;
            result["thermostat_mode"] = deriveEdgeThermostatMode(
                merged["frost"] as string,
                merged["vacation_mode"] as string,
                merged["sensor_mode"] as string,
                merged["programming_operation_mode"] as string,
                (merged["boost_time_set"] as number) ?? 0,
            );
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
};

const tzEdge = {
    thermostat_mode: {
        key: ["thermostat_mode", "thermostat_mode_extra"],
        convertSet: async (entity, key, value, meta) => {
            const state: KeyValue = {};
            const wasRegulator = (meta.state as KeyValue)?.["sensor_mode"] === "percent";
            switch (value) {
                case "manual":
                case "schedule":
                case "eco":
                    await writeEdgeHvac(entity, 0x8001, 0, Zcl.DataType.BOOLEAN);
                    await writeEdgeHvac(entity, 0x801f, 0, Zcl.DataType.BOOLEAN);
                    await tz.thermostat_programming_operation_mode.convertSet(
                        entity,
                        "programming_operation_mode",
                        value === "manual" ? "setpoint" : value,
                        meta,
                    );
                    if (wasRegulator) {
                        await writeEdgeHvac(entity, 0x8004, 1, Zcl.DataType.ENUM8);
                        state["sensor_mode"] = "floor";
                    }
                    state["frost"] = "OFF";
                    state["vacation_mode"] = "OFF";
                    state["programming_operation_mode"] = value === "manual" ? "setpoint" : value;
                    state["boost_time_set"] = 0;
                    break;
                case "regulator":
                    await writeEdgeHvac(entity, 0x8001, 0, Zcl.DataType.BOOLEAN);
                    await writeEdgeHvac(entity, 0x801f, 0, Zcl.DataType.BOOLEAN);
                    await writeEdgeHvac(entity, 0x8004, 6, Zcl.DataType.ENUM8);
                    state["frost"] = "OFF";
                    state["vacation_mode"] = "OFF";
                    state["sensor_mode"] = "percent";
                    state["boost_time_set"] = 0;
                    break;
                case "frost":
                    await writeEdgeHvac(entity, 0x801f, 0, Zcl.DataType.BOOLEAN);
                    await writeEdgeHvac(entity, 0x8001, 1, Zcl.DataType.BOOLEAN);
                    state["vacation_mode"] = "OFF";
                    state["frost"] = "ON";
                    state["boost_time_set"] = 0;
                    break;
                case "holiday":
                    await writeEdgeHvac(entity, 0x8001, 0, Zcl.DataType.BOOLEAN);
                    await writeEdgeHvac(entity, 0x801f, 1, Zcl.DataType.BOOLEAN);
                    state["frost"] = "OFF";
                    state["vacation_mode"] = "ON";
                    state["boost_time_set"] = 0;
                    break;
                case "boost": {
                    await writeEdgeHvac(entity, 0x8001, 0, Zcl.DataType.BOOLEAN);
                    await writeEdgeHvac(entity, 0x801f, 0, Zcl.DataType.BOOLEAN);
                    const hours =
                        ((meta.state as KeyValue)?.["boost_time_set"] as number) > 0 ? ((meta.state as KeyValue)["boost_time_set"] as number) : 1;
                    await writeEdgeHvac(entity, 0x8023, hours, Zcl.DataType.ENUM8);
                    state["frost"] = "OFF";
                    state["vacation_mode"] = "OFF";
                    state["boost_time_set"] = hours;
                    break;
                }
                default:
                    throw new Error(`Invalid thermostat_mode: ${value}`);
            }
            state["thermostat_mode"] = value;
            state["thermostat_mode_extra"] = value;
            return {state};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8001, 0x8004, 0x801f, 0x8023]);
            await entity.read("hvacThermostat", ["programingOperMode"]);
        },
    } satisfies Tz.Converter,

    frost: {
        key: ["frost"],
        convertSet: async (entity, key, value) => {
            if (value === "ON") {
                await entity.write("hvacThermostat", {32799: {value: 0, type: 0x10}});
                await entity.write("hvacThermostat", {32769: {value: 1, type: 0x10}});
            } else {
                await entity.write("hvacThermostat", {32769: {value: 0, type: 0x10}});
            }
            return {state: {frost: value}};
        },
    } satisfies Tz.Converter,

    keypad_lockout: {
        key: ["keypad_lockout"],
        convertSet: async (entity, key, value, meta) => {
            const mapped = value === "lock" ? "lock1" : "unlock";
            await tz.thermostat_keypad_lockout.convertSet(entity, key, mapped, meta);
            return {state: {keypad_lockout: value}};
        },
        convertGet: async (entity, key, meta) => tz.thermostat_keypad_lockout.convertGet(entity, key, meta),
    } satisfies Tz.Converter,

    regulator_percentage: {
        key: ["regulator_percentage"],
        convertSet: async (entity, key, value) => {
            const num = Number(value);
            if (Number.isNaN(num) || num < 0 || num > 100) throw new Error(`Invalid regulator_percentage: ${value}`);
            await writeEdgeHvac(entity, 0x801d, Math.round(num), Zcl.DataType.INT16);
            return {state: {regulator_percentage: num}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x801d]);
        },
    } satisfies Tz.Converter,

    regulator_cycle: {
        key: ["regulator_cycle"],
        convertSet: async (entity, key, value) => {
            const num = Math.round(Number(value));
            if (Number.isNaN(num) || num < 1 || num > 30) throw new Error(`Invalid regulator_cycle: ${value}`);
            await writeEdgeHvac(entity, 0x8007, num, Zcl.DataType.UINT8);
            return {state: {regulator_cycle: num}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8007]);
        },
    } satisfies Tz.Converter,

    max_heat_temp: {
        key: ["max_heat_temp"],
        convertSet: async (entity, key, value) => {
            const num = Number(value);
            if (Number.isNaN(num) || num < 15 || num > 35) throw new Error(`Invalid max_heat_temp: ${value}`);
            await writeEdgeHvac(entity, 0x8025, Math.round(num * 10), Zcl.DataType.INT16);
            return {state: {max_heat_temp: num}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8025]);
        },
    } satisfies Tz.Converter,

    vacation_start: {
        key: ["vacation_start"],
        convertSet: async (entity, key, value) => {
            const raw = dateToYymmdd(value as string);
            await writeEdgeHvac(entity, 0x8020, raw, Zcl.DataType.UINT32);
            return {state: {vacation_start: value}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8020]);
        },
    } satisfies Tz.Converter,

    vacation_end: {
        key: ["vacation_end"],
        convertSet: async (entity, key, value) => {
            const raw = dateToYymmdd(value as string);
            await writeEdgeHvac(entity, 0x8021, raw, Zcl.DataType.UINT32);
            return {state: {vacation_end: value}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8021]);
        },
    } satisfies Tz.Converter,

    holiday_temp_set: {
        key: ["holiday_temp_set"],
        convertSet: async (entity, key, value) => {
            const num = Number(value);
            if (Number.isNaN(num) || num < 5 || num > 35) throw new Error(`Invalid holiday_temp_set: ${value}`);
            await writeEdgeHvac(entity, 0x8013, Math.round(num * 100), Zcl.DataType.INT16);
            return {state: {holiday_temp_set: num}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8013]);
        },
    } satisfies Tz.Converter,

    boost_time_set: {
        key: ["boost_time_set"],
        convertSet: async (entity, key, value) => {
            const num = Math.round(Number(value));
            if (Number.isNaN(num) || num < 0 || num > 24) throw new Error(`Invalid boost_time_set: ${value}`);
            await writeEdgeHvac(entity, 0x8023, num, Zcl.DataType.ENUM8);
            return {state: {boost_time_set: num}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8023, 0x8024]);
        },
    } satisfies Tz.Converter,

    window_open_check: {
        key: ["window_open_check"],
        convertSet: async (entity, key, value) => {
            const raw = edgeOnOffLookup[value as string];
            if (raw === undefined) throw new Error(`Invalid window_open_check: ${value}`);
            await writeEdgeHvac(entity, 0x8000, raw as number, Zcl.DataType.BOOLEAN);
            return {state: {window_open_check: value}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8000]);
        },
    } satisfies Tz.Converter,

    screen_on_time: {
        key: ["screen_on_time"],
        convertSet: async (entity, key, value) => {
            const raw = edgeScreenOnTimeValueLookup[value as string];
            if (raw === undefined) throw new Error(`Invalid screen_on_time: ${value}`);
            await writeEdgeHvac(entity, 0x8029, raw as number, Zcl.DataType.ENUM8);
            return {state: {screen_on_time: value}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8029]);
        },
    } satisfies Tz.Converter,

    panel_brightness: {
        key: ["panel_brightness"],
        convertSet: async (entity, key, value) => {
            const num = Math.round(Number(value));
            if (Number.isNaN(num) || num < 0 || num > 100) throw new Error(`Invalid panel_brightness: ${value}`);
            await writeEdgeHvac(entity, 0x8005, num, Zcl.DataType.UINT8);
            return {state: {panel_brightness: num}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8005]);
        },
    } satisfies Tz.Converter,

    auto_time: {
        key: ["auto_time"],
        convertSet: async (entity, key, value) => {
            const raw = edgeOnOffLookup[value as string];
            if (raw === undefined) throw new Error(`Invalid auto_time: ${value}`);
            await writeEdgeHvac(entity, 0x8022, raw as number, Zcl.DataType.BOOLEAN);
            return {state: {auto_time: value}};
        },
        convertGet: async (entity) => {
            await entity.read("hvacThermostat", [0x8022]);
        },
    } satisfies Tz.Converter,

    sync_time: {
        key: ["sync_time"],
        convertSet: async (entity) => {
            const ts = Math.round(Date.now() / 1000) - ZIGBEE_EPOCH_OFFSET;
            await writeEdgeHvac(entity, 0x800b, ts, Zcl.DataType.UINT32);
            await writeEdgeHvac(entity, 0x800a, 0, Zcl.DataType.BOOLEAN);
            await entity.read("hvacThermostat", [0x800a, 0x800b]);
            return {state: {sync_time: "sync"}};
        },
    } satisfies Tz.Converter,
};
// ─── Namron Zigbee Edge Thermostat END ───────────────────────────────────────

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["4566702", "4566703", "4512783", "4512784"],
        model: "4566702",
        vendor: "Namron",
        description: "Zigbee Edge Thermostat",
        ota: true,
        extend: [m.humidity()],

        fromZigbee: [fzEdge.basic, fz.thermostat, fzEdge.namron_private, fz.hvac_user_interface, fz.metering, fz.electrical_measurement],

        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_programming_operation_mode,
            tz.thermostat_temperature_display_mode,
            tzEdge.thermostat_mode,
            tzEdge.frost,
            tzEdge.keypad_lockout,
            tzEdge.regulator_percentage,
            tzEdge.regulator_cycle,
            tzEdge.max_heat_temp,
            tzEdge.vacation_start,
            tzEdge.vacation_end,
            tzEdge.holiday_temp_set,
            tzEdge.boost_time_set,
            tzEdge.window_open_check,
            tzEdge.screen_on_time,
            tzEdge.panel_brightness,
            tzEdge.auto_time,
            tzEdge.sync_time,
        ],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            await reporting.bind(endpoint, coordinatorEndpoint, [
                "genTime",
                "genOta",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msRelativeHumidity",
                "seMetering",
                "haElectricalMeasurement",
            ]);

            await reporting.thermostatTemperature(endpoint, {min: 10, max: 300, change: 10});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 10, max: 300, change: 50});

            try {
                await endpoint.configureReporting("haElectricalMeasurement", [
                    {attribute: "rmsCurrent", minimumReportInterval: 10, maximumReportInterval: 300, reportableChange: 1},
                    {attribute: "activePower", minimumReportInterval: 10, maximumReportInterval: 300, reportableChange: 100},
                ]);
            } catch (_) {}

            await safeReadEdge(endpoint, "genBasic", ["swBuildId", "dateCode"]);
            await safeReadEdge(endpoint, "hvacThermostat", [
                "localTemp",
                "occupiedHeatingSetpoint",
                "systemMode",
                "runningMode",
                "runningState",
                "localTemperatureCalibration",
                "pIHeatingDemand",
                "programingOperMode",
                "tempDisplayMode",
            ]);
            await safeReadEdge(endpoint, "hvacUserInterfaceCfg", ["keypadLockout"]);
            await safeReadEdge(endpoint, "seMetering", ["currentSummDelivered", "divisor", "multiplier"]);
            await safeReadEdge(endpoint, "haElectricalMeasurement", [
                "activePower",
                "rmsCurrent",
                "acPowerMultiplier",
                "acPowerDivisor",
                "acCurrentMultiplier",
                "acCurrentDivisor",
            ]);
            await safeReadEdge(
                endpoint,
                "hvacThermostat",
                [
                    0x8000, 0x8001, 0x8002, 0x8004, 0x8005, 0x8007, 0x8013, 0x801d, 0x801f, 0x8020, 0x8021, 0x800a, 0x800b, 0x8022, 0x8023, 0x8024,
                    0x8025, 0x8029,
                ],
            );

            // Sync time at configure
            const ts = Math.round(Date.now() / 1000) - ZIGBEE_EPOCH_OFFSET;
            await endpoint.write("hvacThermostat", {32779: {value: ts, type: Zcl.DataType.UINT32}});
            await endpoint.write("hvacThermostat", {32778: {value: 0, type: Zcl.DataType.BOOLEAN}});

            // Write defaults: screen_on_time = 30s, temperature_display_mode = celsius
            await endpoint.write("hvacThermostat", {[0x8029]: {value: 3, type: Zcl.DataType.ENUM8}});
            await endpoint.write("hvacUserInterfaceCfg", {[0x0000]: {value: 0, type: Zcl.DataType.ENUM8}});

            device.powerSource = "Mains (single phase)";
            device.save();
        },

        // Periodic time sync regardless of heating status.
        // Syncs time at most once per hour so vacation mode always has correct clock.
        onEvent: async (event) => {
            if (event.type === "stop") return;
            const now = Date.now();
            const device = event.data.device;
            const lastSync = (device.meta["lastTimeSync"] as number) ?? 0;
            if (now - lastSync > 60 * 60 * 1000) {
                try {
                    const endpoint = device.getEndpoint(1);
                    const ts = Math.round(now / 1000) - ZIGBEE_EPOCH_OFFSET;
                    await endpoint.write("hvacThermostat", {32779: {value: ts, type: Zcl.DataType.UINT32}});
                    await endpoint.write("hvacThermostat", {32778: {value: 0, type: Zcl.DataType.BOOLEAN}});
                    device.meta["lastTimeSync"] = now;
                    device.save();
                } catch (_) {
                    /* ignore */
                }
            }
        },

        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 35, 0.5)
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"])
                .withLocalTemperatureCalibration(-5, 5, 0.5),
            e.numeric("max_heat_temp", ea.ALL).withUnit("°C").withValueMin(15).withValueMax(35).withValueStep(0.5).withLabel("Max heat temperature"),
            e.enum("thermostat_mode", ea.ALL, ["manual", "schedule", "regulator"]).withLabel("Thermostat mode"),
            e.enum("thermostat_mode_extra", ea.ALL, ["eco", "frost", "holiday"]).withLabel("Special mode"),
            e.binary("frost", ea.STATE_SET, "ON", "OFF").withLabel("Frost Mode"),
            e.enum("temperature_display_mode", ea.STATE_SET, ["celsius", "fahrenheit"]).withLabel("Temperature unit"),
            e
                .numeric("regulator_percentage", ea.ALL)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(5)
                .withLabel("Regulator set point"),
            e
                .numeric("regulator_cycle", ea.ALL)
                .withUnit("min")
                .withValueMin(1)
                .withValueMax(30)
                .withValueStep(1)
                .withLabel("Regulator cycle duration"),
            e.binary("vacation_mode", ea.STATE, "ON", "OFF").withLabel("Vacation active"),
            e.text("vacation_start", ea.ALL).withLabel("Vacation start (YYYY-MM-DD)"),
            e.text("vacation_end", ea.ALL).withLabel("Vacation end (YYYY-MM-DD)"),
            e.numeric("holiday_temp_set", ea.ALL).withUnit("°C").withValueMin(5).withValueMax(35).withValueStep(0.5).withLabel("Holiday temperature"),
            e
                .numeric("boost_time_set", ea.ALL)
                .withUnit("h")
                .withValueMin(0)
                .withValueMax(24)
                .withValueStep(1)
                .withLabel("Boost time set")
                .withDescription("Set hours for boost heating. Setting a value > 0 activates boost mode immediately. Set to 0 to stop boost."),
            e.numeric("boost_time_remaining", ea.STATE).withUnit("min").withLabel("Boost time remaining"),
            e.binary("window_open_check", ea.ALL, "ON", "OFF").withLabel("Window detection"),
            e.enum("window_state", ea.STATE, ["open", "closed"]).withLabel("Window state"),
            e.binary("keypad_lockout", ea.STATE_SET, "lock", "unlock").withLabel("Child Lock"),
            e.enum("screen_on_time", ea.ALL, ["always_on", "10s", "30s", "60s"]).withLabel("Screen on time"),
            e.numeric("panel_brightness", ea.ALL).withValueMin(0).withValueMax(100).withValueStep(1).withLabel("Panel brightness"),
            e.binary("auto_time", ea.ALL, "ON", "OFF").withLabel("Auto time sync"),
            e.text("time_sync_value", ea.STATE).withLabel("Thermostat time (UTC)"),
            e.enum("sync_time", ea.SET, ["sync"]).withLabel("Sync time"),
            e.text("firmware_version", ea.STATE).withLabel("Firmware version"),
            e.text("firmware_date", ea.STATE).withLabel("Firmware date"),
            e.numeric("energy", ea.STATE).withUnit("kWh").withLabel("Energy"),
            e.numeric("current", ea.STATE).withUnit("A").withLabel("Current"),
            e.numeric("power", ea.STATE).withUnit("W").withLabel("Power"),
        ],
    },

    {
        zigbeeModel: ["3308431"],
        model: "3308431",
        vendor: "Namron",
        description: "Luna ceiling light",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["3802967"],
        model: "3802967",
        vendor: "Namron",
        description: "Led bulb 6w RGBW",
        extend: [m.light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ["4512700"],
        model: "4512700",
        vendor: "Namron",
        description: "Zigbee dimmer 400W",
        ota: true,
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["4512739"],
        model: "4512739",
        vendor: "Namron",
        description: "Zigbee dimmer TW 400W",
        ota: true,
        extend: [m.light({configureReporting: true, colorTemp: {range: [160, 450]}}), m.electricityMeter()],
    },
    {
        zigbeeModel: ["4512760"],
        model: "4512760",
        vendor: "Namron",
        description: "Zigbee dimmer 400W",
        ota: true,
        extend: [m.light({configureReporting: true}), m.electricityMeter({voltage: false, current: false})],
    },
    {
        zigbeeModel: ["4512708"],
        model: "4512708",
        vendor: "Namron",
        description: "Zigbee LED dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["4512766"],
        model: "4512766",
        vendor: "Namron",
        description: "Zigbee smart plug 16A",
        ota: true,
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["4512767"],
        model: "4512767",
        vendor: "Namron",
        description: "Zigbee smart plug 16A",
        ota: true,
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["4512789"],
        model: "4512789",
        vendor: "Namron",
        description: "Zigbee smart plug 16A IP44",
        extend: [m.deviceTemperature({scale: 100}), m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["1402767"],
        model: "1402767",
        vendor: "Namron",
        description: "Zigbee LED dimmer",
        extend: [m.light({effect: false, configureReporting: true}), m.forcePowerSource({powerSource: "Mains (single phase)"})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["1402768"],
        model: "1402768",
        vendor: "Namron",
        description: "Zigbee LED dimmer TW 250W",
        extend: [m.light({effect: false, configureReporting: true, colorTemp: {range: [250, 65279]}})],
    },
    {
        zigbeeModel: ["4512733"],
        model: "4512733",
        vendor: "Namron",
        description: "Zigbee dimmer 2-pol 400W",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["4512704"],
        model: "4512704",
        vendor: "Namron",
        description: "Zigbee switch 400W",
        extend: [m.onOff()],
        ota: true,
    },
    {
        zigbeeModel: ["1402755"],
        model: "1402755",
        vendor: "Namron",
        description: "Zigbee LED dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["4512703"],
        model: "4512703",
        vendor: "Namron",
        description: "Zigbee 4 channel switch K8 (white)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
                "on_l3",
                "off_l3",
                "brightness_move_up_l3",
                "brightness_move_down_l3",
                "brightness_stop_l3",
                "on_l4",
                "off_l4",
                "brightness_move_up_l4",
                "brightness_move_down_l4",
                "brightness_stop_l4",
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512721"],
        model: "4512721",
        vendor: "Namron",
        description: "Zigbee 4 channel switch K8 (black)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
                "on_l3",
                "off_l3",
                "brightness_move_up_l3",
                "brightness_move_down_l3",
                "brightness_stop_l3",
                "on_l4",
                "off_l4",
                "brightness_move_up_l4",
                "brightness_move_down_l4",
                "brightness_stop_l4",
            ]),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512701"],
        model: "4512701",
        vendor: "Namron",
        description: "Zigbee 1 channel switch K2 (White)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop"])],
        toZigbee: [],
    },
    {
        zigbeeModel: ["4512728"],
        model: "4512728",
        vendor: "Namron",
        description: "Zigbee 1 channel switch K2 (Black)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop"])],
        toZigbee: [],
    },
    {
        zigbeeModel: ["1402769"],
        model: "1402769",
        vendor: "Namron",
        description: "Zigbee LED dimmer",
        extend: [m.light({configureReporting: true}), m.forcePowerSource({powerSource: "Mains (single phase)"})],
        ota: true,
    },
    {
        zigbeeModel: ["4512702"],
        model: "4512702",
        vendor: "Namron",
        description: "Zigbee 1 channel switch K4",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop, fz.command_step],
        exposes: [
            e.battery(),
            e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop", "brightness_step_up", "brightness_step_down"]),
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ["4512719"],
        model: "4512719",
        vendor: "Namron",
        description: "Zigbee 2 channel switch K4 (white)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
            ]),
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        ota: true,
    },
    {
        fingerprint: [{modelID: "DIM Lighting", manufacturerName: "Namron As"}],
        model: "4512707",
        vendor: "Namron",
        description: "Zigbee LED-Controller",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["4512726"],
        model: "4512726",
        vendor: "Namron",
        description: "Zigbee 4 in 1 dimmer",
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_move_to_level, fz.command_move_to_color_temp, fz.command_move_to_hue],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage(), e.action(["on", "off", "brightness_move_to_level", "color_temperature_move", "move_to_hue"])],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genPowerCfg", "genIdentify", "haDiagnostic", "genOta"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512729"],
        model: "4512729",
        vendor: "Namron",
        description: "Zigbee 2 channel switch K4 (black)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
            ]),
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512706"],
        model: "4512706",
        vendor: "Namron",
        description: "Remote control",
        fromZigbee: [
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_step_color_temperature,
            fz.command_recall,
            fz.command_move_to_color_temp,
            fz.battery,
            fz.command_move_to_hue,
        ],
        exposes: [
            e.battery(),
            e.action([
                "on",
                "off",
                "brightness_step_up",
                "brightness_step_down",
                "color_temperature_step_up",
                "color_temperature_step_down",
                "recall_*",
                "color_temperature_move",
                "move_to_hue_l1",
                "move_to_hue_l2",
                "move_to_hue_l3",
                "move_to_hue_l4",
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ["4512705"],
        model: "4512705",
        vendor: "Namron",
        description: "Zigbee 4 channel remote control",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop, fz.command_recall],
        toZigbee: [],
        ota: true,
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
                "on_l3",
                "off_l3",
                "brightness_move_up_l3",
                "brightness_move_down_l3",
                "brightness_stop_l3",
                "on_l4",
                "off_l4",
                "brightness_move_up_l4",
                "brightness_move_down_l4",
                "brightness_stop_l4",
                "recall_*",
            ]),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ["3802960"],
        model: "3802960",
        vendor: "Namron",
        description: "LED 9W DIM E27",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["3802961"],
        model: "3802961",
        vendor: "Namron",
        description: "LED 9W CCT E27",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["3802962"],
        model: "3802962",
        vendor: "Namron",
        description: "LED 9W RGBW E27",
        extend: [m.light({colorTemp: {range: undefined}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ["3802963"],
        model: "3802963",
        vendor: "Namron",
        description: "LED 5,3W DIM E14",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["3802964"],
        model: "3802964",
        vendor: "Namron",
        description: "LED 5,3W CCT E14",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["3802965"],
        model: "3802965",
        vendor: "Namron",
        description: "LED 4,8W DIM GU10",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["3802966"],
        model: "3802966",
        vendor: "Namron",
        description: "LED 4.8W CCT GU10",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["89665"],
        model: "89665",
        vendor: "Namron",
        description: "LED Strip RGB+W (5m) IP20",
        extend: [m.light({colorTemp: {range: undefined}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ["4512737", "4512738"],
        model: "4512737/4512738",
        vendor: "Namron",
        description: "Touch thermostat",
        fromZigbee: [
            fz.thermostat,
            namron.fromZigbee.namron_thermostat,
            fz.metering,
            fz.electrical_measurement,
            namron.fromZigbee.namron_hvac_user_interface,
        ],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupancy,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_outdoor_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_running_state,
            namron.toZigbee.namron_thermostat_child_lock,
            namron.toZigbee.namron_thermostat,
        ],
        exposes: [
            e.local_temperature(),
            e.numeric("outdoor_temperature", ea.STATE_GET).withUnit("°C").withDescription("Current temperature measured from the floor sensor"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 0, 40, 0.1)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withSystemMode(["off", "auto", "dry", "heat"])
                .withRunningState(["idle", "heat"]),
            e.binary("away_mode", ea.ALL, "ON", "OFF").withDescription("Enable/disable away mode"),
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.enum("lcd_brightness", ea.ALL, ["low", "mid", "high"]).withDescription("OLED brightness when operating the buttons.  Default: Medium."),
            e.enum("button_vibration_level", ea.ALL, ["off", "low", "high"]).withDescription("Key beep volume and vibration level.  Default: Low."),
            e
                .enum("floor_sensor_type", ea.ALL, ["10k", "15k", "50k", "100k", "12k"])
                .withDescription("Type of the external floor sensor.  Default: NTC 10K/25."),
            e.enum("sensor", ea.ALL, ["air", "floor", "both"]).withDescription("The sensor used for heat control.  Default: Room Sensor."),
            e.enum("powerup_status", ea.ALL, ["default", "last_status"]).withDescription("The mode after a power reset.  Default: Previous Mode."),
            e
                .numeric("floor_sensor_calibration", ea.ALL)
                .withUnit("°C")
                .withValueMin(-3)
                .withValueMax(3)
                .withValueStep(0.1)
                .withDescription("The tempearatue calibration for the external floor sensor, between -3 and 3 in 0.1°C.  Default: 0."),
            e
                .numeric("dry_time", ea.ALL)
                .withUnit("min")
                .withValueMin(5)
                .withValueMax(100)
                .withDescription("The duration of Dry Mode, between 5 and 100 minutes.  Default: 5."),
            e.enum("mode_after_dry", ea.ALL, ["off", "manual", "auto", "away"]).withDescription("The mode after Dry Mode.  Default: Auto."),
            e.enum("temperature_display", ea.ALL, ["room", "floor"]).withDescription("The temperature on the display.  Default: Room Temperature."),
            e
                .numeric("window_open_check", ea.ALL)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(4)
                .withValueStep(0.5)
                .withDescription("The threshold to detect window open, between 1.5 and 4 in 0.5 °C.  Default: 0 (disabled)."),
            e
                .numeric("hysterersis", ea.ALL)
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(5)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting, between 0.5 and 5 in 0.1 °C.  Default: 0.5."),
            e.enum("display_auto_off_enabled", ea.ALL, ["enabled", "disabled"]),
            e
                .numeric("alarm_airtemp_overvalue", ea.ALL)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(35)
                .withDescription(
                    "Floor temperature over heating threshold, range is 0-35, unit is 1ºC, " +
                        "0 means this function is disabled, default value is 27.",
                ),
        ],
        // Device does not asks for the time with binding, therefore we write the time every 24 hours
        extend: [m.writeTimeDaily({endpointId: 1}), namron.namronExtend.addNamronHvacThermostat2Cluster()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "hvacThermostat",
                "seMetering",
                "haElectricalMeasurement",
                "genAlarms",
                "msOccupancySensing",
                "genTime",
                "hvacUserInterfaceCfg",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // standard ZCL attributes
            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);

            // Metering
            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor", "acCurrentMultiplier"]);
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor"]);
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10 (0,01)
            await reporting.activePower(endpoint, {min: 10, change: 15}); // W - Min change of 1,5W
            await reporting.currentSummDelivered(endpoint, {min: 300}); // Report KWH every 5min
            await reporting.readMeteringMultiplierDivisor(endpoint);

            // OperateDisplayLcdBrightnesss
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "lcdBrightness",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // ButtonVibrationLevel
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "buttonVibrationLevel",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // FloorSensorType
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "floorSensorType",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // ControlType
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "controlType",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // PowerUpStatus
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "powerUpStatus",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // FloorSensorCalibration
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "floorSensorCalibration",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );
            // DryTime
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "dryTime",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );
            // ModeAfterDry
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "modeAfterDry",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // TemperatureDisplay
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "temperatureDisplay",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // WindowOpenCheck
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "windowOpenCheck2",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );

            // Hysterersis
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "hysterersis",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );
            // DisplayAutoOffEnable
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "displayAutoOffEnable",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );

            // AlarmAirTempOverValue
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "alarmAirTempOverValue",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );
            // Away Mode Set
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                [
                    {
                        attribute: "awayModeSet",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );

            // Trigger initial read
            await endpoint.read("hvacThermostat", ["systemMode", "runningState", "occupiedHeatingSetpoint"]);
            await endpoint.read<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                ["lcdBrightness", "buttonVibrationLevel", "floorSensorType", "controlType"],
                sunricherManufacturer,
            );
            await endpoint.read<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                ["powerUpStatus", "floorSensorCalibration", "dryTime", "modeAfterDry"],
                sunricherManufacturer,
            );
            await endpoint.read<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                ["temperatureDisplay", "windowOpenCheck2", "hysterersis", "displayAutoOffEnable"],
                sunricherManufacturer,
            );
            await endpoint.read<"hvacThermostat", namron.NamronHvacThermostat2>(
                "hvacThermostat",
                ["alarmAirTempOverValue", "awayModeSet"],
                sunricherManufacturer,
            );
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512735"],
        model: "4512735",
        vendor: "Namron",
        description: "Multiprise with 4 AC outlets and 2 USB super charging ports (16A)",
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.switch().withEndpoint("l4"),
            e.switch().withEndpoint("l5"),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            for (const ID of [1, 2, 3, 4, 5]) {
                const endpoint = device.getEndpoint(ID);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            }
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        zigbeeModel: ["5401392", "5401396", "5401393", "5401397", "5401394", "5401398", "5401395", "5401399"],
        model: "540139X",
        vendor: "Namron",
        description: "Panel heater 400/600/800/1000 W",
        extend: [namron.namronExtend.addNamronHvacThermostatCluster()],
        ota: true,
        fromZigbee: [fz.thermostat, fz.metering, fz.electrical_measurement, fzLocal.namron_panelheater, namron.fromZigbee.namron_hvac_user_interface],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tzLocal.namron_panelheater,
            namron.toZigbee.namron_thermostat_child_lock,
        ],
        exposes: [
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 35, 0.5)
                .withLocalTemperature()
                // Unit also supports Auto, but i haven't added support the scheduler yet
                // so the function is not listed for now, as this doesn´t allow you the set the temperature
                .withSystemMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withRunningState(["idle", "heat"]),
            // Namron proprietary stuff
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e
                .numeric("hysterersis", ea.ALL)
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(2)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting, default: 0.5"),
            e
                .numeric("display_brightnesss", ea.ALL)
                .withValueMin(1)
                .withValueMax(7)
                .withValueStep(1)
                .withDescription("Adjust brightness of display values 1(Low)-7(High)"),
            e.enum("display_auto_off", ea.ALL, ["deactivated", "activated"]).withDescription("Enable / Disable display auto off"),
            e
                .enum("power_up_status", ea.ALL, ["manual", "last_state"])
                .withDescription("The mode after a power reset.  Default: Previous Mode. See instructions for information about manual"),
            e.window_detection_bool(),
            e.window_open(ea.STATE_GET),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "hvacThermostat",
                "seMetering",
                "haElectricalMeasurement",
                "genAlarms",
                "genTime",
                "hvacUserInterfaceCfg",
            ];

            // Reporting

            // Metering
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10 (0,01)
            await reporting.activePower(endpoint, {min: 10, change: 15}); // W - Min change of 1,5W
            await reporting.currentSummDelivered(endpoint, {min: 300}); // Report KWH every 5min

            // Thermostat reporting
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // LocalTemp is spammy, reports 0.01C diff by default, min change is now 0.5C
            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});

            // display_brightnesss
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat>(
                "hvacThermostat",
                [
                    {
                        attribute: "operateDisplayBrightness",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // display_auto_off
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat>(
                "hvacThermostat",
                [
                    {
                        attribute: "displayAutoOff",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // power_up_status
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat>(
                "hvacThermostat",
                [
                    {
                        attribute: "powerUpStatus",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // window_detection
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat>(
                "hvacThermostat",
                [
                    {
                        attribute: "windowOpenCheck2",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // hysterersis
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat>(
                "hvacThermostat",
                [
                    {
                        attribute: "hysterersis",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // window_open
            await endpoint.configureReporting<"hvacThermostat", namron.NamronHvacThermostat>(
                "hvacThermostat",
                [
                    {
                        attribute: "windowOpen",
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );

            await endpoint.read("hvacThermostat", ["systemMode", "runningState", "occupiedHeatingSetpoint"]);
            await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint.read<"hvacThermostat", namron.NamronHvacThermostat>(
                "hvacThermostat",
                ["operateDisplayBrightness", "displayAutoOff", "powerUpStatus", "windowOpenCheck2", "hysterersis", "windowOpen"],
                sunricherManufacturer,
            );

            await reporting.bind(endpoint, coordinatorEndpoint, binds);
        },
    },
    {
        zigbeeModel: ["Panel Heater"],
        model: "4512776/4512777",
        vendor: "Namron",
        description: "Zigbee thermostat for panel heater PRO (white 4512776 / black 4512777)",
        extend: [
            namron.namronExtend.addNamronHvacThermostatCluster(),
            m.electricityMeter({cluster: "both", energy: {divisor: 10}, power: false, voltage: false, current: false, configureReporting: false}),
        ],
        fromZigbee: [fz.thermostat, fzLocal.namron_panelheater, namron.fromZigbee.namron_hvac_user_interface, fz.electrical_measurement],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_system_mode,
            namron.toZigbee.namron_thermostat_child_lock,
            tzLocal.namron_panelheater_pro_state,
            tzLocal.namron_panelheater_pro_frost_mode,
            tzLocal.namron_panelheater_pro_hysteresis,
            tzLocal.namron_panelheater_pro_window_open_detection,
            tzLocal.namron_panelheater_pro_display_auto_off,
            tzLocal.namron_panelheater_pro_control_method,
            tzLocal.namron_panelheater_pro_adaptive_function,
            tzLocal.namron_panelheater_pro_pid_kp,
            tzLocal.namron_panelheater_pro_pid_ki,
            tzLocal.namron_panelheater_pro_pid_kd,
        ],
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 35, 0.5)
                .withLocalTemperatureCalibration(-10, 10, 0.5)
                .withSystemMode(["off", "heat", "auto"])
                .withRunningState(["idle", "heat"]),
            e.binary("state", ea.ALL, "ON", "OFF").withDescription("Virtual on/off (maps to systemMode)"),
            e
                .binary("frost_mode", ea.ALL, true, false)
                .withDescription("Frost protection: HEAT + 7°C, restores previous mode/setpoint when disabled"),
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e
                .numeric("hysteresis", ea.ALL)
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(5.0)
                .withValueStep(0.1)
                .withDescription("Hysteresis (0.5–5.0°C) for on/off control"),
            e.binary("window_open_detection", ea.ALL, true, false).withDescription("Window open detection"),
            e.binary("window_open", ea.STATE, true, false).withDescription("Whether the heater thinks window is open"),
            e.enum("control_method", ea.ALL, ["pid", "hysteresis"]).withDescription("System control method (PID or hysteresis)"),
            e.binary("adaptive_function", ea.ALL, true, false).withDescription("Adaptive preheat function (on/off)"),
            e.numeric("pid_kp", ea.ALL).withValueMin(0).withValueMax(1).withValueStep(0.01).withDescription("PID Kp"),
            e.numeric("pid_ki", ea.ALL).withValueMin(0).withValueMax(1).withValueStep(0.01).withDescription("PID Ki"),
            e.numeric("pid_kd", ea.ALL).withValueMin(0).withValueMax(1).withValueStep(0.01).withDescription("PID Kd"),
            e
                .numeric("display_brightness", ea.STATE)
                .withValueMin(1)
                .withValueMax(7)
                .withValueStep(1)
                .withDescription("Display brightness (read-only, set on the heater)"),
            e.binary("display_auto_off", ea.ALL, true, false).withDescription("Display auto off after 30s without interaction"),
            e.power(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            // Save energy divisor manually since configureReporting is disabled
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 10, multiplier: 1});
            endpoint.save();

            await reporting.bind(endpoint, coordinatorEndpoint, [
                "genBasic",
                "genIdentify",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "seMetering",
                "haElectricalMeasurement",
            ]);

            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            await endpoint.read("hvacThermostat", ["localTemp", "occupiedHeatingSetpoint", "systemMode"]);

            // Proprietary attrs including display, window, PID, control_method, adaptive
            try {
                await endpoint.read<"hvacThermostat", namron.NamronHvacThermostat>(
                    "hvacThermostat",
                    [
                        "operateDisplayBrightness",
                        "displayAutoOff",
                        "windowOpenCheck2",
                        "hysterersis",
                        "windowOpen",
                        "adaptiveFunction",
                        "pidKp",
                        "pidKd",
                        "pidKi",
                        "controlMethod",
                    ],
                    sunricherManufacturer,
                );
            } catch {
                // Ignore - some attributes may not be supported
            }

            try {
                await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            } catch {
                // Ignore
            }

            try {
                await endpoint.read("haElectricalMeasurement", ["activePower"]);
            } catch {
                // Ignore
            }

            try {
                await endpoint.read("seMetering", ["currentSummDelivered"]);
            } catch {
                // Ignore
            }

            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        zigbeeModel: ["3802968"],
        model: "3802968",
        vendor: "Namron",
        description: "LED Filament Flex 5W CCT E27 Clear",
        extend: [m.light({colorTemp: {range: [153, 555]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ["4512749"],
        model: "4512749",
        vendor: "Namron",
        description: "Thermostat outlet socket",
        fromZigbee: [fz.metering, fz.electrical_measurement, fz.on_off, fz.temperature],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.temperature(), e.power(), e.current(), e.voltage(), e.switch(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "msTemperatureMeasurement"]);
            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acCurrentMultiplier", "acCurrentDivisor"]);
            await reporting.onOff(endpoint);
            await reporting.temperature(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ["4512749-N"],
        model: "4512749-N",
        vendor: "Namron",
        description: "Thermostat outlet socket",
        fromZigbee: [fz.metering, fz.electrical_measurement, fz.on_off, fz.temperature],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.temperature(), e.power(), e.current(), e.voltage(), e.switch(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "msTemperatureMeasurement"]);
            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acCurrentMultiplier", "acCurrentDivisor"]);
            await reporting.onOff(endpoint);
            await reporting.temperature(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10
            await reporting.activePower(endpoint, {min: 10, change: 1}); // W - Min change of 0,1W
        },
    },
    {
        zigbeeModel: ["4512747"],
        model: "4512747",
        vendor: "Namron",
        description: "Curtain motor controller",
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ["4512758", "4512759"],
        model: "4512758",
        vendor: "Namron",
        description: "Zigbee thermostat 16A",
        whiteLabel: [{model: "4512759", fingerprint: [{modelID: "4512759"}]}],
        fromZigbee: [fzLocal.namron_thermostat2, fz.metering, fz.electrical_measurement, namron.fromZigbee.namron_hvac_user_interface],
        toZigbee: [
            {
                // map running *mode* to *state*, as that's what used
                // in homeAssistant climate ui card (red background)
                key: ["running_state"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("hvacThermostat", ["runningMode"]);
                },
            },
            tz.thermostat_local_temperature,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            // tz.thermostat_min_cool_setpoint_limit,
            // tz.thermostat_max_cool_setpoint_limit,
            // tz.thermostat_pi_heating_demand,
            tz.thermostat_local_temperature_calibration,
            // tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            namron.toZigbee.namron_thermostat_child_lock,
        ],
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({voltage: false}),
            m.binary<"hvacThermostat", namron.NamronHvacThermostat>({
                name: "away_mode",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: "antiFrost",
                description: "Enable or Disable Away/Anti-freeze mode",
            }),
            m.binary<"hvacThermostat", namron.NamronHvacThermostat>({
                name: "window_open_check",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: "windowOpenCheck",
                description: "Enable or Disable open window detection",
                entityCategory: "config",
            }),
            m.binary<"hvacThermostat", namron.NamronHvacThermostat>({
                name: "window_open",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: "windowState",
                description: "On if window is currently detected as open",
            }),

            m.numeric<"hvacThermostat", namron.NamronHvacThermostat>({
                name: "backlight_level",
                unit: "%",
                valueMin: 0,
                valueMax: 100,
                valueStep: 10,
                cluster: "hvacThermostat",
                attribute: "displayActiveBacklight",
                description: "Brightness of the display",
                entityCategory: "config",
            }),
            m.binary<"hvacThermostat", namron.NamronHvacThermostat>({
                name: "backlight_onoff",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: "backlightOnoff",
                description: "Enable or Disable display light",
                entityCategory: "config",
            }),

            m.enumLookup<"hvacThermostat", namron.NamronHvacThermostat>({
                name: "sensor_mode",
                lookup: {air: 0, floor: 1, both: 2, percent: 6},
                cluster: "hvacThermostat",
                attribute: "sensorMode",
                description: "Select which sensor the thermostat uses to control the room",
                entityCategory: "config",
            }),
        ],
        exposes: [
            // FUTURE: could maybe translate to a common cooling/heating setpoint depending on the mode
            // and state.. HomeAssistant climate widget doesn't play nice with two setpoints.
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 0, 40, 0.5)
                //.withSetpoint('occupied_cooling_setpoint', 0, 40, 0.5)
                .withLocalTemperatureCalibration(-10, 10, 1)
                //.withSystemMode(['off', 'auto', 'cool', 'heat'])
                .withSystemMode(["off", "heat"])
                //.withRunningMode(['off', 'cool','heat'])
                .withRunningState(["idle", "cool", "heat"]),
            //.withPiHeatingDemand()
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genIdentify", "hvacThermostat", "seMetering", "haElectricalMeasurement", "genAlarms", "hvacUserInterfaceCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            // await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);

            // Trigger initial read
            await endpoint.read("hvacThermostat", ["systemMode", "runningMode", "occupiedHeatingSetpoint"]);
            await endpoint.read<"hvacThermostat", namron.NamronHvacThermostat>("hvacThermostat", [
                "windowOpenCheck",
                "antiFrost",
                "windowState",
                "sensorMode",
            ]);

            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        zigbeeModel: ["4512762"],
        model: "4512762",
        vendor: "Namron",
        description: "Zigbee Door Sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["4512763"],
        model: "4512763",
        vendor: "Namron",
        description: "Zigbee movement sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy()],
    },
    {
        zigbeeModel: ["4512764"],
        model: "4512764",
        vendor: "Namron",
        description: "Zigbee water leak sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.water_leak(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["4512765"],
        model: "4512765",
        vendor: "Namron",
        description: "Zigbee humidity and temperature Sensor",
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ["4512750", "4512751"],
        model: "4512750",
        vendor: "Namron",
        description: "Zigbee dimmer 2.0",
        ota: true,
        extend: [m.light({configureReporting: true})],
        whiteLabel: [{vendor: "Namron", model: "4512751", description: "Zigbee dimmer 2.0", fingerprint: [{modelID: "4512751"}]}],
    },
    {
        zigbeeModel: ["4512772", "4512773"],
        model: "4512773",
        vendor: "Namron",
        description: "Zigbee 8 channel switch black",
        whiteLabel: [{vendor: "Namron", model: "4512772", description: "Zigbee 8 channel switch white", fingerprint: [{modelID: "4512772"}]}],
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
                "on_l3",
                "off_l3",
                "brightness_move_up_l3",
                "brightness_move_down_l3",
                "brightness_stop_l3",
                "on_l4",
                "off_l4",
                "brightness_move_up_l4",
                "brightness_move_down_l4",
                "brightness_stop_l4",
            ]),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512768"],
        model: "4512768",
        vendor: "Namron",
        description: "Zigbee 2 channel switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            m.electricityMeter({endpointNames: ["l1", "l2"]}),
        ],
    },
    {
        zigbeeModel: ["4512761"],
        model: "4512761",
        vendor: "Namron",
        description: "Zigbee relais 16A",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.onOff(endpoint);
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512770", "4512771"],
        model: "4512770",
        vendor: "Namron",
        description: "Zigbee multisensor (white)",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery(), e.battery_voltage(), e.temperature(), e.humidity()],
        whiteLabel: [{vendor: "Namron", model: "4512771", description: "Zigbee multisensor (black)", fingerprint: [{modelID: "4512771"}]}],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint3 = device.getEndpoint(3);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            await reporting.bind(endpoint4, coordinatorEndpoint, ["msRelativeHumidity"]);
        },
        extend: [m.illuminance()],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_p3lqqy2r"]),
        model: "4512752/4512753",
        vendor: "Namron",
        description: "Touch thermostat 16A 2.0",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "2000"})],
        options: [],
        exposes: [
            e
                .enum("mode", ea.STATE_SET, ["regulator", "thermostat"])
                .withDescription(
                    "Controls how the operating mode of the device. Possible values:" +
                        " regulator (open-loop controller), thermostat (control with target temperature)",
                ),
            e
                .enum("regulator_period", ea.STATE_SET, ["15min", "30min", "45min", "60min", "90min"])
                .withLabel("Regulator cycle duration")
                .withDescription("Regulator cycle duration. Not applicable when in thermostat mode."),
            e
                .numeric("regulator_set_point", ea.STATE_SET)
                .withUnit("%")
                .withDescription("Desired heating set point (%) when in regulator mode.")
                .withValueMin(0)
                .withValueMax(95),
            e
                .climate()
                .withSystemMode(["off", "heat"], ea.STATE_SET, "Whether the thermostat is turned on or off")
                .withPreset(["manual", "home", "away"])
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withSetpoint("current_heating_setpoint", 5, 35, 1, ea.STATE_SET),
            e.current(),
            e.power(),
            e.energy(),
            e.voltage(),
            e.temperature_sensor_select(["air_sensor", "floor_sensor", "both"]),
            e
                .numeric("local_temperature", ea.STATE)
                .withUnit("°C")
                .withDescription("Current temperature measured with internal sensor")
                .withValueStep(1),
            e
                .numeric("local_temperature_floor", ea.STATE)
                .withUnit("°C")
                .withDescription("Current temperature measured on the external sensor (floor)")
                .withValueStep(1),
            e.child_lock(),
            e.window_detection().withLabel("Open window detection"),
            e
                .numeric("hysteresis", ea.STATE_SET)
                .withUnit("°C")
                .withDescription(
                    "The offset from the target temperature in which the temperature has to " +
                        "change for the heating state to change. This is to prevent erratically turning on/off " +
                        "when the temperature is close to the target.",
                )
                .withValueMin(1)
                .withValueMax(9)
                .withValueStep(1),
            e
                .numeric("max_temperature_protection", ea.STATE_SET)
                .withUnit("°C")
                .withDescription("Max guarding temperature")
                .withValueMin(20)
                .withValueMax(95)
                .withValueStep(1),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "system_mode", tuya.valueConverterBasic.lookup({off: false, heat: true})],
                [2, "preset", tuya.valueConverterBasic.lookup({manual: tuya.enum(0), home: tuya.enum(1), away: tuya.enum(2)})],
                [16, "current_heating_setpoint", tuya.valueConverter.raw],
                [24, "local_temperature", tuya.valueConverter.raw],
                [28, "local_temperature_calibration", tuya.valueConverter.raw],
                [30, "child_lock", tuya.valueConverter.lockUnlock],
                [101, "local_temperature_floor", tuya.valueConverter.raw],
                [102, "sensor", tuya.valueConverterBasic.lookup({air_sensor: tuya.enum(0), floor_sensor: tuya.enum(1), both: tuya.enum(2)})],
                [103, "hysteresis", tuya.valueConverter.raw],
                [104, "running_state", tuya.valueConverterBasic.lookup({idle: false, heat: true})],
                [106, "window_detection", tuya.valueConverter.onOff],
                [107, "max_temperature_protection", tuya.valueConverter.raw],
                [108, "mode", tuya.valueConverterBasic.lookup({regulator: tuya.enum(0), thermostat: tuya.enum(1)})],
                [
                    109,
                    "regulator_period",
                    tuya.valueConverterBasic.lookup({
                        "15min": tuya.enum(0),
                        "30min": tuya.enum(1),
                        "45min": tuya.enum(2),
                        "60min": tuya.enum(3),
                        "90min": tuya.enum(4),
                    }),
                ],
                [110, "regulator_set_point", tuya.valueConverter.raw],
                [120, "current", tuya.valueConverter.divideBy10],
                [121, "voltage", tuya.valueConverter.raw],
                [122, "power", tuya.valueConverter.raw],
                [123, "energy", tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        zigbeeModel: ["4512782", "4512781", "4566700", "4566701"],
        model: "4512782 / 4512781 / 4566700 / 4566701",
        vendor: "Namron",
        description: "Namron Edge Dimmer",
        extend: [
            m.light({effect: false, configureReporting: true, powerOnBehavior: false}),
            m.electricityMeter({voltage: false, current: false, configureReporting: true}),
        ],
        meta: {},
    },
    {
        zigbeeModel: ["4512788"],
        model: "4512788",
        vendor: "Namron",
        description: "Zigbee smart plug dimmer 150W",
        extend: [m.light({effect: false, configureReporting: true}), m.electricityMeter({cluster: "electrical"})],
    },

    {
        zigbeeModel: ["1402790"],
        model: "1402790",
        vendor: "Namron",
        description: "Stove guard for safe cooking",
        extend: [
            m.deviceEndpoints({endpoints: {main_switch: 1, short_override: 2}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["main_switch"], description: "Main relay switch"}),
            m.onOff({powerOnBehavior: false, endpointNames: ["short_override"], description: "Short override switch"}),
            m.electricityMeter({
                endpointNames: ["main_switch"],
                power: {multiplier: 1, divisor: 1},
                voltage: false,
                current: false,
            }),
            m.battery(),
            m.temperature({reporting: undefined}),
        ],
    },
    {
        zigbeeModel: ["4512792"],
        model: "4512792",
        vendor: "Namron",
        description: "Simplify 1-2p relay (Zigbee / BT)",
        extend: [
            m.onOff(),
            m.electricityMeter({
                power: {multiplier: 1, divisor: 10}, // W
                voltage: {multiplier: 1, divisor: 10}, // V -> 2383 -> 238.3
                current: {multiplier: 1, divisor: 100}, // A
                energy: {multiplier: 1, divisor: 100}, // kWh
            }),
        ],
    },
    {
        zigbeeModel: ["4512793", "4512794"],
        model: "4512793",
        vendor: "Namron",
        description: "Simplify 6-button remote with battery",
        extend: [m.battery(), namron.namronExtend.addCustomClusterNamronPrivateE004()],
        fromZigbee: [fzLocal.namronSimplifyRemote],
        toZigbee: [],
        exposes: [
            e.action([
                "button_1_up_press",
                "button_1_up_hold",
                "button_1_up_release",
                "button_1_down_press",
                "button_1_down_hold",
                "button_1_down_release",
                "button_2_up_press",
                "button_2_up_hold",
                "button_2_up_release",
                "button_2_down_press",
                "button_2_down_hold",
                "button_2_down_release",
                "button_3_up_press",
                "button_3_up_hold",
                "button_3_up_release",
                "button_3_down_press",
                "button_3_down_hold",
                "button_3_down_release",
            ]),
        ],
    },
    {
        zigbeeModel: ["4512791"],
        model: "4512791",
        vendor: "Namron",
        description: "Namron Simplify Zigbee dimmer (1/2-polet / Zigbee / BT)",
        extend: [
            m.electricityMeter({
                power: {multiplier: 1, divisor: 10},
                voltage: {multiplier: 1, divisor: 10},
                current: {multiplier: 1, divisor: 100},
                energy: {multiplier: 1, divisor: 100},
            }),
        ],
        exposes: [
            e.light_brightness(),
            exposes
                .numeric("min_brightness", ea.ALL)
                .withValueMin(1)
                .withValueMax(50)
                .withUnit("%")
                .withDescription("Minimum brightness in % (1–50%). Written to device minLevel (0x0002).")
                .withCategory("config"),
            exposes
                .numeric("max_brightness", ea.ALL)
                .withValueMin(51)
                .withValueMax(100)
                .withUnit("%")
                .withDescription("Maximum brightness in % (51–100%). Written to device maxLevel (0x0003).")
                .withCategory("config"),
            exposes
                .numeric("dimming_speed", ea.ALL)
                .withValueMin(1)
                .withValueMax(10)
                .withUnit("s")
                .withDescription("Default dimming time in seconds (1–10s). Written to device defaultMoveRate (0x0014).")
                .withCategory("config"),
            exposes
                .numeric("start_brightness", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Default brightness at power-on/startup (1–254). Written to device onLevel (0x0011).")
                .withCategory("config"),
            exposes
                .enum("startup_on_off", ea.ALL, ["off", "on", "toggle", "previous"])
                .withDescription("On/Off state at power-on/startup.")
                .withCategory("config"),
            exposes
                .enum("dimmer_mode", ea.STATE, ["trailing_edge", "leading_edge"])
                .withDescription("Dimmer type: trailing edge (RC) or leading edge (RL). Set via Namron Simplify Hub/app."),
        ],
        fromZigbee: [
            fz.on_off,
            fz.brightness,
            fz.electrical_measurement,
            fz.metering,
            {
                cluster: "genLevelCtrl",
                type: ["attributeReport", "readResponse"],
                convert: (
                    model: unknown,
                    msg: {type: string; data: Record<string | number, number>},
                    publish: unknown,
                    options: unknown,
                    meta: unknown,
                ) => {
                    const result: Record<string, unknown> = {};
                    // Only use readResponse for min/max - attributeReport may contain stale cached values
                    if (Object.hasOwn(msg.data, "minLevel") && msg.type === "readResponse")
                        result["min_brightness"] = sdLevelToPct(msg.data["minLevel"]);
                    if (Object.hasOwn(msg.data, "maxLevel") && msg.type === "readResponse")
                        result["max_brightness"] = sdLevelToPct(msg.data["maxLevel"]);
                    if (Object.hasOwn(msg.data, "onLevel")) result["start_brightness"] = msg.data["onLevel"];
                    if (Object.hasOwn(msg.data, "defaultMoveRate")) result["dimming_speed"] = msg.data["defaultMoveRate"];
                    if (Object.hasOwn(msg.data, 0xb000))
                        result["dimmer_mode"] = (msg.data as Record<number, number>)[0xb000] === 0 ? "trailing_edge" : "leading_edge";
                    return result;
                },
            },
            {
                cluster: "genOnOff",
                type: ["attributeReport", "readResponse"],
                convert: (model: unknown, msg: {data: Record<string, number>}, publish: unknown, options: unknown, meta: unknown) => {
                    const result: Record<string, unknown> = {};
                    if (Object.hasOwn(msg.data, "startUpOnOff")) {
                        const map: Record<number, string> = {0: "off", 1: "on", 2: "toggle", 255: "previous"};
                        result["startup_on_off"] = map[msg.data["startUpOnOff"]] ?? String(msg.data["startUpOnOff"]);
                    }
                    return result;
                },
            },
        ],
        toZigbee: [
            tz.light_onoff_brightness,
            tzLocalSimplifyDimmer4512791.min_brightness,
            tzLocalSimplifyDimmer4512791.max_brightness,
            tzLocalSimplifyDimmer4512791.dimming_speed,
            tzLocalSimplifyDimmer4512791.start_brightness,
            {
                key: ["startup_on_off"],
                convertSet: async (entity: TzEntity, key: string, value: unknown, meta: TzMeta) => {
                    const map: Record<string, number> = {off: 0, on: 1, toggle: 2, previous: 255};
                    await entity.write("genOnOff", {startUpOnOff: map[value as string] ?? Number.parseInt(value as string, 10)});
                    return {state: {startup_on_off: value}};
                },
                convertGet: async (entity: TzEntity, key: string, meta: TzMeta) => {
                    await entity.read("genOnOff", ["startUpOnOff"]);
                },
            } satisfies Tz.Converter,
        ],
        configure: async (device, _coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genOnOff", ["startUpOnOff"]);
            try {
                await endpoint.read("genLevelCtrl", ["minLevel", "maxLevel", "onLevel", "defaultMoveRate"]);
                await endpoint.read("genLevelCtrl", [0xb000]);
            } catch (_e) {
                // Not all firmware versions support reading these
            }
        },
    },
    {
        zigbeeModel: ["4512785"],
        model: "4512785",
        vendor: "Namron",
        description: "Zigbee 30A relay with NTC temperature sensors and water leak detection",
        extend: [
            m.deviceAddCustomCluster("namronPrivate04E0", {
                ID: 0x04e0,
                name: "namronPrivate04E0",
                attributes: {
                    ntc2Temperature: {ID: 0x0000, name: "ntc2Temperature", type: Zcl.DataType.INT16},
                    ntcSensorType1: {ID: 0x0001, name: "ntcSensorType1", type: Zcl.DataType.ENUM8, write: true},
                    ntcSensorType2: {ID: 0x0002, name: "ntcSensorType2", type: Zcl.DataType.ENUM8, write: true},
                    waterSensorValue: {ID: 0x0003, name: "waterSensorValue", type: Zcl.DataType.BOOLEAN},
                    ntcCalibration1: {ID: 0x0004, name: "ntcCalibration1", type: Zcl.DataType.INT8, write: true},
                    ntcCalibration2: {ID: 0x0005, name: "ntcCalibration2", type: Zcl.DataType.INT8, write: true},
                    waterAlarmRelayAction: {ID: 0x0006, name: "waterAlarmRelayAction", type: Zcl.DataType.ENUM8, write: true},
                    ntc1OperationSelect: {ID: 0x0007, name: "ntc1OperationSelect", type: Zcl.DataType.ENUM8, write: true},
                    ntc2OperationSelect: {ID: 0x0008, name: "ntc2OperationSelect", type: Zcl.DataType.ENUM8, write: true},
                    ntc1RelayAutoTemp: {ID: 0x0009, name: "ntc1RelayAutoTemp", type: Zcl.DataType.INT16, write: true},
                    ntc2RelayAutoTemp: {ID: 0x000a, name: "ntc2RelayAutoTemp", type: Zcl.DataType.INT16, write: true},
                    overrideOption: {ID: 0x000b, name: "overrideOption", type: Zcl.DataType.ENUM8, write: true},
                    ntc1TempHysteresis: {ID: 0x000c, name: "ntc1TempHysteresis", type: Zcl.DataType.INT8, write: true},
                    ntc2TempHysteresis: {ID: 0x000d, name: "ntc2TempHysteresis", type: Zcl.DataType.INT8, write: true},
                    waterConditionAlarm: {ID: 0x000e, name: "waterConditionAlarm", type: Zcl.DataType.BOOLEAN},
                    ntcConditionAlarm: {ID: 0x000f, name: "ntcConditionAlarm", type: Zcl.DataType.BOOLEAN},
                    isExecuteCondition: {ID: 0x0010, name: "isExecuteCondition", type: Zcl.DataType.BOOLEAN},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.onOff({powerOnBehavior: true}),
            m.electricityMeter({voltage: {divisor: 10}, current: {divisor: 1000}, power: {divisor: 1}, energy: {divisor: 100}}),
            // Override genDeviceTempCfg to relax currentTemperature max constraint
            // (device reports in 0.1°C units, e.g. 311 = 31.1°C, exceeding ZCL max of 200)
            m.deviceAddCustomCluster("genDeviceTempCfg", {
                ID: 0x0002,
                name: "genDeviceTempCfg",
                attributes: {
                    currentTemperature: {ID: 0x0000, name: "currentTemperature", type: Zcl.DataType.INT16, min: -2000, max: 2000},
                },
                commands: {},
                commandsResponse: {},
            }),
            // Device reports currentTemperature in 0.1°C units (non-standard; ZCL spec is °C).
            // e.g. raw 311 = 31.1°C. change: 10 raw units = 1°C reporting threshold; fzConvert divides by 10.
            m.numeric({
                name: "device_temperature",
                cluster: "genDeviceTempCfg",
                attribute: "currentTemperature",
                reporting: {min: 15, max: 600, change: 10},
                description: "Internal device temperature",
                unit: "°C",
                access: "STATE_GET",
                entityCategory: "diagnostic",
                fzConvert: (model, msg) => {
                    if (msg.data.currentTemperature !== undefined) {
                        const raw = msg.data.currentTemperature;
                        if (raw !== -32768 && raw !== 0x8000) {
                            return {device_temperature: utils.precisionRound(raw, 2) / 10};
                        }
                    }
                },
            }),
            // Device reports measuredValue in 0.01°C units (standard for msTemperatureMeasurement).
            // e.g. raw 2250 = 22.50°C. change: 10 raw units = 0.1°C reporting threshold; fzConvert divides by 100.
            m.numeric({
                name: "ntc1_temperature",
                cluster: "msTemperatureMeasurement",
                attribute: "measuredValue",
                reporting: {min: 15, max: 600, change: 10},
                description: "External NTC1 temperature probe",
                unit: "°C",
                access: "STATE_GET",
                fzConvert: (model, msg) => {
                    if (msg.data.measuredValue !== undefined) {
                        const raw = msg.data.measuredValue;
                        if (raw !== -32768 && raw !== 0x8000) {
                            return {ntc1_temperature: utils.precisionRound(raw, 2) / 100};
                        }
                    }
                },
            }),
            // Device reports ntc2Temperature in 0.01°C units (same as NTC1).
            // e.g. raw 2350 = 23.50°C. change: 10 raw units = 0.1°C reporting threshold; fzConvert divides by 100.
            m.numeric<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc2_temperature",
                cluster: "namronPrivate04E0",
                attribute: "ntc2Temperature",
                reporting: {min: 15, max: 600, change: 10},
                description: "External NTC2 temperature probe",
                unit: "°C",
                access: "STATE_GET",
                fzConvert: (model, msg) => {
                    if (msg.data.ntc2Temperature !== undefined) {
                        const raw = msg.data.ntc2Temperature;
                        if (raw !== -32768 && raw !== 0x8000) {
                            return {ntc2_temperature: utils.precisionRound(raw, 2) / 100};
                        }
                    }
                },
            }),
            // Water sensor (NO contacts: shorted = water detected)
            m.binary<"namronPrivate04E0", NamronPrivate04E0>({
                name: "water_sensor",
                cluster: "namronPrivate04E0",
                attribute: "waterSensorValue",
                description: "External water sensor (true = water detected)",
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: "STATE_GET",
                reporting: {min: 1, max: 300, change: 1},
            }),
            // NTC sensor type configuration
            m.enumLookup<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc1_sensor_type",
                lookup: {none: 0, "NTC-10K": 1, "NTC-12K": 2, "NTC-15K": 3, "NTC-22K": 4, "NTC-33K": 5, "NTC-47K": 6},
                cluster: "namronPrivate04E0",
                attribute: "ntcSensorType1",
                description: "NTC probe type for sensor #1 (must be set for temperature reporting)",
                entityCategory: "config",
            }),
            m.enumLookup<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc2_sensor_type",
                lookup: {none: 0, "NTC-10K": 1, "NTC-12K": 2, "NTC-15K": 3, "NTC-22K": 4, "NTC-33K": 5, "NTC-47K": 6},
                cluster: "namronPrivate04E0",
                attribute: "ntcSensorType2",
                description: "NTC probe type for sensor #2 (must be set for temperature reporting)",
                entityCategory: "config",
            }),
            // Water alarm relay action
            m.enumLookup<"namronPrivate04E0", NamronPrivate04E0>({
                name: "water_alarm_relay_action",
                lookup: {
                    no_action: 0,
                    turn_off_restore: 1,
                    turn_on_restore: 2,
                    turn_off_stay: 3,
                    turn_on_stay: 4,
                    no_water_turn_off: 5,
                    no_water_turn_on: 6,
                },
                cluster: "namronPrivate04E0",
                attribute: "waterAlarmRelayAction",
                description: "Relay behavior when water sensor detects a leak",
                entityCategory: "config",
            }),
            // NTC operation modes
            m.enumLookup<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc1_operation_mode",
                lookup: {no_action: 0, off_when_hot_on_when_cold: 1, on_when_hot_off_when_cold: 2, off_when_hot_stay: 3, on_when_hot_stay: 4},
                cluster: "namronPrivate04E0",
                attribute: "ntc1OperationSelect",
                description: "Relay behavior based on NTC1 temperature threshold",
                entityCategory: "config",
            }),
            m.enumLookup<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc2_operation_mode",
                lookup: {no_action: 0, off_when_hot_on_when_cold: 1, on_when_hot_off_when_cold: 2, off_when_hot_stay: 3, on_when_hot_stay: 4},
                cluster: "namronPrivate04E0",
                attribute: "ntc2OperationSelect",
                description: "Relay behavior based on NTC2 temperature threshold",
                entityCategory: "config",
            }),
            // Temperature thresholds for relay auto control
            m.numeric<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc1_relay_auto_temp",
                cluster: "namronPrivate04E0",
                attribute: "ntc1RelayAutoTemp",
                description: "Temperature threshold for NTC1 relay control",
                unit: "°C",
                valueMin: 0,
                valueMax: 100,
                valueStep: 0.1,
                scale: 10,
                precision: 1,
                entityCategory: "config",
            }),
            m.numeric<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc2_relay_auto_temp",
                cluster: "namronPrivate04E0",
                attribute: "ntc2RelayAutoTemp",
                description: "Temperature threshold for NTC2 relay control",
                unit: "°C",
                valueMin: 0,
                valueMax: 100,
                valueStep: 0.1,
                scale: 10,
                precision: 1,
                entityCategory: "config",
            }),
            // Override priority
            m.enumLookup<"namronPrivate04E0", NamronPrivate04E0>({
                name: "override_option",
                lookup: {no_priority: 0, water_alarm_priority: 1, ntc_priority: 2},
                cluster: "namronPrivate04E0",
                attribute: "overrideOption",
                description: "Priority when both water alarm and temperature conditions trigger",
                entityCategory: "config",
            }),
            // Calibration offsets
            m.numeric<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc1_calibration",
                cluster: "namronPrivate04E0",
                attribute: "ntcCalibration1",
                description: "Temperature calibration offset for NTC1",
                unit: "°C",
                valueMin: -10,
                valueMax: 10,
                entityCategory: "config",
            }),
            m.numeric<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc2_calibration",
                cluster: "namronPrivate04E0",
                attribute: "ntcCalibration2",
                description: "Temperature calibration offset for NTC2",
                unit: "°C",
                valueMin: -10,
                valueMax: 10,
                entityCategory: "config",
            }),
            // Hysteresis
            m.numeric<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc1_temp_hysteresis",
                cluster: "namronPrivate04E0",
                attribute: "ntc1TempHysteresis",
                description: "Temperature hysteresis for NTC1 relay control",
                unit: "°C",
                valueMin: -10,
                valueMax: 10,
                entityCategory: "config",
            }),
            m.numeric<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc2_temp_hysteresis",
                cluster: "namronPrivate04E0",
                attribute: "ntc2TempHysteresis",
                description: "Temperature hysteresis for NTC2 relay control",
                unit: "°C",
                valueMin: -10,
                valueMax: 10,
                entityCategory: "config",
            }),
            // Condition alarms (read-only status)
            m.binary<"namronPrivate04E0", NamronPrivate04E0>({
                name: "water_condition_alarm",
                cluster: "namronPrivate04E0",
                attribute: "waterConditionAlarm",
                description: "Water leak alarm active",
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: "STATE",
            }),
            m.binary<"namronPrivate04E0", NamronPrivate04E0>({
                name: "ntc_condition_alarm",
                cluster: "namronPrivate04E0",
                attribute: "ntcConditionAlarm",
                description: "NTC temperature alarm active",
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: "STATE",
            }),
            m.binary<"namronPrivate04E0", NamronPrivate04E0>({
                name: "is_execute_condition",
                cluster: "namronPrivate04E0",
                attribute: "isExecuteCondition",
                description: "Relay action triggered by conditions",
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: "STATE",
            }),
            // Polling (5 min interval)
            m.poll({
                key: "namron_4512785_poll",
                optionKey: "temperature_poll_interval",
                option: e
                    .numeric("temperature_poll_interval", ea.SET)
                    .withValueMin(-1)
                    .withDescription("Polling interval for NTC temperature sensors (default: 300s, -1 to disable)"),
                defaultIntervalSeconds: 300,
                poll: async (device) => {
                    const ep = device.getEndpoint(1);
                    if (!ep) return;
                    await ep.read("genOnOff", ["onOff"]);
                    await ep.read("msTemperatureMeasurement", ["measuredValue"]);
                    await ep.read<"namronPrivate04E0", NamronPrivate04E0>("namronPrivate04E0", [
                        "ntc2Temperature",
                        "waterSensorValue",
                        "waterConditionAlarm",
                        "ntcConditionAlarm",
                        "isExecuteCondition",
                    ]);
                },
            }),
        ],
    },
];
