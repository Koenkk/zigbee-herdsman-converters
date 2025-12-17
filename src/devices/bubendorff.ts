import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Roller Shutter with RU motor"],
        model: "Roller Shutter with RU motor",
        vendor: "Bubendorff",
        description: "Bubendorff Roller Shutter with RU motor",
        extend: [m.windowCovering({controls: ["lift", "tilt"]})],
    },
];
