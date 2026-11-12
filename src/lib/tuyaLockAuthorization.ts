import {randomInt} from "node:crypto";

/** Separate from keypad credentials and from the encrypted Zigbee session. */
export interface RemoteLockAuthorization {
    keyId: number;
    key: Buffer;
}

/** The IFR variant was acknowledged by the tested TY0A01/_TYST12_snr3p274 unit. */
export type AuthorizationWireProfile = "tuya_documented" | "ifr7001_observed";

export interface RemoteAuthorizationPolicy {
    validFrom: number;
    validTo: number;
    maxUses: number;
}

const uint = (value: number, max: number): boolean => Number.isInteger(value) && value >= 0 && value <= max;

/** The documented numeric key consists of eight ASCII digits, not eight random binary bytes. */
export function generateRemoteLockAuthorization(keyId: number): RemoteLockAuthorization {
    if (!uint(keyId, 0xffff)) throw new Error("Invalid remote authorization identifier");
    return {keyId, key: Buffer.from(randomInt(100_000_000).toString().padStart(8, "0"), "ascii")};
}

/** DP48 raw value only. The controller adds sequence, encryption and replay protection. */
export function encodeRemoteLockAuthorization(
    authorization: RemoteLockAuthorization,
    policy: RemoteAuthorizationPolicy,
    profile: AuthorizationWireProfile = "tuya_documented",
): Buffer {
    if (profile !== "tuya_documented" && profile !== "ifr7001_observed") throw new Error("Invalid remote authorization wire profile");
    if (
        !authorization ||
        !uint(authorization.keyId, 0xffff) ||
        !Buffer.isBuffer(authorization.key) ||
        authorization.key.length !== 8 ||
        ![...authorization.key].every((digit) => digit >= 48 && digit <= 57)
    ) {
        throw new Error("Invalid remote authorization credential");
    }
    if (
        !policy ||
        !uint(policy.validFrom, 0x7fffffff) ||
        !uint(policy.validTo, 0x7fffffff) ||
        policy.validTo <= policy.validFrom ||
        !uint(policy.maxUses, 0xffff) ||
        policy.maxUses === 0
    ) {
        throw new Error("Invalid remote authorization policy");
    }
    const value = Buffer.alloc(21);
    // IFR7001 accepted flag 1, ID 1, a finite validity window and 65535 uses.
    // Flag 0 was rejected under different policies; do not infer flag-only causality.
    value[0] = profile === "ifr7001_observed" ? 1 : 0;
    value.writeUInt16BE(authorization.keyId, 1);
    value.writeUInt32BE(policy.validFrom, 3);
    value.writeUInt32BE(policy.validTo, 7);
    value.writeUInt16BE(policy.maxUses, 11);
    authorization.key.copy(value, 13);
    return value;
}

/** A rolling, finite policy; renewal keeps the same locally generated credential. */
export function authorizationPolicy(now = Date.now()): RemoteAuthorizationPolicy {
    const seconds = Math.floor(now / 1000);
    if (!Number.isFinite(seconds) || seconds < 300 || seconds >= 0x7fffffff - 86400) throw new Error("Invalid remote authorization clock");
    return {validFrom: seconds - 300, validTo: Math.min(seconds + 4 * 365 * 86400, 0x7fffffff), maxUses: 65535};
}

export interface AuthorizationSnapshot {
    version: 1;
    ieeeAddr: string;
    stage: "prepared" | "pending" | "confirmed" | "uncertain";
    keyId: number;
    key: string;
    policy: RemoteAuthorizationPolicy;
    used: number;
}

export const authorizationMetaKey = "tuyaEncryptedLockAuthorization";

function validateSnapshot(value: unknown, ieeeAddr: string): asserts value is AuthorizationSnapshot {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Tuya lock authorization state");
    const s = value as AuthorizationSnapshot;
    if (
        s.version !== 1 ||
        s.ieeeAddr !== ieeeAddr ||
        !["prepared", "pending", "confirmed", "uncertain"].includes(s.stage) ||
        typeof s.key !== "string" ||
        !/^(3[0-9]){8}$/.test(s.key) ||
        !uint(s.used, 65535)
    ) {
        throw new Error("Invalid Tuya lock authorization state");
    }
    encodeRemoteLockAuthorization({keyId: s.keyId, key: Buffer.from(s.key, "hex")}, s.policy, "ifr7001_observed");
}

/** Sensitive local database state. Neither options nor published device state contain these values. */
export function deviceAuthorizationStore(device: import("./types").Zh.Device) {
    const identity = (ieeeAddr: string) => {
        if (ieeeAddr !== device.ieeeAddr || !/^0x[0-9a-f]{16}$/.test(ieeeAddr)) throw new Error("Invalid Tuya lock authorization device");
    };
    return {
        // biome-ignore lint/suspicious/useAwait: synchronous database failures reject the asynchronous store contract.
        async load(ieeeAddr: string): Promise<AuthorizationSnapshot | undefined> {
            identity(ieeeAddr);
            const snapshot: unknown = device.meta[authorizationMetaKey];
            if (snapshot === undefined) return undefined;
            validateSnapshot(snapshot, ieeeAddr);
            return structuredClone(snapshot);
        },
        // biome-ignore lint/suspicious/useAwait: synchronous database failures reject the asynchronous store contract.
        async save(ieeeAddr: string, snapshot: AuthorizationSnapshot): Promise<void> {
            identity(ieeeAddr);
            validateSnapshot(snapshot, ieeeAddr);
            const previous: unknown = device.meta[authorizationMetaKey];
            device.meta[authorizationMetaKey] = structuredClone(snapshot);
            try {
                device.save();
            } catch {
                if (previous === undefined) delete device.meta[authorizationMetaKey];
                else device.meta[authorizationMetaKey] = previous;
                throw new Error("Tuya lock authorization checkpoint failed; command blocked");
            }
        },
    };
}
