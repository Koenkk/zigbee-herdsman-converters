import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Emotion"],
        model: "A319463",
        vendor: "L&S Lighting",
        description: "Home base",
        fromZigbee: m.light({colorTemp: {range: [153, 454]}, color: true}).fromZigbee,
        toZigbee: m.light({colorTemp: {range: [153, 454]}, color: true}).toZigbee,
        configure: m.light({colorTemp: {range: [153, 454]}, color: true}).configure[0],
        exposes: (device, options) => {
            if (utils.isDummyDevice(device)) return [e.light_brightness_colortemp_colorxy([153, 454])];
            return [
                ...device.endpoints
                    .filter((ep) => ep.ID !== 242)
                    .map((ep) => {
                        return e.light_brightness_colortemp_colorxy([153, 454]).withEndpoint(`l${ep.ID}`);
                    }),
            ];
        },
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return Object.fromEntries(device.endpoints.filter((ep) => ep.ID !== 242).map((ep) => [`l${ep.ID}`, ep.ID]));
        },
    },
    {
        zigbeeModel: ["Mec Driver module"],
        model: "756200027",
        vendor: "L&S Lighting",
        description: "Mec Driver module 1-channel Zigbee (12V)",
        whiteLabel: [{model: "756200028", vendor: "L&S Lighting", description: "Mec Driver module 1-channel Zigbee (24V)"}],
        extend: [m.light({colorTemp: {range: [153, 500]}})],
    },
    {
        fingerprint: [
            {modelID: "Mec Driver module", softwareBuildID: "3.12.25-026"},
            {modelID: "Mec Driver module", softwareBuildID: "4.09.03-027"},
        ],
        model: "756200030",
        vendor: "L&S Lighting",
        description: "Mec Driver module 4-channel Zigbee (12V)",
        whiteLabel: [{model: "756200031", vendor: "L&S Lighting", description: "Mec Driver module 4-channel Zigbee (24V)"}],
        extend: [
            m.deviceEndpoints({endpoints: {11: 11, 12: 12, 13: 13, 14: 14}}),
            m.light({endpointNames: ["11", "12", "13", "14"], colorTemp: {range: [153, 500]}}),
        ],
    },
];
