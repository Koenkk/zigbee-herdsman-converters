import * as tz from "../converters/toZigbee";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const tzLocal = {
    // The firmware mishandles moveToLevelWithOnOff: OFF leaves the light glowing at level 1 and ON ignores the transition.
    // Separate on/off and moveToLevel commands work correctly.
    // https://github.com/Koenkk/zigbee-herdsman-converters/issues/12248
    light_onoff_brightness: {
        key: ["state", "brightness", "brightness_percent"],
        options: tz.light_onoff_brightness.options,
        convertSet: async (entity, key, value, meta) => {
            const {message} = meta;
            const options = utils.getOptions(meta.mapped, entity);
            let brightness: number;
            if (message.brightness != null) {
                brightness = Number(message.brightness);
            } else if (message.brightness_percent != null) {
                brightness = utils.mapNumberRange(Number(message.brightness_percent), 0, 100, 0, 254);
            }
            let state = typeof message.state === "string" ? message.state.toLowerCase() : brightness === 0 ? "off" : "on";
            if (state === "toggle") {
                state = meta.state.state === "ON" ? "off" : "on";
            }
            utils.validateValue(state, ["on", "off"]);
            if (brightness !== undefined) {
                utils.assertNumber(brightness, "brightness");
            }

            if (state === "off") {
                await entity.command("genOnOff", "off", {}, options);
                return {state: {state: "OFF"}};
            }

            if (meta.state.state !== "ON" || brightness === undefined) {
                await entity.command("genOnOff", "on", {}, options);
            }
            if (brightness === undefined) {
                return {state: {state: "ON"}};
            }

            const level = Math.min(Math.max(brightness, 1), 254);
            const transition = utils.getTransition(entity, "brightness", meta);
            await entity.command("genLevelCtrl", "moveToLevel", {level, transtime: transition.time, optionsMask: 0, optionsOverride: 0}, options);
            return {state: {state: "ON", brightness: level}};
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {modelID: "ZB-CL01", manufacturerName: "YSRSAI"},
            {modelID: "TS0503B", manufacturerName: "_TZ3210_f0byevky"},
        ],
        zigbeeModel: ["ZB-CL03", "FB56-ZCW20FB1.2"],
        model: "YSR-MINI-01_rgbcct",
        vendor: "YSRSAI",
        description: "Zigbee LED controller (RGB+CCT)",
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [160, 370]}, color: true})],
    },
    {
        zigbeeModel: ["ZB-CT01"],
        model: "YSR-MINI-01_wwcw",
        vendor: "YSRSAI",
        description: "Zigbee LED controller (WW/CW)",
        toZigbee: [tzLocal.light_onoff_brightness],
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}})],
        configure: (device, coordinatorEndpoint) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue("lightingColorCtrl", {colorCapabilities: 0x10});
        },
    },
    {
        zigbeeModel: ["ZB-DL01"],
        model: "YSR-MINI-01_dimmer",
        vendor: "YSRSAI",
        description: "Zigbee LED controller (Dimmer)",
        toZigbee: [tzLocal.light_onoff_brightness],
        extend: [tuya.modernExtend.tuyaLight({configureReporting: true})],
    },
];
