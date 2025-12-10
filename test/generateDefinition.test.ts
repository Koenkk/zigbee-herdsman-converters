import {describe, expect, test} from "vitest";
import type {Models as ZHModels} from "zigbee-herdsman";
import {Zcl} from "zigbee-herdsman";
import {findByDevice, generateExternalDefinitionSource} from "../src";
import * as fz from "../src/converters/fromZigbee";
import {repInterval} from "../src/lib/constants";
import type {Definition} from "../src/lib/types";
import {type AssertDefinitionArgs, assertDefinition, mockDevice, reportingItem} from "./utils";

const assertGeneratedDefinition = async (args: AssertDefinitionArgs & {externalDefinitionSource?: string}) => {
    const getDefinition = async (device: ZHModels.Device): Promise<Definition> => findByDevice(device, true);
    const definition = await getDefinition(args.device);
    expect(definition.model).toEqual(args.device.modelID);
    if (args.externalDefinitionSource) {
        expect((await generateExternalDefinitionSource(args.device)).trim()).toEqual(args.externalDefinitionSource.trim());
    }
    return await assertDefinition({findByDeviceFn: getDefinition, ...args});
};

describe("GenerateDefinition", () => {
    test("empty", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "empty", endpoints: [{inputClusters: [], outputClusters: []}]}),
            meta: undefined,
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
            bind: [],
            read: [],
            configureReporting: [],
        });
    });

    test("input(msTemperatureMeasurement),output(genIdentify)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "temp", endpoints: [{inputClusters: ["msTemperatureMeasurement"], outputClusters: ["genIdentify"]}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: "msTemperatureMeasurement"})],
            toZigbee: ["temperature"],
            exposes: ["temperature"],
            bind: {1: ["msTemperatureMeasurement"]},
            read: {1: [["msTemperatureMeasurement", ["measuredValue"]]]},
            configureReporting: {
                1: [["msTemperatureMeasurement", [reportingItem("measuredValue", 10, repInterval.HOUR, 100)]]],
            },
        });
    });

    test("input(msPressureMeasurement)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "pressure", endpoints: [{inputClusters: ["msPressureMeasurement"], outputClusters: []}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: "msPressureMeasurement"})],
            toZigbee: ["pressure"],
            exposes: ["pressure"],
            bind: {1: ["msPressureMeasurement"]},
            read: {1: [["msPressureMeasurement", ["measuredValue"]]]},
            configureReporting: {
                1: [["msPressureMeasurement", [reportingItem("measuredValue", 10, repInterval.HOUR, 50)]]],
            },
        });
    });

    test("input(msRelativeHumidity)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "humidity", endpoints: [{inputClusters: ["msRelativeHumidity"], outputClusters: []}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: "msRelativeHumidity"})],
            toZigbee: ["humidity"],
            exposes: ["humidity"],
            bind: {1: ["msRelativeHumidity"]},
            read: {1: [["msRelativeHumidity", ["measuredValue"]]]},
            configureReporting: {
                1: [["msRelativeHumidity", [reportingItem("measuredValue", 10, repInterval.HOUR, 100)]]],
            },
        });
    });

    test("input(msTemperatureMeasurement, genOnOff)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "combo",
                manufacturerName: "vendor",
                endpoints: [{inputClusters: ["msTemperatureMeasurement", "genOnOff"], outputClusters: []}],
            }),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: "msTemperatureMeasurement"}), fz.on_off],
            toZigbee: ["temperature", "state", "on_time", "off_wait_time"],
            exposes: ["switch(state)", "temperature"],
            bind: {1: ["msTemperatureMeasurement", "genOnOff"]},
            read: {
                1: [
                    ["msTemperatureMeasurement", ["measuredValue"]],
                    ["genOnOff", ["onOff"]],
                ],
            },
            configureReporting: {
                1: [
                    ["msTemperatureMeasurement", [reportingItem("measuredValue", 10, repInterval.HOUR, 100)]],
                    ["genOnOff", [reportingItem("onOff", 0, repInterval.MAX, 1)]],
                ],
            },
            externalDefinitionSource: `
import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['combo'],
    model: 'combo',
    vendor: 'vendor',
    description: 'Automatically generated definition',
    extend: [m.temperature(), m.onOff({"powerOnBehavior":false})],
};
            `,
        });
    });

    test("input(msTemperatureMeasurement_2, genOnOff_2)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "combo",
                manufacturerName: "vendor",
                endpoints: [{ID: 2, inputClusters: ["msTemperatureMeasurement", "genOnOff"], outputClusters: []}],
            }),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: "msTemperatureMeasurement"}), fz.on_off],
            toZigbee: ["temperature", "state", "on_time", "off_wait_time"],
            exposes: ["switch(state)", "temperature"],
            bind: {2: ["msTemperatureMeasurement", "genOnOff"]},
            read: {
                2: [
                    ["msTemperatureMeasurement", ["measuredValue"]],
                    ["genOnOff", ["onOff"]],
                ],
            },
            configureReporting: {
                2: [
                    ["msTemperatureMeasurement", [reportingItem("measuredValue", 10, repInterval.HOUR, 100)]],
                    ["genOnOff", [reportingItem("onOff", 0, repInterval.MAX, 1)]],
                ],
            },
            externalDefinitionSource: `
import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['combo'],
    model: 'combo',
    vendor: 'vendor',
    description: 'Automatically generated definition',
    extend: [m.temperature(), m.onOff({"powerOnBehavior":false})],
};
            `,
        });
    });

    test("input(msTemperatureMeasurement, genOnOff, msTemperatureMeasurement)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "combo",
                endpoints: [
                    {inputClusters: ["msTemperatureMeasurement", "genOnOff"], outputClusters: []},
                    {ID: 2, inputClusters: ["msTemperatureMeasurement"], outputClusters: []},
                ],
            }),
            meta: {multiEndpoint: true},
            endpoints: {"1": 1, "2": 2},
            fromZigbee: [expect.objectContaining({cluster: "msTemperatureMeasurement"}), fz.on_off],
            toZigbee: ["temperature", "state", "on_time", "off_wait_time"],
            exposes: ["switch(state)", "temperature", "temperature"],
            bind: {1: ["msTemperatureMeasurement", "genOnOff"], 2: ["msTemperatureMeasurement"]},
            read: {
                1: [
                    ["msTemperatureMeasurement", ["measuredValue"]],
                    ["genOnOff", ["onOff"]],
                ],
                2: [["msTemperatureMeasurement", ["measuredValue"]]],
            },
            configureReporting: {
                1: [
                    ["msTemperatureMeasurement", [reportingItem("measuredValue", 10, repInterval.HOUR, 100)]],
                    ["genOnOff", [reportingItem("onOff", 0, repInterval.MAX, 1)]],
                ],
                2: [["msTemperatureMeasurement", [reportingItem("measuredValue", 10, repInterval.HOUR, 100)]]],
            },
            externalDefinitionSource: `
import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['combo'],
    model: 'combo',
    vendor: '',
    description: 'Automatically generated definition',
    extend: [m.deviceEndpoints({"endpoints":{"1":1,"2":2}}), m.temperature({"endpointNames":["1","2"]}), m.onOff({"powerOnBehavior":false})],
};
            `,
        });
    });

    test("input(genOnOff, lightingColorCtrl)", async () => {
        const attributes = {
            lightingColorCtrl: {
                colorCapabilities: 254,
                colorTempPhysicalMin: 100,
                colorTempPhysicalMax: 500,
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({modelID: "combo", endpoints: [{inputClusters: ["genOnOff", "lightingColorCtrl"], outputClusters: [], attributes}]}),
            meta: {},
            fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.color_colortemp, fz.power_on_behavior],
            toZigbee: [
                "state",
                "brightness",
                "brightness_percent",
                "on_time",
                "off_wait_time",
                "transition",
                "level_config",
                "rate",
                "brightness_move",
                "brightness_move_onoff",
                "brightness_step",
                "brightness_step_onoff",
                "color",
                "color_temp",
                "color_temp_percent",
                "color_mode",
                "color_options",
                "colortemp_move",
                "color_temp_move",
                "color_temp_step",
                "color_temp_startup",
                "hue_move",
                "saturation_move",
                "hue_step",
                "saturation_step",
                "effect",
                "alert",
                "flash",
                "power_on_behavior",
            ],
            exposes: ["effect", "light(state,brightness,color_temp,color_temp_startup,color_xy)", "power_on_behavior"],
            bind: {},
            read: {
                1: [
                    ["lightingColorCtrl", ["colorCapabilities"]],
                    ["lightingColorCtrl", ["colorTempPhysicalMin", "colorTempPhysicalMax"]],
                ],
            },
            configureReporting: {},
            externalDefinitionSource: `
import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['combo'],
    model: 'combo',
    vendor: '',
    description: 'Automatically generated definition',
    extend: [m.light({"colorTemp":{"range":[100,500]},"color":{"enhancedHue":true}})],
};
            `,
        });
    });

    test("light with color and color temperature", async () => {
        const attributes = {
            lightingColorCtrl: {
                colorCapabilities: 254,
                colorTempPhysicalMin: 100,
                colorTempPhysicalMax: 500,
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({modelID: "combo", endpoints: [{inputClusters: ["genOnOff", "lightingColorCtrl"], outputClusters: [], attributes}]}),
            meta: {},
            fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.color_colortemp, fz.power_on_behavior],
            toZigbee: [
                "state",
                "brightness",
                "brightness_percent",
                "on_time",
                "off_wait_time",
                "transition",
                "level_config",
                "rate",
                "brightness_move",
                "brightness_move_onoff",
                "brightness_step",
                "brightness_step_onoff",
                "color",
                "color_temp",
                "color_temp_percent",
                "color_mode",
                "color_options",
                "colortemp_move",
                "color_temp_move",
                "color_temp_step",
                "color_temp_startup",
                "hue_move",
                "saturation_move",
                "hue_step",
                "saturation_step",
                "effect",
                "alert",
                "flash",
                "power_on_behavior",
            ],
            exposes: ["effect", "light(state,brightness,color_temp,color_temp_startup,color_xy)", "power_on_behavior"],
            bind: {},
            read: {
                1: [
                    ["lightingColorCtrl", ["colorCapabilities"]],
                    ["lightingColorCtrl", ["colorTempPhysicalMin", "colorTempPhysicalMax"]],
                ],
            },
            configureReporting: {},
            externalDefinitionSource: `
import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['combo'],
    model: 'combo',
    vendor: '',
    description: 'Automatically generated definition',
    extend: [m.light({"colorTemp":{"range":[100,500]},"color":{"enhancedHue":true}})],
};
            `,
        });
    });

    test("Philips light with color and color temperature", async () => {
        const attributes = {
            lightingColorCtrl: {
                colorCapabilities: 254,
                colorTempPhysicalMin: 100,
                colorTempPhysicalMax: 500,
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "combo",
                manufacturerID: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
                endpoints: [{inputClusters: ["genOnOff", "lightingColorCtrl"], outputClusters: [], attributes}],
            }),
            meta: {supportsHueAndSaturation: true, turnsOffAtBrightness1: true},
            fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.color_colortemp, fz.power_on_behavior],
            toZigbee: [
                "state",
                "brightness",
                "brightness_percent",
                "on_time",
                "off_wait_time",
                "transition",
                "level_config",
                "rate",
                "brightness_move",
                "brightness_move_onoff",
                "brightness_step",
                "brightness_step_onoff",
                "color",
                "color_temp",
                "color_temp_percent",
                "color_mode",
                "color_options",
                "colortemp_move",
                "color_temp_move",
                "color_temp_step",
                "color_temp_startup",
                "hue_move",
                "saturation_move",
                "hue_step",
                "saturation_step",
                "power_on_behavior",
                "hue_power_on_behavior",
                "hue_power_on_brightness",
                "hue_power_on_color_temperature",
                "hue_power_on_color",
                "effect",
            ],
            exposes: ["effect", "light(state,brightness,color_temp,color_temp_startup,color_xy,color_hs)", "power_on_behavior"],
            bind: {},
            read: {
                1: [
                    ["lightingColorCtrl", ["colorCapabilities"]],
                    ["lightingColorCtrl", ["colorTempPhysicalMin", "colorTempPhysicalMax"]],
                ],
            },
            configureReporting: [],
            externalDefinitionSource: `
import * as philips from 'zigbee-herdsman-converters/lib/philips';

export default {
    zigbeeModel: ['combo'],
    model: 'combo',
    vendor: '',
    description: 'Automatically generated definition',
    extend: [philips.m.light({"colorTemp":{"range":[100,500]},"color":{"enhancedHue":true}})],
};
            `,
        });
    });

    test("Electricity meter", async () => {
        const attributes = {
            haElectricalMeasurement: {
                acPowerDivisor: 1000,
                acPowerMultiplier: 1,
                acCurrentDivisor: 1000,
                acCurrentMultiplier: 1,
                acVoltageDivisor: 1000,
                acVoltageMultiplier: 1,
            },
            seMetering: {
                divisor: 1000,
                multiplier: 1,
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "combo",
                endpoints: [{inputClusters: ["genOnOff", "seMetering", "haElectricalMeasurement"], outputClusters: [], attributes}],
            }),
            meta: undefined,
            fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
            toZigbee: [
                "state",
                "on_time",
                "off_wait_time",
                "power",
                "voltage",
                "current",
                "energy",
                "produced_energy",
                "ac_frequency",
                "power_factor",
            ],
            exposes: ["current", "energy", "power", "switch(state)", "voltage"],
            bind: {1: ["genOnOff", "haElectricalMeasurement", "seMetering"]},
            read: {
                1: [
                    ["genOnOff", ["onOff"]],
                    ["haElectricalMeasurement", ["acPowerDivisor", "acPowerMultiplier"]],
                    ["haElectricalMeasurement", ["acCurrentDivisor", "acCurrentMultiplier"]],
                    ["haElectricalMeasurement", ["acVoltageDivisor", "acVoltageMultiplier"]],
                    ["haElectricalMeasurement", ["activePower", "rmsCurrent", "rmsVoltage"]],
                    ["seMetering", ["divisor", "multiplier"]],
                    ["seMetering", ["currentSummDelivered"]],
                ],
            },
            configureReporting: {
                1: [
                    ["genOnOff", [reportingItem("onOff", 0, repInterval.MAX, 1)]],
                    [
                        "haElectricalMeasurement",
                        [
                            reportingItem("activePower", 10, 65000, 5000),
                            reportingItem("rmsCurrent", 10, 65000, 50),
                            reportingItem("rmsVoltage", 10, 65000, 5000),
                        ],
                    ],
                    ["seMetering", [reportingItem("currentSummDelivered", 10, 65000, 100)]],
                ],
            },
            externalDefinitionSource: `
import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['combo'],
    model: 'combo',
    vendor: '',
    description: 'Automatically generated definition',
    extend: [m.onOff({"powerOnBehavior":false}), m.electricityMeter()],
};
            `,
        });
    });
});
