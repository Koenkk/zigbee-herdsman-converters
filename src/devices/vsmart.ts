import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, ModernExtend, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const VSMART_MANUFACTURER_CODE = 0x1379;

const COMMAND_DELAY_MS = 100;
const HOUR_TO_PERIOD_MULTIPLIER = 4;
const MAX_PERCENTAGE = 100;
const MAX_HOUR = 23;
const MIN_HOUR = 0;

const vsmartContactAlarm: Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport"]> = {
    cluster: "ssIasZone",
    type: ["commandStatusChangeNotification", "attributeReport"],
    convert: (_model, msg, _publish, _options, _meta) => {
        const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
        if (zoneStatus !== undefined) {
            return {
                contact: (zoneStatus & 1) > 0, // No inversion for VSmart
                tamper: (zoneStatus & (1 << 2)) > 0,
                battery_low: (zoneStatus & (1 << 3)) > 0,
            };
        }
    },
};

interface VSmartLedControl {
    attributes: Record<string, never>;
    commands: {
        setLedColor: {data: number[]};
        setVibrationIntensity: {data: number[]};
        setLedIntensity: {data: number[]};
        setLedBrightnessLevel: {data: number[]};
        setTimePeriod: {data: number[]};
    };
    commandResponses: {
        setLedColor: {data: number[]};
        setVibrationIntensity: {data: number[]};
        setLedIntensity: {data: number[]};
        setLedBrightnessLevel: {data: number[]};
        setTimePeriod: {data: number[]};
    };
}

const createLedIntensityConverter = (fieldName: string, endpointIndex: number, periodName: string): Tz.Converter => ({
    key: [fieldName],
    convertSet: async (entity, key, value) => {
        const percentage = Number(value);

        if (Number.isNaN(percentage) || percentage < 0 || percentage > MAX_PERCENTAGE) {
            throw new Error(`Invalid ${periodName} LED intensity. Expected: 0-${MAX_PERCENTAGE}%`);
        }

        const intensity = Math.round((percentage * 255) / MAX_PERCENTAGE);

        const payload = {data: [intensity, endpointIndex, 0]};

        await entity.command<"vsmartSwitchControl", "setLedIntensity", VSmartLedControl>("vsmartSwitchControl", "setLedIntensity", payload, {
            manufacturerCode: VSMART_MANUFACTURER_CODE,
            disableDefaultResponse: true,
        });

        return {
            state: {
                [key]: percentage,
            },
        };
    },
});

const vsmartExtend = {
    customCluster: (): ModernExtend =>
        m.deviceAddCustomCluster("vsmartSwitchControl", {
            ID: 0x0000,
            manufacturerCode: VSMART_MANUFACTURER_CODE,
            attributes: {},
            commands: {
                setLedColor: {
                    ID: 0xf3,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
                setVibrationIntensity: {
                    ID: 0xf0,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
                setLedBrightnessLevel: {
                    ID: 0xf4,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
                setLedIntensity: {
                    ID: 0xf2,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
                setTimePeriod: {
                    ID: 0xf5,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
            },
            commandsResponse: {
                setLedColor: {
                    ID: 0xf3,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
                setVibrationIntensity: {
                    ID: 0xf0,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
                setLedBrightnessLevel: {
                    ID: 0xf4,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
                setLedIntensity: {
                    ID: 0xf2,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
                setTimePeriod: {
                    ID: 0xf5,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
            },
        }),
    addLedColorControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .text("ledIndicatorColorOn", ea.SET)
                .withDescription("LED indicator color when switch is ON (hex format: #RRGGBB, e.g., #ff0000 for red)"),
            exposes
                .text("ledIndicatorColorOff", ea.SET)
                .withDescription("LED indicator color when switch is OFF (hex format: #RRGGBB, e.g., #ffffff for white)"),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["ledIndicatorColorOn", "ledIndicatorColorOff"],
                convertSet: async (entity, key, value) => {
                    const hexColor = String(value).trim();

                    const hexMatch = hexColor.match(/^#?([0-9a-fA-F]{6})$/);
                    if (!hexMatch) {
                        throw new Error("Invalid color format. Expected hex format: #RRGGBB (e.g., #ff0000)");
                    }

                    const hex = hexMatch[1];
                    const r = Number.parseInt(hex.substring(0, 2), 16);
                    const g = Number.parseInt(hex.substring(2, 4), 16);
                    const b = Number.parseInt(hex.substring(4, 6), 16);

                    const state = key === "ledIndicatorColorOn" ? 0x01 : 0x00;
                    const payload = {
                        data: [r, g, b, state],
                    };

                    await entity.command<"vsmartSwitchControl", "setLedColor", VSmartLedControl>("vsmartSwitchControl", "setLedColor", payload, {
                        manufacturerCode: VSMART_MANUFACTURER_CODE,
                        disableDefaultResponse: true,
                    });

                    return {
                        state: {
                            [key]: `#${hex.toLowerCase()}`,
                        },
                    };
                },
            },
        ];

        return {exposes: exposes_list, toZigbee, isModernExtend: true};
    },
    addVibrationIntensityControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .numeric("vibrationIntensity", ea.SET)
                .withValueMin(0)
                .withValueMax(MAX_PERCENTAGE)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("Button vibration intensity (0-100%)"),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["vibrationIntensity"],
                convertSet: async (entity, key, value) => {
                    const intensity = Number(value);

                    if (typeof value === "undefined" || Number.isNaN(intensity) || intensity < 0 || intensity > MAX_PERCENTAGE) {
                        throw new Error(`Invalid vibration intensity. Expected: 0-${MAX_PERCENTAGE}`);
                    }

                    const byteValue = Math.round((intensity / MAX_PERCENTAGE) * 255);
                    const payload = {data: [byteValue]};

                    await entity.command<"vsmartSwitchControl", "setVibrationIntensity", VSmartLedControl>(
                        "vsmartSwitchControl",
                        "setVibrationIntensity",
                        payload,
                        {
                            manufacturerCode: VSMART_MANUFACTURER_CODE,
                            disableDefaultResponse: true,
                        },
                    );

                    return {state: {[key]: intensity}};
                },
            },
        ];

        return {exposes: exposes_list, toZigbee, isModernExtend: true};
    },
    addTimePeriodControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .composite("timePeriods", "timePeriods", ea.SET)
                .withFeature(
                    exposes
                        .numeric("morningStartHour", ea.SET)
                        .withValueMin(MIN_HOUR)
                        .withValueMax(MAX_HOUR)
                        .withValueStep(1)
                        .withUnit("h")
                        .withDescription("Morning period start hour (0-23)"),
                )
                .withFeature(
                    exposes
                        .numeric("eveningStartHour", ea.SET)
                        .withValueMin(MIN_HOUR)
                        .withValueMax(MAX_HOUR)
                        .withValueStep(1)
                        .withUnit("h")
                        .withDescription("Evening period start hour (0-23)"),
                )
                .withFeature(
                    exposes
                        .numeric("nightStartHour", ea.SET)
                        .withValueMin(MIN_HOUR)
                        .withValueMax(MAX_HOUR)
                        .withValueStep(1)
                        .withUnit("h")
                        .withDescription("Night period start hour (0-23)"),
                )
                .withDescription("Time period settings for switch behavior. Morning must start before evening, evening must start before night."),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["timePeriods"],
                convertSet: async (entity, key, value) => {
                    const periods = value as {
                        morningStartHour: number;
                        eveningStartHour: number;
                        nightStartHour: number;
                    };

                    const morningHour = Number(periods.morningStartHour);
                    const eveningHour = Number(periods.eveningStartHour);
                    const nightHour = Number(periods.nightStartHour);

                    if (Number.isNaN(morningHour) || morningHour < MIN_HOUR || morningHour > MAX_HOUR) {
                        throw new Error(`Invalid morning start hour. Expected: ${MIN_HOUR}-${MAX_HOUR}`);
                    }
                    if (Number.isNaN(eveningHour) || eveningHour < MIN_HOUR || eveningHour > MAX_HOUR) {
                        throw new Error(`Invalid evening start hour. Expected: ${MIN_HOUR}-${MAX_HOUR}`);
                    }
                    if (Number.isNaN(nightHour) || nightHour < MIN_HOUR || nightHour > MAX_HOUR) {
                        throw new Error(`Invalid night start hour. Expected: ${MIN_HOUR}-${MAX_HOUR}`);
                    }

                    if (morningHour >= eveningHour) {
                        throw new Error(`Morning period (${morningHour}:00) must start before evening period (${eveningHour}:00)`);
                    }

                    if (eveningHour >= nightHour) {
                        throw new Error(`Evening period (${eveningHour}:00) must start before night period (${nightHour}:00)`);
                    }

                    // Convert all hours to period values (hour * HOUR_TO_PERIOD_MULTIPLIER)
                    const periodValues = [
                        morningHour * HOUR_TO_PERIOD_MULTIPLIER,
                        eveningHour * HOUR_TO_PERIOD_MULTIPLIER,
                        nightHour * HOUR_TO_PERIOD_MULTIPLIER,
                    ];

                    const payload = {data: periodValues};

                    await entity.command<"vsmartSwitchControl", "setTimePeriod", VSmartLedControl>("vsmartSwitchControl", "setTimePeriod", payload, {
                        manufacturerCode: VSMART_MANUFACTURER_CODE,
                        disableDefaultResponse: true,
                    });

                    return {
                        state: {
                            [key]: periods,
                        },
                    };
                },
            },
        ];

        return {exposes: exposes_list, toZigbee, isModernExtend: true};
    },
    addLedIntensityControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .numeric("morningLedIntensity", ea.SET)
                .withValueMin(0)
                .withValueMax(MAX_PERCENTAGE)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("LED intensity for morning period (0-100%)"),
            exposes
                .numeric("eveningLedIntensity", ea.SET)
                .withValueMin(0)
                .withValueMax(MAX_PERCENTAGE)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("LED intensity for evening period (0-100%)"),
            exposes
                .numeric("nightLedIntensity", ea.SET)
                .withValueMin(0)
                .withValueMax(MAX_PERCENTAGE)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("LED intensity for night period (0-100%)"),
        ];

        const toZigbee: Tz.Converter[] = [
            createLedIntensityConverter("morningLedIntensity", 0, "morning"),
            createLedIntensityConverter("eveningLedIntensity", 1, "evening"),
            createLedIntensityConverter("nightLedIntensity", 2, "night"),
        ];

        return {exposes: exposes_list, toZigbee, isModernExtend: true};
    },
    addLedBrightnessLevelsControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .composite("ledBrightnessLevels", "ledBrightnessLevels", ea.SET)
                .withFeature(
                    exposes
                        .numeric("lowBrightnessPercent", ea.SET)
                        .withValueMin(0)
                        .withValueMax(MAX_PERCENTAGE)
                        .withValueStep(1)
                        .withUnit("%")
                        .withDescription("Low brightness level percentage (0-100%)"),
                )
                .withFeature(
                    exposes
                        .numeric("mediumBrightnessPercent", ea.SET)
                        .withValueMin(0)
                        .withValueMax(MAX_PERCENTAGE)
                        .withValueStep(1)
                        .withUnit("%")
                        .withDescription("Medium brightness level percentage (0-100%)"),
                )
                .withFeature(
                    exposes
                        .numeric("highBrightnessPercent", ea.SET)
                        .withValueMin(0)
                        .withValueMax(MAX_PERCENTAGE)
                        .withValueStep(1)
                        .withUnit("%")
                        .withDescription("High brightness level percentage (0-100%)"),
                )
                .withDescription(
                    "LED brightness levels for different intensity settings. Low must be lower than medium, Medium must be lower than high.",
                ),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["ledBrightnessLevels"],
                convertSet: async (entity, key, value) => {
                    const levels = value as {
                        lowBrightnessPercent: number;
                        mediumBrightnessPercent: number;
                        highBrightnessPercent: number;
                    };

                    const lowPercent = Number(levels.lowBrightnessPercent);
                    const mediumPercent = Number(levels.mediumBrightnessPercent);
                    const highPercent = Number(levels.highBrightnessPercent);

                    if (Number.isNaN(lowPercent) || lowPercent < 0 || lowPercent > MAX_PERCENTAGE) {
                        throw new Error(`Invalid low brightness percentage. Expected: 0-${MAX_PERCENTAGE}`);
                    }
                    if (Number.isNaN(mediumPercent) || mediumPercent < 0 || mediumPercent > MAX_PERCENTAGE) {
                        throw new Error(`Invalid medium brightness percentage. Expected: 0-${MAX_PERCENTAGE}`);
                    }
                    if (Number.isNaN(highPercent) || highPercent < 0 || highPercent > MAX_PERCENTAGE) {
                        throw new Error(`Invalid high brightness percentage. Expected: 0-${MAX_PERCENTAGE}`);
                    }

                    if (lowPercent >= mediumPercent) {
                        throw new Error(`Low brightness (${lowPercent}%) must be lower than medium brightness (${mediumPercent}%)`);
                    }

                    if (mediumPercent >= highPercent) {
                        throw new Error(`Medium brightness (${mediumPercent}%) must be lower than high brightness (${highPercent}%)`);
                    }

                    const lowBrightness = Math.round((lowPercent * 255) / MAX_PERCENTAGE);
                    const mediumBrightness = Math.round((mediumPercent * 255) / MAX_PERCENTAGE);
                    const highBrightness = Math.round((highPercent * 255) / MAX_PERCENTAGE);

                    const commands = [{data: [0, highBrightness]}, {data: [1, mediumBrightness]}, {data: [2, lowBrightness]}];

                    for (let i = 0; i < commands.length; i++) {
                        await entity.command<"vsmartSwitchControl", "setLedBrightnessLevel", VSmartLedControl>(
                            "vsmartSwitchControl",
                            "setLedBrightnessLevel",
                            commands[i],
                            {
                                manufacturerCode: VSMART_MANUFACTURER_CODE,
                                disableDefaultResponse: true,
                            },
                        );

                        if (i < commands.length - 1) {
                            await new Promise((resolve) => setTimeout(resolve, COMMAND_DELAY_MS));
                        }
                    }

                    return {
                        state: {
                            [key]: levels,
                        },
                    };
                },
            },
        ];

        return {exposes: exposes_list, toZigbee, isModernExtend: true};
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["HS-SWL100ZB-VNM", "HS-SWN100ZB-VNM", "HS-SWB100ZB-VNM", "HS-SRW100ZB-VNM"],
        model: "HS-SW100ZB-VNM",
        vendor: "VSmart",
        description: "VSmart Wall Switch 1 Gang",
        extend: [
            m.onOff({powerOnBehavior: false}),
            vsmartExtend.customCluster(),
            vsmartExtend.addLedColorControl(),
            vsmartExtend.addVibrationIntensityControl(),
            vsmartExtend.addTimePeriodControl(),
            vsmartExtend.addLedIntensityControl(),
            vsmartExtend.addLedBrightnessLevelsControl(),
        ],
    },
    {
        zigbeeModel: ["HS-SWL200ZB-VNM", "HS-SWN200ZB-VNM", "HS-SWB200ZB-VNM", "HS-SRW200ZB-VNM"],
        model: "HS-SW200ZB-VNM",
        vendor: "VSmart",
        description: "VSmart Wall Switch 2 Gang",
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2"]}),
            vsmartExtend.customCluster(),
            vsmartExtend.addLedColorControl(),
            vsmartExtend.addVibrationIntensityControl(),
            vsmartExtend.addTimePeriodControl(),
            vsmartExtend.addLedIntensityControl(),
            vsmartExtend.addLedBrightnessLevelsControl(),
        ],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ["HS-SWL300ZB-VNM"],
        model: "HS-SW300ZB-VNM",
        vendor: "VSmart",
        description: "VSmart Wall Switch 3 Gang",
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2, 3: 3}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3"]}),
            vsmartExtend.customCluster(),
            vsmartExtend.addLedColorControl(),
            vsmartExtend.addVibrationIntensityControl(),
            vsmartExtend.addTimePeriodControl(),
            vsmartExtend.addLedIntensityControl(),
            vsmartExtend.addLedBrightnessLevelsControl(),
        ],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ["HS-SWL400ZB-VNM"],
        model: "HS-SW400ZB-VNM",
        vendor: "VSmart",
        description: "VSmart Wall Switch 4 Gang",
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2, 3: 3, 4: 4}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3", "4"]}),
            vsmartExtend.customCluster(),
            vsmartExtend.addLedColorControl(),
            vsmartExtend.addVibrationIntensityControl(),
            vsmartExtend.addTimePeriodControl(),
            vsmartExtend.addLedIntensityControl(),
            vsmartExtend.addLedBrightnessLevelsControl(),
        ],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ["HS-SEDR00ZB-VNM"],
        model: "HS-SEDR00ZB-VNM",
        vendor: "VSmart",
        description: "VSmart Door/Window Sensor",
        fromZigbee: [vsmartContactAlarm],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.tamper(), e.battery_low()],
    },
    {
        zigbeeModel: ["HS-SEOC00ZB-VNM"],
        model: "HS-SEOC00ZB-VNM",
        vendor: "VSmart",
        description: "VSmart Occupancy Sensor",
        extend: [m.battery(), m.occupancy()],
        meta: {},
    },
];
