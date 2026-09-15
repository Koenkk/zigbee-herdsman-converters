import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";

const e = exposes.presets;

const fzLocal = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    SAGE206612_state: {
        cluster: "genOnOff",
        type: ["commandOn", "commandOff"],
        convert: (model, msg, publish, options, meta) => {
            const timeout = 28;

            if (!globalStore.hasValue(msg.endpoint, "action")) {
                globalStore.putValue(msg.endpoint, "action", []);
            }

            const lookup: KeyValueAny = {commandOn: "bell1", commandOff: "bell2"};
            const timer = setTimeout(() => globalStore.getValue(msg.endpoint, "action").pop(), timeout * 1000).unref();

            const list = globalStore.getValue(msg.endpoint, "action");
            if (list.length === 0 || list.length > 4) {
                list.push(timer);
                return {action: lookup[msg.type]};
            }
            if (timeout > 0) {
                list.push(timer);
            }
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["   Bell"],
        model: "SAGE206612",
        vendor: "EchoStar",
        description: "SAGE by Hughes doorbell sensor",
        fromZigbee: [fzLocal.SAGE206612_state, fz.battery],
        exposes: [e.battery(), e.action(["bell1", "bell2"])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
    },
    {
        zigbeeModel: [" Switch"],
        model: "SAGE206611",
        vendor: "EchoStar",
        description: "SAGE by Hughes single gang light switch",
        fromZigbee: [fz.command_on, fz.command_off],
        exposes: [e.action(["on", "off"])],
        toZigbee: [],
    },
];
