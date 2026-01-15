import type {Definition, DefinitionWithExtend, Fz} from "../lib/types";

import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";

const e = exposes.presets;

// ---------- Helpers ----------

type ZoneStatusWrapped = {
    raw?: unknown;
    value?: unknown;
    val?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getProp(obj: unknown, key: string): unknown {
    if (!isRecord(obj)) return undefined;
    return obj[key];
}

function parseZoneStatusAny(z: unknown): number | undefined {
    if (z === undefined || z === null) return undefined;
    if (typeof z === "number") return z;

    if (typeof z === "string") {
        const s = z.trim().toLowerCase();
        if (s.startsWith("0x")) {
            const n = Number.parseInt(s, 16);
            return Number.isNaN(n) ? undefined : n;
        }
        const n = Number.parseInt(s, 10);
        return Number.isNaN(n) ? undefined : n;
    }

    if (isRecord(z)) {
        const wrapped = z as ZoneStatusWrapped;
        if (typeof wrapped.raw === "number") return wrapped.raw;
        if (typeof wrapped.value === "number") return wrapped.value;
        if (typeof wrapped.val === "number") return wrapped.val;
    }

    return undefined;
}

function decodeSlateZoneStatus(zoneStatusRaw: number): string | null {
    // Bit0 encodes press type (matches your released ZHA behavior)
    const pressType = (zoneStatusRaw & 0x0001) ? "long_press" : "short_press";

    // Bits 1..8 encode button number (2..256)
    const masked = zoneStatusRaw & 0x01fe;

    const map: Record<number, number> = {2: 1, 4: 2, 8: 3, 16: 4, 32: 5, 64: 6, 128: 7, 256: 8};
    const btn = map[masked];
    if (!btn) return null;

    return `button_${btn}_${pressType}`;
}

// ---------- fromZigbee ----------

type IasMsgType =
    | "attributeReport"
    | "readResponse"
    | "commandStatusChangeNotification"
    | "commandZoneStatusChangeNotification";

const fzZunzunbeeSlateSwitchIAS = {
    cluster: "ssIasZone",
    // NOTE: this repo version only accepts commandStatusChangeNotification for IAS zone
    type: ["attributeReport", "readResponse", "commandStatusChangeNotification"],
    convert: (model: Definition, msg: {data: unknown; type: string}) => {
        const data = msg.data;

        // Silabs/Ember often lowercases keys (you observed `zonestatus`)
        const zoneStatusRaw =
            parseZoneStatusAny(getProp(data, "zone_status")) ??
            parseZoneStatusAny(getProp(data, "zoneStatus")) ??
            parseZoneStatusAny(getProp(data, "zonestatus")) ??
            parseZoneStatusAny(getProp(data, "zone_status_raw"));

        if (zoneStatusRaw === undefined) return;

        const action = decodeSlateZoneStatus(zoneStatusRaw);
        if (!action) return;

        return {action};
    },
} as const;


// ---------- Definitions ----------

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{manufacturerName: "zunzunbee", modelID: "SSWZ8T"}],
        model: "SSWZ8T",
        vendor: "zunzunbee",
        description: "Slate Switch (8-button touch controller)",
        fromZigbee: [fzZunzunbeeSlateSwitchIAS, fz.battery, fz.temperature],
        toZigbee: [],
        exposes: [
            e.action([
                "button_1_short_press",
                "button_1_long_press",
                "button_2_short_press",
                "button_2_long_press",
                "button_3_short_press",
                "button_3_long_press",
                "button_4_short_press",
                "button_4_long_press",
                "button_5_short_press",
                "button_5_long_press",
                "button_6_short_press",
                "button_6_long_press",
                "button_7_short_press",
                "button_7_long_press",
                "button_8_short_press",
                "button_8_long_press",
            ]),
            e.battery(),
            e.temperature(),
        ],
        // Matches style used in other vendor files (e.g. smartthings.ts)
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) ?? device.endpoints?.[0];
            if (!endpoint) return;

            // Best-effort: sleepy devices may not bind/report reliably
            try {
                await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
                await reporting.batteryPercentageRemaining(endpoint, {min: 60 * 60, max: 6 * 60 * 60, change: 1});
            } catch {
                // ignore
            }

            try {
                await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement"]);
                await reporting.temperature(endpoint, {min: 30, max: 60 * 60, change: 100});
            } catch {
                // ignore
            }
        },
    },
];
