import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["FB56-SKT17AC1.4"],
        model: "67200BL",
        description: "Vetaar smart plug",
        vendor: "Anchor",
        extend: [m.onOff()],
    },
];
