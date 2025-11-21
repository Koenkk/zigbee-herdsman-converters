import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "RGB", manufacturerName: "DOMRAEM"}],
        model: "DOM-Z-105P",
        vendor: "DOMRAEM",
        description: "LED controller",
        extend: [m.light({color: {modes: ["hs"], enhancedHue: false}})],
    },
    {
        fingerprint: [{modelID: "RGBWC", manufacturerName: "DOMRAEM"}],
        model: "DOM-Z-105P",
        vendor: "DOMRAEM",
        description: "LED controller 5 in 1 (RGBW)",
        extend: [m.light({colorTemp: {range: [158, 495]}, color: {modes: ["xy", "hs"], enhancedHue: true}})],
    },
    {
        fingerprint: [{modelID: "WW/CW", manufacturerName: "DOMRAEM"}],
        model: "DOM-Z-105P",
        vendor: "DOMRAEM",
        description: "LED controller 5 in 1 (WW/CW)",
        extend: [m.light({colorTemp: {range: [158, 500]}})],
    },
    {
        fingerprint: [{modelID: "DIMMER", manufacturerName: "DOMRAEM"}],
        model: "DOM-Z-105P",
        vendor: "DOMRAEM",
        description: "LED controller 5 in 1 (DIMMER)",
        extend: [m.light()],
    },
];
