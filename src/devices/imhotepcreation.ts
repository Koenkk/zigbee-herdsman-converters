import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["E-Ctrl", "RPH E-Ctrl", "RSS E-Ctrl"],
        model: "E-Ctrl",
        vendor: "Imhotep Creation",
        description: "Heater thermostat PH25 and compliant",
        whiteLabel: [
            {
                vendor: "Imhotep Creation",
                model: "RSS E-Ctrl",
                description: "Towel heater thermostat THIE (TH ECTRL) and compliant",
                fingerprint: [{modelID: "RSS E-Ctrl"}],
            },
            {
                vendor: "Imhotep Creation",
                model: "RPH E-Ctrl",
                description: "Panel radiant heater thermostat MPHIE (NRPH) and compliant",
                fingerprint: [{modelID: "RPH E-Ctrl"}],
            },
        ],
        fromZigbee: [fz.thermostat, fz.occupancy],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_local_temperature,
            tz.thermostat_setpoint_raise_lower,
        ],
        exposes: [
            e.climate().withSystemMode(["off", "heat"]).withLocalTemperature().withSetpoint("occupied_heating_setpoint", 5, 30, 0.5, ea.ALL),
            e
                .numeric("min_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Minimum Heating set point limit")
                .withValueMin(5)
                .withValueMax(30)
                .withValueStep(0.5),
            e
                .numeric("max_heat_setpoint_limit", ea.ALL)
                .withUnit("°C")
                .withDescription("Maximum Heating set point limit")
                .withValueMin(5)
                .withValueMax(30)
                .withValueStep(0.5),
            e.occupancy(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device?.getEndpoint(1);

            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "msOccupancySensing"]);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            await endpoint.read("hvacThermostat", ["localTemp"]);
            await endpoint.read("hvacThermostat", ["absMinHeatSetpointLimit"]);
            await endpoint.read("hvacThermostat", ["absMaxHeatSetpointLimit"]);
            await endpoint.read("hvacThermostat", ["minHeatSetpointLimit"]);
            await endpoint.read("hvacThermostat", ["maxHeatSetpointLimit"]);
            await endpoint.read("hvacThermostat", ["occupiedHeatingSetpoint"]);
            await endpoint.read("hvacThermostat", ["systemMode"]);
            await endpoint.read("msOccupancySensing", ["occupancy"]);
        },
    },
    {
        zigbeeModel: ["BRI4P"],
        model: "BRI4P",
        vendor: "Imhotep Creation",
        description: "BRI4P Bridge for underfloor heating central and local thermostats",
        fromZigbee: [fz.thermostat],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_min_cool_setpoint_limit,
            tz.thermostat_max_cool_setpoint_limit,
            tz.thermostat_setpoint_raise_lower,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {
                l1: 1,
                l2: 2,
                l3: 3,
                l4: 4,
                l5: 5,
                l6: 6,
                l7: 7,
                l8: 8,
                l9: 9,
                l10: 10,
                l11: 11,
                l12: 12,
                l13: 13,
                l14: 14,
                l15: 15,
                l16: 16,
            };
        },
        exposes: (device, options) => {
            const features = [];

            if (!utils.isDummyDevice(device)) {
                for (let i = 1; i <= 16; i++) {
                    const endpoint = device?.getEndpoint(i);
                    if (endpoint !== undefined) {
                        const epName = `l${i}`;
                        features.push(e.climate().withSystemMode(["off", "cool", "heat"]).withLocalTemperature().withEndpoint(epName));
                        features.push(e.climate().withSetpoint("occupied_heating_setpoint", 5, 30, 0.5, ea.ALL).withEndpoint(epName));
                        features.push(
                            e
                                .numeric("min_heat_setpoint_limit", ea.ALL)
                                .withUnit("°C")
                                .withDescription("Minimum Heating set point limit")
                                .withValueMin(5)
                                .withValueMax(30)
                                .withValueStep(0.5)
                                .withEndpoint(epName),
                        );
                        features.push(
                            e
                                .numeric("max_heat_setpoint_limit", ea.ALL)
                                .withUnit("°C")
                                .withDescription("Maximum Heating set point limit")
                                .withValueMin(5)
                                .withValueMax(30)
                                .withValueStep(0.5)
                                .withEndpoint(epName),
                        );
                        features.push(e.climate().withSetpoint("occupied_cooling_setpoint", 5, 38, 0.5, ea.ALL).withEndpoint(epName));
                        features.push(
                            e
                                .numeric("min_cool_setpoint_limit", ea.ALL)
                                .withUnit("°C")
                                .withDescription("Minimum Cooling point limit")
                                .withValueMin(5)
                                .withValueMax(38)
                                .withValueStep(0.5)
                                .withEndpoint(epName),
                        );
                        features.push(
                            e
                                .numeric("max_cool_setpoint_limit", ea.ALL)
                                .withUnit("°C")
                                .withDescription("Maximum Cooling set point limit")
                                .withValueMin(5)
                                .withValueMax(38)
                                .withValueStep(0.5)
                                .withEndpoint(epName),
                        );
                    }
                }
            }

            return features;
        },
        configure: async (device, coordinatorEndpoint) => {
            for (let i = 1; i <= 20; i++) {
                const endpoint = device?.getEndpoint(i);
                if (typeof endpoint !== "undefined") {
                    await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat"]);
                    await reporting.thermostatSystemMode(endpoint);
                    await reporting.thermostatTemperature(endpoint);
                    await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
                    await reporting.thermostatOccupiedCoolingSetpoint(endpoint);

                    const thermostatMinHeatSetpointLimit = async (endpoint: Zh.Endpoint) => {
                        const p = reporting.payload<"hvacThermostat">("minHeatSetpointLimit", 0, constants.repInterval.HOUR, 10);
                        await endpoint.configureReporting("hvacThermostat", p);
                    };
                    const thermostatMaxHeatSetpointLimit = async (endpoint: Zh.Endpoint) => {
                        const p = reporting.payload<"hvacThermostat">("maxHeatSetpointLimit", 0, constants.repInterval.HOUR, 10);
                        await endpoint.configureReporting("hvacThermostat", p);
                    };
                    const thermostatMinCoolSetpointLimit = async (endpoint: Zh.Endpoint) => {
                        const p = reporting.payload<"hvacThermostat">("minCoolSetpointLimit", 0, constants.repInterval.HOUR, 10);
                        await endpoint.configureReporting("hvacThermostat", p);
                    };
                    const thermostatMaxCoolSetpointLimit = async (endpoint: Zh.Endpoint) => {
                        const p = reporting.payload<"hvacThermostat">("maxCoolSetpointLimit", 0, constants.repInterval.HOUR, 10);
                        await endpoint.configureReporting("hvacThermostat", p);
                    };
                    await thermostatMinHeatSetpointLimit(endpoint);
                    await thermostatMaxHeatSetpointLimit(endpoint);
                    await thermostatMinCoolSetpointLimit(endpoint);
                    await thermostatMaxCoolSetpointLimit(endpoint);

                    await endpoint.read("hvacThermostat", ["localTemp"]);
                    await endpoint.read("hvacThermostat", ["systemMode"]);
                    await endpoint.read("hvacThermostat", ["absMinHeatSetpointLimit"]);
                    await endpoint.read("hvacThermostat", ["absMaxHeatSetpointLimit"]);
                    await endpoint.read("hvacThermostat", ["minHeatSetpointLimit"]);
                    await endpoint.read("hvacThermostat", ["maxHeatSetpointLimit"]);
                    await endpoint.read("hvacThermostat", ["absMinCoolSetpointLimit"]);
                    await endpoint.read("hvacThermostat", ["absMaxCoolSetpointLimit"]);
                    await endpoint.read("hvacThermostat", ["minCoolSetpointLimit"]);
                    await endpoint.read("hvacThermostat", ["maxCoolSetpointLimit"]);
                    await endpoint.read("hvacThermostat", ["occupiedHeatingSetpoint"]);
                    await endpoint.read("hvacThermostat", ["occupiedCoolingSetpoint"]);
                }
            }
        },
    },
];
