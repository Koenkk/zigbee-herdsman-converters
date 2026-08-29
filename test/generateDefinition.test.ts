import {describe, expect, test, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice, generateExternalDefinitionSource} from "../src";
import * as fz from "../src/converters/fromZigbee";
import {repInterval} from "../src/lib/constants";
import * as philips from "../src/lib/philips";
import {type AssertDefinitionArgs, assertDefinition, mockDevice, reportingItem} from "./utils";

const assertGeneratedDefinition = async (args: AssertDefinitionArgs & {externalDefinitionSource?: string}) => {
    const definition = await findByDevice(args.device, true);
    expect(definition.model).toEqual(args.device.modelID);
    if (args.externalDefinitionSource) {
        expect((await generateExternalDefinitionSource(args.device)).trim()).toEqual(args.externalDefinitionSource.trim());
    }
    // prevent unnecessary duplicate call to `findByDevice` by passing already retrieved definition
    return await assertDefinition({findByDeviceFn: () => Promise.resolve(definition), ...args});
};

describe("GenerateDefinition", () => {
    test("empty", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "empty", endpoints: [{inputClusters: [], outputClusters: []}]}),
            meta: undefined,
            fromZigbee: [],
            toZigbee: [],
            exposes: [],
            bind: {},
            read: {},
            write: {},
            configureReporting: {},
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
            write: {},
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
            write: {},
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
            write: {},
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
            fromZigbee: [expect.objectContaining({cluster: "msTemperatureMeasurement"}), fz.on_off, fz.power_on_behavior],
            toZigbee: ["temperature", "state", "on_time", "off_wait_time", "power_on_behavior"],
            exposes: ["power_on_behavior", "switch(state)", "temperature"],
            bind: {1: ["msTemperatureMeasurement", "genOnOff"]},
            read: {
                1: [
                    ["msTemperatureMeasurement", ["measuredValue"]],
                    ["genOnOff", ["onOff"]],
                    ["genOnOff", ["startUpOnOff"]],
                ],
            },
            write: {},
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
    extend: [m.temperature(), m.onOff()],
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
            fromZigbee: [expect.objectContaining({cluster: "msTemperatureMeasurement"}), fz.on_off, fz.power_on_behavior],
            toZigbee: ["temperature", "state", "on_time", "off_wait_time", "power_on_behavior"],
            exposes: ["power_on_behavior", "switch(state)", "temperature"],
            bind: {2: ["msTemperatureMeasurement", "genOnOff"]},
            read: {
                2: [
                    ["msTemperatureMeasurement", ["measuredValue"]],
                    ["genOnOff", ["onOff"]],
                    ["genOnOff", ["startUpOnOff"]],
                ],
            },
            write: {},
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
    extend: [m.temperature(), m.onOff()],
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
            meta: {multiEndpoint: true, multiEndpointSkip: ["state", "on", "off", "power_on_behavior"]},
            endpoints: {"1": 1, "2": 2},
            fromZigbee: [expect.objectContaining({cluster: "msTemperatureMeasurement"}), fz.on_off, fz.power_on_behavior],
            toZigbee: ["temperature", "state", "on_time", "off_wait_time", "power_on_behavior"],
            exposes: ["power_on_behavior", "switch(state)", "temperature_1", "temperature_2"],
            bind: {1: ["msTemperatureMeasurement", "genOnOff"], 2: ["msTemperatureMeasurement"]},
            read: {
                1: [
                    ["msTemperatureMeasurement", ["measuredValue"]],
                    ["genOnOff", ["onOff"]],
                    ["genOnOff", ["startUpOnOff"]],
                ],
                2: [["msTemperatureMeasurement", ["measuredValue"]]],
            },
            write: {},
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
    extend: [m.deviceEndpoints({"endpoints":{"1":1,"2":2},"multiEndpointSkip":["state","on","off","power_on_behavior"]}), m.temperature({"endpointNames":["1","2"]}), m.onOff()],
};
            `,
        });
    });

    test("input(genOnOff, lightingColorCtrl)", async () => {
        const attributes = {
            lightingColorCtrl: {
                attributes: {
                    colorCapabilities: 254,
                    colorTempPhysicalMin: 100,
                    colorTempPhysicalMax: 500,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({modelID: "combo", endpoints: [{inputClusters: ["genOnOff", "lightingColorCtrl"], outputClusters: [], attributes}]}),
            meta: {supportsEnhancedHue: true},
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
            write: {},
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
                attributes: {
                    colorCapabilities: 254,
                    colorTempPhysicalMin: 100,
                    colorTempPhysicalMax: 500,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({modelID: "combo", endpoints: [{inputClusters: ["genOnOff", "lightingColorCtrl"], outputClusters: [], attributes}]}),
            meta: {supportsEnhancedHue: true},
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
            write: {},
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
                attributes: {
                    colorCapabilities: 254,
                    colorTempPhysicalMin: 100,
                    colorTempPhysicalMax: 500,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "combo",
                manufacturerID: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
                endpoints: [{inputClusters: ["genOnOff", "lightingColorCtrl"], outputClusters: [], attributes}],
            }),
            meta: {supportsEnhancedHue: true, supportsHueAndSaturation: true, turnsOffAtBrightness1: true},
            fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.color_colortemp, fz.power_on_behavior, philips.manuSpecificPhilips2Fz],
            toZigbee: [
                "state",
                "brightness",
                "brightness_percent",
                "color",
                "color_temp",
                "color_temp_percent",
                "transition",
                "effect_speed",
                "gradient_scale",
                "gradient_offset",
                "gradient_style",
                "effect_color",
                "hue_power_on_behavior",
                "hue_power_on_brightness",
                "hue_power_on_color_temperature",
                "hue_power_on_color",
                "on_time",
                "off_wait_time",
                "level_config",
                "rate",
                "brightness_move",
                "brightness_move_onoff",
                "brightness_step",
                "brightness_step_onoff",
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
                "effect",
            ],
            exposes: [
                "effect",
                "effect_color",
                "effect_speed",
                "light(state,brightness,color_temp,color_temp_startup,color_xy,color_hs)",
                "power_on_behavior",
            ],
            bind: {},
            read: {
                1: [
                    ["lightingColorCtrl", ["colorCapabilities"]],
                    ["lightingColorCtrl", ["colorTempPhysicalMin", "colorTempPhysicalMax"]],
                ],
            },
            write: {},
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
                attributes: {
                    acPowerDivisor: 1000,
                    acPowerMultiplier: 1,
                    acCurrentDivisor: 1000,
                    acCurrentMultiplier: 1,
                    acVoltageDivisor: 1000,
                    acVoltageMultiplier: 1,
                },
            },
            seMetering: {
                attributes: {
                    divisor: 1000,
                    multiplier: 1,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "combo",
                endpoints: [{inputClusters: ["genOnOff", "seMetering", "haElectricalMeasurement"], outputClusters: [], attributes}],
            }),
            meta: undefined,
            fromZigbee: [fz.on_off, fz.power_on_behavior, fz.electrical_measurement, fz.metering],
            toZigbee: [
                "state",
                "on_time",
                "off_wait_time",
                "power_on_behavior",
                "power",
                "voltage",
                "current",
                "energy",
                "produced_energy",
                "ac_frequency",
                "power_factor",
            ],
            exposes: ["current", "energy", "power", "power_on_behavior", "switch(state)", "voltage"],
            bind: {1: ["genOnOff", "haElectricalMeasurement", "seMetering"]},
            read: {
                1: [
                    ["genOnOff", ["onOff"]],
                    ["genOnOff", ["startUpOnOff"]],
                    ["haElectricalMeasurement", ["acPowerDivisor", "acPowerMultiplier"]],
                    ["haElectricalMeasurement", ["acCurrentDivisor", "acCurrentMultiplier"]],
                    ["haElectricalMeasurement", ["acVoltageDivisor", "acVoltageMultiplier"]],
                    ["haElectricalMeasurement", ["activePower", "rmsCurrent", "rmsVoltage"]],
                    ["seMetering", ["divisor", "multiplier"]],
                    ["seMetering", ["currentSummDelivered"]],
                ],
            },
            write: {},
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
    extend: [m.onOff(), m.electricityMeter()],
};
            `,
        });
    });

    test("Electricity DC meter", async () => {
        const attributes = {
            haElectricalMeasurement: {
                attributes: {
                    measurementType: 1 << 6,
                    dcPowerDivisor: 10000,
                    dcPowerMultiplier: 1,
                    dcCurrentDivisor: 1000,
                    dcCurrentMultiplier: 1,
                    dcVoltageDivisor: 100,
                    dcVoltageMultiplier: 1,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "dc",
                endpoints: [{ID: 2, inputClusters: ["haElectricalMeasurement"], attributes}],
            }),
            meta: undefined,
            fromZigbee: [fz.electrical_measurement],
            toZigbee: ["voltage", "current", "power"],
            exposes: ["current_2", "power_2", "voltage_2"],
            bind: {2: ["haElectricalMeasurement"]},
            read: {
                2: [
                    ["haElectricalMeasurement", ["dcPowerDivisor", "dcPowerMultiplier"]],
                    ["haElectricalMeasurement", ["dcVoltageDivisor", "dcVoltageMultiplier"]],
                    ["haElectricalMeasurement", ["dcCurrentDivisor", "dcCurrentMultiplier"]],
                    ["haElectricalMeasurement", ["dcPower", "dcVoltage", "dcCurrent"]],
                ],
            },
            write: {},
            configureReporting: {
                2: [
                    [
                        "haElectricalMeasurement",
                        [
                            reportingItem("dcPower", 10, 65000, 1000),
                            reportingItem("dcVoltage", 10, 65000, 10),
                            reportingItem("dcCurrent", 10, 65000, 100),
                        ],
                    ],
                ],
            },
            externalDefinitionSource: `
import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['dc'],
    model: 'dc',
    vendor: '',
    description: 'Automatically generated definition',
    extend: [m.electricityMeter({"cluster":"electrical","electricalMeasurementType":"dc","endpointNames":["2"]})],
};
            `,
        });
    });

    test("input(genBinaryInput), output(genBinaryOutput, genAnalogOutput)", async () => {
        const attr10 = {
            genBinaryInput: {
                attributes: {
                    description: "my_binary_name",
                },
            },
            genAnalogOutput: {
                attributes: {
                    description: "my_output_name",
                    applicationType: 0,
                    engineeringUnits: 62,
                    minPresentValue: 0.0,
                    maxPresentValue: 30.0,
                    resolution: 0.1,
                    presentValue: 15.0,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "temp",
                endpoints: [
                    {
                        ID: 10,
                        inputClusters: ["genBinaryInput", "genBinaryOutput", "genAnalogOutput"],
                        outputClusters: [],
                        attributes: attr10,
                        read: vi.fn(async () => Promise.reject(new Error("use-fallback"))),
                    },
                ],
            }),
            meta: undefined,
            fromZigbee: [
                expect.objectContaining({cluster: "genBinaryInput"}),
                expect.objectContaining({cluster: "genBinaryOutput"}),
                expect.objectContaining({cluster: "genAnalogOutput"}),
            ],
            toZigbee: ["my_binary_name", "binary_output_10", "my_output_name"],
            exposes: ["binary_output_10", "my_binary_name", "my_output_name"],
            bind: {10: ["genBinaryInput", "genBinaryOutput", "genAnalogOutput"]},
            read: {
                10: [
                    ["genBinaryOutput", ["description"], {sendPolicy: "immediate", disableRecovery: true}],
                    ["genBinaryInput", ["presentValue"]],
                    ["genBinaryOutput", ["presentValue"]],
                    ["genAnalogOutput", ["presentValue"]],
                ],
            },
            write: {},
            configureReporting: {
                10: [
                    ["genBinaryInput", [reportingItem("presentValue", 0, 65000, 1)]],
                    ["genBinaryOutput", [reportingItem("presentValue", 0, 65000, 1)]],
                    ["genAnalogOutput", [reportingItem("presentValue", 0, 65000, 1)]],
                ],
            },
        });
    });

    test("input(genAnalogInput), x2 endpoints", async () => {
        const attr10 = {
            genAnalogInput: {
                attributes: {
                    description: "my_custom_name",
                    applicationType: 0,
                    engineeringUnits: 62,
                    minPresentValue: 0.0,
                    maxPresentValue: 30.0,
                    resolution: 0.1,
                    presentValue: 15.0,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "temp",
                endpoints: [
                    {ID: 10, inputClusters: ["genAnalogInput"], outputClusters: [], attributes: attr10},
                    {
                        ID: 11,
                        inputClusters: ["genAnalogInput"],
                        outputClusters: [],
                        read: vi.fn(async () => Promise.reject(new Error("use-fallback"))),
                    },
                ],
            }),
            meta: {multiEndpoint: true},
            fromZigbee: [expect.objectContaining({cluster: "genAnalogInput"}), expect.objectContaining({cluster: "genAnalogInput"})],
            toZigbee: ["my_custom_name", "analog_input"],
            exposes: ["analog_input_11", "my_custom_name_10"],
            bind: {10: ["genAnalogInput"], 11: ["genAnalogInput"]},
            read: {
                10: [["genAnalogInput", ["presentValue"]]],
                11: [
                    ["genAnalogInput", ["description"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["genAnalogInput", ["applicationType"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["genAnalogInput", ["engineeringUnits"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["genAnalogInput", ["minPresentValue"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["genAnalogInput", ["maxPresentValue"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["genAnalogInput", ["resolution"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["genAnalogInput", ["presentValue"]],
                ],
            },
            write: {},
            configureReporting: {
                10: [["genAnalogInput", [reportingItem("presentValue", 0, 65000, 1)]]],
                11: [["genAnalogInput", [reportingItem("presentValue", 0, 65000, 1)]]],
            },
            endpoints: {"10": 10, "11": 11},
        });
    });

    test("input(hvacFanCtrl)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "fan", endpoints: [{inputClusters: ["hvacFanCtrl"], outputClusters: []}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: "hvacFanCtrl"})],
            toZigbee: ["fan_mode", "fan_state"],
            exposes: ["fan(state,mode)"],
            bind: {1: ["hvacFanCtrl", "hvacFanCtrl"]},
            read: {1: [["hvacFanCtrl", ["fanMode"]]]},
            write: {},
            configureReporting: {
                1: [["hvacFanCtrl", [reportingItem("fanMode", 0, repInterval.HOUR, 0)]]],
            },
        });
    });

    test("input(hvacUserInterfaceCfg)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "thermostat_ui", endpoints: [{inputClusters: ["hvacUserInterfaceCfg"], outputClusters: []}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: "hvacUserInterfaceCfg"})],
            toZigbee: ["temperature_display_mode", "keypad_lockout"],
            exposes: ["keypad_lockout", "temperature_display_mode"],
            bind: {1: ["hvacUserInterfaceCfg", "hvacUserInterfaceCfg"]},
            read: {1: [["hvacUserInterfaceCfg", ["keypadLockout"]]]},
            write: {},
            configureReporting: {
                1: [["hvacUserInterfaceCfg", [reportingItem("keypadLockout", 10, repInterval.HOUR, 0)]]],
            },
        });
    });

    test("input(hvacThermostat) heating only", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "thermo_heat",
                endpoints: [{inputClusters: ["hvacThermostat"], outputClusters: []}],
            }),
            meta: {thermostat: {}},
            fromZigbee: [expect.objectContaining({cluster: "hvacThermostat"})],
            toZigbee: ["local_temperature", "occupied_heating_setpoint", "system_mode", "running_state"],
            exposes: ["climate(local_temperature,occupied_heating_setpoint,system_mode,running_state)"],
            bind: {1: ["hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat"]},
            read: {
                1: [
                    ["hvacThermostat", ["ctrlSeqeOfOper"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["hvacThermostat", ["localTemp"]],
                    ["hvacThermostat", ["occupiedHeatingSetpoint"]],
                    ["hvacThermostat", ["systemMode"]],
                    ["hvacThermostat", ["runningState"]],
                ],
            },
            write: {},
            configureReporting: {
                1: [
                    ["hvacThermostat", [reportingItem("localTemp", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("occupiedHeatingSetpoint", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("systemMode", 0, repInterval.HOUR, 0)]],
                    ["hvacThermostat", [reportingItem("runningState", 0, repInterval.HOUR, 0)]],
                ],
            },
        });
    });

    test("input(hvacThermostat, hvacFanCtrl) on same endpoint", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "thermo_fan",
                endpoints: [{inputClusters: ["hvacThermostat", "hvacFanCtrl"], outputClusters: []}],
            }),
            meta: {thermostat: {}},
            fromZigbee: [expect.objectContaining({cluster: "hvacThermostat"})],
            toZigbee: ["local_temperature", "occupied_heating_setpoint", "system_mode", "running_state", "fan_mode", "fan_state"],
            exposes: ["climate(local_temperature,occupied_heating_setpoint,system_mode,running_state,fan_mode)"],
            bind: {1: ["hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacFanCtrl", "hvacFanCtrl"]},
            read: {
                1: [
                    ["hvacThermostat", ["ctrlSeqeOfOper"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["hvacThermostat", ["localTemp"]],
                    ["hvacThermostat", ["occupiedHeatingSetpoint"]],
                    ["hvacThermostat", ["systemMode"]],
                    ["hvacThermostat", ["runningState"]],
                    ["hvacFanCtrl", ["fanMode"]],
                ],
            },
            write: {},
            configureReporting: {
                1: [
                    ["hvacThermostat", [reportingItem("localTemp", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("occupiedHeatingSetpoint", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("systemMode", 0, repInterval.HOUR, 0)]],
                    ["hvacThermostat", [reportingItem("runningState", 0, repInterval.HOUR, 0)]],
                    ["hvacFanCtrl", [reportingItem("fanMode", 0, repInterval.HOUR, 0)]],
                ],
            },
        });
    });

    test("input(hvacThermostat) cooling only", async () => {
        const attributes = {
            hvacThermostat: {
                attributes: {
                    ctrlSeqeOfOper: 0,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "thermo_cool",
                endpoints: [{inputClusters: ["hvacThermostat"], outputClusters: [], attributes}],
            }),
            meta: {thermostat: {}},
            fromZigbee: [expect.objectContaining({cluster: "hvacThermostat"})],
            toZigbee: ["local_temperature", "occupied_cooling_setpoint", "system_mode", "running_state"],
            exposes: ["climate(local_temperature,occupied_cooling_setpoint,system_mode,running_state)"],
            bind: {1: ["hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat"]},
            read: {
                1: [
                    ["hvacThermostat", ["localTemp"]],
                    ["hvacThermostat", ["occupiedCoolingSetpoint"]],
                    ["hvacThermostat", ["systemMode"]],
                    ["hvacThermostat", ["runningState"]],
                ],
            },
            write: {},
            configureReporting: {
                1: [
                    ["hvacThermostat", [reportingItem("localTemp", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("occupiedCoolingSetpoint", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("systemMode", 0, repInterval.HOUR, 0)]],
                    ["hvacThermostat", [reportingItem("runningState", 0, repInterval.HOUR, 0)]],
                ],
            },
        });
    });

    test("input(hvacThermostat) heating only (ctrlSeqeOfOper=2)", async () => {
        const attributes = {
            hvacThermostat: {
                attributes: {
                    ctrlSeqeOfOper: 2,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "thermo_heat2",
                endpoints: [{inputClusters: ["hvacThermostat"], outputClusters: [], attributes}],
            }),
            meta: {thermostat: {}},
            fromZigbee: [expect.objectContaining({cluster: "hvacThermostat"})],
            toZigbee: ["local_temperature", "occupied_heating_setpoint", "system_mode", "running_state"],
            exposes: ["climate(local_temperature,occupied_heating_setpoint,system_mode,running_state)"],
            bind: {1: ["hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat"]},
            read: {
                1: [
                    ["hvacThermostat", ["localTemp"]],
                    ["hvacThermostat", ["occupiedHeatingSetpoint"]],
                    ["hvacThermostat", ["systemMode"]],
                    ["hvacThermostat", ["runningState"]],
                ],
            },
            write: {},
            configureReporting: {
                1: [
                    ["hvacThermostat", [reportingItem("localTemp", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("occupiedHeatingSetpoint", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("systemMode", 0, repInterval.HOUR, 0)]],
                    ["hvacThermostat", [reportingItem("runningState", 0, repInterval.HOUR, 0)]],
                ],
            },
        });
    });

    test("input(hvacThermostat) heating and cooling", async () => {
        const attributes = {
            hvacThermostat: {
                attributes: {
                    ctrlSeqeOfOper: 4,
                },
            },
        };

        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "thermo_both",
                endpoints: [{inputClusters: ["hvacThermostat"], outputClusters: [], attributes}],
            }),
            meta: {thermostat: {}},
            fromZigbee: [expect.objectContaining({cluster: "hvacThermostat"})],
            toZigbee: ["local_temperature", "occupied_heating_setpoint", "occupied_cooling_setpoint", "system_mode", "running_state"],
            exposes: ["climate(local_temperature,occupied_heating_setpoint,occupied_cooling_setpoint,system_mode,running_state)"],
            bind: {1: ["hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat", "hvacThermostat"]},
            read: {
                1: [
                    ["hvacThermostat", ["localTemp"]],
                    ["hvacThermostat", ["occupiedHeatingSetpoint"]],
                    ["hvacThermostat", ["occupiedCoolingSetpoint"]],
                    ["hvacThermostat", ["systemMode"]],
                    ["hvacThermostat", ["runningState"]],
                ],
            },
            write: {},
            configureReporting: {
                1: [
                    ["hvacThermostat", [reportingItem("localTemp", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("occupiedHeatingSetpoint", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("occupiedCoolingSetpoint", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("systemMode", 0, repInterval.HOUR, 0)]],
                    ["hvacThermostat", [reportingItem("runningState", 0, repInterval.HOUR, 0)]],
                ],
            },
        });
    });

    test("input(hvacThermostat) ctrlSeqeOfOper persisted in device meta", async () => {
        const device = mockDevice({
            modelID: "thermo_meta",
            endpoints: [{inputClusters: ["hvacThermostat"], outputClusters: [], read: vi.fn(async () => ({ctrlSeqeOfOper: 2}))}],
        });

        await findByDevice(device, true);
        expect(device.endpoints[0].read).toHaveBeenCalled();
        expect(device.meta.ctrlSeqeOfOper).toEqual({1: 2});

        // Second generation must reuse the persisted value without reading from the device again.
        vi.mocked(device.endpoints[0].read).mockClear();
        await findByDevice(device, true);
        expect(device.endpoints[0].read).not.toHaveBeenCalled();
    });

    test("input(hvacThermostat, hvacFanCtrl, hvacUserInterfaceCfg) full HVAC", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({
                modelID: "full_hvac",
                endpoints: [{inputClusters: ["hvacThermostat", "hvacFanCtrl", "hvacUserInterfaceCfg"], outputClusters: []}],
            }),
            meta: {thermostat: {}},
            fromZigbee: [expect.objectContaining({cluster: "hvacThermostat"}), expect.objectContaining({cluster: "hvacUserInterfaceCfg"})],
            toZigbee: [
                "local_temperature",
                "occupied_heating_setpoint",
                "system_mode",
                "running_state",
                "fan_mode",
                "fan_state",
                "temperature_display_mode",
                "keypad_lockout",
            ],
            exposes: [
                "climate(local_temperature,occupied_heating_setpoint,system_mode,running_state,fan_mode)",
                "keypad_lockout",
                "temperature_display_mode",
            ],
            bind: {
                1: [
                    "hvacThermostat",
                    "hvacThermostat",
                    "hvacThermostat",
                    "hvacThermostat",
                    "hvacThermostat",
                    "hvacFanCtrl",
                    "hvacFanCtrl",
                    "hvacUserInterfaceCfg",
                    "hvacUserInterfaceCfg",
                ],
            },
            read: {
                1: [
                    ["hvacThermostat", ["ctrlSeqeOfOper"], {disableRecovery: true, sendPolicy: "immediate"}],
                    ["hvacThermostat", ["localTemp"]],
                    ["hvacThermostat", ["occupiedHeatingSetpoint"]],
                    ["hvacThermostat", ["systemMode"]],
                    ["hvacThermostat", ["runningState"]],
                    ["hvacFanCtrl", ["fanMode"]],
                    ["hvacUserInterfaceCfg", ["keypadLockout"]],
                ],
            },
            write: {},
            configureReporting: {
                1: [
                    ["hvacThermostat", [reportingItem("localTemp", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("occupiedHeatingSetpoint", 0, repInterval.HOUR, 10)]],
                    ["hvacThermostat", [reportingItem("systemMode", 0, repInterval.HOUR, 0)]],
                    ["hvacThermostat", [reportingItem("runningState", 0, repInterval.HOUR, 0)]],
                    ["hvacFanCtrl", [reportingItem("fanMode", 0, repInterval.HOUR, 0)]],
                    ["hvacUserInterfaceCfg", [reportingItem("keypadLockout", 10, repInterval.HOUR, 0)]],
                ],
            },
        });
    });

    test("input(genIdentify)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "identify_device", endpoints: [{inputClusters: ["genIdentify"], outputClusters: []}]}),
            meta: undefined,
            fromZigbee: [],
            toZigbee: ["identify"],
            exposes: ["identify"],
            bind: {},
            read: {},
            write: {},
            configureReporting: {},
        });
    });

    test("input(lightingBallastCfg)", async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: "ballast_device", endpoints: [{inputClusters: ["lightingBallastCfg"], outputClusters: []}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: "lightingBallastCfg"})],
            toZigbee: ["ballast_config", "ballast_minimum_level", "ballast_maximum_level", "ballast_power_on_level"],
            exposes: ["ballast_maximum_level", "ballast_minimum_level"],
            bind: {},
            read: {1: [["lightingBallastCfg", ["minLevel", "maxLevel"]]]},
            write: {},
            configureReporting: {},
        });
    });
});
