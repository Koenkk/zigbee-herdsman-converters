import {Zcl} from "zigbee-herdsman";
import type {Fz, KeyValue, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import {presets as e, access as ea} from "./exposes";
import * as m from "./modernExtend";

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.OSRAM_SYLVANIA};

interface OsramCluster {
    attributes: never;
    commands: {
        // biome-ignore lint/complexity/noBannedTypes: empty payload
        saveStartupParams: {};
        // biome-ignore lint/complexity/noBannedTypes: empty payload
        resetStartupParams: {};
        setPowerOnState: {mode: number};
    };
    commandResponses: never;
}

const ledvanceExtend = {
    addmanuSpecificOsramCluster: () =>
        m.deviceAddCustomCluster("manuSpecificOsram", {
            name: "manuSpecificOsram",
            ID: 0xfc0f,
            attributes: {},
            commands: {
                saveStartupParams: {name: "saveStartupParams", ID: 0x01, parameters: []},
                resetStartupParams: {name: "resetStartupParams", ID: 0x02, parameters: []},
                setPowerOnState: {name: "setPowerOnState", ID: 0x0c, parameters: [{name: "mode", type: Zcl.DataType.UINT8}]},
            },
            commandsResponse: {
                saveStartupParamsRsp: {name: "saveStartupParamsRsp", ID: 0x00, parameters: []},
            },
        }),
};

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
                    await entity.command<"manuSpecificOsram", "saveStartupParams", OsramCluster>(
                        "manuSpecificOsram",
                        "saveStartupParams",
                        {},
                        manufacturerOptions,
                    );
                } else if (value === false) {
                    await entity.command<"manuSpecificOsram", "resetStartupParams", OsramCluster>(
                        "manuSpecificOsram",
                        "resetStartupParams",
                        {},
                        manufacturerOptions,
                    );
                }
            }
        },
    } satisfies Tz.Converter,
};

export function ledvanceOnOff(args?: m.OnOffArgs) {
    args = {ota: true, configureReporting: true, ...args};
    return m.onOff(args);
}

export function ledvanceLight(args?: m.LightArgs): ModernExtend {
    args = {powerOnBehavior: false, ota: true, ...args};
    if (args.colorTemp) args.colorTemp.startup = false;
    if (args.color) args.color = {modes: ["xy", "hs"], ...(utils.isObject(args.color) ? args.color : {})};
    const extend = m.light(args);
    const customCluster = ledvanceExtend.addmanuSpecificOsramCluster();
    extend.onEvent = [...(customCluster.onEvent ?? []), ...(extend.onEvent ?? [])];
    extend.configure = [...(customCluster.configure ?? []), ...(extend.configure ?? [])];
    extend.toZigbee.push(ledvanceTz.ledvance_commands);
    return extend;
}

/** For LIGHTIFY bulbs without `genOnOff.startUpOnOff`, requires `ledvanceLight()` for the custom cluster. */
export function ledvancePowerOnBehavior(): ModernExtend {
    const toZigbee: Tz.Converter[] = [
        {
            key: ["power_on_behavior"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(value, key);
                value = value.toLowerCase();
                // Plain-object lookups also match inherited properties ("constructor", "__proto__"),
                // which would serialize mode 0x00 to the bulb, so match the two values explicitly.
                if (value !== "off" && value !== "on") throw new Error(`'${key}' must be 'off' or 'on', got '${value}'`);
                const mode = value === "off" ? 0x01 : 0x03;
                const response = await entity.command<"manuSpecificOsram", "setPowerOnState", OsramCluster>(
                    "manuSpecificOsram",
                    "setPowerOnState",
                    {mode},
                    manufacturerOptions,
                );
                // Herdsman doesn't throw on a negative default response, some firmwares reject this command.
                if (response?.statusCode) throw new Error(`Failed to set '${key}' (${Zcl.Status[response.statusCode]})`);
                return {state: {power_on_behavior: value}};
            },
        },
    ];
    return {toZigbee, exposes: [e.power_on_behavior(["off", "on"]).withAccess(ea.STATE_SET)], isModernExtend: true};
}
