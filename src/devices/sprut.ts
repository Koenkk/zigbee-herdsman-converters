import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Bed.box"],
        model: "Bed.box",
        vendor: "Sprut.device",
        description: "Sprut bed.box ergomotion controller",
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    light: 1,
                    head_control: 2,
                    foot_control: 3,
                    head_massage_intensity: 4,
                    foot_massage_intensity: 5,
                    massage_duration: 6,
                    flat: 7,
                    zero_gravity: 8,
                    reading: 9,
                    tv: 10,
                    head_feedback: 11,
                    foot_feedback: 12,
                    clear_angles_settings: 16,
                    massage: 21,
                    anti_snoring: 24,
                    move: 26,
                    stop: 27,
                },
            }),
            m.numeric({
                name: "head_position",
                endpointNames: ["head_control"],
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Head position (0-100%)",
                valueMin: 0,
                valueMax: 100,
                unit: "%",
                reporting: {
                    min: 1,
                    max: 100,
                    change: 1,
                },
            }),
            m.numeric({
                name: "foot_position",
                endpointNames: ["foot_control"],
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Foot position (0-100%)",
                valueMin: 0,
                valueMax: 100,
                unit: "%",
                reporting: {
                    min: 1,
                    max: 100,
                    change: 1,
                },
            }),
            m.numeric({
                name: "current_head_position",
                endpointNames: ["head_feedback"],
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                description: "Current head position",
                access: "STATE_GET",
                unit: "%",
            }),
            m.numeric({
                name: "current_foot_position",
                endpointNames: ["foot_feedback"],
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                description: "Current foot position",
                access: "STATE_GET",
                unit: "%",
            }),
            m.enumLookup({
                name: "head_massage_intensity",
                endpointName: "head_massage_intensity",
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Head massage intensity (0-6)",
                lookup: {off: 0, one: 1, two: 2, three: 3, four: 4, five: 5},
            }),
            m.enumLookup({
                name: "foot_massage_intensity",
                endpointName: "foot_massage_intensity",
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Foot massage intensity (0-6)",
                lookup: {off: 0, one: 1, two: 2, three: 3, four: 4, five: 5},
            }),
            m.enumLookup({
                name: "massage_duration",
                endpointName: "massage_duration",
                cluster: "genMultistateInput",
                attribute: "presentValue",
                description: "Massage duration (0=off, 1=10min, 2=20min, 3=30min)",
                lookup: {off: 0, ten_min: 1, twenty_min: 2, thirty_min: 3},
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["flat"],
                description: "Flat mode",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["zero_gravity"],
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
                endpointNames: ["clear_angles_settings"],
                description: "Clear angle settings",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["massage"],
                description: "Massage",
            }),
            m.onOff({
                powerOnBehavior: false,
                endpointNames: ["anti_snoring"],
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
        meta: {multiEndpoint: true},
    },
];
