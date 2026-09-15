import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TS0215"],
        model: "S9ZGBRC01",
        vendor: "Smart9",
        description: "Smart remote controller",
        fromZigbee: [fz.command_arm, fz.command_emergency, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(["disarm", "arm_day_zones", "arm_night_zones", "arm_all_zones", "exit_delay", "emergency"])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
        },
        extend: [m.iasArmCommandDefaultResponse()],
    },
];
