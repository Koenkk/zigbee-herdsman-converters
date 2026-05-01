import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as reporting from "../lib/reporting";
import * as libColor from "./color";
import {ColorRGB, ColorXY} from "./color";
import * as exposes from "./exposes";
import * as light from "./light";
import {logger} from "./logger";
import * as modernExtend from "./modernExtend";
import * as globalStore from "./store";
import type {Configure, Expose, Fz, KeyValue, KeyValueAny, ModernExtend, Tz} from "./types";
import * as utils from "./utils";
import {determineEndpoint, exposeEndpoints, hasAlreadyProcessedMessage, isObject, numberWithinRange} from "./utils";

const NS = "zhc:philips";
const ea = exposes.access;
const e = exposes.presets;
const eNumeric = exposes.Numeric;

// Gradient color XY scaling constants per Bifrost spec.
// MAX_X = 0.7347: maximum X inside the visible light spectrum / Wide Gamut red X.
// MAX_Y = 0.8264: outer bound of the Wide Gamut Y axis.
// NOTE: many older implementations incorrectly use 0.8431 for MAX_Y.
const GRADIENT_COLORS_MAX_X = 0.7347;
const GRADIENT_COLORS_MAX_Y = 0.8264;

const encodeRGBToScaledGradient = (hex: string) => {
    const xy = ColorRGB.fromHex(hex).toXY();
    const x = (xy.x * 4095) / GRADIENT_COLORS_MAX_X;
    const y = (xy.y * 4095) / GRADIENT_COLORS_MAX_Y;
    const xx = Math.round(x).toString(16).padStart(3, "0");
    const yy = Math.round(y).toString(16).padStart(3, "0");

    return [xx[1], xx[2], yy[2], xx[0], yy[0], yy[1]].join("");
};

const decodeScaledGradientToRGB = (p: string) => {
    const x = p[3] + p[0] + p[1];
    const y = p[4] + p[5] + p[2];

    const xx = Number(((Number.parseInt(x, 16) * GRADIENT_COLORS_MAX_X) / 4095).toFixed(4));
    const yy = Number(((Number.parseInt(y, 16) * GRADIENT_COLORS_MAX_Y) / 4095).toFixed(4));

    return new ColorXY(xx, yy).toRGB().toHEX();
};

const COLOR_MODE_GRADIENT = "4b01";
const COLOR_MODE_COLOR_XY = "0b00";
const COLOR_MODE_COLOR_TEMP = "0f00";
const COLOR_MODE_EFFECT = "ab00";
const COLOR_MODE_BRIGHTNESS = "0300";

export const knownEffects = {
    "0180": "candle",
    "0280": "fireplace",
    "0380": "colorloop",
    "0980": "sunrise",
    "0a80": "sparkle",
    "0b80": "opal",
    "0c80": "glisten",
    "0d80": "sunset",
    "0e80": "underwater",
    "0f80": "cosmos",
    "1080": "sunbeam",
    "1180": "enchant",
};

interface PhilipsContact {
    attributes: {
        contact: number;
        contactLastChange: number;
        tamper: number;
        tamperLastChange: number;
    };
    commands: never;
    commandResponses: never;
}

interface ManuSpecificPhilips {
    attributes: {
        /** ID=0x0031 | type=BITMAP16 | write=true */
        config: number;
    };
    commands: never;
    commandResponses: {
        /** ID=0x00 */
        hueNotification: {
            /** type=UINT8 | max=255 */
            button: number;
            /** type=UINT24 | max=16777215 */
            unknown1: number;
            /** type=UINT8 | max=255 */
            type: number;
            /** type=UINT8 | max=255 */
            unknown2: number;
            /** type=UINT8 | max=255 */
            time: number;
            /** type=UINT8 | max=255 */
            unknown3: number;
        };
    };
}

interface ManuSpecificPhilips2 {
    attributes: {
        /** ID=0x0002 | type=OCTET_STR | write=true */
        state: Buffer;
    };
    commands: {
        /** ID=0x00 */
        multiColor: {
            /** type=BUFFER */
            data: Buffer;
        };
    };
    commandResponses: never;
}

export const manuSpecificPhilips2Fz: Fz.Converter<"manuSpecificPhilips2", ManuSpecificPhilips2, ["attributeReport", "readResponse"]> = {
    cluster: "manuSpecificPhilips2",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const retval: KeyValueAny = {};
        if (msg.data.state !== undefined) {
            // Publish the raw, unaltered state blob so advanced clients (e.g. Bifrost)
            // can perform their own decoding without depending on z2m's interpretation.
            retval["philips_raw"] = msg.data.state.toString("hex");

            const decoded = DecodeManuSpecificPhilips2(msg.data.state);
            logger.debug(`Decoded manuSpecificPhilips2 state: ${JSON.stringify(decoded)}`, NS);
            if (decoded.onOff !== undefined) {
                retval["state"] = decoded.onOff ? "ON" : "OFF";
            }
            if (decoded.brightness !== undefined) {
                retval["brightness"] = decoded.brightness;
            }
            if (decoded.colorMirek !== undefined) {
                retval["color_temp"] = decoded.colorMirek;
                retval["color_mode"] = "color_temp";
            }
            if (decoded.colorXY !== undefined) {
                retval["color"] = decoded.colorXY.toObject();
                retval["color_mode"] = "xy";
            }
            if (decoded.fadeSpeed !== undefined) {
                retval["transition"] = decoded.fadeSpeed;
            }
            if (decoded.effectType !== undefined) {
                retval["effect"] = effectNames[decoded.effectType] ?? `unknown_0x${decoded.effectType.toString(16)}`;
            }
            if (decoded.effectSpeed !== undefined) {
                retval["effect_speed"] = decoded.effectSpeed;
            }
            if (decoded.gradientColors !== undefined) {
                // RGB hex for backward compat with z2m frontend and existing automations
                retval["gradient"] = decoded.gradientColors.colors.map((c: ColorXY) => c.toRGB().toHEX());
                // Lossless XY coordinates for clients that need device-independent color
                retval["gradient_xy"] = decoded.gradientColors.colors.map((c: ColorXY) => c.toObject());
                retval["gradient_style"] = gradientStyleNames[decoded.gradientColors.style] ?? "unknown";
            }
            if (decoded.gradientParams !== undefined) {
                retval["gradient_scale"] = decoded.gradientParams.scale;
                retval["gradient_offset"] = decoded.gradientParams.offset;
            }
        }

        return retval;
    },
};

// Keys for Philips2-specific features not handled by standard light converters.
const philips2Keys = ["effect_speed", "gradient_scale", "gradient_offset", "gradient_style", "effect_color"];

const philipsModernExtend = {
    addCustomClusterManuSpecificPhilipsContact: () =>
        modernExtend.deviceAddCustomCluster("manuSpecificPhilipsContact", {
            name: "manuSpecificPhilipsContact",
            ID: 0xfc06,
            manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
            attributes: {
                contact: {name: "contact", ID: 0x0100, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                contactLastChange: {name: "contactLastChange", ID: 0x0101, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                tamper: {name: "tamper", ID: 0x0102, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                tamperLastChange: {name: "tamperLastChange", ID: 0x0103, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
            },
            commands: {},
            commandsResponse: {},
        }),
    addManuSpecificPhilipsCluster: () =>
        modernExtend.deviceAddCustomCluster("manuSpecificPhilips", {
            name: "manuSpecificPhilips",
            ID: 0xfc00,
            manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
            attributes: {
                config: {name: "config", ID: 0x0031, type: Zcl.DataType.BITMAP16, write: true},
            },
            commands: {},
            commandsResponse: {
                hueNotification: {
                    name: "hueNotification",
                    ID: 0x00,
                    parameters: [
                        {name: "button", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "unknown1", type: Zcl.DataType.UINT24, max: 0xffffff},
                        {name: "type", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "unknown2", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "time", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "unknown3", type: Zcl.DataType.UINT8, max: 0xff},
                    ],
                },
            },
        }),
    addManuSpecificPhilips2Cluster: () =>
        modernExtend.deviceAddCustomCluster("manuSpecificPhilips2", {
            name: "manuSpecificPhilips2",
            ID: 0xfc03,
            manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
            attributes: {
                state: {name: "state", ID: 0x0002, type: Zcl.DataType.OCTET_STR, write: true},
            },
            commands: {
                multiColor: {name: "multiColor", ID: 0x00, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}]},
            },
            commandsResponse: {},
        }),
    addManuSpecificPhilips3Cluster: () =>
        modernExtend.deviceAddCustomCluster("manuSpecificPhilips3", {
            name: "manuSpecificPhilips3",
            ID: 0xfc01,
            manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
            attributes: {},
            commands: {
                command1: {name: "command1", ID: 1, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}]},
                command2: {name: "command2", ID: 2, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}]},
                command3: {name: "command3", ID: 3, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}]},
                command4: {name: "command4", ID: 4, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}]},
                command7: {name: "command7", ID: 7, parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}]},
            },
            commandsResponse: {},
        }),

    light: (args?: modernExtend.LightArgs & {hueEffect?: boolean; gradient?: true | {extraEffects: string[]}}) => {
        args = {hueEffect: true, turnsOffAtBrightness1: true, ota: true, ...args};
        if (args.hueEffect || args.gradient) args.effect = false;
        if (args.color) args.color = {modes: ["xy", "hs"], enhancedHue: true, ...(isObject(args.color) ? args.color : {})};

        const result = modernExtend.light(args);
        const toZigbee = result.toZigbee;
        result.toZigbee = [];

        // Keys we intercept for Hue native control: core light attributes
        // that can be sent atomically via the manuSpecificPhilips2 cluster.
        // Command-only keys (brightness_move, hue_step, etc.) have no Philips2
        // equivalent and are left to their standard converters in the array.
        const nativeKeys = ["state", "brightness", "brightness_percent", "color", "color_temp", "color_temp_percent", "transition"];
        const keys = [...nativeKeys, ...philips2Keys];
        const philipsLightTz = {
            key: keys,
            convertSet: async (entity, key, value, meta) => {
                // Resolve control mode: explicit option wins; otherwise default to standard converters.
                const nativeControl = (meta.options as KeyValueAny).hue_native_control === true;

                // Check if device supports the manuSpecificPhilips2 cluster.
                // Wrapped in try-catch because supportsInputCluster may throw for
                // custom clusters not in the cluster registry (e.g. in test mocks).
                let hasPhilips2Cluster = false;
                if (utils.isEndpoint(entity)) {
                    try {
                        hasPhilips2Cluster = entity.supportsInputCluster("manuSpecificPhilips2");
                    } catch {
                        hasPhilips2Cluster = false;
                    }
                }

                // Delegate to standard converters if:
                //   - Device doesn't support manuSpecificPhilips2 cluster (old bulbs), OR
                //   - User hasn't opted into native Philips2 control (default)
                // This mimics Z2M's own per-key dispatch so a single message routes
                // each key to the appropriate converter.
                const mustDelegate = (utils.isEndpoint(entity) && !hasPhilips2Cluster) || !nativeControl;

                if (mustDelegate) {
                    const used = new Set<Tz.Converter>();
                    let mergedState: KeyValue = {};
                    // Replicate Z2M's key ordering (publish.ts): when turning off,
                    // state/brightness come first; otherwise they come last. This ensures
                    // standard converters are called in the same sequence as without our
                    // intercepting converter, so e.g. the light turns on before color is
                    // set, and color is set before the light turns off.
                    const messageEntries = Object.entries(meta.message);
                    const stateValue = typeof meta.message.state === "string" ? (meta.message.state as string).toLowerCase() : undefined;
                    const sorter = stateValue === "off" ? 1 : -1;
                    messageEntries.sort((a) => (["state", "brightness", "brightness_percent"].includes(a[0]) ? sorter : sorter * -1));
                    for (const [msgKey, msgValue] of messageEntries) {
                        // Only delegate keys we claim. Command-only keys (brightness_move,
                        // hue_step, etc.) are NOT in our key list — Z2M routes them to
                        // their standard converters directly.
                        if (!keys.includes(msgKey)) continue;
                        // philips2Keys have no standard equivalent and are handled below.
                        if (philips2Keys.includes(msgKey)) continue;
                        for (const tz of toZigbee) {
                            if (!used.has(tz) && tz.key.includes(msgKey) && tz.convertSet) {
                                used.add(tz);
                                const result = await tz.convertSet(entity, msgKey, msgValue, meta);
                                if (result && "state" in result && result.state) {
                                    mergedState = {...mergedState, ...result.state};
                                }
                                break;
                            }
                        }
                    }
                    // In delegated mode, we still need to handle Philips2-specific keys (effect_color,
                    // effect_speed, gradient_scale, etc.) below. But if the current call is for a
                    // standard key and no Philips2-specific keys are in the message, we're done.
                    const hasPhilips2Keys = Object.keys(meta.message).some((k) => philips2Keys.includes(k));
                    if (!hasPhilips2Keys) {
                        return Object.keys(mergedState).length > 0 ? {state: mergedState} : undefined;
                    }
                    // Fall through: continue below to handle Philips2-specific fields only.
                }

                // Native control mode (or handling Philips2-specific keys in delegate mode):
                // build a Philips2 payload from the message. In delegate mode, we filter out
                // standard keys since the standard converters already sent them.
                const message = nativeControl
                    ? meta.message
                    : Object.fromEntries(Object.entries(meta.message).filter(([k]) => philips2Keys.includes(k)));
                const newState: KeyValue = {};

                const data: Philips2Data = {};

                if (message.state !== undefined && typeof message.state === "string") {
                    const msgState = message.state.toLowerCase();
                    if (["on", "off", "toggle"].includes(msgState) === true) {
                        const targetState = msgState === "toggle" ? (meta.state.state === "ON" ? "off" : "on") : msgState;
                        data.onOff = targetState === "on";
                        newState.state = data.onOff ? "ON" : "OFF";
                    }
                }
                if (message.brightness != null) {
                    // Bifrost spec: brightness values 0 and 255 are INVALID, valid range 1..254
                    data.brightness = clamp(Number(message.brightness), 1, 254);
                } else if (message.brightness_percent != null) {
                    data.brightness = clamp(utils.mapNumberRange(Number(message.brightness_percent), 0, 100, 0, 255), 1, 254);
                }
                if (data.brightness !== undefined) {
                    newState.brightness = data.brightness;
                }
                if (message.color != null) {
                    const newColor = libColor.Color.fromConverterArg(message.color);
                    if (newColor.isHSV()) {
                        // Convert HSV → RGB → XY instead of silently dropping
                        const xy = newColor.hsv.toRGB().gammaCorrected().toXY().rounded(4);
                        data.colorXY = xy;
                    } else {
                        const xy = newColor.isRGB() ? newColor.rgb.gammaCorrected().toXY().rounded(4) : newColor.xy;
                        data.colorXY = xy;
                    }
                    newState.color_mode = "xy";
                    newState.color = data.colorXY.toObject();
                }
                if (message.color_temp != null || message.color_temp_percent != null) {
                    const [colorTempMin, colorTempMax] = light.findColorTempRange(entity);
                    const preset = {warmest: colorTempMax, warm: 454, neutral: 370, cool: 250, coolest: colorTempMin};

                    let colorTemp = message.color_temp;
                    if (message.color_temp_percent != null) {
                        colorTemp = utils
                            .mapNumberRange(
                                Number(message.color_temp_percent),
                                0,
                                100,
                                colorTempMin != null ? colorTempMin : 154,
                                colorTempMax != null ? colorTempMax : 500,
                            )
                            .toString();
                    }
                    if (utils.isString(colorTemp) && colorTemp in preset) {
                        data.colorMirek = utils.getFromLookup(colorTemp, preset);
                    } else {
                        data.colorMirek = Number(colorTemp);
                    }
                    newState.color_mode = "color_temp";
                    newState.color_temp = data.colorMirek;
                }

                // Map transition time to Philips2 fadeSpeed
                // Bifrost spec: 0 = instant, practical range ~2..8, >0x100 = very slow
                if (message.transition != null) {
                    data.fadeSpeed = Math.round(Number(message.transition));
                }

                // Effect speed: 0.0 = slowest, 1.0 = fastest (maps to 0..255 byte)
                if (message.effect_speed != null) {
                    data.effectSpeed = clamp(Number(message.effect_speed), 0, 1);
                }

                // Gradient scale/offset: fixed-point 5.3 format, exposed as float
                if (message.gradient_scale != null) {
                    if (data.gradientParams === undefined) {
                        data.gradientParams = {scale: Number(message.gradient_scale), offset: 0};
                    } else {
                        data.gradientParams.scale = Number(message.gradient_scale);
                    }
                }
                if (message.gradient_offset != null) {
                    if (data.gradientParams === undefined) {
                        data.gradientParams = {scale: 1.0, offset: Number(message.gradient_offset)};
                    } else {
                        data.gradientParams.offset = Number(message.gradient_offset);
                    }
                }

                // Gradient style: stored in state for use with gradient color commands.
                // When gradient colors are also being sent through this path, the style
                // is applied directly to data.gradientColors.style.
                if (message.gradient_style != null) {
                    const styleLookup: Record<string, HueGradientStyle> = {
                        linear: HueGradientStyle.Linear,
                        scattered: HueGradientStyle.Scattered,
                        mirrored: HueGradientStyle.Mirrored,
                    };
                    const style = styleLookup[String(message.gradient_style).toLowerCase()];
                    if (style !== undefined) {
                        if (data.gradientColors !== undefined) {
                            data.gradientColors.style = style;
                        }
                        newState.gradient_style = message.gradient_style;
                    }
                }

                // When color/color_temp changes without an explicit effect command,
                // behavior depends on the effect_color_mode option:
                // - "stop" (default, matches Hue app): color change stops the effect
                // - "update": color change re-sends the active effect with the new color
                if ((data.colorXY !== undefined || data.colorMirek !== undefined) && message.effect === undefined) {
                    const effectColorMode = (meta.options as KeyValueAny).effect_color_mode ?? "stop";
                    const activeEffect = meta.state?.effect as string | undefined;
                    if (effectColorMode === "update" && activeEffect && activeEffect !== "none" && activeEffect in effectLookupAll) {
                        // Re-send the active effect with the new color
                        data.effectType = effectLookupAll[activeEffect];
                        newState.effect = activeEffect;
                    } else {
                        // Hue app behavior: color change stops effect, clear stale state
                        newState.effect = "none";
                    }
                }

                // Handle effect_color: explicitly set the active effect's base color
                // without stopping it. If no effect is active, just sets the color.
                if (message.effect_color != null) {
                    const newColor = libColor.Color.fromConverterArg(message.effect_color);
                    if (newColor.isHSV()) {
                        data.colorXY = newColor.hsv.toRGB().gammaCorrected().toXY().rounded(4);
                    } else {
                        data.colorXY = newColor.isRGB() ? newColor.rgb.gammaCorrected().toXY().rounded(4) : newColor.xy;
                    }
                    newState.color_mode = "xy";
                    newState.color = data.colorXY.toObject();
                    // Re-send the active effect with the new color
                    const activeEffect = meta.state?.effect as string | undefined;
                    if (activeEffect && activeEffect !== "none" && activeEffect in effectLookupAll) {
                        data.effectType = effectLookupAll[activeEffect];
                        newState.effect = activeEffect;
                    }
                }

                // When re-sending an effect (via effect_color or "update" mode),
                // the effect resets brightness on activation. To preserve the user's
                // brightness, we send it as a separate command AFTER the effect.
                // Extract brightness now and send it after the main payload.
                let deferredBrightness: number | undefined;
                if (data.effectType !== undefined && message.effect === undefined) {
                    if (data.brightness !== undefined) {
                        // User explicitly sent brightness alongside color — defer it
                        deferredBrightness = data.brightness;
                        delete data.brightness;
                        // Keep newState.brightness so state updates correctly
                    }
                }

                const encodedPayload = Buffer.from(EncodeManuSpecificPhilips2(data));
                // An empty Philips2Data encodes as just 2 zero bytes (the flags header).
                // Check length rather than all-zeros, since a valid payload could
                // legitimately contain zero-valued fields.
                if (encodedPayload.length <= 2) {
                    logger.debug("No Philips2 fields to send, falling back to standard converters", NS);
                    // Delegate to the standard converter that handles this key.
                    // Z2M calls convertSet once per key, so exactly one converter matches.
                    for (const tz of toZigbee) {
                        if (tz.key.includes(key)) {
                            return await tz.convertSet(entity, key, value, meta);
                        }
                    }
                } else {
                    logger.debug(`Sending manuSpecificPhilips2 payload: ${encodedPayload.toString("hex")}`, NS);
                    const payload = {data: encodedPayload};
                    await entity.command<"manuSpecificPhilips2", "multiColor", ManuSpecificPhilips2>("manuSpecificPhilips2", "multiColor", payload);

                    // Send brightness as a separate command after effect activation,
                    // since the effect resets brightness on start.
                    if (deferredBrightness !== undefined) {
                        const brightnessData: Philips2Data = {brightness: deferredBrightness};
                        const brightnessPayload = Buffer.from(EncodeManuSpecificPhilips2(brightnessData));
                        await entity.command<"manuSpecificPhilips2", "multiColor", ManuSpecificPhilips2>("manuSpecificPhilips2", "multiColor", {
                            data: brightnessPayload,
                        });
                        newState.brightness = deferredBrightness;
                    }

                    // When an effect is active or being set, read state after a delay
                    // to sync brightness (effects modulate it internally).
                    if (data.effectType !== undefined) {
                        setTimeout(async () => {
                            try {
                                await entity.read<"manuSpecificPhilips2", ManuSpecificPhilips2>("manuSpecificPhilips2", ["state"]);
                            } catch (_e) {
                                // Best-effort sync
                            }
                        }, 1000);
                    }

                    // Merge syncColorState results into newState. syncColorState
                    // returns only color-related keys (color, color_mode, color_temp),
                    // so we spread it on top of newState to keep state, brightness,
                    // effect, etc. intact.
                    const colorState = libColor.syncColorState(newState, meta.state, entity, meta.options);
                    return {state: {...newState, ...colorState}};
                }
            },
            convertGet: async (entity, key, meta) => {
                let hasPhilips2Cluster = false;
                if (utils.isEndpoint(entity)) {
                    try {
                        hasPhilips2Cluster = entity.supportsInputCluster("manuSpecificPhilips2");
                    } catch {
                        hasPhilips2Cluster = false;
                    }
                }
                if (utils.isEndpoint(entity) && !hasPhilips2Cluster) {
                    for (const tz of toZigbee) {
                        if (tz.key.includes(key) && tz.convertGet) {
                            return await tz.convertGet(entity, key, meta);
                        }
                    }
                    return;
                }
                try {
                    await entity.read<"manuSpecificPhilips2", ManuSpecificPhilips2>("manuSpecificPhilips2", ["state"]);
                } catch (e) {
                    logger.debug(`Reading manuSpecificPhilips2 state failed: ${e}`, NS);
                }
            },
            options: [
                new exposes.Binary("hue_native_control", ea.SET, true, false).withDescription(
                    "Control this light using a Philips-specific protocol instead of standard Zigbee commands. " +
                        "When enabled, on/off, brightness, color, and color temperature are combined into single atomic commands. " +
                        "This is required to use the Effect color update mode. " +
                        "When disabled (default), standard Zigbee commands are used, which preserves the usual behavior, " +
                        "including simulating on/off transitions.",
                ),
                new exposes.Enum("effect_color_mode", ea.SET, ["stop", "update"]).withDescription(
                    "Controls what happens when color is changed while an effect is active (requires Hue native control). " +
                        "'stop' (default): color change stops the effect (Hue app behavior). " +
                        "'update': color change re-sends the effect with the new color.",
                ),
            ],
        } satisfies Tz.Converter;

        // philipsLightTz claims all standard light keys. Inside convertSet, it delegates
        // back to the original standard converters by default (opt-out), or sends via
        // manuSpecificPhilips2 when the user enables the hue_native_control option.
        // The original standard converters are captured in the `toZigbee` closure above.
        // Standard converters for keys we DON'T claim. For converters that handle
        // both claimed and unclaimed keys (e.g. light_onoff_brightness handles "state"
        // which we claim AND "on_time" which we don't), we create wrappers with only
        // the unclaimed keys so Z2M doesn't double-dispatch.
        const unclaimed: Tz.Converter[] = [];
        for (const tz of toZigbee) {
            const unclaimedKeys = tz.key.filter((k: string) => !keys.includes(k));
            if (unclaimedKeys.length === 0) continue; // We claim all keys of this converter
            if (unclaimedKeys.length === tz.key.length) {
                // No overlap — include as-is
                unclaimed.push(tz);
            } else {
                // Partial overlap — wrap with only unclaimed keys
                unclaimed.push({...tz, key: unclaimedKeys});
            }
        }
        result.toZigbee = [philipsLightTz, philipsTz.hue_power_on_behavior, philipsTz.hue_power_on_error, ...unclaimed];

        if (args.hueEffect || args.gradient) {
            result.toZigbee.push(philipsTz.effect);
            const effects = ["blink", "breathe", "okay", "channel_change", "candle"];
            if (args.color) effects.push("fireplace", "colorloop");
            if (args.gradient) {
                result.toZigbee.push(philipsTz.gradient_scene, philipsTz.gradient({reverse: true}));
                effects.push("sunrise");
                if (args.gradient !== true) {
                    effects.push(...args.gradient.extraEffects);
                }
                result.exposes.push(
                    // gradient_scene is deprecated, use gradient instead
                    ...exposeEndpoints(e.enum("gradient_scene", ea.SET, Object.keys(gradientScenes)), args.endpointNames),
                    ...exposeEndpoints(
                        e
                            .list("gradient", ea.ALL, e.text("hex", ea.ALL).withDescription("Color in RGB HEX format (eg #663399)"))
                            .withLengthMin(1)
                            .withLengthMax(9)
                            .withDescription("List of RGB HEX colors"),
                        args.endpointNames,
                    ),
                );
            }
            // Bind manuSpecificPhilips2 and register the Fz converter for all
            // hueEffect/gradient devices, not just gradient. This enables state
            // reports for effects, brightness, color, etc. on non-gradient bulbs too.
            result.fromZigbee.push(manuSpecificPhilips2Fz);
            result.configure.push(async (device, coordinatorEndpoint, definition) => {
                for (const ep of device.endpoints) {
                    let supported = false;
                    try {
                        supported = ep.supportsInputCluster("manuSpecificPhilips2");
                    } catch {
                        // Custom cluster not in registry — skip
                    }
                    if (supported) {
                        await ep.bind("manuSpecificPhilips2", coordinatorEndpoint);
                    }
                }
            });
            // All Hue-specific effects per Bifrost spec
            effects.push("sunset", "sparkle", "opal", "glisten", "underwater", "cosmos", "sunbeam", "enchant");
            effects.push("none", "finish_effect", "stop_effect", "stop_hue_effect");
            result.exposes.push(...exposeEndpoints(e.enum("effect", ea.STATE_SET, effects), args.endpointNames));

            // Expose effect_speed as a numeric 0..1 (0=slowest, 1=fastest)
            result.exposes.push(
                ...exposeEndpoints(
                    new eNumeric("effect_speed", ea.STATE_SET)
                        .withValueMin(0)
                        .withValueMax(1)
                        .withValueStep(0.01)
                        .withDescription("Animation speed for the active effect (0=slowest, 1=fastest)"),
                    args.endpointNames,
                ),
            );

            // Expose effect_color: sets the base color of the active effect
            // without stopping it. Accepts same formats as color (hex, xy, hs).
            result.exposes.push(
                ...exposeEndpoints(
                    e
                        .text("effect_color", ea.SET)
                        .withDescription('Set the base color of the active effect without stopping it (hex e.g. #FF4400, or JSON {"x":0.6,"y":0.3})'),
                    args.endpointNames,
                ),
            );

            if (args.gradient) {
                // Expose gradient style as an enum (per Bifrost spec: Linear, Scattered, Mirrored)
                result.exposes.push(
                    ...exposeEndpoints(
                        e
                            .enum("gradient_style", ea.ALL, ["linear", "scattered", "mirrored"])
                            .withDescription(
                                "Gradient rendering style: linear (smooth blend), scattered (color per segment), mirrored (symmetric from center)",
                            ),
                        args.endpointNames,
                    ),
                );

                // Expose gradient scale and offset as numerics (fixed-point 5.3 format)
                result.exposes.push(
                    ...exposeEndpoints(
                        new eNumeric("gradient_scale", ea.SET)
                            .withValueMin(0)
                            .withValueMax(31)
                            .withValueStep(0.125)
                            .withDescription("Gradient scale (0=auto fit, 1.0+=number of colors visible)"),
                        args.endpointNames,
                    ),
                    ...exposeEndpoints(
                        new eNumeric("gradient_offset", ea.SET)
                            .withValueMin(0)
                            .withValueMax(31)
                            .withValueStep(0.125)
                            .withDescription("Gradient color offset (0=start from first color)"),
                        args.endpointNames,
                    ),
                );
            }
        }

        const customCluster2 = philipsModernExtend.addManuSpecificPhilips2Cluster();
        const customCluster3 = philipsModernExtend.addManuSpecificPhilips3Cluster();
        result.onEvent = [...customCluster2.onEvent, ...customCluster3.onEvent, ...(result.onEvent ?? [])];
        result.configure = [...customCluster2.configure, ...customCluster3.configure, ...(result.configure ?? [])];

        return result;
    },
    onOff: (args?: modernExtend.OnOffArgs) => {
        args = {powerOnBehavior: false, ota: true, ...args};
        const result = modernExtend.onOff(args);
        result.toZigbee.push(philipsTz.hue_power_on_behavior, philipsTz.hue_power_on_error);
        return result;
    },
    twilightOnOff: () => {
        const fromZigbee = [fz.ignore_command_on, fz.ignore_command_off, philipsFz.hue_twilight];
        const exposes = [
            e.action([
                "dot_press",
                "dot_hold",
                "dot_press_release",
                "dot_hold_release",
                "hue_press",
                "hue_hold",
                "hue_press_release",
                "hue_hold_release",
            ]),
        ];
        const toZigbee: Tz.Converter[] = [];
        const configure: Configure[] = [
            async (device, coordinatorEndpoint) => {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "manuSpecificPhilips"]);
            },
        ];
        const result: ModernExtend = {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
        return result;
    },
    contact: () => {
        const exposes: Expose[] = [
            e.contact().withAccess(ea.STATE_GET),
            e.tamper().withAccess(ea.STATE_GET),
            new eNumeric("contact_last_changed", ea.STATE_GET)
                .withUnit("s")
                .withDescription("Time (in seconds) since when contact was last changed."),
            new eNumeric("tamper_last_changed", ea.STATE_GET).withUnit("s").withDescription("Time (in seconds) since when tamper was last changed."),
        ];
        const fromZigbee = [
            {
                cluster: "manuSpecificPhilipsContact",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const payload: KeyValueAny = {};
                    if (msg.data.contact !== undefined) {
                        // NOTE: 0 = closed, 1 = open
                        payload.contact = msg.data.contact === 0;
                    }

                    if (msg.data.tamper !== undefined) {
                        // NOTE: 0 = OK, 1 = tampered
                        payload.tamper = msg.data.tamper > 0;
                    }

                    if (msg.data.contactLastChange !== undefined) {
                        // NOTE: seems to be 1/10 of a second
                        payload.contact_last_changed = Math.round(msg.data.contactLastChange / 10);
                    }

                    if (msg.data.tamperLastChange !== undefined) {
                        // NOTE: seems to be 1/10 of a second
                        payload.tamper_last_changed = Math.round(msg.data.tamperLastChange / 10);
                    }

                    return payload;
                },
            } satisfies Fz.Converter<"manuSpecificPhilipsContact", PhilipsContact, ["attributeReport", "readResponse"]>,
            // NOTE: kept for compatibility as there is no auto-reconfigure for modernExtend
            //       this should not fire once reconfigured.
            {
                cluster: "genOnOff",
                type: ["commandOff", "commandOn"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.type === "commandOff" || msg.type === "commandOn") {
                        return {contact: msg.type === "commandOff"};
                    }
                },
            } satisfies Fz.Converter<"genOnOff", undefined, ["commandOff", "commandOn"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["contact", "tamper", "contact_last_changed", "tamper_last_changed"],
                convertGet: async (entity, key, meta) => {
                    let attrib = key as "contact" | "tamper" | "contactLastChange" | "tamperLastChange";

                    switch (key) {
                        case "contact_last_changed":
                            attrib = "contactLastChange";
                            break;
                        case "tamper_last_changed":
                            attrib = "tamperLastChange";
                            break;
                    }

                    const ep = determineEndpoint(entity, meta, "manuSpecificPhilipsContact");
                    try {
                        await ep.read<"manuSpecificPhilipsContact", PhilipsContact>("manuSpecificPhilipsContact", [attrib]);
                    } catch (e) {
                        logger.debug(`Reading ${attrib} failed: ${e}, device probably doesn't support it`, "zhc:setupattribute");
                    }
                },
            },
        ];
        const configure: Configure[] = [
            // NOTE: trigger report after 4 hours incase the network was offline when a contact was triggered
            //       contactLastChange and tamperLastChange seem come with every report of contact, so we do
            //       not configure reporting
            modernExtend.setupConfigureForReporting<"manuSpecificPhilipsContact", PhilipsContact>("manuSpecificPhilipsContact", "contact", {
                config: {min: 0, max: "4_HOURS", change: 1},
                access: ea.STATE_GET,
                singleEndpoint: true,
            }),
            modernExtend.setupConfigureForReporting<"manuSpecificPhilipsContact", PhilipsContact>("manuSpecificPhilipsContact", "tamper", {
                config: {min: 0, max: "4_HOURS", change: 1},
                access: ea.STATE_GET,
                singleEndpoint: true,
            }),
            async (device, coordinatorEndpoint) => {
                // NOTE: new fromZigbee does not use genOnoff's commandOn/commandOff
                //       so we can unbind genOnOff so the legacy fromZigbee does not
                //       cause double triggers.
                const endpoint = device.getEndpoint(2);
                await endpoint.unbind("genOnOff", coordinatorEndpoint);
            },
        ];
        const result: ModernExtend = {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
        return result;
    },
};

export {philipsModernExtend as m};

const philipsTz = {
    gradient_scene: {
        key: ["gradient_scene"],
        convertSet: async (entity, key, value, meta) => {
            const scene = utils.getFromLookup(value, gradientScenes);
            if (!scene) throw new Error(`Gradient scene '${value}' is unknown`);
            const payload = {data: Buffer.from(scene, "hex")};
            await entity.command<"manuSpecificPhilips2", "multiColor", ManuSpecificPhilips2>("manuSpecificPhilips2", "multiColor", payload);
        },
    } satisfies Tz.Converter,
    gradient: (opts = {reverse: false}) => {
        return {
            key: ["gradient", "gradient_style"],
            convertSet: async (entity, key, value, meta) => {
                // Merge gradient_style from the message into opts if present
                const mergedOpts: KeyValueAny = {...opts};
                const {message} = meta;
                if (message.gradient_style != null) {
                    const styleLookup: Record<string, number> = {
                        linear: HueGradientStyle.Linear,
                        scattered: HueGradientStyle.Scattered,
                        mirrored: HueGradientStyle.Mirrored,
                    };
                    const style = styleLookup[String(message.gradient_style).toLowerCase()];
                    if (style !== undefined) {
                        mergedOpts.style = style;
                    }
                }
                // If only gradient_style was sent (no gradient colors), re-send current
                // gradient from state with the new style
                let colors = key === "gradient" ? value : message.gradient;
                if (colors == null && meta.state?.gradient != null) {
                    colors = meta.state.gradient;
                }
                if (colors == null || (Array.isArray(colors) && colors.length === 0)) {
                    return; // Nothing to send
                }
                // @ts-expect-error ignore
                const scene = encodeGradientColors(colors, mergedOpts);
                const payload = {data: Buffer.from(scene, "hex")};
                await entity.command<"manuSpecificPhilips2", "multiColor", ManuSpecificPhilips2>("manuSpecificPhilips2", "multiColor", payload);
                return {state: {gradient_style: message.gradient_style}};
            },
            convertGet: async (entity, key, meta) => {
                try {
                    await entity.read<"manuSpecificPhilips2", ManuSpecificPhilips2>("manuSpecificPhilips2", ["state"]);
                } catch (e) {
                    logger.debug(`Reading manuSpecificPhilips2 state for gradient failed: ${e}`, NS);
                }
            },
        } satisfies Tz.Converter;
    },
    effect: {
        key: ["effect"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, "effect");
            const lower = value.toLowerCase();

            // Stop commands — handle before the generic hueEffects branch,
            // since stop_hue_effect is in the hueEffects map but not in effectLookupAll.
            // All three stop variants also send the Hue stop command so they work
            // regardless of whether the active effect is a ZCL or Hue effect.
            if (lower === "none" || lower === "stop_hue_effect" || lower === "finish_effect" || lower === "stop_effect") {
                // Stop Hue-specific effects via manuSpecificPhilips2
                await entity.command<"manuSpecificPhilips2", "multiColor", ManuSpecificPhilips2>("manuSpecificPhilips2", "multiColor", {
                    data: Buffer.from(hueEffects.stop_hue_effect, "hex"),
                });
                // Also send the ZCL effect stop for standard effects (blink, breathe, etc.)
                if (lower === "finish_effect" || lower === "stop_effect") {
                    try {
                        await tz.effect.convertSet(entity, key, value, meta);
                    } catch (_e) {
                        // Ignore — device may not support ZCL identify cluster
                    }
                }
                return {state: {effect: "none"}};
            }

            if (lower in effectLookupAll) {
                // Build payload dynamically so we can include optional color
                const data: Philips2Data = {
                    onOff: true,
                    effectType: effectLookupAll[lower],
                };

                // If color is provided alongside effect, include it in the payload
                const msg = meta.message as KeyValueAny;
                if (msg.color !== undefined) {
                    const newColor = libColor.Color.fromConverterArg(msg.color);
                    if (newColor.isHSV()) {
                        data.colorXY = newColor.hsv.toRGB().gammaCorrected().toXY().rounded(4);
                    } else {
                        data.colorXY = newColor.isRGB() ? newColor.rgb.gammaCorrected().toXY().rounded(4) : newColor.xy;
                    }
                }

                // Include effect_speed if provided alongside effect
                if (msg.effect_speed !== undefined) {
                    data.effectSpeed = clamp(Number(msg.effect_speed), 0, 1);
                }

                const payload = {data: Buffer.from(EncodeManuSpecificPhilips2(data))};
                await entity.command<"manuSpecificPhilips2", "multiColor", ManuSpecificPhilips2>("manuSpecificPhilips2", "multiColor", payload);
                const state: KeyValueAny = {effect: lower};
                if (data.effectSpeed !== undefined) state.effect_speed = data.effectSpeed;

                // Effects modulate brightness internally (e.g. candle dims to 30-60%).
                // Read state after a short delay so the Fz converter picks up the
                // actual brightness the device settled on.
                setTimeout(async () => {
                    try {
                        await entity.read<"manuSpecificPhilips2", ManuSpecificPhilips2>("manuSpecificPhilips2", ["state"]);
                    } catch (_e) {
                        // Ignore read failures — best-effort sync
                    }
                }, 1000);

                return {state};
            }

            // Standard ZCL effects (blink, breathe, okay, channel_change)
            return await tz.effect.convertSet(entity, key, value, meta);
        },
    } satisfies Tz.Converter,
    hue_power_on_behavior: {
        key: ["hue_power_on_behavior"],
        convertSet: async (entity, key, value, meta) => {
            if (value === "default") {
                value = "on";
            }

            let supports = {colorTemperature: false, colorXY: false};
            if (utils.isEndpoint(entity) && entity.supportsInputCluster("lightingColorCtrl")) {
                const readResult = await entity.read("lightingColorCtrl", ["colorCapabilities"]);
                supports = {
                    colorTemperature: (readResult.colorCapabilities & (1 << 4)) > 0,
                    colorXY: (readResult.colorCapabilities & (1 << 3)) > 0,
                };
            } else if (entity.constructor.name === "Group") {
                supports = {colorTemperature: true, colorXY: true};
            }

            if (value === "off") {
                await entity.write("genOnOff", {16387: {value: 0x00, type: 0x30}});
            } else if (value === "recover") {
                await entity.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
                await entity.write("genLevelCtrl", {16384: {value: 0xff, type: 0x20}});

                if (supports.colorTemperature) {
                    await entity.write("lightingColorCtrl", {16400: {value: 0xffff, type: 0x21}});
                }

                if (supports.colorXY) {
                    await entity.write("lightingColorCtrl", {3: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                    await entity.write("lightingColorCtrl", {4: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                }
            } else if (value === "on") {
                await entity.write("genOnOff", {16387: {value: 0x01, type: 0x30}});

                let brightness = meta.message.hue_power_on_brightness != null ? meta.message.hue_power_on_brightness : 0xfe;
                if (brightness === 255) {
                    // 255 (0xFF) is the value for recover, therefore set it to 254 (0xFE)
                    brightness = 254;
                }
                await entity.write("genLevelCtrl", {16384: {value: brightness, type: 0x20}});

                utils.assertEndpoint(entity);
                if (entity.supportsInputCluster("lightingColorCtrl")) {
                    if (meta.message.hue_power_on_color_temperature != null && meta.message.hue_power_on_color != null) {
                        logger.error("Provide either color temperature or color, not both", NS);
                    } else if (meta.message.hue_power_on_color_temperature != null) {
                        const colortemp = meta.message.hue_power_on_color_temperature;
                        await entity.write("lightingColorCtrl", {16400: {value: colortemp, type: 0x21}});
                        // Set color to default
                        if (supports.colorXY) {
                            await entity.write("lightingColorCtrl", {3: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                            await entity.write("lightingColorCtrl", {4: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                        }
                    } else if (meta.message.hue_power_on_color != null) {
                        // @ts-expect-error ignore
                        const colorXY = libColor.ColorRGB.fromHex(meta.message.hue_power_on_color).toXY();
                        const xy = {x: utils.mapNumberRange(colorXY.x, 0, 1, 0, 65535), y: utils.mapNumberRange(colorXY.y, 0, 1, 0, 65535)};
                        value = xy;

                        // Set colortemp to default
                        if (supports.colorTemperature) {
                            await entity.write("lightingColorCtrl", {16400: {value: 366, type: 0x21}});
                        }
                        await entity.write("lightingColorCtrl", {3: {value: xy.x, type: 0x21}}, manufacturerOptions);
                        await entity.write("lightingColorCtrl", {4: {value: xy.y, type: 0x21}}, manufacturerOptions);
                    } else {
                        // Set defaults for colortemp and color
                        if (supports.colorTemperature) {
                            await entity.write("lightingColorCtrl", {16400: {value: 366, type: 0x21}});
                        }

                        if (supports.colorXY) {
                            await entity.write("lightingColorCtrl", {3: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                            await entity.write("lightingColorCtrl", {4: {value: 0xffff, type: 0x21}}, manufacturerOptions);
                        }
                    }
                }
            }

            return {state: {hue_power_on_behavior: value}};
        },
    } satisfies Tz.Converter,
    hue_power_on_error: {
        key: ["hue_power_on_brightness", "hue_power_on_color_temperature", "hue_power_on_color"],
        convertSet: (entity, key, value, meta) => {
            if (meta.message.hue_power_on_behavior === undefined) {
                throw new Error(`Provide a value for 'hue_power_on_behavior'`);
            }
        },
    } satisfies Tz.Converter,
    hue_motion_sensitivity: {
        // motion detect sensitivity, philips specific
        key: ["motion_sensitivity"],
        convertSet: async (entity, key, value, meta) => {
            // make sure you write to second endpoint!
            const lookup = {low: 0, medium: 1, high: 2, very_high: 3, max: 4};
            const payload = {48: {value: utils.getFromLookup(value, lookup), type: 32}};
            await entity.write("msOccupancySensing", payload, manufacturerOptions);
            return {state: {motion_sensitivity: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("msOccupancySensing", [48], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    hue_motion_led_indication: {
        key: ["led_indication"],
        convertSet: async (entity, key, value, meta) => {
            const payload = {51: {value, type: 0x10}};
            await entity.write("genBasic", payload, manufacturerOptions);
            return {state: {led_indication: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genBasic", [0x0033], manufacturerOptions);
        },
    } satisfies Tz.Converter,
};

export {philipsTz as tz};

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V};

export const gradientScenes = {
    blossom: "50010400135000000039d553d2955ba5287a9f697e25fb802800",
    crocus: "50010400135000000050389322f97f2b597343764cc664282800",
    precious: "5001040013500000007fa8838bb9789a786d7577499a773f2800",
    narcissa: "500104001350000000b0498a5c0a888fea89eb0b7ee15c742800",
    beginnings: "500104001350000000b3474def153e2ad42e98232c7483292800",
    first_light: "500104001350000000b28b7900e959d3f648a614389723362800",
    horizon: "500104001350000000488b7d6cbb750c6642f1133cc4033c2800",
    valley_dawn: "500104001350000000c1aa7de03a7a8ce861c7c4410d94412800",
    sunflare: "500104001350000000d0aa7d787a7daf197590154d6c14472800",
    emerald_flutter: "5001040013500000006a933977e34bb0d35e916468f246792800",
    memento: "500104001350000000f87318a3e31962331ec3532cceea892800",
    resplendent: "500104001350000000278b6d257a58efe84204273a35f5252800",
    scarlet_dream: "500104001350000000b02c654e4c5b45ab51fb0950d6c84d2800",
    lovebirds: "50010400135000000053ab84ea1a7e35fb7c098c73994c772800",
    smitten: "500104001350000000fe7b70a74b6aa42b65811b60550a592800",
    glitz_and_glam: "500104001350000000cc193cb9b845bad9521d1c77bf6c712800",
    promise: "500104001350000000258b606eca6b28d6382db445df26812800",
    ruby_romance: "5001040013500000000edb63cbcb6bac0c670b2d58204e572800",
    city_of_love: "50010400135000000055830e5cf31b6aa339d2ec70908b802800",
    honolulu: "500104001350000000dbfd59866c6378ec6c45cc765c0a822800",
    savanna_sunset: "50010400135000000005ae65c38c6c6b4b7573ca820fc9832800",
    golden_pond: "5001040013500000007e4a88cc4a8605db8728ec7b666c792800",
    runy_glow: "50010400135000000095bb53ac2a56eb99591e095c54985e2800",
    tropical_twilight: "500104001350000000408523a0b636e777524c0a71a76c6e2800",
    miami: "50010400135000000022ec61e6d94902d83766c3305a43182800",
    cancun: "500104001350000000a7eb54673d55944e6265fd6e26bb842800",
    rio: "500104001350000000a26526088c51a74b58ea6b7137ba892800",
    chinatown: "500104001350000000b33e5b408e59d90d5b4c6c6360ac792800",
    ibiza: "500104001350000000014d6d708c73827b7b6c7a8887f98a2800",
    osaka: "500104001350000000d649510b5c4deb7c5d8b6d6d2b9b802800",
    tokyo: "500104001350000000d1c311665331d3451fd59c4e394c7b2800",
    motown: "50010400135000000055730e5db3156623306c533d7a235c2800",
    fairfax: "50010400135000000072d34a3664477d7a61581d5fc08e5b2800",
    galaxy: "500104001350000000a6cb638b2a4f8cfa549bb9549ff73a2800",
    starlight: "5001040013500000008d897134a9653ec854d2963ed1d4282800",
    "blood moon": "500104001350000000202a6987c8599ee647ec632779c3142800",
    artic_aurora: "50010400135000000082548922057511046571c32d5b93192800",
    moonlight: "50010400135000000055730e5e9320c1832e96243ebec7652800",
    nebula: "50010400135000000026c852e106460d653ee745342964142800",
    sundown: "500104001350000000f37c68157c6d8efa755ac5512e24332800",
    blue_lagoon: "50010400135000000088c3623975699ea672a0c8831ada6d2800",
    palm_beach: "5001040013500000005ec4679ba56077f85a80ea64639c6a2800",
    lake_placid: "5001040013500000002eab69239a692d996552c54c39743a2800",
    mountain_breeze: "500104001350000000df843d2355419195465a98674ca97b2800",
    lake_mist: "500104001350000000e3286f39b96859f86266e54ded943f2800",
    ocean_dawn: "5001040013500000005cf9779da97105b96b07485e32564a2800",
    frosty_dawn: "5001040013500000006d6883bca87e3029758ec9722d6a722800",
    sunday_morning: "5001040013500000002c586dc6f87345997c63f983f777892800",
    emerald_isle: "500104001350000000e535628dc57ed2667d8b687d1e2a812800",
    spring_blossom: "500104001350000000a8b75fd0c75826b851a7094d305b652800",
    midsummer_sun: "500104001350000000002984799984dd29848eba836c0b7f2800",
    autumn_gold: "500104001350000000435a7817aa7ba3f979a8a981f3c9852800",
    spring_lake: "5001040013500000004a976d3347736e677561b77a4b07812800",
    winter_mountain: "5001040013500000002c555c68c55d7c555ef165606136622800",
    midwinter: "500104001350000000bda5532c554dbd254cd5a4428d94392800",
    amber_bloom: "500104001350000000739d67f2bc7372ec78a0ab78be8a6f2800",
    lily: "5001040013500000009cfc76c5ab793d4a6a1a9b586b9c522800",
    painted_sky: "500104001350000000d1c424c3d63783384c3f7a6a83bd6d2800",
    winter_beauty: "500104001350000000e2335ea7b4942467952db986a7ab7b2800",
    orange_fields: "500104001350000000409c69694c79eafa88498a8fb867aa2800",
    forest_adventure: "50010400135000000023999bbd76b363d4b674d3415fb3222800",
    blue_planet: "50010400135000000037a7a3a403b489737b2b746e6873362800",
    soho: "500104001350000000c52c4e220b6eed8a53d404192b04782800",
    vapor_wave: "500104001350000000e1c32401251acb183ac31b8051ea842800",
    magneto: "50010400135000000077b3286d9340b9e3662d99943c9b852800",
    tyrell: "500104001350000000ef4419a898370ea84698353574434e2800",
    disturbia: "50010400135000000084f371a4845e6998388c3b4f57ce582800",
    hal: "50010400135000000075f351a6244cf6dc5d480c658cda862800",
    golden_star: "5001040013500000007a4a8702eb8372ac7892cd61d51e5c2800",
    under_the_tree: "5001040013500000001de498b9a3cc0c9b8563bb6cc1ae5d2800",
    silent_night: "5001040013500000009e296a245a6f660a75086b70953b6e2800",
    rosy_sparkle: "500104001350000000810967c63a6cb2aa5ea7094eddd73c2800",
    festive_fun: "5001040013500000005a9318de53123e9414fdcc67839d612800",
    colour_burst: "500104001350000000f2731ff0c6266a6c64246e57d4f98f2800",
    crystalline: "5001040013500000006ea96a92a85e58074e18543d9cf3332800",
};

export const hueEffects = {
    candle: "21000101",
    fireplace: "21000102",
    colorloop: "21000103",
    sunrise: "21000109",
    sparkle: "2100010a",
    opal: "2100010b",
    glisten: "2100010c",
    sunset: "2100010d",
    underwater: "2100010e",
    cosmos: "2100010f",
    sunbeam: "21000110",
    enchant: "21000111",
    stop_hue_effect: "200000",
};

const philipsFz = {
    hue_tap_dial: {
        cluster: "manuSpecificPhilips",
        type: "commandHueNotification",
        options: [exposes.options.simulated_brightness()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const buttonLookup: KeyValue = {1: "button_1", 2: "button_2", 3: "button_3", 4: "button_4", 20: "dial"};
            const button = buttonLookup[msg.data.button];
            const direction = msg.data.unknown3 < 127 ? "right" : "left";
            const time = msg.data.time;
            const payload: KeyValue = {};

            if (button === "dial") {
                const adjustedTime = direction === "right" ? time : 256 - time;
                const dialType = "rotate";
                const speed = adjustedTime <= 25 ? "step" : adjustedTime <= 75 ? "slow" : "fast";
                payload.action = `${button}_${dialType}_${direction}_${speed}`;

                // extra raw info about dial turning
                const typeLookup: KeyValue = {1: "step", 2: "rotate"};
                const type = typeLookup[msg.data.type];
                payload.action_time = adjustedTime;
                payload.action_direction = direction;
                payload.action_type = type;

                // simulated brightness
                if (options.simulated_brightness) {
                    const opts = options.simulated_brightness;
                    // @ts-expect-error ignore
                    const deltaOpts = typeof opts === "object" && opts.delta != null ? opts.delta : 35;
                    const delta = direction === "right" ? deltaOpts : deltaOpts * -1;
                    const brightness = globalStore.getValue(msg.endpoint, "brightness", 255) + delta;
                    payload.brightness = utils.numberWithinRange(brightness, 0, 255);
                    globalStore.putValue(msg.endpoint, "brightness", payload.brightness);
                }
            } else {
                const typeLookup: KeyValue = {0: "press", 1: "hold", 2: "press_release", 3: "hold_release"};
                const type = typeLookup[msg.data.type];
                payload.action = `${button}_${type}`;
                // duration
                if (type === "press") globalStore.putValue(msg.endpoint, "press_start", Date.now());
                else if (type === "hold" || type === "hold_release") {
                    payload.action_duration = (Date.now() - globalStore.getValue(msg.endpoint, "press_start")) / 1000;
                }
            }
            return payload;
        },
    } satisfies Fz.Converter<"manuSpecificPhilips", ManuSpecificPhilips, "commandHueNotification">,
    gradient: {
        cluster: "manuSpecificPhilips2",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.state !== undefined) {
                const input = msg.data.state.toString("hex");
                const decoded = decodeGradientColors(input, {reverse: true});
                if (decoded.color_mode === "gradient") {
                    return {gradient: decoded.colors};
                }
            }
            return {};
        },
    } satisfies Fz.Converter<"manuSpecificPhilips2", ManuSpecificPhilips2, ["attributeReport", "readResponse"]>,
    hue_smart_button_event: {
        cluster: "manuSpecificPhilips",
        type: "commandHueNotification",
        convert: (model, msg, publish, options, meta) => {
            // Philips HUE Smart Button "ROM001": these events are always from "button 1"
            const lookup: KeyValueAny = {0: "press", 1: "hold", 2: "release", 3: "release"};
            return {action: lookup[msg.data.type]};
        },
    } satisfies Fz.Converter<"manuSpecificPhilips", ManuSpecificPhilips, "commandHueNotification">,
    hue_wall_switch: {
        cluster: "manuSpecificPhilips",
        type: "commandHueNotification",
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const buttonLookup: KeyValueAny = {1: "left", 2: "right"};
            const button = buttonLookup[msg.data.button];
            const typeLookup: KeyValueAny = {0: "press", 1: "hold", 2: "press_release", 3: "hold_release"};
            const type = typeLookup[msg.data.type];
            return {action: `${button}_${type}`};
        },
    } satisfies Fz.Converter<"manuSpecificPhilips", ManuSpecificPhilips, "commandHueNotification">,
    hue_dimmer_switch: {
        cluster: "manuSpecificPhilips",
        type: "commandHueNotification",
        options: [exposes.options.simulated_brightness()],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const buttonLookup: KeyValueAny = {1: "on", 2: "up", 3: "down", 4: "off"};
            const button = buttonLookup[msg.data.button];
            const typeLookup: KeyValueAny = {0: "press", 1: "hold", 2: "press_release", 3: "hold_release"};
            const type = typeLookup[msg.data.type];
            const payload: KeyValueAny = {action: `${button}_${type}`};

            // duration
            if (type === "press") globalStore.putValue(msg.endpoint, "press_start", Date.now());
            else if (type === "hold" || type === "release") {
                payload.action_duration = (Date.now() - globalStore.getValue(msg.endpoint, "press_start")) / 1000;
            }

            // simulated brightness
            if (options.simulated_brightness && (button === "down" || button === "up") && type !== "release") {
                const opts: KeyValueAny = options.simulated_brightness;
                const deltaOpts = typeof opts === "object" && opts.delta != null ? opts.delta : 35;
                const delta = button === "up" ? deltaOpts : deltaOpts * -1;
                const brightness = globalStore.getValue(msg.endpoint, "brightness", 255) + delta;
                payload.brightness = numberWithinRange(brightness, 0, 255);
                payload.action_brightness_delta = delta;
                globalStore.putValue(msg.endpoint, "brightness", payload.brightness);
            }
            return payload;
        },
    } satisfies Fz.Converter<"manuSpecificPhilips", ManuSpecificPhilips, "commandHueNotification">,
    hue_twilight: {
        cluster: "manuSpecificPhilips",
        type: "commandHueNotification",
        convert: (model, msg, publish, options, meta) => {
            const buttonLookup: KeyValueAny = {1: "dot", 2: "hue"};
            const button = buttonLookup[msg.data.button];
            const typeLookup: KeyValueAny = {0: "press", 1: "hold", 2: "press_release", 3: "hold_release"};
            const type = typeLookup[msg.data.type];
            const payload: KeyValueAny = {action: `${button}_${type}`};

            // duration
            if (type === "press") globalStore.putValue(msg.endpoint, "press_start", Date.now());
            else if (type === "hold" || type === "release") {
                payload.action_duration = (Date.now() - globalStore.getValue(msg.endpoint, "press_start")) / 1000;
            }

            return payload;
        },
    } satisfies Fz.Converter<"manuSpecificPhilips", ManuSpecificPhilips, "commandHueNotification">,
};

export {philipsFz as fz};

const clamp = (x: number, low: number, high: number) => Math.min(Math.max(low, x), high);
const scaleFloatToIntPow2 = (x: number, bits: number) => clamp(x, 0.0, 1.0) * (2 ** bits - 1);
const scaleIntPow2ToFloat = (x: number, bits: number) => clamp(x, 0, 2 ** bits - 1) / (2 ** bits - 1);

export enum HueEffectType {
    NoEffect = 0x00,
    Candle = 0x01,
    Fireplace = 0x02,
    Prism = 0x03,
    Sunrise = 0x09,
    Sparkle = 0x0a,
    Opal = 0x0b,
    Glisten = 0x0c,
    Sunset = 0x0d,
    Underwater = 0x0e,
    Cosmos = 0x0f,
    Sunbeam = 0x10,
    Enchant = 0x11,
}
export enum HueGradientStyle {
    Linear = 0x0,
    Scattered = 0x2,
    Mirrored = 0x4,
}

const gradientStyleNames: Record<number, string> = {
    [HueGradientStyle.Linear]: "linear",
    [HueGradientStyle.Scattered]: "scattered",
    [HueGradientStyle.Mirrored]: "mirrored",
};

// Mapping from effect names to HueEffectType enum values.
// Used by both the effect Tz converter and the philipsLightTz convertSet.
const effectLookupAll: Record<string, HueEffectType> = {
    candle: HueEffectType.Candle,
    fireplace: HueEffectType.Fireplace,
    colorloop: HueEffectType.Prism,
    sunrise: HueEffectType.Sunrise,
    sparkle: HueEffectType.Sparkle,
    opal: HueEffectType.Opal,
    glisten: HueEffectType.Glisten,
    sunset: HueEffectType.Sunset,
    underwater: HueEffectType.Underwater,
    cosmos: HueEffectType.Cosmos,
    sunbeam: HueEffectType.Sunbeam,
    enchant: HueEffectType.Enchant,
};

// Inverse mapping: HueEffectType → name. Derived from effectLookupAll to stay in sync.
const effectNames: Record<number, string> = {
    [HueEffectType.NoEffect]: "none",
    ...Object.fromEntries(Object.entries(effectLookupAll).map(([name, type]) => [type, name])),
};

export interface Philips2Data {
    onOff?: boolean;
    brightness?: number;
    colorMirek?: number;
    colorXY?: ColorXY;
    fadeSpeed?: number;
    effectType?: HueEffectType;
    gradientParams?: {
        scale: number;
        offset: number;
    };
    effectSpeed?: number;
    gradientColors?: {
        style: HueGradientStyle;
        colors: ColorXY[];
    };
}

enum HueFlags {
    OnOff = 0x0001,
    Brightness = 0x0002,
    ColorMirek = 0x0004,
    ColorXY = 0x0008,
    FadeSpeed = 0x0010,
    EffectType = 0x0020,
    GradientParams = 0x0040,
    EffectSpeed = 0x0080,
    GradientColors = 0x0100,
    // Reserved for future use per Bifrost spec
    Reserved9 = 0x0200,
    ReservedA = 0x0400,
    ReservedB = 0x0800,
    ReservedC = 0x1000,
    ReservedD = 0x2000,
    ReservedE = 0x4000,
    ReservedF = 0x8000,
}

interface HueTypeDetails<N extends keyof Philips2Data> {
    name: N;
    flag: HueFlags;
    maxLength: number;
    encode: (view: DataView, position: number, data: Philips2Data) => number;
    decode: (view: DataView, position: number, data: Philips2Data) => number;
}

const ON_OFF_DETAILS: HueTypeDetails<"onOff"> = {
    name: "onOff",
    flag: HueFlags.OnOff,
    maxLength: 1,
    encode: (v, p, d) => {
        v.setUint8(p, d.onOff ? 1 : 0);
        return p + 1;
    },
    decode: (v, p, d) => {
        d.onOff = !!v.getUint8(p);
        return p + 1;
    },
};

const BRIGHTNESS_DETAILS: HueTypeDetails<"brightness"> = {
    name: "brightness",
    flag: HueFlags.Brightness,
    maxLength: 1,
    encode: (v, p, d) => {
        v.setUint8(p, clamp(d.brightness, 1, 254));
        return p + 1;
    },
    decode: (v, p, d) => {
        d.brightness = v.getUint8(p);
        return p + 1;
    },
};

const COLOR_MIREK_DETAILS: HueTypeDetails<"colorMirek"> = {
    name: "colorMirek",
    flag: HueFlags.ColorMirek,
    maxLength: 2,
    encode: (v, p, d) => {
        v.setUint16(p, d.colorMirek, true);
        return p + 2;
    },
    decode: (v, p, d) => {
        d.colorMirek = v.getUint16(p, true);
        return p + 2;
    },
};

const COLOR_XY_DETAILS: HueTypeDetails<"colorXY"> = {
    name: "colorXY",
    flag: HueFlags.ColorXY,
    maxLength: 4,
    encode: (v, p, d) => {
        v.setUint16(p, scaleFloatToIntPow2(d.colorXY.x, 16), true);
        v.setUint16(p + 2, scaleFloatToIntPow2(d.colorXY.y, 16), true);
        return p + 4;
    },
    decode: (v, p, d) => {
        d.colorXY = ColorXY.fromObject({
            x: scaleIntPow2ToFloat(v.getUint16(p, true), 16),
            y: scaleIntPow2ToFloat(v.getUint16(p + 2, true), 16),
        });
        return p + 4;
    },
};

const FADE_SPEED_DETAILS: HueTypeDetails<"fadeSpeed"> = {
    name: "fadeSpeed",
    flag: HueFlags.FadeSpeed,
    maxLength: 2,
    encode: (v, p, d) => {
        v.setUint16(p, d.fadeSpeed, true);
        return p + 2;
    },
    decode: (v, p, d) => {
        d.fadeSpeed = v.getUint16(p, true);
        return p + 2;
    },
};

const EFFECT_TYPE_DETAILS: HueTypeDetails<"effectType"> = {
    name: "effectType",
    flag: HueFlags.EffectType,
    maxLength: 1,
    encode: (v, p, d) => {
        v.setUint8(p, d.effectType);
        return p + 1;
    },
    decode: (v, p, d) => {
        d.effectType = v.getUint8(p);
        return p + 1;
    },
};

const GRADIENT_PARAMS_DETAILS: HueTypeDetails<"gradientParams"> = {
    name: "gradientParams",
    flag: HueFlags.GradientParams,
    maxLength: 2,
    encode: (v, p, d) => {
        v.setUint8(p, Math.round(clamp(d.gradientParams.scale * 8, 0, 255)));
        v.setUint8(p + 1, Math.round(clamp(d.gradientParams.offset * 8, 0, 255)));
        return p + 2;
    },
    decode: (v, p, d) => {
        d.gradientParams = {
            scale: v.getUint8(p) / 8.0,
            offset: v.getUint8(p + 1) / 8.0,
        };
        return p + 2;
    },
};

const EFFECT_SPEED_DETAILS: HueTypeDetails<"effectSpeed"> = {
    name: "effectSpeed",
    flag: HueFlags.EffectSpeed,
    maxLength: 1,
    encode: (v, p, d) => {
        v.setUint8(p, scaleFloatToIntPow2(d.effectSpeed, 8));
        return p + 1;
    },
    decode: (v, p, d) => {
        d.effectSpeed = scaleIntPow2ToFloat(v.getUint8(p), 8);
        return p + 1;
    },
};

// GRADIENT_COLORS_MAX_X and GRADIENT_COLORS_MAX_Y defined at top of file

const GRADIENT_COLORS_DETAILS: HueTypeDetails<"gradientColors"> = {
    name: "gradientColors",
    flag: HueFlags.GradientColors,
    // Max: 1 byte size + 4 bytes header + 9 colors * 3 bytes = 32 bytes
    maxLength: 5 + 9 * 3,
    encode: (v, p, d) => {
        // Bifrost spec: max 9 colors; 10+ causes device to reject entire message
        const colorCount = clamp(d.gradientColors.colors.length, 0, 9);
        // Size byte: 4 bytes header (count + style + 2 reserved) + 3 bytes per color
        v.setUint8(p, 4 + colorCount * 3);
        v.setUint8(p + 1, colorCount << 4);
        v.setUint8(p + 2, d.gradientColors.style);
        v.setUint16(p + 3, 0, true);
        d.gradientColors.colors.slice(0, colorCount).forEach(({x, y}, i) => {
            const scaledX = scaleFloatToIntPow2(x / GRADIENT_COLORS_MAX_X, 12);
            const scaledY = scaleFloatToIntPow2(y / GRADIENT_COLORS_MAX_Y, 12);
            // Byte packing per Bifrost spec:
            //   byte 0: x[7:0]
            //   byte 1: y[3:0] << 4 | x[11:8]
            //   byte 2: y[11:4]
            v.setUint8(p + 5 + i * 3, scaledX & 0xff);
            v.setUint8(p + 6 + i * 3, ((scaledY & 0xf) << 4) | ((scaledX & 0xf00) >> 8));
            v.setUint8(p + 7 + i * 3, (scaledY >> 4) & 0xff);
        });
        // Header: 1 byte size + 4 bytes (count, style, 2 reserved) = 5 bytes + 3*N colors
        return p + 5 + 3 * colorCount;
    },
    decode: (v, p, d) => {
        const size = v.getUint8(p);
        const colorCount = v.getUint8(p + 1) >> 4;
        const rawStyle = v.getUint8(p + 2);
        // Validate gradient style per Bifrost spec: Linear=0x00, Scattered=0x02, Mirrored=0x04
        const validStyles = [HueGradientStyle.Linear, HueGradientStyle.Scattered, HueGradientStyle.Mirrored];
        const style: HueGradientStyle = validStyles.includes(rawStyle) ? rawStyle : HueGradientStyle.Linear;
        const colors: ColorXY[] = Array.from({length: colorCount}, (_, i) => {
            const a = v.getUint8(p + 5 + i * 3);
            const b = v.getUint8(p + 6 + i * 3);
            const c = v.getUint8(p + 7 + i * 3);
            return ColorXY.fromObject({
                x: scaleIntPow2ToFloat(((b & 0xf) << 8) | a, 12) * GRADIENT_COLORS_MAX_X,
                y: scaleIntPow2ToFloat((c << 4) | ((b & 0xf0) >> 4), 12) * GRADIENT_COLORS_MAX_Y,
            });
        });
        d.gradientColors = {style, colors};
        return p + size + 1;
    },
};

// Ordered as they appear in the wire format per Bifrost spec.
// IMPORTANT: the wire order does NOT match the flag bit order.
// Specifically, GRADIENT_COLORS (flag 0x0100) appears BEFORE
// EFFECT_SPEED (flag 0x0080) and GRADIENT_PARAMS (flag 0x0040)
// in the actual byte stream. Both encode and decode MUST iterate
// in this order, not in flag-bit order.
// Reference: https://github.com/chrivers/bifrost/blob/master/doc/hue-zigbee-format.md
const HUE_DATA_TYPES = [
    ON_OFF_DETAILS,
    BRIGHTNESS_DETAILS,
    COLOR_MIREK_DETAILS,
    COLOR_XY_DETAILS,
    FADE_SPEED_DETAILS,
    EFFECT_TYPE_DETAILS,
    GRADIENT_COLORS_DETAILS,
    EFFECT_SPEED_DETAILS,
    GRADIENT_PARAMS_DETAILS,
];

export function DecodeManuSpecificPhilips2(data: Buffer) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const flags = view.getUint16(0, true);
    const decoded: Philips2Data = {};
    let position = 2;
    HUE_DATA_TYPES.forEach((htd) => {
        if (flags & htd.flag) {
            position = htd.decode(view, position, decoded);
        }
    });
    return decoded;
}

export function EncodeManuSpecificPhilips2(data: Philips2Data) {
    const buffer = new ArrayBuffer(2 + HUE_DATA_TYPES.map((htd) => htd.maxLength).reduce((pv, cv) => pv + cv, 0));
    const view = new DataView(buffer);
    let position = 2;
    let flags = 0;
    HUE_DATA_TYPES.forEach((htd) => {
        if (data[htd.name] !== undefined) {
            flags |= htd.flag;
            position = htd.encode(view, position, data);
        }
    });
    view.setUint16(0, flags, true);
    return buffer.slice(0, position);
}

// decoder for manuSpecificPhilips2.state
export function decodeGradientColors(input: string, opts: KeyValue) {
    // Gradient mode (4b01)
    // Example: 4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800
    // 4b01 - mode? (4) (0b00 single color?, 4b01 gradient?)
    //     01 - on/off (2)
    //       64 - brightness (2)
    //         fb74346b - unknown (8) - Might be XY Color?
    //                 13 - length (2)
    //                   50 - ncolors (2)
    //                     000000 - unknown (6)
    //                           f3297fda7d55da7d55f3297fda7d55 - colors (6 * ncolors)
    //                                                         28 - segments (2)
    //                                                           00 - offset (2)
    //
    // Temperature mode (0f00)
    // Example: 0f0000044d01ab6f7067
    // 0f00 - mode (4)
    //     01 - on/off (2)
    //       1a - brightness (2)
    //          4d01 - color temperature (4)
    //              ab6f7067 - unknown (8)
    //
    // XY Color mode (0b00)
    // Example: 0b00010460b09c4e
    // 0b00 - mode (4) == 0b00 single color mode
    //     01 - on/off (2)
    //       04 - brightness (2)
    //         60b09c4e - color (8) (xLow, xHigh, yLow, yHigh)
    //
    // Effect mode (ab00)
    // Example: ab000153df7e446a0180
    // ab00 - mode (4)
    //     01 - on/off (2)
    //       53 - brightness (2)
    //         df7e446a - XY Color (8)
    //                 0180 - effect (4)
    //
    // On/off/brightness mode (0003) – For devices that only support on/off and brightness
    // Example: 030001b2
    // 0300 - mode (4)
    //     01 - on/off (2)
    //       b2 - brightness (2)

    // Device color mode
    const mode = input.slice(0, 4);
    input = input.slice(4);

    // On/off (2 bytes)
    const on = Number.parseInt(input.slice(0, 2), 16) === 1;
    input = input.slice(2);

    // Brightness (2 bytes)
    const brightness = Number.parseInt(input.slice(0, 2), 16);
    input = input.slice(2);

    // Gradient mode
    if (mode === COLOR_MODE_GRADIENT) {
        // Unknown (8 bytes)
        input = input.slice(8);

        // Length (2 bytes)
        input = input.slice(2);

        // Number of colors (2 bytes)
        const nColors = Number.parseInt(input.slice(0, 2), 16) >> 4;
        input = input.slice(2);

        // Unknown (6 bytes)
        input = input.slice(6);

        // Colors (6 * nColors bytes)
        const colorsPayload = input.slice(0, 6 * nColors);
        input = input.slice(6 * nColors);
        const colors = colorsPayload.match(/.{6}/g).map(decodeScaledGradientToRGB);

        // Segments (2 bytes)
        const segments = Number.parseInt(input.slice(0, 2), 16) >> 3;
        input = input.slice(2);

        // Offset (2 bytes)
        const offset = Number.parseInt(input.slice(0, 2), 16) >> 3;

        if (opts?.reverse) {
            colors.reverse();
        }

        return {
            color_mode: "gradient",
            colors,
            segments,
            offset,
            brightness,
            on,
        };
    }
    if (mode === COLOR_MODE_COLOR_XY || mode === COLOR_MODE_EFFECT) {
        // XY Color mode
        const xLow = Number.parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const xHigh = Number.parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);
        const yHigh = Number.parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const yLow = Number.parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);

        const x = Math.round(((xHigh | xLow) / 65535) * 10000) / 10000;
        const y = Math.round(((yHigh | yLow) / 65535) * 10000) / 10000;

        if (mode === COLOR_MODE_COLOR_XY) {
            return {
                color_mode: "xy",
                x,
                y,
                brightness,
                on,
            };
        }

        // Effect mode
        const effect = input.slice(0, 4);
        // @ts-expect-error ignore
        const name = knownEffects[effect] || `unknown_${effect}`;
        return {
            color_mode: "xy",
            x,
            y,
            brightness,
            on,
            name,
        };
    }
    if (mode === COLOR_MODE_COLOR_TEMP) {
        // Color temperature mode
        const low = Number.parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const high = Number.parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);

        const temp = high | low;

        return {
            color_mode: "color_temp",
            color_temp: temp,
            brightness,
            on,
        };
    }
    if (mode === COLOR_MODE_BRIGHTNESS) {
        return {
            brightness,
            on,
        };
    }

    // Unknown mode
    return {};
}

// Value is a list of RGB HEX colors
export function encodeGradientColors(value: string[], opts: KeyValueAny) {
    if (value.length > 9) {
        throw new Error(`Expected up to 9 colors, got ${value.length}`);
    }
    if (value.length < 1) {
        throw new Error("Expected at least 1 color, got 0");
    }

    // For devices where it makes more sense to specify the colors in reverse
    // For example Hue Signe, where the last color is the top color.
    if (opts.reverse) {
        value.reverse();
    }

    // The number of colors and segments can technically differ. Here they are always the same, but we could
    // support it by extending the API.
    // If number of colors is less than the number of segments, the colors will repeat.
    // It seems like the maximum number of colors is 9, and the maximum number of segments is 31.
    const nColors = (value.length << 4).toString(16).padStart(2, "0");

    let segments = value.length;
    if (opts.segments) {
        segments = opts.segments;
    }

    if (segments < 1 || segments > 31) {
        throw new Error(`Expected segments to be between 1 and 31 (inclusive), got ${segments}`);
    }
    const segmentsPayload = (segments << 3).toString(16).padStart(2, "0");

    // Encode the colors
    const colorsPayload = value.map(encodeRGBToScaledGradient).join("");

    // Offset of the first color. 0 means the first segment uses the first color. (min 0, max 31)
    let offset = 0;
    if (opts.offset) {
        offset = opts.offset;
    }
    const offsetPayload = (offset << 3).toString(16).padStart(2, "0");

    // Payload length
    const length = (1 + 3 * (value.length + 1)).toString(16).padStart(2, "0");

    // Gradient style: Linear=0x00, Scattered=0x02, Mirrored=0x04
    // Per Bifrost spec, only these three values are valid.
    let style = 0x00; // Default: Linear
    if (opts.style != null) {
        style = opts.style;
    }
    const stylePayload = style.toString(16).padStart(2, "0");

    // 5001 - mode? set gradient?
    // 0400 - unknown
    const scene = `50010400${length}${nColors}${stylePayload}0000${colorsPayload}${segmentsPayload}${offsetPayload}`;

    return scene;
}
