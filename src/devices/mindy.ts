import {Zcl} from "zigbee-herdsman";

import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

type CustomAttrIds = Record<string, Record<string, number>>;

const customAttrIds: CustomAttrIds = {
    genBasic: {
        readInterval: 0x0200,
        nightMode: 0x0240,
        nightOnTime: 0x0241,
        nightOffTime: 0x0242,
    },
    msCO2: {
        control: 0x0220,
        invert: 0x0221,
        levelHigh: 0x0222,
        levelLow: 0x0223,
        factoryReset: 0x0230,
        forcedRecalibration: 0x0231,
        autoCalibration: 0x0232,
    },
    msIlluminanceMeasurement: {
        control: 0x0220,
        invert: 0x0221,
        levelHigh: 0x0222,
        levelLow: 0x0223,
        offset: 0x0210,
    },
    msTemperatureMeasurement: {
        offset: 0x0210,
        sensor: 0x0211,
    },
    msRelativeHumidity: {
        offset: 0x0210,
    },
    msPressureMeasurement: {
        offset: 0x0210,
    },
};

const tzLocal = {
    last_boot: {
        key: ["last_boot"],
        convertGet: async (entity, key, meta) => {
            await entity.read("genTime", ["lastSetTime"]);
        },
    } satisfies Tz.Converter,
    wifi: {
        key: ["wifi"],
        convertGet: async (entity, key, meta) => {
            await entity.read("genBasic", ["locationDesc"]);
        },
        convertSet: async (entity, key, value, meta) => {
            await entity.write("genBasic", {locationDesc: value === "ON" ? "1" : "0"});

            const retryRead = async (attempts: number) => {
                if (attempts > 0) {
                    try {
                        await entity.read("genBasic", ["locationDesc"]);
                    } catch {
                        /* Do nothing */
                    }
                    setTimeout(() => retryRead(attempts - 1), 10000);
                }
            };

            void retryRead(3);
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    last_boot: {
        cluster: "genTime",
        type: ["readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.lastSetTime) {
                const data = msg.data.lastSetTime;

                // Assuming the epoch is January 1, 2000
                const epoch = new Date("2000-01-01T00:00:00Z").getTime() / 1000;
                const date = new Date((epoch + data) * 1000); // Convert seconds to milliseconds
                const boot_date_time = date.toISOString();

                return {last_boot: boot_date_time};
            }
        },
    } satisfies Fz.Converter<"genTime", undefined, ["readResponse"]>,
    wifi: {
        cluster: "genBasic",
        type: ["readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.locationDesc) {
                const data = msg.data;
                const wifi = data.locationDesc && data.locationDesc.trim().length > 0 ? "ON" : "OFF";

                return {ip_address: data.locationDesc.trim(), wifi: wifi};
            }
        },
    } satisfies Fz.Converter<"genBasic", undefined, ["readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Leleka"],
        model: "Leleka",
        vendor: "MindY",
        description: "Advanced Environmental Monitoring Device",
        ota: true,
        fromZigbee: [fzLocal.last_boot, fzLocal.wifi],
        toZigbee: [tzLocal.last_boot, tzLocal.wifi],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            for (const [cluster, attributes] of Object.entries(customAttrIds)) {
                for (const attributeName in attributes) {
                    await endpoint.read(cluster, [attributes[attributeName]]);
                }
            }
        },
        extend: [
            m.poll({
                key: "last_boot_update",
                option: e
                    .numeric("last_boot_update_poll_interval", ea.STATE_SET)
                    .withValueMin(10)
                    .withDescription("Interval for request boot datetime from device. (default 60 seconds)"),
                defaultIntervalSeconds: 60,
                poll: async (device) => {
                    const endpoint = device.getEndpoint(1);
                    await endpoint.read("genTime", ["lastSetTime"]);
                    await endpoint.read("genBasic", ["locationDesc"]);
                },
            }),
            m.temperature(),
            m.humidity(),
            m.pressure(),
            m.co2(),
            m.illuminance(),
            m.light({configureReporting: true, powerOnBehavior: false, effect: false}),
            m.identify(),
            m.numeric({
                name: "read_interval",
                unit: "seconds",
                valueMin: 5,
                valueMax: 600,
                access: "ALL",
                cluster: "genBasic",
                attribute: {ID: customAttrIds.genBasic.readInterval, type: Zcl.DataType.UINT16},
                description: "Read interval of sensors. Default 30",
                entityCategory: "config",
            }),
            m.binary({
                name: "night_mode",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genBasic",
                attribute: {ID: customAttrIds.genBasic.nightMode, type: Zcl.DataType.BOOLEAN},
                description: "Turn OFF LED at night",
            }),
            m.numeric({
                name: "night_on_time",
                unit: "Hr",
                valueMin: 0,
                valueMax: 23,
                cluster: "genBasic",
                attribute: {ID: customAttrIds.genBasic.nightOnTime, type: Zcl.DataType.UINT8},
                description: "Night mode activation time",
            }),
            m.numeric({
                name: "night_off_time",
                unit: "Hr",
                valueMin: 0,
                valueMax: 23,
                cluster: "genBasic",
                attribute: {ID: customAttrIds.genBasic.nightOffTime, type: Zcl.DataType.UINT8},
                description: "Night mode deactivation time",
            }),
            m.binary({
                name: "co2_control",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "msCO2",
                attribute: {ID: customAttrIds.msCO2.control, type: Zcl.DataType.BOOLEAN},
                description: "Enable CO2 bind-control",
            }),
            m.binary({
                name: "co2_invert",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "msCO2",
                attribute: {ID: customAttrIds.msCO2.invert, type: Zcl.DataType.BOOLEAN},
                description: "Invert CO2 control logic",
            }),
            m.numeric({
                name: "co2_level_high",
                unit: "ppm",
                access: "ALL",
                cluster: "msCO2",
                attribute: {ID: customAttrIds.msCO2.levelHigh, type: Zcl.DataType.UINT16},
                description: "High CO2 threshold",
                precision: 0,
                valueMin: 400,
                valueMax: 2000,
            }),
            m.numeric({
                name: "co2_level_low",
                unit: "ppm",
                access: "ALL",
                cluster: "msCO2",
                attribute: {ID: customAttrIds.msCO2.levelLow, type: Zcl.DataType.UINT16},
                description: "Low CO2 threshold",
                precision: 0,
                valueMin: 400,
                valueMax: 2000,
            }),
            m.binary({
                name: "co2_auto_calibration",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "msCO2",
                attribute: {ID: customAttrIds.msCO2.autoCalibration, type: Zcl.DataType.BOOLEAN},
                description: "Automatic self calibration",
                entityCategory: "config",
            }),
            m.numeric({
                name: "co2_forced_recalibration",
                unit: "ppm",
                valueMin: 0,
                valueMax: 5000,
                cluster: "msCO2",
                attribute: {ID: customAttrIds.msCO2.forcedRecalibration, type: Zcl.DataType.UINT16},
                description: "Start FRC by setting the value",
                entityCategory: "config",
            }),
            m.binary({
                name: "co2_factory_reset",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "msCO2",
                attribute: {ID: customAttrIds.msCO2.factoryReset, type: Zcl.DataType.BOOLEAN},
                description: "Factory Reset CO2 sensor",
                entityCategory: "config",
            }),
            m.binary({
                name: "lux_control",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "msIlluminanceMeasurement",
                attribute: {ID: customAttrIds.msIlluminanceMeasurement.control, type: Zcl.DataType.BOOLEAN},
                description: "Enable illuminance bind-control",
            }),
            m.binary({
                name: "lux_invert",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "msIlluminanceMeasurement",
                attribute: {ID: customAttrIds.msIlluminanceMeasurement.invert, type: Zcl.DataType.BOOLEAN},
                description: "Invert illuminance control logic",
            }),
            m.numeric({
                name: "lux_level_high",
                unit: "lx",
                access: "ALL",
                cluster: "msIlluminanceMeasurement",
                attribute: {ID: customAttrIds.msIlluminanceMeasurement.levelHigh, type: Zcl.DataType.UINT16},
                description: "High illuminance threshold",
                valueMin: 100,
                valueMax: 10000,
                precision: 0,
            }),
            m.numeric({
                name: "lux_level_low",
                unit: "lx",
                access: "ALL",
                cluster: "msIlluminanceMeasurement",
                attribute: {ID: customAttrIds.msIlluminanceMeasurement.levelLow, type: Zcl.DataType.UINT16},
                description: "Low illuminance threshold",
                valueMin: 100,
                valueMax: 10000,
                precision: 0,
            }),
            m.numeric({
                name: "offset_illuminance",
                unit: "lx",
                valueMin: -500,
                valueMax: 500,
                valueStep: 1,
                scale: 1,
                access: "ALL",
                cluster: "msIlluminanceMeasurement",
                attribute: {ID: customAttrIds.msIlluminanceMeasurement.offset, type: Zcl.DataType.INT16},
                description: "Adjust illuminance",
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "temperature_sensor",
                lookup: {CPU: 0, SCD4X: 1, BMP280: 2},
                cluster: "msTemperatureMeasurement",
                attribute: {ID: customAttrIds.msTemperatureMeasurement.sensor, type: Zcl.DataType.UINT8},
                description: "Active temperature sensor",
                entityCategory: "config",
            }),
            m.numeric({
                name: "offset_temperature",
                unit: "°C",
                valueMin: -50,
                valueMax: 50,
                valueStep: 0.1,
                scale: 10,
                access: "ALL",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: customAttrIds.msTemperatureMeasurement.offset, type: Zcl.DataType.INT16},
                description: "Adjust temperature",
                entityCategory: "config",
            }),
            m.numeric({
                name: "offset_humidity",
                unit: "%",
                valueMin: -50,
                valueMax: 50,
                valueStep: 0.1,
                scale: 10,
                access: "ALL",
                cluster: "msRelativeHumidity",
                attribute: {ID: customAttrIds.msRelativeHumidity.offset, type: Zcl.DataType.INT16},
                description: "Adjust humidity",
                entityCategory: "config",
            }),
            m.numeric({
                name: "offset_pressure",
                unit: "kPa",
                valueMin: -100,
                valueMax: 100,
                valueStep: 0.01,
                scale: 100,
                access: "ALL",
                cluster: "msPressureMeasurement",
                attribute: {ID: customAttrIds.msPressureMeasurement.offset, type: Zcl.DataType.INT16},
                description: "Adjust pressure",
                entityCategory: "config",
            }),
        ],
        exposes: [
            e.text("last_boot", ea.STATE_GET).withDescription("Device boot date and time").withCategory("diagnostic"),
            e.binary("wifi", ea.ALL, "ON", "OFF").withDescription("Device WiFi state").withCategory("config"),
            e.text("ip_address", ea.STATE).withDescription("Device IP address").withCategory("diagnostic"),
        ],
    },
];
