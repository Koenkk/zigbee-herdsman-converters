import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {Definition, DefinitionWithExtend, Fz, KeyValue, Publish, Tz, Zh} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    temperature_unit_handler: {
        cluster: "manuSpecificTuya",
        type: ["commandDataResponse", "commandDataReport"],
        convert: (model: Definition, msg: Fz.Message, publish: Publish, options: KeyValue, meta: Fz.Meta) => {
            const result = tuya.fz.datapoints.convert(model, msg, publish, options, meta) || {};

            if (result.temperature_unit === "fahrenheit" && result.temperature) {
                const tempF = ((result.temperature as number) * 9) / 5 + 32;
                result.temperature_f = Math.round(tempF * 10) / 10;
            }

            if (result.temperature_unit === "fahrenheit") {
                if (result.max_temperature && !result.max_temperature_f) {
                    const maxTempF = ((result.max_temperature as number) * 9) / 5 + 32;
                    result.max_temperature_f = Math.round(maxTempF * 10) / 10;
                }
                if (result.min_temperature && !result.min_temperature_f) {
                    const minTempF = ((result.min_temperature as number) * 9) / 5 + 32;
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

            await tuya.sendDataPointEnum(entity, 9, dpValue);

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

            await tuya.sendDataPointValue(entity, 10, dpValue);

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

            await tuya.sendDataPointValue(entity, 11, dpValue);

            return {state: {[key]: value}};
        },
    },
    max_humidity: {
        key: ["max_humidity"],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, 12, value as number);

            return {state: {max_humidity: value}};
        },
    },
    min_humidity: {
        key: ["min_humidity"],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, 13, value as number);

            return {state: {min_humidity: value}};
        },
    },
} satisfies Record<string, Tz.Converter>;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SNT858Z"],
        model: "SNT858Z",
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
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_navtwmd0"]),
        model: "SNT857Z-TDE",
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
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_m9dzckna"]),
        model: "SNT857Z",
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
