import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

// Keep explicit MQTT property names. Do not enable multiEndpoint:
// it breaks temperature_offset routing on this device.
const temperatureFromZigbee = {
    cluster: "msTemperatureMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (_model, msg) => {
        if (msg.endpoint.ID !== 1 || msg.data.measuredValue === undefined) return;
        const raw = Number(msg.data.measuredValue);
        if (!Number.isFinite(raw) || raw === -32768) return;
        return {temperature_temperature: raw / 100};
    },
} satisfies Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]>;

const statusFromZigbee = {
    cluster: "genBinaryInput",
    type: ["attributeReport", "readResponse"],
    convert: (_model, msg) => {
        if (msg.endpoint.ID !== 2 || msg.data.presentValue === undefined) return;
        return {sensor_status_sensor: Number(msg.data.presentValue) === 1 ? "OK" : "ERROR"};
    },
} satisfies Fz.Converter<"genBinaryInput", undefined, ["attributeReport", "readResponse"]>;

const offsetFromZigbee = {
    cluster: "genAnalogOutput",
    type: ["attributeReport", "readResponse"],
    convert: (_model, msg) => {
        if (msg.endpoint.ID !== 3 || msg.data.presentValue === undefined) return;
        const value = Number(msg.data.presentValue);
        if (!Number.isFinite(value)) return;
        return {temperature_offset: Math.round(value * 10) / 10};
    },
} satisfies Fz.Converter<"genAnalogOutput", undefined, ["attributeReport", "readResponse"]>;

const offsetToZigbee = {
    key: ["temperature_offset"],
    convertSet: async (_entity, _key, value, meta) => {
        const v = Number(value);
        if (
            value === null ||
            value === undefined ||
            value === "" ||
            !Number.isFinite(v) ||
            v < -10 ||
            v > 10 ||
            Math.abs(v * 10 - Math.round(v * 10)) > 0.0001
        ) {
            throw new Error("Temperature Offset must be -10..10 °C in 0.1 °C steps");
        }
        const ep = meta.device.getEndpoint(3);
        if (!ep) throw new Error("T1 Z firmware has no Zigbee endpoint 3");
        await ep.write("genAnalogOutput", {presentValue: v});
        return {state: {temperature_offset: v}};
    },
    convertGet: async (_entity, _key, meta) => {
        const ep = meta.device.getEndpoint(3);
        if (!ep) throw new Error("T1 Z firmware has no Zigbee endpoint 3");
        await ep.read("genAnalogOutput", ["presentValue"]);
    },
} satisfies Tz.Converter;

const resetPairing = {
    key: ["reset_pairing"],
    convertSet: async (_entity, _key, value, meta) => {
        if (value !== "RESET") throw new Error("Use RESET to reset Zigbee pairing");
        const ep = meta.device.getEndpoint(1);
        if (!ep) throw new Error("T1 Z firmware has no Zigbee endpoint 1");
        await ep.write("genBinaryOutput", {presentValue: 1});
    },
} satisfies Tz.Converter;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Sensor Unit T1 Z"],
        model: "Sensor Unit T1 Z",
        vendor: "AsteroID",
        description: "DS18B20 temperature sensor with diagnostics, offset and pairing reset",
        fromZigbee: [temperatureFromZigbee, statusFromZigbee, offsetFromZigbee],
        toZigbee: [offsetToZigbee, resetPairing],
        exposes: [
            e.numeric("temperature", ea.STATE).withProperty("temperature_temperature").withUnit("°C").withDescription("Measured temperature value"),
            e
                .binary("sensor_status", ea.STATE_GET, "OK", "ERROR")
                .withProperty("sensor_status_sensor")
                .withDescription("DS18B20 connection status")
                .withCategory("diagnostic"),
            e
                .numeric("temperature_offset", ea.ALL)
                .withValueMin(-10)
                .withValueMax(10)
                .withValueStep(0.1)
                .withUnit("°C")
                .withDescription("Temperature correction stored in ESP32-H2")
                .withCategory("config"),
            e
                .enum("reset_pairing", ea.SET, ["RESET"])
                .withDescription("Factory reset Zigbee pairing (device leaves current network)")
                .withCategory("config"),
        ],
        meta: {
            overrideHaDiscoveryPayload: (payload) => {
                const tpl = payload.value_template ?? payload.val_tpl ?? "";
                if (tpl.includes("sensor_status_sensor") && "name" in payload) {
                    payload.name = "DS18B20";
                }
                const cls = payload.device_class ?? payload.dev_cla;
                if (cls !== "temperature" || !tpl.includes("temperature_temperature")) return;
                const topic = payload.state_topic ?? payload.stat_t;
                if (!topic) return;
                const status = {
                    topic,
                    value_template: "{{ 'online' if value_json.sensor_status_sensor | default('ERROR') == 'OK' else 'offline' }}",
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
