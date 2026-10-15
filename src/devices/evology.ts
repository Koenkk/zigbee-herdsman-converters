import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PSE03-V1.1.0"],
        model: "PSE03-V1.1.0",
        vendor: "EVOLOGY",
        description: "Sound and flash siren",
        meta: {disableDefaultResponse: true},
        extend: [m.iasZoneAlarm({zoneType: "alarm", zoneAttributes: ["alarm_1", "tamper"]}), m.iasWarning({maxDuration: true})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
            await endpoint.read("ssIasZone", ["zoneState", "iasCieAddr", "zoneId", "zoneStatus"]);
            await endpoint.read("ssIasWd", ["maxDuration"]);
        },
    },
];
