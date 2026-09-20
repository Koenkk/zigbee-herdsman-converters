import {Zcl} from "zigbee-herdsman";
import * as exposes from "./exposes";
import * as m from "./modernExtend";
import * as reporting from "./reporting";
import type {Configure, Expose, Fz, ModernExtend, Tz} from "./types";
import * as utils from "./utils";

const e = exposes.presets;
const ea = exposes.access;

interface AduroRemote {
    attributes: Record<string, never>;
    commands: {reportKey: {key1Value: number; key2Value: number; keyMode: number}};
    commandResponses: Record<string, never>;
}

interface AduroAccelerometerPayload extends Record<string, unknown> {
    attr0Enum: number;
    attr0ValueType: number;
    accelerometerXValue: number;
    attr1Enum: number;
    attr1ValueType: number;
    accelerometerYValue: number;
    attr2Enum: number;
    attr2ValueType: number;
    accelerometerZValue: number;
}

interface AduroAccelerometer {
    attributes: Record<string, never>;
    // Fz.Converter currently derives command payload types from `commands`, including server-to-client commands.
    commands: {reportAccelerometer: AduroAccelerometerPayload};
    commandResponses: {reportAccelerometer: AduroAccelerometerPayload};
}

function remote(actionLookup: Record<number, string>): ModernExtend {
    const customCluster = m.deviceAddCustomCluster("remoteKey", {
        name: "remoteKey",
        ID: 0xfccc,
        attributes: {},
        commands: {
            reportKey: {
                name: "reportKey",
                ID: 0x00,
                parameters: [
                    {name: "key1Value", type: Zcl.DataType.UINT8},
                    {name: "key2Value", type: Zcl.DataType.UINT8},
                    {name: "keyMode", type: Zcl.DataType.UINT8},
                ],
            },
        },
        commandsResponse: {},
    });
    const fromZigbee = [
        {
            cluster: "remoteKey",
            type: "commandReportKey",
            convert: (model, msg) => {
                const action = actionLookup[msg.data.key2Value];
                return action ? {action} : undefined;
            },
        } satisfies Fz.Converter<"remoteKey", AduroRemote, "commandReportKey">,
    ];
    const configure: Configure[] = [
        ...(customCluster.configure ?? []),
        async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).bind("remoteKey", coordinatorEndpoint);
        },
    ];

    return {...customCluster, fromZigbee, exposes: [e.action(Object.values(actionLookup))], configure};
}

function accelerometer(): ModernExtend {
    const customCluster = m.deviceAddCustomCluster("accelerometerMeasurement", {
        name: "accelerometerMeasurement",
        ID: 0xfcc1,
        manufacturerCode: 4653,
        attributes: {},
        commands: {},
        commandsResponse: {
            reportAccelerometer: {
                name: "reportAccelerometer",
                ID: 0x0a,
                parameters: [
                    {name: "attr0Enum", type: Zcl.DataType.UINT16},
                    {name: "attr0ValueType", type: Zcl.DataType.UINT8},
                    {name: "accelerometerXValue", type: Zcl.DataType.INT16},
                    {name: "attr1Enum", type: Zcl.DataType.UINT16},
                    {name: "attr1ValueType", type: Zcl.DataType.UINT8},
                    {name: "accelerometerYValue", type: Zcl.DataType.INT16},
                    {name: "attr2Enum", type: Zcl.DataType.UINT16},
                    {name: "attr2ValueType", type: Zcl.DataType.UINT8},
                    {name: "accelerometerZValue", type: Zcl.DataType.INT16},
                ],
            },
        },
    });
    const convertAcceleration = (value: number): number => Math.round(((value >> 2) * 977) / 1000 + 0.5);
    const fromZigbee = [
        {
            cluster: "accelerometerMeasurement",
            type: "commandReportAccelerometer",
            convert: (model, msg) => ({
                x_axis: convertAcceleration(msg.data.accelerometerXValue),
                y_axis: convertAcceleration(msg.data.accelerometerYValue),
                z_axis: convertAcceleration(msg.data.accelerometerZValue),
            }),
        } satisfies Fz.Converter<"accelerometerMeasurement", AduroAccelerometer, "commandReportAccelerometer">,
    ];
    const configure: Configure[] = [
        ...(customCluster.configure ?? []),
        async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).bind("accelerometerMeasurement", coordinatorEndpoint);
        },
    ];

    return {
        ...customCluster,
        fromZigbee,
        exposes: [
            e.numeric("x_axis", ea.STATE).withDescription("X-axis acceleration"),
            e.numeric("y_axis", ea.STATE).withDescription("Y-axis acceleration"),
            e.numeric("z_axis", ea.STATE).withDescription("Z-axis acceleration"),
        ],
        configure,
    };
}

function onOffReporting(): ModernExtend {
    return {
        configure: [
            async (device, coordinatorEndpoint) => {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
                await reporting.onOff(endpoint, {min: 0, max: 300, change: 1});
            },
        ],
        isModernExtend: true,
    };
}

function electricityMeter(): ModernExtend {
    return m.electricityMeter({
        cluster: "electrical",
        energy: false,
        power: {multiplier: 1, divisor: 10, min: 0, max: 300, change: 0.1},
        current: {multiplier: 1, divisor: 1000, min: 0, max: 300, change: 0.01},
        voltage: {multiplier: 1, divisor: 100, min: 0, max: 300, change: 0.01},
    });
}

const iasZoneBinding = (): ModernExtend => m.bindCluster({cluster: "ssIasZone", clusterType: "input"});

function contactSensor(): ModernExtend[] {
    return [
        m.battery({percentageReportingConfig: {min: 0, max: 60000, change: 1}}),
        m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1"]}),
        iasZoneBinding(),
    ];
}

function motionSensor(): ModernExtend[] {
    return [
        m.battery({percentageReportingConfig: {min: 0, max: 60000, change: 1}}),
        m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_2"]}),
        iasZoneBinding(),
    ];
}

function multiContactSensor(): ModernExtend[] {
    return [
        accelerometer(),
        m.battery({percentageReportingConfig: {min: 3600, max: 65000, change: 2}}),
        m.temperature({reporting: {min: 10, max: 3600, change: 100}}),
        m.humidity({reporting: {min: 10, max: 3600, change: 100}}),
        m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1"]}),
        iasZoneBinding(),
    ];
}

function multiMotionSensor(): ModernExtend[] {
    return [
        m.battery({percentageReportingConfig: {min: 3600, max: 65000, change: 2}}),
        m.occupancy({reportingConfig: {min: 1, max: 3600, change: 0}}),
        m.temperature({reporting: {min: 10, max: 3600, change: 100}}),
        m.humidity({reporting: {min: 10, max: 3600, change: 100}}),
        m.illuminance({reporting: {min: 5, max: 3600, change: 100}}),
    ];
}

function siren(): ModernExtend[] {
    return [m.iasZoneAlarm({zoneType: "alarm", zoneAttributes: ["alarm_1"]}), m.iasWarning()];
}

const extend = {
    contactSensor,
    motionSensor,
    dimmerRemote: (): ModernExtend => remote({0: "on", 1: "up", 2: "down", 3: "off"}),
    sceneRemote: (): ModernExtend => remote({0: "toggle", 1: "button_1", 2: "button_2", 3: "button_3"}),
    multiContactSensor,
    multiMotionSensor,
    onOffReporting,
    electricityMeter,
    siren,
    dimmerLoadControlMode: (): ModernExtend => {
        const attribute = 0x7600;
        const data_type = 0x20;
        const value_map: {[key: number]: string} = {
            0: "leading_edge_control",
            1: "trailing_edge_control",
        };
        const value_lookup: {[key: string]: number} = {
            leading_edge_control: 0,
            trailing_edge_control: 1,
        };

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute] as number;
                        return {
                            dimmer_load_control_mode: value_map[value] || "unknown",
                            dimmer_load_control_mode_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_load_control_mode"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const numericValue = value_lookup[value] ?? Number.parseInt(value, 10);
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_load_control_mode: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("genBasic", [attribute]);
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e.enum("dimmer_load_control_mode", ea.ALL, ["leading_edge_control", "trailing_edge_control"]).withLabel("Load Control Mode"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer load control mode attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerSwitchMode: (): ModernExtend => {
        const attribute = 0x7700;
        const data_type = 0x20;
        const value_map: {[key: number]: string} = {
            0: "momentary_switch",
            1: "toggle_switch",
            2: "roller_blind_switch",
        };
        const value_lookup: {[key: string]: number} = {
            momentary_switch: 0,
            toggle_switch: 1,
            roller_blind_switch: 2,
        };

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute] as number;
                        return {
                            dimmer_switch_mode: value_map[value] || "unknown",
                            dimmer_switch_mode_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_switch_mode"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const numericValue = value_lookup[value] ?? Number.parseInt(value, 10);
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_switch_mode: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("genBasic", [attribute]);
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e.enum("dimmer_switch_mode", ea.ALL, ["momentary_switch", "toggle_switch", "roller_blind_switch"]).withLabel("Switch Mode"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer switch mode attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerInvertSwitch: (): ModernExtend => {
        const attribute = 0x7701;
        const data_type = 0x10;
        const value_map: {[key: number]: string} = {
            0: "disabled",
            1: "enabled",
        };
        const value_lookup: {[key: string]: number} = {
            disabled: 0,
            enabled: 1,
        };

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute] as number;
                        return {
                            dimmer_invert_switch: value_map[value] || "unknown",
                            dimmer_invert_switch_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_invert_switch"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const numericValue = value_lookup[value] ?? Number.parseInt(value, 10);
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_invert_switch: value}};
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [e.enum("dimmer_invert_switch", ea.STATE_SET, ["disabled", "enabled"]).withLabel("Invert Switch")];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer invert switch attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerSceneActivation: (): ModernExtend => {
        const attribute = 0x7702;
        const data_type = 0x10;
        const value_map: {[key: number]: string} = {
            0: "disabled",
            1: "enabled",
        };
        const value_lookup: {[key: string]: number} = {
            disabled: 0,
            enabled: 1,
        };

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute] as number;
                        return {
                            dimmer_scene_activation: value_map[value] || "unknown",
                            dimmer_scene_activation_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_scene_activation"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const numericValue = value_lookup[value] ?? Number.parseInt(value, 10);
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_scene_activation: value}};
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [e.enum("dimmer_scene_activation", ea.STATE_SET, ["disabled", "enabled"]).withLabel("Scene Activation")];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer scene activation attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerS1DoubleClickScene: (): ModernExtend => {
        const attribute = 0x7703;
        const data_type = 0x20;
        const value_map: {[key: number]: string} = {
            0: "null",
            1: "on",
            2: "off",
            3: "dimming_up",
            4: "dimming_down",
            5: "dimming_to_brightest",
            6: "dimming_to_darkest",
        };
        const value_lookup: {[key: string]: number} = {
            null: 0,
            on: 1,
            off: 2,
            dimming_up: 3,
            dimming_down: 4,
            dimming_to_brightest: 5,
            dimming_to_darkest: 6,
        };

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute] as number;
                        return {
                            dimmer_s1_double_click_scene: value_map[value] || "unknown",
                            dimmer_s1_double_click_scene_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_s1_double_click_scene"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const numericValue = value_lookup[value] ?? Number.parseInt(value, 10);
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_s1_double_click_scene: value}};
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e
                .enum("dimmer_s1_double_click_scene", ea.STATE_SET, [
                    "null",
                    "on",
                    "off",
                    "dimming_up",
                    "dimming_down",
                    "dimming_to_brightest",
                    "dimming_to_darkest",
                ])
                .withLabel("S1 Double Click Scene"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer s1 double click scene attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerS2DoubleClickScene: (): ModernExtend => {
        const attribute = 0x7704;
        const data_type = 0x20;
        const value_map: {[key: number]: string} = {
            0: "null",
            1: "on",
            2: "off",
            3: "dimming_up",
            4: "dimming_down",
            5: "dimming_to_brightest",
            6: "dimming_to_darkest",
        };
        const value_lookup: {[key: string]: number} = {
            null: 0,
            on: 1,
            off: 2,
            dimming_up: 3,
            dimming_down: 4,
            dimming_to_brightest: 5,
            dimming_to_darkest: 6,
        };

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute] as number;
                        return {
                            dimmer_s2_double_click_scene: value_map[value] || "unknown",
                            dimmer_s2_double_click_scene_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_s2_double_click_scene"],
                convertSet: async (entity, key, value, meta) => {
                    utils.assertString(value);
                    const numericValue = value_lookup[value] ?? Number.parseInt(value, 10);
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_s2_double_click_scene: value}};
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e
                .enum("dimmer_s2_double_click_scene", ea.STATE_SET, [
                    "null",
                    "on",
                    "off",
                    "dimming_up",
                    "dimming_down",
                    "dimming_to_brightest",
                    "dimming_to_darkest",
                ])
                .withLabel("S2 Double Click Scene"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer s2 double click scene attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerMinBrightnessLevel: (): ModernExtend => {
        const attribute = 0x7800;
        const data_type = 0x20;

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute];
                        return {
                            dimmer_min_brightness_level_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_min_brightness_level"],
                convertSet: async (entity, key, value, meta) => {
                    const numericValue = value;
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_min_brightness_level: value}};
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e
                .numeric("dimmer_min_brightness_level", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(100)
                .withValueStep(1)
                .withLabel("Min Brightness Level"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer min brightness level attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerMaxBrightnessLevel: (): ModernExtend => {
        const attribute = 0x7801;
        const data_type = 0x20;

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute];
                        return {
                            dimmer_max_brightness_level_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_max_brightness_level"],
                convertSet: async (entity, key, value, meta) => {
                    const numericValue = value;
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_max_brightness_level: value}};
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e
                .numeric("dimmer_max_brightness_level", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(100)
                .withValueStep(1)
                .withLabel("Max Brightness Level"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer max brightness level attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerManualDimmingStepSize: (): ModernExtend => {
        const attribute = 0x7802;
        const data_type = 0x20;

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute];
                        return {
                            dimmer_manual_dimming_step_size_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_manual_dimming_step_size"],
                convertSet: async (entity, key, value, meta) => {
                    const numericValue = value;
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_manual_dimming_step_size: value}};
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e
                .numeric("dimmer_manual_dimming_step_size", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(25)
                .withValueStep(1)
                .withLabel("Manual Dimming Step Size"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer manual dimming step size attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },

    dimmerManualDimmingTime: (): ModernExtend => {
        const attribute = 0x7803;
        const data_type = 0x21;

        const fromZigbee = [
            {
                cluster: "genBasic",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (Object.hasOwn(msg.data, attribute)) {
                        const value = msg.data[attribute];
                        return {
                            dimmer_manual_dimming_time_numeric: value,
                        };
                    }
                    return undefined;
                },
            } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["dimmer_manual_dimming_time"],
                convertSet: async (entity, key, value, meta) => {
                    const numericValue = value;
                    await entity.write("genBasic", {[attribute]: {value: numericValue, type: data_type}});
                    return {state: {dimmer_manual_dimming_time: value}};
                },
            } satisfies Tz.Converter,
        ];

        const exposes: Expose[] = [
            e
                .numeric("dimmer_manual_dimming_time", ea.STATE_SET)
                .withUnit("ms")
                .withValueMin(100)
                .withValueMax(10000)
                .withValueStep(100)
                .withLabel("Manual Dimming Time"),
        ];

        const configure: [Configure] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                try {
                    await endpoint.read("genBasic", [attribute]);
                } catch (error) {
                    console.warn(`Failed to read dimmer manual dimming time attribute: ${error}`);
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        };
    },
};

export {extend};
