import assert from "node:assert";
import {afterEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {DefinitionExposesFunction, Expose, Fz, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const getFeatureNames = (expose: Expose): string[] => {
    return "features" in expose && expose.features ? expose.features.map((feature) => feature.name) : [];
};

// The Shelly RPC protocol may split a single JSON command across multiple `data` writes.
// Reassemble every shellyRPCCluster data write into the full command string for assertions.
const sentRpcData = (endpoint: {write: ReturnType<typeof vi.fn>}): string =>
    endpoint.write.mock.calls
        .filter((call) => call[0] === "shellyRPCCluster" && typeof (call[1] as {data?: unknown})?.data === "string")
        .map((call) => (call[1] as {data: string}).data)
        .join("");

describe("Shelly 2PM Gen4 cover mode", () => {
    const mockShelly2PMCover = (read?: ReturnType<typeof vi.fn>) =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 514, inputClusterIDs: [0, 3, 4, 5, 258], outputClusterIDs: []},
                {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: [], read},
                {ID: 242, profileID: 41440, deviceID: 97, inputClusterIDs: [], outputClusterIDs: [33]},
            ],
        });

    const mockShelly2PMCoverWithInputs = (read?: ReturnType<typeof vi.fn>) =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 514, inputClusterIDs: [0, 3, 4, 5, 258], outputClusterIDs: [25]},
                {ID: 2, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 3, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 4, inputClusterIDs: [], outputClusterIDs: [3, 4, 6, 8, 258]},
                {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: [], read},
                {ID: 242, profileID: 41440, deviceID: 97, inputClusterIDs: [], outputClusterIDs: [33]},
            ],
        });

    const mockShelly2PMSwitchWithInputs = (read?: ReturnType<typeof vi.fn>) =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 266, inputClusterIDs: [0, 3, 4, 5, 6, 2820, 1794], outputClusterIDs: [25]},
                {ID: 2, profileID: 260, deviceID: 266, inputClusterIDs: [4, 5, 6, 2820, 1794], outputClusterIDs: []},
                {ID: 3, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 4, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 5, inputClusterIDs: [], outputClusterIDs: [3, 4, 6, 8, 258]},
                {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: [], read},
                {ID: 242, profileID: 41440, deviceID: 97, inputClusterIDs: [], outputClusterIDs: [33]},
            ],
        });

    it("does not expose switch input controls when the device has no switch input endpoints", async () => {
        const device = mockShelly2PMCover();
        const definition = await findByDevice(device);
        expect(definition.model).toBe("S4SW-002P16EU-COVER");
        expect(definition.endpoint?.(device)).toStrictEqual({});
        expect(typeof definition.exposes).toBe("function");

        const exposes = definition.exposes as DefinitionExposesFunction;
        const featureNames = exposes(device, {}).flatMap((expose) => [expose.name, ...getFeatureNames(expose)]);

        expect(featureNames).not.toContain("switch_type");
        expect(featureNames).not.toContain("switch_mode");
    });

    it("maps the second cover switch input type to sw2", async () => {
        const device = mockShelly2PMCoverWithInputs();
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find((converter) => converter.cluster === "genOnOffSwitchCfg") as Fz.Converter;

        const state = converter.convert(
            definition,
            {data: {switchType: 1}, endpoint: device.getEndpoint(3), device, type: "attributeReport"} as never,
            vi.fn(),
            {},
            {device, state: {}} as never,
        );

        expect(definition.endpoint?.(device)).toStrictEqual({sw1: 2, sw2: 3});
        expect(state).toStrictEqual({switch_type_sw2: "momentary"});
    });

    it("maps switch-mode endpoint 3 input type to sw1", async () => {
        const device = mockShelly2PMSwitchWithInputs();
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find((converter) => converter.cluster === "genOnOffSwitchCfg") as Fz.Converter;

        const state = converter.convert(
            definition,
            {data: {switchType: 0}, endpoint: device.getEndpoint(3), device, type: "attributeReport"} as never,
            vi.fn(),
            {},
            {device, state: {}} as never,
        );

        expect(definition.endpoint?.(device)).toStrictEqual({l1: 1, l2: 2, sw1: 3, sw2: 4});
        expect(state).toStrictEqual({switch_type_sw1: "toggle"});
    });

    it("keeps tilt controls visible by default and allows explicit opt-out", async () => {
        const device = mockShelly2PMCover();
        const definition = await findByDevice(device);
        expect(definition.model).toBe("S4SW-002P16EU-COVER");
        expect(typeof definition.exposes).toBe("function");
        const exposes = definition.exposes as DefinitionExposesFunction;

        const defaultCover = exposes(device, {}).find((expose) => expose.type === "cover");
        const hiddenTiltCover = exposes(device, {cover_tilt_enabled: "false"}).find((expose) => expose.type === "cover");
        const tiltCover = exposes(device, {cover_tilt_enabled: "true"}).find((expose) => expose.type === "cover");
        device.meta.cover_tilt_enabled = true;
        const autoDetectedTiltCover = exposes(device, {cover_tilt_enabled: "auto"}).find((expose) => expose.type === "cover");
        assert(defaultCover);
        assert(hiddenTiltCover);
        assert(tiltCover);
        assert(autoDetectedTiltCover);

        expect(getFeatureNames(defaultCover)).toContain("position");
        expect(getFeatureNames(defaultCover)).toContain("tilt");
        expect(getFeatureNames(hiddenTiltCover)).not.toContain("tilt");
        expect(getFeatureNames(tiltCover)).toContain("position");
        expect(getFeatureNames(tiltCover)).toContain("tilt");
        expect(getFeatureNames(autoDetectedTiltCover)).toContain("tilt");
        expect(definition.options?.some((option) => option.name === "cover_tilt_enabled")).toBe(true);
    });
});

describe("Shelly Wi-Fi setup", () => {
    const mockShelly2PMCover = (read?: ReturnType<typeof vi.fn>) =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 514, inputClusterIDs: [0, 3, 4, 5, 258], outputClusterIDs: []},
                {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: [], read},
                {ID: 242, profileID: 41440, deviceID: 97, inputClusterIDs: [], outputClusterIDs: [33]},
            ],
        });

    // Reading the Wi-Fi state through the RPC cluster only gains the untruncated SSID, and the
    // firmware cannot answer an RPC read over Zigbee at all. Every attempt costs two timeouts
    // before the setup cluster - which does answer - gets its turn, on every Gen4 device.
    it("reads the Wi-Fi state through the setup cluster without trying RPC first", async () => {
        const device = mockShelly2PMCover();
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key?.includes("wifi_config")) as Tz.Converter;
        const publish = vi.fn();

        await converter.convertGet?.(device.getEndpoint(1), "wifi_config", {device, message: {}, publish} as never);

        expect(sentRpcData(device.getEndpoint(239) as never)).toBe("");
        expect(device.getEndpoint(239).read).toHaveBeenCalledWith("shellyWiFiSetupCluster", expect.any(Array), expect.any(Object));
    });

    it("uses the cached full Shelly Wi-Fi SSID when the setup cluster reports a shortened name", async () => {
        const device = mockShelly2PMCover();
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee?.find((c) => c.cluster === "shellyWiFiSetupCluster");
        assert(converter);

        const msg = {
            data: {ssid: "The Int", enabled: 1},
            endpoint: device.getEndpoint(239),
        } as unknown as Fz.Message<"shellyWiFiSetupCluster">;

        expect(
            converter.convert(
                definition,
                msg,
                () => {},
                {shelly_wifi_ssid: "The Internet of Shitty Things"},
                {state: {}, device, deviceExposesChanged: () => {}},
            ),
        ).toStrictEqual({
            wifi_config: {
                enabled: true,
                ssid: "The Internet of Shitty Things",
            },
        });
        expect(definition.options?.some((option) => option.name === "shelly_wifi_ssid")).toBe(true);
    });

    it("does not fail a get when both Shelly Wi-Fi readback paths are unavailable", async () => {
        const read = vi.fn((cluster: string, attributes: string[]) => {
            if (cluster === "shellyRPCCluster" && attributes.includes("rxCtl")) throw new Error("RPC unavailable");
            if (cluster === "shellyWiFiSetupCluster" && attributes.includes("status")) throw new Error("setup cluster unavailable");
            return Promise.resolve({});
        });
        const publish = vi.fn();
        const device = mockShelly2PMCover(read);
        const definition = await findByDevice(device);
        const converter = definition.toZigbee?.find((c) => c.key.includes("wifi_config"));
        assert(converter?.convertGet);

        await expect(
            converter.convertGet(device.getEndpoint(239), "wifi_config", {
                device,
                state: {},
                publish,
            } as unknown as Tz.Meta),
        ).resolves.toBeUndefined();

        expect(device.getEndpoint(239).write).toHaveBeenCalledWith("shellyWiFiSetupCluster", {actionCode: 0}, expect.any(Object));
        expect(read).toHaveBeenCalledWith("shellyWiFiSetupCluster", ["status", "ip", "enabled", "dhcp", "ssid"], expect.any(Object));
        expect(publish).not.toHaveBeenCalled();
    });
});

describe("Shelly Presence Gen4", () => {
    const mockShellyPresence = (read?: ReturnType<typeof vi.fn>) =>
        mockDevice({
            modelID: "Presence",
            manufacturerName: "Shelly",
            endpoints: [
                ...Array.from({length: 10}, (_, index) => ({
                    ID: index + 1,
                    inputClusterIDs: [0, 3, 1030, 0xfc21],
                    outputClusterIDs: [],
                })),
                {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: [], read},
                {ID: 242, profileID: 41440, deviceID: 97, inputClusterIDs: [], outputClusterIDs: [33]},
            ],
        });

    const occupancyEndpoints = (definition: Awaited<ReturnType<typeof findByDevice>>, device: ReturnType<typeof mockShellyPresence>) => {
        expect(typeof definition.exposes).toBe("function");
        const exposes = definition.exposes as DefinitionExposesFunction;
        return exposes(device, {})
            .filter((expose) => expose.name === "occupancy")
            .map((expose) => expose.endpoint);
    };

    // The occupancy endpoints are the tracked PEOPLE, not zones - the device reports each detected
    // person on its own endpoint. They must never depend on a zone count, or a second person is
    // silently dropped. Shelly's own definition exposes all ten unconditionally.
    it("exposes an occupancy endpoint for every person the device can track", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);

        expect(definition.model).toBe("S4SN-0U61X");
        expect(occupancyEndpoints(definition, device)).toStrictEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
    });

    it("keeps every occupancy endpoint even when only one zone is known", async () => {
        const device = mockShellyPresence();
        device.meta.presence_zone_count = 1;
        const definition = await findByDevice(device);
        const exposes = definition.exposes as DefinitionExposesFunction;
        const names = exposes(device, {}).map((expose) => `${expose.name}_${expose.endpoint}`);

        expect(occupancyEndpoints(definition, device)).toHaveLength(10);
        // The zone delays follow the zone, not the tracked people.
        expect(names).toContain("presence_delay_1");
        expect(names).not.toContain("presence_delay_2");
    });

    it("exposes presence_delay and absence_delay for each detected zone", async () => {
        const device = mockShellyPresence();
        device.meta.presence_zone_count = 2;
        const definition = await findByDevice(device);
        const exposes = definition.exposes as DefinitionExposesFunction;
        const names = exposes(device, {}).map((expose) => `${expose.name}_${expose.endpoint}`);

        expect(names).toEqual(expect.arrayContaining(["presence_delay_1", "absence_delay_1", "presence_delay_2", "absence_delay_2"]));
        expect(names).not.toContain("presence_delay_3");
    });

    it("writes PresenceZone.SetConfig to the mapped zone id when setting a delay", async () => {
        const device = mockShellyPresence();
        device.meta.presence_zone_ids = [200, 201, 202];
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("presence_delay")) as Tz.Converter;

        const result = await converter.convertSet?.(device.getEndpoint(2), "presence_delay", 45, {
            endpoint_name: "2",
            message: {},
            state: {},
            device,
        } as never);

        const command = sentRpcData(device.getEndpoint(239) as never);
        expect(command).toContain('"method":"PresenceZone.SetConfig"');
        expect(command).toContain('"id":201');
        expect(command).toContain('"presence_thr":45');
        expect(result).toStrictEqual({state: {presence_delay: 45}});
    });

    // The firmware cannot answer an RPC read over Zigbee, so nothing configured through the RPC
    // cluster may offer one. A device query walks every converter that has a convertGet regardless
    // of the access flags, so the read has to be gone, not just marked unavailable.
    it("offers no RPC-backed reads at all", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const rpcKeys = ["presence_delay", "absence_delay", "eco_mode", "mounting", "detection", "leds", "tuning"];

        for (const key of rpcKeys) {
            const converter = definition.toZigbee.find((c) => c.key?.includes(key)) as Tz.Converter;
            expect(converter, `no converter for ${key}`).toBeDefined();
            expect(converter.convertGet, `${key} must not be readable`).toBeUndefined();
        }

        const exposes = definition.exposes as DefinitionExposesFunction;
        for (const expose of exposes(device, {})) {
            if (!expose.name || !rpcKeys.includes(expose.name)) continue;
            // settable and shown, but never fetched from the device
            expect(expose.access & 0b100, `${expose.name} must not announce GET`).toBe(0);
            expect(expose.access & 0b010, `${expose.name} must stay settable`).toBe(0b010);
        }
    });

    it("does not read the zone back after writing a delay", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("presence_delay")) as Tz.Converter;

        const result = await converter.convertSet?.(device.getEndpoint(1), "presence_delay", 45, {
            endpoint_name: "1",
            message: {},
            state: {},
            device,
        } as never);

        const command = sentRpcData(device.getEndpoint(239) as never);
        expect(command).toContain('"method":"PresenceZone.SetConfig"');
        expect(command).not.toContain("GetConfig");
        expect(result).toStrictEqual({state: {presence_delay: 45}});
    });

    it("does not read the sensor back after writing a group", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("detection")) as Tz.Converter;

        await converter.convertSet?.(device.getEndpoint(1), "detection", {sensitivity: "high"}, {message: {}, state: {}, device} as never);

        const command = sentRpcData(device.getEndpoint(239) as never);
        expect(command).toContain('"method":"Presence.SetConfig"');
        expect(command).not.toContain("GetConfig");
    });

    it("makes no discovery attempt while the firmware cannot answer reads", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);

        await definition.configure?.(device, mockShellyPresence().getEndpoint(1), definition);

        expect(sentRpcData(device.getEndpoint(239) as never)).toBe("");
    });

    // Zone ids can only be learned through an RPC read, and the firmware cannot answer those over
    // Zigbee. A factory device has exactly one zone, so the main zone id has to carry the write.
    it("writes to the main zone id when no zone ids could be discovered", async () => {
        const device = mockShellyPresence();
        expect(device.meta.presence_zone_ids).toBeUndefined();
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("absence_delay")) as Tz.Converter;

        await converter.convertSet?.(device.getEndpoint(1), "absence_delay", 90, {
            endpoint_name: "1",
            message: {},
            state: {},
            device,
        } as never);

        const command = sentRpcData(device.getEndpoint(239) as never);
        expect(command).toContain('"method":"PresenceZone.SetConfig"');
        expect(command).toContain('"id":200');
        expect(command).toContain('"absence_thr":90');
    });

    it("clamps out-of-range delays to the 0-3600 second bounds", async () => {
        const device = mockShellyPresence();
        device.meta.presence_zone_ids = [200];
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("absence_delay")) as Tz.Converter;

        await converter.convertSet?.(device.getEndpoint(1), "absence_delay", 99999, {endpoint_name: "1", message: {}, state: {}, device} as never);

        expect(sentRpcData(device.getEndpoint(239) as never)).toContain('"absence_thr":3600');
    });

    // A group travels in ONE command, and only the values actually given are sent.
    it("writes a whole group in a single Presence.SetConfig and sends only what was given", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("detection")) as Tz.Converter;

        const result = await converter.convertSet?.(device.getEndpoint(1), "detection", {sensitivity: "high", tracked_objects: 4}, {
            message: {},
            state: {},
            device,
        } as never);

        const command = sentRpcData(device.getEndpoint(239) as never);
        expect(command.split('"method":"Presence.SetConfig"').length - 1).toBe(1);
        expect(command).toContain('"sensitivity":"high"');
        expect(command).toContain('"num_tracks":4');
        expect(command).not.toContain("zmin");
        expect(result).toStrictEqual({state: {detection: {sensitivity: "high", tracked_objects: 4}}});
    });

    // The settings are grouped so a consuming integration shows folders instead of two dozen
    // values side by side; the ranges are the ones the device enforces itself.
    it("groups the sensor settings and keeps the device's own ranges", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const exposes = definition.exposes as DefinitionExposesFunction;
        const groups = new Map(exposes(device, {}).map((expose) => [expose.name, expose]));
        const featureOf = (group: string, name: string) => (groups.get(group) as {features?: Expose[]})?.features?.find((f) => f.name === name);

        expect([...groups.keys()]).toEqual(expect.arrayContaining(["mounting", "detection", "leds", "tuning"]));
        expect(featureOf("mounting", "installation_height")).toMatchObject({value_min: 0, value_max: 5, unit: "m"});
        expect(featureOf("mounting", "sensor_position")).toMatchObject({values: ["center", "left", "right"]});
        expect(featureOf("detection", "maximum_range")).toMatchObject({value_min: 0, value_max: 5, unit: "m"});
        expect(featureOf("detection", "tracked_objects")).toMatchObject({value_min: 1, value_max: 10});
        expect(featureOf("detection", "radar_power")).toMatchObject({values: ["low", "medium", "high"]});
        expect(featureOf("leds", "brightness")).toMatchObject({value_min: 0, value_max: 100, unit: "%"});
        expect(featureOf("leds", "night_mode")).toMatchObject({type: "binary"});
        expect(featureOf("tuning", "detection_points")).toMatchObject({value_min: 10, value_max: 100});
        expect(featureOf("tuning", "velocity_threshold")).toMatchObject({value_min: 0, value_max: 1});
        expect(featureOf("tuning", "snr_threshold")).toMatchObject({value_min: 10, value_max: 100});
        expect(featureOf("tuning", "maximum_velocity_difference")).toMatchObject({value_min: 1, value_max: 50});
        expect(featureOf("tuning", "motion_activation_threshold")).toMatchObject({value_min: 1, value_max: 100});
        expect(featureOf("tuning", "tracking_loss_threshold")).toMatchObject({value_min: 1, value_max: 1000});
        expect(featureOf("tuning", "stillness_timeout_threshold")).toMatchObject({value_min: 1, value_max: 65535});
    });

    it("merges several deeply nested thresholds into one nested config", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("tuning")) as Tz.Converter;

        await converter.convertSet?.(device.getEndpoint(1), "tuning", {stillness_timeout_threshold: 900, motion_activation_threshold: 2}, {
            message: {},
            state: {},
            device,
        } as never);

        expect(sentRpcData(device.getEndpoint(239) as never)).toContain('"state":{"det_act_thr":2,"sleep_free_thr":900}');
    });

    // The device reports 'custom' once the fine-tuning values deviate from a preset, but only
    // accepts the three presets on write. Listing it keeps the reported state a valid value.
    it("lists the reported custom sensitivity but refuses to write it", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const exposes = definition.exposes as DefinitionExposesFunction;
        const detection = exposes(device, {}).find((expose) => expose.name === "detection") as {features?: Expose[]};
        const converter = definition.toZigbee.find((c) => c.key.includes("detection")) as Tz.Converter;

        expect(detection.features?.find((f) => f.name === "sensitivity")).toMatchObject({
            values: ["low", "medium", "high", "custom"],
        });
        await expect(
            converter.convertSet?.(device.getEndpoint(1), "detection", {sensitivity: "custom"}, {message: {}, state: {}, device} as never),
        ).rejects.toThrow(/custom/i);
    });

    // Discovered ids stay authoritative where they exist; the main-zone fallback only fills the gap.
    it("prefers a discovered zone id over the main zone fallback", async () => {
        const device = mockShellyPresence();
        device.meta.presence_zone_ids = [207];
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("presence_delay")) as Tz.Converter;

        await converter.convertSet?.(device.getEndpoint(1), "presence_delay", 10, {
            endpoint_name: "1",
            message: {},
            state: {},
            device,
        } as never);

        expect(sentRpcData(device.getEndpoint(239) as never)).toContain('"id":207');
    });

    it("exposes an eco_mode switch", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const exposes = definition.exposes as DefinitionExposesFunction;
        const names = exposes(device, {}).map((expose) => expose.name);
        expect(names).toContain("eco_mode");
    });

    it("writes Sys.SetConfig when eco_mode is set", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => c.key.includes("eco_mode")) as Tz.Converter;

        const result = await converter.convertSet?.(device.getEndpoint(239), "eco_mode", true, {message: {}, state: {}, device} as never);

        const command = sentRpcData(device.getEndpoint(239) as never);
        expect(command).toContain('"method":"Sys.SetConfig"');
        expect(command).toContain('"eco_mode":true');
        expect(result).toStrictEqual({state: {eco_mode: true}});
    });

    // Reporting has to reach every tracked-person endpoint. Configuring only the first one is what
    // the device did before, and it makes a second person arrive nowhere.
    it("configures occupancy reporting on every tracked-person endpoint", async () => {
        const device = mockShellyPresence();
        const coordinator = mockShellyPresence().getEndpoint(1);
        const definition = await findByDevice(device);

        await definition.configure?.(device, coordinator, definition);

        for (const endpointName of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]) {
            expect(device.getEndpoint(Number(endpointName)).configureReporting).toHaveBeenCalledWith("msOccupancySensing", expect.anything());
        }
    });

    // A sleeping or unreachable endpoint makes the coordinator report a delivery failure. That must
    // not abort configure, or one bad endpoint costs the device its whole occupancy reporting.
    it("keeps configuring the remaining endpoints when one of them fails", async () => {
        const device = mockShellyPresence();
        const coordinator = mockShellyPresence().getEndpoint(1);
        const definition = await findByDevice(device);
        vi.mocked(device.getEndpoint(3).configureReporting).mockRejectedValueOnce(new Error("Delivery failed for '6137'"));

        await definition.configure?.(device, coordinator, definition);

        expect(device.getEndpoint(10).configureReporting).toHaveBeenCalledWith("msOccupancySensing", expect.anything());
    });

    it("retries a delay write when the first RPC send fails", async () => {
        const device = mockShellyPresence();
        device.meta.presence_zone_ids = [200];
        const definition = await findByDevice(device);
        const ep = device.getEndpoint(239) as unknown as {write: ReturnType<typeof vi.fn>};
        let attempts = 0;
        ep.write = vi.fn(() => {
            attempts++;
            if (attempts === 1) return Promise.reject(new Error("Send command failed: timed out"));
            return Promise.resolve({});
        });
        const converter = definition.toZigbee.find((c) => c.key.includes("presence_delay")) as Tz.Converter;

        const result = await converter.convertSet?.(device.getEndpoint(1), "presence_delay", 30, {
            endpoint_name: "1",
            message: {},
            state: {},
            device,
        } as never);

        expect(attempts).toBeGreaterThan(1);
        expect(result).toStrictEqual({state: {presence_delay: 30}});
    });
});

// Endpoint layouts below are the ones real devices report (read off a live installation), not
// invented ones - the whole point of these tests is what happens when hardware differs.
describe("Shelly Gen4 settings the device cannot report", () => {
    const exposesOf = async (device: ReturnType<typeof mockDevice>) => {
        const definition = await findByDevice(device);
        return typeof definition.exposes === "function" ? (definition.exposes as DefinitionExposesFunction)(device, {}) : definition.exposes;
    };

    const mockPowerStrip = () =>
        mockDevice({
            modelID: "Power Strip",
            manufacturerName: "Shelly",
            endpoints: [
                ...Array.from({length: 4}, (_, index) => ({ID: index + 1, inputClusterIDs: [0, 3, 4, 5, 6, 2820, 1794], outputClusterIDs: []})),
                {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: []},
            ],
        });

    // The RPC cluster cannot answer a read, so none of these has a convertGet at all. Announcing
    // GET offers the user a refresh that can never do anything - not even once the firmware is fixed.
    it("does not announce a read for power strip settings that have no read converter", async () => {
        const device = mockPowerStrip();
        const definition = await findByDevice(device);
        const exposes = await exposesOf(device);

        for (const name of ["led_colors", "led_night_mode", "buttons_enabled"]) {
            const expose = exposes.find((e) => e.name === name);
            expect(expose, `${name} is missing`).toBeDefined();
            expect(definition.toZigbee.find((c) => c.key?.includes(name))?.convertGet, `${name} unexpectedly has a convertGet`).toBeUndefined();
            expect(expose.access & 0b100, `${name} must not announce GET`).toBe(0);
        }
    });

    // A configuration value that silently means something else than the user assumes is worse than
    // none at all: what is shown is the last value written from here, never a reading.
    it("tells the user that power strip settings cannot be read back", async () => {
        const exposes = await exposesOf(mockPowerStrip());

        for (const name of ["led_mode", "led_colors", "led_power_brightness", "led_night_mode", "buttons_enabled"]) {
            const expose = exposes.find((e) => e.name === name);
            expect(expose, `${name} is missing`).toBeDefined();
            expect(expose.description ?? "", `${name} does not mention that it cannot be read back`).toContain("cannot report");
        }
    });

    const mockOnePM = (withSwitchInput: boolean) =>
        mockDevice({
            modelID: "Mini1PM",
            manufacturerName: "Shelly",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 266, inputClusterIDs: [0, 3, 4, 5, 6, 2820, 1794], outputClusterIDs: [25]},
                ...(withSwitchInput ? [{ID: 2, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]}] : []),
                {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: []},
            ],
        });

    // A 1PM Mini only reports the switch input endpoint when an input is actually wired. Without it
    // the setting has nothing to address, and a state that can never hold a value is worse than none.
    it("exposes no switch_type on a 1PM Mini that has no switch input endpoint", async () => {
        const names = (await exposesOf(mockOnePM(false))).map((e) => e.name);

        expect(names).not.toContain("switch_type");
    });

    it("exposes switch_type on a 1PM Mini that has a switch input endpoint", async () => {
        const exposes = await exposesOf(mockOnePM(true));
        const switchType = exposes.find((e) => e.name === "switch_type");

        expect(switchType).toBeDefined();
        expect(switchType.endpoint).toBe("sw1");
    });
});

// The two 2PM variants place their switch inputs on different endpoints: the cover has them on 2
// and 3, the switch-mode device on 3 and 4, because 1 and 2 are its two relays. Endpoint layouts
// below are taken from the definitions' own fingerprints.
describe("Shelly 2PM Gen4 switch input endpoints", () => {
    const RPC_ENDPOINTS = [
        {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: []},
        {ID: 242, profileID: 41440, deviceID: 97, inputClusterIDs: [], outputClusterIDs: [33]},
    ];

    // Two relays, no switch inputs wired - the layout a switch-mode 2PM reports on its own.
    const mockSwitchWithoutInputs = () =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 266, inputClusterIDs: [0, 3, 4, 5, 6, 2820, 1794], outputClusterIDs: []},
                {ID: 2, profileID: 260, deviceID: 266, inputClusterIDs: [4, 5, 6, 2820, 1794], outputClusterIDs: []},
                ...RPC_ENDPOINTS,
            ],
        });

    const mockSwitchWithInputs = () =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 266, inputClusterIDs: [0, 3, 4, 5, 6, 2820, 1794], outputClusterIDs: [25]},
                {ID: 2, profileID: 260, deviceID: 266, inputClusterIDs: [4, 5, 6, 2820, 1794], outputClusterIDs: []},
                {ID: 3, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 4, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 5, inputClusterIDs: [], outputClusterIDs: [3, 4, 6, 8, 258]},
                ...RPC_ENDPOINTS,
            ],
        });

    const mockCoverWithInputs = () =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 514, inputClusterIDs: [0, 3, 4, 5, 258], outputClusterIDs: [25]},
                {ID: 2, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 3, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 4, inputClusterIDs: [], outputClusterIDs: [3, 4, 6, 8, 258]},
                ...RPC_ENDPOINTS,
            ],
        });

    const exposeNames = async (device: ReturnType<typeof mockDevice>) => {
        const definition = await findByDevice(device);
        const exposes = typeof definition.exposes === "function" ? (definition.exposes as DefinitionExposesFunction)(device, {}) : definition.exposes;
        return {model: definition.model, names: exposes.map((e) => `${e.name}${e.endpoint ? `_${e.endpoint}` : ""}`)};
    };

    // Endpoints 1 and 2 are the relays here. Reading them as switch inputs invents an input the
    // device does not have.
    it("offers no switch input mode on a switch-mode 2PM whose inputs are not wired", async () => {
        const {model, names} = await exposeNames(mockSwitchWithoutInputs());

        expect(model).toBe("S4SW-002P16EU-SWITCH");
        expect(names.filter((name) => name.startsWith("switch_mode"))).toStrictEqual([]);
    });

    // Guard, not proof: with both inputs wired the two mappings happen to produce the same endpoint
    // names even while pointing at different endpoints. It only keeps the wired case from breaking
    // while the unwired one above is fixed.
    it("keeps both switch inputs exposed on a switch-mode 2PM that has them wired", async () => {
        const {model, names} = await exposeNames(mockSwitchWithInputs());

        expect(model).toBe("S4SW-002P16EU-SWITCH");
        expect(names).toContain("switch_type_sw1");
        expect(names).toContain("switch_type_sw2");
        expect(names).toContain("switch_mode_sw1");
        expect(names).toContain("switch_mode_sw2");
    });

    it("keeps the cover-mode 2PM on its own input endpoints", async () => {
        const {model, names} = await exposeNames(mockCoverWithInputs());

        expect(model).toBe("S4SW-002P16EU-COVER");
        expect(names).toContain("switch_mode_sw1");
        expect(names).toContain("switch_mode_sw2");
    });

    // switch_mode travels over the RPC cluster, which the firmware cannot answer over Zigbee:
    // announcing GET offers a refresh that can never do anything, and a device query walks every
    // converter that has a convertGet - so the read has to be gone and the expose has to say so.
    it("marks switch_mode write-only and offers no read", async () => {
        const device = mockSwitchWithInputs();
        const definition = await findByDevice(device);
        const exposes = (definition.exposes as DefinitionExposesFunction)(device, {});

        for (const endpoint of ["sw1", "sw2"]) {
            const expose = exposes.find((e) => e.name === "switch_mode" && e.endpoint === endpoint);
            expect(expose, `switch_mode_${endpoint} is missing`).toBeDefined();
            expect(expose.access & 0b100, `switch_mode_${endpoint} must not announce GET`).toBe(0);
            expect(expose.access & 0b010, `switch_mode_${endpoint} must stay settable`).toBe(0b010);
            expect(expose.description ?? "").toContain("cannot report");
        }
        expect(definition.toZigbee.find((c) => c.key?.includes("switch_mode"))?.convertGet).toBeUndefined();
    });
});

// The input action events must follow the definition's endpoint map, like switch_type/switch_mode
// already do: the cover-mode 2PM has its inputs on endpoints 2/3, the switch-mode device on 3/4.
// A fixed endpoint lookup made cover input 1 throw and reported cover input 2 as input 1.
describe("Shelly 2PM Gen4 switch input events", () => {
    const RPC_ENDPOINTS = [
        {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: []},
        {ID: 242, profileID: 41440, deviceID: 97, inputClusterIDs: [], outputClusterIDs: [33]},
    ];

    const mockCover = (ieeeAddr: string) =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            ieeeAddr,
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 514, inputClusterIDs: [0, 3, 4, 5, 258], outputClusterIDs: [25]},
                {ID: 2, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 3, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 4, inputClusterIDs: [], outputClusterIDs: [3, 4, 6, 8, 258]},
                ...RPC_ENDPOINTS,
            ],
        });

    const mockSwitch = (ieeeAddr: string) =>
        mockDevice({
            modelID: "2PM",
            manufacturerName: "Shelly",
            ieeeAddr,
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 266, inputClusterIDs: [0, 3, 4, 5, 6, 2820, 1794], outputClusterIDs: [25]},
                {ID: 2, profileID: 260, deviceID: 266, inputClusterIDs: [4, 5, 6, 2820, 1794], outputClusterIDs: []},
                {ID: 3, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 4, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                {ID: 5, inputClusterIDs: [], outputClusterIDs: [3, 4, 6, 8, 258]},
                ...RPC_ENDPOINTS,
            ],
        });

    const convertCommand = async (
        device: ReturnType<typeof mockDevice>,
        endpointId: number,
        type: string,
        data: Record<string, unknown>,
        sequence: number,
    ) => {
        const definition = await findByDevice(device);
        const cluster = type === "commandRecall" ? "genScenes" : "genOnOff";
        const converter = definition.fromZigbee.find(
            (c) => c.cluster === cluster && (Array.isArray(c.type) ? c.type.includes(type) : c.type === type),
        ) as Fz.Converter;
        return converter.convert(
            definition,
            {data, endpoint: device.getEndpoint(endpointId), device, type, meta: {zclTransactionSequenceNumber: sequence}} as never,
            vi.fn(),
            {},
            {device, state: {}, deviceExposesChanged: () => {}} as never,
        );
    };

    it("maps cover input 1 (endpoint 2) and input 2 (endpoint 3) to their own actions", async () => {
        const device = mockCover("0x000000000000e101");
        expect((await findByDevice(device)).model).toBe("S4SW-002P16EU-COVER");

        expect(await convertCommand(device, 2, "commandOn", {}, 1)).toStrictEqual({action: "input_1_on"});
        expect(await convertCommand(device, 3, "commandOn", {}, 2)).toStrictEqual({action: "input_2_on"});
        expect(await convertCommand(device, 2, "commandRecall", {sceneid: 2}, 3)).toStrictEqual({action: "input_1_double"});
        expect(await convertCommand(device, 3, "commandRecall", {sceneid: 11}, 4)).toStrictEqual({action: "input_2_hold"});
    });

    it("keeps the switch-mode inputs on endpoints 3 and 4", async () => {
        const device = mockSwitch("0x000000000000e102");
        expect((await findByDevice(device)).model).toBe("S4SW-002P16EU-SWITCH");

        expect(await convertCommand(device, 3, "commandOff", {}, 5)).toStrictEqual({action: "input_1_off"});
        expect(await convertCommand(device, 4, "commandToggle", {}, 6)).toStrictEqual({action: "input_2_toggle"});
    });

    it("ignores commands from endpoints that are no switch input instead of throwing", async () => {
        const device = mockCover("0x000000000000e103");

        expect(await convertCommand(device, 4, "commandOn", {}, 7)).toBeUndefined();
    });

    // The single-channel devices route through the same map-based resolver: with a wired input
    // the filtered map names sw1 -> endpoint 2, so the events keep arriving exactly as before.
    it("keeps single-channel input events working when the input is wired", async () => {
        const device = mockDevice({
            modelID: "Mini1PM",
            manufacturerName: "Shelly",
            ieeeAddr: "0x000000000000e106",
            endpoints: [
                {ID: 1, profileID: 260, deviceID: 266, inputClusterIDs: [0, 3, 4, 5, 6, 2820, 1794], outputClusterIDs: [25]},
                {ID: 2, inputClusterIDs: [7], outputClusterIDs: [3, 4, 5, 6]},
                ...RPC_ENDPOINTS,
            ],
        });
        expect((await findByDevice(device)).model).toBe("S4SW-001P8EU");

        expect(await convertCommand(device, 2, "commandOn", {}, 8)).toStrictEqual({action: "input_1_on"});
        expect(await convertCommand(device, 2, "commandRecall", {sceneid: 4}, 9)).toStrictEqual({action: "input_1_hold"});
    });

    it("publishes a repeated transaction only once", async () => {
        const device = mockSwitch("0x000000000000e104");

        expect(await convertCommand(device, 3, "commandOn", {}, 42)).toStrictEqual({action: "input_1_on"});
        expect(await convertCommand(device, 3, "commandOn", {}, 42)).toBeUndefined();
    });
});

// The genOnOff/genScenes bindings and the switchType read in configure were added to these
// definitions after their devices shipped. Without a version bump the application never
// re-configures already paired devices, so their input events silently never arrive - the
// BLU remotes bumped to 0.0.2 for exactly this kind of binding fix.
describe("Shelly Gen4 switch definitions carry the re-configure version bump", () => {
    const RPC_ENDPOINTS = [
        {ID: 239, profileID: 49153, deviceID: 8193, inputClusterIDs: [64513, 64514], outputClusterIDs: []},
        {ID: 242, profileID: 41440, deviceID: 97, inputClusterIDs: [], outputClusterIDs: [33]},
    ];
    const SINGLE_CHANNEL = [{ID: 1, profileID: 260, deviceID: 266, inputClusterIDs: [0, 3, 4, 5, 6], outputClusterIDs: [25]}, ...RPC_ENDPOINTS];
    const cases: [string, ReturnType<typeof mockDevice>][] = [
        ["S4SW-001X8EU", mockDevice({modelID: "Mini1", manufacturerName: "Shelly", endpoints: SINGLE_CHANNEL})],
        ["S4SW-001X16EU", mockDevice({modelID: "1", manufacturerName: "Shelly", endpoints: SINGLE_CHANNEL})],
        ["S4SW-001P8EU", mockDevice({modelID: "Mini1PM", manufacturerName: "Shelly", endpoints: SINGLE_CHANNEL})],
        ["S4SW-001P16EU", mockDevice({modelID: "1PM", manufacturerName: "Shelly", endpoints: SINGLE_CHANNEL})],
        [
            "S4SW-002P16EU-COVER",
            mockDevice({
                modelID: "2PM",
                manufacturerName: "Shelly",
                endpoints: [{ID: 1, profileID: 260, deviceID: 514, inputClusterIDs: [0, 3, 4, 5, 258], outputClusterIDs: []}, ...RPC_ENDPOINTS],
            }),
        ],
        [
            "S4SW-002P16EU-SWITCH",
            mockDevice({
                modelID: "2PM",
                manufacturerName: "Shelly",
                ieeeAddr: "0x000000000000e105",
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 266, inputClusterIDs: [0, 3, 4, 5, 6, 2820, 1794], outputClusterIDs: []},
                    {ID: 2, profileID: 260, deviceID: 266, inputClusterIDs: [4, 5, 6, 2820, 1794], outputClusterIDs: []},
                    ...RPC_ENDPOINTS,
                ],
            }),
        ],
    ];

    it.each(cases)("%s", async (expectedModel, device) => {
        const definition = await findByDevice(device);
        expect(definition.model).toBe(expectedModel);
        expect(definition.configure).toBeDefined();
        expect(definition.version).toBe("0.0.1");
    });
});

describe("Shelly WS90 rain rate", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    const mockWS90 = () =>
        mockDevice({
            modelID: "Ecowitt WS90",
            manufacturerName: "Shelly",
            endpoints: [{ID: 1, profileID: 260, deviceID: 12, inputClusterIDs: [0, 1, 3, 0x400, 0x402, 0x403, 0x405], outputClusterIDs: []}],
        });

    // The precipitation counter is cumulative. After a reset (battery change, restart) the stored
    // history must be rebased on the new counter value - otherwise the delta stays negative and
    // the rate reports 0 until the new counter overtakes the old one, which can take months.
    it("recovers the rain rate after the cumulative counter resets", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-22T10:00:00Z"));
        const device = mockWS90();
        const definition = await findByDevice(device);
        expect(definition.model).toBe("WS90");
        const rainConverters = definition.fromZigbee.filter((c) => c.cluster === "shellyWS90Rain");
        expect(rainConverters.length).toBeGreaterThan(0);
        const meta = {device, state: {}, deviceExposesChanged: () => {}} as never;
        const report = (raw: number) =>
            Object.assign(
                {},
                ...rainConverters.map(
                    (c) =>
                        (c as Fz.Converter).convert(
                            definition,
                            {data: {precipitation: raw}, endpoint: device.getEndpoint(1), device, type: "attributeReport"} as never,
                            vi.fn(),
                            {},
                            meta,
                        ) ?? {},
                ),
            ) as Record<string, unknown>;

        expect(report(5000).rain_rate).toBe(0); // 500 mm - initial sample
        vi.setSystemTime(new Date("2026-07-22T10:02:00Z"));
        expect(report(6000).rain_rate).toBe(300); // +100 mm in 2 min, capped at 300 mm/h
        vi.setSystemTime(new Date("2026-07-22T10:04:00Z"));
        expect(report(100).rain_rate).toBe(0); // counter reset to 10 mm - history is rebased
        vi.setSystemTime(new Date("2026-07-22T10:06:00Z"));
        expect(report(500).rain_rate).toBe(300); // +40 mm in 2 min since the reset
    });

    // The station reports as often as every 10 seconds and every save writes the whole device
    // database to disk. The calculated-value converters used to save on every single report
    // (twice on rain reports); persist at most once a minute instead.
    it("persists the device meta at most once a minute", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-22T12:00:00Z"));
        const device = mockWS90();
        const definition = await findByDevice(device);
        const save = vi.spyOn(device, "save");
        const wind = definition.fromZigbee.filter((c) => c.cluster === "shellyWS90Wind");
        const meta = {device, state: {}, deviceExposesChanged: () => {}} as never;
        const report = (windSpeed: number) => {
            for (const c of wind) {
                (c as Fz.Converter).convert(
                    definition,
                    {data: {windSpeed}, endpoint: device.getEndpoint(1), device, type: "attributeReport"} as never,
                    vi.fn(),
                    {},
                    meta,
                );
            }
        };

        report(10);
        vi.setSystemTime(new Date("2026-07-22T12:00:10Z"));
        report(20);
        vi.setSystemTime(new Date("2026-07-22T12:00:20Z"));
        report(30);
        expect(save).toHaveBeenCalledTimes(1);

        vi.setSystemTime(new Date("2026-07-22T12:01:01Z"));
        report(40);
        expect(save).toHaveBeenCalledTimes(2);
    });

    // The station reports the ZCL non-value marker (all bits set) when a reading is unavailable -
    // a gustSpeed of 0xffff was published as 6553.5 m/s (Koenkk/zigbee2mqtt#31048). Markers must
    // contribute nothing, neither as a measurement nor to the calculated values.
    it("discards the non-value markers instead of publishing them as measurements", async () => {
        const device = mockWS90();
        const definition = await findByDevice(device);
        const meta = {device, state: {}, deviceExposesChanged: () => {}} as never;
        const convertAll = (cluster: string, data: Record<string, unknown>) =>
            Object.assign(
                {},
                ...definition.fromZigbee
                    .filter((c) => c.cluster === cluster)
                    .map(
                        (c) =>
                            (c as Fz.Converter).convert(
                                definition,
                                {data, endpoint: device.getEndpoint(1), device, type: "attributeReport"} as never,
                                vi.fn(),
                                {},
                                meta,
                            ) ?? {},
                    ),
            ) as Record<string, unknown>;

        expect(convertAll("shellyWS90Wind", {gustSpeed: 0xffff}).gust_speed).toBeUndefined();
        expect(convertAll("shellyWS90Wind", {windSpeed: 0xffff}).wind_speed).toBeUndefined();
        expect(convertAll("shellyWS90UV", {uvIndex: 0xff}).uv_index).toBeUndefined();
        expect(convertAll("shellyWS90Rain", {precipitation: 0xffffff}).precipitation).toBeUndefined();
        // A real reading still scales as before.
        expect(convertAll("shellyWS90Wind", {windSpeed: 123}).wind_speed).toBe(12.3);
    });
});
