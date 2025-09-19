import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {Definition, DefinitionWithExtend, Zh} from "../lib/types";

const e = exposes.presets;

// ModernExtend function for FUT089Z remote control (basic functionality)
function miboxerFut089zControls() {
    const fromZigbee = [
        fz.battery,
        fz.command_on,
        fz.command_off,
        fz.command_move_to_level,
        fz.command_move_to_color_temp,
        fz.command_move_to_hue_and_saturation,
        fz.tuya_switch_scene,
    ];

    const exposesList = [
        e.battery(),
        e.battery_voltage(),
        e.action(["on", "off", "brightness_move_to_level", "color_temperature_move", "move_to_hue_and_saturation", "tuya_switch_scene"]),
    ];

    return {
        fromZigbee,
        exposes: exposesList,
        isModernExtend: true as true,
        configure: [
            async (device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, definition: Definition) => {
                const endpoint = device.getEndpoint(1);
                if (!endpoint) {
                    throw new Error("Endpoint 1 not found on device");
                }

                await tuya.configureMagicPacket(device, coordinatorEndpoint);
                await endpoint.command("genGroups", "miboxerSetZones", {
                    zones: [
                        {zoneNum: 1, groupId: 101},
                        {zoneNum: 2, groupId: 102},
                        {zoneNum: 3, groupId: 103},
                        {zoneNum: 4, groupId: 104},
                        {zoneNum: 5, groupId: 105},
                        {zoneNum: 6, groupId: 106},
                        {zoneNum: 7, groupId: 107},
                        {zoneNum: 8, groupId: 108},
                    ],
                });
                await endpoint.command("genBasic", "tuyaSetup", {}, {disableDefaultResponse: true});
            },
        ],
    };
}

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0504B", ["_TZ3210_ttkgurpb"]),
        model: "FUT038Z",
        description: "RGBW LED controller",
        vendor: "MiBoxer",
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: true})],
    },
    {
        fingerprint: tuya.fingerprint("TS1002", ["_TZ3000_xwh1e22x", "_TZ3000_zwszqdpy"]),
        model: "FUT089Z",
        vendor: "MiBoxer",
        description: "RGB+CCT Remote",
        whiteLabel: [tuya.whitelabel("Ledron", "YK-16", "RGB+CCT Remote", ["_TZ3000_zwszqdpy"])],
        extend: [
            miboxerFut089zControls(),
            m.quirkCheckinInterval(21600), // Device observed to report every 4h, set to 6h (21600s) for safety margin
        ],
    },
];
