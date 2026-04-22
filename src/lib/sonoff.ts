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
