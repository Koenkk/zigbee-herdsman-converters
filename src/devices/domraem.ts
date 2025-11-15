import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {modelID: "RGB", manufacturerName: "DOMRAEM"},
            {modelID: "DIMMER", manufacturerName: "DOMRAEM"},
        ],
        model: "DOM-Z-105P",
        vendor: "DOMRAEM",
        description: "LED controller",
        extend: [m.light({color: {modes: ["hs"], enhancedHue: false}})],
    },
];
