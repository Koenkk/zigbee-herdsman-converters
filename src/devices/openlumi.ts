import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["openlumi.gw_router.dgnwg05lm"],
        model: "LR-DGNWG05LM",
        vendor: "OpenLumi",
        description: "Lumi Router (for Xiaomi DGNWG05LM)",
        version: "0.0.1",
        extend: [m.deviceTemperature({reporting: {min: "5_MINUTES", max: "1_HOUR", change: 1}})],
    },
    {
        zigbeeModel: ["openlumi.gw_router.zhwg11lm"],
        model: "LR-ZHWG11LM",
        vendor: "OpenLumi",
        description: "Lumi Router (for Aqara ZHWG11LM)",
        version: "0.0.1",
        extend: [m.deviceTemperature({reporting: {min: "5_MINUTES", max: "1_HOUR", change: 1}})],
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
