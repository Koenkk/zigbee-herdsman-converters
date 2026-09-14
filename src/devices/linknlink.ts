import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "eMotion Air", manufacturerName: "LinknLink"}],
        model: "eMotion Air",
        vendor: "LinknLink",
        description: "Battery-Powered mmWave Presence Multi-Sensor",
        extend: [m.temperature(), m.humidity(), m.illuminance(), m.occupancy(), m.battery(), m.commandsOnOff(), m.commandsLevelCtrl()],
    },
];
