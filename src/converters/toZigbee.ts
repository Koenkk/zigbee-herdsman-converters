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
const manufacturerOptions = {
    sunricher: {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_SUNRICHER_TECHNOLOGY_LTD},
    lumi: {manufacturerCode: Zcl.ManufacturerCode.LUMI_UNITED_TECHOLOGY_LTD_SHENZHEN, disableDefaultResponse: true},
    eurotronic: {manufacturerCode: Zcl.ManufacturerCode.NXP_SEMICONDUCTORS},
    danfoss: {manufacturerCode: Zcl.ManufacturerCode.DANFOSS_A_S},
    hue: {manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V},
    ikea: {manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN},
    sinope: {manufacturerCode: Zcl.ManufacturerCode.SINOPE_TECHNOLOGIES},
    tint: {manufacturerCode: Zcl.ManufacturerCode.MUELLER_LICHT_INTERNATIONAL_INC},
    legrand: {manufacturerCode: Zcl.ManufacturerCode.LEGRAND_GROUP, disableDefaultResponse: true},
    viessmann: {manufacturerCode: Zcl.ManufacturerCode.VIESSMANN_ELEKTRONIK_GMBH},
};

export const on_off: Tz.Converter = {
    key: ["state", "on_time", "off_wait_time"],
    convertSet: async (entity, key, value, meta) => {
        const state = utils.isString(meta.message.state) ? meta.message.state.toLowerCase() : null;
        utils.validateValue(state, ["toggle", "off", "on"]);

        if (state === "on" && (meta.message.on_time != null || meta.message.off_wait_time != null)) {
            const onTime = meta.message.on_time != null ? meta.message.on_time : 0;
            const offWaitTime = meta.message.off_wait_time != null ? meta.message.off_wait_time : 0;

            if (typeof onTime !== "number") {
                throw Error("The on_time value must be a number!");
            }
            if (typeof offWaitTime !== "number") {
                throw Error("The off_wait_time value must be a number!");
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
        const supportsHueAndSaturation = utils.getMetaValue(entity, meta.mapped, "supportsHueAndSaturation", "allEqual", true);
        const supportsEnhancedHue = utils.getMetaValue(entity, meta.mapped, "supportsEnhancedHue", "allEqual", true);

        if (newColor.isHSV() && !supportsHueAndSaturation) {
            // The color we got is HSV but the bulb does not support Hue/Saturation mode
            throw new Error("This light does not support Hue/Saturation, please use X/Y instead.");
        }

        if (newColor.isRGB() || newColor.isXY()) {
            // Convert RGB to XY color mode because Zigbee doesn't support RGB (only x/y and hue/saturation)
            const xy = newColor.isRGB() ? newColor.rgb.gammaCorrected().toXY().rounded(4) : newColor.xy;

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

            await entity.command("lightingColorCtrl", "moveToColor", {transtime, colorx, colory}, utils.getOptions(meta.mapped, entity));
        } else if (newColor.isHSV()) {
            const hsv = newColor.hsv;
            const hsvCorrected = hsv.colorCorrected(meta);
            newState.color_mode = constants.colorModeLookup[0];
            newState.color = hsv.toObject(false);

            if (hsv.value !== null && utils.isObject(value)) {
                await entity.command(
                    "genLevelCtrl",
                    "moveToLevelWithOnOff",
                    {level: utils.mapNumberRange(hsvCorrected.value, 0, 100, 0, 254), transtime},
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
                        {transtime, enhancehue, saturation},
                        utils.getOptions(meta.mapped, entity),
                    );
                } else {
                    const hue = utils.mapNumberRange(hsvCorrected.hue, 0, 360, 0, 254);
                    await entity.command(
                        "lightingColorCtrl",
                        "moveToHueAndSaturation",
                        {transtime, hue, saturation},
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
                        {transtime, enhancehue, direction},
                        utils.getOptions(meta.mapped, entity),
                    );
                } else {
                    const hue = utils.mapNumberRange(hsvCorrected.hue, 0, 360, 0, 254);
                    await entity.command("lightingColorCtrl", "moveToHue", {transtime, hue, direction}, utils.getOptions(meta.mapped, entity));
                }
            } else if (hsv.saturation !== null) {
                const saturation = utils.mapNumberRange(hsvCorrected.saturation, 0, 100, 0, 254);

                await entity.command("lightingColorCtrl", "moveToSaturation", {transtime, saturation}, utils.getOptions(meta.mapped, entity));
            }
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
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            value = utils
                .mapNumberRange(value, 0, 100, colorTempMin != null ? colorTempMin : 154, colorTempMax != null ? colorTempMax : 500)
                .toString();
        }

        if (utils.isString(value) && value in preset) {
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            value = utils.getFromLookup(value, preset);
        }

        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = Number(value);

        // ensure value within range
        utils.assertNumber(value);
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = light.clampColorTemp(value, colorTempMin, colorTempMax);

        const payload = {colortemp: value as number, transtime: utils.getTransition(entity, key, meta).time};
        await entity.command("lightingColorCtrl", "moveToColorTemp", payload, utils.getOptions(meta.mapped, entity));
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

        globalStore.putValue(entity, "panelStatus", panelStatus);
        globalStore.putValue(entity, "delayUntil", delayUntil);
        const payload = {panelstatus: panelStatus, secondsremain: secondsRemain, audiblenotif: 0, alarmstatus: 0};
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
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        const lookup = {off: 0, on: 1, toggle: 2, previous: 255};
        try {
            await entity.write("genOnOff", {startUpOnOff: utils.getFromLookup(value, lookup)}, utils.getOptions(meta.mapped, entity));
        } catch (e) {
            if ((e as Error).message.includes("UNSUPPORTED_ATTRIBUTE")) {
                throw new Error("Got `UNSUPPORTED_ATTRIBUTE` error, device does not support power on behaviour");
            }
            throw e;
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
            {pincodevalue: pincode},
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
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            value = value.toLowerCase();
            if (value === "stop") {
                await entity.command("genLevelCtrl", "stop", {}, utils.getOptions(meta.mapped, entity));
                return;
            }
            const lookup = {open: 100, close: 0};
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
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
            {level: utils.mapNumberRange(Number(position), 0, 100, 0, 255), transtime: 0},
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
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
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
                // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
                value = JSON.parse(value);
            } catch {
                throw new Error("Payload is not valid JSON");
            }
        }

        utils.assertObject(value, key);
        // onOffTransitionTime - range 0x0000 to 0xffff - optional
        if (value.on_off_transition_time != null) {
            let onOffTransitionTimeValue = Number(value.on_off_transition_time);
            if (onOffTransitionTimeValue > 65535) onOffTransitionTimeValue = 65535;
            if (onOffTransitionTimeValue < 0) onOffTransitionTimeValue = 0;

            await entity.write("genLevelCtrl", {onOffTransitionTime: onOffTransitionTimeValue}, utils.getOptions(meta.mapped, entity));
            Object.assign(state, {on_off_transition_time: onOffTransitionTimeValue});
        }

        // onTransitionTime - range 0x0000 to 0xffff - optional
        //                    0xffff = use onOffTransitionTime
        if (value.on_transition_time != null) {
            let onTransitionTimeValue = value.on_transition_time;
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
            Object.assign(state, {on_transition_time: onTransitionTimeValue});
        }

        // offTransitionTime - range 0x0000 to 0xffff - optional
        //                    0xffff = use onOffTransitionTime
        if (value.off_transition_time != null) {
            let offTransitionTimeValue = value.off_transition_time;
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
            Object.assign(state, {off_transition_time: offTransitionTimeValue});
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
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
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
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = Number(value);
        utils.assertNumber(value, key);

        const mode = value > 0 ? 0 : 1;
        const transition = utils.getTransition(entity, key, meta).time;
        const payload = {stepmode: mode, stepsize: Math.abs(value), transtime: transition};
        await entity.command("genLevelCtrl", command, payload, utils.getOptions(meta.mapped, entity));

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
            await entity.command("genLevelCtrl", "stop", {}, utils.getOptions(meta.mapped, entity));

            // As we cannot determine the new brightness state, we read it from the device
            await utils.sleep(500);
            const target = utils.getEntityOrFirstGroupMember(entity);
            const onOff = (await target.read("genOnOff", ["onOff"])).onOff;
            const brightness = (await target.read("genLevelCtrl", ["currentLevel"])).currentLevel;
            return {state: {brightness, state: onOff === 1 ? "ON" : "OFF"}};
        }
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = Number(value);
        utils.assertNumber(value, key);
        const payload = {movemode: value > 0 ? 0 : 1, rate: Math.abs(value)};
        const command = key.endsWith("onoff") ? "moveWithOnOff" : "move";
        await entity.command("genLevelCtrl", command, payload, utils.getOptions(meta.mapped, entity));
    },
};
export const light_colortemp_step: Tz.Converter = {
    key: ["color_temp_step"],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = Number(value);
        utils.assertNumber(value, key);

        const mode = value > 0 ? 1 : 3;
        const transition = utils.getTransition(entity, key, meta).time;
        const payload = {stepmode: mode, stepsize: Math.abs(value), transtime: transition, minimum: 0, maximum: 600};
        await entity.command("lightingColorCtrl", "stepColorTemp", payload, utils.getOptions(meta.mapped, entity));

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
        await entity.command("lightingColorCtrl", "moveColorTemp", {minimum, maximum, rate, movemode}, utils.getOptions(meta.mapped, entity));

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
            const payload = {
                transtime: utils.getTransition(entity, key, meta).time,
                colorx: utils.mapNumberRange(xy.x, 0, 1, 0, 65535),
                colory: utils.mapNumberRange(xy.y, 0, 1, 0, 65535),
            };
            await entity.command("lightingColorCtrl", "moveToColor", payload, utils.getOptions(meta.mapped, entity));
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
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = Number(value);
        utils.assertNumber(value, key);

        const command = key === "hue_step" ? "stepHue" : "stepSaturation";
        const attribute = key === "hue_step" ? "currentHue" : "currentSaturation";
        const mode = value > 0 ? 1 : 3;
        const transition = utils.getTransition(entity, key, meta).time;
        const payload = {stepmode: mode, stepsize: Math.abs(value), transtime: transition};
        await entity.command("lightingColorCtrl", command, payload, utils.getOptions(meta.mapped, entity));

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
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
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

        await entity.command("lightingColorCtrl", command, {rate, movemode}, utils.getOptions(meta.mapped, entity));

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
                    await entity.command(
                        "genLevelCtrl",
                        "moveToLevel",
                        {level: Number(brightness), transtime: transition.time},
                        utils.getOptions(meta.mapped, entity),
                    );
                }
                await on_off.convertSet(entity, "state", state, meta);
            } else {
                await entity.command(
                    "genLevelCtrl",
                    "moveToLevel",
                    {level: Number(brightness), transtime: transition.time},
                    utils.getOptions(meta.mapped, entity),
                );
            }
        } else {
            await entity.command(
                "genLevelCtrl",
                state === null ? "moveToLevel" : "moveToLevelWithOnOff",
                {level: Number(brightness), transtime: transition.time},
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
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            value = utils.getFromLookup(value, preset);
        }

        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = Number(value);
        utils.assertNumber(value);

        // ensure value within range
        // we do allow one exception for 0xffff, which is to restore the previous value
        if (value !== 65535) {
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
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
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
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
                    // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
                    value = "select";
                } else if (value === 10) {
                    // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
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
export const acova_thermostat_system_mode: Tz.Converter = {
    key: ["system_mode"],
    convertSet: async (entity, key, value, meta) => {
        let systemMode = utils.getKey(constants.acovaThermostatSystemModes, value, undefined, Number);
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
        await entity.command("genLevelCtrl", "moveToLevel", {level: value, transtime: 0}, utils.getOptions(meta.mapped, entity));
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
export const elko_power_status: Tz.Converter = {
    key: ["system_mode"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {elkoPowerStatus: value === "heat" ? 1 : 0});
        return {state: {system_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["elkoPowerStatus"]);
    },
};
export const elko_relay_state: Tz.Converter = {
    key: ["running_state"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["elkoRelayState"]);
    },
};
export const elko_local_temperature_calibration: Tz.Converter = {
    key: ["local_temperature_calibration"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        await entity.write("hvacThermostat", {elkoCalibration: Math.round(value * 10)});
        return {state: {local_temperature_calibration: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["elkoCalibration"]);
    },
};
export const livolo_socket_switch_on_off: Tz.Converter = {
    key: ["state"],
    convertSet: async (entity, key, value, meta) => {
        if (typeof value !== "string") {
            return;
        }

        const state = value.toLowerCase();
        let oldstate = 1;
        if (state === "on") {
            oldstate = 108;
        }
        let channel = 1.0;
        const postfix = meta.endpoint_name || "left";
        await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
        const payloadOn = {1: {value: Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]), type: 1}};
        const payloadOff = {1: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 1}};
        const payloadOnRight = {1: {value: Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]), type: 2}};
        const payloadOffRight = {1: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 2}};
        const payloadOnBottomLeft = {1: {value: Buffer.from([4, 0, 0, 0, 0, 0, 0, 0]), type: 4}};
        const payloadOffBottomLeft = {1: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 4}};
        const payloadOnBottomRight = {1: {value: Buffer.from([8, 0, 0, 0, 0, 0, 0, 0]), type: 136}};
        const payloadOffBottomRight = {1: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 136}};
        if (postfix === "left") {
            await entity.command("genLevelCtrl", "moveToLevelWithOnOff", {level: oldstate, transtime: channel});
            await entity.write("genPowerCfg", state === "on" ? payloadOn : payloadOff, {
                manufacturerCode: 0x1ad2,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 3,
                direction: 1,
                transactionSequenceNumber: 0xe9,
            });
            return {state: {state: value.toUpperCase()}};
        }
        if (postfix === "right") {
            channel = 2.0;
            await entity.command("genLevelCtrl", "moveToLevelWithOnOff", {level: oldstate, transtime: channel});
            await entity.write("genPowerCfg", state === "on" ? payloadOnRight : payloadOffRight, {
                manufacturerCode: 0x1ad2,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 3,
                direction: 1,
                transactionSequenceNumber: 0xe9,
            });
            return {state: {state: value.toUpperCase()}};
        }
        if (postfix === "bottom_right") {
            await entity.write("genPowerCfg", state === "on" ? payloadOnBottomRight : payloadOffBottomRight, {
                manufacturerCode: 0x1ad2,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 3,
                direction: 1,
                transactionSequenceNumber: 0xe9,
            });
            return {state: {state: value.toUpperCase()}};
        }
        if (postfix === "bottom_left") {
            await entity.write("genPowerCfg", state === "on" ? payloadOnBottomLeft : payloadOffBottomLeft, {
                manufacturerCode: 0x1ad2,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 3,
                direction: 1,
                transactionSequenceNumber: 0xe9,
            });
            return {state: {state: value.toUpperCase()}};
        }
        return {state: {state: value.toUpperCase()}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
    },
};
export const livolo_switch_on_off: Tz.Converter = {
    key: ["state"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        const postfix = meta.endpoint_name || "left";
        const state = value.toLowerCase() === "on" ? 108 : 1;
        let channel = 1;

        if (postfix === "left") {
            channel = 1.0;
        } else if (postfix === "right") {
            channel = 2.0;
        } else {
            return;
        }

        await entity.command("genLevelCtrl", "moveToLevelWithOnOff", {level: state, transtime: channel});
        return {state: {state: value.toUpperCase()}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
    },
};
export const livolo_dimmer_level: Tz.Converter = {
    key: ["brightness", "brightness_percent", "level"],
    convertSet: async (entity, key, value, meta) => {
        // upscale to 100
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = Number(value);
        utils.assertNumber(value, key);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let newValue;
        if (key === "level") {
            if (value >= 0 && value <= 1000) {
                newValue = utils.mapNumberRange(value, 0, 1000, 0, 100);
            } else {
                throw new Error("Dimmer level is out of range 0..1000");
            }
        } else if (key === "brightness_percent") {
            if (value >= 0 && value <= 100) {
                newValue = Math.round(value);
            } else {
                throw new Error("Dimmer brightness_percent is out of range 0..100");
            }
        } else {
            if (value >= 0 && value <= 255) {
                newValue = utils.mapNumberRange(value, 0, 255, 0, 100);
            } else {
                throw new Error("Dimmer brightness is out of range 0..255");
            }
        }
        await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
        const payload = {769: {value: Buffer.from([newValue, 0, 0, 0, 0, 0, 0, 0]), type: 1}};
        await entity.write("genPowerCfg", payload, {
            manufacturerCode: 0x1ad2,
            disableDefaultResponse: true,
            disableResponse: true,
            reservedBits: 3,
            direction: 1,
            transactionSequenceNumber: 0xe9,
            writeUndiv: true,
        });
        return {
            state: {brightness_percent: newValue, brightness: utils.mapNumberRange(newValue, 0, 100, 0, 255), level: newValue * 10},
        };
    },
    convertGet: async (entity, key, meta) => {
        await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
    },
};
export const livolo_cover_state: Tz.Converter = {
    key: ["state"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertEndpoint(entity);
        // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
        let payload;
        const options = {
            frameType: 0,
            manufacturerCode: 0x1ad2,
            disableDefaultResponse: true,
            disableResponse: true,
            reservedBits: 3,
            direction: 1,
            writeUndiv: true,
            transactionSequenceNumber: 0xe9,
        };
        switch (value) {
            case "OPEN":
                payload = {attrId: 0x0000, selector: null, elementData: [0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]};
                break;
            case "CLOSE":
                payload = {attrId: 0x0000, selector: null, elementData: [0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]};
                break;
            case "STOP":
                payload = {attrId: 0x0000, selector: null, elementData: [0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]};
                break;
            default:
                throw new Error(`Value '${value}' is not a valid cover position (must be one of 'OPEN' or 'CLOSE')`);
        }
        await entity.writeStructured(
            "genPowerCfg",
            // @ts-expect-error workaround write custom payload
            [payload],
            options,
        );
        return {
            state: {
                moving: true,
            },
        };
    },
};
export const livolo_cover_position: Tz.Converter = {
    key: ["position"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        const position = 100 - value;
        await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
        const payload = {1025: {value: [position, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], type: 1}};
        await entity.write("genPowerCfg", payload, {
            manufacturerCode: 0x1ad2,
            disableDefaultResponse: true,
            disableResponse: true,
            reservedBits: 3,
            direction: 1,
            transactionSequenceNumber: 0xe9,
            writeUndiv: true,
        });
        return {
            state: {
                position: value,
                moving: true,
            },
        };
    },
};
export const livolo_cover_options: Tz.Converter = {
    key: ["options"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertObject(value);
        const options = {
            frameType: 0,
            manufacturerCode: 0x1ad2,
            disableDefaultResponse: true,
            disableResponse: true,
            reservedBits: 3,
            direction: 1,
            writeUndiv: true,
            transactionSequenceNumber: 0xe9,
        };

        if (value.motor_direction != null) {
            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
            let direction;
            switch (value.motor_direction) {
                case "FORWARD":
                    direction = 0x00;
                    break;
                case "REVERSE":
                    direction = 0x80;
                    break;
                default:
                    throw new Error(`livolo_cover_options: ${value.motor_direction} is not a valid motor direction \
                     (must be one of 'FORWARD' or 'REVERSE')`);
            }

            const payload = {4865: {value: [direction, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]}};
            await entity.write(
                "genPowerCfg",
                // @ts-expect-error workaround write custom payload
                payload,
                options,
            );
        }

        if (value.motor_speed != null) {
            if (value.motor_speed < 20 || value.motor_speed > 40) {
                throw new Error("livolo_cover_options: Motor speed is out of range (20-40)");
            }
            const payload = {4609: {value: [value.motor_speed, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]}};
            await entity.write(
                "genPowerCfg",
                // @ts-expect-error workaround write custom payload
                payload,
                options,
            );
        }
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const ZigUP_lock: Tz.Converter = {
    key: ["led"],
    convertSet: async (entity, key, value, meta) => {
        const lookup = {off: "lockDoor" as const, on: "unlockDoor" as const, toggle: "toggleDoor" as const};
        await entity.command("closuresDoorLock", utils.getFromLookup(value, lookup), {pincodevalue: ""});
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const LS21001_alert_behaviour: Tz.Converter = {
    key: ["alert_behaviour"],
    convertSet: async (entity, key, value, meta) => {
        const lookup = {siren_led: 3, siren: 2, led: 1, nothing: 0};
        await entity.write(
            "genBasic",
            {16394: {value: utils.getFromLookup(value, lookup), type: 32}},
            {manufacturerCode: Zcl.ManufacturerCode.LEEDARSON_LIGHTING_CO_LTD, disableDefaultResponse: true},
        );
        return {state: {alert_behaviour: value}};
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const STS_PRS_251_beep: Tz.Converter = {
    key: ["beep"],
    convertSet: async (entity, key, value, meta) => {
        await entity.command("genIdentify", "identify", {identifytime: value as number}, utils.getOptions(meta.mapped, entity));
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const SPZ01_power_outage_memory: Tz.Converter = {
    key: ["power_outage_memory"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("genOnOff", {8192: {value: value ? 0x01 : 0x00, type: 0x20}});
        return {state: {power_outage_memory: value}};
    },
};
export const tuya_relay_din_led_indicator: Tz.Converter = {
    key: ["indicator_mode"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        const lookup = {off: 0x00, on_off: 0x01, off_on: 0x02};
        const payload = utils.getFromLookup(value, lookup);
        await entity.write("genOnOff", {32769: {value: payload, type: 0x30}});
        return {state: {indicator_mode: value}};
    },
};
export const kmpcil_res005_on_off: Tz.Converter = {
    key: ["state"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        const options = {disableDefaultResponse: true};
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        utils.assertString(value, key);
        utils.validateValue(value, ["toggle", "off", "on"]);
        if (value === "toggle") {
            if (meta.state.state === undefined) {
                throw new Error("Cannot toggle, state not known yet");
            }
            const payload = {85: {value: meta.state.state === "OFF" ? 0x01 : 0x00, type: 0x10}};
            await entity.write("genBinaryOutput", payload, options);
            return {state: {state: meta.state.state === "OFF" ? "ON" : "OFF"}};
        }
        const payload = {85: {value: value.toUpperCase() === "OFF" ? 0x00 : 0x01, type: 0x10}};
        await entity.write("genBinaryOutput", payload, options);
        return {state: {state: value.toUpperCase()}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genBinaryOutput", ["presentValue"]);
    },
};
export const hue_wall_switch_device_mode: Tz.Converter = {
    key: ["device_mode"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value);
        const values = ["single_rocker", "single_push_button", "dual_rocker", "dual_push_button"];
        utils.validateValue(value, values);
        await entity.write("genBasic", {52: {value: values.indexOf(value), type: 48}}, manufacturerOptions.hue);
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genBasic", [0x0034], manufacturerOptions.hue);
    },
};
export const danfoss_thermostat_occupied_heating_setpoint: Tz.Converter = {
    key: ["occupied_heating_setpoint"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        const payload = {
            // 1: "User Interaction" Changes occupied heating setpoint and triggers an aggressive reaction
            //   of the actuator as soon as control SW runs, to replicate the behavior of turning the dial on the eTRV.
            setpointType: 1,
            setpoint: Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100,
        };
        await entity.command("hvacThermostat", "danfossSetpointCommand", payload, manufacturerOptions.danfoss);
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["occupiedHeatingSetpoint"]);
    },
};
export const danfoss_thermostat_occupied_heating_setpoint_scheduled: Tz.Converter = {
    key: ["occupied_heating_setpoint_scheduled"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        const payload = {
            // 0: "Schedule Change" Just changes occupied heating setpoint. No special behavior,
            //   the PID control setpoint will be update with the new setpoint.
            setpointType: 0,
            setpoint: Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100,
        };
        await entity.command("hvacThermostat", "danfossSetpointCommand", payload, manufacturerOptions.danfoss);
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["occupiedHeatingSetpoint"]);
    },
};
export const danfoss_mounted_mode_active: Tz.Converter = {
    key: ["mounted_mode_active"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossMountedModeActive"], manufacturerOptions.danfoss);
    },
};
export const danfoss_mounted_mode_control: Tz.Converter = {
    key: ["mounted_mode_control"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossMountedModeControl: value as number}, manufacturerOptions.danfoss);
        return {state: {mounted_mode_control: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossMountedModeControl"], manufacturerOptions.danfoss);
    },
};
export const danfoss_thermostat_vertical_orientation: Tz.Converter = {
    key: ["thermostat_vertical_orientation"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossThermostatOrientation: value as number}, manufacturerOptions.danfoss);
        return {state: {thermostat_vertical_orientation: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossThermostatOrientation"], manufacturerOptions.danfoss);
    },
};
export const danfoss_external_measured_room_sensor: Tz.Converter = {
    key: ["external_measured_room_sensor"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossExternalMeasuredRoomSensor: value as number}, manufacturerOptions.danfoss);
        return {state: {external_measured_room_sensor: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossExternalMeasuredRoomSensor"], manufacturerOptions.danfoss);
    },
};
export const danfoss_radiator_covered: Tz.Converter = {
    key: ["radiator_covered"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossRadiatorCovered: value as number}, manufacturerOptions.danfoss);
        return {state: {radiator_covered: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossRadiatorCovered"], manufacturerOptions.danfoss);
    },
};
export const danfoss_viewing_direction: Tz.Converter = {
    key: ["viewing_direction"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacUserInterfaceCfg", {danfossViewingDirection: value as number}, manufacturerOptions.danfoss);
        return {state: {viewing_direction: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacUserInterfaceCfg", ["danfossViewingDirection"], manufacturerOptions.danfoss);
    },
};
export const danfoss_algorithm_scale_factor: Tz.Converter = {
    key: ["algorithm_scale_factor"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossAlgorithmScaleFactor: value as number}, manufacturerOptions.danfoss);
        return {state: {algorithm_scale_factor: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossAlgorithmScaleFactor"], manufacturerOptions.danfoss);
    },
};
export const danfoss_heat_available: Tz.Converter = {
    key: ["heat_available"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossHeatAvailable: value as number}, manufacturerOptions.danfoss);
        return {state: {heat_available: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossHeatAvailable"], manufacturerOptions.danfoss);
    },
};
export const danfoss_heat_required: Tz.Converter = {
    key: ["heat_required"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossHeatRequired"], manufacturerOptions.danfoss);
    },
};
export const danfoss_day_of_week: Tz.Converter = {
    key: ["day_of_week"],
    convertSet: async (entity, key, value, meta) => {
        const payload = {danfossDayOfWeek: utils.getKey(constants.thermostatDayOfWeek, value, undefined, Number)};
        await entity.write("hvacThermostat", payload, manufacturerOptions.danfoss);
        return {state: {day_of_week: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossDayOfWeek"], manufacturerOptions.danfoss);
    },
};
export const danfoss_trigger_time: Tz.Converter = {
    key: ["trigger_time"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossTriggerTime: value as number}, manufacturerOptions.danfoss);
        return {state: {trigger_time: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossTriggerTime"], manufacturerOptions.danfoss);
    },
};
export const danfoss_window_open_feature: Tz.Converter = {
    key: ["window_open_feature"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossWindowOpenFeatureEnable: value as number}, manufacturerOptions.danfoss);
        return {state: {window_open_feature: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossWindowOpenFeatureEnable"], manufacturerOptions.danfoss);
    },
};
export const danfoss_window_open_internal: Tz.Converter = {
    key: ["window_open_internal"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossWindowOpenInternal"], manufacturerOptions.danfoss);
    },
};
export const danfoss_window_open_external: Tz.Converter = {
    key: ["window_open_external"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossWindowOpenExternal: value as number}, manufacturerOptions.danfoss);
        return {state: {window_open_external: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossWindowOpenExternal"], manufacturerOptions.danfoss);
    },
};
export const danfoss_load_balancing_enable: Tz.Converter = {
    key: ["load_balancing_enable"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossLoadBalancingEnable: value as number}, manufacturerOptions.danfoss);
        return {state: {load_balancing_enable: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossLoadBalancingEnable"], manufacturerOptions.danfoss);
    },
};
export const danfoss_load_room_mean: Tz.Converter = {
    key: ["load_room_mean"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossLoadRoomMean: value as number}, manufacturerOptions.danfoss);
        return {state: {load_room_mean: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossLoadRoomMean"], manufacturerOptions.danfoss);
    },
};
export const danfoss_load_estimate: Tz.Converter = {
    key: ["load_estimate"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossLoadEstimate"], manufacturerOptions.danfoss);
    },
};
export const danfoss_preheat_status: Tz.Converter = {
    key: ["preheat_status"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossPreheatStatus"], manufacturerOptions.danfoss);
    },
};
export const danfoss_adaptation_status: Tz.Converter = {
    key: ["adaptation_run_status"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossAdaptionRunStatus"], manufacturerOptions.danfoss);
    },
};
export const danfoss_adaptation_settings: Tz.Converter = {
    key: ["adaptation_run_settings"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossAdaptionRunSettings: value as number}, manufacturerOptions.danfoss);
        return {state: {adaptation_run_settings: value}};
    },

    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossAdaptionRunSettings"], manufacturerOptions.danfoss);
    },
};
export const danfoss_adaptation_control: Tz.Converter = {
    key: ["adaptation_run_control"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write(
            "hvacThermostat",
            {danfossAdaptionRunControl: utils.getKey(constants.danfossAdaptionRunControl, value, value as number, Number)},
            manufacturerOptions.danfoss,
        );
        return {state: {adaptation_run_control: value}};
    },

    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossAdaptionRunControl"], manufacturerOptions.danfoss);
    },
};
export const danfoss_regulation_setpoint_offset: Tz.Converter = {
    key: ["regulation_setpoint_offset"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("hvacThermostat", {danfossRegulationSetpointOffset: value as number}, manufacturerOptions.danfoss);
        return {state: {regulation_setpoint_offset: value}};
    },

    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossRegulationSetpointOffset"], manufacturerOptions.danfoss);
    },
};
export const danfoss_output_status: Tz.Converter = {
    key: ["output_status"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossOutputStatus"], manufacturerOptions.danfoss);
    },
};
export const danfoss_room_status_code: Tz.Converter = {
    key: ["room_status_code"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossRoomStatusCode"], manufacturerOptions.danfoss);
    },
};
export const danfoss_floor_sensor_mode: Tz.Converter = {
    key: ["room_floor_sensor_mode"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossRoomFloorSensorMode"], manufacturerOptions.danfoss);
    },
};
export const danfoss_floor_min_setpoint: Tz.Converter = {
    key: ["floor_min_setpoint"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        const danfossFloorMinSetpoint = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        await entity.write("hvacThermostat", {danfossFloorMinSetpoint}, manufacturerOptions.danfoss);
        return {state: {floor_min_setpoint: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossFloorMinSetpoint"], manufacturerOptions.danfoss);
    },
};
export const danfoss_floor_max_setpoint: Tz.Converter = {
    key: ["floor_max_setpoint"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        const danfossFloorMaxSetpoint = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        await entity.write("hvacThermostat", {danfossFloorMaxSetpoint}, manufacturerOptions.danfoss);
        return {state: {floor_max_setpoint: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossFloorMaxSetpoint"], manufacturerOptions.danfoss);
    },
};
export const danfoss_schedule_type_used: Tz.Converter = {
    key: ["schedule_type_used"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossScheduleTypeUsed"], manufacturerOptions.danfoss);
    },
};
export const danfoss_icon2_pre_heat: Tz.Converter = {
    key: ["icon2_pre_heat"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossIcon2PreHeat"], manufacturerOptions.danfoss);
    },
};
export const danfoss_icon2_pre_heat_status: Tz.Converter = {
    key: ["icon2_pre_heat_status"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["danfossIcon2PreHeatStatus"], manufacturerOptions.danfoss);
    },
};
export const danfoss_system_status_code: Tz.Converter = {
    key: ["system_status_code"],
    convertGet: async (entity, key, meta) => {
        await entity.read("haDiagnostic", ["danfossSystemStatusCode"], manufacturerOptions.danfoss);
    },
};
export const danfoss_heat_supply_request: Tz.Converter = {
    key: ["heat_supply_request"],
    convertGet: async (entity, key, meta) => {
        await entity.read("haDiagnostic", ["danfossHeatSupplyRequest"], manufacturerOptions.danfoss);
    },
};
export const danfoss_system_status_water: Tz.Converter = {
    key: ["system_status_water"],
    convertGet: async (entity, key, meta) => {
        await entity.read("haDiagnostic", ["danfossSystemStatusWater"], manufacturerOptions.danfoss);
    },
};
export const danfoss_multimaster_role: Tz.Converter = {
    key: ["multimaster_role"],
    convertGet: async (entity, key, meta) => {
        await entity.read("haDiagnostic", ["danfossMultimasterRole"], manufacturerOptions.danfoss);
    },
};
export const danfoss_icon_application: Tz.Converter = {
    key: ["icon_application"],
    convertGet: async (entity, key, meta) => {
        await entity.read("haDiagnostic", ["danfossIconApplication"], manufacturerOptions.danfoss);
    },
};
export const danfoss_icon_forced_heating_cooling: Tz.Converter = {
    key: ["icon_forced_heating_cooling"],
    convertGet: async (entity, key, meta) => {
        await entity.read("haDiagnostic", ["danfossIconForcedHeatingCooling"], manufacturerOptions.danfoss);
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const ZMCSW032D_cover_position: Tz.Converter = {
    key: ["position", "tilt"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        if (meta.options.time_close != null && meta.options.time_open != null) {
            const sleepSeconds = async (s: number) => {
                return await new Promise((resolve) => setTimeout(resolve, s * 1000));
            };

            const oldPosition = meta.state.position;
            if (value === 100) {
                await entity.command("closuresWindowCovering", "upOpen", {}, utils.getOptions(meta.mapped, entity));
            } else if (value === 0) {
                await entity.command("closuresWindowCovering", "downClose", {}, utils.getOptions(meta.mapped, entity));
            } else {
                if (utils.isNumber(oldPosition) && oldPosition > value) {
                    const delta = oldPosition - value;
                    utils.assertNumber(meta.options.time_open);
                    const mutiplicateur = meta.options.time_open / 100;
                    const timeBeforeStop = delta * mutiplicateur;
                    await entity.command("closuresWindowCovering", "downClose", {}, utils.getOptions(meta.mapped, entity));
                    await sleepSeconds(timeBeforeStop);
                    await entity.command("closuresWindowCovering", "stop", {}, utils.getOptions(meta.mapped, entity));
                } else if (utils.isNumber(oldPosition) && oldPosition < value) {
                    const delta = value - oldPosition;
                    utils.assertNumber(meta.options.time_close);
                    const mutiplicateur = meta.options.time_close / 100;
                    const timeBeforeStop = delta * mutiplicateur;
                    await entity.command("closuresWindowCovering", "upOpen", {}, utils.getOptions(meta.mapped, entity));
                    await sleepSeconds(timeBeforeStop);
                    await entity.command("closuresWindowCovering", "stop", {}, utils.getOptions(meta.mapped, entity));
                }
            }

            return {state: {position: value}};
        }
    },
    convertGet: async (entity, key, meta) => {
        const isPosition = key === "position";
        await entity.read("closuresWindowCovering", [isPosition ? "currentPositionLiftPercentage" : "currentPositionTiltPercentage"]);
    },
};
export const namron_thermostat: Tz.Converter = {
    key: [
        "lcd_brightness",
        "button_vibration_level",
        "floor_sensor_type",
        "sensor",
        "powerup_status",
        "floor_sensor_calibration",
        "dry_time",
        "mode_after_dry",
        "temperature_display",
        "window_open_check",
        "hysterersis",
        "display_auto_off_enabled",
        "alarm_airtemp_overvalue",
        "away_mode",
    ],
    convertSet: async (entity, key, value, meta) => {
        if (key === "lcd_brightness") {
            const lookup = {low: 0, mid: 1, high: 2};
            const payload = {4096: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "button_vibration_level") {
            const lookup = {off: 0, low: 1, high: 2};
            const payload = {4097: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "floor_sensor_type") {
            const lookup = {"10k": 1, "15k": 2, "50k": 3, "100k": 4, "12k": 5};
            const payload = {4098: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "sensor") {
            const lookup = {air: 0, floor: 1, both: 2};
            const payload = {4099: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "powerup_status") {
            const lookup = {default: 0, last_status: 1};
            const payload = {4100: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "floor_sensor_calibration") {
            utils.assertNumber(value);
            const payload = {4101: {value: Math.round(value * 10), type: 0x28}}; // INT8S
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "dry_time") {
            const payload = {4102: {value: value, type: 0x20}}; // INT8U
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "mode_after_dry") {
            const lookup = {off: 0, manual: 1, auto: 2, away: 3};
            const payload = {4103: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "temperature_display") {
            const lookup = {room: 0, floor: 1};
            const payload = {4104: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "window_open_check") {
            utils.assertNumber(value);
            const payload = {4105: {value: value * 2, type: 0x20}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "hysterersis") {
            utils.assertNumber(value);
            const payload = {4106: {value: value * 10, type: 0x20}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "display_auto_off_enabled") {
            const lookup = {disabled: 0, enabled: 1};
            const payload = {4107: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "alarm_airtemp_overvalue") {
            const payload = {8193: {value: value, type: 0x20}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        } else if (key === "away_mode") {
            const payload = {8194: {value: Number(value === "ON"), type: 0x30}};
            await entity.write("hvacThermostat", payload, manufacturerOptions.sunricher);
        }
    },
    convertGet: async (entity, key, meta) => {
        switch (key) {
            case "lcd_brightness":
                await entity.read("hvacThermostat", [0x1000], manufacturerOptions.sunricher);
                break;
            case "button_vibration_level":
                await entity.read("hvacThermostat", [0x1001], manufacturerOptions.sunricher);
                break;
            case "floor_sensor_type":
                await entity.read("hvacThermostat", [0x1002], manufacturerOptions.sunricher);
                break;
            case "sensor":
                await entity.read("hvacThermostat", [0x1003], manufacturerOptions.sunricher);
                break;
            case "powerup_status":
                await entity.read("hvacThermostat", [0x1004], manufacturerOptions.sunricher);
                break;
            case "floor_sensor_calibration":
                await entity.read("hvacThermostat", [0x1005], manufacturerOptions.sunricher);
                break;
            case "dry_time":
                await entity.read("hvacThermostat", [0x1006], manufacturerOptions.sunricher);
                break;
            case "mode_after_dry":
                await entity.read("hvacThermostat", [0x1007], manufacturerOptions.sunricher);
                break;
            case "temperature_display":
                await entity.read("hvacThermostat", [0x1008], manufacturerOptions.sunricher);
                break;
            case "window_open_check":
                await entity.read("hvacThermostat", [0x1009], manufacturerOptions.sunricher);
                break;
            case "hysterersis":
                await entity.read("hvacThermostat", [0x100a], manufacturerOptions.sunricher);
                break;
            case "display_auto_off_enabled":
                await entity.read("hvacThermostat", [0x100b], manufacturerOptions.sunricher);
                break;
            case "alarm_airtemp_overvalue":
                await entity.read("hvacThermostat", [0x2001], manufacturerOptions.sunricher);
                break;
            case "away_mode":
                await entity.read("hvacThermostat", [0x2002], manufacturerOptions.sunricher);
                break;

            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.namron_thermostat.convertGet ${key}`);
        }
    },
};
export const namron_thermostat_child_lock: Tz.Converter = {
    key: ["child_lock"],
    convertSet: async (entity, key, value, meta) => {
        const keypadLockout = Number(value === "LOCK");
        await entity.write("hvacUserInterfaceCfg", {keypadLockout});
        return {state: {child_lock: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacUserInterfaceCfg", ["keypadLockout"]);
    },
};
export const easycode_auto_relock: Tz.Converter = {
    key: ["auto_relock"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("closuresDoorLock", {autoRelockTime: value ? 1 : 0}, utils.getOptions(meta.mapped, entity));
        return {state: {auto_relock: value}};
    },
};
export const tuya_led_control: Tz.Converter = {
    key: ["brightness", "color", "color_temp"],
    options: [exposes.options.color_sync()],
    convertSet: async (entity, key, value, meta) => {
        if (
            key === "brightness" &&
            meta.state.color_mode === constants.colorModeLookup[2] &&
            meta.message.color == null &&
            meta.message.color_temp == null
        ) {
            const zclData = {level: Number(value), transtime: 0};

            await entity.command("genLevelCtrl", "moveToLevel", zclData, utils.getOptions(meta.mapped, entity));

            globalStore.putValue(entity, "brightness", zclData.level);

            return {state: {brightness: zclData.level}};
        }

        if (key === "brightness" && utils.isNumber(meta.message.color_temp)) {
            const zclData = {colortemp: utils.mapNumberRange(meta.message.color_temp, 500, 154, 0, 254), transtime: 0};
            const zclDataBrightness = {level: Number(value), transtime: 0};

            await entity.command("lightingColorCtrl", "tuyaRgbMode", {enable: 0});
            await entity.command("lightingColorCtrl", "moveToColorTemp", zclData, utils.getOptions(meta.mapped, entity));
            await entity.command("genLevelCtrl", "moveToLevel", zclDataBrightness, utils.getOptions(meta.mapped, entity));

            globalStore.putValue(entity, "brightness", zclDataBrightness.level);

            const newState = {
                brightness: zclDataBrightness.level,
                color_mode: constants.colorModeLookup[2],
                color_temp: meta.message.color_temp,
            };

            return {state: libColor.syncColorState(newState, meta.state, entity, meta.options)};
        }

        if (key === "color_temp") {
            utils.assertNumber(value, key);
            const zclData = {colortemp: utils.mapNumberRange(value, 500, 154, 0, 254), transtime: 0};
            const zclDataBrightness = {level: globalStore.getValue(entity, "brightness") || 100, transtime: 0};

            await entity.command("lightingColorCtrl", "tuyaRgbMode", {enable: 0});
            await entity.command("lightingColorCtrl", "moveToColorTemp", zclData, utils.getOptions(meta.mapped, entity));
            await entity.command("genLevelCtrl", "moveToLevel", zclDataBrightness, utils.getOptions(meta.mapped, entity));

            const newState = {
                brightness: zclDataBrightness.level,
                color_mode: constants.colorModeLookup[2],
                color_temp: value,
            };

            return {state: libColor.syncColorState(newState, meta.state, entity, meta.options)};
        }

        const zclData = {
            brightness: globalStore.getValue(entity, "brightness") || 100,
            // @ts-expect-error ignore
            hue: utils.mapNumberRange(meta.state.color.h, 0, 360, 0, 254) || 100,
            // @ts-expect-error ignore
            saturation: utils.mapNumberRange(meta.state.color.s, 0, 100, 0, 254) || 100,
            transtime: 0,
        };

        if (utils.isObject(value)) {
            if (value.h) {
                zclData.hue = utils.mapNumberRange(value.h, 0, 360, 0, 254);
            }
            if (value.hue) {
                zclData.hue = utils.mapNumberRange(value.hue, 0, 360, 0, 254);
            }
            if (value.s) {
                zclData.saturation = utils.mapNumberRange(value.s, 0, 100, 0, 254);
            }
            if (value.saturation) {
                zclData.saturation = utils.mapNumberRange(value.saturation, 0, 100, 0, 254);
            }
            if (value.b) {
                zclData.brightness = Number(value.b);
            }
            if (value.brightness) {
                zclData.brightness = Number(value.brightness);
            }
            if (typeof value === "number") {
                zclData.brightness = value;
            }
        }

        if (meta.message.color != null) {
            if (utils.isObject(meta.message.color)) {
                if (meta.message.color.h) {
                    zclData.hue = utils.mapNumberRange(meta.message.color.h, 0, 360, 0, 254);
                }
                if (meta.message.color.s) {
                    zclData.saturation = utils.mapNumberRange(meta.message.color.s, 0, 100, 0, 254);
                }
                if (meta.message.color.b) {
                    zclData.brightness = Number(meta.message.color.b);
                }
                if (meta.message.color.brightness) {
                    zclData.brightness = Number(meta.message.color.brightness);
                }
            }
        }

        await entity.command("lightingColorCtrl", "tuyaRgbMode", {enable: 1});
        await entity.command("lightingColorCtrl", "tuyaMoveToHueAndSaturationBrightness", zclData, utils.getOptions(meta.mapped, entity));

        globalStore.putValue(entity, "brightness", zclData.brightness);

        const newState = {
            brightness: zclData.brightness,
            color: {
                h: utils.mapNumberRange(zclData.hue, 0, 254, 0, 360),
                hue: utils.mapNumberRange(zclData.hue, 0, 254, 0, 360),
                s: utils.mapNumberRange(zclData.saturation, 0, 254, 0, 100),
                saturation: utils.mapNumberRange(zclData.saturation, 0, 254, 0, 100),
            },
            color_mode: constants.colorModeLookup[0],
        };

        return {state: libColor.syncColorState(newState, meta.state, entity, meta.options)};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingColorCtrl", ["currentHue", "currentSaturation", "tuyaBrightness", "tuyaRgbMode", "colorTemperature"]);
    },
};
export const tuya_led_controller: Tz.Converter = {
    key: ["state", "color"],
    convertSet: async (entity, key, value, meta) => {
        if (key === "state") {
            utils.assertString(value, key);
            if (value.toLowerCase() === "off") {
                await entity.command("genOnOff", "offWithEffect", {effectid: 0x01, effectvariant: 0x01}, utils.getOptions(meta.mapped, entity));
            } else {
                const payload = {level: 255, transtime: 0};
                await entity.command("genLevelCtrl", "moveToLevelWithOnOff", payload, utils.getOptions(meta.mapped, entity));
            }
            return {state: {state: value.toUpperCase()}};
        }
        if (key === "color") {
            utils.assertObject(value);
            const hue = utils.mapNumberRange(value.h, 0, 360, 0, 254);
            const saturation = utils.mapNumberRange(value.s, 0, 100, 0, 254);
            const transtime = 0;
            const direction = 0;

            await entity.command("lightingColorCtrl", "moveToHue", {hue, transtime, direction}, utils.getOptions(meta.mapped, entity));
            await entity.command("lightingColorCtrl", "moveToSaturation", {saturation, transtime}, utils.getOptions(meta.mapped, entity));
        }
    },
    convertGet: async (entity, key, meta) => {
        if (key === "state") {
            await entity.read("genOnOff", ["onOff"]);
        } else if (key === "color") {
            await entity.read("lightingColorCtrl", ["currentHue", "currentSaturation"]);
        }
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const EMIZB_132_mode: Tz.Converter = {
    key: ["interface_mode"],
    convertSet: async (entity, key, value, meta) => {
        const endpoint = meta.device.getEndpoint(2);
        const lookup = {
            norwegian_han: {value: 0x0200, acVoltageDivisor: 10, acCurrentDivisor: 10},
            norwegian_han_extra_load: {value: 0x0201, acVoltageDivisor: 10, acCurrentDivisor: 10},
            aidon_meter: {value: 0x0202, acVoltageDivisor: 10, acCurrentDivisor: 10},
            kaifa_and_kamstrup: {value: 0x0203, acVoltageDivisor: 10, acCurrentDivisor: 1000},
        };

        await endpoint.write(
            "seMetering",
            {770: {value: utils.getFromLookup(value, lookup).value, type: 49}},
            {manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
        );

        // As the device reports the incorrect divisor, we need to set it here
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-604347303
        // Values for norwegian_han and aidon_meter have not been been checked
        endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {
            acVoltageMultiplier: 1,
            acVoltageDivisor: utils.getFromLookup(value, lookup).acVoltageDivisor,
            acCurrentMultiplier: 1,
            acCurrentDivisor: utils.getFromLookup(value, lookup).acCurrentDivisor,
        });

        return {state: {interface_mode: value}};
    },
};
export const eurotronic_host_flags: Tz.Converter = {
    key: ["eurotronic_host_flags", "system_mode"],
    convertSet: async (entity, key, value, meta) => {
        const origValue = value;
        await entity.read("hvacThermostat", [0x4008], manufacturerOptions.eurotronic);
        // calculate bit value
        let bitValue = 0x01; // bit 0 always 1
        if (meta.state.mirror_display === "ON") {
            bitValue |= 0x02;
        }
        if (value === constants.thermostatSystemModes[0]) {
            // off
            bitValue |= 0x20;
        } else if (value === constants.thermostatSystemModes[4]) {
            // "heat"
            bitValue |= 0x04;
        } else {
            // auto
            bitValue |= 0x10;
        }
        if (meta.state.child_lock === "LOCK") {
            bitValue |= 0x80;
        }
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = bitValue;
        const payload = {16392: {value, type: 0x22}};
        await entity.write("hvacThermostat", payload, manufacturerOptions.eurotronic);
        return {state: {[key]: origValue}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0x4008], manufacturerOptions.eurotronic);
    },
};
export const eurotronic_error_status: Tz.Converter = {
    key: ["eurotronic_error_status"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0x4002], manufacturerOptions.eurotronic);
    },
};
export const eurotronic_current_heating_setpoint: Tz.Converter = {
    key: ["current_heating_setpoint"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        const val = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        const payload = {16387: {value: val, type: 0x29}};
        await entity.write("hvacThermostat", payload, manufacturerOptions.eurotronic);
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0x4003], manufacturerOptions.eurotronic);
    },
};
export const eurotronic_valve_position: Tz.Converter = {
    key: ["eurotronic_valve_position", "valve_position"],
    convertSet: async (entity, key, value, meta) => {
        const payload = {16385: {value, type: 0x20}};
        await entity.write("hvacThermostat", payload, manufacturerOptions.eurotronic);
        return {state: {[key]: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0x4001], manufacturerOptions.eurotronic);
    },
};
export const eurotronic_trv_mode: Tz.Converter = {
    key: ["eurotronic_trv_mode", "trv_mode"],
    convertSet: async (entity, key, value, meta) => {
        const payload = {16384: {value, type: 0x30}};
        await entity.write("hvacThermostat", payload, manufacturerOptions.eurotronic);
        return {state: {[key]: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0x4000], manufacturerOptions.eurotronic);
    },
};
export const eurotronic_child_lock: Tz.Converter = {
    key: ["eurotronic_child_lock", "child_lock"],
    convertSet: async (entity, key, value, meta) => {
        await entity.read("hvacThermostat", [0x4008], manufacturerOptions.eurotronic);
        // calculate bit value
        let bitValue = 0x01; // bit 0 always 1
        if (meta.state.mirror_display === "ON") {
            bitValue |= 0x02;
        }
        if (meta.state.system_mode === constants.thermostatSystemModes[0]) {
            // off
            bitValue |= 0x20;
        } else if (meta.state.system_mode === constants.thermostatSystemModes[4]) {
            // "heat"
            bitValue |= 0x04;
        } else {
            // auto
            bitValue |= 0x10;
        }
        if (value === "LOCK") {
            bitValue |= 0x80;
        }
        const origValue = value;
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = bitValue;
        const payload = {16392: {value, type: 0x22}};
        await entity.write("hvacThermostat", payload, manufacturerOptions.eurotronic);
        return {state: {[key]: origValue}};
    },
};
export const eurotronic_mirror_display: Tz.Converter = {
    key: ["eurotronic_mirror_display", "mirror_display"],
    convertSet: async (entity, key, value, meta) => {
        await entity.read("hvacThermostat", [0x4008], manufacturerOptions.eurotronic);
        // calculate bit value
        let bitValue = 0x01; // bit 0 always 1
        if (value === "ON") {
            bitValue |= 0x02;
        }
        if (meta.state.system_mode === constants.thermostatSystemModes[0]) {
            // off
            bitValue |= 0x20;
        } else if (meta.state.system_mode === constants.thermostatSystemModes[4]) {
            // "heat"
            bitValue |= 0x04;
        } else {
            // auto
            bitValue |= 0x10;
        }
        if (meta.state.child_lock === "LOCK") {
            bitValue |= 0x80;
        }
        const origValue = value;
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = bitValue;
        const payload = {16392: {value, type: 0x22}};
        await entity.write("hvacThermostat", payload, manufacturerOptions.eurotronic);
        return {state: {[key]: origValue}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0x4008], manufacturerOptions.eurotronic);
    },
};
export const stelpro_thermostat_outdoor_temperature: Tz.Converter = {
    key: ["thermostat_outdoor_temperature"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        if (value > -100 && value < 100) {
            await entity.write("hvacThermostat", {StelproOutdoorTemp: value * 100});
        }
    },
};
export const DTB190502A1_LED: Tz.Converter = {
    key: ["LED"],
    convertSet: async (entity, key, value, meta) => {
        if (value === "default") {
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            value = 1;
        }
        const lookup = {
            OFF: 0,
            ON: 1,
        };
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = utils.getFromLookup(value, lookup);
        // Check for valid data
        utils.assertNumber(value, key);
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        if ((value >= 0 && value < 2) === false) value = 0;

        const payload = {
            16400: {
                value,
                type: 0x21,
            },
        };

        await entity.write("genBasic", payload);
    },
};
export const ptvo_switch_trigger: Tz.Converter = {
    key: ["trigger", "interval"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        utils.assertEndpoint(entity);
        if (key === "trigger") {
            await entity.command("genOnOff", "onWithTimedOff", {ctrlbits: 0, ontime: Math.round(value / 100), offwaittime: 0});
        } else if (key === "interval") {
            const cluster = "genOnOff";
            if (entity.supportsInputCluster(cluster) || entity.supportsOutputCluster(cluster)) {
                await entity.configureReporting(cluster, [
                    {
                        attribute: "onOff",
                        minimumReportInterval: value,
                        maximumReportInterval: value,
                        reportableChange: 0,
                    },
                ]);
            } else if (utils.hasEndpoints(meta.device, [1])) {
                const endpoint = meta.device.getEndpoint(1);
                await endpoint.configureReporting("genBasic", [
                    {
                        attribute: "zclVersion",
                        minimumReportInterval: value,
                        maximumReportInterval: value,
                        reportableChange: 0,
                    },
                ]);
            }
        }
    },
};
export const ptvo_switch_uart: Tz.Converter = {
    key: ["action"],
    convertSet: async (entity, key, value, meta) => {
        if (!value) {
            return;
        }
        const payload = {14: {value, type: 0x42}};
        for (const endpoint of meta.device.endpoints) {
            const cluster = "genMultistateValue";
            if (endpoint.supportsInputCluster(cluster) || endpoint.supportsOutputCluster(cluster)) {
                await endpoint.write(cluster, payload);
                return;
            }
        }
        await entity.write("genMultistateValue", payload);
    },
};
export const ptvo_switch_analog_input: Tz.Converter = {
    key: ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8", "l9", "l10", "l11", "l12", "l13", "l14", "l15", "l16"],
    convertGet: async (entity, key, meta) => {
        const epId = Number.parseInt(key.substr(1, 2), 10);
        if (utils.hasEndpoints(meta.device, [epId])) {
            const endpoint = meta.device.getEndpoint(epId);
            await endpoint.read("genAnalogInput", ["presentValue", "description"]);
        }
    },
    convertSet: async (entity, key, value, meta) => {
        const epId = Number.parseInt(key.substr(1, 2), 10);
        if (utils.hasEndpoints(meta.device, [epId])) {
            const endpoint = meta.device.getEndpoint(epId);
            let cluster = "genLevelCtrl";
            if (endpoint.supportsInputCluster(cluster) || endpoint.supportsOutputCluster(cluster)) {
                const value2 = Number(value);
                if (Number.isNaN(value2)) {
                    return;
                }
                const payload = {currentLevel: value2};
                await endpoint.write(cluster, payload);
                return;
            }

            cluster = "genAnalogInput";
            if (endpoint.supportsInputCluster(cluster) || endpoint.supportsOutputCluster(cluster)) {
                const value2 = Number(value);
                if (Number.isNaN(value2)) {
                    return;
                }
                const payload = {presentValue: value2};
                await endpoint.write(cluster, payload);
                return;
            }
        }
        return;
    },
};
export const tint_scene: Tz.Converter = {
    key: ["tint_scene"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("genBasic", {16389: {value, type: 0x20}}, manufacturerOptions.tint);
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const bticino_4027C_cover_state: Tz.Converter = {
    key: ["state"],
    options: [exposes.options.invert_cover()],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value);
        const invert = !(utils.getMetaValue(entity, meta.mapped, "coverInverted", "allEqual", false)
            ? !meta.options.invert_cover
            : meta.options.invert_cover);
        const lookup = invert
            ? {open: "upOpen" as const, close: "downClose" as const, stop: "stop" as const, on: "upOpen" as const, off: "downClose" as const}
            : {open: "downClose" as const, close: "upOpen" as const, stop: "stop" as const, on: "downClose" as const, off: "upOpen" as const};

        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        utils.validateValue(value, Object.keys(lookup));

        let position = 50;
        if (value === "open") {
            position = 100;
        } else if (value === "close") {
            position = 0;
        }
        await entity.command("closuresWindowCovering", utils.getFromLookup(value, lookup), {}, utils.getOptions(meta.mapped, entity));
        return {state: {position}};
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const bticino_4027C_cover_position: Tz.Converter = {
    key: ["position"],
    options: [exposes.options.invert_cover(), exposes.options.no_position_support()],
    convertSet: async (entity, key, value, meta) => {
        const invert = !(utils.getMetaValue(entity, meta.mapped, "coverInverted", "allEqual", false)
            ? !meta.options.invert_cover
            : meta.options.invert_cover);
        utils.assertNumber(value, key);
        let newPosition = value;
        if (meta.options.no_position_support) {
            newPosition = value >= 50 ? 100 : 0;
        }
        const position = newPosition;
        if (invert) {
            newPosition = 100 - newPosition;
        }
        await entity.command(
            "closuresWindowCovering",
            "goToLiftPercentage",
            {percentageliftvalue: newPosition},
            utils.getOptions(meta.mapped, entity),
        );
        return {state: {position: position}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresWindowCovering", ["currentPositionLiftPercentage"]);
    },
};
export const legrand_device_mode: Tz.Converter = {
    key: ["device_mode"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        // enable the dimmer, requires a recent firmware on the device
        const lookup = {
            // dimmer
            dimmer_on: 0x0101,
            dimmer_off: 0x0100,
            // contactor
            switch: 0x0003,
            auto: 0x0004,
            // pilot wire
            pilot_on: 0x0002,
            pilot_off: 0x0001,
        };

        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        utils.validateValue(value, Object.keys(lookup));
        const payload = {0: {value: utils.getFromLookup(value, lookup), type: 9}};
        await entity.write("manuSpecificLegrandDevices", payload, manufacturerOptions.legrand);
        return {state: {device_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("manuSpecificLegrandDevices", [0x0000, 0x0001, 0x0002], manufacturerOptions.legrand);
    },
};
export const legrand_pilot_wire_mode: Tz.Converter = {
    key: ["pilot_wire_mode"],
    convertSet: async (entity, key, value, meta) => {
        const mode = {
            comfort: 0x00,
            "comfort_-1": 0x01,
            "comfort_-2": 0x02,
            eco: 0x03,
            frost_protection: 0x04,
            off: 0x05,
        };
        const payload = {data: Buffer.from([utils.getFromLookup(value, mode)])};
        await entity.command("manuSpecificLegrandDevices2", "command0", payload);
        return {state: {pilot_wire_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("manuSpecificLegrandDevices2", [0x0000], manufacturerOptions.legrand);
    },
};
export const legrand_power_alarm: Tz.Converter = {
    key: ["power_alarm"],
    convertSet: async (entity, key, value, meta) => {
        const enableAlarm = !(value === "DISABLE" || value === false);
        const payloadBolean = {61441: {value: enableAlarm ? 0x01 : 0x00, type: 0x10}};
        const payloadValue = {61442: {value: value, type: 0x29}};
        await entity.write("haElectricalMeasurement", payloadValue);
        await entity.write("haElectricalMeasurement", payloadBolean);
        // To have consistent information in the system.
        await entity.read("haElectricalMeasurement", [0xf000, 0xf001, 0xf002]);
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("haElectricalMeasurement", [0xf000, 0xf001, 0xf002]);
    },
};
export const diyruz_freepad_on_off_config: Tz.Converter = {
    key: ["switch_type", "switch_actions"],
    convertGet: async (entity, key, meta) => {
        await entity.read("genOnOffSwitchCfg", ["switchType", "switchActions"]);
    },
    convertSet: async (entity, key, value, meta) => {
        const switchTypesLookup = {
            toggle: 0x00,
            momentary: 0x01,
            multifunction: 0x02,
        };
        const switchActionsLookup = {
            on: 0x00,
            off: 0x01,
            toggle: 0x02,
        };
        const intVal = Number(value);
        const switchType = utils.getFromLookup(value, switchTypesLookup, intVal);
        const switchActions = utils.getFromLookup(value, switchActionsLookup, intVal);

        const payloads: KeyValueAny = {
            switch_type: {switchType},
            switch_actions: {switchActions},
        };
        await entity.write("genOnOffSwitchCfg", payloads[key]);

        return {state: {[`${key}`]: value}};
    },
};
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
            throw Error("The time_in_seconds value must be convertible to an integer in the range: <0x0000, 0xFFFE>");
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
export const diyruz_geiger_config: Tz.Converter = {
    key: ["sensitivity", "led_feedback", "buzzer_feedback", "sensors_count", "sensors_type", "alert_threshold"],
    convertSet: async (entity, key, rawValue, meta) => {
        const lookup = {
            OFF: 0x00,
            ON: 0x01,
        };
        const sensorsTypeLookup = {
            "СБМ-20/СТС-5/BOI-33": "0",
            "СБМ-19/СТС-6": "1",
            Others: "2",
        };

        let value = utils.getFromLookup(rawValue, lookup, Number(rawValue));

        if (key === "sensors_type") {
            // @ts-expect-error ignore
            value = utils.getFromLookup(rawValue, sensorsTypeLookup, Number(rawValue));
        }

        const payloads: KeyValueAny = {
            sensitivity: {61440: {value, type: 0x21}},
            led_feedback: {61441: {value, type: 0x10}},
            buzzer_feedback: {61442: {value, type: 0x10}},
            sensors_count: {61443: {value, type: 0x20}},
            sensors_type: {61444: {value, type: 0x30}},
            alert_threshold: {61445: {value, type: 0x23}},
        };

        await entity.write("msIlluminanceLevelSensing", payloads[key]);
        return {
            state: {[key]: rawValue},
        };
    },
    convertGet: async (entity, key, meta) => {
        const payloads: KeyValueAny = {
            sensitivity: ["msIlluminanceLevelSensing", 0xf000],
            led_feedback: ["msIlluminanceLevelSensing", 0xf001],
            buzzer_feedback: ["msIlluminanceLevelSensing", 0xf002],
            sensors_count: ["msIlluminanceLevelSensing", 0xf003],
            sensors_type: ["msIlluminanceLevelSensing", 0xf004],
            alert_threshold: ["msIlluminanceLevelSensing", 0xf005],
        };
        await entity.read(payloads[key][0], [payloads[key][1]]);
    },
};
export const diyruz_airsense_config: Tz.Converter = {
    key: ["led_feedback", "enable_abc", "threshold1", "threshold2", "temperature_offset", "pressure_offset", "humidity_offset"],
    convertSet: async (entity, key, rawValue, meta) => {
        const lookup = {OFF: 0x00, ON: 0x01};
        const value = utils.getFromLookup(rawValue, lookup, Number(rawValue));
        const payloads: KeyValueAny = {
            led_feedback: ["msCO2", {515: {value, type: 0x10}}],
            enable_abc: ["msCO2", {514: {value, type: 0x10}}],
            threshold1: ["msCO2", {516: {value, type: 0x21}}],
            threshold2: ["msCO2", {517: {value, type: 0x21}}],
            temperature_offset: ["msTemperatureMeasurement", {528: {value, type: 0x29}}],
            pressure_offset: ["msPressureMeasurement", {528: {value, type: 0x2b}}],
            humidity_offset: ["msRelativeHumidity", {528: {value, type: 0x29}}],
        };
        await entity.write(payloads[key][0], payloads[key][1]);
        return {
            state: {[key]: rawValue},
        };
    },
    convertGet: async (entity, key, meta) => {
        const payloads: KeyValueAny = {
            led_feedback: ["msCO2", 0x0203],
            enable_abc: ["msCO2", 0x0202],
            threshold1: ["msCO2", 0x0204],
            threshold2: ["msCO2", 0x0205],
            temperature_offset: ["msTemperatureMeasurement", 0x0210],
            pressure_offset: ["msPressureMeasurement", 0x0210],
            humidity_offset: ["msRelativeHumidity", 0x0210],
        };
        await entity.read(payloads[key][0], [payloads[key][1]]);
    },
};
export const diyruz_zintercom_config: Tz.Converter = {
    key: ["mode", "sound", "time_ring", "time_talk", "time_open", "time_bell", "time_report"],
    convertSet: async (entity, key, rawValue, meta) => {
        const lookup: KeyValueAny = {OFF: 0x00, ON: 0x01};
        const modeOpenLookup = {never: "0", once: "1", always: "2", drop: "3"};
        let value = utils.getFromLookup(rawValue, lookup, Number(rawValue));
        if (key === "mode") {
            // @ts-expect-error ignore
            value = utils.getFromLookup(rawValue, modeOpenLookup, Number(rawValue));
        }
        const payloads: KeyValueAny = {
            mode: {81: {value, type: 0x30}},
            sound: {82: {value, type: 0x10}},
            time_ring: {83: {value, type: 0x20}},
            time_talk: {84: {value, type: 0x20}},
            time_open: {85: {value, type: 0x20}},
            time_bell: {87: {value, type: 0x20}},
            time_report: {86: {value, type: 0x20}},
        };
        await entity.write("closuresDoorLock", payloads[key]);
        return {
            state: {[key]: rawValue},
        };
    },
    convertGet: async (entity, key, meta) => {
        const payloads = {
            mode: 0x0051,
            sound: 0x0052,
            time_ring: 0x0053,
            time_talk: 0x0054,
            time_open: 0x0055,
            time_bell: 0x0057,
            time_report: 0x0056,
        };
        const v = utils.getFromLookup(key, payloads);
        await entity.read("closuresDoorLock", [v]);
    },
};
export const power_source: Tz.Converter = {
    key: ["power_source", "charging"],
    convertGet: async (entity, key, meta) => {
        await entity.read("genBasic", ["powerSource"]);
    },
};
export const ts0201_temperature_humidity_alarm: Tz.Converter = {
    key: ["alarm_humidity_max", "alarm_humidity_min", "alarm_temperature_max", "alarm_temperature_min"],
    convertSet: async (entity, key, value, meta) => {
        switch (key) {
            case "alarm_temperature_max":
            case "alarm_temperature_min":
            case "alarm_humidity_max":
            case "alarm_humidity_min": {
                // await entity.write('manuSpecificTuya2', {[key]: value});
                // instead write as custom attribute to override incorrect herdsman dataType from uint16 to int16
                // https://github.com/Koenkk/zigbee-herdsman/blob/v0.13.191/src/zcl/definition/cluster.ts#L4235
                const keyToAttributeLookup = {
                    alarm_temperature_max: 0xd00a,
                    alarm_temperature_min: 0xd00b,
                    alarm_humidity_max: 0xd00d,
                    alarm_humidity_min: 0xd00e,
                };
                const payload = {[keyToAttributeLookup[key]]: {value: value, type: Zcl.DataType.INT16}};
                await entity.write("manuSpecificTuya2", payload);
                break;
            }
            default: // Unknown key
                logger.warning(`Unhandled key ${key}`, NS);
        }
    },
};
export const heiman_ir_remote: Tz.Converter = {
    key: ["send_key", "create", "learn", "delete", "get_list"],
    convertSet: async (entity, key, value, meta) => {
        const options = {
            // Don't send a manufacturerCode (otherwise set in herdsman):
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/2827
            // @ts-expect-error ignore
            manufacturerCode: null,
            ...utils.getOptions(meta.mapped, entity),
        };
        switch (key) {
            case "send_key":
                utils.assertObject(value);
                await entity.command("heimanSpecificInfraRedRemote", "sendKey", {id: value.id, keyCode: value.key_code}, options);
                break;
            case "create":
                utils.assertObject(value);
                await entity.command("heimanSpecificInfraRedRemote", "createId", {modelType: value.model_type}, options);
                break;
            case "learn":
                utils.assertObject(value);
                await entity.command("heimanSpecificInfraRedRemote", "studyKey", {id: value.id, keyCode: value.key_code}, options);
                break;
            case "delete":
                utils.assertObject(value);
                await entity.command("heimanSpecificInfraRedRemote", "deleteKey", {id: value.id, keyCode: value.key_code}, options);
                break;
            case "get_list":
                await entity.command("heimanSpecificInfraRedRemote", "getIdAndKeyCodeList", {}, options);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key ${key}`);
        }
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
        await entity.command("genScenes", "recall", {groupid, sceneid}, utils.getOptions(meta.mapped, entity));

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
                    if (utils.getMetaValue(entity, meta.mapped, "supportsEnhancedHue", "allEqual", true)) {
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
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const TS0003_curtain_switch: Tz.Converter = {
    key: ["state"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        utils.assertEndpoint(entity);
        const lookup = {close: 1, stop: 2, open: 1};
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        utils.validateValue(value, Object.keys(lookup));
        const endpointID = utils.getFromLookup(value, lookup);
        const endpoint = entity.getDevice().getEndpoint(endpointID);
        await endpoint.command("genOnOff", "on", {}, utils.getOptions(meta.mapped, entity));
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genOnOff", ["onOff"]);
    },
};
export const ts0216_duration: Tz.Converter = {
    key: ["duration"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write("ssIasWd", {maxDuration: value as number});
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("ssIasWd", ["maxDuration"]);
    },
};
export const ts0216_volume: Tz.Converter = {
    key: ["volume"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);

        if (["_TYZB01_sbpc1zrb"].includes(meta.device.manufacturerName)) {
            const volume = value === 0 ? 0 : utils.mapNumberRange(value, 1, 100, 100, 33);
            await entity.write("ssIasWd", {2: {value: volume, type: 0x20}});
            return;
        }

        await entity.write("ssIasWd", {2: {value: utils.mapNumberRange(value, 0, 100, 100, 10), type: 0x20}});
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("ssIasWd", [0x0002]);
    },
};
export const ts0216_alarm: Tz.Converter = {
    key: ["alarm"],
    convertSet: async (entity, key, value, meta) => {
        const info = value ? (2 << 4) + (1 << 2) + 0 : 0;

        await entity.command(
            "ssIasWd",
            "startWarning",
            {startwarninginfo: info, warningduration: 0, strobedutycycle: 0, strobelevel: 3},
            utils.getOptions(meta.mapped, entity),
        );
    },
};
export const tuya_cover_calibration: Tz.Converter = {
    key: ["calibration", "calibration_to_open", "calibration_to_close", "calibration_time", "calibration_time_to_open", "calibration_time_to_close"],
    convertSet: async (entity, key, value, meta) => {
        if (key.startsWith("calibration_time")) {
            utils.assertNumber(value, key);
            const calibration_time = value * 10;
            if (key === "calibration_time" || key === "calibration_time_to_open") {
                await entity.write("closuresWindowCovering", {moesCalibrationTime: calibration_time});
            } else if (key === "calibration_time_to_close") {
                await meta.device.getEndpoint(2).write("closuresWindowCovering", {moesCalibrationTime: calibration_time});
            }
            return {state: {[key]: value}};
        }

        utils.assertString(value, key);
        const lookup = {ON: 0, OFF: 1};
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toUpperCase();
        const calibration = utils.getFromLookup(value, lookup);
        if (key === "calibration" || key === "calibration_to_open") {
            await entity.write("closuresWindowCovering", {tuyaCalibration: calibration});
        } else if (key === "calibration_to_close") {
            await meta.device.getEndpoint(2).write("closuresWindowCovering", {tuyaCalibration: calibration});
        }
        return {state: {[key]: value}};
    },
    convertGet: async (entity, key, meta) => {
        if (key === "calibration" || key === "calibration_to_open") {
            await entity.read("closuresWindowCovering", ["tuyaCalibration"]);
        } else if (key === "calibration_to_close") {
            await meta.device.getEndpoint(2).read("closuresWindowCovering", ["tuyaCalibration"]);
        } else if (key === "calibration_time" || key === "calibration_time_to_open") {
            await entity.read("closuresWindowCovering", ["moesCalibrationTime"]);
        } else if (key === "calibration_time_to_close") {
            await meta.device.getEndpoint(2).read("closuresWindowCovering", ["moesCalibrationTime"]);
        }
    },
};
export const tuya_cover_reversal: Tz.Converter = {
    key: ["motor_reversal"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        const lookup = {ON: 1, OFF: 0};
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toUpperCase();
        const reversal = utils.getFromLookup(value, lookup);
        await entity.write("closuresWindowCovering", {tuyaMotorReversal: reversal});
        return {state: {motor_reversal: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresWindowCovering", ["tuyaMotorReversal"]);
    },
};
export const moes_cover_calibration: Tz.Converter = {
    key: ["calibration_time"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);
        const calibration = value * 10;
        await entity.write("closuresWindowCovering", {moesCalibrationTime: calibration});
        return {state: {calibration_time: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresWindowCovering", ["moesCalibrationTime"]);
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const ZM35HQ_attr: Tz.Converter = {
    key: ["sensitivity", "keep_time"],
    convertSet: async (entity, key, value, meta) => {
        switch (key) {
            case "sensitivity":
                await entity.write("ssIasZone", {currentZoneSensitivityLevel: utils.getFromLookup(value, {low: 0, medium: 1, high: 2})});
                break;
            case "keep_time":
                await entity.write("ssIasZone", {61441: {value: utils.getFromLookup(value, {30: 0, 60: 1, 120: 2}), type: 0x20}});
                break;
            default: // Unknown key
                throw new Error(`Unhandled key ${key}`);
        }
    },
    convertGet: async (entity, key, meta) => {
        // Apparently, reading values may interfere with a commandStatusChangeNotification for changed occupancy.
        // Therefore, read "zoneStatus" as well.
        await entity.read("ssIasZone", ["currentZoneSensitivityLevel", 61441, "zoneStatus"]);
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const TS0210_sensitivity: Tz.Converter = {
    key: ["sensitivity"],
    convertSet: async (entity, key, value, meta) => {
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = utils.toNumber(value, "sensitivity");
        await entity.write("ssIasZone", {currentZoneSensitivityLevel: value as number});
        return {state: {sensitivity: value}};
    },
};
export const viessmann_window_open: Tz.Converter = {
    key: ["window_open"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["viessmannWindowOpenInternal"], manufacturerOptions.viessmann);
    },
};
export const viessmann_window_open_force: Tz.Converter = {
    key: ["window_open_force"],
    convertSet: async (entity, key, value, meta) => {
        if (typeof value === "boolean") {
            await entity.write("hvacThermostat", {viessmannWindowOpenForce: value ? 1 : 0}, manufacturerOptions.viessmann);
            return {state: {window_open_force: value}};
        }
        logger.error("window_open_force must be a boolean!", NS);
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["viessmannWindowOpenForce"], manufacturerOptions.viessmann);
    },
};
export const viessmann_assembly_mode: Tz.Converter = {
    key: ["assembly_mode"],
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", ["viessmannAssemblyMode"], manufacturerOptions.viessmann);
    },
};
export const dawondns_only_off: Tz.Converter = {
    key: ["state"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        const lowerValue = value.toLowerCase();
        utils.validateValue(lowerValue, ["off"]);
        await entity.command("genOnOff", lowerValue as "off", {}, utils.getOptions(meta.mapped, entity));
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("genOnOff", ["onOff"]);
    },
};
export const idlock_master_pin_mode: Tz.Converter = {
    key: ["master_pin_mode"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write(
            "closuresDoorLock",
            {16384: {value: value === true ? 1 : 0, type: 0x10}},
            {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
        );
        return {state: {master_pin_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresDoorLock", [0x4000], {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS});
    },
};
export const idlock_rfid_enable: Tz.Converter = {
    key: ["rfid_enable"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write(
            "closuresDoorLock",
            {16385: {value: value === true ? 1 : 0, type: 0x10}},
            {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
        );
        return {state: {rfid_enable: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresDoorLock", [0x4001], {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS});
    },
};
export const idlock_service_mode: Tz.Converter = {
    key: ["service_mode"],
    convertSet: async (entity, key, value, meta) => {
        const lookup = {deactivated: 0, random_pin_1x_use: 5, random_pin_24_hours: 6};
        await entity.write(
            "closuresDoorLock",
            {16387: {value: utils.getFromLookup(value, lookup), type: 0x20}},
            {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
        );
        return {state: {service_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresDoorLock", [0x4003], {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS});
    },
};
export const idlock_lock_mode: Tz.Converter = {
    key: ["lock_mode"],
    convertSet: async (entity, key, value, meta) => {
        const lookup = {auto_off_away_off: 0, auto_on_away_off: 1, auto_off_away_on: 2, auto_on_away_on: 3};
        await entity.write(
            "closuresDoorLock",
            {16388: {value: utils.getFromLookup(value, lookup), type: 0x20}},
            {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
        );
        return {state: {lock_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresDoorLock", [0x4004], {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS});
    },
};
export const idlock_relock_enabled: Tz.Converter = {
    key: ["relock_enabled"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write(
            "closuresDoorLock",
            {16389: {value: value === true ? 1 : 0, type: 0x10}},
            {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
        );
        return {state: {relock_enabled: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("closuresDoorLock", [0x4005], {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS});
    },
};
export const schneider_pilot_mode: Tz.Converter = {
    key: ["schneider_pilot_mode"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        const lookup = {contactor: 1, pilot: 3};
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        const mode = utils.getFromLookup(value, lookup);
        await entity.write("schneiderSpecificPilotMode", {pilotMode: mode}, {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC});
        return {state: {schneider_pilot_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("schneiderSpecificPilotMode", ["pilotMode"], {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC});
    },
};
export const schneider_dimmer_mode: Tz.Converter = {
    key: ["dimmer_mode"],
    convertSet: async (entity, key, value, meta) => {
        const lookup = {RC: 1, RL: 2};
        const mode = utils.getFromLookup(value, lookup);
        await entity.write("lightingBallastCfg", {57344: {value: mode, type: 0x30}}, {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC});
        return {state: {dimmer_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingBallastCfg", [0xe000], {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC});
    },
};
export const wiser_dimmer_mode: Tz.Converter = {
    key: ["dimmer_mode"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write(
            "lightingBallastCfg",
            {wiserControlMode: utils.getKey(constants.wiserDimmerControlMode, value, value as number, Number)},
            {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
        );
        return {state: {dimmer_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("lightingBallastCfg", ["wiserControlMode"], {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC});
    },
};
export const schneider_temperature_measured_value: Tz.Converter = {
    key: ["temperature_measured_value"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);
        utils.assertEndpoint(entity);
        await entity.report("msTemperatureMeasurement", {measuredValue: Math.round(value * 100)});
    },
};
export const schneider_thermostat_system_mode: Tz.Converter = {
    key: ["system_mode"],
    convertSet: (entity, key, value, meta) => {
        utils.assertEndpoint(entity);
        const systemMode = utils.getKey(constants.thermostatSystemModes, value, undefined, Number);
        entity.saveClusterAttributeKeyValue("hvacThermostat", {systemMode: systemMode});
        return {state: {system_mode: value}};
    },
};
export const schneider_thermostat_occupied_heating_setpoint: Tz.Converter = {
    key: ["occupied_heating_setpoint"],
    convertSet: (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        utils.assertEndpoint(entity);
        const occupiedHeatingSetpoint = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        entity.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: occupiedHeatingSetpoint});
        return {state: {occupied_heating_setpoint: value}};
    },
};
export const schneider_thermostat_control_sequence_of_operation: Tz.Converter = {
    key: ["control_sequence_of_operation"],
    convertSet: (entity, key, value, meta) => {
        utils.assertEndpoint(entity);
        const val = utils.getKey(constants.thermostatControlSequenceOfOperations, value, value, Number);
        entity.saveClusterAttributeKeyValue("hvacThermostat", {ctrlSeqeOfOper: val});
        return {state: {control_sequence_of_operation: value}};
    },
};
export const schneider_thermostat_pi_heating_demand: Tz.Converter = {
    key: ["pi_heating_demand"],
    convertSet: (entity, key, value, meta) => {
        utils.assertEndpoint(entity);
        entity.saveClusterAttributeKeyValue("hvacThermostat", {pIHeatingDemand: value});
        return {state: {pi_heating_demand: value}};
    },
};
export const schneider_thermostat_keypad_lockout: Tz.Converter = {
    key: ["keypad_lockout"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertEndpoint(entity);
        const keypadLockout = utils.getKey(constants.keypadLockoutMode, value, value as number, Number);
        await entity.write("hvacUserInterfaceCfg", {keypadLockout});
        entity.saveClusterAttributeKeyValue("hvacUserInterfaceCfg", {keypadLockout});
        return {state: {keypad_lockout: value}};
    },
};
export const wiser_fip_setting: Tz.Converter = {
    key: ["fip_setting"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        const zoneLookup = {manual: 1, schedule: 2, energy_saver: 3, holiday: 6};
        const zonemodeNum = utils.getFromLookup(meta.state.zone_mode, zoneLookup);

        const fipLookup = {comfort: 0, "comfort_-1": 1, "comfort_-2": 2, energy_saving: 3, frost_protection: 4, off: 5};
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        utils.validateValue(value, Object.keys(fipLookup));
        const fipmodeNum = utils.getFromLookup(value, fipLookup);

        const payload = {
            zonemode: zonemodeNum,
            fipmode: fipmodeNum,
            reserved: 0xff,
        };
        await entity.command("hvacThermostat", "wiserSmartSetFipMode", payload, {srcEndpoint: 11, disableDefaultResponse: true});

        return {state: {fip_setting: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0xe020]);
    },
};
export const wiser_hact_config: Tz.Converter = {
    key: ["hact_config"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertString(value, key);
        const lookup = {unconfigured: 0x00, setpoint_switch: 0x80, setpoint_fip: 0x82, fip_fip: 0x83};
        // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
        value = value.toLowerCase();
        const mode = utils.getFromLookup(value, lookup);
        await entity.write("hvacThermostat", {57361: {value: mode, type: 0x18}});
        return {state: {hact_config: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0xe011]);
    },
};
export const wiser_zone_mode: Tz.Converter = {
    key: ["zone_mode"],
    convertSet: async (entity, key, value, meta) => {
        const lookup = {manual: 1, schedule: 2, energy_saver: 3, holiday: 6};
        const zonemodeNum = utils.getFromLookup(value, lookup);
        await entity.write("hvacThermostat", {57360: {value: zonemodeNum, type: 0x30}});
        return {state: {zone_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("hvacThermostat", [0xe010]);
    },
};
export const wiser_vact_calibrate_valve: Tz.Converter = {
    key: ["calibrate_valve"],
    convertSet: async (entity, key, value, meta) => {
        await entity.command("hvacThermostat", "wiserSmartCalibrateValve", {}, {srcEndpoint: 11, disableDefaultResponse: true});
        return {state: {calibrate_valve: value}};
    },
};
export const wiser_sed_zone_mode: Tz.Converter = {
    key: ["zone_mode"],
    convertSet: (entity, key, value, meta) => {
        return {state: {zone_mode: value}};
    },
};
export const wiser_sed_occupied_heating_setpoint: Tz.Converter = {
    key: ["occupied_heating_setpoint"],
    convertSet: (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        utils.assertEndpoint(entity);
        const occupiedHeatingSetpoint = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        entity.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint});
        return {state: {occupied_heating_setpoint: value}};
    },
};
export const wiser_sed_thermostat_local_temperature_calibration: Tz.Converter = {
    key: ["local_temperature_calibration"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);
        await entity.write("hvacThermostat", {localTemperatureCalibration: Math.round(value * 10)}, {srcEndpoint: 11, disableDefaultResponse: true});
        return {state: {local_temperature_calibration: value}};
    },
};
export const wiser_sed_thermostat_keypad_lockout: Tz.Converter = {
    key: ["keypad_lockout"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write(
            "hvacUserInterfaceCfg",
            {keypadLockout: utils.getKey(constants.keypadLockoutMode, value, value as number, Number)},
            {srcEndpoint: 11, disableDefaultResponse: true},
        );
        return {state: {keypad_lockout: value}};
    },
};
export const sihas_set_people: Tz.Converter = {
    key: ["people"],
    convertSet: async (entity, key, value, meta) => {
        const endpoint = meta.device.endpoints.find((e) => e.supportsInputCluster("genAnalogInput"));
        await endpoint.write("genAnalogInput", {presentValue: value as number});
    },
    convertGet: async (entity, key, meta) => {
        const endpoint = meta.device.endpoints.find((e) => e.supportsInputCluster("genAnalogInput"));
        await endpoint.read("genAnalogInput", ["presentValue"]);
    },
};
export const tuya_operation_mode: Tz.Converter = {
    key: ["operation_mode"],
    convertSet: async (entity, key, value, meta) => {
        // modes:
        // 0 - 'command' mode. keys send commands. useful for group control
        // 1 - 'event' mode. keys send events. useful for handling
        utils.assertString(value, key);
        const endpoint = meta.device.getEndpoint(1);
        await endpoint.write("genOnOff", {tuyaOperationMode: utils.getFromLookup(value, {command: 0, event: 1})});
        return {state: {operation_mode: value.toLowerCase()}};
    },
    convertGet: async (entity, key, meta) => {
        const endpoint = meta.device.getEndpoint(1);
        await endpoint.read("genOnOff", ["tuyaOperationMode"]);
    },
};
export const led_on_motion: Tz.Converter = {
    key: ["led_on_motion"],
    convertSet: async (entity, key, value, meta) => {
        await entity.write(
            "ssIasZone",
            {16384: {value: value === true ? 1 : 0, type: 0x10}},
            {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS},
        );
        return {state: {led_on_motion: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("ssIasZone", [0x4000], {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS});
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

export const light_onoff_restorable_brightness: Tz.Converter = {
    /**
     * Some devices reset brightness to 100% when turned on, even if previous brightness was different
     * This uses the stored state of the device to restore to the previous brightness level when turning on
     */
    key: ["state", "brightness", "brightness_percent"],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        const deviceState = meta.state || {};
        const message = meta.message;
        const state = utils.isString(message.state) ? message.state.toLowerCase() : null;
        const hasBrightness = message.brightness != null || message.brightness_percent != null;

        // Add brightness if command is 'on' and we can restore previous value
        if (state === "on" && !hasBrightness && utils.isNumber(deviceState.brightness) && deviceState.brightness > 0) {
            message.brightness = deviceState.brightness;
        }

        return await light_onoff_brightness.convertSet(entity, key, value, meta);
    },
    convertGet: async (entity, key, meta) => {
        return await light_onoff_brightness.convertGet(entity, key, meta);
    },
};
export const ptvo_switch_light_brightness: Tz.Converter = {
    key: ["brightness", "brightness_percent", "transition"],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        if (key === "transition") {
            return;
        }
        const cluster = "genLevelCtrl";
        utils.assertEndpoint(entity);
        if (entity.supportsInputCluster(cluster) || entity.supportsOutputCluster(cluster)) {
            const message = meta.message;

            let brightness: number;
            if (message.brightness != null) {
                brightness = Number(message.brightness);
            } else if (message.brightness_percent != null) brightness = Math.round(Number(message.brightness_percent) * 2.55);

            if (brightness !== undefined && brightness === 0) {
                message.state = "off";
                message.brightness = 1;
            }
            return await light_onoff_brightness.convertSet(entity, key, value, meta);
        }
        throw new Error("LevelControl not supported on this endpoint.");
    },
    convertGet: async (entity, key, meta) => {
        const cluster = "genLevelCtrl";
        utils.assertEndpoint(entity);
        if (entity.supportsInputCluster(cluster) || entity.supportsOutputCluster(cluster)) {
            return await light_onoff_brightness.convertGet(entity, key, meta);
        }
        throw new Error("LevelControl not supported on this endpoint.");
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const TS110E_options: Tz.Converter = {
    key: ["min_brightness", "max_brightness", "light_type", "switch_type"],
    convertSet: async (entity, key, value, meta) => {
        let payload = null;
        if (key === "min_brightness" || key === "max_brightness") {
            const id = key === "min_brightness" ? 64515 : 64516;
            payload = {[id]: {value: utils.mapNumberRange(utils.toNumber(value, key), 1, 255, 0, 1000), type: 0x21}};
        } else if (key === "light_type" || key === "switch_type") {
            utils.assertString(value, "light_type/switch_type");
            const lookup: KeyValue = key === "light_type" ? {led: 0, incandescent: 1, halogen: 2} : {momentary: 0, toggle: 1, state: 2};
            payload = {64514: {value: lookup[value], type: 0x20}};
        }
        await entity.write("genLevelCtrl", payload, utils.getOptions(meta.mapped, entity));
        return {state: {[key]: value}};
    },
    convertGet: async (entity, key, meta) => {
        let id = null;
        if (key === "min_brightness") id = 64515;
        if (key === "max_brightness") id = 64516;
        if (key === "light_type" || key === "switch_type") id = 64514;
        await entity.read("genLevelCtrl", [id]);
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const TS110E_onoff_brightness: Tz.Converter = {
    key: ["state", "brightness"],
    convertSet: async (entity, key, value, meta) => {
        const {message, state} = meta;
        if (message.state === "OFF" || (message.state != null && message.brightness == null)) {
            return await on_off.convertSet(entity, key, value, meta);
        }
        if (message.brightness != null) {
            // set brightness
            if (state.state === "OFF") {
                await entity.command("genOnOff", "on", {}, utils.getOptions(meta.mapped, entity));
            }

            const brightness = utils.toNumber(message.brightness, "brightness");
            const level = utils.mapNumberRange(brightness, 0, 254, 0, 1000);
            await entity.command("genLevelCtrl", "moveToLevelTuya", {level, transtime: 100}, utils.getOptions(meta.mapped, entity));
            return {state: {state: "ON", brightness}};
        }
    },
    convertGet: async (entity, key, meta) => {
        if (key === "state") await on_off.convertGet(entity, key, meta);
        if (key === "brightness") await entity.read("genLevelCtrl", [61440]);
    },
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const TS110E_light_onoff_brightness: Tz.Converter = {
    ...light_onoff_brightness,
    convertSet: async (entity, key, value, meta) => {
        const {message} = meta;
        if (message.state === "ON" || (typeof message.brightness === "number" && message.brightness > 1)) {
            // Does not turn off with physical press when turned on with just moveToLevelWithOnOff, required on before.
            // https://github.com/Koenkk/zigbee2mqtt/issues/15902#issuecomment-1382848150
            await entity.command("genOnOff", "on", {}, utils.getOptions(meta.mapped, entity));
        }
        return await light_onoff_brightness.convertSet(entity, key, value, meta);
    },
};
