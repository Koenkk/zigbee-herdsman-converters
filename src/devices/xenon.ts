import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {Definition} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

// Hem 26 hem 260 gönderen varyantları otomatik düzeltir
const temperatureAutoScale = {
    from: (v: number) => (typeof v === "number" && v > 100 ? v / 10 : v),
    to: (v: number) => v,
};

// Cihaz: 0=açık, 100=kapalı  |  Z2M/HA: 0=kapalı, 100=açık
const positionInvert = {
    from: (v: number) => {
        const n = Number(v);
        if (Number.isNaN(n)) return v;
        return Math.max(0, Math.min(100, 100 - n));
    },
    to: (v: number) => {
        const n = Number(v);
        if (Number.isNaN(n)) return v;
        return Math.max(0, Math.min(100, 100 - n));
    },
};

const definition: Definition = {
    fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE284_hbjwgkdh"}],
    model: "X7726",
    vendor: "Xenon Smart",
    description: "Xenon Smart Zigbee Curtain Motor X7726 (TS0601)",

    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    configure: tuya.configureMagicPacket,

    exposes: [e.cover_position().setAccess("position", ea.STATE_SET), e.enum("calibration", ea.STATE_SET, ["start", "finish"]), e.temperature()],

    meta: {
        tuyaDatapoints: [
            // DP1 → OPEN/STOP/CLOSE
            [
                1,
                "state",
                tuya.valueConverterBasic.lookup({
                    OPEN: 0,
                    STOP: 1,
                    CLOSE: 2,
                }),
            ],

            // DP2 → hedef pozisyon set
            [2, "position", positionInvert],

            // DP3 → mevcut pozisyon raporu
            [3, "position", positionInvert],

            // DP102 → calibration
            [
                102,
                "calibration",
                tuya.valueConverterBasic.lookup({
                    start: 0,
                    finish: 1,
                }),
            ],

            // DP103 → temperature
            [103, "temperature", temperatureAutoScale],
        ],
    },
};

// ⚠️ Bu repo’da indexer "definitions" adlı ARRAY export’u bekliyor
export const definitions = [definition];
