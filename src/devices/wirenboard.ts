import {Zcl} from "zigbee-herdsman";
import type {TPartialClusterAttributes} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {Configure, DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz} from "../lib/types";
import {assertString, getFromLookup, getOptions, toNumber} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface WbGenAnalogInput {
    attributes: {noiseDetected: number; noiseThreshold: number; noiseTimeout: number};
    commands: never;
    commandResponses: never;
}

interface WbGenMultistateInput {
    attributes: {
        mswSlaveId: number;
        mswSerialNumber: number;
        mswFwVersion: string;
        mswFwSignature: string;
        mswBootVersion: string;
        mswComponentVersion: string;
        mswComponentSignature: string;
    };
    commands: never;
    commandResponses: never;
}

interface WbMsTemperatureMeasurement {
    attributes: {temperatureOffset: number};
    commands: never;
    commandResponses: never;
}

interface WbMsOccupancySensing {
    attributes: {occupancyLevel: number; occupancySensitivity: number; occupancyTimeout: number};
    commands: never;
    commandResponses: never;
}

interface WbVocMeasurement {
    attributes: {measuredValue: number};
    commands: never;
    commandResponses: never;
}

interface SprutDevice {
    attributes: {
        isConnected: number;
        // biome-ignore lint/style/useNamingConvention: TODO
        UartBaudRate: number;
    };
    commands: {
        debug: {data: number};
    };
    commandResponses: never;
}

interface SprutVoc {
    attributes: {
        voc: number;
    };
    commands: never;
    commandResponses: never;
}

interface SprutNoise {
    attributes: {
        noise: number;
        noiseDetected: number;
        noiseDetectLevel: number;
        noiseAfterDetectDelay: number;
    };
    commands: never;
    commandResponses: never;
}

interface SprutIrBlaster {
    attributes: never;
    commands: {
        playStore: {
            param: number;
        };
        learnStart: {
            value: number;
        };
        learnStop: {
            value: number;
        };
        clearStore: Record<string, never>;
        playRam: Record<string, never>;
        learnRamStart: Record<string, never>;
        learnRamStop: Record<string, never>;
    };
    commandResponses: never;
}

interface SprutMsRelativeHumidity {
    attributes: {
        sprutHeater?: number;
    };
    commands: never;
    commandResponses: never;
}

interface SprutMsOccupancySensing {
    attributes: {
        sprutOccupancyLevel?: number;
        sprutOccupancySensitivity?: number;
    };
    commands: never;
    commandResponses: never;
}

interface SprutMsTemperatureMeasurement {
    attributes: {
        sprutTemperatureOffset?: number;
    };
    commands: never;
    commandResponses: never;
}

interface SprutMsCO2 {
    attributes: {
        sprutCO2Calibration?: number;
        sprutCO2AutoCalibration?: number;
    };
    commands: never;
    commandResponses: never;
}

const sprutCode = Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE;

const manufacturerOptions = {manufacturerCode: sprutCode};
const switchActionValues = ["OFF", "ON"];
const co2Lookup = {
    co2_autocalibration: "sprutCO2AutoCalibration",
    co2_manual_calibration: "sprutCO2Calibration",
} as const;

const fzLocal = {
    temperature: {
        cluster: "msTemperatureMeasurement",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const temperature = msg.data.measuredValue / 100.0;
            return {temperature};
        },
    } satisfies Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]>,
    occupancy_level: {
        cluster: "msOccupancySensing",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.sprutOccupancyLevel !== undefined) {
                return {occupancy_level: msg.data.sprutOccupancyLevel};
            }
        },
    } satisfies Fz.Converter<"msOccupancySensing", SprutMsOccupancySensing, ["readResponse", "attributeReport"]>,
    voc: {
        cluster: "sprutVoc",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.voc !== undefined) {
                return {voc: msg.data.voc};
            }
        },
    } satisfies Fz.Converter<"sprutVoc", SprutVoc, ["readResponse", "attributeReport"]>,
    noise: {
        cluster: "sprutNoise",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.noise !== undefined) {
                return {noise: msg.data.noise.toFixed(2)};
            }
        },
    } satisfies Fz.Converter<"sprutNoise", SprutNoise, ["readResponse", "attributeReport"]>,
    noise_detected: {
        cluster: "sprutNoise",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.noiseDetected !== undefined) {
                return {noise_detected: msg.data.noiseDetected === 1};
            }
        },
    } satisfies Fz.Converter<"sprutNoise", SprutNoise, ["readResponse", "attributeReport"]>,
    occupancy_timeout: {
        cluster: "msOccupancySensing",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            return {occupancy_timeout: msg.data.pirOToUDelay};
        },
    } satisfies Fz.Converter<"msOccupancySensing", undefined, ["readResponse", "attributeReport"]>,
    noise_timeout: {
        cluster: "sprutNoise",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            return {noise_timeout: msg.data.noiseAfterDetectDelay};
        },
    } satisfies Fz.Converter<"sprutNoise", SprutNoise, ["readResponse", "attributeReport"]>,
    occupancy_sensitivity: {
        cluster: "msOccupancySensing",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            return {occupancy_sensitivity: msg.data.sprutOccupancySensitivity};
        },
    } satisfies Fz.Converter<"msOccupancySensing", SprutMsOccupancySensing, ["readResponse", "attributeReport"]>,
    noise_detect_level: {
        cluster: "sprutNoise",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            return {noise_detect_level: msg.data.noiseDetectLevel};
        },
    } satisfies Fz.Converter<"sprutNoise", SprutNoise, ["readResponse", "attributeReport"]>,
    co2_mh_z19b_config: {
        cluster: "msCO2",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.sprutCO2AutoCalibration !== undefined) {
                return {co2_autocalibration: switchActionValues[msg.data.sprutCO2AutoCalibration]};
            }
            if (msg.data.sprutCO2Calibration !== undefined) {
                return {co2_manual_calibration: switchActionValues[msg.data.sprutCO2Calibration]};
            }
        },
    } satisfies Fz.Converter<"msCO2", SprutMsCO2, ["attributeReport", "readResponse"]>,
    th_heater: {
        cluster: "msRelativeHumidity",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.sprutHeater !== undefined) {
                return {th_heater: switchActionValues[msg.data.sprutHeater]};
            }
        },
    } satisfies Fz.Converter<"msRelativeHumidity", SprutMsRelativeHumidity, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    sprut_ir_remote: {
        key: ["play_store", "learn_start", "learn_stop", "clear_store", "play_ram", "learn_ram_start", "learn_ram_stop"],
        convertSet: async (entity, key, value: KeyValueAny, meta) => {
            const options = {
                frameType: 0,
                manufacturerCode: sprutCode,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 0,
                direction: 0,
                writeUndiv: false,
                // @ts-expect-error ignore
                transactionSequenceNumber: null,
            };

            switch (key) {
                case "play_store":
                    await entity.command<"sprutIrBlaster", "playStore", SprutIrBlaster>("sprutIrBlaster", "playStore", {param: value.rom}, options);
                    break;
                case "learn_start":
                    await entity.command<"sprutIrBlaster", "learnStart", SprutIrBlaster>("sprutIrBlaster", "learnStart", {value: value.rom}, options);
                    break;
                case "learn_stop":
                    await entity.command<"sprutIrBlaster", "learnStop", SprutIrBlaster>("sprutIrBlaster", "learnStop", {value: value.rom}, options);
                    break;
                case "clear_store":
                    await entity.command<"sprutIrBlaster", "clearStore", SprutIrBlaster>("sprutIrBlaster", "clearStore", {}, options);
                    break;
                case "play_ram":
                    await entity.command<"sprutIrBlaster", "playRam", SprutIrBlaster>("sprutIrBlaster", "playRam", {}, options);
                    break;
                case "learn_ram_start":
                    await entity.command<"sprutIrBlaster", "learnRamStart", SprutIrBlaster>("sprutIrBlaster", "learnRamStart", {}, options);
                    break;
                case "learn_ram_stop":
                    await entity.command<"sprutIrBlaster", "learnRamStop", SprutIrBlaster>("sprutIrBlaster", "learnRamStop", {}, options);
                    break;
            }
        },
    } satisfies Tz.Converter,
    occupancy_timeout: {
        key: ["occupancy_timeout"],
        convertSet: async (entity, key, value, meta) => {
            const number = toNumber(value, "occupancy_timeout");
            await entity.write("msOccupancySensing", {pirOToUDelay: number}, getOptions(meta.mapped, entity));
            return {state: {[key]: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("msOccupancySensing", ["pirOToUDelay"]);
        },
    } satisfies Tz.Converter,
    noise_timeout: {
        key: ["noise_timeout"],
        convertSet: async (entity, key, value, meta) => {
            let number = toNumber(value, "noise_timeout");
            number *= 1;
            await entity.write<"sprutNoise", SprutNoise>("sprutNoise", {noiseAfterDetectDelay: number}, getOptions(meta.mapped, entity));
            return {state: {[key]: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"sprutNoise", SprutNoise>("sprutNoise", ["noiseAfterDetectDelay"]);
        },
    } satisfies Tz.Converter,
    occupancy_sensitivity: {
        key: ["occupancy_sensitivity"],
        convertSet: async (entity, key, value, meta) => {
            let number = toNumber(value, "occupancy_sensitivity");
            number *= 1;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write<"msOccupancySensing", SprutMsOccupancySensing>("msOccupancySensing", {sprutOccupancySensitivity: number}, options);
            return {state: {[key]: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"msOccupancySensing", SprutMsOccupancySensing>(
                "msOccupancySensing",
                ["sprutOccupancySensitivity"],
                manufacturerOptions,
            );
        },
    } satisfies Tz.Converter,
    noise_detect_level: {
        key: ["noise_detect_level"],
        convertSet: async (entity, key, value, meta) => {
            let number = toNumber(value, "noise_detect_level");
            number *= 1;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write<"sprutNoise", SprutNoise>("sprutNoise", {noiseDetectLevel: number}, options);
            return {state: {[key]: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"sprutNoise", SprutNoise>("sprutNoise", ["noiseDetectLevel"], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    temperature_offset: {
        key: ["temperature_offset"],
        convertSet: async (entity, key, value, meta) => {
            let number = toNumber(value, "temperature_offset");
            number *= 1;
            const newValue = number * 100.0;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write<"msTemperatureMeasurement", SprutMsTemperatureMeasurement>(
                "msTemperatureMeasurement",
                {sprutTemperatureOffset: newValue},
                options,
            );
            return {state: {[key]: number}};
        },
    } satisfies Tz.Converter,
    co2_mh_z19b_config: {
        key: ["co2_autocalibration", "co2_manual_calibration"],
        convertSet: async (entity, key, value, meta) => {
            let newValue = value;
            assertString(value, "co2_autocalibration/co2_manual_calibration");
            newValue = switchActionValues.indexOf(value);
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            const payload: TPartialClusterAttributes<"msCO2"> = {
                [getFromLookup(key, co2Lookup)]: newValue,
            };

            await entity.write<"msCO2", SprutMsCO2>("msCO2", payload, options);

            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"msCO2", SprutMsCO2>("msCO2", [getFromLookup(key, co2Lookup)], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    th_heater: {
        key: ["th_heater"],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, "th_heater");
            const newValue = switchActionValues.indexOf(value);
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write<"msRelativeHumidity", SprutMsRelativeHumidity>("msRelativeHumidity", {sprutHeater: newValue}, options);

            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"msRelativeHumidity", SprutMsRelativeHumidity>("msRelativeHumidity", ["sprutHeater"], manufacturerOptions);
        },
    } satisfies Tz.Converter,
};

const sprutModernExtend = {
    addSprutVocCluster: () =>
        m.deviceAddCustomCluster("sprutVoc", {
            name: "sprutVoc",
            ID: 0x6601,
            manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
            attributes: {
                voc: {name: "voc", ID: 0x6600, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            },
            commands: {},
            commandsResponse: {},
        }),
    addSprutNoiseCluster: () =>
        m.deviceAddCustomCluster("sprutNoise", {
            name: "sprutNoise",
            ID: 0x6602,
            manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
            attributes: {
                noise: {name: "noise", ID: 0x6600, type: Zcl.DataType.SINGLE_PREC, write: true},
                noiseDetected: {name: "noiseDetected", ID: 0x6601, type: Zcl.DataType.BITMAP8, write: true},
                noiseDetectLevel: {name: "noiseDetectLevel", ID: 0x6602, type: Zcl.DataType.SINGLE_PREC, write: true},
                noiseAfterDetectDelay: {name: "noiseAfterDetectDelay", ID: 0x6603, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            },
            commands: {},
            commandsResponse: {},
        }),
    addSprutIrBlasterCluster: () =>
        m.deviceAddCustomCluster("sprutIrBlaster", {
            name: "sprutIrBlaster",
            ID: 0x6603,
            manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
            attributes: {},
            commands: {
                playStore: {name: "playStore", ID: 0x00, parameters: [{name: "param", type: Zcl.DataType.UINT8, max: 0xff}]},
                learnStart: {name: "learnStart", ID: 0x01, parameters: [{name: "value", type: Zcl.DataType.UINT8, max: 0xff}]},
                learnStop: {name: "learnStop", ID: 0x02, parameters: [{name: "value", type: Zcl.DataType.UINT8, max: 0xff}]},
                clearStore: {name: "clearStore", ID: 0x03, parameters: []},
                playRam: {name: "playRam", ID: 0x04, parameters: []},
                learnRamStart: {name: "learnRamStart", ID: 0x05, parameters: []},
                learnRamStop: {name: "learnRamStop", ID: 0x06, parameters: []},
            },
            commandsResponse: {},
        }),
    addSprutMsRelativeHumidityCluster: () =>
        m.deviceAddCustomCluster("msRelativeHumidity", {
            name: "msRelativeHumidity",
            ID: Zcl.Clusters.msRelativeHumidity.ID,
            attributes: {
                sprutHeater: {
                    name: "sprutHeater",
                    ID: 0x6600,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
                    write: true,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    addSprutMsOccupancySensingCluster: () =>
        m.deviceAddCustomCluster("msOccupancySensing", {
            name: "msOccupancySensing",
            ID: Zcl.Clusters.msOccupancySensing.ID,
            attributes: {
                sprutOccupancyLevel: {
                    name: "sprutOccupancyLevel",
                    ID: 0x6600,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
                    write: true,
                    max: 0xffff,
                },
                sprutOccupancySensitivity: {
                    name: "sprutOccupancySensitivity",
                    ID: 0x6601,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
                    write: true,
                    max: 0xffff,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    addSprutMsTemperatureMeasurementCluster: () =>
        m.deviceAddCustomCluster("msTemperatureMeasurement", {
            name: "msTemperatureMeasurement",
            ID: Zcl.Clusters.msTemperatureMeasurement.ID,
            attributes: {
                sprutTemperatureOffset: {
                    name: "sprutTemperatureOffset",
                    ID: 0x6600,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
                    write: true,
                    min: -32768,
                    max: 32767,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    addSprutMsCO2Cluster: () =>
        m.deviceAddCustomCluster("msCO2", {
            name: "msCO2",
            ID: Zcl.Clusters.msCO2.ID,
            attributes: {
                sprutCO2Calibration: {
                    name: "sprutCO2Calibration",
                    ID: 0x6600,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
                    write: true,
                },
                sprutCO2AutoCalibration: {
                    name: "sprutCO2AutoCalibration",
                    ID: 0x6601,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
                    write: true,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    sprutActivityIndicator: (args?: Partial<m.BinaryArgs<"genBinaryOutput">>) =>
        m.binary({
            name: "activity_led",
            cluster: "genBinaryOutput",
            attribute: "presentValue",
            description: "Controls green activity LED",
            reporting: {min: "MIN", max: "MAX", change: 1},
            valueOn: [true, 1],
            valueOff: [false, 0],
            access: "ALL",
            entityCategory: "config",
            ...args,
        }),
    sprutIsConnected: (args?: Partial<m.BinaryArgs<"sprutDevice", SprutDevice>>) =>
        m.binary<"sprutDevice", SprutDevice>({
            name: "uart_connection",
            cluster: "sprutDevice",
            attribute: "isConnected",
            valueOn: [true, 1],
            valueOff: [false, 0],
            description: "Indicates whether the device is communicating with sensors via UART",
            access: "STATE_GET",
            entityCategory: "diagnostic",
            ...args,
        }),
    sprutUartBaudRate: (args?: Partial<m.EnumLookupArgs<"sprutDevice", SprutDevice>>) =>
        m.enumLookup<"sprutDevice", SprutDevice>({
            name: "uart_baud_rate",
            lookup: {
                "9600": 9600,
                "19200": 19200,
                "38400": 38400,
                "57600": 57600,
                "115200": 115200,
            },
            cluster: "sprutDevice",
            attribute: "UartBaudRate",
            description: "UART baud rate",
            access: "ALL",
            entityCategory: "config",
            ...args,
        }),
    sprutTemperatureOffset: (args?: Partial<m.NumericArgs<"msTemperatureMeasurement", SprutMsTemperatureMeasurement>>) =>
        m.numeric<"msTemperatureMeasurement", SprutMsTemperatureMeasurement>({
            name: "temperature_offset",
            cluster: "msTemperatureMeasurement",
            attribute: "sprutTemperatureOffset",
            description: "Self-heating compensation. The compensation value is subtracted from the measured temperature (default: 0)",
            valueMin: -10,
            valueMax: 10,
            unit: "°C",
            scale: 100,
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: manufacturerOptions,
            ...args,
        }),
    sprutThHeater: (args?: Partial<m.BinaryArgs<"msRelativeHumidity", SprutMsRelativeHumidity>>) =>
        m.binary<"msRelativeHumidity", SprutMsRelativeHumidity>({
            name: "th_heater",
            cluster: "msRelativeHumidity",
            attribute: "sprutHeater",
            description: "Turn on when working in conditions of high humidity (more than 70 %, RH) or condensation, if the sensor shows 0 or 100 %.",
            valueOn: [true, 1],
            valueOff: [false, 0],
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: manufacturerOptions,
            ...args,
        }),
    sprutOccupancyLevel: (args?: Partial<m.NumericArgs<"msOccupancySensing", SprutMsOccupancySensing>>) =>
        m.numeric<"msOccupancySensing", SprutMsOccupancySensing>({
            name: "occupancy_level",
            cluster: "msOccupancySensing",
            attribute: "sprutOccupancyLevel",
            reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 5},
            description: "Measured occupancy level",
            access: "STATE_GET",
            entityCategory: "diagnostic",
            ...args,
        }),
    sprutOccupancyTimeout: (args?: Partial<m.NumericArgs<"msOccupancySensing">>) =>
        m.numeric({
            name: "occupancy_timeout",
            cluster: "msOccupancySensing",
            attribute: "pirOToUDelay",
            description: "Time in seconds after which occupancy is cleared after detecting it (default: 60)",
            valueMin: 0,
            valueMax: 2000,
            unit: "s",
            access: "ALL",
            entityCategory: "config",
            ...args,
        }),
    sprutOccupancySensitivity: (args?: Partial<m.NumericArgs<"msOccupancySensing", SprutMsOccupancySensing>>) =>
        m.numeric<"msOccupancySensing", SprutMsOccupancySensing>({
            name: "occupancy_sensitivity",
            cluster: "msOccupancySensing",
            attribute: "sprutOccupancySensitivity",
            description: "If the sensor is triggered by the slightest movement, reduce the sensitivity, otherwise increase it (default: 50)",
            valueMin: 0,
            valueMax: 2000,
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: manufacturerOptions,
            ...args,
        }),
    sprutNoise: (args?: Partial<m.NumericArgs<"sprutNoise">>) =>
        m.numeric<"sprutNoise", SprutNoise>({
            name: "noise",
            cluster: "sprutNoise",
            attribute: "noise",
            reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 5},
            description: "Measured noise level",
            unit: "dBA",
            precision: 2,
            access: "STATE_GET",
            entityCategory: "diagnostic",
            ...args,
        }),
    sprutNoiseDetectLevel: (args?: Partial<m.NumericArgs<"sprutNoise">>) =>
        m.numeric<"sprutNoise", SprutNoise>({
            name: "noise_detect_level",
            cluster: "sprutNoise",
            attribute: "noiseDetectLevel",
            description: "The minimum noise level at which the detector will work (default: 50)",
            valueMin: 0,
            valueMax: 150,
            unit: "dBA",
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: manufacturerOptions,
            ...args,
        }),
    sprutNoiseDetected: (args?: Partial<m.BinaryArgs<"sprutNoise">>) =>
        m.binary<"sprutNoise", SprutNoise>({
            name: "noise_detected",
            cluster: "sprutNoise",
            attribute: "noiseDetected",
            valueOn: [true, 1],
            valueOff: [false, 0],
            description: "Indicates whether the device detected noise",
            access: "STATE_GET",
            ...args,
        }),
    sprutNoiseTimeout: (args?: Partial<m.NumericArgs<"sprutNoise">>) =>
        m.numeric<"sprutNoise", SprutNoise>({
            name: "noise_timeout",
            cluster: "sprutNoise",
            attribute: "noiseAfterDetectDelay",
            description: "Time in seconds after which noise is cleared after detecting it (default: 60)",
            valueMin: 0,
            valueMax: 2000,
            unit: "s",
            access: "ALL",
            entityCategory: "config",
            ...args,
        }),
    sprutVoc: (args?: Partial<m.NumericArgs<"sprutVoc">>) =>
        m.numeric<"sprutVoc", SprutVoc>({
            name: "voc",
            label: "VOC",
            cluster: "sprutVoc",
            attribute: "voc",
            reporting: {min: "10_SECONDS", max: "1_MINUTE", change: 10},
            description: "Measured VOC level",
            unit: "µg/m³",
            access: "STATE_GET",
            ...args,
        }),
    sprutIrBlaster: (): ModernExtend => {
        const toZigbee: Tz.Converter[] = [
            {
                key: ["play_store", "learn_start", "learn_stop", "clear_store", "play_ram", "learn_ram_start", "learn_ram_stop"],
                convertSet: async (entity, key, value: KeyValueAny, meta) => {
                    const options = {
                        frameType: 0,
                        manufacturerCode: sprutCode,
                        disableDefaultResponse: true,
                        disableResponse: true,
                        reservedBits: 0,
                        direction: 0,
                        writeUndiv: false,
                        // @ts-expect-error ignore
                        transactionSequenceNumber: null,
                    };

                    switch (key) {
                        case "play_store":
                            await entity.command<"sprutIrBlaster", "playStore", SprutIrBlaster>(
                                "sprutIrBlaster",
                                "playStore",
                                {param: value.rom},
                                options,
                            );
                            break;
                        case "learn_start":
                            await entity.command<"sprutIrBlaster", "learnStart", SprutIrBlaster>(
                                "sprutIrBlaster",
                                "learnStart",
                                {value: value.rom},
                                options,
                            );
                            break;
                        case "learn_stop":
                            await entity.command<"sprutIrBlaster", "learnStop", SprutIrBlaster>(
                                "sprutIrBlaster",
                                "learnStop",
                                {value: value.rom},
                                options,
                            );
                            break;
                        case "clear_store":
                            await entity.command<"sprutIrBlaster", "clearStore", SprutIrBlaster>("sprutIrBlaster", "clearStore", {}, options);
                            break;
                        case "play_ram":
                            await entity.command<"sprutIrBlaster", "playRam", SprutIrBlaster>("sprutIrBlaster", "playRam", {}, options);
                            break;
                        case "learn_ram_start":
                            await entity.command<"sprutIrBlaster", "learnRamStart", SprutIrBlaster>("sprutIrBlaster", "learnRamStart", {}, options);
                            break;
                        case "learn_ram_stop":
                            await entity.command<"sprutIrBlaster", "learnRamStop", SprutIrBlaster>("sprutIrBlaster", "learnRamStop", {}, options);
                            break;
                    }
                },
            },
        ];
        const configure: Configure[] = [m.setupConfigureForBinding("sprutIrBlaster", "input")];
        return {toZigbee, configure, isModernExtend: true};
    },
};

const {
    addSprutVocCluster,
    addSprutNoiseCluster,
    addSprutIrBlasterCluster,
    addSprutMsRelativeHumidityCluster,
    addSprutMsOccupancySensingCluster,
    addSprutMsTemperatureMeasurementCluster,
    addSprutMsCO2Cluster,
    sprutActivityIndicator,
    sprutIsConnected,
    sprutUartBaudRate,
    sprutOccupancyLevel,
    sprutNoise,
    sprutVoc,
    sprutNoiseDetected,
    sprutOccupancyTimeout,
    sprutNoiseTimeout,
    sprutTemperatureOffset,
    sprutThHeater,
    sprutOccupancySensitivity,
    sprutNoiseDetectLevel,
    sprutIrBlaster,
} = sprutModernExtend;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["WB-MSW-ZIGBEE v.4"],
        model: "WB-MSW-ZIGBEE_v.4_official",
        vendor: "Wiren Board",
        description: "Wall-mounted multi sensor with official Wiren Board firmware",
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {default: 1, buzzer: 2, heater: 3, led_red: 4, led_green: 5}, multiEndpointSkip: ["occupancy"]}),
            // Custom cluster declarations
            m.deviceAddCustomCluster("genAnalogInput", {
                name: "genAnalogInput",
                ID: Zcl.Clusters.genAnalogInput.ID,
                attributes: {
                    noiseDetected: {name: "noiseDetected", ID: 0x1000, type: Zcl.DataType.BOOLEAN},
                    noiseThreshold: {name: "noiseThreshold", ID: 0x1001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    noiseTimeout: {name: "noiseTimeout", ID: 0x1002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("genMultistateInput", {
                name: "genMultistateInput",
                ID: Zcl.Clusters.genMultistateInput.ID,
                attributes: {
                    mswSlaveId: {name: "mswSlaveId", ID: 0x1000, type: Zcl.DataType.UINT8, max: 0xff},
                    mswSerialNumber: {name: "mswSerialNumber", ID: 0x1001, type: Zcl.DataType.UINT32, max: 0xffffffff},
                    mswFwVersion: {name: "mswFwVersion", ID: 0x1002, type: Zcl.DataType.CHAR_STR},
                    mswFwSignature: {name: "mswFwSignature", ID: 0x1003, type: Zcl.DataType.CHAR_STR},
                    mswBootVersion: {name: "mswBootVersion", ID: 0x1004, type: Zcl.DataType.CHAR_STR},
                    mswComponentVersion: {name: "mswComponentVersion", ID: 0x1005, type: Zcl.DataType.CHAR_STR},
                    mswComponentSignature: {name: "mswComponentSignature", ID: 0x1006, type: Zcl.DataType.CHAR_STR},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("msTemperatureMeasurement", {
                name: "msTemperatureMeasurement",
                ID: Zcl.Clusters.msTemperatureMeasurement.ID,
                attributes: {
                    temperatureOffset: {name: "temperatureOffset", ID: 0x1000, type: Zcl.DataType.INT16, write: true, min: -32768, max: 32767},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("msOccupancySensing", {
                name: "msOccupancySensing",
                ID: Zcl.Clusters.msOccupancySensing.ID,
                attributes: {
                    occupancyLevel: {name: "occupancyLevel", ID: 0x1000, type: Zcl.DataType.UINT16, max: 0xffff},
                    occupancySensitivity: {name: "occupancySensitivity", ID: 0x1001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    occupancyTimeout: {name: "occupancyTimeout", ID: 0x1002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("wbVoc", {
                name: "wbVoc",
                ID: 0x042e,
                attributes: {
                    measuredValue: {name: "measuredValue", ID: 0x0000, type: Zcl.DataType.SINGLE_PREC},
                },
                commands: {},
                commandsResponse: {},
            }),
            // Standard measurements & switches
            m.onOff({powerOnBehavior: false, endpointNames: ["buzzer", "heater", "led_red", "led_green"]}),
            m.illuminance({reporting: false}),
            m.temperature({reporting: false}),
            m.humidity({reporting: false}),
            m.occupancy({reporting: false}),
            m.co2({scale: 1, reporting: false}),
            // Custom attributes
            m.numeric({
                name: "noise_level",
                cluster: "genAnalogInput",
                attribute: "presentValue",
                description: "Current noise level",
                unit: "dBA",
                precision: 2,
                access: "STATE_GET",
                entityCategory: "diagnostic",
                reporting: false,
            }),
            m.binary<"genAnalogInput", WbGenAnalogInput>({
                name: "noise",
                cluster: "genAnalogInput",
                attribute: "noiseDetected",
                valueOn: [true, 1],
                valueOff: [false, 0],
                description: "Noise detected",
                access: "STATE_GET",
                reporting: false,
            }),
            m.numeric<"genAnalogInput", WbGenAnalogInput>({
                name: "noise_threshold",
                cluster: "genAnalogInput",
                attribute: "noiseThreshold",
                description: "Noise detection threshold",
                valueMin: 0,
                valueMax: 150,
                unit: "dBA",
                access: "ALL",
                entityCategory: "config",
                reporting: false,
            }),
            m.numeric<"genAnalogInput", WbGenAnalogInput>({
                name: "noise_timeout",
                cluster: "genAnalogInput",
                attribute: "noiseTimeout",
                description: "Time in seconds after which noise is cleared",
                valueMin: 0,
                valueMax: 2000,
                unit: "s",
                access: "ALL",
                entityCategory: "config",
                reporting: false,
            }),
            m.binary({
                name: "status_led",
                cluster: "genBinaryOutput",
                attribute: "presentValue",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "Status LED control",
                access: "ALL",
                reporting: false,
            }),
            m.enumLookup({
                name: "connectivity",
                lookup: {offline: 1, online: 2, firmware_update: 3, component_update: 4},
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Device connectivity state",
                access: "STATE_GET",
                entityCategory: "diagnostic",
                reporting: false,
            }),
            m.numeric<"genMultistateInput", WbGenMultistateInput>({
                name: "modbus_slave_id",
                cluster: "genMultistateInput",
                attribute: "mswSlaveId",
                description: "Device Modbus slave ID",
                access: "STATE_GET",
                entityCategory: "diagnostic",
                reporting: false,
            }),
            m.numeric<"genMultistateInput", WbGenMultistateInput>({
                name: "serial_number",
                cluster: "genMultistateInput",
                attribute: "mswSerialNumber",
                description: "Device serial number",
                access: "STATE_GET",
                entityCategory: "diagnostic",
                reporting: false,
            }),
            m.text<"genMultistateInput", WbGenMultistateInput>({
                name: "fw_version",
                cluster: "genMultistateInput",
                attribute: "mswFwVersion",
                description: "Device firmware version",
                access: "STATE_GET",
                entityCategory: "diagnostic",
            }),
            m.text<"genMultistateInput", WbGenMultistateInput>({
                name: "fw_signature",
                cluster: "genMultistateInput",
                attribute: "mswFwSignature",
                description: "Device firmware signature",
                access: "STATE_GET",
                entityCategory: "diagnostic",
            }),
            m.text<"genMultistateInput", WbGenMultistateInput>({
                name: "boot_version",
                cluster: "genMultistateInput",
                attribute: "mswBootVersion",
                description: "Device bootloader version",
                access: "STATE_GET",
                entityCategory: "diagnostic",
            }),
            m.text<"genMultistateInput", WbGenMultistateInput>({
                name: "component_version",
                cluster: "genMultistateInput",
                attribute: "mswComponentVersion",
                description: "Device component firmware version",
                access: "STATE_GET",
                entityCategory: "diagnostic",
            }),
            m.text<"genMultistateInput", WbGenMultistateInput>({
                name: "component_signature",
                cluster: "genMultistateInput",
                attribute: "mswComponentSignature",
                description: "Device component firmware signature",
                access: "STATE_GET",
                entityCategory: "diagnostic",
            }),
            m.numeric<"msTemperatureMeasurement", WbMsTemperatureMeasurement>({
                name: "temperature_offset",
                cluster: "msTemperatureMeasurement",
                attribute: "temperatureOffset",
                description: "Offset subtracted from the raw temperature reading",
                valueMin: -10,
                valueMax: 10,
                valueStep: 0.1,
                unit: "°C",
                scale: 100,
                access: "ALL",
                entityCategory: "config",
                reporting: false,
            }),
            m.numeric<"msOccupancySensing", WbMsOccupancySensing>({
                name: "occupancy_level",
                cluster: "msOccupancySensing",
                attribute: "occupancyLevel",
                description: "Raw occupancy level reported by the sensor",
                access: "STATE_GET",
                entityCategory: "diagnostic",
                reporting: false,
            }),
            m.numeric<"msOccupancySensing", WbMsOccupancySensing>({
                name: "occupancy_sensitivity",
                cluster: "msOccupancySensing",
                attribute: "occupancySensitivity",
                description: "Occupancy detection sensitivity",
                valueMin: 0,
                valueMax: 2000,
                access: "ALL",
                entityCategory: "config",
                reporting: false,
            }),
            m.numeric<"msOccupancySensing", WbMsOccupancySensing>({
                name: "occupancy_timeout",
                cluster: "msOccupancySensing",
                attribute: "occupancyTimeout",
                description: "Time in seconds after which occupancy is cleared",
                valueMin: 0,
                valueMax: 2000,
                unit: "s",
                access: "ALL",
                entityCategory: "config",
                reporting: false,
            }),
            m.numeric<"wbVoc", WbVocMeasurement>({
                name: "voc",
                label: "VOC",
                cluster: "wbVoc",
                attribute: "measuredValue",
                description: "Measured VOC concentration",
                unit: "µg/m³",
                access: "STATE_GET",
                reporting: false,
            }),
            // Bindings (reporting is firmware-driven, so clusters are only bound)
            m.bindCluster({cluster: "genAnalogInput", clusterType: "input"}),
            m.bindCluster({cluster: "genBinaryOutput", clusterType: "input"}),
            m.bindCluster({cluster: "genMultistateInput", clusterType: "input"}),
            m.bindCluster({cluster: "msIlluminanceMeasurement", clusterType: "input"}),
            m.bindCluster({cluster: "msTemperatureMeasurement", clusterType: "input"}),
            m.bindCluster({cluster: "msRelativeHumidity", clusterType: "input"}),
            m.bindCluster({cluster: "msOccupancySensing", clusterType: "input"}),
            m.bindCluster({cluster: "msCO2", clusterType: "input"}),
            m.bindCluster({cluster: "wbVoc", clusterType: "input"}),
        ],
    },
    {
        zigbeeModel: ["WBMSW3"],
        model: "WB-MSW-ZIGBEE v.3",
        vendor: "Wirenboard",
        description: "Wall-mounted multi sensor",
        fromZigbee: [
            fzLocal.temperature,
            fz.humidity,
            fz.occupancy,
            fzLocal.occupancy_level,
            fz.co2,
            fzLocal.voc,
            fzLocal.noise,
            fzLocal.noise_detected,
            fz.on_off,
            fzLocal.occupancy_timeout,
            fzLocal.noise_timeout,
            fzLocal.co2_mh_z19b_config,
            fzLocal.th_heater,
            fzLocal.occupancy_sensitivity,
            fzLocal.noise_detect_level,
        ],
        toZigbee: [
            tz.on_off,
            tzLocal.sprut_ir_remote,
            tzLocal.occupancy_timeout,
            tzLocal.noise_timeout,
            tzLocal.co2_mh_z19b_config,
            tzLocal.th_heater,
            tzLocal.temperature_offset,
            tzLocal.occupancy_sensitivity,
            tzLocal.noise_detect_level,
        ],
        exposes: [
            e.temperature(),
            e.humidity(),
            e.occupancy(),
            e.occupancy_level(),
            e.co2(),
            e.voc(),
            e.noise(),
            e.noise_detected(),
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e
                .numeric("noise_timeout", ea.ALL)
                .withValueMin(0)
                .withValueMax(2000)
                .withUnit("s")
                .withCategory("config")
                .withDescription("Time in seconds after which noise is cleared after detecting it (default: 60)"),
            e
                .numeric("occupancy_timeout", ea.ALL)
                .withValueMin(0)
                .withValueMax(2000)
                .withUnit("s")
                .withCategory("config")
                .withDescription("Time in seconds after which occupancy is cleared after detecting it (default: 60)"),
            e
                .numeric("temperature_offset", ea.SET)
                .withValueMin(-10)
                .withValueMax(10)
                .withUnit("°C")
                .withCategory("config")
                .withDescription("Self-heating compensation. The compensation value is subtracted from the measured temperature"),
            e
                .numeric("occupancy_sensitivity", ea.ALL)
                .withValueMin(0)
                .withValueMax(2000)
                .withCategory("config")
                .withDescription("If the sensor is triggered by the slightest movement, reduce the sensitivity, otherwise increase it (default: 50)"),
            e
                .numeric("noise_detect_level", ea.ALL)
                .withValueMin(0)
                .withValueMax(150)
                .withUnit("dBA")
                .withCategory("config")
                .withDescription("The minimum noise level at which the detector will work (default: 50)"),
            e
                .enum("co2_autocalibration", ea.ALL, switchActionValues)
                .withCategory("config")
                .withDescription(
                    "Automatic calibration of the CO2 sensor. If ON, the CO2 sensor will automatically calibrate every 7 days. (MH-Z19B sensor)",
                ),
            e
                .enum("co2_manual_calibration", ea.ALL, switchActionValues)
                .withCategory("config")
                .withDescription(
                    "Ventilate the room for 20 minutes, turn on manual calibration, and turn it off after one second. " +
                        "After about 5 minutes the CO2 sensor will show 400ppm. Calibration completed. (MH-Z19B sensor)",
                ),
            e
                .enum("th_heater", ea.ALL, switchActionValues)
                .withCategory("config")
                .withDescription(
                    "Turn on when working in conditions of high humidity (more than 70 %, RH) or condensation, if the sensor shows 0 or 100 %.",
                ),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "msTemperatureMeasurement",
                "msRelativeHumidity",
                "msOccupancySensing",
                "msCO2",
                "sprutVoc",
                "sprutNoise",
                "sprutIrBlaster",
                "genOta",
            ];
            await reporting.bind(endpoint1, coordinatorEndpoint, binds);

            // report configuration
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint1);
            await reporting.occupancy(endpoint1);

            let payload = reporting.payload<"msOccupancySensing", SprutMsOccupancySensing>(
                "sprutOccupancyLevel",
                10,
                constants.repInterval.MINUTE,
                5,
            );
            await endpoint1.configureReporting("msOccupancySensing", payload, manufacturerOptions);

            payload = reporting.payload<"sprutNoise", SprutNoise>("noise", 10, constants.repInterval.MINUTE, 5);
            await endpoint1.configureReporting("sprutNoise", payload);

            // led_red
            await device.getEndpoint(2).read("genOnOff", ["onOff"]);

            // led_green
            await device.getEndpoint(3).read("genOnOff", ["onOff"]);

            // buzzer
            await device.getEndpoint(4).read("genOnOff", ["onOff"]);
        },
        endpoint: (device) => {
            return {default: 1, l1: 2, l2: 3, l3: 4};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ["humidity"]},
        ota: true,
        extend: [
            addSprutVocCluster(),
            addSprutNoiseCluster(),
            addSprutIrBlasterCluster(),
            addSprutMsRelativeHumidityCluster(),
            addSprutMsOccupancySensingCluster(),
            addSprutMsTemperatureMeasurementCluster(),
            addSprutMsCO2Cluster(),
            m.illuminance(),
        ],
    },
    {
        zigbeeModel: ["WBMSW4"],
        model: "WB-MSW-ZIGBEE v.4",
        vendor: "Wirenboard",
        description: "Wall-mounted multi sensor",
        extend: [
            addSprutVocCluster(),
            addSprutNoiseCluster(),
            addSprutIrBlasterCluster(),
            addSprutMsRelativeHumidityCluster(),
            addSprutMsOccupancySensingCluster(),
            addSprutMsTemperatureMeasurementCluster(),
            addSprutMsCO2Cluster(),
            m.deviceAddCustomCluster("genBasic", {
                name: "genBasic",
                ID: 0,
                attributes: {
                    deviceVersion: {name: "deviceVersion", ID: 26113, type: Zcl.DataType.CHAR_STR, manufacturerCode: sprutCode, write: true},
                    deviceSignature: {name: "deviceSignature", ID: 26114, type: Zcl.DataType.CHAR_STR, manufacturerCode: sprutCode, write: true},
                    deviceBootVersion: {name: "deviceBootVersion", ID: 26115, type: Zcl.DataType.CHAR_STR, manufacturerCode: sprutCode, write: true},
                    componentVersion: {name: "componentVersion", ID: 26117, type: Zcl.DataType.CHAR_STR, manufacturerCode: sprutCode, write: true},
                    componentSignature: {
                        name: "componentSignature",
                        ID: 26118,
                        type: Zcl.DataType.CHAR_STR,
                        manufacturerCode: sprutCode,
                        write: true,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("sprutDevice", {
                name: "sprutDevice",
                ID: 26112,
                manufacturerCode: Zcl.ManufacturerCode.CUSTOM_SPRUT_DEVICE,
                attributes: {
                    isConnected: {name: "isConnected", ID: 26116, type: Zcl.DataType.BOOLEAN, write: true},
                    UartBaudRate: {name: "UartBaudRate", ID: 26113, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                },
                commands: {
                    debug: {
                        name: "debug",
                        ID: 103,
                        parameters: [{name: "data", type: Zcl.DataType.UINT8, max: 0xff}],
                    },
                },
                commandsResponse: {},
            }),
            m.deviceEndpoints({
                endpoints: {default: 1, l1: 2, l2: 3, l3: 4, indicator: 5},
                multiEndpointSkip: ["occupancy"],
            }),
            m.onOff({powerOnBehavior: false, endpointNames: ["l1", "l2", "l3"]}),
            sprutActivityIndicator({endpointName: "indicator"}),
            sprutIsConnected(),
            m.temperature(),
            sprutTemperatureOffset(),
            m.humidity(),
            sprutThHeater(),
            m.co2(),
            m.illuminance(),
            m.occupancy(),
            sprutOccupancySensitivity(),
            sprutOccupancyLevel(),
            sprutOccupancyTimeout(),
            sprutNoise(),
            sprutNoiseDetectLevel(),
            sprutNoiseDetected(),
            sprutNoiseTimeout(),
            sprutVoc(),
            sprutIrBlaster(),
            sprutUartBaudRate(),
        ],
        ota: true,
    },
];
