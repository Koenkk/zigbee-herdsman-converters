import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["AirBee"],
        model: "AirBee",
        vendor: "Sensy-One",
        description: "Air quality sensor (CO2, temperature, humidity, pressure)",
        extend: [m.temperature(), m.humidity(), m.pressure(), m.co2(), m.identify()],
    },
];
