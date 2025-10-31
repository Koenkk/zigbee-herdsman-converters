import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;

const fzLocal = {
    led_trading_9133: {
        cluster: "greenPower",
        type: ["commandNotification", "commandCommissioningNotification"],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            if (utils.hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;
            if (commandID === 224) return;
            const lookup = {
                19: "press_1",
                20: "press_2",
                21: "press_3",
                22: "press_4",
                27: "hold_1",
                28: "hold_2",
                29: "hold_3",
                30: "hold_4",
            };
            return {action: utils.getFromLookup(commandID, lookup)};
        },
    } satisfies Fz.Converter<"greenPower", undefined, ["commandNotification", "commandCommissioningNotification"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "GreenPower_2", ieeeAddr: /^0x00000000427.....$/}],
        model: "9133",
        vendor: "LED-Trading",
        description: "Pushbutton transmitter module",
        fromZigbee: [fzLocal.led_trading_9133],
        toZigbee: [],
        exposes: [e.action(["press_1", "hold_1", "press_2", "hold_2", "press_3", "hold_3", "press_4", "hold_4"])],
    },
    {
        zigbeeModel: ["HK-LN-DIM-A"],
        model: "HK-LN-DIM-A",
        vendor: "LED-Trading",
        description: "Zigbee AC phase-cut dimmer",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["HK-LN-SOCKET-A", "HK-LN-SOCKET-EU-5"],
        model: "9134",
        vendor: "LED-Trading",
        description: "Powerstrip with 4 sockets and USB",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5}}), m.onOff({endpointNames: ["l1", "l2", "l3", "l4", "l5"]})],
    },
    {
        zigbeeModel: ["HK-ZCC-ZLL-A"],
        model: "9135",
        vendor: "LED-Trading",
        description: "Curtain motor controller",
        meta: {coverInverted: true},
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
];
