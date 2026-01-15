import type {DefinitionWithExtend, Fz, Zh} from "../lib/types";

import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";

const e = exposes.presets;

// ---------- Helpers  ----------

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

    if (typeof z === "object") {
        const obj = z as any;
        if (typeof obj.raw === "number") return obj.raw;
        if (typeof obj.value === "number") return obj.value;
        if (typeof obj.val === "number") return obj.val;
    }

    return undefined;
}

function decodeSlateZoneStatus(zoneStatusRaw: number): string | null {
    const pressType = (zoneStatusRaw & 0x0001) ? "long_press" : "short_press";
    const masked = zoneStatusRaw & 0x01fe;

    const map: Record<number, number> = {2: 1, 4: 2, 8: 3, 16: 4, 32: 5, 64: 6, 128: 7, 256: 8};
    const btn = map[masked];
    if (!btn) return null;

    return `button_${btn}_${pressType}`;
}

const fzZunzunbeeSlateSwitchIAS: Fz.Converter = {
    cluster: "ssIasZone",
    type: ["attributeReport", "readResponse", "commandStatusChangeNotification", "commandZoneStatusChangeNotification"],
    convert: (model, msg) => {
        const data = msg.data as any;

        const zoneStatusRaw =
            parseZoneStatusAny(data?.zone_status) ??
            parseZoneStatusAny(data?.zoneStatus) ??
            parseZoneStatusAny(data?.zonestatus) ?? // key seen in your Z2M logs
            parseZoneStatusAny(data?.zone_status_raw);

        if (zoneStatusRaw === undefined) return;

        const action = decodeSlateZoneStatus(zoneStatusRaw);
        if (!action) return;

        return {action};
    },
};

// ------------------------------ Definitions -------------------------------

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
                "button_1_short_press", "button_1_long_press",
                "button_2_short_press", "button_2_long_press",
                "button_3_short_press", "button_3_long_press",
                "button_4_short_press", "button_4_long_press",
                "button_5_short_press", "button_5_long_press",
                "button_6_short_press", "button_6_long_press",
                "button_7_short_press", "button_7_long_press",
                "button_8_short_press", "button_8_long_press",
            ]),
            e.battery(),
            e.temperature(),
        ],
        configure: async (device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, logger) => {
            const endpoint = device.getEndpoint(1) ?? device.endpoints?.[0];
            if (!endpoint) return;

            try {
                await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
                await reporting.batteryPercentageRemaining(endpoint, {min: 30 * 60, max: 6 * 60 * 60, change: 1});
            } catch (e) {
                logger.debug(`Zunzunbee Slate Switch: battery reporting not set (${e})`);
            }

            try {
                await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement"]);
                await reporting.temperature(endpoint, {min: 10 * 60, max: 30 * 60, change: 100});
            } catch (e) {
                logger.debug(`Zunzunbee Slate Switch: temperature reporting not set (${e})`);
            }
        },
    },
];
