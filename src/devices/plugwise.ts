import {Buffer} from "node:buffer";
import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;
const NS = "zhc:plugwise";

/**
 * Zigbee2MQTT external converter for the Plugwise Emma Wired Pro / Emma Wireless thermostat (model 170-01).
 *
 * Compatible with Zigbee2MQTT v2.x / zigbee-herdsman-converters v26.x.
 *
 * NOTE: This converter intentionally does NOT use exposes.climate(). Using it causes
 * ZHC v26 to auto-inject a built-in climate modernExtend configure function that sends
 * reportableChange:10 for cooling/heating setpoints. Emma rejects this with INVALID_VALUE
 * (§15 requires reportableChange >= 50 / 0.5 °C). Because the auto-injected configure runs
 * before our custom configure and throws, our configure would never execute.
 * Individual attribute exposes are used instead; HA will create individual entities.
 *
 * Clusters covered:
 *   §3  genBasic              — product code (0x000A, octet string), power source (0x0007), SW build ID (0x4000)
 *   §4  genPowerCfg           — battery percentage
 *   §5  genIdentify           — front-light identify
 *   §8  hvacThermostat        — setpoints, system mode, running state (0x0029), PI heating demand,
 *                               calibration, outdoor temp, external heat demand,
 *                               boiler/DHW/return water temperatures, fault codes (mfgCode 0x1172)
 *   §9  hvacUserInterfaceCfg  — keypad lockout
 *   §10 msTemperatureMeasurement
 *   §11 msRelativeHumidity
 */

const PLUGWISE_MFG_CODE = 0x1172;

// hvacThermostat standard attribute IDs
const ATTR_OUTDOOR_TEMP = 0x0001; // INT16S   outdoor temperature
// const ATTR_PI_HEATING_DEMAND = 0x0008; // INT8U    PI heating demand
const ATTR_RUNNING_STATE = 0x0029; // BITMAP16 thermostat running state

// Manufacturer-specific attributes on hvacThermostat (mfgCode 0x1172)
const ATTR_EXT_HEAT_DEMAND = 0xf000; // INT16U   hundredths of °C (OT) / non-zero=ON (OnOff)
const ATTR_EXT_HEAT_DEMAND_TIMEOUT = 0xf001; // INT16U   watchdog seconds, 300–3600
const ATTR_BOILER_WATER_TEMP = 0xf002; // INT16S   boiler supply water temperature (hundredths °C)
const ATTR_DHW_TEMP = 0xf003; // INT16S   domestic hot water temperature (hundredths °C)
const ATTR_RETURN_WATER_TEMP = 0xf004; // INT16S   boiler return water temperature (hundredths °C)
const ATTR_APP_FAULT_CODE = 0xf005; // BITMAP8  OT fault flag byte (ID 5 high byte)
const ATTR_OEM_FAULT_CODE = 0xf006; // INT8U    OT OEM-specific fault code (ID 5 low byte)
const ATTR_MAX_DHW_SETPOINT = 0xf007; // INT16S   max DHW setpoint (hundredths °C, mfgCode 0x1172)
const ATTR_MAX_BOILER_SETPOINT = 0xf008; // INT16S   max boiler setpoint (hundredths °C, mfgCode 0x1172)

// genBasic attribute IDs
const ATTR_PRODUCT_CODE = 0x000a; // OCTET_STRING  boiler-protocol product code
const ATTR_POWER_SOURCE = 0x0007; // ENUM8          power source
const ATTR_SW_BUILD_ID = 0x4000; // CHAR_STRING    firmware version
const ATTR_PRODUCT_URL = 0x000b; // CHAR_STRING    product URL

// genPowerCfg attribute IDs (manufacturer-specific)
const ATTR_BATTERY_TYPE = 0x007f; // ENUM8         battery chemistry (mfgCode 0x1172)

// ZCL type tags
const ZCL_ENUM8 = 0x30;
// const ZCL_UINT8 = 0x20;
const ZCL_UINT16 = 0x21;
// const ZCL_INT8S = 0x28;
const ZCL_INT16S = 0x29;
// const ZCL_BITMAP8 = 0x18;

// Power source enum → string
const POWER_SOURCE_MAP = {
    1: "mains",
    3: "battery",
    4: "dc",
};

// Battery chemistry map — manufacturer-specific genPowerCfg attr 0x007F (mfgCode 0x1172)
const BATTERY_TYPE_MAP = {
    0: "alkaline", // Non-rechargeable (Fujitsu)
    1: "nimh", // Rechargeable (Eneloop)
};

// Keypad lockout maps
const KEYPAD_LOCKOUT_TO_STR = {0: "unlock", 1: "lock1", 2: "lock2"};
const KEYPAD_LOCKOUT_TO_INT = {unlock: 0, lock1: 1, lock2: 2};

// System mode maps
const SYS_MODE_TO_STR = {0: "off", 1: "auto", 3: "cool", 4: "heat"};
const SYS_MODE_TO_INT = {off: 0, auto: 1, cool: 3, heat: 4};

// Running state — BITMAP16 at attribute 0x0029 ("hvac relay state" in Gecko SDK)
// bit 0 = heat active, bit 1 = cool active, 0x0000 = idle
const RUNNING_STATE_MAP = {
    0: "idle",
    1: "heat",
    2: "cool",
};

// Application fault bitmap — OT message ID 5 high byte
const APP_FAULT_BITS = [
    {bit: 0x01, name: "service_request"},
    {bit: 0x02, name: "lockout_reset"},
    {bit: 0x04, name: "low_water_pressure"},
    {bit: 0x08, name: "gas_flame_fault"},
    {bit: 0x10, name: "air_pressure_fault"},
    {bit: 0x20, name: "water_over_temp"},
];

/**
 * Decode a ZCL octet string attribute value.
 * Zigbee-herdsman delivers OCTET_STRING as a Buffer (data bytes only, length prefix stripped).
 * Returns the string representation.
 */
function decodeOctetString(val: unknown): string | null {
    if (val == null) return null;
    if (Buffer.isBuffer(val)) return val.toString();
    if (typeof val === "string") return val;
    return String(val);
}

const plugwisePushForceLookup = {
    0: "standard",
    393216: "high",
    458752: "very_high",
};

const plugwiseRadioStrengthLookup = {
    0: "normal",
    1: "high",
};

interface PlugwiseHvacThermostat {
    attributes: {
        plugwiseValvePosition: number;
        // plugviseErrorStatus: number;
        plugwiseCurrentHeatingSetpoint: number;
        plugwiseTDiff: number;
        plugwisePushForce: number;
        plugwiseRadioStrength: number;
    };
    commands: {
        plugwiseCalibrateValve: Record<string, never>;
    };
    commandResponses: never;
}

const plugwiseExtend = {
    plugwiseHvacThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            name: "hvacThermostat",
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                plugwiseValvePosition: {name: "plugwiseValvePosition", ID: 0x4001, type: Zcl.DataType.UINT8},
                // plugviseErrorStatus: {name: "plugviseErrorStatus", ID: 0x4002, type: Zcl.DataType.??},
                plugwiseCurrentHeatingSetpoint: {name: "plugwiseCurrentHeatingSetpoint", ID: 0x4003, type: Zcl.DataType.INT16},
                plugwiseTDiff: {name: "plugwiseTDiff", ID: 0x4008, type: Zcl.DataType.INT16},
                plugwisePushForce: {name: "plugwisePushForce", ID: 0x4012, type: Zcl.DataType.UINT32},
                plugwiseRadioStrength: {name: "plugwiseRadioStrength", ID: 0x4014, type: Zcl.DataType.BOOLEAN},
            },
            commands: {
                plugwiseCalibrateValve: {name: "plugwiseCalibrateValve", ID: 0xa0, parameters: []},
            },
            commandsResponse: {},
        }),
};

const fzLocal = {
    // -- Tom related --
    plugwise_radiator_valve: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result = fz.thermostat.convert(model, msg, publish, options, meta) as KeyValue;

            // Reports pIHeatingDemand between 0 and 100 already
            if (typeof msg.data.pIHeatingDemand === "number") {
                result.pi_heating_demand = utils.precisionRound(msg.data.pIHeatingDemand, 0);
            }
            if (typeof msg.data.plugwiseCurrentHeatingSetpoint === "number") {
                result.current_heating_setpoint = utils.precisionRound(msg.data.plugwiseCurrentHeatingSetpoint, 2) / 100;
            }
            if (typeof msg.data.plugwiseTDiff === "number") {
                result.plugwise_t_diff = msg.data.plugwiseTDiff;
            }
            if (typeof msg.data[0x4002] === "number") {
                result.error_status = msg.data[0x4002];
            }
            if (typeof msg.data.plugwiseValvePosition === "number") {
                result.valve_position = msg.data.plugwiseValvePosition;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", PlugwiseHvacThermostat, ["attributeReport", "readResponse"]>,

    // -- Emma Pro/Wireless related --
    thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const d = msg.data as KeyValue;
            const r: KeyValue = {};

            // Standard attributes
            if (typeof d.localTemperatureCalibration === "number") r.local_temperature_calibration = d.localTemperatureCalibration / 10;
            if (typeof d.occupiedHeatingSetpoint === "number") r.occupied_heating_setpoint = d.occupiedHeatingSetpoint / 100;
            if (typeof d.occupiedCoolingSetpoint === "number") r.occupied_cooling_setpoint = d.occupiedCoolingSetpoint / 100;
            if (typeof d.minHeatSetpointLimit === "number") r.min_heat_setpoint_limit = d.minHeatSetpointLimit / 100;
            if (typeof d.maxHeatSetpointLimit === "number") r.max_heat_setpoint_limit = d.maxHeatSetpointLimit / 100;
            if (typeof d.minCoolSetpointLimit === "number") r.min_cool_setpoint_limit = d.minCoolSetpointLimit / 100;
            if (typeof d.maxCoolSetpointLimit === "number") r.max_cool_setpoint_limit = d.maxCoolSetpointLimit / 100;
            if (typeof d.systemMode === "number") {
                const systemMode = d.systemMode;
                r.system_mode = SYS_MODE_TO_STR[systemMode as keyof typeof SYS_MODE_TO_STR] ?? `unknown(${systemMode})`;
            }
            if (typeof d.pIHeatingDemand === "number") r.pi_heating_demand = d.pIHeatingDemand;

            const rawOT = d.outdoorTemp != null ? d.outdoorTemp : d.outdoorTemperature != null ? d.outdoorTemperature : d[ATTR_OUTDOOR_TEMP];
            if (typeof rawOT === "number") r.outdoor_temperature = rawOT / 100;

            // Attr 0x0029 — herdsman may use thermostatRunningState, runningState, or numeric key
            const rawRS =
                d.thermostatRunningState != null
                    ? d.thermostatRunningState
                    : d.runningState != null
                      ? d.runningState
                      : d[ATTR_RUNNING_STATE] != null
                        ? d[ATTR_RUNNING_STATE]
                        : null;
            if (typeof rawRS === "number") {
                r.running_state = RUNNING_STATE_MAP[rawRS as keyof typeof RUNNING_STATE_MAP] ?? "idle";
            }

            // Manufacturer-specific (mfgCode 0x1172)
            if (typeof d[ATTR_EXT_HEAT_DEMAND] === "number") r.external_heat_demand = d[ATTR_EXT_HEAT_DEMAND] / 100;
            if (typeof d[ATTR_EXT_HEAT_DEMAND_TIMEOUT] === "number") r.external_heat_demand_timeout = d[ATTR_EXT_HEAT_DEMAND_TIMEOUT];

            // OpenTherm boiler readings (read-only, firmware-reported)
            if (typeof d[ATTR_BOILER_WATER_TEMP] === "number") r.boiler_water_temperature = d[ATTR_BOILER_WATER_TEMP] / 100;
            if (typeof d[ATTR_DHW_TEMP] === "number") r.dhw_temperature = d[ATTR_DHW_TEMP] / 100;
            if (typeof d[ATTR_RETURN_WATER_TEMP] === "number") r.return_water_temperature = d[ATTR_RETURN_WATER_TEMP] / 100;
            if (typeof d[ATTR_APP_FAULT_CODE] === "number") {
                const v = d[ATTR_APP_FAULT_CODE];
                r.application_fault_code = v;
                const active = APP_FAULT_BITS.filter((f) => v & f.bit).map((f) => f.name);
                r.application_fault_flags = active.length ? active.join(", ") : "none";
            }
            if (typeof d[ATTR_OEM_FAULT_CODE] === "number") r.oem_fault_code = d[ATTR_OEM_FAULT_CODE];

            // Max setpoints (mfgCode 0x1172, INT16S, hundredths °C)
            if (typeof d[ATTR_MAX_DHW_SETPOINT] === "number") r.max_dhw_setpoint = d[ATTR_MAX_DHW_SETPOINT] / 100;
            if (typeof d[ATTR_MAX_BOILER_SETPOINT] === "number") r.max_boiler_setpoint = d[ATTR_MAX_BOILER_SETPOINT] / 100;

            return Object.keys(r).length ? r : undefined;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,

    keypad_lockout: {
        cluster: "hvacUserInterfaceCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const keypadLockout = (msg.data as KeyValue).keypadLockout;
            if (typeof keypadLockout !== "number") return undefined;
            return {
                keypad_lockout: KEYPAD_LOCKOUT_TO_STR[keypadLockout as keyof typeof KEYPAD_LOCKOUT_TO_STR] ?? `unknown(${keypadLockout})`,
            };
        },
    } satisfies Fz.Converter<"hvacUserInterfaceCfg", undefined, ["attributeReport", "readResponse"]>,

    basic_info: {
        cluster: "genBasic",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const d = msg.data as KeyValue;
            const r: KeyValue = {};
            const rawCode = d[ATTR_PRODUCT_CODE] != null ? d[ATTR_PRODUCT_CODE] : d.productCode;
            if (rawCode != null) r.product_code = decodeOctetString(rawCode);
            const ps = d[ATTR_POWER_SOURCE] != null ? d[ATTR_POWER_SOURCE] : d.powerSource;
            if (typeof ps === "number") r.power_source = POWER_SOURCE_MAP[ps as keyof typeof POWER_SOURCE_MAP] ?? `unknown(0x${ps.toString(16)})`;
            const sw = d[ATTR_SW_BUILD_ID] != null ? d[ATTR_SW_BUILD_ID] : d.swBuildId;
            if (sw != null) r.firmware_version = decodeOctetString(sw);
            const url = d[ATTR_PRODUCT_URL] != null ? d[ATTR_PRODUCT_URL] : d.productUrl;
            if (url != null) r.product_url = decodeOctetString(url);
            if (d.manufacturerName != null) r.manufacturer_name = decodeOctetString(d.manufacturerName);
            if (d.modelId != null) r.model_id = decodeOctetString(d.modelId);
            return Object.keys(r).length ? r : undefined;
        },
    } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,

    battery: {
        cluster: "genPowerCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const d = msg.data as KeyValue;
            const r: KeyValue = {};
            if (typeof d.batteryPercentageRemaining === "number") r.battery = Math.round(d.batteryPercentageRemaining / 2);
            if (typeof d[ATTR_BATTERY_TYPE] === "number") {
                const batteryType = d[ATTR_BATTERY_TYPE];
                r.battery_type = BATTERY_TYPE_MAP[batteryType as keyof typeof BATTERY_TYPE_MAP] ?? `unknown(${batteryType})`;
            }
            return Object.keys(r).length ? r : undefined;
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["attributeReport", "readResponse"]>,

    temperature: {
        cluster: "msTemperatureMeasurement",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const measuredValue = (msg.data as KeyValue).measuredValue;
            if (typeof measuredValue !== "number") return undefined;
            return {temperature: measuredValue / 100};
        },
    } satisfies Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]>,

    humidity: {
        cluster: "msRelativeHumidity",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const measuredValue = (msg.data as KeyValue).measuredValue;
            if (typeof measuredValue !== "number") return undefined;
            return {humidity: measuredValue / 100};
        },
    } satisfies Fz.Converter<"msRelativeHumidity", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    // -- Tom related --
    plugwise_calibrate_valve: {
        key: ["calibrate_valve"],
        convertSet: async (entity, key, value, meta) => {
            await entity.command<"hvacThermostat", "plugwiseCalibrateValve", PlugwiseHvacThermostat>(
                "hvacThermostat",
                "plugwiseCalibrateValve",
                {},
                {srcEndpoint: 11, disableDefaultResponse: true},
            );
            return {state: {calibrate_valve: value}};
        },
    } satisfies Tz.Converter,
    plugwise_valve_position: {
        key: ["plugwise_valve_position", "valve_position"],
        convertSet: async (entity, key, value, meta) => {
            // const payload = {plugwiseValvePosition: {value, type: 0x20}};
            await entity.write<"hvacThermostat", PlugwiseHvacThermostat>(
                "hvacThermostat",
                {plugwiseValvePosition: value as number},
                {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            );
            // Tom does not automatically send back updated value so ask for it
            await entity.read<"hvacThermostat", PlugwiseHvacThermostat>("hvacThermostat", ["plugwiseValvePosition"], {
                manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
            });
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", PlugwiseHvacThermostat>("hvacThermostat", ["plugwiseValvePosition"], {
                manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
            });
        },
    } satisfies Tz.Converter,
    plugwise_push_force: {
        key: ["plugwise_push_force", "force"],
        convertSet: async (entity, key, value, meta) => {
            const val = utils.getKey(plugwisePushForceLookup, value, value, Number);
            await entity.write<"hvacThermostat", PlugwiseHvacThermostat>(
                "hvacThermostat",
                {plugwisePushForce: val as number},
                {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            );
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", PlugwiseHvacThermostat>("hvacThermostat", ["plugwisePushForce"], {
                manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
            });
        },
    } satisfies Tz.Converter,
    plugwise_radio_strength: {
        key: ["plugwise_radio_strength", "radio_strength"],
        convertSet: async (entity, key, value, meta) => {
            const val = utils.getKey(plugwiseRadioStrengthLookup, value, value, Number);
            await entity.write<"hvacThermostat", PlugwiseHvacThermostat>(
                "hvacThermostat",
                {plugwiseRadioStrength: val as number},
                {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            );
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", PlugwiseHvacThermostat>("hvacThermostat", ["plugwiseRadioStrength"], {
                manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
            });
        },
    } satisfies Tz.Converter,

    // -- Emma Pro/Wireless related --
    thermostat: {
        key: [
            "occupied_heating_setpoint",
            "occupied_cooling_setpoint",
            "system_mode",
            "local_temperature_calibration",
            "min_heat_setpoint_limit",
            "max_heat_setpoint_limit",
            "min_cool_setpoint_limit",
            "max_cool_setpoint_limit",
        ],
        convertSet: async (entity, key, value, meta) => {
            if (key === "system_mode") {
                if (typeof value !== "string") throw new Error(`system_mode must be a string, got ${typeof value}`);
                const mode = SYS_MODE_TO_INT[value as keyof typeof SYS_MODE_TO_INT];
                if (mode === undefined) throw new Error(`Unknown system_mode: ${value}`);
                await entity.write("hvacThermostat", {systemMode: mode});
            } else {
                if (typeof value !== "number") throw new Error(`${key} must be a number`);
                const scaledValue = Math.round(value * 100);

                switch (key) {
                    case "occupied_heating_setpoint":
                        await entity.write("hvacThermostat", {occupiedHeatingSetpoint: scaledValue});
                        break;
                    case "occupied_cooling_setpoint":
                        await entity.write("hvacThermostat", {occupiedCoolingSetpoint: scaledValue});
                        break;
                    case "min_heat_setpoint_limit":
                        await entity.write("hvacThermostat", {minHeatSetpointLimit: scaledValue});
                        break;
                    case "max_heat_setpoint_limit":
                        await entity.write("hvacThermostat", {maxHeatSetpointLimit: scaledValue});
                        break;
                    case "min_cool_setpoint_limit":
                        await entity.write("hvacThermostat", {minCoolSetpointLimit: scaledValue});
                        break;
                    case "max_cool_setpoint_limit":
                        await entity.write("hvacThermostat", {maxCoolSetpointLimit: scaledValue});
                        break;
                    case "local_temperature_calibration":
                        await entity.write("hvacThermostat", {localTemperatureCalibration: Math.round(value * 10)});
                        break;
                    default:
                        return;
                }
            }
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            const getMap = {
                occupied_heating_setpoint: "occupiedHeatingSetpoint",
                occupied_cooling_setpoint: "occupiedCoolingSetpoint",
                system_mode: "systemMode",
                local_temperature_calibration: "localTemperatureCalibration",
                min_heat_setpoint_limit: "minHeatSetpointLimit",
                max_heat_setpoint_limit: "maxHeatSetpointLimit",
                min_cool_setpoint_limit: "minCoolSetpointLimit",
                max_cool_setpoint_limit: "maxCoolSetpointLimit",
            } as const;
            if (key in getMap) await entity.read("hvacThermostat", [getMap[key as keyof typeof getMap]]);
        },
    } satisfies Tz.Converter,

    thermostat_read: {
        key: ["running_state", "pi_heating_demand", "outdoor_temperature"],
        convertGet: async (entity, key, meta) => {
            if (key === "pi_heating_demand") {
                await entity.read("hvacThermostat", ["pIHeatingDemand"]);
            } else if (key === "outdoor_temperature") {
                await entity.read("hvacThermostat", [ATTR_OUTDOOR_TEMP]);
            } else if (key === "running_state") {
                await entity.read("hvacThermostat", [ATTR_RUNNING_STATE]);
            }
        },
    } satisfies Tz.Converter,

    keypad_lockout: {
        key: ["keypad_lockout"],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== "string") throw new Error(`keypad_lockout must be a string, got ${typeof value}`);
            const v = KEYPAD_LOCKOUT_TO_INT[value as keyof typeof KEYPAD_LOCKOUT_TO_INT];
            if (v === undefined) throw new Error(`Unknown keypad_lockout: ${value}`);
            await entity.write("hvacUserInterfaceCfg", {keypadLockout: v});
            return {state: {keypad_lockout: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacUserInterfaceCfg", ["keypadLockout"]);
        },
    } satisfies Tz.Converter,

    temperature: {
        key: ["temperature"],
        convertGet: async (entity, key, meta) => {
            await entity.read("msTemperatureMeasurement", ["measuredValue"]);
        },
    } satisfies Tz.Converter,

    humidity: {
        key: ["humidity"],
        convertGet: async (entity, key, meta) => {
            await entity.read("msRelativeHumidity", ["measuredValue"]);
        },
    } satisfies Tz.Converter,

    battery: {
        key: ["battery", "battery_type"],
        convertSet: async (entity, key, value, meta) => {
            if (key !== "battery_type") return undefined;
            if (typeof value !== "string") throw new Error(`battery_type must be a string, got ${typeof value}`);
            const batteryTypeEntry = Object.entries(BATTERY_TYPE_MAP).find(([, label]) => label === value);
            if (batteryTypeEntry === undefined) throw new Error(`Unknown battery_type: ${value}`);
            await entity.write(
                "genPowerCfg",
                {[ATTR_BATTERY_TYPE]: {value: Number(batteryTypeEntry[0]), type: ZCL_ENUM8}},
                {manufacturerCode: PLUGWISE_MFG_CODE},
            );
            return {state: {battery_type: value}};
        },
        convertGet: async (entity, key, meta) => {
            if (key === "battery_type") {
                await entity.read("genPowerCfg", [ATTR_BATTERY_TYPE], {manufacturerCode: PLUGWISE_MFG_CODE});
            } else {
                await entity.read("genPowerCfg", ["batteryPercentageRemaining"]);
            }
        },
    } satisfies Tz.Converter,

    external_heat_demand: {
        key: ["external_heat_demand"],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== "number" || value < 0 || value > 90) throw new Error("external_heat_demand must be 0–90 (write 0 to disable)");
            await entity.write(
                "hvacThermostat",
                {[ATTR_EXT_HEAT_DEMAND]: {value: Math.round(value * 100), type: ZCL_UINT16}},
                {manufacturerCode: PLUGWISE_MFG_CODE},
            );
            return {state: {external_heat_demand: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [ATTR_EXT_HEAT_DEMAND], {manufacturerCode: PLUGWISE_MFG_CODE});
        },
    } satisfies Tz.Converter,

    external_heat_demand_timeout: {
        key: ["external_heat_demand_timeout"],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== "number" || value < 300 || value > 3600) throw new Error("external_heat_demand_timeout must be 300–3600 seconds");
            await entity.write("hvacThermostat", {[ATTR_EXT_HEAT_DEMAND_TIMEOUT]: {value, type: ZCL_UINT16}}, {manufacturerCode: PLUGWISE_MFG_CODE});
            return {state: {external_heat_demand_timeout: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", [ATTR_EXT_HEAT_DEMAND_TIMEOUT], {manufacturerCode: PLUGWISE_MFG_CODE});
        },
    } satisfies Tz.Converter,

    max_setpoints: {
        key: ["max_dhw_setpoint", "max_boiler_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== "number" || value > 100 || (value !== 0 && value < 30)) {
                throw new Error(`${key} must be 0 or 30–100 °C (write 0 to clear / use default)`);
            }
            const attrId = key === "max_dhw_setpoint" ? ATTR_MAX_DHW_SETPOINT : ATTR_MAX_BOILER_SETPOINT;
            await entity.write(
                "hvacThermostat",
                {[attrId]: {value: Math.round(value * 100), type: ZCL_INT16S}},
                {manufacturerCode: PLUGWISE_MFG_CODE},
            );
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            const attrId = key === "max_dhw_setpoint" ? ATTR_MAX_DHW_SETPOINT : ATTR_MAX_BOILER_SETPOINT;
            await entity.read("hvacThermostat", [attrId], {manufacturerCode: PLUGWISE_MFG_CODE});
        },
    } satisfies Tz.Converter,

    boiler_ot_readings: {
        key: [
            "boiler_water_temperature",
            "dhw_temperature",
            "return_water_temperature",
            "application_fault_code",
            "application_fault_flags",
            "oem_fault_code",
        ],
        convertGet: async (entity, key, meta) => {
            const attrMap = {
                boiler_water_temperature: ATTR_BOILER_WATER_TEMP,
                dhw_temperature: ATTR_DHW_TEMP,
                return_water_temperature: ATTR_RETURN_WATER_TEMP,
                application_fault_code: ATTR_APP_FAULT_CODE,
                application_fault_flags: ATTR_APP_FAULT_CODE,
                oem_fault_code: ATTR_OEM_FAULT_CODE,
            } as const;
            if (key in attrMap) {
                await entity.read("hvacThermostat", [attrMap[key as keyof typeof attrMap]], {manufacturerCode: PLUGWISE_MFG_CODE});
            }
        },
    } satisfies Tz.Converter,

    basic_info: {
        key: ["product_code", "power_source", "firmware_version", "product_url", "manufacturer_name", "model_id"],
        convertGet: async (entity, key, meta) => {
            const attrMap = {
                product_code: ATTR_PRODUCT_CODE,
                power_source: ATTR_POWER_SOURCE,
                firmware_version: ATTR_SW_BUILD_ID,
                product_url: ATTR_PRODUCT_URL,
                manufacturer_name: "manufacturerName",
                model_id: "modelId",
            } as const;
            if (key in attrMap) await entity.read("genBasic", [attrMap[key as keyof typeof attrMap]]);
        },
    } satisfies Tz.Converter,

    read_all: {
        key: ["read_all_attributes"],
        convertSet: async (entity, key, value, meta) => {
            if (value !== "trigger") {
                throw new Error(`read_all_attributes must be "trigger", got ${String(value)}`);
            }

            // ── genBasic — read one at a time to avoid INSUFFICIENT_SPACE ────
            try {
                await entity.read("genBasic", ["manufacturerName"]);
            } catch (_err) {
                /* skip */
            }
            try {
                await entity.read("genBasic", ["modelId"]);
            } catch (_err) {
                /* skip */
            }
            try {
                await entity.read("genBasic", [ATTR_POWER_SOURCE]);
            } catch (_err) {
                /* skip */
            }
            try {
                await entity.read("genBasic", [ATTR_PRODUCT_CODE]);
            } catch (_err) {
                /* skip */
            }
            try {
                await entity.read("genBasic", [ATTR_PRODUCT_URL]);
            } catch (_err) {
                /* skip */
            }
            try {
                await entity.read("genBasic", [ATTR_SW_BUILD_ID]);
            } catch (_err) {
                /* skip */
            }

            // ── genPowerCfg — native ──────────────────────────────────────────
            await entity.read("genPowerCfg", ["batteryVoltage", "batteryPercentageRemaining"]);

            // ── genPowerCfg — manufacturer-specific ───────────────────────────
            await entity.read("genPowerCfg", [ATTR_BATTERY_TYPE], {manufacturerCode: PLUGWISE_MFG_CODE});

            // ── hvacThermostat — native attributes ────────────────────────────
            await entity.read("hvacThermostat", [
                "localTemperatureCalibration",
                "occupiedHeatingSetpoint",
                "occupiedCoolingSetpoint",
                "minHeatSetpointLimit",
                "maxHeatSetpointLimit",
                "minCoolSetpointLimit",
                "maxCoolSetpointLimit",
                "systemMode",
                "pIHeatingDemand",
                ATTR_OUTDOOR_TEMP,
                ATTR_RUNNING_STATE,
            ]);

            // ── hvacThermostat — manufacturer-specific attributes ─────────────
            await entity.read(
                "hvacThermostat",
                [
                    ATTR_EXT_HEAT_DEMAND,
                    ATTR_EXT_HEAT_DEMAND_TIMEOUT,
                    ATTR_BOILER_WATER_TEMP,
                    ATTR_DHW_TEMP,
                    ATTR_RETURN_WATER_TEMP,
                    ATTR_APP_FAULT_CODE,
                    ATTR_OEM_FAULT_CODE,
                    ATTR_MAX_DHW_SETPOINT,
                    ATTR_MAX_BOILER_SETPOINT,
                ],
                {manufacturerCode: PLUGWISE_MFG_CODE},
            );

            // ── hvacUserInterfaceCfg ──────────────────────────────────────────
            await entity.read("hvacUserInterfaceCfg", ["keypadLockout"]);

            // ── msTemperatureMeasurement ──────────────────────────────────────
            await entity.read("msTemperatureMeasurement", ["measuredValue"]);

            // ── msRelativeHumidity ────────────────────────────────────────────
            await entity.read("msRelativeHumidity", ["measuredValue"]);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["160-01"],
        model: "160-01",
        vendor: "Plugwise",
        description: "Plug power socket on/off with power consumption monitoring",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ["106-03"],
        model: "106-03",
        vendor: "Plugwise",
        description: "Tom thermostatic radiator valve",
        extend: [plugwiseExtend.plugwiseHvacThermostatCluster()],
        fromZigbee: [fz.temperature, fz.battery, fzLocal.plugwise_radiator_valve],
        // system_mode and occupied_heating_setpoint is not supported: https://github.com/Koenkk/zigbee2mqtt.io/pull/1666
        toZigbee: [
            tz.thermostat_pi_heating_demand,
            tzLocal.plugwise_valve_position,
            tzLocal.plugwise_push_force,
            tzLocal.plugwise_radio_strength,
            tzLocal.plugwise_calibrate_valve,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genPowerCfg", "hvacThermostat"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
        exposes: [
            e.battery(),
            e
                .numeric("pi_heating_demand", ea.STATE_GET)
                .withValueMin(0)
                .withValueMax(100)
                .withUnit("%")
                .withDescription("Position of the valve (= demanded heat) where 0% is fully closed and 100% is fully open"),
            e.numeric("local_temperature", ea.STATE).withUnit("°C").withDescription("Current temperature measured on the device"),
            e
                .numeric("valve_position", ea.ALL)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Directly control the radiator valve. The values range from 0 (valve closed) to 100 (valve fully open)"),
            e
                .enum("force", ea.ALL, ["standard", "high", "very_high"])
                .withDescription("How hard the motor pushes the valve. The closer to the boiler, the higher the force needed"),
            e.enum("radio_strength", ea.ALL, ["normal", "high"]).withDescription("Transmits with higher power when range is not sufficient"),
            e.binary("calibrate_valve", ea.STATE_SET, "calibrate", "idle").withDescription("Calibrates valve on next wakeup"),
        ],
    },
    {
        zigbeeModel: ["158-01"],
        model: "158-01",
        vendor: "Plugwise",
        description: "Lisa zone thermostat",
        extend: [
            m.thermostat({
                setpoints: {values: {occupiedHeatingSetpoint: {min: 0, max: 30, step: 0.5}}},
                systemMode: {values: ["off", "auto"]},
            }),
            m.battery(),
        ],
    },
    {
        zigbeeModel: ["170-01"],
        model: "170-01",
        vendor: "Plugwise",
        description: "Emma Wired Pro / Emma Wireless",

        fromZigbee: [fzLocal.thermostat, fzLocal.keypad_lockout, fzLocal.temperature, fzLocal.humidity, fzLocal.battery, fzLocal.basic_info],

        toZigbee: [
            tzLocal.thermostat,
            tzLocal.thermostat_read,
            tzLocal.keypad_lockout,
            tzLocal.temperature,
            tzLocal.humidity,
            tzLocal.battery,
            tzLocal.external_heat_demand,
            tzLocal.external_heat_demand_timeout,
            tzLocal.max_setpoints,
            tzLocal.boiler_ot_readings,
            tzLocal.basic_info,
            tzLocal.read_all,
        ],

        exposes: [
            // ── Temperature & humidity sensors ────────────────────────────────────
            exposes.numeric("temperature", ea.STATE_GET).withUnit("°C"),

            exposes.numeric("humidity", ea.STATE_GET).withUnit("%"),

            // ── OpenTherm boiler readings (read-only, firmware-reported) ─────────
            exposes.enum("running_state", ea.STATE_GET, ["idle", "heat", "cool"]),

            exposes
                .numeric("pi_heating_demand", ea.STATE_GET)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("PI heating demand value in %"),

            exposes.numeric("boiler_water_temperature", ea.STATE_GET).withUnit("°C"),

            exposes.numeric("dhw_temperature", ea.STATE_GET).withUnit("°C"),

            exposes.numeric("return_water_temperature", ea.STATE_GET).withUnit("°C"),

            exposes
                .numeric("application_fault_code", ea.STATE_GET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    "OpenTherm application fault bitmap " +
                        "(bit0=service_request, bit1=lockout_reset, bit2=low_water_pressure, " +
                        "bit3=gas_flame_fault, bit4=air_pressure_fault, bit5=water_over_temp)",
                ),

            exposes.text("application_fault_flags", ea.STATE_GET).withDescription("OpenTherm Active fault flags, comma-separated"),

            exposes.numeric("oem_fault_code", ea.STATE_GET).withValueMin(0).withValueMax(255).withDescription("OpenTherm OEM-specific fault code"),

            // ── Other read out values  ────────────────────────────────────
            exposes.numeric("outdoor_temperature", ea.STATE_GET).withUnit("°C"),

            exposes.numeric("battery", ea.STATE_GET).withUnit("%").withValueMin(0).withValueMax(100),

            // ── Thermostat control ────────────────────────────────────────────────
            exposes.enum("system_mode", ea.STATE_SET, ["off", "heat", "cool", "auto"]),

            exposes.numeric("occupied_heating_setpoint", ea.STATE_SET).withUnit("°C").withValueMin(5).withValueMax(30).withValueStep(0.5),

            exposes.numeric("occupied_cooling_setpoint", ea.STATE_SET).withUnit("°C").withValueMin(0).withValueMax(30).withValueStep(0.5),

            // ── Setpoint limits ───────────────────────────────────────────────────
            exposes.numeric("min_heat_setpoint_limit", ea.STATE_SET).withUnit("°C").withValueMin(0).withValueMax(90).withValueStep(0.5),

            exposes.numeric("max_heat_setpoint_limit", ea.STATE_SET).withUnit("°C").withValueMin(0).withValueMax(90).withValueStep(0.5),

            exposes.numeric("min_cool_setpoint_limit", ea.STATE_SET).withUnit("°C").withValueMin(0).withValueMax(90).withValueStep(0.5),

            exposes.numeric("max_cool_setpoint_limit", ea.STATE_SET).withUnit("°C").withValueMin(0).withValueMax(90).withValueStep(0.5),

            // ── Temperature calibration ───────────────────────────────────────────
            exposes.numeric("local_temperature_calibration", ea.ALL).withUnit("°C").withValueMin(-12.5).withValueMax(12.5).withValueStep(0.1),

            // ── Keypad lockout ────────────────────────────────────────────────────
            exposes
                .enum("keypad_lockout", ea.ALL, ["unlock", "lock1", "lock2"])
                .withDescription("Keypad lockout. lock1: menu locked. lock2: all buttons locked"),

            // ── External heat demand (requires Unlock External Control on thermostat) ───────────
            exposes
                .numeric("external_heat_demand", ea.ALL)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(90)
                .withValueStep(0.01)
                .withDescription("External heat demand setpoint in °C (0 = disabled, requires Unlock External Control)"),

            exposes.numeric("external_heat_demand_timeout", ea.ALL).withUnit("s").withValueMin(300).withValueMax(3600).withValueStep(1),

            // ── Battery ───────────────────────────────────────────────────────────

            exposes.enum("battery_type", ea.ALL, ["alkaline", "nimh"]),

            // ── Max setpoints (requires Unlock External Control on thermostat) ──────────────────
            exposes
                .numeric("max_dhw_setpoint", ea.ALL)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(0.01)
                .withDescription("Maximum DHW setpoint sent to boiler via OpenTherm (0 = clear / use default, requires Unlock External Control)"),

            exposes
                .numeric("max_boiler_setpoint", ea.ALL)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(0.01)
                .withDescription("Maximum CH boiler setpoint sent via OpenTherm (0 = clear / use default, requires Unlock External Control)"),

            // ── Device info ───────────────────────────────────────────────────────
            exposes.text("product_code", ea.STATE_GET).withDescription("Boiler protocol"),

            exposes.enum("power_source", ea.STATE_GET, ["mains", "battery", "dc"]),

            exposes.text("firmware_version", ea.STATE_GET),

            exposes.text("product_url", ea.STATE_GET),

            exposes.text("manufacturer_name", ea.STATE_GET),

            exposes.text("model_id", ea.STATE_GET),

            // ── Read-all button ───────────────────────────────────────────────────
            exposes.enum("read_all_attributes", ea.SET, ["trigger"]),
        ],

        configure: async (device, coordinatorEndpoint, _definition) => {
            const ep = device.getEndpoint(1);
            const logConfigureWarning = (message: string, error: unknown) => {
                logger.warning(`${message}: ${error instanceof Error ? error.message : String(error)}`, NS);
            };

            // ── Bind clusters ─────────────────────────────────────────────────────
            await ep.bind("genBasic", coordinatorEndpoint);
            await ep.bind("genPowerCfg", coordinatorEndpoint);
            await ep.bind("genIdentify", coordinatorEndpoint);
            await ep.bind("hvacThermostat", coordinatorEndpoint);
            await ep.bind("hvacUserInterfaceCfg", coordinatorEndpoint);
            await ep.bind("msTemperatureMeasurement", coordinatorEndpoint);
            await ep.bind("msRelativeHumidity", coordinatorEndpoint);

            // ── Read initial values — genBasic (one at a time: avoid INSUFFICIENT_SPACE) ──
            try {
                await ep.read("genBasic", ["manufacturerName"]);
            } catch (err) {
                logConfigureWarning("genBasic manufacturerName", err);
            }
            try {
                await ep.read("genBasic", ["modelId"]);
            } catch (err) {
                logConfigureWarning("genBasic modelId", err);
            }
            try {
                await ep.read("genBasic", [ATTR_POWER_SOURCE]);
            } catch (err) {
                logConfigureWarning("genBasic powerSource", err);
            }
            try {
                await ep.read("genBasic", [ATTR_PRODUCT_CODE]);
            } catch (err) {
                logConfigureWarning("genBasic productCode", err);
            }
            try {
                await ep.read("genBasic", [ATTR_PRODUCT_URL]);
            } catch (err) {
                logConfigureWarning("genBasic productUrl", err);
            }
            try {
                await ep.read("genBasic", [ATTR_SW_BUILD_ID]);
            } catch (err) {
                logConfigureWarning("genBasic swBuildId", err);
            }

            // ── Read initial values — genPowerCfg ─────────────────────────────────
            await ep.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await ep.read("genPowerCfg", [ATTR_BATTERY_TYPE], {manufacturerCode: PLUGWISE_MFG_CODE});

            // ── Read initial values — msTemperatureMeasurement / msRelativeHumidity
            await ep.read("msTemperatureMeasurement", ["measuredValue"]);
            await ep.read("msRelativeHumidity", ["measuredValue"]);

            // ── Read initial values — hvacThermostat standard ─────────────────────
            await ep.read("hvacThermostat", [
                "occupiedHeatingSetpoint",
                "occupiedCoolingSetpoint",
                "systemMode",
                "localTemperatureCalibration",
                "pIHeatingDemand",
                "minHeatSetpointLimit",
                "maxHeatSetpointLimit",
                "minCoolSetpointLimit",
                "maxCoolSetpointLimit",
            ]);

            try {
                await ep.configureReporting("hvacThermostat", [
                    {
                        attribute: "outdoorTemp",
                        minimumReportInterval: 60,
                        maximumReportInterval: 600,
                        reportableChange: 50,
                    },
                ]);
            } catch (e) {
                logConfigureWarning("Outdoor temperature configureReporting failed", e);
            }
            try {
                await ep.read("hvacThermostat", [ATTR_OUTDOOR_TEMP]);
            } catch (e) {
                logConfigureWarning("Outdoor temperature initial read failed", e);
            }
            try {
                await ep.read("hvacThermostat", [ATTR_RUNNING_STATE]);
            } catch (e) {
                logConfigureWarning("Running state initial read failed", e);
            }

            // ── Read initial values — hvacUserInterfaceCfg ────────────────────────
            await ep.read("hvacUserInterfaceCfg", ["keypadLockout"]);

            // ── Read initial values — hvacThermostat manufacturer-specific ────────
            await ep.read("hvacThermostat", [ATTR_EXT_HEAT_DEMAND, ATTR_EXT_HEAT_DEMAND_TIMEOUT, ATTR_MAX_DHW_SETPOINT, ATTR_MAX_BOILER_SETPOINT], {
                manufacturerCode: PLUGWISE_MFG_CODE,
            });

            await ep.read(
                "hvacThermostat",
                [ATTR_BOILER_WATER_TEMP, ATTR_DHW_TEMP, ATTR_RETURN_WATER_TEMP, ATTR_APP_FAULT_CODE, ATTR_OEM_FAULT_CODE],
                {manufacturerCode: PLUGWISE_MFG_CODE},
            );
        },
    },
];
