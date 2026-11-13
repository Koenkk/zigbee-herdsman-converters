import {afterEach, describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import {fp400} from "../src/lib/lumi";
import type {Definition, Fz, KeyValue, KeyValueAny, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

const hex = (value: string) => Buffer.from(value.replace(/\s/g, ""), "hex");

// Frames captured from real FP400s. Position frames: Koenkk/zigbee2mqtt#33146 (2026-09-24, app version 60, Ember
// coordinator, cut at 80 bytes) and the app version 51 record from bobtekkk/aqara-fp400-zone-card. Attribute-sync frames:
// passive capture of an Aqara M3 hub session in bobtekkk/aqara-fp400-zone-card, test/fixtures/fp400-attribute-sync.json.
const POSITIONS_CUT_AT_80_BYTES = hex(
    "1c5f11758b00004c0300" +
        "0900200029220029150129000029000021a00f300030fe2000" +
        "0900200129cfff290402290000290b0021d007300030fe2000" +
        "0900200229beff29010029000029000021d00730",
);
const RECORD_APP_51 = "0900200029e9ff290e012908052902002100003000307f2000";
// App version 63 (date code 20261026) on a Z-Stack coordinator, which reassembles fragmented frames: three whole targets.
const POSITIONS_APP_63_THREE = hex(
    "1c5f11568b00004c0300" +
        "0900200029fdfe29e50029010029000021a00f300030fe2000" +
        "0900200129e6ff29880029630029200021d007300030fe2000" +
        "0900200529c3ff293c01291c00290f0021d007300030fe2000",
);

describe("FP400 codec", () => {
    describe("position events", () => {
        const decode = (frame: Buffer) => {
            const event = fp400.parseEvent(frame);
            expect(event?.event).toBe(0);
            return fp400.decodeLocation(event.payload);
        };

        it("decodes a complete one-target frame", () => {
            const frame = hex(`1c5f11758b00004c0100 ${RECORD_APP_51}`);
            expect(decode(frame)).toStrictEqual({reported: 1, targets: [{id: 0, x: -23, y: 270, zone: 0}], complete: true});
        });

        it("decodes a complete two-target frame", () => {
            const frame = Buffer.from(POSITIONS_CUT_AT_80_BYTES.subarray(0, 60));
            frame.writeUInt16LE(2, 8);
            expect(decode(frame)).toStrictEqual({
                reported: 2,
                targets: [
                    {id: 0, x: 34, y: 277, zone: 0},
                    {id: 1, x: -49, y: 516, zone: 0},
                ],
                complete: true,
            });
        });

        it("keeps every position of a three-target frame an Ember coordinator cut at 80 bytes", () => {
            expect(POSITIONS_CUT_AT_80_BYTES.length).toBe(80);
            expect(decode(POSITIONS_CUT_AT_80_BYTES)).toStrictEqual({
                reported: 3,
                targets: [
                    {id: 0, x: 34, y: 277, zone: 0},
                    {id: 1, x: -49, y: 516, zone: 0},
                    // Cut inside field 6: id and position arrived, the zone did not.
                    {id: 2, x: -66, y: 1},
                ],
                complete: false,
            });
        });

        it("decodes a whole three-target frame from firmware 63", () => {
            expect(POSITIONS_APP_63_THREE.length).toBe(85);
            expect(decode(POSITIONS_APP_63_THREE)).toStrictEqual({
                reported: 3,
                targets: [
                    {id: 0, x: -259, y: 229, zone: 0},
                    {id: 1, x: -26, y: 136, zone: 0},
                    {id: 5, x: -61, y: 316, zone: 0},
                ],
                complete: true,
            });
        });

        it("decodes the native zone each target is in", () => {
            // Firmware 63 with zones 1 Table, 2 Stove and 3 Sink, each frame captured with a person in that zone.
            for (const [zone, frame] of [
                [1, "1c5f11178b00004c010009002000295000293d00291a0029190021a00f300030fe2001"],
                [2, "1c5f11348b00004c010009002001293800296401290f00293b0021a00f300030fe2002"],
                [3, "1c5f11018b00004c010009002000290c00299401295a00293e0021a00f300030fe2003"],
            ] as const) {
                expect(decode(hex(frame)).targets[0].zone).toBe(zone);
            }
        });

        it("decodes the speed from firmware 60 on, as firmware 51 uses that field for the grid cell", () => {
            const payload = fp400.parseEvent(POSITIONS_APP_63_THREE).payload;
            expect(fp400.decodeLocation(payload, 63).targets.map((t) => t.speed)).toStrictEqual([1, 99, 28]);
            expect(fp400.decodeLocation(payload, 60).targets[1].speed).toBe(99);
            expect(fp400.decodeLocation(payload, 51).targets[1]).not.toHaveProperty("speed");
            expect(fp400.decodeLocation(payload).targets[1]).not.toHaveProperty("speed");
            // A record cut after its position still has the speed field when it arrived.
            const cut = fp400.decodeLocation(fp400.parseEvent(POSITIONS_CUT_AT_80_BYTES).payload, 63);
            expect(cut.targets[2]).toStrictEqual({id: 2, x: -66, y: 1, speed: 0, leaving: false});
        });

        it("decodes whether the sensor is dropping a target from the track state, firmware 60 on", () => {
            // Captured on firmware 63 (2026-11-11): the track state is 4800, 4000 + 800 while the target is dropped.
            const dropping = "1c5f11308b00004c0100090020012966ff29680129000029000021c012300030fe2000";
            const target = (frame: string, appVersion?: number) => fp400.decodeLocation(fp400.parseEvent(hex(frame)).payload, appVersion).targets[0];
            expect(target(dropping, 63)).toStrictEqual({id: 1, x: -154, y: 360, speed: 0, zone: 0, leaving: true});
            expect(target(dropping.replace("21c012", "21f00a"), 63).leaving).toBe(true); // 2000 + 800
            expect(target(dropping.replace("21c012", "21a00f"), 63).leaving).toBe(false); // 4000
            expect(target(dropping.replace("21c012", "21d204"), 63)).not.toHaveProperty("leaving"); // 1234: unknown
            expect(target(dropping, 51)).not.toHaveProperty("leaving");
        });

        it("reports the count of a cut frame even when targets are missing entirely", () => {
            const four = Buffer.from(POSITIONS_CUT_AT_80_BYTES);
            four.writeUInt16LE(4, 8);
            expect(decode(four)).toMatchObject({reported: 4, complete: false});
            expect(decode(four).targets).toHaveLength(3);
            expect(decode(hex("1c5f11758b00004c0300"))).toStrictEqual({reported: 3, targets: [], complete: false});
            expect(decode(hex(`1c5f11758b00004c0100 ${RECORD_APP_51.slice(0, 16)}`))).toStrictEqual({
                reported: 1,
                targets: [],
                complete: false,
            });
        });

        it("decodes an empty room as zero targets", () => {
            expect(decode(hex("1c5f11758b00004c0000"))).toStrictEqual({reported: 0, targets: [], complete: true});
        });

        it("reads the header at fixed offsets, also when the sequence number is 0x4C", () => {
            expect(decode(hex(`1c5f114c8b00004c0100 ${RECORD_APP_51}`))).toStrictEqual({
                reported: 1,
                targets: [{id: 0, x: -23, y: 270, zone: 0}],
                complete: true,
            });
        });

        it.each([
            ["another element type", `1c5f11758b00004d0100 ${RECORD_APP_51}`],
            ["more targets than the sensor tracks", "1c5f11758b00004c0b00"],
            ["a position not tagged int16", `1c5f11758b00004c0100 ${RECORD_APP_51.replace("29e9ff", "28e9ff")}`],
            ["an unknown field type", `1c5f11758b00004c0100 ${RECORD_APP_51.replace("3000307f", "3800307f")}`],
            ["bytes after the last target", `1c5f11758b00004c0100 ${RECORD_APP_51} 00`],
            ["the same target twice", `1c5f11758b00004c0200 ${RECORD_APP_51} ${RECORD_APP_51}`],
        ])("rejects a frame with %s", (_, frame) => {
            expect(decode(hex(frame))).toBeUndefined();
        });
    });

    describe("raw frames", () => {
        it("splits an event frame into event id and payload", () => {
            // Spatial learning finished with result 0 (jcastro, Koenkk/zigbee2mqtt#33146).
            expect(fp400.parseEvent(hex("1c5f116f8b030000"))).toStrictEqual({event: 3, payload: hex("00")});
            expect(fp400.parseEvent(hex("0c5f116f8b030000"))).toStrictEqual({event: 3, payload: hex("00")});
        });

        it.each([
            ["another manufacturer", "1c34126f8b030000"],
            ["no manufacturer code", "185f116f8b030000"],
            ["a cluster-specific frame", "1d5f116f8b030000"],
            ["a frame sent to the sensor", "145f116f8b030000"],
            ["another command", "1c5f116f8a030000"],
            ["no event id", "1c5f116f8b03"],
        ])("ignores %s", (_, frame) => {
            expect(fp400.parseEvent(hex(frame))).toBeUndefined();
        });

        it("ignores anything but a buffer", () => {
            expect(fp400.parseFrame(undefined)).toBeUndefined();
            expect(fp400.parseFrame([0x1c, 0x5f, 0x11, 0x6f, 0x8b])).toBeUndefined();
        });
    });

    describe("attribute sync (0x8A)", () => {
        it.each([
            ["msOccupancySensing", "1c5f117b8a00001801", {occupancy: 1}],
            ["msOccupancySensing", "1c5f113d8a00001800", {occupancy: 0}],
            ["aqaraFp400Radar", "1c5f117d8a0200210100", {humanCount: 1}],
            ["aqaraFp400Radar", "1c5f113f8a0200210000", {humanCount: 0}],
            ["msIlluminanceMeasurement", "1c5f11248a0000210931", {measuredValue: 12553}],
            ["aqaraFp400Location", "1c5f11008a07003002", {activityState: 2}],
        ])("decodes the captured %s frame %s", (cluster, frame, expected) => {
            expect(fp400.decodeAttributeSync(cluster, hex(frame))).toStrictEqual(expected);
        });

        it.each([
            ["a truncated value", "aqaraFp400Radar", "1c5f117d8a02002101"],
            ["a truncated record", "aqaraFp400Radar", "1c5f117d8a0200"],
            ["no records", "aqaraFp400Radar", "1c5f117d8a"],
            ["an unknown attribute", "aqaraFp400Radar", "1c5f117d8a0300210100"],
            ["an unexpected type", "aqaraFp400Radar", "1c5f117d8a0200200100"],
            ["a cluster without known records", "aqaraFp400Config", "1c5f117d8a0200210100"],
            ["another manufacturer", "aqaraFp400Radar", "1c34127d8a0200210100"],
            ["an event instead", "aqaraFp400Radar", "1c5f117d8b0200210100"],
        ])("publishes nothing for %s", (_, cluster, frame) => {
            expect(fp400.decodeAttributeSync(cluster, hex(frame))).toBeUndefined();
        });
    });
});

type ReadMock = (cluster: string | number, attributes: (string | number)[]) => Promise<KeyValueAny>;

// Input clusters per endpoint, as attribute discovery found them on a real sensor (jcastro, Koenkk/zigbee2mqtt#33146).
const ROOM_CLUSTERS = [0x0000, 0x0003, 0x0040, 0x0080, 0x0406, 0xfc0a, 0xfc0b, 0xfc0c, 0xfcc0, 0xfcc1, 0xfcc3];
const ZONE_CLUSTERS = [0x0080, 0x0406, 0xfc0b];

let sensors = 0;

/** An FP400 with endpoints 1-10 and its own address; `reads` answers reads per endpoint. */
function sensor(reads: Record<number, ReadMock> = {}, applicationVersion?: number, zoneClusters = ZONE_CLUSTERS) {
    sensors++;
    return mockDevice({
        modelID: "lumi.models.4447_8295",
        applicationVersion,
        ieeeAddr: `0x00158d00fp400${sensors.toString().padStart(3, "0")}`,
        endpoints: Array.from({length: 10}, (_, i) => ({
            ID: i + 1,
            inputClusterIDs: i === 0 ? [...ROOM_CLUSTERS] : i === 1 ? [0x0400] : [...zoneClusters],
            read: reads[i + 1] ? vi.fn(reads[i + 1]) : undefined,
        })),
    });
}

/** Runs a message through every matching fromZigbee converter of the definition, as Zigbee2MQTT does. */
async function receive(device: Zh.Device, endpoint: number, cluster: string, type: string, data: unknown, options: KeyValue = {}) {
    const definition = await findByDevice(device);
    const publish = vi.fn();
    const msg = {device, endpoint: device.getEndpoint(endpoint), data, type, cluster, meta: {}} as unknown as Fz.Message<string>;
    const meta = {device, state: {}, deviceExposesChanged: vi.fn()};
    const state: KeyValueAny = {};
    for (const converter of definition.fromZigbee) {
        if (converter.cluster !== cluster || ![converter.type].flat().includes(type)) continue;
        Object.assign(state, await converter.convert(definition, msg, publish, options, meta));
    }
    return {state, publish};
}

/** Properties the definition exposes for `device`; for the documentation's dummy device when `device` is undefined. */
async function exposedProperties(device: Zh.Device | undefined, options: KeyValue = {}) {
    const definition = await findByDevice(device ?? sensor());
    const target = device ?? {isDummyDevice: true as const};
    const exposes = typeof definition.exposes === "function" ? definition.exposes(target, options) : definition.exposes;
    return exposes.map((expose) => expose.property);
}

describe("FP400 definition", () => {
    it("gives every settable property its own converter, as Zigbee2MQTT calls a converter once per message", async () => {
        // A shared converter would apply only the first of its keys in a message.
        const definition = await findByDevice(sensor());
        const exposes = typeof definition.exposes === "function" ? definition.exposes({isDummyDevice: true}, {}) : definition.exposes;
        const settable = exposes.filter((e) => e.access !== undefined && e.access & 2).map((e) => e.property);
        expect(settable.length).toBeGreaterThan(10);
        const owner = new Map<unknown, string>();
        for (const property of settable) {
            const converter = definition.toZigbee.find((c) => c.key.includes(property));
            expect(converter, property).toBeDefined();
            expect(owner.get(converter), `${property} shares a converter with ${owner.get(converter)}`).toBeUndefined();
            owner.set(converter, property);
        }
    });

    describe("room", () => {
        it("exposes the sensor's tilt and limits", async () => {
            expect(await exposedProperties(sensor())).toEqual(
                expect.arrayContaining(["installation_status", "installation_angle", "maximum_detection_targets", "absence_timeout_bounds"]),
            );
        });

        it("decodes the installation diagnostics", async () => {
            const data = {installationStatus: 3, installationAngle: 12};
            expect((await receive(sensor(), 1, "aqaraFp400Config", "readResponse", data)).state).toStrictEqual({
                installation_status: "side_facing_forward",
                installation_angle: 12,
            });
            expect((await receive(sensor(), 1, "aqaraFp400Location", "readResponse", {maxDetectionTargets: 10})).state).toStrictEqual({
                maximum_detection_targets: 10,
            });
            // Firmware 63 also has 0xFC0C on the zone endpoints.
            expect((await receive(sensor(), 3, "aqaraFp400Location", "readResponse", {maxDetectionTargets: 4})).state).toStrictEqual({});
        });

        it("reports activity 0 as none: it comes with an empty room", async () => {
            const device = sensor();
            expect((await receive(device, 1, "aqaraFp400Location", "attributeReport", {activityState: 0})).state).toStrictEqual({
                activity_state: "none",
            });
            // The same as an attribute-sync frame, captured with the room empty (2026-11-11).
            expect((await receive(device, 1, "aqaraFp400Location", "raw", hex("1c5f11108a07003000"))).state).toMatchObject({
                activity_state: "none",
            });
        });

        it("decodes the absence-timeout bounds of the room only", async () => {
            const bounds = [10, 300, 10].map((elmVal) => ({elmType: Zcl.DataType.UINT16, elmVal}));
            expect((await receive(sensor(), 1, "msOccupancySensing", "readResponse", {4: bounds})).state).toMatchObject({
                absence_timeout_bounds: {minimum: 10, maximum: 300, default: 10},
            });
            expect((await receive(sensor(), 3, "msOccupancySensing", "readResponse", {4: bounds})).state).not.toHaveProperty(
                "absence_timeout_bounds",
            );
        });

        it("takes no room values from the zone endpoints, which report their zones' presence and count", async () => {
            // A sensor with zones (set up in the Aqara app, for example) reports them on endpoints 3-10.
            const device = sensor();
            for (const endpoint of [3, 10]) {
                const occupancy = await receive(device, endpoint, "msOccupancySensing", "attributeReport", {occupancy: 1});
                expect(occupancy.state).not.toHaveProperty("occupancy");
                const count = await receive(device, endpoint, "aqaraFp400Radar", "attributeReport", {humanCount: 2});
                expect(count.state).not.toHaveProperty("human_count");
            }
        });
    });

    describe("attribute sync (0x8A)", () => {
        it.each([
            [1, "msOccupancySensing", "1c5f117b8a00001801", {occupancy: 1}],
            [1, "aqaraFp400Radar", "1c5f117d8a0200210100", {humanCount: 1}],
            [2, "msIlluminanceMeasurement", "1c5f11248a0000210931", {measuredValue: 12553}],
            [1, "aqaraFp400Location", "1c5f11008a07003002", {activityState: 2}],
        ])("publishes endpoint %i %s like an attribute report", async (endpoint, cluster, frame, report) => {
            const device = sensor();
            const synced = (await receive(device, endpoint, cluster, "raw", hex(frame))).state;
            const reported = (await receive(device, endpoint, cluster, "attributeReport", report)).state;
            expect(Object.keys(synced).length).toBeGreaterThan(0);
            expect(synced).toStrictEqual(reported);
        });

        it("keeps the room count when a zone endpoint syncs its own count", async () => {
            expect((await receive(sensor(), 3, "aqaraFp400Radar", "raw", hex("1c5f113f8a0200210000"))).state).not.toHaveProperty("human_count");
        });

        it("publishes nothing from a truncated frame", async () => {
            expect((await receive(sensor(), 1, "aqaraFp400Radar", "raw", hex("1c5f117d8a02002101"))).state).toStrictEqual({});
        });
    });

    describe("settings", () => {
        /** An FP400 as Zigbee2MQTT sets it up: its own clusters added, so converters find endpoint 1 by cluster. */
        function withClusters(reads: Record<number, ReadMock> = {}) {
            const device = sensor(reads);
            for (const [name, cluster] of Object.entries(fp400.clusters)) device.addCustomCluster(name, cluster);
            return device;
        }
        async function set(device: Zh.Device, key: string, value: unknown) {
            const definition = await findByDevice(device);
            const converter = definition.toZigbee.find((c) => c.key.includes(key));
            // @ts-expect-error mock meta
            return await converter.convertSet(device.getEndpoint(1), key, value, {
                device,
                message: {[key]: value},
                options: {},
                state: {},
                mapped: definition,
            });
        }
        const SETTINGS = [
            "presence_sensitivity",
            "absence_timeout",
            "installation_mode",
            "side_installation",
            "installation_height",
            "human_count_enabled",
            "ai_high_precision",
            "ai_adaptive_sensitivity",
            "ai_entry_exit_recognition",
            "ai_interference_recognition",
            "coordinate_reverse",
            "detection_direction",
            "proximity_distance",
        ];

        it("exposes room presence, the light, people count, activity and every setting", async () => {
            expect(await exposedProperties(sensor())).toEqual(
                expect.arrayContaining([
                    "occupancy_1",
                    "illuminance_2",
                    "human_count",
                    "activity_state",
                    "installation_height_min",
                    "installation_height_max",
                    ...SETTINGS,
                ]),
            );
        });

        it("is versioned, so sensors paired under an older definition are configured again, and takes OTA updates", async () => {
            const definition = await findByDevice(sensor());
            expect(definition.version).toBe("0.0.1");
            expect(definition.ota).toBeTruthy();
        });

        it("writes the sensor's own clusters with its manufacturer code, and the standard ones without", async () => {
            const device = withClusters({1: async () => ({})});
            const writes = vi.mocked(device.getEndpoint(1).write);
            expect(await set(device, "installation_mode", "ceiling")).toMatchObject({state: {installation_mode: "ceiling"}});
            await set(device, "ai_high_precision", "ON");
            await set(device, "installation_height", 2100);
            await set(device, "presence_sensitivity", "high");
            await set(device, "absence_timeout", 0);
            expect(writes.mock.calls.map(([cluster, payload, options]) => [cluster, payload, options?.manufacturerCode])).toStrictEqual([
                ["aqaraFp400Config", {installationMode: 2}, 0x115f],
                ["aqaraFp400Config", {aiHighPrecision: 1}, 0x115f],
                ["aqaraFp400Config", {installationHeight: 2100}, 0x115f],
                ["aqaraFp400Sensitivity", {presenceSensitivity: 2}, undefined],
                ["msOccupancySensing", {3: {value: 0, type: Zcl.DataType.UINT16}}, undefined],
            ]);
            await expect(set(device, "proximity_distance", "very_near")).rejects.toThrow();
            expect(writes).toHaveBeenCalledTimes(5);
        });

        it.each([
            ["aqaraFp400Radar", {humanCount: 2}, {human_count: 2}],
            ["aqaraFp400Location", {activityState: 1}, {activity_state: "active"}],
            ["aqaraFp400Sensitivity", {presenceSensitivity: 1}, {presence_sensitivity: "medium"}],
            ["msOccupancySensing", {3: 45}, {absence_timeout: 45}],
            ["aqaraFp400Config", {sideInstallation: 2, coordinateReverse: 2}, {side_installation: "left_corner", coordinate_reverse: "auto"}],
        ])("reads %s from endpoint 1 only: the zone endpoints repeat it with the zones' own values", async (cluster, data, expected) => {
            expect((await receive(sensor(), 1, cluster, "readResponse", data)).state).toMatchObject(expected);
            expect((await receive(sensor(), 4, cluster, "readResponse", data)).state).toStrictEqual({});
        });

        it("polls people count and activity every minute, and the light only while it has no reporting entry", async () => {
            vi.useFakeTimers();
            try {
                const answer = vi.fn(async () => ({}));
                const device = sensor({1: answer, 2: answer});
                const definition = await findByDevice(device);
                const polled = () => answer.mock.calls.map(([cluster, attributes]) => `${cluster}:${attributes}`);
                await definition.onEvent({type: "start", data: {device, state: {}, options: {}, deviceExposesChanged: vi.fn()}});
                await vi.advanceTimersByTimeAsync(60000);
                expect(polled()).toEqual(
                    expect.arrayContaining([
                        "aqaraFp400Radar:humanCount",
                        "aqaraFp400Location:activityState",
                        "msIlluminanceMeasurement:measuredValue",
                    ]),
                );
                answer.mockClear();
                device.meta.fp400ReportedEndpoints = [3, 2];
                await vi.advanceTimersByTimeAsync(60000);
                expect(polled()).toEqual(expect.arrayContaining(["aqaraFp400Radar:humanCount"]));
                expect(polled()).not.toContain("msIlluminanceMeasurement:measuredValue");
                await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe("tracking", () => {
        const TRACKING = ["target_count", "targets", "targets_xy", "tracking_status"];
        const track = (device: Zh.Device, frame: Buffer, options: KeyValue = {tracking: true}, endpoint = 1) =>
            receive(device, endpoint, "aqaraFp400Location", "raw", frame, options);
        const oneTarget = (x: number) => {
            const frame = hex(`1c5f11758b00004c0100 ${RECORD_APP_51}`);
            frame.writeInt16LE(x, 15);
            return frame;
        };

        afterEach(() => {
            vi.useRealTimers();
        });

        it("exposes positions only while the tracking option is on", async () => {
            expect(await exposedProperties(sensor())).not.toEqual(expect.arrayContaining(["target_count"]));
            expect(await exposedProperties(sensor(), {tracking: true})).toEqual(expect.arrayContaining(TRACKING));
            expect(await exposedProperties(undefined)).toEqual(expect.arrayContaining(TRACKING));
        });

        it("ignores position reports while the option is off", async () => {
            expect((await track(sensor(), POSITIONS_CUT_AT_80_BYTES, {})).state).toStrictEqual({});
        });

        it("publishes every position that arrived and marks a cut report as partial", async () => {
            expect((await track(sensor(), POSITIONS_CUT_AT_80_BYTES)).state).toStrictEqual({
                target_count: 3,
                targets: [
                    {id: 0, x: 34, y: 277, zone: 0},
                    {id: 1, x: -49, y: 516, zone: 0},
                    {id: 2, x: -66, y: 1},
                ],
                targets_xy: "0:34:277;1:-49:516;2:-66:1",
                tracking_status: "partial",
            });
        });

        it("publishes the zone and, on firmware 60 and later, the speed of each target", async () => {
            const device = sensor({}, 63);
            expect((await track(device, POSITIONS_APP_63_THREE)).state.targets).toStrictEqual([
                {id: 0, x: -259, y: 229, speed: 1, zone: 0, leaving: false},
                {id: 1, x: -26, y: 136, speed: 99, zone: 0, leaving: false},
                {id: 5, x: -61, y: 316, speed: 28, zone: 0, leaving: false},
            ]);
            expect((await track(sensor({}, 51), POSITIONS_APP_63_THREE)).state.targets[1]).toStrictEqual({id: 1, x: -26, y: 136, zone: 0});
        });

        it("publishes an empty room", async () => {
            expect((await track(sensor(), hex("1c5f11758b00004c0000"))).state).toStrictEqual({
                target_count: 0,
                targets: [],
                targets_xy: "none",
                tracking_status: "valid",
            });
        });

        it("never reads a malformed report or another endpoint as an empty room", async () => {
            expect((await track(sensor(), hex("1c5f11758b00004c0b00"))).state).toStrictEqual({});
            expect((await track(sensor(), POSITIONS_CUT_AT_80_BYTES, {tracking: true}, 3)).state).toStrictEqual({});
            expect((await track(sensor(), hex("1c5f11758b030000"))).state).toStrictEqual({});
        });

        it("publishes at most once per interval, a new target count at once, and the last withheld positions at the end", async () => {
            vi.useFakeTimers();
            const device = sensor();
            expect((await track(device, oneTarget(10))).state).toMatchObject({targets_xy: "0:10:270"});
            vi.advanceTimersByTime(100);
            const withheld = await track(device, oneTarget(20));
            expect(withheld.state).toStrictEqual({});
            vi.advanceTimersByTime(100);
            const latest = await track(device, oneTarget(30));
            expect(latest.state).toStrictEqual({});
            vi.advanceTimersByTime(799);
            expect(latest.publish).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);
            expect(withheld.publish).not.toHaveBeenCalled();
            expect(latest.publish).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({targets_xy: "0:30:270"}));
            vi.advanceTimersByTime(100);
            expect((await track(device, POSITIONS_CUT_AT_80_BYTES)).state).toMatchObject({target_count: 3});
            vi.advanceTimersByTime(100);
            expect((await track(device, hex("1c5f11758b00004c0000"))).state).toMatchObject({target_count: 0});
        });

        it("honours the interval option, 0 publishing every report", async () => {
            const device = sensor();
            expect((await track(device, oneTarget(10), {tracking: true, tracking_interval: 0})).state).toMatchObject({targets_xy: "0:10:270"});
            expect((await track(device, oneTarget(20), {tracking: true, tracking_interval: 0})).state).toMatchObject({targets_xy: "0:20:270"});
        });

        it("asks for the fast stream when the option is turned on, and renews it while it stays on", async () => {
            vi.useFakeTimers();
            const device = sensor();
            const definition = await findByDevice(device);
            const deviceExposesChanged = vi.fn();
            const subscriptions = () =>
                vi.mocked(device.getEndpoint(1).command).mock.calls.filter(([, command]) => command === "subscribeLocationData");
            const base = {device, state: {}, deviceExposesChanged};
            await definition.onEvent({type: "start", data: {...base, options: {}}});
            await vi.advanceTimersByTimeAsync(60000);
            await vi.waitFor(() => expect(subscriptions()).toHaveLength(0));
            await definition.onEvent({type: "deviceOptionsChanged", data: {...base, options: {tracking: true}, from: {}, to: {tracking: true}}});
            expect(deviceExposesChanged).toHaveBeenCalled();
            expect(subscriptions()).toStrictEqual([["aqaraFp400Location", "subscribeLocationData", {timeout: 180}, {manufacturerCode: 0x115f}]]);
            // Renewed every minute for as long as the option stays on (the option flag once overwrote the poll's timer,
            // which stopped the renewals after the first one on a real sensor).
            for (const renewals of [2, 3, 4]) {
                await vi.advanceTimersByTimeAsync(60000);
                await vi.waitFor(() => expect(subscriptions()).toHaveLength(renewals));
            }
            await definition.onEvent({type: "deviceOptionsChanged", data: {...base, options: {}, from: {tracking: true}, to: {}}});
            await vi.advanceTimersByTimeAsync(120000);
            await vi.waitFor(() => expect(subscriptions()).toHaveLength(4));
            await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        });
    });

    describe("configure", () => {
        const coordinator = () => mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);
        const configure = async (device: Zh.Device) => {
            const definition: Definition = await findByDevice(device);
            await definition.configure(device, coordinator(), definition);
        };

        it("sends the pairing initialisation with the manufacturer code", async () => {
            const device = sensor();
            await configure(device);
            expect(device.getEndpoint(1).write).toHaveBeenCalledWith(
                0xfcc0,
                {160: {value: 1, type: Zcl.DataType.UINT8}},
                {manufacturerCode: 0x115f, disableDefaultResponse: false},
            );
        });

        it("still configures when the pairing initialisation fails", async () => {
            const device = sensor();
            vi.mocked(device.getEndpoint(1).write).mockRejectedValue(new Error("Timeout"));
            await expect(configure(device)).resolves.toBeUndefined();
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([2]);
        });

        it("has the light report by itself", async () => {
            const device = sensor();
            await configure(device);
            expect(device.getEndpoint(2).bind).toHaveBeenCalledWith("msIlluminanceMeasurement", expect.anything());
            expect(device.getEndpoint(2).configureReporting).toHaveBeenCalledWith("msIlluminanceMeasurement", [
                {attribute: "measuredValue", minimumReportInterval: 10, maximumReportInterval: 3600, reportableChange: 5},
            ]);
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([2]);
        });

        it("reads the room's attributes on endpoint 1 only, though firmware 63 repeats their clusters on the zone endpoints", async () => {
            // Firmware 63 also has 0xFC0C on endpoints 3-10; a new sensor's configure timed out reading it on 8 and 9.
            const device = sensor({}, 63, [...ZONE_CLUSTERS, 0xfc0c]);
            await configure(device);
            const room =
                /^(aqaraFp400Location:(activityState|maxDetectionTargets)|aqaraFp400Radar:humanCount|aqaraFp400Sensitivity:presenceSensitivity|msOccupancySensing:3)$/;
            const reads = (id: number) =>
                vi
                    .mocked(device.getEndpoint(id).read)
                    .mock.calls.map(([cluster, attributes]) => `${cluster}:${attributes}`)
                    .filter((read) => room.test(read));
            expect(reads(1).sort()).toStrictEqual([
                "aqaraFp400Location:activityState",
                "aqaraFp400Location:maxDetectionTargets",
                "aqaraFp400Radar:humanCount",
                "aqaraFp400Sensitivity:presenceSensitivity",
                "msOccupancySensing:3",
            ]);
            for (const id of [3, 4, 5, 6, 7, 8, 9, 10]) expect(reads(id), `endpoint ${id}`).toStrictEqual([]);
        });

        it("tells herdsman not to answer the sensor's frames with default responses", async () => {
            const device = sensor();
            const definition = await findByDevice(device);
            expect(device.skipDefaultResponse).toBe(false);
            await definition.onEvent({type: "start", data: {device, state: {}, deviceExposesChanged: vi.fn(), options: {}}});
            expect(device.skipDefaultResponse).toBe(true);
            await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        });

        it("polls what does not fit the reporting table", async () => {
            const device = sensor();
            vi.mocked(device.getEndpoint(2).configureReporting).mockRejectedValue(new Error("Status 'INSUFFICIENT_SPACE'"));
            await expect(configure(device)).resolves.toBeUndefined();
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([]);
        });
    });
});
