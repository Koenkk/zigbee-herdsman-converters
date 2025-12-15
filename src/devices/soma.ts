import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SmartShades3"],
        model: "SmartShades3",
        vendor: "SOMA",
        description: "Smart shades 3",
        extend: [m.battery(), m.windowCovering({controls: ["lift", "tilt"]})],
    },
];
