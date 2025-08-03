import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Mini1", "1 Mini"],
        model: "S4SW-001X8EU",
        vendor: "Shelly",
        description: "1 Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        fingerprint: [{modelID: "1", manufacturerName: "Shelly"}],
        model: "S4SW-001X16EU",
        vendor: "Shelly",
        description: "1 Gen 4",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["Mini1PM", "1PM Mini"],
        model: "S4SW-001P8EU",
        vendor: "Shelly",
        description: "1PM Mini Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter({producedEnergy: true, acFrequency: true})],
    },
    {
        zigbeeModel: ["1PM"],
        model: "S4SW-001P16EU",
        vendor: "Shelly",
        description: "1PM Gen 4",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter({producedEnergy: true, acFrequency: true})],
    },
    {
        zigbeeModel: ["2PM"],
        model: "2PM",
        vendor: "Shelly",
        description: "2PM Gen4",
        extend: [m.windowCovering({controls: ["lift","tilt"]})],
    },
];
