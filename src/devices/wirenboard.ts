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

const sprutCode = 0x6666;
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
    } satisfies Fz.Converter<"msOccupancySensing", undefined, ["readResponse", "attributeReport"]>,
    voc: {
        cluster: "sprutVoc",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.voc !== undefined) {
                return {voc: msg.data.voc};
            }
        },
    } satisfies Fz.Converter<"sprutVoc", undefined, ["readResponse", "attributeReport"]>,
    noise: {
        cluster: "sprutNoise",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.noise !== undefined) {
                return {noise: msg.data.noise.toFixed(2)};
            }
        },
    } satisfies Fz.Converter<"sprutNoise", undefined, ["readResponse", "attributeReport"]>,
    noise_detected: {
        cluster: "sprutNoise",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.noiseDetected !== undefined) {
                return {noise_detected: msg.data.noiseDetected === 1};
            }
        },
    } satisfies Fz.Converter<"sprutNoise", undefined, ["readResponse", "attributeReport"]>,
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
    } satisfies Fz.Converter<"sprutNoise", undefined, ["readResponse", "attributeReport"]>,
    occupancy_sensitivity: {
        cluster: "msOccupancySensing",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            return {occupancy_sensitivity: msg.data.sprutOccupancySensitivity};
        },
    } satisfies Fz.Converter<"msOccupancySensing", undefined, ["readResponse", "attributeReport"]>,
    noise_detect_level: {
        cluster: "sprutNoise",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            return {noise_detect_level: msg.data.noiseDetectLevel};
        },
    } satisfies Fz.Converter<"sprutNoise", undefined, ["readResponse", "attributeReport"]>,
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
    } satisfies Fz.Converter<"msCO2", undefined, ["attributeReport", "readResponse"]>,
    th_heater: {
        cluster: "msRelativeHumidity",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.sprutHeater !== undefined) {
                return {th_heater: switchActionValues[msg.data.sprutHeater]};
            }
        },
    } satisfies Fz.Converter<"msRelativeHumidity", undefined, ["attributeReport", "readResponse"]>,
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
                    await entity.command("sprutIrBlaster", "playStore", {param: value.rom}, options);
                    break;
                case "learn_start":
                    await entity.command("sprutIrBlaster", "learnStart", {value: value.rom}, options);
                    break;
                case "learn_stop":
                    await entity.command("sprutIrBlaster", "learnStop", {value: value.rom}, options);
                    break;
                case "clear_store":
                    await entity.command("sprutIrBlaster", "clearStore", {}, options);
                    break;
                case "play_ram":
                    await entity.command("sprutIrBlaster", "playRam", {}, options);
                    break;
                case "learn_ram_start":
                    await entity.command("sprutIrBlaster", "learnRamStart", {}, options);
                    break;
                case "learn_ram_stop":
                    await entity.command("sprutIrBlaster", "learnRamStop", {}, options);
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
            await entity.write("sprutNoise", {noiseAfterDetectDelay: number}, getOptions(meta.mapped, entity));
            return {state: {[key]: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("sprutNoise", ["noiseAfterDetectDelay"]);
        },
    } satisfies Tz.Converter,
    occupancy_sensitivity: {
        key: ["occupancy_sensitivity"],
        convertSet: async (entity, key, value, meta) => {
            let number = toNumber(value, "occupancy_sensitivity");
            number *= 1;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write("msOccupancySensing", {sprutOccupancySensitivity: number}, options);
            return {state: {[key]: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("msOccupancySensing", ["sprutOccupancySensitivity"], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    noise_detect_level: {
        key: ["noise_detect_level"],
        convertSet: async (entity, key, value, meta) => {
            let number = toNumber(value, "noise_detect_level");
            number *= 1;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write("sprutNoise", {noiseDetectLevel: number}, options);
            return {state: {[key]: number}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("sprutNoise", ["noiseDetectLevel"], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    temperature_offset: {
        key: ["temperature_offset"],
        convertSet: async (entity, key, value, meta) => {
            let number = toNumber(value, "temperature_offset");
            number *= 1;
            const newValue = number * 100.0;
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write("msTemperatureMeasurement", {sprutTemperatureOffset: newValue}, options);
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

            await entity.write("msCO2", payload, options);

            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("msCO2", [getFromLookup(key, co2Lookup)], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    th_heater: {
        key: ["th_heater"],
        convertSet: async (entity, key, value, meta) => {
            assertString(value, "th_heater");
            const newValue = switchActionValues.indexOf(value);
            const options = getOptions(meta.mapped, entity, manufacturerOptions);
            await entity.write("msRelativeHumidity", {sprutHeater: newValue}, options);

            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("msRelativeHumidity", ["sprutHeater"], manufacturerOptions);
        },
    } satisfies Tz.Converter,
};

const sprutModernExtend = {
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
    sprutTemperatureOffset: (args?: Partial<m.NumericArgs<"msTemperatureMeasurement">>) =>
        m.numeric({
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
    sprutThHeater: (args?: Partial<m.BinaryArgs<"msRelativeHumidity">>) =>
        m.binary({
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
    sprutOccupancyLevel: (args?: Partial<m.NumericArgs<"msOccupancySensing">>) =>
        m.numeric({
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
    sprutOccupancySensitivity: (args?: Partial<m.NumericArgs<"msOccupancySensing">>) =>
        m.numeric({
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
        m.numeric({
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
        m.numeric({
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
        m.binary({
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
        m.numeric({
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
        m.numeric({
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
                            await entity.command("sprutIrBlaster", "playStore", {param: value.rom}, options);
                            break;
                        case "learn_start":
                            await entity.command("sprutIrBlaster", "learnStart", {value: value.rom}, options);
                            break;
                        case "learn_stop":
                            await entity.command("sprutIrBlaster", "learnStop", {value: value.rom}, options);
                            break;
                        case "clear_store":
                            await entity.command("sprutIrBlaster", "clearStore", {}, options);
                            break;
                        case "play_ram":
                            await entity.command("sprutIrBlaster", "playRam", {}, options);
                            break;
                        case "learn_ram_start":
                            await entity.command("sprutIrBlaster", "learnRamStart", {}, options);
                            break;
                        case "learn_ram_stop":
                            await entity.command("sprutIrBlaster", "learnRamStop", {}, options);
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

            let payload = reporting.payload<"msOccupancySensing">("sprutOccupancyLevel", 10, constants.repInterval.MINUTE, 5);
            await endpoint1.configureReporting("msOccupancySensing", payload, manufacturerOptions);

            payload = reporting.payload<"sprutNoise">("noise", 10, constants.repInterval.MINUTE, 5);
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
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["WBMSW4"],
        model: "WB-MSW-ZIGBEE v.4",
        vendor: "Wirenboard",
        description: "Wall-mounted multi sensor",
        extend: [
            m.deviceAddCustomCluster("sprutDevice", {
                ID: 26112,
                manufacturerCode: 26214,
                attributes: {
                    isConnected: {ID: 26116, type: Zcl.DataType.BOOLEAN},
                    UartBaudRate: {ID: 26113, type: Zcl.DataType.UINT32},
                },
                commands: {
                    debug: {
                        ID: 103,
                        parameters: [{name: "data", type: Zcl.DataType.UINT8}],
                    },
                },
                commandsResponse: {},
            }),
            m.forcePowerSource({powerSource: "Mains (single phase)"}),
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
