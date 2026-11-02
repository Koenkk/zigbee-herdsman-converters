import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0002", ["_TZ3210_5ksufhqi"]),
        model: "NFZB-2",
        vendor: "Nova Digital",
        description: "2-Gang switch with backlight, countdown and inching",
        extend: [
            tuya.modernExtend.tuyaBase(),
            tuya.modernExtend.tuyaOnOff({
                powerOutageMemory: true,
                backlightModeOffOn: true,
                indicatorMode: true,
                onOffCountdown: true,
                inchingSwitch: true,
                endpoints: ["l1", "l2"],
            }),
            tuya.clusters.addTuyaCommonPrivateCluster(),
        ],
        endpoint: () => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_dqy15zxy"]),
        model: "ZCMR-1",
        vendor: "Nova Digital",
        description: "Roller blind motor",
        extend: [
            tuya.modernExtend.tuyaBase({
                dp: true,
                queryOnConfigure: true,
            }),
        ],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e
                .enum("reverse_direction", ea.STATE_SET, ["forward", "back"])
                .withDescription("Reverse the motor direction. This resets the upper and lower limits; recalibrate them using border afterwards."),
            e.enum("border", ea.SET, ["up", "down"]).withDescription("Store the current position as the upper or lower limit"),
            e
                .enum("situation_set", ea.STATE, ["fully_open", "fully_close"])
                .withDescription("Indicates whether 100% represents fully open or fully closed"),
            e.numeric("travel_time", ea.STATE).withUnit("ms").withDescription("Total calibrated travel time"),
            e
                .numeric("position_best", ea.STATE)
                .withValueMin(0)
                .withValueMax(100)
                .withUnit("%")
                .withDescription("Preset position stored by the motor"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "state",
                    tuya.valueConverterBasic.lookup({
                        OPEN: tuya.enum(0),
                        STOP: tuya.enum(1),
                        CLOSE: tuya.enum(2),
                    }),
                ],
                [2, "position", tuya.valueConverter.coverPosition],
                [3, "position", tuya.valueConverter.coverPosition],
                [
                    5,
                    "reverse_direction",
                    tuya.valueConverterBasic.lookup({
                        forward: tuya.enum(0),
                        back: tuya.enum(1),
                    }),
                ],
                [10, "travel_time", tuya.valueConverter.raw],
                [
                    11,
                    "situation_set",
                    tuya.valueConverterBasic.lookup({
                        fully_open: tuya.enum(0),
                        fully_close: tuya.enum(1),
                    }),
                ],
                [
                    16,
                    "border",
                    tuya.valueConverterBasic.lookup({
                        up: tuya.enum(0),
                        down: tuya.enum(1),
                        up_delete: tuya.enum(2),
                        down_delete: tuya.enum(3),
                        remove_top_bottom: tuya.enum(4),
                    }),
                ],
                [19, "position_best", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_tdhnhhiy"]),
        model: "SYZB-6W",
        vendor: "Nova Digital",
        description: "6 gang switch 4x4 with backlight and power_behavior",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        configure: async (device, coordinatorEndpoint) => {
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
            tuya.exposes.powerOnBehavior(),
            e.binary("backlight_switch", ea.STATE_SET, "ON", "OFF").withDescription("Backlight switch"),
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
                [
                    14,
                    "power_on_behavior",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        on: tuya.enum(1),
                        previous: tuya.enum(2),
                    }),
                ],
                [16, "backlight_switch", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_nvxorhcj"]),
        model: "ZTS-8W-B",
        vendor: "Nova Digital",
        description: "8 gang switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.switch().withEndpoint("l4"),
            e.switch().withEndpoint("l5"),
            e.switch().withEndpoint("l6"),
            e.switch().withEndpoint("l7"),
            e.switch().withEndpoint("l8"),
            e.enum("power_on_behavior", ea.STATE_SET, ["off", "on", "previous"]).withDescription("Power On Behavior Status"),
            e.enum("backlight_mode", ea.STATE_SET, ["off", "relay", "position"]).withDescription("Status indicator"),
        ],
        endpoint: () => ({l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, l7: 1, l8: 1}),
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [3, "state_l3", tuya.valueConverter.onOff],
                [4, "state_l4", tuya.valueConverter.onOff],
                [5, "state_l5", tuya.valueConverter.onOff],
                [6, "state_l6", tuya.valueConverter.onOff],
                [101, "state_l7", tuya.valueConverter.onOff],
                [102, "state_l8", tuya.valueConverter.onOff],
                [
                    14,
                    "power_on_behavior",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        on: tuya.enum(1),
                        previous: tuya.enum(2),
                    }),
                ],
                [
                    15,
                    "backlight_mode",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        relay: tuya.enum(1),
                        position: tuya.enum(2),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_kow4ok3t"]),
        model: "ZTS-8B",
        vendor: "Nova Digital",
        description: "8 gang switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            tuya.exposes.switch().withEndpoint("l1"),
            tuya.exposes.switch().withEndpoint("l2"),
            tuya.exposes.switch().withEndpoint("l3"),
            tuya.exposes.switch().withEndpoint("l4"),
            tuya.exposes.switch().withEndpoint("l5"),
            tuya.exposes.switch().withEndpoint("l6"),
            tuya.exposes.switch().withEndpoint("l7"),
            tuya.exposes.switch().withEndpoint("l8"),
            e.power_on_behavior(["off", "on", "previous"]).withDescription("PowerOnBehavior Status"),
            e.binary("backlight_switch", ea.STATE_SET, "ON", "OFF").withDescription("Backlight switch"),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1, l7: 1, l8: 1};
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
                [101, "state_l7", tuya.valueConverter.onOff],
                [102, "state_l8", tuya.valueConverter.onOff],
                [14, "power_on_behavior", tuya.valueConverter.powerOnBehaviorEnum],
                [16, "backlight_switch", tuya.valueConverter.onOff],
            ],
        },
    },
];
