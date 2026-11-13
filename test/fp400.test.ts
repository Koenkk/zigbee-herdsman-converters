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

/** Answers endpoint 1's read of the endpoints that carry zones with `zones()`, and any other read with nothing. */
const listing =
    (zones: () => number[]): ReadMock =>
    async (cluster, attributes) =>
        await Promise.resolve(attributes.includes("childEndpointList") ? {childEndpointList: zones()} : {});

/**
 * Binds endpoint 1's room presence to a coordinator, as pairing leaves a real sensor; herdsman resolves `binds` from its
 * database, which the mock does not have.
 */
function bindToCoordinator(device: Zh.Device) {
    const coordinator = mockDevice({modelID: "coordinator", ieeeAddr: "0x00124b00c00d1a70", endpoints: [{ID: 1}]}, "Coordinator");
    const coordinatorEndpoint = coordinator.getEndpoint(1);
    vi.spyOn(device.getEndpoint(1), "binds", "get").mockReturnValue([
        {cluster: Zcl.Utils.getCluster("msOccupancySensing"), target: coordinatorEndpoint},
    ]);
    return coordinatorEndpoint;
}

/** The maximum report intervals configured for occupancy on endpoint `id`, in order; 0xFFFF frees the entry. */
const occupancyReporting = (device: Zh.Device, id: number) =>
    vi
        .mocked(device.getEndpoint(id).configureReporting)
        .mock.calls.filter(([cluster]) => cluster === "msOccupancySensing")
        .map(([, items]) => items[0].maximumReportInterval);

describe("FP400 definition", () => {
    it("gives every settable property its own converter, as Zigbee2MQTT calls a converter once per message", async () => {
        // A shared converter would apply only the first of its keys in a message.
        const definition = await findByDevice(sensor());
        const exposes = typeof definition.exposes === "function" ? definition.exposes({isDummyDevice: true}, {}) : definition.exposes;
        // Zigbee2MQTT looks converters up by name; the zone endpoints repeat the room's names.
        const settable = [...new Set(exposes.filter((e) => e.access !== undefined && e.access & 2).map((e) => e.name))];
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
                expect.arrayContaining(["installation_status", "installation_angle", "absence_timeout_bounds"]),
            );
        });

        it("decodes the installation diagnostics", async () => {
            const data = {installationStatus: 3, installationAngle: 12};
            expect((await receive(sensor(), 1, "aqaraFp400Config", "readResponse", data)).state).toStrictEqual({
                installation_status: "side_facing_forward",
                installation_angle: 12,
            });
        });

        it("decodes the second processor's version from cluster 0x0040, frame for frame", async () => {
            // Reported right after pairing, firmware 63 (2026-11-11): an array holding one struct of two char strings.
            const frame = hex("18140a0000484c01000200420b6d63752d76657273696f6e42023632");
            const parsed = Zcl.Frame.fromBuffer(0x0040, Zcl.Header.fromBuffer(frame), frame, fp400.clusters);
            expect(parsed.cluster.name).toBe("aqaraFp400Versions");
            const [{attrId, attrData}] = parsed.payload as {attrId: number; attrData: unknown}[];
            expect(attrId).toBe(0);
            const device = sensor();
            expect((await receive(device, 1, "aqaraFp400Versions", "attributeReport", {versions: attrData})).state).toStrictEqual({
                mcu_version: "62",
            });
            expect((await receive(device, 3, "aqaraFp400Versions", "attributeReport", {versions: attrData})).state).toStrictEqual({});
            const other = [
                [
                    {elmType: 66, elmVal: "other"},
                    {elmType: 66, elmVal: "1"},
                ],
            ];
            expect((await receive(device, 1, "aqaraFp400Versions", "readResponse", {versions: other})).state).toStrictEqual({});
            expect((await receive(device, 1, "aqaraFp400Versions", "readResponse", {versions: "62"})).state).toStrictEqual({});
            const definition = await findByDevice(device);
            // @ts-expect-error mock meta
            await definition.toZigbee.find((c) => c.key.includes("mcu_version")).convertGet(device.getEndpoint(1), "mcu_version", {device});
            expect(device.getEndpoint(1).read).toHaveBeenCalledWith("aqaraFp400Versions", ["versions"]);
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
                    "targets",
                    "installation_height_min",
                    "installation_height_max",
                    "entry_exit_mask_hex",
                    "interference_mask_hex",
                    "edge_mask_hex",
                    "spatial_learning",
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
        ])("reads %s for the room from endpoint 1 only: the zone endpoints repeat it with the zones' own values", async (cluster, data, expected) => {
            expect((await receive(sensor(), 1, cluster, "readResponse", data)).state).toMatchObject(expected);
            const zone = (await receive(sensor(), 4, cluster, "readResponse", data)).state;
            for (const key of Object.keys(expected)) expect(zone).not.toHaveProperty(key);
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

    describe("experimental", () => {
        async function set(device: Zh.Device, key: string, value: unknown) {
            const definition = await findByDevice(device);
            const converter = definition.toZigbee.find((c) => c.key.includes(key));
            // @ts-expect-error mock meta
            return await converter.convertSet(device.getEndpoint(1), key, value, {device, message: {[key]: value}, options: {}, state: {}});
        }
        const sent = (device: Zh.Device) => vi.mocked(device.getEndpoint(1).command).mock.calls;

        it.each([
            ["1c5f11078b000000", "enter"],
            ["1c5f11078b000001", "leave"],
            ["1c5f11078b000006", "approach"],
            ["1c5f11078b00003007", "away"],
            ["1c5f11078b00002004", "right_in"],
        ])("publishes movement event %s as %s", async (frame, action) => {
            expect((await receive(sensor(), 1, "aqaraFp400Radar", "raw", hex(frame))).state).toStrictEqual({action});
        });

        it.each([
            ["an unknown value", 1, "1c5f11078b000009"],
            ["another event", 1, "1c5f11078b030000"],
            ["no value", 1, "1c5f11078b0000"],
            ["the light endpoint", 2, "1c5f11078b000006"],
        ])("publishes no movement for %s", async (_, endpoint, frame) => {
            expect((await receive(sensor(), endpoint, "aqaraFp400Radar", "raw", hex(frame))).state).toStrictEqual({});
        });

        it.each([
            // Captured from zone endpoints on firmware 63 (2026-11-11), with zone 1 on endpoint 3 and zone 2 on endpoint 4.
            [3, "1c5f114c8b000001", "leave_3"],
            [4, "1c5f11498b000006", "approach_4"],
            [4, "1c5f11078b00002004", "right_in_4"],
        ])("publishes a zone's movement from endpoint %s, frame %s, as %s", async (endpoint, frame, action) => {
            expect((await receive(sensor(), endpoint, "aqaraFp400Radar", "raw", hex(frame))).state).toStrictEqual({action});
        });

        it("lists the movements of the room and of each zone endpoint as actions", async () => {
            const definition = await findByDevice(sensor());
            const exposes = typeof definition.exposes === "function" ? definition.exposes(sensor(), {}) : definition.exposes;
            const actions = (exposes.find((expose) => expose.property === "action") as {values: string[]}).values;
            expect(actions).toHaveLength(8 + 8 * 8);
            expect(actions.slice(0, 8)).toStrictEqual(["enter", "leave", "left_in", "right_out", "right_in", "left_out", "approach", "away"]);
            expect(actions).toEqual(expect.arrayContaining(["enter_3", "away_10"]));
            expect(await exposedProperties(sensor())).toEqual(expect.arrayContaining(["remove_target"]));
        });

        it("asks the sensor to forget a target and reports a refusal", async () => {
            const device = sensor();
            await set(device, "remove_target", 3);
            expect(sent(device)).toStrictEqual([["aqaraFp400Location", "removeDetectionTarget", {targetId: 3}, {manufacturerCode: 0x115f}]]);
            vi.mocked(device.getEndpoint(1).command).mockResolvedValueOnce({cmdId: 1, statusCode: 0x81});
            await expect(set(device, "remove_target", 4)).rejects.toThrow("did not accept");
            for (const bad of [-1, 256, 1.5, "x"]) await expect(set(device, "remove_target", bad)).rejects.toThrow();
            expect(sent(device)).toHaveLength(2);
        });

        it("sends the recognition commands", async () => {
            const device = sensor();
            await set(device, "auto_interference_recognition", "start");
            await set(device, "auto_edge_recognition", 120);
            await set(device, "ai_entry_exit_recognition_subscribe", "start");
            expect(sent(device)).toStrictEqual([
                ["aqaraFp400Config", "subscribeAutoInterference", {}, {manufacturerCode: 0x115f}],
                ["aqaraFp400Config", "subscribeAutoEdge", {timeout: 120}, {manufacturerCode: 0x115f}],
                ["aqaraFp400Config", "subscribeAiEntryExit", {}, {manufacturerCode: 0x115f}],
            ]);
            await expect(set(device, "auto_edge_recognition", 0)).rejects.toThrow("1 to 3600");
            await expect(set(device, "auto_interference_recognition", "stop")).rejects.toThrow("Send start");
            expect(sent(device)).toHaveLength(3);
        });

        it("encodes the recognition commands as the sensor's Matter firmware takes them", () => {
            const frame = (command: string, payload: KeyValueAny) =>
                Zcl.Frame.create(
                    Zcl.FrameType.SPECIFIC,
                    Zcl.Direction.CLIENT_TO_SERVER,
                    true,
                    0x115f,
                    1,
                    command,
                    "aqaraFp400Config",
                    payload,
                    fp400.clusters,
                )
                    .toBuffer()
                    .toString("hex");
            expect(frame("subscribeAutoInterference", {})).toBe("155f110100");
            expect(frame("subscribeAutoEdge", {timeout: 120})).toBe("155f1101017800");
            expect(frame("subscribeAiEntryExit", {})).toBe("155f110102");
        });

        it.each([
            ["tagged", `1c5f11078b02004128${"0f".repeat(40)}`],
            ["with its length", `1c5f11078b020028${"0f".repeat(40)}`],
            ["bare", `1c5f11078b0200${"0f".repeat(40)}`],
        ])("publishes the recognised entrances and exits, %s", async (_, frame) => {
            expect((await receive(sensor(), 1, "aqaraFp400Config", "raw", hex(frame))).state).toStrictEqual({
                ai_entry_exit_recognition_hex: "0f".repeat(40),
            });
        });

        it("publishes no entrances and exits from a cut map", async () => {
            expect((await receive(sensor(), 1, "aqaraFp400Config", "raw", hex(`1c5f11078b0200${"0f".repeat(39)}`))).state).toStrictEqual({});
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

        it("gives the zones the sensor has the entries room presence and the light leave", async () => {
            const device = sensor({1: listing(() => [3, 5])});
            await configure(device);
            for (const id of [3, 5]) {
                expect(device.getEndpoint(id).bind).toHaveBeenCalledWith("msOccupancySensing", expect.anything());
                expect(device.getEndpoint(id).configureReporting).toHaveBeenCalledWith("msOccupancySensing", [
                    {attribute: "occupancy", minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
                ]);
            }
            for (const id of [4, 6, 7, 8, 9, 10]) expect(device.getEndpoint(id).configureReporting, `endpoint ${id}`).not.toHaveBeenCalled();
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([2, 3, 5]);
            expect(device.meta.fp400ReportingZones).toStrictEqual([3, 5]);
        });

        it("polls the zones that do not fit the reporting table", async () => {
            const device = sensor({1: listing(() => [3, 4, 5, 6])});
            vi.mocked(device.getEndpoint(6).configureReporting).mockRejectedValue(new Error("Status 'INSUFFICIENT_SPACE'"));
            await configure(device);
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([2, 3, 4, 5]);
        });

        it("frees the entry of an endpoint that no longer carries a zone", async () => {
            const device = sensor({1: listing(() => [3])});
            device.meta.fp400ReportedEndpoints = [2, 3, 4];
            await configure(device);
            expect(occupancyReporting(device, 4)).toStrictEqual([0xffff]);
            expect(occupancyReporting(device, 3)).toStrictEqual([3600]);
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([2, 3]);
        });

        it("leaves the zones' entries alone when it cannot tell which endpoints carry zones", async () => {
            const device = sensor({
                1: async (cluster, attributes) => {
                    if (attributes.includes("childEndpointList")) throw new Error("Timeout");
                    return await Promise.resolve({});
                },
            });
            device.meta.fp400ReportedEndpoints = [2, 3];
            await configure(device);
            for (const id of [3, 4, 5, 6, 7, 8, 9, 10]) expect(occupancyReporting(device, id), `endpoint ${id}`).toStrictEqual([]);
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([3, 2]);
            expect(device.meta.fp400ReportingZones).toBeUndefined();
        });
    });

    describe("zones", () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        /** Starts the definition's polls for `device` and returns a function that stops them. */
        async function start(device: Zh.Device) {
            const definition = await findByDevice(device);
            await definition.onEvent({type: "start", data: {device, state: {}, options: {}, deviceExposesChanged: vi.fn()}});
            return async () => await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        }
        const occupancyReads = (device: Zh.Device, id: number) =>
            vi.mocked(device.getEndpoint(id).read).mock.calls.filter(([cluster]) => cluster === "msOccupancySensing").length;

        it("shares the reporting entries out again once zones are created or removed, here or in the Aqara app", async () => {
            vi.useFakeTimers();
            let zones = [3];
            const device = sensor({1: listing(() => zones)});
            const coordinatorEndpoint = bindToCoordinator(device);
            // Configured before zones were reported.
            device.meta.fp400ReportedEndpoints = [2];
            const stop = await start(device);
            await vi.advanceTimersByTimeAsync(60000);
            expect(device.getEndpoint(3).bind).toHaveBeenCalledWith("msOccupancySensing", coordinatorEndpoint);
            expect(occupancyReporting(device, 3)).toStrictEqual([3600]);
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([2, 3]);
            await vi.advanceTimersByTimeAsync(60000);
            expect(occupancyReporting(device, 3)).toStrictEqual([3600]);
            zones = [4];
            await vi.advanceTimersByTimeAsync(60000);
            expect(occupancyReporting(device, 3)).toStrictEqual([3600, 0xffff]);
            expect(occupancyReporting(device, 4)).toStrictEqual([3600]);
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([2, 4]);
            await stop();
        });

        it("polls occupancy only on the zone endpoints that do not report it", async () => {
            vi.useFakeTimers();
            const device = sensor({1: listing(() => [3])});
            bindToCoordinator(device);
            const stop = await start(device);
            await vi.advanceTimersByTimeAsync(60000);
            expect(occupancyReads(device, 3)).toBe(0);
            for (const id of [4, 5, 6, 7, 8, 9, 10]) expect(occupancyReads(device, id), `endpoint ${id}`).toBe(1);
            await stop();
        });

        const CELLS = `ff${"00".repeat(39)}`;
        // A read of the zone list from endpoint 1, made up: zone 1 with one cell, and zone 5 with none and turned off.
        const ZONE_LIST = hex(`1c5f110101 1000 00 48 4c 0200 0400200130004128${CELLS}1001 0400200530004128${"00".repeat(40)}1000`);
        /** The zone list as herdsman decodes it from the read response. */
        const zoneList = () => {
            const frame = Zcl.Frame.fromBuffer(0xfc0a, Zcl.Header.fromBuffer(ZONE_LIST), ZONE_LIST, fp400.clusters);
            const [record] = frame.payload as {attrId: number; attrData: {elmType: number; elmVal: unknown}[][]}[];
            expect(record.attrId).toBe(0x0010);
            return record.attrData;
        };
        const zoneListReads = (device: Zh.Device) =>
            vi
                .mocked(device.getEndpoint(1).read)
                .mock.calls.filter(([cluster, attributes]) => cluster === "aqaraFp400Config" && attributes.includes("zones"));

        it("publishes the zone list from endpoint 1, as native_zone takes zones", async () => {
            expect(await exposedProperties(sensor())).toEqual(expect.arrayContaining(["native_zones", "native_zone", "native_zone_remove"]));
            const zones = zoneList();
            expect((await receive(sensor(), 1, "aqaraFp400Config", "readResponse", {zones})).state.native_zones).toStrictEqual([
                {zone_id: 1, mask_hex: CELLS, enabled: true},
                {zone_id: 5, mask_hex: "00".repeat(40), enabled: false},
            ]);
            expect((await receive(sensor(), 1, "aqaraFp400Config", "readResponse", {zones: []})).state.native_zones).toStrictEqual([]);
            expect((await receive(sensor(), 4, "aqaraFp400Config", "readResponse", {zones})).state).not.toHaveProperty("native_zones");
        });

        it("publishes nothing from a cut or malformed list, which would read as zones gone", async () => {
            const [zone] = zoneList();
            for (const zones of [
                [zone.slice(0, 3)],
                [[zone[0], zone[1], {elmType: Zcl.DataType.OCTET_STR, elmVal: Buffer.alloc(39)}, zone[3]]],
                [[{elmType: Zcl.DataType.ENUM8, elmVal: 1}, ...zone.slice(1)]],
                "zones",
            ]) {
                expect((await receive(sensor(), 1, "aqaraFp400Config", "readResponse", {zones})).state).not.toHaveProperty("native_zones");
            }
        });

        it("reads the zone list on refresh and after each zone change the sensor accepts", async () => {
            const device = sensor();
            const commands = vi.mocked(device.getEndpoint(1).command).mockResolvedValue({status: 0});
            const definition = await findByDevice(device);
            const meta = {device, message: {}, options: {}, state: {}, mapped: definition};
            const converter = (key: string) => definition.toZigbee.find((c) => c.key.includes(key));
            // @ts-expect-error mock meta
            await converter("native_zones").convertGet(device.getEndpoint(1), "native_zones", meta);
            expect(zoneListReads(device)).toStrictEqual([["aqaraFp400Config", ["zones"], {manufacturerCode: 0x115f}]]);
            // @ts-expect-error mock meta
            await converter("native_zone").convertSet(device.getEndpoint(1), "native_zone", {zone_id: 2, mask_hex: CELLS}, meta);
            // @ts-expect-error mock meta
            await converter("native_zone_remove").convertSet(device.getEndpoint(1), "native_zone_remove", 2, meta);
            expect(zoneListReads(device)).toHaveLength(3);
            commands.mockResolvedValue({status: 1});
            // @ts-expect-error mock meta
            await expect(converter("native_zone_remove").convertSet(device.getEndpoint(1), "native_zone_remove", 2, meta)).rejects.toThrow();
            expect(zoneListReads(device)).toHaveLength(3);
        });

        it("still answers a zone change when the zone list cannot be read after it", async () => {
            const device = sensor({
                1: async (cluster, attributes) => {
                    if (attributes.includes("zones")) throw new Error("Timeout");
                    return await Promise.resolve({});
                },
            });
            vi.mocked(device.getEndpoint(1).command).mockResolvedValue({status: 0});
            const definition = await findByDevice(device);
            const converter = definition.toZigbee.find((c) => c.key.includes("native_zone_remove"));
            // @ts-expect-error mock meta
            await expect(
                converter.convertSet(device.getEndpoint(1), "native_zone_remove", 2, {device, message: {}, options: {}, state: {}}),
            ).resolves.toBeUndefined();
        });

        it("reads the zone list on the first poll, and again once zones were created or removed", async () => {
            vi.useFakeTimers();
            let zones = [3];
            const device = sensor({1: listing(() => zones)});
            const stop = await start(device);
            await vi.advanceTimersByTimeAsync(60000);
            expect(zoneListReads(device)).toHaveLength(1);
            await vi.advanceTimersByTimeAsync(60000);
            expect(zoneListReads(device)).toHaveLength(1);
            zones = [3, 4];
            await vi.advanceTimersByTimeAsync(60000);
            expect(zoneListReads(device)).toHaveLength(2);
            await stop();
        });

        it("does not read the zone list again every minute when it cannot be read, as on Ember coordinators", async () => {
            vi.useFakeTimers();
            let zones = [3, 4];
            const list = listing(() => zones);
            const device = sensor({
                1: async (cluster, attributes) => {
                    if (attributes.includes("zones")) throw new Error("Timeout");
                    return await list(cluster, attributes);
                },
            });
            const stop = await start(device);
            await vi.advanceTimersByTimeAsync(60000);
            expect(zoneListReads(device)).toHaveLength(1);
            await vi.advanceTimersByTimeAsync(120000);
            expect(zoneListReads(device)).toHaveLength(1);
            // The rest of the poll goes on.
            expect(occupancyReads(device, 3)).toBe(3);
            zones = [3];
            await vi.advanceTimersByTimeAsync(60000);
            expect(zoneListReads(device)).toHaveLength(2);
            await stop();
        });

        it("leaves the zones to the poll when no binding to the coordinator is known", async () => {
            vi.useFakeTimers();
            const device = sensor({1: listing(() => [3])});
            const stop = await start(device);
            await vi.advanceTimersByTimeAsync(60000);
            expect(device.getEndpoint(3).configureReporting).not.toHaveBeenCalled();
            expect(occupancyReads(device, 3)).toBe(1);
            expect(device.meta.fp400ReportingZones).toBeUndefined();
            await stop();
        });
    });
});
