import {Zcl} from "zigbee-herdsman";

import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const extend = {
    enableDisplay: m.binary({
        name: "enable_display",
        valueOn: [true, 0],
        valueOff: [false, 1],
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0106, type: Zcl.DataType.ENUM8},
        description: "Whether to enable the device display.",
    }),
    temperatureDisplayMode: m.enumLookup({
        name: "temperature_display_mode",
        lookup: {celsius: 0, fahrenheit: 1},
        cluster: "hvacUserInterfaceCfg",
        attribute: "tempDisplayMode",
        description: "The unit of the temperature displayed on the device screen.",
    }),
    comfortSmiley: m.binary({
        name: "comfort_smiley",
        valueOn: [true, 0],
        valueOff: [false, 1],
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0002, type: Zcl.DataType.ENUM8},
        description: "Whether to show a comfort indicator on the device screen.",
    }),
    comfortTemperatureMin: m.numeric({
        name: "comfort_temperature_min",
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0102, type: Zcl.DataType.INT16},
        description: "Minimum temperature that is considered comfortable (default 20.00°C).",
        unit: "°C",
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 100,
    }),
    comfortTemperatureMax: m.numeric({
        name: "comfort_temperature_max",
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0103, type: Zcl.DataType.INT16},
        description: "Maximum temperature that is considered comfortable (default 25.00°C).",
        unit: "°C",
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 100,
    }),
    comfortHumidityMin: m.numeric({
        name: "comfort_humidity_min",
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0104, type: Zcl.DataType.UINT16},
        description: "Minimum relative humidity that is considered comfortable (default 40.00%)",
        unit: "%",
        valueMin: 0,
        valueMax: 100,
        scale: 100,
    }),
    comfortHumidityMax: m.numeric({
        name: "comfort_humidity_max",
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0105, type: Zcl.DataType.UINT16},
        description: "Maximum relative humidity that is considered comfortable (default 60.00%).",
        unit: "%",
        valueMin: 0,
        valueMax: 100,
        scale: 100,
    }),
    temperatureCalibration: m.numeric({
        name: "temperature_calibration",
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0100, type: Zcl.DataType.INT16},
        description: "Offset to add/subtract to the reported temperature (default 0°C).",
        unit: "°C",
        valueMin: -50.0,
        valueMax: 50.0,
        valueStep: 0.01,
        scale: 100,
    }),
    humidityCalibration: m.numeric({
        name: "humidity_calibration",
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0101, type: Zcl.DataType.INT16},
        description: "Offset to add/subtract to the reported relative humidity (default 0%).",
        unit: "%",
        valueMin: -50.0,
        valueMax: 50.0,
        valueStep: 0.01,
        scale: 100,
    }),
    measurementInterval: m.numeric({
        name: "measurement_interval",
        cluster: "hvacUserInterfaceCfg",
        attribute: {ID: 0x0107, type: Zcl.DataType.UINT8},
        description: "Configure sensor measurement interval (default 10 seconds).",
        unit: "s",
        valueMin: 3,
        valueMax: 30,
    }),
};

/*
    ZigbeeTLc devices with the full supported option set:
    - Temperature (+calibration)
    - Humidity (+calibration)
    - Display
    - Comfort (Temperature / Humidity)
*/
export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["LYWSD03MMC-z", "LYWSD03MMC-bz"],
        // LYWSD03MMC or similar with ZigbeeTLc firmware (alternative is devbis firmware)
        model: "LYWSD03MMC-z",
        vendor: "Xiaomi",
        description: "Temperature and Humidity Monitor (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity(),
            extend.enableDisplay,
            extend.temperatureDisplayMode,
            extend.comfortSmiley,
            extend.comfortTemperatureMin,
            extend.comfortTemperatureMax,
            extend.comfortHumidityMin,
            extend.comfortHumidityMax,
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["MJWSD06MMC-z", "MJWSD06MMC-bz"],
        // MJWSD06MMC with ZigbeeTLc firmware, normal device is Bluetooth only
        model: "MJWSD06MMC",
        vendor: "Xiaomi",
        description: "Temperature and Humidity Monitor 3 Mini (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity(),
            extend.enableDisplay,
            extend.temperatureDisplayMode,
            extend.comfortSmiley,
            extend.comfortTemperatureMin,
            extend.comfortTemperatureMax,
            extend.comfortHumidityMin,
            extend.comfortHumidityMax,
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["MHO-C122-z", "MHO-C122-bz"],
        // MHO-C122 with ZigbeeTLc firmware, normal device is Bluetooth only
        model: "MHO-C122",
        vendor: "MiaoMiaoCe",
        description: "Temperature and Humidity Monitor (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity(),
            extend.enableDisplay,
            extend.temperatureDisplayMode,
            extend.comfortSmiley,
            extend.comfortTemperatureMin,
            extend.comfortTemperatureMax,
            extend.comfortHumidityMin,
            extend.comfortHumidityMax,
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["MHO-C401-z", "MHO-C401-bz", "MHO-C401N-z", "MHO-C401N-bz"],
        // MHO-C401 with ZigbeeTLc firmware, normal device is Bluetooth only
        model: "MHO-C401",
        vendor: "MiaoMiaoCe",
        description: "Temperature and Humidity Monitor (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity(),
            extend.enableDisplay,
            extend.temperatureDisplayMode,
            extend.comfortSmiley,
            extend.comfortTemperatureMin,
            extend.comfortTemperatureMax,
            extend.comfortHumidityMin,
            extend.comfortHumidityMax,
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["CGG1-z", "CGG1-bz", "CGG1N-z", "CGG1N-bz"],
        // CGG1 with ZigbeeTLc firmware, normal device is Bluetooth only
        model: "CGG1",
        vendor: "Qingping",
        description: "Temp & RH Monitor (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity(),
            extend.enableDisplay,
            extend.temperatureDisplayMode,
            extend.comfortSmiley,
            extend.comfortTemperatureMin,
            extend.comfortTemperatureMax,
            extend.comfortHumidityMin,
            extend.comfortHumidityMax,
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    /*
        ZigbeeTLc devices supporting:
        - Temperature (+calibration)
        - Humidity (+calibration)
        - Display
    */
    {
        zigbeeModel: ["CGDK2-z", "CGDK2-bz"],
        // CGDK2 with ZigbeeTLc firmware, normal device is Bluetooth only
        model: "CGDK2",
        vendor: "Qingping",
        description: "Temp & RH Monitor Lite (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity(),
            extend.enableDisplay,
            extend.temperatureDisplayMode,
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["LKTMZL02-z"],
        // LKTMZL02 with ZigbeeTLc firmware
        model: "LKTMZL02-z",
        vendor: "Tuya",
        description: "Temperature & Humidity Sensor (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity(),
            extend.enableDisplay,
            extend.temperatureDisplayMode,
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    /*
        ZigbeeTLc devices supporting:
        - Temperature (+calibration)
        - Humidity (+calibration)
    */
    {
        zigbeeModel: ["TS0201-z", "TS0201-bz", "TH03Z-z", "TH03Z-bz", "ZTH01-z", "ZTH01-bz", "ZTH02-z", "ZTH02-bz", "ZY-ZTH02-z"],
        // TS0201 with ZigbeeTLc firmware
        model: "TS0201-z",
        vendor: "Tuya",
        description: "Temperature & Humidity Sensor (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity(),
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["ZG-227Z-z"],
        model: "ZG-227Z-z",
        vendor: "Tuya",
        description: "Temperature & humidity sensor (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature(),
            m.humidity(),
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["MC-z"],
        model: "MC-z",
        vendor: "ZBeacon",
        description: "Temperature & Humidity Sensor (pvxx/ZigbeeTLc)",
        extend: [
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 50}}),
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
            m.battery({
                voltage: true,
            }),
        ],
        ota: true,
    },
];
