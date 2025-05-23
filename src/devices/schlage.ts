import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["BE468"],
        model: "BE468",
        vendor: "Schlage",
        description: "Connect smart deadbolt",
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_pin_code_response, fz.lock_programming_event],
        toZigbee: [tz.lock, tz.pincode_lock],
        meta: {pinCodeCount: 30},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.endpoints[0];
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresDoorLock", "genPowerCfg"]);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery(), e.pincode(), e.lock_action(), e.lock_action_source_name(), e.lock_action_user()],
    },
];
