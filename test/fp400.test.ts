import {describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import {fp400} from "../src/lib/lumi";
import type {Definition, Fz, KeyValue, KeyValueAny, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

const hex = (value: string) => Buffer.from(value.replace(/\s/g, ""), "hex");

// Attribute-sync frames captured from real FP400s: passive capture of an Aqara M3 hub session in
// bobtekkk/aqara-fp400-zone-card, test/fixtures/fp400-attribute-sync.json.

describe("FP400 codec", () => {
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
