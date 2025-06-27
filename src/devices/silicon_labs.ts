import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RB-ElectricityDsp-061-3"],
        model: "RB-ElectricityDsp-061-3",
        vendor: "Silicon Labs",
        description: "Electricity meter",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter()],
    },
];
