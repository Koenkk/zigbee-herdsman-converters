import * as exposes from "./exposes";
import {logger} from "./logger";
import * as m from "./modernExtend";
import type {Definition, Fz, KeyValue, ModernExtend, Publish, Tz, Zh} from "./types";
import * as utils from "./utils";

const e = exposes.presets;
const ea = exposes.access;
const NS = "zhc:lumi:dimmer";
const LEVEL_KEY = "kdR01dFixedOnLevel";
const PHYSICAL_KEY = "kdR01dFixedOnLevelPhysical";
type Status = "disabled" | "pending" | "applied" | "mismatch" | "error";
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
    readback?: Readback;
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

/** KD-R01D only: native OnLevel guarding and separately opt-in, report-driven physical turn-on correction. */
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
    const fixedLevel = (device: Zh.Device): number => {
        const value: unknown = device.meta[LEVEL_KEY];
        return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 254 ? value : 0;
    };
    const physicalEnabled = (device: Zh.Device) => device.meta[PHYSICAL_KEY] === true && fixedLevel(device) > 0;
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
    const requireContext = (entity: Zh.Endpoint | Zh.Group, meta: Tz.Meta): Context => {
        const ctx = context(entity, meta);
        if (!ctx) throw new Error("Configure/read fixed turn-on settings on one KD-R01D, not a group.");
        check(ctx);
        return ctx;
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
    const settings = (ctx: Context, status: Status): KeyValue => ({
        fixed_on_level: fixedLevel(ctx.device),
        fixed_on_level_physical: ctx.device.meta[PHYSICAL_KEY] === true,
        fixed_on_level_status: status,
    });
    const snapshot = (ctx: Context, raw: Readback): KeyValue => ({
        brightness: raw.currentLevel,
        state: raw.onOff ? "ON" : "OFF",
        level_config: {
            ...levelConfig(ctx.state),
            on_level: raw.onLevel === 255 ? "previous" : raw.onLevel,
        },
    });
    const nativeStatus = (ctx: Context, raw?: Readback): Status =>
        !fixedLevel(ctx.device) ? "disabled" : ctx.session.repair ? "pending" : raw?.onLevel === fixedLevel(ctx.device) ? "applied" : "mismatch";
    const failure = async (ctx: Context, operation: string, error: unknown) => {
        if (error instanceof Cancelled || !active(ctx)) return;
        logger.error(
            `KD-R01D ${ctx.device.ieeeAddr}: ${operation} failed: ${error instanceof Error ? error.message : String(error)}. ` +
                "Check device connectivity and refresh fixed_on_level; disable fixed_on_level_physical if correction is unwanted.",
            NS,
        );
        try {
            await ctx.publish(settings(ctx, "error"));
        } catch (publishError) {
            logger.error(`KD-R01D ${ctx.device.ieeeAddr}: cannot publish ${operation} failure: ${String(publishError)}`, NS);
        }
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
            throw new Error("Incomplete currentLevel/onLevel/onOff readback; fixed turn-on level cannot be verified.");
        }
        const raw: Readback = {
            currentLevel: level.currentLevel,
            onLevel: level.onLevel,
            onOff: state.onOff,
        };
        ctx.session.readback = raw;
        // Only our completed fresh reads may seed an unknown baseline; readResponse converters never do.
        if (ctx.endpoint.ID === 1 && ctx.session.onOff === undefined) ctx.session.onOff = raw.onOff;
        return raw;
    };
    const writeLevel = async (ctx: Context, value: number, guard: () => void = () => check(ctx)) => {
        guard();
        await ctx.endpoint.write("genLevelCtrl", {onLevel: value}, utils.getOptions(ctx.mapped, ctx.endpoint));
        guard();
    };
    const applyAndRead = async (ctx: Context, value: number, guard: () => void = () => check(ctx)) => {
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
            if (ctx.session.repair !== job || fixedLevel(ctx.device) !== value) throw new Cancelled("Native OnLevel repair superseded.");
        };
        // Settling must not occupy the wire queue, otherwise dragging brightness builds a command backlog.
        job.timer = setTimeout(() => {
            void enqueue(ctx, async () => {
                try {
                    guard();
                    const raw = await applyAndRead(ctx, value, guard);
                    guard();
                    await ctx.publish({
                        ...snapshot(ctx, raw),
                        ...settings(ctx, "applied"),
                    });
                } catch (error) {
                    await failure(ctx, "native OnLevel repair", error);
                } finally {
                    if (ctx.session.repair === job) ctx.session.repair = undefined;
                }
            }).catch((error: unknown) => failure(ctx, "native OnLevel repair queue", error));
        }, delay);
    };
    // Upstream converters may perform multiple awaited requests. Guard each delegated request too,
    // without mutating shared converters/endpoints. Herdsman store keys use endpoint address/ID, not object identity.
    const guardedEndpoint = (ctx: Context): Zh.Endpoint =>
        new Proxy(ctx.endpoint, {
            get: (target, property) => {
                if (property === "read") {
                    const read: Zh.Endpoint["read"] = async (cluster, attributes, options) => {
                        check(ctx);
                        const result = await target.read(cluster, attributes, options);
                        check(ctx);
                        return result;
                    };
                    return read;
                }
                if (property === "write")
                    return async (...args: Parameters<Zh.Endpoint["write"]>) => {
                        check(ctx);
                        await target.write(...args);
                        check(ctx);
                    };
                if (property === "command")
                    return async (...args: Parameters<Zh.Endpoint["command"]>) => {
                        check(ctx);
                        const result = await target.command(...args);
                        check(ctx);
                        return result;
                    };
                const value: unknown = Reflect.get(target, property, target);
                return typeof value === "function" && property !== "constructor" ? value.bind(target) : value;
            },
        });
    const wrap = (converter: Tz.Converter): Tz.Converter => {
        // These no-op option converters may run after brightness in the same MQTT message.
        // They must not consume the explicit brightness intent reserved for its later On report.
        if (converter.key?.every((key) => key === "transition" || key === "rate")) return converter;
        const set = converter.convertSet;
        const get = converter.convertGet;
        const brightnessControl = converter.key?.includes("brightness") && converter.key.includes("state");
        // Configuration/effect controls can follow brightness in the same MQTT message before its On report.
        const invalidateControl = brightnessControl ? invalidateIntent : invalidate;
        const wrapped: Tz.Converter = {...converter};
        if (set) {
            wrapped.convertSet = async (entity, key, value, meta) => {
                const ctx = context(entity, meta);
                if (!ctx) return await set(entity, key, value, meta);
                check(ctx);
                invalidateControl(ctx.session); // Invalidate at entry, not just when this request reaches the queue.
                return await enqueue(ctx, async () => {
                    try {
                        const desired = fixedLevel(ctx.device);
                        let forwarded = meta;
                        const explicit = meta.message.brightness != null || meta.message.brightness_percent != null;
                        const state = typeof meta.message.state === "string" ? meta.message.state.toLowerCase() : undefined;
                        if (brightnessControl && desired && !explicit && (state === "on" || state === "toggle")) {
                            await writeLevel(ctx, desired);
                            check(ctx);
                            const confirmed = await ctx.endpoint.read("genLevelCtrl", ["onLevel"], utils.getOptions(meta.mapped, ctx.endpoint));
                            check(ctx);
                            if (confirmed.onLevel !== desired) throw new Error(`Cannot confirm fixed OnLevel ${desired} before turning on.`);
                            forwarded = {
                                ...meta,
                                state: {
                                    ...meta.state,
                                    level_config: {
                                        ...levelConfig(meta.state),
                                        on_level: desired,
                                    },
                                },
                            };
                        }
                        const delay = brightnessControl && desired ? settleDelay(ctx.endpoint, forwarded) : 0;
                        check(ctx);
                        invalidateControl(ctx.session); // Overlapping requests/reports may have queued a correction during preflight.
                        let intent: Intent | undefined;
                        if (
                            brightnessControl &&
                            desired &&
                            explicit &&
                            state !== "off" &&
                            (Number(meta.message.brightness ?? meta.message.brightness_percent) > 0 || state === "on" || state === "toggle")
                        ) {
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
                        if (!brightnessControl || !desired) return result;
                        if (intent && ctx.session.intent === intent) {
                            intent.inFlight = false;
                            intent.expires = Date.now() + Math.max(5000, delay + 1000);
                        }
                        scheduleRepair(ctx, desired, delay);
                        const response: Exclude<Tz.ConvertSetResult, void> = result || {};
                        return {
                            ...response,
                            state: {...response.state, ...settings(ctx, "pending")},
                        };
                    } catch (error) {
                        if (fixedLevel(ctx.device)) await failure(ctx, "MQTT light control", error);
                        throw error;
                    }
                });
            };
        }
        if (get) {
            wrapped.convertGet = async (entity, key, meta) => {
                const ctx = context(entity, meta);
                if (!ctx) return await get(entity, key, meta);
                return await enqueue(ctx, async () => await get(guardedEndpoint(ctx), key, meta));
            };
        }
        return wrapped;
    };
    const saveSetting = async (ctx: Context, key: string, value: number | boolean) => {
        check(ctx);
        const previous: unknown = ctx.device.meta[key];
        ctx.device.meta[key] = value;
        try {
            await ctx.device.save();
        } catch (error) {
            if (previous === undefined) delete ctx.device.meta[key];
            else ctx.device.meta[key] = previous;
            throw error;
        }
        check(ctx);
    };
    const configuration: Tz.Converter = {
        key: ["fixed_on_level", "fixed_on_level_physical", "fixed_on_level_status"],
        convertSet: async (entity, key, value, meta) => {
            if (key === "fixed_on_level") {
                if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 254) {
                    throw new Error("fixed_on_level must be an integer from 0 to 254; 0 disables the workaround.");
                }
            } else if (key !== "fixed_on_level_physical" || typeof value !== "boolean") {
                throw new Error("Only fixed_on_level and fixed_on_level_physical are writable; physical correction requires true or false.");
            }
            const ctx = requireContext(entity, meta);
            invalidate(ctx.session);
            return await enqueue(ctx, async () => {
                try {
                    invalidate(ctx.session);
                    let raw: Readback | undefined;
                    if (key === "fixed_on_level") {
                        utils.assertNumber(value, key);
                        if (value) raw = await applyAndRead(ctx, value);
                        await saveSetting(ctx, LEVEL_KEY, value);
                        cancelRepair(ctx.session);
                    } else {
                        if (typeof value !== "boolean") throw new Error("fixed_on_level_physical must be true or false.");
                        if (value && !fixedLevel(ctx.device)) throw new Error("Set fixed_on_level above 0 before enabling physical correction.");
                        if (value) raw = await readState(ctx);
                        await saveSetting(ctx, PHYSICAL_KEY, value);
                        if (!value) return {state: {fixed_on_level_physical: false}};
                    }
                    return {
                        state: {
                            ...(raw ? snapshot(ctx, raw) : {}),
                            ...settings(ctx, raw ? nativeStatus(ctx, raw) : "disabled"),
                        },
                    };
                } catch (error) {
                    await failure(ctx, "fixed turn-on configuration", error);
                    throw error;
                }
            });
        },
        convertGet: async (entity, _key, meta) => {
            const ctx = requireContext(entity, meta);
            await enqueue(ctx, async () => {
                try {
                    const raw = fixedLevel(ctx.device) ? await readState(ctx) : undefined;
                    check(ctx);
                    await ctx.publish({
                        ...settings(ctx, nativeStatus(ctx, raw)),
                        ...(raw ? snapshot(ctx, raw) : {}),
                    });
                } catch (error) {
                    await failure(ctx, "fixed turn-on refresh", error);
                    throw error;
                }
            });
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
            if (!active(ctx)) return; // Late reports must not seed a stopped/replaced session's baseline.
            const session = ctx.session;
            const wasOff = session.onOff === 0;
            const wasOn = session.onOff === 1;
            session.onOff = msg.data.onOff;
            if (msg.data.onOff === 0) {
                if (wasOn) invalidateIntent(session); // Only a real On-to-Off edge clears intent; duplicate/initial Off must preserve it.
                return;
            }
            const explicit = session.intent && (session.intent.inFlight || session.intent.expires > Date.now());
            session.intent = undefined; // Consume on the first On, even a duplicate report.
            if (!wasOff || explicit || !physicalEnabled(ctx.device)) return;
            const generation = session.generation;
            const target = fixedLevel(ctx.device);
            const guard = () => {
                check(ctx);
                if (session.generation !== generation || !physicalEnabled(ctx.device) || fixedLevel(ctx.device) !== target) {
                    throw new Cancelled("Physical turn-on correction superseded.");
                }
            };
            void enqueue(ctx, async () => {
                try {
                    const before = await readState(ctx, guard);
                    if (!before.onOff) {
                        await publish({
                            ...snapshot(ctx, before),
                            ...settings(ctx, nativeStatus(ctx, before)),
                        });
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
                    const status: Status = after.onOff === 1 && after.currentLevel === target && after.onLevel === target ? "applied" : "mismatch";
                    if (status === "mismatch") {
                        logger.warning(
                            `KD-R01D ${ctx.device.ieeeAddr}: physical turn-on readback differs from ${target}: level=${after.currentLevel}, onLevel=${after.onLevel}, onOff=${after.onOff}. Refresh fixed_on_level or disable physical correction.`,
                            NS,
                        );
                    }
                    await publish({...snapshot(ctx, after), ...settings(ctx, status)});
                } catch (error) {
                    await failure(ctx, "physical turn-on correction", error);
                }
            }).catch((error: unknown) => failure(ctx, "physical turn-on queue", error));
            return settings(ctx, "pending");
        },
    };
    const rotation: Fz.Converter<"manuSpecificLumi", undefined, ["attributeReport"]> = {
        cluster: "manuSpecificLumi",
        type: ["attributeReport"],
        convert: (_model, msg) => {
            const value = msg.data[570];
            const session = sessions.get(msg.device.ieeeAddr);
            if (session?.active && session.device === msg.device && typeof value === "number" && [1, 2, 3, 129, 130, 131].includes(value)) {
                invalidateIntent(session);
            }
        },
    };
    return {
        ...light,
        toZigbee: [...(light.toZigbee ?? []).map(wrap), configuration],
        fromZigbee: [...(light.fromZigbee ?? []), turnOn, rotation],
        exposes: [
            ...(light.exposes ?? []),
            e
                .numeric("fixed_on_level", ea.ALL)
                .withValueMin(0)
                .withValueMax(254)
                .withValueStep(1)
                .withCategory("config")
                .withDescription(
                    "Persistent fixed turn-on brightness; 0 disables the workaround. Reapplies native OnLevel after MQTT brightness changes without changing their brightness. Physical correction is a separate opt-in.",
                ),
            e
                .binary("fixed_on_level_physical", ea.ALL, true, false)
                .withCategory("config")
                .withDescription(
                    "Opt-in correction after an Off-to-On report; requires fixed_on_level above 0. May briefly show the previous brightness. Does not protect group, scene, move or step controls.",
                ),
            e
                .enum("fixed_on_level_status", ea.STATE_GET, ["disabled", "pending", "applied", "mismatch", "error"])
                .withCategory("diagnostic")
                .withDescription(
                    "Applied confirms the latest readback, not that physical turn-on natively honors OnLevel or that future turn-ons will match. Refresh reads current device state without changing brightness.",
                ),
        ],
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
