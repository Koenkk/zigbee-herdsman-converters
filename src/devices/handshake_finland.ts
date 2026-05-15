import {deviceEndpoints, light} from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["AGGE Zigbee 2 gang smart push dimmer"],
        model: "2619839",
        vendor: "Handshake Finland",
        description: "2 gang smart push dimmer",
        meta: {multiEndpoint: true},
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2}}), light({endpointNames: ["l1", "l2"], configureReporting: true})],
    },
];
