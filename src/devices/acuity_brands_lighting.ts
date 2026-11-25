import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ABL-LIGHT-Z-001"],
        model: "WF4C_WF6C",
        vendor: "Acuity Brands Lighting (ABL)",
        description: 'Juno 4" and 6" LED smart wafer downlight',
        extend: [m.light({colorTemp: {range: [200, 370], startup: false}})],
    },
    {
        zigbeeModel: ["ABL-LIGHT-Z-201"],
        model: "RB56SC",
        vendor: "Acuity Brands Lighting (ABL)",
        description: 'Juno Retrobasics 4" and 6" LED smart downlight',
        extend: [m.light({colorTemp: {range: [200, 370], startup: false}, color: true})],
    },
    {
        zigbeeModel: ["ABL-LIGHT-Z-202"],
        model: "RB56AC",
        vendor: "Acuity Brands Lighting (ABL)",
        description: 'Juno Retrobasics 4" and 6" LED smart adjustable downlight',
        extend: [m.light({colorTemp: {range: [200, 370], startup: false}, color: true})],
    },
    {
        zigbeeModel: ["ABL-LIGHTSENSOR-Z-001"],
        model: "CPXC 2X4 TUWH",
        vendor: "Acuity Brands Lighting (ABL)",
        description: "Lithonia CPX Connect 2x4 smart tunable white LED troffer with integrated motion sensor",
        extend: [
            // The device advertises xy color in colorCapabilities but emits no
            // light on color commands (tunable-white-only hardware), and ignores
            // the genIdentify identify/triggerEffect commands, so color, effects
            // and identify are all off.
            m.light({colorTemp: {range: [200, 370], startup: false}, effect: false}),
            // The occupancy cluster rejects configureReporting (INVALID_VALUE) but
            // sends unsolicited occupancy reports on its own.
            m.occupancy({reporting: false, pirConfig: ["otu_delay", "uto_delay", "uto_threshold"]}),
        ],
    },
];
