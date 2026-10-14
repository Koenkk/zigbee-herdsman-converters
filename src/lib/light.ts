import type {TClusterAttributeKeys, TClusterCommandKeys, TClusterCommandPayload} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import {logger} from "./logger";
import * as store from "./store";
import type {Tz, Zh} from "./types";
import * as utils from "./utils";

const NS = "zhc:light";

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

interface LevelTransition {
    end?: number;
}

/** Forget timers when a command can start a transition with an unknown duration. */
export function invalidateLevelTransition(entity: Zh.Endpoint | Zh.Group): void {
    for (const endpoint of utils.isGroup(entity) ? entity.members : [entity]) {
        store.putValue(endpoint, "levelTransition", {});
    }
}

/** Track the duration sent on the wire, in ZCL tenths of a second. */
export async function levelControlCommand<Command extends TClusterCommandKeys<"genLevelCtrl">[number]>(
    entity: Zh.Endpoint | Zh.Group,
    command: Command,
    payload: TClusterCommandPayload<"genLevelCtrl", Command>,
    options: Parameters<Zh.Endpoint["command"]>[3],
) {
    const endpoints = utils.isGroup(entity) ? entity.members : [entity];
    const transition: LevelTransition = {};
    for (const endpoint of endpoints) store.putValue(endpoint, "levelTransition", transition);
    const response = await entity.command<"genLevelCtrl", TClusterCommandKeys<"genLevelCtrl">[number]>("genLevelCtrl", command, payload, options);
    // Broadcast delivery is unacknowledged. A missed replacement command must not mark a member idle.
    if (!utils.isGroup(entity)) {
        if (command === "stop" || command === "stopWithOnOff") {
            transition.end = performance.now();
        } else if ("transtime" in payload && typeof payload.transtime === "number" && payload.transtime >= 0 && payload.transtime < 0xffff) {
            transition.end = performance.now() + payload.transtime * 100;
        }
    }
    return response;
}

/** Stop only active or unknown transitions, including coupled endpoints when requested by the definition. */
export async function stopLevelTransitionBeforeOff(entity: Zh.Endpoint | Zh.Group, meta: Tz.Meta): Promise<void> {
    const members = utils.isGroup(entity) ? entity.members : [entity];
    const needsStop = members.some((member, index) => {
        const definition = Array.isArray(meta.mapped) ? meta.mapped[index] : meta.mapped;
        const scope = utils.getMetaValue<boolean | "device">(member, definition, "stopBeforeOff", "first", false);
        if (!scope) return false;
        const endpoints =
            scope === "device" ? member.getDevice().endpoints.filter((endpoint) => endpoint.supportsInputCluster("genLevelCtrl")) : [member];
        return endpoints.some((endpoint) => {
            const transition: LevelTransition = store.getValue(endpoint, "levelTransition", {});
            return transition.end === undefined || performance.now() < transition.end;
        });
    });
    if (needsStop) await levelControlCommand(entity, "stop", {}, utils.getOptions(meta.mapped, entity));
}
