import {Zcl} from "zigbee-herdsman";

import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const extend = {
    ternaryOccupancy: (): ModernExtend => ({
        exposes: [
            e.occupancy().withAccess(ea.STATE_GET),
            e.binary("motion", ea.STATE, true, false).withDescription("Indicates whether PIR motion is detected"),
            e.binary("presence", ea.STATE, true, false).withDescription("Indicates whether mmWave radar presence is detected"),
            e.enum("presence_state", ea.STATE, ["clear", "motion", "presence", "motion_and_presence"]).withDescription("Current presence state"),
        ],
        fromZigbee: [
            {
                cluster: "msOccupancySensing",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.occupancy !== undefined) {
                        const raw = Number(msg.data.occupancy);
                        const pir = (raw & 0x02) > 0;
                        const radar = (raw & 0x04) > 0;
                        const occupied = (raw & 0x01) > 0;
                        let state = "clear";
                        if (pir && radar) {
                            state = "motion_and_presence";
                        } else if (pir) {
                            state = "motion";
                        } else if (radar) {
                            state = "presence";
                        }
                        return {
                            occupancy: occupied,
                            motion: pir,
                            presence: radar,
                            presence_state: state,
                        };
                    }
                },
            },
        ],
        toZigbee: [
            {
                key: ["occupancy"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("msOccupancySensing", ["occupancy"]);
                },
            },
        ],
        isModernExtend: true,
    }),
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
        valueMax: 255,
    }),
};

// HOBEIAN ZG-204ZV with pvvx/ZigbeeTLc (motion + illuminance + remote On/Off).
// https://pvvx.github.io/ZG-204ZV/
// Boards 51 and 56 include WHT20 T/H. Boards 55 and 57 do not.
// ZCL manufacturer name is "Sonoff"; catalog vendor remains HOBEIAN.
// Do not use m.thermostatUi(): USE_DISPLAY=0, no keypadLockout.
const zg204zvMotion = [
    m.battery({voltage: true}),
    m.illuminance(),
    m.occupancy(),
    m.onOff({
        powerOnBehavior: false,
        description: 'Enable remote On/Off binding. ON: occupancy occupied sends action "on", clear sends action "off". OFF: no occupancy actions.',
    }),
    m.enumLookup({
        name: "power_on_behavior",
        cluster: "genOnOff",
        attribute: "startUpOnOff",
        lookup: {
            off: 0,
            on: 1,
            toggle: 2,
            previous: 255,
        },
        description: "Power-on behavior for state (remote On/Off enable)",
    }),
    m.numeric({
        name: "fading_time",
        label: "Fading time",
        cluster: "msOccupancySensing",
        attribute: "pirOToUDelay",
        unit: "s",
        valueMin: 0,
        valueMax: 524,
        access: "ALL",
        entityCategory: "config",
        description:
            "Occupancy hold time in seconds. Firmware default 35 s. 0 is valid and selects a hardware hold of about 2 s. Values above 524 s are clipped to 524 by the firmware.",
    }),
    m.numeric({
        name: "motion_detection_sensitivity",
        label: "Motion detection sensitivity",
        cluster: "msOccupancySensing",
        attribute: "pirUToOThreshold",
        valueMin: 1,
        valueMax: 254,
        access: "ALL",
        entityCategory: "config",
        description: "Motion sensitivity. A lower value is more sensitive. A higher value needs a stronger or closer signal. Firmware default 125.",
    }),
    m.commandsOnOff(),
];

// HOBEIAN ZG-204ZS and ZG-204ZM with pvvx/ZigbeeTLc (dual PIR + Skyrelay RC2417 24GHz mmWave radar + illuminance + remote On/Off).
// Board 60 / image type 0x023C.
// ZCL manufacturer name is "Sonoff"; catalog vendor remains HOBEIAN.
const zg204zsMotion = [
    m.battery({voltage: true}),
    m.illuminance(),
    extend.ternaryOccupancy(),
    m.onOff({
        powerOnBehavior: false,
        description: 'Enable remote On/Off binding. ON: occupancy occupied sends action "on", clear sends action "off". OFF: no occupancy actions.',
    }),
    m.enumLookup({
        name: "power_on_behavior",
        cluster: "genOnOff",
        attribute: "startUpOnOff",
        lookup: {
            off: 0,
            on: 1,
            toggle: 2,
            previous: 255,
        },
        description: "Power-on behavior for state (remote On/Off enable)",
    }),
    m.numeric({
        name: "fading_time",
        label: "Fading time",
        cluster: "msOccupancySensing",
        attribute: "pirOToUDelay",
        unit: "s",
        valueMin: 0,
        valueMax: 524,
        access: "ALL",
        entityCategory: "config",
        description: "Occupancy hold time in seconds. Firmware default 35 s.",
    }),
    m.numeric({
        name: "zone1_motion_threshold",
        label: "Zone 1 motion threshold",
        cluster: "msOccupancySensing",
        attribute: {ID: 0x5101, type: Zcl.DataType.UINT8},
        valueMin: 0,
        valueMax: 99,
        access: "ALL",
        entityCategory: "config",
        description: "Zone 1 (0-2m) motion sensitivity threshold (higher = less sensitive, 99 = disabled). Firmware default 14.",
    }),
    m.numeric({
        name: "zone1_still_threshold",
        label: "Zone 1 still threshold",
        cluster: "msOccupancySensing",
        attribute: {ID: 0x5102, type: Zcl.DataType.UINT8},
        valueMin: 0,
        valueMax: 99,
        access: "ALL",
        entityCategory: "config",
        description: "Zone 1 (0-2m) still presence threshold (higher = less sensitive, 99 = disabled). Firmware default 2.",
    }),
    m.numeric({
        name: "zone2_motion_threshold",
        label: "Zone 2 motion threshold",
        cluster: "msOccupancySensing",
        attribute: {ID: 0x5103, type: Zcl.DataType.UINT8},
        valueMin: 0,
        valueMax: 99,
        access: "ALL",
        entityCategory: "config",
        description: "Zone 2 (2-5m) motion sensitivity threshold (higher = less sensitive, 99 = disabled). Firmware default 10.",
    }),
    m.numeric({
        name: "zone2_still_threshold",
        label: "Zone 2 still threshold",
        cluster: "msOccupancySensing",
        attribute: {ID: 0x5104, type: Zcl.DataType.UINT8},
        valueMin: 0,
        valueMax: 99,
        access: "ALL",
        entityCategory: "config",
        description: "Zone 2 (2-5m) still presence threshold (higher = less sensitive, 99 = disabled). Firmware default 4.",
    }),
    m.numeric({
        name: "zone3_motion_threshold",
        label: "Zone 3 motion threshold",
        cluster: "msOccupancySensing",
        attribute: {ID: 0x5105, type: Zcl.DataType.UINT8},
        valueMin: 0,
        valueMax: 99,
        access: "ALL",
        entityCategory: "config",
        description: "Zone 3 (5-10m) motion sensitivity threshold (higher = less sensitive, 99 = disabled). Firmware default 10.",
    }),
    m.numeric({
        name: "zone3_still_threshold",
        label: "Zone 3 still threshold",
        cluster: "msOccupancySensing",
        attribute: {ID: 0x5106, type: Zcl.DataType.UINT8},
        valueMin: 0,
        valueMax: 99,
        access: "ALL",
        entityCategory: "config",
        description: "Zone 3 (5-10m) still presence threshold (higher = less sensitive, 99 = disabled). Firmware default 4.",
    }),
    m.numeric({
        name: "radar_trigger_scans",
        label: "Radar trigger scans",
        cluster: "msOccupancySensing",
        attribute: {ID: 0x5107, type: Zcl.DataType.UINT8},
        valueMin: 1,
        valueMax: 10,
        access: "ALL",
        entityCategory: "config",
        description: "Number of consecutive radar scans needed to trigger presence (1 = instant). Firmware default 1.",
    }),
    m.commandsOnOff(),
];

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
        description: "Temperature and Humidity Monitor (pvvx/ZigbeeTLc)",
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
        description: "Temperature and Humidity Monitor 3 Mini (pvvx/ZigbeeTLc)",
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
        description: "Temperature and Humidity Monitor (pvvx/ZigbeeTLc)",
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
        description: "Temperature and Humidity Monitor (pvvx/ZigbeeTLc)",
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
        description: "Temp & RH Monitor (pvvx/ZigbeeTLc)",
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
        description: "Temp & RH Monitor Lite (pvvx/ZigbeeTLc)",
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
        description: "Temperature & Humidity Sensor (pvvx/ZigbeeTLc)",
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
        // ZTH05 (TS0601/_TZE204_upagmta9) with ZigbeeTLc firmware; requires hardware mod
        // https://pvvx.github.io/TS0601_TZE204/
        zigbeeModel: ["TH05-z"],
        model: "TH05-z",
        vendor: "Tuya",
        description: "ZTH05 temperature & humidity sensor (pvvx/ZigbeeTLc)",
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
    */
    {
        zigbeeModel: ["TS0201-z", "TS0201-bz", "TH03Z-z", "TH03Z-bz", "ZTH01-z", "ZTH01-bz", "ZTH02-z", "ZTH02-bz", "ZY-ZTH02-z"],
        // TS0201 with ZigbeeTLc firmware
        model: "TS0201-z",
        vendor: "Tuya",
        description: "Temperature & Humidity Sensor (pvvx/ZigbeeTLc)",
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
        description: "Temperature & humidity sensor (pvvx/ZigbeeTLc)",
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
        zigbeeModel: ["MC-z", "TH01-z", "TH01-2-z"],
        model: "MC-z",
        vendor: "Zbeacon",
        description: "Temperature & Humidity Sensor (pvvx/ZigbeeTLc)",
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
    /*
        ZigbeeTLc soil moisture:
        - Temperature (+calibration)
        - Humidity (+calibration)
        - Soil moisture (EP2 as Relative Humidity Measurement)
        - Measurement interval
    */
    {
        // HOBEIAN / Sonoff ZG-303Z with ZigbeeTLc firmware
        // https://pvvx.github.io/ZG-303Z/
        zigbeeModel: ["ZG-303Z-z"],
        model: "ZG-303Z-z",
        vendor: "HOBEIAN",
        description: "Soil moisture sensor (pvvx/ZigbeeTLc)",
        extend: [
            m.deviceEndpoints({
                endpoints: {1: 1, 2: 2},
                multiEndpointSkip: ["humidity", "temperature", "soil_moisture"],
            }),
            m.battery({voltage: true}),
            m.identify(),
            m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}),
            m.humidity({
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 100},
                // EP1 air humidity; EP2 also uses RH cluster for soil moisture
                fzConvert: (_model, msg) => {
                    if (msg.endpoint.ID !== 1 || msg.data.measuredValue === undefined) return;
                    return {humidity: msg.data.measuredValue / 100};
                },
            }),
            // FW exposes soil moisture on EP2 as Relative Humidity Measurement
            m.humidity({
                name: "soil_moisture",
                description: "Measured soil moisture",
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 100},
                fzConvert: (_model, msg) => {
                    if (msg.endpoint.ID !== 2 || msg.data.measuredValue === undefined) return;
                    return {soil_moisture: msg.data.measuredValue / 100};
                },
            }),
            extend.temperatureCalibration,
            extend.humidityCalibration,
            extend.measurementInterval,
        ],
        ota: true,
    },
    /*
        ZigbeeTLc PIR devices supporting:
        - Occupancy
        - Remote On/Off binding (genOnOff state)
        - PIR timeout
    */
    {
        // Tuya ZP01 (TS0202/_TZ3000_*) with ZigbeeTLc firmware
        // https://pvvx.github.io/TS0202_TZ3000/
        zigbeeModel: ["TS202PIR1-z"],
        model: "TS202PIR1-z",
        vendor: "Tuya",
        description: "ZP01 PIR motion sensor (pvvx/ZigbeeTLc)",
        ota: true,
        extend: [
            m.battery({voltage: true}),
            m.occupancy(),
            m.onOff({
                powerOnBehavior: false,
                description:
                    'Enable remote On/Off binding. ON: occupancy occupied sends action "on", clear sends action "off". OFF: no occupancy actions.',
            }),
            m.enumLookup({
                name: "power_on_behavior",
                cluster: "genOnOff",
                attribute: "startUpOnOff",
                lookup: {
                    off: 0,
                    on: 1,
                    toggle: 2,
                    previous: 255,
                },
                description: "Power-on behavior for state (remote On/Off enable)",
            }),
            m.numeric({
                name: "pir_timeout",
                cluster: "msOccupancySensing",
                attribute: "pirOToUDelay",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                access: "ALL",
                description: "PIR occupancy timeout in seconds (firmware default ~35s; board R5/R6 may limit minimum)",
            }),
            m.commandsOnOff(),
        ],
    },
    {
        // Board 51 / image type 0x0233 - with WHT20
        zigbeeModel: ["ZG-204ZV-z"],
        model: "ZG-204ZV-z",
        vendor: "HOBEIAN",
        description: "Millimeter wave motion sensor with temperature and humidity (pvvx/ZigbeeTLc)",
        ota: true,
        extend: [...zg204zvMotion, m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}), m.humidity()],
    },
    {
        // Board 55 / image type 0x0237 - without WHT20
        zigbeeModel: ["ZG-204ZV1-z"],
        model: "ZG-204ZV1-z",
        vendor: "HOBEIAN",
        description: "Millimeter wave motion sensor (pvvx/ZigbeeTLc)",
        ota: true,
        extend: [...zg204zvMotion],
    },
    {
        // Board 56 / image type 0x0238 - with WHT20
        zigbeeModel: ["ZG-204ZV2-TH-z"],
        model: "ZG-204ZV2-TH-z",
        vendor: "HOBEIAN",
        description: "Millimeter wave motion sensor v2 with temperature and humidity (pvvx/ZigbeeTLc)",
        ota: true,
        extend: [...zg204zvMotion, m.temperature({reporting: {min: "10_SECONDS", max: "1_HOUR", change: 10}}), m.humidity()],
    },
    {
        // Board 57 / image type 0x0239 - without WHT20
        zigbeeModel: ["ZG-204ZV2-z"],
        model: "ZG-204ZV2-z",
        vendor: "HOBEIAN",
        description: "Millimeter wave motion sensor v2 (pvvx/ZigbeeTLc)",
        ota: true,
        extend: [...zg204zvMotion],
    },
    {
        // Board 60 / image type 0x023C - Dual PIR + Skyrelay RC2417 24GHz mmWave radar
        zigbeeModel: ["ZG-204ZS-z", "ZG-204ZM-z"],
        model: "ZG-204ZS-z",
        vendor: "HOBEIAN",
        description: "Dual PIR and mmWave radar presence and luminance sensor (pvvx/ZigbeeTLc)",
        ota: true,
        extend: [...zg204zsMotion],
    },
];
