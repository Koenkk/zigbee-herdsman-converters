import {forcePowerSource, light} from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZDM150"],
        model: "ZDM150",
        vendor: "Enkin",
        description: "150W Dimmer module",
        extend: [light({powerOnBehavior: false, effect: false, configureReporting: true}), forcePowerSource({powerSource: "Mains (single phase)"})],
    },
];
