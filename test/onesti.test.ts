import {describe, expect, it, vi} from "vitest";
import {fzLocal, definitions as onestiDefinitions} from "../src/devices/onesti";
import {findByDevice} from "../src/index";
import type {Definition, DefinitionWithExtend, Expose, KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

// The Onesti locks report two manufacturer specific attributes on closuresDoorLock:
//   0x0100 (256) bitmap32: source, action and user slot of the last operation
//   0x0101 (257) octet string: the digits of the PIN that was used
// Neither is part of the cluster definition, so zigbee-herdsman leaves them keyed
// by attribute ID, while the capability attributes below are keyed by name.
// Raw values used here come from a NimlyPRO captured through ZHA and from the
// reports in zigpy/zha-device-handlers#4881.

const converter = fzLocal.nimly_pro_lock_actions;

function convert(data: KeyValueAny, state: KeyValueAny = {}) {
    return converter.convert({} as Definition, {data, type: "attributeReport", cluster: "closuresDoorLock"} as never, vi.fn(), {}, {state} as never);
}

function definitionFor(model: string): DefinitionWithExtend {
    const definition = onestiDefinitions.find((item) => item.model === model);
    expect(definition).toBeDefined();
    return definition as DefinitionWithExtend;
}

function exposeValues(definition: DefinitionWithExtend, property: string): string[] | undefined {
    const exposes = definition.exposes as Expose[];
    const expose = exposes.find((item) => item.property === property);
    return (expose as Expose & {values?: string[]})?.values;
}

describe("Onesti Products AS locks", () => {
    describe("PIN code format", () => {
        it("decodes a PIN sent as packed BCD", () => {
            // Capture: PIN "5478" arrives as two bytes, two digits per byte.
            expect(convert({257: Buffer.from([0x54, 0x78])})).toStrictEqual({last_used_pin_code: "5478"});
        });

        it("decodes a PIN sent as ASCII digits", () => {
            // Older Connect Modules send one byte per digit; regression guard for #11332.
            expect(convert({257: Buffer.from("141141", "ascii")})).toStrictEqual({last_used_pin_code: "141141"});
        });

        it("reads two BCD bytes as four digits, not as two ASCII digits", () => {
            // 0x39 0x39 is a valid ASCII "99" and a valid BCD "3939". Two bytes cannot
            // hold a PIN of the minimum length the lock requires, so it is BCD.
            expect(convert({257: Buffer.from([0x39, 0x39])})).toStrictEqual({last_used_pin_code: "3939"});
        });

        it("uses the minimum PIN length the lock reported to tell the formats apart", () => {
            // A lock requiring eight digits cannot mean ASCII "12345678" with four bytes.
            expect(convert({257: Buffer.from("12345678", "ascii")}, {min_pin_length: 8})).toStrictEqual({last_used_pin_code: "12345678"});
            expect(convert({257: Buffer.from([0x12, 0x34, 0x56, 0x78])}, {min_pin_length: 8})).toStrictEqual({last_used_pin_code: "12345678"});
        });

        it("ignores trailing NUL padding, which trim() does not remove", () => {
            expect(convert({257: Buffer.from([0x54, 0x78, 0x00, 0x00])})).toStrictEqual({last_used_pin_code: "5478"});
            expect(convert({257: Buffer.from([0x31, 0x32, 0x33, 0x34, 0x00])})).toStrictEqual({last_used_pin_code: "1234"});
        });

        it("accepts an array of bytes as well as a buffer", () => {
            expect(convert({257: [0x54, 0x78]})).toStrictEqual({last_used_pin_code: "5478"});
        });

        it("falls back to hex when the bytes are neither ASCII digits nor BCD", () => {
            // Reported in #13080 as "*\^R4" through toString("ascii").
            expect(convert({257: Buffer.from([0x2a, 0x12, 0x34])})).toStrictEqual({last_used_pin_code: "2a1234"});
        });
    });

    describe("last action source and user", () => {
        it("decodes a keypad unlock with a user slot", () => {
            // Capture: slot 3 unlocked with a code.
            expect(convert({256: 0x02020003})).toStrictEqual({last_unlock_source: "keypad", last_unlock_user: "3"});
        });

        it("decodes an auto relock", () => {
            // The name "self" is kept here on purpose; renaming it to "auto" changes an
            // enum value users have in automations and belongs in its own change.
            expect(convert({256: 0x0a010000})).toStrictEqual({last_lock_source: "self", last_lock_user: "0"});
        });

        it("decodes source 0x05 as unattributed instead of unknown", () => {
            // NimlyCodePRO (fw 4.8.02) and NimlyPRO24 use 0x05 for Zigbee commands, auto
            // relock and the interior keypad alike, always with user 0.
            expect(convert({256: 0x05010000})).toStrictEqual({last_lock_source: "unattributed", last_lock_user: "0"});
            expect(convert({256: 0x05020000})).toStrictEqual({last_unlock_source: "unattributed", last_unlock_user: "0"});
        });

        it("reports an unmapped source as unknown", () => {
            expect(convert({256: 0x07020000})).toStrictEqual({last_unlock_source: "unknown", last_unlock_user: "0"});
        });

        it("reads the user slot as 16 bits", () => {
            // The lock supports slots 0-999. No slot above 255 has been captured, so this
            // pins the existing behaviour rather than a verified frame.
            expect(convert({256: 0x0202012c})).toStrictEqual({last_unlock_source: "keypad", last_unlock_user: "300"});
        });
    });

    describe("lock capabilities", () => {
        it("publishes the capability attributes zigbee-herdsman keys by name", () => {
            // numOfPinUsersSupported (0x0012), maxPinLen (0x0017) and minPinLen (0x0018)
            // are standard attributes, so they never arrive under their numeric IDs.
            expect(convert({numOfPinUsersSupported: 50, maxPinLen: 8, minPinLen: 4})).toStrictEqual({
                num_pin_users: 50,
                max_pin_length: 8,
                min_pin_length: 4,
            });
        });

        it("keeps min and max PIN length apart", () => {
            expect(convert({minPinLen: 4})).toStrictEqual({min_pin_length: 4});
            expect(convert({maxPinLen: 8})).toStrictEqual({max_pin_length: 8});
        });

        it("publishes the auto relock time", () => {
            expect(convert({autoRelockTime: 7})).toStrictEqual({auto_relock_time: 7});
        });

        it("publishes nothing when the message holds nothing it handles", () => {
            // Battery voltage comes from genPowerCfg through fz.battery, not from here.
            expect(convert({})).toBeUndefined();
            expect(convert({lockState: 1})).toBeUndefined();
        });
    });

    describe("definitions", () => {
        it.each(["easyCodeTouch_v1", "Nimly"])("%s exposes unattributed as a source value", (model) => {
            const definition = definitionFor(model);
            expect(exposeValues(definition, "last_lock_source")).toContain("unattributed");
            expect(exposeValues(definition, "last_unlock_source")).toContain("unattributed");
        });

        it.each(["easyCodeTouch_v1", "Nimly"])("%s exposes the number of PIN users", (model) => {
            const exposes = definitionFor(model).exposes as Expose[];
            expect(exposes.map((expose) => expose.property)).toContain("num_pin_users");
            expect(exposes.map((expose) => expose.property)).not.toContain("max_pin_users");
        });

        it("reads the capabilities of a Nimly lock on configure", async () => {
            const device = mockDevice(
                {
                    modelID: "NimlyPRO",
                    manufacturerName: "Onesti Products AS",
                    endpoints: [{ID: 11, inputClusters: ["genBasic", "genPowerCfg", "closuresDoorLock"]}],
                },
                "EndDevice",
            );
            const coordinatorEndpoint = mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).endpoints[0];
            const definition = await findByDevice(device);

            await definition.configure?.(device, coordinatorEndpoint, definition);

            expect(vi.mocked(device.getEndpoint(11).read).mock.calls).toContainEqual([
                "closuresDoorLock",
                ["numOfPinUsersSupported", "minPinLen", "maxPinLen"],
            ]);
        });
    });
});
