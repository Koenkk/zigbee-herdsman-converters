import * as m from "../lib/modernExtend";
import {nodonPilotWire} from "../lib/nodon";
import type {DefinitionWithExtend} from "../lib/types";

const VAV_MANUFACTURER_CODE = 0x153a;
const VAV_PILOT_WIRE_CLUSTER = "customClusterVavPilotWire";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["VAV-256215-MOD1"],
        model: "VAV-256215-MOD1",
        vendor: "VAV",
        description: "Pilot wire heating module",
        extend: [
            m.onOff({powerOnBehavior: true}),
            m.electricityMeter({cluster: "metering"}),
            ...nodonPilotWire(true, VAV_MANUFACTURER_CODE, VAV_PILOT_WIRE_CLUSTER),
        ],
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
