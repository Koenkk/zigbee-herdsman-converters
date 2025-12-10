import * as m from "../lib/modernExtend";
import * as sunricher from "../lib/sunricher";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SM308"],
        model: "SM308",
        vendor: "Samotech",
        description: "Zigbee AC in wall switch",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["SM308-S"],
        model: "SM308-S",
        vendor: "Samotech",
        description: "Zigbee in wall smart switch",
        extend: [m.onOff(), sunricher.extend.externalSwitchType()],
    },
    {
        zigbeeModel: ["SM308-2CH"],
        model: "SM308-2CH",
        vendor: "Samotech",
        description: "Zigbee 2 channel in wall switch",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]}), m.electricityMeter()],
        meta: {multiEndpointSkip: ["power", "energy", "voltage", "current"]},
    },
    {
        zigbeeModel: ["SM309-S"],
        model: "SM309-S",
        vendor: "Samotech",
        description: "Zigbee dimmer 400W with power and energy metering",
        extend: [m.light({configureReporting: true}), m.electricityMeter(), sunricher.extend.externalSwitchType()],
    },
    {
        zigbeeModel: ["SM309"],
        model: "SM309",
        vendor: "Samotech",
        description: "Zigbee dimmer 400W",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["SM309-S-2CH"],
        model: "SM309-S-2CH",
        vendor: "Samotech",
        description: "Zigbee 2 channel in wall dimmer",
        extend: [m.deviceEndpoints({endpoints: {1: 1, 2: 2}}), m.light({endpointNames: ["1", "2"]})],
        meta: {multiEndpoint: true},
    },
    {
        // v1 doesn't support electricity measurements
        // https://github.com/Koenkk/zigbee2mqtt/issues/21449
        fingerprint: [{manufacturerName: "Samotech", modelID: "Dimmer-Switch-ZB3.0"}],
        model: "SM323_v1",
        vendor: "Samotech",
        description: "Zigbee retrofit dimmer 250W",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["SM323"],
        fingerprint: [{modelID: "HK_DIM_A", manufacturerName: "Samotech"}],
        model: "SM323_v2",
        vendor: "Samotech",
        description: "Zigbee retrofit dimmer 250W",
        extend: [m.light({configureReporting: true}), m.electricityMeter(), sunricher.extend.externalSwitchType()],
    },
    {
        zigbeeModel: ["SM324"],
        model: "SM324",
        vendor: "Samotech",
        description: "220V Zigbee CCT LED dimmer",
        extend: [m.light({colorTemp: {range: [150, 500]}, configureReporting: true})],
    },
    {
        zigbeeModel: ["SM325-ZG"],
        model: "SM325-ZG",
        vendor: "Samotech",
        description: "Zigbee smart pull cord dimmer switch",
        extend: [m.light({configureReporting: true, effect: false, powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["SM315"],
        model: "SM315",
        vendor: "Samotech",
        description: "Zigbee rotary cord dimmer",
        extend: [m.light({configureReporting: true, effect: false, powerOnBehavior: false})],
    },
];
