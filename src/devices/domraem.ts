import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "RGB", manufacturerName: "DOMRAEM"}],
        model: "DOM-Z-105P_RGB",
        vendor: "DOMRAEM",
        description: "LED controller 5 in 1",
        extend: [m.light({color: {modes: ["hs"], enhancedHue: false}})],
    },
    {
        fingerprint: [{modelID: "RGBWC", manufacturerName: "DOMRAEM"}],
        model: "DOM-Z-105P_RGBW",
        vendor: "DOMRAEM",
        description: "LED controller 5 in 1",
        extend: [m.light({colorTemp: {range: [158, 495]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
    {
        fingerprint: [{modelID: "WW/CW", manufacturerName: "DOMRAEM"}],
        model: "DOM-Z-105P_WW/CW",
        vendor: "DOMRAEM",
        description: "LED controller 5 in 1",
        extend: [m.light({colorTemp: {range: [158, 500]}})],
    },
    {
        fingerprint: [{modelID: "DIMMER", manufacturerName: "DOMRAEM"}],
        model: "DOM-Z-105P_DIMMER",
        vendor: "DOMRAEM",
        description: "LED controller 5 in 1",
        extend: [m.light()],
    },
];
