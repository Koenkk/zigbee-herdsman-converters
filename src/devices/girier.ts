import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0001", ["_TZ3000_majwnphg", "_TZ3000_6axxqqi2", "_TZ3000_zw7yf6yk"]),
        model: "JR-ZDS01",
        vendor: "Girier",
        description: "1 gang mini switch",
        extend: [tuya.modernExtend.tuyaBase(), tuya.modernExtend.tuyaOnOff({switchType: true})],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE28C1000000_ntqql63p"]),
        model: "TS0601_GIRIER",
        vendor: "Girier",
        description: "Ceiling presence sensor",
        extend: [tuya.modernExtend.tuyaBase({dp: true, queryOnConfigure: true})],
        exposes: [
            e.occupancy(),
            e.presence(),
            e.enum("presence_state", ea.STATE, ["absence", "presence", "sensor_close"]).withDescription("Presence state reported by the sensor"),
            e
                .numeric("presence_delay", ea.STATE_SET)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(1800)
                .withValueStep(1)
                .withDescription("Delay before reporting absence"),
            e
                .numeric("detection_distance", ea.STATE_SET)
                .withUnit("m")
                .withValueMin(0)
                .withValueMax(7)
                .withValueStep(0.7)
                .withDescription("Maximum enabled detection zone in 0.7 m steps; 0 disables all zones"),
        ],
        meta: {
            tuyaSendCommand: "dataRequest",
            tuyaDatapoints: [
                [
                    1,
                    null,
                    {
                        from: (value: number) => ({
                            presence: value === 1 || value === 2,
                            occupancy: value === 1 || value === 2,
                            presence_state: ({0: "absence", 1: "presence", 2: "sensor_close"} as Record<number, string>)[value],
                        }),
                    },
                ],
                [
                    106,
                    "presence_delay",
                    {
                        from: (value: number) => value,
                        to: (value: number) => {
                            utils.assertNumber(value);
                            if (!Number.isInteger(value) || value < 0 || value > 1800) {
                                throw new Error("presence_delay must be an integer between 0 and 1800");
                            }
                            return value;
                        },
                    },
                ],
                [
                    117,
                    "detection_distance",
                    {
                        from: (value: Buffer) => {
                            const zones = Array.from(value);
                            if (zones.length !== 10 || zones.some((zone) => zone !== 0 && zone !== 1)) return null;
                            const count = zones.filter((zone) => zone === 1).length;
                            // A noncontiguous mask is not representable as one maximum distance.
                            if (zones.some((zone, i) => zone !== (i < count ? 1 : 0))) return null;
                            return Math.round(count * 7) / 10;
                        },
                        to: (value: number) => {
                            utils.assertNumber(value);
                            const count = Math.round(value / 0.7);
                            if (!Number.isFinite(value) || value < 0 || value > 7 || Math.abs(value / 0.7 - count) > 1e-8) {
                                throw new Error("detection_distance must be between 0 and 7 m in 0.7 m steps");
                            }
                            return Array.from({length: 10}, (_, i) => (i < count ? 1 : 0));
                        },
                    },
                ],
            ],
        },
    },
];
