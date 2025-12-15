import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {Definition, DefinitionExposesFunction, DefinitionWithExtend, Fz, KeyValue, OnEvent, Zh} from "../lib/types";

const e = exposes.presets;

// Constants
const MAX_ZONES = 8;
const DEFAULT_GROUP_ID_BASE = 100;

// Default zone to group mapping configuration
const defaultZoneGroupMapping: Record<number, number> = {
    1: 101,
    2: 102,
    3: 103,
    4: 104,
    5: 105,
    6: 106,
    7: 107,
    8: 108,
} as const;

// Get zone group mapping from device options with fallback to defaults
function getZoneGroupMapping(options: KeyValue = {}): Record<number, number> {
    const mapping = {...defaultZoneGroupMapping};
    for (let i = 1; i <= MAX_ZONES; i++) {
        const optionKey = `zone_${i}_group_id`;
        const optionValue = options[optionKey];
        if (optionValue !== undefined && typeof optionValue === "number" && optionValue > 0) {
            mapping[i] = optionValue;
        }
    }
    return mapping;
}

// Get zone suffix from group ID by checking device options
function getZoneSuffixFromGroupId(groupId: number | undefined, options: KeyValue = {}): string | null {
    if (!groupId) return null;

    // Get current zone group mapping from device options
    const zoneGroupMapping = getZoneGroupMapping(options);

    // Find the zone number for the given group ID
    const zoneNumber = Object.keys(zoneGroupMapping).find((zone) => zoneGroupMapping[Number.parseInt(zone, 10)] === groupId);

    // If no zone number is found for this group or if zone actions are disabled, add no suffix
    if (!zoneNumber || options.zone_actions !== true) {
        return "";
    }

    return `_zone_${zoneNumber}`;
}

// Create fromZigbee converter that adds zone suffix to action names
function createZoneAwareConverter<T extends string>(
    // biome-ignore lint/suspicious/noExplicitAny: Fz.ConverterTypeStringOrArray is not exported
    baseConverter: Fz.Converter<T, undefined, any>,
    // biome-ignore lint/suspicious/noExplicitAny: Fz.ConverterTypeStringOrArray is not exported
): Fz.Converter<T, undefined, any> {
    return {
        cluster: baseConverter.cluster,
        type: baseConverter.type,
        convert: (model, msg, publish, options, meta) => {
            const zoneSuffix = getZoneSuffixFromGroupId(msg.groupID, options);
            if (zoneSuffix === null) return undefined;

            // Call the base converter
            const baseResult = baseConverter.convert(model, msg, publish, options, meta);
            if (!baseResult || typeof baseResult !== "object" || !("action" in baseResult)) return baseResult;

            // Override the action with zone suffix
            return {
                ...baseResult,
                action: `${baseResult.action}${zoneSuffix}`,
            };
        },
    };
}

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

// ModernExtend function for FUT089Z remote control
function miboxerFut089zControls() {
    // Create zone-aware converters using base converters (they will dynamically read device options)
    const onConverter = createZoneAwareConverter(fz.command_on);
    const offConverter = createZoneAwareConverter(fz.command_off);
    const brightnessConverter = createZoneAwareConverter(fz.command_move_to_level);
    const colorTempConverter = createZoneAwareConverter(fz.command_move_to_color_temp);
    const colorConverter = createZoneAwareConverter(fz.command_move_to_hue_and_saturation);

    // biome-ignore lint/suspicious/noExplicitAny: Fz.ConverterTypeStringOrArray is not exported
    const fromZigbee: Fz.Converter<string, undefined, any>[] = [
        onConverter,
        offConverter,
        brightnessConverter,
        colorTempConverter,
        colorConverter,
        fz.battery,
        fz.tuya_switch_scene,
        // Add converters for numeric sensors (always included, but they check options internally)
        actionPropertyConverters.hue_saturation,
        actionPropertyConverters.color_temp,
        actionPropertyConverters.level,
    ];

    // Device exposes (battery info and action)
    const exposesList = [e.battery(), e.battery_voltage()];

    // Device options for zone group mapping configuration and numeric sensors
    const deviceOptions = [
        // Generate zone group ID options dynamically
        ...Array.from({length: MAX_ZONES}, (_, i) => {
            const zoneNum = i + 1;
            return exposes
                .numeric(`zone_${zoneNum}_group_id`, exposes.access.SET)
                .withDescription(`Group ID for zone ${zoneNum} (default: ${DEFAULT_GROUP_ID_BASE + zoneNum})`)
                .withValueMin(1)
                .withValueMax(65535);
        }),
        // Feature toggles
        new exposes.Binary("expose_values", exposes.access.SET, true, false).withDescription(
            "Expose additional numeric values for action properties (hue, saturation, level, etc.)",
        ),
        new exposes.Binary("zone_actions", exposes.access.SET, true, false).withDescription(
            "Publish zone-specific actions with zone IDs (e.g., on_zone_1, off_zone_2)",
        ),
    ];

    // Generate action exposes for all possible zones
    function zoneActions(enableZoneActions: boolean): string[] {
        const baseActions = ["on", "off", "brightness_move_to_level", "color_temperature_move", "move_to_hue_and_saturation"];

        if (!enableZoneActions) {
            return baseActions;
        }

        const actions: string[] = [];
        for (let zoneNumber = 1; zoneNumber <= MAX_ZONES; zoneNumber++) {
            baseActions.forEach((action) => {
                actions.push(`${action}_zone_${zoneNumber}`);
            });
        }
        return actions;
    }

    // Event handler to update device when zone options change
    const eventHandlers: OnEvent.Handler[] = [
        async (event) => {
            if (event.type !== "deviceOptionsChanged") return;

            const {device, from, to} = event.data;

            // Generate zone option keys dynamically
            const zoneOptionKeys = Array.from({length: MAX_ZONES}, (_, i) => `zone_${i + 1}_group_id`);

            const hasZoneOptionChanged = zoneOptionKeys.some((key) => from[key] !== to[key]);

            if (hasZoneOptionChanged) {
                try {
                    const endpoint = device.getEndpoint(1);
                    if (!endpoint) {
                        throw new Error("Endpoint 1 not found on device");
                    }

                    // Get the updated zone group mapping from new options
                    const updatedMapping = getZoneGroupMapping(to);

                    // Build zone configuration array from the mapping
                    const zoneConfig = Object.entries(updatedMapping).map(([zoneNum, groupId]) => ({
                        zoneNum: Number.parseInt(zoneNum, 10),
                        groupId: groupId,
                    }));

                    // Send the updated zone configuration to the device
                    await endpoint.command("genGroups", "miboxerSetZones", {zones: zoneConfig});
                } catch (error) {
                    // Log error but don't throw to avoid breaking the update process
                    logger.error(`Failed to update zone configuration: ${error}`, "zhc:miboxer");
                }
            }

            event.data.deviceExposesChanged();
        },
    ];

    return {
        fromZigbee,
        exposes: [
            ...exposesList,
            ((device, options = {}) => {
                const dynamicExposes = [];

                // Add action expose with zone-aware actions
                dynamicExposes.push(e.action(zoneActions(options.zone_actions === true)));

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
        onEvent: eventHandlers,
        isModernExtend: true as true,
        configure: [
            async (device: Zh.Device, coordinatorEndpoint: Zh.Endpoint, definition: Definition) => {
                const endpoint = device.getEndpoint(1);
                if (!endpoint) {
                    throw new Error("Endpoint 1 not found on device");
                }

                await tuya.configureMagicPacket(device, coordinatorEndpoint);

                // Use default zone group mapping for initial configuration
                const currentMapping = getZoneGroupMapping();

                // Build zone configuration array from the mapping
                const zoneConfig = Object.entries(currentMapping).map(([zoneNum, groupId]) => ({
                    zoneNum: Number.parseInt(zoneNum, 10),
                    groupId: groupId,
                }));

                await endpoint.command("genGroups", "miboxerSetZones", {zones: zoneConfig});
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
