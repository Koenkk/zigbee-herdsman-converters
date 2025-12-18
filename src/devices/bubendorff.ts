import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Roller Shutter with RU motor"],
        model: "MONO iD4",
        vendor: "Bubendorff",
        description: "Rroller shutter",
        extend: [m.windowCovering({controls: ["lift", "tilt"]})],
    },
];
