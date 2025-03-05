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
                    flat: 7,
                    zeroGravity: 8,
                    reading: 9,
                    tv: 10,
                    "11": 11,
                    "12": 12,
                    "13": 13,
                    "14": 14,
                    "15": 15,
                    clearAnglesSettings: 16, // button type
                    "17": 17,
                    "18": 18,
                    "19": 19,
                    "20": 20,
                    massage: 21,
                    "22": 22,
                    "23": 23,
                    antiSnoring: 24,
                    "25": 25,
                    move: 26,
                    stop: 27,
                },
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["flat"],
                description: "Flat mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["zeroGravity"],
                description: "Zero gravity mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["reading"],
                description: "Reading mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["tv"],
                description: "TV mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["clearAnglesSettings"],
                description: "Clear angle settings",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["massage"],
                description: "Massage",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["antiSnoring"],
                description: "Anti snoring mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["move"],
                description: "Move",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["stop"],
                description: "Stop",
            }),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic", "genOnOff"]);

            for (const ep of device.endpoints) {
                if ([2, 3, 4, 5, 6].includes(ep.ID)) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genMultistateInput"]);
                }

                if ([11, 12].includes(ep.ID)) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genMultistateOutput"]);
                }
            }
        },
    },
];
