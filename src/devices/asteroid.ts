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
    },
];
