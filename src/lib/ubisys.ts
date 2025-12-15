import {Zcl} from "zigbee-herdsman";
import type {Struct, ZclArray} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import {presets as e, access as ea} from "./exposes";
import {logger} from "./logger";
import {type BinaryArgs, binary, deviceAddCustomCluster, type NumericArgs, numeric, setupConfigureForReporting} from "./modernExtend";
import type {Configure, Fz, ModernExtend, Tz, Zh} from "./types";

const NS = "zhc:ubisys";

interface UbisysHvacThermostat {
    attributes: {
        ubisysClassBTemperatureOffset: number;
        ubisysReturnFlowTemperatureWeight: number;
        ubisysRawOutdoorTemperature: Struct;
        ubisysRawLocalTemperatureA: Struct;
        ubisysRawLocalTemperatureB: Struct;
        ubisysRawForwardFlowTemperature: Struct;
        ubisysRawReturnFlowTemperature: Struct;
        ubisysInstalledExtensions: bigint;
        ubisysTemperatureOffset: number;
        ubisysDefaultOccupiedHeatingSetpoint: number;
        ubisysVacationMode: number;
        ubisysRemoteTemperature: number;
        ubisysRemoteTemperatureValidDuration: number;
        ubisysDetectOpenWindow: number;
        ubisysOpenWindowState: number;
        ubisysOpenWindowSensitivity: number;
        ubisysOpenWindowDetectionPeriod: number;
        ubisysOpenWindowTimeout: number;
        ubisysProportionalGain: number;
        ubisysProportionalShift: number;
        ubisysIntegralFactor: number;
    };
    commands: never;
    commandResponses: never;
}
export interface UbisysGenLevelCtrl {
    attributes: {
        ubisysMinimumOnLevel: number;
        ubisysValveType: number;
        ubisysCyclePeriod: number;
        ubisysSeason: number;
        ubisysBackupLevel: number;
        ubisysAlternateBackupLevel: number;
        ubisysLowerRange: number;
        ubisysUpperRange: number;
        ubisysPumpThresholdOn: number;
        ubisysPumpThresholdOff: number;
        ubisysHeatingDemandEnableThreshold: number;
        ubisysHeatingDemandDisableThreshold: number;
        ubisysCoolingDemandEnableThreshold: number;
        ubisysCoolingDemandDisableThreshold: number;
    };
    commands: never;
    commandResponses: never;
}
export interface UbisysClosuresWindowCovering {
    attributes: {
        ubisysTurnaroundGuardTime: number;
        ubisysLiftToTiltTransitionSteps: number;
        ubisysTotalSteps: number;
        ubisysLiftToTiltTransitionSteps2: number;
        ubisysTotalSteps2: number;
        ubisysAdditionalSteps: number;
        ubisysInactivePowerThreshold: number;
        ubisysStartupSteps: number;
    };
    commands: never;
    commandResponses: never;
}
export interface UbisysDeviceSetup {
    attributes: {
        inputConfigurations: ZclArray | unknown[];
        inputActions: ZclArray | unknown[];
    };
    commands: never;
    commandResponses: never;
}
export interface UbisysDimmerSetup {
    attributes: {
        capabilities: number;
        status: number;
        mode: number;
    };
    commands: never;
    commandResponses: never;
}

export const ubisysModernExtend = {
    pollCurrentSummDelivered: (endpointId: number | ((device: Zh.Device) => number)): ModernExtend => {
        return m.poll({
            key: "measurement",
            defaultIntervalSeconds: 60,
            option: exposes.options.measurement_poll_interval(),
            poll: async (device) => {
                const endpoint = device.getEndpoint(typeof endpointId === "number" ? endpointId : endpointId(device));
                await endpoint.read("seMetering", ["currentSummDelivered"]);
            },
        });
    },
    addCustomClusterHvacThermostat: () =>
        deviceAddCustomCluster("hvacThermostat", {
            ID: 0x0201,
            attributes: {
                // H10
                ubisysClassBTemperatureOffset: {
                    ID: 0x0000,
                    type: Zcl.DataType.INT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    min: -128,
                },
                ubisysReturnFlowTemperatureWeight: {
                    ID: 0x0001,
                    type: Zcl.DataType.INT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    min: -128,
                },
                ubisysRawOutdoorTemperature: {
                    ID: 0x0002,
                    type: Zcl.DataType.STRUCT,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                },
                ubisysRawLocalTemperatureA: {
                    ID: 0x0003,
                    type: Zcl.DataType.STRUCT,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                },
                ubisysRawLocalTemperatureB: {
                    ID: 0x0004,
                    type: Zcl.DataType.STRUCT,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                },
                ubisysRawForwardFlowTemperature: {
                    ID: 0x0005,
                    type: Zcl.DataType.STRUCT,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                },
                ubisysRawReturnFlowTemperature: {
                    ID: 0x0006,
                    type: Zcl.DataType.STRUCT,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                },
                ubisysInstalledExtensions: {
                    ID: 0x0007,
                    type: Zcl.DataType.BITMAP64,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                },
                // H1
                ubisysTemperatureOffset: {
                    ID: 0x0010,
                    type: Zcl.DataType.INT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    min: -128,
                },
                ubisysDefaultOccupiedHeatingSetpoint: {
                    ID: 0x0011,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    min: -32768,
                },
                ubisysVacationMode: {
                    ID: 0x0012,
                    type: Zcl.DataType.BOOLEAN,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                },
                ubisysRemoteTemperature: {
                    ID: 0x0013,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    min: -32768,
                },
                ubisysRemoteTemperatureValidDuration: {
                    ID: 0x0014,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xff,
                },
                ubisysDetectOpenWindow: {
                    ID: 0x0015,
                    type: Zcl.DataType.BITMAP8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                },
                ubisysOpenWindowState: {
                    ID: 0x0016,
                    type: Zcl.DataType.BITMAP8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                },
                ubisysOpenWindowSensitivity: {
                    ID: 0x0017,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xffff,
                },
                ubisysOpenWindowDetectionPeriod: {
                    ID: 0x0018,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xffff,
                },
                ubisysOpenWindowTimeout: {
                    ID: 0x0019,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xffff,
                },
                ubisysProportionalGain: {
                    ID: 0x0020,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    min: -32768,
                },
                ubisysProportionalShift: {
                    ID: 0x0021,
                    type: Zcl.DataType.INT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    min: -128,
                },
                ubisysIntegralFactor: {
                    ID: 0x0022,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    min: -32768,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    addCustomClusterGenLevelCtrl: () =>
        deviceAddCustomCluster("genLevelCtrl", {
            ID: 0x0008,
            attributes: {
                // D1(-R)
                ubisysMinimumOnLevel: {
                    ID: 0x0000,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                // H10
                ubisysValveType: {
                    ID: 0x0001,
                    type: Zcl.DataType.BITMAP8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                },
                ubisysCyclePeriod: {
                    ID: 0x0002,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysSeason: {
                    ID: 0x0003,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysBackupLevel: {
                    ID: 0x0004,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysAlternateBackupLevel: {
                    ID: 0x0005,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysLowerRange: {
                    ID: 0x0006,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysUpperRange: {
                    ID: 0x0007,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysPumpThresholdOn: {
                    ID: 0x0008,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysPumpThresholdOff: {
                    ID: 0x0009,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysHeatingDemandEnableThreshold: {
                    ID: 0x000a,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xff,
                },
                ubisysHeatingDemandDisableThreshold: {
                    ID: 0x000b,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xff,
                },
                ubisysCoolingDemandEnableThreshold: {
                    ID: 0x000c,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xff,
                },
                ubisysCoolingDemandDisableThreshold: {
                    ID: 0x000d,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xff,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    addCustomClusterClosuresWindowCovering: () =>
        deviceAddCustomCluster("closuresWindowCovering", {
            ID: 0x0102,
            attributes: {
                // J1(-R)
                ubisysTurnaroundGuardTime: {
                    ID: 0x1000,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysLiftToTiltTransitionSteps: {
                    ID: 0x1001,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xffff,
                },
                ubisysTotalSteps: {
                    ID: 0x1002,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xffff,
                },
                ubisysLiftToTiltTransitionSteps2: {
                    ID: 0x1003,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xffff,
                },
                ubisysTotalSteps2: {
                    ID: 0x1004,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xffff,
                },
                ubisysAdditionalSteps: {
                    ID: 0x1005,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xff,
                },
                ubisysInactivePowerThreshold: {
                    ID: 0x1006,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,

                    write: true,
                    max: 0xffff,
                },
                ubisysStartupSteps: {
                    ID: 0x1007,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
                    write: true,
                    max: 0xffff,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    addCustomClusterManuSpecificUbisysDeviceSetup: () =>
        deviceAddCustomCluster("manuSpecificUbisysDeviceSetup", {
            ID: 0xfc00,
            // XXX: once we moved all manuSpecific ones out of zh, we should revisit this
            // Doesn't use manufacturerCode: https://github.com/Koenkk/zigbee-herdsman-converters/pull/4412
            attributes: {
                inputConfigurations: {ID: 0x0000, type: Zcl.DataType.ARRAY, write: true},
                inputActions: {ID: 0x0001, type: Zcl.DataType.ARRAY, write: true},
            },
            commands: {},
            commandsResponse: {},
        }),
    addCustomClusterManuSpecificUbisysDimmerSetup: () =>
        deviceAddCustomCluster("manuSpecificUbisysDimmerSetup", {
            ID: 0xfc01,
            manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH,
            attributes: {
                capabilities: {ID: 0x0000, type: Zcl.DataType.BITMAP8, write: true},
                status: {ID: 0x0001, type: Zcl.DataType.BITMAP8, write: true},
                mode: {ID: 0x0002, type: Zcl.DataType.BITMAP8, write: true},
            },
            commands: {},
            commandsResponse: {},
        }),
    localTemperatureOffset: (args?: Partial<NumericArgs<"hvacThermostat", UbisysHvacThermostat>>) =>
        numeric<"hvacThermostat", UbisysHvacThermostat>({
            name: "local_temperature_offset",
            cluster: "hvacThermostat",
            attribute: "ubisysTemperatureOffset",
            entityCategory: "config",
            description: "Specifies the temperature offset for the locally measured temperature value.",
            valueMin: -10,
            valueMax: 10,
            unit: "ºC",
            ...args,
        }),
    occupiedHeatingSetpointDefault: (args?: Partial<NumericArgs<"hvacThermostat", UbisysHvacThermostat>>) =>
        numeric<"hvacThermostat", UbisysHvacThermostat>({
            name: "occupied_heating_default_setpoint",
            cluster: "hvacThermostat",
            attribute: "ubisysDefaultOccupiedHeatingSetpoint",
            entityCategory: "config",
            description:
                "Specifies the default heating setpoint during occupancy, " +
                "representing the targeted temperature when a recurring weekly schedule ends without a follow-up schedule.",
            scale: 100,
            valueStep: 0.5, // H1 interface uses 0.5 step
            valueMin: 7,
            valueMax: 30,
            unit: "ºC",
            ...args,
        }),
    remoteTemperatureDuration: (args?: Partial<NumericArgs<"hvacThermostat", UbisysHvacThermostat>>) =>
        numeric<"hvacThermostat", UbisysHvacThermostat>({
            name: "remote_temperature_duration",
            cluster: "hvacThermostat",
            attribute: "ubisysRemoteTemperatureValidDuration",
            entityCategory: "config",
            description:
                "Specifies the duration period in seconds, during which a remotely measured temperature value " +
                "remains valid since its reception as attribute report.",
            valueMin: 0,
            valueMax: 86400,
            unit: "s",
            ...args,
        }),
    vacationMode: (): ModernExtend => {
        const clusterName = "hvacThermostat" as const;
        const writeableAttributeName = "ubisysVacationMode" as const;
        const readableAttributeName = "occupancy" as const;
        const propertyName = "vacation_mode" as const;
        const access = ea.ALL;

        const expose = e
            .binary(propertyName, access, true, false)
            .withDescription("When Vacation Mode is active the schedule is disabled and unoccupied_heating_setpoint is used.");

        const fromZigbee = [
            {
                cluster: clusterName,
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data[readableAttributeName] !== undefined) {
                        return {[propertyName]: msg.data.occupancy === 0};
                    }
                },
            } satisfies Fz.Converter<typeof clusterName, undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: [propertyName],
                convertSet: async (entity, key, value, meta) => {
                    if (typeof value === "boolean") {
                        await entity.write<typeof clusterName, UbisysHvacThermostat>(
                            clusterName,
                            {[writeableAttributeName]: value ? 1 : 0},
                            {manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH},
                        );
                    } else {
                        logger.error(`${propertyName} must be a boolean!`, NS);
                    }
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read(clusterName, [readableAttributeName]);
                },
            },
        ];

        const configure: Configure[] = [
            setupConfigureForReporting(clusterName, readableAttributeName, {config: {min: 0, max: "1_HOUR", change: 0}, access}),
        ];

        return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
    },
    openWindowState: (args?: Partial<BinaryArgs<"hvacThermostat", UbisysHvacThermostat>>) =>
        binary<"hvacThermostat", UbisysHvacThermostat>({
            name: "open_window_state",
            cluster: "hvacThermostat",
            attribute: "ubisysOpenWindowState",
            access: "STATE_GET",
            valueOn: [true, 1],
            valueOff: [false, 0],
            description: "Presents the currently detected window state.",
            ...args,
        }),
    openWindowDetect: (args?: Partial<BinaryArgs<"hvacThermostat", UbisysHvacThermostat>>) =>
        binary<"hvacThermostat", UbisysHvacThermostat>({
            name: "open_window_detect",
            cluster: "hvacThermostat",
            attribute: "ubisysDetectOpenWindow",
            entityCategory: "config",
            valueOn: [true, 1],
            valueOff: [false, 0],
            description: "Specifies whether the Open Window Detection is activated or deactivated.",
            ...args,
        }),
    openWindowTimeout: (args?: Partial<NumericArgs<"hvacThermostat", UbisysHvacThermostat>>) =>
        numeric<"hvacThermostat", UbisysHvacThermostat>({
            name: "open_window_timeout",
            cluster: "hvacThermostat",
            attribute: "ubisysOpenWindowTimeout",
            entityCategory: "config",
            description:
                "Specifies the maximum time duration in seconds for a detected open-window state. This attribute " +
                "effectively defines how long a detected open-window state should last before H1 returns back to " +
                "its default set point settings.",
            valueMin: 0,
            valueMax: 86400,
            unit: "s",
            ...args,
        }),
    openWindowDetectionPeriod: (args?: Partial<NumericArgs<"hvacThermostat", UbisysHvacThermostat>>) =>
        numeric<"hvacThermostat", UbisysHvacThermostat>({
            name: "open_window_detection_periode",
            cluster: "hvacThermostat",
            attribute: "ubisysOpenWindowDetectionPeriod",
            entityCategory: "config",
            description:
                "Specifies the time duration in minutes, within which the sharp temperature change must have taken " +
                "place for the open window detection.",
            valueMin: 1,
            valueMax: 180,
            unit: "m",
            ...args,
        }),
    openWindowSensitivity: (args?: Partial<NumericArgs<"hvacThermostat", UbisysHvacThermostat>>) =>
        numeric<"hvacThermostat", UbisysHvacThermostat>({
            name: "open_window_sensitivity",
            cluster: "hvacThermostat",
            attribute: "ubisysOpenWindowSensitivity",
            entityCategory: "config",
            description:
                "Specifies the temperature change threshold for the Open Window Detection. This is the point at " +
                "which the H1 detects a significant temperature change indicating the detection of an open or " +
                "closed window.",
            scale: 100,
            valueStep: 0.5, // H1 interface uses 0.5 step
            valueMin: 1,
            valueMax: 30,
            unit: "ºC",
            ...args,
        }),
};
