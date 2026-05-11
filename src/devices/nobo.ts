import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

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
        ],
    },
];
