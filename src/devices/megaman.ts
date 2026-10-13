import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "ZLL-DimmableLight", manufacturerName: "Megaman\u0000"}],
        model: "LC201060",
        vendor: "Megaman",
        description: "LED Candle 6W 2700K (Dimmbar)",
        extend: [m.light()],
    },
];

export {definitions};
