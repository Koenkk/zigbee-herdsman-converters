import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SM0502"],
        model: "SM0502",
        vendor: "SIMON",
        description: "i7 2-gang smart dimming switch",
        extend: [m.deviceEndpoints({endpoints: {left: 1, right: 2}}), m.light({endpointNames: ["left", "right"]})],
    },
    {
        zigbeeModel: ["SM0501"],
        model: "SM0501",
        vendor: "SIMON",
        description: "3 gang smart dimming switch",
        extend: [m.deviceEndpoints({endpoints: {left: 1, center: 3, right: 4}}), m.light({endpointNames: ["left", "center", "right"]})],
    },
];
