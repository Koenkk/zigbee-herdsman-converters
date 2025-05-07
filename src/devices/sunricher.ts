import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import {repInterval} from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import {payload} from "../lib/reporting";
import * as globalStore from "../lib/store";
import * as sunricher from "../lib/sunricher";
import type {DefinitionWithExtend, Fz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const NS = "zhc:sunricher";
const e = exposes.presets;
const ea = exposes.access;

const sunricherManufacturerCode = 0x1224;

const fzLocal = {
    SRZGP2801K45C: {
        cluster: "greenPower",
        type: ["commandNotification", "commandCommissioningNotification"],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            if (utils.hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;
            if (commandID === 224) return;
            const lookup = {
                33: "press_on",
                32: "press_off",
                55: "press_high",
                56: "press_low",
                53: "hold_high",
                54: "hold_low",
                52: "high_low_release",
                99: "cw_ww_release",
                98: "cw_dec_ww_inc",
                100: "ww_inc_cw_dec",
                65: "r_g_b",
                66: "b_g_r",
                64: "rgb_release",
            };
            return {action: utils.getFromLookup(commandID, lookup)};
        },
    } satisfies Fz.Converter,
};

async function syncTime(endpoint: Zh.Endpoint) {
    try {
        const time = Math.round((new Date().getTime() - constants.OneJanuary2000) / 1000 + new Date().getTimezoneOffset() * -1 * 60);
        const values = {time: time};
        await endpoint.write("genTime", values);
    } catch {
        /* Do nothing*/
    }
}

async function syncTimeWithTimeZone(endpoint: Zh.Endpoint) {
    try {
        const time = Math.round((new Date().getTime() - constants.OneJanuary2000) / 1000);
        const timeZone = new Date().getTimezoneOffset() * -1 * 60;
        await endpoint.write("genTime", {time, timeZone});
    } catch {
        logger.error("Failed to sync time with time zone", NS);
    }
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZG2833K8_EU05"],
        model: "SR-ZG9001K8-DIM",
        vendor: "Sunricher",
        description: "Zigbee 8 button wall switch",
        extend: [
            m.commandsOnOff(),
            m.battery(),
            m.commandsScenes(),
            m.commandsLevelCtrl({commands: ["brightness_move_up", "brightness_move_down", "brightness_stop"]}),
        ],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ["HK-ZRC-K10N-E"],
        model: "SR-ZG2856-Pro",
        vendor: "Sunricher",
        description: "Zigbee smart remote",
        extend: [
            m.battery(),
            m.deviceAddCustomCluster("sunricherRemote", {
                ID: 0xff03,
                attributes: {},
                commands: {
                    press: {
                        ID: 0x01,
                        parameters: [
                            {name: "messageType", type: Zcl.DataType.UINT8},
                            {name: "button2", type: Zcl.DataType.UINT8},
                            {name: "button1", type: Zcl.DataType.UINT8},
                            {name: "pressType", type: Zcl.DataType.UINT8},
                        ],
                    },
                },
                commandsResponse: {},
            }),
            sunricher.extend.SRZG2856Pro(),
        ],
    },
    {
        zigbeeModel: ["ZG9340"],
        model: "SR-ZG9093TRV",
        vendor: "Sunricher",
        description: "Zigbee thermostatic radiator valve",
        extend: [
            m.deviceAddCustomCluster("hvacThermostat", {
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    screenTimeout: {
                        ID: 0x100d,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                    antiFreezingTemp: {
                        ID: 0x1005,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                    temperatureDisplayMode: {
                        ID: 0x1008,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                    windowOpenCheck: {
                        ID: 0x1009,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                    hysteresis: {
                        ID: 0x100a,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                    windowOpenFlag: {
                        ID: 0x100b,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                    forcedHeatingTime: {
                        ID: 0x100e,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                    errorCode: {
                        ID: 0x2003,
                        type: Zcl.DataType.BITMAP8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                    awayOrBoostMode: {
                        ID: 0x2002,
                        type: Zcl.DataType.ENUM8,
                        manufacturerCode: sunricherManufacturerCode,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            sunricher.extend.thermostatPreset(),
            sunricher.extend.thermostatCurrentHeatingSetpoint(),
            m.battery(),
            m.identify(),
            m.numeric({
                name: "screen_timeout",
                cluster: "hvacThermostat",
                attribute: "screenTimeout",
                valueMin: 10,
                valueMax: 30,
                unit: "s",
                description: "Screen Timeout for Inactivity (excluding gateway config). Range: 10-30s, Default: 10s",
                access: "ALL",
                entityCategory: "config",
            }),
            m.numeric({
                name: "anti_freezing_temp",
                cluster: "hvacThermostat",
                attribute: "antiFreezingTemp",
                valueMin: 0,
                valueMax: 10,
                unit: "°C",
                description: "Anti Freezing(Low Temp) Mode Configuration. 0: disabled, 5~10: temperature (5°C by default)",
                access: "ALL",
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "temperature_display_mode",
                cluster: "hvacThermostat",
                attribute: "temperatureDisplayMode",
                lookup: {
                    set_temp: 1,
                    room_temp: 2,
                },
                description: "Temperature Display Mode. 1: displays set temp, 2: displays room temp (default)",
                access: "ALL",
            }),
            m.numeric({
                name: "window_open_check",
                cluster: "hvacThermostat",
                attribute: "windowOpenCheck",
                valueMin: 0,
                valueMax: 10,
                unit: "°C",
                description: "The temperature threshold for Window Open Detect, value range 0~10, unit is 1°C, 0 means disabled, default value is 5",
                access: "ALL",
                entityCategory: "config",
            }),
            m.numeric({
                name: "hysteresis",
                cluster: "hvacThermostat",
                attribute: "hysteresis",
                valueMin: 5,
                valueMax: 20,
                valueStep: 0.1,
                unit: "°C",
                description:
                    "Control hysteresis setting, range is 5-20, unit is 0.1°C, default value is 10. Because the sensor accuracy is 0.5°C, it is recommended not to set this value below 1°C to avoid affecting the battery life.",
                access: "ALL",
                entityCategory: "config",
            }),
            m.binary({
                name: "window_open_flag",
                cluster: "hvacThermostat",
                attribute: "windowOpenFlag",
                description: "Window open flag",
                valueOn: ["opened", 1],
                valueOff: ["not_opened", 0],
                access: "STATE_GET",
            }),
            m.numeric({
                name: "forced_heating_time",
                cluster: "hvacThermostat",
                attribute: "forcedHeatingTime",
                valueMin: 10,
                valueMax: 90,
                unit: "10s",
                description: "Forced heating time, range 10~90, unit is 10s, default value is 30(300s)",
                access: "ALL",
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "error_code",
                cluster: "hvacThermostat",
                attribute: "errorCode",
                lookup: {
                    no_error: 0,
                    motor_error: 4,
                    motor_timeout: 5,
                },
                description:
                    "Error code: 0=No hardware error, 4=Motor error (detected not running), 5=The motor runs exceeding the self-check time without finding the boundary",
                access: "STATE_GET",
            }),
            m.enumLookup({
                name: "temperature_display_unit",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0000, type: 0x30},
                lookup: {
                    celsius: 0x00,
                    fahrenheit: 0x01,
                },
                description: "The temperature unit shown on the display",
                access: "ALL",
                entityCategory: "config",
            }),
            sunricher.extend.thermostatWeeklySchedule(),
            sunricher.extend.thermostatChildLock(),
        ],
        fromZigbee: [fz.thermostat],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_running_state,
            tz.thermostat_temperature_display_mode,
        ],
        exposes: [
            e
                .climate()
                .withLocalTemperature(ea.STATE_GET)
                .withSetpoint("current_heating_setpoint", 5, 35, 0.1, ea.ALL)
                .withLocalTemperatureCalibration(-30, 30, 0.5, ea.ALL)
                .withPreset(
                    ["off", "auto", "away", "sleep", "manual", "forced"],
                    "Preset of the thermostat. Manual: comfort temp (20°C), Auto: schedule temp (see schedule), " +
                        "Away: eco temp (6°C), Sleep: night temp (17°C), Forced: temporary heating with configurable duration (default 300s)",
                )
                .withSystemMode(["off", "auto", "heat", "sleep"], ea.ALL)
                .withRunningState(["idle", "heat"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ["genBasic", "genPowerCfg", "hvacThermostat", "hvacUserInterfaceCfg", "genTime"];

            const maxRetries = 3;
            let retryCount = 0;
            let bindSuccess = false;

            while (retryCount < maxRetries) {
                try {
                    if (!bindSuccess) {
                        await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                        bindSuccess = true;
                    }

                    const configPromises = [
                        reporting.thermostatTemperature(endpoint),
                        reporting.thermostatOccupiedHeatingSetpoint(endpoint),
                        reporting.thermostatUnoccupiedHeatingSetpoint(endpoint),
                        reporting.thermostatRunningState(endpoint),
                        reporting.batteryPercentageRemaining(endpoint),
                        endpoint.configureReporting("hvacUserInterfaceCfg", payload("tempDisplayMode", 10, repInterval.MINUTE, null)),
                    ];

                    await Promise.all(configPromises);

                    const customAttributes = [
                        "screenTimeout",
                        "antiFreezingTemp",
                        "temperatureDisplayMode",
                        "windowOpenCheck",
                        "hysteresis",
                        "windowOpenFlag",
                        "forcedHeatingTime",
                    ];

                    await Promise.all(
                        customAttributes.map((attr) => endpoint.configureReporting("hvacThermostat", payload(attr, 10, repInterval.MINUTE, null))),
                    );

                    const readPromises = [
                        endpoint.read("hvacUserInterfaceCfg", ["tempDisplayMode"]),
                        endpoint.read("hvacThermostat", ["localTemp", "runningState"]),
                        endpoint.read("hvacThermostat", [
                            "screenTimeout",
                            "antiFreezingTemp",
                            "temperatureDisplayMode",
                            "windowOpenCheck",
                            "hysteresis",
                            "windowOpenFlag",
                            "forcedHeatingTime",
                            "errorCode",
                        ]),
                    ];

                    await Promise.all(readPromises);
                    await syncTimeWithTimeZone(endpoint);

                    break;
                } catch (e) {
                    retryCount++;
                    logger.warning(`Configure attempt ${retryCount} failed: ${e}`, NS);

                    if (retryCount === maxRetries) {
                        logger.error(`Failed to configure device after ${maxRetries} attempts`, NS);
                        throw e;
                    }

                    await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount));
                }
            }
        },
    },
    {
        zigbeeModel: ["HK-SENSOR-SMO"],
        model: "SR-ZG9070A-SS",
        vendor: "Sunricher",
        description: "Smart photoelectric smoke alarm",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "smoke",
                zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"],
            }),
            m.iasWarning(),
        ],
    },
    {
        zigbeeModel: ["HK-SENSOR-PRE"],
        model: "SR-ZG9030F-PS",
        vendor: "Sunricher",
        description: "Smart human presence sensor",
        extend: [
            m.illuminance({scale: (value) => value}),
            m.occupancy(),
            m.commandsOnOff(),
            m.deviceAddCustomCluster("sunricherSensor", {
                ID: 0xfc8b,
                manufacturerCode: 0x120b,
                attributes: {
                    indicatorLight: {ID: 0xf001, type: 0x20},
                    detectionArea: {ID: 0xf002, type: 0x20},
                    illuminanceThreshold: {ID: 0xf004, type: 0x20},
                },
                commands: {},
                commandsResponse: {},
            }),
            sunricher.extend.indicatorLight(),
            m.numeric({
                name: "detection_area",
                cluster: "sunricherSensor",
                attribute: "detectionArea",
                description: "Detection area range (default: 50%)",
                valueMin: 0,
                valueMax: 100,
                valueStep: 1,
                unit: "%",
                access: "ALL",
                entityCategory: "config",
            }),
            m.numeric({
                name: "illuminance_threshold",
                cluster: "sunricherSensor",
                attribute: "illuminanceThreshold",
                description: "Illuminance threshold for triggering (default: 100)",
                valueMin: 10,
                valueMax: 100,
                valueStep: 1,
                unit: "lx",
                access: "ALL",
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["HK-SENSOR-GAS"],
        model: "SR-ZG9060A-GS",
        vendor: "Sunricher",
        description: "Smart combustible gas sensor",
        extend: [
            m.iasZoneAlarm({
                zoneType: "gas",
                zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"],
            }),
            m.iasWarning(),
        ],
    },
    {
        zigbeeModel: ["HK-SENSOR-CO"],
        model: "SR-ZG9060B-CS",
        vendor: "Sunricher",
        description: "Smart carbon monoxide alarm",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "carbon_monoxide",
                zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"],
            }),
            m.iasWarning(),
        ],
    },
    {
        zigbeeModel: ["HK-SENSOR-WT1"],
        model: "SR-ZG9050C-WS",
        vendor: "Sunricher",
        description: "Smart water leakage sensor",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"],
            }),
        ],
    },
    {
        zigbeeModel: ["HK-SENSOR-WT2"],
        model: "SR-ZG9050B-WS",
        vendor: "Sunricher",
        description: "Water leakage alarm",
        extend: [
            m.battery(),
            m.temperature(),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"],
            }),
            m.iasWarning(),
        ],
    },
    {
        zigbeeModel: ["HK-SL-DIM-UK"],
        model: "SR-ZG2835RAC-UK",
        vendor: "Sunricher",
        description: "Push compatible zigBee knob smart dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter(), sunricher.extend.externalSwitchType()],
    },
    {
        zigbeeModel: ["ZG2837RAC-K4"],
        model: "SR-ZG2835RAC-NK4",
        vendor: "Sunricher",
        description: "4-Key zigbee rotary & push button smart dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter(), m.commandsScenes()],
    },
    {
        zigbeeModel: ["HK-ZRC-K5&RS-TL"],
        model: "SR-ZG2836D5",
        vendor: "Sunricher",
        description: "Zigbee smart remote",
        extend: [m.battery(), m.commandsOnOff(), m.commandsLevelCtrl(), m.commandsWindowCovering(), m.commandsColorCtrl(), m.commandsScenes()],
    },
    {
        zigbeeModel: ["ZG9032B"],
        model: "SR-ZG9033TH",
        vendor: "Sunricher",
        description: "Zigbee temperature and humidity sensor",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.battery(),
            m.temperature(),
            m.humidity({endpointNames: ["2"]}),
            m.numeric({
                name: "temperature_sensor_compensation",
                cluster: 0x0402,
                attribute: {ID: 0x1000, type: 0x28},
                valueMin: -5,
                valueMax: 5,
                valueStep: 1,
                unit: "°C",
                description: "Temperature sensor compensation (-5~+5°C)",
                access: "ALL",
                entityCategory: "config",
                zigbeeCommandOptions: {manufacturerCode: 0x1224},
                endpointNames: ["1"],
            }),
            m.enumLookup({
                name: "temperature_display_unit",
                cluster: 0x0402,
                attribute: {ID: 0x1001, type: 0x30},
                lookup: {
                    celsius: 0,
                    fahrenheit: 1,
                },
                description: "Temperature display unit",
                access: "ALL",
                endpointName: "1",
                entityCategory: "config",
                zigbeeCommandOptions: {manufacturerCode: 0x1224},
            }),
            m.numeric({
                name: "humidity_sensor_compensation",
                cluster: 0x0405,
                attribute: {ID: 0x1000, type: 0x28},
                valueMin: -5,
                valueMax: 5,
                valueStep: 1,
                unit: "%",
                description: "Humidity sensor compensation (-5~+5%)",
                access: "ALL",
                entityCategory: "config",
                zigbeeCommandOptions: {manufacturerCode: 0x1224},
                endpointNames: ["2"],
            }),
        ],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ["HK-ZRC-K16N-E"],
        model: "SR-ZG9002K16-Pro",
        vendor: "Sunricher",
        description: "Zigbee smart wall panel remote",
        extend: [m.battery(), sunricher.extend.SRZG9002K16Pro()],
    },
    {
        zigbeeModel: ["ZG9030A-MW"],
        model: "SR-ZG9030A-MW",
        vendor: "Sunricher",
        description: "Zigbee compatible ceiling mount occupancy sensor",
        extend: [
            m.numeric({
                name: "light_pwm_frequency",
                cluster: "genBasic",
                attribute: {ID: 0x9001, type: 0x21},
                valueMin: 0,
                valueMax: 65535,
                description: "Light PWM frequency (0-65535, default: 3300)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.enumLookup({
                name: "brightness_curve",
                cluster: "genBasic",
                attribute: {ID: 0x8806, type: 0x20},
                lookup: {
                    linear: 0,
                    gamma_logistics_1_5: 0x0f,
                    gamma_logistics_1_8: 0x12,
                },
                description: "Brightness curve (default: Linear)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.enumLookup({
                name: "start_up_on_off",
                cluster: "genOnOff",
                attribute: {ID: 0x4003, type: 0x30},
                lookup: {
                    last_state: 0xff,
                    on: 1,
                    off: 0,
                },
                description: "Start up on/off (default: last_state)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "motion_sensor_light_duration",
                cluster: "genBasic",
                attribute: {ID: 0x8902, type: 0x21},
                valueMin: 0,
                valueMax: 65535,
                unit: "s",
                description: "Motion sensor light duration (0s-65535s, default: 5s)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "motion_sensor_light_sensitivity",
                cluster: "genBasic",
                attribute: {ID: 0x8903, type: 0x21},
                valueMin: 0,
                valueMax: 255,
                description: "Motion sensor light sensitivity (0-255, default: 0)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.enumLookup({
                name: "motion_sensor_working_mode",
                cluster: "genBasic",
                attribute: {ID: 0x8904, type: 0x20},
                lookup: {
                    automatic: 0,
                    manual: 1,
                },
                description: "Motion sensor working mode (default: Automatic)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "motion_sensor_sensing_distance",
                cluster: "genBasic",
                attribute: {ID: 0x8905, type: 0x20},
                valueMin: 0,
                valueMax: 15,
                description: "Motion sensor sensing distance (0-15, default: 1)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.enumLookup({
                name: "motion_sensor_microwave_switch",
                cluster: "genBasic",
                attribute: {ID: 0x8906, type: 0x20},
                lookup: {
                    on: 1,
                    off: 0,
                },
                description: "Motion sensor microwave switch (default: On)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.enumLookup({
                name: "motion_sensor_onoff_broadcast",
                cluster: "genBasic",
                attribute: {ID: 0x8907, type: 0x20},
                lookup: {
                    on: 1,
                    off: 0,
                },
                description: "Motion sensor on/off broadcast (default: On)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.enumLookup({
                name: "motion_sensor_light_state",
                cluster: "genBasic",
                attribute: {ID: 0x890c, type: 0x20},
                lookup: {
                    on: 1,
                    off: 0,
                },
                description: "Motion sensor light state (default: On)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "motion_sensor_in_pwm_brightness",
                cluster: "genBasic",
                attribute: {ID: 0x8908, type: 0x21},
                valueMin: 0,
                valueMax: 1000,
                unit: "lux",
                description: "Motion sensor IN PWM brightness (0-1000 lux, default: 0)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "motion_sensor_in_pwm_output",
                cluster: "genBasic",
                attribute: {ID: 0x8909, type: 0x20},
                valueMin: 0,
                valueMax: 254,
                description: "Motion sensor IN PWM output (0-254, default: 254)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "motion_sensor_leave_pwm_output",
                cluster: "genBasic",
                attribute: {ID: 0x890a, type: 0x20},
                valueMin: 0,
                valueMax: 100,
                unit: "%",
                description: "Motion sensor LEAVE PWM output (0%-100%, default: 0%)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "motion_sensor_leave_delay",
                cluster: "genBasic",
                attribute: {ID: 0x8901, type: 0x21},
                valueMin: 0,
                valueMax: 65535,
                unit: "s",
                description: "Motion sensor LEAVE delay (0s-65535s, default: 0s)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "motion_sensor_pwm_output_after_delay",
                cluster: "genBasic",
                attribute: {ID: 0x890b, type: 0x20},
                valueMin: 0,
                valueMax: 100,
                unit: "%",
                description: "Motion sensor PWM output after delay (0%-100%, default: 0%)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "linear_error_ratio_coefficient_of_lux_measurement",
                cluster: "genBasic",
                attribute: {ID: 0x890d, type: 0x21},
                valueMin: 100,
                valueMax: 10000,
                description: "Linear error ratio coefficient of LUX measurement (100‰-10000‰, default: 1000‰)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.numeric({
                name: "fixed_deviation_of_lux_measurement",
                cluster: "genBasic",
                attribute: {ID: 0x890e, type: 0x29},
                valueMin: -100,
                valueMax: 100,
                description: "Fixed deviation of LUX measurement (-100~100, default: 0)",
                entityCategory: "config",
                access: "ALL",
            }),
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3}}),
            m.light({configureReporting: true}),
            m.occupancy({endpointNames: ["2"]}),
            m.illuminance({endpointNames: ["3"]}),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
        ],
        meta: {multiEndpoint: true},
        toZigbee: [sunricher.tz.setModel],
        exposes: [e.enum("model", ea.SET, ["HK-DIM", "ZG9030A-MW"]).withDescription("Model of the device").withCategory("config")],
    },
    {
        zigbeeModel: ["HK-ZRC-K5&RS-E"],
        model: "SR-ZG2836D5-Pro",
        vendor: "Sunricher",
        description: "Zigbee smart remote",
        extend: [m.battery(), sunricher.extend.SRZG2836D5Pro()],
    },
    {
        zigbeeModel: ["HK-ZRC-K12&RS-E"],
        model: "SR-ZG9002KR12-Pro",
        vendor: "Sunricher",
        description: "Zigbee smart wall panel remote",
        extend: [m.battery(), sunricher.extend.SRZG9002KR12Pro()],
    },
    {
        zigbeeModel: ["ZV9380A", "ZG9380A"],
        model: "SR-ZG9042MP",
        vendor: "Sunricher",
        description: "Zigbee three phase power meter",
        extend: [m.electricityMeter()],
    },
    {
        zigbeeModel: ["HK-SL-DIM-AU-K-A"],
        model: "SR-ZG2835PAC-AU",
        vendor: "Sunricher",
        description: "Zigbee push button smart dimmer",
        extend: [m.light({configureReporting: true}), sunricher.extend.externalSwitchType(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["HK-SL-DIM-CLN"],
        model: "SR-ZG9101SAC-HP-CLN",
        vendor: "Sunricher",
        description: "Zigbee micro smart dimmer",
        extend: [m.light({configureReporting: true}), sunricher.extend.externalSwitchType(), sunricher.extend.minimumPWM()],
    },
    {
        zigbeeModel: ["HK-SENSOR-CT-MINI"],
        model: "SR-ZG9011A-DS",
        vendor: "Sunricher",
        description: "Door/window sensor",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "contact",
                zoneAttributes: ["alarm_1", "battery_low"],
            }),
        ],
    },
    {
        zigbeeModel: ["ZG2858A"],
        model: "ZG2858A",
        vendor: "Sunricher",
        description: "Zigbee handheld remote RGBCCT 3 channels",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3}}),
            m.battery(),
            m.identify(),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
            m.commandsColorCtrl(),
            m.commandsScenes(),
        ],
    },
    {
        zigbeeModel: ["HK-SL-DIM-US-A"],
        model: "HK-SL-DIM-US-A",
        vendor: "Sunricher",
        description: "Keypad smart dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
    },
    {
        zigbeeModel: ["HK-SENSOR-4IN1-A"],
        model: "HK-SENSOR-4IN1-A",
        vendor: "Sunricher",
        description: "4IN1 Sensor",
        extend: [m.battery(), m.identify(), m.occupancy(), m.temperature(), m.humidity(), m.illuminance()],
    },
    {
        zigbeeModel: ["SR-ZG9023A-EU"],
        model: "SR-ZG9023A-EU",
        vendor: "Sunricher",
        description: "4 ports switch with 2 usb ports (no metering)",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5}}), m.onOff({endpointNames: ["l1", "l2", "l3", "l4", "l5"]})],
    },
    {
        zigbeeModel: ["ON/OFF(2CH)"],
        model: "UP-SA-9127D",
        vendor: "Sunricher",
        description: "LED-Trading 2 channel AC switch",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        fingerprint: [{modelID: "ON/OFF(2CH)", softwareBuildID: "2.9.2_r54"}],
        model: "SR-ZG9101SAC-HP-SWITCH-2CH",
        vendor: "Sunricher",
        description: "Zigbee 2 channel switch",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior, fz.ignore_genOta],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.power_on_behavior(["off", "on", "previous"]),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {
            multiEndpoint: true,
            multiEndpointSkip: ["power", "energy", "voltage", "current"],
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint1);
            await reporting.activePower(endpoint1);
            await reporting.rmsCurrent(endpoint1, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint1, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint1);
            await reporting.currentSummDelivered(endpoint1);
        },
    },
    {
        zigbeeModel: ["HK-ZD-CCT-A"],
        model: "HK-ZD-CCT-A",
        vendor: "Sunricher",
        description: "50W Zigbee CCT LED driver (constant current)",
        extend: [m.light({colorTemp: {range: [160, 450]}, configureReporting: true})],
    },
    {
        zigbeeModel: ["ZGRC-KEY-004"],
        model: "SR-ZG9001K2-DIM",
        vendor: "Sunricher",
        description: "Zigbee wall remote control for single color, 1 zone",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_move_stop"])],
    },
    {
        zigbeeModel: ["ZGRC-KEY-007"],
        model: "SR-ZG9001K2-DIM2",
        vendor: "Sunricher",
        description: "Zigbee 2 button wall switch",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [
            e.battery(),
            e.action([
                "on_1",
                "off_1",
                "stop_1",
                "brightness_move_up_1",
                "brightness_move_down_1",
                "brightness_stop_1",
                "on_2",
                "off_2",
                "stop_2",
                "brightness_move_up_2",
                "brightness_move_down_2",
                "brightness_stop_2",
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ["ZGRC-KEY-009"],
        model: "50208693",
        vendor: "Sunricher",
        description: "Zigbee wall remote control for RGBW, 1 zone with 2 scenes",
        fromZigbee: [
            fz.command_on,
            fz.command_off,
            fz.command_move,
            fz.command_stop,
            fz.battery,
            fz.command_recall,
            fz.command_step,
            fz.command_move_to_color,
            fz.command_move_to_color_temp,
        ],
        toZigbee: [],
        exposes: [
            e.battery(),
            e.action([
                "on",
                "off",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_move_stop",
                "brightness_step_up",
                "brightness_step_down",
                "recall_1",
                "recall_2",
            ]),
        ],
    },
    {
        zigbeeModel: ["ZGRC-KEY-012"],
        model: "SR-ZG9001K12-DIM-Z5",
        vendor: "Sunricher",
        description: "5 zone remote and dimmer",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [
            e.battery(),
            e.action([
                "on_1",
                "off_1",
                "brightness_move_up_1",
                "brightness_move_down_1",
                "brightness_stop_1",
                "on_2",
                "off_2",
                "brightness_move_up_2",
                "brightness_move_down_2",
                "brightness_stop_2",
                "on_3",
                "off_3",
                "brightness_move_up_3",
                "brightness_move_down_3",
                "brightness_stop_3",
                "on_4",
                "off_4",
                "brightness_move_up_4",
                "brightness_move_down_4",
                "brightness_stop_4",
                "on_5",
                "off_5",
                "brightness_move_up_5",
                "brightness_move_down_5",
                "brightness_stop_5",
            ]),
        ],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["ZGRC-KEY-013"],
        model: "SR-ZG9001K12-DIM-Z4",
        vendor: "Sunricher",
        description: "4 zone remote and dimmer",
        fromZigbee: [fz.battery, fz.command_move, fz.command_stop, fz.command_on, fz.command_off, fz.command_recall],
        exposes: [e.battery(), e.action(["brightness_move_up", "brightness_move_down", "brightness_stop", "on", "off", "recall_*"])],
        toZigbee: [],
        whiteLabel: [{vendor: "RGB Genie", model: "ZGRC-KEY-013"}],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff", "genScenes"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["ZGRC-TEUR-005"],
        model: "SR-ZG9001T4-DIM-EU",
        vendor: "Sunricher",
        description: "Zigbee wireless touch dimmer switch",
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        exposes: [
            e.action([
                "recall_*",
                "on",
                "off",
                "brightness_stop",
                "brightness_move_down",
                "brightness_move_up",
                "brightness_step_down",
                "brightness_step_up",
            ]),
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ["CCT Lighting"],
        model: "ZG192910-4",
        vendor: "Sunricher",
        description: "Zigbee LED-controller",
        extend: [m.light({colorTemp: {range: undefined}, configureReporting: true})],
    },
    {
        zigbeeModel: ["ZG9101SAC-HP"],
        model: "ZG9101SAC-HP",
        vendor: "Sunricher",
        description: "ZigBee AC phase-cut dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["ON/OFF -M", "ON/OFF", "ZIGBEE-SWITCH"],
        model: "ZG9101SAC-HP-Switch",
        vendor: "Sunricher",
        description: "Zigbee AC in wall switch",
        extend: [m.onOff({powerOnBehavior: false}), sunricher.extend.externalSwitchType()],
    },
    {
        zigbeeModel: ["Micro Smart Dimmer", "SM311", "HK-SL-RDIM-A", "HK-SL-DIM-EU-A"],
        model: "ZG2835RAC",
        vendor: "Sunricher",
        description: "ZigBee knob smart dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
        whiteLabel: [
            {vendor: "YPHIX", model: "50208695"},
            {vendor: "Samotech", model: "SM311"},
        ],
    },
    {
        zigbeeModel: ["HK-SL-DIM-AU-R-A"],
        model: "HK-SL-DIM-AU-R-A",
        vendor: "Sunricher",
        description: "ZigBee knob smart dimmer",
        extend: [m.identify(), m.electricityMeter(), m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["ZG2835"],
        model: "ZG2835",
        vendor: "Sunricher",
        description: "ZigBee knob smart dimmer",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move_to_level],
        exposes: [e.action(["on", "off", "brightness_move_to_level"])],
        toZigbee: [],
    },
    {
        zigbeeModel: ["HK-SL-DIM-A"],
        model: "SR-ZG9040A/ZG9041A-D",
        vendor: "Sunricher",
        description: "Zigbee micro smart dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter(), sunricher.extend.externalSwitchType(), sunricher.extend.minimumPWM()],
    },
    {
        zigbeeModel: ["HK-ZD-DIM-A"],
        model: "SRP-ZG9105-CC",
        vendor: "Sunricher",
        description: "Constant Current Zigbee LED dimmable driver",
        extend: [m.light({configureReporting: true}), sunricher.extend.externalSwitchType()],
    },
    {
        fingerprint: [{modelID: "HK-ZD-DIM-A", softwareBuildID: "2.9.2_r72"}],
        model: "SR-ZG9101CS",
        vendor: "Sunricher",
        description: "Constant Current Zigbee LED dimmable driver",
        extend: [m.light({configureReporting: true}), sunricher.extend.externalSwitchType()],
    },
    {
        zigbeeModel: ["HK-DIM"],
        model: "50208702",
        vendor: "Sunricher",
        description: "LED dimmable driver",
        extend: [m.light({configureReporting: true})],
        whiteLabel: [{vendor: "Yphix", model: "50208702"}],
        toZigbee: [sunricher.tz.setModel],
        // Some ZG9030A-MW devices were mistakenly set with the modelId HK-DIM during manufacturing.
        // This allows users to update the modelId from HK-DIM to ZG9030A-MW to ensure proper device functionality.
        exposes: [e.enum("model", ea.SET, ["HK-DIM", "ZG9030A-MW"]).withDescription("Model of the device")],
    },
    {
        zigbeeModel: ["SR-ZG9040A-S"],
        model: "SR-ZG9040A-S",
        vendor: "Sunricher",
        description: "ZigBee AC phase-cut dimmer single-line",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["Micro Smart OnOff", "HK-SL-RELAY-A"],
        model: "SR-ZG9100A-S",
        vendor: "Sunricher",
        description: "Zigbee AC in wall switch single-line",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["ZG2819S-RGBW"],
        model: "ZG2819S-RGBW",
        vendor: "Sunricher",
        whiteLabel: [{vendor: "Iluminize", model: "511.344"}],
        description: "Zigbee handheld remote RGBW 4 channels",
        fromZigbee: [
            fz.battery,
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_move,
            fz.command_stop,
            fz.command_recall,
            fz.command_move_hue,
            fz.command_move_to_color,
            fz.command_move_to_color_temp,
        ],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.action([
                "on",
                "off",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "recall_*",
                "hue_move",
                "hue_stop",
                "color_move",
                "color_temperature_move",
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["genOnOff"]);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint4, coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["ZG2819S-CCT"],
        model: "ZG2819S-CCT",
        vendor: "Sunricher",
        description: "Zigbee handheld remote CCT 4 channels",
        fromZigbee: [
            fz.battery,
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_move,
            fz.command_stop,
            fz.command_recall,        
            fz.command_move_hue,
            fz.command_move_to_color,
            fz.command_move_to_color_temp,
            fz.command_color_loop_set,
            fz.command_ehanced_move_to_hue_and_saturation,
            ],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.action([
                "on",
                "off",
                "brightness_step_up",
                "brightness_step_down",
                "brightness_move_up",
                "brightness_move_down",
                "brightness_stop",
                "recall_*",
                "hue_move",
                "hue_stop",
                "color_move",
                "color_temperature_move",
                "color_loop_set",
                "enhanced_move_to_hue_and_saturation",
                ]),
            ],
            toZigbee: [],
            meta: {multiEndpoint: true},
            endpoint: (device) => {
                return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
            },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["genOnOff"]);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint4, coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["HK-ZCC-A"],
        model: "SR-ZG9080A",
        vendor: "Sunricher",
        description: "Curtain motor controller",
        meta: {coverInverted: true},
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        fingerprint: [
            {modelID: "GreenPower_2", ieeeAddr: /^0x00000000010.....$/},
            {modelID: "GreenPower_2", ieeeAddr: /^0x0000000001b.....$/},
        ],
        model: "SR-ZGP2801K2-DIM",
        vendor: "Sunricher",
        description: "Pushbutton transmitter module",
        fromZigbee: [fz.sunricher_switch2801K2],
        toZigbee: [],
        exposes: [e.action(["press_on", "press_off", "hold_on", "hold_off", "release"])],
    },
    {
        fingerprint: [
            {modelID: "GreenPower_2", ieeeAddr: /^0x000000005d5.....$/},
            {modelID: "GreenPower_2", ieeeAddr: /^0x0000000057e.....$/},
            {modelID: "GreenPower_2", ieeeAddr: /^0x000000001fa.....$/},
            {modelID: "GreenPower_2", ieeeAddr: /^0x0000000034b.....$/},
            {modelID: "GreenPower_2", ieeeAddr: /^0x00000000f12.....$/},
        ],
        model: "SR-ZGP2801K4-DIM",
        vendor: "Sunricher",
        description: "Pushbutton transmitter module",
        fromZigbee: [fz.sunricher_switch2801K4],
        toZigbee: [],
        exposes: [e.action(["press_on", "press_off", "press_high", "press_low", "hold_high", "hold_low", "release"])],
    },
    {
        fingerprint: [{modelID: "GreenPower_2", ieeeAddr: /^0x00000000aaf.....$/}],
        model: "SR-ZGP2801K-5C",
        vendor: "Sunricher",
        description: "Pushbutton transmitter module",
        fromZigbee: [fzLocal.SRZGP2801K45C],
        toZigbee: [],
        exposes: [
            e.action([
                "press_on",
                "press_off",
                "press_high",
                "press_low",
                "hold_high",
                "hold_low",
                "high_low_release",
                "cw_ww_release",
                "cw_dec_ww_inc",
                "ww_inc_cw_dec",
                "r_g_b",
                "b_g_r",
                "rgb_release",
            ]),
        ],
    },
    {
        zigbeeModel: ["ZG9092", "HK-LN-HEATER-A", "ROB_200-040-0"],
        model: "SR-ZG9092A",
        vendor: "Sunricher",
        description: "Touch thermostat",
        fromZigbee: [fz.thermostat, fz.namron_thermostat, fz.metering, fz.electrical_measurement, fz.namron_hvac_user_interface],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupancy,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_outdoor_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_running_state,
            tz.namron_thermostat,
            tz.namron_thermostat_child_lock,
        ],
        exposes: [
            e.numeric("outdoor_temperature", ea.STATE_GET).withUnit("°C").withDescription("Current temperature measured from the floor sensor"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 0, 40, 0.1)
                .withSetpoint("unoccupied_heating_setpoint", 0, 40, 0.1)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
            e.binary("away_mode", ea.ALL, "ON", "OFF").withDescription("Enable/disable away mode"),
            e.binary("child_lock", ea.ALL, "UNLOCK", "LOCK").withDescription("Enables/disables physical input on the device"),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.enum("lcd_brightness", ea.ALL, ["low", "mid", "high"]).withDescription("OLED brightness when operating the buttons.  Default: Medium."),
            e.enum("button_vibration_level", ea.ALL, ["off", "low", "high"]).withDescription("Key beep volume and vibration level.  Default: Low."),
            e
                .enum("floor_sensor_type", ea.ALL, ["10k", "15k", "50k", "100k", "12k"])
                .withDescription("Type of the external floor sensor.  Default: NTC 10K/25."),
            e.enum("sensor", ea.ALL, ["air", "floor", "both"]).withDescription("The sensor used for heat control.  Default: Room Sensor."),
            e.enum("powerup_status", ea.ALL, ["default", "last_status"]).withDescription("The mode after a power reset.  Default: Previous Mode."),
            e
                .numeric("floor_sensor_calibration", ea.ALL)
                .withUnit("°C")
                .withValueMin(-3)
                .withValueMax(3)
                .withValueStep(0.1)
                .withDescription("The tempearatue calibration for the external floor sensor, between -3 and 3 in 0.1°C.  Default: 0."),
            e
                .numeric("dry_time", ea.ALL)
                .withUnit("min")
                .withValueMin(5)
                .withValueMax(100)
                .withDescription("The duration of Dry Mode, between 5 and 100 minutes.  Default: 5."),
            e.enum("mode_after_dry", ea.ALL, ["off", "manual", "auto", "away"]).withDescription("The mode after Dry Mode.  Default: Auto."),
            e.enum("temperature_display", ea.ALL, ["room", "floor"]).withDescription("The temperature on the display.  Default: Room Temperature."),
            e
                .numeric("window_open_check", ea.ALL)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(0.5)
                .withDescription("The threshold to detect window open, between 0.0 and 8.0 in 0.5 °C.  Default: 0 (disabled)."),
            e
                .numeric("hysterersis", ea.ALL)
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(2)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting, between 0.5 and 2 in 0.1 °C.  Default: 0.5."),
            e.enum("display_auto_off_enabled", ea.ALL, ["disabled", "enabled"]),
            e
                .numeric("alarm_airtemp_overvalue", ea.ALL)
                .withUnit("°C")
                .withValueMin(20)
                .withValueMax(60)
                .withDescription("Room temperature alarm threshold, between 20 and 60 in °C.  0 means disabled.  Default: 45."),
        ],
        onEvent: (type, data, device, options) => {
            if (type === "stop") {
                clearInterval(globalStore.getValue(device, "time"));
                globalStore.clearValue(device, "time");
            } else if (!globalStore.hasValue(device, "time")) {
                const endpoint = device.getEndpoint(1);
                const hours24 = 1000 * 60 * 60 * 24;
                // Device does not ask for the time with binding, therefore we write the time every 24 hours
                const interval = setInterval(async () => await syncTime(endpoint), hours24);
                globalStore.putValue(device, "time", interval);
            }
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "hvacThermostat",
                "seMetering",
                "haElectricalMeasurement",
                "genAlarms",
                "msOccupancySensing",
                "genTime",
                "hvacUserInterfaceCfg",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // standard ZCL attributes
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            try {
                await reporting.thermostatKeypadLockMode(endpoint);
            } catch {
                // Fails for some
                // https://github.com/Koenkk/zigbee2mqtt/issues/15025
                logger.debug("Failed to setup keypadLockout reporting", NS);
            }

            await endpoint.configureReporting("hvacThermostat", [
                {
                    attribute: "occupancy",
                    minimumReportInterval: 0,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: null,
                },
            ]);

            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor", "acCurrentMultiplier"]);
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor"]);
            await endpoint.read("seMetering", ["multiplier", "divisor"]);

            await reporting.activePower(endpoint, {min: 30, change: 10}); // Min report change 10W
            await reporting.rmsCurrent(endpoint, {min: 30, change: 50}); // Min report change 0.05A
            await reporting.rmsVoltage(endpoint, {min: 30, change: 20}); // Min report change 2V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);

            // Custom attributes
            const options = {
                manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_SUNRICHER_TECHNOLOGY_LTD,
            };

            // OperateDisplayLcdBrightnesss
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1000, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );
            // ButtonVibrationLevel
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1001, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );
            // FloorSensorType
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1002, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );
            // ControlType
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1003, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );
            // PowerUpStatus
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1004, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );
            // FloorSensorCalibration
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1005, type: 0x28},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                options,
            );
            // DryTime
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1006, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                options,
            );
            // ModeAfterDry
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1007, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );
            // TemperatureDisplay
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1008, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );
            // WindowOpenCheck
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1009, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                options,
            );
            // Hysterersis
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x100a, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                options,
            );
            // DisplayAutoOffEnable
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x100b, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );
            // AlarmAirTempOverValue
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x2001, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                options,
            );
            // Away Mode Set
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x2002, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                options,
            );

            // Device does not asks for the time with binding, we need to write time during configure
            await syncTime(endpoint);

            // Trigger initial read
            await endpoint.read("hvacThermostat", ["systemMode", "runningState", "occupiedHeatingSetpoint"]);
            await endpoint.read("hvacThermostat", [0x1000, 0x1001, 0x1002, 0x1003], options);
            await endpoint.read("hvacThermostat", [0x1004, 0x1005, 0x1006, 0x1007], options);
            await endpoint.read("hvacThermostat", [0x1008, 0x1009, 0x100a, 0x100b], options);
            await endpoint.read("hvacThermostat", [0x2001, 0x2002], options);
        },
    },
    {
        fingerprint: [
            {modelID: "TERNCY-DC01", manufacturerName: "Sunricher"},
            {modelID: "HK-SENSOR-CT-A", manufacturerName: "Sunricher"},
        ],
        model: "SR-ZG9010A",
        vendor: "Sunricher",
        description: "Door windows sensor",
        fromZigbee: [fz.U02I007C01_contact, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery()],
    },
];
