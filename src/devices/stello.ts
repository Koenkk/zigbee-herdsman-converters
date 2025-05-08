import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;

const fzLocal = {
    power: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data["16392"] !== undefined) {
                return {power: msg.data["16392"]};
            }
        },
    } satisfies Fz.Converter,
    energy: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data["16393"] !== undefined) {
                return {energy: Number.parseFloat(msg.data["16393"]) / 1000};
            }
        },
    } satisfies Fz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["STLO-34"],
        model: "STLO-34",
        vendor: "Stello",
        description: "Hilo thermostat",
        fromZigbee: [fz.stelpro_thermostat, fz.hvac_user_interface, fzLocal.power, fzLocal.energy],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature,
        ],
        exposes: [
            e.local_temperature(),
            e.keypad_lockout(),
            e.power(),
            e.energy(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["heat"])
                .withRunningState(["idle", "heat"]),
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
];
