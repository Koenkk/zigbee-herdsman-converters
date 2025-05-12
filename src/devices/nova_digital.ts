import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_lmgrbuwf"]),
        model: "NTZB-04 W/B",
        vendor: "Nova Digital",
        description: "4 gang with 2 sockets 4x4",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            device.powerSource = "Mains (single phase)";
            device.save();
        },
        exposes: [
            tuya.exposes.switch().withEndpoint("l1"),
            tuya.exposes.switch().withEndpoint("l2"),
            tuya.exposes.switch().withEndpoint("l3"),
            tuya.exposes.switch().withEndpoint("l4"),
            tuya.exposes.switch().withEndpoint("l5"),
            tuya.exposes.switch().withEndpoint("l6"),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [3, "state_l3", tuya.valueConverter.onOff],
                [4, "state_l4", tuya.valueConverter.onOff],
                [5, "state_l5", tuya.valueConverter.onOff],
                [6, "state_l6", tuya.valueConverter.onOff],
            ],
        },
    },
];
