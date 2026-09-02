import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz, Zh} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

// Custom attributes reported by the firmware on the standard Analog Input cluster.
const attr = {
    power: 0xf000,
    mode: 0xf001,
    fanMode: 0xf002,
    swingMode: 0xf003,
    preset: 0xf004,
    display: 0xf005,
    indoorTemp: 0xf006,
    outdoorTemp: 0xf007,
    targetTemp: 0xf008,
    firmwareVersion: 0xf009,
};

const dataType = {
    boolean: 0x10,
    uint8: 0x20,
};

const idToMode = ["off", "auto", "cool", "heat", "dry", "fan_only"];
const idToFan = ["auto", "low", "medium", "high", "quiet"];
const fanToId: {[s: string]: number} = {auto: 0, low: 1, medium: 2, high: 3, quiet: 4};
const idToSwing = ["off", "horizontal", "vertical", "both"];
const swingToId: {[s: string]: number} = {off: 0, horizontal: 1, vertical: 2, both: 3};
const idToPreset = ["none", "sleep", "turbo"];
const presetToId: {[s: string]: number} = {none: 0, sleep: 1, turbo: 2};

const writeAttr = async (entity: Zh.Endpoint | Zh.Group, attribute: number, value: unknown, type: number) =>
    await entity.write("genAnalogInput", {[attribute]: {value, type}});
const readAttr = async (entity: Zh.Endpoint | Zh.Group, attribute: number) => await entity.read("genAnalogInput", [attribute]);

const fzLocal = {
    acAnalog: {
        cluster: "genAnalogInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const data = msg.data as KeyValueAny;
            const result: KeyValueAny = {};
            if (data[attr.power] !== undefined) result.state = data[attr.power] ? "ON" : "OFF";
            if (data[attr.mode] !== undefined) result.system_mode = idToMode[data[attr.mode]] ?? "auto";
            if (data[attr.fanMode] !== undefined) result.fan_mode = idToFan[data[attr.fanMode]] ?? "auto";
            if (data[attr.swingMode] !== undefined) result.swing_mode = idToSwing[data[attr.swingMode]] ?? "off";
            if (data[attr.preset] !== undefined) result.preset = idToPreset[data[attr.preset]] ?? "none";
            if (data[attr.display] !== undefined) result.display = data[attr.display] ? "ON" : "OFF";
            if (data[attr.indoorTemp] !== undefined) result.local_temperature = data[attr.indoorTemp];
            if (data[attr.outdoorTemp] !== undefined) result.outdoor_temperature = data[attr.outdoorTemp];
            if (data[attr.targetTemp] !== undefined) result.occupied_heating_setpoint = data[attr.targetTemp];
            if (data[attr.firmwareVersion] !== undefined) result.firmware_version = data[attr.firmwareVersion];
            return result;
        },
    } satisfies Fz.Converter<"genAnalogInput", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    state: {
        key: ["state"],
        convertSet: async (entity, key, value) => {
            const on = value === "ON" || value === true;
            await writeAttr(entity, attr.power, on, dataType.boolean);
            return {state: {state: on ? "ON" : "OFF", system_mode: on ? "cool" : "off"}};
        },
    } satisfies Tz.Converter,
    fan_mode: {
        key: ["fan_mode"],
        convertSet: async (entity, key, value) => {
            const mode = String(value);
            if (!(mode in fanToId)) throw new Error(`Unsupported fan_mode ${mode}`);
            await writeAttr(entity, attr.fanMode, fanToId[mode], dataType.uint8);
            return {state: {fan_mode: mode}};
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.fanMode);
        },
    } satisfies Tz.Converter,
    swing_mode: {
        key: ["swing_mode"],
        convertSet: async (entity, key, value) => {
            const mode = String(value);
            if (!(mode in swingToId)) throw new Error(`Unsupported swing_mode ${mode}`);
            await writeAttr(entity, attr.swingMode, swingToId[mode], dataType.uint8);
            return {state: {swing_mode: mode}};
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.swingMode);
        },
    } satisfies Tz.Converter,
    preset: {
        key: ["preset"],
        convertSet: async (entity, key, value) => {
            const preset = String(value);
            if (!(preset in presetToId)) throw new Error(`Unsupported preset ${preset}`);
            await writeAttr(entity, attr.preset, presetToId[preset], dataType.uint8);
            return {state: {preset}};
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.preset);
        },
    } satisfies Tz.Converter,
    display: {
        key: ["display"],
        convertSet: async (entity, key, value) => {
            const enabled = value === "ON" || value === true;
            await writeAttr(entity, attr.display, enabled, dataType.boolean);
            return {state: {display: enabled ? "ON" : "OFF"}};
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.display);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "ZB-MIDEA-AC", manufacturerName: "PirogovX"}],
        model: "ZB-MIDEA-AC",
        vendor: "PirogovX",
        description: "Zigbee air conditioner controller for Midea / Royal Clima / Hommyn / Neoline (ESP32-H2/C6)",
        fromZigbee: [fzLocal.acAnalog, fz.thermostat],
        toZigbee: [
            tzLocal.state,
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tzLocal.fan_mode,
            tzLocal.swing_mode,
            tzLocal.preset,
            tzLocal.display,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 16, 30, 1, ea.STATE_SET)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "cool", "heat", "dry", "fan_only"], ea.STATE_SET),
            e.enum("fan_mode", ea.STATE_SET, ["auto", "low", "medium", "high", "quiet"]).withDescription("Fan speed"),
            e.enum("swing_mode", ea.STATE_SET, ["off", "horizontal", "vertical", "both"]).withDescription("Swing mode"),
            e.enum("preset", ea.STATE_SET, ["none", "sleep", "turbo"]).withDescription("Preset mode"),
            e.binary("display", ea.STATE_SET, "ON", "OFF").withDescription("AC display and beep control"),
            e.numeric("outdoor_temperature", ea.STATE).withUnit("°C").withDescription("Outdoor unit temperature"),
            e.text("firmware_version", ea.STATE).withDescription("AC controller firmware version"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // Bind the clusters that carry telemetry so the device reports current/outdoor
            // temperature, mode and firmware version to the coordinator automatically.
            const endpoint = device.getEndpoint(1);
            await endpoint.bind("genAnalogInput", coordinatorEndpoint);
            try {
                await endpoint.bind("hvacThermostat", coordinatorEndpoint);
            } catch {
                // hvacThermostat binding is optional and may fail on some coordinators.
            }
        },
    },
];
