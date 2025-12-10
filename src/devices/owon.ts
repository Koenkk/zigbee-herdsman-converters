import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

interface OwonFallDetection {
    attributes: {
        status: number;
        // biome-ignore lint/style/useNamingConvention: TODO
        breathing_rate: number;
        // biome-ignore lint/style/useNamingConvention: TODO
        location_x: number;
        // biome-ignore lint/style/useNamingConvention: TODO
        location_y: number;
        bedUpperLeftX: number;
        bedUpperLeftY: number;
        bedLowerRightX: number;
        bedLowerRightY: number;
        doorCenterX: number;
        doorCenterY: number;
        leftFallDetectionRange: number;
        rightFallDetectionRange: number;
        frontFallDetectionRange: number;
    };
    commands: never;
    commandResponses: never;
}

const fzLocal = {
    temperature: {
        ...fz.temperature,
        convert: (model, msg, publish, options, meta) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/15173
            if (msg.data.measuredValue < 32767) {
                return fz.temperature.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]>,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    PC321_metering: {
        cluster: "seMetering",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const factor = 0.001;
            const payload: KeyValue = {};
            if (msg.data.owonL1Energy !== undefined) {
                const value = msg.data.owonL1Energy;
                payload.energy_l1 = value * factor;
            }
            if (msg.data.owonL2Energy !== undefined) {
                const value = msg.data.owonL2Energy;
                payload.energy_l2 = value * factor;
            }
            if (msg.data.owonL3Energy !== undefined) {
                const value = msg.data.owonL3Energy;
                payload.energy_l3 = value * factor;
            }
            if (msg.data.owonL1ReactiveEnergy !== undefined) {
                const value = msg.data.owonL1ReactiveEnergy;
                payload.reactive_energy_l1 = value * factor;
            }
            if (msg.data.owonL2ReactiveEnergy !== undefined) {
                const value = msg.data.owonL2ReactiveEnergy;
                payload.reactive_energy_l2 = value * factor;
            }
            if (msg.data.owonL3ReactiveEnergy !== undefined) {
                const value = msg.data.owonL3ReactiveEnergy;
                payload.reactive_energy_l3 = value / 1000;
            }
            if (msg.data.owonL1PhasePower !== undefined) {
                payload.power_l1 = msg.data.owonL1PhasePower;
            }
            if (msg.data.owonL2PhasePower !== undefined) {
                payload.power_l2 = msg.data.owonL2PhasePower;
            }
            if (msg.data.owonL3PhasePower !== undefined) {
                payload.power_l3 = msg.data.owonL3PhasePower;
            }
            if (msg.data.owonL1PhaseReactivePower !== undefined) {
                payload.reactive_power_l1 = msg.data.owonL1PhaseReactivePower;
            }
            if (msg.data.owonL2PhaseReactivePower !== undefined) {
                payload.reactive_power_l2 = msg.data.owonL2PhaseReactivePower;
            }
            if (msg.data.owonL3PhaseReactivePower !== undefined) {
                payload.reactive_power_l3 = msg.data.owonL3PhaseReactivePower;
            }
            if (msg.data.owonL1PhaseVoltage !== undefined) {
                payload.voltage_l1 = msg.data.owonL1PhaseVoltage / 10.0;
            }
            if (msg.data.owonL2PhaseVoltage !== undefined) {
                payload.voltage_l2 = msg.data.owonL2PhaseVoltage / 10.0;
            }
            if (msg.data.owonL3PhaseVoltage !== undefined) {
                payload.voltage_l3 = msg.data.owonL3PhaseVoltage / 10.0;
            }
            if (msg.data.owonL1PhaseCurrent !== undefined) {
                payload.current_l1 = msg.data.owonL1PhaseCurrent * factor;
            }
            if (msg.data.owonL2PhaseCurrent !== undefined) {
                payload.current_l2 = msg.data.owonL2PhaseCurrent * factor;
            }
            if (msg.data.owonL3PhaseCurrent !== undefined) {
                payload.current_l3 = msg.data.owonL3PhaseCurrent * factor;
            }
            if (msg.data.owonFrequency !== undefined) {
                payload.frequency = msg.data.owonFrequency;
            }
            // Issue #20719 summation manufacturer attributes are not well parsed
            if (msg.data.owonReactivePowerSum !== undefined || msg.data["8451"] !== undefined) {
                // 0x2103 -> 8451
                const value = msg.data.owonReactiveEnergySum || msg.data["8451"];
                payload.power_reactive = value;
            }
            if (msg.data.owonCurrentSum !== undefined || msg.data["12547"] !== undefined) {
                // 0x3103 -> 12547
                const data = msg.data.owonCurrentSum || (msg.data["12547"] as number) * factor;
                payload.current = data;
            }
            if (msg.data.owonReactiveEnergySum !== undefined || msg.data["16643"] !== undefined) {
                // 0x4103 -> 16643
                const value = msg.data.owonReactiveEnergySum || (msg.data["16643"] as number);
                payload.reactive_energy = value * factor;
            }
            if (msg.data.owonL1PowerFactor !== undefined) {
                payload.power_factor_l1 = msg.data.owonL1PowerFactor / 100;
            }
            if (msg.data.owonL2PowerFactor !== undefined) {
                payload.power_factor_l2 = msg.data.owonL2PowerFactor / 100;
            }
            if (msg.data.owonL3PowerFactor !== undefined) {
                payload.power_factor_l3 = msg.data.owonL3PowerFactor / 100;
            }

            return payload;
        },
    } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,

    owonFds315: {
        cluster: "fallDetectionOwon",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: Record<string, unknown> = {};
            const data = msg.data;
            const status_mapping: Record<number, string> = {
                0: "unoccupied",
                1: "occupied",
                2: "sitting",
                3: "on_the_bed",
                4: "low_posture",
                5: "falling",
            };

            if (data.status !== undefined) {
                const code = data.status;
                result.status = status_mapping[code] || `Unknown (${code})`;
            }
            if (data.breathing_rate !== undefined) result.breathing_rate = data.breathing_rate;
            if (data.location_x !== undefined) result.location_x = data.location_x;
            if (data.location_y !== undefined) result.location_y = data.location_y;

            const keys = [
                "bedUpperLeftX",
                "bedUpperLeftY",
                "bedLowerRightX",
                "bedLowerRightY",
                "doorCenterX",
                "doorCenterY",
                "leftFallDetectionRange",
                "rightFallDetectionRange",
                "frontFallDetectionRange",
            ] as const;
            const values = keys.map((k) => (data[k] !== undefined ? data[k] : null));

            if (!values.includes(null)) {
                result.fall_detection_settings = values.join(",");
            }

            return result;
        },
    } satisfies Fz.Converter<"fallDetectionOwon", OwonFallDetection, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    PC321_clearMetering: {
        key: ["clear_metering"],
        convertSet: async (entity, key, value, meta) => {
            await entity.command(0xffe0, 0x00, {}, {disableDefaultResponse: true});
        },
    } satisfies Tz.Converter,

    owonFds315SetFallSettings: {
        key: ["fall_detection_settings"],
        convertSet: async (entity, key, value, meta) => {
            const mapping: Record<number, {id: number; type: number}> = {
                0: {id: 0x0100, type: 0x29},
                1: {id: 0x0101, type: 0x29},
                2: {id: 0x0102, type: 0x29},
                3: {id: 0x0103, type: 0x29},
                4: {id: 0x0108, type: 0x29},
                5: {id: 0x0109, type: 0x29},
                6: {id: 0x010c, type: 0x21},
                7: {id: 0x010d, type: 0x21},
                8: {id: 0x010e, type: 0x21},
            };

            const strValue = String(value);
            const values = strValue?.split(",").map(Number);
            if (values.length !== 9) throw new Error("Incorrect number of values.");

            const payload: Record<number, {value: number; type: number}> = {};
            values.forEach((val, idx) => {
                const {id, type} = mapping[idx];
                payload[id] = {value: val, type};
            });

            await entity.write<"fallDetectionOwon", OwonFallDetection>("fallDetectionOwon", payload, {manufacturerCode: 0x113c});
            return {state: {fall_detection_settings: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"fallDetectionOwon", OwonFallDetection>(
                "fallDetectionOwon",
                [
                    "bedUpperLeftX",
                    "bedUpperLeftY",
                    "bedLowerRightX",
                    "bedLowerRightY",
                    "doorCenterX",
                    "doorCenterY",
                    "leftFallDetectionRange",
                    "rightFallDetectionRange",
                    "frontFallDetectionRange",
                ],
                {manufacturerCode: 0x113c},
            );
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["WSP402"],
        model: "WSP402",
        vendor: "OWON",
        description: "Smart plug",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
    },
    {
        zigbeeModel: ["WSP403-E"],
        model: "WSP403",
        vendor: "OWON",
        whiteLabel: [{vendor: "Oz Smart Things", model: "WSP403"}],
        description: "Smart plug",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"}), m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
    {
        zigbeeModel: ["WSP404"],
        model: "WSP404",
        vendor: "OWON",
        description: "Smart plug",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
    },
    {
        zigbeeModel: ["CB432"],
        model: "CB432",
        vendor: "OWON",
        description: "32A/63A power circuit breaker",
        extend: [m.onOff(), m.electricityMeter({cluster: "metering"})],
    },
    {
        zigbeeModel: ["PIR313-E", "PIR313"],
        model: "PIR313-E",
        vendor: "OWON",
        description: "Motion sensor",
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1, fz.temperature, fz.humidity, fz.occupancy_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.tamper(), e.battery_low(), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            if (device.modelID === "PIR313") {
                await reporting.bind(endpoint3, coordinatorEndpoint, ["msTemperatureMeasurement", "msRelativeHumidity"]);
            } else {
                await reporting.bind(endpoint2, coordinatorEndpoint, ["msTemperatureMeasurement", "msRelativeHumidity"]);
            }
            device.powerSource = "Battery";
            device.save();
        },
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["AC201"],
        model: "AC201",
        vendor: "OWON",
        description: "HVAC controller/IR blaster",
        fromZigbee: [fz.fan, fz.thermostat],
        toZigbee: [
            tz.fan_mode,
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_ac_louver_position,
            tz.thermostat_local_temperature,
        ],
        exposes: [
            e
                .climate()
                .withSystemMode(["off", "heat", "cool", "auto", "dry", "fan_only"])
                .withSetpoint("occupied_heating_setpoint", 8, 30, 1)
                .withSetpoint("occupied_cooling_setpoint", 8, 30, 1)
                .withAcLouverPosition(["fully_open", "fully_closed", "half_open", "quarter_open", "three_quarters_open"])
                .withLocalTemperature(),
            e.fan().withState("fan_state").withModes(["low", "medium", "high", "on", "auto"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacFanCtrl"]);
            await reporting.fanMode(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 60, max: 600, change: 0.1});
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatAcLouverPosition(endpoint);
        },
    },
    {
        zigbeeModel: ["THS317"],
        model: "THS317",
        vendor: "OWON",
        description: "Temperature and humidity sensor",
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "msRelativeHumidity", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            device.powerSource = "Battery";
            device.save();
        },
    },
    {
        zigbeeModel: ["THS317-ET"],
        model: "THS317-ET",
        vendor: "OWON",
        description: "Temperature sensor",
        fromZigbee: [fzLocal.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage(), e.temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3) || device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            device.powerSource = "Battery";
            device.save();
        },
    },
    {
        zigbeeModel: ["PC321"],
        model: "PC321",
        vendor: "OWON",
        description: "3-Phase clamp power meter",
        fromZigbee: [fz.metering, fzLocal.PC321_metering],
        toZigbee: [tzLocal.PC321_clearMetering],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["seMetering"]);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            if (device.powerSource === "Unknown") {
                device.powerSource = "Mains (single phase)";
                device.save();
            }
        },
        meta: {publishDuplicateTransaction: true},
        exposes: [
            e.current(),
            e.power(),
            e.power_reactive(),
            e.energy(),
            e.numeric("reactive_energy", ea.STATE).withUnit("kVArh").withDescription("Reactive energy for all phase"),
            e.numeric("voltage_l1", ea.STATE).withUnit("V").withDescription("Phase 1 voltage"),
            e.numeric("voltage_l2", ea.STATE).withUnit("V").withDescription("Phase 2 voltage"),
            e.numeric("voltage_l3", ea.STATE).withUnit("V").withDescription("Phase 3 voltage"),
            e.numeric("current_l1", ea.STATE).withUnit("A").withDescription("Phase 1 current"),
            e.numeric("current_l2", ea.STATE).withUnit("A").withDescription("Phase 2 current"),
            e.numeric("current_l3", ea.STATE).withUnit("A").withDescription("Phase 3 current"),
            e.numeric("energy_l1", ea.STATE).withUnit("kWh").withDescription("Phase 1 energy"),
            e.numeric("energy_l2", ea.STATE).withUnit("kWh").withDescription("Phase 2 energy"),
            e.numeric("energy_l3", ea.STATE).withUnit("kWh").withDescription("Phase 3 energy"),
            e.numeric("reactive_energy_l1", ea.STATE).withUnit("kVArh").withDescription("Phase 1 reactive energy"),
            e.numeric("reactive_energy_l2", ea.STATE).withUnit("kVArh").withDescription("Phase 2 reactive energy"),
            e.numeric("reactive_energy_l3", ea.STATE).withUnit("kVArh").withDescription("Phase 3 reactive energy"),
            e.numeric("power_l1", ea.STATE).withUnit("W").withDescription("Phase 1 power"),
            e.numeric("power_l2", ea.STATE).withUnit("W").withDescription("Phase 2 power"),
            e.numeric("power_l3", ea.STATE).withUnit("W").withDescription("Phase 3 power"),
            e.numeric("reactive_power_l1", ea.STATE).withUnit("VAr").withDescription("Phase 1 reactive power"),
            e.numeric("reactive_power_l2", ea.STATE).withUnit("VAr").withDescription("Phase 2 reactive power"),
            e.numeric("reactive_power_l3", ea.STATE).withUnit("VAr").withDescription("Phase 3 reactive power"),
            e.numeric("power_factor_l1", ea.STATE).withUnit("%").withDescription("Phase 1 power factor"),
            e.numeric("power_factor_l2", ea.STATE).withUnit("%").withDescription("Phase 2 power factor"),
            e.numeric("power_factor_l3", ea.STATE).withUnit("%").withDescription("Phase 3 power factor"),
            e.enum("clear_metering", ea.SET, ["clear"]).withDescription("Clear measurement data"),
        ],
    },
    {
        zigbeeModel: ["PCT504", "PCT504-E"],
        model: "PCT504",
        vendor: "OWON",
        description: "HVAC fan coil",
        fromZigbee: [fz.fan, fz.thermostat, fz.humidity, fz.occupancy, fz.hvac_user_interface],
        toZigbee: [
            tz.fan_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_min_cool_setpoint_limit,
            tz.thermostat_max_cool_setpoint_limit,
            tz.thermostat_local_temperature,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_running_state,
            tz.thermostat_programming_operation_mode,
        ],
        exposes: [
            e.humidity(),
            e.occupancy(),
            e
                .climate()
                .withSystemMode(["off", "heat", "cool", "fan_only", "sleep"])
                .withLocalTemperature()
                .withRunningMode(["off", "heat", "cool"])
                .withRunningState(["idle", "heat", "cool", "fan_only"])
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 5, 30, 0.5)
                .withSetpoint("occupied_cooling_setpoint", 7, 35, 0.5)
                .withSetpoint("unoccupied_cooling_setpoint", 7, 35, 0.5),
            e.fan().withState("fan_state").withModes(["low", "medium", "high", "on", "auto"]),
            e.programming_operation_mode(["setpoint", "eco"]),
            e.keypad_lockout(),
            e.max_heat_setpoint_limit(5, 30, 0.5),
            e.min_heat_setpoint_limit(5, 30, 0.5),
            e.max_cool_setpoint_limit(7, 35, 0.5),
            e.min_cool_setpoint_limit(7, 35, 0.5),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "hvacFanCtrl",
                "msTemperatureMeasurement",
                "msOccupancySensing",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.fanMode(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 60, max: 600, change: 0.1});
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.humidity(endpoint, {min: 60, max: 600, change: 1});
            await reporting.thermostatKeypadLockMode(endpoint);

            await endpoint.read("hvacThermostat", [
                "systemMode",
                "runningMode",
                "runningState",
                "occupiedHeatingSetpoint",
                "unoccupiedHeatingSetpoint",
                "occupiedCoolingSetpoint",
                "unoccupiedCoolingSetpoint",
                "localTemp",
            ]);
            await endpoint.read("msRelativeHumidity", ["measuredValue"]);

            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msOccupancySensing"]);
            await reporting.occupancy(endpoint2, {min: 1, max: 600, change: 1});
            await endpoint2.read("msOccupancySensing", ["occupancy"]);
        },
    },
    {
        zigbeeModel: ["PCT512"],
        model: "PCT512",
        vendor: "OWON",
        description: "Thermostat",
        fromZigbee: [fz.thermostat],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
        ],
        extend: [m.occupancy(), m.humidity()],
        exposes: [
            e
                .climate()
                .withSystemMode(["off", "heat"])
                .withLocalTemperature()
                .withRunningState(["heat", "idle"])
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genIdentify", "genGroups", "genScenes", "genOnOff", "hvacThermostat", "msRelativeHumidity"];

            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: 3600, change: 10});
            await reporting.thermostatTemperature(endpoint, {min: 0, max: 3600, change: 10});
            await reporting.humidity(endpoint, {min: 0, max: 3600, change: 10});
            await reporting.thermostatSystemMode(endpoint, {min: 0, max: 3600});
            await reporting.thermostatRunningState(endpoint);
            await endpoint.read("hvacThermostat", ["systemMode", "runningState", "occupiedHeatingSetpoint", "localTemp"]);
            await endpoint.read("msRelativeHumidity", ["measuredValue"]);
        },
    },
    {
        zigbeeModel: ["PIR323-PTH"],
        model: "PIR323-PTH",
        vendor: "OWON",
        description: "Multi-sensor",
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1, fz.temperature, fz.humidity, fz.occupancy_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "msRelativeHumidity"]);
            device.powerSource = "Battery";
            device.save();
        },
    },
    {
        zigbeeModel: ["SLC603"],
        model: "SLC603",
        vendor: "OWON",
        description: "Zigbee remote dimmer",
        fromZigbee: [fz.battery, fz.command_toggle, fz.command_step, fz.command_step_color_temperature],
        toZigbee: [],
        exposes: [
            e.battery(),
            e.battery_low(),
            e.action(["toggle", "brightness_step_up", "brightness_step_down", "color_temperature_step_up", "color_temperature_step_down"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
            device.powerSource = "Battery";
            device.save();
        },
    },
    {
        zigbeeModel: ["PIR313-P"],
        model: "PIR313-P",
        vendor: "OWON",
        description: "Motion sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "battery_low", "tamper"]})],
    },
    {
        zigbeeModel: ["DWS312"],
        model: "DWS312",
        vendor: "OWON",
        description: "Door/window sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low", "tamper"]})],
    },
    {
        zigbeeModel: ["SPM915"],
        model: "SPM915",
        vendor: "OWON",
        description: "Sleeping pad monitor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low", "tamper"]})],
    },
    {
        zigbeeModel: ["FDS315"],
        model: "FDS315",
        vendor: "OWON",
        description: "Fall Detection Sensor",
        extend: [
            m.deviceAddCustomCluster("fallDetectionOwon", {
                ID: 0xfd00,
                manufacturerCode: Zcl.ManufacturerCode.OWON_TECHNOLOGY_INC,
                attributes: {
                    status: {ID: 0x0000, type: Zcl.DataType.ENUM8},
                    breathing_rate: {ID: 0x0002, type: Zcl.DataType.UINT8},
                    location_x: {ID: 0x0003, type: Zcl.DataType.INT16},
                    location_y: {ID: 0x0004, type: Zcl.DataType.INT16},
                    bedUpperLeftX: {ID: 0x0100, type: Zcl.DataType.INT16},
                    bedUpperLeftY: {ID: 0x0101, type: Zcl.DataType.INT16},
                    bedLowerRightX: {ID: 0x0102, type: Zcl.DataType.INT16},
                    bedLowerRightY: {ID: 0x0103, type: Zcl.DataType.INT16},
                    doorCenterX: {ID: 0x0108, type: Zcl.DataType.INT16},
                    doorCenterY: {ID: 0x0109, type: Zcl.DataType.INT16},
                    leftFallDetectionRange: {ID: 0x010c, type: Zcl.DataType.UINT16},
                    rightFallDetectionRange: {ID: 0x010d, type: Zcl.DataType.UINT16},
                    frontFallDetectionRange: {ID: 0x010e, type: Zcl.DataType.UINT16},
                },
                commands: {},
                commandsResponse: {},
            }),
        ],
        fromZigbee: [fz.identify, fzLocal.owonFds315],
        toZigbee: [tzLocal.owonFds315SetFallSettings],
        exposes: [
            e.enum("status", ea.STATE, ["unoccupied", "occupied", "sitting", "on_the_bed", "low_posture", "falling"]),
            e.numeric("breathing_rate", ea.STATE).withUnit("breaths/min").withDescription("Breathing rate."),
            e.numeric("location_x", ea.STATE).withUnit("cm").withDescription("X coordinate of human activity."),
            e.numeric("location_y", ea.STATE).withUnit("cm").withDescription("Y coordinate of human activity."),
            e
                .text("fall_detection_settings", ea.ALL)
                .withDescription(
                    "Comma-separated values for bed, door and fall detection settings: bedUpperLeftX, bedUpperLeftY, bedLowerRightX, bedLowerRightY, doorCenterX, doorCenterY, leftFallDetectionRange, rightFallDetectionRange, frontFallDetectionRange. Put -21931 for disabled bed and door.",
                ),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.bind("ssIasZone", coordinatorEndpoint);
            await endpoint.bind("genBasic", coordinatorEndpoint);
            await endpoint.bind("fallDetectionOwon", coordinatorEndpoint);
        },
    },
    {
        zigbeeModel: ["SLC631"],
        model: "SLC631",
        vendor: "OWON",
        description: "Smart plug with doorbell press indicator",
        extend: [
            m.onOff({endpointNames: ["l1", "l2", "l3"]}),
            m.iasZoneAlarm({
                zoneType: "contact",
                zoneAttributes: ["alarm_2"],
            }),
        ],
        endpoint: (device) => ({l1: 1, l2: 2, l3: 3}),
        configure: async (device, coordinatorEndpoint) => {
            const ep2 = device.getEndpoint(2);
            if (ep2) {
                await reporting.bind(ep2, coordinatorEndpoint, ["ssIasZone"]);
                await ep2.write("ssIasZone", {
                    16: {value: coordinatorEndpoint.deviceIeeeAddress, type: 0xf0},
                });
            }
        },
    },
];
