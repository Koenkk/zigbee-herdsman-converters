import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const convLocal = {
    novaDigitalToDmBrightness: {
        from: (value: unknown) => {
            const clamped = Math.max(10, Math.min(1000, Number(value) || 10));
            return Math.round(((clamped - 10) * 254) / 990);
        },

        to: (value: unknown) => {
            const clamped = Math.max(0, Math.min(254, Number(value) || 0));
            return Math.round(10 + (clamped * 990) / 254);
        },
    },
    novaDigitalToDmBrightnessPercent: {
        from: (value: unknown) => {
            const clamped = Math.max(10, Math.min(1000, Number(value) || 10));
            return Math.round(clamped / 10);
        },

        to: (value: unknown) => {
            const clamped = Math.max(1, Math.min(100, Number(value) || 1));
            return Math.round(clamped * 10);
        },
    },
    novaDigitalToWkInching: {
        from: (value: unknown) => {
            const buffer = Buffer.isBuffer(value)
                ? value
                : typeof value === "string"
                  ? Buffer.from(value, "base64")
                  : Array.isArray(value)
                    ? Buffer.from(value)
                    : Buffer.alloc(0);

            if (buffer.length < 3) {
                return 0;
            }

            const enabled = buffer.readUInt8(0) === 1;
            const totalSeconds = buffer.readUInt16BE(1);

            return enabled ? totalSeconds : 0;
        },

        to: (value: unknown) => {
            const totalSeconds = Math.max(0, Math.min(3600, Number(value) || 0));

            const buffer = Buffer.alloc(3);
            buffer.writeUInt8(totalSeconds > 0 ? 1 : 0, 0);
            buffer.writeUInt16BE(totalSeconds > 0 ? totalSeconds : 1, 1);

            return buffer.toString("base64");
        },
    },
    novaDigitalToWk2InchingFrom: {
        from: (value: unknown) => {
            if (value === undefined || value === null) {
                return {};
            }

            let rawValue = "";

            if (Buffer.isBuffer(value)) {
                rawValue = value.toString("utf8");
            } else if (Array.isArray(value)) {
                rawValue = Buffer.from(value).toString("utf8");
            } else {
                rawValue = String(value);
            }

            const result: Record<string, number> = {};

            for (let i = 0; i < rawValue.length; i += 4) {
                const block = rawValue.substring(i, i + 4);

                if (block.length < 4) {
                    continue;
                }

                const buffer = Buffer.from(block, "base64");

                if (buffer.length < 3) {
                    continue;
                }

                const controlByte = buffer.readUInt8(0);
                const seconds = buffer.readUInt16BE(1);

                let channel = 1;
                let enabled = false;

                if (controlByte === 0 || controlByte === 1) {
                    channel = 1;
                    enabled = controlByte === 1;
                } else {
                    channel = Math.trunc(Math.log2(controlByte)) + 1;
                    enabled = controlByte % 2 === 1;
                }

                if (channel === 1) {
                    result.inching_l1 = enabled ? seconds : 0;
                }

                if (channel === 2) {
                    result.inching_l2 = enabled ? seconds : 0;
                }
            }

            return result;
        },
    },
    novaDigitalToWk2InchingTo: (channel: number) => ({
        to: (value: unknown) => {
            const totalSeconds = Math.max(0, Math.min(3600, Number(value) || 0));

            let controlByte = totalSeconds > 0 ? 1 : 0;

            if (channel !== 1) {
                controlByte += 2 ** (channel - 1);
            }

            const buffer = Buffer.alloc(3);
            buffer.writeUInt8(controlByte, 0);
            buffer.writeUInt16BE(totalSeconds > 0 ? totalSeconds : 1, 1);

            return buffer.toString("base64");
        },
    }),
};

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
