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

    it("reads two-channel switch mode through the Shelly RPC endpoint", async () => {
        const response = JSON.stringify({id: 1, result: {id: 1, in_mode: "detached"}});
        const read = vi.fn().mockResolvedValueOnce({rxCtl: response.length}).mockResolvedValueOnce({data: response});
        const device = mockShelly2PMCoverWithInputs(read);
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((converter) => converter.key.includes("switch_mode")) as Tz.Converter;
        const publish = vi.fn();

        await converter.convertGet?.(device.getEndpoint(3), "switch_mode", {endpoint_name: "sw2", message: {}, publish} as never);

        expect(device.getEndpoint(239).write).toHaveBeenCalledWith(
            "shellyRPCCluster",
            {data: expect.stringContaining("Switch.GetConfig")},
            expect.any(Object),
        );
        expect(read).toHaveBeenCalledWith("shellyRPCCluster", ["rxCtl"], expect.any(Object));
        expect(read).toHaveBeenCalledWith("shellyRPCCluster", ["data"], expect.any(Object));
        expect(device.getEndpoint(3).write).not.toHaveBeenCalled();
        expect(device.getEndpoint(3).read).not.toHaveBeenCalled();
        expect(publish).toHaveBeenCalledWith({switch_mode_sw2: "detached"});
    });

    it("exposes lift-only covers by default and opt-in tilt controls", async () => {
        const device = mockShelly2PMCover();
        const definition = await findByDevice(device);
        expect(definition.model).toBe("S4SW-002P16EU-COVER");
        expect(typeof definition.exposes).toBe("function");
        const exposes = definition.exposes as DefinitionExposesFunction;

        const defaultCover = exposes(device, {}).find((expose) => expose.type === "cover");
        const tiltCover = exposes(device, {cover_tilt_enabled: "true"}).find((expose) => expose.type === "cover");
        device.meta.cover_tilt_enabled = true;
        const autoDetectedTiltCover = exposes(device, {cover_tilt_enabled: "auto"}).find((expose) => expose.type === "cover");
        assert(defaultCover);
        assert(tiltCover);
        assert(autoDetectedTiltCover);

        expect(getFeatureNames(defaultCover)).toContain("position");
        expect(getFeatureNames(defaultCover)).not.toContain("tilt");
        expect(getFeatureNames(tiltCover)).toContain("position");
        expect(getFeatureNames(tiltCover)).toContain("tilt");
        expect(getFeatureNames(autoDetectedTiltCover)).toContain("tilt");
        expect(definition.options?.some((option) => option.name === "cover_tilt_enabled")).toBe(true);
    });

    it("persists Shelly slat control from Cover.GetConfig during configure", async () => {
        const response = JSON.stringify({id: 1, result: {id: 0, slat: {enable: true}}});
        const read = vi
            .fn()
            .mockResolvedValueOnce({rxCtl: 0})
            .mockResolvedValueOnce({rxCtl: 0})
            .mockResolvedValueOnce({rxCtl: response.length})
            .mockResolvedValueOnce({data: response});
        const device = mockShelly2PMCover(read);
        const save = vi.spyOn(device, "save").mockImplementation(() => {});
        const definition = await findByDevice(device);

        await definition.configure?.(device, mockShelly2PMCover().getEndpoint(1), definition);

        expect(device.meta.cover_tilt_enabled).toBe(true);
        expect(save).toHaveBeenCalledTimes(1);
        expect(read).toHaveBeenCalledWith("shellyRPCCluster", ["rxCtl"], expect.any(Object));
        expect(read).toHaveBeenCalledWith("shellyRPCCluster", ["data"], expect.any(Object));
        expect(device.getEndpoint(239).write).toHaveBeenCalledWith(
            "shellyRPCCluster",
            {data: expect.stringContaining("Cover.GetConfig")},
            expect.any(Object),
        );
    });

    it("persists Shelly slat control from Cover.GetConfig params during configure", async () => {
        const response = JSON.stringify({id: 1, params: {id: 0, slat: {enable: true}}});
        const read = vi
            .fn()
            .mockResolvedValueOnce({rxCtl: 0})
            .mockResolvedValueOnce({rxCtl: 0})
            .mockResolvedValueOnce({rxCtl: response.length})
            .mockResolvedValueOnce({data: response});
        const device = mockShelly2PMCover(read);
        const save = vi.spyOn(device, "save").mockImplementation(() => {});
        const definition = await findByDevice(device);

        await definition.configure?.(device, mockShelly2PMCover().getEndpoint(1), definition);

        expect(device.meta.cover_tilt_enabled).toBe(true);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("overwrites stale persisted slat control from Cover.GetConfig during configure", async () => {
        const response = JSON.stringify({id: 1, result: {id: 0, slat: {enable: false}}});
        const read = vi
            .fn()
            .mockResolvedValueOnce({rxCtl: 0})
            .mockResolvedValueOnce({rxCtl: 0})
            .mockResolvedValueOnce({rxCtl: response.length})
            .mockResolvedValueOnce({data: response});
        const device = mockShelly2PMCover(read);
        device.meta.cover_tilt_enabled = true;
        const save = vi.spyOn(device, "save").mockImplementation(() => {});
        const definition = await findByDevice(device);

        await definition.configure?.(device, mockShelly2PMCover().getEndpoint(1), definition);

        expect(device.meta.cover_tilt_enabled).toBe(false);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("leaves persisted slat control unchanged when Cover.GetConfig has no boolean slat flag", async () => {
        const response = JSON.stringify({id: 1, result: {id: 0}});
        const read = vi
            .fn()
            .mockResolvedValueOnce({rxCtl: 0})
            .mockResolvedValueOnce({rxCtl: 0})
            .mockResolvedValueOnce({rxCtl: response.length})
            .mockResolvedValueOnce({data: response});
        const device = mockShelly2PMCover(read);
        device.meta.cover_tilt_enabled = true;
        const save = vi.spyOn(device, "save").mockImplementation(() => {});
        const definition = await findByDevice(device);

        await definition.configure?.(device, mockShelly2PMCover().getEndpoint(1), definition);

        expect(device.meta.cover_tilt_enabled).toBe(true);
        expect(save).not.toHaveBeenCalled();
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

    it("publishes full Shelly Wi-Fi config through RPC before falling back to setup-cluster reads", async () => {
        const configResponse = JSON.stringify({
            id: 1,
            result: {
                sta: {
                    enable: true,
                    ssid: "The Internet of Shitty Things",
                    ipv4mode: "dhcp",
                    ip: null,
                    netmask: null,
                    gw: null,
                    nameserver: null,
                },
            },
        });
        const statusResponse = JSON.stringify({
            id: 1,
            result: {
                status: "got ip",
                sta_ip: "192.168.1.230",
                ssid: "The Internet of Shitty Things",
            },
        });
        const responses = [configResponse, statusResponse];
        let responseIndex = 0;
        let currentResponse = "";
        const read = vi.fn((cluster: string, attributes: string[]) => {
            if (cluster === "shellyRPCCluster" && attributes.includes("rxCtl")) {
                currentResponse = responses[responseIndex++];
                return Promise.resolve({rxCtl: currentResponse.length});
            }
            if (cluster === "shellyRPCCluster" && attributes.includes("data")) return Promise.resolve({data: currentResponse});
            return Promise.resolve({});
        });
        const publish = vi.fn();
        const device = mockShelly2PMCover(read);
        const definition = await findByDevice(device);
        const converter = definition.toZigbee?.find((c) => c.key.includes("wifi_config"));
        assert(converter?.convertGet);

        await converter.convertGet(device.getEndpoint(239), "wifi_config", {
            device,
            state: {},
            publish,
        } as unknown as Tz.Meta);

        expect(publish).toHaveBeenCalledWith({
            dhcp_enabled: true,
            ip_address: "192.168.1.230",
            wifi_config: {
                enabled: true,
                ssid: "The Internet of Shitty Things",
            },
            wifi_status: "got ip",
        });
        expect(device.meta.shelly_wifi_ssid).toBe("The Internet of Shitty Things");
        expect(device.getEndpoint(239).write).toHaveBeenCalledWith(
            "shellyRPCCluster",
            {data: expect.stringContaining("Wifi.GetConfig")},
            expect.any(Object),
        );
        expect(device.getEndpoint(239).write).toHaveBeenCalledWith(
            "shellyRPCCluster",
            {data: expect.stringContaining("Wifi.GetStatus")},
            expect.any(Object),
        );
        expect(read).not.toHaveBeenCalledWith("shellyWiFiSetupCluster", ["status", "ip", "enabled", "dhcp", "ssid"], expect.any(Object));
    });

    it("uses a long Shelly RPC data read timeout so delayed chunks do not advance unread", async () => {
        const configResponse = JSON.stringify({
            id: 1,
            result: {
                sta: {
                    enable: true,
                    ssid: "The Internet of Shitty Things",
                    ipv4mode: "dhcp",
                },
            },
        });
        const statusResponse = JSON.stringify({
            id: 1,
            result: {
                status: "got ip",
                sta_ip: "192.168.1.230",
            },
        });
        const responses = [configResponse, statusResponse];
        let currentResponse = "";
        let chunks: string[] = [];
        const read = vi.fn((cluster: string, attributes: string[]) => {
            if (cluster === "shellyRPCCluster" && attributes.includes("rxCtl")) {
                currentResponse = responses.shift() ?? "";
                chunks = [currentResponse.slice(0, 20), currentResponse.slice(20)];
                return Promise.resolve({rxCtl: currentResponse.length});
            }
            if (cluster === "shellyRPCCluster" && attributes.includes("data")) {
                return Promise.resolve({data: chunks.shift()});
            }
            return Promise.resolve({});
        });
        const publish = vi.fn();
        const device = mockShelly2PMCover(read);
        const definition = await findByDevice(device);
        const converter = definition.toZigbee?.find((c) => c.key.includes("wifi_config"));
        assert(converter?.convertGet);

        await converter.convertGet(device.getEndpoint(239), "wifi_config", {
            device,
            state: {},
            publish,
        } as unknown as Tz.Meta);

        expect(publish).toHaveBeenCalledWith({
            dhcp_enabled: true,
            ip_address: "192.168.1.230",
            wifi_config: {
                enabled: true,
                ssid: "The Internet of Shitty Things",
            },
            wifi_status: "got ip",
        });
        expect(read).toHaveBeenCalledWith("shellyRPCCluster", ["data"], expect.objectContaining({timeout: 10000}));
        expect(read.mock.calls.filter(([cluster, attributes]) => cluster === "shellyRPCCluster" && attributes.includes("data"))).toHaveLength(4);
        expect(read).not.toHaveBeenCalledWith("shellyWiFiSetupCluster", ["status", "ip", "enabled", "dhcp", "ssid"], expect.any(Object));
    });

    it("publishes the configured full Shelly Wi-Fi SSID when RPC readback fails", async () => {
        const read = vi.fn((cluster: string, attributes: string[]) => {
            if (cluster === "shellyRPCCluster" && attributes.includes("rxCtl")) throw new Error("RPC unavailable");
            return Promise.resolve({});
        });
        const publish = vi.fn();
        const device = mockShelly2PMCover(read);
        const definition = await findByDevice(device);
        const converter = definition.toZigbee?.find((c) => c.key.includes("wifi_config"));
        assert(converter?.convertGet);

        await converter.convertGet(device.getEndpoint(239), "wifi_config", {
            device,
            options: {shelly_wifi_ssid: "The Internet of Shitty Things"},
            state: {},
            publish,
        } as unknown as Tz.Meta);

        expect(publish).toHaveBeenCalledWith({
            wifi_config: {
                ssid: "The Internet of Shitty Things",
            },
        });
        expect(read).not.toHaveBeenCalledWith("shellyWiFiSetupCluster", ["status", "ip", "enabled", "dhcp", "ssid"], expect.any(Object));
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
