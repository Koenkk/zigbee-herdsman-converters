import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const MODES = ["button_multi", "button_toggle", "button_scene", "rocker_toggle", "rocker_follow", "rocker_reverse"] as const;

const ACTION_SUFFIXES = [
    "toggle",
    "brightness_move_up",
    "brightness_move_down",
    "brightness_stop",
    "color_temperature_cool",
    "color_temperature_warm",
    "color_temperature_move_cooler",
    "color_temperature_move_warmer",
    "color_temperature_stop",
    "on",
    "off",
    "scene",
] as const;

const ACTIONS = [1, 2, 3, 4].flatMap((endpointId) => ACTION_SUFFIXES.map((suffix) => `ch${endpointId}_${suffix}`));

const ACTION_EVENT_CLUSTER = "h2ActionEvent";

interface H2ActionEventCluster {
    attributes: never;
    commands: {
        actionEvent: {action: number; sequence: number};
    };
    commandResponses: never;
}

const actionEventCluster = m.deviceAddCustomCluster(ACTION_EVENT_CLUSTER, {
    name: ACTION_EVENT_CLUSTER,
    ID: 0xfc10,
    attributes: {},
    commands: {
        actionEvent: {
            name: "actionEvent",
            ID: 0x00,
            parameters: [
                {name: "action", type: Zcl.DataType.UINT8},
                {name: "sequence", type: Zcl.DataType.UINT16},
            ],
        },
    },
    commandsResponse: {},
});

const MODE_DESCRIPTIONS = [
    "Button: short press toggles the switch; long press dims; double press changes color temperature.",
    "Button: short press toggles the switch; long press is ignored.",
    "Button: short press publishes a scene action for automation; long press is ignored.",
    "Rocker: every debounced position change toggles the light.",
    "Rocker: closed/low turns on; open/high turns off.",
    "Rocker: closed/low turns off; open/high turns on.",
].join("\n");

const endpointByModeProperty = {
    ch1_mode: 1,
    ch2_mode: 2,
    ch3_mode: 3,
    ch4_mode: 4,
} as const;

const modeFromZigbee = {
    cluster: "genMultistateValue",
    type: ["attributeReport", "readResponse"],
    convert: (_model, msg) => {
        if (msg.data.presentValue === undefined) return;
        const property = `ch${msg.endpoint.ID}_mode`;
        const mode = MODES[msg.data.presentValue];
        return mode === undefined ? undefined : {[property]: mode};
    },
} satisfies Fz.Converter<"genMultistateValue", undefined, ["attributeReport", "readResponse"]>;

const actionEventFromZigbee = {
    cluster: ACTION_EVENT_CLUSTER,
    type: ["commandActionEvent"] as const,
    convert: (_model, msg) => {
        const endpointId = msg.endpoint?.ID;
        const actionCode = msg.data?.action;
        const sequence = msg.data?.sequence;
        if (
            ![1, 2, 3, 4].includes(endpointId) ||
            !Number.isInteger(actionCode) ||
            actionCode < 1 ||
            actionCode > ACTION_SUFFIXES.length ||
            !Number.isInteger(sequence) ||
            sequence < 0 ||
            sequence > 0xffff
        ) {
            return;
        }

        const suffix = ACTION_SUFFIXES[actionCode - 1];
        if (!suffix) return;
        return {action: `ch${endpointId}_${suffix}`};
    },
} satisfies Fz.Converter<typeof ACTION_EVENT_CLUSTER, H2ActionEventCluster, readonly ["commandActionEvent"]>;

const channelModeToZigbee = {
    key: Object.keys(endpointByModeProperty),
    convertSet: async (_entity, key, value, meta) => {
        const endpointId = endpointByModeProperty[key as keyof typeof endpointByModeProperty];
        const mode = MODES.indexOf(value as (typeof MODES)[number]);
        if (endpointId === undefined || mode < 0) {
            throw new Error(`Unsupported channel mode: ${value}`);
        }

        const endpoint = meta.device.getEndpoint(endpointId);
        await endpoint.write("genMultistateValue", {presentValue: mode});
        return {state: {[key]: value}};
    },
    convertGet: async (_entity, key, meta) => {
        const endpointId = endpointByModeProperty[key as keyof typeof endpointByModeProperty];
        if (endpointId === undefined) {
            throw new Error(`Unknown channel mode property: ${key}`);
        }
        await meta.device.getEndpoint(endpointId).read("genMultistateValue", ["presentValue"]);
    },
} satisfies Tz.Converter;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["H2-ZB-SW-V1"],
        model: "H2-ZB-SW-V1",
        vendor: "JIMMY",
        description: "Four-channel USB-powered Zigbee router switch",
        extend: [actionEventCluster],
        fromZigbee: [modeFromZigbee, actionEventFromZigbee],
        toZigbee: [channelModeToZigbee],
        exposes: [
            e
                .enum("ch1_mode", ea.ALL, [...MODES])
                .withLabel("CH1 Mode")
                .withDescription(MODE_DESCRIPTIONS)
                .withCategory("config"),
            e
                .enum("ch2_mode", ea.ALL, [...MODES])
                .withLabel("CH2 Mode")
                .withDescription(MODE_DESCRIPTIONS)
                .withCategory("config"),
            e
                .enum("ch3_mode", ea.ALL, [...MODES])
                .withLabel("CH3 Mode")
                .withDescription(MODE_DESCRIPTIONS)
                .withCategory("config"),
            e
                .enum("ch4_mode", ea.ALL, [...MODES])
                .withLabel("CH4 Mode")
                .withDescription(MODE_DESCRIPTIONS)
                .withCategory("config"),
            e.action(ACTIONS),
        ],
        configure: async (device, coordinatorEndpoint) => {
            for (const endpointId of [1, 2, 3, 4]) {
                const endpoint = device.getEndpoint(endpointId);

                await endpoint.bind("genMultistateValue", coordinatorEndpoint);
                await endpoint.configureReporting("genMultistateValue", [
                    {
                        attribute: "presentValue",
                        minimumReportInterval: 0,
                        maximumReportInterval: 3600,
                        reportableChange: 0,
                    },
                ]);

                await endpoint.read("genMultistateValue", ["presentValue"]);
            }
        },
    },
];
