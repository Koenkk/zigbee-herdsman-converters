import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";

// Device falls back to a 7 °C setpoint after losing the connection for ~5 minutes without reporting it,
// read the state on start so it isn't stale after a Z2M restart.
const readStateOnStart: ModernExtend = {
    onEvent: [
        async (event) => {
            if (event.type === "start") {
                await event.data.device
                    .getEndpoint(1)
                    .read("hvacThermostat", ["occupiedHeatingSetpoint", "unoccupiedHeatingSetpoint", "systemMode", "runningMode", "localTemp"])
                    .catch(() => {});
            }
        },
    ],
    isModernExtend: true,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SWT-IZ"],
        model: "SWT-IZ",
        vendor: "Nobø",
        description: "Smart thermostat for floor heating control",
        extend: [
            m.identify(),
            m.thermostat({
                systemMode: {values: ["off", "heat"]},
                runningMode: {values: ["off", "heat"]},
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 7, max: 32, step: 1},
                        unoccupiedHeatingSetpoint: {min: 7, max: 32, step: 1},
                    },
                },
                localTemperature: {
                    values: {
                        description: "Current temperature measured by the internal sensor",
                    },
                },
            }),
            readStateOnStart,
        ],
    },
    {
        zigbeeModel: ["SPC-IZ"],
        model: "SPC-IZ",
        vendor: "Nobø",
        description: "Control unit for panel heaters",
        extend: [
            m.identify(),
            m.thermostat({
                systemMode: {values: ["off", "heat"]},
                runningMode: {values: ["off", "heat"]},
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 7, max: 32, step: 1},
                        unoccupiedHeatingSetpoint: {min: 7, max: 32, step: 1},
                    },
                },
                localTemperature: {
                    values: {
                        description: "Current temperature measured by the internal sensor",
                    },
                },
            }),
            readStateOnStart,
        ],
    },
];
