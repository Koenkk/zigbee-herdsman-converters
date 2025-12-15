import {gt as semverGt, valid as semverValid} from "semver";
import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import {nodonPilotWire} from "../lib/nodon";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";
import {isDummyDevice} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const nodonModernExtend = {
    calibrationVerticalRunTimeUp: (args?: Partial<m.NumericArgs<"closuresWindowCovering">>) =>
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
    calibrationVerticalRunTimeDowm: (args?: Partial<m.NumericArgs<"closuresWindowCovering">>) =>
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
    calibrationRotationRunTimeUp: (args?: Partial<m.NumericArgs<"closuresWindowCovering">>) =>
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
    calibrationRotationRunTimeDown: (args?: Partial<m.NumericArgs<"closuresWindowCovering">>) =>
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
    dryContact: (args?: Partial<m.EnumLookupArgs<"genBinaryInput">>) =>
        m.enumLookup({
            name: "dry_contact",
            lookup: {contact_closed: 0x00, contact_open: 0x01},
            cluster: "genBinaryInput",
            attribute: {ID: 0x055, type: Zcl.DataType.ENUM8},
            description: "State of the contact, closed or open.",
            ...args,
        }),
    impulseMode: (args?: Partial<m.NumericArgs<"genOnOff">>) => {
        const resultName = "impulse_mode_configuration";
        const resultUnit = "ms";
        const resultValueMin = 0;
        const resultValueMax = 10000;
        const resultDescription = "Set the impulse duration in milliseconds (set value to 0 to deactivate the impulse mode).";

        const result: ModernExtend = m.numeric({
            name: resultName,
            unit: resultUnit,
            cluster: "genOnOff",
            attribute: {ID: 0x0001, type: Zcl.DataType.UINT16},
            valueMin: resultValueMin,
            valueMax: resultValueMax,
            scale: 1,
            description: resultDescription,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NODON},
        });

        // NOTE: make exposes dynamic based on fw version
        result.exposes = [
            (device, options) => {
                if (
                    !isDummyDevice(device) &&
                    device.softwareBuildID &&
                    semverValid(device.softwareBuildID) &&
                    semverGt(device.softwareBuildID, "3.4.0")
                ) {
                    return [
                        e
                            .numeric(resultName, ea.ALL)
                            .withDescription(resultDescription)
                            .withUnit(resultUnit)
                            .withValueMin(resultValueMin)
                            .withValueMax(resultValueMax),
                    ];
                }
                return [];
            },
        ];

        return result;
    },
    switchTypeOnOff: (args?: Partial<m.EnumLookupArgs<"genOnOff">>) => {
        const resultName = "switch_type_on_off";
        const resultLookup = {bistable: 0x00, monostable: 0x01, auto_detect: 0x02};
        const resultDescription = "Select the switch type wire to the device.";

        const result: ModernExtend = m.enumLookup({
            name: resultName,
            lookup: resultLookup,
            cluster: "genOnOff",
            attribute: {ID: 0x1001, type: Zcl.DataType.ENUM8},
            description: resultDescription,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NODON},
            ...args,
        });

        // NOTE: make exposes dynamic based on fw version
        result.exposes = [
            (device, options) => {
                if (
                    !isDummyDevice(device) &&
                    device.softwareBuildID &&
                    semverValid(device.softwareBuildID) &&
                    semverGt(device.softwareBuildID, "3.4.0")
                ) {
                    return [e.enum(resultName, ea.ALL, Object.keys(resultLookup)).withDescription(resultDescription)];
                }
                return [];
            },
        ];

        return result;
    },
    switchTypeWindowCovering: (args?: Partial<m.EnumLookupArgs<"closuresWindowCovering">>) => {
        const resultName = "switch_type_window_covering";
        const resultLookup = {bistable: 0x00, monostable: 0x01, auto_detect: 0x02};
        const resultDescription = "Select the switch type wire to the device.";

        const result: ModernExtend = m.enumLookup({
            name: resultName,
            lookup: resultLookup,
            cluster: "closuresWindowCovering",
            attribute: {ID: 0x1001, type: Zcl.DataType.ENUM8},
            description: resultDescription,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.NODON},
            ...args,
        });

        // NOTE: make exposes dynamic based on fw version
        result.exposes = [
            (device, options) => {
                if (
                    !isDummyDevice(device) &&
                    device.softwareBuildID &&
                    semverValid(device.softwareBuildID) &&
                    semverGt(device.softwareBuildID, "3.4.0")
                ) {
                    return [e.enum(resultName, ea.ALL, Object.keys(resultLookup)).withDescription(resultDescription)];
                }
                return [];
            },
        ];

        return result;
    },
    trvMode: (args?: Partial<m.EnumLookupArgs<"hvacThermostat">>) =>
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
    valvePosition: (args?: Partial<m.NumericArgs<"hvacThermostat">>) =>
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
        zigbeeModel: ["FPS-4-1-00"],
        model: "FPS-4-1-00",
        vendor: "NodOn",
        description: "Electrical heating actuator",
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"}), m.temperature(), ...nodonPilotWire(true)],
        ota: true,
    },
    {
        zigbeeModel: ["IRB-4-1-00"],
        model: "IRB-4-1-00",
        vendor: "NodOn",
        description: "IR Blaster",
        fromZigbee: [fz.thermostat, fz.fan],
        toZigbee: [
            tz.fan_mode,
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_min_cool_setpoint_limit,
            tz.thermostat_max_cool_setpoint_limit,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_ac_louver_position,
        ],
        ota: true,
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_cooling_setpoint", 18, 30, 0.5)
                .withSetpoint("occupied_heating_setpoint", 16, 30, 0.5)
                .withSystemMode(["off", "heat", "cool", "auto", "dry", "fan_only"])
                .withFanMode(["off", "low", "medium", "high", "auto"])
                .withAcLouverPosition(["fully_open", "fully_closed", "half_open", "quarter_open", "three_quarters_open"]),
        ],
        extend: [m.humidity()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["hvacFanCtrl", "genIdentify", "hvacThermostat"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatAcLouverPosition(endpoint);
        },
    },
    {
        zigbeeModel: ["SDC-4-1-00"],
        model: "SDC-4-1-00",
        vendor: "NodOn",
        description: "Dry contact sensor",
        extend: [m.battery({voltageReporting: true}), nodonModernExtend.dryContact()],
        ota: true,
    },
    {
        zigbeeModel: ["SDO-4-1-00"],
        model: "SDO-4-1-00",
        vendor: "NodOn",
        description: "Door & window opening sensor",
        fromZigbee: [fz.battery, fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact()],
        extend: [m.battery({voltageReporting: true})],
        ota: true,
    },
    {
        zigbeeModel: ["SEM-4-1-00"],
        model: "SEM-4-1-00",
        vendor: "NodOn",
        description: "Energy monitoring sensor",
        extend: [
            m.electricityMeter({
                acFrequency: true,
                powerFactor: true,
                producedEnergy: true,
            }),
        ],
        ota: true,
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
            nodonModernExtend.switchTypeWindowCovering(),
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
            nodonModernExtend.switchTypeWindowCovering(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-1-20"],
        model: "SIN-4-1-20",
        vendor: "NodOn",
        description: "Multifunction relay switch",
        extend: [m.onOff(), nodonModernExtend.impulseMode(), nodonModernExtend.switchTypeOnOff()],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-1-20_PRO"],
        model: "SIN-4-1-20_PRO",
        vendor: "NodOn",
        description: "Multifunction relay switch",
        extend: [m.onOff(), nodonModernExtend.impulseMode(), nodonModernExtend.switchTypeOnOff()],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-1-21"],
        model: "SIN-4-1-21",
        vendor: "NodOn",
        description: "Multifunction relay switch with metering",
        extend: [
            m.onOff({powerOnBehavior: true}),
            m.electricityMeter({cluster: "metering"}),
            nodonModernExtend.impulseMode(),
            nodonModernExtend.switchTypeOnOff(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-2-20"],
        model: "SIN-4-2-20",
        vendor: "NodOn",
        description: "Lighting relay switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            nodonModernExtend.switchTypeOnOff({endpointName: "l1"}),
            nodonModernExtend.switchTypeOnOff({endpointName: "l2"}),
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
            nodonModernExtend.switchTypeOnOff({endpointName: "l1"}),
            nodonModernExtend.switchTypeOnOff({endpointName: "l2"}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-FP-20"],
        model: "SIN-4-FP-20",
        vendor: "NodOn",
        description: "Pilot wire heating module",
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"}), ...nodonPilotWire(true)],
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-FP-21"],
        model: "SIN-4-FP-21",
        vendor: "NodOn",
        description: "Pilot wire heating module",
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"}), ...nodonPilotWire(true)],
        ota: true,
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
