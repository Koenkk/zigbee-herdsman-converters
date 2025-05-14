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
        fingerprint: [
            {modelID: "LYWSD03MMC-z", manufacturerName: "Xiaomi"},
            {modelID: "LYWSD03MMC-bz", manufacturerName: "Xiaomi"},
        ],
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
        fingerprint: [
            {modelID: "MHO-C122-z", manufacturerName: "MiaoMiaoCe"},
            {modelID: "MHO-C122-bz", manufacturerName: "MiaoMiaoCe"},
        ],
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
        fingerprint: [
            {modelID: "MHO-C401-z", manufacturerName: "MiaoMiaoCe"},
            {modelID: "MHO-C401-bz", manufacturerName: "MiaoMiaoCe"},
            {modelID: "MHO-C401N-z", manufacturerName: "MiaoMiaoCe"},
            {modelID: "MHO-C401N-bz", manufacturerName: "MiaoMiaoCe"},
        ],
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
    /*
        ZigbeeTLc devices supporting:
        - Temperature (+calibration)
        - Humidity (+calibration)
        - Display
    */
    {
        fingerprint: [
            {modelID: "CGDK2-z", manufacturerName: "Qingping"},
            {modelID: "CGDK2-bz", manufacturerName: "Qingping"},
        ],
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
    /*
        ZigbeeTLc devices supporting:
        - Temperature (+calibration)
        - Humidity (+calibration)
    */
    {
        fingerprint: [
            {modelID: "TS0201-z", manufacturerName: "Tuya"},
            {modelID: "TS0201-bz", manufacturerName: "Tuya"},
            {modelID: "TH03Z-z", manufacturerName: "Tuya"},
            {modelID: "TH03Z-bz", manufacturerName: "Tuya"},
            {modelID: "ZTH01-z", manufacturerName: "Tuya"},
            {modelID: "ZTH01-bz", manufacturerName: "Tuya"},
            {modelID: "ZTH02-z", manufacturerName: "Tuya"},
            {modelID: "ZTH02-bz", manufacturerName: "Tuya"},
        ],
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
];
