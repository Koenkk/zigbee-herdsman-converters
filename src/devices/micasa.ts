import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["GasCounter"],
        model: "GasCounter",
        vendor: "MICASA",
        description: "Zigbee Gas counter created by Ignacio Hernández-Ros",
        ota: true,
        extend: [m.gasMeter({cluster: "metering", power: false}), m.battery({voltage: true, lowStatus: true})],
        meta: {},
    },
];
