import {describe, expect, it} from "vitest";
import {authorizationPolicy, encodeRemoteLockAuthorization, generateRemoteLockAuthorization} from "../src/lib/tuyaLockAuthorization";

const credential = () => ({keyId: 7, key: Buffer.from("12345678", "ascii")});
const policy = () => ({validFrom: 1800000000, validTo: 1800000600, maxUses: 1});

describe("Local Tuya remote authorization candidate", () => {
    it("encodes an enabled 21-byte DP48 with explicit big-endian fields and numeric key", () => {
        expect(encodeRemoteLockAuthorization(credential(), policy()).toString("hex")).toBe("0000076b49d2006b49d45800013132333435363738");
    });
    it("encodes the observed IFR7001 commissioning variant without changing the documented profile", () => {
        const value = encodeRemoteLockAuthorization(credential(), policy(), "ifr7001_observed");
        expect(value.toString("hex")).toBe("0100076b49d2006b49d45800013132333435363738");
        const documented = encodeRemoteLockAuthorization(credential(), policy());
        expect(documented[0]).toBe(0);
        expect(value.subarray(1)).toEqual(documented.subarray(1));
    });
    it("rejects an unknown wire profile rather than guessing the meaning of its flag", () => {
        // @ts-expect-error validate a malformed profile supplied by a JavaScript caller.
        expect(() => encodeRemoteLockAuthorization(credential(), policy(), "unknown")).toThrow("Invalid remote authorization wire profile");
    });
    it("creates an eight-digit local credential without requiring a cloud key", () => {
        const auth = generateRemoteLockAuthorization(7);
        expect(auth.keyId).toBe(7);
        expect(auth.key.toString("ascii")).toMatch(/^\d{8}$/);
        expect(auth.key.length).toBe(8);
    });
    it("uses a finite four-year policy with five minutes of initial clock allowance", () => {
        expect(authorizationPolicy(1800000000500)).toEqual({validFrom: 1799999700, validTo: 1926144000, maxUses: 65535});
    });
    it("returns a detached encoded value", () => {
        const auth = credential();
        const encoded = encodeRemoteLockAuthorization(auth, policy());
        auth.key.fill(0);
        expect(encoded.subarray(13).toString("ascii")).toBe("12345678");
    });
    it.each([-1, 65536, 1.5, Number.NaN])("rejects invalid key identifier %s", (keyId) => {
        expect(() => generateRemoteLockAuthorization(keyId)).toThrow("Invalid remote authorization identifier");
        expect(() => encodeRemoteLockAuthorization({...credential(), keyId}, policy())).toThrow("Invalid remote authorization credential");
    });
    it.each([Buffer.alloc(8), Buffer.from("1234567"), Buffer.from("123456789"), Buffer.from("ABCDEFGH")])(
        "rejects malformed key material without disclosing its value",
        (key) => {
            expect(() => encodeRemoteLockAuthorization({...credential(), key}, policy())).toThrow("Invalid remote authorization credential");
        },
    );
    it.each([
        {validFrom: -1},
        {validFrom: 1.5},
        {validFrom: 0x80000000},
        {validTo: 0x80000000},
        {validTo: 1800000000},
        {validTo: 1799999999},
        {maxUses: 0},
        {maxUses: 65536},
        {maxUses: 1.5},
    ])("rejects invalid policy %j", (patch) => {
        expect(() => encodeRemoteLockAuthorization(credential(), {...policy(), ...patch})).toThrow("Invalid remote authorization policy");
    });
    it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0, (0x7fffffff - 299) * 1000])("rejects unsafe authorization clock %s", (now) => {
        expect(() => authorizationPolicy(now)).toThrow("Invalid remote authorization clock");
    });
});
