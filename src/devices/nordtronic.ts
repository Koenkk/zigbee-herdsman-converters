import * as m from "../lib/modernExtend";
import * as sunricher from "../lib/sunricher";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {modelID: "WSZ 98426061", manufacturerName: "Nordtronic A/S"},
            {modelID: "WSZ 98426061", manufacturerName: "Nordtronic"},
            {modelID: "98426061", manufacturerName: "Nordtronic A/S"},
            {modelID: "98426061", manufacturerName: "Nordtronic"},
        ],
        model: "98426061",
        vendor: "Nordtronic",
        description: "Remote Control",
        extend: [m.battery(), m.identify(), m.commandsOnOff(), m.commandsLevelCtrl(), m.commandsColorCtrl()],
    },
    {
        zigbeeModel: ["BoxDIM2 98425031", "98425031", "BoxDIMZ 98425031"],
        model: "98425031",
        vendor: "Nordtronic",
        description: "Box Dimmer 2.0",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["BoxRelay2 98423051", "98423051", "BoxRelayZ 98423051"],
        model: "98423051",
        vendor: "Nordtronic",
        description: "Zigbee switch 400W",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["RotDIM2 98424072", "98424072", "RotDIMZ 98424072"],
        model: "98424072",
        vendor: "Nordtronic",
        description: "Zigbee rotary dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
    },
    {
        zigbeeModel: ["BoxDimZG2 98425271"],
        model: "98425271",
        vendor: "Nordtronic",
        description: "Box Dimmer G2",
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
    },
    {
        fingerprint: [{modelID: "CoDIMZ 98425033", manufacturerName: "Nordtronic A/S"}],
        zigbeeModel: ["CoDIMZ 98425033"],
        model: "98425033",
        vendor: "Nordtronic",
        description: "Ceiling mounted zigbee micro smart dimmer",
        extend: [m.light({configureReporting: true}), m.electricityMeter(), sunricher.extend.externalSwitchType()],
    },
];
