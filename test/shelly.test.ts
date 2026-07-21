import assert from "node:assert";
import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {DefinitionExposesFunction, Expose, Fz, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

const getFeatureNames = (expose: Expose): string[] => {
    return "features" in expose && expose.features ? expose.features.map((feature) => feature.name) : [];
};

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

    it("falls back to all possible zone endpoints until the device config is read", async () => {
        const device = mockShellyPresence();
        const definition = await findByDevice(device);

        expect(definition.model).toBe("S4SN-0U61X");
        expect(occupancyEndpoints(definition, device)).toStrictEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
    });

    it("uses the persisted PresenceZone count for occupancy exposes", async () => {
        const device = mockShellyPresence();
        device.meta.presence_zone_count = 2;
        const definition = await findByDevice(device);

        expect(occupancyEndpoints(definition, device)).toStrictEqual(["1", "2"]);
    });

    it("persists the PresenceZone count from Shelly.GetConfig during configure", async () => {
        const response = JSON.stringify({
            id: 1,
            result: {
                presence: {main_zone: "presencezone:200"},
                "presencezone:200": {id: 200, name: "Room"},
                "presencezone:201": {id: 201, name: "Desk"},
                "presencezone:202": {id: 202, name: "Door"},
            },
        });
        const read = vi.fn((cluster: string, attributes: string[]) => {
            if (cluster === "shellyRPCCluster" && attributes.includes("rxCtl")) return Promise.resolve({rxCtl: response.length});
            if (cluster === "shellyRPCCluster" && attributes.includes("data")) return Promise.resolve({data: response});
            return Promise.resolve({});
        });
        const device = mockShellyPresence(read);
        const save = vi.spyOn(device, "save").mockImplementation(() => {});
        const definition = await findByDevice(device);

        await definition.configure?.(device, mockShellyPresence().getEndpoint(1), definition);

        expect(device.meta.presence_zone_count).toBe(3);
        expect(save).toHaveBeenCalledTimes(1);
        expect(device.getEndpoint(239).write).toHaveBeenCalledWith(
            "shellyRPCCluster",
            {data: expect.stringContaining("Shelly.GetConfig")},
            expect.any(Object),
        );
        expect(occupancyEndpoints(definition, device)).toStrictEqual(["1", "2", "3"]);
    });
});
