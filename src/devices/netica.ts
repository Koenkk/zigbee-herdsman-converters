import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const manufacturerOptions = {
    // no official manufacturer code yet
    manufacturerCode: Zcl.ManufacturerCode.RESERVED_10,
};

interface FreezBeeThermostat {
    attributes: {
        /** ID: 0x4000 | Type: INT16 */
        remoteTemperature: number;
        /** ID: 0x4001 | Type: BOOLEAN */
        useRemoteTemperature: boolean;
        /** ID: 0x4002 | Type: INT16 */
        targetWaterTemperature: number;
    };
    commands: never;
    commandResponses: never;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["FRZ1"],
        model: "FRZ1",
        vendor: "Netica",
        description: "FreezBee, a smart thermostat designed to operate with Frisquet boilers",
        ota: true,
        extend: [
            // standard attributes
            m.temperature(),
            m.humidity(),
            m.thermostat({
                localTemperature: {
                    values: {
                        description: "Perceived room temperature. Can be measured on the device or defined using the remote temperature attribute.",
                    },
                },
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 30, step: 0.5},
                    },
                },
                ctrlSeqeOfOper: {
                    values: ["heating_only"],
                },
                runningState: {
                    values: ["idle", "heat"],
                },
                systemMode: {
                    values: ["off", "heat"],
                },
            }),
            // custom attributes
            m.deviceAddCustomCluster("hvacThermostat", {
                name: "hvacThermostat",
                ID: Zcl.Clusters.hvacThermostat.ID,
                attributes: {
                    remoteTemperature: {
                        name: "remoteTemperature",
                        ID: 0x4000,
                        manufacturerCode: manufacturerOptions.manufacturerCode,
                        type: Zcl.DataType.INT16,
                        min: -32768,
                        max: 32767,
                        write: true,
                    },
                    useRemoteTemperature: {
                        name: "useRemoteTemperature",
                        ID: 0x4001,
                        manufacturerCode: manufacturerOptions.manufacturerCode,
                        type: Zcl.DataType.BOOLEAN,
                        write: true,
                    },
                    targetWaterTemperature: {
                        name: "targetWaterTemperature",
                        ID: 0x4002,
                        manufacturerCode: manufacturerOptions.manufacturerCode,
                        type: Zcl.DataType.INT16,
                        min: -32768,
                        max: 32767,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            // UI
            m.numeric<"hvacThermostat", FreezBeeThermostat>({
                cluster: "hvacThermostat",
                attribute: "remoteTemperature",
                name: "remote_temperature",
                label: "Remote temperature",
                entityCategory: "config",
                description:
                    "The value of a remote temperature sensor. " +
                    "Note: synchronisation of this value with the remote temperature sensor " +
                    "needs to happen outside of Zigbee2MQTT.",
                valueMin: 0.0,
                valueMax: 99.9,
                valueStep: 0.1,
                unit: "°C",
                scale: 100,
                precision: 1,
            }),
            m.binary<"hvacThermostat", FreezBeeThermostat>({
                cluster: "hvacThermostat",
                attribute: "useRemoteTemperature",
                name: "use_remote_temperature",
                entityCategory: "config",
                description:
                    "Whether to use the value of the internal temperature sensor " +
                    "or a remote temperature sensor for the perceived room temperature.",
                valueOff: ["OFF", 0x00],
                valueOn: ["ON", 0x01],
            }),
            m.numeric<"hvacThermostat", FreezBeeThermostat>({
                cluster: "hvacThermostat",
                attribute: "targetWaterTemperature",
                name: "target_water_temperature",
                label: "Target water temperature",
                access: "STATE_GET",
                entityCategory: "diagnostic",
                description: "Target water temperature in the heating circuit.",
                valueMin: 0.0,
                valueMax: 99.9,
                valueStep: 0.1,
                unit: "°C",
                scale: 100,
                precision: 1,
            }),
        ],
    },
];
