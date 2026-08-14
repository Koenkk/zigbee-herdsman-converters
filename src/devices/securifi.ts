import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";

const e = exposes.presets;

const fzLocal = {
    almond_click: {
        cluster: "ssIasAce",
        type: ["commandArm"],
        convert: (model, msg, publish, options, meta) => {
            const action = msg.data.armmode;
            const lookup: KeyValueAny = {3: "single", 0: "double", 2: "long"};

            // Workaround to ignore duplicated (false) presses that
            // are 100ms apart, since the button often generates
            // multiple duplicated messages for a single click event.
            if (!globalStore.hasValue(msg.endpoint, "since")) {
                globalStore.putValue(msg.endpoint, "since", 0);
            }

            const now = Date.now();
            const since = globalStore.getValue(msg.endpoint, "since");

            if (now - since > 100 && lookup[action]) {
                globalStore.putValue(msg.endpoint, "since", now);
                return {action: lookup[action]};
            }
        },
    } satisfies Fz.Converter<"ssIasAce", undefined, ["commandArm"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PP-WHT-US"],
        model: "PP-WHT-US",
        vendor: "Securifi",
        description: "Peanut Smart Plug",
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement"]);
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {
                acVoltageMultiplier: 180,
                acVoltageDivisor: 39321,
                acCurrentMultiplier: 72,
                acCurrentDivisor: 39321,
                acPowerMultiplier: 10255,
                acPowerDivisor: 39321,
            });
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint, {change: 110}); // Voltage reports in 0.00458V
            await reporting.rmsCurrent(endpoint, {change: 55}); // Current reports in 0.00183A
            await reporting.activePower(endpoint, {change: 2}); // Power reports in 0.261W
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ["ZB2-BU01"],
        model: "B01M7Y8BP9",
        vendor: "Securifi",
        description: "Almond Click multi-function button",
        fromZigbee: [fzLocal.almond_click],
        exposes: [e.action(["single", "double", "long"])],
        toZigbee: [],
    },
];
