import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue} from "../lib/types";

const e = exposes.presets;

interface ThirdAcceleration {
    attributes: {
        coolDownTime: number;
        xAxis: number;
        yAxis: number;
        zAxis: number;
    };
    commands: never;
    commandResponses: never;
}

interface ThirdMotionSensor {
    attributes: {
        coldDownTime: number;
        localRoutinTime: number;
        luxThreshold: number;
    };
    commands: never;
    commandResponses: never;
}

interface ThirdBlindGen2 {
    attributes: {
        infraredEnable: number;
        compensationSpeed: number;
        limitPosition: number;
        totalCycleTimes: number;
        lastRemainingBatteryPercentage: number;
    };
    commands: never;
    commandResponses: never;
}

interface ThirdWaterSensor {
    attributes: {
        sirenOnOff: number;
        sirenMinutes: number;
    };
    commands: never;
    commandResponses: never;
}

interface ThirdPlug {
    attributes: {
        resetTotalEnergy: number;
        countdownToTurnOff: number;
        countdownToTurnOn: number;
    };
    commands: never;
    commandResponses: never;
}

interface ThirdPlugGen3 {
    attributes: {
        meteringOnlyMode: number;
        powerRiseThreshold: number;
        powerDropThreshold: number;
    };
    commands: never;
    commandResponses: never;
}

const fzLocal = {
    thirdreality_acceleration: {
        cluster: "3rVirationSpecialcluster",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValue = {};
            if (msg.data.xAxis) payload.x_axis = msg.data.xAxis;
            if (msg.data.yAxis) payload.y_axis = msg.data.yAxis;
            if (msg.data.zAxis) payload.z_axis = msg.data.zAxis;
            return payload;
        },
    } satisfies Fz.Converter<"3rVirationSpecialcluster", ThirdAcceleration, ["attributeReport", "readResponse"]>,
    thirdreality_private_motion_sensor: {
        cluster: "r3Specialcluster",
        type: "attributeReport",
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data[2] as number;
            return {occupancy: (zoneStatus & 1) > 0};
        },
    } satisfies Fz.Converter<"r3Specialcluster", ThirdMotionSensor, "attributeReport">,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["3RSS009Z"],
        model: "3RSS009Z",
        vendor: "Third Reality",
        description: "Smart switch Gen3",
        ota: true,
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.on_off, tz.ignore_transition],
        exposes: [e.switch(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            device.powerSource = "Battery";
            device.save();
        },
        extend: [
            m.deviceAddCustomCluster("3rSwitchGen3SpecialCluster", {
                ID: 0xff02,
                manufacturerCode: 0x1233,
                attributes: {
                    onToOffDelay: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    offToOnDelay: {ID: 0x0002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
    },
    {
        zigbeeModel: ["3RSS008Z"],
        model: "3RSS008Z",
        vendor: "Third Reality",
        description: "RealitySwitch Plus",
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        exposes: [e.switch(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ["3RSS007Z"],
        model: "3RSS007Z",
        vendor: "Third Reality",
        description: "Smart light switch",
        extend: [m.onOff()],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["3RSL011Z"],
        model: "3RSL011Z",
        vendor: "Third Reality",
        description: "Smart light A19",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["3RSL012Z"],
        model: "3RSL012Z",
        vendor: "Third Reality",
        description: "Smart light BR30",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["3RWS18BZ"],
        model: "3RWS18BZ",
        vendor: "Third Reality",
        description: "Water sensor",
        ota: true,
        extend: [
            m.deviceAddCustomCluster("3rWaterSensorcluster", {
                ID: 0xff01,
                manufacturerCode: 0x1233,
                attributes: {
                    sirenOnOff: {ID: 0x0010, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    sirenMinutes: {ID: 0x0011, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1", "battery_low"],
            }),
            m.battery(),
            m.binary<"3rWaterSensorcluster", ThirdWaterSensor>({
                name: "water_leak_buzzer",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "3rWaterSensorcluster",
                attribute: "sirenOnOff",
                description: "Turns the water-leak detection buzzer on or off.",
                access: "ALL",
            }),
            m.numeric<"3rWaterSensorcluster", ThirdWaterSensor>({
                name: "water_leak_buzzer_alarm_mode",
                unit: "min",
                valueMin: 0,
                valueMax: 255,
                cluster: "3rWaterSensorcluster",
                attribute: "sirenMinutes",
                description: "Sets the buzzers beeping mode for water-leak alerts.(0 = continuous;values = beeping duration (minutes).)",
                access: "ALL",
            }),
        ],
    },
    {
        zigbeeModel: ["3RWS0218Z"],
        model: "3RWS0218Z",
        vendor: "Third Reality",
        description: "Water sensor gen2",
        ota: true,
        extend: [m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1"]}), m.battery()],
    },
    {
        zigbeeModel: ["3RMS16BZ"],
        model: "3RMS16BZ",
        vendor: "Third Reality",
        description: "Wireless motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        ota: true,
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            device.powerSource = "Battery";
            device.save();
        },
        extend: [
            m.deviceAddCustomCluster("3rMotionSpecialCluster", {
                ID: 0xff01,
                manufacturerCode: 0x1233,
                attributes: {
                    coolDownTime: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
    },
    {
        zigbeeModel: ["3RSMR01067Z"],
        model: "3RSMR01067Z",
        vendor: "Third Reality",
        description: "Smart motion sensor R1",
        ota: true,
        extend: [
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "battery_low"]}),
            m.battery({voltage: true}),
            m.deviceAddCustomCluster("3rRadarSpecialCluster", {
                ID: 0xff01,
                manufacturerCode: 0x1407,
                attributes: {
                    coolDownTime: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
    },
    {
        zigbeeModel: ["3RDS17BZ"],
        model: "3RDS17BZ",
        vendor: "Third Reality",
        description: "Door sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        ota: true,
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            device.powerSource = "Battery";
            device.save();
        },
        extend: [
            m.deviceAddCustomCluster("3rDoorSpecialCluster", {
                ID: 0xff01,
                manufacturerCode: 0x1233,
                attributes: {
                    delayOpenAttrId: {ID: 0x0000, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
    },
    {
        zigbeeModel: ["3RDTS01056Z"],
        model: "3RDTS01056Z",
        vendor: "Third Reality",
        description: "Garage door tilt sensor",
        extend: [
            m.battery({percentageReporting: false}),
            m.forcePowerSource({powerSource: "Battery"}),
            m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]}),
            m.deviceAddCustomCluster("3rGarageDoorSpecialCluster", {
                ID: 0xff01,
                manufacturerCode: 0x1407,
                attributes: {
                    delayOpenAttrId: {ID: 0x0000, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    zclCabrationAttrId: {ID: 0x0003, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["3RSP019BZ"],
        model: "3RSP019BZ",
        vendor: "Third Reality",
        description: "Zigbee / BLE smart plug",
        extend: [
            m.onOff(),
            m.deviceAddCustomCluster("3rPlugGen1SpecialCluster", {
                ID: 0xff03,
                manufacturerCode: 0x1233,
                attributes: {
                    onToOffDelay: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    offToOnDelay: {ID: 0x0002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    allowBind: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["3RSB015BZ"],
        model: "3RSB015BZ",
        vendor: "Third Reality",
        description: "Roller shade",
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {battery: {dontDividePercentage: false}},
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
            } catch {
                /* Fails for some*/
            }
        },
        exposes: [e.cover_position(), e.battery()],
        extend: [
            m.deviceAddCustomCluster("3rRollerShadeSpecialCluster", {
                ID: 0xfff1,
                manufacturerCode: 0x1233,
                attributes: {
                    infraredOff: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    allowBind: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
    },
    {
        zigbeeModel: ["TRZB3"],
        model: "TRZB3",
        vendor: "Third Reality",
        description: "Roller blind motor",
        extend: [m.battery()],
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ["3RSB02015Z"],
        model: "3RSB02015Z",
        vendor: "Third Reality",
        description: "Third Reality Blind Gen2",
        extend: [
            m.battery(),
            m.windowCovering({controls: ["lift"]}),
            m.commandsWindowCovering({commands: ["open", "close", "stop"]}),
            m.deviceAddCustomCluster("3rSmartBlindGen2SpecialCluster", {
                ID: 0xfff1,
                manufacturerCode: 0x1233,
                attributes: {
                    infraredEnable: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    compensationSpeed: {ID: 0x0001, type: Zcl.DataType.INT8, write: true, min: -128},
                    limitPosition: {ID: 0x0002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    totalCycleTimes: {ID: 0x0003, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    lastRemainingBatteryPercentage: {ID: 0x0004, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.binary<"3rSmartBlindGen2SpecialCluster", ThirdBlindGen2>({
                name: "ir_remote",
                valueOn: ["ON", 0x00],
                valueOff: ["OFF", 0x01],
                cluster: "3rSmartBlindGen2SpecialCluster",
                attribute: "infraredEnable",
                description: "IR Remote Function Enable/Disable",
            }),
            m.numeric<"3rSmartBlindGen2SpecialCluster", ThirdBlindGen2>({
                name: "bottom_balance_adjustment",
                valueMin: -100,
                valueMax: 100,
                cluster: "3rSmartBlindGen2SpecialCluster",
                attribute: "compensationSpeed",
                description: "Adjusts the left-right balance of the shade's bottom bar(turns -100 ~ 100).",
                access: "ALL",
            }),
            m.numeric<"3rSmartBlindGen2SpecialCluster", ThirdBlindGen2>({
                name: "preset_bottom_position",
                valueMin: 50,
                valueMax: 3800,
                cluster: "3rSmartBlindGen2SpecialCluster",
                attribute: "limitPosition",
                description: "Preset the bottom limit position of the blind",
                access: "ALL",
            }),
            m.numeric<"3rSmartBlindGen2SpecialCluster", ThirdBlindGen2>({
                name: "estimated_usable_curtain_cycles",
                valueMin: 200,
                valueMax: 334,
                cluster: "3rSmartBlindGen2SpecialCluster",
                attribute: "totalCycleTimes",
                description:
                    "Indicates the estimated number of remaining curtain cycles, used to gauge the battery charge level(based on battery level).",
                access: "ALL",
            }),
            m.numeric<"3rSmartBlindGen2SpecialCluster", ThirdBlindGen2>({
                name: "battery_level_at_last_power_off",
                valueMin: 0,
                valueMax: 100,
                cluster: "3rSmartBlindGen2SpecialCluster",
                attribute: "lastRemainingBatteryPercentage",
                description:
                    "Stores the battery level recorded at the moment of the last power-off, used to help estimate the current battery capacity.",
                access: "STATE_GET",
            }),
        ],
    },
    {
        zigbeeModel: ["3RSB22BZ"],
        model: "3RSB22BZ",
        vendor: "Third Reality",
        description: "Smart button",
        fromZigbee: [fz.itcmdr_clicks],
        ota: true,
        exposes: [e.action(["single", "double", "hold", "release"])],
        extend: [
            m.battery(),
            m.forcePowerSource({powerSource: "Battery"}),
            m.deviceAddCustomCluster("3rButtonSpecialCluster", {
                ID: 0xff01,
                manufacturerCode: 0x1233,
                attributes: {
                    cancelDoubleClick: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
    },
    {
        zigbeeModel: ["3RSB01085Z"],
        model: "3RSB01085Z",
        vendor: "Third Reality",
        description: "Smart Scene Button S3",
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2, 3: 3}}),
            m.actionEnumLookup({
                endpointNames: ["1", "2", "3"],
                cluster: "genMultistateInput",
                attribute: "presentValue",
                actionLookup: {release: 255, single: 1, double: 2, hold: 0},
            }),
            m.battery(),
        ],
    },
    {
        zigbeeModel: ["3RTHS24BZ"],
        model: "3RTHS24BZ",
        vendor: "Third Reality",
        description: "Temperature and humidity sensor",
        extend: [
            m.temperature(),
            m.humidity(),
            m.battery(),
            m.forcePowerSource({powerSource: "Battery"}),
            m.deviceAddCustomCluster("3rSpecialCluster", {
                ID: 0xff01,
                manufacturerCode: 0x1233,
                attributes: {
                    celsiusDegreeCalibration: {ID: 0x0031, type: Zcl.DataType.INT16, write: true, min: -32768},
                    humidityCalibration: {ID: 0x0032, type: Zcl.DataType.INT16, write: true, min: -32768},
                    fahrenheitDegreeCalibration: {ID: 0x0033, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["3RSM0147Z"],
        model: "3RSM0147Z",
        vendor: "Third Reality",
        description: "Smart Soil Moisture Sensor",
        extend: [
            m.temperature(),
            m.humidity(),
            m.soilMoisture(),
            m.battery(),
            m.deviceAddCustomCluster("3rSoilSpecialCluster", {
                ID: 0xff01,
                manufacturerCode: 0x1407,
                attributes: {
                    celsiusDegreeCalibration: {ID: 0x0031, type: Zcl.DataType.INT16, write: true, min: -32768},
                    humidityCalibration: {ID: 0x0032, type: Zcl.DataType.INT16, write: true, min: -32768},
                    fahrenheitDegreeCalibration: {ID: 0x0033, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["3RSM0347Z"],
        model: "3RSM0347Z",
        vendor: "Third Reality",
        description: "Smart Soil Moisture Sensor Gen2",
        extend: [m.temperature(), m.humidity(), m.soilMoisture(), m.battery()],
        ota: true,
    },
    {
        zigbeeModel: ["3RTHS0224Z"],
        model: "3RTHS0224Z",
        vendor: "Third Reality",
        description: "Temperature and humidity sensor lite",
        extend: [
            m.temperature(),
            m.humidity(),
            m.battery(),
            m.deviceAddCustomCluster("3rSpecialCluster", {
                ID: 0xff01,
                manufacturerCode: 0x1407,
                attributes: {
                    celsiusDegreeCalibration: {ID: 0x0031, type: Zcl.DataType.INT16, write: true, min: -32768},
                    humidityCalibration: {ID: 0x0032, type: Zcl.DataType.INT16, write: true, min: -32768},
                    fahrenheitDegreeCalibration: {ID: 0x0033, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["3RWK0148Z"],
        model: "3RWK0148Z",
        vendor: "Third Reality",
        description: "Smart watering kit",
        extend: [
            m.battery({percentage: true, voltage: true, lowStatus: true, percentageReporting: true}),
            m.onOff({powerOnBehavior: false}),
            m.deviceAddCustomCluster("3rWateringSpecialCluster", {
                ID: 0xfff2,
                manufacturerCode: 0x1407,
                attributes: {
                    wateringTimes: {ID: 0x0000, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    intervalDay: {ID: 0x0001, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["3RSP02028BZ"],
        model: "3RSP02028BZ",
        vendor: "Third Reality",
        description: "Zigbee / BLE smart plug with power",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        ota: true,
        exposes: [e.switch(), e.power_on_behavior(), e.ac_frequency(), e.power(), e.power_factor(), e.energy(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint, {change: 10});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 3600000, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {
                acVoltageMultiplier: 1,
                acVoltageDivisor: 10,
                acCurrentMultiplier: 1,
                acCurrentDivisor: 1000,
                acPowerMultiplier: 1,
                acPowerDivisor: 10,
            });
            device.save();
        },
        extend: [
            m.deviceAddCustomCluster("3rPlugGen2SpecialCluster", {
                ID: 0xff03,
                manufacturerCode: 0x1233,
                attributes: {
                    resetTotalEnergy: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    countdownToTurnOff: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    countdownToTurnOn: {ID: 0x0002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    allowBind: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup<"3rPlugGen2SpecialCluster", ThirdPlug>({
                name: "reset_total_energy",
                lookup: {Reset: 1},
                cluster: "3rPlugGen2SpecialCluster",
                attribute: "resetTotalEnergy",
                description: "Reset the sum of consumed energy",
                access: "ALL",
            }),
            m.numeric<"3rPlugGen2SpecialCluster", ThirdPlug>({
                name: "countdown_to_turn_off",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugGen2SpecialCluster",
                attribute: "countdownToTurnOff",
                description: "(ON-OFF)",
                access: "ALL",
            }),
            m.numeric<"3rPlugGen2SpecialCluster", ThirdPlug>({
                name: "countdown_to_turn_on",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugGen2SpecialCluster",
                attribute: "countdownToTurnOn",
                description: "(OFF-ON)",
                access: "ALL",
            }),
        ],
    },
    {
        zigbeeModel: ["3RSPE02065Z", "3RSPU01080Z"],
        model: "3RSPE02065Z",
        vendor: "Third Reality",
        description: "Smart Plug E3",
        whiteLabel: [{vendor: "Third Reality", model: "3RSPU01080Z", description: "Smart Plug UZ1", fingerprint: [{modelID: "3RSPU01080Z"}]}],
        extend: [
            m.onOff(),
            m.electricityMeter({acFrequency: true, powerFactor: true}),
            m.deviceAddCustomCluster("3rPlugSpecialcluster", {
                ID: 0xff03,
                manufacturerCode: 0x1407,
                attributes: {
                    resetTotalEnergy: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    countdownToTurnOff: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    countdownToTurnOn: {ID: 0x0002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    allowBind: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup<"3rPlugSpecialcluster", ThirdPlug>({
                name: "reset_total_energy",
                lookup: {Reset: 1},
                cluster: "3rPlugSpecialcluster",
                attribute: "resetTotalEnergy",
                description: "Reset the sum of consumed energy",
                access: "ALL",
            }),
            m.numeric<"3rPlugSpecialcluster", ThirdPlug>({
                name: "countdown_to_turn_off",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugSpecialcluster",
                attribute: "countdownToTurnOff",
                description: "(ON-OFF)",
                access: "ALL",
            }),
            m.numeric<"3rPlugSpecialcluster", ThirdPlug>({
                name: "countdown_to_turn_on",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugSpecialcluster",
                attribute: "countdownToTurnOn",
                description: "(OFF-ON)",
                access: "ALL",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["3RSP02064Z"],
        model: "3RSP02064Z",
        vendor: "Third Reality",
        description: "Smart Plug Gen3",
        extend: [
            m.onOff(),
            m.electricityMeter({acFrequency: true, powerFactor: true}),
            m.deviceAddCustomCluster("3rPlugSpecialcluster", {
                ID: 0xff03,
                manufacturerCode: 0x1407,
                attributes: {
                    resetTotalEnergy: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    countdownToTurnOff: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    countdownToTurnOn: {ID: 0x0002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    allowBind: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    powerRiseThreshold: {ID: 0x0040, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    powerDropThreshold: {ID: 0x0041, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    meteringOnlyMode: {ID: 0x0050, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup<"3rPlugSpecialcluster", ThirdPlug>({
                name: "reset_total_energy",
                lookup: {Reset: 1},
                cluster: "3rPlugSpecialcluster",
                attribute: "resetTotalEnergy",
                description: "Reset the sum of consumed energy",
                access: "ALL",
            }),
            m.binary<"3rPlugSpecialcluster", ThirdPlugGen3>({
                name: "metering_only_mode",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "3rPlugSpecialcluster",
                attribute: "meteringOnlyMode",
                description: "When enabled, the device enters metering-only mode and the relay is forced to stay ON.",
                access: "ALL",
            }),
            m.numeric<"3rPlugSpecialcluster", ThirdPlug>({
                name: "countdown_to_turn_off",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugSpecialcluster",
                attribute: "countdownToTurnOff",
                description: "(ON-OFF)",
                access: "ALL",
            }),
            m.numeric<"3rPlugSpecialcluster", ThirdPlug>({
                name: "countdown_to_turn_on",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugSpecialcluster",
                attribute: "countdownToTurnOn",
                description: "(OFF-ON)",
                access: "ALL",
            }),
            m.numeric<"3rPlugSpecialcluster", ThirdPlugGen3>({
                name: "power_rise_threshold",
                unit: "w",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugSpecialcluster",
                attribute: "powerRiseThreshold",
                description: "Reports sudden power changes. Power rise and fall alerts can be enabled separately. Threshold adjustable.",
                access: "ALL",
            }),
            m.numeric<"3rPlugSpecialcluster", ThirdPlugGen3>({
                name: "power_drop_threshold",
                unit: "w",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugSpecialcluster",
                attribute: "powerDropThreshold",
                description: "Reports sudden power changes. Power rise and drop alerts can be enabled separately. Threshold adjustable.",
                access: "ALL",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["3RDP01072Z", "3RWP01073Z"],
        model: "3RDP01072Z",
        vendor: "Third Reality",
        description: "Smart Dual Plug ZP1",
        ota: true,
        whiteLabel: [{vendor: "Third Reality", model: "3RWP01073Z", description: "Smart Wall Plug ZW1", fingerprint: [{modelID: "3RWP01073Z"}]}],
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 2: 2}}),
            m.onOff({endpointNames: ["1"], description: "On/off state of the switch left/bottom"}),
            m.electricityMeter({acFrequency: true, powerFactor: true, endpointNames: ["1"], energy: {divisor: 1000, multiplier: 1}}),
            m.onOff({endpointNames: ["2"], description: "On/off state of the switch right/top"}),
            m.electricityMeter({acFrequency: true, powerFactor: true, endpointNames: ["2"], energy: {divisor: 1000, multiplier: 1}}),
            m.deviceAddCustomCluster("3rDualPlugSpecialcluster", {
                ID: 0xff03,
                manufacturerCode: 0x1407,
                attributes: {
                    resetTotalEnergy: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    countdownToTurnOff: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    countdownToTurnOn: {ID: 0x0002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup<"3rDualPlugSpecialcluster", ThirdPlug>({
                endpointName: "1",
                name: "reset_total_energy",
                lookup: {Reset: 1},
                cluster: "3rDualPlugSpecialcluster",
                attribute: "resetTotalEnergy",
                description: "Reset the sum of consumed energy",
                access: "ALL",
            }),
            m.numeric<"3rDualPlugSpecialcluster", ThirdPlug>({
                name: "countdown_time_on_to_off",
                endpointNames: ["1"],
                unit: "s",
                valueMin: 0,
                valueMax: 60000,
                cluster: "3rDualPlugSpecialcluster",
                attribute: "countdownToTurnOff",
                description: "(ON-OFF)",
                access: "ALL",
            }),
            m.numeric<"3rDualPlugSpecialcluster", ThirdPlug>({
                name: "countdown_time_off_to_on",
                endpointNames: ["1"],
                unit: "s",
                valueMin: 0,
                valueMax: 60000,
                cluster: "3rDualPlugSpecialcluster",
                attribute: "countdownToTurnOn",
                description: "(OFF-ON)",
                access: "ALL",
            }),
            m.enumLookup<"3rDualPlugSpecialcluster", ThirdPlug>({
                endpointName: "2",
                name: "reset_total_energy",
                lookup: {Reset: 1},
                cluster: "3rDualPlugSpecialcluster",
                attribute: "resetTotalEnergy",
                description: "Reset the sum of consumed energy",
                access: "ALL",
            }),
            m.numeric<"3rDualPlugSpecialcluster", ThirdPlug>({
                name: "countdown_time_on_to_off",
                endpointNames: ["2"],
                unit: "s",
                valueMin: 0,
                valueMax: 60000,
                cluster: "3rDualPlugSpecialcluster",
                attribute: "countdownToTurnOff",
                description: "(ON-OFF)",
                access: "ALL",
            }),
            m.numeric<"3rDualPlugSpecialcluster", ThirdPlug>({
                name: "countdown_time_off_to_on",
                endpointNames: ["2"],
                unit: "s",
                valueMin: 0,
                valueMax: 60000,
                cluster: "3rDualPlugSpecialcluster",
                attribute: "countdownToTurnOn",
                description: "(OFF-ON)",
                access: "ALL",
            }),
        ],
    },
    {
        zigbeeModel: ["3RVS01031Z"],
        model: "3RVS01031Z",
        vendor: "Third Reality",
        description: "Zigbee vibration sensor",
        fromZigbee: [fz.ias_vibration_alarm_1, fz.battery, fzLocal.thirdreality_acceleration],
        toZigbee: [],
        ota: true,
        exposes: [e.vibration(), e.battery_low(), e.battery(), e.battery_voltage(), e.x_axis(), e.y_axis(), e.z_axis()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            device.powerSource = "Battery";
            device.save();
        },
        extend: [
            m.deviceAddCustomCluster("3rVirationSpecialcluster", {
                ID: 0xfff1,
                manufacturerCode: 0x1233,
                attributes: {
                    coolDownTime: {ID: 0x0004, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    xAxis: {ID: 0x0001, type: Zcl.DataType.INT16, write: true, min: -32768},
                    yAxis: {ID: 0x0002, type: Zcl.DataType.INT16, write: true, min: -32768},
                    zAxis: {ID: 0x0003, type: Zcl.DataType.INT16, write: true, min: -32768},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
    },
    {
        zigbeeModel: ["3RSNL02043Z"],
        model: "3RSNL02043Z",
        vendor: "Third Reality",
        description: "Zigbee multi-function night light",
        ota: true,
        extend: [
            m.light({color: true}),
            m.deviceAddCustomCluster("r3Specialcluster", {
                ID: 0xfc00,
                manufacturerCode: 0x130d,
                attributes: {
                    coldDownTime: {ID: 0x0003, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    localRoutinTime: {ID: 0x0004, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    luxThreshold: {ID: 0x0005, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.illuminance(),
            m.forcePowerSource({powerSource: "Mains (single phase)"}),
        ],
        fromZigbee: [fzLocal.thirdreality_private_motion_sensor, fz.ias_occupancy_alarm_1_report],
        exposes: [e.occupancy()],
    },
    {
        zigbeeModel: ["3RCB01057Z", "3RCB02070Z"],
        model: "3RCB01057Z",
        vendor: "Third Reality",
        description: "Smart Color Bulb ZL1",
        whiteLabel: [{vendor: "Third Reality", model: "3RCB02070Z", description: "Smart Color Bulb ZL4", fingerprint: [{modelID: "3RCB02070Z"}]}],
        ota: true,
        extend: [
            m.light({colorTemp: {range: [154, 500]}, color: {modes: ["xy", "hs"], enhancedHue: false}}),
            m.deviceAddCustomCluster("3rColorSpecialCluster", {
                ID: 0xff04,
                manufacturerCode: 0x1407,
                attributes: {
                    allowBind: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
    },
    {
        zigbeeModel: ["3RSPE01044BZ"],
        model: "3RSPE01044BZ",
        vendor: "Third Reality",
        description: "Zigbee / BLE smart plug with power",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        ota: true,
        exposes: [e.switch(), e.power_on_behavior(), e.ac_frequency(), e.power(), e.power_factor(), e.energy(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint, {change: 10});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 3600000, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {
                acVoltageMultiplier: 1,
                acVoltageDivisor: 10,
                acCurrentMultiplier: 1,
                acCurrentDivisor: 1000,
                acPowerMultiplier: 1,
                acPowerDivisor: 10,
            });
            device.save();
        },
        extend: [
            m.deviceAddCustomCluster("3rPlugE2Specialcluster", {
                ID: 0xff03,
                manufacturerCode: 0x1233,
                attributes: {
                    resetTotalEnergy: {ID: 0x0000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    countdownToTurnOff: {ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    countdownToTurnOn: {ID: 0x0002, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                    allowBind: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup<"3rPlugE2Specialcluster", ThirdPlug>({
                name: "reset_total_energy",
                lookup: {Reset: 1},
                cluster: "3rPlugE2Specialcluster",
                attribute: "resetTotalEnergy",
                description: "Reset the sum of consumed energy",
                access: "ALL",
            }),
            m.numeric<"3rPlugE2Specialcluster", ThirdPlug>({
                name: "countdown_to_turn_off",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugE2Specialcluster",
                attribute: "countdownToTurnOff",
                description: "(ON-OFF)",
                access: "ALL",
            }),
            m.numeric<"3rPlugE2Specialcluster", ThirdPlug>({
                name: "countdown_to_turn_on",
                unit: "s",
                valueMin: 0,
                valueMax: 65535,
                cluster: "3rPlugE2Specialcluster",
                attribute: "countdownToTurnOn",
                description: "(OFF-ON)",
                access: "ALL",
            }),
        ],
    },
];
