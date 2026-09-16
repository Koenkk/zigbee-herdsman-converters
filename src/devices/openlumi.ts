import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["openlumi.gw_router.dgnwg05lm"],
        model: "LR-DGNWG05LM",
        vendor: "OpenLumi",
        description: "Lumi Router (for Xiaomi DGNWG05LM)",
        extend: [m.deviceTemperature()],
    },
    {
        zigbeeModel: ["openlumi.gw_router.zhwg11lm"],
        model: "LR-ZHWG11LM",
        vendor: "OpenLumi",
        description: "Lumi Router (for Aqara ZHWG11LM)",
        extend: [m.deviceTemperature()],
    },
    // Legacy unified firmware for DGNWG05LM and ZHWG11LM; kept for backward-compatible detection.
    {
        zigbeeModel: ["openlumi.gw_router.jn5169"],
        model: "GWRJN5169",
        vendor: "OpenLumi",
        description: "Lumi Router (outdated firmware, update required)",
        extend: [m.deviceTemperature()],
    },
];
