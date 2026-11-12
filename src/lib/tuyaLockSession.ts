import type {Zh} from "./types";

/** Device-local state, deliberately separate from converter options and MQTT state. */
export const sessionMetaKey = "tuyaEncryptedLockSession";

export interface SessionSnapshot {
    version: 1;
    ieeeAddr: string;
    phase: "base" | "session" | "ready";
    baseConfirmed: boolean;
    baseKey: string;
    nonceA: string;
    key?: string;
    sequence: number;
    replaySequence: number;
    baseSequence?: number;
    sessionSequence?: number;
    previous?: SessionSnapshot;
}

type SessionDevice = Pick<Zh.Device, "ieeeAddr" | "meta" | "save">;
const fields = new Set([
    "version",
    "ieeeAddr",
    "phase",
    "baseConfirmed",
    "baseKey",
    "nonceA",
    "key",
    "sequence",
    "replaySequence",
    "baseSequence",
    "sessionSequence",
    "previous",
]);
const counter = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 65000;
const hex = (value: unknown, length: number): value is string => typeof value === "string" && new RegExp(`^[0-9a-f]{${length}}$`, "i").test(value);

/** Validate without ever including stored values in diagnostics. */
export function validateSessionSnapshot(value: unknown, ieeeAddr: string): asserts value is SessionSnapshot {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Tuya lock session");
    const s = value as Record<string, unknown>;
    if (
        Object.keys(s).some((field) => !fields.has(field)) ||
        s.version !== 1 ||
        s.ieeeAddr !== ieeeAddr ||
        !["base", "session", "ready"].includes(String(s.phase)) ||
        typeof s.baseConfirmed !== "boolean" ||
        !hex(s.baseKey, 32) ||
        !hex(s.nonceA, 8) ||
        !counter(s.sequence) ||
        !counter(s.replaySequence) ||
        (s.baseSequence !== undefined && !counter(s.baseSequence)) ||
        (s.sessionSequence !== undefined && !counter(s.sessionSequence)) ||
        (s.phase === "base" && !counter(s.baseSequence)) ||
        (s.phase === "session" && !counter(s.sessionSequence)) ||
        (s.phase !== "base" && !s.baseConfirmed) ||
        (s.phase === "ready" && !hex(s.key, 32)) ||
        (s.key !== undefined && !hex(s.key, 32))
    )
        throw new Error("Invalid Tuya lock session");
    if (s.previous !== undefined) {
        const previous = s.previous as Record<string, unknown>;
        if (
            !previous ||
            typeof previous !== "object" ||
            previous.previous !== undefined ||
            previous.phase !== "ready" ||
            previous.baseKey !== s.baseKey
        )
            throw new Error("Invalid previous Tuya lock session");
        validateSessionSnapshot(previous, ieeeAddr);
    }
}

/**
 * Persist through herdsman's database, not a path derived from the installed
 * converter module. The containing database must be treated as sensitive.
 * Call save before dispatching a packet so a restart cannot reuse its counters.
 * Never store pending commands or publish this value as device state/options.
 */
export function deviceSessionStore(device: SessionDevice) {
    const checkIdentity = (ieeeAddr: string) => {
        if (ieeeAddr !== device.ieeeAddr || !/^0x[0-9a-f]{16}$/.test(ieeeAddr)) throw new Error("Invalid Tuya lock session device");
    };
    return {
        // biome-ignore lint/suspicious/useAwait: synchronous database errors must reject the asynchronous store contract.
        async load(ieeeAddr: string): Promise<SessionSnapshot | undefined> {
            checkIdentity(ieeeAddr);
            const state: unknown = device.meta[sessionMetaKey];
            if (state === undefined) return undefined;
            validateSessionSnapshot(state, ieeeAddr);
            return structuredClone(state);
        },
        // biome-ignore lint/suspicious/useAwait: synchronous database errors must reject the asynchronous store contract.
        async save(ieeeAddr: string, state: SessionSnapshot): Promise<void> {
            checkIdentity(ieeeAddr);
            validateSessionSnapshot(state, ieeeAddr);
            const previous: unknown = device.meta[sessionMetaKey];
            device.meta[sessionMetaKey] = structuredClone(state);
            try {
                // save(true) synchronously writes and fsyncs the herdsman database.
                device.save();
            } catch {
                if (previous === undefined) delete device.meta[sessionMetaKey];
                else device.meta[sessionMetaKey] = previous;
                throw new Error("Tuya lock session checkpoint failed; packet must not be sent");
            }
        },
    };
}
