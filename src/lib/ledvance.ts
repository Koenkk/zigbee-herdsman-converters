import {Zcl} from "zigbee-herdsman";

import type {Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import * as m from "../lib/modernExtend";
import {isObject} from "./utils";

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.OSRAM_SYLVANIA};

export const ledvanceExtend = {
    addmanuSpecificOsramCluster: () =>
        m.deviceAddCustomCluster("manuSpecificOsram", {
            ID: 0xfc0f,
            attributes: {},
            commands: {
                saveStartupParams: {ID: 0x01, parameters: []},
                resetStartupParams: {ID: 0x02, parameters: []},
            },
            commandsResponse: {
                saveStartupParamsRsp: {ID: 0x00, parameters: []},
            },
        }),
}

export const ledvanceFz = {
    pbc_level_to_action: {
        cluster: "genLevelCtrl",
        type: ["commandMoveWithOnOff", "commandStopWithOnOff", "commandMove", "commandStop", "commandMoveToLevelWithOnOff"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const lookup: KeyValue = {
                commandMoveWithOnOff: "hold",
                commandMove: "hold",
                commandStopWithOnOff: "release",
                commandStop: "release",
                commandMoveToLevelWithOnOff: "toggle",
            };
            return {[utils.postfixWithEndpointName("action", msg, model, meta)]: lookup[msg.type]};
        },
    } satisfies Fz.Converter<
        "genLevelCtrl",
        undefined,
        ["commandMoveWithOnOff", "commandStopWithOnOff", "commandMove", "commandStop", "commandMoveToLevelWithOnOff"]
    >,
};

export const ledvanceTz = {
    ledvance_commands: {
        /* deprecated osram_*/
        key: ["set_transition", "remember_state", "osram_set_transition", "osram_remember_state"],
        convertSet: async (entity, key, value, meta) => {
            if (key === "osram_set_transition" || key === "set_transition") {
                if (value) {
                    utils.assertNumber(value, key);
                    const transition = value > 1 ? Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 10 : 1;
                    const payload = {18: {value: transition, type: 0x21}, 19: {value: transition, type: 0x21}};
                    await entity.write("genLevelCtrl", payload);
                }
            } else if (key === "osram_remember_state" || key === "remember_state") {
                if (value === true) {
                    await entity.command("manuSpecificOsram", "saveStartupParams", {}, manufacturerOptions);
                } else if (value === false) {
                    await entity.command("manuSpecificOsram", "resetStartupParams", {}, manufacturerOptions);
                }
            }
        },
    } satisfies Tz.Converter,
};

export function ledvanceOnOff(args?: m.OnOffArgs) {
    args = {ota: true, configureReporting: true, ...args};
    return m.onOff(args);
}

export function ledvanceLight(args?: m.LightArgs) {
    args = {powerOnBehavior: false, ota: true, ...args};
    if (args.colorTemp) args.colorTemp.startup = false;
    if (args.color) args.color = {modes: ["xy", "hs"], ...(isObject(args.color) ? args.color : {})};
    const result = m.light(args);
    result.toZigbee.push(ledvanceTz.ledvance_commands);
    return result;
}
