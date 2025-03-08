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
                    flat: 7,
                    zero_gravity: 8,
                    reading: 9,
                    tv: 10,
                    clear_angles_settings: 16, // button type
                    massage: 21,
                    anti_snoring: 24,
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
    },
];
