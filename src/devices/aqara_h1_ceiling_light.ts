import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["lumi.light.acn033"],
        model: "lumi.light.acn033",
        vendor: "Aqara",
        description: "H1 ceiling light",
        extend: [
            m.light({colorTemp: {range: [153, 370], startup: false}, effect: false, powerOnBehavior: false}),
            m.enumLookup({
                name: "power_on_behavior",
                lookup: {on: 0, previous: 1, off: 2, inverted: 3},
                cluster: 0xfcc0,
                attribute: {ID: 0x0517, type: 0x20},
                description: "Controls the behavior when the device is powered on after power loss",
                entityCategory: "config",
                access: "ALL",
                zigbeeCommandOptions: {manufacturerCode: 0x115f},
            }),
        ],
    },
];
