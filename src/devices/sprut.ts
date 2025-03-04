import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Bed.box"],
        model: "Bed.box",
        vendor: "Sprut.device",
        description: "Sprut bed.box Ergomotion controller",
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {
            multiEndpoint: true,
        },
        exposes: [],
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    "1": 1,
                    "2": 2, // headSet
                    "3": 3, // legsSet
                    "4": 4, // massageHeadIntensity 0: off, 1-6: intensity
                    "5": 5, // massageLegsIntensity 0: off, 1-6: intensity
                    "6": 6, // massageDuration 0: off, 1: 10 min, 2: 20 min, 3: 30 min
                    "7": 7, // flat
                    "8": 8, // zeroGravity
                    "9": 9, // reading
                    "10": 10, // tv
                    "11": 11, // headGet
                    "12": 12, //legsGet
                    "13": 13,
                    "14": 14,
                    "15": 15,
                    "16": 16, // button type (clearAnglesSettings)
                    "17": 17,
                    "18": 18,
                    "19": 19,
                    "20": 20,
                    "21": 21, // massage
                    "22": 22,
                    "23": 23,
                    "24": 24, // antiSnoring
                    "25": 25,
                    "26": 26, // move
                    "27": 27, // stop
                },
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["7"],
                description: "Flat mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["8"],
                description: "Zero gravity mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["9"],
                description: "Reading mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["10"],
                description: "TV mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["16"],
                description: "Clear angle settings",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["21"],
                description: "Massage",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["24"],
                description: "Anti snoring mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["26"],
                description: "Move",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["27"],
                description: "Stop",
            }),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.endpoints.forEach(async (ep) => {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genOnOff"]);

                if ([7, 8, 9, 10, 16, 21, 24, 26, 27].includes(ep.ID)) {
                    reporting.bind(ep, coordinatorEndpoint, ["genOnOff"]);
                    reporting.onOff(ep);
                }

                if ([2, 3, 4, 5, 6].includes(ep.ID)) {
                    reporting.bind(ep, coordinatorEndpoint, ["genMultistateInput"]);
                }

                if ([11, 12].includes(ep.ID)) {
                    reporting.bind(ep, coordinatorEndpoint, ["genMultistateOutput"]);
                }
            });
        },
    },
];
