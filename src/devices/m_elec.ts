import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ML-ST-D200"],
        model: "ML-ST-D200",
        vendor: "M-ELEC",
        description: "Stitchy dim switchable wall module",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["ML-ST-D200-NF"],
        model: "ML-ST-D200-NF",
        vendor: "M-ELEC",
        description: "Stitchy dim neutral free switchable wall module",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["ML-ST-BP-DIM"],
        model: "ML-ST-BP-DIM",
        vendor: "M-ELEC",
        description: "Stitchy dim mechanism",
        extend: [m.light({effect: false})],
    },
    {
        zigbeeModel: ["ML-ST-R200"],
        model: "ML-ST-R200",
        vendor: "M-ELEC",
        description: "Stitchy switchable wall module",
        extend: [m.onOff()],
    },
];
