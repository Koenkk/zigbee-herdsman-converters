import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {Definition, DefinitionExposesFunction, DefinitionWithExtend, Fz, Zh} from "../lib/types";

const e = exposes.presets;

// Create converters that extract action properties to numeric sensors
const actionPropertyConverters = {
    hue_saturation: {
        cluster: "lightingColorCtrl",
        type: "commandMoveToHueAndSaturation",
        convert: (model, msg, publish, options, meta) => {
            if (!options?.expose_values) return undefined;
            return {
                hue: msg.data?.hue,
                saturation: msg.data?.saturation,
            };
        },
    } as Fz.Converter<"lightingColorCtrl", undefined, "commandMoveToHueAndSaturation">,

    color_temp: {
        cluster: "lightingColorCtrl",
        type: "commandMoveToColorTemp",
        convert: (model, msg, publish, options, meta) => {
            if (!options?.expose_values) return undefined;
            return {
                color_temperature: msg.data?.colortemp,
            };
        },
    } as Fz.Converter<"lightingColorCtrl", undefined, "commandMoveToColorTemp">,

    level: {
        cluster: "genLevelCtrl",
        type: ["commandMoveToLevel", "commandMoveToLevelWithOnOff"],
        convert: (model, msg, publish, options, meta) => {
            if (!options?.expose_values) return undefined;
            return {
                level: msg.data?.level,
            };
        },
    } as Fz.Converter<"genLevelCtrl", undefined, ["commandMoveToLevel", "commandMoveToLevelWithOnOff"]>,
};

// ModernExtend function for FUT089Z remote control (basic functionality)
function miboxerFut089zControls() {
    // biome-ignore lint/suspicious/noExplicitAny: Fz.ConverterTypeStringOrArray is not exported
    const fromZigbee: Fz.Converter<string, undefined, any>[] = [
        fz.battery,
        fz.command_on,
        fz.command_off,
        fz.command_move_to_level,
        fz.command_move_to_color_temp,
        fz.command_move_to_hue_and_saturation,
        fz.tuya_switch_scene,
        // Add converters for numeric sensors (always included, but they check options internally)
        actionPropertyConverters.hue_saturation,
        actionPropertyConverters.color_temp,
        actionPropertyConverters.level,
    ];

    // Device exposes (battery info and action)
    const exposesList = [e.battery(), e.battery_voltage()];

    // Device options for numeric sensors
    const deviceOptions = [
        new exposes.Binary("expose_values", exposes.access.SET, true, false).withDescription(
            "Expose additional numeric values for action properties (hue, saturation, level, etc.)",
        ),
    ];

    return {
        fromZigbee,
        exposes: [
            ...exposesList,
            ((device, options = {}) => {
                const dynamicExposes = [];

                // Add action expose
                dynamicExposes.push(
                    e.action(["on", "off", "brightness_move_to_level", "color_temperature_move", "move_to_hue_and_saturation", "tuya_switch_scene"]),
                );

                // Add numeric sensors if enabled in options
                if (options.expose_values === true) {
                    dynamicExposes.push(
                        exposes
                            .numeric("hue", exposes.access.STATE_GET)
                            .withDescription("Hue value from last action")
                            .withValueMin(0)
                            .withValueMax(254),
                        exposes
                            .numeric("saturation", exposes.access.STATE_GET)
                            .withDescription("Saturation value from last action")
                            .withValueMin(0)
                            .withValueMax(254),
                        exposes
                            .numeric("color_temperature", exposes.access.STATE_GET)
                            .withDescription("Color temperature value from last action")
                            .withUnit("mired")
                            .withValueMin(153)
                            .withValueMax(500),
                        exposes
                            .numeric("level", exposes.access.STATE_GET)
                            .withDescription("Level value from last action")
                            .withValueMin(0)
                            .withValueMax(254),
                    );
                }

                return dynamicExposes;
            }) as DefinitionExposesFunction,
        ],
        options: deviceOptions,
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
