import assert from "node:assert";
import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {DefinitionExposesFunction, Expose} from "../src/lib/types";
import {mockDevice} from "./utils";

const getFeatureNames = (expose: Expose): string[] => {
    return "features" in expose ? expose.features.map((feature) => feature.name) : [];
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
