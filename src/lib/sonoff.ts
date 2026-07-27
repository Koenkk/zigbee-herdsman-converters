import {logger} from "./logger";
import type {Fz, KeyValue} from "./types";

const NS = "zhc:sonoff";

/**
 * Unix timestamp in seconds for `2000-01-01T00:00:00Z`.
 * Sonoff irrigation devices encode local datetimes relative to this base.
 */
export const YEAR_2000_IN_UTC = Math.floor(Date.UTC(2000, 0, 1) / 1000);

/**
 * Convert Unix UTC seconds to device local-time seconds (2000 base).
 */
export const utcToDeviceLocal2000Seconds = (utcSeconds: number, offsetSeconds: number): number => {
    return utcSeconds + offsetSeconds - YEAR_2000_IN_UTC;
};

/**
 * Convert device local-time seconds (2000 base) back to Unix UTC seconds.
 */
export const deviceLocal2000ToUTCSeconds = (deviceSeconds: number, offsetSeconds: number): number => {
    return deviceSeconds - offsetSeconds + YEAR_2000_IN_UTC;
};

/**
 * Parse ISO 8601 datetime (must include `Z` or `±HH:mm`) to Unix UTC seconds.
 * Returns `undefined` when format is invalid or parsed value is negative.
 */
export const parseIsoWithOffsetToUtcSeconds = (value: string): number | undefined => {
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) {
        return;
    }

    const timeMs = new Date(value).getTime();
    if (Number.isNaN(timeMs)) {
        return;
    }

    const seconds = Math.floor(timeMs / 1000);
    if (seconds < 0) {
        return;
    }

    return seconds;
};

/**
 * Get runtime local timezone offset in seconds for the specified UTC timestamp.
 */
export const getRuntimeLocalOffsetSeconds = (utcSeconds: number): number => {
    const date = new Date(utcSeconds * 1000);
    return -date.getTimezoneOffset() * 60;
};

/**
 * Format Unix UTC seconds to ISO 8601 with the specified timezone offset.
 * Falls back to the runtime local timezone offset when not provided.
 */
export const formatUtcSecondsToIsoWithOffset = (utcSeconds: number, offsetSeconds?: number): string => {
    const resolvedOffsetSeconds =
        typeof offsetSeconds === "number" && Number.isFinite(offsetSeconds) ? offsetSeconds : getRuntimeLocalOffsetSeconds(utcSeconds);

    const sign = resolvedOffsetSeconds >= 0 ? "+" : "-";
    const offsetMinutesAbs = Math.abs(Math.floor(resolvedOffsetSeconds / 60));
    const offsetHours = Math.floor(offsetMinutesAbs / 60);
    const offsetMinutes = offsetMinutesAbs % 60;
    const localMs = utcSeconds * 1000 + resolvedOffsetSeconds * 1000;
    const localDate = new Date(localMs);

    return (
        `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, "0")}-${String(localDate.getUTCDate()).padStart(2, "0")}T` +
        `${String(localDate.getUTCHours()).padStart(2, "0")}:${String(localDate.getUTCMinutes()).padStart(2, "0")}:${String(localDate.getUTCSeconds()).padStart(2, "0")}` +
        `${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`
    );
};

/**
 * Shift UTC seconds by local calendar months under a fixed UTC -> local offset.
 */
export const shiftUtcSecondsByOffsetMonths = (utcSeconds: number, monthDelta: number, offsetSeconds = 0): number => {
    const localMs = utcSeconds * 1000 + offsetSeconds * 1000;
    const localDate = new Date(localMs);
    const shiftedLocalMs = Date.UTC(
        localDate.getUTCFullYear(),
        localDate.getUTCMonth() + monthDelta,
        localDate.getUTCDate(),
        localDate.getUTCHours(),
        localDate.getUTCMinutes(),
        localDate.getUTCSeconds(),
        localDate.getUTCMilliseconds(),
    );

    return Math.floor((shiftedLocalMs - offsetSeconds * 1000) / 1000);
};

/**
 * Parsed view of a raw SWV-ZN/ZF ZCL frame.
 */
type ParsedSWVZFRawZclCommand = {
    commandId: number;
    payload: Buffer;
};

/**
 * Extract the ZCL command id and payload from a raw SWV-ZN/ZF frame.
 * Handles both standard and manufacturer-specific headers.
 */
export const parseSWVZFRawZclCommand = (buffer: Buffer): ParsedSWVZFRawZclCommand | undefined => {
    if (buffer.length < 3) {
        return;
    }

    const frameControl = buffer[0];
    const hasManufacturerCode = (frameControl & 0b100) !== 0;
    const zclHeaderLength = hasManufacturerCode ? 5 : 3;
    if (buffer.length < zclHeaderLength) {
        return;
    }

    return {
        commandId: buffer[zclHeaderLength - 1],
        payload: buffer.subarray(zclHeaderLength),
    };
};

/**
 * Swap the byte order of a 32-bit value reported as a big-endian unsigned integer.
 */
export const toBigEndianUInt32 = (rawValue: number): number => {
    return (((rawValue & 0xff) << 24) | ((rawValue & 0xff00) << 8) | ((rawValue >>> 8) & 0xff00) | ((rawValue >>> 24) & 0xff)) >>> 0;
};

/**
 * Decode a 32-bit milli-value that is exposed through a UINT32 ZCL attribute
 * but uses two's-complement encoding when the reported value is below zero.
 */
export const signedInt32MilliToValue = (value: number): number => (value > 0x7fffffff ? value - 0x100000000 : value) / 1000;

/**
 * Read an unsigned 32-bit little-endian integer from an array-like byte buffer.
 */
export const readUInt32LE = (data: ArrayLike<number>, index: number): number => {
    return ((data[index] ?? 0) | ((data[index + 1] ?? 0) << 8) | ((data[index + 2] ?? 0) << 16) | ((data[index + 3] ?? 0) << 24)) >>> 0;
};

/**
 * Read an unsigned 40-bit little-endian integer from an array-like byte buffer.
 * Multiplication avoids JavaScript's 32-bit bitwise truncation.
 */
export const readUInt40LE = (data: ArrayLike<number>, index: number): number => {
    return (
        (data[index] ?? 0) +
        (data[index + 1] ?? 0) * 0x100 +
        (data[index + 2] ?? 0) * 0x10000 +
        (data[index + 3] ?? 0) * 0x1000000 +
        (data[index + 4] ?? 0) * 0x100000000
    );
};

/**
 * Read an unsigned 16-bit little-endian integer from an array-like byte buffer.
 */
export const readUInt16LE = (data: ArrayLike<number>, index: number): number => {
    return (data[index] ?? 0) | ((data[index + 1] ?? 0) << 8);
};

/**
 * Normalize Zigbee-herdsman ZCL array values to a plain byte array.
 * Depending on the decoder path, arrays may arrive as `Uint8Array`, `number[]`,
 * or an object with an `elements` field.
 */
export const zclArrayValueToBytes = (value: unknown): number[] | undefined => {
    if (value instanceof Uint8Array) {
        return Array.from(value);
    }
    if (Array.isArray(value)) {
        return value.map((item) => Number(item) & 0xff);
    }
    if (value !== null && typeof value === "object" && "elements" in value) {
        const elements = (value as {elements?: unknown}).elements;
        if (elements instanceof Uint8Array) {
            return Array.from(elements);
        }
        if (Array.isArray(elements)) {
            return elements.map((item) => Number(item) & 0xff);
        }
    }
};

/**
 * Decode a Sonoff private attribute whose value is a ZCL array containing one
 * unsigned 32-bit little-endian integer.
 */
export const zclArrayUInt32FzConvert = (name: string, attributeKey: string): Fz.Converter<string>["convert"] => {
    return (model, msg, publish, options, meta) => {
        if (!(attributeKey in msg.data)) {
            return;
        }

        const bytes = zclArrayValueToBytes((msg.data as unknown as KeyValue)[attributeKey]);
        if (bytes === undefined || bytes.length < 4) {
            logger.warning(`${attributeKey} payload is not a uint32 ZCL array value`, NS);
            return;
        }

        return {[name]: readUInt32LE(bytes, 0)};
    };
};

/**
 * Encode an unsigned 32-bit integer as little-endian bytes.
 */
export const toUInt32LEBytes = (value: number): number[] => {
    const uint32Value = value >>> 0;
    return [uint32Value & 0xff, (uint32Value >> 8) & 0xff, (uint32Value >> 16) & 0xff, (uint32Value >> 24) & 0xff];
};

/**
 * Encode an unsigned 16-bit integer as little-endian bytes.
 */
export const toUInt16LEBytes = (value: number): number[] => {
    const uint16Value = value & 0xffff;
    return [uint16Value & 0xff, (uint16Value >> 8) & 0xff];
};

/**
 * Format a time-of-day value stored as seconds since midnight.
 * Uses `HH:mm` when there are no seconds, otherwise `HH:mm:ss`.
 */
export const formatSecondsToTimeSinceMidnight = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return remainingSeconds === 0 ? value : `${value}:${String(remainingSeconds).padStart(2, "0")}`;
};

/**
 * Parse `HH:mm` or `HH:mm:ss` into seconds since midnight.
 * Throws when the format is invalid or points outside the current day.
 */
export const parseTimeToSecondsSinceMidnight = (time: string, field = "value"): number => {
    const match = time.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$|^24:00(?::00)?$/);
    if (!match) {
        throw new Error(`Invalid ${field}, expected time from midnight (e.g. 08:30 or 18:00)`);
    }
    if (time.startsWith("24:")) {
        throw new Error(`Invalid ${field}, 24:00 is not supported. Use 00:00 of the next day instead.`);
    }
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
};
