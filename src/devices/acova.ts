import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: [
            "ALCANTARA2 D1.00P1.01Z1.00\u0000\u0000\u0000\u0000\u0000\u0000",
            "ALCANTARA2 D1.00P1.02Z1.00\u0000\u0000\u0000\u0000\u0000\u0000",
        ],
        model: "ALCANTARA2",
        vendor: "Acova",
        description: "Alcantara 2 heater",
        fromZigbee: [fz.thermostat, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_running_state,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 7, 28, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 7, 28, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "auto"])
                .withRunningState(["idle", "heat"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
        },
    },
    {
        zigbeeModel: ["ALCANTARA3"],
        model: "ALCANTARA3",
        vendor: "Acova",
        description: "Alcantara 3 heater",
        fromZigbee: [fz.thermostat, fz.hvac_user_interface, fz.electrical_measurement],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_running_state,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 7, 28, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 7, 28, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "auto"])
                .withRunningState(["idle", "heat"]),
            e.power_apparent(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat", "haElectricalMeasurement"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.apparentPower(endpoint);
        },
    },
    {
        zigbeeModel: [
            "PERCALE2 D1.00P1.01Z1.00",
            "PERCALE2 D1.00P1.02Z1.00",
            "PERCALE2 D1.00P1.03Z1.00",
            "TAFFETAS2 D1.00P1.01Z1.00\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "TAFFETAS2 D1.00P1.02Z1.00\u0000\u0000\u0000\u0000\u0000\u0000\u0000",
            "TAFFETAS2 D1.00P1.03Z1.00",
            "TAFFETAS2 D1.00P1.63Z1.19",
        ],
        model: "TAFFETAS2/PERCALE2",
        vendor: "Acova",
        description: "Taffetas 2 / Percale 2 heater",
        fromZigbee: [fz.thermostat, fz.hvac_user_interface, fz.occupancy],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.acova_thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature_calibration,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 7, 28, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 7, 28, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "auto"])
                .withRunningState(["idle", "heat"])
                .withLocalTemperatureCalibration(),
            e.occupancy(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat"]);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msOccupancySensing"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureCalibration(endpoint);
            await reporting.occupancy(endpoint2);
        },
    },
    {
        zigbeeModel: ["IHC-Enki"],
        model: "IHC-Enki",
        vendor: "Acova",
        description: "Acova Madras IHC towel radiator (Zigbee thermostat)",
        extend: [
            m.thermostat({
                setpoints: {values: {occupiedHeatingSetpoint: {min: 7, max: 30, step: 0.5}}},
                localTemperatureCalibration: {values: {min: -5, max: 5, step: 0.1}},
                systemMode: {values: ["off", "heat", "auto"]},
            }),
        ],
    },
];
