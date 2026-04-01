import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface StelproHvacThermostat {
    attributes: {
        stelproOutdoorTemp: number;
        stelproSystemMode: number;
    };
    commands: never;
    commandResponses: never;
}

export const tzLocal = {
    stelpro_thermostat_outdoor_temperature: {
        key: ["outdoor_temperature_display"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            if (value < -32 || value > 119) {
                throw new Error("Outdoor temperature must be between -32 and 119 degrees Celsius");
            }
            await entity.write<"hvacThermostat", StelproHvacThermostat>("hvacThermostat", {stelproOutdoorTemp: value * 100});
        },
    } satisfies Tz.Converter,
};

export const fzLocal = {
    power: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data["16392"] !== undefined) {
                return {power: msg.data["16392"]};
            }
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    energy: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data["16393"] !== undefined) {
                return {energy: Number.parseFloat(msg.data["16393"] as string) / 1000};
            }
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    stelpro_thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result = fz.thermostat.convert(model, msg, publish, options, meta) as KeyValueAny;
            if (result && msg.data.stelproSystemMode === 5) {
                // 'Eco' mode is translated into 'auto' here
                result.system_mode = constants.thermostatSystemModes[1];
            }
            if (result && msg.data.pIHeatingDemand !== undefined) {
                result.running_state = msg.data.pIHeatingDemand >= 10 ? "heat" : "idle";
            }
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", StelproHvacThermostat, ["attributeReport", "readResponse"]>,
};

export const stelproExtend = {
    addStelproHvacThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            name: "hvacThermostat",
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                stelproOutdoorTemp: {name: "stelproOutdoorTemp", ID: 0x4001, type: Zcl.DataType.INT16, write: true, min: -32768, max: 32767},
                stelproSystemMode: {name: "stelproSystemMode", ID: 0x401c, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
            },
            commands: {},
            commandsResponse: {},
        }),
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["HT402"],
        model: "HT402",
        vendor: "Stelpro",
        description: "Hilo thermostat",
        extend: [stelproExtend.addStelproHvacThermostatCluster()],
        fromZigbee: [fzLocal.stelpro_thermostat, fz.hvac_user_interface, fzLocal.power, fzLocal.energy],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.stelpro_peak_demand_event_icon,
            tzLocal.stelpro_thermostat_outdoor_temperature,
        ],
        exposes: [
            e.keypad_lockout(),
            e.power(),
            e.energy(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["heat"])
                .withRunningState(["idle", "heat"]),
            e
                .numeric("peak_demand_icon", ea.SET)
                .withUnit("hours")
                .withDescription("Set peak demand event icon for the specified number of hours")
                .withValueMin(0)
                .withValueMax(18),
            e
                .numeric("outdoor_temperature_display", ea.SET)
                .withUnit("°C")
                .withDescription("Outdoor temperature displayed on the thermostat")
                .withValueMin(-32)
                .withValueMax(199),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ["genBasic", "genIdentify", "genGroups", "hvacThermostat", "hvacUserInterfaceCfg", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // Has Unknown power source, force it.
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        zigbeeModel: ["ST218", "SonomaStyle"],
        model: "ST218",
        vendor: "Stelpro",
        description: "Ki convector, line-voltage thermostat",
        extend: [stelproExtend.addStelproHvacThermostatCluster()],
        fromZigbee: [fzLocal.stelpro_thermostat, fz.hvac_user_interface],
        whiteLabel: [{description: "Style Fan Heater", model: "SonomaStyle", fingerprint: [{modelID: "SonomaStyle"}]}],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tzLocal.stelpro_thermostat_outdoor_temperature,
        ],
        exposes: [
            e.local_temperature(),
            e.keypad_lockout(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"])
                .withPiHeatingDemand(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ["genBasic", "genIdentify", "genGroups", "hvacThermostat", "hvacUserInterfaceCfg", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting<"hvacThermostat", StelproHvacThermostat>("hvacThermostat", [
                {
                    attribute: "stelproSystemMode",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 1,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["STZB402+", "STZB402"],
        model: "STZB402",
        vendor: "Stelpro",
        description: "Ki, line-voltage thermostat",
        extend: [stelproExtend.addStelproHvacThermostatCluster()],
        fromZigbee: [fzLocal.stelpro_thermostat, fz.hvac_user_interface, fz.humidity],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tzLocal.stelpro_thermostat_outdoor_temperature,
        ],
        exposes: [
            e.local_temperature(),
            e.keypad_lockout(),
            e.humidity(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ["genBasic", "genIdentify", "genGroups", "hvacThermostat", "hvacUserInterfaceCfg", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting<"hvacThermostat", StelproHvacThermostat>("hvacThermostat", [
                {
                    attribute: "stelproSystemMode",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 1,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["MaestroStat"],
        model: "SMT402",
        vendor: "Stelpro",
        description: "Maestro, line-voltage thermostat",
        extend: [stelproExtend.addStelproHvacThermostatCluster()],
        fromZigbee: [fzLocal.stelpro_thermostat, fz.hvac_user_interface, fz.humidity],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tzLocal.stelpro_thermostat_outdoor_temperature,
        ],
        exposes: [
            e.local_temperature(),
            e.keypad_lockout(),
            e.humidity(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msRelativeHumidity",
                "msTemperatureMeasurement",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await reporting.thermostatTemperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting<"hvacThermostat", StelproHvacThermostat>("hvacThermostat", [
                {
                    attribute: "stelproSystemMode",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 1,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["SORB"],
        model: "SORB",
        vendor: "Stelpro",
        description: "ORLÉANS fan heater",
        extend: [stelproExtend.addStelproHvacThermostatCluster()],
        fromZigbee: [fzLocal.stelpro_thermostat, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
        ],
        exposes: [
            e.local_temperature(),
            e.keypad_lockout(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = ["genBasic", "genIdentify", "genGroups", "hvacThermostat", "hvacUserInterfaceCfg", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro SORB
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting<"hvacThermostat", StelproHvacThermostat>("hvacThermostat", [
                {
                    attribute: "stelproSystemMode",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 1,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["SMT402AD"],
        model: "SMT402AD",
        vendor: "Stelpro",
        description: "Maestro, line-voltage thermostat",
        extend: [stelproExtend.addStelproHvacThermostatCluster()],
        fromZigbee: [fzLocal.stelpro_thermostat, fz.hvac_user_interface, fz.humidity],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tzLocal.stelpro_thermostat_outdoor_temperature,
        ],
        exposes: [
            e.local_temperature(),
            e.keypad_lockout(),
            e.humidity(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = [
                "genBasic",
                "genIdentify",
                "genGroups",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msRelativeHumidity",
                "msTemperatureMeasurement",
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await reporting.thermostatTemperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting<"hvacThermostat", StelproHvacThermostat>("hvacThermostat", [
                {
                    attribute: "stelproSystemMode",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 1,
                },
            ]);
        },
    },
];
