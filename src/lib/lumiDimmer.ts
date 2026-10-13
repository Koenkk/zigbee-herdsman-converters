import {level_config as levelConfigReport} from "../converters/fromZigbee";
import {logger} from "./logger";
import * as m from "./modernExtend";
import type {Definition, Fz, KeyValue, ModernExtend, Publish, Tz, Zh} from "./types";
import * as utils from "./utils";

const NS = "zhc:lumi:dimmer";
const LEVEL_KEY = "kdR01dOnLevel";
type OnLevel = number | "previous";
type Readback = {currentLevel: number; onLevel: number; onOff: 0 | 1};
type Intent = {inFlight: boolean; expires: number};
type Repair = {timer?: ReturnType<typeof setTimeout>};
type Session = {
    device?: Zh.Device;
    active: boolean;
    generation: number;
    onOff?: 0 | 1;
    intent?: Intent;
    repair?: Repair;
};
type Context = {
    endpoint: Zh.Endpoint;
    device: Zh.Device;
    session: Session;
    mapped: Definition | Definition[];
    state: KeyValue;
    publish: Publish;
};
class Cancelled extends Error {}

/** KD-R01D: retain explicitly selected OnLevel intent independently of firmware's mutable native attribute. */
export function dimmerH2Light(): ModernExtend {
    const light = m.light({
        powerOnBehavior: false,
        levelConfig: {
            features: ["execute_if_off", "on_transition_time", "off_transition_time", "on_level"],
        },
    });
    const sessions = new Map<string, Session>();
    // Keep the queue across session replacement: an already-dispatched request cannot be unsent.
    const queues = new Map<string, Promise<unknown>>();
    const canonical = (value: unknown): OnLevel | undefined =>
        value === "previous" || (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 254) ? value : undefined;
    // Never adopt cached state, native reads/reports, group controls or legacy trial metadata as user intent.
    const selected = (device: Zh.Device): OnLevel | undefined => canonical(device.meta[LEVEL_KEY]);
    const targetLevel = (device: Zh.Device): number | undefined => {
        const value = selected(device);
        return typeof value === "number" ? value : undefined;
    };
    const sessionFor = (device: Zh.Device): Session => {
        let session = sessions.get(device.ieeeAddr);
        if (!session) {
            session = {device, active: true, generation: 0};
            sessions.set(device.ieeeAddr, session);
        }
        return session;
    };
    const active = (ctx: Context) => ctx.session.active && ctx.session.device === ctx.device && sessions.get(ctx.device.ieeeAddr) === ctx.session;
    const check = (ctx: Context) => {
        if (!active(ctx)) throw new Cancelled("KD-R01D stopped or restarted; pending operation cancelled.");
    };
    const context = (entity: Zh.Endpoint | Zh.Group, meta: Tz.Meta): Context | undefined => {
        if (Array.isArray(meta.mapped) || !utils.isEndpoint(entity)) return undefined;
        const device = meta.device ?? entity.getDevice();
        return {
            endpoint: entity,
            device,
            session: sessionFor(device),
            mapped: meta.mapped,
            state: meta.state,
            publish: meta.publish,
        };
    };
    const invalidate = (session: Session) => {
        session.generation++;
    };
    const invalidateIntent = (session: Session) => {
        invalidate(session);
        session.intent = undefined;
    };
    const cancelRepair = (session: Session) => {
        if (session.repair?.timer) clearTimeout(session.repair.timer);
        session.repair = undefined;
    };
    const enqueue = async <T>(ctx: Context, operation: () => Promise<T>): Promise<T> => {
        const key = ctx.device.ieeeAddr;
        const previous = queues.get(key) ?? Promise.resolve();
        const current = previous
            .catch(() => {})
            .then(() => {
                check(ctx);
                return operation();
            });
        queues.set(key, current);
        try {
            return await current;
        } finally {
            if (queues.get(key) === current) queues.delete(key);
        }
    };
    const levelConfig = (state: KeyValue): KeyValue => (utils.isObject(state.level_config) ? state.level_config : {});
    const retainSelection = (device: Zh.Device, payload: KeyValue): KeyValue => {
        const value = selected(device);
        if (value === undefined || !utils.isObject(payload.level_config)) return payload;
        return {
            ...payload,
            level_config: {...payload.level_config, on_level: value},
        };
    };
    const snapshot = (ctx: Context, raw: Readback): KeyValue =>
        retainSelection(ctx.device, {
            brightness: raw.currentLevel,
            state: raw.onOff ? "ON" : "OFF",
            level_config: {
                ...levelConfig(ctx.state),
                on_level: raw.onLevel === 255 ? "previous" : raw.onLevel,
            },
        });
    const failure = (ctx: Context, operation: string, error: unknown) => {
        if (error instanceof Cancelled || !active(ctx)) return;
        logger.error(
            `KD-R01D ${ctx.device.ieeeAddr}: ${operation} failed: ${error instanceof Error ? error.message : String(error)}. ` +
                "Check device connectivity and re-save level_config.on_level; select 'previous' to disable automatic correction.",
            NS,
        );
    };
    const readState = async (ctx: Context, guard: () => void = () => check(ctx)): Promise<Readback> => {
        guard();
        const options = utils.getOptions(ctx.mapped, ctx.endpoint);
        const level = await ctx.endpoint.read("genLevelCtrl", ["currentLevel", "onLevel"], options);
        guard();
        const state = await ctx.endpoint.read("genOnOff", ["onOff"], options);
        guard();
        if (
            !Number.isInteger(level?.currentLevel) ||
            level.currentLevel < 0 ||
            level.currentLevel > 254 ||
            !Number.isInteger(level?.onLevel) ||
            level.onLevel < 0 ||
            level.onLevel > 255 ||
            (state?.onOff !== 0 && state?.onOff !== 1)
        ) {
            throw new Error("Incomplete currentLevel/onLevel/onOff readback; selected OnLevel cannot be verified.");
        }
        const raw: Readback = {
            currentLevel: level.currentLevel,
            onLevel: level.onLevel,
            onOff: state.onOff,
        };
        if (ctx.endpoint.ID === 1 && ctx.session.onOff === undefined) ctx.session.onOff = raw.onOff;
        return raw;
    };
    const writeLevel = async (ctx: Context, value: number, guard: () => void = () => check(ctx)) => {
        guard();
        await ctx.endpoint.write("genLevelCtrl", {onLevel: value}, utils.getOptions(ctx.mapped, ctx.endpoint));
        guard();
    };
    const confirmLevel = async (ctx: Context, value: OnLevel) => {
        check(ctx);
        const raw = await ctx.endpoint.read("genLevelCtrl", ["onLevel"], utils.getOptions(ctx.mapped, ctx.endpoint));
        check(ctx);
        const expected = value === "previous" ? 255 : value;
        if (raw?.onLevel !== expected) throw new Error(`Cannot confirm selected OnLevel: expected ${expected}, read ${raw?.onLevel}.`);
    };
    const applyAndRead = async (ctx: Context, value: number, guard: () => void) => {
        await writeLevel(ctx, value, guard);
        const raw = await readState(ctx, guard);
        if (raw.onLevel !== value) throw new Error(`OnLevel write did not stick: expected ${value}, read ${raw.onLevel}.`);
        return raw;
    };
    const settleDelay = (endpoint: Zh.Endpoint, meta: Tz.Meta) => {
        const configured = levelConfig(meta.state);
        const times = ["on_transition_time", "off_transition_time", "on_off_transition_time"]
            .map((key) => configured[key])
            .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
        return Math.max(1500, utils.getTransition(endpoint, "brightness", meta).time * 100 + 250, ...times.map((time) => time * 1000 + 250));
    };
    const scheduleRepair = (ctx: Context, value: number, delay: number) => {
        check(ctx);
        cancelRepair(ctx.session);
        const job: Repair = {};
        ctx.session.repair = job;
        const guard = () => {
            check(ctx);
            if (ctx.session.repair !== job || targetLevel(ctx.device) !== value) throw new Cancelled("Native OnLevel repair superseded.");
        };
        // Settling must not occupy the wire queue or dragging brightness builds a command backlog.
        job.timer = setTimeout(() => {
            void enqueue(ctx, async () => {
                try {
                    const raw = await applyAndRead(ctx, value, guard);
                    guard();
                    await ctx.publish(snapshot(ctx, raw));
                } catch (error) {
                    failure(ctx, "native OnLevel repair", error);
                } finally {
                    if (ctx.session.repair === job) ctx.session.repair = undefined;
                }
            }).catch((error: unknown) => failure(ctx, "native OnLevel repair queue", error));
        }, delay);
    };
    // Guard each delegated wire request across awaits without mutating shared converters/endpoints.
    // Herdsman store keys use endpoint address/ID, not object identity.
    const guardedEndpoint = (ctx: Context): Zh.Endpoint =>
        new Proxy(ctx.endpoint, {
            get: (endpoint, property) => {
                if (property === "read") {
                    const read: Zh.Endpoint["read"] = async (cluster, attributes, options) => {
                        check(ctx);
                        const result = await endpoint.read(cluster, attributes, options);
                        check(ctx);
                        if (cluster === "genOnOff" && ctx.endpoint.ID === 1 && ctx.session.onOff === undefined) {
                            const onOff: unknown = utils.isObject(result) ? result.onOff : undefined;
                            if (onOff === 0 || onOff === 1) ctx.session.onOff = onOff;
                        }
                        return result;
                    };
                    return read;
                }
                if (property === "write")
                    return async (...args: Parameters<Zh.Endpoint["write"]>) => {
                        check(ctx);
                        await endpoint.write(...args);
                        check(ctx);
                    };
                if (property === "command")
                    return async (...args: Parameters<Zh.Endpoint["command"]>) => {
                        check(ctx);
                        const result = await endpoint.command(...args);
                        check(ctx);
                        return result;
                    };
                const value: unknown = Reflect.get(endpoint, property, endpoint);
                return typeof value === "function" && property !== "constructor" ? value.bind(endpoint) : value;
            },
        });
    const saveSelection = async (ctx: Context, value: OnLevel) => {
        await confirmLevel(ctx, value);
        check(ctx);
        // Seed from a fresh read, never an initial/readResponse report. Enabling must not dim an already-On light.
        if (typeof value === "number" && ctx.endpoint.ID === 1 && ctx.session.onOff === undefined) {
            const raw = await ctx.endpoint.read("genOnOff", ["onOff"], utils.getOptions(ctx.mapped, ctx.endpoint));
            check(ctx);
            if (raw?.onOff !== 0 && raw?.onOff !== 1) throw new Error("Cannot read OnOff baseline for selected OnLevel.");
            if (ctx.session.onOff === undefined) ctx.session.onOff = raw.onOff;
        }
        check(ctx);
        const previous: unknown = ctx.device.meta[LEVEL_KEY];
        ctx.device.meta[LEVEL_KEY] = value;
        try {
            await ctx.device.save();
        } catch (error) {
            if (previous === undefined) delete ctx.device.meta[LEVEL_KEY];
            else ctx.device.meta[LEVEL_KEY] = previous;
            throw error;
        }
        check(ctx);
        cancelRepair(ctx.session); // Only confirmed, persisted choices supersede a prior successful command's repair.
        invalidate(ctx.session);
    };
    const wrap = (converter: Tz.Converter): Tz.Converter => {
        // Option-only no-ops can run after brightness in the same message; leave its explicit intent intact.
        if (converter.key?.every((key) => key === "transition" || key === "rate")) return converter;
        const set = converter.convertSet;
        const get = converter.convertGet;
        const brightnessControl = converter.key?.includes("brightness") && converter.key.includes("state");
        const configuration = converter.key?.includes("level_config");
        const invalidateControl = brightnessControl ? invalidateIntent : invalidate;
        const wrapped: Tz.Converter = {...converter};
        if (set)
            wrapped.convertSet = async (entity, key, value, meta) => {
                const ctx = context(entity, meta);
                if (!ctx) return await set(entity, key, value, meta);
                check(ctx);
                invalidateControl(ctx.session); // Cancel queued physical work at request entry, preserving configuration-only intent.
                return await enqueue(ctx, async () => {
                    try {
                        const desired = targetLevel(ctx.device);
                        const explicit = meta.message.brightness != null || meta.message.brightness_percent != null;
                        const state = typeof meta.message.state === "string" ? meta.message.state.toLowerCase() : undefined;
                        let forwarded = meta;
                        if (brightnessControl && desired !== undefined && !explicit && (state === "on" || state === "toggle")) {
                            await writeLevel(ctx, desired);
                            await confirmLevel(ctx, desired);
                            forwarded = {
                                ...meta,
                                state: retainSelection(ctx.device, {
                                    ...meta.state,
                                    level_config: levelConfig(meta.state),
                                }),
                            };
                        }
                        const delay = brightnessControl ? settleDelay(ctx.endpoint, forwarded) : 0;
                        check(ctx);
                        invalidateControl(ctx.session); // Reports arriving during preflight must not leave a queued correction behind dispatch.
                        let intent: Intent | undefined;
                        if (
                            brightnessControl &&
                            explicit &&
                            state !== "off" &&
                            (Number(meta.message.brightness ?? meta.message.brightness_percent) > 0 || state === "on" || state === "toggle")
                        ) {
                            // Track even before a first selection, so a mixed brightness + on_level payload retains explicit brightness.
                            intent = {inFlight: true, expires: 0};
                            ctx.session.intent = intent;
                        }
                        let result: Tz.ConvertSetResult;
                        try {
                            result = await set(guardedEndpoint(ctx), key, value, forwarded);
                        } catch (error) {
                            if (intent && ctx.session.intent === intent) ctx.session.intent = undefined;
                            throw error;
                        }
                        check(ctx);
                        if (intent && ctx.session.intent === intent) {
                            intent.inFlight = false;
                            intent.expires = Date.now() + Math.max(5000, delay + 1000);
                        }
                        const response: Exclude<Tz.ConvertSetResult, void> = result || {};
                        if (configuration && Object.hasOwn(levelConfig(response.state ?? {}), "on_level")) {
                            // Generic level_config owns JSON parsing, numeric strings, presets and clamping.
                            const choice = canonical(levelConfig(response.state).on_level);
                            if (choice === undefined)
                                throw new Error("Normalized level_config.on_level must be an integer from 1 to 254 or 'previous'.");
                            await saveSelection(ctx, choice);
                        }
                        if (brightnessControl && desired !== undefined) scheduleRepair(ctx, desired, delay);
                        return response.state
                            ? {
                                  ...response,
                                  state: retainSelection(ctx.device, response.state),
                              }
                            : result;
                    } catch (error) {
                        if (configuration || targetLevel(ctx.device) !== undefined) failure(ctx, `MQTT ${key} control`, error);
                        throw error;
                    }
                });
            };
        if (get)
            wrapped.convertGet = async (entity, key, meta) => {
                const ctx = context(entity, meta);
                if (!ctx) return await get(entity, key, meta);
                // Standard GET is read-only: no intent adoption, repair or additional state fields.
                return await enqueue(ctx, async () => await get(guardedEndpoint(ctx), key, meta));
            };
        return wrapped;
    };
    const reports: typeof levelConfigReport = {
        ...levelConfigReport,
        convert: (model, msg, publish, options, meta) => {
            const result = levelConfigReport.convert(model, msg, (payload) => publish(retainSelection(msg.device, payload)), options, meta);
            if (!result || result instanceof Promise) return result;
            return retainSelection(msg.device, result);
        },
    };
    const turnOn: Fz.Converter<"genOnOff", undefined, ["attributeReport"]> = {
        cluster: "genOnOff",
        type: ["attributeReport"],
        convert: (model, msg, publish, _options, meta) => {
            if (msg.endpoint.ID !== 1 || (msg.data.onOff !== 0 && msg.data.onOff !== 1)) return;
            const ctx: Context = {
                endpoint: msg.endpoint,
                device: msg.device,
                session: sessionFor(msg.device),
                mapped: model,
                state: meta.state,
                publish,
            };
            if (!active(ctx)) return; // Late reports must not poison a stopped/replaced session's baseline.
            const session = ctx.session;
            const wasOff = session.onOff === 0;
            const wasOn = session.onOff === 1;
            session.onOff = msg.data.onOff;
            if (msg.data.onOff === 0) {
                if (wasOn) invalidateIntent(session); // Duplicate/initial Off must preserve reserved explicit On intent.
                return;
            }
            const explicit = session.intent && (session.intent.inFlight || session.intent.expires > Date.now());
            session.intent = undefined; // Consume on the first On, even a duplicate report.
            const target = targetLevel(ctx.device);
            if (!wasOff || explicit || target === undefined) return;
            const generation = session.generation;
            const guard = () => {
                check(ctx);
                if (session.generation !== generation || targetLevel(ctx.device) !== target)
                    throw new Cancelled("Physical turn-on correction superseded.");
            };
            void enqueue(ctx, async () => {
                try {
                    const before = await readState(ctx, guard);
                    guard();
                    if (!before.onOff) {
                        await publish(snapshot(ctx, before));
                        return;
                    }
                    const changed = before.currentLevel !== target;
                    guard();
                    if (changed) {
                        // Plain MoveToLevel cannot intentionally re-light an Off lamp; override persistent ExecuteIfOff per command.
                        await ctx.endpoint.command(
                            "genLevelCtrl",
                            "moveToLevel",
                            {
                                level: target,
                                transtime: 0,
                                optionsMask: 1,
                                optionsOverride: 0,
                            },
                            utils.getOptions(model, ctx.endpoint),
                        );
                        guard();
                    }
                    if (changed || before.onLevel !== target) await writeLevel(ctx, target, guard);
                    const after = await readState(ctx, guard);
                    guard();
                    if (after.onOff !== 1 || after.currentLevel !== target || after.onLevel !== target) {
                        logger.warning(
                            `KD-R01D ${ctx.device.ieeeAddr}: turn-on readback differs from selected ${target}: level=${after.currentLevel}, onLevel=${after.onLevel}, onOff=${after.onOff}. Check connectivity or select level_config.on_level='previous'.`,
                            NS,
                        );
                    }
                    await publish(snapshot(ctx, after));
                } catch (error) {
                    failure(ctx, "physical turn-on correction", error);
                }
            }).catch((error: unknown) => failure(ctx, "physical turn-on queue", error));
        },
    };
    const rotation: Fz.Converter<"manuSpecificLumi", undefined, ["attributeReport"]> = {
        cluster: "manuSpecificLumi",
        type: ["attributeReport"],
        convert: (_model, msg) => {
            const value = msg.data[570];
            const session = sessions.get(msg.device.ieeeAddr);
            if (session?.active && session.device === msg.device && typeof value === "number" && [1, 2, 3, 129, 130, 131].includes(value))
                invalidateIntent(session);
        },
    };
    return {
        ...light,
        toZigbee: (light.toZigbee ?? []).map(wrap),
        fromZigbee: [...(light.fromZigbee ?? []).map((converter) => (converter === levelConfigReport ? reports : converter)), turnOn, rotation],
        exposes: light.exposes?.map((expose) => {
            if (typeof expose === "function") return expose;
            const copy = expose.clone();
            const onLevel = copy.features
                ?.find((feature) => feature.name === "level_config")
                ?.features?.find((feature) => feature.name === "on_level");
            onLevel?.withDescription(
                "Turn-on brightness. Re-save once to retain your selection: numeric values are reapplied after MQTT brightness changes and corrected after physical Off-to-On reports, which may briefly show the previous brightness. 'previous' disables correction. Group, scene, move and step controls are not protected.",
            );
            return copy;
        }),
        onEvent: [
            ...(light.onEvent ?? []),
            (event) => {
                if (event.type !== "stop" && event.type !== "start") return;
                const address = event.type === "stop" ? event.data.ieeeAddr : event.data.device.ieeeAddr;
                const previous = sessions.get(address);
                if (previous) {
                    previous.active = false;
                    invalidateIntent(previous);
                    cancelRepair(previous);
                }
                sessions.set(address, {
                    device: event.type === "start" ? event.data.device : undefined,
                    active: event.type === "start",
                    generation: 0,
                });
            },
        ],
    };
}
