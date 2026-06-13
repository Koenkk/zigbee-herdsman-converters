import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["CT101xxxx"],
        model: "CT101xxxx",
        vendor: "Chameleon Technology",
        description: "Energy Clamp",
        extend: [m.battery(), m.deviceTemperature(), m.electricityMeter({power: false, voltage: false})],
        exposes: [e.power()],
    },
];
