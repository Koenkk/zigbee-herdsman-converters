import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const _manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V};

const plugwisePushForceLookup = {
    0: "standard",
    393216: "high",
    458752: "very_high",
};

const plugwiseRadioStrengthLookup = {
    0: "normal",
    1: "high",
};

interface PlugwiseHvacThermostat {
    attributes: {
        plugwiseValvePosition: number;
        // plugwiseErrorStatus: number;
        plugwiseCurrentHeatingSetpoint: number;
        plugwiseTDiff: number;
        plugwisePushForce: number;
        plugwiseRadioStrength: number;
        plugwiseExternalHeatDemand: number;
        plugwiseExternalHeatDemandTimeout: number;
        plugwiseBoilerWaterTemp: number;
        plugwiseDhwTemp: number;
        plugwiseReturnWaterTemp: number;
        plugwiseApplicationFaultCode: number;
        plugwiseOemFaultCode: number;
        plugwiseMaxDhwSetpoint: number;
        plugwiseMaxBoilerSetpoint: number;
    };
    commands: {
        plugwiseCalibrateValve: Record<string, never>;
    };
    commandResponses: never;
}

const plugwiseExtend = {
    plugwiseHvacThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            name: "hvacThermostat",
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                plugwiseValvePosition: {name: "plugwiseValvePosition", ID: 0x4001, type: Zcl.DataType.UINT8},
                // plugwiseErrorStatus: {name: "plugwiseErrorStatus", ID: 0x4002, type: Zcl.DataType.??},
                plugwiseCurrentHeatingSetpoint: {name: "plugwiseCurrentHeatingSetpoint", ID: 0x4003, type: Zcl.DataType.INT16},
                plugwiseTDiff: {name: "plugwiseTDiff", ID: 0x4008, type: Zcl.DataType.INT16},
                plugwisePushForce: {name: "plugwisePushForce", ID: 0x4012, type: Zcl.DataType.UINT32},
                plugwiseRadioStrength: {name: "plugwiseRadioStrength", ID: 0x4014, type: Zcl.DataType.BOOLEAN},
                plugwiseExternalHeatDemand: {
                    name: "plugwiseExternalHeatDemand",
                    ID: 0xf000,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                    write: true,
                },
                plugwiseExternalHeatDemandTimeout: {
                    name: "plugwiseExternalHeatDemandTimeout",
                    ID: 0xf001,
                    type: Zcl.DataType.UINT16,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                    write: true,
                },
                plugwiseBoilerWaterTemp: {
                    name: "plugwiseBoilerWaterTemp",
                    ID: 0xf002,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                },
                plugwiseDhwTemp: {
                    name: "plugwiseDhwTemp",
                    ID: 0xf003,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                },
                plugwiseReturnWaterTemp: {
                    name: "plugwiseReturnWaterTemp",
                    ID: 0xf004,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                },
                plugwiseApplicationFaultCode: {
                    name: "plugwiseApplicationFaultCode",
                    ID: 0xf005,
                    type: Zcl.DataType.BITMAP8,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                },
                plugwiseOemFaultCode: {
                    name: "plugwiseOemFaultCode",
                    ID: 0xf006,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                },
                plugwiseMaxDhwSetpoint: {
                    name: "plugwiseMaxDhwSetpoint",
                    ID: 0xf007,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                    write: true,
                },
                plugwiseMaxBoilerSetpoint: {
                    name: "plugwiseMaxBoilerSetpoint",
                    ID: 0xf008,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
                    write: true,
                },
            },
            commands: {
                plugwiseCalibrateValve: {name: "plugwiseCalibrateValve", ID: 0xa0, parameters: []},
            },
            commandsResponse: {},
        }),
    boilerWaterTemperature: (args?: Partial<m.NumericArgs<"hvacThermostat", PlugwiseHvacThermostat>>) =>
        m.numeric<"hvacThermostat", PlugwiseHvacThermostat>({
            name: "boiler_water_temperature",
            cluster: "hvacThermostat",
            attribute: "plugwiseBoilerWaterTemp",
            description: "Boiler supply water temperature reported by OpenTherm.",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            access: "STATE",
            unit: "°C",
            scale: 100,
            ...args,
        }),
    dhwTemperature: (args?: Partial<m.NumericArgs<"hvacThermostat", PlugwiseHvacThermostat>>) =>
        m.numeric<"hvacThermostat", PlugwiseHvacThermostat>({
            name: "dhw_temperature",
            cluster: "hvacThermostat",
            attribute: "plugwiseDhwTemp",
            description: "Domestic hot water temperature reported by OpenTherm.",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            access: "STATE",
            unit: "°C",
            scale: 100,
            ...args,
        }),
    returnWaterTemperature: (args?: Partial<m.NumericArgs<"hvacThermostat", PlugwiseHvacThermostat>>) =>
        m.numeric<"hvacThermostat", PlugwiseHvacThermostat>({
            name: "return_water_temperature",
            cluster: "hvacThermostat",
            attribute: "plugwiseReturnWaterTemp",
            description: "Boiler return water temperature reported by OpenTherm.",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            access: "STATE",
            unit: "°C",
            scale: 100,
            ...args,
        }),
    applicationFaultCode: (args?: Partial<m.NumericArgs<"hvacThermostat", PlugwiseHvacThermostat>>) =>
        m.numeric<"hvacThermostat", PlugwiseHvacThermostat>({
            name: "application_fault_code",
            cluster: "hvacThermostat",
            attribute: "plugwiseApplicationFaultCode",
            description:
                "OpenTherm application fault bitmap (bit0=service_request, bit1=lockout_reset, bit2=low_water_pressure, bit3=gas_flame_fault, bit4=air_pressure_fault, bit5=water_over_temp).",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            access: "STATE",
            valueMin: 0,
            valueMax: 255,
            reporting: false,
            ...args,
        }),
    oemFaultCode: (args?: Partial<m.NumericArgs<"hvacThermostat", PlugwiseHvacThermostat>>) =>
        m.numeric<"hvacThermostat", PlugwiseHvacThermostat>({
            name: "oem_fault_code",
            cluster: "hvacThermostat",
            attribute: "plugwiseOemFaultCode",
            description: "OpenTherm OEM-specific fault code.",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            access: "STATE",
            valueMin: 0,
            valueMax: 255,
            reporting: false,
            ...args,
        }),
    applicationFaultCodeStatus: (args?: Partial<m.NumericArgs<"hvacThermostat", PlugwiseHvacThermostat>>) =>
        m.numeric<"hvacThermostat", PlugwiseHvacThermostat>({
            name: "application_fault_status",
            cluster: "hvacThermostat",
            attribute: "plugwiseApplicationFaultCode",
            description: "OpenTherm application fault status.",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            access: "STATE",
            fzConvert: (model, msg, publish, options, meta) => {
                if (msg.data.plugwiseApplicationFaultCode !== undefined) {
                    const value = msg.data.plugwiseApplicationFaultCode;
                    const activeFaults = [];
                    if ((value & (1 << 0)) > 0) activeFaults.push("Service request");
                    if ((value & (1 << 1)) > 0) activeFaults.push("Lockout reset");
                    if ((value & (1 << 2)) > 0) activeFaults.push("Low water pressure");
                    if ((value & (1 << 3)) > 0) activeFaults.push("Gas/flame fault");
                    if ((value & (1 << 4)) > 0) activeFaults.push("Air pressure fault");
                    if ((value & (1 << 5)) > 0) activeFaults.push("Water over-temperature");
                    return {
                        application_fault_status: activeFaults.length > 0 ? activeFaults.join(", ") : "None",
                    };
                }
            },
            reporting: false,
            ...args,
        }),
};

const fzLocal = {
    plugwise_radiator_valve: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result = fz.thermostat.convert(model, msg, publish, options, meta) as KeyValue;

            // Reports pIHeatingDemand between 0 and 100 already
            if (typeof msg.data.pIHeatingDemand === "number") {
                result.pi_heating_demand = utils.precisionRound(msg.data.pIHeatingDemand, 0);
            }
            if (typeof msg.data.plugwiseCurrentHeatingSetpoint === "number") {
                result.current_heating_setpoint = utils.precisionRound(msg.data.plugwiseCurrentHeatingSetpoint, 2) / 100;
            }
            if (typeof msg.data.plugwiseTDiff === "number") {
                result.plugwise_t_diff = msg.data.plugwiseTDiff;
            }
            if (typeof msg.data[0x4002] === "number") {
                result.error_status = msg.data[0x4002];
            }
            if (typeof msg.data.plugwiseValvePosition === "number") {
                result.valve_position = msg.data.plugwiseValvePosition;
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", PlugwiseHvacThermostat, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    plugwise_calibrate_valve: {
        key: ["calibrate_valve"],
        convertSet: async (entity, key, value, meta) => {
            await entity.command<"hvacThermostat", "plugwiseCalibrateValve", PlugwiseHvacThermostat>(
                "hvacThermostat",
                "plugwiseCalibrateValve",
                {},
                {srcEndpoint: 11, disableDefaultResponse: true},
            );
            return {state: {calibrate_valve: value}};
        },
    } satisfies Tz.Converter,
    plugwise_valve_position: {
        key: ["plugwise_valve_position", "valve_position"],
        convertSet: async (entity, key, value, meta) => {
            // const payload = {plugwiseValvePosition: {value, type: 0x20}};
            await entity.write<"hvacThermostat", PlugwiseHvacThermostat>(
                "hvacThermostat",
                {plugwiseValvePosition: value as number},
                {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            );
            // Tom does not automatically send back updated value so ask for it
            await entity.read<"hvacThermostat", PlugwiseHvacThermostat>("hvacThermostat", ["plugwiseValvePosition"], {
                manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
            });
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", PlugwiseHvacThermostat>("hvacThermostat", ["plugwiseValvePosition"], {
                manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
            });
        },
    } satisfies Tz.Converter,
    plugwise_push_force: {
        key: ["plugwise_push_force", "force"],
        convertSet: async (entity, key, value, meta) => {
            const val = utils.getKey(plugwisePushForceLookup, value, value, Number);
            await entity.write<"hvacThermostat", PlugwiseHvacThermostat>(
                "hvacThermostat",
                {plugwisePushForce: val as number},
                {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            );
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", PlugwiseHvacThermostat>("hvacThermostat", ["plugwisePushForce"], {
                manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
            });
        },
    } satisfies Tz.Converter,
    plugwise_radio_strength: {
        key: ["plugwise_radio_strength", "radio_strength"],
        convertSet: async (entity, key, value, meta) => {
            const val = utils.getKey(plugwiseRadioStrengthLookup, value, value, Number);
            await entity.write<"hvacThermostat", PlugwiseHvacThermostat>(
                "hvacThermostat",
                {plugwiseRadioStrength: val as number},
                {manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V},
            );
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", PlugwiseHvacThermostat>("hvacThermostat", ["plugwiseRadioStrength"], {
                manufacturerCode: Zcl.ManufacturerCode.PLUGWISE_B_V,
            });
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["160-01"],
        model: "160-01",
        vendor: "Plugwise",
        description: "Plug power socket on/off with power consumption monitoring",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ["106-03"],
        model: "106-03",
        vendor: "Plugwise",
        description: "Tom thermostatic radiator valve",
        extend: [plugwiseExtend.plugwiseHvacThermostatCluster()],
        fromZigbee: [fz.temperature, fz.battery, fzLocal.plugwise_radiator_valve],
        // system_mode and occupied_heating_setpoint is not supported: https://github.com/Koenkk/zigbee2mqtt.io/pull/1666
        toZigbee: [
            tz.thermostat_pi_heating_demand,
            tzLocal.plugwise_valve_position,
            tzLocal.plugwise_push_force,
            tzLocal.plugwise_radio_strength,
            tzLocal.plugwise_calibrate_valve,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genPowerCfg", "hvacThermostat"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
        exposes: [
            e.battery(),
            e
                .numeric("pi_heating_demand", ea.STATE_GET)
                .withValueMin(0)
                .withValueMax(100)
                .withUnit("%")
                .withDescription("Position of the valve (= demanded heat) where 0% is fully closed and 100% is fully open"),
            e.numeric("local_temperature", ea.STATE).withUnit("°C").withDescription("Current temperature measured on the device"),
            e
                .numeric("valve_position", ea.ALL)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Directly control the radiator valve. The values range from 0 (valve closed) to 100 (valve fully open)"),
            e
                .enum("force", ea.ALL, ["standard", "high", "very_high"])
                .withDescription("How hard the motor pushes the valve. The closer to the boiler, the higher the force needed"),
            e.enum("radio_strength", ea.ALL, ["normal", "high"]).withDescription("Transmits with higher power when range is not sufficient"),
            e.binary("calibrate_valve", ea.STATE_SET, "calibrate", "idle").withDescription("Calibrates valve on next wakeup"),
        ],
    },
    {
        zigbeeModel: ["158-01"],
        model: "158-01",
        vendor: "Plugwise",
        description: "Lisa zone thermostat",
        extend: [
            m.thermostat({
                setpoints: {values: {occupiedHeatingSetpoint: {min: 0, max: 30, step: 0.5}}},
                systemMode: {values: ["off", "auto"]},
            }),
            m.battery(),
        ],
    },
    {
        zigbeeModel: ["170-01"],
        model: "170-01",
        vendor: "Plugwise",
        description: "Emma Wired Pro / Emma Wireless",
        extend: [
            plugwiseExtend.plugwiseHvacThermostatCluster(),
            plugwiseExtend.applicationFaultCodeStatus(),
            plugwiseExtend.oemFaultCode(),
            m.temperature({
                reporting: {min: "1_SECOND", max: 870, change: 0.1},
            }),
            m.thermostat({
                setpoints: {
                    values: {
                        occupiedCoolingSetpoint: {min: 0, max: 30, step: 0.5},
                        occupiedHeatingSetpoint: {min: 5, max: 30, step: 0.5},
                    },
                    configure: {reporting: {min: "1_SECOND", max: 870, change: 0.5}},
                },
                runningState: {
                    values: ["idle", "heat", "cool"],
                    configure: {reporting: {min: "1_SECOND", max: 870, change: null}},
                },
                systemMode: {
                    values: ["off", "heat", "cool", "auto"],
                    configure: {reporting: {min: "1_SECOND", max: 870, change: null}},
                },
                localTemperatureCalibration: {
                    values: {min: -12.5, max: 12.5, step: 0.1},
                    configure: {reporting: {min: "1_SECOND", max: 870, change: 0}},
                },
            }),
            m.humidity({
                reporting: {min: "10_SECONDS", max: 870, change: 3},
            }),
            m.numeric({
                name: "outdoor_temperature",
                cluster: "hvacThermostat",
                attribute: "outdoorTemp",
                description: "Outdoor temperature reported by thermostat.",
                access: "STATE_GET",
                unit: "°C",
                scale: 100,
                reporting: {min: "10_SECONDS", max: 870, change: 0.1},
            }),
            plugwiseExtend.dhwTemperature({
                reporting: {min: "1_MINUTE", max: 870, change: 0.1},
            }),
            plugwiseExtend.returnWaterTemperature({
                reporting: {min: "1_MINUTE", max: 870, change: 0.1},
            }),
            plugwiseExtend.boilerWaterTemperature({
                reporting: {min: "1_MINUTE", max: 870, change: 0.1},
            }),
            m.numeric({
                name: "boiler_setpoint",
                cluster: "hvacThermostat",
                attribute: "pIHeatingDemand",
                description: "Intended boiler water temperature",
                unit: "°C",
                access: "STATE",
                reporting: {min: "1_SECOND", max: 870, change: 1},
            }),
            m.battery(),
            m.enumLookup({
                name: "keypad_lockout",
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                lookup: {no_lockout: 0x00, level_1: 0x01, level_2: 0x02},
                description:
                    "Keaypad lockout. No lockout — all buttons active. Level 1 — normal operation, menu blocked; setpoint change via slider still allowed. Level 2 — all buttons and slider blocked; only the hardware unlock sequence is accepted.",
                reporting: {min: "1_SECOND", max: 870, change: null},
                entityCategory: "config",
            }),
        ],
    },
];
