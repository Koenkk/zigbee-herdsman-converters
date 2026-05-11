import * as m from "../lib/modernExtend";
import type {Definition} from "../lib/types";

const definitions: Definition[] = [
    {
        zigbeeModel: ["ZLL-DimmableLight"],
        model: "LC201060",
        vendor: "Megaman",
        description: "LED Candle 6W 2700K (Dimmbar)",
        extend: [m.light()],
    },
];

export default definitions;
