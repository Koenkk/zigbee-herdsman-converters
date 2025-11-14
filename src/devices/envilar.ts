import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZG_LED_DRIVER42CC"],
        model: "ZG_LED_DRIVER42CC",
        vendor: "Envilar",
        description: "Zigbee LED driver",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["ZG50CC-CCT-DRIVER", "HK-CCT"],
        model: "ZG50CC-CCT-DRIVER",
        vendor: "Envilar",
        description: "Zigbee CCT LED driver",
        extend: [m.light({colorTemp: {range: [160, 450]}})],
    },
    {
        zigbeeModel: ["ZGR904-S"],
        model: "ZGR904-S",
        vendor: "Envilar",
        description: "Touchlink remote",
        meta: {battery: {dontDividePercentage: true}},
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["recall_1", "recall_2", "on", "off", "brightness_stop", "brightness_move_up", "brightness_move_down"])],
    },
    {
        zigbeeModel: ["ZG102-BOX-UNIDIM"],
        model: "ZG102-BOX-UNIDIM",
        vendor: "Envilar",
        description: "Zigbee AC phase-cut dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["ZG302-BOX-RELAY"],
        model: "ZG302-BOX-RELAY",
        vendor: "Envilar",
        description: "Zigbee AC in wall switch",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["2CH-ZG-BOX-RELAY"],
        model: "2CH-ZG-BOX-RELAY",
        vendor: "Envilar",
        description: "2 channel box relay",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["7853"],
        model: "1CH-HP-RELAY-7853",
        vendor: "Envilar",
        description: "1 channel high power box relay",
        extend: [m.onOff({powerOnBehavior: true}), m.identify(), m.electricityMeter()],
        whiteLabel: [{vendor: "Sunricher", model: "SR-ZG9101SAC-HP-SWITCH-B"}],
    },
    {
        zigbeeModel: ["7848"],
        model: "7848",
        vendor: "Envilar",
        description: "Dimmable LED driver",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["5480"],
        model: "5480",
        vendor: "Envilar",
        description: "Zigbee CV dimmable LED driver",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["5463"],
        model: "5463",
        vendor: "Envilar",
        description: "Zigbee CCT dimmable LED driver",
        extend: [m.light({colorTemp: {range: [160, 450]}}), m.identify()],
    },
];
