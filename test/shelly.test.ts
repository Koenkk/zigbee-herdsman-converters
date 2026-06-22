import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {DefinitionExposesFunction} from "../src/lib/types";
import {mockDevice} from "./utils";

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
