import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;

const fzLocal = {
    BSD29: {
        cluster: "64529",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const lookup = [
                {key: "28678", name: "power", factor: "acPower"},
                {key: "28677", name: "voltage", factor: "acVoltage"},
                {key: "28676", name: "current", factor: "acCurrent"},
            ];
            const payload: KeyValue = {};
            for (const entry of lookup) {
                if (msg.data[entry.key] !== undefined) {
                    const value = msg.data[entry.key] / 1000;
                    payload[entry.name] = value;
                }
            }
            return payload;
        },
    } satisfies Fz.Converter<"64529", undefined, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["CK-BL702-SWP-01(7020)"],
        model: "BSD29/BSD59",
        vendor: "Woolley",
        description: "Zigbee 3.0 smart plug",
        fromZigbee: [fz.on_off_skip_duplicate_transaction, fzLocal.BSD29],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
            device.powerSource = "Mains (single phase)";
            device.save();
        },
        exposes: [e.power(), e.current(), e.voltage(), e.switch()],
        onEvent: (event) => {
            if (event.type === "start") {
                event.data.device.customReadResponse = (frame) => {
                    if (frame.isCluster("genTime")) {
                        // Don't respond to genTime as device keeps spamming.
                        // https://github.com/Koenkk/zigbee2mqtt/issues/29673
                        return true;
                    }
                    return false;
                };
            }
        },
    },
];
