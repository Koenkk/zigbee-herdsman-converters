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
    single: 0x39,
};

const idToMode = ["off", "auto", "cool", "heat", "dry", "fan_only"];
const modeToId: {[s: string]: number} = {off: 0, auto: 1, cool: 2, heat: 3, dry: 4, fan_only: 5};
const idToFan = ["auto", "low", "medium", "high", "quiet"];
const fanToId: {[s: string]: number} = {auto: 0, low: 1, medium: 2, high: 3, quiet: 4};
const idToSwing = ["off", "horizontal", "vertical", "both"];
const swingToId: {[s: string]: number} = {off: 0, horizontal: 1, vertical: 2, both: 3};
const idToPreset = ["none", "sleep", "turbo"];
const presetToId: {[s: string]: number} = {none: 0, sleep: 1, turbo: 2};
const zclSystemModeToMode: {[s: number]: string} = {0: "off", 1: "auto", 3: "cool", 4: "heat", 7: "fan_only", 8: "dry"};

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
    thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const data = msg.data as KeyValueAny;
            const result: KeyValueAny = {};
            if (data.localTemp !== undefined) result.local_temperature = data.localTemp / 100;
            if (data.occupiedCoolingSetpoint !== undefined) result.occupied_heating_setpoint = data.occupiedCoolingSetpoint / 100;
            if (data.occupiedHeatingSetpoint !== undefined) result.occupied_heating_setpoint = data.occupiedHeatingSetpoint / 100;
            if (data.systemMode !== undefined) result.system_mode = zclSystemModeToMode[data.systemMode] ?? "auto";
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
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
    system_mode: {
        key: ["system_mode"],
        convertSet: async (entity, key, value) => {
            const mode = String(value);
            if (!(mode in modeToId)) throw new Error(`Unsupported system_mode ${mode}`);
            await writeAttr(entity, attr.mode, modeToId[mode], dataType.uint8);
            return {state: {system_mode: mode, state: mode === "off" ? "OFF" : "ON"}};
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.mode);
        },
    } satisfies Tz.Converter,
    occupied_heating_setpoint: {
        key: ["occupied_heating_setpoint", "occupied_cooling_setpoint", "current_heating_setpoint", "current_cooling_setpoint"],
        convertSet: async (entity, key, value) => {
            const temp = Number(value);
            if (!Number.isFinite(temp) || temp < 16 || temp > 30) throw new Error("Temperature must be between 16 and 30");
            await writeAttr(entity, attr.targetTemp, temp, dataType.single);
            return {state: {occupied_heating_setpoint: temp}};
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.targetTemp);
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
        fromZigbee: [fzLocal.acAnalog, fzLocal.thermostat],
        toZigbee: [
            tzLocal.state,
            tzLocal.system_mode,
            tzLocal.occupied_heating_setpoint,
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
