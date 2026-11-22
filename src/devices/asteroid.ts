
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
                const tpl =
                    payload.value_template ??
                    payload.val_tpl ??
                    "";

                if (tpl.includes("sensor_status")) {
                    payload.name = "DS18B20";
                }

                const cls =
                    payload.device_class ??
                    payload.dev_cla;

                if (cls !== "temperature") return;

                const topic =
                    payload.state_topic ??
                    payload.stat_t;

                if (!topic) return;

                const status = {
                    topic,
                    value_template:
                        "{{ 'online' if value_json.sensor_status | default('ERROR') == 'OK' else 'offline' }}",
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
];

