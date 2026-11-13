import {afterEach, describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import {fp400} from "../src/lib/lumi";
import type {Definition, Fz, KeyValue, KeyValueAny, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

const hex = (value: string) => Buffer.from(value.replace(/\s/g, ""), "hex");

// Attribute-sync frames captured from real FP400s: passive capture of an Aqara M3 hub session in
// bobtekkk/aqara-fp400-zone-card, test/fixtures/fp400-attribute-sync.json.

// Position frames: Koenkk/zigbee2mqtt#33146 (firmware 60, Ember coordinator, cut at 80 bytes) and firmware 63 on Z-Stack.
const POSITIONS_CUT_AT_80_BYTES = hex(
    "1c5f11758b00004c0300" +
        "0900200029220029150129000029000021a00f300030fe2000" +
        "0900200129cfff290402290000290b0021d007300030fe2000" +
        "0900200229beff29010029000029000021d00730",
);
const POSITIONS_APP_63_THREE = hex(
    "1c5f11568b00004c0300" +
        "0900200029fdfe29e50029010029000021a00f300030fe2000" +
        "0900200129e6ff29880029630029200021d007300030fe2000" +
        "0900200529c3ff293c01291c00290f0021d007300030fe2000",
);

describe("FP400 codec", () => {
    describe("position events", () => {
        it("decodes a whole three-target frame", () => {
            expect(fp400.decodeTargets(POSITIONS_APP_63_THREE)).toStrictEqual([
                {id: 0, x: -259, y: 229, zone: 0},
                {id: 1, x: -26, y: 136, zone: 0},
                {id: 5, x: -61, y: 316, zone: 0},
            ]);
        });

        it("keeps every position of a frame an Ember coordinator cut at 80 bytes", () => {
            expect(fp400.decodeTargets(POSITIONS_CUT_AT_80_BYTES)).toStrictEqual([
                {id: 0, x: 34, y: 277, zone: 0},
                {id: 1, x: -49, y: 516, zone: 0},
                {id: 2, x: -66, y: 1, zone: undefined},
            ]);
        });

        it("decodes the native zone", () => {
            expect(fp400.decodeTargets(hex("1c5f11348b00004c010009002001293800296401290f00293b0021a00f300030fe2002"))).toStrictEqual([
                {id: 1, x: 56, y: 356, zone: 2},
            ]);
        });

        it("decodes an empty room", () => {
            expect(fp400.decodeTargets(hex("1c5f11758b00004c0000"))).toStrictEqual([]);
        });

        it.each([
            ["another event", "1c5f116f8b030000"],
            ["another element type", "1c5f11758b00004d0000"],
            ["an unknown field type", "1c5f11758b00004c0100090038"],
        ])("ignores %s", (_, frame) => {
            expect(fp400.decodeTargets(hex(frame))).toBeUndefined();
        });
    });

    describe("raw frames", () => {
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

    describe("region masks", () => {
        const empty = () => Buffer.alloc(40);
        const rectangle = (rowStart: number, rowEnd: number, columnStart: number, columnEnd: number) => ({rowStart, rowEnd, columnStart, columnEnd});
        // As MQTT sends it.
        const mqtt = (rowStart: number, rowEnd: number, columnStart: number, columnEnd: number) => ({
            row_start: rowStart,
            row_end: rowEnd,
            column_start: columnStart,
            column_end: columnEnd,
        });

        it("reads an empty octet string as a mask with no cell set", () => {
            expect(fp400.mask(Buffer.alloc(0))).toStrictEqual(empty());
            expect(fp400.mask(Buffer.alloc(40, 0xff))).toStrictEqual(Buffer.alloc(40, 0xff));
        });

        it("rejects masks that are not 40 bytes", () => {
            expect(() => fp400.mask(Buffer.alloc(39))).toThrow("39 bytes");
            expect(() => fp400.mask(Buffer.alloc(41))).toThrow("41 bytes");
            expect(() => fp400.mask("00")).toThrow("not an octet string");
        });

        it("numbers cells row by row, most significant bit first", () => {
            expect(fp400.editMask(empty(), rectangle(0, 0, 0, 0), true)[0]).toBe(0x80);
            expect(fp400.editMask(empty(), rectangle(0, 0, 15, 15), true)[1]).toBe(0x01);
            expect(fp400.editMask(empty(), rectangle(1, 1, 0, 0), true)[2]).toBe(0x80);
            expect(fp400.editMask(empty(), rectangle(19, 19, 15, 15), true)[39]).toBe(0x01);
        });

        it("sets and clears a rectangle, keeping the other cells", () => {
            const mask = fp400.editMask(empty(), rectangle(0, 19, 0, 15), true);
            expect(mask).toStrictEqual(Buffer.alloc(40, 0xff));
            const cleared = fp400.editMask(mask, rectangle(2, 3, 4, 11), false);
            expect(cleared.toString("hex")).toBe(`${"ffff".repeat(2)}${"f00f".repeat(2)}${"ffff".repeat(16)}`);
            expect(mask).toStrictEqual(Buffer.alloc(40, 0xff));
        });

        it("checks rectangle bounds", () => {
            expect(fp400.validateRectangle(mqtt(0, 19, 0, 15), "edit")).toStrictEqual(rectangle(0, 19, 0, 15));
            for (const bad of [
                mqtt(-1, 0, 0, 0),
                mqtt(0, 20, 0, 0),
                mqtt(0, 0, 0, 16),
                mqtt(3, 2, 0, 0),
                mqtt(0, 0, 1.5, 2),
                rectangle(0, 0, 0, 0),
            ]) {
                expect(() => fp400.validateRectangle(bad, "edit")).toThrow("rows 0-19 and columns 0-15");
            }
            expect(() => fp400.validateRectangle(undefined, "edit")).toThrow("rows 0-19");
        });

        it("accepts 80 hexadecimal characters", () => {
            expect(fp400.maskFromHex("ff".repeat(40), "mask")).toStrictEqual(Buffer.alloc(40, 0xff));
            for (const bad of ["ff".repeat(39), "zz".repeat(40), "", 7]) {
                expect(() => fp400.maskFromHex(bad, "mask")).toThrow("80 hexadecimal characters");
            }
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
        // A shared converter would apply only the first of its keys in a message: on a real sensor,
        // {"edge_mask_hex": ..., "entry_exit_mask_hex": ...} wrote only the first mask.
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
        it("exposes the sensor's tilt, limits and learning result", async () => {
            expect(await exposedProperties(sensor())).toEqual(
                expect.arrayContaining([
                    "installation_status",
                    "installation_angle",
                    "learning_reporting_timeout",
                    "learning_state",
                    "learning_result_code",
                    "absence_timeout_bounds",
                ]),
            );
        });

        it("decodes the installation diagnostics", async () => {
            const data = {installationStatus: 3, installationAngle: 12, learningReportingTimeout: 30};
            expect((await receive(sensor(), 1, "aqaraFp400Config", "readResponse", data)).state).toStrictEqual({
                installation_status: "side_facing_forward",
                installation_angle: 12,
                learning_reporting_timeout: 30,
            });
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

        it("records the spatial-learning result from event 3", async () => {
            const device = sensor();
            expect((await receive(device, 1, "aqaraFp400Config", "raw", hex("1c5f116f8b030000"))).state).toStrictEqual({
                learning_state: "result_received",
                learning_result_code: 0,
            });
            expect((await receive(device, 3, "aqaraFp400Config", "raw", hex("1c5f116f8b030000"))).state).toStrictEqual({});
            expect((await receive(device, 1, "aqaraFp400Config", "raw", hex("1c5f116f8b02000000"))).state).toStrictEqual({});
        });

        it("marks spatial learning as accepted once the sensor took the command", async () => {
            const device = sensor();
            const definition = await findByDevice(device);
            const converter = definition.toZigbee.find((c) => c.key.includes("spatial_learning"));
            // @ts-expect-error mock
            const result = await converter.convertSet(device.getEndpoint(1), "spatial_learning", "start", {device});
            expect(result).toStrictEqual({state: {learning_state: "accepted", learning_result_code: null}});
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
                    "targets",
                    "spatial_learning",
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

        it("starts spatial learning and drops the result of an earlier run", async () => {
            const device = sensor();
            expect(await set(device, "spatial_learning", "start")).toStrictEqual({state: {learning_state: "accepted", learning_result_code: null}});
            expect(vi.mocked(device.getEndpoint(1).command).mock.calls).toStrictEqual([
                ["aqaraFp400Config", "startLearning", {}, {manufacturerCode: 0x115f}],
            ]);
            await expect(set(device, "spatial_learning", "stop")).rejects.toThrow("Send start");
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

        it("reads the monitored area as a depth in 0.5 m steps, and takes only such depths", async () => {
            const rows = (n: number) => Buffer.alloc(40, 0xff).fill(0, 0, n * 2);
            const depth = async (mask: Buffer) =>
                (await receive(sensor(), 1, "aqaraFp400Config", "readResponse", {monitoringRegion: mask})).state.detection_depth;
            expect(await depth(Buffer.alloc(0))).toBe(10);
            expect(await depth(rows(20))).toBe(10);
            expect(await depth(rows(7))).toBe(3.5);
            expect(await depth(rows(1))).toBe(0.5);
            const device = sensor();
            for (const bad of [0, 0.25, 10.5]) await expect(set(device, "detection_depth", bad)).rejects.toThrow("from 0.5 to 10 m");
            expect(device.getEndpoint(1).write).not.toHaveBeenCalled();
        });
    });

    describe("tracking", () => {
        const EMPTY_ROOM = hex("1c5f11758b00004c0000");
        const track = async (device: Zh.Device, frame: Buffer, options: KeyValue = {tracking: true}, endpoint = 1) =>
            (await receive(device, endpoint, "aqaraFp400Location", "raw", frame, options)).state;

        afterEach(() => {
            vi.useRealTimers();
        });

        it("publishes the positions of the tracked targets from the room, while the tracking option is on", async () => {
            expect((await track(sensor(), POSITIONS_APP_63_THREE)).targets).toHaveLength(3);
            expect(await track(sensor(), POSITIONS_APP_63_THREE, {})).toStrictEqual({});
            expect(await track(sensor(), POSITIONS_APP_63_THREE, {tracking: true}, 3)).toStrictEqual({});
        });

        it("publishes once a second at most, and a new number of targets at once", async () => {
            vi.useFakeTimers();
            const device = sensor();
            expect(await track(device, POSITIONS_APP_63_THREE)).toHaveProperty("targets");
            vi.advanceTimersByTime(500);
            expect(await track(device, POSITIONS_APP_63_THREE)).toStrictEqual({});
            expect(await track(device, EMPTY_ROOM)).toStrictEqual({targets: []});
            vi.advanceTimersByTime(999);
            expect(await track(device, EMPTY_ROOM)).toStrictEqual({});
            vi.advanceTimersByTime(1);
            expect(await track(device, EMPTY_ROOM)).toStrictEqual({targets: []});
        });

        it("subscribes to the positions every minute while the tracking option is on", async () => {
            vi.useFakeTimers();
            const device = sensor();
            const definition = await findByDevice(device);
            const subscriptions = () =>
                vi.mocked(device.getEndpoint(1).command).mock.calls.filter(([, command]) => command === "subscribeLocationData");
            const base = {device, state: {}, deviceExposesChanged: vi.fn()};
            await definition.onEvent({type: "start", data: {...base, options: {}}});
            await vi.advanceTimersByTimeAsync(60000);
            expect(subscriptions()).toHaveLength(0);
            await definition.onEvent({type: "deviceOptionsChanged", data: {...base, options: {tracking: true}, from: {}, to: {tracking: true}}});
            for (const count of [1, 2, 3]) {
                await vi.advanceTimersByTimeAsync(60000);
                expect(subscriptions()).toHaveLength(count);
            }
            expect(subscriptions()[0]).toStrictEqual(["aqaraFp400Location", "subscribeLocationData", {timeout: 180}, {manufacturerCode: 0x115f}]);
            await definition.onEvent({type: "deviceOptionsChanged", data: {...base, options: {}, from: {tracking: true}, to: {}}});
            await vi.advanceTimersByTimeAsync(120000);
            expect(subscriptions()).toHaveLength(3);
            await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        });
    });

    describe("areas", () => {
        /** A sensor that keeps the masks written to it and reads them back, each step taking a moment. */
        function storingSensor() {
            const stored: KeyValueAny = {entryExitRegion: Buffer.alloc(40), interferenceRegion: Buffer.alloc(40), monitoringRegion: Buffer.alloc(0)};
            const pause = () => new Promise((resolve) => setTimeout(resolve, 1));
            const device = sensor({
                1: async (cluster, attributes) => {
                    await pause();
                    return Object.fromEntries(attributes.filter((a) => typeof a === "string" && a in stored).map((a) => [a, stored[a]]));
                },
            });
            vi.mocked(device.getEndpoint(1).write).mockImplementation(async (cluster, payload) => {
                await pause();
                Object.assign(stored, payload);
            });
            return {device, stored};
        }
        async function set(device: Zh.Device, key: string, value: unknown) {
            const definition = await findByDevice(device);
            const converter = definition.toZigbee.find((c) => c.key.includes(key));
            // @ts-expect-error mock meta
            return await converter.convertSet(device.getEndpoint(1), key, value, {device, message: {[key]: value}, options: {}, state: {}});
        }
        const rect = (operation: string, rowStart: number, rowEnd: number, columnStart: number, columnEnd: number) => ({
            operation,
            row_start: rowStart,
            row_end: rowEnd,
            column_start: columnStart,
            column_end: columnEnd,
        });

        it("exposes an editor and the raw cells of each area", async () => {
            expect(await exposedProperties(sensor())).toEqual(
                expect.arrayContaining([
                    "entry_exit_region_edit",
                    "interference_region_edit",
                    "monitoring_region_edit",
                    "entry_exit_mask_hex",
                    "interference_mask_hex",
                    "edge_mask_hex",
                    "detection_depth",
                ]),
            );
        });

        it("publishes the cells it reads, an empty mask as no cell", async () => {
            const mask = Buffer.alloc(40);
            mask[0] = 0x80;
            const data = {entryExitRegion: mask, interferenceRegion: Buffer.alloc(0), monitoringRegion: Buffer.alloc(40, 0xff).fill(0, 0, 8)};
            expect((await receive(sensor(), 1, "aqaraFp400Config", "readResponse", data)).state).toMatchObject({
                entry_exit_mask_hex: `80${"00".repeat(39)}`,
                interference_mask_hex: "00".repeat(40),
                edge_mask_hex: `${"00".repeat(8)}${"ff".repeat(32)}`,
                detection_depth: 2,
            });
        });

        it("keeps the last cells when the sensor sends something that is not a mask", async () => {
            const {state} = await receive(sensor(), 1, "aqaraFp400Config", "readResponse", {monitoringRegion: Buffer.alloc(39)});
            expect(state).not.toHaveProperty("edge_mask_hex");
            expect(state.detection_depth).toBeNull();
        });

        it("adds and removes rectangles, keeping the other cells", async () => {
            const {device, stored} = storingSensor();
            expect(await set(device, "interference_region_edit", rect("add", 0, 1, 0, 15))).toStrictEqual({
                state: {interference_mask_hex: `${"ff".repeat(4)}${"00".repeat(36)}`},
            });
            await set(device, "interference_region_edit", rect("remove", 1, 1, 8, 15));
            expect(stored.interferenceRegion.toString("hex")).toBe(`ffffff00${"00".repeat(36)}`);
            expect(device.getEndpoint(1).write).toHaveBeenCalledWith(
                "aqaraFp400Config",
                {interferenceRegion: expect.any(Buffer)},
                {manufacturerCode: 0x115f},
            );
        });

        it("clears the bits of cells added to the monitored area, which stores the excluded cells", async () => {
            const {device, stored} = storingSensor();
            stored.monitoringRegion = Buffer.alloc(40, 0xff);
            const result = await set(device, "monitoring_region_edit", rect("add", 0, 3, 0, 15));
            expect(stored.monitoringRegion.toString("hex")).toBe(`${"00".repeat(8)}${"ff".repeat(32)}`);
            expect(result).toStrictEqual({state: {edge_mask_hex: stored.monitoringRegion.toString("hex"), detection_depth: 2}});
        });

        it("writes raw cells and reads them on request", async () => {
            const {device, stored} = storingSensor();
            const cells = `0f${"00".repeat(39)}`;
            expect(await set(device, "entry_exit_mask_hex", cells)).toStrictEqual({state: {entry_exit_mask_hex: cells}});
            expect(stored.entryExitRegion.toString("hex")).toBe(cells);
            const definition = await findByDevice(device);
            const converter = definition.toZigbee.find((c) => c.key.includes("edge_mask_hex"));
            // @ts-expect-error mock meta
            await converter.convertGet(device.getEndpoint(1), "edge_mask_hex", {device});
            expect(device.getEndpoint(1).read).toHaveBeenLastCalledWith("aqaraFp400Config", ["monitoringRegion"], {manufacturerCode: 0x115f});
        });

        it("rejects bad input without writing", async () => {
            const {device} = storingSensor();
            await expect(set(device, "entry_exit_region_edit", rect("toggle", 0, 0, 0, 0))).rejects.toThrow("operation add or remove");
            await expect(set(device, "entry_exit_region_edit", rect("add", 0, 20, 0, 0))).rejects.toThrow("rows 0-19");
            await expect(set(device, "entry_exit_mask_hex", "ff")).rejects.toThrow("80 hexadecimal characters");
            expect(device.getEndpoint(1).write).not.toHaveBeenCalled();
        });

        it("fails when the sensor reads back other cells", async () => {
            const {device} = storingSensor();
            vi.mocked(device.getEndpoint(1).write).mockResolvedValue(undefined);
            await expect(set(device, "entry_exit_mask_hex", "ff".repeat(40))).rejects.toThrow("did not confirm");
        });

        it("applies edits sent at the same time one after the other, so none is lost", async () => {
            const {device, stored} = storingSensor();
            await Promise.all([
                set(device, "interference_region_edit", rect("add", 0, 0, 0, 7)),
                set(device, "interference_region_edit", rect("add", 0, 0, 8, 15)),
                set(device, "interference_region_edit", rect("add", 19, 19, 0, 15)),
            ]);
            expect(stored.interferenceRegion.toString("hex")).toBe(`ffff${"00".repeat(36)}ffff`);
        });

        it("keeps the depth and the monitored area consistent", async () => {
            const {device, stored} = storingSensor();
            expect(await set(device, "detection_depth", 3)).toStrictEqual({
                state: {detection_depth: 3, edge_mask_hex: `${"00".repeat(12)}${"ff".repeat(28)}`},
            });
            await set(device, "monitoring_region_edit", rect("remove", 0, 0, 0, 0));
            expect((await set(device, "monitoring_region_edit", rect("add", 0, 0, 0, 0))).state.detection_depth).toBe(3);
            await set(device, "monitoring_region_edit", rect("remove", 0, 0, 0, 0));
            await expect(set(device, "detection_depth", 5)).rejects.toThrow("drawn cell by cell");
            expect(stored.monitoringRegion[0]).toBe(0x80);
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
                /^(aqaraFp400Location:activityState|aqaraFp400Radar:humanCount|aqaraFp400Sensitivity:presenceSensitivity|msOccupancySensing:3)$/;
            const reads = (id: number) =>
                vi
                    .mocked(device.getEndpoint(id).read)
                    .mock.calls.map(([cluster, attributes]) => `${cluster}:${attributes}`)
                    .filter((read) => room.test(read));
            expect(reads(1).sort()).toStrictEqual([
                "aqaraFp400Location:activityState",
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
