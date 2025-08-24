import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: [
            "SLZB-06M",
            "SLZB-06",
            "SLZB-06P7",
            "SLZB-06P10",
            "SLZB-07",
            "SLZB-07P10",
            "SLZB-07P7",
            "SLZB-0xp7",
            "SLZB-07Mg24",
            "SLZB-06Mg24",
            "SLZB-06Mg26",
            "SLZB-MR3 CC2674P10",
        ],
        model: "SLZB-06M",
        vendor: "SMLIGHT",
        description: "Router",
        whiteLabel: [
            {vendor: "SMLIGHT", model: "SLZB-06", description: "Router", fingerprint: [{modelID: "SLZB-06"}]},
            {vendor: "SMLIGHT", model: "SLZB-06P7", description: "Router", fingerprint: [{modelID: "SLZB-06P7"}]},
            {vendor: "SMLIGHT", model: "SLZB-06p10", description: "Router", fingerprint: [{modelID: "SLZB-06P10"}]},
            {vendor: "SMLIGHT", model: "SLZB-07", description: "Router", fingerprint: [{modelID: "SLZB-07"}]},
            {vendor: "SMLIGHT", model: "SLZB-07P10", description: "Router", fingerprint: [{modelID: "SLZB-07P10"}]},
            {vendor: "SMLIGHT", model: "SLZB-07P7", description: "Router", fingerprint: [{modelID: "SLZB-07P7"}]},
            {vendor: "SMLIGHT", model: "SLZB-0xp7", description: "Router", fingerprint: [{modelID: "SLZB-0xp7"}]},
            {vendor: "SMLIGHT", model: "SLZB-07Mg24", description: "Router", fingerprint: [{modelID: "SLZB-07Mg24"}]},
            {vendor: "SMLIGHT", model: "SLZB-06Mg24", description: "Router", fingerprint: [{modelID: "SLZB-06Mg24"}]},
            {vendor: "SMLIGHT", model: "SLZB-06Mg26", description: "Router", fingerprint: [{modelID: "SLZB-06Mg26"}]},
            {vendor: "SMLIGHT", model: "SLZB-MR3", description: "Router", fingerprint: [{modelID: "SLZB-MR3 CC2674P10"}]},
        ],
        extend: [m.linkQuality({reporting: true}), m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
];
