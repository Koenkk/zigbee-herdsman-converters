import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

interface HzcWindowCluster {
    attributes: {windowCheck: number; windowStatus: number};
    commands: never;
    commandResponses: never;
}

interface HzcValueCluster {
    attributes: {
        valueSwitch: number;
        controlType: number;
        valueOpening: number;
        scaleSwitch: number;
        boostSwitch: number;
        boostCountdown: number;
        workMode: number;
    };
    commands: never;
    commandResponses: never;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["DimmerSwitch-2Gang-ZB3.0"],
        model: "D086-ZG",
        vendor: "HZC Electric",
        description: "Zigbee dual dimmer",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.light({endpointNames: ["l1", "l2"], configureReporting: true})],
    },
    {
        zigbeeModel: ["TempAndHumSensor-ZB3.0"],
        model: "S093TH-ZG",
        vendor: "HZC Electric",
        description: "Temperature and humidity sensor",
        fromZigbee: [fz.temperature, fz.humidity, fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity()], // Unfortunately, battery percentage is not reported by this device
    },
    {
        zigbeeModel: ["WaterLeakageSensor-ZB3.0"],
        model: "S900W-ZG",
        vendor: "HZC Electric",
        description: "Water leak sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: "MotionSensor-ZB3.0", manufacturerName: "Shyugj"}],
        model: "S902M-ZG",
        vendor: "HZC Electric",
        description: "Motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.tamper()],
        extend: [m.illuminance()],
    },
    {
        fingerprint: [{type: "Router", manufacturerName: "Shyugj", modelID: "Dimmer-Switch-ZB3.0"}],
        model: "D077-ZG",
        vendor: "HZC Electric",
        description: "Zigbee dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["Meter-Dimmer-Switch-ZB3.0"],
        model: "D692-ZG",
        vendor: "HZC Electric",
        description: "Rotary dimmer with screen",
        extend: [
            m.light({effect: false, configureReporting: true, powerOnBehavior: false}),
            m.electricityMeter({voltage: false, current: false, configureReporting: true}),
        ],
        meta: {},
    },
    {
        zigbeeModel: ["T000R_ZG"],
        model: "T000R_ZG",
        vendor: "HZC Electric",
        description: "Thermostat",
        extend: [
            m.deviceAddCustomCluster("hzcWindow", {
                name: "hzcWindow",
                ID: 0xe000,
                attributes: {
                    windowCheck: {name: "windowCheck", ID: 0x0000, type: Zcl.DataType.BOOLEAN, write: true},
                    windowStatus: {name: "windowStatus", ID: 0x0001, type: Zcl.DataType.BOOLEAN},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("hzcValue", {
                name: "hzcValue",
                ID: 0xe001,
                attributes: {
                    valueSwitch: {name: "valueSwitch", ID: 0x0001, type: Zcl.DataType.BOOLEAN, write: true},
                    controlType: {name: "controlType", ID: 0x0002, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                    valueOpening: {name: "valueOpening", ID: 0x0003, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    scaleSwitch: {name: "scaleSwitch", ID: 0x0004, type: Zcl.DataType.BOOLEAN, write: true},
                    boostSwitch: {name: "boostSwitch", ID: 0x0005, type: Zcl.DataType.BOOLEAN, write: true},
                    boostCountdown: {name: "boostCountdown", ID: 0x0006, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    workMode: {name: "workMode", ID: 0x0007, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.thermostat({
                localTemperatureCalibration: {values: {min: -9, max: 9, step: 0.5}},
                setpoints: {values: {occupiedHeatingSetpoint: {min: 5, max: 40, step: 0.5}}},
                systemMode: {values: ["heat", "off"]},
            }),
            m.battery(),
            m.enumLookup<"hzcValue", HzcValueCluster>({
                name: "work_mode",
                cluster: "hzcValue",
                attribute: "workMode",
                description: "Work mode",
                lookup: {manual: 0, program: 1, holiday: 2, comfortable: 3, eco: 4, off: 5},
                reporting: {min: "MIN", max: "1_HOUR", change: 0},
            }),
            m.binary<"hzcWindow", HzcWindowCluster>({
                name: "window_status",
                cluster: "hzcWindow",
                attribute: "windowStatus",
                description: "Indicates if an open window is detected",
                valueOn: [true, 1],
                valueOff: [false, 0],
                access: "STATE_GET",
                reporting: {min: "MIN", max: "1_HOUR", change: 0},
            }),
            m.binary<"hzcWindow", HzcWindowCluster>({
                name: "window_check",
                cluster: "hzcWindow",
                attribute: "windowCheck",
                description: "Enable open window detection",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                entityCategory: "config",
            }),
            m.binary<"hzcValue", HzcValueCluster>({
                name: "boost_switch",
                cluster: "hzcValue",
                attribute: "boostSwitch",
                description: "Boost",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
            }),
            m.numeric<"hzcValue", HzcValueCluster>({
                name: "boost_countdown",
                cluster: "hzcValue",
                attribute: "boostCountdown",
                description: "Boost duration",
                valueMin: 1,
                valueMax: 90,
                entityCategory: "config",
            }),
            m.binary<"hzcValue", HzcValueCluster>({
                name: "value_switch",
                cluster: "hzcValue",
                attribute: "valueSwitch",
                description: "Value switch",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
            }),
            m.enumLookup<"hzcValue", HzcValueCluster>({
                name: "control_type",
                cluster: "hzcValue",
                attribute: "controlType",
                description: "Control type",
                lookup: {PDPID: 0, NF: 1},
                entityCategory: "config",
            }),
            m.numeric<"hzcValue", HzcValueCluster>({
                name: "value_opening",
                cluster: "hzcValue",
                attribute: "valueOpening",
                description: "Value opening",
                scale: 10,
                valueMin: 0,
                valueMax: 10,
            }),
            m.binary<"hzcValue", HzcValueCluster>({
                name: "scale_switch",
                cluster: "hzcValue",
                attribute: "scaleSwitch",
                description: "Scale switch",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                entityCategory: "config",
            }),
            m.binary<"hvacThermostat", undefined>({
                name: "frost",
                cluster: "hvacThermostat",
                attribute: {ID: 0x8001, type: Zcl.DataType.BOOLEAN},
                description: "Frost protection",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                entityCategory: "config",
            }),
            m.numeric<"hvacThermostat", undefined>({
                name: "frost_temp",
                cluster: "hvacThermostat",
                attribute: {ID: 0x9000, type: Zcl.DataType.UINT8},
                description: "Frost protection temperature",
                unit: "°C",
                scale: 10,
                valueMin: 5,
                valueMax: 10,
                valueStep: 0.5,
                entityCategory: "config",
            }),
            m.binary<"hvacUserInterfaceCfg", undefined>({
                name: "keypad_lockout",
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                description: "Keypad lockout",
                valueOn: ["LOCK", 1],
                valueOff: ["UNLOCK", 0],
                entityCategory: "config",
            }),
            m.enumLookup<"hvacUserInterfaceCfg", undefined>({
                name: "display_mode",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x8000, type: Zcl.DataType.ENUM8},
                description: "Display orientation",
                lookup: {forward: 0, reverse: 1},
                entityCategory: "config",
            }),
            m.numeric<"hvacUserInterfaceCfg", undefined>({
                name: "holiday_time",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x8002, type: Zcl.DataType.UINT8},
                description: "Holiday mode duration",
                unit: "d",
                valueMin: 1,
                valueMax: 99,
                entityCategory: "config",
            }),
            {
                configure: [
                    async (device) => {
                        // Sync device time (local seconds since 1970)
                        const time = Math.round(Date.now() / 1000) - new Date().getTimezoneOffset() * 60;
                        await device.getEndpoint(1).write("hvacThermostat", {32779: {value: time, type: Zcl.DataType.UINT32}});
                    },
                ],
                isModernExtend: true,
            },
        ],
    },
];
