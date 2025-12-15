import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

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
        extend: [tuya.modernExtend.tuyaLight({configureReporting: true})],
    },
];
