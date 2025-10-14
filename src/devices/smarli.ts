import * as m from "../lib/modernExtend";
import * as sunricher from "../lib/sunricher";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["S-ZB-PDM1-R251"],
        model: "S-ZB-PDM1-R251",
        vendor: "smarli.",
        description: "Phase dimmer gen 1",
        extend: [m.light({configureReporting: true}), m.electricityMeter(), sunricher.extend.externalSwitchType(), sunricher.extend.minimumPWM()],
    },
];
