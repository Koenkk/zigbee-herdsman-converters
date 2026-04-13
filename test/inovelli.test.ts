import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, Expose, Fz, KeyValue, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

function processFromZigbeeMessage(definition: Definition, cluster: string, type: string, data: KeyValue | number[], endpointID: number) {
    const converters = definition.fromZigbee.filter((c) => {
        const typeMatch = Array.isArray(c.type) ? c.type.includes(type) : c.type === type;
        return c.cluster === cluster && typeMatch;
    });

    let payload: KeyValue = {};
    for (const converter of converters) {
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        const msg: Fz.Message<any, any, any> = {
            data,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            endpoint: {ID: endpointID} as any,
            device: null,
            meta: null,
            groupID: 0,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            type: type as any,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            cluster: cluster as any,
            linkquality: 0,
        };
        const converted = converter.convert(definition, msg, () => {}, {}, {state: {}, device: null, deviceExposesChanged: () => {}});
        if (converted) {
            payload = {...payload, ...converted};
        }
    }
    return payload;
}

function findTzConverter(definition: Definition, key: string): Tz.Converter {
    const converter = definition.toZigbee.find((c) => c.key.includes(key));
    expect(converter, `toZigbee converter for key "${key}" not found`).toBeDefined();
    return converter as Tz.Converter;
}

function buildMeta(device: ReturnType<typeof mockDevice>, overrides?: Partial<Tz.Meta>): Tz.Meta {
    return {
        state: {},
        device,
        message: {} as KeyValueAny,
        mapped: {} as Definition,
        options: {},
        endpoint_name: undefined,
        ...overrides,
    } as Tz.Meta;
}

async function setupVZM30(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM30-SN",
        endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}, {ID: 4}],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

async function setupVZM31(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM31-SN",
        endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

async function setupVZM32(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM32-SN",
        endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

async function setupVZM35(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM35-SN",
        endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

async function setupVZM36(softwareBuildID?: string) {
    const device = mockDevice({
        modelID: "VZM36",
        endpoints: [
            {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
            {ID: 2, inputClusters: ["genOnOff", "genLevelCtrl"]},
        ],
        softwareBuildID,
    });
    const definition = await findByDevice(device);
    return {device, definition};
}

describe("Inovelli toZigbee converters", () => {
    describe("inovelli_parameters (write + get)", () => {
        it("convertSet for an enum attribute should write mapped numeric value", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "switchType");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {switchType: "3-Way Dumb Switch"}});

            const result = await converter.convertSet(endpoint, "switchType", "3-Way Dumb Switch", meta);

            expect(endpoint.write).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                {22: {value: 1, type: expect.any(Number)}},
                {manufacturerCode: 0x122f},
            );
            expect(result).toStrictEqual({state: {switchType: "3-Way Dumb Switch"}});
        });

        it("convertSet for a numeric attribute should write raw numeric value", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {dimmingSpeedUpRemote: 50}});

            const result = await converter.convertSet(endpoint, "dimmingSpeedUpRemote", 50, meta);

            expect(endpoint.write).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                {1: {value: 50, type: expect.any(Number)}},
                {manufacturerCode: 0x122f},
            );
            expect(result).toStrictEqual({state: {dimmingSpeedUpRemote: 50}});
        });

        it("convertGet should read from the cluster with manufacturer code", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(endpoint, "dimmingSpeedUpRemote", meta);

            expect(endpoint.read).toHaveBeenCalledWith("manuSpecificInovelli", ["dimmingSpeedUpRemote"], {manufacturerCode: 0x122f});
        });

        it("convertSet should return undefined for unknown key", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {nonExistentKey: 42}});

            const result = await converter.convertSet(endpoint, "nonExistentKey", 42, meta);
            expect(result).toBeUndefined();
        });
    });

    describe("VZM36 endpoint resolution", () => {
        it("convertSet with suffixed key should write to the correct endpoint", async () => {
            const {device, definition} = await setupVZM36();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote_2");
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            // biome-ignore lint/style/useNamingConvention: matches device attribute key format
            const meta = buildMeta(device, {mapped: definition, message: {dimmingSpeedUpRemote_2: 25}});

            await converter.convertSet(ep1, "dimmingSpeedUpRemote_2", 25, meta);

            expect(ep2.write).toHaveBeenCalledWith("manuSpecificInovelli", {1: {value: 25, type: expect.any(Number)}}, {manufacturerCode: 0x122f});
            expect(ep1.write).not.toHaveBeenCalled();
        });

        it("convertGet with suffixed key should read from the correct endpoint", async () => {
            const {device, definition} = await setupVZM36();
            const converter = findTzConverter(definition, "dimmingSpeedUpRemote_2");
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(ep1, "dimmingSpeedUpRemote_2", meta);

            expect(ep2.read).toHaveBeenCalledWith("manuSpecificInovelli", ["dimmingSpeedUpRemote"], {manufacturerCode: 0x122f});
            expect(ep1.read).not.toHaveBeenCalled();
        });
    });

    describe("inovelli_parameters_readOnly", () => {
        it("convertGet should read from cluster with manufacturer code", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "internalTemperature");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(endpoint, "internalTemperature", meta);

            expect(endpoint.read).toHaveBeenCalledWith("manuSpecificInovelli", ["internalTemperature"], {manufacturerCode: 0x122f});
        });

        it("converter should not have convertSet", async () => {
            const {definition} = await setupVZM31();
            const converter = findTzConverter(definition, "internalTemperature");
            expect(converter.convertSet).toBeUndefined();
        });
    });

    describe("LED effect commands", () => {
        it("inovelli_led_effect should send ledEffect command with correct params", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {effect: "chase", color: 100, level: 80, duration: 30};
            const meta = buildMeta(device, {mapped: definition, message: {led_effect: values}});

            const result = await converter.convertSet(endpoint, "led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "ledEffect",
                {effect: 5, color: 100, level: 80, duration: 30},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({state: {led_effect: values}});
        });

        it("inovelli_led_effect should clamp values", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {effect: "solid", color: 300, level: 200, duration: 999};
            const meta = buildMeta(device, {mapped: definition, message: {led_effect: values}});

            await converter.convertSet(endpoint, "led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "ledEffect",
                {effect: 1, color: 255, level: 100, duration: 255},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });

        it("inovelli_individual_led_effect should convert 1-based to 0-based LED number", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "individual_led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {led: "1", effect: "solid", color: 50, level: 50, duration: 10};
            const meta = buildMeta(device, {mapped: definition, message: {individual_led_effect: values}});

            const result = await converter.convertSet(endpoint, "individual_led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "individualLedEffect",
                {led: 0, effect: 1, color: 50, level: 50, duration: 10},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({state: {individual_led_effect: values}});
        });

        it("inovelli_individual_led_effect LED 7 -> sent as 6", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "individual_led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {led: "7", effect: "pulse", color: 200, level: 100, duration: 255};
            const meta = buildMeta(device, {mapped: definition, message: {individual_led_effect: values}});

            await converter.convertSet(endpoint, "individual_led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "individualLedEffect",
                {led: 6, effect: 4, color: 200, level: 100, duration: 255},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });

        it("inovelli_individual_led_effect should clamp values", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "individual_led_effect");
            const endpoint = device.getEndpoint(1);
            const values = {led: "99", effect: "off", color: 500, level: 300, duration: 999};
            const meta = buildMeta(device, {mapped: definition, message: {individual_led_effect: values}});

            await converter.convertSet(endpoint, "individual_led_effect", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "individualLedEffect",
                {led: 6, effect: 0, color: 255, level: 100, duration: 255},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });
    });

    describe("energy_reset", () => {
        it("should send energyReset command with empty payload", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "energy_reset");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {energy_reset: ""}});

            await converter.convertSet(endpoint, "energy_reset", "", meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelli",
                "energyReset",
                {},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });
    });

    describe("light_onoff_brightness_inovelli", () => {
        it("off with no transition -> delegates to on_off path", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "OFF"}, state: {state: "ON"}});

            await converter.convertSet(endpoint, "state", "OFF", meta);

            expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "off", {}, expect.any(Object));
        });

        it("toggle with no transition -> uses on_off path", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "toggle"}, state: {state: "ON"}});

            const result = await converter.convertSet(endpoint, "state", "toggle", meta);

            expect(endpoint.command).toHaveBeenCalledWith("genOnOff", "toggle", {}, expect.any(Object));
            expect(result).toStrictEqual({state: {state: "OFF"}});
        });

        it("on with brightness + no transition -> uses 0xffff transtime", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "ON", brightness: 128}, state: {}});

            await converter.convertSet(endpoint, "state", "ON", meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                expect.objectContaining({level: 128, transtime: 0xffff}),
                expect.any(Object),
            );
        });

        it("on with explicit transition -> uses that transition value", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "ON", brightness: 200, transition: 2}, state: {}});

            await converter.convertSet(endpoint, "state", "ON", meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                expect.objectContaining({level: 200, transtime: 20}),
                expect.any(Object),
            );
        });

        it("on with no brightness and no transition -> uses on_off path", async () => {
            const {device, definition} = await setupVZM31();
            const converter = findTzConverter(definition, "state");
            const endpoint = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {state: "ON"}, state: {}});

            await converter.convertSet(endpoint, "state", "ON", meta);

            expect(endpoint.command).toHaveBeenCalledWith("genOnOff", expect.any(String), expect.any(Object), expect.any(Object));
        });
    });

    describe("fan_mode toZigbee (VZM35-SN)", () => {
        it("should send moveToLevelWithOnOff with correct level for low", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_mode");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {fan_mode: "low"}, state: {}});

            const result = await converter.convertSet(ep1, "fan_mode", "low", meta);

            expect(ep1.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                {level: 2, transtime: 0xffff, optionsMask: 0, optionsOverride: 0},
                expect.any(Object),
            );
            expect(result).toStrictEqual({state: {fan_mode: "low", state: "ON"}});
        });

        it("should send correct level for medium", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_mode");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {fan_mode: "medium"}, state: {}});

            const result = await converter.convertSet(ep1, "fan_mode", "medium", meta);

            expect(ep1.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                {level: 86, transtime: 0xffff, optionsMask: 0, optionsOverride: 0},
                expect.any(Object),
            );
            expect(result).toStrictEqual({state: {fan_mode: "medium", state: "ON"}});
        });

        it("should send correct level for high", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_mode");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {fan_mode: "high"}, state: {}});

            await converter.convertSet(ep1, "fan_mode", "high", meta);

            expect(ep1.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                {level: 170, transtime: 0xffff, optionsMask: 0, optionsOverride: 0},
                expect.any(Object),
            );
        });

        it("convertGet should read currentLevel from the correct endpoint", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_mode");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(ep1, "fan_mode", meta);

            expect(ep1.read).toHaveBeenCalledWith("genLevelCtrl", ["currentLevel"]);
        });
    });

    describe("fan_mode toZigbee (VZM36 EP2)", () => {
        it("should return fan_state ON when endpointId is 2", async () => {
            const {device, definition} = await setupVZM36();
            const converter = findTzConverter(definition, "fan_mode");
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            const meta = buildMeta(device, {mapped: definition, message: {fan_mode: "low"}, state: {}});

            const result = await converter.convertSet(ep1, "fan_mode", "low", meta);

            expect(ep2.command).toHaveBeenCalledWith(
                "genLevelCtrl",
                "moveToLevelWithOnOff",
                {level: 2, transtime: 0xffff, optionsMask: 0, optionsOverride: 0},
                expect.any(Object),
            );
            expect(result).toStrictEqual({state: {fan_mode: "low", fan_state: "ON"}});
        });
    });

    describe("fan_state toZigbee (VZM35-SN)", () => {
        it("should delegate to on_off and remap state to fan_state", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_state");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {fan_state: "ON"}, state: {fan_state: "OFF"}});

            const result = await converter.convertSet(ep1, "fan_state", "ON", meta);

            expect(ep1.command).toHaveBeenCalledWith("genOnOff", "on", {}, expect.any(Object));
            expect(result).toStrictEqual({state: {fan_state: "ON"}});
        });

        it("should handle OFF state", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_state");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition, message: {fan_state: "OFF"}, state: {fan_state: "ON"}});

            const result = await converter.convertSet(ep1, "fan_state", "OFF", meta);

            expect(ep1.command).toHaveBeenCalledWith("genOnOff", "off", {}, expect.any(Object));
            expect(result).toStrictEqual({state: {fan_state: "OFF"}});
        });

        it("convertGet should read onOff", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "fan_state");
            const ep1 = device.getEndpoint(1);
            const meta = buildMeta(device, {mapped: definition});

            await converter.convertGet(ep1, "fan_state", meta);

            expect(ep1.read).toHaveBeenCalledWith("genOnOff", ["onOff"]);
        });
    });

    describe("breezeMode toZigbee (VZM35-SN)", () => {
        it("should encode full 5-speed config into packed integer", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "breezeMode");
            const ep1 = device.getEndpoint(1);
            const value = {
                speed1: "low",
                time1: 10,
                speed2: "medium",
                time2: 15,
                speed3: "high",
                time3: 20,
                speed4: "low",
                time4: 5,
                speed5: "medium",
                time5: 10,
            };
            const meta = buildMeta(device, {mapped: definition, message: {breezeMode: value}});

            const result = await converter.convertSet(ep1, "breezeMode", value, meta);

            expect(result).toStrictEqual({state: {breezeMode: value}});

            const expectedValue = 1 + 8 + 128 + 768 + 12288 + 65536 + 262144 + 1048576 + 33554432 + 134217728;
            expect(ep1.write).toHaveBeenCalledWith("manuSpecificInovelli", {breezeMode: expectedValue.toString()}, {manufacturerCode: 0x122f});
        });

        it("should terminate early when speed2 is off", async () => {
            const {device, definition} = await setupVZM35();
            const converter = findTzConverter(definition, "breezeMode");
            const ep1 = device.getEndpoint(1);
            const value = {
                speed1: "high",
                time1: 5,
                speed2: "off",
                time2: 0,
                speed3: "low",
                time3: 10,
                speed4: "medium",
                time4: 15,
                speed5: "high",
                time5: 20,
            };
            const meta = buildMeta(device, {mapped: definition, message: {breezeMode: value}});

            await converter.convertSet(ep1, "breezeMode", value, meta);

            const expectedValue = 3 + 4;
            expect(ep1.write).toHaveBeenCalledWith("manuSpecificInovelli", {breezeMode: expectedValue.toString()}, {manufacturerCode: 0x122f});
        });
    });

    describe("mmWave toZigbee (VZM32-SN)", () => {
        it("mmwave_control_commands should map reset_mmwave_module to controlID 0", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_control_commands");
            const endpoint = device.getEndpoint(1);
            const values = {controlID: "reset_mmwave_module"};
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_control_commands: values}});

            const result = await converter.convertSet(endpoint, "mmwave_control_commands", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "mmWaveControl",
                {controlID: 0},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({state: {mmwave_control_commands: values}});
        });

        it("mmwave_control_commands should map set_interference to controlID 1", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_control_commands");
            const endpoint = device.getEndpoint(1);
            const values = {controlID: "set_interference"};
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_control_commands: values}});

            await converter.convertSet(endpoint, "mmwave_control_commands", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "mmWaveControl",
                {controlID: 1},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });

        it("mmwave_control_commands should map query_areas to controlID 2", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_control_commands");
            const endpoint = device.getEndpoint(1);
            const values = {controlID: "query_areas"};
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_control_commands: values}});

            await converter.convertSet(endpoint, "mmwave_control_commands", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "mmWaveControl",
                {controlID: 2},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });

        it("mmwave_detection_areas should send setDetectionArea for each area", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_detection_areas");
            const endpoint = device.getEndpoint(1);
            const values = {
                area1: {width_min: -100, width_max: 100, depth_min: 0, depth_max: 500, height_min: -50, height_max: 200},
                area2: {width_min: -200, width_max: 200, depth_min: 50, depth_max: 600, height_min: 0, height_max: 300},
            };
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_detection_areas: values}});

            const result = await converter.convertSet(endpoint, "mmwave_detection_areas", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "setDetectionArea",
                {areaId: 0, xMin: -100, xMax: 100, yMin: 0, yMax: 500, zMin: -50, zMax: 200},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "setDetectionArea",
                {areaId: 1, xMin: -200, xMax: 200, yMin: 50, yMax: 600, zMin: 0, zMax: 300},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "mmWaveControl",
                {controlID: 2},
                {disableResponse: true, disableDefaultResponse: true},
            );
            expect(result).toStrictEqual({
                state: {mmwave_detection_areas: {area1: values.area1, area2: values.area2}},
            });
        });

        it("mmwave_interference_areas should send setInterferenceArea", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_interference_areas");
            const endpoint = device.getEndpoint(1);
            const values = {
                area3: {width_min: -300, width_max: 300, depth_min: 100, depth_max: 700, height_min: 10, height_max: 400},
            };
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_interference_areas: values}});

            await converter.convertSet(endpoint, "mmwave_interference_areas", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "setInterferenceArea",
                {areaId: 2, xMin: -300, xMax: 300, yMin: 100, yMax: 700, zMin: 10, zMax: 400},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });

        it("mmwave_stay_areas should send setStayArea", async () => {
            const {device, definition} = await setupVZM32();
            const converter = findTzConverter(definition, "mmwave_stay_areas");
            const endpoint = device.getEndpoint(1);
            const values = {
                area4: {width_min: 0, width_max: 150, depth_min: 0, depth_max: 250, height_min: 0, height_max: 100},
            };
            const meta = buildMeta(device, {mapped: definition, message: {mmwave_stay_areas: values}});

            await converter.convertSet(endpoint, "mmwave_stay_areas", values, meta);

            expect(endpoint.command).toHaveBeenCalledWith(
                "manuSpecificInovelliMMWave",
                "setStayArea",
                {areaId: 3, xMin: 0, xMax: 150, yMin: 0, yMax: 250, zMin: 0, zMax: 100},
                {disableResponse: true, disableDefaultResponse: true},
            );
        });
    });
});

describe("Inovelli VZM36", () => {
    let definition: Definition;

    it("should find definition", async () => {
        ({definition} = await setupVZM36());
        expect(definition.model).toBe("VZM36");
    });

    describe("genOnOff from endpoint 2 (fan)", () => {
        it("should set fan_state without affecting light state", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 2);
            expect(payload).toStrictEqual({fan_state: "ON"});
        });

        it("should not leak raw onOff data", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 2);
            expect(payload).not.toHaveProperty("onOff");
            expect(payload).toStrictEqual({fan_state: "OFF"});
        });
    });

    describe("genOnOff from endpoint 1 (light)", () => {
        it("should set light state without affecting fan_state", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 1);
            expect(payload).toStrictEqual({state: "ON"});
        });

        it("should not leak raw onOff data", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 1);
            expect(payload).not.toHaveProperty("onOff");
            expect(payload).toStrictEqual({state: "OFF"});
        });
    });

    describe("genLevelCtrl from endpoint 2 (fan)", () => {
        it("should set fan_mode without affecting light brightness", () => {
            const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 33}, 2);
            expect(payload).not.toHaveProperty("brightness");
            expect(payload).not.toHaveProperty("currentLevel");
            expect(payload).toHaveProperty("fan_mode");
        });
    });

    describe("genLevelCtrl from endpoint 1 (light)", () => {
        it("should set brightness without affecting fan_mode", () => {
            const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 200}, 1);
            expect(payload).not.toHaveProperty("fan_mode");
            expect(payload).not.toHaveProperty("currentLevel");
            expect(payload).toStrictEqual({brightness: 200});
        });
    });
});

function resolveExposes(definition: Definition, device: ReturnType<typeof mockDevice>): Expose[] {
    if (typeof definition.exposes === "function") {
        return definition.exposes(device, {});
    }
    return definition.exposes as Expose[];
}

function findExpose(exposes: Expose[], name: string): Expose | undefined {
    return exposes.find((exp) => exp.name === name);
}

function assertExpose(exposes: Expose[], name: string): Expose {
    const expose = exposes.find((exp) => exp.name === name);
    expect(expose).toBeDefined();
    return expose as Expose;
}

function getEnumValues(expose: Expose): (string | number)[] {
    expect(expose.type).toBe("enum");
    return (expose as {values: (string | number)[]} & Expose).values;
}

describe("Inovelli baseline exposes", () => {
    it("VZM30-SN should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM30();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "current",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "humidity",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "mediumLevelForFanControlMode",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
            "temperature",
            "voltage",
        ]);
    });

    it("VZM31-SN should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM31();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "autoTimerOff",
            "auxDetectionLevel",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingAlgorithm",
            "dimmingMode",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "dumbDetectionLevel",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "higherOutputInNonNeutral",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "powerType",
            "quickStartLevel",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "relayClick",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
        ]);
    });

    it("VZM32-SN should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM32();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "area1Occupancy",
            "area2Occupancy",
            "area3Occupancy",
            "area4Occupancy",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "current",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingMode",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "higherOutputInNonNeutral",
            "identify",
            "illuminance",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "mmWaveDepthMax",
            "mmWaveDepthMin",
            "mmWaveDetectSensitivity",
            "mmWaveDetectTrigger",
            "mmWaveHeightMax",
            "mmWaveHeightMin",
            "mmWaveHoldTime",
            "mmWaveRoomSizePreset",
            "mmWaveStayLife",
            "mmWaveTargetInfoReport",
            "mmWaveVersion",
            "mmWaveWidthMax",
            "mmWaveWidthMin",
            "mmwaveControlWiredDevice",
            "mmwave_control_commands",
            "mmwave_detection_areas",
            "mmwave_interference_areas",
            "mmwave_stay_areas",
            "mmwave_targets",
            "notificationComplete",
            "occupancy",
            "onOffLedMode",
            "otaImageType",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "powerType",
            "quickStartLevel",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
            "voltage",
        ]);
    });

    it("VZM35-SN should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM35();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "breeze mode",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "nonNeutralAuxLowGear",
            "nonNeutralAuxMediumGear",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "powerType",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
        ]);
    });

    it("VZM36 should expose all expected attributes", async () => {
        const {device, definition: def} = await setupVZM36();
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "autoTimerOff_1",
            "autoTimerOff_2",
            "breeze mode",
            "defaultLevelRemote_1",
            "defaultLevelRemote_2",
            "dimmingMode_1",
            "dimmingSpeedDownRemote_1",
            "dimmingSpeedDownRemote_2",
            "dimmingSpeedUpRemote_1",
            "dimmingSpeedUpRemote_2",
            "higherOutputInNonNeutral_1",
            "identify",
            "ledColorWhenOn_1",
            "ledIntensityWhenOn_1",
            "maximumLevel_1",
            "maximumLevel_2",
            "minimumLevel_1",
            "minimumLevel_2",
            "outputMode_1",
            "outputMode_2",
            "quickStartLevel_1",
            "quickStartTime_1",
            "quickStartTime_2",
            "rampRateOffToOnRemote_1",
            "rampRateOffToOnRemote_2",
            "rampRateOnToOffRemote_1",
            "rampRateOnToOffRemote_2",
            "smartBulbMode_1",
            "smartBulbMode_2",
            "stateAfterPowerRestored_1",
            "stateAfterPowerRestored_2",
        ]);
    });
});

describe("Inovelli firmware-gated exposes", () => {
    describe("VZM31-SN firmware below 3.0", () => {
        it("switchType should include Single-Pole Full Sine Wave", async () => {
            const {device, definition} = await setupVZM31("2.18");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).toContain("Single-Pole Full Sine Wave");
        });

        it("fanControlMode should not include Toggle", async () => {
            const {device, definition} = await setupVZM31("2.18");
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).not.toContain("Toggle");
        });

        it("dimmingAlgorithm should not be exposed", async () => {
            const {device, definition} = await setupVZM31("2.18");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
        });

        it("auxDetectionLevel should not be exposed", async () => {
            const {device, definition} = await setupVZM31("2.18");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });

        it("dumbDetectionLevel should not be exposed", async () => {
            const {device, definition} = await setupVZM31("2.18");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM31-SN firmware 3.0", () => {
        it("switchType should not include Single-Pole Full Sine Wave", async () => {
            const {device, definition} = await setupVZM31("3.0");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
        });

        it("fanControlMode should include Toggle", async () => {
            const {device, definition} = await setupVZM31("3.0");
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });

        it("dimmingAlgorithm should not be exposed (below 3.05)", async () => {
            const {device, definition} = await setupVZM31("3.0");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
        });

        it("auxDetectionLevel should not be exposed (below 3.05)", async () => {
            const {device, definition} = await setupVZM31("3.0");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });

        it("dumbDetectionLevel should not be exposed (below 3.07)", async () => {
            const {device, definition} = await setupVZM31("3.0");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM31-SN firmware 3.04 (between 3.0 and 3.05)", () => {
        it("switchType should not include Single-Pole Full Sine Wave", async () => {
            const {device, definition} = await setupVZM31("3.04");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
        });

        it("fanControlMode should include Toggle", async () => {
            const {device, definition} = await setupVZM31("3.04");
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });

        it("dimmingAlgorithm should not be exposed", async () => {
            const {device, definition} = await setupVZM31("3.04");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
        });

        it("auxDetectionLevel should not be exposed", async () => {
            const {device, definition} = await setupVZM31("3.04");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });

        it("dumbDetectionLevel should not be exposed (below 3.07)", async () => {
            const {device, definition} = await setupVZM31("3.04");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM31-SN firmware 3.05+", () => {
        it("switchType should not include Single-Pole Full Sine Wave", async () => {
            const {device, definition} = await setupVZM31("3.05");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
        });

        it("fanControlMode should include Toggle", async () => {
            const {device, definition} = await setupVZM31("3.05");
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });

        it("dimmingAlgorithm should be exposed", async () => {
            const {device, definition} = await setupVZM31("3.05");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeDefined();
        });

        it("auxDetectionLevel should be exposed", async () => {
            const {device, definition} = await setupVZM31("3.05");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "auxDetectionLevel")).toBeDefined();
        });

        it("dumbDetectionLevel should not be exposed (below 3.07)", async () => {
            const {device, definition} = await setupVZM31("3.05");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM31-SN firmware 3.07+", () => {
        it("dumbDetectionLevel should be exposed", async () => {
            const {device, definition} = await setupVZM31("3.07");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeDefined();
        });
    });

    describe("VZM31-SN with no firmware version", () => {
        it("should expose all attributes with all values", async () => {
            const {device, definition} = await setupVZM31();
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toContain("Single Pole");

            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");

            expect(findExpose(exposes, "dimmingAlgorithm")).toBeDefined();
            expect(findExpose(exposes, "auxDetectionLevel")).toBeDefined();
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeDefined();
        });
    });

    describe("VZM30-SN switchType never includes Single-Pole Full Sine Wave", () => {
        it("old firmware", async () => {
            const {device, definition} = await setupVZM30("2.18");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });

        it("new firmware", async () => {
            const {device, definition} = await setupVZM30("3.05");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });
    });

    describe("VZM30-SN fanControlMode Toggle is not firmware-gated", () => {
        it("should always include Toggle regardless of firmware", async () => {
            const {device, definition} = await setupVZM30("2.18");
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });
    });

    describe("VZM30-SN has no dimmingAlgorithm, auxDetectionLevel, or dumbDetectionLevel", () => {
        it("regardless of firmware version", async () => {
            const {device, definition} = await setupVZM30("3.05");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM32-SN switchType never includes Single-Pole Full Sine Wave", () => {
        it("old firmware", async () => {
            const {device, definition} = await setupVZM32("2.18");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });

        it("new firmware", async () => {
            const {device, definition} = await setupVZM32("3.05");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });
    });

    describe("VZM32-SN fanControlMode Toggle is not firmware-gated", () => {
        it("should always include Toggle regardless of firmware", async () => {
            const {device, definition} = await setupVZM32("2.18");
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });
    });

    describe("VZM32-SN dimmingAlgorithm, auxDetectionLevel, and dumbDetectionLevel are not available", () => {
        it("should not be exposed regardless of firmware", async () => {
            const {device, definition} = await setupVZM32("3.05");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM35-SN switchType always uses default values", () => {
        it("should only have Single Pole and Aux Switch", async () => {
            const {device, definition} = await setupVZM35("2.18");
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });
    });

    describe("VZM35-SN fanControlMode Toggle is not firmware-gated", () => {
        it("should always include Toggle regardless of firmware", async () => {
            const {device, definition} = await setupVZM35("2.18");
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });
    });

    describe("VZM35-SN has no dimmingAlgorithm, auxDetectionLevel, or dumbDetectionLevel", () => {
        it("regardless of firmware version", async () => {
            const {device, definition} = await setupVZM35("3.05");
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
            expect(findExpose(exposes, "dumbDetectionLevel")).toBeUndefined();
        });
    });
});

describe("Inovelli configure attribute filtering", () => {
    function patchDeviceForConfigure(device: ReturnType<typeof mockDevice>) {
        vi.spyOn(device, "save").mockImplementation(() => {});
        const defaults: Record<string, number> = {
            acPowerDivisor: 10,
            acPowerMultiplier: 1,
            divisor: 100,
            multiplier: 1,
        };
        for (const ep of device.endpoints) {
            vi.spyOn(ep, "save").mockImplementation(() => {});
            vi.spyOn(ep, "read").mockImplementation((cluster, attrs) => {
                const result: Record<string, number> = {};
                for (const attr of attrs as string[]) {
                    result[attr] = defaults[attr] ?? 0;
                }
                try {
                    ep.saveClusterAttributeKeyValue(cluster as string, result);
                } catch {
                    // Custom clusters (e.g. manuSpecificInovelli) may not be registered in Zcl
                }
                return Promise.resolve(result);
            });
        }
    }

    function collectReadAttributes(device: ReturnType<typeof mockDevice>): string[] {
        const allReadKeys: string[] = [];
        for (const ep of device.endpoints) {
            for (const call of (ep.read as ReturnType<typeof vi.fn>).mock.calls) {
                allReadKeys.push(...(call[1] as string[]));
            }
        }
        return allReadKeys;
    }

    async function runConfigure(device: ReturnType<typeof mockDevice>) {
        patchDeviceForConfigure(device);
        const definition = await findByDevice(device);
        const coordinatorEndpoint = device.getEndpoint(1);
        await definition.configure(device, coordinatorEndpoint, definition);
        return collectReadAttributes(device);
    }

    describe("VZM31-SN configure", () => {
        function createVZM31(softwareBuildID?: string) {
            return mockDevice({
                modelID: "VZM31-SN",
                endpoints: [
                    {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl", "haElectricalMeasurement", "seMetering"]},
                    {ID: 2, inputClusters: []},
                    {ID: 3, inputClusters: []},
                ],
                softwareBuildID,
            });
        }

        it("should not read dimmingAlgorithm, auxDetectionLevel, or dumbDetectionLevel on firmware below 3.05", async () => {
            const readKeys = await runConfigure(createVZM31("3.0"));
            expect(readKeys).not.toContain("dimmingAlgorithm");
            expect(readKeys).not.toContain("auxDetectionLevel");
            expect(readKeys).not.toContain("dumbDetectionLevel");
        });

        it("should read dimmingAlgorithm and auxDetectionLevel on firmware 3.05+", async () => {
            const readKeys = await runConfigure(createVZM31("3.05"));
            expect(readKeys).toContain("dimmingAlgorithm");
            expect(readKeys).toContain("auxDetectionLevel");
        });

        it("should not read dumbDetectionLevel on firmware 3.05 (below 3.07)", async () => {
            const readKeys = await runConfigure(createVZM31("3.05"));
            expect(readKeys).not.toContain("dumbDetectionLevel");
        });

        it("should read dumbDetectionLevel on firmware 3.07+", async () => {
            const readKeys = await runConfigure(createVZM31("3.07"));
            expect(readKeys).toContain("dumbDetectionLevel");
        });

        it("should read all attributes when firmware is unknown", async () => {
            const readKeys = await runConfigure(createVZM31());
            expect(readKeys).toContain("dimmingAlgorithm");
            expect(readKeys).toContain("auxDetectionLevel");
            expect(readKeys).toContain("dumbDetectionLevel");
            expect(readKeys).toContain("switchType");
            expect(readKeys).toContain("fanControlMode");
        });
    });

    describe("VZM32-SN configure", () => {
        function createVZM32(softwareBuildID?: string) {
            return mockDevice({
                modelID: "VZM32-SN",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: [
                            "genOnOff",
                            "genLevelCtrl",
                            "haElectricalMeasurement",
                            "seMetering",
                            "msIlluminanceMeasurement",
                            "msOccupancySensing",
                        ],
                    },
                    {ID: 2, inputClusters: []},
                    {ID: 3, inputClusters: []},
                ],
                softwareBuildID,
            });
        }

        it("should never read dimmingAlgorithm, auxDetectionLevel, or dumbDetectionLevel regardless of firmware", async () => {
            const readKeys = await runConfigure(createVZM32("3.05"));
            expect(readKeys).not.toContain("dimmingAlgorithm");
            expect(readKeys).not.toContain("auxDetectionLevel");
            expect(readKeys).not.toContain("dumbDetectionLevel");
        });

        it("should still read other common attributes", async () => {
            const readKeys = await runConfigure(createVZM32("3.05"));
            expect(readKeys).toContain("switchType");
            expect(readKeys).toContain("fanControlMode");
        });
    });

    describe("VZM30-SN configure", () => {
        it("should not read dimmingAlgorithm, auxDetectionLevel, or dumbDetectionLevel", async () => {
            const device = mockDevice({
                modelID: "VZM30-SN",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: [
                            "genOnOff",
                            "genLevelCtrl",
                            "haElectricalMeasurement",
                            "seMetering",
                            "msTemperatureMeasurement",
                            "msRelativeHumidity",
                        ],
                    },
                    {ID: 2, inputClusters: []},
                    {ID: 3, inputClusters: []},
                    {ID: 4, inputClusters: []},
                ],
                softwareBuildID: "3.05",
            });
            const readKeys = await runConfigure(device);
            expect(readKeys).not.toContain("dimmingAlgorithm");
            expect(readKeys).not.toContain("auxDetectionLevel");
            expect(readKeys).not.toContain("dumbDetectionLevel");
        });
    });
});

describe("Inovelli fromZigbee converters", () => {
    describe("VZM31-SN", () => {
        let definition: Definition;

        it("should find definition", async () => {
            const device = mockDevice({
                modelID: "VZM31-SN",
                endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}],
            });
            definition = await findByDevice(device);
            expect(definition.model).toBe("VZM31-SN");
        });

        describe("button scene actions (raw EP2)", () => {
            it("should parse down_single", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", [0, 0, 0, 0, 0x00, 1, 0], 2);
                expect(payload).toHaveProperty("action", "down_single");
            });

            it("should parse up_double", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", [0, 0, 0, 0, 0x00, 2, 3], 2);
                expect(payload).toHaveProperty("action", "up_double");
            });

            it("should parse config_held", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", [0, 0, 0, 0, 0x00, 3, 2], 2);
                expect(payload).toHaveProperty("action", "config_held");
            });

            it("should parse aux_down_quintuple", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", [0, 0, 0, 0, 0x00, 4, 6], 2);
                expect(payload).toHaveProperty("action", "aux_down_quintuple");
            });

            it("should parse aux_up_release", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", [0, 0, 0, 0, 0x00, 5, 1], 2);
                expect(payload).toHaveProperty("action", "aux_up_release");
            });

            it("should parse aux_config_triple", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", [0, 0, 0, 0, 0x00, 6, 4], 2);
                expect(payload).toHaveProperty("action", "aux_config_triple");
            });

            it("should not fire on endpoint 1", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", [0, 0, 0, 0, 0x00, 1, 0], 1);
                expect(payload).not.toHaveProperty("action");
            });

            it("should not fire when data[4] is not 0x00", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "raw", [0, 0, 0, 0, 0x01, 1, 0], 2);
                expect(payload).not.toHaveProperty("action");
            });
        });

        describe("custom cluster attribute reports with enum lookup", () => {
            it("should reverse-lookup enum value for switchType", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {switchType: 0}, 1);
                expect(payload).toHaveProperty("switchType", "Single Pole");
            });

            it("should reverse-lookup another switchType value", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "readResponse", {switchType: 2}, 1);
                expect(payload).toHaveProperty("switchType", "3-Way Aux Switch");
            });

            it("should reverse-lookup outputMode enum", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {outputMode: 1}, 1);
                expect(payload).toHaveProperty("outputMode", "On/Off");
            });

            it("should pass through numeric attribute values", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {dimmingSpeedUpRemote: 50}, 1);
                expect(payload).toHaveProperty("dimmingSpeedUpRemote", 50);
            });

            it("should handle readResponse the same as attributeReport for numeric values", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "readResponse", {dimmingSpeedUpRemote: 25}, 1);
                expect(payload).toHaveProperty("dimmingSpeedUpRemote", 25);
            });

            it("should handle multiple attributes in one message", () => {
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelli",
                    "attributeReport",
                    {switchType: 1, dimmingSpeedUpRemote: 42},
                    1,
                );
                expect(payload).toHaveProperty("switchType", "3-Way Dumb Switch");
                expect(payload).toHaveProperty("dimmingSpeedUpRemote", 42);
            });
        });

        describe("LED effect complete", () => {
            it("should map notificationType 0 to LED_1", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "commandLedEffectComplete", {notificationType: 0}, 1);
                expect(payload).toStrictEqual({notificationComplete: "LED_1"});
            });

            it("should map notificationType 3 to LED_4", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "commandLedEffectComplete", {notificationType: 3}, 1);
                expect(payload).toStrictEqual({notificationComplete: "LED_4"});
            });

            it("should map notificationType 6 to LED_7", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "commandLedEffectComplete", {notificationType: 6}, 1);
                expect(payload).toStrictEqual({notificationComplete: "LED_7"});
            });

            it("should map notificationType 16 to ALL_LEDS", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "commandLedEffectComplete", {notificationType: 16}, 1);
                expect(payload).toStrictEqual({notificationComplete: "ALL_LEDS"});
            });

            it("should map notificationType -1 to CONFIG_BUTTON_DOUBLE_PRESS", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "commandLedEffectComplete", {notificationType: -1}, 1);
                expect(payload).toStrictEqual({notificationComplete: "CONFIG_BUTTON_DOUBLE_PRESS"});
            });

            it("should return Unknown for unmapped notificationType", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "commandLedEffectComplete", {notificationType: 99}, 1);
                expect(payload).toStrictEqual({notificationComplete: "Unknown"});
            });
        });

        describe("brightness (EP1 only)", () => {
            it("should return brightness for EP1", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 200}, 1);
                expect(payload).toHaveProperty("brightness", 200);
            });

            it("should not return brightness for EP2", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 200}, 2);
                expect(payload).not.toHaveProperty("brightness");
            });
        });
    });

    describe("VZM35-SN fan converters", () => {
        let definition: Definition;

        it("should find definition", async () => {
            const device = mockDevice({
                modelID: "VZM35-SN",
                endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}],
            });
            definition = await findByDevice(device);
            expect(definition.model).toBe("VZM35-SN");
        });

        describe("fan_mode", () => {
            it("should map currentLevel 2 to low", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 2}, 1);
                expect(payload).toHaveProperty("fan_mode", "low");
            });

            it("should map currentLevel 86 to medium", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 86}, 1);
                expect(payload).toHaveProperty("fan_mode", "medium");
            });

            it("should map currentLevel 170 to high", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 170}, 1);
                expect(payload).toHaveProperty("fan_mode", "high");
            });

            it("should map currentLevel 255 to high", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 255}, 1);
                expect(payload).toHaveProperty("fan_mode", "high");
            });

            it("should map currentLevel 4 to smart", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 4}, 1);
                expect(payload).toHaveProperty("fan_mode", "smart");
            });

            it("should map currentLevel 0 to low (0 || 1 fallback)", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 0}, 1);
                expect(payload).toHaveProperty("fan_mode", "low");
            });

            it("should not fire on wrong endpoint", () => {
                const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 86}, 2);
                expect(payload).not.toHaveProperty("fan_mode");
            });
        });

        describe("fan_state", () => {
            it("should return fan_state ON for onOff=1", () => {
                const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 1);
                expect(payload).toHaveProperty("fan_state", "ON");
            });

            it("should return fan_state OFF for onOff=0", () => {
                const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 1);
                expect(payload).toHaveProperty("fan_state", "OFF");
            });

            it("should not fire on wrong endpoint", () => {
                const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 2);
                expect(payload).not.toHaveProperty("fan_state");
            });

            it("should return nothing when onOff is undefined", () => {
                const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {}, 1);
                expect(payload).not.toHaveProperty("fan_state");
            });
        });

        describe("breeze mode decoding", () => {
            it("should decode a known packed integer", () => {
                // Encoded: speed1=low(1) dur1=10s, speed2=medium(2) dur2=15s, speed3=high(3) dur3=20s,
                //          speed4=low(1) dur4=25s, speed5=off(0) dur5=0s
                const raw = 1 | (2 << 2) | (2 << 6) | (3 << 8) | (3 << 12) | (4 << 14) | (1 << 18) | (5 << 20);
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {breezeMode: raw}, 1);
                expect(payload).toHaveProperty("breeze_mode");
                expect(payload.breeze_mode).toStrictEqual({
                    speed1: "low",
                    duration1: 10,
                    speed2: "medium",
                    duration2: 15,
                    speed3: "high",
                    duration3: 20,
                    speed4: "low",
                    duration4: 25,
                    speed5: "off",
                    duration5: 0,
                });
            });

            it("should decode value 0 as all off", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {breezeMode: 0}, 1);
                expect(payload).toHaveProperty("breeze_mode");
                expect(payload.breeze_mode).toStrictEqual({
                    speed1: "off",
                    duration1: 0,
                    speed2: "off",
                    duration2: 0,
                    speed3: "off",
                    duration3: 0,
                    speed4: "off",
                    duration4: 0,
                    speed5: "off",
                    duration5: 0,
                });
            });

            it("should not fire on wrong endpoint", () => {
                const raw = 1 | (2 << 2) | (2 << 6) | (3 << 8);
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {breezeMode: raw}, 2);
                expect(payload).not.toHaveProperty("breeze_mode");
            });
        });
    });

    describe("VZM36 split endpoint attribute reports", () => {
        let definition: Definition;

        it("should find definition", async () => {
            const device = mockDevice({
                modelID: "VZM36",
                endpoints: [
                    {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                    {ID: 2, inputClusters: ["genOnOff", "genLevelCtrl"]},
                ],
            });
            definition = await findByDevice(device);
            expect(definition.model).toBe("VZM36");
        });

        it("should add _1 suffix for EP1 enum attribute", () => {
            const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {outputMode: 0}, 1);
            expect(payload).toHaveProperty("outputMode_1", "Dimmer");
        });

        it("should add _2 suffix for EP2 enum attribute with model-specific values", () => {
            const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {outputMode: 1}, 2);
            expect(payload).toHaveProperty("outputMode_2", "Exhaust Fan (On/Off)");
        });

        it("should add _1 suffix for EP1 numeric attribute", () => {
            const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {dimmingSpeedUpRemote: 42}, 1);
            expect(payload).toHaveProperty("dimmingSpeedUpRemote_1", 42);
        });

        it("should add _2 suffix for EP2 numeric attribute", () => {
            const payload = processFromZigbeeMessage(definition, "manuSpecificInovelli", "attributeReport", {dimmingSpeedUpRemote: 99}, 2);
            expect(payload).toHaveProperty("dimmingSpeedUpRemote_2", 99);
        });
    });

    describe("VZM32-SN mmWave converters", () => {
        let definition: Definition;

        it("should find definition", async () => {
            const device = mockDevice({
                modelID: "VZM32-SN",
                endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}],
            });
            definition = await findByDevice(device);
            expect(definition.model).toBe("VZM32-SN");
        });

        describe("report_target_info", () => {
            it("should parse a single target from buffer", () => {
                const buf = Buffer.alloc(10);
                buf.writeInt16LE(100, 0);
                buf.writeInt16LE(-50, 2);
                buf.writeInt16LE(200, 4);
                buf.writeInt16LE(10, 6);
                buf.writeInt16LE(1, 8);
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandReportTargetInfo",
                    {targetNum: 1, targets: buf},
                    1,
                );
                expect(payload).toStrictEqual({
                    mmwave_targets: [{id: 1, x: 100, y: -50, z: 200, dop: 10}],
                });
            });

            it("should parse two targets from buffer", () => {
                const buf = Buffer.alloc(20);
                buf.writeInt16LE(100, 0);
                buf.writeInt16LE(-50, 2);
                buf.writeInt16LE(200, 4);
                buf.writeInt16LE(10, 6);
                buf.writeInt16LE(1, 8);
                buf.writeInt16LE(-100, 10);
                buf.writeInt16LE(50, 12);
                buf.writeInt16LE(-200, 14);
                buf.writeInt16LE(20, 16);
                buf.writeInt16LE(2, 18);
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandReportTargetInfo",
                    {targetNum: 2, targets: buf},
                    1,
                );
                expect(payload).toStrictEqual({
                    mmwave_targets: [
                        {id: 1, x: 100, y: -50, z: 200, dop: 10},
                        {id: 2, x: -100, y: 50, z: -200, dop: 20},
                    ],
                });
            });

            it("should limit targets to buffer capacity when targetNum exceeds it", () => {
                const buf = Buffer.alloc(10);
                buf.writeInt16LE(50, 0);
                buf.writeInt16LE(60, 2);
                buf.writeInt16LE(70, 4);
                buf.writeInt16LE(80, 6);
                buf.writeInt16LE(3, 8);
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandReportTargetInfo",
                    {targetNum: 5, targets: buf},
                    1,
                );
                expect(payload.mmwave_targets).toHaveLength(1);
            });
        });

        describe("report_areas", () => {
            const areaData = {
                xMin1: -100,
                xMax1: 100,
                yMin1: -200,
                yMax1: 200,
                zMin1: 0,
                zMax1: 300,
                xMin2: -50,
                xMax2: 50,
                yMin2: -100,
                yMax2: 100,
                zMin2: 10,
                zMax2: 150,
                xMin3: 0,
                xMax3: 75,
                yMin3: 0,
                yMax3: 75,
                zMin3: 5,
                zMax3: 100,
                xMin4: -25,
                xMax4: 25,
                yMin4: -50,
                yMax4: 50,
                zMin4: 0,
                zMax4: 50,
            };

            const expectedAreas = {
                area1: {width_min: -100, width_max: 100, depth_min: -200, depth_max: 200, height_min: 0, height_max: 300},
                area2: {width_min: -50, width_max: 50, depth_min: -100, depth_max: 100, height_min: 10, height_max: 150},
                area3: {width_min: 0, width_max: 75, depth_min: 0, depth_max: 75, height_min: 5, height_max: 100},
                area4: {width_min: -25, width_max: 25, depth_min: -50, depth_max: 50, height_min: 0, height_max: 50},
            };

            it("should map commandReportDetectionArea to mmwave_detection_areas", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelliMMWave", "commandReportDetectionArea", areaData, 1);
                expect(payload).toStrictEqual({mmwave_detection_areas: expectedAreas});
            });

            it("should map commandReportInterferenceArea to mmwave_interference_areas", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelliMMWave", "commandReportInterferenceArea", areaData, 1);
                expect(payload).toStrictEqual({mmwave_interference_areas: expectedAreas});
            });

            it("should map commandReportStayArea to mmwave_stay_areas", () => {
                const payload = processFromZigbeeMessage(definition, "manuSpecificInovelliMMWave", "commandReportStayArea", areaData, 1);
                expect(payload).toStrictEqual({mmwave_stay_areas: expectedAreas});
            });
        });

        describe("anyone_in_reporting_area", () => {
            it("should map mixed area occupancy", () => {
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandAnyoneInReportingArea",
                    {area1: 1, area2: 0, area3: 1, area4: 0},
                    1,
                );
                expect(payload).toStrictEqual({
                    mmwave_area1_occupancy: true,
                    mmwave_area2_occupancy: false,
                    mmwave_area3_occupancy: true,
                    mmwave_area4_occupancy: false,
                });
            });

            it("should map all areas occupied", () => {
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandAnyoneInReportingArea",
                    {area1: 1, area2: 1, area3: 1, area4: 1},
                    1,
                );
                expect(payload).toStrictEqual({
                    mmwave_area1_occupancy: true,
                    mmwave_area2_occupancy: true,
                    mmwave_area3_occupancy: true,
                    mmwave_area4_occupancy: true,
                });
            });

            it("should map all areas unoccupied", () => {
                const payload = processFromZigbeeMessage(
                    definition,
                    "manuSpecificInovelliMMWave",
                    "commandAnyoneInReportingArea",
                    {area1: 0, area2: 0, area3: 0, area4: 0},
                    1,
                );
                expect(payload).toStrictEqual({
                    mmwave_area1_occupancy: false,
                    mmwave_area2_occupancy: false,
                    mmwave_area3_occupancy: false,
                    mmwave_area4_occupancy: false,
                });
            });
        });
    });
});
