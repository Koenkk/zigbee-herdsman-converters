import assert from "node:assert";

import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as philips from "../lib/philips";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, KeyValue, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const thermostatPositions: KeyValue = {
    quarter_open: 1,
    half_open: 2,
    three_quarters_open: 3,
    fully_open: 4,
};

const tzLocal = {
    quiet_fan: {
        key: ["quiet_fan"],
        convertSet: async (entity, key, value, meta) => {
            assert(typeof value === "boolean");
            await entity.write("hvacFanCtrl", {4096: {value: value ? 1 : 0, type: 0x10}}, {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP});
            return {state: {quiet_fan: value}};
        },
    } satisfies Tz.Converter,
    ac_louver_position: {
        key: ["ac_louver_position"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, "ac_louver_position");
            utils.validateValue(value, Object.keys(thermostatPositions));
            const index = thermostatPositions[value.toLowerCase()];
            await entity.write("hvacThermostat", {17011: {value: index, type: 0x30}}, {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP});
            return {state: {ac_louver_position: value}};
        },
    } satisfies Tz.Converter,
    preset: {
        key: ["preset"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, "preset");
            value = value.toLowerCase();
            utils.validateValue(value, ["activity", "boost", "eco", "none"]);
            const activity = value === "activity" ? 1 : 0;
            const boost = value === "boost" ? 1 : 0;
            const eco = value === "eco" ? 4 : 0;

            await entity.write("hvacThermostat", {17013: {value: activity, type: 0x30}}, {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP});
            await entity.write("hvacThermostat", {programingOperMode: eco});
            await entity.write("hvacThermostat", {17008: {value: boost, type: 0x10}}, {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP});

            return {state: {preset: value}};
        },
    } satisfies Tz.Converter,
    swingMode: {
        key: ["swing_mode"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, "swing_mode");
            value = value.toLowerCase();
            utils.validateValue(value, ["on", "off"]);
            await entity.write(
                "hvacThermostat",
                {17012: {value: value === "on" ? 1 : 0, type: 0x10}},
                {manufacturerCode: Zcl.ManufacturerCode.ATLANTIC_GROUP},
            );
            return {state: {swing_mode: value}};
        },
    } satisfies Tz.Converter,
};

const nirvanaExtend = (options: {horizontal: boolean}): ModernExtend[] => [
    m.deviceEndpoints({
        endpoints: {"1": 1, "230": 230, "232": 232},
        multiEndpointSkip: [
            "local_temperature",
            "occupied_heating_setpoint",
            "system_mode",
            "running_mode",
            "control_sequence_of_operation",
            "abs_min_heat_setpoint_limit",
            "abs_max_heat_setpoint_limit",
            "min_heat_setpoint_limit",
            "max_heat_setpoint_limit",
            "temperature_setpoint_hold",
            "temperature_setpoint_hold_duration",
            "programming_operation_mode",
            "keypad_lockout",
            "temperature_display_mode",
            "occupancy",
            "power",
            "energy",
        ],
    }),
    m.identify(),
    // runningState and pIHeatingDemand are unsupported
    m.thermostat({
        localTemperature: {},
        setpoints: {values: {occupiedHeatingSetpoint: {min: 7, max: 30, step: 0.5}}},
        systemMode: {values: ["off", "heat"]},
    }),
    m.occupancy(),
    ...(options.horizontal
        ? [
              // acPowerMultiplier/acPowerDivisor, rmsVoltage and rmsCurrent are unsupported
              m.electricityMeter({
                  power: {cluster: "electrical", multiplier: 1, divisor: 1},
                  energy: {multiplier: 1, divisor: 1000, max: "1_HOUR"},
                  voltage: false,
                  current: false,
              }),
              m.thermostatUi({endpointNames: ["230"]}),
          ]
        : // instantaneousDemand is unsupported, currentSummDelivered is in Wh while some firmwares report multiplier=1000/divisor=1000
          [m.electricityMeter({cluster: "metering", power: false, energy: {multiplier: 1, divisor: 1000, max: "1_HOUR"}})]),
];

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Adapter Zigbee FUJITSU"],
        model: "GW003-AS-IN-TE-FC",
        vendor: "Atlantic Group",
        description: "Interface Naviclim for Takao air conditioners",
        fromZigbee: [fz.thermostat, fz.fan],
        extend: [philips.m.addManuSpecificPhilips2Cluster()],
        toZigbee: [
            tzLocal.ac_louver_position,
            tzLocal.preset,
            tzLocal.quiet_fan,
            tzLocal.swingMode,
            tz.fan_mode,
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_programming_operation_mode,
            tz.thermostat_system_mode,
        ],
        exposes: [
            e.programming_operation_mode(),
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_cooling_setpoint", 18, 30, 0.5)
                .withSetpoint("occupied_heating_setpoint", 16, 30, 0.5)
                .withSystemMode(["off", "heat", "cool", "auto", "dry", "fan_only"])
                .withPreset(["activity", "boost", "eco"])
                .withFanMode(["low", "medium", "high", "auto"])
                .withSwingMode(["on", "off"], ea.STATE_SET),
            e.binary("quiet_fan", ea.STATE_SET, true, false).withDescription("Fan quiet mode"),
            e.enum("ac_louver_position", ea.STATE_SET, Object.keys(thermostatPositions)).withDescription("Ac louver position of this device"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const binds1 = ["hvacFanCtrl", "genIdentify", "hvacFanCtrl", "hvacThermostat", "manuSpecificPhilips2"];
            await reporting.bind(endpoint1, coordinatorEndpoint, binds1);
            await reporting.thermostatTemperature(endpoint1);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint1);
            await reporting.thermostatSystemMode(endpoint1);

            const endpoint232 = device.getEndpoint(232);
            await reporting.bind(endpoint232, coordinatorEndpoint, ["haDiagnostic"]);
        },
    },
    {
        zigbeeModel: ["100050060900", "100050060900 "],
        model: "100050060900",
        vendor: "Atlantic Group",
        description: "Galapagos electric radiator",
        fromZigbee: [fz.thermostat, fz.occupancy, fz.metering],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_system_mode, tz.currentsummdelivered],
        exposes: [
            e.climate().withLocalTemperature().withSetpoint("occupied_heating_setpoint", 5, 30, 0.5).withSystemMode(["off", "heat"]),
            e.occupancy(),
            e.energy().withAccess(ea.STATE_GET),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "msOccupancySensing", "seMetering"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.currentSummDelivered(endpoint);
            // The device reports seMetering multiplier=1000/divisor=1000 while currentSummDelivered is in Wh
            endpoint.saveClusterAttributeKeyValue("seMetering", {multiplier: 1, divisor: 1000});
        },
    },
    {
        zigbeeModel: ["100052992400", "100052992500", "100052992700"],
        model: "100052992400",
        vendor: "Atlantic Group",
        description: "Nirvana+ connected radiator horizontal 750W",
        // Firmware appends a NUL character to the modelID, so both variants are needed in the fingerprint
        whiteLabel: [
            {
                model: "100052992500",
                description: "Nirvana+ connected radiator horizontal 1000W",
                fingerprint: [{modelID: "100052992500"}, {modelID: "100052992500\u0000"}],
            },
            {
                model: "100052992700",
                description: "Nirvana+ connected radiator horizontal 1500W",
                fingerprint: [{modelID: "100052992700"}, {modelID: "100052992700\u0000"}],
            },
        ],
        extend: nirvanaExtend({horizontal: true}),
    },
    {
        zigbeeModel: ["100052994200", "100052994300"],
        model: "100052994200",
        vendor: "Atlantic Group",
        description: "Nirvana+ connected radiator vertical 1500W",
        whiteLabel: [
            {
                model: "100052994300",
                description: "Nirvana+ connected radiator vertical 2000W",
                fingerprint: [{modelID: "100052994300"}, {modelID: "100052994300\u0000"}],
            },
        ],
        extend: nirvanaExtend({horizontal: false}),
    },
    {
        zigbeeModel: ["100042838900", "100042838900 "],
        model: "100042838900",
        vendor: "Atlantic Group",
        description: "Thermor Equateur 5 electric radiator",
        fromZigbee: [fz.thermostat, fz.occupancy, fz.metering],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_system_mode, tz.currentsummdelivered],
        exposes: [
            e.climate().withLocalTemperature().withSetpoint("occupied_heating_setpoint", 7, 28, 0.5).withSystemMode(["off", "heat"]),
            e.occupancy(),
            e.energy().withAccess(ea.STATE_GET),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "msOccupancySensing", "seMetering"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.currentSummDelivered(endpoint);
            // The device reports seMetering multiplier=1000/divisor=1000 while currentSummDelivered is in Wh
            endpoint.saveClusterAttributeKeyValue("seMetering", {multiplier: 1, divisor: 1000});
        },
    },
];
