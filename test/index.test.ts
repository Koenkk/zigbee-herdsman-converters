import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {describe, expect, it, vi} from "vitest";
import {
    addExternalDefinition,
    type Definition,
    findByDevice,
    getConfigureKey,
    postProcessConvertedFromZigbeeMessage,
    removeExternalDefinitions,
} from "../src/index";
import {access, Composite, Enum, List, Numeric, presets} from "../src/lib/exposes";
import {mockDevice} from "./utils";

describe("ZHC", () => {
    // TODO: generateExternalDefinition
    // TODO: onEvent

    it("cannot find definition without enough data points", async () => {
        const device = mockDevice(
            {
                modelID: undefined,
                endpoints: [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "Router",
        );

        const definition = await findByDevice(device);
        expect(definition).toBeUndefined();
    });

    it("generates definition for unknown", async () => {
        const device = mockDevice(
            {
                modelID: "test_generate",
                endpoints: [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "Router",
        );

        const definition = await findByDevice(device, true);
        expect(definition.model).toStrictEqual("test_generate");
        expect(definition.vendor).toStrictEqual("");
        expect(definition.description).toStrictEqual("Automatically generated definition");
        expect(definition.generated).toStrictEqual(true);
    });

    it("finds definition by model ID", async () => {
        const device = mockDevice(
            {
                modelID: "lumi.sensor_motion",
                endpoints: [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "Unknown",
        );
        const definition = await findByDevice(device);

        expect(definition.model).toStrictEqual("RTCGQ01LM");
    });

    it("finds definition by fingerprint", async () => {
        const device = mockDevice(
            {
                modelID: undefined,
                manufacturerID: 4126,
                endpoints: [
                    {ID: 230, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
                    {ID: 232, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
                ],
            },
            "Router",
        );
        const definition = await findByDevice(device);

        expect(definition.model).toStrictEqual("XBee");
    });

    it("finds definition with white label by fingerprint", async () => {
        const device1 = mockDevice(
            {
                modelID: "TS0502A",
                manufacturerName: "_TZ3000_oborybow",
                endpoints: [],
            },
            "Router",
        );
        const definition1 = await findByDevice(device1);
        const device2 = mockDevice(
            {
                modelID: "TS0502A",
                manufacturerName: "JUST_A_RANDOM_MANUFACTURER_NAME",
                endpoints: [],
            },
            "Router",
        );
        const definition2 = await findByDevice(device2);

        expect(definition1.model).toBe("HG06492B/HG08130B");
        expect(definition1.description).toBe("Livarno Home E14 candle CCT");
        expect(definition1.vendor).toBe("Lidl");

        expect(definition2.model).toBe("TS0502A");
        expect(definition2.description).toBe("Light controller");
        expect(definition2.vendor).toBe("Tuya");
    });

    it("finds definition by prioritized fingerprints", async () => {
        const device1 = mockDevice(
            {
                modelID: "TS011F",
                manufacturerName: "_TZ3000_vzopcetz",
                endpoints: [],
            },
            "Router",
            {
                applicationVersion: 69,
            },
        );
        const device2 = mockDevice(
            {
                modelID: "TS011F",
                manufacturerName: "_TZ3000_vzopcetz_random",
                endpoints: [],
            },
            "Router",
            {
                applicationVersion: 69,
            },
        );
        const device3 = mockDevice(
            {
                modelID: "TS011F",
                manufacturerName: "_TZ3000_vzopcetz_random",
                endpoints: [],
            },
            "Router",
            {
                applicationVersion: 1,
            },
        );
        const definition1 = await findByDevice(device1);
        const definition2 = await findByDevice(device2);
        const definition3 = await findByDevice(device3);

        expect(definition1.model).toStrictEqual("HG06338");
        expect(definition2.model).toStrictEqual("TS011F_plug_3");
        expect(definition3.model).toStrictEqual("TS011F_plug_1");
    });

    it("finds definition by fingerprint over zigbeeModel", async () => {
        const device1 = mockDevice(
            {
                modelID: "CCT Lighting",
                manufacturerID: 4635,
                manufacturerName: "MLI",
                endpoints: [
                    {ID: 1, profileID: 49246, deviceID: 544, inputClusterIDs: [0, 3, 4, 5, 6, 8, 768, 2821, 4096], outputClusterIDs: [25]},
                    {ID: 242, profileID: 41440, deviceID: 102, inputClusterIDs: [33], outputClusterIDs: [33]},
                ],
            },
            "Router",
            {
                powerSource: "Mains (single phase)",
            },
        );
        const device2 = mockDevice(
            {
                modelID: "CCT Lighting",
                manufacturerID: 9999,
                manufacturerName: "SunRicher",
                endpoints: [],
            },
            "Router",
            {
                powerSource: "Mains (single phase)",
            },
        );
        const definition1 = await findByDevice(device1);
        const definition2 = await findByDevice(device2);

        expect(definition1.model).toStrictEqual("404031");
        expect(definition2.model).toStrictEqual("ZG192910-4");
    });

    it("finds definition by fingerprint for mismatching zigbeeModel in firmware", async () => {
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
        const device1 = mockDevice(
            {
                modelID: "TH01",
                manufacturerID: 0,
                manufacturerName: "eWeLink",
                endpoints: [{ID: 1, profileID: 260, deviceID: 1026, inputClusterIDs: [0, 3, 1280, 1], outputClusterIDs: [3]}],
            },
            "EndDevice",
            {
                powerSource: "Battery",
            },
        );
        const definition1 = await findByDevice(device1);
        const device2 = mockDevice(
            {
                modelID: "TH01",
                manufacturerID: 0,
                manufacturerName: "eWeLink",
                endpoints: [{ID: 1, profileID: 260, deviceID: 770, inputClusterIDs: [0, 3, 1026, 1029, 1], outputClusterIDs: [3]}],
            },
            "EndDevice",
            {
                powerSource: "Battery",
            },
        );
        const definition2 = await findByDevice(device2);

        expect(definition1.model).toStrictEqual("SNZB-04");
        expect(definition2.model).toStrictEqual("SNZB-02");
    });

    it("finds definition by fingerprint - index of size 10+", async () => {
        const device = mockDevice(
            {
                modelID: "Dimmer-Switch-ZB3.0",
                manufacturerName: "Light Solutions",
                endpoints: [],
            },
            "Router",
        );
        const definition = await findByDevice(device);

        expect(definition.vendor).toStrictEqual("Light Solutions");
        expect(definition.model).toStrictEqual("3004482/3137308/3137309");
    });

    it("finds definition by fingerprint - index of size 35+", async () => {
        const device = mockDevice(
            {
                modelID: "TS011F",
                endpoints: [],
                manufacturerName: "_TZ3000_cehuw1lw",
            },
            "Router",
            {
                softwareBuildID: "1.0.5\u0000",
            },
        );
        const definition = await findByDevice(device);

        expect(definition.vendor).toStrictEqual("Tuya");
        expect(definition.model).toStrictEqual("TS011F_plug_3");
    });

    it("finds definition by fingerprint - index of size 250+", async () => {
        const device = mockDevice(
            {
                modelID: "TS0601",
                manufacturerName: "_TZE204_aoclfnxz",
                endpoints: [],
            },
            "EndDevice",
        );
        const definition = await findByDevice(device);

        expect(definition.vendor).toStrictEqual("Moes");
        expect(definition.model).toStrictEqual("BHT-002/BHT-006");
    });

    it("finds definition by fingerprint - GP", async () => {
        const device = mockDevice(
            {
                modelID: "GreenPower_7",
                endpoints: [{ID: 242, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "GreenPower",
            {
                ieeeAddr: "0x0000000001511223",
            },
        );
        const definition = await findByDevice(device);

        expect(definition.model).toStrictEqual("PTM 216Z");
    });

    it("does not throw when exposes function throws", async () => {
        const illuminanceRawSpy = vi.spyOn(presets, "illuminance_raw").mockImplementationOnce(() => {
            throw new Error("Failed");
        });
        const device = mockDevice(
            {
                modelID: "RFDL-ZB-EU",
                manufacturerName: "Bosch",
                endpoints: [{ID: 1, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "EndDevice",
        );
        const definition = await findByDevice(device);

        expect(definition.model).toStrictEqual("RADION TriTech ZB");

        assert(typeof definition.exposes === "function");

        const deviceExposes = definition.exposes(device, {illuminance_raw: true});

        expect(deviceExposes.length).toBeGreaterThan(0);
        expect(deviceExposes.find((exp) => exp.name === "illuminance_raw")).toStrictEqual(undefined);
        expect(illuminanceRawSpy).toHaveBeenCalledTimes(1);
        expect(illuminanceRawSpy.mock.results[0].value).toStrictEqual(new Error("Failed"));
    });

    it("generates definition - GP - with no matching fingerprint from candidates", async () => {
        const device = mockDevice(
            {
                modelID: "GreenPower_2",
                endpoints: [{ID: 242, profileID: undefined, deviceID: undefined, inputClusters: [], outputClusters: []}],
            },
            "GreenPower",
            {
                ieeeAddr: "0x0000000052373160",
            },
        );

        const definition = await findByDevice(device, true);
        expect(definition.model).toStrictEqual("GreenPower_2");
        expect(definition.vendor).toStrictEqual("");
        expect(definition.description).toStrictEqual("Automatically generated definition for Green Power");
        expect(definition.generated).toStrictEqual(true);
    });

    it("allows definition with both modern extend and exposes as function", async () => {
        const device = mockDevice({modelID: "MOSZB-140", endpoints: []});
        const MOSZB140 = await findByDevice(device);

        if (typeof MOSZB140.exposes === "function") {
            const exposes = MOSZB140.exposes(device, {});
            expect(exposes.map((e) => e.name)).toStrictEqual([
                "occupancy",
                "tamper",
                "battery_low",
                "temperature",
                "illuminance",
                "battery",
                "voltage",
            ]);
        } else {
            throw new Error("invalid test");
        }
    });

    it("adds & removes external converter", async () => {
        const device = mockDevice({modelID: "my-mock-device", endpoints: []}, "Router");
        const definitionUndef = await findByDevice(device);

        expect(definitionUndef).toStrictEqual(undefined);
        addExternalDefinition({
            zigbeeModel: ["my-mock-device"],
            model: "mock-model",
            vendor: "dummy",
            description: "dummy",
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
            externalConverterName: "mock-model.js",
        });

        const definition = await findByDevice(device);

        expect(definition.model).toStrictEqual("mock-model");
        removeExternalDefinitions("mock-model.js");

        const definitionUndef2 = await findByDevice(device);

        expect(definitionUndef2).toStrictEqual(undefined);
    });

    it("adds & removes override external converter", async () => {
        const device = mockDevice({modelID: "lumi.light.aqcn02", endpoints: []}, "Router");

        expect((await findByDevice(device)).vendor).toStrictEqual("Aqara");

        addExternalDefinition({
            model: "mock-model",
            vendor: "other-vendor",
            zigbeeModel: ["lumi.light.aqcn02"],
            description: "",
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
            externalConverterName: "mock-model.js",
        });

        expect((await findByDevice(device)).vendor).toStrictEqual("other-vendor");
        removeExternalDefinitions("mock-model.js");
        expect((await findByDevice(device)).vendor).toStrictEqual("Aqara");
    });

    it("should not add toZigbee converters/options multiple times if findByDevice is called multiple times for the same device", async () => {
        const device = mockDevice({modelID: "TS0601", manufacturerName: "_TZE200_3towulqd", endpoints: []});
        const definition1 = await findByDevice(device);
        const definition1TzLength = definition1.toZigbee.length;
        const definition1OptionsLength = definition1.toZigbee.length;
        const definition2 = await findByDevice(device);
        const definition2TzLength = definition2.toZigbee.length;
        const definition2OptionsLength = definition2.toZigbee.length;
        expect(definition1TzLength).toStrictEqual(definition2TzLength);
        expect(definition1OptionsLength).toStrictEqual(definition2OptionsLength);
    });

    it("adds external converter with same model built-in", async () => {
        const device = mockDevice({modelID: "TS0601", manufacturerName: "_TZE204_sxm7l9xa", endpoints: []}, "EndDevice");
        const extDevice = mockDevice({modelID: "TS0601", manufacturerName: "_TZE204_unknown", endpoints: []}, "EndDevice");
        const definition = await findByDevice(device);
        const extDefinitionUndef = await findByDevice(extDevice);

        expect(definition.model).toStrictEqual("ZY-M100-S_1");
        expect(extDefinitionUndef).toStrictEqual(undefined);
        addExternalDefinition({
            fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE204_unknown"}],
            model: "mock-model",
            vendor: "dummy",
            description: "dummy",
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
            externalConverterName: "mock-model.js",
        });

        const extDefinition = await findByDevice(extDevice);
        const definitionWithExtPresent = await findByDevice(device);

        expect(extDefinition.model).toStrictEqual("mock-model");
        expect(definitionWithExtPresent.model).toStrictEqual("ZY-M100-S_1");
    });

    it("exposes light with endpoint", () => {
        const expected = {
            type: "light",
            features: [
                {
                    type: "binary",
                    name: "state",
                    label: "State",
                    description: "On/off state of this light",
                    property: "state_rgb",
                    access: 7,
                    value_on: "ON",
                    value_off: "OFF",
                    value_toggle: "TOGGLE",
                    endpoint: "rgb",
                },
                {
                    type: "numeric",
                    name: "brightness",
                    label: "Brightness",
                    description: "Brightness of this light",
                    property: "brightness_rgb",
                    access: 7,
                    value_min: 0,
                    value_max: 254,
                    endpoint: "rgb",
                },
                {
                    type: "composite",
                    property: "color_rgb",
                    name: "color_xy",
                    label: "Color (X/Y)",
                    description: "Color of this light in the CIE 1931 color space (x/y)",
                    access: 7,
                    features: [
                        {
                            type: "numeric",
                            name: "x",
                            label: "X",
                            property: "x",
                            access: 7,
                        },
                        {
                            type: "numeric",
                            name: "y",
                            label: "Y",
                            property: "y",
                            access: 7,
                        },
                    ],
                    endpoint: "rgb",
                },
            ],
            endpoint: "rgb",
        };
        const actual = presets.light_brightness_colorxy().withEndpoint("rgb");
        expect(expected).toStrictEqual(JSON.parse(JSON.stringify(actual)));
    });

    describe("configure key", () => {
        const mockDefinition = (configure: Definition["configure"]): Definition => ({
            zigbeeModel: ["abcd"],
            model: "abcd",
            vendor: "efg",
            description: "abcd efg",
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
            configure,
        });

        it("calculates", () => {
            expect(
                getConfigureKey(
                    mockDefinition(() => {
                        console.log("hello world");
                        console.log("bye world");
                    }),
                ),
            ).toStrictEqual(1320643662);
        });

        it("calculates diff", () => {
            expect(
                getConfigureKey(
                    mockDefinition(() => {
                        console.log("hello world");
                        console.log("bye world");
                    }),
                ),
            ).not.toStrictEqual(
                getConfigureKey(
                    mockDefinition(() => {
                        console.log("hello world");
                        console.log("bye mars");
                    }),
                ),
            );
        });
    });

    it("verifies options filter", async () => {
        const ZNCLDJ12LM = await findByDevice(mockDevice({modelID: "lumi.curtain.hagl04", endpoints: []}));
        expect(ZNCLDJ12LM.options.length).toBe(1);
        const ZNCZ04LM = await findByDevice(mockDevice({modelID: "lumi.plug.mmeu01", endpoints: []}));
        expect(ZNCZ04LM.options.length).toBe(10);
    });

    it("computes calibration/precision", async () => {
        const ts0601SoilDevice = mockDevice({modelID: "TS0601", manufacturerName: "_TZE200_myd45weu", endpoints: []});
        const ts0601Soil = await findByDevice(ts0601SoilDevice);
        expect(ts0601Soil.options.map((t) => t.name)).toStrictEqual([
            "temperature_calibration",
            "temperature_precision",
            "soil_moisture_calibration",
            "soil_moisture_precision",
        ]);
        const payload1 = {temperature: 1.193};
        const options1 = {temperature_calibration: 2.5, temperature_precision: 1};
        postProcessConvertedFromZigbeeMessage(ts0601Soil, payload1, options1, ts0601SoilDevice);
        expect(payload1).toStrictEqual({temperature: 3.7});

        // For multi endpoint property
        const AUA1ZBDSSDevice = mockDevice({modelID: "DoubleSocket50AU", endpoints: []});
        const AUA1ZBDSS = await findByDevice(AUA1ZBDSSDevice);
        expect(AUA1ZBDSS.options.map((t) => t.name)).toStrictEqual(["power_calibration", "power_precision", "transition", "state_action"]);
        const payload2 = {power_left: 5.31};
        const options2 = {power_calibration: 100, power_precision: 0}; // calibration for power is percentual
        postProcessConvertedFromZigbeeMessage(AUA1ZBDSS, payload2, options2, AUA1ZBDSSDevice);
        expect(payload2).toStrictEqual({power_left: 11});

        const ts0111fPlug1Device = mockDevice({modelID: "TS011F", endpoints: []});
        const ts011fPlug1 = await findByDevice(ts0111fPlug1Device);
        expect(ts011fPlug1.options.map((t) => t.name)).toStrictEqual([
            "power_calibration",
            "power_precision",
            "current_calibration",
            "current_precision",
            "voltage_calibration",
            "voltage_precision",
            "energy_calibration",
            "energy_precision",
            "state_action",
        ]);
        const payload3 = {current: 0.0585};
        const options3 = {current_calibration: -50};
        postProcessConvertedFromZigbeeMessage(ts011fPlug1, payload3, options3, ts0111fPlug1Device);
        expect(payload3).toStrictEqual({current: 0.03});
    });

    it("instantiates list expose of number type", () => {
        // Example payload:
        // {"temperatures": [19,21,30]}
        const itemType = new Numeric("temperature", access.STATE_SET);
        const list = new List("temperatures", access.STATE_SET, itemType);
        expect(JSON.parse(JSON.stringify(list))).toStrictEqual({
            access: 3,
            item_type: {access: 3, name: "temperature", label: "Temperature", type: "numeric"},
            name: "temperatures",
            label: "Temperatures",
            property: "temperatures",
            type: "list",
        });
    });

    it("check if all definitions are imported in devices/index.ts", () => {
        const devicesDir = path.join(__dirname, "..", "src", "devices");
        const files = fs.readdirSync(devicesDir).map((f) => f.replace(".ts", ""));
        const index = fs.readFileSync(path.join(__dirname, "..", "src", "devices", "index.ts"), "utf-8");
        const importRegex = /^import {definitions as .+} from "\.\/(.+)";$/gm;
        const imports = Array.from(index.matchAll(importRegex)).map((r) => r[1]);
        files.splice(files.indexOf("index"), 1);
        expect(files.sort()).toStrictEqual(imports.sort());
    });

    it("instantiates list expose of composite type", () => {
        // Example payload:
        // {"schedule": [{"day":"monday","hour":13,"minute":37}, {"day":"tuesday","hour":14,"minute":59}]}

        const itemType = new Composite("dayTime", "dayTime", access.STATE_SET)
            .withFeature(new Enum("day", access.STATE_SET, ["monday", "tuesday", "wednesday"]))
            .withFeature(new Numeric("hour", access.STATE_SET))
            .withFeature(new Numeric("minute", access.STATE_SET));

        const list = new List("schedule", access.STATE_SET, itemType);
        expect(JSON.parse(JSON.stringify(list))).toStrictEqual({
            type: "list",
            name: "schedule",
            label: "Schedule",
            property: "schedule",
            access: 3,
            item_type: {
                access: 3,
                type: "composite",
                name: "dayTime",
                label: "DayTime",
                features: [
                    {
                        access: 3,
                        name: "day",
                        label: "Day",
                        property: "day",
                        type: "enum",
                        values: ["monday", "tuesday", "wednesday"],
                    },
                    {
                        access: 3,
                        name: "hour",
                        label: "Hour",
                        property: "hour",
                        type: "numeric",
                    },
                    {
                        access: 3,
                        name: "minute",
                        label: "Minute",
                        property: "minute",
                        type: "numeric",
                    },
                ],
            },
        });
    });
});
