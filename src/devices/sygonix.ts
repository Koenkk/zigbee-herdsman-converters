import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as globalStore from "../lib/store";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, KeyValue, Tuya} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;
const favoriteCacheKey = "sygonix_favorite_native";
const pendingStopKey = "sygonix_stop_pending";
const validReportedPosition = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
const coverCommands = tuya.valueConverterBasic.lookup((options) =>
    options.invert_cover
        ? {OPEN: tuya.enum(2), STOP: tuya.enum(1), CLOSE: tuya.enum(0)}
        : {OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)},
);
const reportedMovement = tuya.valueConverterBasic.lookup((options) =>
    options.invert_cover
        ? {opening: tuya.enum(2), stopped: tuya.enum(1), closing: tuya.enum(0)}
        : {opening: tuya.enum(0), stopped: tuya.enum(1), closing: tuya.enum(2)},
);
const motorDirection = tuya.valueConverterBasic.lookup({normal: tuya.enum(0), reversed: tuya.enum(1)});
const coverLimit = tuya.valueConverterBasic.lookup({up: tuya.enum(0), down: tuya.enum(1)});
const validNativeFavorite = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100;
const favoriteToDisplay = (value: unknown, options: KeyValue) => (validNativeFavorite(value) ? (options.invert_cover ? 100 - value : value) : null);
const favoriteToNative = (value: number, options: KeyValue) => {
    const native = options.invert_cover ? 100 - value : value;
    if (!Number.isInteger(value) || !validNativeFavorite(native)) {
        const range = options.invert_cover ? "0-99" : "1-100";
        throw new Error(`Favorite position must be an integer in ${range}; native zero is an unset preset`);
    }
    return native;
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_hva0ao7p"]),
        model: "SY-6872860",
        vendor: "Sygonix",
        description: "Tubular motor",
        exposes: (_device, options = {}) => [
            tuya.exposes.coverPosition(),
            tuya.exposes.motorState(),
            e.battery().withDescription("Battery level reported by the motor in %"),
            tuya.exposes
                .motorDirection()
                .withDescription("Motor rotation direction. Changing this clears the upper and lower limits; set both limits again afterwards."),
            e
                .enum("cover_limit", ea.SET, ["up", "down"])
                .withCategory("config")
                .withDescription("Store the current position as the upper or lower limit"),
            e
                .numeric("favorite_position", ea.STATE_SET)
                .withUnit("%")
                .withValueMin(options.invert_cover ? 0 : 1)
                .withValueMax(options.invert_cover ? 99 : 100)
                .withValueStep(1)
                .withCategory("config")
                .withDescription("Store the preferred cover position. An unset preset is reported as unknown."),
            e
                .enum("goto_favorite", ea.SET, ["recall"])
                .withLabel("Go to favorite")
                .withDescription("Move to the preferred position last reported by the motor"),
            e
                .numeric("travel_time", ea.STATE)
                .withUnit("ms")
                .withCategory("diagnostic")
                .withDescription("Total calibrated travel time reported by the motor"),
            e
                .enum("situation_set", ea.STATE, ["fully_open", "fully_close"])
                .withLabel("Position orientation")
                .withCategory("diagnostic")
                .withDescription("Whether the motor defines 100% as fully open or fully closed"),
        ],
        options: [exposes.options.invert_cover()],
        onEvent: async (event) => {
            if (event.type !== "start") return;
            const device = event.data.device;
            globalStore.clearValue(device, favoriteCacheKey);
            globalStore.clearValue(device, pendingStopKey);
            try {
                await device.getEndpoint(1).command("manuSpecificTuya", "dataQuery", {});
            } catch (error) {
                logger.warning(`Failed to query Sygonix status on startup: ${String(error)}`, "zhc:sygonix");
            }
        },
        extend: [
            tuya.modernExtend.tuyaBase({
                dp: true,
                queryOnConfigure: true,
                queryOnDeviceAnnounce: true,
            }),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    null,
                    {
                        from: (value, meta, options, _publish, msg) => {
                            if (value === 1) {
                                const hasPosition = msg.data.dpValues.some(
                                    (dp: Tuya.DpValue) => dp.dp === 3 && validReportedPosition(tuya.getDataValue(dp)),
                                );
                                if (!hasPosition) {
                                    // STOP precedes the final position; publish both together when it arrives.
                                    globalStore.putValue(meta.device, pendingStopKey, true);
                                    return {};
                                }
                                globalStore.clearValue(meta.device, pendingStopKey);
                                return {motor_state: "stopped"};
                            }
                            globalStore.clearValue(meta.device, pendingStopKey);
                            return {motor_state: reportedMovement.from(value, meta, options)};
                        },
                    },
                ],
                [1, "state", {to: coverCommands.to}, {optimistic: false}],
                // A target echo is not a measured position.
                [2, null, {from: () => ({})}],
                [2, "position", {to: tuya.valueConverter.coverPosition.to}, {optimistic: false}],
                [
                    2,
                    "goto_favorite",
                    {
                        to: (value, meta) => {
                            if (value !== "recall") throw new Error("goto_favorite only accepts recall");
                            const native = globalStore.getValue(meta.device, favoriteCacheKey);
                            if (!validNativeFavorite(native)) {
                                throw new Error("Preferred position is unset or has not been reported since startup");
                            }
                            // The cached native percentage must not be inverted a second time.
                            return native;
                        },
                    },
                    {optimistic: false},
                ],
                [
                    3,
                    null,
                    {
                        from: (value, meta, options) => {
                            if (!validReportedPosition(value)) return {};
                            const position = options.invert_cover ? 100 - value : value;
                            const result: KeyValue = {position, state: position === 0 ? "CLOSE" : "OPEN"};
                            if (globalStore.getValue(meta.device, pendingStopKey, false)) {
                                globalStore.clearValue(meta.device, pendingStopKey);
                                result.motor_state = "stopped";
                            }
                            return result;
                        },
                    },
                ],
                [
                    5,
                    "motor_direction",
                    {
                        from: motorDirection.from,
                        to: (value, meta) => {
                            const direction = motorDirection.to(value, meta);
                            globalStore.clearValue(meta.device, favoriteCacheKey);
                            return direction;
                        },
                    },
                    {optimistic: false},
                ],
                [10, "travel_time", {from: tuya.valueConverter.raw.from}],
                [11, "situation_set", {from: tuya.valueConverterBasic.lookup({fully_open: tuya.enum(0), fully_close: tuya.enum(1)}).from}],
                [13, "battery", {from: tuya.valueConverter.raw.from}],
                [16, null, {from: () => ({})}],
                [
                    16,
                    "cover_limit",
                    {
                        to: (value, meta) => {
                            const limit = coverLimit.to(value, meta);
                            globalStore.clearValue(meta.device, favoriteCacheKey);
                            return limit;
                        },
                    },
                    {optimistic: false},
                ],
                [
                    19,
                    "favorite_position",
                    {
                        from: (value, meta, options) => {
                            if (validNativeFavorite(value)) globalStore.putValue(meta.device, favoriteCacheKey, value);
                            else globalStore.clearValue(meta.device, favoriteCacheKey);
                            return favoriteToDisplay(value, options);
                        },
                        to: (value, meta) => {
                            const native = favoriteToNative(value, meta.options);
                            // Only an incoming report confirms a newly stored favorite.
                            globalStore.clearValue(meta.device, favoriteCacheKey);
                            return native;
                        },
                    },
                    {optimistic: false},
                ],
            ],
        },
    },
];
