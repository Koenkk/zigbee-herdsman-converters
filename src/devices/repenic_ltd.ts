import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RD-250ZG"],
        model: "RD-250ZG",
        vendor: "Repenic Ltd.",
        description: "Dimmer",
        extend: [
            m.light({configureReporting: true}),
            m.electricityMeter(),
            m.numeric({
                name: "min_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa000, type: 0x20},
                description: "Minimum brightness (≈1–99%)",
                valueMin: 1,
                valueMax: 99,
            }),
            m.numeric({
                name: "max_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa003, type: 0x20},
                description: "Maximum brightness (≈1–100%)",
                valueMin: 1,
                valueMax: 100,
            }),
            m.numeric({
                name: "start_brightness",
                cluster: "genLevelCtrl",
                attribute: {ID: 0x0011, type: 0x20},
                description: "Default brightness at power-on/startup (0-254)",
                valueMin: 0,
                valueMax: 254,
            }),
            m.binary({
                name: "boost",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xa004, type: 0x20},
                description: "Boost function",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
            }),
            m.enumLookup({
                name: "dimming_mode",
                cluster: "genLevelCtrl",
                attribute: {ID: 0xb000, type: 0x30},
                description: "Dimming mode",
                lookup: {"Leading edge": 0, "Trailing edge": 1},
            }),
            m.numeric({
                name: "default_move_rate",
                cluster: "genLevelCtrl",
                attribute: {ID: 0x0014, type: 0x20},
                description: "Default Move Rate",
                valueMin: 1,
                valueMax: 10,
            }),
        ],
    },
];
