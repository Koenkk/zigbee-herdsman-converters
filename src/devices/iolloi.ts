import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "Dimmer-Switch-ZB3.0", manufacturerName: "HZC"}],
        model: "ID-UK21FW09",
        vendor: "Iolloi",
        description: "Zigbee LED smart dimmer switch",
        extend: [m.light({effect: false, configureReporting: true})],
        whiteLabel: [{vendor: "Iolloi", model: "ID-EU20FW09"}],
    },
];
