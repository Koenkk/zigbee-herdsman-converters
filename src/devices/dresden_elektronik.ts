import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Expose} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["FLS-PP3", "FLS-PP3\u0000", "FLS-PP3 White\u0000"],
        model: "FLS-PP",
        vendor: "Dresden Elektronik",
        description: "Zigbee Light Link wireless electronic ballast",
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {rgb: 10, white: 11}}),
            m.light({colorTemp: {range: [153, 500]}, color: true, endpointNames: ["rgb", "white"]}),
        ],
    },
    {
        zigbeeModel: ["FLS-M"],
        model: "FLS-M",
        vendor: "Dresden Elektronik",
        description: "Universal LED controller (dynamic endpoints)",
        ota: true,
        meta: {
            supportsEnhancedHue: () => false,
        },
        endpoint: (device) => {
            const result: {[name: string]: number} = {};

            for (const ep of device.endpoints) {
                if (ep.inputClusters.includes(0x0006) || ep.inputClusters.includes(0x0008) || ep.inputClusters.includes(0x0300)) {
                    result[`light_${ep.ID}`] = ep.ID;
                }
            }

            return result;
        },
        exposes: (device): Expose[] => {
            const result: Expose[] = [];

            if (!("endpoints" in device)) return result;

            for (const ep of device.endpoints) {
                const name = `light_${ep.ID}`;

                if (ep.inputClusters.includes(0x0300)) {
                    result.push(e.light_colorhs().withBrightness().withColorTemp([140, 625]).withEndpoint(name));
                } else if (ep.inputClusters.includes(0x0008)) {
                    result.push(e.light_brightness().withEndpoint(name));
                }
            }

            return result;
        },

        configure: async (device, coordinatorEndpoint, logger) => {
            for (const ep of device.endpoints) {
                if (ep.inputClusters.includes(0x0300)) {
                    await ep.bind("lightingColorCtrl", coordinatorEndpoint);
                } else if (ep.inputClusters.includes(0x0008)) {
                    await ep.bind("genLevelCtrl", coordinatorEndpoint);
                } else if (ep.inputClusters.includes(0x0006)) {
                    await ep.bind("genOnOff", coordinatorEndpoint);
                }
            }
        },

        fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp],
        toZigbee: [tz.on_off, tz.light_onoff_brightness, tz.light_color, tz.light_colortemp],
    },
    {
        zigbeeModel: ["FLS-CT"],
        model: "FLS-CT",
        vendor: "Dresden Elektronik",
        description: "Zigbee Light Link wireless electronic ballast color temperature",
        ota: true,
        extend: [m.light({colorTemp: {range: [153, 500]}})],
    },
    {
        zigbeeModel: ["Kobold"],
        model: "Kobold",
        vendor: "Dresden Elektronik",
        description: "Zigbee 3.0 dimm actuator",
        ota: true,
        extend: [m.light()],
    },
    {
        zigbeeModel: ["Hive"],
        model: "Hive",
        vendor: "Phoscon",
        description: "Battery powered smart LED light",
        ota: true,
        extend: [m.light({colorTemp: {range: [153, 370]}, color: true}), m.battery()],
    },
    {
        zigbeeModel: ["FLS-A lp (1-10V)"],
        model: "FLS-A",
        vendor: "Dresden Elektronik",
        description: "Zigbee controller for 1-10V/PWM",
        meta: {disableDefaultResponse: true},
        ota: true,
        extend: [m.deviceEndpoints({endpoints: {l1: 11, l2: 12, l3: 13, l4: 14}}), m.light({endpointNames: ["l1", "l2", "l3", "l4"]})],
    },
    {
        zigbeeModel: ["FLS-H3"],
        model: "FLS-H",
        vendor: "Dresden Elektronik",
        description: "Zigbee Light Link wireless electronic ballast",
        ota: true,
        extend: [m.light({colorTemp: {range: [153, 500]}, color: true})],
    },
    {
        zigbeeModel: ["Scene Switch"],
        model: "BN-600085",
        vendor: "Dresden Elektronik",
        description: "3 part zigbee powered scene switch",
        ota: true,
        extend: [m.commandsOnOff(), m.commandsLevelCtrl(), m.commandsColorCtrl(), m.commandsScenes(), m.battery()],
    },
    {
        zigbeeModel: ["Lighting Switch"],
        model: "BN-600087",
        vendor: "Dresden Elektronik",
        description: "2 part zigbee powered light switch",
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2}}),
            m.commandsOnOff({endpointNames: ["1", "2"]}),
            m.commandsLevelCtrl({endpointNames: ["1", "2"]}),
            m.commandsColorCtrl({endpointNames: ["1", "2"]}),
            m.battery(),
        ],
    },
];
