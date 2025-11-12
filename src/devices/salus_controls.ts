import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

interface Salus {
    attributes: {
        frostSetpoint: number;
        minFrostSetpoint: number;
        maxFrostSetpoint: number;
        timeDisplayFormat: number;
        attr4: number;
        attr5: number;
        attr6: number;
        attr7: number;
        autoCoolingSetpoint: number;
        autoHeatingSetpoint: number;
        holdType: number;
        shortCycleProtection: number;
        coolingFanDelay: number;
        ruleCoolingSetpoint: number;
        ruleHeatingSetpoint: number;
        attr15: number;
    };
    commands: {
        resetDevice: Record<string, never>;
    };
    commandResponses: never;
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SPE600"],
        model: "SPE600",
        vendor: "Salus Controls",
        description: "Smart plug (EU socket)",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SP600"],
        model: "SP600",
        vendor: "Salus Controls",
        description: "Smart plug (UK socket)",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering", fzMetering: fz.SP600_power})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SX885ZB"],
        model: "SX885ZB",
        vendor: "Salus Controls",
        description: "miniSmartPlug",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SR600"],
        model: "SR600",
        vendor: "Salus Controls",
        description: "Relay switch",
        extend: [m.onOff({ota: {manufacturerName: "SalusControls"}})],
    },
    {
        zigbeeModel: ["SW600"],
        model: "SW600",
        vendor: "Salus Controls",
        description: "Door or window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["WLS600"],
        model: "WLS600",
        vendor: "Salus Controls",
        description: "Water leakage sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["OS600"],
        model: "OS600",
        vendor: "Salus Controls",
        description: "Door or window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["SS909ZB", "PS600"],
        model: "PS600",
        vendor: "Salus Controls",
        description: "Pipe temperature sensor",
        fromZigbee: [fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        exposes: [e.battery(), e.temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["RE600"],
        model: "RE600",
        vendor: "Salus Controls",
        description: "Router Zigbee",
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        ota: {manufacturerName: "SalusControls"},
    },
    {
        zigbeeModel: ["FC600", "FC600NH"],
        model: "FC600",
        vendor: "Salus Controls",
        description: "Fan coil thermostat",
        whiteLabel: [{vendor: "Salus Controls", model: "FC600NH", description: "Fan coil thermostat", fingerprint: [{modelID: "FC600NH"}]}],
        extend: [
            m.deviceAddCustomCluster("manuSpecificSalus", {
                ID: 0xfc04,
                manufacturerCode: Zcl.ManufacturerCode.COMPUTIME,
                attributes: {
                    frostSetpoint: {ID: 0x0000, type: Zcl.DataType.INT16},
                    minFrostSetpoint: {ID: 0x0001, type: Zcl.DataType.INT16},
                    maxFrostSetpoint: {ID: 0x0002, type: Zcl.DataType.INT16},
                    timeDisplayFormat: {ID: 0x0003, type: Zcl.DataType.BOOLEAN},
                    attr4: {ID: 0x0004, type: Zcl.DataType.UINT16},
                    attr5: {ID: 0x0005, type: Zcl.DataType.UINT8},
                    attr6: {ID: 0x0006, type: Zcl.DataType.UINT16},
                    attr7: {ID: 0x0007, type: Zcl.DataType.UINT8},
                    autoCoolingSetpoint: {ID: 0x0008, type: Zcl.DataType.INT16},
                    autoHeatingSetpoint: {ID: 0x0009, type: Zcl.DataType.INT16},
                    holdType: {ID: 0x000a, type: Zcl.DataType.UINT8},
                    shortCycleProtection: {ID: 0x000b, type: Zcl.DataType.UINT16},
                    coolingFanDelay: {ID: 0x000c, type: Zcl.DataType.UINT16},
                    ruleCoolingSetpoint: {ID: 0x000d, type: Zcl.DataType.INT16},
                    ruleHeatingSetpoint: {ID: 0x000e, type: Zcl.DataType.INT16},
                    attr15: {ID: 0x000f, type: Zcl.DataType.BOOLEAN},
                },
                commands: {
                    resetDevice: {
                        ID: 0x01,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
            m.enumLookup<"manuSpecificSalus", Salus>({
                name: "preset",
                lookup: {schedule: 0, temporary_override: 1, permanent_override: 2, standby: 7, eco: 10},
                cluster: "manuSpecificSalus",
                attribute: "holdType",
                description: "Operation mode",
                reporting: {min: 0, max: 3600, change: 0},
            }),
        ],
        fromZigbee: [fz.thermostat, fz.fan],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_relay_status_log,
            tz.thermostat_running_state,
            tz.thermostat_keypad_lockout,
            tz.fan_mode,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 40, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "cool", "auto"])
                .withRunningMode(["off", "cool", "heat"])
                .withRunningState(["idle", "heat", "cool"])
                .withLocalTemperatureCalibration(-3, 3, 0.5)
                .withFanMode(["off", "low", "medium", "high", "auto"]),
            e.keypad_lockout(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            const binds = ["genBasic", "genTime", "hvacThermostat", "hvacFanCtrl", "hvacUserInterfaceCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.fanMode(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
        },
        ota: {manufacturerName: "SalusControls"},
    },
];
