import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import {nodonPilotWire} from "../lib/nodon";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const nodonModernExtend = {
    calibrationVerticalRunTimeUp: (args?: Partial<m.NumericArgs>) =>
        m.numeric({
            name: "calibration_vertical_run_time_up",
            unit: "10 ms",
            cluster: "closuresWindowCovering",
            attribute: {ID: 0x0001, type: Zcl.DataType.UINT16},
            valueMin: 0,
            valueMax: 65535,
            scale: 1,
            access: "ALL",
            description:
                "Manuel calibration: Set vertical run time up of the roller shutter. " +
                "Do not change it if your roller shutter is already calibrated.",
            zigbeeCommandOptions: {manufacturerCode: 0x128b},
            ...args,
        }),
    calibrationVerticalRunTimeDowm: (args?: Partial<m.NumericArgs>) =>
        m.numeric({
            name: "calibration_vertical_run_time_down",
            unit: "10 ms",
            cluster: "closuresWindowCovering",
            attribute: {ID: 0x0002, type: Zcl.DataType.UINT16},
            valueMin: 0,
            valueMax: 65535,
            scale: 1,
            access: "ALL",
            description:
                "Manuel calibration: Set vertical run time down of the roller shutter. " +
                "Do not change it if your roller shutter is already calibrated.",
            zigbeeCommandOptions: {manufacturerCode: 0x128b},
            ...args,
        }),
    calibrationRotationRunTimeUp: (args?: Partial<m.NumericArgs>) =>
        m.numeric({
            name: "calibration_rotation_run_time_up",
            unit: "ms",
            cluster: "closuresWindowCovering",
            attribute: {ID: 0x0003, type: Zcl.DataType.UINT16},
            valueMin: 0,
            valueMax: 65535,
            scale: 1,
            access: "ALL",
            description:
                "Manuel calibration: Set rotation run time up of the roller shutter. " +
                "Do not change it if your roller shutter is already calibrated.",
            zigbeeCommandOptions: {manufacturerCode: 0x128b},
            ...args,
        }),
    calibrationRotationRunTimeDown: (args?: Partial<m.NumericArgs>) =>
        m.numeric({
            name: "calibration_rotation_run_time_down",
            unit: "ms",
            cluster: "closuresWindowCovering",
            attribute: {ID: 0x0004, type: Zcl.DataType.UINT16},
            valueMin: 0,
            valueMax: 65535,
            scale: 1,
            access: "ALL",
            description:
                "Manuel calibration: Set rotation run time down of the roller shutter. " +
                "Do not change it if your roller shutter is already calibrated.",
            zigbeeCommandOptions: {manufacturerCode: 0x128b},
            ...args,
        }),
    dryContact: (args?: Partial<m.EnumLookupArgs>) =>
        m.enumLookup({
            name: "dry_contact",
            lookup: {contact_closed: 0x00, contact_open: 0x01},
            cluster: "genBinaryInput",
            attribute: {ID: 0x055, type: Zcl.DataType.ENUM8},
            description: "State of the contact, closed or open.",
            ...args,
        }),
    impulseMode: (args?: Partial<m.NumericArgs>) =>
        m.numeric({
            name: "impulse_mode_configuration",
            unit: "ms",
            cluster: "genOnOff",
            attribute: {ID: 0x0001, type: Zcl.DataType.UINT16},
            valueMin: 0,
            valueMax: 10000,
            scale: 1,
            description: "Set the impulse duration in milliseconds (set value to 0 to deactivate the impulse mode).",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NODON},
        }),
    switchType: (args?: Partial<m.EnumLookupArgs>) =>
        m.enumLookup({
            name: "switch_type",
            lookup: {bistable: 0x00, monostable: 0x01, auto_detect: 0x02},
            cluster: "genOnOff",
            attribute: {ID: 0x1001, type: Zcl.DataType.ENUM8},
            description: "Select the switch type wire to the device. " + "Available from version > V3.4.0",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NODON},
            ...args,
        }),
    trvMode: (args?: Partial<m.EnumLookupArgs>) =>
        m.enumLookup({
            name: "trv_mode",
            lookup: {auto: 0x00, valve_position_mode: 0x01, manual: 0x02},
            cluster: "hvacThermostat",
            attribute: {ID: 0x4000, type: Zcl.DataType.ENUM8},
            description:
                "Select between direct control of the TRV via the `valve_position_mode` " +
                "or automatic control of the TRV based on the `current_heating_setpoint`. " +
                "When switched to manual mode the display shows a value from 0 (valve closed) to 100 (valve fully open) " +
                "and the buttons on the device are disabled.",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NXP_SEMICONDUCTORS},
            ...args,
        }),
    valvePosition: (args?: Partial<m.NumericArgs>) =>
        m.numeric({
            name: "valve_position",
            cluster: "hvacThermostat",
            attribute: {ID: 0x4001, type: Zcl.DataType.UINT8},
            description:
                "Directly control the radiator valve when `trv_mode` is set to `valve_position_mode`." +
                "The values range from 0 (valve closed) to 100 (valve fully open) in %.",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            unit: "%",
            scale: 1,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NXP_SEMICONDUCTORS},
            ...args,
        }),
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SDC-4-1-00"],
        model: "SDC-4-1-00",
        vendor: "NodOn",
        description: "Dry contact sensor",
        extend: [m.battery(), nodonModernExtend.dryContact()],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["SDO-4-1-00"],
        model: "SDO-4-1-00",
        vendor: "NodOn",
        description: "Door & window opening sensor",
        fromZigbee: [fz.battery, fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.battery()],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["SIN-4-RS-20", "SIN-4-UNK"],
        model: "SIN-4-RS-20",
        vendor: "NodOn",
        description: "Roller shutter relay switch",
        extend: [
            m.windowCovering({controls: ["tilt", "lift"], coverMode: true}),
            nodonModernExtend.calibrationVerticalRunTimeUp(),
            nodonModernExtend.calibrationVerticalRunTimeDowm(),
            nodonModernExtend.calibrationRotationRunTimeUp(),
            nodonModernExtend.calibrationRotationRunTimeDown(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-RS-20_PRO"],
        model: "SIN-4-RS-20_PRO",
        vendor: "NodOn",
        description: "Roller shutter relay switch",
        extend: [
            m.windowCovering({controls: ["tilt", "lift"], coverMode: true}),
            nodonModernExtend.calibrationVerticalRunTimeUp(),
            nodonModernExtend.calibrationVerticalRunTimeDowm(),
            nodonModernExtend.calibrationRotationRunTimeUp(),
            nodonModernExtend.calibrationRotationRunTimeDown(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-1-20"],
        model: "SIN-4-1-20",
        vendor: "NodOn",
        description: "Multifunction relay switch",
        extend: [m.onOff({ota: true}), nodonModernExtend.impulseMode(), nodonModernExtend.switchType()],
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ["SIN-4-1-20_PRO"],
        model: "SIN-4-1-20_PRO",
        vendor: "NodOn",
        description: "Multifunction relay switch",
        extend: [m.onOff({ota: true}), nodonModernExtend.impulseMode(), nodonModernExtend.switchType()],
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ["SIN-4-1-21"],
        model: "SIN-4-1-21",
        vendor: "NodOn",
        description: "Multifunction relay switch with metering",
        ota: true,
        fromZigbee: [fz.on_off, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.energy(), e.power_on_behavior()],
        extend: [nodonModernExtend.impulseMode(), nodonModernExtend.switchType()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ["genBasic", "genIdentify", "genOnOff", "seMetering"]);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
        },
    },
    {
        zigbeeModel: ["SIN-4-2-20"],
        model: "SIN-4-2-20",
        vendor: "NodOn",
        description: "Lighting relay switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            nodonModernExtend.switchType({endpointName: "l1"}),
            nodonModernExtend.switchType({endpointName: "l2"}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-2-20_PRO"],
        model: "SIN-4-2-20_PRO",
        vendor: "NodOn",
        description: "Lighting relay switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            nodonModernExtend.switchType({endpointName: "l1"}),
            nodonModernExtend.switchType({endpointName: "l2"}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-FP-20"],
        model: "SIN-4-FP-20",
        vendor: "NodOn",
        description: "Pilot wire heating module",
        ota: true,
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ["genBasic", "genIdentify", "genOnOff", "seMetering"]);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
        },
        extend: [...nodonPilotWire(true)],
    },
    {
        zigbeeModel: ["SIN-4-FP-21"],
        model: "SIN-4-FP-21",
        vendor: "NodOn",
        description: "Pilot wire heating module",
        ota: true,
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ["genBasic", "genIdentify", "genOnOff", "seMetering"]);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
        },
        extend: [...nodonPilotWire(true)],
    },
    {
        zigbeeModel: ["STPH-4-1-00"],
        model: "STPH-4-1-00",
        vendor: "NodOn",
        description: "Temperature & humidity sensor",
        extend: [m.battery(), m.temperature(), m.humidity()],
        ota: true,
    },
    {
        zigbeeModel: ["TRV-4-1-00"],
        model: "TRV-4-1-00",
        vendor: "NodOn",
        description: "Thermostatic Radiateur Valve",
        extend: [m.battery(), nodonModernExtend.trvMode(), nodonModernExtend.valvePosition()],
        fromZigbee: [fz.thermostat],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_pi_heating_demand,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.eurotronic_error_status,
            tz.eurotronic_child_lock,
            tz.eurotronic_mirror_display,
        ],
        exposes: [
            e.child_lock(),
            e
                .climate()
                .withLocalTemperature()
                .withPiHeatingDemand(ea.STATE_GET)
                .withLocalTemperatureCalibration()
                .withSetpoint("occupied_heating_setpoint", 7.5, 28.5, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 7.5, 28.5, 0.5)
                .withSystemMode(["off", "auto", "heat"]),
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
                        attribute: {ID: 0x4008, type: 34},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 1,
                    },
                ],
                options,
            );
        },
    },
];
