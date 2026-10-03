import {beforeEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, Fz, KeyValue, Tz, Zh} from "../src/lib/types";
import {mockDevice} from "./utils";

describe.each([false, true])("Gledopto GL-C-008-2ID (endpoint 12 present: %s)", (hasEndpoint12) => {
    let device: Zh.Device;
    let definition: Definition;

    beforeEach(async () => {
        const lightClusters = [0, 3, 4, 5, 6, 8, 768];
        device = mockDevice({
            modelID: "GL-C-007",
            manufacturerName: "GLEDOPTO",
            endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusterIDs: lightClusters},
                ...(hasEndpoint12 ? [{ID: 12, profileID: 260, deviceID: 258, inputClusterIDs: lightClusters}] : []),
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusterIDs: [4096], outputClusterIDs: [4096]},
                {ID: 15, profileID: 49246, deviceID: hasEndpoint12 ? 256 : 544, inputClusterIDs: lightClusters},
            ],
        });
        definition = await findByDevice(device);
        expect(definition.model).toBe("GL-C-008-2ID");
    });

    function convert(endpointID: number, cluster: string, type: "readResponse" | "attributeReport", data: KeyValue) {
        const converter = definition.fromZigbee.find((candidate) => candidate.cluster === cluster && candidate.type.includes(type));
        expect(converter).toBeDefined();
        const message = {
            endpoint: device.getEndpoint(endpointID),
            device,
            cluster,
            type,
            data,
            meta: {rawData: Buffer.alloc(0)},
            groupID: 0,
            linkquality: 100,
        };
        const meta: Fz.Meta = {device, state: {}, deviceExposesChanged: vi.fn()};
        return converter.convert(definition, message, vi.fn(), {color_sync: false}, meta);
    }

    function commandMeta(endpointName: string, message: KeyValue): Tz.Meta {
        return {
            device,
            mapped: definition,
            endpoint_name: endpointName,
            message,
            state: {},
            options: {},
            publish: vi.fn(),
            deviceExposesChanged: vi.fn(),
        };
    }

    it("exposes only the separate RGB and CCT lights", () => {
        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;
        const lights = exposes.filter((expose) => expose.type === "light");
        expect(lights.map((light) => light.endpoint)).toEqual(["rgb", "cct"]);
        expect(lights[0].features.map((feature) => feature.property)).toEqual(["state_rgb", "brightness_rgb", "color_rgb"]);
        expect(lights[1].features.map((feature) => feature.property)).toEqual(["state_cct", "brightness_cct", "color_temp_cct"]);
        expect(lights[1].features.find((feature) => feature.property === "color_temp_cct")).toMatchObject({value_min: 158, value_max: 495});
    });

    it.each(["readResponse", "attributeReport"] as const)("keeps channel states independent for %s", async (type) => {
        for (const [endpointName, endpointID] of [
            ["rgb", 11],
            ["cct", 15],
        ] as const) {
            for (const onOff of [0, 1]) {
                const expected = {[`state_${endpointName}`]: onOff ? "ON" : "OFF"};
                const result = await convert(endpointID, "genOnOff", type, {onOff});
                expect(result).toEqual(expected);
            }
        }
    });

    it.each(["readResponse", "attributeReport"] as const)("keeps brightness and color readbacks on their channel for %s", async (type) => {
        expect(await convert(11, "genLevelCtrl", type, {currentLevel: 123})).toEqual({brightness_rgb: 123});
        expect(await convert(15, "genLevelCtrl", type, {currentLevel: 210})).toEqual({brightness_cct: 210});
        expect(await convert(11, "lightingColorCtrl", type, {currentX: 32768, currentY: 16384})).toEqual({color_rgb: {x: 0.5, y: 0.25}});
        expect(await convert(15, "lightingColorCtrl", type, {colorTemperature: 300})).toEqual({color_temp_cct: 300});
    });

    it.each([
        ["rgb", 11],
        ["cct", 15],
    ] as const)("preserves OFF commands and transition scaling for %s", async (endpointName, endpointID) => {
        const converter = definition.toZigbee.find((candidate) => candidate.key.includes("state") && candidate.endpoints?.includes(endpointName));
        expect(converter).toBeDefined();
        const endpoint = device.getEndpoint(endpointID);
        await converter.convertSet(endpoint, "state", "OFF", commandMeta(endpointName, {state: "OFF"}));
        expect(endpoint.command).toHaveBeenCalledExactlyOnceWith("genOnOff", "off", {}, {disableDefaultResponse: hasEndpoint12});

        await converter.convertGet(endpoint, "state", commandMeta(endpointName, {}));
        expect(endpoint.read).toHaveBeenCalledWith("genOnOff", ["onOff"]);

        await converter.convertSet(endpoint, "brightness", 123, commandMeta(endpointName, {brightness: 123, transition: 1}));
        expect(endpoint.command).toHaveBeenLastCalledWith(
            "genLevelCtrl",
            "moveToLevelWithOnOff",
            {level: 123, transtime: 33, optionsMask: 0, optionsOverride: 0},
            {disableDefaultResponse: hasEndpoint12},
        );
    });

    it("preserves the RGB transition and power-on behavior when setting color", async () => {
        const converter = definition.toZigbee.find((candidate) => candidate.key.includes("color") && candidate.endpoints?.includes("rgb"));
        expect(converter).toBeDefined();
        const endpoint = device.getEndpoint(11);
        const color = {x: 0.5, y: 0.25};
        const result = await converter.convertSet(endpoint, "color", color, commandMeta("rgb", {color}));
        expect(result).toMatchObject({state: {state: "ON"}});
        expect(endpoint.command).toHaveBeenCalledExactlyOnceWith(
            "lightingColorCtrl",
            "moveToColor",
            expect.objectContaining({colorx: 32768, colory: 16384, transtime: 4}),
            {disableDefaultResponse: hasEndpoint12},
        );
    });

    it("preserves transition scaling and power-on behavior when setting color temperature", async () => {
        const converter = definition.toZigbee.find((candidate) => candidate.key.includes("color_temp") && candidate.endpoints?.includes("cct"));
        expect(converter).toBeDefined();
        const endpoint = device.getEndpoint(15);
        const result = await converter.convertSet(endpoint, "color_temp", 300, commandMeta("cct", {color_temp: 300, transition: 1}));
        expect(result).toMatchObject({state: {state: "ON", color_temp: 300}});
        expect(endpoint.command).toHaveBeenCalledExactlyOnceWith(
            "lightingColorCtrl",
            "moveToColorTemp",
            expect.objectContaining({colortemp: 300, transtime: 33}),
            {disableDefaultResponse: hasEndpoint12},
        );
    });
});
