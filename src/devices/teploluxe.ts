import {Zcl} from "zigbee-herdsman";
import * as m from "zigbee-herdsman-converters/lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";

function customLeakSensor(endpoints: string[]): ModernExtend[] {
    const mes: ModernExtend[] = [];

    for (const endpoint of endpoints) {
        mes.push(
            m.binary({
                name: "water_leak",
                cluster: "LeakSensor",
                endpointName: endpoint,
                attribute: {
                    ID: 0x6602,
                    type: Zcl.DataType.BOOLEAN,
                },
                valueOn: [true, "Alarm"],
                valueOff: [false, "No alarm"],
                description: "Water leak detected",
                access: "STATE_GET",
                homeassistant: {
                    enabledByDefault: false,
                },
            }),
        );
    }

    return mes;
}

function customWiredLines(endpoints: string[]): ModernExtend[] {
    const mes: ModernExtend[] = [];

    const lineTypeLookup = {"Water leak sensor": 0, "Button (falling edge trigger)": 1, "Switch (switch valve on signal level)": 2};
    const lineZoneAssignmentLookup = {"Close valves in zone 1": 1, "Close valves in zone 2": 2, "Close valves in both zones": 3};
    const lineStatusLookup = {Ok: 0, "Sensor lost": 1, "Sensor detected": 2, "Short circuit": 3};

    let lineNumber = 1;
    for (const endpoint of endpoints) {
        mes.push(
            m.enumLookup({
                name: "type",
                lookup: lineTypeLookup,
                cluster: "LeakLine",
                endpointName: endpoint,
                attribute: {
                    ID: 0x6600,
                    type: Zcl.DataType.UINT8,
                },
                access: "ALL",
                entityCategory: "config",
                description: `Type of device connected to line ${lineNumber}`,
            }),
            m.enumLookup({
                name: "zone_assignment",
                lookup: lineZoneAssignmentLookup,
                cluster: "LeakLine",
                endpointName: endpoint,
                attribute: {
                    ID: 0x6601,
                    type: Zcl.DataType.UINT8,
                },
                access: "ALL",
                entityCategory: "config",
                description: `Line ${lineNumber} zone assignment`,
            }),
            m.enumLookup({
                name: "status",
                lookup: lineStatusLookup,
                cluster: "LeakLine",
                endpointName: endpoint,
                attribute: {
                    ID: 0x6602,
                    type: Zcl.DataType.UINT8,
                },
                access: "STATE_GET",
                entityCategory: "diagnostic",
                description: `Line ${lineNumber} status`,
            }),
            m.numeric({
                name: "wired_sensor_count",
                cluster: "LeakLine",
                endpointNames: [endpoint],
                attribute: {
                    ID: 0x6603,
                    type: Zcl.DataType.UINT8,
                },
                access: "STATE_GET",
                entityCategory: "diagnostic",
                description: `Amount of wired sensors on line ${lineNumber}`,
            }),
        );

        lineNumber++;
    }

    return mes;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Neptun.Smart"],
        model: "Neptun.Smart",
        vendor: "Sprut.device",
        description: "Neptun Smart leak protect module.",
        ota: true,
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    // device
                    controller: 1,
                    // valve group 1
                    valve_group_1: 2,
                    // valve group 2
                    valve_group_2: 3,
                    // leak detected
                    both_zones: 4,
                    // leak detected zone 1
                    zone_1: 5,
                    // leak detected zone 2
                    zone_2: 6,
                    // wired sensors
                    wire_1: 7,
                    wire_2: 8,
                    wire_3: 9,
                    wire_4: 10,
                    // meters 1 - 4
                    meter_1: 11,
                    meter_2: 12,
                    meter_3: 13,
                    meter_4: 14,
                    // radio sensors
                    15: 15,
                    16: 16,
                    17: 17,
                    18: 18,
                    19: 19,
                    20: 20,
                    21: 21,
                    22: 22,
                    23: 23,
                    24: 24,
                    25: 25,
                    26: 26,
                    27: 27,
                    28: 28,
                    29: 29,
                    30: 30,
                    31: 31,
                    32: 32,
                    33: 33,
                    34: 34,
                    35: 35,
                    36: 36,
                    37: 37,
                    38: 38,
                    39: 39,
                    40: 40,
                    41: 41,
                    42: 42,
                    43: 43,
                    44: 44,
                    45: 45,
                    46: 46,
                    47: 47,
                    48: 48,
                    49: 49,
                    50: 50,
                    51: 51,
                    52: 52,
                    53: 53,
                    54: 54,
                    55: 55,
                    56: 56,
                    57: 57,
                    58: 58,
                    59: 59,
                    60: 60,
                    61: 61,
                    62: 62,
                    63: 63,
                    64: 64,
                },
            }),
            m.deviceAddCustomCluster("SprutDevice", {
                name: "SprutDevice",
                ID: 0x6600,
                manufacturerCode: 0x6666,
                attributes: {
                    address: {
                        name: "Address",
                        ID: 0x6605,
                        type: Zcl.DataType.UINT32,
                        min: 1,
                        max: 247,
                        default: 1,
                        write: true,
                    },
                    uartBaudRate: {
                        name: "UartBaudRate",
                        ID: 0x6601,
                        type: Zcl.DataType.INT32,
                        min: 1200,
                        max: 115200,
                        default: 9600,
                        write: true,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            m.numeric({
                name: "modbus_address",
                cluster: "SprutDevice",
                attribute: {
                    ID: 0x6605,
                    type: Zcl.DataType.UINT32,
                },
                description: "Modbus device address",
                valueMin: 1,
                valueMax: 247,
                valueStep: 1,
                entityCategory: "config",
                access: "ALL",
            }),
            m.enumLookup({
                name: "uart_baud_rate",
                lookup: {1200: 1200, 2400: 2400, 4800: 4800, 9600: 9600, 19200: 19200, 38400: 38400, 57600: 57600, 115200: 115200},
                cluster: "SprutDevice",
                attribute: {
                    ID: 0x6601,
                    type: Zcl.DataType.INT32,
                },
                access: "ALL",
                description: "MODBUS RTU baud rate",
                entityCategory: "config",
            }),
            m.deviceAddCustomCluster("LeakController", {
                name: "LeakController",
                ID: 0x0415,
                manufacturerCode: 0x6666,
                attributes: {
                    addMode: {
                        name: "AddMode",
                        ID: 0x6600,
                        type: Zcl.DataType.BOOLEAN,
                        write: true,
                    },
                    zoneCount: {
                        name: "ZoneCount",
                        ID: 0x6601,
                        type: Zcl.DataType.UINT8,
                        write: true,
                        min: 1,
                        max: 2,
                        default: 1,
                    },
                    closeIfLost: {
                        name: "CloseIfLost",
                        ID: 0x6602,
                        type: Zcl.DataType.BOOLEAN,
                        write: true,
                    },
                    blockKey: {
                        name: "BlockKey",
                        ID: 0x6603,
                        type: Zcl.DataType.BOOLEAN,
                        write: true,
                    },
                    assignZone: {
                        name: "AssignZone",
                        ID: 0x6604,
                        type: Zcl.DataType.UINT8,
                        write: true,
                        min: 0,
                        max: 3,
                        default: 0,
                    },
                    relayGroup: {
                        name: "RelayGroup",
                        ID: 0x6605,
                        type: Zcl.DataType.UINT8,
                        write: true,
                        min: 0,
                        max: 3,
                        default: 0,
                    },
                    rfSensorCount: {
                        name: "RfSensorCount",
                        ID: 0x6606,
                        type: Zcl.DataType.UINT8,
                    },
                    feedbackEnable: {
                        name: "FeedbackEnable",
                        ID: 0x6607,
                        type: Zcl.DataType.BOOLEAN,
                        write: true,
                    },
                    feedbackConfig: {
                        name: "FeedbackConfig",
                        ID: 0x6608,
                        type: Zcl.DataType.BOOLEAN,
                        write: true,
                    },
                    alarmTime: {
                        name: "AlarmTime",
                        ID: 0x6609,
                        type: Zcl.DataType.UINT16,
                        write: true,
                        min: 0,
                        max: 255,
                        default: 10,
                    },
                    error: {
                        name: "Error",
                        ID: 0x660a,
                        type: Zcl.DataType.UINT32,
                    },
                    closePower: {
                        name: "ClosePower",
                        ID: 0x660b,
                        type: Zcl.DataType.BOOLEAN,
                        write: true,
                    },
                    valve1status: {
                        name: "Valve1Status",
                        ID: 0x6610,
                        type: Zcl.DataType.UINT8,
                    },
                    valve2status: {
                        name: "Valve2Status",
                        ID: 0x6611,
                        type: Zcl.DataType.UINT8,
                    },
                    valve3status: {
                        name: "Valve3Status",
                        ID: 0x6612,
                        type: Zcl.DataType.UINT8,
                    },
                    valve4status: {
                        name: "Valve4Status",
                        ID: 0x6613,
                        type: Zcl.DataType.UINT8,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            m.binary({
                name: "wireless_sensor_pairing",
                cluster: "LeakController",
                attribute: {
                    ID: 0x6600,
                    type: Zcl.DataType.BOOLEAN,
                },
                valueOn: [true, "On"],
                valueOff: [false, "Off"],
                description: "Enable pairing of wireless sensors",
                access: "ALL",
                entityCategory: "config",
            }),
            m.binary({
                name: "child_lock",
                cluster: "LeakController",
                attribute: {
                    ID: 0x6603,
                    type: Zcl.DataType.BOOLEAN,
                },
                valueOn: [true, "On"],
                valueOff: [false, "Off"],
                description: "Lock physical buttons",
                access: "ALL",
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "zone_count",
                lookup: {"Single-zone": 1, "Dual-zone": 2},

                cluster: "LeakController",
                attribute: {
                    ID: 0x6601,
                    type: Zcl.DataType.UINT8,
                },
                access: "ALL",
                description: "Operation mode",
                entityCategory: "config",
            }),
            m.binary({
                name: "close_valves_if_sensor_lost",
                cluster: "LeakController",
                attribute: {
                    ID: 0x6602,
                    type: Zcl.DataType.BOOLEAN,
                },
                valueOn: [true, "On"],
                valueOff: [false, "Off"],
                description: "Close valves if sensors are lost",
                access: "ALL",
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "switch_relay_on_alarm",
                lookup: {"Dont switch": 0, "On first zone alarm": 1, "On second zone alarm": 2, "On any zone alarm": 3},

                cluster: "LeakController",
                attribute: {
                    ID: 0x6604,
                    type: Zcl.DataType.UINT8,
                },
                access: "ALL",
                description: "Switch relay on alarm mode",
                entityCategory: "config"
            }),
            m.enumLookup({
                name: "switch_relay_on_valve_closing",
                lookup: {"Dont switch": 0, "On first zone": 1, "On second zone": 2, "On any zone": 3},

                cluster: "LeakController",
                attribute: {
                    ID: 0x6605,
                    type: Zcl.DataType.UINT8,
                },
                access: "ALL",
                description: "Switch relay on valve closing",
                entityCategory: "config"
            }),
            m.numeric({
                name: "rf_sensor_count",
                cluster: "LeakController",
                attribute: {
                    ID: 0x6606,
                    type: Zcl.DataType.UINT8,
                },
                description: "Amount of connected wireless sensors",
                entityCategory: "diagnostic",
                access: "STATE_GET",
            }),
            m.binary({
                name: "wired_sensor_feedback",
                cluster: "LeakController",
                attribute: {
                    ID: 0x6607,
                    type: Zcl.DataType.BOOLEAN,
                },
                valueOn: [true, "On"],
                valueOff: [false, "Off"],
                description: "Enable monitoring of wired sensors",
                access: "ALL",
                entityCategory: "config",
                homeassistant: {
                    // not awailable on some devices
                    enabledByDefault: false,
                },
            }),
            m.binary({
                name: "count_wired_sensors",
                cluster: "LeakController",
                attribute: {
                    ID: 0x6608,
                    type: Zcl.DataType.BOOLEAN,
                },
                valueOn: [true, "On"],
                valueOff: [false, "Off"],
                description: "Detect the amount of wired sensors",
                access: "ALL",
                entityCategory: "config",
                homeassistant: {
                    // not awailable on some devices
                    enabledByDefault: false,
                },
            }),
            m.numeric({
                name: "alarm_duration",
                cluster: "LeakController",
                attribute: {
                    ID: 0x6609,
                    type: Zcl.DataType.UINT16,
                },
                description: "Duration of alarm sound",
                valueMin: 0,
                valueMax: 255,
                valueStep: 1,
                entityCategory: "config",
                unit: "min",
                access: "ALL",
            }),
            m.numeric({
                name: "error_code",
                cluster: "LeakController",
                attribute: {
                    ID: 0x660a,
                    type: Zcl.DataType.UINT32,
                },
                description: "Reported error code",
                entityCategory: "diagnostic",
                access: "STATE_GET",
            }),
            m.enumLookup({
                name: "valve_1_status",
                lookup: {Unknown: 0, Ok: 1, "Open circuit": 2, "Valve stuck": 3},

                cluster: "LeakController",
                attribute: {
                    ID: 0x6610,
                    type: Zcl.DataType.UINT8,
                },
                access: "STATE_GET",
                description: "State of valve 1",
                entityCategory: "diagnostic",
            }),
            m.enumLookup({
                name: "valve_2_status",
                lookup: {Unknown: 0, Ok: 1, "Open circuit": 2, "Valve stuck": 3},

                cluster: "LeakController",
                attribute: {
                    ID: 0x6611,
                    type: Zcl.DataType.UINT8,
                },
                access: "STATE_GET",
                description: "State of valve 2",
                entityCategory: "diagnostic",
            }),
            m.enumLookup({
                name: "valve_3_status",
                lookup: {Unknown: 0, Ok: 1, "Open circuit": 2, "Valve stuck": 3},

                cluster: "LeakController",
                attribute: {
                    ID: 0x6612,
                    type: Zcl.DataType.UINT8,
                },
                access: "STATE_GET",
                description: "State of valve 3",
                entityCategory: "diagnostic",
            }),
            m.enumLookup({
                name: "valve_4_status",
                lookup: {Unknown: 0, Ok: 1, "Open circuit": 2, "Valve stuck": 3},

                cluster: "LeakController",
                attribute: {
                    ID: 0x6613,
                    type: Zcl.DataType.UINT8,
                },
                access: "STATE_GET",
                description: "State of valve 4",
                entityCategory: "diagnostic",
            }),
            m.binary({
                name: "floor_washing_mode",
                cluster: "genOnOff",

                attribute: {
                    ID: 0x0000,
                    type: Zcl.DataType.BOOLEAN,
                },
                valueOn: [true, "On"],
                valueOff: [false, "Off"],
                description: "Enable floor washing mode",
                access: "ALL",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["valve_group_1"],
                description: "Open/close control of electric valves in group 1",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["valve_group_2"],
                description: "Open/close control of electric valves in group 2",
            }),
            m.deviceAddCustomCluster("LeakSensor", {
                name: "LeakSensor",
                ID: 0x6604,
                manufacturerCode: 0x6666,
                attributes: {
                    leakDetected: {
                        name: "LeakDetected",
                        ID: 0x6602,
                        type: Zcl.DataType.BOOLEAN,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            ...customLeakSensor(["both_zones", "zone_1", "zone_2", "wire_1", "wire_2", "wire_3", "wire_4"]),
            m.deviceAddCustomCluster("LeakLine", {
                name: "LeakLine",
                ID: 0x0416,
                manufacturerCode: 0x6666,
                attributes: {
                    lineType: {
                        name: "LineType",
                        ID: 0x6600,
                        type: Zcl.DataType.UINT8,
                        write: true,
                    },
                    lineAssign: {
                        name: "LineAssign",
                        ID: 0x6601,
                        type: Zcl.DataType.UINT8,
                        write: true,
                    },
                    lineStatus: {
                        name: "LineStatus",
                        ID: 0x6602,
                        type: Zcl.DataType.UINT8,
                    },
                    lineSensorCount: {
                        name: "LineSensorCount",
                        ID: 0x6603,
                        type: Zcl.DataType.UINT8,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            ...customWiredLines(["wire_1", "wire_2", "wire_3", "wire_4"]),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1"],
            }),
            m.bindCluster({cluster: "seMetering", clusterType: "output", endpointNames: ["meter_1", "meter_2", "meter_3", "meter_4"]}),
            m.numeric({
                name: "summation_delivered",
                cluster: "seMetering",
                attribute: "currentSummDelivered",
                endpointNames: ["meter_1", "meter_2", "meter_3", "meter_4"],
                description: "Total amount of impulses produced by meter 1",
                reporting: {
                    min: 5,
                    max: 3600,
                    change: 1,
                },
                access: "STATE_GET",
            }),
            m.numeric({
                name: "multiplier",
                cluster: "seMetering",
                attribute: "multiplier",
                endpointNames: ["meter_1", "meter_2", "meter_3", "meter_4"],
                description: "Multiplier used by meter",
                reporting: {
                    min: 5,
                    max: 3600,
                    change: 1,
                },
                entityCategory: "diagnostic",
                homeassistant: {
                    enabledByDefault: false,
                },
                access: "STATE_GET",
            }),
            m.numeric({
                name: "divisor",
                cluster: "seMetering",
                attribute: "divisor",
                endpointNames: ["meter_1", "meter_2", "meter_3", "meter_4"],
                description: "Divisor used by meter",
                reporting: {
                    min: 5,
                    max: 3600,
                    change: 1,
                },
                entityCategory: "diagnostic",
                homeassistant: {
                    enabledByDefault: false,
                },
                access: "STATE_GET",
            }),
        ],
    },
];
