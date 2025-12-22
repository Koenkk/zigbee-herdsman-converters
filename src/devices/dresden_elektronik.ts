import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Expose, Tz, Zh} from "../lib/types";

const e = exposes.presets;

const tzLocal = {
    flsm_color_hs: {
        key: ["color"],
        convertSet: async (entity: Zh.Endpoint | Zh.Group, key: string, value: unknown, meta: Tz.Meta): Promise<void> => {
            if (typeof value !== "object" || value === null) {
                return;
            }

            const v = value as {hue?: number; saturation?: number};

            if (typeof v.hue !== "number" || typeof v.saturation !== "number") {
                return;
            }

            const hue = Math.max(0, Math.min(254, Math.round((v.hue / 360) * 254)));
            const saturation = Math.max(0, Math.min(254, Math.round((v.saturation / 100) * 254)));

            await (entity as Zh.Endpoint).command("lightingColorCtrl", "moveToHueAndSaturation", {hue, saturation, transtime: 0}, {});
        },
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["FLS-PP3", "FLS-PP3\u0000", "FLS-PP3 White\u0000"],
        model: "Mega23M12",
        vendor: "Dresden Elektronik",
        description: "Zigbee Light Link wireless electronic ballast",
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {rgb: 10, white: 11}}),
            m.light({colorTemp: {range: undefined}, color: true, endpointNames: ["rgb", "white"]}),
        ],
    },
    {
        zigbeeModel: ["FLS-M"],
        model: "FLS-M",
        vendor: "Dresden Elektronik",
        description: "Universal LED controller (dynamic endpoints)",
        ota: true,
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
        toZigbee: [tz.on_off, tz.light_onoff_brightness, tzLocal.flsm_color_hs, tz.light_colortemp],
    },
    {
        zigbeeModel: ["FLS-CT"],
        model: "XVV-Mega23M12",
        vendor: "Dresden Elektronik",
        description: "Zigbee Light Link wireless electronic ballast color temperature",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["Kobold"],
        model: "BN-600110",
        vendor: "Dresden Elektronik",
        description: "Zigbee 3.0 dimm actuator",
        extend: [m.light()],
        ota: true,
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
        model: "BN-600078",
        vendor: "Dresden Elektronik",
        description: "Zigbee controller for 1-10V/PWM",
        extend: [m.deviceEndpoints({endpoints: {l1: 11, l2: 12, l3: 13, l4: 14}}), m.light({endpointNames: ["l1", "l2", "l3", "l4"]})],
        meta: {disableDefaultResponse: true},
    },
];
