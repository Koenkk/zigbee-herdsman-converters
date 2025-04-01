import * as m from "../lib/modernExtend";
import type { DefinitionWithExtend } from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        extend: [m.onOff({ powerOnBehavior: false })],
    },
    {
        fingerprint: [{ modelID: "1", manufacturerName: "Shelly" }],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 gen 4",
        extend: [m.onOff({ powerOnBehavior: false })],
    },
    {
        zigbeeModel: ["Mini1PM"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        extend: [
            m.onOff({ powerOnBehavior: false }),
            m.electricityMeter({ energy: false, producedEnergy: true, acFrequency: true }),
        ],
    },
    {
        zigbeeModel: ["1PM"],
        model: "S4SW-001P16EU",
        vendor: "Shelly",
        description: "1PM Gen 4",
        extend: [
            m.onOff({ powerOnBehavior: false }),
            m.electricityMeter({ energy: false, producedEnergy: true, acFrequency: true }),
        ],
    },
];
