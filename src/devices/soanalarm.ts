import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {Definition, DefinitionWithExtend, Fz, KeyValue, KeyValueAny, Publish, Tz, Zh} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    temperature_unit_handler: {
        cluster: "manuSpecificTuya",
        type: ["commandDataResponse", "commandDataReport"],
        convert: (model: Definition, msg: Fz.Message, publish: Publish, options: KeyValue, meta: Fz.Meta) => {
            let dpValues = [];
            if (msg.data.dpValues) {
                dpValues = msg.data.dpValues;
            } else if (msg.data.dp !== undefined) {
                dpValues = [
                    {
                        dp: msg.data.dp,
                        datatype: msg.data.datatype,
                        data: msg.data.data,
                    },
                ];
            } else {
                return {};
            }

            const result: KeyValueAny = {};

            for (const dpValue of dpValues) {
                const dp = dpValue.dp;
                const datatype = dpValue.datatype;
                const data = dpValue.data;

                try {
                    let value: unknown;

                    if (datatype === 2) {
                        if (data && typeof data === "object" && data.type === "Buffer" && Array.isArray(data.data)) {
                            const buffer = data.data;
                            value = buffer[3] + (buffer[2] << 8) + (buffer[1] << 16) + (buffer[0] << 24);
                        } else if (data?.data && Array.isArray(data.data)) {
                            const buffer = data.data;
                            value = buffer[3] + (buffer[2] << 8) + (buffer[1] << 16) + (buffer[0] << 24);
                        } else if (Array.isArray(data)) {
                            if (data.length === 4) {
                                value = data[3] + (data[2] << 8) + (data[1] << 16) + (data[0] << 24);
                            } else {
                                value = data[0];
                            }
                        } else if (typeof data === "number") {
                            value = data;
                        } else {
                            continue;
                        }
                    } else if (datatype === 1) {
                        if (data && data.type === "Buffer" && Array.isArray(data.data)) {
                            value = data.data[0] === 1;
                        } else if (data?.data && Array.isArray(data.data)) {
                            value = data.data[0] === 1;
                        } else if (Array.isArray(data)) {
                            value = data[0] === 1;
                        } else {
                            value = !!data;
                        }
                    } else if (datatype === 4) {
                        if (data && data.type === "Buffer" && Array.isArray(data.data)) {
                            value = data.data[0];
                        } else if (data?.data && Array.isArray(data.data)) {
                            value = data.data[0];
                        } else if (Array.isArray(data)) {
                            value = data[0];
                        } else {
                            value = data;
                        }
                    } else {
                        value = data;
                    }

                    if (dp === 1) {
                        result.temperature = (value as number) / 10;

                        const tempF = (((value as number) / 10) * 9) / 5 + 32;
                        result.temperature_f = Math.round(tempF * 10) / 10;
                    } else if (dp === 2) {
                        result.temperature_f = (value as number) / 10;
                    } else if (dp === 9) {
                        result.temperature_unit = (value as number) === 0 ? "celsius" : "fahrenheit";
                    } else if (dp === 10) {
                        result.max_temperature = (value as number) / 10;

                        const maxTempF = (((value as number) / 10) * 9) / 5 + 32;
                        result.max_temperature_f = Math.round(maxTempF * 10) / 10;
                    } else if (dp === 11) {
                        result.min_temperature = (value as number) / 10;

                        const minTempF = (((value as number) / 10) * 9) / 5 + 32;
                        result.min_temperature_f = Math.round(minTempF * 10) / 10;
                    } else if (dp === 12) {
                        result.max_temperature_f = (value as number) / 10;
                    } else if (dp === 13) {
                        result.min_temperature_f = (value as number) / 10;
                    } else if (dp === 14) {
                        const lookup = {0: "cancel", 1: "lower_alarm", 2: "upper_alarm"};
                        result.temperature_alarm = lookup[value as number as keyof typeof lookup] || "cancel";
                    }
                } catch (error) {
                    // Ignore errors
                }
            }

            if (result.temperature_unit === "fahrenheit" && result.temperature) {
                const tempF = (result.temperature * 9) / 5 + 32;
                result.temperature_f = Math.round(tempF * 10) / 10;
            }

            if (result.temperature_unit === "fahrenheit") {
                if (result.max_temperature && !result.max_temperature_f) {
                    const maxTempF = (result.max_temperature * 9) / 5 + 32;
                    result.max_temperature_f = Math.round(maxTempF * 10) / 10;
                }
                if (result.min_temperature && !result.min_temperature_f) {
                    const minTempF = (result.min_temperature * 9) / 5 + 32;
                    result.min_temperature_f = Math.round(minTempF * 10) / 10;
                }
            }

            return result;
        },
    },

    state_update: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model: Definition, msg: Fz.Message, publish: Publish, options: KeyValue, meta: Fz.Meta) => {
            const state = meta.state || {};

            if (state.temperature_unit === "fahrenheit" && state.temperature && state.temperature_f === null) {
                const tempF = ((state.temperature as number) * 9) / 5 + 32;
                state.temperature_f = Math.round(tempF * 10) / 10;

                return {temperature_f: state.temperature_f};
            }

            return {};
        },
    },
};

const tzLocal = {
    temperature_unit: {
        key: ["temperature_unit"],
        convertSet: async (entity: Zh.Endpoint | Zh.Group, key: string, value: unknown, meta: Tz.Meta) => {
            const lookup = {celsius: 0, fahrenheit: 1};
            const dpValue = lookup[value as string as keyof typeof lookup];

            await entity.command(
                "manuSpecificTuya",
                "dataRequest",
                {
                    seq: 1,
                    dpValues: [{dp: 9, datatype: 4, data: [dpValue]}],
                },
                {disableDefaultResponse: true},
            );

            if ((value as string) === "fahrenheit" && meta.state && meta.state.temperature) {
                const tempF = ((meta.state.temperature as number) * 9) / 5 + 32;
                return {
                    state: {
                        temperature_unit: value,
                        temperature_f: Math.round(tempF * 10) / 10,
                    },
                };
            }

            return {state: {temperature_unit: value}};
        },
    },
    max_temperature: {
        key: ["max_temperature", "max_temperature_f"],
        convertSet: async (entity: Zh.Endpoint | Zh.Group, key: string, value: unknown, meta: Tz.Meta) => {
            let tempValue = value as number;

            if (key === "max_temperature_f") {
                tempValue = ((tempValue - 32) * 5) / 9;
            }

            const dpValue = Math.round(tempValue * 10);

            await entity.command(
                "manuSpecificTuya",
                "dataRequest",
                {
                    seq: 1,
                    dpValues: [{dp: 10, datatype: 2, data: [0, 0, dpValue >> 8, dpValue & 0xff]}],
                },
                {disableDefaultResponse: true},
            );

            return {state: {[key]: value}};
        },
    },
    min_temperature: {
        key: ["min_temperature", "min_temperature_f"],
        convertSet: async (entity: Zh.Endpoint | Zh.Group, key: string, value: unknown, meta: Tz.Meta) => {
            let tempValue = value as number;

            if (key === "min_temperature_f") {
                tempValue = ((tempValue - 32) * 5) / 9;
            }

            const dpValue = Math.round(tempValue * 10);

            await entity.command(
                "manuSpecificTuya",
                "dataRequest",
                {
                    seq: 1,
                    dpValues: [{dp: 11, datatype: 2, data: [0, 0, dpValue >> 8, dpValue & 0xff]}],
                },
                {disableDefaultResponse: true},
            );

            return {state: {[key]: value}};
        },
    },
    max_humidity: {
        key: ["max_humidity"],
        convertSet: async (entity, key, value, meta) => {
            await entity.command(
                "manuSpecificTuya",
                "dataRequest",
                {
                    seq: 1,
                    dpValues: [{dp: 12, datatype: 2, data: [0, 0, 0, value]}],
                },
                {disableDefaultResponse: true},
            );

            return {state: {max_humidity: value}};
        },
    },
    min_humidity: {
        key: ["min_humidity"],
        convertSet: async (entity, key, value, meta) => {
            await entity.command(
                "manuSpecificTuya",
                "dataRequest",
                {
                    seq: 1,
                    dpValues: [{dp: 13, datatype: 2, data: [0, 0, 0, value]}],
                },
                {disableDefaultResponse: true},
            );

            return {state: {min_humidity: value}};
        },
    },
} satisfies Record<string, Tz.Converter>;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TZE284-OITAVOV2"],
        model: "TS0601_Soil_Soan",
        vendor: "Soanalarm",
        description: "Soil moisture sensor",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.temperature(), e.soil_moisture(), tuya.exposes.temperatureUnit(), e.battery()],
        meta: {
            tuyaDatapoints: [
                [3, "soil_moisture", tuya.valueConverter.raw],
                [5, "temperature", tuya.valueConverter.raw],
                [9, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [15, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ["TZE204-NAVTWMD0"],
        model: "TZE204_Temperature_Soan",
        vendor: "Soanalarm",
        description: "Temperature sensor",
        fromZigbee: [fzLocal.temperature_unit_handler, fzLocal.state_update, tuya.fz.datapoints],
        toZigbee: [tzLocal.temperature_unit, tzLocal.max_temperature, tzLocal.min_temperature, tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        onEvent: (type, data, device, options, state) => {
            if (type === "message" && state) {
                if (state.temperature_unit === "fahrenheit" && state.temperature && state.temperature_f === null) {
                    const tempF = ((state.temperature as number) * 9) / 5 + 32;
                    state.temperature_f = Math.round(tempF * 10) / 10;
                }
            }
        },
        exposes: [
            e.enum("temperature_unit", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Temperature unit"),
            e.numeric("max_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-400).withValueMax(1200).withDescription("Maximum temperature"),
            e.numeric("min_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-400).withValueMax(1200).withDescription("Minimum temperature"),
            e
                .numeric("max_temperature_f", ea.STATE_SET)
                .withUnit("°F")
                .withValueMin(-760)
                .withValueMax(2192)
                .withDescription("Maximum temperature in °F"),
            e
                .numeric("min_temperature_f", ea.STATE_SET)
                .withUnit("°F")
                .withValueMin(-760)
                .withValueMax(2192)
                .withDescription("Minimum temperature in °F"),
            e.numeric("temperature", ea.STATE).withUnit("°C").withValueMin(0).withValueMax(1000).withDescription("Temperature"),
            e.numeric("temperature_f", ea.STATE).withUnit("°F").withValueMin(32).withValueMax(1832).withDescription("Temperature in °F"),
            e.enum("temperature_alarm", ea.STATE, ["lower_alarm", "upper_alarm", "cancel"]).withDescription("Temperature alarm"),
            e
                .numeric("temperature_calibration", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(-100)
                .withValueMax(100)
                .withDescription("Temperature calibration"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "temperature", tuya.valueConverter.divideBy10],
                [2, "temperature_f", tuya.valueConverter.divideBy10],
                [9, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [10, "max_temperature", tuya.valueConverter.divideBy10],
                [11, "min_temperature", tuya.valueConverter.divideBy10],
                [12, "max_temperature_f", tuya.valueConverter.divideBy10],
                [13, "min_temperature_f", tuya.valueConverter.divideBy10],
                [
                    14,
                    "temperature_alarm",
                    {
                        from: (value) => {
                            const lookup = {0: "cancel", 1: "lower_alarm", 2: "upper_alarm"};
                            return lookup[value as keyof typeof lookup] || "cancel";
                        },
                        to: (value) => {
                            const lookup = {cancel: 0, lower_alarm: 1, upper_alarm: 2};
                            return lookup[value as keyof typeof lookup];
                        },
                    },
                ],
                [23, "temperature_calibration", tuya.valueConverter.divideBy10],
            ],
        },
    },
    {
        zigbeeModel: ["TZE204-M9DZCKNA"],
        model: "TZE204_Temperature_Humidity_Soan",
        vendor: "Soanalarm",
        description: "Temperature and humidity sensor",
        fromZigbee: [fzLocal.temperature_unit_handler, fzLocal.state_update, tuya.fz.datapoints],
        toZigbee: [
            tzLocal.temperature_unit,
            tzLocal.max_temperature,
            tzLocal.min_temperature,
            tzLocal.max_humidity,
            tzLocal.min_humidity,
            tuya.tz.datapoints,
        ],
        configure: tuya.configureMagicPacket,
        onEvent: (type, data, device, options, state) => {
            if (type === "message" && state) {
                if (state.temperature_unit === "fahrenheit" && state.temperature && state.temperature_f === null) {
                    const tempF = ((state.temperature as number) * 9) / 5 + 32;
                    state.temperature_f = Math.round(tempF * 10) / 10;
                }
            }
        },
        exposes: [
            e.humidity(),
            e.enum("temperature_unit", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Temperature unit"),
            e.numeric("max_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-400).withValueMax(1200).withDescription("Maximum temperature"),
            e.numeric("min_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-400).withValueMax(1200).withDescription("Minimum temperature"),
            e
                .numeric("max_temperature_f", ea.STATE_SET)
                .withUnit("°F")
                .withValueMin(-760)
                .withValueMax(2192)
                .withDescription("Maximum temperature in °F"),
            e
                .numeric("min_temperature_f", ea.STATE_SET)
                .withUnit("°F")
                .withValueMin(-760)
                .withValueMax(2192)
                .withDescription("Minimum temperature in °F"),
            e.numeric("temperature_f", ea.STATE).withUnit("°F").withValueMin(-760).withValueMax(2192).withDescription("Temperature in °F"),
            e.numeric("temperature", ea.STATE).withUnit("°C").withValueMin(-400).withValueMax(1200).withDescription("Temperature"),
            e.numeric("max_humidity", ea.STATE_SET).withUnit("%").withValueMin(0).withValueMax(1000).withDescription("Alarm humidity max"),
            e.numeric("min_humidity", ea.STATE_SET).withUnit("%").withValueMin(32).withValueMax(1832).withDescription("Alarm humidity min"),
            e.enum("temperature_alarm", ea.STATE, ["lower_alarm", "upper_alarm", "cancel"]).withDescription("Temperature alarm"),
            e.enum("humidity_alarm", ea.STATE, ["lower_alarm", "upper_alarm", "cancel"]).withDescription("Humidity alarm"),
            tuya.exposes.temperatureCalibration(),
            tuya.exposes.humidityCalibration(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "temperature", tuya.valueConverter.divideBy10],
                [2, "humidity", tuya.valueConverter.raw],
                [9, "temperature_unit", tuya.valueConverter.temperatureUnit],
                [10, "max_temperature", tuya.valueConverter.divideBy10],
                [11, "min_temperature", tuya.valueConverter.divideBy10],
                [12, "max_humidity", tuya.valueConverter.raw],
                [13, "min_humidity", tuya.valueConverter.raw],
                [
                    14,
                    "temperature_alarm",
                    {
                        from: (value) => {
                            const lookup = {0: "cancel", 1: "lower_alarm", 2: "upper_alarm"};
                            return lookup[value as keyof typeof lookup] || "cancel";
                        },
                        to: (value) => {
                            const lookup = {cancel: 0, lower_alarm: 1, upper_alarm: 2};
                            return lookup[value as keyof typeof lookup];
                        },
                    },
                ],
                [
                    15,
                    "humidity_alarm",
                    {
                        from: (value) => {
                            const lookup = {0: "cancel", 1: "lower_alarm", 2: "upper_alarm"};
                            return lookup[value as keyof typeof lookup] || "cancel";
                        },
                        to: (value) => {
                            const lookup = {cancel: 0, lower_alarm: 1, upper_alarm: 2};
                            return lookup[value as keyof typeof lookup];
                        },
                    },
                ],
                [23, "temperature_calibration", tuya.valueConverter.divideBy10],
                [24, "humidity_calibration", tuya.valueConverter.raw],
            ],
        },
    },
];
