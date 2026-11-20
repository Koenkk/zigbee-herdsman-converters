import {describe, expect, it} from "vitest";
import {compressTuyaFastLz, decodeTuyaTimings, encodeTuyaTimings} from "../src/lib/zosung";

// Decoder output alternates sign (mark positive, space negative).
const signed = (timings: number[]) => timings.map((t, i) => (i % 2 === 0 ? t : -t));
const roundTrip = (timings: number[]) => decodeTuyaTimings(Array.from(Buffer.from(encodeTuyaTimings(timings), "base64")));
const literalOnlyBase64Length = (timings: number[]) => Math.ceil((timings.length * 2 + Math.ceil((timings.length * 2) / 32)) / 3) * 4;

// Daikin 280-bit (ARC433) frame set: 5 lead bits, then three frames of 8, 8 and 19 bytes.
function daikinTimings(): number[] {
    const bits = (bytes: number[]) => bytes.flatMap((b) => Array.from({length: 8}, (_, k) => [430, (b >> k) & 1 ? 1340 : 430]).flat());
    const frames = [
        [0x11, 0xda, 0x27, 0x00, 0xc5, 0x00, 0x00, 0xd7],
        [0x11, 0xda, 0x27, 0x00, 0x42, 0x00, 0x30, 0x7c],
        [0x11, 0xda, 0x27, 0x00, 0x00, 0x39, 0x34, 0x00, 0xa0, 0x00, 0x00, 0x06, 0x60, 0x00, 0x00, 0xc1, 0x00, 0x00, 0x46],
    ];
    const timings = [...Array(5).fill([430, 430]).flat(), 430, 25500];
    frames.forEach((frame, i) => {
        timings.push(3470, 1770, ...bits(frame), 430);
        if (i < frames.length - 1) timings.push(35000);
    });
    return timings;
}

function pseudoRandom(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state;
    };
}

describe("lib/zosung IR timings encoding", () => {
    it("round-trips and compresses a real AC frame set", () => {
        const timings = daikinTimings();
        const encoded = encodeTuyaTimings(timings);
        expect(roundTrip(timings)).toStrictEqual(signed(timings));
        // Literal-only encoding needed ~1600 base64 chars (34 zosung chunks) for this code.
        expect(encoded.length).toBeLessThan(literalOnlyBase64Length(timings) / 5);
    });

    it("round-trips long runs that need extended match lengths", () => {
        const timings = Array(2000).fill(560);
        expect(roundTrip(timings)).toStrictEqual(signed(timings));
    });

    it("never emits an extended length byte of 0xff", () => {
        const data = new Uint8Array(4000).fill(7);
        const out = compressTuyaFastLz(data);
        let pos = 0;
        while (pos < out.length) {
            const header = out[pos++];
            if (header >> 5 === 0) {
                pos += (header & 0x1f) + 1;
                continue;
            }
            if (header >> 5 === 7) expect(out[pos++]).not.toBe(0xff);
            pos++;
        }
    });

    it("round-trips incompressible data and data longer than the match window", () => {
        const next = pseudoRandom(42);
        for (const length of [1, 2, 17, 600, 6000]) {
            const timings = Array.from({length}, () => 1 + (next() % 0xffff));
            expect(roundTrip(timings)).toStrictEqual(signed(timings));
        }
    });

    it("round-trips repeating patterns at distances beyond the 8 KiB window", () => {
        const next = pseudoRandom(7);
        const block = Array.from({length: 2500}, () => 1 + (next() % 3000));
        const timings = [...block, ...Array.from({length: 2500}, () => 1 + (next() % 3000)), ...block];
        expect(roundTrip(timings)).toStrictEqual(signed(timings));
    });

    it("rejects timings that do not fit in 16 bits", () => {
        expect(() => encodeTuyaTimings([500, 70000])).toThrow("Invalid timing at index 1");
    });
});
