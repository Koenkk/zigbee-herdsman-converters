import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, ModernExtend} from "../lib/types";

const thermostatArgs: m.ThermostatArgs = {
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
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SWT-IZ"],
        model: "SWT-IZ",
        vendor: "Nobø",
        description: "Smart thermostat for floor heating control",
        extend: [m.identify(), m.thermostat(thermostatArgs), readThermostatStateOnStart()],
    },
    {
        zigbeeModel: ["SPC-IZ"],
        model: "SPC-IZ",
        vendor: "Nobø",
        description: "Control unit for panel heaters",
        extend: [m.identify(), m.thermostat(thermostatArgs), readThermostatStateOnStart()],
    },
];

const NAMESPACE = "zhc:nobo";

function readThermostatStateOnStart(): ModernExtend {
    return {
        onEvent: [
            async (event) => {
                if (event.type !== "start") return;

                const endpoint = event.data.device.getEndpoint(1);
                try {
                    await endpoint.read("hvacThermostat", [
                        "occupiedHeatingSetpoint",
                        "unoccupiedHeatingSetpoint",
                        "systemMode",
                        "runningMode",
                        "localTemp",
                    ]);
                } catch (error) {
                    logger.warning(`Failed to read thermostat state of '${event.data.device.ieeeAddr}' on start (${error})`, NAMESPACE);
                }
            },
        ],
        isModernExtend: true,
    };
}
