import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface HeiwaHvacThermostat {
    attributes: {
        heiwaBatteryVoltage?: number;
        heiwaLanguage?: number;
        heiwaTemperatureUnit?: number;
        heiwaDisplayTemperature?: number;
        heiwaTemperatureOffset?: number;
        heiwaHumidity?: number;
        heiwaHumidityOffset?: number;
        heiwaCo2?: number;
        heiwaCo2Offset?: number;
        heiwaDisplayBrightness?: number;
        heiwaRoomName?: string;
        heiwaHumidityDisplay?: number;
        heiwaCo2Display?: number;
        heiwaDisplayTemperatureSource?: number;
        heiwaCentralSetpoint?: number;
        heiwaSetpointStep?: number;
        heiwaMaximumSetpoint?: number;
        heiwaMinimumSetpoint?: number;
        heiwaDisplayedSetpoint?: number;
        heiwaSetpointOnlyUi?: number;
        heiwaProfileRequest?: number;
        heiwaActiveProfile?: number;
        heiwaHeatingDemandIcon?: number;
        heiwaCoolingDemandIcon?: number;
    };
    commands: never;
    commandResponses: never;
}

const heiwaHvacThermostatCluster = m.deviceAddCustomCluster("hvacThermostat", {
    name: "hvacThermostat",
    ID: Zcl.Clusters.hvacThermostat.ID,
    attributes: {
        heiwaBatteryVoltage: {name: "heiwaBatteryVoltage", ID: 0x040f, type: Zcl.DataType.UINT16},
        heiwaLanguage: {name: "heiwaLanguage", ID: 0x0414, type: Zcl.DataType.ENUM8, write: true},
        heiwaTemperatureUnit: {name: "heiwaTemperatureUnit", ID: 0x0415, type: Zcl.DataType.ENUM8, write: true},
        heiwaDisplayTemperature: {name: "heiwaDisplayTemperature", ID: 0x0420, type: Zcl.DataType.INT16},
        heiwaTemperatureOffset: {name: "heiwaTemperatureOffset", ID: 0x0421, type: Zcl.DataType.INT16, write: true},
        heiwaHumidity: {name: "heiwaHumidity", ID: 0x0422, type: Zcl.DataType.UINT8},
        heiwaHumidityOffset: {name: "heiwaHumidityOffset", ID: 0x0423, type: Zcl.DataType.INT16, write: true},
        heiwaCo2: {name: "heiwaCo2", ID: 0x0424, type: Zcl.DataType.UINT16},
        heiwaCo2Offset: {name: "heiwaCo2Offset", ID: 0x0425, type: Zcl.DataType.INT16, write: true},
        heiwaDisplayBrightness: {name: "heiwaDisplayBrightness", ID: 0x0426, type: Zcl.DataType.UINT8, write: true},
        heiwaRoomName: {name: "heiwaRoomName", ID: 0x0428, type: Zcl.DataType.CHAR_STR, write: true},
        heiwaHumidityDisplay: {name: "heiwaHumidityDisplay", ID: 0x0441, type: Zcl.DataType.ENUM8, write: true},
        heiwaCo2Display: {name: "heiwaCo2Display", ID: 0x0442, type: Zcl.DataType.ENUM8, write: true},
        heiwaDisplayTemperatureSource: {name: "heiwaDisplayTemperatureSource", ID: 0x0461, type: Zcl.DataType.ENUM8, write: true},
        heiwaCentralSetpoint: {name: "heiwaCentralSetpoint", ID: 0x0462, type: Zcl.DataType.UINT16, write: true},
        heiwaSetpointStep: {name: "heiwaSetpointStep", ID: 0x0466, type: Zcl.DataType.ENUM8, write: true},
        heiwaMaximumSetpoint: {name: "heiwaMaximumSetpoint", ID: 0x0467, type: Zcl.DataType.UINT16, write: true},
        heiwaMinimumSetpoint: {name: "heiwaMinimumSetpoint", ID: 0x0468, type: Zcl.DataType.UINT16, write: true},
        heiwaDisplayedSetpoint: {name: "heiwaDisplayedSetpoint", ID: 0x046a, type: Zcl.DataType.UINT16},
        heiwaSetpointOnlyUi: {name: "heiwaSetpointOnlyUi", ID: 0x0471, type: Zcl.DataType.ENUM8, write: true},
        heiwaProfileRequest: {name: "heiwaProfileRequest", ID: 0x0473, type: Zcl.DataType.ENUM8, write: true},
        heiwaActiveProfile: {name: "heiwaActiveProfile", ID: 0x0474, type: Zcl.DataType.ENUM8},
        heiwaHeatingDemandIcon: {name: "heiwaHeatingDemandIcon", ID: 0x0475, type: Zcl.DataType.ENUM8, write: true},
        heiwaCoolingDemandIcon: {name: "heiwaCoolingDemandIcon", ID: 0x0476, type: Zcl.DataType.ENUM8, write: true},
    },
    commands: {},
    commandsResponse: {},
});

const profileNames: Record<number, string> = {0: "off", 1: "eco", 2: "reduced", 3: "comfort"};

const fzLocal = {
    thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const standard = fz.thermostat.convert(model, msg, publish, options, meta) as KeyValueAny;
            const data = msg.data as KeyValueAny;
            const result: KeyValueAny = {};

            if (standard?.system_mode !== undefined) {
                result.system_mode = standard.system_mode;
                result.remote_power = standard.system_mode === "off" ? "OFF" : "ON";
            }
            if (data.heiwaBatteryVoltage !== undefined) {
                const voltage = data.heiwaBatteryVoltage / 100;
                result.battery_voltage = voltage;
                result.battery = voltage >= 6.0 ? 100 : voltage >= 5.9 ? 75 : voltage >= 5.8 ? 50 : voltage >= 5.7 ? 25 : 0;
            }
            if (data.heiwaLanguage !== undefined) result.language = data.heiwaLanguage === 1 ? "english" : "french";
            if (data.heiwaTemperatureUnit !== undefined) result.temperature_unit = data.heiwaTemperatureUnit === 1 ? "fahrenheit" : "celsius";
            if (data.heiwaDisplayTemperature !== undefined) {
                result.local_temperature = data.heiwaDisplayTemperature / 10;
                result.display_temperature = data.heiwaDisplayTemperature / 10;
            }
            if (data.heiwaTemperatureOffset !== undefined) result.temperature_offset = data.heiwaTemperatureOffset / 10;
            if (data.heiwaHumidity !== undefined) result.humidity = data.heiwaHumidity;
            if (data.heiwaHumidityOffset !== undefined) result.humidity_offset = data.heiwaHumidityOffset;
            if (data.heiwaCo2 !== undefined) result.co2 = data.heiwaCo2;
            if (data.heiwaCo2Offset !== undefined) result.co2_offset = data.heiwaCo2Offset;
            if (data.heiwaDisplayBrightness !== undefined) result.display_brightness = data.heiwaDisplayBrightness / 5;
            if (data.heiwaRoomName !== undefined) result.room_name = data.heiwaRoomName;
            if (data.heiwaHumidityDisplay !== undefined) result.humidity_display = data.heiwaHumidityDisplay === 1 ? "shown" : "hidden";
            if (data.heiwaCo2Display !== undefined) result.co2_display = data.heiwaCo2Display === 1 ? "shown" : "hidden";
            if (data.heiwaDisplayTemperatureSource !== undefined) {
                result.display_temperature_source = data.heiwaDisplayTemperatureSource === 2 ? "temperature_2" : "temperature_1";
            }
            if (data.heiwaCentralSetpoint !== undefined) result.setpoint_central = data.heiwaCentralSetpoint / 10;
            if (data.heiwaSetpointStep !== undefined) result.setpoint_step = data.heiwaSetpointStep === 0 ? 1 : 0.5;
            if (data.heiwaMaximumSetpoint !== undefined) result.setpoint_maximum = data.heiwaMaximumSetpoint / 10;
            if (data.heiwaMinimumSetpoint !== undefined) result.setpoint_minimum = data.heiwaMinimumSetpoint / 10;
            if (data.heiwaDisplayedSetpoint !== undefined) result.current_heating_setpoint = data.heiwaDisplayedSetpoint / 10;
            if (data.heiwaSetpointOnlyUi !== undefined) result.setpoint_only_ui = data.heiwaSetpointOnlyUi === 1 ? "ON" : "OFF";
            if (data.heiwaActiveProfile !== undefined && profileNames[data.heiwaActiveProfile] !== undefined) {
                const profile = profileNames[data.heiwaActiveProfile];
                result.profile = profile;
                result.active_profile = profile;
                result.remote_power = profile === "off" ? "OFF" : "ON";
            }
            if (data.heiwaHeatingDemandIcon !== undefined || data.heiwaCoolingDemandIcon !== undefined) {
                const heating = data.heiwaHeatingDemandIcon ?? 0;
                const cooling = data.heiwaCoolingDemandIcon ?? 0;
                result.zone_demand_icon = heating !== 0 ? "heating" : cooling !== 0 ? "cooling" : "none";
            }

            return Object.keys(result).length === 0 ? undefined : result;
        },
    } satisfies Fz.Converter<"hvacThermostat", HeiwaHvacThermostat, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    current_heating_setpoint: {
        key: ["current_heating_setpoint"],
        convertSet: async (entity, key, value) => {
            utils.assertNumber(value, key);
            if (!Number.isFinite(value) || value < 18 || value > 27 || Math.round(value * 2) !== value * 2) {
                throw new Error(`${key} must be between 18 and 27 °C in 0.5 °C increments, got ${value}`);
            }
            await entity.write("hvacThermostat", {
                occupiedCoolingSetpoint: (value - 1.5) * 100,
                occupiedHeatingSetpoint: (value + 1.5) * 100,
            });
            const current = await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaDisplayedSetpoint"]);
            if (current.heiwaDisplayedSetpoint !== value * 10) {
                throw new Error(`Setpoint ${value} °C was not confirmed by the thermostat`);
            }
            return {state: {current_heating_setpoint: current.heiwaDisplayedSetpoint / 10}};
        },
        convertGet: async (entity) => {
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaDisplayedSetpoint"]);
        },
    } satisfies Tz.Converter,
    profile: {
        key: ["profile"],
        convertSet: async (entity, key, value) => {
            utils.assertString(value, key);
            const values: Record<string, number> = {off: 0, eco: 1, reduced: 2, comfort: 3};
            const requested = values[value];
            if (requested === undefined) throw new Error(`Unsupported profile: ${value}`);
            await entity.write<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", {heiwaProfileRequest: requested});
            for (let attempt = 0; attempt < 4; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                const current = await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaActiveProfile"]);
                if (current.heiwaActiveProfile === requested) {
                    return {state: {profile: value, active_profile: value, remote_power: requested === 0 ? "OFF" : "ON"}};
                }
            }
            throw new Error(`Profile request ${value} was not confirmed by the thermostat`);
        },
        convertGet: async (entity) => {
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaActiveProfile"]);
        },
    } satisfies Tz.Converter,
    manufacturer_settings: {
        key: ["display_brightness", "language", "temperature_unit", "humidity_display", "co2_display", "display_temperature_source", "setpoint_only_ui"],
        convertSet: async (entity, key, value) => {
            const definitions: Record<string, {attribute: keyof HeiwaHvacThermostat["attributes"]; values?: Record<string, number>}> = {
                display_brightness: {attribute: "heiwaDisplayBrightness"},
                language: {attribute: "heiwaLanguage", values: {french: 0, english: 1}},
                temperature_unit: {attribute: "heiwaTemperatureUnit", values: {celsius: 0, fahrenheit: 1}},
                humidity_display: {attribute: "heiwaHumidityDisplay", values: {hidden: 0, shown: 1}},
                co2_display: {attribute: "heiwaCo2Display", values: {hidden: 0, shown: 1}},
                display_temperature_source: {attribute: "heiwaDisplayTemperatureSource", values: {temperature_1: 1, temperature_2: 2}},
                setpoint_only_ui: {attribute: "heiwaSetpointOnlyUi", values: {OFF: 0, ON: 1}},
            };
            const definition = definitions[key];
            let rawValue: number;
            if (key === "display_brightness") {
                utils.assertNumber(value, key);
                if (!Number.isInteger(value) || value < 0 || value > 10) throw new Error(`${key} must be an integer between 0 and 10`);
                rawValue = value * 5;
            } else {
                utils.assertString(value, key);
                const mapped = definition.values?.[value];
                if (mapped === undefined) throw new Error(`Unsupported ${key} value: ${value}`);
                rawValue = mapped;
            }
            await entity.write<"hvacThermostat", HeiwaHvacThermostat>(
                "hvacThermostat",
                {[definition.attribute]: rawValue} as never,
            );
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [definition.attribute]);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key) => {
            const attributes: Record<string, keyof HeiwaHvacThermostat["attributes"]> = {
                display_brightness: "heiwaDisplayBrightness",
                language: "heiwaLanguage",
                temperature_unit: "heiwaTemperatureUnit",
                humidity_display: "heiwaHumidityDisplay",
                co2_display: "heiwaCo2Display",
                display_temperature_source: "heiwaDisplayTemperatureSource",
                setpoint_only_ui: "heiwaSetpointOnlyUi",
            };
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [attributes[key]]);
        },
    } satisfies Tz.Converter,
    environment_offsets: {
        key: ["temperature_offset", "humidity_offset", "co2_offset"],
        convertSet: async (entity, key, value) => {
            utils.assertNumber(value, key);
            const definitions: Record<string, {attribute: keyof HeiwaHvacThermostat["attributes"]; scale: number; min: number; max: number}> = {
                temperature_offset: {attribute: "heiwaTemperatureOffset", scale: 10, min: -5, max: 5},
                humidity_offset: {attribute: "heiwaHumidityOffset", scale: 1, min: -20, max: 20},
                co2_offset: {attribute: "heiwaCo2Offset", scale: 1, min: -1000, max: 1000},
            };
            const definition = definitions[key];
            if (!Number.isFinite(value) || value < definition.min || value > definition.max) {
                throw new Error(`${key} must be between ${definition.min} and ${definition.max}`);
            }
            const rawValue = Math.round(value * definition.scale);
            await entity.write<"hvacThermostat", HeiwaHvacThermostat>(
                "hvacThermostat",
                {[definition.attribute]: rawValue} as never,
            );
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [definition.attribute]);
            return {state: {[key]: rawValue / definition.scale}};
        },
        convertGet: async (entity, key) => {
            const attributes: Record<string, keyof HeiwaHvacThermostat["attributes"]> = {
                temperature_offset: "heiwaTemperatureOffset",
                humidity_offset: "heiwaHumidityOffset",
                co2_offset: "heiwaCo2Offset",
            };
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [attributes[key]]);
        },
    } satisfies Tz.Converter,
    setpoint_settings: {
        key: ["setpoint_central", "setpoint_maximum", "setpoint_minimum", "setpoint_step"],
        convertSet: async (entity, key, value) => {
            utils.assertNumber(value, key);
            if (key === "setpoint_step") {
                const rawValue = value === 1 ? 0 : value === 0.5 ? 1 : undefined;
                if (rawValue === undefined) throw new Error(`${key} must be 0.5 or 1.0`);
                await entity.write<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", {heiwaSetpointStep: rawValue});
                await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaSetpointStep"]);
                return {state: {setpoint_step: value}};
            }
            const attributes: Record<string, keyof HeiwaHvacThermostat["attributes"]> = {
                setpoint_central: "heiwaCentralSetpoint",
                setpoint_maximum: "heiwaMaximumSetpoint",
                setpoint_minimum: "heiwaMinimumSetpoint",
            };
            if (!Number.isFinite(value) || value < 18 || value > 27 || Math.round(value * 2) !== value * 2) {
                throw new Error(`${key} must be between 18 and 27 °C in 0.5 °C increments`);
            }
            const rawValue = value * 10;
            await entity.write<"hvacThermostat", HeiwaHvacThermostat>(
                "hvacThermostat",
                {[attributes[key]]: rawValue} as never,
            );
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [attributes[key]]);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key) => {
            const attributes: Record<string, keyof HeiwaHvacThermostat["attributes"]> = {
                setpoint_central: "heiwaCentralSetpoint",
                setpoint_maximum: "heiwaMaximumSetpoint",
                setpoint_minimum: "heiwaMinimumSetpoint",
                setpoint_step: "heiwaSetpointStep",
            };
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [attributes[key]]);
        },
    } satisfies Tz.Converter,
    room_name: {
        key: ["room_name"],
        convertSet: async (entity, key, value) => {
            utils.assertString(value, key);
            if ([...value].length > 16) throw new Error(`${key} must contain at most 16 characters`);
            await entity.write<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", {heiwaRoomName: value});
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaRoomName"]);
            return {state: {room_name: value}};
        },
        convertGet: async (entity) => {
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaRoomName"]);
        },
    } satisfies Tz.Converter,
    zone_demand_icon: {
        key: ["zone_demand_icon"],
        convertSet: async (entity, key, value) => {
            utils.assertString(value, key);
            const states: Record<string, {heating: number; cooling: number}> = {
                none: {heating: 0, cooling: 0},
                heating: {heating: 1, cooling: 0},
                cooling: {heating: 0, cooling: 1},
            };
            const target = states[value];
            if (!target) throw new Error(`Unsupported ${key} value: ${value}`);
            if (value === "heating") {
                await entity.write<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", {heiwaCoolingDemandIcon: target.cooling});
                await entity.write<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", {heiwaHeatingDemandIcon: target.heating});
            } else {
                await entity.write<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", {heiwaHeatingDemandIcon: target.heating});
                await entity.write<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", {heiwaCoolingDemandIcon: target.cooling});
            }
            const current = await entity.read<"hvacThermostat", HeiwaHvacThermostat>(
                "hvacThermostat",
                ["heiwaHeatingDemandIcon", "heiwaCoolingDemandIcon"],
            );
            if (current.heiwaHeatingDemandIcon !== target.heating || current.heiwaCoolingDemandIcon !== target.cooling) {
                throw new Error(`Zone demand icon ${value} was not confirmed by the thermostat`);
            }
            const confirmed = current.heiwaHeatingDemandIcon !== 0 ? "heating" : current.heiwaCoolingDemandIcon !== 0 ? "cooling" : "none";
            return {state: {zone_demand_icon: confirmed}};
        },
        convertGet: async (entity) => {
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaHeatingDemandIcon", "heiwaCoolingDemandIcon"]);
        },
    } satisfies Tz.Converter,
    battery_voltage: {
        key: ["battery_voltage"],
        convertGet: async (entity) => {
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", ["heiwaBatteryVoltage"]);
        },
    } satisfies Tz.Converter,
    refresh: {
        key: ["refresh"],
        convertSet: async (entity, key, value) => {
            if (value !== "press") throw new Error(`${key} only supports press`);
            await entity.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [
                "heiwaBatteryVoltage", "heiwaLanguage", "heiwaTemperatureUnit", "heiwaDisplayTemperature", "heiwaTemperatureOffset",
                "heiwaHumidity", "heiwaHumidityOffset", "heiwaCo2", "heiwaCo2Offset", "heiwaDisplayBrightness", "heiwaRoomName",
                "heiwaHumidityDisplay", "heiwaCo2Display", "heiwaDisplayTemperatureSource", "heiwaCentralSetpoint", "heiwaSetpointStep",
                "heiwaMaximumSetpoint", "heiwaMinimumSetpoint", "heiwaDisplayedSetpoint", "heiwaSetpointOnlyUi", "heiwaActiveProfile",
                "heiwaHeatingDemandIcon", "heiwaCoolingDemandIcon",
            ]);
            return {state: {refresh: "press"}};
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "Thermostat_RF_Model_00000000000", manufacturerName: "Eurevia"}],
        model: "HPZERAD-V1",
        vendor: "Heiwa",
        description: "Ernest thermostat (OEM Eurevia)",
        extend: [heiwaHvacThermostatCluster],
        fromZigbee: [fzLocal.thermostat],
        toZigbee: [
            tzLocal.current_heating_setpoint,
            tzLocal.profile,
            tzLocal.manufacturer_settings,
            tzLocal.environment_offsets,
            tzLocal.setpoint_settings,
            tzLocal.room_name,
            tzLocal.zone_demand_icon,
            tzLocal.battery_voltage,
            tzLocal.refresh,
        ],
        exposes: [
            e.climate().withSetpoint("current_heating_setpoint", 18, 27, 0.5).withLocalTemperature(),
            e.numeric("display_temperature", ea.STATE).withUnit("°C").withDescription("Temperature used by the stock display"),
            e.numeric("temperature_offset", ea.ALL).withUnit("°C").withValueMin(-5).withValueMax(5).withValueStep(0.1).withCategory("config"),
            e.numeric("humidity", ea.STATE).withUnit("%"),
            e.numeric("humidity_offset", ea.ALL).withUnit("%").withValueMin(-20).withValueMax(20).withValueStep(1).withCategory("config"),
            e.numeric("co2", ea.STATE).withUnit("ppm").withDescription("Remains zero on variants without a CO2 sensor"),
            e.numeric("co2_offset", ea.ALL).withUnit("ppm").withValueMin(-1000).withValueMax(1000).withValueStep(1).withCategory("config"),
            e.numeric("display_brightness", ea.ALL).withValueMin(0).withValueMax(10).withValueStep(1).withCategory("config"),
            e.enum("language", ea.ALL, ["french", "english"]).withCategory("config"),
            e.enum("temperature_unit", ea.ALL, ["celsius", "fahrenheit"]).withCategory("config"),
            e.enum("humidity_display", ea.ALL, ["hidden", "shown"]).withCategory("config"),
            e.enum("co2_display", ea.ALL, ["hidden", "shown"]).withCategory("config"),
            e.enum("display_temperature_source", ea.ALL, ["temperature_1", "temperature_2"]).withCategory("config"),
            e.binary("setpoint_only_ui", ea.ALL, "ON", "OFF").withCategory("config").withDescription("Hide the local M/profile menu while keeping the setpoint arrows"),
            e.numeric("setpoint_central", ea.ALL).withUnit("°C").withValueMin(18).withValueMax(27).withValueStep(0.5).withCategory("config"),
            e.numeric("setpoint_minimum", ea.ALL).withUnit("°C").withValueMin(18).withValueMax(27).withValueStep(0.5).withCategory("config"),
            e.numeric("setpoint_maximum", ea.ALL).withUnit("°C").withValueMin(18).withValueMax(27).withValueStep(0.5).withCategory("config"),
            e.numeric("setpoint_step", ea.ALL).withUnit("°C").withValueMin(0.5).withValueMax(1).withValueStep(0.5).withCategory("config"),
            e.text("room_name", ea.ALL).withCategory("config").withDescription("Room name shown by the stock UI; maximum 16 characters"),
            e.enum("profile", ea.ALL, ["off", "eco", "reduced", "comfort"]),
            e.enum("active_profile", ea.STATE, ["off", "eco", "reduced", "comfort"]),
            e.binary("remote_power", ea.STATE, "ON", "OFF"),
            e.enum("zone_demand_icon", ea.ALL, ["none", "heating", "cooling"]),
            e.numeric("battery", ea.STATE).withUnit("%").withValueMin(0).withValueMax(100).withValueStep(25),
            e.numeric("battery_voltage", ea.STATE_GET).withUnit("V").withCategory("diagnostic"),
            e.enum("refresh", ea.SET, ["press"]),
        ],
        endpoint: () => ({default: 25}),
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat"]);
            await endpoint.configureReporting<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [
                {attribute: "heiwaDisplayTemperature", minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 1},
                {attribute: "heiwaHumidity", minimumReportInterval: 10, maximumReportInterval: 3600, reportableChange: 1},
                {attribute: "heiwaDisplayedSetpoint", minimumReportInterval: 1, maximumReportInterval: 65000, reportableChange: 5},
                {attribute: "heiwaActiveProfile", minimumReportInterval: 1, maximumReportInterval: 65000, reportableChange: null},
            ]);
            await endpoint.read<"hvacThermostat", HeiwaHvacThermostat>("hvacThermostat", [
                "heiwaBatteryVoltage", "heiwaLanguage", "heiwaTemperatureUnit", "heiwaDisplayTemperature", "heiwaTemperatureOffset",
                "heiwaHumidity", "heiwaHumidityOffset", "heiwaCo2", "heiwaCo2Offset", "heiwaDisplayBrightness", "heiwaRoomName",
                "heiwaHumidityDisplay", "heiwaCo2Display", "heiwaDisplayTemperatureSource", "heiwaCentralSetpoint", "heiwaSetpointStep",
                "heiwaMaximumSetpoint", "heiwaMinimumSetpoint", "heiwaDisplayedSetpoint", "heiwaSetpointOnlyUi", "heiwaActiveProfile",
                "heiwaHeatingDemandIcon", "heiwaCoolingDemandIcon",
            ]);
        },
    },
];
