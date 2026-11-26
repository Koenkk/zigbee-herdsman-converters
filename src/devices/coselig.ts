import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

interface H2ActionEventCluster {
    attributes: never;
    commands: {actionEvent: {action: number; sequence: number}};
    commandResponses: never;
}

const channels = ["ch1", "ch2", "ch3", "ch4"];

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["H2-ZB-SW-V1"],
        model: "H2-ZB-SW-V1",
        vendor: "Coselig",
        description: "Four-channel switch",
        ota: true,
        extend: [
            m.deviceEndpoints({endpoints: {ch1: 1, ch2: 2, ch3: 3, ch4: 4}}),
            m.deviceAddCustomCluster("h2ActionEvent", {
                name: "h2ActionEvent",
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
            }),
            m.actionEnumLookup<"h2ActionEvent", H2ActionEventCluster, ["commandActionEvent"]>({
                cluster: "h2ActionEvent",
                commands: ["commandActionEvent"],
                attribute: "action",
                endpointNames: channels,
                actionLookup: {
                    toggle: 1,
                    brightness_move_up: 2,
                    brightness_move_down: 3,
                    brightness_stop: 4,
                    color_temperature_cool: 5,
                    color_temperature_warm: 6,
                    color_temperature_move_cooler: 7,
                    color_temperature_move_warmer: 8,
                    color_temperature_stop: 9,
                    on: 10,
                    off: 11,
                    scene: 12,
                },
            }),
            ...channels.map((endpointName) =>
                m.enumLookup({
                    name: "mode",
                    endpointName,
                    cluster: "genMultistateValue",
                    attribute: "presentValue",
                    lookup: {button_multi: 0, button_toggle: 1, button_scene: 2, rocker_toggle: 3, rocker_follow: 4, rocker_reverse: 5},
                    description: "Input mode of the channel",
                    reporting: {min: 0, max: "1_HOUR", change: 0},
                    entityCategory: "config",
                }),
            ),
        ],
    },
];
