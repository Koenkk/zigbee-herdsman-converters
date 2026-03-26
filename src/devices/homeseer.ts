import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["DS150ZB"],
        model: "DS150ZB",
        vendor: "HomeSeer",
        description: "Door sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint.binds.some((b) => b.cluster.name === "genPollCtrl")) {
                await endpoint.unbind("genPollCtrl", coordinatorEndpoint);
            }
        },
    },
];
