import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as namron from "../lib/namron";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const ea = exposes.access;
const e = exposes.presets;

const sunricherManufacturer = {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_SUNRICHER_TECHNOLOGY_LTD};

const fzLocal = {
    namron_panelheater: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            if (data[0x1000] !== undefined) {
                // OperateDisplayBrightnesss
                result.display_brightnesss = data[0x1000];
            }
            if (data[0x1001] !== undefined) {
                // DisplayAutoOffActivation
                const lookup = {0: "deactivated", 1: "activated"};
                result.display_auto_off = utils.getFromLookup(data[0x1001], lookup);
            }
            if (data[0x1004] !== undefined) {
                // PowerUpStatus
                const lookup = {0: "manual", 1: "last_state"};
                result.power_up_status = utils.getFromLookup(data[0x1004], lookup);
            }
            if (data[0x1009] !== undefined) {
                // WindowOpenCheck
                // According to manual 0: enable, 1: disable
                // According to real life testing 0: disable, 1: enable
                result.window_detection = data[0x1009] === 1;
            }
            if (data[0x100a] !== undefined) {
                // Hysterersis
                result.hysterersis = utils.precisionRound(data[0x100a] as number, 2) / 10;
            }
            if (data[0x100b] !== undefined) {
                // WindowOpen, 0: Window is not opened, 1: Window is opened
                result.window_open = data[0x100b] === 1;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    namron_thermostat2: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        options: [exposes.options.local_temperature_based_on_sensor()],
        convert: (model, msg, publish, options, meta) => {
            const runningModeStateMap: Record<number, number> = {0: 0, 3: 2, 4: 5};
            // override mode "idle" - not a supported running mode
            if (msg.data.runningMode === 0x10) msg.data.runningMode = 0;
            // map running *mode* to *state*, as that's what used
            // in homeAssistant climate ui card (red background)
            if (msg.data.runningMode !== undefined) msg.data.runningState = runningModeStateMap[msg.data.runningMode];
            return fz.thermostat.convert(model, msg, publish, options, meta); // as KeyValue;
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    namron_panelheater: {
        key: ["display_brightnesss", "display_auto_off", "power_up_status", "window_detection", "hysterersis", "window_open"],
        convertSet: async (entity, key, value, meta) => {
            if (key === "display_brightnesss") {
                const payload = {4096: {value: value, type: Zcl.DataType.ENUM8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            } else if (key === "display_auto_off") {
                const lookup = {deactivated: 0, activated: 1};
                const payload = {4097: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            } else if (key === "power_up_status") {
                const lookup = {manual: 0, last_state: 1};
                const payload = {4100: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            } else if (key === "window_detection") {
                const payload = {4105: {value: value ? 1 : 0, type: Zcl.DataType.ENUM8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            } else if (key === "hysterersis") {
                const payload = {4106: {value: utils.toNumber(value, "hysterersis") * 10, type: Zcl.DataType.UINT8}};
                await entity.write("hvacThermostat", payload, sunricherManufacturer);
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
                case "display_brightnesss":
                    await entity.read("hvacThermostat", [0x1000], sunricherManufacturer);
                    break;
                case "display_auto_off":
                    await entity.read("hvacThermostat", [0x1001], sunricherManufacturer);
                    break;
                case "power_up_status":
                    await entity.read("hvacThermostat", [0x1004], sunricherManufacturer);
                    break;
                case "window_detection":
                    await entity.read("hvacThermostat", [0x1009], sunricherManufacturer);
                    break;
                case "hysterersis":
                    await entity.read("hvacThermostat", [0x100a], sunricherManufacturer);
                    break;
                case "window_open":
                    await entity.read("hvacThermostat", [0x100b], sunricherManufacturer);
                    break;

                default: // Unknown key
                    throw new Error(`Unhandled key toZigbee.namron_panelheater.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["3308431"],
        model: "3308431",
        vendor: "Namron",
        description: "Luna ceiling light",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["3802967"],
        model: "3802967",
        vendor: "Namron",
        description: "Led bulb 6w RGBW",
        extend: [m.light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ["4512700"],
        model: "4512700",
        vendor: "Namron",
        description: "Zigbee dimmer 400W",
        ota: true,
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["4512760"],
        model: "4512760",
        vendor: "Namron",
        description: "Zigbee dimmer 400W",
        ota: true,
        extend: [m.light({configureReporting: true}), m.electricityMeter({voltage: false, current: false})],
    },
    {
        zigbeeModel: ["4512708"],
        model: "4512708",
        vendor: "Namron",
        description: "Zigbee LED dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["4512766"],
        model: "4512766",
        vendor: "Namron",
        description: "Zigbee smart plug 16A",
        ota: true,
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["4512767"],
        model: "4512767",
        vendor: "Namron",
        description: "Zigbee smart plug 16A",
        ota: true,
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["4512789"],
        model: "4512789",
        vendor: "Namron AS",
        description: "Zigbee smart plug 16A IP44",
        extend: [m.deviceTemperature({scale: 100}), m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ["1402767"],
        model: "1402767",
        vendor: "Namron",
        description: "Zigbee LED dimmer",
        extend: [m.light({effect: false, configureReporting: true}), m.forcePowerSource({powerSource: "Mains (single phase)"})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["1402768"],
        model: "1402768",
        vendor: "Namron",
        description: "Zigbee LED dimmer TW 250W",
        extend: [m.light({effect: false, configureReporting: true, colorTemp: {range: [250, 65279]}})],
    },
    {
        zigbeeModel: ["4512733"],
        model: "4512733",
        vendor: "Namron",
        description: "ZigBee dimmer 2-pol 400W",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["4512704"],
        model: "4512704",
        vendor: "Namron",
        description: "Zigbee switch 400W",
        extend: [m.onOff()],
        ota: true,
    },
    {
        zigbeeModel: ["1402755"],
        model: "1402755",
        vendor: "Namron",
        description: "ZigBee LED dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["4512703"],
        model: "4512703",
        vendor: "Namron",
        description: "Zigbee 4 channel switch K8 (white)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
                "on_l3",
                "off_l3",
                "brightness_move_up_l3",
                "brightness_move_down_l3",
                "brightness_stop_l3",
                "on_l4",
                "off_l4",
                "brightness_move_up_l4",
                "brightness_move_down_l4",
                "brightness_stop_l4",
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512721"],
        model: "4512721",
        vendor: "Namron",
        description: "Zigbee 4 channel switch K8 (black)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
                "on_l3",
                "off_l3",
                "brightness_move_up_l3",
                "brightness_move_down_l3",
                "brightness_stop_l3",
                "on_l4",
                "off_l4",
                "brightness_move_up_l4",
                "brightness_move_down_l4",
                "brightness_stop_l4",
            ]),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512701"],
        model: "4512701",
        vendor: "Namron",
        description: "Zigbee 1 channel switch K2 (White)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop"])],
        toZigbee: [],
    },
    {
        zigbeeModel: ["4512728"],
        model: "4512728",
        vendor: "Namron",
        description: "Zigbee 1 channel switch K2 (Black)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop"])],
        toZigbee: [],
    },
    {
        zigbeeModel: ["1402769"],
        model: "1402769",
        vendor: "Namron",
        description: "ZigBee LED dimmer",
        extend: [m.light({configureReporting: true}), m.forcePowerSource({powerSource: "Mains (single phase)"})],
        ota: true,
    },
    {
        zigbeeModel: ["4512702"],
        model: "4512702",
        vendor: "Namron",
        description: "Zigbee 1 channel switch K4",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop, fz.command_step],
        exposes: [
            e.battery(),
            e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop", "brightness_step_up", "brightness_step_down"]),
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ["4512719"],
        model: "4512719",
        vendor: "Namron",
        description: "Zigbee 2 channel switch K4 (white)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
            ]),
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        ota: true,
    },
    {
        fingerprint: [{modelID: "DIM Lighting", manufacturerName: "Namron As"}],
        model: "4512707",
        vendor: "Namron",
        description: "Zigbee LED-Controller",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["4512726"],
        model: "4512726",
        vendor: "Namron",
        description: "Zigbee 4 in 1 dimmer",
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_move_to_level, fz.command_move_to_color_temp, fz.command_move_to_hue],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage(), e.action(["on", "off", "brightness_move_to_level", "color_temperature_move", "move_to_hue"])],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genPowerCfg", "genIdentify", "haDiagnostic", "genOta"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512729"],
        model: "4512729",
        vendor: "Namron",
        description: "Zigbee 2 channel switch K4 (black)",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
            ]),
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512706"],
        model: "4512706",
        vendor: "Namron",
        description: "Remote control",
        fromZigbee: [
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_step_color_temperature,
            fz.command_recall,
            fz.command_move_to_color_temp,
            fz.battery,
            fz.command_move_to_hue,
        ],
        exposes: [
            e.battery(),
            e.action([
                "on",
                "off",
                "brightness_step_up",
                "brightness_step_down",
                "color_temperature_step_up",
                "color_temperature_step_down",
                "recall_*",
                "color_temperature_move",
                "move_to_hue_l1",
                "move_to_hue_l2",
                "move_to_hue_l3",
                "move_to_hue_l4",
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ["4512705"],
        model: "4512705",
        vendor: "Namron",
        description: "Zigbee 4 channel remote control",
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop, fz.command_recall],
        toZigbee: [],
        ota: true,
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
                "on_l3",
                "off_l3",
                "brightness_move_up_l3",
                "brightness_move_down_l3",
                "brightness_stop_l3",
                "on_l4",
                "off_l4",
                "brightness_move_up_l4",
                "brightness_move_down_l4",
                "brightness_stop_l4",
                "recall_*",
            ]),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ["3802960"],
        model: "3802960",
        vendor: "Namron",
        description: "LED 9W DIM E27",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["3802961"],
        model: "3802961",
        vendor: "Namron",
        description: "LED 9W CCT E27",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["3802962"],
        model: "3802962",
        vendor: "Namron",
        description: "LED 9W RGBW E27",
        extend: [m.light({colorTemp: {range: undefined}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ["3802963"],
        model: "3802963",
        vendor: "Namron",
        description: "LED 5,3W DIM E14",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["3802964"],
        model: "3802964",
        vendor: "Namron",
        description: "LED 5,3W CCT E14",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["3802965"],
        model: "3802965",
        vendor: "Namron",
        description: "LED 4,8W DIM GU10",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["3802966"],
        model: "3802966",
        vendor: "Namron",
        description: "LED 4.8W CCT GU10",
        extend: [m.light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ["89665"],
        model: "89665",
        vendor: "Namron",
        description: "LED Strip RGB+W (5m) IP20",
        extend: [m.light({colorTemp: {range: undefined}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ["4512737", "4512738"],
        model: "4512737/4512738",
        vendor: "Namron",
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
            tz.namron_thermostat_child_lock,
            tz.namron_thermostat,
        ],
        exposes: [
            e.local_temperature(),
            e.numeric("outdoor_temperature", ea.STATE_GET).withUnit("°C").withDescription("Current temperature measured from the floor sensor"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 0, 40, 0.1)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withSystemMode(["off", "auto", "dry", "heat"])
                .withRunningState(["idle", "heat"]),
            e.binary("away_mode", ea.ALL, "ON", "OFF").withDescription("Enable/disable away mode"),
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
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
                .withValueMax(4)
                .withValueStep(0.5)
                .withDescription("The threshold to detect window open, between 1.5 and 4 in 0.5 °C.  Default: 0 (disabled)."),
            e
                .numeric("hysterersis", ea.ALL)
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(5)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting, between 0.5 and 5 in 0.1 °C.  Default: 0.5."),
            e.enum("display_auto_off_enabled", ea.ALL, ["enabled", "disabled"]),
            e
                .numeric("alarm_airtemp_overvalue", ea.ALL)
                .withUnit("°C")
                .withValueMin(0)
                .withValueMax(35)
                .withDescription(
                    "Floor temperature over heating threshold, range is 0-35, unit is 1ºC, " +
                        "0 means this function is disabled, default value is 27.",
                ),
        ],
        // Device does not asks for the time with binding, therefore we write the time every 24 hours
        extend: [m.writeTimeDaily({endpointId: 1})],
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
            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);

            // Metering
            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor", "acCurrentMultiplier"]);
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor"]);
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10 (0,01)
            await reporting.activePower(endpoint, {min: 10, change: 15}); // W - Min change of 1,5W
            await reporting.currentSummDelivered(endpoint, {min: 300}); // Report KWH every 5min
            await reporting.readMeteringMultiplierDivisor(endpoint);

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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
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
                sunricherManufacturer,
            );

            // Trigger initial read
            await endpoint.read("hvacThermostat", ["systemMode", "runningState", "occupiedHeatingSetpoint"]);
            await endpoint.read("hvacThermostat", [0x1000, 0x1001, 0x1002, 0x1003], sunricherManufacturer);
            await endpoint.read("hvacThermostat", [0x1004, 0x1005, 0x1006, 0x1007], sunricherManufacturer);
            await endpoint.read("hvacThermostat", [0x1008, 0x1009, 0x100a, 0x100b], sunricherManufacturer);
            await endpoint.read("hvacThermostat", [0x2001, 0x2002], sunricherManufacturer);
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512735"],
        model: "4512735",
        vendor: "Namron",
        description: "Multiprise with 4 AC outlets and 2 USB super charging ports (16A)",
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.switch().withEndpoint("l4"),
            e.switch().withEndpoint("l5"),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            for (const ID of [1, 2, 3, 4, 5]) {
                const endpoint = device.getEndpoint(ID);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            }
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        zigbeeModel: ["5401392", "5401396", "5401393", "5401397", "5401394", "5401398", "5401395", "5401399"],
        model: "540139X",
        vendor: "Namron",
        description: "Panel heater 400/600/800/1000 W",
        ota: true,
        fromZigbee: [fz.thermostat, fz.metering, fz.electrical_measurement, fzLocal.namron_panelheater, fz.namron_hvac_user_interface],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tzLocal.namron_panelheater,
            tz.namron_thermostat_child_lock,
        ],
        exposes: [
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 35, 0.5)
                .withLocalTemperature()
                // Unit also supports Auto, but i haven't added support the scheduler yet
                // so the function is not listed for now, as this doesn´t allow you the set the temperature
                .withSystemMode(["off", "heat"])
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withRunningState(["idle", "heat"]),
            // Namron proprietary stuff
            e
                .binary("child_lock", ea.ALL, "LOCK", "UNLOCK")
                .withDescription("Enables/disables physical input on the device"),
            e
                .numeric("hysterersis", ea.ALL)
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(2)
                .withValueStep(0.1)
                .withDescription("Hysteresis setting, default: 0.5"),
            e
                .numeric("display_brightnesss", ea.ALL)
                .withValueMin(1)
                .withValueMax(7)
                .withValueStep(1)
                .withDescription("Adjust brightness of display values 1(Low)-7(High)"),
            e.enum("display_auto_off", ea.ALL, ["deactivated", "activated"]).withDescription("Enable / Disable display auto off"),
            e
                .enum("power_up_status", ea.ALL, ["manual", "last_state"])
                .withDescription("The mode after a power reset.  Default: Previous Mode. See instructions for information about manual"),
            e.window_detection_bool(),
            e.window_open(ea.STATE_GET),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "hvacThermostat",
                "seMetering",
                "haElectricalMeasurement",
                "genAlarms",
                "genTime",
                "hvacUserInterfaceCfg",
            ];

            // Reporting

            // Metering
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10 (0,01)
            await reporting.activePower(endpoint, {min: 10, change: 15}); // W - Min change of 1,5W
            await reporting.currentSummDelivered(endpoint, {min: 300}); // Report KWH every 5min

            // Thermostat reporting
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // LocalTemp is spammy, reports 0.01C diff by default, min change is now 0.5C
            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});

            // display_brightnesss
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1000, type: Zcl.DataType.ENUM8},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // display_auto_off
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1001, type: Zcl.DataType.ENUM8},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // power_up_status
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1004, type: Zcl.DataType.ENUM8},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // window_detection
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x1009, type: Zcl.DataType.ENUM8},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // hysterersis
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x100a, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // window_open
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x100b, type: Zcl.DataType.ENUM8},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );

            await endpoint.read("hvacThermostat", ["systemMode", "runningState", "occupiedHeatingSetpoint"]);
            await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint.read("hvacThermostat", [0x1000, 0x1001, 0x1004, 0x1009, 0x100a, 0x100b], sunricherManufacturer);

            await reporting.bind(endpoint, coordinatorEndpoint, binds);
        },
    },
    {
        zigbeeModel: ["3802968"],
        model: "3802968",
        vendor: "Namron",
        description: "LED Filament Flex 5W CCT E27 Clear",
        extend: [m.light({colorTemp: {range: [153, 555]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ["4512749"],
        model: "4512749",
        vendor: "Namron",
        description: "Thermostat outlet socket",
        fromZigbee: [fz.metering, fz.electrical_measurement, fz.on_off, fz.temperature],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.temperature(), e.power(), e.current(), e.voltage(), e.switch(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "msTemperatureMeasurement"]);
            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acCurrentMultiplier", "acCurrentDivisor"]);
            await reporting.onOff(endpoint);
            await reporting.temperature(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ["4512749-N"],
        model: "4512749-N",
        vendor: "Namron",
        description: "Thermostat outlet socket",
        fromZigbee: [fz.metering, fz.electrical_measurement, fz.on_off, fz.temperature],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.temperature(), e.power(), e.current(), e.voltage(), e.switch(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "msTemperatureMeasurement"]);
            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await endpoint.read("haElectricalMeasurement", ["acCurrentMultiplier", "acCurrentDivisor"]);
            await reporting.onOff(endpoint);
            await reporting.temperature(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10
            await reporting.activePower(endpoint, {min: 10, change: 1}); // W - Min change of 0,1W
        },
    },
    {
        zigbeeModel: ["4512747"],
        model: "4512747",
        vendor: "Namron",
        description: "Curtain motor controller",
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
        zigbeeModel: ["4512758"],
        model: "4512758",
        vendor: "Namron",
        description: "Zigbee thermostat 16A",
        fromZigbee: [fzLocal.namron_thermostat2, fz.metering, fz.electrical_measurement, fz.namron_hvac_user_interface],
        toZigbee: [
            {
                // map running *mode* to *state*, as that's what used
                // in homeAssistant climate ui card (red background)
                key: ["running_state"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("hvacThermostat", ["runningMode"]);
                },
            },
            tz.thermostat_local_temperature,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            // tz.thermostat_min_cool_setpoint_limit,
            // tz.thermostat_max_cool_setpoint_limit,
            // tz.thermostat_pi_heating_demand,
            tz.thermostat_local_temperature_calibration,
            // tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.namron_thermostat_child_lock,
        ],
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({voltage: false}),
            m.binary({
                name: "away_mode",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: {ID: 0x8001, type: Zcl.DataType.BOOLEAN},
                description: "Enable or Disable Away/Anti-freeze mode",
            }),
            m.binary({
                name: "window_open_check",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: {ID: 0x8000, type: Zcl.DataType.BOOLEAN},
                description: "Enable or Disable open window detection",
                entityCategory: "config",
            }),
            m.binary({
                name: "window_open",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: {ID: 0x8002, type: Zcl.DataType.BOOLEAN},
                description: "On if window is currently detected as open",
            }),

            m.numeric({
                name: "backlight_level",
                unit: "%",
                valueMin: 0,
                valueMax: 100,
                valueStep: 10,
                cluster: "hvacThermostat",
                attribute: {ID: 0x8005, type: Zcl.DataType.UINT8},
                description: "Brightness of the display",
                entityCategory: "config",
            }),
            m.binary({
                name: "backlight_onoff",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacThermostat",
                attribute: {ID: 0x8009, type: Zcl.DataType.BOOLEAN},
                description: "Enable or Disable display light",
                entityCategory: "config",
            }),

            m.enumLookup({
                name: "sensor_mode",
                lookup: {air: 0, floor: 1, both: 2, percent: 6},
                cluster: "hvacThermostat",
                attribute: {ID: 0x8004, type: Zcl.DataType.ENUM8},
                description: "Select which sensor the thermostat uses to control the room",
                entityCategory: "config",
            }),
        ],
        exposes: [
            // FUTURE: could maybe translate to a common cooling/heating setpoint depending on the mode
            // and state.. HomeAssistant climate widget doesn't play nice with two setpoints.
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 0, 40, 0.5)
                //.withSetpoint('occupied_cooling_setpoint', 0, 40, 0.5)
                .withLocalTemperatureCalibration(-10, 10, 1)
                //.withSystemMode(['off', 'auto', 'cool', 'heat'])
                .withSystemMode(["off", "heat"])
                //.withRunningMode(['off', 'cool','heat'])
                .withRunningState(["idle", "cool", "heat"]),
            //.withPiHeatingDemand()
            e
                .binary("child_lock", ea.ALL, "LOCK", "UNLOCK")
                .withDescription("Enables/disables physical input on the device"),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genIdentify", "hvacThermostat", "seMetering", "haElectricalMeasurement", "genAlarms", "hvacUserInterfaceCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            // await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);

            // Trigger initial read
            await endpoint.read("hvacThermostat", ["systemMode", "runningMode", "occupiedHeatingSetpoint"]);
            await endpoint.read("hvacThermostat", [0x8000, 0x8001, 0x8002, 0x8004]);

            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        zigbeeModel: ["4512762"],
        model: "4512762",
        vendor: "Namron",
        description: "Zigbee Door Sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["4512763"],
        model: "4512763",
        vendor: "Namron",
        description: "Zigbee movement sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy()],
    },
    {
        zigbeeModel: ["4512764"],
        model: "4512764",
        vendor: "Namron",
        description: "Zigbee water leak sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.water_leak(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["4512765"],
        model: "4512765",
        vendor: "Namron",
        description: "Zigbee humidity and temperature Sensor",
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ["4512750", "4512751"],
        model: "4512750",
        vendor: "Namron",
        description: "Zigbee dimmer 2.0",
        ota: true,
        extend: [m.light({configureReporting: true})],
        whiteLabel: [{vendor: "Namron", model: "4512751", description: "Zigbee dimmer 2.0", fingerprint: [{modelID: "4512751"}]}],
    },
    {
        zigbeeModel: ["4512772", "4512773"],
        model: "4512773",
        vendor: "Namron",
        description: "Zigbee 8 channel switch black",
        whiteLabel: [{vendor: "Namron", model: "4512772", description: "Zigbee 8 channel switch white", fingerprint: [{modelID: "4512772"}]}],
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                "on_l1",
                "off_l1",
                "brightness_move_up_l1",
                "brightness_move_down_l1",
                "brightness_stop_l1",
                "on_l2",
                "off_l2",
                "brightness_move_up_l2",
                "brightness_move_down_l2",
                "brightness_stop_l2",
                "on_l3",
                "off_l3",
                "brightness_move_up_l3",
                "brightness_move_down_l3",
                "brightness_stop_l3",
                "on_l4",
                "off_l4",
                "brightness_move_up_l4",
                "brightness_move_down_l4",
                "brightness_stop_l4",
            ]),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512768"],
        model: "4512768",
        vendor: "Namron",
        description: "Zigbee 2 channel switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            m.electricityMeter({endpointNames: ["l1", "l2"]}),
        ],
    },
    {
        zigbeeModel: ["4512761"],
        model: "4512761",
        vendor: "Namron",
        description: "Zigbee relais 16A",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.onOff(endpoint);
        },
        ota: true,
    },
    {
        zigbeeModel: ["4512770", "4512771"],
        model: "4512770",
        vendor: "Namron",
        description: "Zigbee multisensor (white)",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery(), e.battery_voltage(), e.temperature(), e.humidity()],
        whiteLabel: [{vendor: "Namron", model: "4512771", description: "Zigbee multisensor (black)", fingerprint: [{modelID: "4512771"}]}],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint3 = device.getEndpoint(3);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint3, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            await reporting.bind(endpoint4, coordinatorEndpoint, ["msRelativeHumidity"]);
        },
        extend: [m.illuminance()],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_p3lqqy2r"]),
        model: "4512752/4512753",
        vendor: "Namron",
        description: "Touch thermostat 16A 2.0",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "2000"})],
        options: [],
        exposes: [
            e
                .enum("mode", ea.STATE_SET, ["regulator", "thermostat"])
                .withDescription(
                    "Controls how the operating mode of the device. Possible values:" +
                        " regulator (open-loop controller), thermostat (control with target temperature)",
                ),
            e
                .enum("regulator_period", ea.STATE_SET, ["15min", "30min", "45min", "60min", "90min"])
                .withLabel("Regulator cycle duration")
                .withDescription("Regulator cycle duration. Not applicable when in thermostat mode."),
            e
                .numeric("regulator_set_point", ea.STATE_SET)
                .withUnit("%")
                .withDescription("Desired heating set point (%) when in regulator mode.")
                .withValueMin(0)
                .withValueMax(95),
            e
                .climate()
                .withSystemMode(["off", "heat"], ea.STATE_SET, "Whether the thermostat is turned on or off")
                .withPreset(["manual", "home", "away"])
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withSetpoint("current_heating_setpoint", 5, 35, 1, ea.STATE_SET),
            e.current(),
            e.power(),
            e.energy(),
            e.voltage(),
            e.temperature_sensor_select(["air_sensor", "floor_sensor", "both"]),
            e
                .numeric("local_temperature", ea.STATE)
                .withUnit("°C")
                .withDescription("Current temperature measured with internal sensor")
                .withValueStep(1),
            e
                .numeric("local_temperature_floor", ea.STATE)
                .withUnit("°C")
                .withDescription("Current temperature measured on the external sensor (floor)")
                .withValueStep(1),
            e.child_lock(),
            e.window_detection().withLabel("Open window detection"),
            e
                .numeric("hysteresis", ea.STATE_SET)
                .withUnit("°C")
                .withDescription(
                    "The offset from the target temperature in which the temperature has to " +
                        "change for the heating state to change. This is to prevent erratically turning on/off " +
                        "when the temperature is close to the target.",
                )
                .withValueMin(1)
                .withValueMax(9)
                .withValueStep(1),
            e
                .numeric("max_temperature_protection", ea.STATE_SET)
                .withUnit("°C")
                .withDescription("Max guarding temperature")
                .withValueMin(20)
                .withValueMax(95)
                .withValueStep(1),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "system_mode", tuya.valueConverterBasic.lookup({off: false, heat: true})],
                [2, "preset", tuya.valueConverterBasic.lookup({manual: tuya.enum(0), home: tuya.enum(1), away: tuya.enum(2)})],
                [16, "current_heating_setpoint", tuya.valueConverter.raw],
                [24, "local_temperature", tuya.valueConverter.raw],
                [28, "local_temperature_calibration", tuya.valueConverter.localTempCalibration2],
                [30, "child_lock", tuya.valueConverter.lockUnlock],
                [101, "local_temperature_floor", tuya.valueConverter.raw],
                [102, "sensor", tuya.valueConverterBasic.lookup({air_sensor: tuya.enum(0), floor_sensor: tuya.enum(1), both: tuya.enum(2)})],
                [103, "hysteresis", tuya.valueConverter.raw],
                [104, "running_state", tuya.valueConverterBasic.lookup({idle: false, heat: true})],
                [106, "window_detection", tuya.valueConverter.onOff],
                [107, "max_temperature_protection", tuya.valueConverter.raw],
                [108, "mode", tuya.valueConverterBasic.lookup({regulator: tuya.enum(0), thermostat: tuya.enum(1)})],
                [
                    109,
                    "regulator_period",
                    tuya.valueConverterBasic.lookup({
                        "15min": tuya.enum(0),
                        "30min": tuya.enum(1),
                        "45min": tuya.enum(2),
                        "60min": tuya.enum(3),
                        "90min": tuya.enum(4),
                    }),
                ],
                [110, "regulator_set_point", tuya.valueConverter.raw],
                [120, "current", tuya.valueConverter.divideBy10],
                [121, "voltage", tuya.valueConverter.raw],
                [122, "power", tuya.valueConverter.raw],
                [123, "energy", tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        zigbeeModel: ["4512782", "4512781"],
        model: "4512782",
        vendor: "Namron",
        description: "Rotary dimmer with screen",
        extend: [
            m.light({effect: false, configureReporting: true, powerOnBehavior: false}),
            m.electricityMeter({voltage: false, current: false, configureReporting: true}),
        ],
        meta: {},
    },
    {
        zigbeeModel: ["4512788"],
        model: "4512788",
        vendor: "Namron",
        description: "Zigbee smart plug dimmer 150W",
        extend: [m.light({effect: false, configureReporting: true}), m.electricityMeter({cluster: "electrical"})],
    },
    {
        zigbeeModel: ["4512783", "4512784"],
        model: "4512783/4512784",
        vendor: "Namron",
        description: "Namron edge thermostat",
        fromZigbee: [
            fz.thermostat,
            namron.fromZigbee.namron_edge_thermostat_holiday_temp,
            namron.fromZigbee.namron_edge_thermostat_vacation_date,
            fz.namron_hvac_user_interface,
            fz.metering,
            fz.electrical_measurement,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.namron_thermostat_child_lock,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_programming_operation_mode,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_running_state,
            tz.thermostat_running_mode,
            namron.toZigbee.namron_edge_thermostat_holiday_temp,
            namron.toZigbee.namron_edge_thermostat_vacation_date,
        ],
        configure: async (device, coordinatorEndpoint, _logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "genOnOff",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msRelativeHumidity",
                "seMetering",
                "haElectricalMeasurement",
                "msOccupancySensing",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, change: 50});
            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            await reporting.thermostatKeypadLockMode(endpoint);

            // Initial read
            await endpoint.read("hvacThermostat", ["systemMode", "runningMode", "occupiedHeatingSetpoint"]);
            await endpoint.read(
                "hvacThermostat",
                [0x8000, 0x8001, 0x8002, 0x8003, 0x8004, 0x801e, 0x8006, 0x8005, 0x8006, 0x8029, 0x8022, 0x8023, 0x8024, 0x8013],
            );

            device.powerSource = "Mains (single phase)";
            device.save();
        },
        extend: [
            m.poll({
                key: "time",
                defaultIntervalSeconds: 60 * 60 * 24,
                poll: async (device) => {
                    const endpoint = device.getEndpoint(1);
                    // Device does not asks for the time with binding, therefore we write the time every 24 hours
                    await endpoint.write("hvacThermostat", {
                        [0x800b]: {
                            value: Date.now() / 1000,
                            type: Zcl.DataType.UINT32,
                        },
                    });
                },
            }),
            m.electricityMeter({voltage: false}),
            m.onOff({powerOnBehavior: false}),
            namron.edgeThermostat.systemMode(),
            namron.edgeThermostat.windowOpenDetection(),
            namron.edgeThermostat.antiFrost(),
            namron.edgeThermostat.summerWinterSwitch(),
            namron.edgeThermostat.vacationMode(),
            namron.edgeThermostat.timeSync(),
            namron.edgeThermostat.autoTime(),
            namron.edgeThermostat.displayActiveBacklight(),
            namron.edgeThermostat.displayAutoOff(),
            namron.edgeThermostat.regulatorPercentage(),
            namron.edgeThermostat.regulationMode(),
            namron.edgeThermostat.sensorMode(),
            namron.edgeThermostat.boostTime(),
            namron.edgeThermostat.readOnly.boostTimeRemaining(),
            namron.edgeThermostat.deviceTime(),
            namron.edgeThermostat.readOnly.windowState(),
            namron.edgeThermostat.readOnly.deviceFault(),
            namron.edgeThermostat.readOnly.workDays(),
            m.humidity(),
        ],
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 15, 35, 0.5)
                .withRunningState(["idle", "heat", "cool"])
                .withLocalTemperatureCalibration(-10, 10, 0.5),
            e.enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"]).withLabel("Temperature Unit").withDescription("Select Unit"),
            e.enum("operating_mode", ea.ALL, ["manual", "program", "eco"]).withDescription("Selected program for thermostat"),
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e
                .numeric("holiday_temp_set", ea.ALL)
                .withValueMin(5)
                .withValueMax(35)
                .withValueStep(0.5)
                .withUnit("°C")
                .withLabel("Vacation temperature")
                .withDescription("Vacation temperature setpoint"),
            e
                .text("vacation_start_date", ea.ALL)
                .withDescription("Start date")
                .withDescription("Supports dates starting with day or year with '. - /'"),
            e.text("vacation_end_date", ea.ALL).withDescription("End date").withDescription("Supports dates starting with day or year with '. - /'"),
        ],
    },
    {
        zigbeeModel: ["1402790"],
        model: "1402790",
        vendor: "Namron",
        description: "Stove guard for safe cooking",
        extend: [
            m.deviceEndpoints({endpoints: {main_switch: 1, short_override: 2}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["main_switch"], description: "Main relay switch"}),
            m.onOff({powerOnBehavior: false, endpointNames: ["short_override"], description: "Short override switch"}),
            m.electricityMeter({
                endpointNames: ["main_switch"],
                power: {multiplier: 1, divisor: 1},
                voltage: false,
                current: false,
            }),
            m.battery(),
            m.temperature({reporting: undefined}),
        ],
    },
    {
        zigbeeModel: ["4512792"],
        model: "4512792",
        vendor: "Namron",
        description: "Simplify 1-2p relay (Zigbee / BT)",
        extend: [
            m.onOff(),
            m.electricityMeter({
                power: {multiplier: 1, divisor: 10}, // W
                voltage: {multiplier: 1, divisor: 10}, // V -> 2383 -> 238.3
                current: {multiplier: 1, divisor: 100}, // A
                energy: {multiplier: 1, divisor: 100}, // kWh
            }),
        ],
    },
];
