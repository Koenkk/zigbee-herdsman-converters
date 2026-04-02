import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";
import {postfixWithEndpointName, precisionRound} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const setTime = async (device: Zh.Device) => {
    const endpoint = device.getEndpoint(1);
    const time = Math.round((Date.now() - constants.OneJanuary2000) / 1000);
    // Time-master + synchronised
    const values = {timeStatus: 1, time: time, timeZone: new Date().getTimezoneOffset() * -1 * 60};
    await endpoint.write("genTime", values);
};

interface DanfossHvacThermostat {
    attributes: {
        danfossWindowOpenInternal?: number;
        danfossWindowOpenExternal?: number;
        danfossDayOfWeek?: number;
        danfossTriggerTime?: number;
        danfossMountedModeActive?: number;
        danfossMountedModeControl?: number;
        danfossThermostatOrientation?: number;
        danfossExternalMeasuredRoomSensor?: number;
        danfossRadiatorCovered?: number;
        danfossAlgorithmScaleFactor?: number;
        danfossHeatAvailable?: number;
        danfossHeatRequired?: number;
        danfossLoadBalancingEnable?: number;
        danfossLoadRoomMean?: number;
        danfossLoadEstimate?: number;
        danfossRegulationSetpointOffset?: number;
        danfossAdaptionRunControl?: number;
        danfossAdaptionRunStatus?: number;
        danfossAdaptionRunSettings?: number;
        danfossPreheatStatus?: number;
        danfossPreheatTime?: number;
        danfossWindowOpenFeatureEnable?: number;
        danfossRoomStatusCode?: number;
        danfossOutputStatus?: number;
        danfossRoomFloorSensorMode?: number;
        danfossFloorMinSetpoint?: number;
        danfossFloorMaxSetpoint?: number;
        danfossScheduleTypeUsed?: number;
        danfossIcon2PreHeat?: number;
        danfossIcon2PreHeatStatus?: number;
    };
    commands: {
        danfossSetpointCommand: {
            setpointType: number;
            setpoint: number;
        };
    };
    commandResponses: never;
}

interface DanfossHvacUserInterfaceCfg {
    attributes: {
        danfossViewingDirection?: number;
    };
    commands: never;
    commandResponses: never;
}

interface DanfossHaDiagnostic {
    attributes: {
        danfossSystemStatusCode?: number;
        danfossHeatSupplyRequest?: number;
        danfossSystemStatusWater?: number;
        danfossMultimasterRole?: number;
        danfossIconApplication?: number;
        danfossIconForcedHeatingCooling?: number;
    };
    commands: never;
    commandResponses: never;
}

const danfossExtend = {
    addDanfossHvacThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            name: "hvacThermostat",
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                danfossWindowOpenInternal: {
                    name: "danfossWindowOpenInternal",
                    ID: 0x4000,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossWindowOpenExternal: {
                    name: "danfossWindowOpenExternal",
                    ID: 0x4003,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossDayOfWeek: {
                    name: "danfossDayOfWeek",
                    ID: 0x4010,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossTriggerTime: {
                    name: "danfossTriggerTime",
                    ID: 0x4011,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xffff,
                },
                danfossMountedModeActive: {
                    name: "danfossMountedModeActive",
                    ID: 0x4012,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossMountedModeControl: {
                    name: "danfossMountedModeControl",
                    ID: 0x4013,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossThermostatOrientation: {
                    name: "danfossThermostatOrientation",
                    ID: 0x4014,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossExternalMeasuredRoomSensor: {
                    name: "danfossExternalMeasuredRoomSensor",
                    ID: 0x4015,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    min: -32768,
                    max: 32767,
                },
                danfossRadiatorCovered: {
                    name: "danfossRadiatorCovered",
                    ID: 0x4016,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossAlgorithmScaleFactor: {
                    name: "danfossAlgorithmScaleFactor",
                    ID: 0x4020,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossHeatAvailable: {
                    name: "danfossHeatAvailable",
                    ID: 0x4030,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossHeatRequired: {
                    name: "danfossHeatRequired",
                    ID: 0x4031,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossLoadBalancingEnable: {
                    name: "danfossLoadBalancingEnable",
                    ID: 0x4032,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossLoadRoomMean: {
                    name: "danfossLoadRoomMean",
                    ID: 0x4040,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    min: -32768,
                    max: 32767,
                },
                danfossLoadEstimate: {
                    name: "danfossLoadEstimate",
                    ID: 0x404a,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    min: -32768,
                    max: 32767,
                },
                danfossRegulationSetpointOffset: {
                    name: "danfossRegulationSetpointOffset",
                    ID: 0x404b,
                    type: Zcl.DataType.INT8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    min: -128,
                    max: 127,
                },
                danfossAdaptionRunControl: {
                    name: "danfossAdaptionRunControl",
                    ID: 0x404c,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossAdaptionRunStatus: {
                    name: "danfossAdaptionRunStatus",
                    ID: 0x404d,
                    type: Zcl.DataType.BITMAP8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossAdaptionRunSettings: {
                    name: "danfossAdaptionRunSettings",
                    ID: 0x404e,
                    type: Zcl.DataType.BITMAP8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossPreheatStatus: {
                    name: "danfossPreheatStatus",
                    ID: 0x404f,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossPreheatTime: {
                    name: "danfossPreheatTime",
                    ID: 0x4050,
                    type: Zcl.DataType.UINT32,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossWindowOpenFeatureEnable: {
                    name: "danfossWindowOpenFeatureEnable",
                    ID: 0x4051,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossRoomStatusCode: {
                    name: "danfossRoomStatusCode",
                    ID: 0x4100,
                    type: Zcl.DataType.BITMAP16,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossOutputStatus: {
                    name: "danfossOutputStatus",
                    ID: 0x4110,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossRoomFloorSensorMode: {
                    name: "danfossRoomFloorSensorMode",
                    ID: 0x4120,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossFloorMinSetpoint: {
                    name: "danfossFloorMinSetpoint",
                    ID: 0x4121,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    min: -32768,
                    max: 32767,
                },
                danfossFloorMaxSetpoint: {
                    name: "danfossFloorMaxSetpoint",
                    ID: 0x4122,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    min: -32768,
                    max: 32767,
                },
                danfossScheduleTypeUsed: {
                    name: "danfossScheduleTypeUsed",
                    ID: 0x4130,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossIcon2PreHeat: {
                    name: "danfossIcon2PreHeat",
                    ID: 0x4131,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossIcon2PreHeatStatus: {
                    name: "danfossIcon2PreHeatStatus",
                    ID: 0x414f,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
            },
            commands: {
                danfossSetpointCommand: {
                    name: "danfossSetpointCommand",
                    ID: 0x40,
                    parameters: [
                        {name: "setpointType", type: Zcl.DataType.ENUM8, max: 0xff},
                        {name: "setpoint", type: Zcl.DataType.INT16, min: -32768, max: 32767},
                    ],
                },
            },
            commandsResponse: {},
        }),
    addDanfossHvacUserInterfaceCfgCluster: () =>
        m.deviceAddCustomCluster("hvacUserInterfaceCfg", {
            name: "hvacUserInterfaceCfg",
            ID: Zcl.Clusters.hvacUserInterfaceCfg.ID,
            attributes: {
                danfossViewingDirection: {
                    name: "danfossViewingDirection",
                    ID: 0x4000,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    addDanfossHaDiagnosticCluster: () =>
        m.deviceAddCustomCluster("haDiagnostic", {
            name: "haDiagnostic",
            ID: Zcl.Clusters.haDiagnostic.ID,
            attributes: {
                danfossSystemStatusCode: {
                    name: "danfossSystemStatusCode",
                    ID: 0x4000,
                    type: Zcl.DataType.BITMAP16,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                },
                danfossHeatSupplyRequest: {
                    name: "danfossHeatSupplyRequest",
                    ID: 0x4031,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossSystemStatusWater: {
                    name: "danfossSystemStatusWater",
                    ID: 0x4200,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossMultimasterRole: {
                    name: "danfossMultimasterRole",
                    ID: 0x4201,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossIconApplication: {
                    name: "danfossIconApplication",
                    ID: 0x4210,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
                danfossIconForcedHeatingCooling: {
                    name: "danfossIconForcedHeatingCooling",
                    ID: 0x4220,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                    write: true,
                    max: 0xff,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    absMaxHeatSetpointLimit: (args?: Partial<m.NumericArgs<"hvacThermostat", undefined>>) =>
        m.numeric<"hvacThermostat", undefined>({
            name: "abs_max_heat_setpoint_limit",
            cluster: "hvacThermostat",
            attribute: "absMaxHeatSetpointLimit",
            description: "Absolute Maximum Heating Setpoint Limit.",
            unit: "°C",
            scale: 100,
            entityCategory: "diagnostic",
            access: "STATE_GET",
            ...args,
        }),
    keypadLockout: (args?: Partial<m.EnumLookupArgs<"hvacUserInterfaceCfg", undefined>>) =>
        m.enumLookup({
            name: "keypad_lockout",
            cluster: "hvacUserInterfaceCfg",
            attribute: "keypadLockout",
            description: "Enables/disables physical input on the device",
            lookup: {
                unlock: 0,
                lock: 1,
            },
            access: "ALL",
            entityCategory: "config",
            fzConvert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};
                if ("keypadLockout" in msg.data) {
                    result[postfixWithEndpointName("keypad_lockout", msg, model, meta)] = msg.data.keypadLockout > 0 ? "lock" : "unlock";
                }
                return result;
            },
            ...args,
        }),
    danfossMountedModeActive: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "mounted_mode_active",
            cluster: "hvacThermostat",
            attribute: "danfossMountedModeActive",
            description:
                "Is the unit in mounting mode. This is set to `false` for mounted (already on the radiator) or `true` for not mounted (after factory reset)",
            valueOn: [true, 1],
            valueOff: [false, 0],
            access: "STATE_GET",
            entityCategory: "diagnostic",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossMountedModeControl: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "mounted_mode_control",
            cluster: "hvacThermostat",
            attribute: "danfossMountedModeControl",
            description: "Set the unit mounting mode. `false` Go to Mounted Mode or `true` Go to Mounting Mode",
            valueOn: [true, 1],
            valueOff: [false, 0],
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossThermostatOrientation: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "thermostat_vertical_orientation",
            cluster: "hvacThermostat",
            attribute: "danfossThermostatOrientation",
            description: "Thermostat Orientation. This is important for the PID in how it assesses temperature.",
            valueOn: ["Vertical", true],
            valueOff: ["Horizontal", false],
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossViewingDirection: (args?: Partial<m.BinaryArgs<"hvacUserInterfaceCfg", DanfossHvacUserInterfaceCfg>>) =>
        m.binary<"hvacUserInterfaceCfg", DanfossHvacUserInterfaceCfg>({
            name: "viewing_direction",
            cluster: "hvacUserInterfaceCfg",
            attribute: "danfossViewingDirection",
            description: "Viewing/display direction",
            valueOn: ["Upside-down", true],
            valueOff: ["Normal", false],
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossHeatAvailable: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "heat_available",
            cluster: "hvacThermostat",
            attribute: "danfossHeatAvailable",
            description:
                "Not clear how this affects operation. However, it would appear that the device does not execute any " +
                "motor functions if this is set to false. This may be a means to conserve battery during periods that the heating " +
                "system is not energized (e.g. during summer).",
            valueOn: ["Heat Available", true],
            valueOff: ["No Heat Available", false],
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossHeatRequired: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "heat_required",
            cluster: "hvacThermostat",
            attribute: "danfossHeatRequired",
            description: "Whether or not the unit needs warm water.",
            valueOn: ["Heat Request", true],
            valueOff: ["No Heat Request", false],
            access: "STATE_GET",
            entityCategory: "diagnostic",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    setpointChangeSource: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", undefined>>) =>
        m.enumLookup({
            name: "setpoint_change_source",
            cluster: "hvacThermostat",
            attribute: "setpointChangeSource",
            description: "Values observed",
            access: "STATE",
            lookup: {
                Manual: 0,
                Schedule: 1,
                Externally: 2,
            },
            entityCategory: "diagnostic",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    occupiedHeatingSetpointScheduled: (args?: Partial<m.NumericArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.numeric({
            name: "occupied_heating_setpoint_scheduled",
            cluster: "hvacThermostat",
            attribute: "occupiedHeatingSetpoint",
            description:
                "Scheduled change of the setpoint. Alternative method for changing the setpoint. " +
                "In the opposite to occupied_heating_setpoint it does not trigger an aggressive " +
                "response from the actuator. (more suitable for scheduled changes)",
            access: "ALL",
            unit: "°C",
            valueMin: 5,
            valueMax: 35,
            valueStep: 0.5,
            scale: 100,
            // fzConvert:
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossExternalMeasuredRoomSensor: (args?: Partial<m.NumericArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.numeric<"hvacThermostat", DanfossHvacThermostat>({
            name: "external_measured_room_sensor",
            cluster: "hvacThermostat",
            attribute: "danfossExternalMeasuredRoomSensor",
            description:
                "The temperature sensor of the TRV is — due to its design — relatively close to the heat source " +
                "(i.e. the hot water in the radiator). Thus there are situations where the `local_temperature` measured by the " +
                "TRV is not accurate enough: If the radiator is covered behind curtains or furniture, if the room is rather big, or " +
                "if the radiator itself is big and the flow temperature is high, then the temperature in the room may easily diverge " +
                "from the `local_temperature` measured by the TRV by 5°C to 8°C. In this case you might choose to use an external " +
                "room sensor and send the measured value of the external room sensor to the `External_measured_room_sensor` property. " +
                "The way the TRV operates on the `External_measured_room_sensor` depends on the setting of the `Radiator_covered` " +
                "property: If `Radiator_covered` is `false` (Auto Offset Mode): You *must* set the `External_measured_room_sensor` " +
                "property *at least* every 3 hours. After 3 hours the TRV disables this function and resets the value of the " +
                "`External_measured_room_sensor` property to -8000 (disabled). You *should* set the `External_measured_room_sensor` " +
                "property *at most* every 30 minutes or every 0.1°C change in measured room temperature. " +
                "If `Radiator_covered` is `true` (Room Sensor Mode): You *must* set the `External_measured_room_sensor` property *at " +
                "least* every 30 minutes. After 35 minutes the TRV disables this function and resets the value of the " +
                "`External_measured_room_sensor` property to -8000 (disabled). You *should* set the `External_measured_room_sensor` " +
                "property *at most* every 5 minutes or every 0.1°C change in measured room temperature. " +
                "The unit of this value is 0.01 `°C` (so e.g. 21°C would be represented as 2100).",
            valueMin: -8000,
            valueMax: 3500,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossRadiatorCovered: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "radiator_covered",
            cluster: "hvacThermostat",
            attribute: "danfossRadiatorCovered",
            description:
                "Controls whether the TRV should solely rely on an external room sensor or operate in offset mode. " +
                "`false` = Auto Offset Mode (use this e.g. for exposed radiators) or `true` = Room Sensor Mode (use this e.g. for " +
                "covered radiators). Please note that this flag only controls how the TRV operates on the value of " +
                "`External_measured_room_sensor`; only setting this flag without setting the `External_measured_room_sensor` " +
                "has no (noticeable?) effect.",
            valueOn: ["Room Sensor Mode", true],
            valueOff: ["Auto Offset Mode", false],
            access: "ALL",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossWindowOpenFeatureEnable: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "window_open_feature",
            cluster: "hvacThermostat",
            attribute: "danfossWindowOpenFeatureEnable",
            description: "Whether or not the window open feature is enabled",
            valueOn: [true, 1],
            valueOff: [false, 0],
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossWindowOpenInternal: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", DanfossHvacThermostat>({
            name: "window_open_internal",
            cluster: "hvacThermostat",
            attribute: "danfossWindowOpenInternal",
            description:
                "0=Quarantine, 1=Windows are closed, 2=Hold - Windows are maybe about to open, " +
                "3=Open window detected, 4=In window open state from external but detected closed locally",
            lookup: {
                quarantine: 0,
                closed: 1,
                hold: 2,
                open: 3,
                external_open: 4,
            },
            access: "STATE_GET",
            entityCategory: "diagnostic",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossWindowOpenExternal: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "window_open_external",
            cluster: "hvacThermostat",
            attribute: "danfossWindowOpenExternal",
            description: "Set if the window is open or closed. This setting will trigger a change in the internal window and heating demand.",
            valueOn: ["Open", true],
            valueOff: ["Closed", false],
            access: "ALL",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossDayOfWeek: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", DanfossHvacThermostat>({
            name: "day_of_week",
            cluster: "hvacThermostat",
            attribute: "danfossDayOfWeek",
            lookup: {
                sunday: 0,
                monday: 1,
                tuesday: 2,
                wednesday: 3,
                thursday: 4,
                friday: 5,
                saturday: 6,
                away_or_vacation: 7,
            },
            description: "Exercise day of week: 0=Sun...6=Sat, 7=undefined",
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),

    danfossTriggerTime: (args?: Partial<m.NumericArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.numeric<"hvacThermostat", DanfossHvacThermostat>({
            name: "trigger_time",
            cluster: "hvacThermostat",
            attribute: "danfossTriggerTime",
            description: "Exercise trigger time. Minutes since midnight (65535=undefined). Range 0 to 1439",
            valueMin: 0,
            valueMax: 1439,
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossTriggerTime2: (): ModernExtend => {
        return {
            isModernExtend: true,
            exposes: [
                e
                    .text("trigger_time", ea.ALL)
                    .withDescription("Exercise trigger time. Format: 'HH:MM' (e.g., '14:30'). Send 'undefined' to disable.")
                    .withCategory("config"),
            ],
            fromZigbee: [
                {
                    cluster: "hvacThermostat",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        if (msg.data.danfossTriggerTime !== undefined) {
                            const val = msg.data.danfossTriggerTime;
                            if (val === 65535) {
                                return {trigger_time: "undefined"};
                            }
                            const hours = Math.floor(val / 60)
                                .toString()
                                .padStart(2, "0");
                            const mins = (val % 60).toString().padStart(2, "0");
                            return {trigger_time: `${hours}:${mins}`};
                        }
                    },
                },
            ],
            toZigbee: [
                {
                    key: ["trigger_time"],
                    convertSet: async (entity, key, value, meta) => {
                        let val = 65535; // Default to undefined (65535)
                        if (typeof value === "string" && value.toLowerCase() !== "undefined") {
                            const [hours, mins] = value.split(":").map(Number);
                            if (!Number.isNaN(hours) && !Number.isNaN(mins)) {
                                val = hours * 60 + mins;
                            } else {
                                throw new Error(`Invalid time format for trigger_time: '${value}'. Please use 'HH:MM'.`);
                            }
                        }
                        await entity.write<"hvacThermostat", DanfossHvacThermostat>(
                            "hvacThermostat",
                            {danfossTriggerTime: val},
                            {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
                        );
                        return {state: {trigger_time: value}};
                    },
                    convertGet: async (entity, key, meta) => {
                        await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossTriggerTime"], {
                            manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
                        });
                    },
                },
            ],
        };
    },
    danfossAlgorithmScaleFactor: (args?: Partial<m.NumericArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.numeric<"hvacThermostat", DanfossHvacThermostat>({
            name: "algorithm_scale_factor",
            cluster: "hvacThermostat",
            attribute: "danfossAlgorithmScaleFactor",
            description: 'Scale factor of setpoint filter timeconstant ("aggressiveness" of control algorithm) 1= Quick ... 5=Moderate ... 10=Slow',
            valueMin: 1,
            valueMax: 10,
            access: "ALL",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossLoadBalancingEnable: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "load_balancing_enable",
            cluster: "hvacThermostat",
            attribute: "danfossLoadBalancingEnable",
            description:
                "Whether or not the thermostat acts as standalone thermostat or shares load with other thermostats in the room. The gateway must update load_room_mean if enabled.",
            valueOn: [true, 1],
            valueOff: [false, 0],
            access: "ALL",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossLoadRoomMean: (args?: Partial<m.NumericArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.numeric<"hvacThermostat", DanfossHvacThermostat>({
            name: "load_room_mean",
            cluster: "hvacThermostat",
            attribute: "danfossLoadRoomMean",
            description: "Mean radiator load for room calculated by gateway for load balancing purposes (-8000=undefined)",
            valueMin: -8000,
            valueMax: 3600,
            access: "ALL",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossLoadEstimate: (args?: Partial<m.NumericArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.numeric<"hvacThermostat", DanfossHvacThermostat>({
            name: "load_estimate",
            cluster: "hvacThermostat",
            attribute: "danfossLoadEstimate",
            description: "Load estimate on this radiator",
            valueMin: -8000,
            valueMax: 3600,
            access: "STATE_GET",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossPreheatStatus: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "preheat_status",
            cluster: "hvacThermostat",
            attribute: "danfossPreheatStatus",
            description: "Specific for pre-heat running in Zigbee Weekly Schedule mode",
            valueOn: [true, 1],
            valueOff: [false, 0],
            access: "STATE_GET",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossAdaptionRunStatus: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", DanfossHvacThermostat>({
            name: "adaptation_run_status",
            cluster: "hvacThermostat",
            attribute: "danfossAdaptionRunStatus",
            description: "Status of adaptation run: None (before first run), In Progress, Valve Characteristic Found, Valve Characteristic Lost",
            lookup: {
                none: 0,
                in_progress: 1,
                found: 2,
                lost: 3,
                lost_in_progress: 4,
            },
            access: "STATE_GET",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossAdaptionRunSettings: (args?: Partial<m.BinaryArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.binary<"hvacThermostat", DanfossHvacThermostat>({
            name: "adaptation_run_settings",
            cluster: "hvacThermostat",
            attribute: "danfossAdaptionRunSettings",
            description: "Automatic adaptation run enabled (the one during the night)",
            valueOn: [true, 1],
            valueOff: [false, 0],
            access: "ALL",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossAdaptionRunControl: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.enumLookup<"hvacThermostat", DanfossHvacThermostat>({
            name: "adaptation_run_control",
            cluster: "hvacThermostat",
            attribute: "danfossAdaptionRunControl",
            description: "Adaptation run control: Initiate Adaptation Run or Cancel Adaptation Run",
            lookup: {
                none: 0,
                initiate_adaptation: 1,
                cancel_adaptation: 2,
            },
            access: "ALL",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossRegulationSetpointOffset: (args?: Partial<m.NumericArgs<"hvacThermostat", DanfossHvacThermostat>>) =>
        m.numeric<"hvacThermostat", DanfossHvacThermostat>({
            name: "regulation_setpoint_offset",
            cluster: "hvacThermostat",
            attribute: "danfossRegulationSetpointOffset",
            description: "Regulation SetPoint Offset in range -2.5°C to 2.5°C in steps of 0.1°C.",
            valueMin: -2.5,
            valueMax: 2.5,
            valueStep: 0.1,
            scale: 10,
            unit: "°C",
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            ...args,
        }),
    danfossThermostat: (options: m.ThermostatArgs): ModernExtend => {
        const extend = m.thermostat(options);

        const danfossSetpointConverter: Tz.Converter = {
            key: ["occupied_heating_setpoint", "occupied_heating_setpoint_scheduled"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertNumber(value, key);
                const isScheduled = key === "occupied_heating_setpoint_scheduled";
                const payload = {
                    setpointType: isScheduled ? 0 : 1, // 0 for scheduled, 1 for aggressive
                    setpoint: Math.round(value * 2) * 50,
                };
                // Send the command
                await entity.command<"hvacThermostat", "danfossSetpointCommand", DanfossHvacThermostat>(
                    "hvacThermostat",
                    "danfossSetpointCommand",
                    payload,
                    {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
                );
                if (!isScheduled) {
                    await entity.command<"hvacThermostat", "danfossSetpointCommand", DanfossHvacThermostat>(
                        "hvacThermostat",
                        "danfossSetpointCommand",
                        payload,
                        {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
                    );
                }
            },
            convertGet: async (entity, key, meta) => {
                await entity.read("hvacThermostat", ["occupiedHeatingSetpoint"]);
            },
        };
        extend.toZigbee.unshift(danfossSetpointConverter);

        const climateExpose = extend.exposes.find((exp) => typeof exp !== "function" && "type" in exp && exp.type === "climate");
        if (climateExpose) {
            climateExpose.withRunningState(["idle", "heat"]);
            const runningStateFeature = climateExpose.features.find((f) => typeof f !== "function" && "name" in f && f.name === "running_state");
            if (runningStateFeature) {
                runningStateFeature.withDescription("Running state based on danfossOutputStatus and danfossHeatRequired");
            }
        }
        extend.exposes.push(
            e
                .numeric("occupied_heating_setpoint_scheduled", ea.ALL)
                .withValueMin(5)
                .withValueMax(35)
                .withValueStep(0.5)
                .withUnit("°C")
                .withDescription(
                    "Scheduled change of the setpoint. Alternative method for changing the setpoint. In contrast to occupied heating setpoint it does not trigger an aggressive response from the actuator. (more suitable for scheduled changes)",
                ),
        );

        extend.fromZigbee.push({
            cluster: "hvacThermostat",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValueAny = {};
                if ("danfossHeatRequired" in msg.data || "danfossOutputStatus" in msg.data) {
                    const isHeating = (msg.data.danfossOutputStatus ?? msg.data.danfossHeatRequired) === 1;
                    result.running_state = isHeating ? "heat" : "idle";
                }
                if ("occupiedHeatingSetpoint" in msg.data) {
                    const value = precisionRound(msg.data.occupiedHeatingSetpoint, 2) / 100;
                    result[postfixWithEndpointName("occupied_heating_setpoint", msg, model, meta)] = value;
                    result[postfixWithEndpointName("occupied_heating_setpoint_scheduled", msg, model, meta)] = value;
                }
                return result;
            },
        });

        extend.configure.push(
            m.setupConfigureForReading<"hvacThermostat", undefined>("hvacThermostat", ["systemMode"]),
            m.setupConfigureForReading<"hvacUserInterfaceCfg", undefined>("hvacUserInterfaceCfg", ["keypadLockout"]),
            async (device, coordinatorEndpoint) => {
                await setTime(device);
            },
        );
        return extend;
    },
};

const tzLocal = {
    danfoss_output_status: {
        key: ["output_status"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossOutputStatus"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_room_status_code: {
        key: ["room_status_code"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossRoomStatusCode"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_floor_sensor_mode: {
        key: ["room_floor_sensor_mode"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossRoomFloorSensorMode"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_floor_min_setpoint: {
        key: ["floor_min_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            const danfossFloorMinSetpoint = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
            await entity.write<"hvacThermostat", DanfossHvacThermostat>(
                "hvacThermostat",
                {danfossFloorMinSetpoint},
                {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            );
            return {state: {floor_min_setpoint: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossFloorMinSetpoint"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_floor_max_setpoint: {
        key: ["floor_max_setpoint"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            const danfossFloorMaxSetpoint = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
            await entity.write<"hvacThermostat", DanfossHvacThermostat>(
                "hvacThermostat",
                {danfossFloorMaxSetpoint},
                {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
            );
            return {state: {floor_max_setpoint: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossFloorMaxSetpoint"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_schedule_type_used: {
        key: ["schedule_type_used"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossScheduleTypeUsed"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_icon2_pre_heat: {
        key: ["icon2_pre_heat"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossIcon2PreHeat"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_icon2_pre_heat_status: {
        key: ["icon2_pre_heat_status"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["danfossIcon2PreHeatStatus"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_system_status_code: {
        key: ["system_status_code"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"haDiagnostic", DanfossHaDiagnostic>("haDiagnostic", ["danfossSystemStatusCode"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_heat_supply_request: {
        key: ["heat_supply_request"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"haDiagnostic", DanfossHaDiagnostic>("haDiagnostic", ["danfossHeatSupplyRequest"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_system_status_water: {
        key: ["system_status_water"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"haDiagnostic", DanfossHaDiagnostic>("haDiagnostic", ["danfossSystemStatusWater"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_multimaster_role: {
        key: ["multimaster_role"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"haDiagnostic", DanfossHaDiagnostic>("haDiagnostic", ["danfossMultimasterRole"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_icon_application: {
        key: ["icon_application"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"haDiagnostic", DanfossHaDiagnostic>("haDiagnostic", ["danfossIconApplication"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
    danfoss_icon_forced_heating_cooling: {
        key: ["icon_forced_heating_cooling"],
        convertGet: async (entity, key, meta) => {
            await entity.read<"haDiagnostic", DanfossHaDiagnostic>("haDiagnostic", ["danfossIconForcedHeatingCooling"], {
                manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S,
            });
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    danfoss_thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            // Danfoss Icon Converters
            if (msg.data.danfossRoomStatusCode !== undefined) {
                result[postfixWithEndpointName("room_status_code", msg, model, meta)] =
                    constants.danfossRoomStatusCode[msg.data.danfossRoomStatusCode] !== undefined
                        ? constants.danfossRoomStatusCode[msg.data.danfossRoomStatusCode]
                        : msg.data.danfossRoomStatusCode;
            }
            if (msg.data.danfossOutputStatus !== undefined) {
                if (msg.data.danfossOutputStatus === 1) {
                    result[postfixWithEndpointName("output_status", msg, model, meta)] = "active";
                    result[postfixWithEndpointName("running_state", msg, model, meta)] = "heat";
                } else {
                    result[postfixWithEndpointName("output_status", msg, model, meta)] = "inactive";
                    result[postfixWithEndpointName("running_state", msg, model, meta)] = "idle";
                }
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", DanfossHvacThermostat, ["attributeReport", "readResponse"]>,
    danfoss_hvac_ui: {
        cluster: "hvacUserInterfaceCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (msg.data.danfossViewingDirection !== undefined) {
                result[postfixWithEndpointName("viewing_direction", msg, model, meta)] = msg.data.danfossViewingDirection === 1;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacUserInterfaceCfg", DanfossHvacUserInterfaceCfg, ["attributeReport", "readResponse"]>,
    danfoss_icon_floor_sensor: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (msg.data.danfossRoomFloorSensorMode !== undefined) {
                result[postfixWithEndpointName("room_floor_sensor_mode", msg, model, meta)] =
                    constants.danfossRoomFloorSensorMode[msg.data.danfossRoomFloorSensorMode] !== undefined
                        ? constants.danfossRoomFloorSensorMode[msg.data.danfossRoomFloorSensorMode]
                        : msg.data.danfossRoomFloorSensorMode;
            }
            if (msg.data.danfossFloorMinSetpoint !== undefined) {
                const value = precisionRound(msg.data.danfossFloorMinSetpoint, 2) / 100;
                if (value >= -273.15) {
                    result[postfixWithEndpointName("floor_min_setpoint", msg, model, meta)] = value;
                }
            }
            if (msg.data.danfossFloorMaxSetpoint !== undefined) {
                const value = precisionRound(msg.data.danfossFloorMaxSetpoint, 2) / 100;
                if (value >= -273.15) {
                    result[postfixWithEndpointName("floor_max_setpoint", msg, model, meta)] = value;
                }
            }
            if (msg.data.danfossScheduleTypeUsed !== undefined) {
                result[postfixWithEndpointName("schedule_type_used", msg, model, meta)] =
                    constants.danfossScheduleTypeUsed[msg.data.danfossScheduleTypeUsed] !== undefined
                        ? constants.danfossScheduleTypeUsed[msg.data.danfossScheduleTypeUsed]
                        : msg.data.danfossScheduleTypeUsed;
            }
            if (msg.data.danfossIcon2PreHeat !== undefined) {
                result[postfixWithEndpointName("icon2_pre_heat", msg, model, meta)] =
                    constants.danfossIcon2PreHeat[msg.data.danfossIcon2PreHeat] !== undefined
                        ? constants.danfossIcon2PreHeat[msg.data.danfossIcon2PreHeat]
                        : msg.data.danfossIcon2PreHeat;
            }
            if (msg.data.danfossIcon2PreHeatStatus !== undefined) {
                result[postfixWithEndpointName("icon2_pre_heat_status", msg, model, meta)] =
                    constants.danfossIcon2PreHeatStatus[msg.data.danfossIcon2PreHeatStatus] !== undefined
                        ? constants.danfossIcon2PreHeatStatus[msg.data.danfossIcon2PreHeatStatus]
                        : msg.data.danfossIcon2PreHeatStatus;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", DanfossHvacThermostat, ["attributeReport", "readResponse"]>,
    danfoss_icon_battery: {
        cluster: "genPowerCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (msg.data.batteryPercentageRemaining !== undefined) {
                // Some devices do not comply to the ZCL and report a
                // batteryPercentageRemaining of 100 when the battery is full (should be 200).
                const dontDividePercentage = model.meta?.battery?.dontDividePercentage;
                let percentage = msg.data.batteryPercentageRemaining;
                percentage = dontDividePercentage ? percentage : percentage / 2;

                result[postfixWithEndpointName("battery", msg, model, meta)] = precisionRound(percentage, 2);
            }
            return result;
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["attributeReport", "readResponse"]>,
    danfoss_icon_regulator: {
        cluster: "haDiagnostic",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (msg.data.danfossSystemStatusCode !== undefined) {
                result[postfixWithEndpointName("system_status_code", msg, model, meta)] =
                    constants.danfossSystemStatusCode[msg.data.danfossSystemStatusCode] !== undefined
                        ? constants.danfossSystemStatusCode[msg.data.danfossSystemStatusCode]
                        : msg.data.danfossSystemStatusCode;
            }
            if (msg.data.danfossHeatSupplyRequest !== undefined) {
                result[postfixWithEndpointName("heat_supply_request", msg, model, meta)] =
                    constants.danfossHeatsupplyRequest[msg.data.danfossHeatSupplyRequest] !== undefined
                        ? constants.danfossHeatsupplyRequest[msg.data.danfossHeatSupplyRequest]
                        : msg.data.danfossHeatSupplyRequest;
            }
            if (msg.data.danfossSystemStatusWater !== undefined) {
                result[postfixWithEndpointName("system_status_water", msg, model, meta)] =
                    constants.danfossSystemStatusWater[msg.data.danfossSystemStatusWater] !== undefined
                        ? constants.danfossSystemStatusWater[msg.data.danfossSystemStatusWater]
                        : msg.data.danfossSystemStatusWater;
            }
            if (msg.data.danfossMultimasterRole !== undefined) {
                result[postfixWithEndpointName("multimaster_role", msg, model, meta)] =
                    constants.danfossMultimasterRole[msg.data.danfossMultimasterRole] !== undefined
                        ? constants.danfossMultimasterRole[msg.data.danfossMultimasterRole]
                        : msg.data.danfossMultimasterRole;
            }
            if (msg.data.danfossIconApplication !== undefined) {
                result[postfixWithEndpointName("icon_application", msg, model, meta)] =
                    constants.danfossIconApplication[msg.data.danfossIconApplication] !== undefined
                        ? constants.danfossIconApplication[msg.data.danfossIconApplication]
                        : msg.data.danfossIconApplication;
            }
            if (msg.data.danfossIconForcedHeatingCooling !== undefined) {
                result[postfixWithEndpointName("icon_forced_heating_cooling", msg, model, meta)] =
                    constants.danfossIconForcedHeatingCooling[msg.data.danfossIconForcedHeatingCooling] !== undefined
                        ? constants.danfossIconForcedHeatingCooling[msg.data.danfossIconForcedHeatingCooling]
                        : msg.data.danfossIconForcedHeatingCooling;
            }
            return result;
        },
    } satisfies Fz.Converter<"haDiagnostic", DanfossHaDiagnostic, ["attributeReport", "readResponse"]>,
    danfoss_icon_hvac_user_interface: {
        cluster: "hvacUserInterfaceCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (msg.data.keypadLockout !== undefined) {
                result[postfixWithEndpointName("keypad_lockout", msg, model, meta)] =
                    constants.keypadLockoutMode[msg.data.keypadLockout] !== undefined
                        ? constants.keypadLockoutMode[msg.data.keypadLockout]
                        : msg.data.keypadLockout;
            }
            if (msg.data.tempDisplayMode !== undefined) {
                result[postfixWithEndpointName("temperature_display_mode", msg, model, meta)] =
                    constants.temperatureDisplayMode[msg.data.tempDisplayMode] !== undefined
                        ? constants.temperatureDisplayMode[msg.data.tempDisplayMode]
                        : msg.data.tempDisplayMode;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacUserInterfaceCfg", DanfossHvacUserInterfaceCfg, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["eTRV0100", "eTRV0101", "eTRV0103", "TRV001", "TRV003", "eT093WRO", "eT093WRG"],
        model: "014G2461",
        vendor: "Danfoss",
        description: "Ally thermostat",
        whiteLabel: [
            {vendor: "Danfoss", model: "014G2463"},
            {vendor: "Hive", model: "UK7004240", description: "Radiator valve", fingerprint: [{modelID: "TRV001"}, {modelID: "TRV003"}]},
            {vendor: "Popp", model: "701721", description: "Smart thermostat", fingerprint: [{modelID: "eT093WRO"}, {modelID: "eT093WRG"}]},
        ],
        ota: true,
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        extend: [
            danfossExtend.addDanfossHvacThermostatCluster(),
            danfossExtend.addDanfossHvacUserInterfaceCfgCluster(),
            danfossExtend.danfossThermostat({
                setpoints: {values: {occupiedHeatingSetpoint: {min: 5, max: 35, step: 0.5}}},
                piHeatingDemand: {values: true},
                systemMode: {values: ["heat"]},
                programmingOperationMode: {values: ["setpoint", "schedule", "schedule_with_preheat", "eco"]},
                // weeklySchedule: {values: ["heat"]},   // gives an error in test:
                // test/checks.test.ts > Check definitions > respect snake case naming conventions for exposes and options
                // Error: Definitions not using snake case for expose/option:
                // Danfoss|014G2461|expose.name=transitionTime
                // Danfoss|014G2461|expose.name=heatSetpoint
                setpointsLimit: {
                    maxHeatSetpointLimit: {min: 5, max: 35, step: 0.5},
                },
            }),
            danfossExtend.absMaxHeatSetpointLimit({
                description: "Absolute Maximum Heating Setpoint Limit for the device. Adjust the 'Max heat setpoint limit' accordingly.",
            }),
            m.battery(),
            danfossExtend.keypadLockout(),
            danfossExtend.danfossMountedModeActive(),
            danfossExtend.danfossMountedModeControl(),
            danfossExtend.danfossThermostatOrientation(),
            danfossExtend.danfossViewingDirection(),
            danfossExtend.danfossHeatAvailable(),
            danfossExtend.danfossHeatRequired(),
            danfossExtend.setpointChangeSource(),
            danfossExtend.danfossExternalMeasuredRoomSensor(),
            danfossExtend.danfossRadiatorCovered(),
            danfossExtend.danfossWindowOpenFeatureEnable(),
            danfossExtend.danfossWindowOpenInternal(),
            danfossExtend.danfossWindowOpenExternal(),
            danfossExtend.danfossDayOfWeek(),
            danfossExtend.danfossTriggerTime2(),
            danfossExtend.danfossAlgorithmScaleFactor(),
            danfossExtend.danfossLoadBalancingEnable(),
            danfossExtend.danfossLoadRoomMean(),
            danfossExtend.danfossLoadEstimate(),
            danfossExtend.danfossPreheatStatus(),
            danfossExtend.danfossAdaptionRunStatus(),
            danfossExtend.danfossAdaptionRunSettings(),
            danfossExtend.danfossAdaptionRunControl(),
            danfossExtend.danfossRegulationSetpointOffset(),
            m.writeTimeDaily({endpointId: 1}),
        ],
        fromZigbee: [fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_clear_weekly_schedule],
    },
    {
        fingerprint: [
            {modelID: "0x0200", manufacturerName: "Danfoss"}, // Icon Basic Main Controller
            {modelID: "0x8020", manufacturerName: "Danfoss"}, // RT24V Display
            {modelID: "0x8021", manufacturerName: "Danfoss"}, // RT24V Display  Floor sensor
            {modelID: "0x8030", manufacturerName: "Danfoss"}, // RTbattery Display
            {modelID: "0x8031", manufacturerName: "Danfoss"}, // RTbattery Display Infrared
            {modelID: "0x8034", manufacturerName: "Danfoss"}, // RTbattery Dial
            {modelID: "0x8035", manufacturerName: "Danfoss"}, // RTbattery Dial Infrared
        ],
        model: "Icon",
        vendor: "Danfoss",
        description: "Icon Main Controller with Zigbee Module, Room Thermostat",
        extend: [danfossExtend.addDanfossHvacThermostatCluster(), danfossExtend.addDanfossHaDiagnosticCluster()],
        fromZigbee: [
            fzLocal.danfoss_icon_battery,
            fz.thermostat,
            fzLocal.danfoss_thermostat,
            fzLocal.danfoss_hvac_ui,
            fzLocal.danfoss_icon_regulator,
            fzLocal.danfoss_icon_floor_sensor,
            fz.temperature,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_system_mode,
            tzLocal.danfoss_room_status_code,
            tzLocal.danfoss_output_status,
            tzLocal.danfoss_floor_sensor_mode,
            tzLocal.danfoss_floor_min_setpoint,
            tzLocal.danfoss_floor_max_setpoint,
            tz.temperature,
            tzLocal.danfoss_system_status_code,
            tzLocal.danfoss_system_status_water,
            tzLocal.danfoss_multimaster_role,
        ],
        meta: {multiEndpoint: true, thermostat: {dontMapPIHeatingDemand: true}},
        endpoint: (device) => {
            return {
                l1: 1,
                l2: 2,
                l3: 3,
                l4: 4,
                l5: 5,
                l6: 6,
                l7: 7,
                l8: 8,
                l9: 9,
                l10: 10,
                l11: 11,
                l12: 12,
                l13: 13,
                l14: 14,
                l15: 15,
                l16: 232,
            };
        },
        exposes: [].concat(
            ((endpointsCount) => {
                const features = [];

                for (let i = 1; i <= endpointsCount; i++) {
                    const epName = `l${i}`;

                    if (i < 16) {
                        features.push(e.battery().withEndpoint(epName));

                        features.push(
                            e
                                .climate()
                                .withSetpoint("occupied_heating_setpoint", 5, 35, 0.5)
                                .withLocalTemperature()
                                .withSystemMode(["heat"])
                                .withRunningState(["idle", "heat"], ea.STATE)
                                .withEndpoint(epName),
                        );

                        features.push(
                            e
                                .numeric("abs_min_heat_setpoint_limit", ea.STATE)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Absolute min temperature allowed on the device"),
                        );
                        features.push(
                            e
                                .numeric("abs_max_heat_setpoint_limit", ea.STATE)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Absolute max temperature allowed on the device"),
                        );

                        features.push(
                            e
                                .numeric("min_heat_setpoint_limit", ea.ALL)
                                .withValueMin(4)
                                .withValueMax(35)
                                .withValueStep(0.5)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Min temperature limit set on the device"),
                        );
                        features.push(
                            e
                                .numeric("max_heat_setpoint_limit", ea.ALL)
                                .withValueMin(4)
                                .withValueMax(35)
                                .withValueStep(0.5)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Max temperature limit set on the device"),
                        );

                        features.push(e.enum("setpoint_change_source", ea.STATE, ["manual", "schedule", "externally"]).withEndpoint(epName));

                        features.push(
                            e.enum("output_status", ea.STATE_GET, ["inactive", "active"]).withEndpoint(epName).withDescription("Actuator status"),
                        );

                        features.push(
                            e
                                .enum("room_status_code", ea.STATE_GET, [
                                    "no_error",
                                    "missing_rt",
                                    "rt_touch_error",
                                    "floor_sensor_short_circuit",
                                    "floor_sensor_disconnected",
                                ])
                                .withEndpoint(epName)
                                .withDescription("Thermostat status"),
                        );

                        features.push(
                            e
                                .enum("room_floor_sensor_mode", ea.STATE_GET, ["comfort", "floor_only", "dual_mode"])
                                .withEndpoint(epName)
                                .withDescription("Floor sensor mode"),
                        );
                        features.push(
                            e
                                .numeric("floor_min_setpoint", ea.ALL)
                                .withValueMin(18)
                                .withValueMax(35)
                                .withValueStep(0.5)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Min floor temperature"),
                        );
                        features.push(
                            e
                                .numeric("floor_max_setpoint", ea.ALL)
                                .withValueMin(18)
                                .withValueMax(35)
                                .withValueStep(0.5)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Max floor temperature"),
                        );

                        features.push(
                            e.numeric("temperature", ea.STATE_GET).withUnit("°C").withEndpoint(epName).withDescription("Floor temperature"),
                        );
                    } else {
                        features.push(
                            e
                                .enum("system_status_code", ea.STATE_GET, [
                                    "no_error",
                                    "missing_expansion_board",
                                    "missing_radio_module",
                                    "missing_command_module",
                                    "missing_master_rail",
                                    "missing_slave_rail_no_1",
                                    "missing_slave_rail_no_2",
                                    "pt1000_input_short_circuit",
                                    "pt1000_input_open_circuit",
                                    "error_on_one_or_more_output",
                                ])
                                .withEndpoint("l16")
                                .withDescription("Main Controller Status"),
                        );
                        features.push(
                            e
                                .enum("system_status_water", ea.STATE_GET, ["hot_water_flow_in_pipes", "cool_water_flow_in_pipes"])
                                .withEndpoint("l16")
                                .withDescription("Main Controller Water Status"),
                        );
                        features.push(
                            e
                                .enum("multimaster_role", ea.STATE_GET, ["invalid_unused", "master", "slave_1", "slave_2"])
                                .withEndpoint("l16")
                                .withDescription("Main Controller Role"),
                        );
                    }
                }

                return features;
            })(16),
        ),
        configure: async (device, coordinatorEndpoint) => {
            const options = {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S};

            for (let i = 1; i <= 15; i++) {
                const endpoint = device.getEndpoint(i);

                if (typeof endpoint !== "undefined") {
                    await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat"]);

                    await reporting.batteryPercentageRemaining(endpoint);
                    await reporting.thermostatTemperature(endpoint);
                    await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
                    await reporting.temperature(endpoint, {change: 10});

                    await endpoint.configureReporting<"hvacThermostat", DanfossHvacThermostat>(
                        "hvacThermostat",
                        [
                            {
                                attribute: "danfossOutputStatus",
                                minimumReportInterval: 0,
                                maximumReportInterval: constants.repInterval.HOUR,
                                reportableChange: 1,
                            },
                        ],
                        options,
                    );

                    await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
                    await endpoint.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", [
                        "localTemp",
                        "occupiedHeatingSetpoint",
                        "setpointChangeSource",
                        "absMinHeatSetpointLimit",
                        "absMaxHeatSetpointLimit",
                        "minHeatSetpointLimit",
                        "maxHeatSetpointLimit",
                        "systemMode",
                    ]);
                    await endpoint.read<"hvacThermostat", DanfossHvacThermostat>(
                        "hvacThermostat",
                        [
                            "danfossRoomStatusCode",
                            "danfossOutputStatus",
                            "danfossRoomFloorSensorMode",
                            "danfossFloorMinSetpoint",
                            "danfossFloorMaxSetpoint",
                        ],
                        options,
                    );
                }
            }

            // Danfoss Icon Main Controller Specific Endpoint
            const mainController = device.getEndpoint(232);

            await reporting.bind(mainController, coordinatorEndpoint, ["haDiagnostic"]);

            await mainController.read<"haDiagnostic", DanfossHaDiagnostic>(
                "haDiagnostic",
                ["danfossSystemStatusCode", "danfossSystemStatusWater", "danfossMultimasterRole"],
                options,
            );
        },
    },
    {
        fingerprint: [
            {modelID: "0x0210", manufacturerName: "Danfoss"}, // Icon2 Basic Main Controller
            {modelID: "0x0211", manufacturerName: "Danfoss"}, // Icon2 Advanced Main Controller
            {modelID: "0x8040", manufacturerName: "Danfoss"}, // Icon2 Room Thermostat
            {modelID: "0x8041", manufacturerName: "Danfoss"}, // Icon2 Featured (Infrared) Room Thermostat
            {modelID: "0x0042", manufacturerName: "Danfoss"}, // Icon2 Sensor
        ],
        model: "Icon2",
        vendor: "Danfoss",
        description: "Icon2 Main Controller, Room Thermostat or Sensor",
        extend: [danfossExtend.addDanfossHvacThermostatCluster(), danfossExtend.addDanfossHaDiagnosticCluster()],
        fromZigbee: [
            fzLocal.danfoss_icon_battery,
            fz.thermostat,
            fzLocal.danfoss_thermostat,
            fzLocal.danfoss_hvac_ui,
            fzLocal.danfoss_icon_floor_sensor,
            fzLocal.danfoss_icon_hvac_user_interface,
            fz.temperature,
            fz.humidity,
            fzLocal.danfoss_icon_regulator,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_system_mode,
            tzLocal.danfoss_room_status_code,
            tzLocal.danfoss_output_status,
            tzLocal.danfoss_floor_sensor_mode,
            tzLocal.danfoss_floor_min_setpoint,
            tzLocal.danfoss_floor_max_setpoint,
            tzLocal.danfoss_schedule_type_used,
            tzLocal.danfoss_icon2_pre_heat,
            tzLocal.danfoss_icon2_pre_heat_status,
            tz.thermostat_keypad_lockout,
            tz.temperature,
            tz.humidity,
            tzLocal.danfoss_system_status_code,
            tzLocal.danfoss_heat_supply_request,
            tzLocal.danfoss_system_status_water,
            tzLocal.danfoss_multimaster_role,
            tzLocal.danfoss_icon_application,
            tzLocal.danfoss_icon_forced_heating_cooling,
        ],
        meta: {multiEndpoint: true, thermostat: {dontMapPIHeatingDemand: true}},
        exposes: [].concat(
            ((endpointsCount) => {
                const features = [];

                for (let i = 1; i <= endpointsCount; i++) {
                    if (i < 16) {
                        const epName = `${i}`;

                        features.push(e.battery().withEndpoint(epName));

                        features.push(
                            e
                                .climate()
                                .withSetpoint("occupied_heating_setpoint", 5, 35, 0.5)
                                .withLocalTemperature()
                                .withSystemMode(["heat"])
                                .withRunningState(["idle", "heat"], ea.STATE)
                                .withEndpoint(epName),
                        );

                        features.push(
                            e
                                .numeric("min_heat_setpoint_limit", ea.ALL)
                                .withValueMin(4)
                                .withValueMax(35)
                                .withValueStep(0.5)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Min temperature limit set on the device"),
                        );
                        features.push(
                            e
                                .numeric("max_heat_setpoint_limit", ea.ALL)
                                .withValueMin(4)
                                .withValueMax(35)
                                .withValueStep(0.5)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Max temperature limit set on the device"),
                        );

                        features.push(e.enum("setpoint_change_source", ea.STATE, ["manual", "schedule", "externally"]).withEndpoint(epName));

                        features.push(
                            e.enum("output_status", ea.STATE_GET, ["inactive", "active"]).withEndpoint(epName).withDescription("Actuator status"),
                        );

                        features.push(
                            e
                                .enum("room_status_code", ea.STATE_GET, [
                                    "no_error",
                                    "missing_rt",
                                    "rt_touch_error",
                                    "floor_sensor_short_circuit",
                                    "floor_sensor_disconnected",
                                ])
                                .withEndpoint(epName)
                                .withDescription("Thermostat status"),
                        );

                        features.push(
                            e
                                .enum("room_floor_sensor_mode", ea.STATE_GET, ["comfort", "floor_only", "dual_mode"])
                                .withEndpoint(epName)
                                .withDescription("Floor sensor mode"),
                        );
                        features.push(
                            e
                                .numeric("floor_min_setpoint", ea.ALL)
                                .withValueMin(18)
                                .withValueMax(35)
                                .withValueStep(0.5)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Min floor temperature"),
                        );
                        features.push(
                            e
                                .numeric("floor_max_setpoint", ea.ALL)
                                .withValueMin(18)
                                .withValueMax(35)
                                .withValueStep(0.5)
                                .withUnit("°C")
                                .withEndpoint(epName)
                                .withDescription("Max floor temperature"),
                        );

                        features.push(
                            e
                                .enum("schedule_type_used", ea.STATE_GET, ["regular_schedule_selected", "vacation_schedule_selected"])
                                .withEndpoint(epName)
                                .withDescription("Danfoss schedule mode"),
                        );

                        features.push(
                            e
                                .enum("icon2_pre_heat", ea.STATE_GET, ["disable", "enable"])
                                .withEndpoint(epName)
                                .withDescription("Danfoss pre heat control"),
                        );

                        features.push(
                            e
                                .enum("icon2_pre_heat_status", ea.STATE_GET, ["disable", "enable"])
                                .withEndpoint(epName)
                                .withDescription("Danfoss pre heat status"),
                        );

                        features.push(
                            e.numeric("temperature", ea.STATE_GET).withUnit("°C").withEndpoint(epName).withDescription("Floor temperature"),
                        );

                        features.push(e.numeric("humidity", ea.STATE_GET).withUnit("%").withEndpoint(epName).withDescription("Humidity"));
                    } else {
                        features.push(
                            e
                                .enum("system_status_code", ea.STATE_GET, [
                                    "no_error",
                                    "missing_expansion_board",
                                    "missing_radio_module",
                                    "missing_command_module",
                                    "missing_master_rail",
                                    "missing_slave_rail_no_1",
                                    "missing_slave_rail_no_2",
                                    "pt1000_input_short_circuit",
                                    "pt1000_input_open_circuit",
                                    "error_on_one_or_more_output",
                                ])
                                .withEndpoint("232")
                                .withDescription("Main Controller Status"),
                        );
                        features.push(
                            e
                                .enum("heat_supply_request", ea.STATE_GET, ["none", "heat_supply_request"])
                                .withEndpoint("232")
                                .withDescription("Danfoss heat supply request"),
                        );
                        features.push(
                            e
                                .enum("system_status_water", ea.STATE_GET, ["hot_water_flow_in_pipes", "cool_water_flow_in_pipes"])
                                .withEndpoint("232")
                                .withDescription("Main Controller Water Status"),
                        );
                        features.push(
                            e
                                .enum("multimaster_role", ea.STATE_GET, ["invalid_unused", "master", "slave_1", "slave_2"])
                                .withEndpoint("232")
                                .withDescription("Main Controller Role"),
                        );
                        features.push(
                            e
                                .enum("icon_application", ea.STATE_GET, [
                                    "1",
                                    "2",
                                    "3",
                                    "4",
                                    "5",
                                    "6",
                                    "7",
                                    "8",
                                    "9",
                                    "10",
                                    "11",
                                    "12",
                                    "13",
                                    "14",
                                    "15",
                                    "16",
                                    "17",
                                    "18",
                                    "19",
                                    "20",
                                ])
                                .withEndpoint("232")
                                .withDescription("Main Controller application"),
                        );
                        features.push(
                            e
                                .enum("icon_forced_heating_cooling", ea.STATE_GET, ["force_heating", "force_cooling", "none"])
                                .withEndpoint("232")
                                .withDescription("Main Controller application"),
                        );
                    }
                }

                return features;
            })(16),
        ),
        configure: async (device, coordinatorEndpoint) => {
            const options = {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S};

            // Danfoss Icon2 Main Controller Specific Endpoint
            const mainController = device.getEndpoint(232);

            for (let i = 1; i <= 15; i++) {
                const endpoint = device.getEndpoint(i);

                if (typeof endpoint === "undefined") {
                    continue;
                }

                await reporting.bind(endpoint, coordinatorEndpoint, [
                    "genPowerCfg",
                    "hvacThermostat",
                    "hvacUserInterfaceCfg",
                    "msTemperatureMeasurement",
                    "msRelativeHumidity",
                ]);

                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.thermostatTemperature(endpoint);
                await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
                await reporting.temperature(endpoint, {change: 10});
                await reporting.humidity(endpoint);

                await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
                await endpoint.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", [
                    "localTemp",
                    "occupiedHeatingSetpoint",
                    "minHeatSetpointLimit",
                    "maxHeatSetpointLimit",
                    "systemMode",
                ]);
                await endpoint.read<"hvacThermostat", DanfossHvacThermostat>(
                    "hvacThermostat",
                    ["danfossRoomFloorSensorMode", "danfossFloorMinSetpoint", "danfossFloorMaxSetpoint"],
                    options,
                );
                await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
                await endpoint.read("msTemperatureMeasurement", ["measuredValue"]);
                await endpoint.read("msRelativeHumidity", ["measuredValue"]);

                // Different attributes depending on if it's Main Сontroller or a single thermostat
                if (typeof mainController === "undefined") {
                    await endpoint.read("genBasic", ["modelId", "powerSource"]);
                } else {
                    await endpoint.configureReporting<"hvacThermostat", DanfossHvacThermostat>(
                        "hvacThermostat",
                        [
                            {
                                attribute: "danfossOutputStatus",
                                minimumReportInterval: 0,
                                maximumReportInterval: constants.repInterval.HOUR,
                                reportableChange: 1,
                            },
                        ],
                        options,
                    );

                    await endpoint.read<"hvacThermostat", DanfossHvacThermostat>("hvacThermostat", ["setpointChangeSource"]);
                    await endpoint.read<"hvacThermostat", DanfossHvacThermostat>(
                        "hvacThermostat",
                        ["danfossRoomStatusCode", "danfossOutputStatus"],
                        options,
                    );
                }
            }

            // Danfoss Icon2 Main Controller Specific
            if (typeof mainController !== "undefined") {
                await reporting.bind(mainController, coordinatorEndpoint, ["genBasic", "haDiagnostic"]);

                await mainController.read("genBasic", ["modelId", "powerSource", "appVersion", "stackVersion", "hwVersion", "dateCode"]);

                await mainController.read<"haDiagnostic", DanfossHaDiagnostic>(
                    "haDiagnostic",
                    [
                        "danfossSystemStatusCode",
                        "danfossHeatSupplyRequest",
                        "danfossSystemStatusWater",
                        "danfossMultimasterRole",
                        "danfossIconApplication",
                        "danfossIconForcedHeatingCooling",
                    ],
                    options,
                );
            }
        },
    },
];
