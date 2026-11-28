import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as globalStore from "../lib/store";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;
const favoritePositionKey = "sygonix_favorite_position";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_hva0ao7p"]),
        model: "SY-6872860",
        vendor: "Sygonix",
        description: "Tubular motor",
        extend: [tuya.modernExtend.tuyaBase({dp: true, queryOnConfigure: true, queryOnDeviceAnnounce: true})],
        options: [exposes.options.invert_cover()],
        toZigbee: [
            {
                ...tuya.tz.datapoints,
                convertSet: (entity, key, value, meta) => {
                    utils.assertEndpoint(entity);
                    if (["favorite_position", "cover_limit", "motor_direction"].some((property) => property in meta.message)) {
                        globalStore.clearValue(meta.device, favoritePositionKey);
                    }
                    return tuya.tz.datapoints.convertSet(entity, key, value, meta);
                },
                convertGet: async (entity, key, meta) => {
                    utils.assertEndpoint(entity);
                    if (key !== "position") throw new Error(`Getting '${key}' is not supported`);
                    globalStore.clearValue(meta.device, favoritePositionKey);
                    await entity.command("manuSpecificTuya", "dataQuery", {});
                },
            },
        ],
        onEvent: async (event) => {
            if (event.type === "stop") {
                globalStore.clearValue(event.data.ieeeAddr, favoritePositionKey);
            } else if (event.type === "start" || event.type === "deviceAnnounce") {
                globalStore.clearValue(event.data.device, favoritePositionKey);
                if (event.type === "start") {
                    await event.data.device.endpoints[0]
                        .command("manuSpecificTuya", "dataQuery", {})
                        .catch((error) => logger.warning(`Failed to query Sygonix status on startup: ${error}`, "zhc:sygonix"));
                }
            }
        },
        exposes: [
            e.cover_position(),
            e.battery(),
            tuya.exposes.motorState(),
            tuya.exposes
                .motorDirection()
                .withDescription("Motor rotation direction. Changing direction clears the limit positions and preferred position"),
            e
                .enum("cover_limit", ea.SET, ["up", "down"])
                .withDescription("Move to the desired position, stop, then save it as the upper or lower limit")
                .withCategory("config"),
            tuya.exposes
                .favoritePosition()
                .withDescription("Preferred position in the motor's native scale (not affected by invert_cover); 0 means unset"),
            e
                .enum("goto_favorite", ea.SET, ["recall"])
                .withLabel("Go to favorite")
                .withDescription("Move to the preferred position reported by the motor"),
            e.numeric("travel_time", ea.STATE).withUnit("ms").withDescription("Calibrated travel time").withCategory("diagnostic"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "motor_state",
                    {
                        from: (value, meta, options) =>
                            utils.getFromLookup(options.invert_cover ? 2 - value : value, {0: "opening", 1: "stopped", 2: "closing"}),
                    },
                ],
                [
                    1,
                    "state",
                    {
                        to: (value, meta) =>
                            tuya.valueConverter.coverAction.to(
                                meta.options.invert_cover
                                    ? utils.getFromLookup(value, {OPEN: "CLOSE", CLOSE: "OPEN", STOP: "STOP", CONTINUE: "CONTINUE"})
                                    : value,
                                meta,
                            ),
                    },
                    {optimistic: false},
                ],
                // DP2 = set, DP3 = report
                [2, "position", {to: tuya.valueConverter.coverPosition.to}, {optimistic: false}],
                [
                    2,
                    "goto_favorite",
                    {
                        to: (value, meta) => {
                            if (value !== "recall") throw new Error("goto_favorite must be 'recall'");
                            const position = globalStore.getValue(meta.device, favoritePositionKey);
                            if (position === undefined) throw new Error("Favorite position has not been reported; query the current position first");
                            if (!Number.isInteger(position) || position < 1 || position > 100) {
                                throw new Error("Favorite position is unset or invalid; the motor must report an integer from 1 to 100");
                            }
                            return position;
                        },
                    },
                    {optimistic: false},
                ],
                [
                    3,
                    null,
                    {
                        from: (value, meta, options) => {
                            const position = options.invert_cover ? 100 - value : value;
                            return {position, state: position === 0 ? "CLOSE" : "OPEN"};
                        },
                    },
                ],
                [5, "motor_direction", tuya.valueConverter.tubularMotorDirection],
                [10, "travel_time", tuya.valueConverter.raw],
                [13, "battery", tuya.valueConverter.raw],
                [16, "cover_limit", tuya.valueConverterBasic.lookup({up: tuya.enum(0), down: tuya.enum(1)})],
                [
                    19,
                    "favorite_position",
                    {
                        ...tuya.valueConverter.raw,
                        from: (value, meta) => {
                            // Recall only confirmed native values, never retained or optimistic MQTT state.
                            globalStore.putValue(meta.device, favoritePositionKey, value);
                            return value;
                        },
                    },
                    {optimistic: false},
                ],
            ],
        },
    },
];
