import * as m from "../lib/modernExtend";
import {nodonPilotWire} from "../lib/nodon";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["VAV-256215-MOD1"],
        model: "VAV-256215-MOD1",
        vendor: "VAV",
        description: "Pilot wire heating module",
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"}), ...nodonPilotWire(true)],
        ota: true,
    },
    {
        zigbeeModel: ["VAV-256215-MOD2"],
        model: "VAV-256215-MOD2",
        vendor: "VAV",
        description: "Multifunction relay switch with metering",
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"})],
        ota: true,
    },
];
