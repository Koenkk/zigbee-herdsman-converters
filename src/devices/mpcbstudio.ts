import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "mpcb-relay", manufacturerName: "mpcbstudio"}],
        model: "mpcb-relay",
        vendor: "mpcbstudio",
        description: "MPCB Smart Relay (ESP32-C6 Zigbee end device)",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        fingerprint: [{modelID: "mpcb-temp", manufacturerName: "mpcbstudio"}],
        model: "mpcb-temp",
        vendor: "mpcbstudio",
        description: "MPCB Temperature Sensor (ESP32-C6 Zigbee end device)",
        extend: [m.temperature()],
    },
];
