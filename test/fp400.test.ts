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

    describe("zones", () => {
        const cells = `ff${"00".repeat(39)}`;
        const zone = {zoneId: 1, zoneType: 0, enabled: true, cells: hex(cells)};

        it("encodes appendZone and updateZone as the sensor expects", () => {
            // Payload confirmed on a real sensor by bobtekkk (Koenkk/zigbee2mqtt#33146): field count, then id (uint8),
            // type (enum8), cells (octet string) and enabled (boolean). The whole frame is 55 bytes.
            for (const [command, id] of [
                ["appendZone", "04"],
                ["updateZone", "06"],
            ]) {
                const frame = Zcl.Frame.create(
                    Zcl.FrameType.SPECIFIC,
                    Zcl.Direction.CLIENT_TO_SERVER,
                    true,
                    0x115f,
                    1,
                    command,
                    "aqaraFp400Config",
                    {zone: fp400.zoneStruct(zone)},
                    fp400.clusters,
                ).toBuffer();
                expect(frame.toString("hex")).toBe(`155f1101${id}0400200130004128${cells}1001`);
                expect(frame.length).toBe(55);
            }
        });

        it("encodes removeZone as the zone id alone", () => {
            const frame = Zcl.Frame.create(
                Zcl.FrameType.SPECIFIC,
                Zcl.Direction.CLIENT_TO_SERVER,
                true,
                0x115f,
                1,
                "removeZone",
                "aqaraFp400Config",
                {zoneId: 3},
                fp400.clusters,
            );
            expect(frame.toBuffer().toString("hex")).toBe("155f11010803");
        });

        it("parses the cluster-specific reply, which carries no manufacturer code", () => {
            for (const [reply, name] of [
                ["19010500", "appendZoneResponse"],
                ["19010700", "updateZoneResponse"],
                ["19010901", "removeZoneResponse"],
            ]) {
                const frame = Zcl.Frame.fromBuffer(0xfc0a, Zcl.Header.fromBuffer(hex(reply)), hex(reply), fp400.clusters);
                expect(frame.command.name).toBe(name);
                expect(frame.payload).toStrictEqual({status: hex(reply)[3]});
            }
        });

        it("decodes the zone catalogue as herdsman reads it", () => {
            const response = hex(`1c5f110101 1000 00 48 4c 0200 0400200130004128${cells}1001 0400200530334128${"00".repeat(40)}1000`);
            const frame = Zcl.Frame.fromBuffer(0xfc0a, Zcl.Header.fromBuffer(response), response, fp400.clusters);
            const [record] = frame.payload as {attrId: number; attrData: unknown}[];
            expect(record.attrId).toBe(0x0010);
            expect(fp400.decodeZones(record.attrData)).toStrictEqual([zone, {zoneId: 5, zoneType: 0x33, enabled: false, cells: Buffer.alloc(40)}]);
        });

        it("does not read a malformed catalogue as no zones", () => {
            const record = fp400.zoneStruct(zone);
            expect(fp400.decodeZones([])).toStrictEqual([]);
            expect(fp400.decodeZones(undefined)).toBeUndefined();
            expect(fp400.decodeZones([record.slice(0, 3)])).toBeUndefined();
            expect(fp400.decodeZones([[record[0], record[1], {elmType: 0x41, elmVal: Buffer.alloc(39)}, record[3]]])).toBeUndefined();
            expect(fp400.decodeZones([[{elmType: 0x20, elmVal: 1}, {elmType: 0x20, elmVal: 0}, record[2], record[3]]])).toBeUndefined();
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

/**
 * Binds endpoint 1's room presence to a coordinator, as pairing leaves a real sensor; herdsman resolves `binds` from its
 * database, which the mock does not have.
 */
function bindToCoordinator(device: Zh.Device) {
    const coordinatorEndpoint = mockDevice({modelID: "coordinator", ieeeAddr: "0x00124b00c00d1a70", endpoints: [{ID: 1}]}, "Coordinator").getEndpoint(
        1,
    );
    vi.spyOn(device.getEndpoint(1), "binds", "get").mockReturnValue([
        {cluster: Zcl.Utils.getCluster("msOccupancySensing"), target: coordinatorEndpoint},
    ]);
    return coordinatorEndpoint;
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
                expect.arrayContaining(["installation_status", "installation_angle", "maximum_zones", "absence_timeout_bounds"]),
            );
        });

        it("decodes the installation diagnostics", async () => {
            const data = {installationStatus: 3, installationAngle: 12, maxZones: 8};
            expect((await receive(sensor(), 1, "aqaraFp400Config", "readResponse", data)).state).toStrictEqual({
                installation_status: "side_facing_forward",
                installation_angle: 12,
                maximum_zones: 8,
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
            expect(definition.version).toBe("0.0.2");
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

    describe("native zones", () => {
        const ZONES = {native_zones: true};
        const ZONE_ENTITIES = ["native_zone_1_occupancy", "native_zone_8_count", "zone_1_sensitivity", "zone_8_absence_timeout", "native_zone"];

        /** A sensor whose zones live on endpoints it picks itself (zone 1 on endpoint 4 here); zone commands change them. */
        function zoneSensor(initial: Record<number, number> = {1: 4}) {
            const zones: Record<number, number> = {...initial};
            const settings: Record<number, KeyValueAny> = {};
            const device = sensor(
                Object.fromEntries(
                    Array.from({length: 10}, (_, i) => [
                        i + 1,
                        async (cluster: string | number, attributes: (string | number)[]) => {
                            await Promise.resolve();
                            if (i === 0 && attributes.includes("childEndpointList")) return {childEndpointList: Object.values(zones)};
                            if (attributes.includes("zoneId")) return {zoneId: Number(Object.entries(zones).find(([, id]) => id === i + 1)?.[0])};
                            return settings[i + 1] ?? {};
                        },
                    ]),
                ),
            );
            device.meta.fp400ZoneEndpoints = Object.fromEntries(Object.entries(zones).map(([zone, id]) => [zone, id]));
            for (let id = 3; id <= 10; id++) {
                vi.mocked(device.getEndpoint(id).write).mockImplementation(async (cluster, payload: KeyValueAny) => {
                    await Promise.resolve();
                    settings[id] = {...settings[id], ...(cluster === "msOccupancySensing" ? {3: payload[3].value} : payload)};
                });
            }
            const free = () => [3, 4, 5, 6, 7, 8, 9, 10].find((id) => !Object.values(zones).includes(id));
            vi.mocked(device.getEndpoint(1).command).mockImplementation(async (cluster, command, payload: KeyValueAny) => {
                await Promise.resolve();
                if (command === "appendZone") zones[payload.zone[0].elmVal] = free();
                if (command === "removeZone") {
                    if (zones[payload.zoneId] === undefined) return {status: 1};
                    delete zones[payload.zoneId];
                }
                return {status: 0};
            });
            return {device, zones, settings};
        }
        async function set(device: Zh.Device, key: string, value: unknown) {
            const definition = await findByDevice(device);
            const converter = definition.toZigbee.find((c) => c.key.includes(key));
            // @ts-expect-error mock meta
            return await converter.convertSet(device.getEndpoint(1), key, value, {device, message: {[key]: value}, options: ZONES, state: {}});
        }
        const commands = (device: Zh.Device) => vi.mocked(device.getEndpoint(1).command).mock.calls.map(([, command, payload]) => [command, payload]);

        afterEach(() => {
            vi.useRealTimers();
        });

        it("exposes the zones only while the native_zones option is on", async () => {
            expect(await exposedProperties(sensor())).not.toEqual(expect.arrayContaining(["native_zone"]));
            expect(await exposedProperties(sensor(), ZONES)).toEqual(expect.arrayContaining(ZONE_ENTITIES));
            expect(await exposedProperties(undefined)).toEqual(expect.arrayContaining(ZONE_ENTITIES));
        });

        it("publishes a zone's occupancy, count and settings from the endpoint that carries it", async () => {
            const {device} = zoneSensor({1: 4, 2: 3});
            expect((await receive(device, 4, "msOccupancySensing", "attributeReport", {occupancy: 1}, ZONES)).state).toStrictEqual({
                native_zone_1_occupancy: true,
            });
            expect((await receive(device, 3, "msOccupancySensing", "attributeReport", {occupancy: 0}, ZONES)).state).toStrictEqual({
                native_zone_2_occupancy: false,
            });
            expect((await receive(device, 4, "aqaraFp400Radar", "attributeReport", {humanCount: 2}, ZONES)).state).toStrictEqual({
                native_zone_1_count: 2,
            });
            expect((await receive(device, 4, "aqaraFp400Sensitivity", "readResponse", {presenceSensitivity: 2}, ZONES)).state).toStrictEqual({
                zone_1_sensitivity: "high",
            });
            expect((await receive(device, 4, "msOccupancySensing", "readResponse", {3: 120}, ZONES)).state).toStrictEqual({
                zone_1_absence_timeout: 120,
            });
        });

        it("keeps zones and room apart", async () => {
            const {device} = zoneSensor();
            expect((await receive(device, 5, "msOccupancySensing", "attributeReport", {occupancy: 1}, ZONES)).state).toStrictEqual({});
            expect((await receive(device, 4, "msOccupancySensing", "attributeReport", {occupancy: 1}, {})).state).toStrictEqual({});
            expect((await receive(device, 1, "aqaraFp400Radar", "attributeReport", {humanCount: 3}, ZONES)).state).toStrictEqual({human_count: 3});
            // A zone endpoint's count, sent as an attribute-sync frame (captured from an Aqara hub).
            expect((await receive(device, 4, "aqaraFp400Radar", "raw", hex("1c5f113f8a0200210000"), ZONES)).state).toStrictEqual({
                native_zone_1_count: 0,
            });
        });

        it("writes a zone's settings to its endpoint and checks the read-back", async () => {
            const {device, settings} = zoneSensor();
            expect(await set(device, "zone_1_absence_timeout", 120)).toStrictEqual({state: {zone_1_absence_timeout: 120}});
            expect(device.getEndpoint(4).write).toHaveBeenCalledWith("msOccupancySensing", {3: {value: 120, type: Zcl.DataType.UINT16}});
            expect(await set(device, "zone_1_sensitivity", "low")).toStrictEqual({state: {zone_1_sensitivity: "low"}});
            expect(settings[4]).toStrictEqual({3: 120, presenceSensitivity: 0});
            vi.mocked(device.getEndpoint(4).write).mockResolvedValue(undefined);
            await expect(set(device, "zone_1_absence_timeout", 30)).rejects.toThrow("did not confirm");
            await expect(set(device, "zone_2_absence_timeout", 30)).rejects.toThrow("has no zone 2");
            await expect(set(device, "zone_1_absence_timeout", 301)).rejects.toThrow("0 to 300");
        });

        it("creates a zone, finds the endpoint the sensor gave it, and holds its timeout until it has settled", async () => {
            vi.useFakeTimers({toFake: ["Date"]});
            const {device} = zoneSensor({1: 4});
            const mask_hex = `ff${"00".repeat(39)}`;
            const result = await set(device, "native_zone", {zone_id: 2, mask_hex});
            expect(commands(device)).toStrictEqual([
                ["appendZone", {zone: fp400.zoneStruct({zoneId: 2, zoneType: 0, enabled: true, cells: hex(mask_hex)})}],
            ]);
            expect(result).toStrictEqual({
                state: {
                    configured_zones: [{zone_id: 2, zone_type: 0, enabled: true, mask_hex}],
                    configured_zones_compact: "2:0:ff",
                    configured_zone_count: 2,
                    native_zone_endpoints: [3, 4],
                },
            });
            expect(device.meta.fp400ZoneEndpoints).toStrictEqual({1: 4, 2: 3});
            await expect(set(device, "zone_2_absence_timeout", 60)).rejects.toThrow("still being set up");
            vi.setSystemTime(Date.now() + 20000);
            expect(await set(device, "zone_2_absence_timeout", 60)).toStrictEqual({state: {zone_2_absence_timeout: 60}});
            expect(device.getEndpoint(3).write).toHaveBeenCalled();
        });

        it("updates a zone the sensor already has", async () => {
            const {device} = zoneSensor({1: 4});
            await set(device, "native_zone", {zone_id: 1, mask_hex: "00".repeat(40), zone_type: 51, enabled: false});
            expect(commands(device)).toStrictEqual([
                ["updateZone", {zone: fp400.zoneStruct({zoneId: 1, zoneType: 51, enabled: false, cells: Buffer.alloc(40)})}],
            ]);
        });

        it("reads the zone endpoints before changing a zone when it does not know them", async () => {
            const {device} = zoneSensor({1: 4});
            device.meta.fp400ZoneEndpoints = undefined;
            await set(device, "native_zone", {zone_id: 1, mask_hex: "00".repeat(40)});
            expect(commands(device).map(([command]) => command)).toStrictEqual(["updateZone"]);
        });

        it("finds a new zone whose endpoint appears only after a while on the next poll", async () => {
            vi.useFakeTimers();
            const {device, zones} = zoneSensor({1: 4});
            vi.mocked(device.getEndpoint(1).command).mockResolvedValueOnce({status: 0});
            const definition = await findByDevice(device);
            await definition.onEvent({type: "start", data: {device, state: {}, deviceExposesChanged: vi.fn(), options: ZONES}});
            expect((await set(device, "native_zone", {zone_id: 2, mask_hex: "00".repeat(40)})).state).toMatchObject({configured_zone_count: 1});
            zones[2] = 6;
            vi.advanceTimersByTime(60000);
            await vi.waitFor(() => expect(device.meta.fp400ZoneEndpoints).toStrictEqual({1: 4, 2: 6}));
            await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        });

        it("fails when the sensor refuses or does not answer with its own reply", async () => {
            const {device} = zoneSensor();
            vi.mocked(device.getEndpoint(1).command).mockResolvedValueOnce({status: 0x80});
            await expect(set(device, "native_zone", {zone_id: 3, mask_hex: "00".repeat(40)})).rejects.toThrow(
                "Zone 3 was not created: malformed command",
            );
            vi.mocked(device.getEndpoint(1).command).mockResolvedValueOnce({cmdId: 4, statusCode: 0});
            await expect(set(device, "native_zone", {zone_id: 3, mask_hex: "00".repeat(40)})).rejects.toThrow("did not answer");
            await expect(set(device, "native_zone_remove", 5)).rejects.toThrow("Zone 5 was not removed: invalid argument or no such zone");
            expect(device.meta.fp400ZoneEndpoints).toStrictEqual({1: 4});
        });

        it("rejects bad zones without sending anything", async () => {
            const {device} = zoneSensor();
            await expect(set(device, "native_zone", {zone_id: 9, mask_hex: "00".repeat(40)})).rejects.toThrow("zone id from 1 to 8");
            await expect(set(device, "native_zone", {zone_id: 1, mask_hex: "00"})).rejects.toThrow("80 hexadecimal characters");
            await expect(set(device, "native_zone", {zone_id: 1, mask_hex: "00".repeat(40), zone_type: 256})).rejects.toThrow("0 to 255");
            await expect(set(device, "native_zone", {zone_id: 1, mask_hex: "00".repeat(40), enabled: "yes"})).rejects.toThrow("true or false");
            await expect(set(device, "native_zones_clear", "all")).rejects.toThrow("Send clear");
            expect(device.getEndpoint(1).command).not.toHaveBeenCalled();
        });

        it("removes one zone, or every zone the sensor has", async () => {
            const {device} = zoneSensor({1: 4, 3: 5, 6: 3});
            expect((await set(device, "native_zone_remove", 3)).state).toMatchObject({configured_zone_count: 2, native_zone_endpoints: [3, 4]});
            expect(commands(device)).toStrictEqual([["removeZone", {zoneId: 3}]]);
            const cleared = (zone: number) => ({
                [`native_zone_${zone}_occupancy`]: null,
                [`native_zone_${zone}_count`]: null,
                [`zone_${zone}_sensitivity`]: null,
                [`zone_${zone}_absence_timeout`]: null,
            });
            expect((await set(device, "native_zones_clear", "clear")).state).toStrictEqual({
                configured_zones: [],
                configured_zones_compact: "none",
                configured_zone_count: 0,
                native_zone_endpoints: [],
                ...cleared(1),
                ...cleared(6),
            });
            expect(commands(device).slice(1)).toStrictEqual([
                ["removeZone", {zoneId: 1}],
                ["removeZone", {zoneId: 6}],
            ]);
        });

        describe("reporting entries after a zone is created or removed", () => {
            /** Zones on their endpoints, with the given endpoints holding reporting entries and endpoint 1 bound to the coordinator. */
            function reportedSensor(zones: Record<number, number>, reported: number[]) {
                const zoneSetup = zoneSensor(zones);
                zoneSetup.device.meta.fp400ReportedEndpoints = reported;
                return {...zoneSetup, coordinatorEndpoint: bindToCoordinator(zoneSetup.device)};
            }
            const intervals = (device: Zh.Device, id: number) =>
                vi.mocked(device.getEndpoint(id).configureReporting).mock.calls.map(([, items]) => items[0].maximumReportInterval);
            const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

            it("gives a new zone an entry, the light giving up its own first", async () => {
                // As on the Kitchen sensor (2026-11-11): presence, three zones and the light fill the five entries.
                const {device, coordinatorEndpoint} = reportedSensor({1: 3, 2: 4, 3: 5}, [3, 4, 5, 2]);
                vi.mocked(device.getEndpoint(2).configureReporting).mockImplementation(async (cluster, items) => {
                    await Promise.resolve();
                    if (items[0].maximumReportInterval !== 0xffff) throw new Error("Status 'INSUFFICIENT_SPACE'");
                });
                expect((await set(device, "native_zone", {zone_id: 4, mask_hex: "00".repeat(40)})).state).toMatchObject({configured_zone_count: 4});
                await vi.waitFor(() => expect(device.meta.fp400ReportingZones).toStrictEqual([3, 4, 5, 6]));
                expect(device.getEndpoint(6).bind).toHaveBeenCalledWith("msOccupancySensing", coordinatorEndpoint);
                expect(device.getEndpoint(6).bind).toHaveBeenCalledWith("aqaraFp400Radar", coordinatorEndpoint);
                expect(device.getEndpoint(3).bind).not.toHaveBeenCalledWith("aqaraFp400Radar", expect.anything());
                expect(intervals(device, 6)).toStrictEqual([3600]);
                expect(intervals(device, 2)).toStrictEqual([0xffff, 3600]);
                const order = (id: number) => vi.mocked(device.getEndpoint(id).configureReporting).mock.invocationCallOrder[0];
                expect(order(2)).toBeLessThan(order(6));
                for (const id of [3, 4, 5]) expect(intervals(device, id)).toStrictEqual([3600]);
                expect(device.meta.fp400ReportedEndpoints).toStrictEqual([3, 4, 5, 6]);
            });

            it("frees a removed zone's entry for the light and clears the zone's last values", async () => {
                const {device} = reportedSensor({1: 3, 2: 4, 3: 5, 4: 6}, [3, 4, 5, 6]);
                expect((await set(device, "native_zone_remove", 4)).state).toMatchObject({
                    configured_zone_count: 3,
                    native_zone_4_occupancy: null,
                    native_zone_4_count: null,
                    zone_4_sensitivity: null,
                    zone_4_absence_timeout: null,
                });
                await vi.waitFor(() => expect(device.meta.fp400ReportingZones).toStrictEqual([3, 4, 5]));
                expect(intervals(device, 6)).toStrictEqual([0xffff]);
                expect(intervals(device, 2)).toStrictEqual([3600]);
                expect(device.meta.fp400ReportedEndpoints).toStrictEqual([3, 4, 5, 2]);
            });

            it("leaves the entries alone when a zone only changes shape", async () => {
                const {device} = reportedSensor({1: 3, 2: 4, 3: 5}, [3, 4, 5, 2]);
                await set(device, "native_zone", {zone_id: 1, mask_hex: `ff${"00".repeat(39)}`});
                await settle();
                for (const id of [2, 3, 4, 5, 6]) expect(device.getEndpoint(id).configureReporting).not.toHaveBeenCalled();
            });

            it("leaves a new zone to the poll when no binding to the coordinator is known", async () => {
                const {device} = zoneSensor({1: 3});
                device.meta.fp400ReportedEndpoints = [3, 2];
                await set(device, "native_zone", {zone_id: 2, mask_hex: "00".repeat(40)});
                await settle();
                for (const id of [2, 3, 4]) expect(device.getEndpoint(id).configureReporting).not.toHaveBeenCalled();
                expect(device.meta.fp400ReportingZones).toBeUndefined();
            });
        });

        it("lists the zones in a short form that fits Home Assistant's 255 characters", async () => {
            const {device} = zoneSensor({1: 3, 2: 4, 3: 5, 4: 6});
            // The Kitchen's zones (2026-11-11), plus a disabled zone with no cells.
            const masks = [
                [1, "07000700070007000000000000000000000000000000000000000000000000000000000000000000"],
                [2, "00000000000000000000000000000600060000000000000000000000000000000000000000000000"],
                [3, "0000000000000000000000000000000001c001c00000000000000000000000000000000000000000"],
                [4, "00".repeat(40)],
            ] as const;
            const catalogue = masks.map(([zoneId, mask]) => fp400.zoneStruct({zoneId, zoneType: 0, enabled: zoneId !== 4, cells: hex(mask)}));
            const {state} = await receive(device, 1, "aqaraFp400Config", "readResponse", {zones: catalogue}, ZONES);
            expect(state.configured_zones_compact).toBe("1:0:07000700070007;2:14:060006;3:16:01c001c0;4!:0:00");
            expect(state.configured_zones_compact.length).toBeLessThan(255);
        });

        it("lists the zone cells from a whole catalogue only", async () => {
            const {device} = zoneSensor({1: 4, 5: 3});
            const catalogue = [fp400.zoneStruct({zoneId: 1, zoneType: 0, enabled: true, cells: Buffer.alloc(40, 0x0f)})];
            expect((await receive(device, 1, "aqaraFp400Config", "readResponse", {zones: catalogue}, ZONES)).state).toMatchObject({
                configured_zones: [{zone_id: 1, zone_type: 0, enabled: true, mask_hex: "0f".repeat(40)}],
                configured_zone_count: 2,
            });
            const cut = [[catalogue[0][0], catalogue[0][1]]];
            expect((await receive(device, 1, "aqaraFp400Config", "readResponse", {zones: cut}, ZONES)).state).not.toHaveProperty("configured_zones");
            expect(device.meta.fp400Zones).toStrictEqual({1: {zoneType: 0, enabled: true, maskHex: "0f".repeat(40)}});
        });

        it("polls the zones that got no reporting entry", async () => {
            vi.useFakeTimers();
            const {device} = zoneSensor({1: 4, 2: 3});
            device.meta.fp400ReportedEndpoints = [4, 2];
            const definition = await findByDevice(device);
            const base = {device, state: {}, deviceExposesChanged: vi.fn()};
            await definition.onEvent({type: "start", data: {...base, options: ZONES}});
            vi.advanceTimersByTime(60000);
            await vi.waitFor(() =>
                expect(device.getEndpoint(3).read).toHaveBeenCalledWith("aqaraFp400Radar", ["humanCount"], {manufacturerCode: 0x115f}),
            );
            expect(device.getEndpoint(3).read).toHaveBeenCalledWith("msOccupancySensing", ["occupancy"]);
            expect(device.getEndpoint(4).read).not.toHaveBeenCalledWith("msOccupancySensing", ["occupancy"]);
            await definition.onEvent({type: "stop", data: {ieeeAddr: device.ieeeAddr}});
        });
    });

    describe("configure", () => {
        const coordinator = () => mockDevice({modelID: "coordinator", endpoints: [{ID: 1}]}).getEndpoint(1);
        // One zone, carried by endpoint 4.
        const withZone: Record<number, ReadMock> = {
            1: async (cluster, attributes) =>
                cluster === "aqaraFp400Radar" && attributes.includes("childEndpointList") ? {childEndpointList: [4]} : {},
            4: async (cluster, attributes) => (cluster === "aqaraFp400Radar" && attributes.includes("zoneId") ? {zoneId: 1} : {}),
        };
        const configure = async (device: Zh.Device) => {
            const definition: Definition = await findByDevice(device);
            await definition.configure(device, coordinator(), definition);
        };
        const occupancyReporting = (endpoint: Zh.Endpoint) =>
            vi
                .mocked(endpoint.configureReporting)
                .mock.calls.filter(([cluster]) => cluster === "msOccupancySensing")
                .map(([, items]) => items[0].maximumReportInterval);

        it("sends the pairing initialisation with the manufacturer code", async () => {
            const device = sensor(withZone);
            await configure(device);
            expect(device.getEndpoint(1).write).toHaveBeenCalledWith(
                0xfcc0,
                {160: {value: 1, type: Zcl.DataType.UINT8}},
                {manufacturerCode: 0x115f, disableDefaultResponse: false},
            );
        });

        it("still configures when the pairing initialisation fails", async () => {
            const device = sensor(withZone);
            vi.mocked(device.getEndpoint(1).write).mockRejectedValue(new Error("Timeout"));
            await expect(configure(device)).resolves.toBeUndefined();
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([4, 2]);
        });

        it("reports room presence, then the zones the sensor has, then the light, and releases unused zone endpoints", async () => {
            const device = sensor(withZone);
            await configure(device);
            expect(device.meta.fp400ZoneEndpoints).toStrictEqual({1: 4});
            expect(occupancyReporting(device.getEndpoint(4))).toStrictEqual([3600]);
            for (const id of [3, 5, 6, 7, 8, 9, 10]) expect(occupancyReporting(device.getEndpoint(id))).toStrictEqual([0xffff]);
            expect(device.getEndpoint(2).configureReporting).toHaveBeenCalledWith("msIlluminanceMeasurement", [
                {attribute: "measuredValue", minimumReportInterval: 10, maximumReportInterval: 3600, reportableChange: 5},
            ]);
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([4, 2]);
        });

        it("on a reconfigure, frees the light's entry first when a zone has none", async () => {
            const device = sensor(withZone);
            device.meta.fp400ReportedEndpoints = [2];
            await configure(device);
            const light = vi.mocked(device.getEndpoint(2).configureReporting).mock;
            expect(light.calls.map(([, items]) => items[0].maximumReportInterval)).toStrictEqual([0xffff, 3600]);
            expect(light.invocationCallOrder[0]).toBeLessThan(vi.mocked(device.getEndpoint(4).configureReporting).mock.invocationCallOrder[0]);
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([4, 2]);
            expect(device.meta.fp400ReportingZones).toStrictEqual([4]);
        });

        it("reads the room's attributes on endpoint 1 only, though firmware 63 repeats their clusters on the zone endpoints", async () => {
            // Firmware 63 also has 0xFC0C on endpoints 3-10; a new sensor's configure timed out reading it on 8 and 9.
            const device = sensor(withZone, 63, [...ZONE_CLUSTERS, 0xfc0c]);
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
            const device = sensor(withZone);
            vi.mocked(device.getEndpoint(2).configureReporting).mockRejectedValue(new Error("Status 'INSUFFICIENT_SPACE'"));
            await expect(configure(device)).resolves.toBeUndefined();
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([4]);
        });

        it("leaves zone endpoints alone when it cannot tell which carry zones", async () => {
            const device = sensor({
                1: async (cluster, attributes) => {
                    if (attributes.includes("childEndpointList")) throw new Error("Timeout");
                    return await Promise.resolve({});
                },
            });
            await expect(configure(device)).resolves.toBeUndefined();
            for (const id of [3, 4, 5, 6, 7, 8, 9, 10]) expect(occupancyReporting(device.getEndpoint(id))).toStrictEqual([]);
            expect(device.meta.fp400ZoneEndpoints).toBeUndefined();
            expect(device.meta.fp400ReportedEndpoints).toStrictEqual([2]);
        });
    });
});
