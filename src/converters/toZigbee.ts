import {Zcl} from "zigbee-herdsman";
import type {TClusterCommandPayload} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import * as libColor from "../lib/color";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as light from "../lib/light";
import {logger} from "../lib/logger";
import * as globalStore from "../lib/store";
import type {KeyValue, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import {determineEndpoint} from "../lib/utils";

const NS = "zhc:tz";

export const on_off: Tz.Converter = {
    key: ["state", "on_time", "off_wait_time"],
    convertSet: async (entity, key, value, meta) => {
        const state = utils.isString(meta.message.state) ? meta.message.state.toLowerCase() : null;
        utils.validateValue(state, ["toggle", "off", "on"]);

        if (state === "on" && (meta.message.on_time != null || meta.message.off_wait_time != null)) {
            const onTime = meta.message.on_time != null ? meta.message.on_time : 0;
            const offWaitTime = meta.message.off_wait_time != null ? meta.message.off_wait_time : 0;

            if (typeof onTime !== "number") {
                throw new Error("The on_time value must be a number!");
            }
            if (typeof offWaitTime !== "number") {
                throw new Error("The off_wait_time value must be a number!");
            }
            const payload = meta.converterOptions
                ? // TODO: better typing? currently used in a single place??
                  (meta.converterOptions as TClusterCommandPayload<"genOnOff", "onWithTimedOff">)
                : {ctrlbits: 0, ontime: Math.round(onTime * 10), offwaittime: Math.round(offWaitTime * 10)};
            await entity.command("genOnOff", "onWithTimedOff", payload, utils.getOptions(meta.mapped, entity));
        } else {
            await entity.command("genOnOff", state as "toggle" | "off" | "on", {}, utils.getOptions(meta.mapped, entity));
            if (state === "toggle") {
                const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ""}`];
                return currentState ? {state: {state: currentState === "OFF" ? "ON" : "OFF"}} : {};
            }
            return {state: {state: state.toUpperCase()}};
        }
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genOnOff", ["onOff"]);
    },
};
export const light_color: Tz.Converter = {
    key: ["color"],
    options: [exposes.options.color_sync(), exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        const newColor = libColor.Color.fromConverterArg(value);
        const newState: KeyValueAny = {};
        const transtime = utils.getTransition(entity, key, meta).time;
        const supportsHueAndSaturation = utils.getMetaValue(entity, meta.mapped, "supportsHueAndSaturation", "allEqual", false);
        const supportsEnhancedHue = utils.getMetaValue(entity, meta.mapped, "supportsEnhancedHue", "allEqual", false);

        if (newColor.isHSV() && supportsHueAndSaturation) {
            const hsv = newColor.hsv;
            const hsvCorrected = hsv.colorCorrected(meta);
            newState.color_mode = constants.colorModeLookup[0];
            newState.color = hsv.toObject(false);

            if (hsv.value !== null && utils.isObject(value)) {
                await entity.command(
                    "genLevelCtrl",
                    "moveToLevelWithOnOff",
                    {level: utils.mapNumberRange(hsvCorrected.value, 0, 100, 0, 254), transtime, optionsMask: 0, optionsOverride: 0},
                    utils.getOptions(meta.mapped, entity),
                );
            }

            if (hsv.hue !== null && hsv.saturation !== null) {
                const saturation = utils.mapNumberRange(hsvCorrected.saturation, 0, 100, 0, 254);

                if (supportsEnhancedHue) {
                    const enhancehue = utils.mapNumberRange(hsvCorrected.hue, 0, 360, 0, 65535);
                    await entity.command(
                        "lightingColorCtrl",
                        "enhancedMoveToHueAndSaturation",
                        {transtime, enhancehue, saturation, optionsMask: 0, optionsOverride: 0},
                        utils.getOptions(meta.mapped, entity),
                    );
                } else {
                    const hue = utils.mapNumberRange(hsvCorrected.hue, 0, 360, 0, 254);
                    await entity.command(
                        "lightingColorCtrl",
                        "moveToHueAndSaturation",
                        {transtime, hue, saturation, optionsMask: 0, optionsOverride: 0},
                        utils.getOptions(meta.mapped, entity),
                    );
                }
            } else if (hsv.hue !== null) {
                const direction = ((value as KeyValue).direction as number) || 0;

                if (supportsEnhancedHue) {
                    const enhancehue = utils.mapNumberRange(hsvCorrected.hue, 0, 360, 0, 65535);
                    await entity.command(
                        "lightingColorCtrl",
                        "enhancedMoveToHue",
                        {transtime, enhancehue, direction, optionsMask: 0, optionsOverride: 0},
                        utils.getOptions(meta.mapped, entity),
                    );
                } else {
                    const hue = utils.mapNumberRange(hsvCorrected.hue, 0, 360, 0, 254);
                    await entity.command(
                        "lightingColorCtrl",
                        "moveToHue",
                        {transtime, hue, direction, optionsMask: 0, optionsOverride: 0},
                        utils.getOptions(meta.mapped, entity),
                    );
                }
            } else if (hsv.saturation !== null) {
                const saturation = utils.mapNumberRange(hsvCorrected.saturation, 0, 100, 0, 254);

                await entity.command(
                    "lightingColorCtrl",
                    "moveToSaturation",
                    {transtime, saturation, optionsMask: 0, optionsOverride: 0},
                    utils.getOptions(meta.mapped, entity),
                );
            }
        } else if (newColor.isRGB() || newColor.isXY() || newColor.isHSV()) {
            // convert RGB/HSV to XY color mode
            // (many devices only support XY, some support also HSV, but RGB is not supported at all)
            const xy = newColor.isRGB()
                ? newColor.rgb.gammaCorrected().toXY().rounded(4)
                : newColor.isHSV()
                  ? newColor.hsv.colorCorrected(meta).toXY().rounded(4)
                  : newColor.xy;

            // Some bulbs e.g. RB 185 C don't turn to red (they don't respond at all) when x: 0.701 and y: 0.299
            // is send. These values are e.g. send by Home Assistant when clicking red in the color wheel.
            // If we slightly modify these values the bulb will respond.
            // https://github.com/home-assistant/home-assistant/issues/31094
            if (utils.getMetaValue(entity, meta.mapped, "applyRedFix", "allEqual", false) && xy.x === 0.701 && xy.y === 0.299) {
                xy.x = 0.7006;
                xy.y = 0.2993;
            }

            newState.color_mode = constants.colorModeLookup[1];
            newState.color = xy.toObject();
            const colorx = utils.mapNumberRange(xy.x, 0, 1, 0, 65535);
            const colory = utils.mapNumberRange(xy.y, 0, 1, 0, 65535);

            await entity.command(
                "lightingColorCtrl",
                "moveToColor",
                {transtime, colorx, colory, optionsMask: 0, optionsOverride: 0},
                utils.getOptions(meta.mapped, entity),
            );
        } else {
            throw new Error("Invalid color");
        }

        return {state: libColor.syncColorState(newState, meta.state, entity, meta.options)};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingColorCtrl", light.readColorAttributes(entity, meta));
    },
};
export const light_colortemp: Tz.Converter = {
    key: ["color_temp", "color_temp_percent"],
    options: [exposes.options.color_sync(), exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        const [colorTempMin, colorTempMax] = light.findColorTempRange(entity);
        const preset = {warmest: colorTempMax, warm: 454, neutral: 370, cool: 250, coolest: colorTempMin};

        if (key === "color_temp_percent") {
            utils.assertNumber(value);
            value = utils
                .mapNumberRange(value, 0, 100, colorTempMin != null ? colorTempMin : 154, colorTempMax != null ? colorTempMax : 500)
                .toString();
        }

        if (utils.isString(value) && value in preset) {
            value = utils.getFromLookup(value, preset);
        }

        value = Number(value);

        // ensure value within range
        utils.assertNumber(value);
        value = light.clampColorTemp(value, colorTempMin, colorTempMax);

        await entity.command(
            "lightingColorCtrl",
            "moveToColorTemp",
            {colortemp: value as number, transtime: utils.getTransition(entity, key, meta).time, optionsMask: 0, optionsOverride: 0},
            utils.getOptions(meta.mapped, entity),
        );
        return {
            state: libColor.syncColorState({color_mode: constants.colorModeLookup[2], color_temp: value}, meta.state, entity, meta.options),
        };
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingColorCtrl", ["colorMode", "colorTemperature"]);
    },
};

// #region Generic converters
export const read: Tz.Converter = {
    key: ["read"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const result = await entity.read(value.cluster, value.attributes, value.options != null ? value.options : {});
        logger.info(`Read result of '${value.cluster}': ${JSON.stringify(result)}`, NS);
        if (value.state_property != null) {
            return {state: {[value.state_property]: result}};
        }
    },
};
export const write: Tz.Converter = {
    key: ["write"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const options = utils.getOptions(meta.mapped, entity);
        if (value.options != null) {
            Object.assign(options, value.options);
        }
        await entity.write(value.cluster, value.payload, options);
        logger.info(`Wrote '${JSON.stringify(value.payload)}' to '${value.cluster}'`, NS);
    },
};
export const command: Tz.Converter = {
    key: ["command"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const options = utils.getOptions(meta.mapped, entity);
        await entity.command(value.cluster, value.command, value.payload != null ? value.payload : {}, options);
        logger.info(`Invoked '${value.cluster}.${value.command}' with payload '${JSON.stringify(value.payload)}'`, NS);
    },
};
export const factory_reset: Tz.Converter = {
    key: ["reset"],
    convertSet: async (entity, key, value, meta) => {
        await entity.command("genBasic", "resetFactDefault", {}, utils.getOptions(meta.mapped, entity));
    },
};
export const identify: Tz.Converter = {
    key: ["identify"],
    options: [exposes.options.identify_timeout()],
    convertSet: async (entity, key, value, meta) => {
        // External value takes priority over options for compatibility
        const identifyTimeout = (value as number) ?? (meta.options.identify_timeout as number) ?? 3;
        await entity.command("genIdentify", "identify", {identifytime: identifyTimeout}, utils.getOptions(meta.mapped, entity));
    },
};
export const zcl_command: Tz.Converter = {
    key: ["zclcommand"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const payload = value.payload != null ? value.payload : {};
        utils.assertEndpoint(entity);
        await entity.zclCommand(
            value.cluster,
            value.command,
            payload,
            value.options ?? {},
            value.log_payload ?? {},
            value.check_status ?? false,
            value.frametype ?? Zcl.FrameType.SPECIFIC,
        );
        if (value.logging ?? false) {
            logger.info(`Invoked ZCL command ${value.cluster}.${value.command} with payload '${JSON.stringify(payload)}'`, NS);
        }
    },
};
export const arm_mode: Tz.Converter = {
    key: ["arm_mode"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertEndpoint(entity);
        utils.assertObject(value, key);
        if (Array.isArray(meta.mapped)) throw new Error("Not supported for groups");
        const isNotification = value.transaction != null;
        const modeSrc = isNotification ? constants.armNotification : constants.armMode;
        const mode = utils.getKey(modeSrc, value.mode, undefined, Number);
        if (mode === undefined) {
            throw new Error(`Unsupported mode: '${value.mode}', should be one of: ${Object.values(modeSrc)}`);
        }

        if (isNotification) {
            await entity.commandResponse("ssIasAce", "armRsp", {armnotification: mode}, {}, value.transaction);

            // Do not update PanelStatus after confirming transaction.
            // Instead the server should send an arm_mode command with the necessary state.
            // e.g. exit_delay as a result of arm_all_zones
            return;
        }

        let panelStatus = mode;
        if (meta.mapped.model === "3400-D") {
            panelStatus = mode !== 0 && mode !== 4 ? 0x80 : 0x00;
        }

        let secondsRemain = 0;
        let delayUntil = 0;
        if ((mode === 4 || mode === 5) && value.delay != null) {
            utils.assertNumber(value.delay, "delay");
            if (!utils.isInRange(0, constants.iasMaxSecondsRemain, value.delay)) {
                throw new Error(`Invalid delay value: ${value.delay} (expected ${0} to ${constants.iasMaxSecondsRemain})`);
            }

            secondsRemain = Math.round(value.delay);
            delayUntil = performance.now() + value.delay * 1000;
        }

        let audibleNotif = 0;
        if (value.audiblenotif != null) {
            utils.assertNumber(value.audiblenotif, "audiblenotif");
            if (!utils.isInRange(0, 255, value.audiblenotif)) {
                throw new Error(`Invalid audiblenotif value: ${value.audiblenotif} (expected ${0} to ${255})`);
            }

            audibleNotif = Math.round(value.audiblenotif);
        }

        globalStore.putValue(entity, "panelStatus", panelStatus);
        globalStore.putValue(entity, "delayUntil", delayUntil);
        globalStore.putValue(entity, "audibleNotif", audibleNotif);
        const payload = {panelstatus: panelStatus, secondsremain: secondsRemain, audiblenotif: audibleNotif, alarmstatus: 0};
        await entity.commandResponse("ssIasAce", "panelStatusChanged", payload);
    },
};
export const battery_percentage_remaining: Tz.Converter = {
    key: ["battery"],
    convertGet: async (entity, key, meta) => {
        await entity.read("genPowerCfg", ["batteryPercentageRemaining"]);
    },
};
export const battery_voltage: Tz.Converter = {
    key: ["battery", "voltage"],
    convertGet: async (entity, key, meta) => {
        await entity.read("genPowerCfg", ["batteryVoltage"]);
    },
};
export const power_on_behavior: Tz.Converter = {
    key: ["power_on_behavior"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        value = value.toLowerCase();
        const lookup = {off: 0, on: 1, toggle: 2, previous: 255};
        try {
            await entity.write("genOnOff", {startUpOnOff: utils.getFromLookup(value, lookup)}, utils.getOptions(meta.mapped, entity));
        } catch (error) {
            if ((error as Error).message.includes("UNSUPPORTED_ATTRIBUTE")) {
                throw new Error("Got `UNSUPPORTED_ATTRIBUTE` error, device does not support power on behaviour");
            }
            throw error;
        }
        return {state: {power_on_behavior: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genOnOff", ["startUpOnOff"]);
    },
};
export const light_color_mode: Tz.Converter = {
    key: ["color_mode"],
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingColorCtrl", ["colorMode"]);
    },
};
export const light_color_options: Tz.Converter = {
    key: ["color_options"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const options = value.execute_if_off != null && value.execute_if_off ? 1 : 0;
        await entity.write("lightingColorCtrl", {options}, utils.getOptions(meta.mapped, entity));
        return {state: {color_options: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingColorCtrl", ["options"]);
    },
};
export const lock: Tz.Converter = {
    key: ["state"],
    convertSet: async (entity, key, value, meta) => {
        // If no pin code is provided, value is a only string. Ex: "UNLOCK"
        let state = utils.isString(value) ? value.toUpperCase() : null;
        let pincode = "";
        // If pin code is provided, value is an object including new state and code. Ex: {state: "UNLOCK", code: "1234"}
        if (utils.isObject(value)) {
            if (value.code) {
                pincode = utils.isString(value.code) ? value.code : "";
            }
            if (value.state) {
                state = utils.isString(value.state) ? value.state.toUpperCase() : null;
            }
        }
        utils.validateValue(state, ["LOCK", "UNLOCK", "TOGGLE"]);
        await entity.command(
            "closuresDoorLock",
            `${state.toLowerCase() as "lock" | "unlock" | "toggle"}Door`,
            {pincodevalue: Buffer.from(pincode, "ascii")},
            utils.getOptions(meta.mapped, entity),
        );
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresDoorLock", ["lockState"]);
    },
};
export const lock_auto_relock_time: Tz.Converter = {
    key: ["auto_relock_time"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("closuresDoorLock", {autoRelockTime: value as number}, utils.getOptions(meta.mapped, entity));
        return {state: {auto_relock_time: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresDoorLock", ["autoRelockTime"]);
    },
};
export const lock_sound_volume: Tz.Converter = {
    key: ["sound_volume"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        utils.validateValue(value, constants.lockSoundVolume);
        await entity.write("closuresDoorLock", {soundVolume: constants.lockSoundVolume.indexOf(value)}, utils.getOptions(meta.mapped, entity));
        return {state: {sound_volume: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresDoorLock", ["soundVolume"]);
    },
};
export const pincode_lock: Tz.Converter = {
    key: ["pin_code"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const user = value.user;
        const userType = value.user_type || "unrestricted";
        const userEnabled = value.user_enabled != null ? value.user_enabled : true;
        const pinCode = value.pin_code;
        if (Number.isNaN(user)) throw new Error("user must be numbers");
        const pinCodeCount = utils.getMetaValue<number>(entity, meta.mapped, "pinCodeCount");
        if (!utils.isInRange(0, pinCodeCount - 1, user)) throw new Error("user must be in range for device");

        if (pinCode == null) {
            await entity.command("closuresDoorLock", "clearPinCode", {userid: user}, utils.getOptions(meta.mapped, entity));
        } else {
            if (Number.isNaN(pinCode)) throw new Error("pinCode must be a number");
            const typeLookup = {unrestricted: 0, year_day_schedule: 1, week_day_schedule: 2, master: 3, non_access: 4};
            const payload = {
                userid: user,
                userstatus: userEnabled ? 1 : 3,
                usertype: utils.getFromLookup(userType, typeLookup),
                pincodevalue: pinCode.toString(),
            };
            await entity.command("closuresDoorLock", "setPinCode", payload, utils.getOptions(meta.mapped, entity));
        }
    },
    convertGet: async (entity, key, meta) => {
        // @ts-expect-error ignore
        const user = meta?.message?.pin_code ? meta.message.pin_code.user : undefined;
        if (user === undefined) {
            const max = utils.getMetaValue<number>(entity, meta.mapped, "pinCodeCount");
            // Get all
            const options = utils.getOptions(meta.mapped, entity);
            for (let i = 0; i < max; i++) {
                await entity.command("closuresDoorLock", "getPinCode", {userid: i}, options);
            }
        } else {
            if (Number.isNaN(user)) {
                throw new Error("user must be numbers");
            }
            const pinCodeCount = utils.getMetaValue<number>(entity, meta.mapped, "pinCodeCount");
            if (!utils.isInRange(0, pinCodeCount - 1, user)) {
                throw new Error("userId must be in range for device");
            }

            await entity.command("closuresDoorLock", "getPinCode", {userid: user}, utils.getOptions(meta.mapped, entity));
        }
    },
};
export const lock_userstatus: Tz.Converter = {
    key: ["user_status"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const user = value.user;
        if (Number.isNaN(user)) {
            throw new Error("user must be numbers");
        }
        const pinCodeCount = utils.getMetaValue<number>(entity, meta.mapped, "pinCodeCount");
        if (!utils.isInRange(0, pinCodeCount - 1, user)) {
            throw new Error("user must be in range for device");
        }

        const status = utils.getKey(constants.lockUserStatus, value.status, undefined, Number);

        if (status === undefined) {
            throw new Error(`Unsupported status: '${value.status}', should be one of: ${Object.values(constants.lockUserStatus)}`);
        }

        await entity.command(
            "closuresDoorLock",
            "setUserStatus",
            {
                userid: user,
                userstatus: status,
            },
            utils.getOptions(meta.mapped, entity),
        );
    },
    convertGet: async (entity, key, meta) => {
        // @ts-expect-error ignore
        const user = meta?.message?.user_status ? meta.message.user_status.user : undefined;
        const pinCodeCount = utils.getMetaValue<number>(entity, meta.mapped, "pinCodeCount");
        if (user === undefined) {
            const max = pinCodeCount;
            // Get all
            const options = utils.getOptions(meta.mapped, entity);
            for (let i = 0; i < max; i++) {
                await entity.command("closuresDoorLock", "getUserStatus", {userid: i}, options);
            }
        } else {
            if (Number.isNaN(user)) {
                throw new Error("user must be numbers");
            }
            if (!utils.isInRange(0, pinCodeCount - 1, user)) {
                throw new Error("userId must be in range for device");
            }

            await entity.command("closuresDoorLock", "getUserStatus", {userid: user}, utils.getOptions(meta.mapped, entity));
        }
    },
};
export const cover_via_brightness: Tz.Converter = {
    key: ["position", "state"],
    options: [exposes.options.invert_cover()],
    convertSet: async (entity, key, value, meta) => {
        if (typeof value !== "number") {
            utils.assertString(value, key);
            value = value.toLowerCase();
            if (value === "stop") {
                await entity.command("genLevelCtrl", "stop", {optionsMask: 0, optionsOverride: 0}, utils.getOptions(meta.mapped, entity));
                return;
            }
            const lookup = {open: 100, close: 0};
            value = utils.getFromLookup(value, lookup);
        }

        const invert = utils.getMetaValue(entity, meta.mapped, "coverInverted", "allEqual", false)
            ? !meta.options.invert_cover
            : meta.options.invert_cover;
        utils.assertNumber(value);
        const position = invert ? 100 - value : value;
        await entity.command(
            "genLevelCtrl",
            "moveToLevelWithOnOff",
            {level: utils.mapNumberRange(Number(position), 0, 100, 0, 255), transtime: 0, optionsMask: 0, optionsOverride: 0},
            utils.getOptions(meta.mapped, entity),
        );

        return {state: {position: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genLevelCtrl", ["currentLevel"]);
    },
};
export const warning: Tz.Converter = {
    key: ["warning"],
    convertSet: async (entity, key, value, meta) => {
        const mode = {stop: 0, burglar: 1, fire: 2, emergency: 3, police_panic: 4, fire_panic: 5, emergency_panic: 6};
        const level = {low: 0, medium: 1, high: 2, very_high: 3};
        const strobeLevel = {low: 0, medium: 1, high: 2, very_high: 3};

        const values = {
            // @ts-expect-error ignore
            mode: value.mode || "emergency",
            // @ts-expect-error ignore
            level: value.level || "medium",
            // @ts-expect-error ignore
            strobe: value.strobe != null ? value.strobe : true,
            // @ts-expect-error ignore
            duration: value.duration != null ? value.duration : 10,
            // @ts-expect-error ignore
            strobeDutyCycle: value.strobe_duty_cycle != null ? value.strobe_duty_cycle * 10 : 0,
            // @ts-expect-error ignore
            strobeLevel: value.strobe_level != null ? utils.getFromLookup(value.strobe_level, strobeLevel) : 1,
        };

        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let info;
        // https://github.com/Koenkk/zigbee2mqtt/issues/8310 some devices require the info to be reversed.
        if (Array.isArray(meta.mapped)) throw new Error("Not supported for groups");
        // SIRZB-110/111 require all-zero info byte to reliably stop the siren.
        if (values.mode === "stop" && ["SIRZB-110", "SIRZB-111"].includes(meta.mapped.model)) {
            // @ts-expect-error ignore
            if (value.level == null) values.level = "low";
            // @ts-expect-error ignore
            if (value.strobe == null) values.strobe = false;
        }
        if (["SIRZB-110", "SRAC-23B-ZBSR", "AV2010/29A", "AV2010/24A"].includes(meta.mapped.model)) {
            info = utils.getFromLookup(values.mode, mode) + ((values.strobe ? 1 : 0) << 4) + (utils.getFromLookup(values.level, level) << 6);
        } else {
            info = (utils.getFromLookup(values.mode, mode) << 4) + ((values.strobe ? 1 : 0) << 2) + utils.getFromLookup(values.level, level);
        }

        await entity.command(
            "ssIasWd",
            "startWarning",
            {startwarninginfo: info, warningduration: values.duration, strobedutycycle: values.strobeDutyCycle, strobelevel: values.strobeLevel},
            utils.getOptions(meta.mapped, entity),
        );
    },
};
export const ias_max_duration: Tz.Converter = {
    key: ["max_duration"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("ssIasWd", {maxDuration: value as number});
        return {state: {max_duration: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("ssIasWd", ["maxDuration"]);
    },
};
export const warning_simple: Tz.Converter = {
    key: ["alarm"],
    convertSet: async (entity, key, value, meta) => {
        const alarmState = value === "alarm" || value === "OFF" ? 0 : 1;

        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let info;
        // For Develco SMSZB-120 and HESZB-120, introduced change in fw 4.0.5, tested backward with 4.0.4
        if (Array.isArray(meta.mapped)) throw new Error("Not supported for groups");
        if (["SMSZB-120", "HESZB-120"].includes(meta.mapped.model)) {
            info = (alarmState << 7) + (alarmState << 6);
        } else if (meta.mapped.model === "SIRZB-110") {
            // ZCL-compliant layout: bits 0-3=mode, bit 4=strobe, bits 6-7=level
            // OFF: info=0 (mode=stop, level=low, strobe=off — device requires level=0 to stop)
            // ON: emergency(3) + strobe(1<<4) + very_high(3<<6) = 211
            info = alarmState === 0 ? 0 : 3 + (1 << 4) + (3 << 6);
        } else if (meta.mapped.model === "SIRZB-111") {
            // Generic layout: bits 4-7=mode, bit 2=strobe, bits 0-1=level
            // OFF: info=0, ON: (emergency<<4) + (strobe<<2) + very_high = 55
            info = alarmState === 0 ? 0 : (3 << 4) + (1 << 2) + 3;
        } else {
            info = (3 << 6) + (alarmState << 2);
        }

        await entity.command(
            "ssIasWd",
            "startWarning",
            {startwarninginfo: info, warningduration: 300, strobedutycycle: 0, strobelevel: 0},
            utils.getOptions(meta.mapped, entity),
        );
    },
};
export const squawk: Tz.Converter = {
    key: ["squawk"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const state = {system_is_armed: 0, system_is_disarmed: 1};
        const level = {low: 0, medium: 1, high: 2, very_high: 3};
        const values = {
            state: value.state,
            level: value.level || "very_high",
            strobe: value.strobe != null ? value.strobe : false,
        };
        const info = utils.getFromLookup(values.state, state) + ((values.strobe ? 1 : 0) << 4) + (utils.getFromLookup(values.level, level) << 6);
        await entity.command("ssIasWd", "squawk", {squawkinfo: info}, utils.getOptions(meta.mapped, entity));
    },
};
export const cover_state: Tz.Converter = {
    key: ["state"],
    convertSet: async (entity, key, value, meta) => {
        const lookup = {
            open: "upOpen" as const,
            close: "downClose" as const,
            stop: "stop" as const,
            on: "upOpen" as const,
            off: "downClose" as const,
        };
        utils.assertString(value, key);
        await entity.command("closuresWindowCovering", utils.getFromLookup(value.toLowerCase(), lookup), {}, utils.getOptions(meta.mapped, entity));
    },
};
export const cover_position_tilt: Tz.Converter = {
    key: ["position", "tilt"],
    options: [exposes.options.invert_cover(), exposes.options.cover_position_tilt_disable_report()],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        const isPosition = key === "position";
        const invert = !(utils.getMetaValue(entity, meta.mapped, "coverInverted", "allEqual", false)
            ? !meta.options.invert_cover
            : meta.options.invert_cover);
        const disableReport = utils.getMetaValue(entity, meta.mapped, "coverPositionTiltDisableReport", "allEqual", false)
            ? !meta.options.cover_position_tilt_disable_report
            : meta.options.cover_position_tilt_disable_report;
        const position = invert ? 100 - value : value;

        // Zigbee officially expects 'open' to be 0 and 'closed' to be 100 whereas
        // HomeAssistant etc. work the other way round.
        // For zigbee-herdsman-converters: open = 100, close = 0
        await entity.command(
            "closuresWindowCovering",
            isPosition ? "goToLiftPercentage" : "goToTiltPercentage",
            isPosition ? {percentageliftvalue: position} : {percentagetiltvalue: position},
            utils.getOptions(meta.mapped, entity),
        );
        if (disableReport) {
            return;
        }
        return {state: {[isPosition ? "position" : "tilt"]: value}};
    },
    convertGet: async (entity, key, meta) => {
        const isPosition = key === "position";
        await entity.read("closuresWindowCovering", [isPosition ? "currentPositionLiftPercentage" : "currentPositionTiltPercentage"]);
    },
};
export const cover_mode: Tz.Converter = {
    key: ["cover_mode"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const windowCoveringMode =
            ((value.reversed ? 1 : 0) << 0) | ((value.calibration ? 1 : 0) << 1) | ((value.maintenance ? 1 : 0) << 2) | ((value.led ? 1 : 0) << 3);
        await entity.write("closuresWindowCovering", {windowCoveringMode}, utils.getOptions(meta.mapped, entity));
        return {state: {cover_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresWindowCovering", ["windowCoveringMode"]);
    },
};
export const occupancy_timeout: Tz.Converter = {
    // Sets delay after motion detector changes from occupied to unoccupied
    key: ["occupancy_timeout"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);
        value *= 1;
        await entity.write("msOccupancySensing", {pirOToUDelay: value}, utils.getOptions(meta.mapped, entity));
        return {state: {occupancy_timeout: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("msOccupancySensing", ["pirOToUDelay"]);
    },
};
export const level_config: Tz.Converter = {
    key: ["level_config"],
    convertSet: async (entity, key, value, meta) => {
        const state = {};

        // parse payload to grab the keys
        if (typeof value === "string") {
            try {
                value = JSON.parse(value);
            } catch {
                throw new Error("Payload is not valid JSON");
            }
        }

        utils.assertObject(value, key);
        // onOffTransitionTime - range 0x0000 to 0xffff - optional
        if (value.on_off_transition_time != null) {
            let onOffTransitionTimeValue = Number(value.on_off_transition_time) * 10;
            if (onOffTransitionTimeValue > 65535) onOffTransitionTimeValue = 65535;
            if (onOffTransitionTimeValue < 0) onOffTransitionTimeValue = 0;

            await entity.write("genLevelCtrl", {onOffTransitionTime: onOffTransitionTimeValue}, utils.getOptions(meta.mapped, entity));
            Object.assign(state, {on_off_transition_time: onOffTransitionTimeValue / 10});
        }

        // onTransitionTime - range 0x0000 to 0xffff - optional
        //                    0xffff = use onOffTransitionTime
        if (value.on_transition_time != null) {
            let onTransitionTimeValue = value.on_transition_time;
            if (typeof onTransitionTimeValue === "number") onTransitionTimeValue *= 10;
            if (typeof onTransitionTimeValue === "string" && onTransitionTimeValue.toLowerCase() === "disabled") {
                onTransitionTimeValue = 65535;
            } else {
                onTransitionTimeValue = Number(onTransitionTimeValue);
            }
            if (onTransitionTimeValue > 65535) onTransitionTimeValue = 65534;
            if (onTransitionTimeValue < 0) onTransitionTimeValue = 0;

            await entity.write("genLevelCtrl", {onTransitionTime: onTransitionTimeValue}, utils.getOptions(meta.mapped, entity));

            // reverse translate number -> preset
            if (onTransitionTimeValue === 65535) {
                onTransitionTimeValue = "disabled";
            }
            Object.assign(state, {
                on_transition_time: typeof onTransitionTimeValue === "number" ? onTransitionTimeValue / 10 : onTransitionTimeValue,
            });
        }

        // offTransitionTime - range 0x0000 to 0xffff - optional
        //                    0xffff = use onOffTransitionTime
        if (value.off_transition_time != null) {
            let offTransitionTimeValue = value.off_transition_time;
            if (typeof offTransitionTimeValue === "number") offTransitionTimeValue *= 10;
            if (typeof offTransitionTimeValue === "string" && offTransitionTimeValue.toLowerCase() === "disabled") {
                offTransitionTimeValue = 65535;
            } else {
                offTransitionTimeValue = Number(offTransitionTimeValue);
            }
            if (offTransitionTimeValue > 65535) offTransitionTimeValue = 65534;
            if (offTransitionTimeValue < 0) offTransitionTimeValue = 0;

            await entity.write("genLevelCtrl", {offTransitionTime: offTransitionTimeValue}, utils.getOptions(meta.mapped, entity));

            // reverse translate number -> preset
            if (offTransitionTimeValue === 65535) {
                offTransitionTimeValue = "disabled";
            }
            Object.assign(state, {
                off_transition_time: typeof offTransitionTimeValue === "number" ? offTransitionTimeValue / 10 : offTransitionTimeValue,
            });
        }

        // startUpCurrentLevel - range 0x00 to 0xff - optional
        //                       0x00 = return to minimum supported level
        //                       0xff = return to previous previous
        if (value.current_level_startup != null) {
            let startUpCurrentLevelValue = value.current_level_startup;
            if (typeof startUpCurrentLevelValue === "string" && startUpCurrentLevelValue.toLowerCase() === "previous") {
                startUpCurrentLevelValue = 255;
            } else if (typeof startUpCurrentLevelValue === "string" && startUpCurrentLevelValue.toLowerCase() === "minimum") {
                startUpCurrentLevelValue = 0;
            } else {
                startUpCurrentLevelValue = Number(startUpCurrentLevelValue);
            }
            if (startUpCurrentLevelValue > 255) startUpCurrentLevelValue = 254;
            if (startUpCurrentLevelValue < 0) startUpCurrentLevelValue = 1;

            await entity.write("genLevelCtrl", {startUpCurrentLevel: startUpCurrentLevelValue}, utils.getOptions(meta.mapped, entity));

            // reverse translate number -> preset
            if (startUpCurrentLevelValue === 255) {
                startUpCurrentLevelValue = "previous";
            }
            if (startUpCurrentLevelValue === 0) {
                startUpCurrentLevelValue = "minimum";
            }
            Object.assign(state, {current_level_startup: startUpCurrentLevelValue});
        }

        // onLevel - range 0x00 to 0xff - optional
        //           Any value outside of MinLevel to MaxLevel, including 0xff and 0x00, is interpreted as "previous".
        if (value.on_level != null) {
            let onLevel = value.on_level;
            if (typeof onLevel === "string" && onLevel.toLowerCase() === "previous") {
                onLevel = 255;
            } else {
                onLevel = Number(onLevel);
            }
            if (onLevel > 255) onLevel = 254;
            if (onLevel < 1) onLevel = 1;
            await entity.write("genLevelCtrl", {onLevel}, utils.getOptions(meta.mapped, entity));
            Object.assign(state, {on_level: onLevel === 255 ? "previous" : onLevel});
        }

        // options - 8-bit map
        //   bit 0: ExecuteIfOff - when 0, Move commands are ignored if the device is off;
        //          when 1, CurrentLevel can be changed while the device is off.
        //   bit 1: CoupleColorTempToLevel - when 1, changes to level also change color temperature.
        //          (What this means is not defined, but it's most likely to be "dim to warm".)
        if (value.execute_if_off != null) {
            const executeIfOffValue = !!value.execute_if_off;
            await entity.write("genLevelCtrl", {options: executeIfOffValue ? 1 : 0}, utils.getOptions(meta.mapped, entity));
            Object.assign(state, {execute_if_off: executeIfOffValue});
        }

        if (Object.keys(state).length > 0) {
            return {state: {level_config: state}};
        }
    },
    convertGet: async (entity, key, meta) => {
        for (const attribute of [
            "onOffTransitionTime",
            "onTransitionTime",
            "offTransitionTime",
            "startUpCurrentLevel",
            "onLevel",
            "options",
        ] as const) {
            try {
                await entity.read("genLevelCtrl", [attribute]);
            } catch {
                // continue regardless of error, all these are optional in ZCL
            }
        }
    },
};
export const ballast_config: Tz.Converter = {
    key: ["ballast_config", "ballast_minimum_level", "ballast_maximum_level", "ballast_power_on_level"],
    // zcl attribute names are camel case, but we want to use snake case in the outside communication
    convertSet: async (entity, key, value, meta) => {
        if (key === "ballast_config") {
            value = utils.toCamelCase(value);
            for (const [attrName, attrValue] of Object.entries(value)) {
                const attributes = {[attrName]: attrValue};
                await entity.write("lightingBallastCfg", attributes);
            }
        }
        if (key === "ballast_minimum_level") {
            await entity.write("lightingBallastCfg", {minLevel: value as number});
        }
        if (key === "ballast_maximum_level") {
            await entity.write("lightingBallastCfg", {maxLevel: value as number});
        }
        if (key === "ballast_power_on_level") {
            await entity.write("lightingBallastCfg", {powerOnLevel: value as number});
        }
        return {state: {[key]: value}};
    },
    convertGet: async (entity, key, meta) => {
        let result = {};
        for (const attrName of [
            "ballastStatus",
            "minLevel",
            "maxLevel",
            "powerOnLevel",
            "powerOnFadeTime",
            "intrinsicBallastFactor",
            "ballastFactorAdjustment",
            "lampQuantity",
            "lampType",
            "lampManufacturer",
            "lampRatedHours",
            "lampBurnHours",
            "lampAlarmMode",
            "lampBurnHoursTripPoint",
        ] as const) {
            try {
                result = {...result, ...(await entity.read("lightingBallastCfg", [attrName]))};
            } catch {
                // continue regardless of error
            }
        }
        if (key === "ballast_config") {
            logger.debug(`ballast_config attribute results received: ${JSON.stringify(utils.toSnakeCase(result))}`, NS);
        }
    },
};
export const light_brightness_step: Tz.Converter = {
    key: ["brightness_step", "brightness_step_onoff"],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        const onOff = key.endsWith("_onoff");
        const command = onOff ? "stepWithOnOff" : "step";
        value = Number(value);
        utils.assertNumber(value, key);

        const mode = value > 0 ? 0 : 1;
        const transition = utils.getTransition(entity, key, meta).time;
        await entity.command(
            "genLevelCtrl",
            command,
            {stepmode: mode, stepsize: Math.abs(value), transtime: transition, optionsMask: 0, optionsOverride: 0},
            utils.getOptions(meta.mapped, entity),
        );

        if (meta.state.brightness !== undefined) {
            utils.assertNumber(meta.state.brightness);
            let brightness = onOff || meta.state.state === "ON" ? meta.state.brightness + value : meta.state.brightness;
            if (value === 0) {
                const entityToRead = utils.getEntityOrFirstGroupMember(entity);
                if (entityToRead) {
                    brightness = (await entityToRead.read("genLevelCtrl", ["currentLevel"])).currentLevel;
                }
            }

            brightness = Math.min(254, brightness);
            brightness = Math.max(onOff || meta.state.state === "OFF" ? 0 : 1, brightness);

            if (utils.getMetaValue(entity, meta.mapped, "turnsOffAtBrightness1", "allEqual", false)) {
                if (onOff && value < 0 && brightness === 1) {
                    brightness = 0;
                } else if (onOff && value > 0 && meta.state.brightness === 0) {
                    brightness++;
                }
            }

            return {state: {brightness, state: brightness === 0 ? "OFF" : "ON"}};
        }
    },
};
export const light_brightness_move: Tz.Converter = {
    key: ["brightness_move", "brightness_move_onoff"],
    convertSet: async (entity, key, value, meta) => {
        if (value === "stop" || value === 0) {
            await entity.command("genLevelCtrl", "stop", {optionsMask: 0, optionsOverride: 0}, utils.getOptions(meta.mapped, entity));

            // As we cannot determine the new brightness state, we read it from the device
            await utils.sleep(500);
            const target = utils.getEntityOrFirstGroupMember(entity);
            const onOff = (await target.read("genOnOff", ["onOff"])).onOff;
            const brightness = (await target.read("genLevelCtrl", ["currentLevel"])).currentLevel;
            return {state: {brightness, state: onOff === 1 ? "ON" : "OFF"}};
        }
        value = Number(value);
        utils.assertNumber(value, key);
        const command = key.endsWith("onoff") ? "moveWithOnOff" : "move";
        await entity.command(
            "genLevelCtrl",
            command,
            {movemode: value > 0 ? 0 : 1, rate: Math.abs(value), optionsMask: 0, optionsOverride: 0},
            utils.getOptions(meta.mapped, entity),
        );
    },
};
export const light_colortemp_step: Tz.Converter = {
    key: ["color_temp_step"],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        value = Number(value);
        utils.assertNumber(value, key);

        const mode = value > 0 ? 1 : 3;
        const transition = utils.getTransition(entity, key, meta).time;
        await entity.command(
            "lightingColorCtrl",
            "stepColorTemp",
            {
                stepmode: mode,
                stepsize: Math.abs(value),
                transtime: transition,
                minimum: 0,
                maximum: 600,
                optionsMask: 0,
                optionsOverride: 0,
            },
            utils.getOptions(meta.mapped, entity),
        );

        // We cannot determine the color temperature from the current state so we read it, because
        // - We don't know the max/min values
        // - Color mode could have been switched (x/y or hue/saturation)
        const entityToRead = utils.getEntityOrFirstGroupMember(entity);
        if (entityToRead) {
            await utils.sleep(100 + transition * 100);
            await entityToRead.read("lightingColorCtrl", ["colorTemperature"]);
        }
    },
};
export const light_colortemp_move: Tz.Converter = {
    key: ["colortemp_move", "color_temp_move"],
    convertSet: async (entity, key, value, meta) => {
        // Initialize payload with default constraints
        let minimum = 0;
        let maximum = 600;
        let rate: number;
        let movemode: number;

        // Handle different input formats
        if (utils.isString(value)) {
            // String-based commands
            const stringValue = value.toLowerCase();

            if (stringValue === "stop" || stringValue === "release" || stringValue === "0") {
                rate = 1;
                movemode = 0;
            } else if (stringValue === "up" || stringValue === "1") {
                rate = meta.message?.rate != null ? Number(meta.message.rate) : 55;
                movemode = 1; // Move to warmer (higher color temp)
            } else if (stringValue === "down") {
                rate = meta.message?.rate != null ? Number(meta.message.rate) : 55;
                movemode = 3; // Move to cooler (lower color temp)
            } else {
                throw new Error(`${key}: invalid string value "${value}". Expected "stop", "release", "0", "up", "1", or "down"`);
            }

            // Use legacy constraints for string-based commands
            minimum = 153;
            maximum = 370;
        } else if (utils.isNumber(value)) {
            // Simple number input
            const numValue = Number(value);
            if (numValue === 0) {
                // Stop command via 0 rate
                rate = 1;
                movemode = 0;
            } else {
                // Normal movement
                rate = Math.abs(numValue);
                movemode = numValue > 0 ? 1 : 3;
            }
        } else if (utils.isObject(value)) {
            // Object input with rate and optional constraints
            utils.assertObject(value, key);

            if (value.rate == null) {
                throw new Error(`${key}: object must contain 'rate' property`);
            }

            const rateValue = Number(value.rate);
            utils.assertNumber(rateValue, `${key}.rate`);

            if (rateValue === 0) {
                // Stop command via 0 rate
                rate = 1;
                movemode = 0;
            } else {
                // Normal movement
                rate = Math.abs(rateValue);
                movemode = rateValue > 0 ? 1 : 3;
            }

            // Apply custom constraints if provided
            if (value.minimum != null) {
                const minValue = Number(value.minimum);
                utils.assertNumber(minValue, `${key}.minimum`);
                minimum = minValue;
            }

            if (value.maximum != null) {
                const maxValue = Number(value.maximum);
                utils.assertNumber(maxValue, `${key}.maximum`);
                maximum = maxValue;
            }

            // Validate constraints
            if (minimum >= maximum) {
                throw new Error(`${key}: minimum (${minimum}) must be less than maximum (${maximum})`);
            }
        } else {
            throw new Error(`${key}: invalid value type. Expected number, string, or object with rate property`);
        }

        // Send command
        await entity.command(
            "lightingColorCtrl",
            "moveColorTemp",
            {minimum, maximum, rate, movemode, optionsMask: 0, optionsOverride: 0},
            utils.getOptions(meta.mapped, entity),
        );

        // Read current color temperature if stopping
        if (movemode === 0) {
            const entityToRead = utils.getEntityOrFirstGroupMember(entity);
            if (entityToRead) {
                await utils.sleep(100);
                await entityToRead.read("lightingColorCtrl", ["colorTemperature", "colorMode"]);
            }
        }
    },
};
export const light_color_and_colortemp_via_color: Tz.Converter = {
    key: ["color", "color_temp", "color_temp_percent"],
    options: [exposes.options.color_sync(), exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        if (key === "color") {
            return await light_color.convertSet(entity, key, value, meta);
        }
        if (key === "color_temp" || key === "color_temp_percent") {
            utils.assertNumber(value);
            const xy = libColor.ColorXY.fromMireds(value);
            await entity.command(
                "lightingColorCtrl",
                "moveToColor",
                {
                    transtime: utils.getTransition(entity, key, meta).time,
                    colorx: utils.mapNumberRange(xy.x, 0, 1, 0, 65535),
                    colory: utils.mapNumberRange(xy.y, 0, 1, 0, 65535),
                    optionsMask: 0,
                    optionsOverride: 0,
                },
                utils.getOptions(meta.mapped, entity),
            );
            return {
                state: libColor.syncColorState({color_mode: constants.colorModeLookup[2], color_temp: value}, meta.state, entity, meta.options),
            };
        }
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingColorCtrl", light.readColorAttributes(entity, meta));
    },
};
export const light_hue_saturation_step: Tz.Converter = {
    key: ["hue_step", "saturation_step"],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        value = Number(value);
        utils.assertNumber(value, key);

        const command = key === "hue_step" ? "stepHue" : "stepSaturation";
        const attribute = key === "hue_step" ? "currentHue" : "currentSaturation";
        const mode = value > 0 ? 1 : 3;
        const transition = utils.getTransition(entity, key, meta).time;
        await entity.command(
            "lightingColorCtrl",
            command,
            {stepmode: mode, stepsize: Math.abs(value), transtime: transition, optionsMask: 0, optionsOverride: 0},
            utils.getOptions(meta.mapped, entity),
        );

        // We cannot determine the hue/saturation from the current state so we read it, because
        // - Color mode could have been switched (x/y or colortemp)
        const entityToRead = utils.getEntityOrFirstGroupMember(entity);
        if (entityToRead) {
            await utils.sleep(100 + transition * 100);
            await entityToRead.read("lightingColorCtrl", [attribute, "colorMode"]);
        }
    },
};
export const light_hue_saturation_move: Tz.Converter = {
    key: ["hue_move", "saturation_move"],
    convertSet: async (entity, key, value, meta) => {
        value = value === "stop" ? value : Number(value);
        const command = key === "hue_move" ? "moveHue" : "moveSaturation";
        const attribute = key === "hue_move" ? "currentHue" : "currentSaturation";
        let rate = 0;
        let movemode = 0;

        if (value === "stop" || value === 0) {
            rate = 1;
            movemode = 0;
        } else {
            utils.assertNumber(value, key);
            rate = Math.abs(value);
            movemode = value > 0 ? 1 : 3;
        }

        await entity.command(
            "lightingColorCtrl",
            command,
            {rate, movemode, optionsMask: 0, optionsOverride: 0},
            utils.getOptions(meta.mapped, entity),
        );

        // We cannot determine the hue/saturation from the current state so we read it, because
        // - Color mode could have been switched (x/y or colortemp)
        if (value === "stop" || value === 0) {
            const entityToRead = utils.getEntityOrFirstGroupMember(entity);
            if (entityToRead) {
                await utils.sleep(100);
                await entityToRead.read("lightingColorCtrl", [attribute, "colorMode"]);
            }
        }
    },
};

export const light_onoff_brightness: Tz.Converter = {
    key: ["state", "brightness", "brightness_percent", "on_time", "off_wait_time"],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        const {message} = meta;
        const transition = utils.getTransition(entity, "brightness", meta);
        const turnsOffAtBrightness1 = utils.getMetaValue(entity, meta.mapped, "turnsOffAtBrightness1", "allEqual", false);
        const moveToLevelWithOnOffDisable = utils.getMetaValue(entity, meta.mapped, "moveToLevelWithOnOffDisable", "allEqual", false);
        const omitOptionalLevelParams = utils.getMetaValue(entity, meta.mapped, "omitOptionalLevelParams", "allEqual", false);
        let state = message.state !== undefined ? (typeof message.state === "string" ? message.state.toLowerCase() : null) : undefined;
        let brightness: number;

        if (message.brightness != null) {
            brightness = Number(message.brightness);
        } else if (message.brightness_percent != null) {
            brightness = utils.mapNumberRange(Number(message.brightness_percent), 0, 100, 0, 255);
        }

        if (brightness === 255) {
            // Allow 255 for backwards compatibility.
            brightness = 254;
        }

        if (brightness !== undefined && (Number.isNaN(brightness) || brightness < 0 || brightness > 254)) {
            throw new Error(`Brightness value of message: '${JSON.stringify(message)}' invalid, must be a number >= 0 and =< 254`);
        }

        if (state !== undefined && state !== null && ["on", "off", "toggle"].includes(state) === false) {
            throw new Error(`State value of message: '${JSON.stringify(message)}' invalid, must be 'ON', 'OFF' or 'TOGGLE'`);
        }

        if ((state === undefined || state === null) && brightness === undefined) {
            throw new Error(`At least one of "brightness" or "state" must have a value: '${JSON.stringify(message)}'`);
        }

        // Infer state from desired brightness if unset. Ideally we'd want to keep it as it is, but this code has always
        // used 'MoveToLevelWithOnOff' so that'd break backwards compatibility. To keep the state, the user
        // has to explicitly set it to null.
        if (state === undefined) {
            if (moveToLevelWithOnOffDisable) {
                // Although in some cases it can be usefull to use explicit on and off and moveToLevel. In these casese
                // we just ignore the brightness value and set the state to the current device state.
                state = (meta.state.state as string).toLowerCase();
            } else {
                // Also write to `meta.message.state` in case we delegate to the `on_off` converter.
                state = meta.message.state = brightness === 0 ? "off" : "on";
            }
        }

        let publishBrightness = brightness !== undefined;
        const targetState = state === "toggle" ? (meta.state.state === "ON" ? "off" : "on") : state;

        if (targetState === "off") {
            // Simulate 'Off' with transition via 'MoveToLevelWithOnOff', otherwise just use 'Off'.
            // TODO: if this is a group where some members don't support Level Control, turning them off
            //  with transition may have no effect. (Some devices, such as Envilar ZG302-BOX-RELAY, handle
            //  'MoveToLevelWithOnOff' despite not supporting the cluster; others, like the LEDVANCE SMART+
            //  plug, do not.)
            brightness = transition.specified || brightness === 0 ? 0 : undefined;
            if (
                brightness !== undefined &&
                meta.state.state === "OFF" &&
                utils.getMetaValue(entity, meta.mapped, "noOffTransitionWhenOff", {atLeastOnce: true}, false)
            ) {
                logger.debug("Suppressing OFF transition since entity is OFF and has noOffTransitionWhenOff=true", NS);
                brightness = undefined;
            }
            if (meta.state.brightness !== undefined && meta.state.state === "ON") {
                // The light's current level gets clobbered in two cases:
                //   1. when 'Off' has a transition, in which case it is really 'MoveToLevelWithOnOff'
                //      https://github.com/Koenkk/zigbee-herdsman-converters/issues/1073
                //   2. when 'OnLevel' is set: "If OnLevel is not defined, set the CurrentLevel to the stored level."
                //      https://github.com/Koenkk/zigbee2mqtt/issues/2850#issuecomment-580365633
                // We need to remember current brightness in case the next 'On' does not provide it. `meta` is not reliable
                // here, as it will get clobbered too if reporting is configured.
                globalStore.putValue(entity, "brightness", meta.state.brightness);
                globalStore.putValue(entity, "turnedOffWithTransition", brightness !== undefined);
            }
        } else if (targetState === "on" && brightness === undefined) {
            // Simulate 'On' with transition via 'MoveToLevelWithOnOff', or restore the level from before
            // it was clobbered by a previous transition to off; otherwise just use 'On'.
            // TODO: same problem as above.
            // TODO: if transition is not specified, should use device default (OnTransitionTime), not 0.
            if (transition.specified || globalStore.getValue(entity, "turnedOffWithTransition") === true) {
                const levelConfig: KeyValueAny = utils.getObjectProperty(meta.state, "level_config", {});
                let onLevel = utils.getObjectProperty(levelConfig, "on_level", 0);
                if (onLevel === 0 && entity.meta.onLevelSupported !== false) {
                    try {
                        const attributeRead = await entity.read("genLevelCtrl", ["onLevel"]);
                        if (attributeRead !== undefined) {
                            onLevel = attributeRead.onLevel;
                        }
                    } catch {
                        // OnLevel not supported
                    }
                }
                if (onLevel === 0) {
                    onLevel = "previous";
                    entity.meta.onLevelSupported = false;
                    entity.save();
                }
                if (onLevel === 255 || onLevel === "previous") {
                    const current = utils.getObjectProperty(meta.state, "brightness", 254);
                    brightness = globalStore.getValue(entity, "brightness", current);
                } else {
                    brightness = onLevel as number;
                }
                // Published state might have gotten clobbered by reporting.
                publishBrightness = true;
            }
        }

        if (brightness === undefined) {
            const result = (await on_off.convertSet(entity, "state", state, meta)) as KeyValueAny;
            if (result) {
                if (result.state && result.state.state === "ON" && meta.state.brightness === 0) {
                    result.state.brightness = 1;
                }
            }
            return result;
        }

        if (brightness === 0 && (targetState === "on" || state === null)) {
            brightness = 1;
        }
        if (brightness === 1 && turnsOffAtBrightness1) {
            brightness = 2;
        }

        if (targetState !== "off") {
            globalStore.putValue(entity, "brightness", brightness);
            globalStore.clearValue(entity, "turnedOffWithTransition");
        }

        if (moveToLevelWithOnOffDisable) {
            // On some devices "moveToLevelWithOnOff" command seems to be broken, leading to the light
            // randomly switching off for levels lower than some threshold. Is those cases it's better to
            // use "moveToLevel" with explicit On and Off when the state changes.

            if (typeof meta.state.state === "string" && meta.state.state.toLowerCase() !== targetState) {
                if (targetState === "on") {
                    const payload = {level: Number(brightness), transtime: transition.time} as {
                        level: number;
                        transtime: number;
                        optionsMask?: number;
                        optionsOverride?: number;
                    };
                    if (!omitOptionalLevelParams) {
                        payload.optionsMask = 0;
                        payload.optionsOverride = 0;
                    }
                    await entity.command("genLevelCtrl", "moveToLevel", payload, utils.getOptions(meta.mapped, entity));
                }
                await on_off.convertSet(entity, "state", state, meta);
            } else {
                const payload = {level: Number(brightness), transtime: transition.time} as {
                    level: number;
                    transtime: number;
                    optionsMask?: number;
                    optionsOverride?: number;
                };
                if (!omitOptionalLevelParams) {
                    payload.optionsMask = 0;
                    payload.optionsOverride = 0;
                }
                await entity.command("genLevelCtrl", "moveToLevel", payload, utils.getOptions(meta.mapped, entity));
            }
        } else {
            const payload = {level: Number(brightness), transtime: transition.time} as {
                level: number;
                transtime: number;
                optionsMask?: number;
                optionsOverride?: number;
            };
            if (!omitOptionalLevelParams) {
                payload.optionsMask = 0;
                payload.optionsOverride = 0;
            }
            await entity.command(
                "genLevelCtrl",
                state === null ? "moveToLevel" : "moveToLevelWithOnOff",
                payload,
                utils.getOptions(meta.mapped, entity),
            );
        }

        const result = {state: {} as KeyValueAny};
        if (publishBrightness) {
            result.state.brightness = Number(brightness);
        }
        if (state !== null && !moveToLevelWithOnOffDisable) {
            result.state.state = brightness === 0 ? "OFF" : "ON";
        }
        return result;
    },
    convertGet: async (entity, key, meta) => {
        if (key === "brightness") {
            await entity.read("genLevelCtrl", ["currentLevel"]);
        } else if (key === "state") {
            await on_off.convertGet(entity, key, meta);
        }
    },
};
export const light_colortemp_startup: Tz.Converter = {
    key: ["color_temp_startup"],
    convertSet: async (entity, key, value, meta) => {
        const [colorTempMin, colorTempMax] = light.findColorTempRange(entity);
        const preset = {warmest: colorTempMax, warm: 454, neutral: 370, cool: 250, coolest: colorTempMin, previous: 65535};

        if (utils.isString(value) && value in preset) {
            value = utils.getFromLookup(value, preset);
        }

        value = Number(value);
        utils.assertNumber(value);

        // ensure value within range
        // we do allow one exception for 0xffff, which is to restore the previous value
        if (value !== 65535) {
            value = light.clampColorTemp(value, colorTempMin, colorTempMax);
        }

        await entity.write(
            "lightingColorCtrl",
            {startUpColorTemperature: value as number /* type failure? */},
            utils.getOptions(meta.mapped, entity),
        );
        return {state: {color_temp_startup: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingColorCtrl", ["startUpColorTemperature"]);
    },
};
export const light_color_colortemp: Tz.Converter = {
    /**
     * This converter is a combination of light_color and light_colortemp and
     * can be used instead of the two individual converters . When used to set,
     * it actually calls out to light_color or light_colortemp to get the
     * return value. When used to get, it gets both color and colorTemp in
     * one call.
     * The reason for the existence of this somewhat peculiar converter is
     * that some lights don't report their state when changed. To fix this,
     * we query the state after we set it. We want to query color and colorTemp
     * both when setting either, because both change when setting one. This
     * converter is used to do just that.
     */
    key: ["color", "color_temp", "color_temp_percent"],
    options: [exposes.options.color_sync(), exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        if (key === "color") {
            const result = await light_color.convertSet(entity, key, value, meta);
            return result;
        }
        if (key === "color_temp" || key === "color_temp_percent") {
            const result = await light_colortemp.convertSet(entity, key, value, meta);
            return result;
        }
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingColorCtrl", light.readColorAttributes(entity, meta, ["colorTemperature"]));
    },
};
export const effect: Tz.Converter = {
    key: ["effect", "alert", "flash"], // alert and flash are deprecated.
    convertSet: async (entity, key, value, meta) => {
        if (key === "effect") {
            utils.assertString(value, key);
            const lookup = {blink: 0, breathe: 1, okay: 2, channel_change: 11, finish_effect: 254, stop_effect: 255};
            value = value.toLowerCase();
            if (value === "colorloop") {
                const transition = meta.message.transition ?? 15;
                utils.assertNumber(transition, "transition");
                const speed = Math.min(255, Math.max(1, Math.round(255 / transition)));
                await light_hue_saturation_move.convertSet(entity, "hue_move", speed, meta);
            } else if (value === "stop_colorloop") {
                await light_hue_saturation_move.convertSet(entity, "hue_move", "stop", meta);
            } else {
                const payload = {effectid: utils.getFromLookup(value, lookup), effectvariant: 0};
                await entity.command("genIdentify", "triggerEffect", payload, utils.getOptions(meta.mapped, entity));
            }
        } else if (key === "alert" || key === "flash") {
            // Deprecated
            let effectid = 0;
            const lookup = {select: 0x00, lselect: 0x01, none: 0xff};
            if (key === "flash") {
                if (value === 2) {
                    value = "select";
                } else if (value === 10) {
                    value = "lselect";
                }
            }

            effectid = utils.getFromLookup(value, lookup);
            const payload = {effectid, effectvariant: 0};
            await entity.command("genIdentify", "triggerEffect", payload, utils.getOptions(meta.mapped, entity));
        }
    },
};
export const thermostat_remote_sensing: Tz.Converter = {
    key: ["remote_sensing"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {remoteSensing: value as number});
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["remoteSensing"]);
    },
};
export const thermostat_weekly_schedule: Tz.Converter = {
    key: ["weekly_schedule"],
    convertSet: async (entity, key, value, meta) => {
        /*
             * We want to support a simple human creatable format to send a schedule:
                 {"weekly_schedule": {
                   "dayofweek": ["monday", "tuesday"],
                   "transitions": [
                     {"heatSetpoint": 16, "transitionTime": "0:00"},
                     {"heatSetpoint": 20, "transitionTime": "18:00"},
                     {"heatSetpoint": 16, "transitionTime": "19:30"}
                   ]}}

             * However exposes is not flexible enough to describe something like this. There is a
             *  much more verbose format we also support so that exposes work.
                 {"weekly_schedule": {
                   "dayofweek": [
                     {"day": "monday"},
                     {"day": "tuesday"}
                   ],
                   "transitions": [
                     {"heatSetpoint": 16, "transitionTime": {"hour": 0,  "minute": 0}},
                     {"heatSetpoint": 20, "transitionTime": {"hour": 18, "minute": 0}},
                     {"heatSetpoint": 16, "transitionTime": {"hour": 19, "minute": 30}}
                   ]}}
             */
        utils.assertObject(value, key);

        let daysofweek = value.dayofweek;
        const transitions = value.transitions;
        let numoftrans = 0;
        const modes: string[] = [];

        if (Array.isArray(transitions)) {
            // calculate numoftrans
            if (typeof value.numoftrans !== "undefined") {
                logger.warning(
                    `weekly_schedule: ignoring provided numoftrans value (${JSON.stringify(value.numoftrans)}), this is now calculated automatically`,
                    NS,
                );
            }
            numoftrans = transitions.length;

            // mode is calculated below
            if (typeof value.mode !== "undefined") {
                logger.warning(
                    `weekly_schedule: ignoring provided mode value (${JSON.stringify(value.mode)}), this is now calculated automatically`,
                    NS,
                );
            }

            // transform transition payload values if needed
            for (const elem of transitions) {
                // update mode if needed
                if (elem.heatSetpoint != null && !modes.includes("heat")) {
                    modes.push("heat");
                }
                if (elem.coolSetpoint != null && !modes.includes("cool")) {
                    modes.push("cool");
                }

                // transform setpoint values if numeric
                if (typeof elem.heatSetpoint === "number") {
                    elem.heatSetpoint = Math.round(elem.heatSetpoint * 100);
                }
                if (typeof elem.coolSetpoint === "number") {
                    elem.coolSetpoint = Math.round(elem.coolSetpoint * 100);
                }

                // accept 24h time notation (e.g. 19:30)
                if (typeof elem.transitionTime === "string") {
                    const time = elem.transitionTime.split(":");
                    const timeHour = Number.parseInt(time[0], 10) * 60;
                    const timeMinute = Number.parseInt(time[1], 10);

                    if (time.length !== 2 || Number.isNaN(timeHour) || Number.isNaN(timeMinute)) {
                        logger.warning(`weekly_schedule: expected 24h time notation (e.g. 19:30) but got '${elem.transitionTime}'!`, NS);
                    } else {
                        elem.transitionTime = timeHour + timeMinute;
                    }
                } else if (typeof elem.transitionTime === "object") {
                    if (elem.transitionTime.hour == null || elem.transitionTime.minute == null) {
                        throw new Error(
                            `weekly_schedule: expected 24h time object (e.g. {"hour": 19, "minute": 30}), but got '${JSON.stringify(elem.transitionTime)}'!`,
                        );
                    }
                    if (Number.isNaN(elem.transitionTime.hour)) {
                        throw new Error(`weekly_schedule: expected time.hour to be a number, but got '${elem.transitionTime.hour}'!`);
                    }
                    if (Number.isNaN(elem.transitionTime.minute)) {
                        throw new Error(`weekly_schedule: expected time.minute to be a number, but got '${elem.transitionTime.minute}'!`);
                    }
                    elem.transitionTime = Number.parseInt(elem.transitionTime.hour, 10) * 60 + Number.parseInt(elem.transitionTime.minute, 10);
                }
            }
        } else {
            logger.error("weekly_schedule: transitions is not an array!", NS);
            return;
        }

        // map array of desired modes to bitmask
        let mode = 0;

        for (const m of modes) {
            // lookup mode bit
            mode |= 1 << utils.getKey(constants.thermostatScheduleMode, m, 0, Number);
        }

        // map array of days to desired dayofweek bitmask
        if (typeof daysofweek === "string") {
            daysofweek = [daysofweek];
        }

        let dayofweek = 0;

        if (Array.isArray(daysofweek)) {
            for (let d of daysofweek) {
                if (typeof d === "object") {
                    if (d.day == null) {
                        throw new Error(`weekly_schedule: expected dayofweek to be string or {"day": "str"}, but got '${JSON.stringify(d)}'!`);
                    }
                    d = d.day;
                }
                // lookup dayofweek bit
                d = utils.getKey(constants.thermostatDayOfWeek, d.toLowerCase(), d, Number);
                dayofweek |= 1 << d;
            }
        }

        await entity.command(
            "hvacThermostat",
            "setWeeklySchedule",
            {dayofweek, numoftrans, transitions, mode},
            utils.getOptions(meta.mapped, entity),
        );
    },
    convertGet: async (entity, key, meta) => {
        const payload = {
            daystoreturn: 0xff, // Sun-Sat and vacation
            modetoreturn: 3, // heat + cool
        };
        await entity.command("hvacThermostat", "getWeeklySchedule", payload, utils.getOptions(meta.mapped, entity));
    },
};
export const thermostat_system_mode: Tz.Converter = {
    key: ["system_mode"],
    convertSet: async (entity, key, value, meta) => {
        let systemMode = utils.getKey(constants.thermostatSystemModes, value, undefined, Number);
        if (systemMode === undefined) {
            systemMode = utils.getKey(legacy.thermostatSystemModes, value, value as number, Number);
        }
        await entity.write("hvacThermostat", {systemMode});
        return {state: {system_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["systemMode"]);
    },
};
export const thermostat_control_sequence_of_operation: Tz.Converter = {
    key: ["control_sequence_of_operation"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertEndpoint(entity);
        let val = utils.getKey(constants.thermostatControlSequenceOfOperations, value, undefined, Number);
        if (val === undefined) {
            val = utils.getKey(constants.thermostatControlSequenceOfOperations, value, value as number, Number);
        }
        const attributes = {ctrlSeqeOfOper: val};
        await entity.write("hvacThermostat", attributes);
        // NOTE: update the cluster attribute we store as this is used by
        //       SMaBiT AV2010/32's dynamic expose function.
        entity.saveClusterAttributeKeyValue("hvacThermostat", attributes);
        return {state: {control_sequence_of_operation: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["ctrlSeqeOfOper"]);
    },
};
export const thermostat_programming_operation_mode: Tz.Converter = {
    key: ["programming_operation_mode"],
    convertSet: async (entity, key, value, meta) => {
        const val = utils.getKey(constants.thermostatProgrammingOperationModes, value, undefined, Number);
        if (val === undefined) {
            throw new Error(
                `Programming operation mode invalid, must be one of: ${Object.values(constants.thermostatProgrammingOperationModes).join(", ")}`,
            );
        }
        await entity.write("hvacThermostat", {programingOperMode: val});
        return {state: {programming_operation_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["programingOperMode"]);
    },
};
export const thermostat_temperature_display_mode: Tz.Converter = {
    key: ["temperature_display_mode"],
    convertSet: async (entity, key, value, meta) => {
        const tempDisplayMode = utils.getKey(constants.temperatureDisplayMode, value, value as number, Number);
        await entity.write("hvacUserInterfaceCfg", {tempDisplayMode});
        return {state: {temperature_display_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacUserInterfaceCfg", ["tempDisplayMode"]);
    },
};
export const thermostat_keypad_lockout: Tz.Converter = {
    key: ["keypad_lockout"],
    convertSet: async (entity, key, value, meta) => {
        const keypadLockout = utils.getKey(constants.keypadLockoutMode, value, value as number, Number);
        await entity.write("hvacUserInterfaceCfg", {keypadLockout});
        return {state: {keypad_lockout: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacUserInterfaceCfg", ["keypadLockout"]);
    },
};
export const thermostat_temperature_setpoint_hold: Tz.Converter = {
    key: ["temperature_setpoint_hold"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {tempSetpointHold: value as number});
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["tempSetpointHold"]);
    },
};
export const thermostat_temperature_setpoint_hold_duration: Tz.Converter = {
    key: ["temperature_setpoint_hold_duration"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {tempSetpointHoldDuration: value as number});
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["tempSetpointHoldDuration"]);
    },
};
export const fan_mode: Tz.Converter = {
    key: ["fan_mode", "fan_state"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        const fanMode = utils.getFromLookup(value, constants.fanMode);
        await entity.write("hvacFanCtrl", {fanMode});
        return {state: {fan_mode: value.toLowerCase(), fan_state: value.toLowerCase() === "off" ? "OFF" : "ON"}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacFanCtrl", ["fanMode"]);
    },
};
export const fan_speed: Tz.Converter = {
    key: ["speed"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);
        await entity.command(
            "genLevelCtrl",
            "moveToLevel",
            {level: value, transtime: 0, optionsMask: 0, optionsOverride: 0},
            utils.getOptions(meta.mapped, entity),
        );
        return {state: {speed: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genLevelCtrl", ["currentLevel"]);
    },
};
export const thermostat_local_temperature: Tz.Converter = {
    key: ["local_temperature"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["localTemp"]);
    },
};
export const thermostat_outdoor_temperature: Tz.Converter = {
    key: ["outdoor_temperature"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["outdoorTemp"]);
    },
};
export const thermostat_local_temperature_calibration: Tz.Converter = {
    key: ["local_temperature_calibration"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);
        await entity.write("hvacThermostat", {localTemperatureCalibration: Math.round(value * 10)});
        return {state: {local_temperature_calibration: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["localTemperatureCalibration"]);
    },
};
export const thermostat_occupancy: Tz.Converter = {
    key: ["occupancy"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["occupancy"]);
    },
};
export const thermostat_clear_weekly_schedule: Tz.Converter = {
    key: ["clear_weekly_schedule"],
    convertSet: async (entity, key, value, meta) => {
        await entity.command("hvacThermostat", "clearWeeklySchedule", {}, utils.getOptions(meta.mapped, entity));
    },
};
export const thermostat_pi_heating_demand: Tz.Converter = {
    key: ["pi_heating_demand"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["pIHeatingDemand"]);
    },
};
export const thermostat_running_state: Tz.Converter = {
    key: ["running_state"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["runningState"]);
    },
};
export const thermostat_occupied_heating_setpoint: Tz.Converter = {
    key: ["occupied_heating_setpoint"],
    options: [exposes.options.thermostat_unit()],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        let result: number;
        if (meta.options.thermostat_unit === "fahrenheit") {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const occupiedHeatingSetpoint = result;
        await entity.write("hvacThermostat", {occupiedHeatingSetpoint});
        return {state: {occupied_heating_setpoint: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["occupiedHeatingSetpoint"]);
    },
};
export const thermostat_unoccupied_heating_setpoint: Tz.Converter = {
    key: ["unoccupied_heating_setpoint"],
    options: [exposes.options.thermostat_unit()],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let result;
        if (meta.options.thermostat_unit === "fahrenheit") {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const unoccupiedHeatingSetpoint = result;
        await entity.write("hvacThermostat", {unoccupiedHeatingSetpoint});
        return {state: {unoccupied_heating_setpoint: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["unoccupiedHeatingSetpoint"]);
    },
};
export const thermostat_occupied_cooling_setpoint: Tz.Converter = {
    key: ["occupied_cooling_setpoint"],
    options: [exposes.options.thermostat_unit()],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let result;
        if (meta.options.thermostat_unit === "fahrenheit") {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const occupiedCoolingSetpoint = result;
        await entity.write("hvacThermostat", {occupiedCoolingSetpoint});
        return {state: {occupied_cooling_setpoint: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["occupiedCoolingSetpoint"]);
    },
};
export const thermostat_unoccupied_cooling_setpoint: Tz.Converter = {
    key: ["unoccupied_cooling_setpoint"],
    options: [exposes.options.thermostat_unit()],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let result;
        if (meta.options.thermostat_unit === "fahrenheit") {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const unoccupiedCoolingSetpoint = result;
        await entity.write("hvacThermostat", {unoccupiedCoolingSetpoint});
        return {state: {unoccupied_cooling_setpoint: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["unoccupiedCoolingSetpoint"]);
    },
};
export const thermostat_setpoint_raise_lower: Tz.Converter = {
    key: ["setpoint_raise_lower"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value, key);
        const payload = {mode: value.mode, amount: Math.round(value.amount) * 100};
        await entity.command("hvacThermostat", "setpointRaiseLower", payload, utils.getOptions(meta.mapped, entity));
    },
};
export const thermostat_relay_status_log: Tz.Converter = {
    key: ["relay_status_log"],
    convertGet: async (entity, key, meta) => {
        await entity.command("hvacThermostat", "getRelayStatusLog", {}, utils.getOptions(meta.mapped, entity));
    },
};
export const thermostat_running_mode: Tz.Converter = {
    key: ["running_mode"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["runningMode"]);
    },
};
export const thermostat_min_heat_setpoint_limit: Tz.Converter = {
    key: ["min_heat_setpoint_limit"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let result;
        if (meta.options.thermostat_unit === "fahrenheit") {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const minHeatSetpointLimit = result;
        await entity.write("hvacThermostat", {minHeatSetpointLimit});
        return {state: {min_heat_setpoint_limit: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["minHeatSetpointLimit"]);
    },
};
export const thermostat_max_heat_setpoint_limit: Tz.Converter = {
    key: ["max_heat_setpoint_limit"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let result;
        if (meta.options.thermostat_unit === "fahrenheit") {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const maxHeatSetpointLimit = result;
        await entity.write("hvacThermostat", {maxHeatSetpointLimit});
        return {state: {max_heat_setpoint_limit: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["maxHeatSetpointLimit"]);
    },
};
export const thermostat_min_cool_setpoint_limit: Tz.Converter = {
    key: ["min_cool_setpoint_limit"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let result;
        if (meta.options.thermostat_unit === "fahrenheit") {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const minCoolSetpointLimit = result;
        await entity.write("hvacThermostat", {minCoolSetpointLimit});
        return {state: {min_cool_setpoint_limit: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["minCoolSetpointLimit"]);
    },
};
export const thermostat_max_cool_setpoint_limit: Tz.Converter = {
    key: ["max_cool_setpoint_limit"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let result;
        if (meta.options.thermostat_unit === "fahrenheit") {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const maxCoolSetpointLimit = result;
        await entity.write("hvacThermostat", {maxCoolSetpointLimit});
        return {state: {max_cool_setpoint_limit: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["maxCoolSetpointLimit"]);
    },
};
export const thermostat_ac_louver_position: Tz.Converter = {
    key: ["ac_louver_position"],
    convertSet: async (entity, key, value, meta) => {
        let acLouverPosition = utils.getKey(constants.thermostatAcLouverPositions, value, undefined, Number);
        if (acLouverPosition === undefined) {
            acLouverPosition = utils.getKey(constants.thermostatAcLouverPositions, value, value as number, Number);
        }
        await entity.write("hvacThermostat", {acLouverPosition});
        return {state: {ac_louver_position: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["acLouverPosition"]);
    },
};
export const electrical_measurement_power: Tz.Converter = {
    key: ["power"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["activePower"]);
    },
};
export const electrical_measurement_power_phase_b: Tz.Converter = {
    key: ["power_phase_b"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["activePowerPhB"]);
    },
};
export const electrical_measurement_power_phase_c: Tz.Converter = {
    key: ["power_phase_c"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["activePowerPhC"]);
    },
};
export const metering_power: Tz.Converter = {
    key: ["power"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        const ep = determineEndpoint(entity, meta, "seMetering");
        await ep.read("seMetering", ["instantaneousDemand"]);
    },
};
export const metering_status: Tz.Converter = {
    key: ["status"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        await utils.enforceEndpoint(entity, key, meta).read("seMetering", ["status"]);
    },
};
export const metering_extended_status: Tz.Converter = {
    key: ["extended_status"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        await utils.enforceEndpoint(entity, key, meta).read("seMetering", ["extendedStatus"]);
    },
};
export const currentsummdelivered: Tz.Converter = {
    key: ["energy"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        const ep = determineEndpoint(entity, meta, "seMetering");
        await ep.read("seMetering", ["currentSummDelivered"]);
    },
};
export const currenttier1summdelivered: Tz.Converter = {
    key: ["energy_tier_1"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        const ep = determineEndpoint(entity, meta, "seMetering");
        await ep.read("seMetering", ["currentTier1SummDelivered"]);
    },
};
export const currenttier2summdelivered: Tz.Converter = {
    key: ["energy_tier_2"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        const ep = determineEndpoint(entity, meta, "seMetering");
        await ep.read("seMetering", ["currentTier2SummDelivered"]);
    },
};
export const currenttier3summdelivered: Tz.Converter = {
    key: ["energy_tier_3"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        const ep = determineEndpoint(entity, meta, "seMetering");
        await ep.read("seMetering", ["currentTier3SummDelivered"]);
    },
};
export const currenttier4summdelivered: Tz.Converter = {
    key: ["energy_tier_4"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        const ep = determineEndpoint(entity, meta, "seMetering");
        await ep.read("seMetering", ["currentTier4SummDelivered"]);
    },
};
export const currentsummreceived: Tz.Converter = {
    key: ["produced_energy"],
    convertGet: async (entity, key, meta) => {
        utils.assertEndpoint(entity);
        const ep = determineEndpoint(entity, meta, "seMetering");
        await ep.read("seMetering", ["currentSummReceived"]);
    },
};
export const frequency: Tz.Converter = {
    key: ["ac_frequency"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["acFrequency"]);
    },
};
export const electrical_measurement_power_reactive: Tz.Converter = {
    key: ["power_reactive"],
    convertGet: async (entity, key, meta) => {
        await entity.read("haElectricalMeasurement", ["reactivePower"]);
    },
};
export const powerfactor: Tz.Converter = {
    key: ["power_factor"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["powerFactor"]);
    },
};
export const acvoltage: Tz.Converter = {
    key: ["voltage"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["rmsVoltage"]);
    },
};
export const acvoltage_phase_b: Tz.Converter = {
    key: ["voltage_phase_b"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["rmsVoltagePhB"]);
    },
};
export const acvoltage_phase_c: Tz.Converter = {
    key: ["voltage_phase_c"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["rmsVoltagePhC"]);
    },
};
export const accurrent: Tz.Converter = {
    key: ["current"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["rmsCurrent"]);
    },
};
export const accurrent_phase_b: Tz.Converter = {
    key: ["current_phase_b"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["rmsCurrentPhB"]);
    },
};
export const accurrent_phase_c: Tz.Converter = {
    key: ["current_phase_c"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["rmsCurrentPhC"]);
    },
};
export const accurrent_neutral: Tz.Converter = {
    key: ["current_neutral"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["neutralCurrent"]);
    },
};
export const dccurrent: Tz.Converter = {
    key: ["current"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["dcCurrent"]);
    },
};
export const dcvoltage: Tz.Converter = {
    key: ["voltage"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["dcVoltage"]);
    },
};
export const dcpower: Tz.Converter = {
    key: ["power"],
    convertGet: async (entity, key, meta) => {
        const ep = determineEndpoint(entity, meta, "haElectricalMeasurement");
        await ep.read("haElectricalMeasurement", ["dcPower"]);
    },
};
export const temperature: Tz.Converter = {
    key: ["temperature"],
    convertGet: async (entity, key, meta) => {
        await entity.read("msTemperatureMeasurement", ["measuredValue"]);
    },
};
export const humidity: Tz.Converter = {
    key: ["humidity"],
    convertGet: async (entity, key, meta) => {
        await entity.read("msRelativeHumidity", ["measuredValue"]);
    },
};
// #endregion

// #region Non-generic converters
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const TYZB01_on_off: Tz.Converter = {
    key: ["state", "time_in_seconds"],
    convertSet: async (entity, key, value, meta) => {
        const result = await on_off.convertSet(entity, key, value, meta);
        utils.assertString(value, key);
        const lowerCaseValue = value.toLowerCase();
        if (!["on", "off"].includes(lowerCaseValue)) {
            return result;
        }
        const messageKeys = Object.keys(meta.message);
        const timeInSecondsValue = (() => {
            if (messageKeys.includes("state")) {
                return meta.message.time_in_seconds;
            }
            if (meta.endpoint_name) {
                return meta.message[`time_in_seconds_${meta.endpoint_name}`];
            }
            return null;
        })();
        if (!timeInSecondsValue) {
            return result;
        }
        const timeInSeconds = Number(timeInSecondsValue);
        if (!Number.isInteger(timeInSeconds) || timeInSeconds < 0 || timeInSeconds > 0xfffe) {
            throw new Error("The time_in_seconds value must be convertible to an integer in the range: <0x0000, 0xFFFE>");
        }
        const on = lowerCaseValue === "on";
        await entity.command(
            "genOnOff",
            "onWithTimedOff",
            {
                ctrlbits: 0,
                ontime: on ? 0 : timeInSeconds.valueOf(),
                offwaittime: on ? timeInSeconds.valueOf() : 0,
            },
            utils.getOptions(meta.mapped, entity),
        );
        return result;
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genOnOff", ["onOff"]);
    },
};
export const power_source: Tz.Converter = {
    key: ["power_source", "charging"],
    convertGet: async (entity, key, meta) => {
        await entity.read("genBasic", ["powerSource"]);
    },
};
export const scene_store: Tz.Converter = {
    key: ["scene_store"],
    convertSet: async (entity, key, value: KeyValueAny, meta) => {
        const isGroup = utils.isGroup(entity);
        const groupid = isGroup ? entity.groupID : value.group_id != null ? value.group_id : 0;
        let sceneid = value;
        let scenename = null;
        if (typeof value === "object") {
            sceneid = value.ID;
            scenename = value.name;
        }

        utils.assertNumber(sceneid, "ID");

        if (groupid === 0 && sceneid === 0) {
            // From Zigbee spec:
            // "Scene identifier 0x00, along with group identifier 0x0000, is reserved for the global scene used by the OnOff cluster"
            throw new Error("Scene ID 0 cannot be used with group ID 0 (reserved).");
        }

        const response = await entity.command("genScenes", "store", {groupid, sceneid}, utils.getOptions(meta.mapped, entity));

        if (isGroup) {
            if (meta.membersState) {
                for (const member of entity.members) {
                    utils.saveSceneState(member, sceneid, groupid, meta.membersState[member.getDevice().ieeeAddr], scenename);
                }
            }
        } else if (response.status === 0) {
            utils.saveSceneState(entity, sceneid, groupid, meta.state, scenename);
        } else {
            throw new Error(`Scene add not successful ('${Zcl.Status[response.status]}')`);
        }
        logger.info("Successfully stored scene", NS);
        return {state: {}};
    },
};
export const scene_recall: Tz.Converter = {
    key: ["scene_recall"],
    convertSet: async (entity, key, value, meta) => {
        const groupid = utils.isGroup(entity) ? entity.groupID : 0;
        utils.assertNumber(value);
        const sceneid = value;
        await entity.command("genScenes", "recall", {groupid, sceneid, transitionTime: 0xffff}, utils.getOptions(meta.mapped, entity));

        const addColorMode = (newState: KeyValueAny) => {
            if (newState.color_temp !== undefined) {
                newState.color_mode = constants.colorModeLookup[2];
            } else if (newState.color !== undefined) {
                if (newState.color.x !== undefined) {
                    newState.color_mode = constants.colorModeLookup[1];
                } else {
                    newState.color_mode = constants.colorModeLookup[0];
                }
            }

            return newState;
        };

        if (utils.isGroup(entity)) {
            const membersState: KeyValueAny = {};
            for (const member of entity.members) {
                let recalledState = utils.getSceneState(member, sceneid, groupid);
                if (recalledState) {
                    // add color_mode if saved state does not contain it
                    if (recalledState.color_mode === undefined) {
                        recalledState = addColorMode(recalledState);
                    }

                    Object.assign(recalledState, libColor.syncColorState(recalledState, meta.state, entity, meta.options));
                    membersState[member.getDevice().ieeeAddr] = recalledState;
                } else {
                    logger.warning(`Unknown scene was recalled for ${member.getDevice().ieeeAddr}, can't restore state.`, NS);
                    membersState[member.getDevice().ieeeAddr] = {};
                }
            }
            logger.info("Successfully recalled group scene", NS);
            return {membersState};
        }
        let recalledState = utils.getSceneState(entity, sceneid, groupid);
        if (recalledState) {
            // add color_mode if saved state does not contain it
            if (recalledState.color_mode === undefined) {
                recalledState = addColorMode(recalledState);
            }

            Object.assign(recalledState, libColor.syncColorState(recalledState, meta.state, entity, meta.options));
            logger.info("Successfully recalled scene", NS);
            return {state: recalledState};
        }
        logger.warning(`Unknown scene was recalled for ${entity.deviceIeeeAddress}, can't restore state.`, NS);
        return {state: {}};
    },
};
export const scene_add: Tz.Converter = {
    key: ["scene_add"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value);
        utils.assertNumber(value.ID, "ID");

        if (value.color_temp != null && value.color != null) {
            throw new Error(`Don't specify both 'color_temp' and 'color'`);
        }

        const isGroup = utils.isGroup(entity);
        const groupid = isGroup ? entity.groupID : value.group_id != null ? value.group_id : 0;
        const sceneid = value.ID;
        const scenename = value.name;
        const transtime = value.transition != null ? value.transition : 0;

        if (groupid === 0 && sceneid === 0) {
            // From Zigbee spec:
            // "Scene identifier 0x00, along with group identifier 0x0000, is reserved for the global scene used by the OnOff cluster"
            throw new Error("Scene ID 0 cannot be used with group ID 0 (reserved).");
        }

        const state: KeyValueAny = {};
        const extensionfieldsets = [];
        for (const attribute of Object.keys(value)) {
            let val = value[attribute];
            if (attribute === "state") {
                extensionfieldsets.push({clstId: 6, len: 1, extField: [val.toLowerCase() === "on" ? 1 : 0]});
                state.state = val.toUpperCase();
            } else if (attribute === "brightness") {
                extensionfieldsets.push({clstId: 8, len: 1, extField: [val]});
                state.brightness = val;
            } else if (attribute === "position") {
                const invert = utils.getMetaValue(entity, meta.mapped, "coverInverted", "allEqual", false)
                    ? !meta.options.invert_cover
                    : meta.options.invert_cover;
                extensionfieldsets.push({clstId: 258, len: 1, extField: [invert ? 100 - val : val]});
                state.position = val;
            } else if (attribute === "color_temp") {
                /*
                 * ZCL version 7 added support for ColorTemperatureMireds
                 *
                 * Currently no devices seem to support this, so always fallback to XY conversion. In the future if a device
                 * supports this, or other features get added this the following commit contains an implementation:
                 * https://github.com/Koenkk/zigbee-herdsman-converters/pull/1837/commits/c22175b946b83230ce4e711c2a3796cf2029e78f
                 *
                 * Conversion to XY is allowed according to the ZCL:
                 * `Since there is a direct relation between ColorTemperatureMireds and XY,
                 *  color temperature, if supported, is stored as XY in the scenes table.`
                 *
                 * See https://github.com/Koenkk/zigbee2mqtt/issues/4926#issuecomment-735947705
                 */
                const [colorTempMin, colorTempMax] = light.findColorTempRange(entity);
                val = light.clampColorTemp(val, colorTempMin, colorTempMax);

                const xy = libColor.ColorXY.fromMireds(val);
                const xScaled = utils.mapNumberRange(xy.x, 0, 1, 0, 65535);
                const yScaled = utils.mapNumberRange(xy.y, 0, 1, 0, 65535);
                extensionfieldsets.push({clstId: 768, len: 4, extField: [xScaled, yScaled]});
                state.color_mode = constants.colorModeLookup[2];
                state.color_temp = val;
            } else if (attribute === "color") {
                try {
                    val = JSON.parse(val);
                } catch {
                    /* empty */
                }

                const newColor = libColor.Color.fromConverterArg(val);
                if (newColor.isXY()) {
                    const xScaled = utils.mapNumberRange(newColor.xy.x, 0, 1, 0, 65535);
                    const yScaled = utils.mapNumberRange(newColor.xy.y, 0, 1, 0, 65535);
                    extensionfieldsets.push({
                        clstId: 768,
                        len: 4,
                        extField: [xScaled, yScaled],
                    });
                    state.color_mode = constants.colorModeLookup[1];
                    state.color = newColor.xy.toObject();
                } else if (newColor.isHSV()) {
                    const hsvCorrected = newColor.hsv.colorCorrected(meta);
                    if (utils.getMetaValue(entity, meta.mapped, "supportsEnhancedHue", "allEqual", false)) {
                        const hScaled = utils.mapNumberRange(hsvCorrected.hue, 0, 360, 0, 65535);
                        const sScaled = utils.mapNumberRange(hsvCorrected.saturation, 0, 100, 0, 254);
                        extensionfieldsets.push({
                            clstId: 768,
                            len: 13,
                            extField: [0, 0, hScaled, sScaled, 0, 0, 0, 0],
                        });
                    } else {
                        // The extensionFieldSet is always EnhancedCurrentHue according to ZCL
                        // When the bulb or all bulbs in a group do not support enhanchedHue,
                        const colorXY = hsvCorrected.toXY();
                        const xScaled = utils.mapNumberRange(colorXY.x, 0, 1, 0, 65535);
                        const yScaled = utils.mapNumberRange(colorXY.y, 0, 1, 0, 65535);
                        extensionfieldsets.push({
                            clstId: 768,
                            len: 4,
                            extField: [xScaled, yScaled],
                        });
                    }
                    state.color_mode = constants.colorModeLookup[0];
                    state.color = newColor.hsv.toObject(false, false);
                }
            }
        }

        /*
         * Remove scene first
         *
         * Multiple add scene calls will result in the current and previous
         * payloads to be merged. Resulting in unexpected behavior when
         * trying to replace a scene.
         *
         * We accept a SUCCESS or NOT_FOUND as a result of the remove call.
         */
        const removeresp = await entity.command("genScenes", "remove", {groupid, sceneid}, utils.getOptions(meta.mapped, entity));

        if (isGroup || (utils.isObject(removeresp) && (removeresp.status === 0 || removeresp.status === 133 || removeresp.status === 139))) {
            const addSceneCommand = Number.isInteger(transtime) ? "add" : "enhancedAdd";
            const commandTransitionTime = addSceneCommand === "enhancedAdd" ? Math.floor(transtime * 10) : transtime;

            const response = await entity.command(
                "genScenes",
                addSceneCommand,
                {groupid, sceneid, scenename: "", transtime: commandTransitionTime, extensionfieldsets},
                utils.getOptions(meta.mapped, entity),
            );

            if (isGroup) {
                if (meta.membersState) {
                    for (const member of entity.members) {
                        utils.saveSceneState(member, sceneid, groupid, state, scenename);
                    }
                }
            } else {
                utils.assertObject(response);
                if (response.status === 0) {
                    utils.saveSceneState(entity, sceneid, groupid, state, scenename);
                } else {
                    throw new Error(`Scene add not successful ('${Zcl.Status[response.status]}')`);
                }
            }
        } else {
            const status = utils.isObject(removeresp) ? Zcl.Status[removeresp.status] : "unknown";
            throw new Error(`Scene add unable to remove existing scene ('${status}')`);
        }
        logger.info("Successfully added scene", NS);
        return {state: {}};
    },
};
export const scene_remove: Tz.Converter = {
    key: ["scene_remove"],
    convertSet: async (entity, key, value, meta) => {
        const isGroup = utils.isGroup(entity);
        utils.assertNumber(value);
        const groupid = isGroup ? entity.groupID : 0;
        const sceneid = value;
        const response = await entity.command("genScenes", "remove", {groupid, sceneid}, utils.getOptions(meta.mapped, entity));
        if (isGroup) {
            if (meta.membersState) {
                for (const member of entity.members) {
                    utils.deleteSceneState(member, sceneid, groupid);
                }
            }
        } else if (response.status === 0) {
            utils.deleteSceneState(entity, sceneid, groupid);
        } else {
            throw new Error(`Scene remove not successful ('${Zcl.Status[response.status]}')`);
        }
        logger.info("Successfully removed scene", NS);
    },
};
export const scene_remove_all: Tz.Converter = {
    key: ["scene_remove_all"],
    convertSet: async (entity, key, value, meta) => {
        const groupid = utils.isGroup(entity) ? entity.groupID : 0;
        // In case `entity` is a group, the response is `undefined`, mock it.
        const response = (await entity.command("genScenes", "removeAll", {groupid}, utils.getOptions(meta.mapped, entity))) ?? {status: 0};
        utils.assertObject(response);
        if (utils.isGroup(entity)) {
            if (meta.membersState) {
                for (const member of entity.members) {
                    utils.deleteSceneState(member);
                }
            }
        } else if (response.status === 0) {
            utils.deleteSceneState(entity);
        } else {
            throw new Error(`Scene remove all not successful ('${Zcl.Status[response.status]}')`);
        }
        logger.info("Successfully removed all scenes", NS);
    },
};
export const scene_rename: Tz.Converter = {
    key: ["scene_rename"],
    convertSet: (entity, key, value, meta) => {
        utils.assertObject(value);
        const isGroup = utils.isGroup(entity);
        const sceneid = value.ID;
        const scenename = value.name;
        const groupid = isGroup ? entity.groupID : value.group_id != null ? value.group_id : 0;

        if (isGroup) {
            if (meta.membersState) {
                for (const member of entity.members) {
                    const state = utils.getSceneState(member, sceneid, groupid);
                    if (state) {
                        utils.saveSceneState(member, sceneid, groupid, state, scenename);
                    }
                }
            }
        } else {
            const state = utils.getSceneState(entity, sceneid, groupid);
            if (!state) {
                throw new Error("No such scene in device meta data");
            }
            utils.saveSceneState(entity, sceneid, groupid, state, scenename);
        }
        logger.info("Successfully renamed scene", NS);
    },
};
// #endregion

// #region Ignore converters
export const ignore_transition: Tz.Converter = {
    key: ["transition"],
    convertSet: async (entity, key, value, meta) => {},
};
export const ignore_rate: Tz.Converter = {
    key: ["rate"],
    convertSet: async (entity, key, value, meta) => {},
};
// #endregion
