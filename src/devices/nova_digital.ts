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
];
