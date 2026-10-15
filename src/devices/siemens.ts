import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RDZ101"],
        model: "RDZ101ZB",
        vendor: "Siemens",
        description: "Connected Home wireless room thermostat",
        extend: [
            m.battery(),
            m.thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 5, max: 35, step: 0.5},
                    },
                },
                systemMode: {values: ["off", "heat"]},
                runningState: {values: ["idle", "heat"]},
            }),
            m.bindCluster({cluster: "genPowerCfg", clusterType: "input"}),
        ],
    },
];
