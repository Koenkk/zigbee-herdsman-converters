import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Tz} from "../lib/types";

const ysrLightOnOffBrightness: Tz.Converter = {
    key: ["state", "brightness", "brightness_percent", "transition"],
    convertSet: async (entity, key, value, meta) => {
        const msg = meta.message;
        if (!msg) return;
        if (msg._ysrHandled) return;
        msg._ysrHandled = true;

        if (msg.state === "OFF") {
            await entity.command("genOnOff", "off", {});
            return {state: {state: "OFF"}};
        }

        if (msg.state === "ON") {
            const transition = (msg.transition as number) || 2;
            const level = msg.brightness != null ? (msg.brightness as number) : 255;
            await entity.command("genOnOff", "on", {});
            await entity.command("genLevelCtrl", "moveToLevel", {
                level,
                transtime: Math.round(transition * 10),
                optionsMask: 0,
                optionsOverride: 0,
            });
            return {state: {state: "ON", brightness: level}};
        }

        if (typeof msg.brightness === "number" && msg.state !== "OFF") {
            const transition = (msg.transition as number) || 2;
            await entity.command("genLevelCtrl", "moveToLevel", {
                level: msg.brightness,
                transtime: Math.round(transition * 10),
                optionsMask: 0,
                optionsOverride: 0,
            });
            return {state: {state: "ON", brightness: msg.brightness}};
        }
    },
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
        toZigbee: [ysrLightOnOffBrightness],
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
        toZigbee: [ysrLightOnOffBrightness],
        extend: [tuya.modernExtend.tuyaLight({configureReporting: true})],
    },
];
