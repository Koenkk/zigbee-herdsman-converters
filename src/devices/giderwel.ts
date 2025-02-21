import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["A10"],
        model: "GD-ZCRGB012",
        vendor: "GIDERWEL",
        description: "Smart Zigbee RGB LED strip controller",
        extend: [m.light({color: {modes: ["xy", "hs"]}})],
    },
];
