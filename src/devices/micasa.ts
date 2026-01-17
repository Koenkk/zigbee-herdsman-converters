import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MiCASAGasCounter"],
        model: "MiCASAGasCounter",
        vendor: "Custom devices (DiY)",
        description:
            "Zigbee Gas counter created by Ignacio Hernández-Ros. For more information please visit: https://github.com/IgnacioHR/ZigbeeGasCounter",
        ota: true,
        extend: [m.gasMeter({cluster: "metering", power: false}), m.battery({voltage: true, lowStatus: true})],
        meta: {},
    },
];
