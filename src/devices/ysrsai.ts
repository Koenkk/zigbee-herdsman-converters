import * as tz from "../converters/toZigbee";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const tzLocal = {
    // moveToLevelWithOnOff is mishandled: off with transition keeps the light dimly lit and on with brightness ignores the transition.
    // Send on/off and moveToLevel separately instead, https://github.com/Koenkk/zigbee-herdsman-converters/issues/12248
    light_onoff_brightness: {
        ...tz.light_onoff_brightness,
        convertSet: async (entity, key, value, meta) => {
            const {brightness, brightness_percent, transition, ...message} = meta.message;
            const {transition: optionsTransition, ...options} = meta.options;
            const level =
                brightness != null
                    ? Number(brightness)
                    : brightness_percent != null
                      ? utils.mapNumberRange(Number(brightness_percent), 0, 100, 0, 255)
                      : undefined;
            const state = message.state === undefined && level !== undefined ? (level === 0 ? "off" : "on") : message.state;
            if (typeof state !== "string") {
                return await tz.light_onoff_brightness.convertSet(entity, key, value, meta);
            }

            const lowerState = state.toLowerCase();
            const target = lowerState === "toggle" ? (meta.state.state === "ON" ? "off" : "on") : lowerState;
            const setLevel = target === "on" && level !== undefined;
            if (!setLevel || meta.state.state !== "ON") {
                const result = await tz.light_onoff_brightness.convertSet(entity, key, value, {
                    ...meta,
                    message: {...message, state: target},
                    options,
                });
                if (!setLevel) {
                    return result;
                }
            }
            const levelResult = (await tz.light_onoff_brightness.convertSet(entity, key, value, {
                ...meta,
                message: {...meta.message, state: null},
            })) as KeyValueAny;
            return {state: {state: "ON", ...levelResult.state}};
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
