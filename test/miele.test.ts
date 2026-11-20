import {describe, expect, it} from "vitest";
import {aggregateZones, buildSequentialZoneLayout, decodeZones, definitions} from "../src/devices/miele";

const zoneLayouts = buildSequentialZoneLayout(4);

function payloadForPowers(powers: number[]): Buffer {
    const payload = Buffer.alloc(62);

    powers.forEach((power, zone) => {
        payload[zoneLayouts[zone].recordOffset] = power === 0 ? 0 : power * 2 - 1;
    });

    return payload;
}

function aggregateForPowers(powers: number[]) {
    return aggregateZones(decodeZones(payloadForPowers(powers), zoneLayouts));
}

describe("Miele KM6839", () => {
    it.each([
        [[0, 0, 0, 0], {hob_power: 0, extractor_demand: 0}],
        [[9, 0, 0, 0], {hob_power: 25, extractor_demand: 63}],
        [[9, 9, 0, 0], {hob_power: 50, extractor_demand: 75}],
        [[9, 9, 9, 9], {hob_power: 100, extractor_demand: 100}],
    ])("aggregates power levels %s", (powers, expected) => {
        expect(aggregateForPowers(powers)).toStrictEqual({
            zone_count: 4,
            active_zones: powers.filter((power) => power > 0).length,
            ...expected,
        });
    });

    it("matches the private Miele profile endpoints", () => {
        expect(definitions[0].fingerprint).toStrictEqual([
            {
                manufacturerID: 4393,
                endpoints: [
                    {ID: 210, profileID: 0xc51e, deviceID: 0x0052},
                    {ID: 212, profileID: 0xc51e, deviceID: 0x0052},
                    {ID: 213, profileID: 0xc51e, deviceID: 0x0052},
                    {ID: 214, profileID: 0xc51e, deviceID: 0x0052},
                    {ID: 216, profileID: 0xc51e, deviceID: 0x0052},
                ],
            },
        ]);
    });

    it("exposes aggregate and per-zone properties", () => {
        const properties = definitions[0].exposes.map((expose) => expose.property);

        expect(properties).toContain("zone_count");
        expect(properties).toContain("active_zones");
        expect(properties).toContain("hob_power");
        expect(properties).toContain("extractor_demand");

        for (const zone of [0, 1, 2, 3]) {
            expect(properties).toContain(`zone_${zone}_state`);
            expect(properties).toContain(`zone_${zone}_power`);
            expect(properties).toContain(`zone_${zone}_mode`);
        }
    });
});
