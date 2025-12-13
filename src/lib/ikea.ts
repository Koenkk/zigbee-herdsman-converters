import {gt as semverGt, gte as semverGte, lt as semverLt, valid as semverValid} from "semver";

import {Zcl} from "zigbee-herdsman";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import {access, binary, options, presets} from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {Configure, Expose, Fz, KeyValue, KeyValueAny, LevelConfigFeatures, ModernExtend, OnEvent, Range, Tz, Zh} from "../lib/types";
import {
    assertString,
    configureSetPowerSourceWhenUnknown,
    getEndpointName,
    getFromLookup,
    getTransition,
    hasAlreadyProcessedMessage,
    isDummyDevice,
    isObject,
    mapNumberRange,
    postfixWithEndpointName,
    precisionRound,
    replaceToZigbeeConvertersInArray,
} from "../lib/utils";
import {logger} from "./logger";

const NS = "zhc:ikea";

export const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN};

const bulbOnEvent: OnEvent.Handler = async (event) => {
    /**
     * IKEA bulbs lose their configured reportings when losing power.
     * A deviceAnnounce indicates they are powered on again.
     * Reconfigure the configured reporting here.
     *
     * Additionally some other information is lost like
     *   color_options.execute_if_off. We also restore these.
     *
     * NOTE: binds are not lost so rebinding is not needed!
     */
    if (event.type === "deviceAnnounce") {
        const {state, device} = event.data;
        for (const endpoint of device.endpoints) {
            for (const c of endpoint.configuredReportings) {
                await endpoint.configureReporting(c.cluster.name, [
                    {
                        // @ts-expect-error dynamic, expected correct since already applied
                        attribute: c.attribute.name,
                        minimumReportInterval: c.minimumReportInterval,
                        maximumReportInterval: c.maximumReportInterval,
                        reportableChange: c.reportableChange,
                    },
                ]);
            }
        }

        // NOTE: execute_if_off default is false
        //       we only restore if true, to save unneeded network writes
        const colorOptions = state.color_options as KeyValue;
        if (colorOptions?.execute_if_off === true) {
            await device.endpoints[0].write("lightingColorCtrl", {options: 1});
        }
        const levelConfig = state.level_config as KeyValue;
        if (levelConfig?.execute_if_off === true) {
            await device.endpoints[0].write("genLevelCtrl", {options: 1});
        }
        if (levelConfig?.on_level !== undefined) {
            const onLevelRaw = levelConfig.on_level;
            let onLevel: number;
            if (typeof onLevelRaw === "string" && onLevelRaw.toLowerCase() === "previous") {
                onLevel = 255;
            } else {
                onLevel = Number(onLevelRaw);
            }
            if (onLevel > 255) onLevel = 254;
            if (onLevel < 1) onLevel = 1;

            await device.endpoints[0].write("genLevelCtrl", {onLevel: onLevel});
        }
    }
};

export function ikeaLight(args?: Omit<m.LightArgs, "colorTemp"> & {colorTemp?: true | {range: Range; viaColor: true}}) {
    const colorTemp: {range: Range} = args?.colorTemp ? (args.colorTemp === true ? {range: [250, 454]} : args.colorTemp) : undefined;
    const levelConfig: {features?: LevelConfigFeatures} = args?.levelConfig
        ? args.levelConfig
        : {features: ["execute_if_off", "current_level_startup"]};
    const result = m.light({...args, colorTemp, levelConfig});
    result.ota = true;
    result.onEvent = [bulbOnEvent];
    if (isObject(args?.colorTemp) && args.colorTemp.viaColor) {
        result.toZigbee = replaceToZigbeeConvertersInArray(result.toZigbee, [tz.light_color_colortemp], [tz.light_color_and_colortemp_via_color]);
    }
    if (args?.colorTemp || args?.color) {
        result.exposes.push(presets.light_color_options());

        if (result.toZigbee) {
            // add unfreeze support for color lights
            result.toZigbee = result.toZigbee.map((orig) => {
                // As of 2025-04, it looks like all IKEA WS/CWS lights are affected by the freezing bug:
                const affectedByFreezingBug = true;

                if (orig.options && affectedByFreezingBug) {
                    const origOptions = orig.options;
                    return {
                        ...orig,
                        options:
                            typeof origOptions === "function"
                                ? (def) => [...origOptions(def), options.unfreeze_support()]
                                : [...origOptions, options.unfreeze_support()],
                        convertSet: trackFreezing(orig.convertSet),
                    };
                }

                return orig;
            });
        }
    }

    // Never use a transition when transitioning to OFF as this turns on the light when sending OFF twice
    // when the bulb has firmware > 1.0.012.
    // https://github.com/Koenkk/zigbee2mqtt/issues/19211
    // https://github.com/Koenkk/zigbee2mqtt/issues/22030#issuecomment-2292063140
    // Some old softwareBuildID are not a valid semver, e.g. `1.1.1.0-5.7.2.0`
    // https://github.com/Koenkk/zigbee2mqtt/issues/23863
    result.meta = {
        ...result.meta,
        noOffTransitionWhenOff: (entity) => {
            const softwareBuildID = entity.getDevice().softwareBuildID;
            return softwareBuildID && semverValid(softwareBuildID, true) && semverGt(softwareBuildID, "1.0.012", true);
        },
    };

    return result;
}

export function ikeaBattery(): ModernExtend {
    const exposes: Expose[] = [
        presets
            .numeric("battery", access.STATE_GET)
            .withUnit("%")
            .withDescription("Remaining battery in %")
            .withValueMin(0)
            .withValueMax(100)
            .withCategory("diagnostic"),
    ];

    const fromZigbee = [
        {
            cluster: "genPowerCfg",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const payload: KeyValue = {};
                if (msg.data.batteryPercentageRemaining !== undefined && msg.data.batteryPercentageRemaining < 255) {
                    // Some devices do not comply to the ZCL and report a
                    // batteryPercentageRemaining of 100 when the battery is full (should be 200).
                    let dividePercentage = true;

                    if (meta.device.softwareBuildID && semverValid(meta.device.softwareBuildID, true)) {
                        if (model.model === "E2103") {
                            if (semverLt(meta.device.softwareBuildID, "24.4.13", true)) {
                                dividePercentage = false;
                            }
                        } else {
                            // IKEA corrected this on newer remote fw version, but many people are still
                            // 2.2.010 which is the last version supporting group bindings. We try to be
                            // smart and pick the correct one for IKEA remotes.
                            // If softwareBuildID is below 2.4.0 it should not be divided
                            if (semverLt(meta.device.softwareBuildID, "2.4.0", true)) {
                                dividePercentage = false;
                            }
                        }
                    }

                    let percentage = msg.data.batteryPercentageRemaining;
                    percentage = dividePercentage ? percentage / 2 : percentage;
                    payload.battery = precisionRound(percentage, 2);
                }

                return payload;
            },
        } satisfies Fz.Converter<"genPowerCfg", undefined, ["attributeReport", "readResponse"]>,
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ["battery"],
            convertGet: async (entity, key, meta) => {
                await entity.read("genPowerCfg", ["batteryPercentageRemaining"]);
            },
        },
    ];

    const defaultReporting: m.ReportingConfigWithoutAttribute = {min: "1_HOUR", max: "MAX", change: 10};

    const configure: Configure[] = [
        m.setupConfigureForReporting("genPowerCfg", "batteryPercentageRemaining", {config: defaultReporting, access: access.STATE_GET}),
        configureSetPowerSourceWhenUnknown("Battery"),
    ];

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export function ikeaConfigureStyrbar(): ModernExtend {
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/15725
            if (device.softwareBuildID && semverValid(device.softwareBuildID, true) && semverGte(device.softwareBuildID, "2.4.0", true)) {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "genScenes"]);
            }
        },
    ];

    return {configure, isModernExtend: true};
}

export function ikeaConfigureRemote(): ModernExtend {
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            if (device.softwareBuildID) {
                // Firmware 2.3.075 >= only supports binding to endpoint, before only to group
                // - https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
                // - https://github.com/Koenkk/zigbee2mqtt/issues/7716
                const endpoint = device.getEndpoint(1);
                const version = device.softwareBuildID.split(".").map((n) => Number(n));
                const bindTarget =
                    version[0] > 2 || (version[0] === 2 && version[1] > 3) || (version[0] === 2 && version[1] === 3 && version[2] >= 75)
                        ? coordinatorEndpoint
                        : constants.defaultBindGroup;
                await endpoint.bind("genOnOff", bindTarget);
            } else {
                logger.warning(`Could not correctly configure '${device.softwareBuildID}' since softwareBuildID is missing, try re-pairing it`, NS);
            }
        },
    ];

    return {configure, isModernExtend: true};
}

export function ikeaAirPurifier(): ModernExtend {
    const exposes: Expose[] = [
        presets.fan().withState("fan_state").withModes(["off", "auto", "1", "2", "3", "4", "5", "6", "7", "8", "9"]),
        presets.numeric("fan_speed", access.STATE_GET).withValueMin(0).withValueMax(9).withDescription("Current fan speed"),
        presets
            .numeric("pm25", access.STATE_GET)
            .withLabel("PM25")
            .withUnit("µg/m³")
            .withDescription("Measured PM2.5 (particulate matter) concentration"),
        presets
            .enum("air_quality", access.STATE_GET, ["excellent", "good", "moderate", "poor", "unhealthy", "hazardous", "out_of_range", "unknown"])
            .withDescription("Calculated air quality"),
        presets.binary("led_enable", access.ALL, true, false).withDescription("Controls the LED").withCategory("config"),
        presets.binary("child_lock", access.ALL, "LOCK", "UNLOCK").withDescription("Controls physical input on the device").withCategory("config"),
        presets
            .binary("replace_filter", access.STATE_GET, true, false)
            .withDescription("Indicates if the filter is older than 6 months and needs replacing")
            .withCategory("diagnostic"),
        presets
            .numeric("filter_age", access.STATE_GET)
            .withUnit("minutes")
            .withDescription("Duration the filter has been used")
            .withCategory("diagnostic"),
        presets
            .numeric("device_age", access.STATE_GET)
            .withUnit("minutes")
            .withDescription("Duration the air purifier has been used")
            .withCategory("diagnostic"),
    ];

    const fromZigbee = [
        {
            cluster: "manuSpecificIkeaAirPurifier",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};

                if (msg.data.particulateMatter25Measurement !== undefined) {
                    const pm25Property = postfixWithEndpointName("pm25", msg, model, meta);
                    let pm25 = msg.data.particulateMatter25Measurement;

                    // Air Quality
                    // Scale based on EU AQI (https://www.eea.europa.eu/themes/air/air-quality-index)
                    // Using German IAQ labels to match the Develco Air Quality Sensor
                    // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                    let airQuality;
                    const airQualityProperty = postfixWithEndpointName("air_quality", msg, model, meta);
                    if (pm25 <= 10) {
                        airQuality = "excellent";
                    } else if (pm25 <= 20) {
                        airQuality = "good";
                    } else if (pm25 <= 25) {
                        airQuality = "moderate";
                    } else if (pm25 <= 50) {
                        airQuality = "poor";
                    } else if (pm25 <= 75) {
                        airQuality = "unhealthy";
                    } else if (pm25 <= 800) {
                        airQuality = "hazardous";
                    } else if (pm25 < 65535) {
                        airQuality = "out_of_range";
                    } else {
                        airQuality = "unknown";
                    }

                    pm25 = pm25 === 65535 ? -1 : pm25;

                    state[pm25Property] = pm25;
                    state[airQualityProperty] = airQuality;
                }

                if (msg.data.filterRunTime !== undefined) {
                    // Filter needs to be replaced after 6 months
                    state.replace_filter = msg.data.filterRunTime >= 259200;
                    state.filter_age = msg.data.filterRunTime;
                }

                if (msg.data.deviceRunTime !== undefined) {
                    state.device_age = msg.data.deviceRunTime;
                }

                if (msg.data.controlPanelLight !== undefined) {
                    state.led_enable = msg.data.controlPanelLight === 0;
                }

                if (msg.data.childLock !== undefined) {
                    state.child_lock = msg.data.childLock === 0 ? "UNLOCK" : "LOCK";
                }

                if (msg.data.fanSpeed !== undefined) {
                    let fanSpeed = msg.data.fanSpeed;
                    if (fanSpeed >= 10) {
                        fanSpeed = ((fanSpeed - 5) * 2) / 10;
                    } else {
                        fanSpeed = 0;
                    }

                    state.fan_speed = fanSpeed;
                }

                if (msg.data.fanMode !== undefined) {
                    let fanMode: number | string = msg.data.fanMode;
                    if (fanMode >= 10) {
                        fanMode = (((fanMode - 5) * 2) / 10).toString();
                    } else if (fanMode === 1) {
                        fanMode = "auto";
                    } else {
                        fanMode = "off";
                    }

                    state.fan_mode = fanMode;
                    state.fan_state = fanMode === "off" ? "OFF" : "ON";
                }

                return state;
            },
        } satisfies Fz.Converter<"manuSpecificIkeaAirPurifier", IkeaAirPurifier, ["attributeReport", "readResponse"]>,
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ["fan_mode", "fan_state"],
            convertSet: async (entity, key, value, meta) => {
                if (key === "fan_state" && typeof value === "string" && value.toLowerCase() === "on") {
                    value = "auto";
                } else {
                    value = value.toString().toLowerCase();
                }

                // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                let fanMode;
                switch (value) {
                    case "off":
                        fanMode = 0;
                        break;
                    case "auto":
                        fanMode = 1;
                        break;
                    default:
                        fanMode = (Number(value) / 2.0) * 10 + 5;
                }

                await entity.write<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>(
                    "manuSpecificIkeaAirPurifier",
                    {fanMode: fanMode},
                    manufacturerOptions,
                );
                return {state: {fan_mode: value, fan_state: value === "off" ? "OFF" : "ON"}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>("manuSpecificIkeaAirPurifier", ["fanMode"]);
            },
        },
        {
            key: ["fan_speed"],
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>("manuSpecificIkeaAirPurifier", ["fanSpeed"]);
            },
        },
        {
            key: ["pm25", "air_quality"],
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>("manuSpecificIkeaAirPurifier", ["particulateMatter25Measurement"]);
            },
        },
        {
            key: ["replace_filter", "filter_age"],
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>("manuSpecificIkeaAirPurifier", ["filterRunTime"]);
            },
        },
        {
            key: ["device_age"],
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>("manuSpecificIkeaAirPurifier", ["deviceRunTime"]);
            },
        },
        {
            key: ["child_lock"],
            convertSet: async (entity, key, value, meta) => {
                assertString(value);
                await entity.write<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>(
                    "manuSpecificIkeaAirPurifier",
                    {childLock: value.toLowerCase() === "unlock" ? 0 : 1},
                    manufacturerOptions,
                );
                return {state: {child_lock: value.toLowerCase() === "lock" ? "LOCK" : "UNLOCK"}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>("manuSpecificIkeaAirPurifier", ["childLock"]);
            },
        },
        {
            key: ["led_enable"],
            convertSet: async (entity, key, value, meta) => {
                await entity.write<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>(
                    "manuSpecificIkeaAirPurifier",
                    {controlPanelLight: value ? 0 : 1},
                    manufacturerOptions,
                );
                return {state: {led_enable: !!value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>("manuSpecificIkeaAirPurifier", ["controlPanelLight"]);
            },
        },
    ];

    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            const endpoint = device.getEndpoint(1);

            await reporting.bind(endpoint, coordinatorEndpoint, ["manuSpecificIkeaAirPurifier"]);
            await endpoint.configureReporting<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>(
                "manuSpecificIkeaAirPurifier",
                [
                    {
                        attribute: "particulateMatter25Measurement",
                        minimumReportInterval: m.TIME_LOOKUP["1_MINUTE"],
                        maximumReportInterval: m.TIME_LOOKUP["1_HOUR"],
                        reportableChange: 1,
                    },
                ],
                manufacturerOptions,
            );
            await endpoint.configureReporting<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>(
                "manuSpecificIkeaAirPurifier",
                [
                    {
                        attribute: "filterRunTime",
                        minimumReportInterval: m.TIME_LOOKUP["1_HOUR"],
                        maximumReportInterval: m.TIME_LOOKUP["1_HOUR"],
                        reportableChange: 0,
                    },
                ],
                manufacturerOptions,
            );
            await endpoint.configureReporting<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>(
                "manuSpecificIkeaAirPurifier",
                [{attribute: "fanMode", minimumReportInterval: 0, maximumReportInterval: m.TIME_LOOKUP["1_HOUR"], reportableChange: 1}],
                manufacturerOptions,
            );
            await endpoint.configureReporting<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>(
                "manuSpecificIkeaAirPurifier",
                [{attribute: "fanSpeed", minimumReportInterval: 0, maximumReportInterval: m.TIME_LOOKUP["1_HOUR"], reportableChange: 1}],
                manufacturerOptions,
            );

            await endpoint.read<"manuSpecificIkeaAirPurifier", IkeaAirPurifier>("manuSpecificIkeaAirPurifier", [
                "controlPanelLight",
                "childLock",
                "filterRunTime",
            ]);
        },
    ];

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export function ikeaVoc(args?: Partial<m.NumericArgs<"manuSpecificIkeaVocIndexMeasurement", IkeaVocIndexMeasurement>>) {
    return m.numeric<"manuSpecificIkeaVocIndexMeasurement", IkeaVocIndexMeasurement>({
        name: "voc_index",
        label: "VOC index",
        cluster: "manuSpecificIkeaVocIndexMeasurement",
        attribute: "measuredValue",
        reporting: {min: "1_MINUTE", max: "2_MINUTES", change: 1},
        description: "Sensirion VOC index",
        access: "STATE",
        ...args,
    });
}

export function ikeaConfigureGenPollCtrl(args?: {endpointId: number}): ModernExtend {
    args = {endpointId: 1, ...args};
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            const endpoint = device.getEndpoint(args.endpointId);
            if (Number(device?.softwareBuildID?.split(".")[0]) >= 24) {
                await endpoint.write("genPollCtrl", {checkinInterval: 172800});
            }
        },
    ];

    return {configure, isModernExtend: true};
}

export function tradfriOccupancy(): ModernExtend {
    const exposes: Expose[] = [
        presets.binary("occupancy", access.STATE, true, false).withDescription("Indicates whether the device detected occupancy"),
        presets
            .binary("illuminance_above_threshold", access.STATE, true, false)
            .withDescription("Indicates whether the device detected bright light (works only in night mode)")
            .withCategory("diagnostic"),
    ];

    const fromZigbee = [
        {
            cluster: "genOnOff",
            type: "commandOnWithTimedOff",
            options: [options.occupancy_timeout(), options.illuminance_below_threshold_check()],
            convert: (model, msg, publish, options, meta) => {
                const onlyWhenOnFlag = (msg.data.ctrlbits & 1) !== 0;
                if (
                    onlyWhenOnFlag &&
                    (!options || options.illuminance_below_threshold_check === undefined || options.illuminance_below_threshold_check) &&
                    !globalStore.hasValue(msg.endpoint, "timer")
                )
                    return;

                const timeout = options?.occupancy_timeout != null ? Number(options.occupancy_timeout) : msg.data.ontime / 10;

                // Stop existing timer because motion is detected and set a new one.
                clearTimeout(globalStore.getValue(msg.endpoint, "timer"));
                globalStore.clearValue(msg.endpoint, "timer");

                if (timeout !== 0) {
                    const timer = setTimeout(() => {
                        publish({occupancy: false});
                        globalStore.clearValue(msg.endpoint, "timer");
                    }, timeout * 1000);
                    globalStore.putValue(msg.endpoint, "timer", timer);
                }

                return {occupancy: true, illuminance_above_threshold: onlyWhenOnFlag};
            },
        } satisfies Fz.Converter<"genOnOff", undefined, "commandOnWithTimedOff">,
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function tradfriRequestedBrightness(): ModernExtend {
    const exposes: Expose[] = [
        presets.numeric("requested_brightness_level", access.STATE).withValueMin(76).withValueMax(254).withCategory("diagnostic"),
        presets.numeric("requested_brightness_percent", access.STATE).withValueMin(30).withValueMax(100).withCategory("diagnostic"),
    ];

    const fromZigbee = [
        {
            // Possible values are 76 (30%) or 254 (100%)
            cluster: "genLevelCtrl",
            type: "commandMoveToLevelWithOnOff",
            convert: (model, msg, publish, options, meta) => {
                return {
                    requested_brightness_level: msg.data.level,
                    requested_brightness_percent: mapNumberRange(msg.data.level, 0, 254, 0, 100),
                };
            },
        } satisfies Fz.Converter<"genLevelCtrl", undefined, "commandMoveToLevelWithOnOff">,
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function tradfriCommandsOnOff(): ModernExtend {
    const exposes: Expose[] = [presets.action(["toggle"])];

    const fromZigbee = [
        {
            cluster: "genOnOff",
            type: "commandToggle",
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                return {action: postfixWithEndpointName("toggle", msg, model, meta)};
            },
        } satisfies Fz.Converter<"genOnOff", undefined, "commandToggle">,
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function tradfriCommandsLevelCtrl(): ModernExtend {
    const actionLookup: KeyValueAny = {
        commandStepWithOnOff: "brightness_up_click",
        commandStep: "brightness_down_click",
        commandMoveWithOnOff: "brightness_up_hold",
        commandStopWithOnOff: "brightness_up_release",
        commandMove: "brightness_down_hold",
        commandStop: "brightness_down_release",
        commandMoveToLevelWithOnOff: "toggle_hold",
    };

    const exposes: Expose[] = [presets.action(Object.values(actionLookup))];

    const fromZigbee = [
        {
            cluster: "genLevelCtrl",
            type: [
                "commandStepWithOnOff",
                "commandStep",
                "commandMoveWithOnOff",
                "commandStopWithOnOff",
                "commandMove",
                "commandStop",
                "commandMoveToLevelWithOnOff",
            ],
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                return {action: actionLookup[msg.type]};
            },
        } satisfies Fz.Converter<
            "genLevelCtrl",
            undefined,
            [
                "commandStepWithOnOff",
                "commandStep",
                "commandMoveWithOnOff",
                "commandStopWithOnOff",
                "commandMove",
                "commandStop",
                "commandMoveToLevelWithOnOff",
            ]
        >,
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function styrbarCommandOn(): ModernExtend {
    // The STYRBAR sends an on +- 500ms after the arrow release. We don't want to send the ON action in this case.
    // https://github.com/Koenkk/zigbee2mqtt/issues/13335
    const exposes: Expose[] = [presets.action(["on"])];

    const fromZigbee = [
        {
            cluster: "genOnOff",
            type: "commandOn",
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const arrowReleaseAgo = Date.now() - globalStore.getValue(msg.endpoint, "arrow_release", 0);
                if (arrowReleaseAgo > 700) {
                    return {action: "on"};
                }
            },
        } satisfies Fz.Converter<"genOnOff", undefined, "commandOn">,
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function ikeaDotsClick(args: {actionLookup?: KeyValue; dotsPrefix?: boolean; endpointNames: string[]}): ModernExtend {
    args = {
        actionLookup: {
            commandAction1: "initial_press",
            commandAction2: "long_press",
            commandAction3: "short_release",
            commandAction4: "long_release",
            commandAction6: "double_press",
        },
        dotsPrefix: false,
        ...args,
    };
    const actions = args.endpointNames.flatMap((b) =>
        Object.values(args.actionLookup).map((a) => (args.dotsPrefix ? `dots_${b}_${a}` : `${b}_${a}`)),
    );
    const exposes: Expose[] = [presets.action(actions)];

    const fromZigbee = [
        {
            // For remotes with firmware 1.0.012 (20211214)
            cluster: 64639,
            type: "raw",
            convert: (model, msg, publish, options, meta) => {
                if (!Buffer.isBuffer(msg.data)) return;
                // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                let action;
                const button = msg.data[5];
                switch (msg.data[6]) {
                    case 1:
                        action = "initial_press";
                        break;
                    case 2:
                        action = "double_press";
                        break;
                    case 3:
                        action = "long_press";
                        break;
                }

                return {action: args.dotsPrefix ? `dots_${button}_${action}` : `${button}_${action}`};
            },
        } satisfies Fz.Converter<64639, undefined, "raw">,
        {
            // For remotes with firmware 1.0.32 (20221219) an SOMRIG
            cluster: "tradfriButton",
            type: ["commandAction1", "commandAction2", "commandAction3", "commandAction4", "commandAction6"],
            convert: (model, msg, publish, options, meta) => {
                const button = getEndpointName(msg, model, meta);
                const action = getFromLookup(msg.type, args.actionLookup);
                return {action: args.dotsPrefix ? `dots_${button}_${action}` : `${button}_${action}`};
            },
        } satisfies Fz.Converter<
            "tradfriButton",
            undefined,
            ["commandAction1", "commandAction2", "commandAction3", "commandAction4", "commandAction6"]
        >,
    ];

    const configure: Configure[] = [m.setupConfigureForBinding("tradfriButton", "output", args.endpointNames)];

    return {exposes, fromZigbee, configure, isModernExtend: true};
}

export function ikeaArrowClick(args?: {styrbar?: boolean; bind?: boolean}): ModernExtend {
    args = {styrbar: false, bind: true, ...args};
    const actions = ["arrow_left_click", "arrow_left_hold", "arrow_left_release", "arrow_right_click", "arrow_right_hold", "arrow_right_release"];
    const exposes: Expose[] = [presets.action(actions)];

    const fromZigbee = [
        {
            cluster: "genScenes",
            type: "commandTradfriArrowSingle",
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                if (msg.data.value === 2) return; // This is send on toggle hold

                const direction = msg.data.value === 257 ? "left" : "right";
                return {action: `arrow_${direction}_click`};
            },
        } satisfies Fz.Converter<"genScenes", undefined, "commandTradfriArrowSingle">,
        {
            cluster: "genScenes",
            type: "commandTradfriArrowHold",
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const direction = msg.data.value === 3329 ? "left" : "right";
                globalStore.putValue(msg.endpoint, "direction", direction);
                return {action: `arrow_${direction}_hold`};
            },
        } satisfies Fz.Converter<"genScenes", undefined, "commandTradfriArrowHold">,
        {
            cluster: "genScenes",
            type: "commandTradfriArrowRelease",
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                if (args.styrbar) globalStore.putValue(msg.endpoint, "arrow_release", Date.now());
                const direction = globalStore.getValue(msg.endpoint, "direction");
                if (direction) {
                    globalStore.clearValue(msg.endpoint, "direction");
                    const result = {action: `arrow_${direction}_release`, action_duration: msg.data.value / 1000};
                    return result;
                }
            },
        } satisfies Fz.Converter<"genScenes", undefined, "commandTradfriArrowRelease">,
    ];

    const result: ModernExtend = {exposes, fromZigbee, isModernExtend: true};

    if (args.bind) result.configure = [m.setupConfigureForBinding("genScenes", "output")];

    return result;
}

export function ikeaMediaCommands(): ModernExtend {
    const actions = ["track_previous", "track_next", "volume_up", "volume_down", "volume_up_hold", "volume_down_hold"];
    const exposes: Expose[] = [presets.action(actions)];

    const fromZigbee = [
        {
            cluster: "genLevelCtrl",
            type: "commandMoveWithOnOff",
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const direction = msg.data.movemode === 1 ? "down" : "up";
                return {action: `volume_${direction}`};
            },
        } satisfies Fz.Converter<"genLevelCtrl", undefined, "commandMoveWithOnOff">,
        {
            cluster: "genLevelCtrl",
            type: "commandMove",
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const direction = msg.data.movemode === 1 ? "down_hold" : "up_hold";
                return {action: `volume_${direction}`};
            },
        } satisfies Fz.Converter<"genLevelCtrl", undefined, "commandMove">,
        {
            cluster: "genLevelCtrl",
            type: "commandStep",
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const direction = msg.data.stepmode === 1 ? "previous" : "next";
                return {action: `track_${direction}`};
            },
        } satisfies Fz.Converter<"genLevelCtrl", undefined, "commandStep">,
    ];

    const configure: Configure[] = [m.setupConfigureForBinding("genLevelCtrl", "output")];

    return {exposes, fromZigbee, configure, isModernExtend: true};
}

export interface IkeaAirPurifier {
    attributes: {
        filterRunTime: number;
        replaceFilter: number;
        filterLifeTime: number;
        controlPanelLight: number;
        particulateMatter25Measurement: number;
        childLock: number;
        fanMode: number;
        fanSpeed: number;
        deviceRunTime: number;
    };
    commands: never;
    commandResponses: never;
}

export function addCustomClusterManuSpecificIkeaAirPurifier(): ModernExtend {
    return m.deviceAddCustomCluster("manuSpecificIkeaAirPurifier", {
        ID: 0xfc7d,
        manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN,
        attributes: {
            filterRunTime: {ID: 0x0000, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
            replaceFilter: {ID: 0x0001, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            filterLifeTime: {ID: 0x0002, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
            controlPanelLight: {ID: 0x0003, type: Zcl.DataType.BOOLEAN, write: true},
            particulateMatter25Measurement: {ID: 0x0004, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            childLock: {ID: 0x0005, type: Zcl.DataType.BOOLEAN, write: true},
            fanMode: {ID: 0x0006, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            fanSpeed: {ID: 0x0007, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            deviceRunTime: {ID: 0x0008, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
        },
        commands: {},
        commandsResponse: {},
    });
}

export interface IkeaVocIndexMeasurement {
    attributes: {
        measuredValue: number;
        measuredMinValue: number;
        measuredMaxValue: number;
    };
    commands: never;
    commandResponses: never;
}

export function addCustomClusterManuSpecificIkeaVocIndexMeasurement(): ModernExtend {
    return m.deviceAddCustomCluster("manuSpecificIkeaVocIndexMeasurement", {
        ID: 0xfc7e,
        manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN,
        attributes: {
            measuredValue: {ID: 0x0000, type: Zcl.DataType.SINGLE_PREC, write: true},
            measuredMinValue: {ID: 0x0001, type: Zcl.DataType.SINGLE_PREC, write: true},
            measuredMaxValue: {ID: 0x0002, type: Zcl.DataType.SINGLE_PREC, write: true},
        },
        commands: {},
        commandsResponse: {},
    });
}

export function addCustomClusterManuSpecificIkeaSmartPlug(): ModernExtend {
    return m.deviceAddCustomCluster("manuSpecificIkeaSmartPlug", {
        ID: 0xfc85,
        manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN,
        attributes: {
            childLock: {ID: 0x0000, type: Zcl.DataType.BOOLEAN, write: true},
            ledEnable: {ID: 0x0001, type: Zcl.DataType.BOOLEAN, write: true},
        },

        commands: {},
        commandsResponse: {},
    });
}

export interface IkeaUnknown {
    attributes: never;
    commands: never;
    commandResponses: never;
}

// Seems to be present on newer IKEA devices like: VINDSTYRKA, RODRET, and BADRING
//  Also observed on some older devices that had a post DIRIGERA release fw update.
//  No attributes known.
export function addCustomClusterManuSpecificIkeaUnknown(): ModernExtend {
    return m.deviceAddCustomCluster("manuSpecificIkeaUnknown", {
        ID: 0xfc7c,
        manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN,
        attributes: {},
        commands: {},
        commandsResponse: {},
    });
}

const unfreezeMechanisms: {
    [key: string]: (entity: Zh.Endpoint | Zh.Group) => Promise<void>;
} = {
    // WS lights:
    //   Aborts the color transition midway: light will stay at the intermediary
    //   state it was when it received the command.
    // Color lights:
    //   Do not support this command.
    moveColorTemp: async (entity) => {
        await entity.command(
            "lightingColorCtrl",
            "moveColorTemp",
            {rate: 1, movemode: 0, minimum: 0, maximum: 600, optionsMask: 0, optionsOverride: 0},
            {},
        );
    },

    // WS lights:
    //   Same as "moveColorTemp".
    // Color lights:
    //   Finishes the color transition instantly: light will instantly
    //   "fast forward" to the final state, post-transition.
    genLevelCtrl: async (entity) => {
        await entity.command("genLevelCtrl", "stop", {optionsMask: 0, optionsOverride: 0}, {});
    },
};

const STOP_VALUES = ["stop", "0", 0];

// Payloads that can freeze and unfreeze the lights:

const COLOR_CHANGE = /(^|_)(color(temp(erature)?)?|hue|saturation)($|_)/;
const willFreeze = (key: string, transition: number, value: unknown) =>
    // Any color change command with a transition will freeze the light...
    COLOR_CHANGE.test(key) &&
    transition > 0 &&
    // ...except if it's a move/step and we're stopping:
    !STOP_VALUES.some((stop) => value === stop);

const UNFREEZE_DEPENDS_ON_LIGHT = /(color_temp)/; // CWS lights do not support this
const UNFREEZE_ALWAYS = /^(brightness_(move|step))|(color_temp_step)$/;
const UNFREEZE_WITH_STOP = /^(color_temp_move)$/;
const willUnfreeze = (key: string, value: unknown) => {
    if (UNFREEZE_DEPENDS_ON_LIGHT.test(key)) {
        return false; // be pessimistic and assume the light won't support it
    }
    if (UNFREEZE_ALWAYS.test(key)) {
        return true; // otherwise those will unfreeze
    }
    if (UNFREEZE_WITH_STOP.test(key) && STOP_VALUES.some((stop) => value === stop)) {
        return true; // and also those, if value matches
    }
    return false;
};

// Certain IKEA lights will freeze when given a brightness or temperature change with a transition
// We track if a light is frozen and if so, before issuing further commands, we send a command known to unfreeze the light
// https://github.com/Koenkk/zigbee2mqtt/issues/18574

const trackFreezing = (next: Tz.Converter["convertSet"]) => {
    const converter: Tz.Converter["convertSet"] = async (entity, key, value, meta) => {
        if (meta.options.unfreeze_support === false) {
            return await next(entity, key, value, meta);
        }

        const id = "deviceIeeeAddress" in entity ? entity.deviceIeeeAddress : entity.groupID;
        const now = Date.now();

        // unfreeze if necessary before sending the desired commands:
        const wasFrozenUntil: number | null = globalStore.getValue(entity, "frozenUntil");
        const isFrozenNow = wasFrozenUntil != null && now <= wasFrozenUntil;
        const needsUnfreezing = isFrozenNow && !willUnfreeze(key, value);
        if (needsUnfreezing) {
            // hardcoded to a single unfreeze mechanism for now:
            logger.debug(`${id}: light frozen until ${new Date(wasFrozenUntil).toISOString()}, unfreezing via "genLevelCtrl"`, NS);
            await unfreezeMechanisms.genLevelCtrl(entity);
        }

        // at this point the light is not frozen, send the desired commands:
        const ret = await next(entity, key, value, meta);

        // track if the command has frozen the light:
        const transition = getTransition(entity, key, meta);
        if (willFreeze(key, transition.time, value)) {
            const millis = transition.time * 100;
            const frozenUntil = Date.now() + millis;
            logger.debug(`${id}: marking light as frozen until ${new Date(frozenUntil).toISOString()} because of "${key}" with transition`, NS);
            globalStore.putValue(entity, "frozenUntil", frozenUntil);
        } else if (wasFrozenUntil != null) {
            logger.debug(`${id}: marking light as unfrozen`, NS);
            globalStore.clearValue(entity, "frozenUntil");
        }

        return ret;
    };

    return converter;
};

export const ikeaModernExtend = {
    smartPlugChildLock: (args?: Partial<m.BinaryArgs<"manuSpecificIkeaSmartPlug">>) => {
        const resultName = "child_lock";
        const resultDescription = "Enables/disables physical input on the device.";

        const result: ModernExtend = m.binary({
            name: resultName,
            cluster: "manuSpecificIkeaSmartPlug",
            attribute: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
            entityCategory: "config",
            valueOff: ["UNLOCK", 0x00],
            valueOn: ["LOCK", 0x01],
            description: resultDescription,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN},
        });

        // NOTE: make exposes dynamic based on fw version
        result.exposes = [
            (device, options) => {
                if (
                    !isDummyDevice(device) &&
                    device.softwareBuildID &&
                    semverValid(device.softwareBuildID) &&
                    semverGte(device.softwareBuildID, "2.4.25")
                ) {
                    return [binary(resultName, access.ALL, "LOCK", "UNLOCK").withDescription(resultDescription).withCategory("config")];
                }
                return [];
            },
        ];

        return result;
    },

    smartPlugLedEnable: (args?: Partial<m.BinaryArgs<"manuSpecificIkeaSmartPlug">>) => {
        const resultName = "led_enable";
        const resultDescription = "Enables/disables the led on the device.";

        const result: ModernExtend = m.binary({
            name: resultName,
            cluster: "manuSpecificIkeaSmartPlug",
            attribute: {ID: 0x0001, type: Zcl.DataType.BOOLEAN},
            entityCategory: "config",
            valueOff: ["FALSE", 0x00],
            valueOn: ["TRUE", 0x01],
            description: resultDescription,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN},
        });

        // NOTE: make exposes dynamic based on fw version
        result.exposes = [
            (device, options) => {
                if (
                    !isDummyDevice(device) &&
                    device.softwareBuildID &&
                    semverValid(device.softwareBuildID) &&
                    semverGte(device.softwareBuildID, "2.4.25")
                ) {
                    return [binary(resultName, access.ALL, "TRUE", "FALSE").withDescription(resultDescription).withCategory("config")];
                }
                return [];
            },
        ];

        return result;
    },
};
