export const YEAR_2000_IN_UTC = Math.floor(Date.UTC(2000, 0, 1) / 1000);

/**
 * Parse timezone offset from ISO 8601 datetime.
 * Returns seconds, `0` for `Z`, or `undefined` when no offset is present.
 */
export const parseIsoOffsetSeconds = (value: string): number | undefined => {
    const match = value.match(/(Z|[+-]\d{2}:\d{2})$/);
    if (!match) {
        return;
    }

    const offset = match[1];
    if (offset === "Z") {
        return 0;
    }

    const sign = offset[0] === "+" ? 1 : -1;
    const hours = Number(offset.slice(1, 3));
    const minutes = Number(offset.slice(4, 6));
    return sign * (hours * 3600 + minutes * 60);
};

/**
 * Convert Unix UTC seconds to device local-time seconds (2000 base).
 */
export const utcToDeviceLocal2000Seconds = (utcSeconds: number, offsetSeconds: number): number => {
    return utcSeconds + offsetSeconds - YEAR_2000_IN_UTC;
};

/**
 * Convert device local-time seconds (2000 base) back to Unix UTC seconds.
 * The runtime timezone is used as the device-local timezone baseline.
 */
export const deviceLocal2000ToUTCSeconds = (deviceSeconds: number): number => {
    const approxUtcSeconds = deviceSeconds + YEAR_2000_IN_UTC;
    const offsetSeconds = -new Date(approxUtcSeconds * 1000).getTimezoneOffset() * 60;
    return approxUtcSeconds - offsetSeconds;
};

/**
 * Parse ISO 8601 datetime (must include `Z` or `±HH:mm`) to Unix UTC seconds.
 * Returns `undefined` when format is invalid or parsed value is negative.
 */
export const parseIsoWithOffsetToUtcSeconds = (value: string): number | undefined => {
    if (parseIsoOffsetSeconds(value) === undefined) {
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
 * Format Unix UTC seconds to ISO 8601 with the runtime local timezone offset.
 */
export const formatUtcSecondsToIsoWithOffset = (utcSeconds: number): string => {
    const date = new Date(utcSeconds * 1000);
    const utcOffsetMinutes = -date.getTimezoneOffset();
    const sign = utcOffsetMinutes >= 0 ? "+" : "-";
    const offsetMinutesAbs = Math.abs(utcOffsetMinutes);
    const offsetHours = Math.floor(offsetMinutesAbs / 60);
    const offsetMinutes = offsetMinutesAbs % 60;

    return (
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T` +
        `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}` +
        `${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`
    );
};

export type ParsedRawZclCommand = {
    commandId: number;
    payload: Buffer;
};

export const parseRawZclCommand = (buffer: Buffer): ParsedRawZclCommand | undefined => {
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
