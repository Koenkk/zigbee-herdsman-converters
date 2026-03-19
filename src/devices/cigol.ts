import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import {determineEndpoint, getFromLookup, isDummyDevice} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

// Endpoint definitions for all hardware variants
const ALL_INPUT_ENDPOINTS = [
    1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
] as const;
const ALL_OUTPUT_ENDPOINTS = [21, 22, 23, 24, 25, 26, 27, 28, 51, 52, 53, 54, 55, 56, 57, 58] as const;

const fzLocal = {
    cigolInput: {
        cluster: "genMultistateInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValue = {};
            const value = msg.data.presentValue as number | undefined;
            const lookup = {0: "off", 1: "single", 2: "double", 4: "hold"};
            payload[`input_${msg.endpoint.ID}`] = getFromLookup(value, lookup, "off");
            return payload;
        },
    } satisfies Fz.Converter<"genMultistateInput", undefined, ["attributeReport", "readResponse"]>,
    cigolOutputStateReport: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (Object.hasOwn(msg.data, "onOff")) {
                return {[`state_${msg.endpoint.ID}`]: msg.data.onOff ? "ON" : "OFF"};
            }
            return {};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
    cigolSwitchActionReport: {
        cluster: "genOnOffSwitchCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (!Object.hasOwn(msg.data, "switchActions")) {
                return {};
            }
            const value = msg.data.switchActions as number;
            const lookup = {0: "on", 1: "off", 2: "toggle"};
            const action = getFromLookup(value, lookup, "off");
            return {[`switch_action_${msg.endpoint.ID}`]: action};
        },
    } satisfies Fz.Converter<"genOnOffSwitchCfg", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    cigolOutputWrite: {
        key: ["state"],
        convertSet: async (entity, key, value, meta) => {
            const endpoint = determineEndpoint(entity, meta, "genOnOff");
            if (!endpoint) {
                throw new Error("Endpoint not found");
            }
            const state = value.toString().toLowerCase();
            if (state === "on") {
                await endpoint.command("genOnOff", "on", {});
            } else if (state === "off") {
                await endpoint.command("genOnOff", "off", {});
            } else if (state === "toggle") {
                await endpoint.command("genOnOff", "toggle", {});
            } else {
                throw new Error(`Invalid state value: ${value}`);
            }
            return {state: {state: state.toUpperCase()}};
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = determineEndpoint(entity, meta, "genOnOff");
            if (!endpoint) {
                throw new Error("Endpoint not found");
            }
            await endpoint.read("genOnOff", ["onOff"]);
        },
    } satisfies Tz.Converter,

    cigolSwitchAction: {
        key: ["switch_action"],
        convertSet: async (entity, key, value, meta) => {
            const endpoint = determineEndpoint(entity, meta, "genOnOffSwitchCfg");
            if (!endpoint) {
                throw new Error("Endpoint not found");
            }
            if (typeof value !== "string") {
                throw new Error(`Invalid switch action payload: ${JSON.stringify(value)}. Expected a string value: off, on, toggle`);
            }
            const lookup = {on: 0, off: 1, toggle: 2} as const;
            const switchActionsValue = getFromLookup(value.toLowerCase(), lookup);
            if (switchActionsValue === undefined) {
                throw new Error(`Invalid switch action: ${value}. Valid values: Off, On, Toggle`);
            }
            await endpoint.write("genOnOffSwitchCfg", {switchActions: switchActionsValue});
            await endpoint.read("genOnOffSwitchCfg", ["switchActions"]);
            return {};
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = determineEndpoint(entity, meta, "genOnOffSwitchCfg");
            if (!endpoint) {
                throw new Error("Endpoint not found");
            }
            await endpoint.read("genOnOffSwitchCfg", ["switchActions"]);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["CIGOL_CONNECT"],
        model: "Cigol Connect",
        vendor: "Cigol Electronics",
        description: "Zigbee interface module for LK IHC installations",
        ota: true,
        fromZigbee: [fzLocal.cigolInput, fzLocal.cigolOutputStateReport, fzLocal.cigolSwitchActionReport],
        toZigbee: [tzLocal.cigolOutputWrite, tzLocal.cigolSwitchAction],
        exposes: (device, options) => {
            if (isDummyDevice(device)) {
                return [e.binary("state", ea.STATE_SET, "ON", "OFF").withDescription("Output state")];
            }

            const hasEndpoint = (ep: number): boolean => {
                return !!device.getEndpoint(ep);
            };

            const exposesArray = [];

            for (const ep of ALL_INPUT_ENDPOINTS) {
                if (hasEndpoint(ep)) {
                    let label: string;
                    if (ep < 30) label = `Input A-${ep}`;
                    else label = `Input B-${ep - 30}`;
                    exposesArray.push(
                        e
                            .enum("input", ea.STATE, ["off", "single", "double", "hold"])
                            .withDescription(`${label} (off, single, double, hold)`)
                            .withLabel(label)
                            .withEndpoint(`${ep}`),
                    );
                }
            }

            for (const ep of ALL_OUTPUT_ENDPOINTS) {
                if (hasEndpoint(ep)) {
                    let label: string;
                    if (ep < 50) label = `Output A-${ep - 20}`;
                    else label = `Output B-${ep - 50}`;
                    exposesArray.push(e.binary("state", ea.ALL, "ON", "OFF").withDescription(`Output ${ep}`).withLabel(label).withEndpoint(`${ep}`));
                }
            }

            for (const ep of ALL_INPUT_ENDPOINTS) {
                if (hasEndpoint(ep)) {
                    let label: string;
                    if (ep < 30) label = `A-${ep}`;
                    else label = `B-${ep - 30}`;
                    exposesArray.push(
                        e
                            .enum("switch_action", ea.ALL, ["off", "on", "toggle"])
                            .withDescription("Select what activating the input should do: Turn Off, Turn On, or Toggle")
                            .withLabel(`Activation function for input ${label}`)
                            .withEndpoint(`${ep}`),
                    );
                }
            }

            return exposesArray;
        },

        meta: {
            multiEndpoint: true,
        },

        endpoint: (device) => {
            const map: {[s: string]: number} = {};
            for (const ep of ALL_INPUT_ENDPOINTS) {
                if (device.getEndpoint(ep)) {
                    map[`${ep}`] = ep;
                }
            }
            for (const ep of ALL_OUTPUT_ENDPOINTS) {
                if (device.getEndpoint(ep)) {
                    map[`${ep}`] = ep;
                }
            }
            return map;
        },

        configure: async (device, coordinatorEndpoint) => {
            for (const ep of ALL_INPUT_ENDPOINTS) {
                const endpoint = device.getEndpoint(ep);
                if (endpoint) {
                    try {
                        await endpoint.bind("genMultistateInput", coordinatorEndpoint);
                        await endpoint.configureReporting("genMultistateInput", [
                            {
                                attribute: "presentValue",
                                minimumReportInterval: 0,
                                maximumReportInterval: 0,
                                reportableChange: 1,
                            },
                        ]);
                    } catch (err) {
                        console.warn(`Failed configuring input endpoint ${ep}: ${err}`);
                    }
                    await endpoint.read("genMultistateInput", ["presentValue"]);
                    await endpoint.read("genOnOffSwitchCfg", ["switchActions"]);
                }
            }

            for (const ep of ALL_OUTPUT_ENDPOINTS) {
                const endpoint = device.getEndpoint(ep);
                if (endpoint) {
                    try {
                        await endpoint.bind("genOnOff", coordinatorEndpoint);
                        await endpoint.configureReporting("genOnOff", [
                            {
                                attribute: "onOff",
                                minimumReportInterval: 5,
                                maximumReportInterval: 300,
                                reportableChange: 1,
                            },
                        ]);
                    } catch (err) {
                        console.warn(`Failed configuring output endpoint ${ep}: ${err}`);
                    }
                    await endpoint.read("genOnOff", ["onOff"]);
                }
            }
        },
    },
];
