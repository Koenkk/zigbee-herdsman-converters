import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["intuisradiator                 "],
        model: "intuisradiator",
        vendor: "Intuis",
        description: "Radiator with nativ and intuis 3.0",
        extend: [
            m.deviceEndpoints({endpoints: {1: 1, 5: 5}}),
            m.electricityMeter({
                cluster: "metering",
                power: false,
                status: true,
                endpointNames: ["1"],
            }),
            m.occupancy({endpointNames: ["1"]}),
        ],
        fromZigbee: [fz.thermostat, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_running_state,
            tz.thermostat_system_mode,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
        ],
        exposes: [
            exposes.presets
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 7, 28, 0.5)
                .withSetpoint("unoccupied_heating_setpoint", 7, 28, 0.5)
                .withRunningState(["idle", "heat"])
                .withSystemMode(["off", "heat"])
                .withEndpoint("1"),
            exposes.presets.keypad_lockout(),
            new exposes.Enum("temperature_display_mode", exposes.access.ALL, ["celsius", "fahrenheit"]).withDescription(
                "Controls the temperature unit of the thermostat display.",
            ),
        ],
        configure: async (device, coordinatorEndpoint, definition) => {
            const endpoint = device.getEndpoint(1);

            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacUserInterfaceCfg"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);

            // These are not reportable so we poll them once
            await endpoint.read("hvacThermostat", ["unoccupiedHeatingSetpoint"]);
            await endpoint.read("hvacUserInterfaceCfg", ["tempDisplayMode"]);
            await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
        },
        meta: {multiEndpoint: true},
    },
];
