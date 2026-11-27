import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

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
        description: "Temperature and pressure sensor with display",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.temperature(),
            m.pressure({description: "The measured liquid pressure", homeassistant: {deviceClass: "pressure"}}),
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
                name: ["temperature_offset", "pressure_offset"],
                endpointNames: ["1", "2"],
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                description: ["Temperature offset", "Pressure offset"],
                unit: ["°C", "bar"],
                valueMin: [-10, -0.5],
                valueMax: [10, 0.5],
                valueStep: [0.1, 0.01],
                precision: [1, 2],
                entityCategory: "config",
            }),
            m.binary({
                name: "display",
                cluster: "genBinaryOutput",
                attribute: "presentValue",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "Display on/off",
                endpointName: "1",
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "reset_pairing",
                cluster: "genBinaryOutput",
                attribute: "presentValue",
                lookup: {RESET: 1},
                description: "Reset Zigbee pairing (device leaves the network)",
                access: "SET",
                endpointName: "2",
                entityCategory: "config",
            }),
        ],
    },
];
