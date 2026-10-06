import type {TClusterAttributeKeys} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import {logger} from "./logger";
import type {Definition, Expose, KeyValue, Tz, Zh} from "./types";
import * as utils from "./utils";

type ColorMode = "hs" | "xy" | "color_temp";

const NS = "zhc:light";
const colorModeFeatures: Record<string, ColorMode> = {color_hs: "hs", color_xy: "xy", color_temp: "color_temp"};

export async function readColorCapabilities(endpoint: Zh.Endpoint) {
    await endpoint.read("lightingColorCtrl", ["colorCapabilities"]);
}

export async function readColorTempMinMax(endpoint: Zh.Endpoint) {
    await endpoint.read("lightingColorCtrl", ["colorTempPhysicalMin", "colorTempPhysicalMax"]);
}

export function readColorAttributes(
    entity: Zh.Endpoint | Zh.Group,
    meta: Tz.Meta,
    additionalAttributes: TClusterAttributeKeys<"lightingColorCtrl"> = [],
) {
    /**
     * Not all bulbs support the same features, we need to take care we read what is supported.
     * `supportsHueAndSaturation` indicates support for currentHue and currentSaturation
     * `supportsEnhancedHue` indicates support for enhancedCurrentHue
     *
     * e.g. IKEA Tådfri LED1624G9 only supports XY (https://github.com/Koenkk/zigbee-herdsman-converters/issues/1340)
     *
     * Additionally when we get a "get payload", only request the fields included.
     */
    const attributes: TClusterAttributeKeys<"lightingColorCtrl"> = ["colorMode"];
    if (meta?.message) {
        if (!meta.message.color || (utils.isObject(meta.message.color) && meta.message.color.x != null)) {
            attributes.push("currentX");
        }
        if (!meta.message.color || (utils.isObject(meta.message.color) && meta.message.color.y != null)) {
            attributes.push("currentY");
        }

        if (utils.getMetaValue(entity, meta.mapped, "supportsHueAndSaturation", "allEqual", false)) {
            if (!meta.message.color || (utils.isObject(meta.message.color) && meta.message.color.hue != null)) {
                if (utils.getMetaValue(entity, meta.mapped, "supportsEnhancedHue", "allEqual", false)) {
                    attributes.push("enhancedCurrentHue");
                } else {
                    attributes.push("currentHue");
                }
            }
            if (!meta.message.color || (utils.isObject(meta.message.color) && meta.message.color.saturation != null)) {
                attributes.push("currentSaturation");
            }
        }
    }

    return [...attributes, ...additionalAttributes];
}

export function findColorTempRange(entity: Zh.Endpoint | Zh.Group) {
    // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
    let colorTempMin;
    // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
    let colorTempMax;
    if (utils.isGroup(entity)) {
        const minCandidates = entity.members
            .map((m) => m.getClusterAttributeValue("lightingColorCtrl", "colorTempPhysicalMin"))
            .filter((v) => v != null)
            .map((v) => Number(v));
        if (minCandidates.length > 0) {
            colorTempMin = Math.max(...minCandidates);
        }
        const maxCandidates = entity.members
            .map((m) => m.getClusterAttributeValue("lightingColorCtrl", "colorTempPhysicalMax"))
            .filter((v) => v != null)
            .map((v) => Number(v));
        if (maxCandidates.length > 0) {
            colorTempMax = Math.min(...maxCandidates);
        }
    } else {
        colorTempMin = entity.getClusterAttributeValue("lightingColorCtrl", "colorTempPhysicalMin") as number;
        colorTempMax = entity.getClusterAttributeValue("lightingColorCtrl", "colorTempPhysicalMax") as number;
    }
    if (colorTempMin == null || colorTempMax == null) {
        const entityId = utils.isGroup(entity) ? entity.groupID : entity.deviceIeeeAddress;
        logger.debug(`Missing colorTempPhysicalMin and/or colorTempPhysicalMax for ${utils.isGroup(entity) ? "group" : "endpoint"} ${entityId}!`, NS);
    }
    return [colorTempMin, colorTempMax];
}

export function clampColorTemp(colorTemp: number, colorTempMin: number, colorTempMax: number) {
    if (colorTempMin != null && colorTemp < colorTempMin) {
        logger.debug(`Requested color_temp ${colorTemp} is lower than minimum supported ${colorTempMin}, using minimum!`, NS);
        return colorTempMin;
    }
    if (colorTempMax != null && colorTemp > colorTempMax) {
        logger.debug(`Requested color_temp ${colorTemp} is higher than maximum supported ${colorTempMax}, using maximum!`, NS);
        return colorTempMax;
    }
    return colorTemp;
}
export async function configure(device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, readColorTempMinMaxAttribute: boolean) {
    if (device.powerSource === "Unknown") {
        device.powerSource = "Mains (single phase)";
        device.save();
    }

    for (const endpoint of device.endpoints.filter((e) => e.supportsInputCluster("lightingColorCtrl"))) {
        try {
            await readColorCapabilities(endpoint);

            if (readColorTempMinMaxAttribute) {
                await readColorTempMinMax(endpoint);
            }
        } catch {
            /* Fails for some, e.g. https://github.com/Koenkk/zigbee2mqtt/issues/5717 */
        }
    }
}

/** Color modes exposed by the light of `definition` (on `endpointName` if given), `undefined` if unknown. */
export function exposedColorModes(definition: Definition, device: Zh.Device, options: KeyValue, endpointName?: string): Set<ColorMode> | undefined {
    let exposes: Expose[];
    try {
        exposes = Array.isArray(definition.exposes) ? definition.exposes : definition.exposes(device, options);
    } catch (error) {
        logger.debug(`Failed to get exposes to determine color modes: ${(error as Error).message}`, NS);
        return undefined;
    }

    const lights = exposes.filter((e) => e.type === "light" && e.endpoint === endpointName);
    if (lights.length === 0) return undefined;

    const modes = new Set<ColorMode>();
    for (const light of lights) {
        for (const feature of light.features ?? []) {
            const mode = colorModeFeatures[feature.name];
            if (mode) modes.add(mode);
        }
    }
    return modes;
}

/**
 * Some lights report a `colorMode` they don't support, e.g. color temperature only lights (Tuya TS0502B) that keep reporting
 * the ZCL default 0 (hs), or color lights exposing only xy that report hs. Map `mode` to the closest color mode the light
 * exposes so consumers (e.g. Home Assistant) don't receive a color mode the light doesn't have.
 * Returns `undefined` when the light exposes no color mode at all.
 */
export function toExposedColorMode(mode: ColorMode, exposed: Set<ColorMode>): ColorMode | undefined {
    if (exposed.has(mode)) return mode;
    if (mode === "hs" && exposed.has("xy")) return "xy";
    if (mode === "xy" && exposed.has("hs")) return "hs";
    if (exposed.has("color_temp")) return "color_temp";
    if (exposed.has("xy")) return "xy";
    if (exposed.has("hs")) return "hs";
    return undefined;
}
