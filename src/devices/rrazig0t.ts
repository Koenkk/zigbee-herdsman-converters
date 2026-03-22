/**
 * External converter zigbee2mqtt — _TZE284_rrazig0t
 * Smart life Zigbee Multi-function Switch 4-way Relay
 * Modes: Switch / Curtain (3 covers) / Scene (8) / Radar / RGBWCT (4 lights)
 *
 * @author  ahamel
 * @version 1.0.0
 * @date    2026-03-22
 * @tested  zigbee2mqtt >= 1.40.0 / zigbee-herdsman-converters >= 20.0.0
 *
 * DPs identified by empirical capture on 2026-03-15
 *
 * DP  1-  8 : scenes 1-8           (read-only, physical trigger)
 * DP 24- 27 : on/off relays L1-L4  (bool, R/W)
 * DP120-122 : curtains 1-3         (enum 0=open 1=stop 2=close, R/W)
 * DP133-136 : light brightness     (int 0-100, R/W)
 * DP137-140 : light white channel  (int 0-100, R/W) → color temp, see calibration below
 * DP141-144 : light RGB channel    (int 0-100, R/W) → non-linear hue wheel → color_xy
 * DP145-148 : light on/off         (bool, R/W)
 * DP157     : presence radar       (bool, read-only)
 *
 * RGB hue wheel calibration (empirical, 2026-03-15):
 *   dp  0 → hue  30° (orange)
 *   dp 17 → hue  60° (yellow)
 *   dp 33 → hue 120° (green)
 *   dp 42 → hue 120° (green)
 *   dp 58 → hue 180° (cyan)
 *   dp 67 → hue 240° (blue)
 *   dp 83 → hue 270° (blue-violet)
 *   dp100 → hue 360° (red)
 *
 * White channel / color temperature calibration (empirical, 2026-03-20):
 *   Firmware scale is INVERTED: dp 0 = warm white, dp 100 = cold white
 *   Exposed to HA/Z2M as mired [153–254] (cold→warm), auto-converted from Kelvin [3937–6536 K]
 *   dp   0 → 254 mired (~3937 K, warm)
 *   dp 100 → 153 mired (~6536 K, cold)
 *
 * Known limitations:
 * - Channel labels ("switch1"...) cannot be changed via Zigbee (firmware only)
 * - White/RGB toggle per channel: local to firmware (swipe), no Zigbee DP
 *   Both channels are controllable from z2m but the panel screen only displays
 *   the active mode. Commands sent to the inactive mode are still applied.
 * - Active mode per channel (switch/curtain/scene/light): local swipe, no DP
 * - Weather display: no DP found to update the weather shown on the panel screen.
 *   Exhaustive bruteforce over DPs 1-150 (datatypes 0, 1, 3) yielded no result.
 *   This feature appears to be unsupported via Zigbee on this firmware.
 * - Saturation and value (HSV) are not exposed by this firmware via Zigbee.
 *   The RGB channel only encodes hue (0-100 non-linear scale); S and V are
 *   always assumed to be 1.0 for color_xy conversion. This is intentional.
 * - DP polling (convertGet) is not supported by TS0601 firmware. State is
 *   entirely driven by device reports.
 */

import type {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';

const e = exposes.presets;
const ea = exposes.access;

const tuyaValueType = tuya.dataTypes ? tuya.dataTypes.value : 2;
const DEBUG_COLOR_SYNC = false;

// ─── CHANNEL INDICES ──────────────────────────────────────────────────────────

const SCENE_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
const RELAY_IDS = [1, 2, 3, 4];
const CURTAIN_IDS = [1, 2, 3];
const LIGHT_IDS = [1, 2, 3, 4];

// ─── DP CONSTANTS ─────────────────────────────────────────────────────────────

const RADAR_DP = 157; // presence radar (read-only)

// ─── COLOR TEMPERATURE RANGE ──────────────────────────────────────────────────

const COLOR_TEMP_MIRED_MIN = 153;
const COLOR_TEMP_MIRED_MAX = 254;

// Upper bound used to distinguish a Kelvin value from a mired value.
// Kelvin values for typical white LEDs are always > 1000; mired values < 500.
const KELVIN_MIRED_THRESHOLD = 500;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Normalise a brightness input to the firmware native 0-100 scale.
 * Accepts both 0-100 (native) and 0-254 (HASS) ranges.
 */
function normalizePercent(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return 0;
    if (numeric > 100) {
        return clamp(Math.round((numeric * 100) / 254), 0, 100);
    }
    return clamp(Math.round(numeric), 0, 100);
}

/**
 * Convert a firmware 0-100 brightness to the HASS 0-254 scale.
 */
function percentToHass(value) {
    const percent = clamp(Math.round(Number(value) || 0), 0, 100);
    return clamp(Math.round((percent * 254) / 100), 0, 254);
}

/**
 * Convert an arbitrary color temperature input to mired [153–254].
 *
 * Input resolution order (mutually exclusive ranges):
 *  1. Kelvin  : numeric > KELVIN_MIRED_THRESHOLD (500)  → 1_000_000 / K
 *  2. Mired   : 153 ≤ numeric ≤ 500                     → pass-through clamp
 *  3. Legacy  : 0 ≤ numeric < 153                        → linear map from
 *               0-254 or 0-100 scale onto [MIRED_MIN, MIRED_MAX]
 */
function toMired(value) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return COLOR_TEMP_MIRED_MAX;

    if (numeric > KELVIN_MIRED_THRESHOLD) {
        return clamp(Math.round(1000000 / numeric), COLOR_TEMP_MIRED_MIN, COLOR_TEMP_MIRED_MAX);
    }

    if (numeric >= COLOR_TEMP_MIRED_MIN && numeric <= KELVIN_MIRED_THRESHOLD) {
        return clamp(Math.round(numeric), COLOR_TEMP_MIRED_MIN, COLOR_TEMP_MIRED_MAX);
    }

    if (numeric >= 0 && numeric < COLOR_TEMP_MIRED_MIN) {
        const normalized = numeric <= 100 ? numeric : (numeric * 100) / 254;
        const span = COLOR_TEMP_MIRED_MAX - COLOR_TEMP_MIRED_MIN;
        const mired = COLOR_TEMP_MIRED_MIN + (normalized / 100) * span;
        return clamp(Math.round(mired), COLOR_TEMP_MIRED_MIN, COLOR_TEMP_MIRED_MAX);
    }

    return clamp(Math.round(numeric), COLOR_TEMP_MIRED_MIN, COLOR_TEMP_MIRED_MAX);
}

function debugLog(meta, message) {
    if (!DEBUG_COLOR_SYNC) return;
    if (meta?.logger) meta.logger.debug(message);
    else console.log(message);
}

// ─── PER-DEVICE STATE CACHE ───────────────────────────────────────────────────

const lightStateCacheByDevice = {};

function getLightCache(meta) {
    const ieee = meta?.device?.ieeeAddr ?? 'default';
    if (!lightStateCacheByDevice[ieee]) {
        lightStateCacheByDevice[ieee] = { 1: {}, 2: {}, 3: {}, 4: {} };
    }
    return lightStateCacheByDevice[ieee];
}

// ─── HUE WHEEL CALIBRATION TABLE ─────────────────────────────────────────────

const HUE_TABLE = [
    [0, 30],
    [17, 60],
    [33, 120],
    [42, 120],
    [58, 180],
    [67, 240],
    [83, 270],
    [100, 360],
];

function dpToHue(dp) {
    dp = clamp(dp, 0, 100);
    for (let i = 0; i < HUE_TABLE.length - 1; i++) {
        const [x0, y0] = HUE_TABLE[i];
        const [x1, y1] = HUE_TABLE[i + 1];
        if (dp >= x0 && dp <= x1) {
            if (x1 === x0) return y0;
            return y0 + (y1 - y0) * (dp - x0) / (x1 - x0);
        }
    }
    return 360;
}

function hueToDp(hue) {
    hue = ((hue % 360) + 360) % 360;
    for (let i = 0; i < HUE_TABLE.length - 1; i++) {
        const [x0, y0] = HUE_TABLE[i];
        const [x1, y1] = HUE_TABLE[i + 1];
        if (y1 === y0) continue;
        if (hue >= y0 && hue <= y1) {
            return Math.round(x0 + (x1 - x0) * (hue - y0) / (y1 - y0));
        }
    }
    return 0;
}

// ─── COLOR MATH ───────────────────────────────────────────────────────────────

function hsvToXy(h, s, v) {
    const hi = Math.floor(h / 60) % 6;
    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r;
    let g;
    let b;
    switch (hi) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
        default: r = 0; g = 0; b = 0;
    }
    const gamma = (c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    const rl = gamma(r);
    const gl = gamma(g);
    const bl = gamma(b);
    const X = rl * 0.664511 + gl * 0.154324 + bl * 0.162028;
    const Y = rl * 0.283881 + gl * 0.668433 + bl * 0.047685;
    const Z = rl * 0.000088 + gl * 0.072310 + bl * 0.986039;
    const sum = X + Y + Z;
    if (sum === 0) return { x: 0.3127, y: 0.3290 };
    return {
        x: parseFloat((X / sum).toFixed(4)),
        y: parseFloat((Y / sum).toFixed(4)),
    };
}

function xyToHue(x, y) {
    const z = 1.0 - x - y;
    const Y = 1.0;
    const X = (Y / y) * x;
    const Z = (Y / y) * z;
    let r = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
    let g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
    let b = X * 0.051713 - Y * 0.121364 + Z * 1.011530;
    const mx = Math.max(r, g, b);
    if (mx > 1) { r /= mx; g /= mx; b /= mx; }
    r = Math.max(0, r);
    g = Math.max(0, g);
    b = Math.max(0, b);
    const cmax = Math.max(r, g, b);
    const cmin = Math.min(r, g, b);
    const delta = cmax - cmin;
    if (delta === 0) return 0;
    let hue;
    if (cmax === r) hue = 60 * (((g - b) / delta) % 6);
    else if (cmax === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
    return ((hue % 360) + 360) % 360;
}

// ─── VALUE CONVERTERS ─────────────────────────────────────────────────────────

const colorXyConverter = {
    type: tuyaValueType,
    from: (dp) => {
        const hue = dpToHue(dp);
        return hsvToXy(hue, 1.0, 1.0);
    },
    to: (value) => {
        try {
            const v = value?.color ? value.color : value;

            if (v?.xy && Array.isArray(v.xy) && v.xy.length >= 2) {
                const x = Number(v.xy[0]);
                const y = Number(v.xy[1]);
                if (!Number.isNaN(x) && !Number.isNaN(y)) return hueToDp(xyToHue(x, y));
            }
            if (v && v.x !== undefined && v.y !== undefined) {
                const x = Number(v.x);
                const y = Number(v.y);
                if (!Number.isNaN(x) && !Number.isNaN(y)) return hueToDp(xyToHue(x, y));
            }
            if (v && v.h !== undefined) {
                const h = Number(v.h);
                if (!Number.isNaN(h)) return hueToDp(h);
            }
            if (v && v.hue !== undefined) {
                const h = Number(v.hue);
                if (!Number.isNaN(h)) return hueToDp(h);
            }
            if (v && v.hsv && v.hsv.h !== undefined) {
                const h = Number(v.hsv.h);
                if (!Number.isNaN(h)) return hueToDp(h);
            }
            if (v?.hs && Array.isArray(v.hs) && v.hs.length >= 1) {
                const h = Number(v.hs[0]);
                if (!Number.isNaN(h)) return hueToDp(h);
            }
        } catch (_) {}
        return null;
    },
};

const brightnessHassConverter = {
    from: (dp) => percentToHass(clamp(Math.round(Number(dp) || 0), 0, 100)),
    to: (v) => normalizePercent(v),
};

const colorTempInvertedConverter = {
    from: (dp) => {
        const deviceScale = clamp(Math.round(Number(dp) || 0), 0, 100);
        const span = COLOR_TEMP_MIRED_MAX - COLOR_TEMP_MIRED_MIN;
        const mired = COLOR_TEMP_MIRED_MAX - (deviceScale / 100) * span;
        return clamp(Math.round(mired), COLOR_TEMP_MIRED_MIN, COLOR_TEMP_MIRED_MAX);
    },
    to: (v) => {
        const mired = toMired(v);
        const span = COLOR_TEMP_MIRED_MAX - COLOR_TEMP_MIRED_MIN;
        const ratio = (mired - COLOR_TEMP_MIRED_MIN) / span;
        return clamp(Math.round(100 * (1 - ratio)), 0, 100);
    },
};

// ─── CURTAIN CONVERTER ────────────────────────────────────────────────────────

const curtainStateConverter = tuya.valueConverterBasic.lookup({
    OPEN: tuya.enum(0),
    STOP: tuya.enum(1),
    CLOSE: tuya.enum(2),
});

// ─── ENDPOINT MAPS ────────────────────────────────────────────────────────────

const colorEndpointToDp = Object.fromEntries(LIGHT_IDS.map((i) => [`light_${i}`, 140 + i]));

const colorEndpointToLightSuffix = Object.fromEntries(LIGHT_IDS.map((i) => [`light_${i}`, String(i)]));

const tzCustomKeys = [
    ...RELAY_IDS.map((i) => `state_l${i}`),
    ...CURTAIN_IDS.map((i) => `curtain_${i}`),
    ...LIGHT_IDS.flatMap((i) => [
        `state_light_${i}`,
        `brightness_light_${i}`,
        `color_light_${i}`,
        `color_temp_light_${i}`,
    ]),
];

// ─── FROM-ZIGBEE CONVERTER ────────────────────────────────────────────────────

const fzCustom = {
    cluster: 'manuSpecificTuya',
    type: [
        'commandDataResponse',
        'commandDataReport',
        'commandActiveStatusReport',
        'commandActiveStatusReportAlt',
        'commandSetDataResponse',
    ],
    convert: (model, msg, publish, options, meta) => {
        debugLog(meta, `[rrazig0t][ANY-MSG] type=${msg?.type} cluster=${msg?.cluster}`);
        if (msg?.data?.dpValues) {
            debugLog(meta, `[rrazig0t][DPS] ${JSON.stringify(msg.data.dpValues)}`);
        }

        const result = tuya.fz.datapoints.convert(model, msg, publish, options, meta);

        if (result) {
            debugLog(meta, `[rrazig0t][CONVERTED] ${JSON.stringify(result)}`);
        } else {
            debugLog(meta, '[rrazig0t][CONVERTED] null/undefined');
            return result;
        }

        const deviceCache = getLightCache(meta);

        for (let i = 1; i <= 4; i++) {
            const stateKey = `state_light_${i}`;
            const briKey = `brightness_light_${i}`;
            const tempKey = `color_temp_light_${i}`;
            const colorKey = `color_light_${i}`;
            const modeKey = `color_mode_light_${i}`;

            const hasState = result[stateKey] !== undefined;
            const hasBri = result[briKey] !== undefined;
            const hasTemp = result[tempKey] !== undefined;
            const hasColor = result[colorKey] !== undefined;

            if (!(hasState || hasBri || hasTemp || hasColor)) continue;

            const cache = deviceCache[i];

            if (hasState) cache.state = result[stateKey];
            if (hasBri) cache.brightness = result[briKey];
            if (hasTemp) {
                cache.color_temp = result[tempKey];
                cache.color_mode = 'color_temp';
                if (cache.state === undefined) cache.state = 'ON';
            }
            if (hasColor) {
                cache.color = result[colorKey];
                cache.color_mode = 'xy';
                if (cache.state === undefined) cache.state = 'ON';
            }

            if (cache.state !== undefined) result[stateKey] = cache.state;
            if (cache.brightness !== undefined) result[briKey] = cache.brightness;
            if (cache.color_temp !== undefined) result[tempKey] = cache.color_temp;
            if (cache.color !== undefined) result[colorKey] = cache.color;
            if (cache.color_mode !== undefined) {
                result[modeKey] = cache.color_mode;
                result.color_mode = cache.color_mode;
            }

            if (hasColor || hasTemp) {
                debugLog(meta, `[rrazig0t][RX-MERGED] light_${i} mode=${result[modeKey]} state=${result[stateKey]} color=${JSON.stringify(result[colorKey])} temp=${result[tempKey]}`);
            }
        }

        return result;
    },
};

// ─── TO-ZIGBEE: COLOR PICKER ──────────────────────────────────────────────────

const tzColorPicker = {
    key: [
        'color',
        'state',
        'brightness',
        'color_temp',
        ...LIGHT_IDS.map((i) => `color_light_${i}`),
    ],

    convertSet: async (entity, key, value, meta) => {
        debugLog(meta, `[rrazig0t][SET] key=${key} endpoint=${meta?.endpoint_name} value=${JSON.stringify(value)}`);

        let endpointName = meta?.endpoint_name ?? undefined;

        if (!endpointName && key?.startsWith('color_light_')) {
            const suffix = key.split('_').pop();
            endpointName = `light_${suffix}`;
        }

        if (!endpointName && key === 'color') {
            endpointName = 'light_1';
            debugLog(meta, '[rrazig0t][SET] missing endpoint for color, defaulting to light_1');
        }

        if (!endpointName || !colorEndpointToDp[endpointName]) {
            debugLog(meta, `[rrazig0t][SET] fallback→tuya.tz.datapoints key=${key} endpoint=${endpointName}`);
            return tuya.tz.datapoints.convertSet(entity, key, value, meta);
        }

        const suffix = colorEndpointToLightSuffix[endpointName];
        const idx = Number(suffix);
        const cache = getLightCache(meta)[idx];

        if (key === 'color' || key.startsWith('color_light_')) {
            const dp = colorEndpointToDp[endpointName];
            const dpValue = colorXyConverter.to(value);

            if (dpValue === null || dpValue === undefined || Number.isNaN(dpValue)) {
                if (meta?.logger) {
                    meta.logger.warn(`[rrazig0t] Invalid color payload for ${endpointName}: ${JSON.stringify(value)}`);
                }
                return { state: {} };
            }

            await tuya.sendDataPointValue(entity, dp, dpValue);
            cache.color = colorXyConverter.from(dpValue);
            cache.color_mode = 'xy';
            if (cache.state === undefined) cache.state = 'ON';

            debugLog(meta, `[rrazig0t][TX] ${endpointName} dp=${dp} value=${dpValue} payload=${JSON.stringify(value)}`);
            return {
                state: {
                    color: colorXyConverter.from(dpValue),
                    color_mode: 'xy',
                    state: 'ON',
                },
            };
        }

        if (key === 'state') {
            cache.state = value;
            return tuya.tz.datapoints.convertSet(entity, `state_light_${suffix}`, value, meta);
        }

        if (key === 'brightness') {
            const dpBrightness = normalizePercent(value);
            cache.brightness = percentToHass(dpBrightness);
            return tuya.tz.datapoints.convertSet(entity, `brightness_light_${suffix}`, value, meta);
        }

        if (key === 'color_temp') {
            cache.color_temp = toMired(value);
            cache.color_mode = 'color_temp';
            return tuya.tz.datapoints.convertSet(entity, `color_temp_light_${suffix}`, value, meta);
        }

        return { state: {} };
    },

    convertGet: async (_entity, _key, _meta) => { /* no-op: poll not supported */ },
};

// ─── TO-ZIGBEE: RELAY / CURTAIN / LIGHT FLAT KEYS ────────────────────────────

const tzCustom = {
    key: tzCustomKeys,

    convertSet: async (entity, key, value, meta) => {
        if (key.startsWith('brightness_light_')) {
            const dpBrightness = normalizePercent(value);
            return await tuya.tz.datapoints.convertSet(entity, key, dpBrightness, meta);
        }
        return await tuya.tz.datapoints.convertSet(entity, key, value, meta);
    },

    convertGet: async (_entity, _key, _meta) => { /* no-op */ },
};

// ─── DEFINITION ───────────────────────────────────────────────────────────────

const definitions: Definition[] = [{
    fingerprint: tuya.fingerprint('TS0601', ['_TZE284_rrazig0t']),
    model: 'TS0601_rrazig0t',
    vendor: 'Tuya / Smart life',
    description: '4-way relay — switch / 3 curtains / 8 scenes / radar / 4 RGBWCT lights',
    fromZigbee: [fzCustom],
    toZigbee: [tzColorPicker, tzCustom],
    onEvent: tuya.onEventSetTime,
    configure: tuya.configureMagicPacket,

    exposes: [
        ...RELAY_IDS.map((i) =>
            e.binary(`state_l${i}`, ea.STATE_SET, 'ON', 'OFF')
                .withDescription(`Relay ${i}`)
        ),

        ...CURTAIN_IDS.map((i) =>
            e.enum(`curtain_${i}`, ea.STATE_SET, ['OPEN', 'STOP', 'CLOSE'])
                .withDescription(`Curtain ${i}`)
        ),

        ...SCENE_IDS.map((i) =>
            e.numeric(`scene_${i}`, ea.STATE)
                .withDescription(`Scene ${i} triggered`)
        ),

        ...LIGHT_IDS.flatMap((i) => [
            e.light()
                .withColor(['xy'])
                .withColorTemp([COLOR_TEMP_MIRED_MIN, COLOR_TEMP_MIRED_MAX])
                .withEndpoint(`light_${i}`),
            e.numeric(`brightness_light_${i}`, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(254)
                .withValueStep(1)
                .withDescription(`Light ${i} brightness (0-254, HASS scale)`),
        ]),

        e.binary('occupancy', ea.STATE, true, false)
            .withDescription('Presence detection (radar)'),
    ],

    meta: {
        multiEndpoint: true,
        tuyaDatapoints: [
            ...SCENE_IDS.map((i) => [i, `scene_${i}`, tuya.valueConverter.raw]),
            ...RELAY_IDS.map((i, idx) => [24 + idx, `state_l${i}`, tuya.valueConverter.onOff]),
            ...CURTAIN_IDS.map((i, idx) => [120 + idx, `curtain_${i}`, curtainStateConverter]),
            ...LIGHT_IDS.map((i, idx) => [133 + idx, `brightness_light_${i}`, brightnessHassConverter]),
            ...LIGHT_IDS.map((i, idx) => [137 + idx, `color_temp_light_${i}`, colorTempInvertedConverter]),
            ...LIGHT_IDS.map((i, idx) => [141 + idx, `color_light_${i}`, colorXyConverter]),
            ...LIGHT_IDS.map((i, idx) => [145 + idx, `state_light_${i}`, tuya.valueConverter.onOff]),
            [RADAR_DP, 'occupancy', tuya.valueConverter.trueFalse1],
        ],
    },

    endpoint: (_device) => ({
        ...Object.fromEntries(LIGHT_IDS.map((i) => [`light_${i}`, 1])),
    }),
}];

export default definitions;
