import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TERNCY-WS01-S4"],
        model: "TERNCY-WS01",
        vendor: "TERNCY",
        description: "Smart light switch - 4 gang without neutral wire",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}), m.onOff({endpointNames: ["l1", "l2", "l3", "l4"]})],
    },
    {
        zigbeeModel: ["DL001"],
        model: "DL001",
        vendor: "TERNCY",
        description: "Two color temperature intelligent downlight",
        extend: [m.light({colorTemp: {range: [156, 476]}})],
    },
    {
        zigbeeModel: ["TERNCY-DC01"],
        model: "TERNCY-DC01",
        vendor: "TERNCY",
        description: "Temperature & contact sensor ",
        fromZigbee: [fz.terncy_temperature, fz.terncy_contact, fz.battery],
        toZigbee: [],
        exposes: [e.temperature(), e.contact(), e.battery()],
        meta: {battery: {dontDividePercentage: true}},
    },
    {
        zigbeeModel: ["TERNCY-PP01"],
        model: "TERNCY-PP01",
        vendor: "TERNCY",
        description: "Awareness switch",
        fromZigbee: [fz.terncy_temperature, fz.occupancy_with_timeout, fz.terncy_raw, fz.battery],
        exposes: [e.temperature(), e.occupancy(), e.action(["single", "double", "triple", "quadruple"])],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["TERNCY-SD01"],
        model: "TERNCY-SD01",
        vendor: "TERNCY",
        description: "Knob smart dimmer",
        fromZigbee: [fz.terncy_raw, fz.terncy_knob, fz.battery],
        toZigbee: [],
        ota: true,
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.battery(), e.action(["single", "double", "triple", "quadruple", "rotate"]), e.text("direction", ea.STATE)],
    },
    {
        zigbeeModel: ["TERNCY-LS01"],
        model: "TERNCY-LS01",
        vendor: "TERNCY",
        description: "Smart light socket",
        exposes: [e.switch(), e.action(["single"])],
        fromZigbee: [fz.on_off, fz.terncy_raw],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["CL001"],
        model: "CL001",
        vendor: "TERNCY",
        description: "Beevon ceiling light",
        ota: true,
        extend: [m.light({colorTemp: {range: [50, 500]}, powerOnBehavior: false, effect: false})],
    },
];
