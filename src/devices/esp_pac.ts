import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz, Zh} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

// Custom attributes reported by the ESP-PAC firmware on the standard Analog Input cluster.
// Commands are written here. The thermostat cluster mirrors the same state for Home Assistant.
const attr = {
    power: 0xf000,
    mode: 0xf001,
    fanMode: 0xf002,
    swingMode: 0xf003,
    preset: 0xf004,
    nanoex: 0xf005,
    indoorTemp: 0xf006,
    outdoorTemp: 0xf007,
    targetTemp: 0xf008,
    firmwareVersion: 0xf009,
    eco: 0xf00a,
    econavi: 0xf00b,
    mildDry: 0xf00c,
    defrost: 0xf00d,
    powerW: 0xf00e,
    vswing: 0xf00f,
    hswing: 0xf010,
};

const dataType = {
    boolean: 0x10,
    uint8: 0x20,
    single: 0x39,
};

const idToMode = ["off", "auto", "cool", "heat", "dry", "fan_only"];
const modeToId: {[s: string]: number} = {off: 0, auto: 1, cool: 2, heat: 3, dry: 4, fan_only: 5};
const idToFan = ["auto", "1", "2", "3", "4", "5"];
const fanToId: {[s: string]: number} = {auto: 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5};
const idToSwing = ["off", "horizontal", "vertical", "both"];
const swingToId: {[s: string]: number} = {off: 0, horizontal: 1, vertical: 2, both: 3};
const idToPreset = ["none", "powerful", "quiet"];
const presetToId: {[s: string]: number} = {none: 0, powerful: 1, quiet: 2};
const idToVSwing = ["unknown", "up", "up_center", "center", "down_center", "down", "swing", "auto"];
const vSwingToId: {[s: string]: number} = {unknown: 0, up: 1, up_center: 2, center: 3, down_center: 4, down: 5, swing: 6, auto: 7};
const idToHSwing = ["unknown", "left", "left_center", "center", "right_center", "right", "auto"];
const hSwingToId: {[s: string]: number} = {unknown: 0, left: 1, left_center: 2, center: 3, right_center: 4, right: 5, auto: 6};

const unwrap = (value: unknown): unknown => (value && typeof value === "object" && "value" in value ? value.value : value);

const num = (value: unknown) => {
    if (value === undefined) return undefined;
    const parsed = Number(unwrap(value));
    return Number.isFinite(parsed) ? parsed : undefined;
};

const onOff = (value: unknown) => {
    if (value === undefined) return undefined;
    const raw = unwrap(value);
    if (raw === undefined) return undefined;
    return raw ? "ON" : "OFF";
};

const formatFirmware = (value: unknown) => {
    const raw = unwrap(value);
    const version = Number(raw) >>> 0;
    if (!Number.isFinite(Number(raw))) return undefined;
    return `${(version >>> 24) & 0xff}.${(version >>> 16) & 0xff}.${(version >>> 8) & 0xff}`;
};

const writeAttr = async (entity: Zh.Endpoint | Zh.Group, attribute: number, value: unknown, type: number) => {
    await entity.write("genAnalogInput", {[attribute]: {value, type}});
};

const readAttr = async (entity: Zh.Endpoint | Zh.Group, attribute: number) => {
    await entity.read("genAnalogInput", [attribute]);
};

const enumSet = (key: string, table: {[s: string]: number}, attribute: number): Tz.Converter => ({
    key: [key],
    convertSet: async (entity, _key, value) => {
        const name = String(value);
        if (!(name in table)) {
            throw new Error(`Unsupported ${key} ${name}`);
        }
        await writeAttr(entity, attribute, table[name], dataType.uint8);
        return {state: {[key]: name}};
    },
    convertGet: async (entity) => {
        await readAttr(entity, attribute);
    },
});

const binarySet = (key: string, attribute: number): Tz.Converter => ({
    key: [key],
    convertSet: async (entity, _key, value) => {
        const on = value === "ON" || value === true;
        await writeAttr(entity, attribute, on, dataType.boolean);
        return {state: {[key]: on ? "ON" : "OFF"}};
    },
    convertGet: async (entity) => {
        await readAttr(entity, attribute);
    },
});

const fzLocal = {
    acAnalog: {
        cluster: "genAnalogInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const data = msg.data;
            const result: KeyValueAny = {};
            const power = onOff(data[attr.power]);
            const mode = num(data[attr.mode]);
            const fan = num(data[attr.fanMode]);
            const swing = num(data[attr.swingMode]);
            const preset = num(data[attr.preset]);
            const nanoex = onOff(data[attr.nanoex]);
            const eco = onOff(data[attr.eco]);
            const econavi = onOff(data[attr.econavi]);
            const mildDry = onOff(data[attr.mildDry]);
            const defrost = onOff(data[attr.defrost]);
            const indoor = num(data[attr.indoorTemp]);
            const outdoor = num(data[attr.outdoorTemp]);
            const target = num(data[attr.targetTemp]);
            const watts = num(data[attr.powerW]);
            const vswing = num(data[attr.vswing]);
            const hswing = num(data[attr.hswing]);
            const firmware = formatFirmware(data[attr.firmwareVersion]);

            if (power !== undefined) result.state = power;
            if (mode !== undefined) result.system_mode = idToMode[mode] ?? "auto";
            if (fan !== undefined) result.fan_mode = idToFan[fan] ?? "auto";
            if (swing !== undefined) result.swing_mode = idToSwing[swing] ?? "off";
            if (preset !== undefined) result.preset = idToPreset[preset] ?? "none";
            if (nanoex !== undefined) result.nanoex = nanoex;
            if (eco !== undefined) result.eco = eco;
            if (econavi !== undefined) result.econavi = econavi;
            if (mildDry !== undefined) result.mild_dry = mildDry;
            if (defrost !== undefined) result.defrost = defrost;
            if (indoor !== undefined) result.local_temperature = indoor;
            if (outdoor !== undefined) result.outdoor_temperature = outdoor;
            if (target !== undefined) {
                result.occupied_heating_setpoint = target;
                result.occupied_cooling_setpoint = target;
            }
            if (watts !== undefined) result.power_consumption = watts;
            if (vswing !== undefined) result.vertical_swing = idToVSwing[vswing] ?? "unknown";
            if (hswing !== undefined) result.horizontal_swing = idToHSwing[hswing] ?? "unknown";
            if (firmware !== undefined) result.firmware_version = firmware;
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
            return {state: {state: on ? "ON" : "OFF"}};
        },
    } satisfies Tz.Converter,
    system_mode: {
        key: ["system_mode"],
        convertSet: async (entity, key, value) => {
            const name = String(value);
            if (!(name in modeToId)) {
                throw new Error(`Unsupported system_mode ${name}`);
            }
            await writeAttr(entity, attr.mode, modeToId[name], dataType.uint8);
            return {state: {system_mode: name, state: name === "off" ? "OFF" : "ON"}};
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.mode);
        },
    } satisfies Tz.Converter,
    local_temperature: {
        key: ["local_temperature"],
        convertSet: async () => {
            // Home Assistant publishes local_temperature as "" together with climate commands.
            // The indoor temperature is measured by the AC and is not writable.
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.indoorTemp);
        },
    } satisfies Tz.Converter,
    occupied_heating_setpoint: {
        key: ["occupied_heating_setpoint", "occupied_cooling_setpoint", "current_heating_setpoint", "current_cooling_setpoint"],
        convertSet: async (entity, key, value) => {
            const temp = Math.round(Number(value) * 2) / 2;
            if (!Number.isFinite(temp) || temp < 16 || temp > 30) {
                throw new Error("Temperature must be 16..30");
            }
            await writeAttr(entity, attr.targetTemp, temp, dataType.single);
            return {state: {occupied_heating_setpoint: temp, occupied_cooling_setpoint: temp, state: "ON"}};
        },
        convertGet: async (entity) => {
            await readAttr(entity, attr.targetTemp);
        },
    } satisfies Tz.Converter,
    fan_mode: enumSet("fan_mode", fanToId, attr.fanMode),
    swing_mode: enumSet("swing_mode", swingToId, attr.swingMode),
    preset: enumSet("preset", presetToId, attr.preset),
    vertical_swing: enumSet("vertical_swing", vSwingToId, attr.vswing),
    horizontal_swing: enumSet("horizontal_swing", hSwingToId, attr.hswing),
    nanoex: binarySet("nanoex", attr.nanoex),
    eco: binarySet("eco", attr.eco),
    econavi: binarySet("econavi", attr.econavi),
    mild_dry: binarySet("mild_dry", attr.mildDry),
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "ZB-PANASONIC-AC", manufacturerName: "ESP-PAC"}],
        model: "ZB-PANASONIC-AC",
        vendor: "ESP-PAC",
        description: "Panasonic CZ-TACG1 (CN-CNT) air conditioner controller (ESP32-C6)",
        fromZigbee: [fzLocal.acAnalog, fz.thermostat],
        toZigbee: [
            tzLocal.state,
            tzLocal.system_mode,
            tzLocal.local_temperature,
            tzLocal.occupied_heating_setpoint,
            tzLocal.fan_mode,
            tzLocal.swing_mode,
            tzLocal.preset,
            tzLocal.vertical_swing,
            tzLocal.horizontal_swing,
            tzLocal.nanoex,
            tzLocal.eco,
            tzLocal.econavi,
            tzLocal.mild_dry,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 16, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "cool", "heat", "dry", "fan_only"], ea.STATE_SET),
            e.enum("fan_mode", ea.STATE_SET, idToFan).withDescription("Fan speed"),
            e.enum("swing_mode", ea.STATE_SET, idToSwing).withDescription("Swing mode"),
            e.enum("preset", ea.STATE_SET, idToPreset).withDescription("Powerful or quiet"),
            e.enum("vertical_swing", ea.STATE_SET, idToVSwing).withDescription("Vertical vane position"),
            e.enum("horizontal_swing", ea.STATE_SET, idToHSwing).withDescription("Horizontal vane position"),
            e.binary("nanoex", ea.STATE_SET, "ON", "OFF").withDescription("nanoeX. Only enable if the remote has this button"),
            e.binary("eco", ea.STATE_SET, "ON", "OFF").withDescription("Eco. Only enable if the remote has this button"),
            e.binary("econavi", ea.STATE_SET, "ON", "OFF").withDescription("ECONAVI. Only enable if the remote has this button"),
            e.binary("mild_dry", ea.STATE_SET, "ON", "OFF").withDescription("Mild dry. Only enable if the remote has this button"),
            e.binary("defrost", ea.STATE, "ON", "OFF").withDescription("Outdoor unit defrost"),
            e.numeric("outdoor_temperature", ea.STATE).withUnit("°C").withDescription("Outdoor temperature"),
            e.numeric("power_consumption", ea.STATE).withUnit("W").withDescription("Estimated power reported by the AC"),
            e.text("firmware_version", ea.STATE).withDescription("Firmware version"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.bind("genAnalogInput", coordinatorEndpoint);
            await endpoint.read("genAnalogInput", Object.values(attr));
            try {
                await endpoint.bind("hvacThermostat", coordinatorEndpoint);
                await endpoint.read("hvacThermostat", [
                    "localTemp",
                    "outdoorTemp",
                    "occupiedCoolingSetpoint",
                    "occupiedHeatingSetpoint",
                    "systemMode",
                ]);
            } catch {
                // Some coordinators reject the thermostat binding. Analog reports still carry the state.
            }
        },
    },
];
