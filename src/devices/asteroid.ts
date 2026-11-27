import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const tp1PressureOffsetFromZigbee = {
    cluster: "genAnalogOutput",
    type: ["attributeReport", "readResponse"],
    convert: (_model, msg) => {
        if (msg.endpoint.ID !== 2 || msg.data.presentValue === undefined) return;
        const value = Number(msg.data.presentValue);
        if (!Number.isFinite(value)) return;
        return {pressure_offset: Math.round(value * 100) / 100};
    },
} satisfies Fz.Converter<"genAnalogOutput", undefined, ["attributeReport", "readResponse"]>;

const tp1PressureOffsetToZigbee = {
    key: ["pressure_offset"],
    convertSet: async (_entity, _key, value, meta) => {
        const v = Number(value);
        if (
            value === null ||
            value === undefined ||
            value === "" ||
            !Number.isFinite(v) ||
            v < -0.5 ||
            v > 0.5 ||
            Math.abs(v * 100 - Math.round(v * 100)) > 0.0001
        ) {
            throw new Error("Pressure Offset must be -0.5..0.5 bar in 0.01 bar steps");
        }
        const ep = meta.device.getEndpoint(2);
        if (!ep) throw new Error("TP1 Z has no endpoint 2");
        await ep.write("genAnalogOutput", {presentValue: v});
        return {state: {pressure_offset: v}};
    },
    convertGet: async (_entity, _key, meta) => {
        const ep = meta.device.getEndpoint(2);
        if (!ep) throw new Error("TP1 Z has no endpoint 2");
        await ep.read("genAnalogOutput", ["presentValue"]);
    },
} satisfies Tz.Converter;

const tp1DisplayFromZigbee = {
    cluster: "genBinaryOutput",
    type: ["attributeReport", "readResponse"],
    convert: (_model, msg) => {
        if (msg.endpoint.ID !== 1 || msg.data.presentValue === undefined) return;
        return {display: Number(msg.data.presentValue) === 1 ? "ON" : "OFF"};
    },
} satisfies Fz.Converter<"genBinaryOutput", undefined, ["attributeReport", "readResponse"]>;

const tp1DisplayToZigbee = {
    key: ["display"],
    convertSet: async (_entity, _key, value, meta) => {
        const state = String(value).toUpperCase();
        if (state !== "ON" && state !== "OFF") throw new Error("Display must be ON or OFF");
        const ep = meta.device.getEndpoint(1);
        if (!ep) throw new Error("TP1 Z has no endpoint 1");
        await ep.write("genBinaryOutput", {presentValue: state === "ON" ? 1 : 0});
        await ep.read("genBinaryOutput", ["presentValue"]);
        return {state: {display: state}};
    },
    convertGet: async (_entity, _key, meta) => {
        const ep = meta.device.getEndpoint(1);
        if (!ep) throw new Error("TP1 Z has no endpoint 1");
        await ep.read("genBinaryOutput", ["presentValue"]);
    },
} satisfies Tz.Converter;

const tp1ResetPairing = {
    key: ["reset_pairing"],
    convertSet: async (_entity, _key, value, meta) => {
        if (String(value).toUpperCase() !== "RESET") throw new Error("Use RESET to reset Zigbee pairing");
        const ep = meta.device.getEndpoint(2);
        if (!ep) throw new Error("TP1 Z has no endpoint 2");
        await ep.write("genBinaryOutput", {presentValue: 1});
    },
} satisfies Tz.Converter;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Sensor Unit T1 Z"],
        model: "Sensor Unit T1 Z",
        vendor: "AsteroID",
        description: "Temperature sensor",
        extend: [
            m.temperature(),
            m.binary({
                name: "sensor_status",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                valueOn: ["OK", 1],
                valueOff: ["ERROR", 0],
                description: "DS18B20 connection status",
                access: "STATE_GET",
                reporting: {
                    min: 1,
                    max: 60,
                    change: 1,
                },
                entityCategory: "diagnostic",
            }),
            m.numeric({
                name: "temperature_offset",
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                description: "Temperature offset",
                unit: "°C",
                valueMin: -10,
                valueMax: 10,
                valueStep: 0.1,
                precision: 1,
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "reset_pairing",
                cluster: "genBinaryOutput",
                attribute: "presentValue",
                lookup: {RESET: 1},
                description: "Reset Zigbee pairing (device leaves the network)",
                access: "SET",
                entityCategory: "config",
            }),
        ],
        meta: {
            overrideHaDiscoveryPayload: (payload) => {
                const tpl = payload.value_template ?? payload.val_tpl ?? "";

                if (tpl.includes("sensor_status")) {
                    payload.name = "DS18B20";
                }

                const cls = payload.device_class ?? payload.dev_cla;

                if (cls !== "temperature") return;

                const topic = payload.state_topic ?? payload.stat_t;

                if (!topic) return;

                const status = {
                    topic,
                    value_template: "{{ 'online' if value_json.sensor_status | default('ERROR') == 'OK' else 'offline' }}",
                    payload_available: "online",
                    payload_not_available: "offline",
                };

                if (Array.isArray(payload.availability)) {
                    payload.availability.push(status);
                } else {
                    payload.availability = [status];
                }

                payload.availability_mode = "all";
            },
        },
    },
    {
        zigbeeModel: ["Sensor Unit TP1 Z"],
        model: "Sensor Unit TP1 Z",
        vendor: "AsteroID",
        description: "XDB401 temperature and pressure sensor with OLED display",
        fromZigbee: [tp1PressureOffsetFromZigbee, tp1DisplayFromZigbee],
        toZigbee: [tp1PressureOffsetToZigbee, tp1DisplayToZigbee, tp1ResetPairing],
        extend: [
            m.temperature(),
            m.pressure(),
            m.binary({
                name: "sensor_status",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                valueOn: ["OK", 1],
                valueOff: ["ERROR", 0],
                description: "XDB401 connection status",
                access: "STATE_GET",
                reporting: {min: 1, max: 60, change: 1},
                entityCategory: "diagnostic",
            }),
            m.numeric({
                name: "temperature_offset",
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                description: "Temperature offset",
                unit: "°C",
                valueMin: -10,
                valueMax: 10,
                valueStep: 0.1,
                precision: 1,
                entityCategory: "config",
            }),
        ],
        exposes: [
            e.numeric("pressure_offset", ea.ALL).withValueMin(-0.5).withValueMax(0.5).withValueStep(0.01).withUnit("bar").withCategory("config"),
            e.binary("display", ea.ALL, "ON", "OFF").withCategory("config"),
            e.enum("reset_pairing", ea.SET, ["RESET"]).withCategory("config"),
        ],
        meta: {
            overrideHaDiscoveryPayload: (payload) => {
                const tpl = payload.value_template ?? payload.val_tpl ?? "";
                if (tpl.includes("sensor_status") && "name" in payload) payload.name = "XDB401";
                const cls = payload.device_class ?? payload.dev_cla;
                const pressure =
                    cls === "pressure" ||
                    cls === "atmospheric_pressure" ||
                    tpl.includes("atmospheric_pressure") ||
                    /value_json(?:\.pressure\b|\[['"]pressure['"]\])/.test(tpl);
                if (cls !== "temperature" && !pressure) return;
                if (pressure) {
                    payload.name = "Pressure";
                    if ("dev_cla" in payload) payload.dev_cla = "pressure";
                    if ("device_class" in payload || !("dev_cla" in payload)) payload.device_class = "pressure";
                }
                const topic = payload.state_topic ?? payload.stat_t;
                if (!topic) return;
                const status = {
                    topic,
                    value_template: "{{ 'online' if value_json.sensor_status | default('ERROR') == 'OK' else 'offline' }}",
                    payload_available: "online",
                    payload_not_available: "offline",
                };
                if (Array.isArray(payload.availability)) payload.availability.push(status);
                else payload.availability = [status];
                payload.availability_mode = "all";
            },
        },
    },
];
