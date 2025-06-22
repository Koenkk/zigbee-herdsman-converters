import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RB-ElectricityDsp-061-3"],
        model: "RB-ElectricityDsp-061-3",
        vendor: "siliconLabs",
        description: "Automatically generated definition",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter()],
        meta: {},
    },
];
