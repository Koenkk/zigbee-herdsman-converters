import {gt as semverGt, valid as semverValid} from "semver";
import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as eurotronic from "../devices/eurotronic";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import {nodonPilotWire} from "../lib/nodon";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend} from "../lib/types";
import {isDummyDevice, postfixWithEndpointName} from "../lib/utils";

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
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"}), m.temperature(), m.humidity(), ...nodonPilotWire(true)],
        ota: true,
        endpoint: (device) => ({default: 1}),
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
        extend: [
            m.battery({voltageReporting: true}),
            m.binary({
                name: "dry_contact",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 1},
                valueOn: ["contact_closed", 1],
                valueOff: ["contact_open", 0],
                description: "State of the dry contact, closed or open.",
                access: "STATE_GET",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SDO-4-1-00"],
        model: "SDO-4-1-00",
        vendor: "NodOn",
        description: "Door & window opening sensor",
        extend: [
            m.battery({voltageReporting: true}),
            m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1"], zoneStatusReporting: {max: constants.repInterval.HOUR}}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SEM-4-1-00"],
        model: "SEM-4-1-00",
        vendor: "NodOn",
        description: "Energy monitoring sensor",
        extend: [
            m.identify(),
            m.electricityMeter({
                // A forced object's `change` is not auto-scaled by the multiplier/divisor (unlike
                // the default change) — values below are already raw ZCL units. Factors measured
                // on physical devices: acPowerMultiplier/Divisor=1/1, acCurrentMultiplier/Divisor=1/100,
                // acVoltageMultiplier/Divisor=1/100, acFrequencyMultiplier/Divisor=1/100.
                voltage: {min: 30, max: 3600, change: 2300}, // 23 V
                current: {min: 10, max: 3600, change: 100}, // 1 A
                power: {min: 10, max: 3600, change: 250}, // 250 W
                acFrequency: {min: 30, max: 3600, change: 500}, // 5 Hz
                producedEnergy: {min: 300, max: 3600, change: 10}, // 0.1 kWh
                energy: {min: 300, max: 3600, change: 10}, // 0.1 kWh
                apparentPower: {min: 10, max: 3600, change: 250}, // 250 VA, shares activePower's factor
                powerFactor: true,
            }),
        ],
        toZigbee: [
            {
                key: ["energy_reset"],
                convertSet: async (entity, _key, _value, _meta) => {
                    // genBasic/resetFactDefault resets all cluster attributes to factory defaults.
                    // Network membership, bindings and configureReporting are not affected (ZCL spec).
                    await entity.command("genBasic", "resetFactDefault", {});
                    return {state: {}};
                },
            },
        ],
        exposes: [e.enum("energy_reset", ea.SET, ["reset"]).withDescription("Reset all energy counters to 0").withCategory("config")],
        ota: true,
    },
    {
        zigbeeModel: ["SEM-4-3-20"],
        model: "SEM-4-3-20",
        vendor: "NodOn",
        description: "3CT Energy Meter",
        endpoint: (device) => ({default: 1}),
        extend: (() => {
            const meter = m.electricityMeter({
                threePhase: true,
                voltage: {min: 10, max: 3600, change: 100},
                current: {min: 10, max: 3600, change: 100},
                power: {min: 10, max: 3600, change: 250},
                acFrequency: {min: 60, max: 3600, change: 10},
                producedEnergy: {min: 300, max: 3600, change: 100},
                energy: {min: 300, max: 3600, change: 100},
            });
            // electricityMeter()'s base voltage/current/power/energy exposes have no per-phase
            // suffix for Phase A (only Phase B/C get '_phase_b'/'_phase_c'); this device measures
            // 3 phases so all labels are made explicit rather than leaving Phase A implicit.
            const relabel = (name: string, label: string) => {
                const found = meter.exposes?.find((exp) => typeof exp !== "function" && exp.name === name);
                if (found && typeof found !== "function") found.withLabel(label);
            };
            relabel("voltage", "Voltage - Phase A");
            relabel("current", "Current - Phase A");
            relabel("power", "Active power - Phase A");
            relabel("voltage_phase_b", "Voltage - Phase B");
            relabel("current_phase_b", "Current - Phase B");
            relabel("power_phase_b", "Active power - Phase B");
            relabel("voltage_phase_c", "Voltage - Phase C");
            relabel("current_phase_c", "Current - Phase C");
            relabel("power_phase_c", "Active power - Phase C");
            relabel("energy", "Total consumed energy");
            relabel("produced_energy", "Total produced energy");
            return [m.identify(), meter];
        })(),
        toZigbee: [
            {
                key: ["energy_reset"],
                convertSet: async (entity, _key, _value, _meta) => {
                    // genBasic/resetFactDefault resets all cluster attributes to factory defaults.
                    // Network membership, bindings and configureReporting are not affected (ZCL spec).
                    await entity.command("genBasic", "resetFactDefault", {});
                    return {state: {}};
                },
            },
        ],
        exposes: [
            e.enum("energy_reset", ea.SET, ["reset"]).withDescription("Reset all energy counters to 0").withCategory("config"),

            e.power_factor().withAccess(ea.STATE).withLabel("Power factor - Phase A"),
            e.power_factor_phase_b().withAccess(ea.STATE).withLabel("Power factor - Phase B"),
            e.power_factor_phase_c().withAccess(ea.STATE).withLabel("Power factor - Phase C"),
            e.power_reactive().withAccess(ea.STATE).withLabel("Reactive power - Phase A"),
            e.power_reactive_phase_b().withAccess(ea.STATE).withLabel("Reactive power - Phase B"),
            e.power_reactive_phase_c().withAccess(ea.STATE).withLabel("Reactive power - Phase C"),
            e.power_apparent().withAccess(ea.STATE).withLabel("Apparent power - Phase A"),
            e.power_apparent_phase_b().withAccess(ea.STATE).withLabel("Apparent power - Phase B"),
            e.power_apparent_phase_c().withAccess(ea.STATE).withLabel("Apparent power - Phase C"),

            e.numeric("total_active_power", ea.STATE).withUnit("W").withDescription("Total active power across all 3 phases"),
            e.numeric("total_reactive_power", ea.STATE).withUnit("VAR").withDescription("Total reactive power across all 3 phases"),
            e.numeric("total_apparent_power", ea.STATE).withUnit("VA").withDescription("Total apparent power across all 3 phases"),

            // Phase A/B/C energy: NodOn repurposes seMetering's tariff-tier attributes
            // (currentTier1/2/3SummDelivered/Received) to carry per-phase energy on this
            // 3-phase device — not tariffs. `tariffs` is never passed to m.electricityMeter()
            // above, so none of these are exposed automatically; all 3 phases must be added
            // manually. Property name stays energy_tier_N/produced_energy_tier_N (fz.metering
            // hardcodes it), only the frontend label is overridden.
            e.numeric("energy_tier_1", ea.STATE).withLabel("Consumed energy - Phase A").withUnit("kWh").withDescription("Energy consumed by Phase A"),
            e
                .numeric("produced_energy_tier_1", ea.STATE)
                .withLabel("Produced energy - Phase A")
                .withUnit("kWh")
                .withDescription("Energy exported by Phase A"),
            e.numeric("energy_tier_2", ea.STATE).withLabel("Consumed energy - Phase B").withUnit("kWh").withDescription("Energy consumed by Phase B"),
            e
                .numeric("produced_energy_tier_2", ea.STATE)
                .withLabel("Produced energy - Phase B")
                .withUnit("kWh")
                .withDescription("Energy exported by Phase B"),
            e.numeric("energy_tier_3", ea.STATE).withLabel("Consumed energy - Phase C").withUnit("kWh").withDescription("Energy consumed by Phase C"),
            e
                .numeric("produced_energy_tier_3", ea.STATE)
                .withLabel("Produced energy - Phase C")
                .withUnit("kWh")
                .withDescription("Energy exported by Phase C"),
        ],
        fromZigbee: [
            // totalActivePower (0x0304), totalReactivePower (0x0305), totalApparentPower (0x0306)
            // are not handled by fz.electrical_measurement
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, _publish, _options, meta) => {
                    const payload: KeyValue = {};
                    const getFactor = (key: string) => {
                        const mult = msg.endpoint.getClusterAttributeValue("haElectricalMeasurement", `${key}Multiplier`) as number;
                        const div = msg.endpoint.getClusterAttributeValue("haElectricalMeasurement", `${key}Divisor`) as number;
                        return mult && div ? mult / div : 1;
                    };
                    if (msg.data.totalActivePower !== undefined) {
                        payload[postfixWithEndpointName("total_active_power", msg, model, meta)] = msg.data.totalActivePower * getFactor("acPower");
                    }
                    if (msg.data.totalReactivePower !== undefined) {
                        payload[postfixWithEndpointName("total_reactive_power", msg, model, meta)] =
                            msg.data.totalReactivePower * getFactor("acPower");
                    }
                    if (msg.data.totalApparentPower !== undefined) {
                        payload[postfixWithEndpointName("total_apparent_power", msg, model, meta)] =
                            msg.data.totalApparentPower * getFactor("acPower");
                    }
                    return payload;
                },
            } satisfies Fz.Converter<"haElectricalMeasurement", undefined, ["attributeReport", "readResponse"]>,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await m.setupAttributes(endpoint, coordinatorEndpoint, "haElectricalMeasurement", [
                {attribute: "reactivePower", min: 10, max: 3600, change: 250},
                {attribute: "reactivePowerPhB", min: 10, max: 3600, change: 250},
                {attribute: "reactivePowerPhC", min: 10, max: 3600, change: 250},
                {attribute: "apparentPower", min: 10, max: 3600, change: 250},
                {attribute: "apparentPowerPhB", min: 10, max: 3600, change: 250},
                {attribute: "apparentPowerPhC", min: 10, max: 3600, change: 250},
                {attribute: "powerFactor", min: 60, max: 3600, change: 20},
                {attribute: "powerFactorPhB", min: 60, max: 3600, change: 20},
                {attribute: "powerFactorPhC", min: 60, max: 3600, change: 20},
                {attribute: "totalActivePower", min: 10, max: 3600, change: 250},
                {attribute: "totalReactivePower", min: 10, max: 3600, change: 250},
                {attribute: "totalApparentPower", min: 10, max: 3600, change: 250},
            ]);
            await m.setupAttributes(endpoint, coordinatorEndpoint, "seMetering", [
                {attribute: "currentTier1SummDelivered", min: 300, max: 3600, change: 100},
                {attribute: "currentTier1SummReceived", min: 300, max: 3600, change: 100},
                {attribute: "currentTier2SummDelivered", min: 300, max: 3600, change: 100},
                {attribute: "currentTier2SummReceived", min: 300, max: 3600, change: 100},
                {attribute: "currentTier3SummDelivered", min: 300, max: 3600, change: 100},
                {attribute: "currentTier3SummReceived", min: 300, max: 3600, change: 100},
            ]);
        },
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
        endpoint: (device) => ({default: 1}),
        extend: [m.identify(), m.onOff(), nodonModernExtend.impulseMode(), nodonModernExtend.switchTypeOnOff()],
        configure: async (device) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.bind("genOnOff", endpoint);
        },
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
        endpoint: (device) => ({default: 1}),
        extend: [
            m.identify(),
            m.onOff({powerOnBehavior: true}),
            m.electricityMeter({cluster: "metering"}),
            nodonModernExtend.impulseMode(),
            nodonModernExtend.switchTypeOnOff(),
        ],
        configure: async (device) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.bind("genOnOff", endpoint);
        },
        ota: true,
    },
    {
        zigbeeModel: ["SIN-4-2-20"],
        model: "SIN-4-2-20",
        vendor: "NodOn",
        description: "Lighting relay switch",
        extend: [
            m.identify(),
            m.deviceEndpoints({endpoints: {default: 1, l1: 1, l2: 2}}),
            m.onOff({endpointNames: ["l1", "l2"]}),
            nodonModernExtend.switchTypeOnOff({endpointName: "l1"}),
            nodonModernExtend.switchTypeOnOff({endpointName: "l2"}),
        ],
        configure: async (device) => {
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            await ep1.bind("genOnOff", ep1);
            await ep2.bind("genOnOff", ep2);
        },
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
        endpoint: (device) => ({default: 1}),
    },
    {
        zigbeeModel: ["SIN-4-FP-21"],
        model: "SIN-4-FP-21",
        vendor: "NodOn",
        description: "Pilot wire heating module",
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"}), ...nodonPilotWire(true)],
        ota: true,
        endpoint: (device) => ({default: 1}),
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
            eurotronic.tzLocal.eurotronic_error_status,
            eurotronic.tzLocal.eurotronic_child_lock,
            eurotronic.tzLocal.eurotronic_mirror_display,
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
