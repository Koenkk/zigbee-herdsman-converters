import type {TClusterAttributeKeys} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import {logger} from "./logger";
import type {Fz, KeyValue, Tz, Zh} from "./types";
import * as utils from "./utils";

const NS = "zhc:light";

// Multiple endpoint commands in one MQTT message share the same state snapshot.
const pendingCombinedStates = new WeakMap<KeyValue, KeyValue>();

function combinedState(state: KeyValue, endpoints: Record<string, number>): KeyValue {
    const states = Object.keys(endpoints).map((name) => state[`state_${name}`]);
    return states.includes("ON") ? {state: "ON"} : states.length && states.every((value) => value === "OFF") ? {state: "OFF"} : {};
}

/** Preserve legacy report properties and aggregate named endpoint power when combinedOnOff is enabled. */
export function withCombinedOnOffReport<Cl extends string | number>(
    converter: Fz.Converter<Cl, undefined, ["attributeReport", "readResponse"]>,
): Fz.Converter<Cl, undefined, ["attributeReport", "readResponse"]> {
    return {
        ...converter,
        convert: (model, msg, publish, options, meta) => {
            if (!model.meta?.combinedOnOff) return converter.convert(model, msg, publish, options, meta);
            return (async () => {
                const legacy = await converter.convert(model, msg, publish, options, meta);
                if (!legacy) return legacy;
                const endpoints = model.endpoint(meta.device);
                // Keep legacy properties while using each endpoint's own cached state for color synchronization.
                const channel =
                    !model.meta?.multiEndpoint && utils.getKey(endpoints, msg.endpoint.ID)
                        ? await converter.convert({...model, meta: {...model.meta, multiEndpoint: true}}, msg, publish, options, meta)
                        : undefined;
                const payload = {...channel, ...legacy};
                if ("state" in payload || Object.keys(endpoints).some((name) => `state_${name}` in payload)) {
                    delete payload.state;
                    Object.assign(payload, combinedState({...meta.state, ...payload}, endpoints));
                }
                return payload;
            })();
        },
    };
}

/**
 * Add opt-in whole-device power controls while preserving per-channel commands and cached state.
 * Vendor converters that modify messages or returned state must wrap their outermost converter.
 */
export function withCombinedOnOff(converter: Tz.Converter): Tz.Converter {
    return {
        ...converter,
        ...(converter.convertSet && {
            convertSet: async (entity, key, value, meta) => {
                if (Array.isArray(meta.mapped) || !meta.mapped?.meta?.combinedOnOff || !utils.isEndpoint(entity))
                    return converter.convertSet(entity, key, value, meta);
                const endpoints = meta.mapped.endpoint(meta.device);
                const endpointName = utils.getKey(endpoints, entity.ID);
                if (!endpointName) return converter.convertSet(entity, key, value, meta);
                const all = !meta.endpoint_name && converter.key.includes("state") && typeof meta.message.state === "string";
                const state = {...(pendingCombinedStates.get(meta.state) ?? meta.state)};
                let command = all ? utils.getFromLookup(meta.message.state, {on: "ON", off: "OFF", toggle: "TOGGLE"}) : undefined;
                if (command === "TOGGLE") {
                    for (const [name, ID] of Object.entries(endpoints)) {
                        const {onOff} = await meta.device.getEndpoint(ID).read("genOnOff", ["onOff"]);
                        utils.validateValue(onOff, [0, 1]);
                        state[`state_${name}`] = onOff ? "ON" : "OFF";
                    }
                    pendingCombinedStates.set(meta.state, state);
                    command = combinedState(state, endpoints).state === "ON" ? "OFF" : "ON";
                }
                const filtered = (property: string) =>
                    Array.isArray(meta.options.filtered_optimistic) &&
                    meta.options.filtered_optimistic.some((pattern) => new RegExp(pattern).test(property));
                // Fully qualified state avoids the caller suffixing the combined state as a channel property.
                const result: Tz.ConvertSetResult = {state: {}, membersState: {}};
                const payload: KeyValue = {};
                const timing = utils.filterObject(meta.message, ["transition", "on_time", "off_wait_time"]);
                const errors: unknown[] = [];
                for (const [name, ID] of Object.entries(all ? endpoints : {[endpointName]: entity.ID})) {
                    const message = all ? {...(name === endpointName ? meta.message : timing), state: command} : meta.message;
                    const channelKey = all && name !== endpointName ? "state" : key;
                    try {
                        const converted = await converter.convertSet(meta.device.getEndpoint(ID), channelKey, all ? message[channelKey] : value, {
                            ...meta,
                            // Nested shared/vendor converters must handle only this channel.
                            mapped: {...meta.mapped, meta: {...meta.mapped.meta, combinedOnOff: false}},
                            endpoint_name: all ? name : meta.endpoint_name,
                            message,
                            state: {...state, state: state[`state_${name}`], brightness: state[`brightness_${name}`] ?? state.brightness},
                        });
                        if (!converted) {
                            if (!all) return;
                            continue;
                        }
                        const updateState =
                            converted.state?.state &&
                            meta.options.optimistic !== false &&
                            !filtered(all || meta.endpoint_name ? `state_${name}` : "state");
                        if (!all && !updateState) return converted;
                        const {state: channelState, ...otherState} = converted.state ?? {};
                        if (name === endpointName) result.state = otherState;
                        Object.assign(result.membersState, converted.membersState);
                        for (const [property, value] of Object.entries(all ? (converted.state ?? {}) : {state: channelState}))
                            payload[`${property}_${name}`] = value;
                        Object.assign(payload, converted.membersState?.[meta.device.ieeeAddr]);
                        if (updateState) {
                            state[`state_${name}`] = channelState;
                            Object.assign(payload, combinedState(state, endpoints));
                            pendingCombinedStates.set(meta.state, state);
                        }
                    } catch (error) {
                        errors.push(error);
                    }
                }
                for (const property of Object.keys(payload)) if (filtered(property)) delete payload[property];
                if (errors.length) {
                    const partial = {...Object.fromEntries(Object.entries(result.state).filter(([property]) => !filtered(property))), ...payload};
                    if (meta.options.optimistic !== false && Object.keys(partial).length) await meta.publish(partial);
                    throw errors[0];
                }
                return {...result, membersState: {...result.membersState, [meta.device.ieeeAddr]: payload}};
            },
        }),
        ...(converter.convertGet && {
            convertGet: async (entity, key, meta) => {
                if (
                    key === "state" &&
                    !meta.endpoint_name &&
                    utils.isEndpoint(entity) &&
                    !Array.isArray(meta.mapped) &&
                    meta.mapped?.meta?.combinedOnOff
                ) {
                    for (const ID of Object.values(meta.mapped.endpoint(meta.device)))
                        await converter.convertGet(meta.device.getEndpoint(ID), key, {
                            ...meta,
                            mapped: {...meta.mapped, meta: {...meta.mapped.meta, combinedOnOff: false}},
                        });
                } else return converter.convertGet(entity, key, meta);
            },
        }),
    };
}

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
