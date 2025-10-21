import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["GWA1201_TWO_WAY_SWITCH"],
        model: "GWA1201_TWO_WAY_SWITCH",
        vendor: "Gewiss",
        description: "GWA1201",
        extend: [m.onOff(), m.electricityMeter(), m.identify()],
        ota: true,
    },
    {
        zigbeeModel: ["GWA1521_Actuator_1_CH_PF"],
        model: "GWA1521",
        description: "Switch actuator 1 channel with input",
        vendor: "Gewiss",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["GWA1522_Actuator_2_CH"],
        model: "GWA1522",
        description: "Switch actuator 2 channels with input",
        vendor: "Gewiss",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["GWA1531_Shutter"],
        model: "GWA1531",
        description: "Shutter actuator",
        vendor: "Gewiss",
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ["GWA1502_BinaryInput230V"],
        model: "GWA1502",
        vendor: "Gewiss",
        description: "Contact interface - 2 channels - 230V",
        meta: {multiEndpoint: true},
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.binary({
                name: "input",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: "MIN", max: "1_HOUR", change: 1},
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "State of input I1",
                access: "STATE_GET",
                endpointName: "1",
            }),
            m.binary({
                name: "input",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: "MIN", max: "1_HOUR", change: 1},
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "State of input I2",
                access: "STATE_GET",
                endpointName: "2",
            }),
        ],
    },
    {
        zigbeeModel: ["GWA1501_BinaryInput_FC"],
        model: "GWA1501",
        vendor: "Gewiss",
        description: "Contact interface - 2 channels",
        meta: {multiEndpoint: true},
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.battery(),
            m.binary({
                name: "input",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: "MIN", max: "MAX", change: 1},
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "State of input I1",
                access: "STATE_GET",
                endpointName: "1",
            }),
            m.binary({
                name: "input",
                cluster: "genBinaryInput",
                attribute: "presentValue",
                reporting: {min: "MIN", max: "MAX", change: 1},
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                description: "State of input I2",
                access: "STATE_GET",
                endpointName: "2",
            }),
        ],
    },
];
