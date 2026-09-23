import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const ch8zChannels = ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"] as const;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_j0ktmul1"]),
        model: "AUT000069",
        vendor: "AutomatOn",
        description: "Underfloor heating / Irrigation valves controller - 5 zones",
        extend: [
            tuya.modernExtend.tuyaBase(),
            tuya.modernExtend.tuyaOnOff({powerOnBehavior2: true, childLock: true, onOffCountdown: true, endpoints: ["l1", "l2", "l3", "l4", "l5"]}),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ["genOnOff"]);
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_1oft6qso"]),
        model: "CH8Z",
        vendor: "AutomatOn",
        description: "Underfloor heating controller - 8 zones",
        // Tuya datapoints have no ZCL read path; the queries are what populate state.
        extend: [tuya.modernExtend.tuyaBase({dp: true, queryOnConfigure: true, queryOnDeviceAnnounce: true})],
        // All channels are on endpoint 1 and addressed by datapoint.
        endpoint: () => ({l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, l7: 1, l8: 1}),
        exposes: [
            ...ch8zChannels.map((channel) => tuya.exposes.switch().withEndpoint(channel)),
            ...ch8zChannels.map((channel) => tuya.exposes.countdown().withEndpoint(channel)),
            e.power_on_behavior().withAccess(ea.STATE_SET),
            e.child_lock(),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [3, "state_l3", tuya.valueConverter.onOff],
                [4, "state_l4", tuya.valueConverter.onOff],
                [5, "state_l5", tuya.valueConverter.onOff],
                [6, "state_l6", tuya.valueConverter.onOff],
                // DP 7 and 8 are named usb_switch_1/2 in the Tuya specification,
                // a leftover from the power strip template this firmware derives
                // from. They drive physical channels 7 and 8.
                [7, "state_l7", tuya.valueConverter.onOff],
                [8, "state_l8", tuya.valueConverter.onOff],
                [9, "countdown_l1", tuya.valueConverter.countdown],
                [10, "countdown_l2", tuya.valueConverter.countdown],
                [11, "countdown_l3", tuya.valueConverter.countdown],
                [12, "countdown_l4", tuya.valueConverter.countdown],
                [13, "countdown_l5", tuya.valueConverter.countdown],
                [14, "countdown_l6", tuya.valueConverter.countdown],
                [15, "countdown_l7", tuya.valueConverter.countdown],
                [16, "countdown_l8", tuya.valueConverter.countdown],
                [27, "power_on_behavior", tuya.valueConverter.powerOnBehaviorEnum],
                [29, "child_lock", tuya.valueConverter.lockUnlock],
                // DP 17-26 (metering) and DP 28 (indicator mode) are in the
                // Tuya specification but are not implemented by this firmware:
                // they are never reported, and writes to DP 28 have no effect.
                // DP 101/102 (schedules) have an undocumented payload format
                // and were not investigated.
            ],
        },
    },
];
