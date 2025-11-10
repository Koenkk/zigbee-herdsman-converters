import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SPZB0001"],
        model: "SPZB0001",
        vendor: "Eurotronic",
        description: "Spirit Zigbee wireless heater thermostat",
        fromZigbee: [fz.eurotronic_thermostat, fz.battery],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.eurotronic_host_flags,
            tz.eurotronic_error_status,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_remote_sensing,
            tz.thermostat_local_temperature,
            tz.thermostat_running_state,
            tz.eurotronic_current_heating_setpoint,
            tz.eurotronic_trv_mode,
            tz.eurotronic_valve_position,
            tz.eurotronic_child_lock,
            tz.eurotronic_mirror_display,
        ],
        exposes: [
            e.battery(),
            e.child_lock(),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"])
                .withLocalTemperatureCalibration()
                .withPiHeatingDemand(),
            e
                .enum("trv_mode", exposes.access.ALL, [1, 2])
                .withDescription(
                    "Select between direct control of the valve via the `valve_position` or automatic control of the valve based on the `current_heating_setpoint`. For manual control set the value to 1, for automatic control set the value to 2 (the default). When switched to manual mode the display shows a value from 0 (valve closed) to 100 (valve fully open) and the buttons on the device are disabled.",
                ),
            e
                .numeric("valve_position", exposes.access.ALL)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    "Directly control the radiator valve when `trv_mode` is set to 1. The values range from 0 (valve closed) to 255 (valve fully open)",
                ),
            e
                .binary("mirror_display", ea.ALL, "ON", "OFF")
                .withDescription("Mirror display of the thermostat. Useful when it is mounted in a way where the display is presented upside down."),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.NXP_SEMICONDUCTORS};
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x4003, type: 41},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 25,
                    },
                ],
                options,
            );
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x4008, type: 34},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 1,
                    },
                ],
                options,
            );
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: constants.repInterval.MAX, change: 1});
        },
    },
    {
        fingerprint: [
            {modelID: "SPZB0001", manufacturerName: "Eurotronic", dateCode: "20221110"},
            {modelID: "SPZB0001", manufacturerName: "Eurotronic", dateCode: "20240821"},
            {modelID: "SPZB0001", manufacturerName: "Eurotronic", dateCode: "20241105"},
            {modelID: "SPZB0001", manufacturerName: "Eurotronic", dateCode: "20240315"},
            {modelID: "SPZB0001", manufacturerName: "Eurotronic", dateCode: "20231019"},
        ],
        model: "COZB0001",
        vendor: "Eurotronic",
        description: "Comet Zigbee wireless heater thermostat",
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        fromZigbee: [fz.eurotronic_thermostat, fz.battery],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.eurotronic_host_flags,
            tz.eurotronic_error_status,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_remote_sensing,
            tz.thermostat_local_temperature,
            tz.thermostat_running_state,
            tz.eurotronic_current_heating_setpoint,
            tz.eurotronic_trv_mode,
            tz.eurotronic_valve_position,
            tz.eurotronic_child_lock,
            tz.eurotronic_mirror_display,
        ],
        exposes: [
            e.battery(),
            e.child_lock(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 8, 28, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"])
                .withLocalTemperatureCalibration()
                .withPiHeatingDemand(),
            e
                .enum("trv_mode", exposes.access.ALL, [1, 2])
                .withDescription(
                    "Select between direct control of the valve via the `valve_position` or automatic control of the valve based on the `current_heating_setpoint`. For manual control set the value to 1, for automatic control set the value to 2 (the default). When switched to manual mode the display shows a value from 0 (valve closed) to 100 (valve fully open) and the buttons on the device are disabled.",
                ),
            e
                .numeric("valve_position", exposes.access.ALL)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    "Directly control the radiator valve when `trv_mode` is set to 1. The values range from 0 (valve closed) to 255 (valve fully open)",
                ),
            e
                .binary("mirror_display", ea.ALL, "ON", "OFF")
                .withDescription("Mirror display of the thermostat. Useful when it is mounted in a way where the display is presented upside down."),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.NXP_SEMICONDUCTORS};
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x4003, type: 41},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 25,
                    },
                ],
                options,
            );
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x4008, type: 34},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 1,
                    },
                ],
                options,
            );
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 86400, change: 1});
        },
    },
    {
        zigbeeModel: ["CoZB_dha"],
        model: "CoZB_dha",
        vendor: "Eurotronic",
        description: "Comet Zero Zigbee Zigbee wireless heater thermostat",
        fromZigbee: [fz.eurotronic_thermostat, fz.battery],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.eurotronic_host_flags,
            tz.eurotronic_error_status,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_remote_sensing,
            tz.thermostat_local_temperature,
            tz.thermostat_running_state,
            tz.eurotronic_current_heating_setpoint,
            tz.eurotronic_trv_mode,
            tz.eurotronic_valve_position,
            tz.eurotronic_child_lock,
            tz.eurotronic_mirror_display,
        ],
        exposes: [
            e.battery(),
            e.child_lock(),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"])
                .withLocalTemperatureCalibration()
                .withPiHeatingDemand(),
            e
                .enum("trv_mode", exposes.access.ALL, [1, 2])
                .withDescription(
                    "Select between direct control of the valve via the `valve_position` or automatic control of the valve based on the `current_heating_setpoint`. For manual control set the value to 1, for automatic control set the value to 2 (the default). When switched to manual mode the display shows a value from 0 (valve closed) to 100 (valve fully open) and the buttons on the device are disabled.",
                ),
            e
                .numeric("valve_position", exposes.access.ALL)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    "Directly control the radiator valve when `trv_mode` is set to 1. The values range from 0 (valve closed) to 255 (valve fully open)",
                ),
            e
                .binary("mirror_display", ea.ALL, "ON", "OFF")
                .withDescription("Mirror display of the thermostat. Useful when it is mounted in a way where the display is presented upside down."),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.NXP_SEMICONDUCTORS};
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x4003, type: 41},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 25,
                    },
                ],
                options,
            );
            await endpoint.configureReporting(
                "hvacThermostat",
                [
                    {
                        attribute: {ID: 0x4008, type: 34},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 1,
                    },
                ],
                options,
            );
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 86400, change: 1});
        },
    },
];
