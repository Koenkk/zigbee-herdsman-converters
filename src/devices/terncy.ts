import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

interface AduroSmart {
    attributes: {
        terncyRotation: number;
    };
    commands: {
        cmd0: {iD: 0x00; parameters: []};
    };
    commandResponses: never;
}

const terncyExtend = {
    addClusterAduroSmart: () =>
        m.deviceAddCustomCluster("manuSpecificClusterAduroSmart", {
            ID: 0xfccc,
            attributes: {
                terncyRotation: {ID: 0x001b, type: Zcl.DataType.UINT16},
            },
            commands: {
                cmd0: {ID: 0x00, parameters: []},
            },
            commandsResponse: {},
        }),
    contact: () =>
        m.binary<"genBinaryInput", undefined>({
            name: "contact",
            cluster: "genBinaryInput",
            attribute: "presentValue",
            valueOn: [true, 1],
            valueOff: [false, 0],
            description: "Indicates if the contact is closed (= true) or open (= false)",
        }),
};

const fzLocal = {
    terncy_knob: {
        cluster: "manuSpecificClusterAduroSmart",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (typeof msg.data.terncyRotation === "number") {
                const direction = msg.data.terncyRotation > 0 ? "clockwise" : "counterclockwise";
                const number = Math.abs(msg.data.terncyRotation) / 12;
                return {action: "rotate", action_direction: direction, action_number: number};
            }
        },
    } satisfies Fz.Converter<"manuSpecificClusterAduroSmart", AduroSmart, ["attributeReport", "readResponse"]>,
    terncy_raw: {
        cluster: "manuSpecificClusterAduroSmart",
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            // 13,40,18,104, 0,8,1 - single
            // 13,40,18,22,  0,17,1
            // 13,40,18,32,  0,18,1
            // 13,40,18,6,   0,16,1
            // 13,40,18,111, 0,4,2 - double
            // 13,40,18,58,  0,7,2
            // 13,40,18,6,   0,2,3 - triple
            // motion messages:
            // 13,40,18,105, 4,167,0,7 - motion on right side
            // 13,40,18,96,  4,27,0,5
            // 13,40,18,101, 4,27,0,7
            // 13,40,18,125, 4,28,0,5
            // 13,40,18,85,  4,28,0,7
            // 13,40,18,3,   4,24,0,5
            // 13,40,18,81,  4,10,1,7
            // 13,40,18,72,  4,30,1,5
            // 13,40,18,24,  4,25,0,40 - motion on left side
            // 13,40,18,47,  4,28,0,56
            // 13,40,18,8,   4,32,0,40
            let value = null;
            if (msg.data[4] === 0) {
                value = msg.data[6];
                if (1 <= value && value <= 3) {
                    const actionLookup: KeyValueAny = {1: "single", 2: "double", 3: "triple", 4: "quadruple"};
                    return {action: actionLookup[value]};
                }
            } else if (msg.data[4] === 4) {
                value = msg.data[7];
                const sidelookup: KeyValueAny = {5: "right", 7: "right", 40: "left", 56: "left"};
                if (sidelookup[value]) {
                    const newMsg = {...msg, type: "attributeReport" as const, data: {occupancy: 1}};
                    const payload = fz.occupancy_with_timeout.convert(model, newMsg, publish, options, meta) as KeyValueAny;
                    if (payload) {
                        payload.action_side = sidelookup[value];
                        payload.side = sidelookup[value]; /* legacy: remove this line (replaced by action_side) */
                    }

                    return payload;
                }
            }
        },
    } satisfies Fz.Converter<"manuSpecificClusterAduroSmart", AduroSmart, "raw">,
};

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
        extend: [m.temperature({scale: 10}), terncyExtend.contact(), m.battery({dontDividePercentage: true})],
    },
    {
        zigbeeModel: ["TERNCY-PP01"],
        model: "TERNCY-PP01",
        vendor: "TERNCY",
        description: "Awareness switch",
        fromZigbee: [fz.occupancy_with_timeout, fzLocal.terncy_raw, fz.battery],
        exposes: [e.occupancy(), e.action(["single", "double", "triple", "quadruple"])],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        extend: [terncyExtend.addClusterAduroSmart(), m.temperature({scale: 10}), m.illuminance()],
    },
    {
        zigbeeModel: ["TERNCY-SD01"],
        model: "TERNCY-SD01",
        vendor: "TERNCY",
        description: "Knob smart dimmer",
        fromZigbee: [fzLocal.terncy_raw, fzLocal.terncy_knob, fz.battery],
        toZigbee: [],
        extend: [terncyExtend.addClusterAduroSmart()],
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
        fromZigbee: [fz.on_off, fzLocal.terncy_raw],
        toZigbee: [tz.on_off],
        extend: [terncyExtend.addClusterAduroSmart()],
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
