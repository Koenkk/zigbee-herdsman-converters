import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["HD300W-ZB"],
        model: "HD300W-ZB",
        vendor: "HOFTRONIC",
        description: "Rotary smart zigbee LED dimmer",
        extend: [
            m.light({
                configureReporting: true,
                powerOnBehavior: true,
                turnsOffAtBrightness1: true,
                ota: true,
                effect: false,
            }),
            m.identify(),
        ],
    },
];
