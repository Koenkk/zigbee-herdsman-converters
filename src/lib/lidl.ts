import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "./exposes";
import * as globalStore from "./store";
import * as tuya from "./tuya";
import type {Fz, KeyValueAny, ModernExtend, Tz, Zh} from "./types";
import * as utils from "./utils";

interface Rgb {
    r: number;
    g: number;
    b: number;
}
interface Slot {
    color?: Rgb;
    on: boolean;
}
interface EffectSettings {
    effect: string;
    speed: number;
    // Six fixed palette positions. A position that is off keeps its color but is not sent.
    slots: Slot[];
}

const e = exposes.presets;
const ea = exposes.access;
const dataPoints = {power: 1, mode: 2, brightness: 3, color: 5, effect: 6};
const modes = ["white", "color", "effect"];
const effects = [
    "steady",
    "snow",
    "rainbow",
    "snake",
    "twinkle",
    "firework",
    "horizontal_flag",
    "waves",
    "updown",
    "vintage",
    "fading",
    "collide",
    "strobe",
    "sparkles",
    "carnaval",
    "glow",
];
const paletteKeys = Array.from({length: 6}, (_, i) => `effect_color_${i + 1}`);
const effectKeys = ["effect_name", "effect_speed", "gradient", ...paletteKeys];
const keys = ["light_mode", "brightness", "white", "color", "effect", ...effectKeys];
const hex = (value: number, width: number) => Math.round(value).toString(16).padStart(width, "0");
const scale = (value: number, from: number, to: number) => Math.round((value * to) / from);
const red: Rgb = {r: 255, g: 0, b: 0};
const white: Rgb = {r: 255, g: 255, b: 255};
const isBlack = (color: Rgb) => color.r === 0 && color.g === 0 && color.b === 0;
const activeColors = (slots: Slot[]) => slots.filter((slot) => slot.on).map((slot) => slot.color);
const isSwitch = (value: unknown) => value === "ON" || value === "OFF";
const rgbHex = (color: Rgb) => `#${hex(color.r, 2)}${hex(color.g, 2)}${hex(color.b, 2)}`;

// Z2M handles SET messages concurrently, each with the state from when it arrived, and HA's
// palette entities send a color and then ON as two messages. Keep the computed state briefly
// so that overlapping commands build on each other.
function recentState(entity: Zh.Endpoint | Zh.Group): KeyValueAny {
    const recent = globalStore.getValue(entity, "hg06467State");
    return recent && Date.now() - recent.time < 10000 ? recent.state : {};
}

function remember(entity: Zh.Endpoint | Zh.Group, update: KeyValueAny) {
    globalStore.putValue(entity, "hg06467State", {state: {...recentState(entity), ...update}, time: Date.now()});
    return {state: update};
}

function parseHex(value: unknown): Rgb {
    utils.assertString(value, "color");
    if (!/^#[\da-f]{6}$/i.test(value)) throw new Error(`'${value}' is not a hex RGB color, e.g. #ff8000`);
    return {r: Number.parseInt(value.slice(1, 3), 16), g: Number.parseInt(value.slice(3, 5), 16), b: Number.parseInt(value.slice(5, 7), 16)};
}

// A list of colors fills positions 1..n; later positions are switched off but keep their color.
function fillSlots(colors: Rgb[], previous?: Slot[]): Slot[] {
    return paletteKeys.map((_, i) => (i < colors.length ? {color: colors[i], on: true} : {color: previous?.[i]?.color, on: false}));
}

function effectState(settings: EffectSettings) {
    const state: KeyValueAny = {
        effect_name: settings.effect,
        effect_speed: settings.speed,
        // The palette sent to the device, for Z2M's gradient editor.
        gradient: activeColors(settings.slots).map(rgbHex),
        effect_colors_on: settings.slots.flatMap((slot, i) => (slot.on ? [i + 1] : [])),
    };
    // HA discovery would insert nulls for missing properties, so a position
    // without a color is published as black (and is never on).
    for (const [i, key] of paletteKeys.entries()) {
        const color = settings.slots[i].color;
        state[key] = color ? rgbHex(color) : "#000000";
    }
    return state;
}

function cachedEffect(state: KeyValueAny): EffectSettings | undefined {
    if (state.effect_name === undefined || !Array.isArray(state.effect_colors_on)) return undefined;
    const slots = paletteKeys.map((key, i) => {
        const on = state.effect_colors_on.includes(i + 1);
        const color = state[key] === undefined ? undefined : parseHex(state[key]);
        // Black stands for "no color" unless the position is on.
        return {color: on || (color && !isBlack(color)) ? color : undefined, on};
    });
    return {effect: state.effect_name, speed: state.effect_speed ?? 50, slots};
}

function effectInput(message: KeyValueAny, previous?: EffectSettings): EffectSettings {
    // The legacy nested command {effect: {effect, speed, colors}} is still accepted.
    const legacy: KeyValueAny = message.effect ?? {};
    let slots = previous?.slots ?? fillSlots([red]);
    if (legacy.colors !== undefined) {
        // Round and clamp: the stored palette must stay valid #rrggbb for later commands.
        const channel = (value: unknown = 0) => {
            utils.assertNumber(value, "color");
            return utils.numberWithinRange(Math.round(value), 0, 255);
        };
        slots = fillSlots(
            legacy.colors.map((c: KeyValueAny) => ({r: channel(c.r), g: channel(c.g), b: channel(c.b)})),
            slots,
        );
    }
    if (message.gradient !== undefined) slots = fillSlots(message.gradient.map(parseHex), slots);
    slots = slots.map((slot) => ({...slot}));
    for (const [i, key] of paletteKeys.entries()) {
        const value = message[key];
        // OFF excludes a position but keeps its color. ON restores an off position,
        // using white if its color is missing or black. A HEX value sets and enables the position.
        if (value === "OFF") {
            slots[i].on = false;
        } else if (value === "ON") {
            const color = slots[i].color;
            if (!slots[i].on) slots[i] = {color: color && !isBlack(color) ? color : white, on: true};
        } else if (value !== undefined) {
            slots[i] = {color: parseHex(value), on: true};
        }
    }
    const effect = message.effect_name ?? legacy.effect ?? previous?.effect ?? "steady";
    utils.validateValue(effect, effects);
    const speed = message.effect_speed ?? legacy.speed ?? previous?.speed ?? 50;
    utils.assertNumber(speed, "effect_speed");
    return {effect, speed: utils.numberWithinRange(speed, 0, 100), slots};
}

const toLight: Tz.Converter = {
    key: keys,
    convertSet: async (entity, key, value, meta) => {
        // Z2M calls this converter once per message, whichever of its keys comes first.
        const message: KeyValueAny = meta.message;
        const state: KeyValueAny = {...meta.state, ...recentState(entity)};
        const previous = cachedEffect(state);
        // HA switches palette positions with plain ON/OFF, also for "turn off all lights", and sends
        // ON after each color edit. Outside effect mode this and the speed only update the stored
        // settings for the next effect; an unchanged palette sends nothing.
        const storedOnly = keys.every((k) => message[k] === undefined || k === "effect_speed" || (paletteKeys.includes(k) && isSwitch(message[k])));
        if (storedOnly) {
            const next = effectState(effectInput(message, previous));
            if (message.effect_speed === undefined && previous && next.effect_colors_on.join() === state.effect_colors_on.join()) return;
            if (state.light_mode !== "effect") return remember(entity, next);
        }

        const hasEffect = message.effect !== undefined || effectKeys.some((k) => message[k] !== undefined);
        const requested = hasEffect ? "effect" : message.color !== undefined ? "color" : undefined;
        const mode = message.white !== undefined ? "white" : (message.light_mode ?? requested ?? state.light_mode ?? "white");
        utils.validateValue(mode, modes);
        const brightness = message.white ?? message.brightness;
        if (brightness !== undefined) utils.assertNumber(brightness, "brightness");
        // Brightness does not change an effect. It is kept and applied when the effect is left.
        if (mode === "effect" && !hasEffect && message.light_mode === undefined && brightness !== undefined) {
            return remember(entity, {brightness: utils.numberWithinRange(brightness, 0, 254)});
        }

        const result: KeyValueAny = {light_mode: mode, color_mode: mode === "white" ? "white" : "hs"};
        const leavingEffect = state.light_mode === "effect" && utils.isNumber(state.brightness) ? state.brightness : undefined;
        // Encode everything before sending even the mode command.
        let data: string | undefined;
        if (mode === "white") {
            const level = brightness ?? leavingEffect;
            if (level !== undefined) {
                result.brightness = utils.numberWithinRange(level, 0, 254);
                result.white_brightness = result.brightness;
            } else if (state.white_brightness !== undefined) {
                result.brightness = state.white_brightness;
            }
        } else if (mode === "color") {
            const color: KeyValueAny = message.color ?? {};
            const hue = Math.round(color.h ?? color.hue ?? state.color?.hue ?? 0) % 360;
            const saturation = utils.numberWithinRange(color.s ?? color.saturation ?? state.color?.saturation ?? 100, 0, 100);
            const level = utils.numberWithinRange(brightness ?? leavingEffect ?? state.color_brightness ?? state.brightness ?? 254, 0, 254);
            data = hex(hue, 4) + hex(scale(saturation, 100, 1000), 4) + hex(scale(level, 254, 1000), 4);
            Object.assign(result, {color: {hue, saturation}, brightness: level, color_brightness: level});
        } else {
            const settings = effectInput(message, previous);
            const speed = scale(settings.speed, 100, 64);
            // Effect ID and RGB channels are hexadecimal; speed is DECIMAL ASCII.
            const colors = activeColors(settings.slots).map((c) => rgbHex(c).slice(1));
            data = hex(effects.indexOf(settings.effect), 2) + String(speed).padStart(2, "0") + colors.join("");
            Object.assign(result, effectState({...settings, speed: scale(speed, 64, 100)}));
            if (brightness !== undefined) result.brightness = utils.numberWithinRange(brightness, 0, 254);
        }
        const level = mode === "white" && result.white_brightness !== undefined ? scale(result.white_brightness, 254, 1000) : undefined;
        const dataPoint = mode === "color" ? dataPoints.color : dataPoints.effect;
        remember(entity, result);
        const own = globalStore.getValue(entity, "hg06467State");
        // The string echoes each write, sometimes after a newer one was sent. Only the echo of the
        // latest write per datapoint is published (with optimistic: false, the only state update).
        const write = async <T>(dp: number, value: T, send: (entity: Zh.Endpoint | Zh.Group, dp: number, value: T) => Promise<unknown>) => {
            globalStore.putValue(entity, "hg06467Sent", {...globalStore.getValue(entity, "hg06467Sent"), [dp]: String(value)});
            await send(entity, dp, value);
        };
        try {
            await write(dataPoints.mode, modes.indexOf(mode), tuya.sendDataPointEnum);
            if (level !== undefined) await write(dataPoints.brightness, level, tuya.sendDataPointValue);
            if (data !== undefined) await write(dataPoint, data, tuya.sendDataPointStringBuffer);
        } catch (error) {
            // Later commands must not build on a state the string may not have, unless a newer command replaced it.
            if (globalStore.getValue(entity, "hg06467State") === own) globalStore.clearValue(entity, "hg06467State");
            throw error;
        }
        // Commands can finish out of order (stored settings return at once), so publish the latest state.
        return {state: {...result, ...recentState(entity)}};
    },
};

const fromLight: Fz.Converter<"manuSpecificTuya", undefined, ["commandDataResponse", "commandDataReport"]> = {
    cluster: "manuSpecificTuya",
    type: ["commandDataResponse", "commandDataReport"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        let reported: {effect: string; speed: number; colors: Rgb[]} | undefined;
        const sent = globalStore.getValue(msg.endpoint, "hg06467Sent", {});
        for (const {dp, data} of msg.data.dpValues) {
            const buffer = Buffer.from(data);
            const text = buffer.toString("ascii");
            // A response echoing a superseded write is skipped. The string's own changes (e.g. the
            // button) arrive as reports.
            const value =
                dp === dataPoints.mode ? String(buffer[0]) : dp === dataPoints.brightness ? String(buffer.readUInt32BE()) : text.toLowerCase();
            if (msg.type === "commandDataResponse" && dp !== dataPoints.power && sent[dp] !== value) continue;
            if (dp === dataPoints.power) {
                // The button switches the string with this DP only, without a genOnOff report.
                result.state = buffer[0] ? "ON" : "OFF";
            } else if (dp === dataPoints.mode && modes[buffer[0]]) {
                result.light_mode = modes[buffer[0]];
            } else if (dp === dataPoints.brightness) {
                result.white_brightness = scale(buffer.readUInt32BE(), 1000, 254);
            } else if (dp === dataPoints.color) {
                const [hue, saturation, level] = [0, 4, 8].map((offset) => Number.parseInt(text.slice(offset, offset + 4), 16));
                result.color = {hue: hue % 360, saturation: saturation / 10};
                result.color_brightness = scale(level, 1000, 254);
            } else if (dp === dataPoints.effect) {
                const colors: Rgb[] = [];
                for (let i = 4; i + 6 <= text.length; i += 6) colors.push(parseHex(`#${text.slice(i, i + 6)}`));
                const speed = Number.parseInt(text.slice(2, 4), 10);
                reported = {effect: effects[Number.parseInt(text.slice(0, 2), 16)], speed: scale(speed, 64, 100), colors};
            }
        }
        // Build on the state just computed by SETs: Z2M may not have published it yet (or at all).
        const state: KeyValueAny = {...meta.state, ...recentState(msg.endpoint)};
        const mode = result.light_mode ?? state.light_mode;
        const cached = reported && cachedEffect(state);
        // Outside effect mode the stored settings are newer than the string's: e.g. a speed kept for
        // the next effect, a late echo, or the older palette reported after a power cycle.
        if (reported && (!cached || mode === undefined || mode === "effect")) {
            // Reporting the palette that was sent keeps the switched-off positions; any other
            // palette fills positions 1..n.
            const sent = cached ? activeColors(cached.slots).map(rgbHex).join() : undefined;
            const slots = cached && sent === reported.colors.map(rgbHex).join() ? cached.slots : fillSlots(reported.colors, cached?.slots);
            Object.assign(result, effectState({effect: reported.effect, speed: reported.speed, slots}));
        }
        if (Object.keys(result).length === 0) return result;
        if (mode) result.color_mode = mode === "white" ? "white" : "hs";
        const brightness =
            mode === "white"
                ? (result.white_brightness ?? state.white_brightness)
                : mode === "color"
                  ? (result.color_brightness ?? state.color_brightness)
                  : undefined;
        if (brightness !== undefined) result.brightness = brightness;
        return result;
    },
};

export function hg06467(): ModernExtend {
    const light = e.light_brightness_colorhs().setAccess("brightness", ea.STATE_SET).setAccess("color_hs", ea.STATE_SET);
    light.features
        .find((feature) => feature.name === "brightness")
        .withDescription("Brightness in white/color mode. In effect mode it is kept for leaving the effect.");

    return {
        isModernExtend: true,
        meta: {
            overrideHaDiscoveryPayload: (payload, options = {}) => {
                if (payload.schema === "json" && payload.brightness) {
                    payload.supported_color_modes = ["hs", "white"];
                    payload.white_scale = 254;
                    payload.transition = false;
                }
                const palette = typeof payload.command_topic === "string" && /\/set\/(effect_color_[1-6])$/.exec(payload.command_topic);
                if (palette && (options.homeassistant?.[palette[1]]?.type ?? "light") === "light") {
                    const key = palette[1];
                    const readColor = `{% set c = value_json.get('${key}') or '#000000' %}`;
                    // Reuse the HEX command and state fields through HA's native RGB light editor.
                    delete payload.value_template;
                    delete payload.pattern;
                    delete payload.min;
                    delete payload.max;
                    payload.schema = "basic";
                    payload.rgb_command_topic = payload.command_topic;
                    payload.rgb_state_topic = payload.state_topic;
                    payload.rgb_command_template = "{{ '#%02x%02x%02x' | format(red, green, blue) }}";
                    payload.rgb_value_template = `${readColor}{{ c[1:3] | int(0, 16) }},{{ c[3:5] | int(0, 16) }},{{ c[5:7] | int(0, 16) }}`;
                    // HA's default on_command_type ("last") sends ON after an RGB edit, or alone
                    // for a plain turn on. ON/OFF switch the position; it keeps its color while off.
                    payload.payload_on = "ON";
                    payload.payload_off = "OFF";
                    payload.state_value_template = `{{ 'ON' if ${key.slice(-1)} in value_json.get('effect_colors_on', []) else 'OFF' }}`;
                    payload.optimistic = false;
                    payload.icon = "mdi:palette";
                } else if (palette) {
                    payload.pattern = "^#[0-9a-fA-F]{6}$";
                    payload.min = 7;
                    payload.max = 7;
                }
            },
        },
        fromZigbee: [fz.on_off, fromLight],
        toZigbee: [tz.on_off, toLight],
        exposes: [
            light,
            e.enum("light_mode", ea.STATE_SET, modes).withDescription("White light, static color, or animated effect"),
            e
                .enum("effect_name", ea.STATE_SET, effects)
                .withLabel("Effect")
                .withDescription("Select a built-in effect and enter effect mode. Retains speed and palette."),
            e
                .numeric("effect_speed", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1)
                // Z2M discovers effect_speed as a config entity next to the palette; keep it enabled.
                .withHomeAssistant({enabledByDefault: true})
                .withDescription("Animation speed (device resolution: 0..64). Outside effect mode it is kept for the next effect."),
            // The name selects Z2M's native RGB palette editor. SET-only avoids an
            // extra read-only HA sensor; state is still supplied for the frontend.
            e
                .list("gradient", ea.SET, e.text("color", ea.SET))
                .withLengthMin(1)
                .withLengthMax(6)
                .withLabel("Effect palette")
                .withDescription("Effect colors for positions 1..N; later positions are switched off. Applying enters effect mode."),
            ...paletteKeys.map((key) =>
                e
                    .text(key, ea.STATE_SET)
                    // Config entities are excluded from area/device targets and voice assistants.
                    .withHomeAssistant({type: "light", entityCategory: "config"})
                    .withDescription("Palette color as #RRGGBB, or ON/OFF to include it in the effect"),
            ),
        ],
    };
}
