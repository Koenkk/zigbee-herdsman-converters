import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend, Tz} from "../lib/types";

const ea = exposes.access;

const VSMART_MANUFACTURER_CODE = 0x1379;

const COMMAND_DELAY_MS = 100;
const HOUR_TO_PERIOD_MULTIPLIER = 4;
const MAX_PERCENTAGE = 100;
const MAX_HOUR = 23;
const MIN_HOUR = 0;

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

const mLocal = {
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
    ledColorControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .text("led_indicator_color_on", ea.SET)
                .withDescription("LED indicator color when switch is ON (hex format: #RRGGBB, e.g., #ff0000 for red)"),
            exposes
                .text("led_indicator_color_off", ea.SET)
                .withDescription("LED indicator color when switch is OFF (hex format: #RRGGBB, e.g., #ffffff for white)"),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["led_indicator_color_on", "led_indicator_color_off"],
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

                    const state = key === "led_indicator_color_on" ? 0x01 : 0x00;
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
    vibrationIntensityControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .numeric("vibration_intensity", ea.SET)
                .withValueMin(0)
                .withValueMax(MAX_PERCENTAGE)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("Button vibration intensity (0-100%)"),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["vibration_intensity"],
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
    timePeriodControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .composite("time_periods", "time_periods", ea.SET)
                .withFeature(
                    exposes
                        .numeric("morning_start_hour", ea.SET)
                        .withValueMin(MIN_HOUR)
                        .withValueMax(MAX_HOUR)
                        .withValueStep(1)
                        .withUnit("h")
                        .withDescription("Morning period start hour (0-23)"),
                )
                .withFeature(
                    exposes
                        .numeric("evening_start_hour", ea.SET)
                        .withValueMin(MIN_HOUR)
                        .withValueMax(MAX_HOUR)
                        .withValueStep(1)
                        .withUnit("h")
                        .withDescription("Evening period start hour (0-23)"),
                )
                .withFeature(
                    exposes
                        .numeric("night_start_hour", ea.SET)
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
                key: ["time_periods"],
                convertSet: async (entity, key, value) => {
                    const periods = value as {
                        // biome-ignore lint/style/useNamingConvention: snake_case is required for API compatibility
                        morning_start_hour: number;
                        // biome-ignore lint/style/useNamingConvention: snake_case is required for API compatibility
                        evening_start_hour: number;
                        // biome-ignore lint/style/useNamingConvention: snake_case is required for API compatibility
                        night_start_hour: number;
                    };

                    const morningHour = Number(periods.morning_start_hour);
                    const eveningHour = Number(periods.evening_start_hour);
                    const nightHour = Number(periods.night_start_hour);

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
    ledIntensityControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .numeric("morning_led_intensity", ea.SET)
                .withValueMin(0)
                .withValueMax(MAX_PERCENTAGE)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("LED intensity for morning period (0-100%)"),
            exposes
                .numeric("evening_led_intensity", ea.SET)
                .withValueMin(0)
                .withValueMax(MAX_PERCENTAGE)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("LED intensity for evening period (0-100%)"),
            exposes
                .numeric("night_led_intensity", ea.SET)
                .withValueMin(0)
                .withValueMax(MAX_PERCENTAGE)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("LED intensity for night period (0-100%)"),
        ];

        const toZigbee: Tz.Converter[] = [
            createLedIntensityConverter("morning_led_intensity", 0, "morning"),
            createLedIntensityConverter("evening_led_intensity", 1, "evening"),
            createLedIntensityConverter("night_led_intensity", 2, "night"),
        ];

        return {exposes: exposes_list, toZigbee, isModernExtend: true};
    },
    ledBrightnessLevelsControl: (): ModernExtend => {
        const exposes_list = [
            exposes
                .composite("led_brightness_levels", "led_brightness_levels", ea.SET)
                .withFeature(
                    exposes
                        .numeric("low_brightness_percent", ea.SET)
                        .withValueMin(0)
                        .withValueMax(MAX_PERCENTAGE)
                        .withValueStep(1)
                        .withUnit("%")
                        .withDescription("Low brightness level percentage (0-100%)"),
                )
                .withFeature(
                    exposes
                        .numeric("medium_brightness_percent", ea.SET)
                        .withValueMin(0)
                        .withValueMax(MAX_PERCENTAGE)
                        .withValueStep(1)
                        .withUnit("%")
                        .withDescription("Medium brightness level percentage (0-100%)"),
                )
                .withFeature(
                    exposes
                        .numeric("high_brightness_percent", ea.SET)
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
                key: ["led_brightness_levels"],
                convertSet: async (entity, key, value) => {
                    const levels = value as {
                        // biome-ignore lint/style/useNamingConvention: snake_case is required for API compatibility
                        low_brightness_percent: number;
                        // biome-ignore lint/style/useNamingConvention: snake_case is required for API compatibility
                        medium_brightness_percent: number;
                        // biome-ignore lint/style/useNamingConvention: snake_case is required for API compatibility
                        high_brightness_percent: number;
                    };

                    const lowPercent = Number(levels.low_brightness_percent);
                    const mediumPercent = Number(levels.medium_brightness_percent);
                    const highPercent = Number(levels.high_brightness_percent);

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
        description: "Wall switch 1 gang",
        extend: [
            m.onOff({powerOnBehavior: false}),
            mLocal.customCluster(),
            mLocal.ledColorControl(),
            mLocal.vibrationIntensityControl(),
            mLocal.timePeriodControl(),
            mLocal.ledIntensityControl(),
            mLocal.ledBrightnessLevelsControl(),
        ],
    },
    {
        zigbeeModel: ["HS-SWL200ZB-VNM", "HS-SWN200ZB-VNM", "HS-SWB200ZB-VNM", "HS-SRW200ZB-VNM"],
        model: "HS-SW200ZB-VNM",
        vendor: "VSmart",
        description: "Wall switch 2 gang",
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2"]}),
            mLocal.customCluster(),
            mLocal.ledColorControl(),
            mLocal.vibrationIntensityControl(),
            mLocal.timePeriodControl(),
            mLocal.ledIntensityControl(),
            mLocal.ledBrightnessLevelsControl(),
        ],
    },
    {
        zigbeeModel: ["HS-SWL300ZB-VNM"],
        model: "HS-SW300ZB-VNM",
        vendor: "VSmart",
        description: "Wall switch 3 gang",
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2, 3: 3}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3"]}),
            mLocal.customCluster(),
            mLocal.ledColorControl(),
            mLocal.vibrationIntensityControl(),
            mLocal.timePeriodControl(),
            mLocal.ledIntensityControl(),
            mLocal.ledBrightnessLevelsControl(),
        ],
    },
    {
        zigbeeModel: ["HS-SWL400ZB-VNM"],
        model: "HS-SW400ZB-VNM",
        vendor: "VSmart",
        description: "Wall switch 4 gang",
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2, 3: 3, 4: 4}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3", "4"]}),
            mLocal.customCluster(),
            mLocal.ledColorControl(),
            mLocal.vibrationIntensityControl(),
            mLocal.timePeriodControl(),
            mLocal.ledIntensityControl(),
            mLocal.ledBrightnessLevelsControl(),
        ],
    },
    {
        zigbeeModel: ["HS-SEDR00ZB-VNM"],
        model: "HS-SEDR00ZB-VNM",
        vendor: "VSmart",
        description: "Door/window sensor",
        extend: [m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low", "tamper"], invertAlarm: true})],
    },
    {
        zigbeeModel: ["HS-SEOC00ZB-VNM"],
        model: "HS-SEOC00ZB-VNM",
        vendor: "VSmart",
        description: "Occupancy sensor",
        extend: [m.battery(), m.occupancy()],
    },
];
