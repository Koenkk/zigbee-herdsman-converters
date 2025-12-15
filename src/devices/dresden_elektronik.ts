import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["FLS-PP3", "FLS-PP3\u0000", "FLS-PP3 White\u0000"],
        model: "Mega23M12",
        vendor: "Dresden Elektronik",
        description: "Zigbee Light Link wireless electronic ballast",
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {rgb: 10, white: 11}}),
            m.light({colorTemp: {range: undefined}, color: true, endpointNames: ["rgb", "white"]}),
        ],
    },
    {
        zigbeeModel: ["FLS-M"],
        model: "FLS-M",
        vendor: "Dresden Elektronik",
        description: "Universal led controller",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5}}), m.light({endpointNames: ["l1", "l2", "l3", "l4", "l5"]})],
    },
    {
        zigbeeModel: ["FLS-CT"],
        model: "XVV-Mega23M12",
        vendor: "Dresden Elektronik",
        description: "Zigbee Light Link wireless electronic ballast color temperature",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["Kobold"],
        model: "BN-600110",
        vendor: "Dresden Elektronik",
        description: "Zigbee 3.0 dimm actuator",
        extend: [m.light()],
        ota: true,
    },
    {
        zigbeeModel: ["Hive"],
        model: "Hive",
        vendor: "Phoscon",
        description: "Battery powered smart LED light",
        ota: true,
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true}), m.battery()],
    },
    {
        zigbeeModel: ["FLS-A lp (1-10V)"],
        model: "BN-600078",
        vendor: "Dresden Elektronik",
        description: "Zigbee controller for 1-10V/PWM",
        extend: [m.deviceEndpoints({endpoints: {l1: 11, l2: 12, l3: 13, l4: 14}}), m.light({endpointNames: ["l1", "l2", "l3", "l4"]})],
        meta: {disableDefaultResponse: true},
    },
];
