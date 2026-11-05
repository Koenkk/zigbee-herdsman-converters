import {Zcl} from "zigbee-herdsman";

import {presets as e, access as ea} from "../lib/exposes";
import type {Fz, KeyValue, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";
import * as m from "./modernExtend";

const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.OSRAM_SYLVANIA};

const manufacturerCommandOptions = (meta: Tz.Meta, entity: Zh.Endpoint | Zh.Group) => ({
    ...manufacturerOptions,
    ...utils.getOptions(meta.mapped, entity),
});

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
                setPowerOnState: {name: "setPowerOnState", ID: 0x0c, parameters: [{name: "mode", type: 0x20}]},
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
                utils.assertBoolean(value, key);
                const command = value ? "saveStartupParams" : "resetStartupParams";
                await entity.command<"manuSpecificOsram", "saveStartupParams" | "resetStartupParams", OsramCluster>(
                    "manuSpecificOsram",
                    command,
                    {},
                    manufacturerCommandOptions(meta, entity),
                );
            }
        },
    } satisfies Tz.Converter,
    ledvance_power_on_behavior: {
        key: ["power_on_behavior"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, key);
            // getFromLookup already tries lower/upper variants; the lowercase value is
            // needed only to echo the normalized state, which must match the expose values.
            value = value.toLowerCase();
            // Firmware only accepts 0x01 (power on off) and 0x03 (power on on); there is no
            // toggle/previous power-on mode on these bulbs. Firmware rejects any other
            // payload with INVALID_VALUE without writing.
            const lookup: Record<string, number> = {off: 0x01, on: 0x03};
            const mode = utils.getFromLookup(value, lookup);
            await entity.command<"manuSpecificOsram", "setPowerOnState", OsramCluster>(
                "manuSpecificOsram",
                "setPowerOnState",
                {mode},
                manufacturerCommandOptions(meta, entity),
            );
            return {state: {power_on_behavior: value}};
        },
    } satisfies Tz.Converter,
};

export function ledvanceOnOff(args?: m.OnOffArgs) {
    args = {ota: true, configureReporting: true, ...args};
    return m.onOff(args);
}

export function ledvanceLight(args?: m.LightArgs & {osramPowerOnState?: boolean}): ModernExtend {
    const {osramPowerOnState = false, ...lightArgs} = args ?? {};
    // ?? keeps the LIGHTIFY default in one place: an explicitly passed undefined would
    // otherwise re-enable the standard genOnOff converter inside m.light.
    args = {ota: true, ...lightArgs, powerOnBehavior: lightArgs.powerOnBehavior ?? false};
    if (args.colorTemp) args.colorTemp.startup = false;
    if (args.color) args.color = {modes: ["xy", "hs"], ...(utils.isObject(args.color) ? args.color : {})};
    const extend = m.light(args);
    const customCluster = ledvanceExtend.addmanuSpecificOsramCluster();
    extend.onEvent = [...(customCluster.onEvent ?? []), ...(extend.onEvent ?? [])];
    extend.configure = [...(customCluster.configure ?? []), ...(extend.configure ?? [])];
    extend.toZigbee.push(ledvanceTz.ledvance_commands);
    // Legacy OSRAM LIGHTIFY firmware lacks genOnOff.startUpOnOff; power-on state goes
    // through the manufacturer cluster instead (see ledvance_power_on_behavior). Opt-in
    // per definition, on models verified to run the firmware implementing the command
    // (V1.05.10, verified on AC03641 and AB32840); an explicit powerOnBehavior: true
    // keeps the standard genOnOff implementation instead.
    if (osramPowerOnState && !args.powerOnBehavior) {
        const powerOnStateConverter = args.endpointNames
            ? {...ledvanceTz.ledvance_power_on_behavior, endpoints: args.endpointNames}
            : ledvanceTz.ledvance_power_on_behavior;
        extend.toZigbee.push(powerOnStateConverter);
        // No readable attribute, so no convertGet; STATE reflects the echoed last-set value.
        const expose = e.power_on_behavior(["off", "on"]).withAccess(ea.STATE_SET);
        extend.exposes.push(...utils.exposeEndpoints(expose, args.endpointNames));
    }
    return extend;
}
