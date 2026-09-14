import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["openlumi.gw_router.jn5169", "openlumi.gw_router.dgnwg05lm", "openlumi.gw_router.zhwg11lm"],
        model: "GWRJN5169",
        vendor: "OpenLumi",
        description: "Lumi Router (JN5169)",
        extend: [m.deviceTemperature()],
    },
];
