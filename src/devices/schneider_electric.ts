import {Zcl} from "zigbee-herdsman";
import type {GpdAttributeReport} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, KeyValue, KeyValueAny, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import {postfixWithEndpointName} from "../lib/utils";
import * as stelpro from "./stelpro";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:schneider_electric";
interface SchneiderOccupancyConfig {
    attributes: {
        ambienceLightThreshold: number;
        occupancyActions: number;
        unoccupiedLevelDflt: number;
        unoccupiedLevel: number;
    };
    commands: never;
    commandResponses: never;
}

export interface WiserDeviceInfo {
    attributes: {
        deviceInfo: string;
    };
    commands: never;
    commandResponses: never;
}

interface SchneiderVisaConfig {
    attributes: {
        indicatorLuminanceLevel: number;
        indicatorColor: number;
        indicatorMode: number;
        motorTypeChannel1: number;
        motorTypeChannel2: number;
        curtainStatusChannel1: number;
        curtainStatusChannel2: number;
        key1EventNotification: number;
        key2EventNotification: number;
        key3EventNotification: number;
        key4EventNotification: number;
    };
    commands: never;
    commandResponses: never;
}

interface SchneiderLightSwitchConfiguration {
    attributes: {
        ledIndication: number;
        switchActions: number;
    };
    commands: never;
    commandResponses: never;
}

interface SchneiderFanSwitchConfiguration {
    attributes: {
        ledIndication: number;
        ledOrientation: number;
    };
    commands: never;
    commandResponses: never;
}

interface SchneiderUserInterfaceCfgCluster {
    attributes: {
        displayBrightnessActive: number;
        displayBrightnessInactive: number;
        displayActiveTimeout: number;
    };
    commands: never;
    commandResponses: never;
}

interface SchneiderTemperatureMeasurementCluster {
    attributes: {
        sensorCorrection: number;
        temperatureSensorType: number;
    };
    commands: never;
    commandResponses: never;
}

interface SchneiderMeteringCluster {
    attributes: {
        fixedLoadDemand: number;
    };
    commands: never;
    commandResponses: never;
}

interface SchneiderThermostatCluster {
    attributes: {
        schneiderWiserSpecific: number;
        controlStatus: number;
        localTemperatureSourceSelect: number;
        controlType: number;
        thermostatApplication: number;
        heatingFuel: number;
        heatTransferMedium: number;
        heatingEmitter: number;
        wiserSmartZoneMode: number;
        wiserSmartHactConfig: number;
        wiserSmartCurrentFilPiloteMode: number;
        wiserSmartValvePosition: number;
        wiserSmartValveCalibrationStatus: number;
    };
    commands: {
        schneiderWiserThermostatBoost: {
            command: number;
            enable: number;
            temperature: number;
            duration: number;
        };
        wiserSmartSetSetpoint: {
            operatingmode: number;
            zonemode: number;
            setpoint: number;
            reserved: number;
        };
        wiserSmartSetFipMode: {
            zonemode: number;
            fipmode: number;
            reserved: number;
        };
        wiserSmartCalibrateValve: Record<string, never>;
    };
    commandResponses: never;
}

interface SchneiderHeatingCoolingOutputCluster {
    attributes: {
        measuredTemperature: number;
        absMinHeatTemperatureLimit: number;
        absMaxHeatTemperatureLimit: number;
        absMinCoolTemperatureLimit: number;
        absMaxCoolTemperatureLimit: number;
        minHeatTemperatureLimit: number;
        maxHeatTemperatureLimit: number;
        minCoolTemperatureLimit: number;
        maxCoolTemperatureLimit: number;
        heatTemperatureHighLimit: number;
        heatTemperatureLowLimit: number;
        coolTemperatureHighLimit: number;
        coolTemperatureLowLimit: number;
        coolingOutputMode: number;
        heatingOutputMode: number;
        maximumIdleTime: number;
        antiIdleExerciseTime: number;
        preferredExerciseTime: number;
        minOffTime: number;
        minOnTime: number;
        maxOverallDutyCycle: number;
        overallDutyCyclePeriod: number;
        clusterRevision: number;
    };
    commands: never;
    commandResponses: never;
}

interface SchneiderLightingBallastCfg {
    attributes: {wiserControlMode: number};
    commands: never;
    commandResponses: never;
}

function indicatorMode(endpoint?: string) {
    let description = "Set Indicator Mode.";
    if (endpoint) {
        description = `Set Indicator Mode for ${endpoint} switch.`;
    }
    return m.enumLookup<"manuSpecificSchneiderLightSwitchConfiguration", SchneiderLightSwitchConfiguration>({
        name: "indicator_mode",
        lookup: {
            reverse_with_load: 2,
            consistent_with_load: 0,
            always_off: 3,
            always_on: 1,
        },
        cluster: "manuSpecificSchneiderLightSwitchConfiguration",
        attribute: "ledIndication",
        description: description,
        endpointName: endpoint,
    });
}

function socketIndicatorMode() {
    return m.enumLookup<"manuSpecificSchneiderFanSwitchConfiguration", SchneiderFanSwitchConfiguration>({
        name: "indicator_mode",
        lookup: {
            reverse_with_load: 0,
            consistent_with_load: 1,
            always_off: 2,
            always_on: 3,
        },
        cluster: "manuSpecificSchneiderFanSwitchConfiguration",
        attribute: "ledIndication",
        description: "Set indicator mode",
    });
}

function evlinkIndicatorMode() {
    return m.enumLookup<"manuSpecificSchneiderFanSwitchConfiguration", SchneiderFanSwitchConfiguration>({
        name: "indicator_mode",
        lookup: {
            default: 1,
            temporary: 5,
        },
        cluster: "manuSpecificSchneiderFanSwitchConfiguration",
        attribute: "ledIndication",
        description: "Set indicator mode",
    });
}

function fanIndicatorMode() {
    const description = "Set Indicator Mode.";
    return m.enumLookup<"manuSpecificSchneiderFanSwitchConfiguration", SchneiderFanSwitchConfiguration>({
        name: "indicator_mode",
        lookup: {
            always_on: 3,
            on_with_timeout_but_as_locator: 4,
            on_with_timeout: 5,
        },
        cluster: "manuSpecificSchneiderFanSwitchConfiguration",
        attribute: "ledIndication",
        description: description,
    });
}

function fanIndicatorOrientation() {
    const description = "Set Indicator Orientation.";
    return m.enumLookup<"manuSpecificSchneiderFanSwitchConfiguration", SchneiderFanSwitchConfiguration>({
        name: "indicator_orientation",
        lookup: {
            horizontal_left: 2,
            horizontal_right: 0,
            vertical_top: 3,
            vertical_bottom: 1,
        },
        cluster: "manuSpecificSchneiderFanSwitchConfiguration",
        attribute: "ledOrientation",
        description: description,
    });
}

function switchActions(endpoint?: string) {
    let description = "Set Switch Action.";
    if (endpoint) {
        description = `Set Switch Action for ${endpoint} Button.`;
    }
    return m.enumLookup<"manuSpecificSchneiderLightSwitchConfiguration", SchneiderLightSwitchConfiguration>({
        name: "switch_actions",
        lookup: {
            light: 0,
            light_opposite: 254,
            dimmer: 1,
            dimmer_opposite: 253,
            standard_shutter: 2,
            standard_shutter_opposite: 252,
            schneider_shutter: 3,
            schneider_shutter_opposite: 251,
            scene: 4,
            toggle_light: 5,
            toggle_dimmer: 6,
            alternate_light: 7,
            alternate_dimmer: 8,
            not_used: 127,
        },
        cluster: "manuSpecificSchneiderLightSwitchConfiguration",
        attribute: "switchActions",
        description: description,
        endpointName: endpoint,
    });
}

const schneiderElectricExtend = {
    addVisaConfigurationCluster: (enumDataType: Zcl.DataType.ENUM8 | Zcl.DataType.UINT8) =>
        m.deviceAddCustomCluster("visaConfiguration", {
            name: "visaConfiguration",
            ID: 0xfc04,
            manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            attributes: {
                indicatorLuminanceLevel: {name: "indicatorLuminanceLevel", ID: 0x0000, type: enumDataType, write: true},
                indicatorColor: {name: "indicatorColor", ID: 0x0001, type: enumDataType, write: true},
                indicatorMode: {name: "indicatorMode", ID: 0x0002, type: enumDataType, write: true},
                motorTypeChannel1: {name: "motorTypeChannel1", ID: 0x0003, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                motorTypeChannel2: {name: "motorTypeChannel2", ID: 0x0004, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                curtainStatusChannel1: {name: "curtainStatusChannel1", ID: 0x0005, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                curtainStatusChannel2: {name: "curtainStatusChannel2", ID: 0x0006, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                key1EventNotification: {name: "key1EventNotification", ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                key2EventNotification: {name: "key2EventNotification", ID: 0x0021, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                key3EventNotification: {name: "key3EventNotification", ID: 0x0022, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                key4EventNotification: {name: "key4EventNotification", ID: 0x0023, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            },
            commands: {},
            commandsResponse: {},
        }),
    visaConfigIndicatorLuminanceLevel: (): ModernExtend => {
        return m.enumLookup<"visaConfiguration", SchneiderVisaConfig>({
            name: "indicator_luminance_level",
            lookup: {
                "100": 0,
                "80": 1,
                "60": 2,
                "40": 3,
                "20": 4,
                "0": 5,
            },
            cluster: "visaConfiguration",
            attribute: "indicatorLuminanceLevel",
            description: "Set indicator luminance Level",
        });
    },
    visaConfigIndicatorColor: (): ModernExtend => {
        return m.enumLookup<"visaConfiguration", SchneiderVisaConfig>({
            name: "indicator_color",
            lookup: {
                white: 0,
                blue: 1,
            },
            cluster: "visaConfiguration",
            attribute: "indicatorColor",
            description: "Set indicator color",
        });
    },
    visaIndicatorMode: ([reverseWithLoad, consistentWithLoad, alwaysOff, alwaysOn]: number[]): ModernExtend => {
        return m.enumLookup<"visaConfiguration", SchneiderVisaConfig>({
            name: "indicator_mode",
            lookup: {
                reverse_with_load: reverseWithLoad,
                consistent_with_load: consistentWithLoad,
                always_off: alwaysOff,
                always_on: alwaysOn,
            },
            cluster: "visaConfiguration",
            attribute: "indicatorMode",
            description: "Set indicator mode for switch",
        });
    },
    visaConfigMotorType: (channel?: number): ModernExtend => {
        // TODO: was defaulting `motorTypeChannel` which is not part of the custom cluster
        const attribute = `motorTypeChannel${channel as 1 | 2}` as const;
        const description = `Set motor type for channel ${channel || ""}`;

        return m.enumLookup<"visaConfiguration", SchneiderVisaConfig>({
            name: `motor_type${channel ? `_${channel}` : ""}`,
            lookup: {
                ac_motor: 0,
                pulse_motor: 1,
            },
            cluster: "visaConfiguration",
            attribute: attribute,
            description: description,
        });
    },
    visaConfigCurtainStatus: (channel?: number): ModernExtend => {
        // TODO: was defaulting `motorTypeChannel` which is not part of the custom cluster
        const attribute = `curtainStatusChannel${channel as 1 | 2}` as const;
        const description = `Set curtain status for channel ${channel}`;

        return m.enumLookup<"visaConfiguration", SchneiderVisaConfig>({
            access: "STATE",
            name: `curtain_status${channel ? `_${channel}` : ""}`,
            lookup: {
                stop: 0,
                opening: 1,
                closing: 2,
            },
            cluster: "visaConfiguration",
            attribute: attribute,
            description: description,
        });
    },
    visaWiserCurtain: (endpointNames: string[]): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "genLevelCtrl",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        const onOffTransitionTime = Number(msg.data.onOffTransitionTime) / 10;
                        const currentLevel = utils.mapNumberRange(Number(msg.data.currentLevel), 0, 255, 0, 100);

                        const transition = postfixWithEndpointName("transition", msg, model, meta);
                        const position = postfixWithEndpointName("position", msg, model, meta);

                        return {
                            [transition]: onOffTransitionTime,
                            [position]: currentLevel,
                        };
                    },
                },
            ],
            toZigbee: [
                {
                    key: ["transition", "position"],
                    convertGet: async (entity, key, meta) => {
                        await entity.read("genLevelCtrl", ["onOffTransitionTime", "currentLevel"]);
                    },
                    convertSet: async (entity, key, value, meta) => {
                        if (key === "transition") {
                            await entity.write("genLevelCtrl", {onOffTransitionTime: +value * 10}, utils.getOptions(meta.mapped, entity));
                        } else if (key === "position") {
                            await entity.command(
                                "genLevelCtrl",
                                "moveToLevelWithOnOff",
                                {level: utils.mapNumberRange(Number(value), 0, 100, 0, 255), transtime: 0, optionsMask: 0, optionsOverride: 0},
                                utils.getOptions(meta.mapped, entity),
                            );
                        }
                    },
                },
                {
                    key: ["state"],
                    convertSet: async (entity, key, value, meta) => {
                        if (value === "OPEN") {
                            await entity.command("genOnOff", "on", {}, utils.getOptions(meta.mapped, entity));
                        } else if (value === "CLOSE") {
                            await entity.command("genOnOff", "off", {}, utils.getOptions(meta.mapped, entity));
                        } else if (value === "STOP") {
                            await entity.command("genLevelCtrl", "stop", {optionsMask: 0, optionsOverride: 0}, utils.getOptions(meta.mapped, entity));
                        }
                    },
                },
            ],
            exposes: [
                ...endpointNames.map((endpointName) => e.cover_position().withDescription("State of the curtain").withEndpoint(endpointName)),
                ...endpointNames.map((endpointName) =>
                    e
                        .numeric("transition", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(300)
                        .withUnit("s")
                        .withDescription("Transition time in seconds")
                        .withEndpoint(endpointName),
                ),
            ],
        };
    },
    visaKeyEventNotification: (key: "1" | "2" | "3" | "4"): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "visaConfiguration",
                    type: ["attributeReport"],
                    convert: (model, msg, publish, options, meta) => {
                        for (const key of ["1", "2", "3", "4"]) {
                            const zigbeeKey = `key${key}EventNotification`;
                            if (Object.hasOwn(msg.data, zigbeeKey)) {
                                return {action: `scene_${key}`};
                            }
                        }
                    },
                },
            ],
        };
    },

    dimmingMode: (): ModernExtend => {
        const extend = m.enumLookup<"lightingBallastCfg", SchneiderLightingBallastCfg>({
            name: "dimmer_mode",
            lookup: {
                Auto: 0,
                "RL-LED": 3,
            },
            cluster: "lightingBallastCfg",
            attribute: "wiserControlMode",
            description: "Auto detects the correct mode for the ballast. RL-LED may have improved dimming quality for LEDs.",
            entityCategory: "config",
        });
        extend.configure.push(
            m.setupConfigureForReading<"lightingBallastCfg", SchneiderLightingBallastCfg>("lightingBallastCfg", ["wiserControlMode"]),
        );
        return extend;
    },

    addOccupancyConfigurationCluster: () =>
        m.deviceAddCustomCluster("occupancyConfiguration", {
            name: "occupancyConfiguration",
            ID: 0xff19,
            manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            attributes: {
                ambienceLightThreshold: {name: "ambienceLightThreshold", ID: 0x0000, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                occupancyActions: {name: "occupancyActions", ID: 0x0001, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                unoccupiedLevelDflt: {name: "unoccupiedLevelDflt", ID: 0x0002, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                unoccupiedLevel: {name: "unoccupiedLevel", ID: 0x0003, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            },
            commands: {},
            commandsResponse: {},
        }),

    occupancyConfiguration: (): ModernExtend => {
        const extend = m.enumLookup({
            name: "occupancy_sensitivity",
            lookup: {
                Low: 50,
                Medium: 75,
                High: 100,
            },
            cluster: "msOccupancySensing",
            attribute: {ID: 0xe003, type: Zcl.DataType.UINT8},
            zigbeeCommandOptions: {
                manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            },
            description: "Sensitivity of the occupancy sensor",
            entityCategory: "config",
        });

        const luxScale: m.ScaleFunction = (value: number, type: "from" | "to") => {
            if (type === "from") {
                return Math.round(10 ** ((value - 1) / 10000));
            }
            return Math.round(10000 * Math.log10(value) + 1);
        };

        const luxThresholdExtend = m.numeric<"occupancyConfiguration", SchneiderOccupancyConfig>({
            name: "ambience_light_threshold",
            cluster: "occupancyConfiguration",
            attribute: "ambienceLightThreshold",
            reporting: {min: "10_SECONDS", max: "1_HOUR", change: 5},
            description: "Threshold above which occupancy will not trigger the light switch.",
            unit: "lx",
            scale: luxScale,
            entityCategory: "config",
            valueMin: 1,
            valueMax: 2000,
        });
        extend.fromZigbee.push(...luxThresholdExtend.fromZigbee);
        extend.toZigbee.push(...luxThresholdExtend.toZigbee);
        extend.exposes.push(...luxThresholdExtend.exposes);
        extend.configure.push(
            m.setupConfigureForReading<"occupancyConfiguration", SchneiderOccupancyConfig>("occupancyConfiguration", ["ambienceLightThreshold"]),
        );

        return extend;
    },
    thermostatWithPower: (options: m.ThermostatArgs): ModernExtend => {
        const extend = m.thermostat(options);
        const climateExpose = extend.exposes.find((exp) => typeof exp !== "function" && "type" in exp && exp.type === "climate");
        if (climateExpose) {
            climateExpose.withRunningState(["idle", "heat"]);
            const runningStateFeature = climateExpose.features.find((f) => typeof f !== "function" && "name" in f && f.name === "running_state");
            if (runningStateFeature) {
                runningStateFeature.withDescription("Running state based on power draw (>10W)");
            }
        }
        extend.fromZigbee.push({
            cluster: "seMetering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if ("instantaneousDemand" in msg.data) {
                    const w = Math.max(0, Number(msg.data.instantaneousDemand));
                    return {running_state: w > 10 ? "heat" : "idle"};
                }
            },
        });
        return extend;
    },
    addHeatingCoolingOutputClusterServer: () =>
        m.deviceAddCustomCluster("heatingCoolingOutputClusterServer", {
            name: "heatingCoolingOutputClusterServer",
            ID: 0xff23,
            manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            attributes: {
                measuredTemperature: {name: "measuredTemperature", ID: 0x0000, type: Zcl.DataType.INT16, max: 0x7fff},
                absMinHeatTemperatureLimit: {name: "absMinHeatTemperatureLimit", ID: 0x0003, type: Zcl.DataType.INT16, max: 0x7fff},
                absMaxHeatTemperatureLimit: {name: "absMaxHeatTemperatureLimit", ID: 0x0004, type: Zcl.DataType.INT16, max: 0x7fff},
                absMinCoolTemperatureLimit: {name: "absMinCoolTemperatureLimit", ID: 0x0005, type: Zcl.DataType.INT16, max: 0x7fff},
                absMaxCoolTemperatureLimit: {name: "absMaxCoolTemperatureLimit", ID: 0x0006, type: Zcl.DataType.INT16, max: 0x7fff},
                minHeatTemperatureLimit: {name: "minHeatTemperatureLimit", ID: 0x0015, type: Zcl.DataType.INT16, write: true, max: 0x7fff},
                maxHeatTemperatureLimit: {name: "maxHeatTemperatureLimit", ID: 0x0016, type: Zcl.DataType.INT16, write: true, max: 0x7fff},
                minCoolTemperatureLimit: {name: "minCoolTemperatureLimit", ID: 0x0017, type: Zcl.DataType.INT16, write: true, max: 0x7fff},
                maxCoolTemperatureLimit: {name: "maxCoolTemperatureLimit", ID: 0x0018, type: Zcl.DataType.INT16, write: true, max: 0x7fff},
                heatTemperatureHighLimit: {name: "heatTemperatureHighLimit", ID: 0x0020, type: Zcl.DataType.INT16, write: true, max: 0x7fff},
                heatTemperatureLowLimit: {name: "heatTemperatureLowLimit", ID: 0x0021, type: Zcl.DataType.INT16, write: true, max: 0x7fff},
                coolTemperatureHighLimit: {name: "coolTemperatureHighLimit", ID: 0x0022, type: Zcl.DataType.INT16, write: true, max: 0x7fff},
                coolTemperatureLowLimit: {name: "coolTemperatureLowLimit", ID: 0x0023, type: Zcl.DataType.INT16, write: true, max: 0x7fff},
                coolingOutputMode: {name: "coolingOutputMode", ID: 0x0030, type: Zcl.DataType.ENUM8, write: true},
                heatingOutputMode: {name: "heatingOutputMode", ID: 0x0031, type: Zcl.DataType.ENUM8, write: true},
                maximumIdleTime: {name: "maximumIdleTime", ID: 0x0041, type: Zcl.DataType.UINT16, write: true, max: 8784},
                antiIdleExerciseTime: {name: "antiIdleExerciseTime", ID: 0x0042, type: Zcl.DataType.UINT16, write: true, max: 3600},
                preferredExerciseTime: {name: "preferredExerciseTime", ID: 0x0043, type: Zcl.DataType.UINT16, write: true, max: 1439},
                minOffTime: {name: "minOffTime", ID: 0x0044, type: Zcl.DataType.UINT16, write: true},
                minOnTime: {name: "minOnTime", ID: 0x0045, type: Zcl.DataType.UINT16, write: true},
                maxOverallDutyCycle: {name: "maxOverallDutyCycle", ID: 0xe207, type: Zcl.DataType.UINT16, write: true, min: 900, max: 3600},
                overallDutyCyclePeriod: {name: "overallDutyCyclePeriod", ID: 0xe208, type: Zcl.DataType.UINT16, write: true, max: 1440},
                clusterRevision: {name: "clusterRevision", ID: 0xfffd, type: Zcl.DataType.UINT16, max: 0xfffe},
            },
            commands: {},
            commandsResponse: {},
        }),
    heatingOutputMode: (args?: Partial<m.EnumLookupArgs<"heatingCoolingOutputClusterServer", SchneiderHeatingCoolingOutputCluster>>) =>
        m.enumLookup<"heatingCoolingOutputClusterServer", SchneiderHeatingCoolingOutputCluster>({
            name: "heating_output_mode",
            cluster: "heatingCoolingOutputClusterServer",
            attribute: "heatingOutputMode",
            description:
                "On devices with alternate heating output types, this selects which should be used to control the heating unit. This attribute is (mistakenly) also called pilot_mode on some devices.",
            entityCategory: "config",
            access: "ALL",
            lookup: {
                Disabled: 0,
                Relay: 1,
                OpenTherm: 2,
                "Fil Pilote": 3,
                "Relay NC": 4,
            },
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            ...args,
        }),
    pilotMode: (args?: Partial<m.EnumLookupArgs<"heatingCoolingOutputClusterServer", SchneiderHeatingCoolingOutputCluster>>) =>
        m.enumLookup<"heatingCoolingOutputClusterServer", SchneiderHeatingCoolingOutputCluster>({
            name: "schneider_pilot_mode",
            cluster: "heatingCoolingOutputClusterServer",
            attribute: "heatingOutputMode",
            description:
                "Controls piloting mode (from 'old description'). According to SE the attribute is called 'Heating output mode', and the corresponding custom cluster is heatingCoolingOutputClusterServer.",
            entityCategory: "config",
            access: "ALL",
            lookup: {
                contactor: 1,
                pilot: 3,
            },
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            ...args,
        }),
    addHvacUserInterfaceCfgCustomAttributes: () =>
        m.deviceAddCustomCluster("hvacUserInterfaceCfg", {
            name: "hvacUserInterfaceCfg",
            ID: Zcl.Clusters.hvacUserInterfaceCfg.ID,
            attributes: {
                displayBrightnessActive: {
                    name: "displayBrightnessActive",
                    ID: 0xe000,
                    type: Zcl.DataType.UINT8,
                    write: true,
                    min: 0,
                    max: 100,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                displayBrightnessInactive: {
                    name: "displayBrightnessInactive",
                    ID: 0xe001,
                    type: Zcl.DataType.UINT8,
                    write: true,
                    min: 0,
                    max: 100,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                displayActiveTimeout: {
                    name: "displayActiveTimeout",
                    ID: 0xe002,
                    type: Zcl.DataType.UINT16,
                    write: true,
                    min: 5,
                    max: 600,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    displayBrightnessActive: (args?: Partial<m.NumericArgs<"hvacUserInterfaceCfg", SchneiderUserInterfaceCfgCluster>>) =>
        m.numeric<"hvacUserInterfaceCfg", SchneiderUserInterfaceCfgCluster>({
            name: "display_brightness_active",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displayBrightnessActive",
            description: "Sets brightness of the temperature display during active state",
            entityCategory: "config",
            unit: "%",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            ...args,
        }),
    displayBrightnessInactive: (args?: Partial<m.NumericArgs<"hvacUserInterfaceCfg", SchneiderUserInterfaceCfgCluster>>) =>
        m.numeric<"hvacUserInterfaceCfg", SchneiderUserInterfaceCfgCluster>({
            name: "display_brightness_inactive",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displayBrightnessInactive",
            description: "Sets brightness of the temperature display during inactive state",
            entityCategory: "config",
            unit: "%",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            ...args,
        }),
    displayActiveTimeout: (args?: Partial<m.NumericArgs<"hvacUserInterfaceCfg", SchneiderUserInterfaceCfgCluster>>) =>
        m.numeric<"hvacUserInterfaceCfg", SchneiderUserInterfaceCfgCluster>({
            name: "display_active_timeout",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displayActiveTimeout",
            description: "Sets timeout of the temperature display active state",
            entityCategory: "config",
            unit: "seconds",
            valueMin: 5,
            valueMax: 600,
            valueStep: 5,
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            ...args,
        }),
    customTemperatureMeasurementCluster: () =>
        m.deviceAddCustomCluster("msTemperatureMeasurement", {
            name: "msTemperatureMeasurement",
            ID: Zcl.Clusters.msTemperatureMeasurement.ID,
            attributes: {
                sensorCorrection: {
                    name: "sensorCorrection",
                    ID: 0xe020,
                    type: Zcl.DataType.INT16,
                    write: true,
                    min: -900,
                    max: 900,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                temperatureSensorType: {
                    name: "temperatureSensorType",
                    ID: 0xe021,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    sensorCorrection: (args?: Partial<m.NumericArgs<"msTemperatureMeasurement", SchneiderTemperatureMeasurementCluster>>) =>
        m.numeric<"msTemperatureMeasurement", SchneiderTemperatureMeasurementCluster>({
            name: "temperature_sensor_correction",
            cluster: "msTemperatureMeasurement",
            attribute: "sensorCorrection",
            description: "This is a user correction, possibly negative, to be added to the temperature measured by the sensor.",
            unit: "°C",
            scale: 100,
            valueMin: -9,
            valueMax: 9,
            valueStep: 0.01,
            access: "ALL",
            entityCategory: "config",
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            ...args,
        }),
    temperatureSensorType: (args?: Partial<m.EnumLookupArgs<"msTemperatureMeasurement", SchneiderTemperatureMeasurementCluster>>) =>
        m.enumLookup<"msTemperatureMeasurement", SchneiderTemperatureMeasurementCluster>({
            name: "temperature_sensor_type",
            cluster: "msTemperatureMeasurement",
            attribute: "temperatureSensorType",
            description: "This is used to specify the type of temperature sensor connected to this input",
            entityCategory: "config",
            access: "ALL",
            lookup: {
                "2kΩ sensor from HRT/Alre": 1,
                "10kΩ sensor from B+J": 2,
                "12kΩ sensor from OJ": 3,
                "15kΩ sensor from DEVI": 4,
                "33kΩ sensor from EBERLE": 5,
                "47kΩ sensor from CTM": 6,
                "No sensor": 0xff,
            },
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            ...args,
        }),
    customMeteringCluster: () =>
        m.deviceAddCustomCluster("seMetering", {
            name: "seMetering",
            ID: Zcl.Clusters.seMetering.ID,
            attributes: {
                fixedLoadDemand: {
                    name: "fixedLoadDemand",
                    ID: 0x4510,
                    type: Zcl.DataType.UINT24,
                    write: true,
                    max: 0x7fffff,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    fixedLoadDemand: (args?: Partial<m.NumericArgs<"seMetering", SchneiderMeteringCluster>>) =>
        m.numeric<"seMetering", SchneiderMeteringCluster>({
            name: "fixed_load_demand",
            cluster: "seMetering",
            attribute: "fixedLoadDemand",
            description: "This attribute specifies the demand of a switched load when it is energised",
            entityCategory: "config",
            unit: "W",
            valueMin: 1,
            valueMax: 3600,
            valueStep: 1,
            ...args,
        }),
    customThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            name: "hvacThermostat",
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                schneiderWiserSpecific: {
                    name: "schneiderWiserSpecific",
                    ID: 0xe110,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    max: 0xff,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                controlStatus: {
                    name: "controlStatus",
                    ID: 0xe211,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                localTemperatureSourceSelect: {
                    name: "localTemperatureSourceSelect",
                    ID: 0xe212,
                    type: Zcl.DataType.UINT8,
                    write: true,
                    max: 0xfe,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                controlType: {
                    name: "controlType",
                    ID: 0xe213,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                thermostatApplication: {
                    name: "thermostatApplication",
                    ID: 0xe216,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                heatingFuel: {
                    name: "heatingFuel",
                    ID: 0xe217,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                heatTransferMedium: {
                    name: "heatTransferMedium",
                    ID: 0xe218,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                heatingEmitter: {
                    name: "heatingEmitter",
                    ID: 0xe21a,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                wiserSmartZoneMode: {
                    name: "wiserSmartZoneMode",
                    ID: 0xe010,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                wiserSmartHactConfig: {
                    name: "wiserSmartHactConfig",
                    ID: 0xe011,
                    type: Zcl.DataType.BITMAP8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                wiserSmartCurrentFilPiloteMode: {
                    name: "wiserSmartCurrentFilPiloteMode",
                    ID: 0xe020,
                    type: Zcl.DataType.ENUM8,
                    write: true,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                wiserSmartValvePosition: {
                    name: "wiserSmartValvePosition",
                    ID: 0xe030,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
                wiserSmartValveCalibrationStatus: {
                    name: "wiserSmartValveCalibrationStatus",
                    ID: 0xe031,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                },
            },
            commands: {
                schneiderWiserThermostatBoost: {
                    name: "schneiderWiserThermostatBoost",
                    ID: 0x80,
                    parameters: [
                        {name: "command", type: Zcl.DataType.ENUM8, max: 0xff},
                        {name: "enable", type: Zcl.DataType.ENUM8, max: 0xff},
                        {name: "temperature", type: Zcl.DataType.UINT16, max: 0xffff},
                        {name: "duration", type: Zcl.DataType.UINT16, max: 0xffff},
                    ],
                },
                wiserSmartSetSetpoint: {
                    name: "wiserSmartSetSetpoint",
                    ID: 0xe0,
                    parameters: [
                        {name: "operatingmode", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "zonemode", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "setpoint", type: Zcl.DataType.INT16, min: -32768, max: 32767},
                        {name: "reserved", type: Zcl.DataType.UINT8, max: 0xff},
                    ],
                },
                wiserSmartSetFipMode: {
                    name: "wiserSmartSetFipMode",
                    ID: 0xe1,
                    parameters: [
                        {name: "zonemode", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "fipmode", type: Zcl.DataType.ENUM8, max: 0xff},
                        {name: "reserved", type: Zcl.DataType.UINT8, max: 0xff},
                    ],
                },
                wiserSmartCalibrateValve: {name: "wiserSmartCalibrateValve", ID: 0xe2, parameters: []},
            },
            commandsResponse: {},
        }),
    controlStatus: (args?: Partial<m.EnumLookupArgs<"hvacThermostat", SchneiderThermostatCluster>>) =>
        m.enumLookup<"hvacThermostat", SchneiderThermostatCluster>({
            name: "control_status",
            cluster: "hvacThermostat",
            attribute: "controlStatus",
            description: "This indicates the status of the thermostat and allows reporting of abnormal and fault conditions.",
            entityCategory: "diagnostic",
            access: "STATE",
            lookup: {
                "Normal Operation": 0x00,
                "No Temperature": 0x20,
                "Remote Demand Override": 0x40,
                "Window Open": 0x41,
                "Local Force On": 0x61,
                Maintenance: 0x82,
                "Output Temporal Limit": 0x83,
                "Sensor Fault": 0x84,
            },
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            ...args,
        }),
    localTemperatureSourceSelect: () =>
        m.enumLookup<"hvacThermostat", SchneiderThermostatCluster>({
            name: "local_temperature_source_select",
            cluster: "hvacThermostat",
            attribute: "localTemperatureSourceSelect",
            description: "On devices with more than one temperature input, this selects which should be used for LocalTemperature.",
            entityCategory: "config",
            lookup: {Ambient: 2, External: 3},
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
        }),
    controlType: () =>
        m.enumLookup<"hvacThermostat", SchneiderThermostatCluster>({
            name: "control_type",
            cluster: "hvacThermostat",
            attribute: "controlType",
            description: "'On/Off', 'PI' and 'None' supported. This specifies the type of control algorithm to be used to regulate temperature.",
            entityCategory: "config",
            lookup: {"On/Off": 0, PI: 1, None: 0xff},
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
        }),
    thermostatApplication: () =>
        m.enumLookup<"hvacThermostat", SchneiderThermostatCluster>({
            name: "thermostat_application",
            cluster: "hvacThermostat",
            attribute: "thermostatApplication",
            description:
                "This is used to specify what the Thermostat is regulating. 'Occupied Space' - heating where the room temperature is used as the control value, 'Floor' - Floor warming applications where the temperature of the floor itself is regulated.",
            entityCategory: "config",
            lookup: {"Occupied Space": 0, Floor: 1, "Not known": 0xff},
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
        }),
    heatingFuel: () =>
        m.enumLookup<"hvacThermostat", SchneiderThermostatCluster>({
            name: "heating_fuel",
            cluster: "hvacThermostat",
            attribute: "heatingFuel",
            description: "Type of fuel used for heating.",
            entityCategory: "config",
            lookup: {
                electricity: 0x00,
                gas: 0x01,
                oil: 0x02,
                solid_fuel: 0x03,
                solar: 0x04,
                community_heating: 0x05,
                heat_pump: 0x06,
                not_specified: 0xff,
            },
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
        }),
    heatTransferMedium: () =>
        m.enumLookup<"hvacThermostat", SchneiderThermostatCluster>({
            name: "heat_transfer_medium",
            cluster: "hvacThermostat",
            attribute: "heatTransferMedium",
            description: "Medium used to transfer heat.",
            entityCategory: "config",
            lookup: {nothing: 0x00, hydronic: 0x01, air: 0x02},
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
        }),
    heatingEmitter: () =>
        m.enumLookup<"hvacThermostat", SchneiderThermostatCluster>({
            name: "heating_emitter",
            cluster: "hvacThermostat",
            attribute: "heatingEmitter",
            description: "This is used to specify the heat emitter.",
            entityCategory: "config",
            lookup: {None: 0, Radiator: 1, "Fan Assisted Radiator": 2, "Radiant Panel": 3, Floor: 4, "Not specified": 0xff},
            zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
        }),
    addWiserDeviceInfoCluster: () =>
        m.deviceAddCustomCluster("wiserDeviceInfo", {
            name: "wiserDeviceInfo",
            ID: 0xfe03,
            attributes: {
                deviceInfo: {name: "deviceInfo", ID: 0x0020, type: Zcl.DataType.CHAR_STR, write: true},
            },
            commands: {},
            commandsResponse: {},
        }),
    addSchneiderLightSwitchConfigurationCluster: () =>
        m.deviceAddCustomCluster("manuSpecificSchneiderLightSwitchConfiguration", {
            name: "manuSpecificSchneiderLightSwitchConfiguration",
            ID: 0xff17,
            manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            attributes: {
                ledIndication: {name: "ledIndication", ID: 0x0000, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                upSceneID: {name: "upSceneID", ID: 0x0010, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                upGroupID: {name: "upGroupID", ID: 0x0011, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                downSceneID: {name: "downSceneID", ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                downGroupID: {name: "downGroupID", ID: 0x0021, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                switchActions: {name: "switchActions", ID: 0x0001, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
            },
            commands: {},
            commandsResponse: {},
        }),
    addSchneiderFanSwitchConfigurationCluster: () =>
        m.deviceAddCustomCluster("manuSpecificSchneiderFanSwitchConfiguration", {
            name: "manuSpecificSchneiderFanSwitchConfiguration",
            ID: 0xfc04,
            manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            attributes: {
                ledIndication: {name: "ledIndication", ID: 0x0002, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                ledOrientation: {name: "ledOrientation", ID: 0x0060, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            },
            commands: {},
            commandsResponse: {},
        }),
    addSchneiderLightingBallastCfgCluster: () =>
        m.deviceAddCustomCluster("lightingBallastCfg", {
            name: "lightingBallastCfg",
            ID: Zcl.Clusters.lightingBallastCfg.ID,
            attributes: {
                wiserControlMode: {
                    name: "wiserControlMode",
                    ID: 0xe000,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
                    write: true,
                    max: 0xff,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
};

const tzLocal = {
    lift_duration: {
        key: ["lift_duration"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write(0x0102, {57344: {value, type: 0x21}}, {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC});
            return {state: {lift_duration: value}};
        },
    } satisfies Tz.Converter,
    fan_mode: {
        ...tz.fan_mode,
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            if (value.toLowerCase() === "on") value = "low";
            return await tz.fan_mode.convertSet(entity, key, value, meta);
        },
    } satisfies Tz.Converter,
    wiser_dimmer_mode: {
        key: ["dimmer_mode"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write<"lightingBallastCfg", SchneiderLightingBallastCfg>(
                "lightingBallastCfg",
                {wiserControlMode: utils.getKey(constants.wiserDimmerControlMode, value, value as number, Number)},
                {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC},
            );
            return {state: {dimmer_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"lightingBallastCfg", SchneiderLightingBallastCfg>("lightingBallastCfg", ["wiserControlMode"], {
                manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            });
        },
    } satisfies Tz.Converter,
    wiser_fip_setting: {
        key: ["fip_setting"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, key);
            const zoneLookup = {manual: 1, schedule: 2, energy_saver: 3, holiday: 6};
            const zonemodeNum = utils.getFromLookup(meta.state.zone_mode, zoneLookup);

            const fipLookup = {comfort: 0, "comfort_-1": 1, "comfort_-2": 2, energy_saving: 3, frost_protection: 4, off: 5};
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(fipLookup));
            const fipmodeNum = utils.getFromLookup(value, fipLookup);

            const payload = {
                zonemode: zonemodeNum,
                fipmode: fipmodeNum,
                reserved: 0xff,
            };
            await entity.command<"hvacThermostat", "wiserSmartSetFipMode", SchneiderThermostatCluster>(
                "hvacThermostat",
                "wiserSmartSetFipMode",
                payload,
                {srcEndpoint: 11, disableDefaultResponse: true},
            );

            return {state: {fip_setting: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", SchneiderThermostatCluster>("hvacThermostat", ["wiserSmartCurrentFilPiloteMode"]);
        },
    } satisfies Tz.Converter,
    wiser_hact_config: {
        key: ["hact_config"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, key);
            const lookup = {unconfigured: 0x00, setpoint_switch: 0x80, setpoint_fip: 0x82, fip_fip: 0x83};
            value = value.toLowerCase();
            const mode = utils.getFromLookup(value, lookup);
            await entity.write<"hvacThermostat", SchneiderThermostatCluster>("hvacThermostat", {57361: {value: mode, type: 0x18}});
            return {state: {hact_config: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", SchneiderThermostatCluster>("hvacThermostat", ["wiserSmartHactConfig"]);
        },
    } satisfies Tz.Converter,
    wiser_zone_mode: {
        key: ["zone_mode"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {manual: 1, schedule: 2, energy_saver: 3, holiday: 6};
            const zonemodeNum = utils.getFromLookup(value, lookup);
            await entity.write<"hvacThermostat", SchneiderThermostatCluster>("hvacThermostat", {57360: {value: zonemodeNum, type: 0x30}});
            return {state: {zone_mode: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read<"hvacThermostat", SchneiderThermostatCluster>("hvacThermostat", ["wiserSmartZoneMode"]);
        },
    } satisfies Tz.Converter,
    wiser_vact_calibrate_valve: {
        key: ["calibrate_valve"],
        convertSet: async (entity, key, value, meta) => {
            await entity.command<"hvacThermostat", "wiserSmartCalibrateValve", SchneiderThermostatCluster>(
                "hvacThermostat",
                "wiserSmartCalibrateValve",
                {},
                {srcEndpoint: 11, disableDefaultResponse: true},
            );
            return {state: {calibrate_valve: value}};
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    schneider_ui_action: {
        cluster: "wiserDeviceInfo",
        type: "attributeReport",
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;

            const data = msg.data.deviceInfo.split(",");
            if (data[0] === "UI" && data[1]) {
                const result: KeyValueAny = {action: utils.toSnakeCase(data[1])};

                let screenAwake = globalStore.getValue(msg.endpoint, "screenAwake");
                screenAwake = screenAwake !== undefined ? screenAwake : false;
                const keypadLockedNumber = Number(msg.endpoint.getClusterAttributeValue("hvacUserInterfaceCfg", "keypadLockout"));
                const keypadLocked = keypadLockedNumber !== undefined ? keypadLockedNumber !== 0 : false;

                // Emulate UI temperature update
                if (data[1] === "ScreenWake") {
                    globalStore.putValue(msg.endpoint, "screenAwake", true);
                } else if (data[1] === "ScreenSleep") {
                    globalStore.putValue(msg.endpoint, "screenAwake", false);
                } else if (screenAwake && !keypadLocked) {
                    let occupiedHeatingSetpoint = Number(msg.endpoint.getClusterAttributeValue("hvacThermostat", "occupiedHeatingSetpoint"));
                    occupiedHeatingSetpoint = occupiedHeatingSetpoint != null ? occupiedHeatingSetpoint : 400;

                    if (data[1] === "ButtonPressMinusDown") {
                        occupiedHeatingSetpoint -= 50;
                    } else if (data[1] === "ButtonPressPlusDown") {
                        occupiedHeatingSetpoint += 50;
                    }

                    msg.endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: occupiedHeatingSetpoint});
                    result.occupied_heating_setpoint = occupiedHeatingSetpoint / 100;
                }

                return result;
            }
        },
    } satisfies Fz.Converter<"wiserDeviceInfo", WiserDeviceInfo, "attributeReport">,
    schneider_powertag: {
        cluster: "greenPower",
        type: ["commandNotification", "commandCommissioningNotification"],
        convert: async (model, msg, publish, options, meta) => {
            if (msg.type !== "commandNotification") {
                return;
            }

            const commandID = msg.data.commandID;
            if (utils.hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;

            const rxAfterTx = msg.data.options & (1 << 11);
            const ret: KeyValue = {};

            switch (commandID) {
                case 0xa1: {
                    const attr = (msg.data.commandFrame as GpdAttributeReport).attributes;
                    const clusterID = (msg.data.commandFrame as GpdAttributeReport).clusterID;

                    switch (clusterID) {
                        case 2820: {
                            // haElectricalMeasurement
                            const acCurrentDivisor = attr.acCurrentDivisor as number;
                            const acVoltageDivisor = attr.acVoltageDivisor as number;
                            const acFrequencyDivisor = attr.acFrequencyDivisor as number;
                            const powerDivisor = attr.powerDivisor as number;

                            if (attr.rmsVoltage !== undefined) {
                                ret.voltage_phase_a = (attr.rmsVoltage as number) / acVoltageDivisor;
                            }

                            if (attr.rmsVoltagePhB !== undefined) {
                                ret.voltage_phase_b = (attr.rmsVoltagePhB as number) / acVoltageDivisor;
                            }

                            if (attr.rmsVoltagePhC !== undefined) {
                                ret.voltage_phase_c = (attr.rmsVoltagePhC as number) / acVoltageDivisor;
                            }

                            if (attr["19200"] !== undefined) {
                                ret.voltage_phase_ab = (attr["19200"] as number) / acVoltageDivisor;
                            }

                            if (attr["19456"] !== undefined) {
                                ret.voltage_phase_bc = (attr["19456"] as number) / acVoltageDivisor;
                            }

                            if (attr["19712"] !== undefined) {
                                ret.voltage_phase_ca = (attr["19712"] as number) / acVoltageDivisor;
                            }

                            if (attr.rmsCurrent !== undefined) {
                                ret.current_phase_a = (attr.rmsCurrent as number) / acCurrentDivisor;
                            }

                            if (attr.rmsCurrentPhB !== undefined) {
                                ret.current_phase_b = (attr.rmsCurrentPhB as number) / acCurrentDivisor;
                            }

                            if (attr.rmsCurrentPhC !== undefined) {
                                ret.current_phase_c = (attr.rmsCurrentPhC as number) / acCurrentDivisor;
                            }

                            if (attr.totalActivePower !== undefined) {
                                ret.power = ((attr.totalActivePower as number) * 1000) / powerDivisor;
                            }

                            if (attr.totalApparentPower !== undefined) {
                                ret.power_apparent = ((attr.totalApparentPower as number) * 1000) / powerDivisor;
                            }

                            if (attr.acFrequency !== undefined) {
                                ret.ac_frequency = (attr.acFrequency as number) / acFrequencyDivisor;
                            }

                            if (attr.activePower !== undefined) {
                                ret.power_phase_a = ((attr.activePower as number) * 1000) / powerDivisor;
                            }

                            if (attr.activePowerPhB !== undefined) {
                                ret.power_phase_b = ((attr.activePowerPhB as number) * 1000) / powerDivisor;
                            }

                            if (attr.activePowerPhC !== undefined) {
                                ret.power_phase_c = ((attr.activePowerPhC as number) * 1000) / powerDivisor;
                            }
                            break;
                        }
                        case 1794: {
                            // seMetering
                            const divisor = attr.divisor as number;

                            if (attr.currentSummDelivered !== undefined) {
                                const val = attr.currentSummDelivered as number;
                                ret.energy = val / divisor;
                            }

                            if (attr["16652"] !== undefined) {
                                const val = attr["16652"] as number;
                                ret.energy_phase_a = val / divisor;
                            }

                            if (attr["16908"] !== undefined) {
                                const val = attr["16908"] as number;
                                ret.energy_phase_b = val / divisor;
                            }

                            if (attr["17164"] !== undefined) {
                                const val = attr["17164"] as number;
                                ret.energy_phase_c = val / divisor;
                            }

                            if (attr.powerFactor !== undefined) {
                                ret.power_factor = attr.powerFactor;
                            }

                            break;
                        }
                    }

                    break;
                }
                case 0xa3:
                    // Should handle this cluster as well
                    break;
            }

            if (rxAfterTx) {
                // Send Schneider specific ACK to make PowerTag happy
                // @ts-expect-error ignore
                const networkParameters = await msg.device.constructor.adapter.getNetworkParameters();

                await msg.endpoint.commandResponse(
                    "greenPower",
                    "response",
                    {
                        options: 0b000,
                        tempMaster: msg.data.gppNwkAddr,
                        tempMasterTx: networkParameters.channel - 11,
                        srcID: msg.data.srcID,
                        gpdCmd: 0xfe,
                        gpdPayload: {
                            commandID: 0xfe,
                            buffer: Buffer.alloc(1),
                        },
                    },
                    {
                        srcEndpoint: 242,
                        disableDefaultResponse: true,
                    },
                );
            }

            return ret;
        },
    } satisfies Fz.Converter<"greenPower", undefined, ["commandNotification", "commandCommissioningNotification"]>,
    wiser_device_info: {
        cluster: "wiserDeviceInfo",
        type: "attributeReport",
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            const data = msg.data.deviceInfo.split(",");
            if (data[0] === "ALG") {
                // TODO What is ALG
                const alg = data.slice(1);
                result.ALG = alg.join(",");
                result.occupied_heating_setpoint = Number.parseInt(alg[2], 10) / 10;
                result.local_temperature = Number.parseInt(alg[3], 10) / 10;
                result.pi_heating_demand = Number.parseInt(alg[9], 10);
            } else if (data[0] === "ADC") {
                // TODO What is ADC
                const adc = data.slice(1);
                result.ADC = adc.join(",");
                // TODO: should parseInt?
                result.occupied_heating_setpoint = Number.parseInt(adc[5], 10) / 100;
                result.local_temperature = Number.parseInt(adc[3], 10) / 10;
            } else if (data[0] === "UI") {
                if (data[1] === "BoostUp") {
                    result.boost = "Up";
                } else if (data[1] === "BoostDown") {
                    result.boost = "Down";
                } else {
                    result.boost = "None";
                }
            } else if (data[0] === "MOT") {
                // Info about the motor
                result.MOT = data[1];
            }
            return result;
        },
    } satisfies Fz.Converter<"wiserDeviceInfo", WiserDeviceInfo, "attributeReport">,
    wiser_lighting_ballast_configuration: {
        cluster: "lightingBallastCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result = fz.lighting_ballast_configuration.convert(model, msg, publish, options, meta) as KeyValueAny;
            if (result && msg.data.wiserControlMode !== undefined) {
                result.dimmer_mode = constants.wiserDimmerControlMode[msg.data.wiserControlMode];
            }
            return result;
        },
    } satisfies Fz.Converter<"lightingBallastCfg", SchneiderLightingBallastCfg, ["attributeReport", "readResponse"]>,
    wiser_smart_setpoint_command_client: {
        cluster: "hvacThermostat",
        type: ["commandWiserSmartSetSetpoint"],
        convert: (model, msg, publish, options, meta) => {
            const attribute: KeyValueAny = {};
            const result: KeyValueAny = {};

            // The UI client on the thermostat also updates the server, so no need to readback/send again on next sync.
            // This also ensures the next client read of setpoint is in sync with the latest commanded value.
            attribute.occupiedHeatingSetpoint = msg.data.setpoint;
            msg.endpoint.saveClusterAttributeKeyValue("hvacThermostat", attribute);
            result.occupied_heating_setpoint = msg.data.setpoint / 100.0;
            logger.debug(`received wiser setpoint command with value: '${msg.data.setpoint}'`, NS);
            return result;
        },
    } satisfies Fz.Converter<"hvacThermostat", SchneiderThermostatCluster, ["commandWiserSmartSetSetpoint"]>,
    wiser_smart_thermostat: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: async (model, msg, publish, options, meta) => {
            const result = fz.thermostat.convert(model, msg, publish, options, meta) as KeyValueAny;
            if (result) {
                if (msg.data.wiserSmartZoneMode !== undefined) {
                    const lookup: Record<number, string> = {1: "manual", 2: "schedule", 3: "energy_saver", 6: "holiday"};
                    result.zone_mode = lookup[msg.data.wiserSmartZoneMode];
                }
                if (msg.data.wiserSmartHactConfig !== undefined) {
                    const lookup: Record<number, string> = {0: "unconfigured", 128: "setpoint_switch", 130: "setpoint_fip", 131: "fip_fip"};
                    result.hact_config = lookup[msg.data.wiserSmartHactConfig as number];
                }
                if (msg.data.wiserSmartCurrentFilPiloteMode !== undefined) {
                    const lookup: Record<number, string> = {
                        0: "comfort",
                        1: "comfort_-1",
                        2: "comfort_-2",
                        3: "energy_saving",
                        4: "frost_protection",
                        5: "off",
                    };
                    result.fip_setting = lookup[msg.data.wiserSmartCurrentFilPiloteMode as number];
                }
                if (msg.data.wiserSmartValvePosition !== undefined) {
                    result.pi_heating_demand = msg.data.wiserSmartValvePosition;
                }
                if (msg.data.wiserSmartValveCalibrationStatus !== undefined) {
                    const lookup: Record<number, string> = {
                        0: "ongoing",
                        1: "successful",
                        2: "uncalibrated",
                        3: "failed_e1",
                        4: "failed_e2",
                        5: "failed_e3",
                    };
                    result.valve_calibration_status = lookup[msg.data.wiserSmartValveCalibrationStatus as number];
                }
                // Radiator thermostats command changes from UI, but report value periodically for sync,
                // force an update of the value if it doesn't match the current existing value
                if (
                    meta.device.modelID === "EH-ZB-VACT" &&
                    msg.data.occupiedHeatingSetpoint !== undefined &&
                    meta.state.occupied_heating_setpoint !== undefined
                ) {
                    if (result.occupied_heating_setpoint !== meta.state.occupied_heating_setpoint) {
                        const lookup: KeyValueAny = {manual: 1, schedule: 2, energy_saver: 3, holiday: 6};
                        const zonemodeNum = lookup[Number(meta.state.zone_mode)];
                        const setpoint =
                            Number((Math.round(Number((Number(meta.state.occupied_heating_setpoint) * 2).toFixed(1))) / 2).toFixed(1)) * 100;
                        const payload = {
                            operatingmode: 0,
                            zonemode: zonemodeNum,
                            setpoint: setpoint,
                            reserved: 0xff,
                        };
                        await msg.endpoint.command<"hvacThermostat", "wiserSmartSetSetpoint", SchneiderThermostatCluster>(
                            "hvacThermostat",
                            "wiserSmartSetSetpoint",
                            payload,
                            {
                                srcEndpoint: 11,
                                disableDefaultResponse: true,
                            },
                        );

                        logger.debug(
                            `syncing vact setpoint was: '${result.occupied_heating_setpoint}' now: '${meta.state.occupied_heating_setpoint}'`,
                            NS,
                        );
                    }
                } else {
                    publish(result);
                }
            }
        },
    } satisfies Fz.Converter<"hvacThermostat", SchneiderThermostatCluster, ["attributeReport", "readResponse"]>,
    wiser_smart_thermostat_client: {
        cluster: "hvacThermostat",
        type: "read",
        convert: async (model, msg, publish, options, meta: KeyValueAny) => {
            const response: KeyValueAny = {};
            if (msg.data.includes("wiserSmartZoneMode") || msg.data.includes(0xe010)) {
                // Zone Mode
                const lookup: KeyValueAny = {manual: 1, schedule: 2, energy_saver: 3, holiday: 6};
                const zonemodeNum = meta.state.zone_mode ? lookup[meta.state.zone_mode] : 1;
                response.wiserSmartZoneMode = {value: zonemodeNum};
                await msg.endpoint.readResponse(msg.cluster, msg.meta.zclTransactionSequenceNumber, response, {srcEndpoint: 11});
            }
        },
    } satisfies Fz.Converter<"hvacThermostat", SchneiderThermostatCluster, "read">,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["W564100"],
        model: "W564100",
        vendor: "Schneider Electric",
        description: "Motion sensor",
        extend: [
            m.onOff({powerOnBehavior: false}),
            // Illuminance doesn't require scale
            // https://github.com/Koenkk/zigbee2mqtt/issues/30580#issuecomment-3742159287
            m.illuminance({scale: (v) => v}),
            m.temperature(),
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_2"]}),
            m.commandsOnOff(),
            m.commandsLevelCtrl(),
        ],
    },
    {
        zigbeeModel: ["PUCK/SHUTTER/1"],
        model: "CCT5015-0001",
        vendor: "Schneider Electric",
        description: "Roller shutter module",
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.lift_duration],
        exposes: [
            e.cover_position(),
            e.numeric("lift_duration", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(300).withDescription("Duration of lift"),
        ],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ["NHPB/SHUTTER/1"],
        model: "S520567",
        vendor: "Schneider Electric",
        description: "Roller shutter",
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.lift_duration],
        exposes: [
            e.cover_position_tilt(),
            e.numeric("lift_duration", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(300).withDescription("Duration of lift"),
        ],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ["iTRV"],
        model: "WV704R0A0902",
        vendor: "Schneider Electric",
        description: "Wiser radiator thermostat",
        extend: [schneiderElectricExtend.addWiserDeviceInfoCluster()],
        fromZigbee: [fz.ignore_haDiagnostic, fz.thermostat, fz.battery, fz.hvac_user_interface, fzLocal.wiser_device_info],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_keypad_lockout],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3200}}},
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature(ea.STATE)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withPiHeatingDemand(),
            e.battery(),
            e.battery_voltage(),
            e.keypad_lockout().withAccess(ea.ALL),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genPowerCfg", "hvacThermostat", "haDiagnostic"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            // bind of hvacUserInterfaceCfg fails with 'Table Full', does this have any effect?
            await endpoint.configureReporting("hvacUserInterfaceCfg", [
                {
                    attribute: "keypadLockout",
                    reportableChange: 1,
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["U202DST600ZB"],
        model: "U202DST600ZB",
        vendor: "Schneider Electric",
        description: "EZinstall3 2 gang 2x300W dimmer module",
        extend: [m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}), m.light({endpointNames: ["l1", "l2"], configureReporting: true})],
    },
    {
        zigbeeModel: ["PUCK/DIMMER/1"],
        model: "CCT5010-0001",
        vendor: "Schneider Electric",
        description: "Micro module dimmer",
        ota: true,
        extend: [
            schneiderElectricExtend.addSchneiderLightingBallastCfgCluster(),
            m.light({powerOnBehavior: false, configureReporting: true, levelConfig: {}}),
        ],
        fromZigbee: [fzLocal.wiser_lighting_ballast_configuration],
        toZigbee: [tz.ballast_config, tzLocal.wiser_dimmer_mode],
        exposes: [
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        whiteLabel: [
            {vendor: "Elko", model: "EKO07090"},
            {vendor: "Schneider Electric", model: "550B1012"},
        ],
    },
    {
        zigbeeModel: ["PUCK/SWITCH/1"],
        model: "CCT5011-0001/CCT5011-0002/MEG5011-0001",
        vendor: "Schneider Electric",
        description: "Micro module switch",
        ota: true,
        extend: [m.onOff({powerOnBehavior: false})],
        whiteLabel: [{vendor: "Elko", model: "EKO07144"}],
    },
    {
        zigbeeModel: ["PUCK/UNIDIM/1"],
        model: "CCT5010-0003",
        vendor: "Schneider Electric",
        description: "Micro module dimmer with neutral lead",
        ota: true,
        extend: [schneiderElectricExtend.addSchneiderLightingBallastCfgCluster(), m.light({configureReporting: true, levelConfig: {}})],
        fromZigbee: [fzLocal.wiser_lighting_ballast_configuration],
        toZigbee: [tz.ballast_config, tzLocal.wiser_dimmer_mode],
        exposes: [
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
    },
    {
        zigbeeModel: ["CCTFR6730"],
        model: "CCTFR6730",
        vendor: "Schneider Electric",
        description: "Wiser power micromodule",
        whiteLabel: [{vendor: "Elko", model: "EKO20004"}],
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"}), m.identify()],
    },
    {
        zigbeeModel: ["NHROTARY/DIMMER/1"],
        model: "WDE002334",
        vendor: "Schneider Electric",
        description: "Rotary dimmer",
        extend: [schneiderElectricExtend.addSchneiderLightingBallastCfgCluster()],
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fzLocal.wiser_lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tzLocal.wiser_dimmer_mode],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ["NHROTARY/UNIDIM/1"],
        model: "NH3516A",
        vendor: "Schneider Electric",
        description: "Rotary dimmer",
        extend: [
            m.light({
                effect: false,
                powerOnBehavior: false,
                color: false,
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
            }),
            m.lightingBallast(),
            schneiderElectricExtend.dimmingMode(),
        ],
        whiteLabel: [
            {vendor: "Elko", model: "EKO07278"},
            {vendor: "Elko", model: "EKO07279"},
            {vendor: "Elko", model: "EKO07280"},
            {vendor: "Elko", model: "EKO07281"},
            {vendor: "Elko", model: "EKO30198"},
            {vendor: "Schneider", model: "WDE002961"},
            {vendor: "Schneider", model: "WDE003961"},
            {vendor: "Schneider", model: "WDE004961"},
        ],
    },
    {
        zigbeeModel: ["NHPB/UNIDIM/1"],
        model: "WDE002960",
        vendor: "Schneider Electric",
        description: "Push button dimmer",
        extend: [schneiderElectricExtend.addSchneiderLightingBallastCfgCluster()],
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fzLocal.wiser_lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tzLocal.wiser_dimmer_mode],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ["CCT593011_AS"],
        model: "550B1024",
        vendor: "Schneider Electric",
        description: "Temperature & humidity sensor",
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["msTemperatureMeasurement", "genPowerCfg", "msRelativeHumidity"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
    },
    {
        zigbeeModel: ["NHPB/DIMMER/1"],
        model: "WDE002386",
        vendor: "Schneider Electric",
        description: "Push button dimmer",
        extend: [
            m.light({
                effect: false,
                powerOnBehavior: true,
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
            }),
            m.lightingBallast(),
            m.identify(),
            schneiderElectricExtend.dimmingMode(),
            schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(),
            indicatorMode(),
        ],
        meta: {omitOptionalLevelParams: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ["CH/DIMMER/1"],
        model: "41EPBDWCLMZ/354PBDMBTZ",
        vendor: "Schneider Electric",
        description: "Wiser 40/300-Series Module Dimmer",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config],
        exposes: [
            e.light_brightness(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
        ],
        ota: true,
        extend: [schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(), indicatorMode("smart")],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
        endpoint: (device) => {
            return {smart: 21};
        },
    },
    {
        zigbeeModel: ["CH2AX/SWITCH/1"],
        model: "41E2PBSWMZ/356PB2MBTZ",
        vendor: "Schneider Electric",
        description: "Wiser 40/300-Series module switch 2AX",
        ota: true,
        extend: [schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(), m.onOff({powerOnBehavior: false}), indicatorMode("smart")],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
        endpoint: (device) => {
            return {smart: 21};
        },
    },
    {
        zigbeeModel: ["CH10AX/SWITCH/1"],
        model: "41E10PBSWMZ-VW",
        vendor: "Schneider Electric",
        description: "Wiser 40/300-Series module switch 10AX with ControlLink",
        ota: true,
        extend: [schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(), m.onOff({powerOnBehavior: false}), indicatorMode("smart")],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
        endpoint: (device) => {
            return {smart: 21};
        },
    },
    {
        zigbeeModel: ["CHFAN/SWITCH/1"],
        model: "41ECSFWMZ-VW",
        vendor: "Schneider Electric",
        description: "Wiser 40/300-Series Module AC Fan Controller",
        fromZigbee: [fz.fan],
        toZigbee: [tzLocal.fan_mode],
        exposes: [e.fan().withState("fan_state").withModes(["off", "low", "medium", "high", "on"])],
        ota: true,
        extend: [schneiderElectricExtend.addSchneiderFanSwitchConfigurationCluster(), fanIndicatorMode(), fanIndicatorOrientation()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(7);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacFanCtrl"]);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ["SMARTPLUG/1"],
        model: "CCT711119",
        vendor: "Schneider Electric",
        description: "Wiser smart plug",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power],
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET),
            e.energy(),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
    },
    {
        zigbeeModel: ["U201DST600ZB"],
        model: "U201DST600ZB",
        vendor: "Schneider Electric",
        description: "EZinstall3 1 gang 550W dimmer module",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["U201SRY2KWZB"],
        model: "U201SRY2KWZB",
        vendor: "Schneider Electric",
        description: "Ulti 240V 9.1 A 1 gang relay switch impress switch module, amber LED",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["CCTFR6100"],
        model: "CCTFR6100Z3",
        vendor: "Schneider Electric",
        description: "Wiser radiator thermostat",
        extend: [schneiderElectricExtend.addWiserDeviceInfoCluster()],
        fromZigbee: [fz.ignore_haDiagnostic, fz.thermostat, fz.battery, fz.hvac_user_interface, fzLocal.wiser_device_info],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_keypad_lockout],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 7, 30, 1)
                .withLocalTemperature(ea.STATE)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withPiHeatingDemand(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genPowerCfg", "hvacThermostat", "haDiagnostic"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            // bind of hvacUserInterfaceCfg fails with 'Table Full', does this have any effect?
            await endpoint.configureReporting("hvacUserInterfaceCfg", [
                {
                    attribute: "keypadLockout",
                    reportableChange: 1,
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["NHPB/SWITCH/1"],
        model: "S520530W",
        vendor: "Schneider Electric",
        description: "Odace connectable relay switch 10A",
        extend: [m.onOff({powerOnBehavior: false}), m.commandsOnOff()],
    },
    {
        zigbeeModel: ["U202SRY2KWZB"],
        model: "U202SRY2KWZB",
        vendor: "Schneider Electric",
        description: "Ulti 240V 9.1 A 2 gangs relay switch impress switch module, amber LED",
        extend: [m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["1GANG/SHUTTER/1"],
        model: "MEG5113-0300/MEG5165-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5165 PlusLink Shutter insert with Merten Wiser System M Push Button (1fold)",
        fromZigbee: [fz.cover_position_tilt, fz.command_cover_close, fz.command_cover_open, fz.command_cover_stop],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.lift_duration],
        exposes: [
            e.cover_position_tilt(),
            e.numeric("lift_duration", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(300).withDescription("Duration of lift"),
        ],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ["1GANG/DIMMER/1", "1GANG/DALI/1"],
        model: "MEG5116-0300/MEG5171-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5171 PlusLink Dimmer insert with Merten Wiser System M Push Button (1fold)",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fzLocal.wiser_lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tzLocal.wiser_dimmer_mode],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        extend: [
            schneiderElectricExtend.addSchneiderLightingBallastCfgCluster(),
            schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(),
            indicatorMode(),
            switchActions(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ["2GANG/DIMMER/1"],
        model: "MEG5126-0300/MEG5171-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5171 PlusLink Dimmer insert with Merten Wiser System M Push Button (2fold)",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fzLocal.wiser_lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tzLocal.wiser_dimmer_mode],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        extend: [
            schneiderElectricExtend.addSchneiderLightingBallastCfgCluster(),
            schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(),
            indicatorMode("right"),
            indicatorMode("left"),
            switchActions("right"),
            switchActions("left"),
        ],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
        endpoint: (device) => {
            return {right: 21, left: 22};
        },
    },
    {
        zigbeeModel: ["2GANG/DIMMER/2"],
        model: "MEG5126-0300/MEG5172-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5172 PlusLink Dimmer insert with Merten Wiser System M Push Button (2fold)",
        fromZigbee: [fzLocal.wiser_lighting_ballast_configuration],
        toZigbee: [tz.ballast_config, tzLocal.wiser_dimmer_mode],
        exposes: [
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        extend: [
            schneiderElectricExtend.addSchneiderLightingBallastCfgCluster(),
            schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(),
            m.deviceEndpoints({endpoints: {left: 4, right: 3, left_btn: 22, right_btn: 21}}),
            m.light({endpointNames: ["left", "right"], configureReporting: true}),
            switchActions("left_btn"),
            switchActions("right_btn"),
            indicatorMode("left_btn"),
        ],
    },
    {
        zigbeeModel: ["1GANG/SWITCH/1"],
        model: "MEG5161-0000",
        vendor: "Schneider Electric",
        description: "Merten PlusLink relay insert with Merten Wiser system M push button (1fold)",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["LK Switch"],
        model: "545D6514",
        vendor: "Schneider Electric",
        description: "LK FUGA wiser wireless double relay",
        meta: {multiEndpoint: true},
        fromZigbee: [fz.on_off, fz.command_on, fz.command_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {l1: 1, l2: 2, s1: 21, s2: 22, s3: 23, s4: 24};
        },
        extend: [
            schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(),
            indicatorMode("s1"),
            indicatorMode("s2"),
            indicatorMode("s3"),
            indicatorMode("s4"),
            switchActions("s1"),
            switchActions("s2"),
            switchActions("s3"),
            switchActions("s4"),
        ],
        exposes: [e.switch().withEndpoint("l1"), e.switch().withEndpoint("l2"), e.action(["on_s*", "off_s*"])],
        configure: (device, coordinatorEndpoint) => {
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(6) || ep.ID <= 2) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genOnOff"]);
                    if (ep.ID <= 2) {
                        await reporting.onOff(ep);
                    }
                }
            });
        },
    },
    {
        zigbeeModel: ["LK Dimmer"],
        model: "545D6102",
        vendor: "Schneider Electric",
        description: "LK FUGA wiser wireless dimmer",
        fromZigbee: [fz.schneider_lighting_ballast_configuration, fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [tz.ballast_config, tz.schneider_dimmer_mode],
        endpoint: (device) => {
            return {l1: 3, s1: 21, s2: 22, s3: 23, s4: 24};
        },
        meta: {multiEndpoint: true},
        extend: [
            m.light({endpointNames: ["l1"], configureReporting: true, levelConfig: {}}),
            schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(),
            indicatorMode("s1"),
            indicatorMode("s2"),
            indicatorMode("s3"),
            indicatorMode("s4"),
            switchActions("s1"),
            switchActions("s2"),
            switchActions("s3"),
            switchActions("s4"),
        ],
        exposes: [
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast")
                .withEndpoint("l1"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast")
                .withEndpoint("l1"),
            e.enum("dimmer_mode", ea.ALL, ["RC", "RL"]).withDescription("Controls Capacitive or Inductive Dimming Mode").withEndpoint("l1"),
            e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop", "recall_*"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // Configure the dimmer actuator endpoint
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["lightingBallastCfg"]);
            // Configure the four front switches
            device.endpoints.forEach(async (ep) => {
                if (21 <= ep.ID && ep.ID <= 22) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
                } else if (23 <= ep.ID && ep.ID <= 24) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genScenes"]);
                }
            });
        },
        onEvent: (event) => {
            // Record the factory default bindings for easy removal/change after deviceInterview
            if (event.type === "deviceInterview") {
                const dimmer = event.data.device.getEndpoint(3);
                event.data.device.endpoints.forEach((ep) => {
                    if (21 <= ep.ID && ep.ID <= 22) {
                        ep.addBinding("genOnOff", dimmer);
                        ep.addBinding("genLevelCtrl", dimmer);
                    }
                    if (23 <= ep.ID && ep.ID <= 24) {
                        ep.addBinding("genScenes", dimmer);
                    }
                });
            }
        },
    },
    {
        zigbeeModel: ["FLS/AIRLINK/4"],
        model: "550D6001",
        vendor: "Schneider Electric",
        description: "LK FUGA wiser wireless battery 4 button switch",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        endpoint: (device) => {
            return {top: 21, bottom: 22};
        },
        whiteLabel: [{vendor: "Elko", model: "EKO07117"}],
        meta: {multiEndpoint: true},
        exposes: [
            e.action([
                "on_top",
                "off_top",
                "on_bottom",
                "off_bottom",
                "brightness_move_up_top",
                "brightness_stop_top",
                "brightness_move_down_top",
                "brightness_stop_top",
                "brightness_move_up_bottom",
                "brightness_stop_bottom",
                "brightness_move_down_bottom",
                "brightness_stop_bottom",
            ]),
            e.battery(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // When in 2-gang operation mode, unit operates out of endpoints 21 and 22, otherwise just 21
            const topButtonsEndpoint = device.getEndpoint(21);
            await reporting.bind(topButtonsEndpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(topButtonsEndpoint);
            const bottomButtonsEndpoint = device.getEndpoint(22);
            await reporting.bind(bottomButtonsEndpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
        },
    },
    {
        fingerprint: [
            {modelID: "CCTFR6700", manufacturerName: "Schneider Electric"},
            {modelID: "CCTFR6710", manufacturerName: "Schneider Electric"},
        ],
        model: "CCTFR6700",
        vendor: "Schneider Electric",
        description: "Heating thermostat",
        whiteLabel: [{model: "CCTFR6710", fingerprint: [{modelID: "CCTFR6710"}]}],
        fromZigbee: [fz.thermostat, fz.metering],
        toZigbee: [
            tz.schneider_temperature_measured_value,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.schneider_temperature_measured_value,
        ],
        extend: [schneiderElectricExtend.addHeatingCoolingOutputClusterServer(), schneiderElectricExtend.pilotMode()],
        exposes: [
            e.power(),
            e.energy(),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withPiHeatingDemand(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["seMetering"]);
            await reporting.instantaneousDemand(endpoint2, {min: 0, max: 60, change: 1});
            await reporting.currentSummDelivered(endpoint2, {min: 0, max: 60, change: 1});
        },
    },
    {
        fingerprint: [{modelID: "Thermostat", manufacturerName: "Schneider Electric"}],
        model: "CCTFR6400",
        vendor: "Schneider Electric",
        description: "Temperature/Humidity measurement with thermostat interface",
        extend: [schneiderElectricExtend.customThermostatCluster()],
        fromZigbee: [fz.battery, fz.schneider_temperature, fz.humidity, fz.thermostat, fzLocal.schneider_ui_action],
        toZigbee: [
            tz.schneider_thermostat_system_mode,
            tz.schneider_thermostat_occupied_heating_setpoint,
            tz.schneider_thermostat_control_sequence_of_operation,
            tz.schneider_thermostat_pi_heating_demand,
            tz.schneider_thermostat_keypad_lockout,
        ],
        exposes: [
            e.keypad_lockout().withAccess(ea.STATE_SET),
            e.humidity(),
            e.battery(),
            e.battery_voltage(),
            e.action(["screen_sleep", "screen_wake", "button_press_plus_down", "button_press_center_down", "button_press_minus_down"]),
            e.climate().withSetpoint("occupied_heating_setpoint", 4, 30, 0.5, ea.SET).withLocalTemperature(ea.STATE).withPiHeatingDemand(ea.SET),
        ],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat", "msTemperatureMeasurement", "msRelativeHumidity"]);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1);
            endpoint1.saveClusterAttributeKeyValue("genBasic", {zclVersion: 3});
            endpoint1.saveClusterAttributeKeyValue("hvacThermostat", {schneiderWiserSpecific: 1, systemMode: 4, ctrlSeqeOfOper: 2});
            endpoint1.saveClusterAttributeKeyValue("hvacUserInterfaceCfg", {keypadLockout: 0});
        },
    },
    {
        zigbeeModel: ["EH-ZB-SPD-V2"],
        model: "EER40030",
        vendor: "Schneider Electric",
        description: "Zigbee smart plug with power meter",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            const options = {disableDefaultResponse: true};
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await endpoint.write("genBasic", {57424: {value: 1, type: 0x10}}, options);
        },
    },
    {
        zigbeeModel: ["EH-ZB-LMACT"],
        model: "EER42000",
        vendor: "Schneider Electric",
        description: "Zigbee load actuator with power meter",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ["2GANG/SWITCH/2", "2GANG/SWITCH/1"],
        model: "MEG5126-0300",
        vendor: "Schneider Electric",
        description: "Merten MEG5165 PlusLink relais insert with Merten Wiser System M push button (2fold)",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"], powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["EH-ZB-VACT"],
        model: "EER53000",
        vendor: "Schneider Electric",
        description: "Wiser radiator thermostat (VACT)",
        extend: [schneiderElectricExtend.customThermostatCluster()],
        fromZigbee: [
            fz.battery,
            fz.hvac_user_interface,
            fzLocal.wiser_smart_thermostat,
            fzLocal.wiser_smart_thermostat_client,
            fzLocal.wiser_smart_setpoint_command_client,
        ],
        toZigbee: [
            tz.wiser_sed_thermostat_local_temperature_calibration,
            tz.wiser_sed_occupied_heating_setpoint,
            tz.wiser_sed_thermostat_keypad_lockout,
            tzLocal.wiser_vact_calibrate_valve,
            tz.wiser_sed_zone_mode,
        ],
        exposes: [
            e.battery(),
            e.binary("keypad_lockout", ea.STATE_SET, "lock1", "unlock").withDescription("Enables/disables physical input on the device"),
            e.binary("calibrate_valve", ea.STATE_SET, "calibrate", "idle").withDescription("Calibrates valve on next wakeup"),
            e.enum("valve_calibration_status", ea.STATE, ["ongoing", "successful", "uncalibrated", "failed_e1", "failed_e2", "failed_e3"]),
            e.enum("zone_mode", ea.STATE_SET, ["manual", "schedule", "energy_saver", "holiday"]).withDescription("Icon shown on device displays"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 7, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-12.8, 12.7, 0.1, ea.STATE_SET)
                .withPiHeatingDemand(),
        ],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            // Insert default values for client requested attributes
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {minHeatSetpointLimit: 7 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {maxHeatSetpointLimit: 30 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 20 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {systemMode: 4});
            // VACT needs binding to endpoint 11 due to some hardcoding in the device
            const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(11);
            const binds = ["genBasic", "genPowerCfg", "hvacThermostat"];
            await reporting.bind(endpoint, coordinatorEndpointB, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await endpoint.configureReporting("hvacUserInterfaceCfg", [
                {
                    attribute: "keypadLockout",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 1,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["EH-ZB-RTS"],
        model: "EER51000",
        vendor: "Schneider Electric",
        description: "Wiser thermostat (RTS)",
        extend: [schneiderElectricExtend.customThermostatCluster()],
        fromZigbee: [
            fz.battery,
            fz.hvac_user_interface,
            fzLocal.wiser_smart_thermostat_client,
            fzLocal.wiser_smart_setpoint_command_client,
            fz.schneider_temperature,
        ],
        toZigbee: [tz.wiser_sed_zone_mode, tz.wiser_sed_occupied_heating_setpoint],
        exposes: [
            e.battery(),
            e.climate().withSetpoint("occupied_heating_setpoint", 7, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE),
            e.enum("zone_mode", ea.STATE_SET, ["manual", "schedule", "energy_saver", "holiday"]).withDescription("Icon shown on device displays"),
        ],
        meta: {battery: {voltageToPercentage: {min: 3000, max: 4200}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            // Insert default values for client requested attributes
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {minHeatSetpointLimit: 7 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {maxHeatSetpointLimit: 30 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 20 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {systemMode: 4});
            // RTS needs binding to endpoint 11 due to some hardcoding in the device
            const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(11);
            const binds = [
                "genBasic",
                "genPowerCfg",
                "genIdentify",
                "genAlarms",
                "genOta",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msTemperatureMeasurement",
            ];
            await reporting.bind(endpoint, coordinatorEndpointB, binds);
            // Battery reports without config once a day, do the first read manually
            await endpoint.read("genPowerCfg", ["batteryVoltage"]);
            await endpoint.configureReporting("msTemperatureMeasurement", [
                {
                    attribute: "measuredValue",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.MINUTES_10,
                    reportableChange: 50,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["EH-ZB-HACT"],
        model: "EER50000",
        vendor: "Schneider Electric",
        description: "Wiser H-Relay (HACT)",
        extend: [schneiderElectricExtend.customThermostatCluster()],
        fromZigbee: [fzLocal.wiser_smart_thermostat, fz.metering, fz.identify],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tzLocal.wiser_fip_setting,
            tzLocal.wiser_hact_config,
            tzLocal.wiser_zone_mode,
            tz.identify,
        ],
        exposes: [
            e.climate().withSetpoint("occupied_heating_setpoint", 7, 30, 0.5).withLocalTemperature(),
            e.power(),
            e.energy(),
            e.enum("identify", ea.SET, ["0", "30", "60", "600", "900"]).withDescription("Flash green tag for x seconds"),
            e.enum("zone_mode", ea.ALL, ["manual", "schedule", "energy_saver", "holiday"]),
            e
                .enum("hact_config", ea.ALL, ["unconfigured", "setpoint_switch", "setpoint_fip", "fip_fip"])
                .withDescription("Input (command) and output (control) behavior of actuator"),
            e
                .enum("fip_setting", ea.ALL, ["comfort", "comfort_-1", "comfort_-2", "energy_saving", "frost_protection", "off"])
                .withDescription("Output signal when operating in fil pilote mode (fip_fip)"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            const binds = ["genBasic", "genPowerCfg", "hvacThermostat", "msTemperatureMeasurement", "seMetering"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ["FLS/SYSTEM-M/4"],
        model: "WDE002906/MEG5001-0300",
        vendor: "Schneider Electric",
        description: "Wiser wireless switch 1-gang or 2-gang",
        extend: [
            m.battery(),
            m.deviceEndpoints({endpoints: {right: 21, left: 22}}),
            schneiderElectricExtend.addSchneiderLightSwitchConfigurationCluster(),
            switchActions("right"),
            switchActions("left"),
            m.commandsOnOff({endpointNames: ["right", "left"]}),
            m.commandsLevelCtrl({endpointNames: ["right", "left"]}),
        ],
    },
    {
        zigbeeModel: ["SOCKET/OUTLET/2"],
        model: "EKO09738",
        vendor: "Schneider Electric",
        description: "Zigbee smart socket with power meter",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
            e.current(),
            e.voltage(),
        ],
        whiteLabel: [{vendor: "Elko", model: "EKO09738", description: "SmartStikk"}],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor", "acCurrentMultiplier"]);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ["SOCKET/OUTLET/1"],
        model: "EKO09716",
        vendor: "Schneider Electric",
        description: "Zigbee smart socket with power meter",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
            e.current(),
            e.voltage(),
        ],
        extend: [schneiderElectricExtend.addSchneiderFanSwitchConfigurationCluster(), socketIndicatorMode()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor", "acCurrentMultiplier"]);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ["LK/OUTLET/1"],
        model: "545D6115",
        vendor: "Schneider Electric",
        description: "LK FUGA wiser wireless socket outlet",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        extend: [schneiderElectricExtend.addSchneiderFanSwitchConfigurationCluster(), socketIndicatorMode()],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.current(),
            e.voltage(),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor", "acCurrentMultiplier"]);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
    },
    {
        zigbeeModel: ["EVSCKT/OUTLET/1"],
        model: "MUR36014",
        vendor: "Schneider Electric",
        description: "Mureva EVlink Smart socket outlet",
        extend: [
            schneiderElectricExtend.addSchneiderFanSwitchConfigurationCluster(),
            m.onOff(),
            m.electricityMeter({
                // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
                voltage: {multiplier: 1, divisor: 1},
                // power is provided by 'seMetering' instead of "haElectricalMeasurement"
                power: {cluster: "metering"},
            }),
            evlinkIndicatorMode(),
        ],
    },
    {
        zigbeeModel: ["NHMOTION/SWITCH/1"],
        model: "NH3526",
        vendor: "Schneider Electric",
        description: "Motion sensor with switch",
        extend: [
            m.onOff({
                powerOnBehavior: false,
                configureReporting: true,
            }),
            m.illuminance(),
            m.occupancy({
                pirConfig: ["otu_delay"],
            }),
            schneiderElectricExtend.addOccupancyConfigurationCluster(),
            schneiderElectricExtend.occupancyConfiguration(),
        ],
        whiteLabel: [
            {vendor: "Elko", model: "EKO06988"},
            {vendor: "Elko", model: "EKO06989"},
            {vendor: "Elko", model: "EKO06990"},
            {vendor: "Elko", model: "EKO06991"},
            {vendor: "LK", model: "545D6306"},
        ],
    },
    {
        zigbeeModel: ["CCT595011_AS"],
        model: "CCT595011",
        vendor: "Schneider Electric",
        description: "Wiser motion sensor",
        fromZigbee: [fz.battery, fz.ias_enroll, fz.ias_occupancy_only_alarm_2],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.occupancy()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["CH/Socket/2"],
        model: "3025CSGZ",
        vendor: "Schneider Electric",
        description: "Dual connected smart socket",
        ota: true,
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["CCT592011_AS"],
        model: "CCT592011",
        vendor: "Schneider Electric",
        description: "Wiser water leakage sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.battery_low(), e.water_leak(), e.tamper()],
    },
    {
        fingerprint: [{modelID: "GreenPower_254", ieeeAddr: /^0x00000000e.......$/}],
        model: "A9MEM1570",
        vendor: "Schneider Electric",
        description: "PowerTag power sensor",
        fromZigbee: [fzLocal.schneider_powertag],
        toZigbee: [],
        exposes: [
            e.power(),
            e.power_apparent(),
            e.numeric("power_phase_a", ea.STATE).withUnit("W").withDescription("Instantaneous measured power on phase A"),
            e.numeric("power_phase_b", ea.STATE).withUnit("W").withDescription("Instantaneous measured power on phase B"),
            e.numeric("power_phase_c", ea.STATE).withUnit("W").withDescription("Instantaneous measured power on phase C"),
            e.power_factor(),
            e.energy(),
            e.numeric("energy_phase_a", ea.STATE).withUnit("kWh").withDescription("Sum of consumed energy on phase A"),
            e.numeric("energy_phase_b", ea.STATE).withUnit("kWh").withDescription("Sum of consumed energy on phase B"),
            e.numeric("energy_phase_c", ea.STATE).withUnit("kWh").withDescription("Sum of consumed energy on phase C"),
            e.ac_frequency(),
            e.numeric("voltage_phase_a", ea.STATE).withUnit("V").withDescription("Measured electrical potential value on phase A"),
            e.numeric("voltage_phase_b", ea.STATE).withUnit("V").withDescription("Measured electrical potential value on phase B"),
            e.numeric("voltage_phase_c", ea.STATE).withUnit("V").withDescription("Measured electrical potential value on phase C"),
            e.numeric("voltage_phase_ab", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase A and B"),
            e.numeric("voltage_phase_bc", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase B and C"),
            e.numeric("voltage_phase_ca", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase C and A"),
            e.numeric("current_phase_a", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase A"),
            e.numeric("current_phase_b", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase B"),
            e.numeric("current_phase_c", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase C"),
        ],
    },
    {
        zigbeeModel: ["W599001", "W599501", "755WSA"],
        model: "W599001",
        vendor: "Schneider Electric",
        description: "Wiser smoke alarm",
        extend: [
            m.battery({voltage: true, voltageReporting: true}),
            m.temperature(),
            m.iasZoneAlarm({
                zoneType: "smoke",
                zoneAttributes: ["alarm_1", "tamper", "battery_low", "test"],
                zoneStatusReporting: true,
                manufacturerZoneAttributes: [
                    {
                        bit: 1,
                        name: "heat",
                        valueOn: true,
                        valueOff: false,
                        description: "Indicates whether the device has detected high temperature",
                    },
                    {
                        bit: 11,
                        name: "hush",
                        valueOn: true,
                        valueOff: false,
                        description: "Indicates whether the device is in hush mode",
                        entityCategory: "diagnostic",
                    },
                ],
            }),
        ],
        whiteLabel: [
            {vendor: "Schneider Electric", model: "W599501", description: "Wiser smoke alarm", fingerprint: [{modelID: "W599501"}]},
            {vendor: "Schneider Electric", model: "755WSA", description: "Clipsal Wiser smoke alarm", fingerprint: [{modelID: "755WSA"}]},
        ],
    },
    {
        zigbeeModel: ["CCT591011_AS"],
        model: "CCT591011_AS",
        vendor: "Schneider Electric",
        description: "Wiser window/door sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.battery_low(), e.contact(), e.tamper()],
    },
    {
        zigbeeModel: ["EKO07259"],
        model: "EKO07259",
        vendor: "Schneider Electric",
        description: "Smart thermostat",
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        extend: [
            schneiderElectricExtend.thermostatWithPower({
                localTemperature: {
                    values: {
                        description: "The temperature measured by the selected sensor (see 'Local temperature source select', Ambient or External).",
                    },
                },
                setpoints: {values: {occupiedHeatingSetpoint: {min: 4, max: 40, step: 0.5}}},
                setpointsLimit: {
                    maxHeatSetpointLimit: {min: 4, max: 40, step: 0.5},
                    minHeatSetpointLimit: {min: 4, max: 40, step: 0.5},
                },
                systemMode: {values: ["off", "heat"]},
                piHeatingDemand: {values: true},
                ctrlSeqeOfOper: {values: ["cooling_only", "heating_only"]},
            }),
            m.electricityMeter({
                cluster: "metering",
                voltage: false,
                current: false,
                configureReporting: true,
                energy: {divisor: 1000, multiplier: 1},
            }),
            schneiderElectricExtend.customMeteringCluster(),
            schneiderElectricExtend.fixedLoadDemand(),
            schneiderElectricExtend.addHvacUserInterfaceCfgCustomAttributes(),
            schneiderElectricExtend.displayBrightnessActive(),
            schneiderElectricExtend.displayBrightnessInactive(),
            schneiderElectricExtend.displayActiveTimeout(),
            schneiderElectricExtend.customThermostatCluster(),
            schneiderElectricExtend.localTemperatureSourceSelect(),
            schneiderElectricExtend.controlType(),
            schneiderElectricExtend.controlStatus(),
            schneiderElectricExtend.thermostatApplication(),
            schneiderElectricExtend.heatingEmitter(),
            schneiderElectricExtend.addHeatingCoolingOutputClusterServer(),
            schneiderElectricExtend.heatingOutputMode({
                description:
                    "On devices with alternate heating output types, this selects which should be used to control the heating unit. This attribute is (mistakenly) also called pilot_mode on some devices.",
                lookup: {Disabled: 0, Relay: 1},
            }),
            schneiderElectricExtend.customTemperatureMeasurementCluster(),
            m.deviceEndpoints({
                endpoints: {floor: 3},
            }),
            schneiderElectricExtend.sensorCorrection({
                endpointNames: ["floor"],
            }),
            schneiderElectricExtend.temperatureSensorType({
                endpointName: "floor",
            }),
            m.enumLookup({
                name: "temperature_display_mode",
                lookup: {celsius: 0},
                cluster: "hvacUserInterfaceCfg",
                attribute: "tempDisplayMode",
                description: "The unit of the temperature displayed on the device screen. Celsius is the only supported unit.",
                entityCategory: "config",
            }),
            m.binary({
                name: "child_lock",
                valueOn: ["LOCK", 1],
                valueOff: ["UNLOCK", 0],
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                description: "Enables/disables physical input on the device",
                access: "ALL",
                reporting: {min: 0, max: 3600, change: 0},
            }),
            schneiderElectricExtend.addWiserDeviceInfoCluster(),
        ],
    },
    {
        zigbeeModel: ["WDE002497"],
        model: "WDE002497",
        vendor: "Schneider Electric",
        description: "Smart thermostat",
        extend: [
            schneiderElectricExtend.thermostatWithPower({
                localTemperature: {
                    values: {
                        description: "The temperature measured by the selected sensor (see 'Local temperature source select', Ambient or External).",
                    },
                },
                setpoints: {values: {occupiedHeatingSetpoint: {min: 4, max: 40, step: 0.5}}},
                setpointsLimit: {
                    maxHeatSetpointLimit: {min: 4, max: 40, step: 0.5},
                    minHeatSetpointLimit: {min: 4, max: 40, step: 0.5},
                },
                systemMode: {values: ["off", "heat"]},
                piHeatingDemand: {values: true},
                ctrlSeqeOfOper: {values: ["cooling_only", "heating_only"]},
            }),
            m.electricityMeter({
                cluster: "metering",
                voltage: false,
                current: false,
                configureReporting: true,
                energy: {divisor: 1000, multiplier: 1},
            }),
            schneiderElectricExtend.customMeteringCluster(),
            schneiderElectricExtend.fixedLoadDemand(),
            schneiderElectricExtend.addHvacUserInterfaceCfgCustomAttributes(),
            schneiderElectricExtend.displayBrightnessActive(),
            schneiderElectricExtend.displayBrightnessInactive(),
            schneiderElectricExtend.displayActiveTimeout(),
            schneiderElectricExtend.customThermostatCluster(),
            schneiderElectricExtend.localTemperatureSourceSelect(),
            schneiderElectricExtend.controlType(),
            schneiderElectricExtend.controlStatus(),
            schneiderElectricExtend.thermostatApplication(),
            schneiderElectricExtend.heatingEmitter(),
            schneiderElectricExtend.addHeatingCoolingOutputClusterServer(),
            schneiderElectricExtend.heatingOutputMode({
                description:
                    "On devices with alternate heating output types, this selects which should be used to control the heating unit. This attribute is (mistakenly) also called pilot_mode on some devices.",
                lookup: {Disabled: 0, Relay: 1},
            }),
            schneiderElectricExtend.customTemperatureMeasurementCluster(),
            m.deviceEndpoints({
                endpoints: {floor: 3},
            }),
            schneiderElectricExtend.sensorCorrection({
                endpointNames: ["floor"],
            }),
            schneiderElectricExtend.temperatureSensorType({
                endpointName: "floor",
            }),
            m.enumLookup({
                name: "temperature_display_mode",
                lookup: {celsius: 0},
                cluster: "hvacUserInterfaceCfg",
                attribute: "tempDisplayMode",
                description: "The unit of the temperature displayed on the device screen. Celsius is the only supported unit.",
                entityCategory: "config",
            }),
            m.binary({
                name: "child_lock",
                valueOn: ["LOCK", 1],
                valueOff: ["UNLOCK", 0],
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                description: "Enables/disables physical input on the device",
                access: "ALL",
                reporting: {min: 0, max: 3600, change: 0},
            }),
            schneiderElectricExtend.addWiserDeviceInfoCluster(),
        ],
    },
    {
        zigbeeModel: ["WDE011680"],
        model: "WDE011680",
        vendor: "Schneider Electric",
        description: "Smart thermostat",
        fromZigbee: [stelpro.fzLocal.stelpro_thermostat, fz.metering, fzLocal.wiser_device_info, fz.hvac_user_interface, fz.temperature],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tz.thermostat_control_sequence_of_operation,
            tz.schneider_thermostat_keypad_lockout,
            tz.thermostat_temperature_display_mode,
        ],
        extend: [
            schneiderElectricExtend.addWiserDeviceInfoCluster(),
            schneiderElectricExtend.addHeatingCoolingOutputClusterServer(),
            schneiderElectricExtend.pilotMode(),
        ],
        exposes: [
            e.binary("keypad_lockout", ea.STATE_SET, "lock1", "unlock").withDescription("Enables/disables physical input on the device"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"])
                .withPiHeatingDemand(),
            e.temperature(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            await reporting.temperature(endpoint2);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout", "tempDisplayMode"]);
        },
    },
    {
        zigbeeModel: ["2GANG/ESWITCH/2"],
        model: "MEG5126-0300_MEG5152-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5152 switch insert (2fold) with Merten System M push button (2fold)",
        extend: [
            m.deviceEndpoints({endpoints: {left: 1, right: 2, left_sw: 21, right_sw: 22}}),
            m.identify(),
            m.onOff({powerOnBehavior: false, endpointNames: ["left", "right"]}),
            m.commandsOnOff({endpointNames: ["left_sw", "right_sw"]}),
        ],
    },
    {
        zigbeeModel: ["1GANG/SWITCH/2"],
        model: "MEG5116-0300_MEG5162-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5162 switch insert (2fold) with Merten System M push button (1fold)",
        extend: [
            m.deviceEndpoints({endpoints: {left: 1, right: 2, left_sw: 21}}),
            m.identify(),
            m.onOff({powerOnBehavior: false, endpointNames: ["left", "right"]}),
            m.commandsOnOff({endpointNames: ["left_sw"]}),
        ],
    },
    {
        zigbeeModel: ["1GANG/ESWITCH/1"],
        model: "MEG5116-0300_MEG5151-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5151 switch insert with Merten System M push button (1fold)",
        extend: [
            m.deviceEndpoints({endpoints: {switch: 1, switch_sw: 21}}),
            m.identify(),
            m.onOff({powerOnBehavior: false}),
            m.commandsOnOff({endpointNames: ["switch_sw"]}),
        ],
    },
    {
        zigbeeModel: ["MEG5779"],
        model: "MEG5779",
        vendor: "Schneider Electric",
        description: "Merten Connected Room Temperature Controller",
        fromZigbee: [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.pIHeatingDemand !== undefined) {
                        return {running_state: msg.data.pIHeatingDemand > 0 ? "heat" : "idle"};
                    }
                    if (msg.data.pICoolingDemand !== undefined) {
                        return {running_state: msg.data.pICoolingDemand > 0 ? "cool" : "idle"};
                    }
                },
            } satisfies Fz.Converter<"hvacThermostat", SchneiderThermostatCluster, ["attributeReport", "readResponse"]>,
        ],
        extend: [
            m.thermostat({
                setpoints: {
                    values: {
                        occupiedHeatingSetpoint: {min: 4, max: 30, step: 0.5},
                        unoccupiedHeatingSetpoint: {min: 4, max: 30, step: 0.5},
                        occupiedCoolingSetpoint: {min: 4, max: 30, step: 0.5},
                        unoccupiedCoolingSetpoint: {min: 4, max: 30, step: 0.5},
                    },
                },
                setpointsLimit: {
                    maxHeatSetpointLimit: {min: 4, max: 30, step: 0.5},
                    minHeatSetpointLimit: {min: 4, max: 30, step: 0.5},
                    maxCoolSetpointLimit: {min: 4, max: 30, step: 0.5},
                    minCoolSetpointLimit: {min: 4, max: 30, step: 0.5},
                },
                systemMode: {
                    values: ["off", "heat", "cool"],
                },
                runningState: {
                    values: ["idle", "heat", "cool"],
                    configure: {reporting: false},
                },
                piHeatingDemand: {
                    values: ea.ALL,
                },
            }),
            schneiderElectricExtend.addHvacUserInterfaceCfgCustomAttributes(),
            schneiderElectricExtend.displayBrightnessActive(),
            schneiderElectricExtend.displayBrightnessInactive(),
            schneiderElectricExtend.displayActiveTimeout(),
            m.enumLookup({
                name: "temperature_display_mode",
                lookup: {celsius: 0, fahrenheit: 1},
                cluster: "hvacUserInterfaceCfg",
                attribute: "tempDisplayMode",
                description: "The unit of the temperature displayed on the device screen.",
            }),
            m.enumLookup({
                name: "keypadLockout",
                lookup: {unlock: 0, lock1: 1},
                cluster: "hvacUserInterfaceCfg",
                attribute: "keypadLockout",
                description: "Enables/disables physical input on the device.",
            }),
            schneiderElectricExtend.customThermostatCluster(),
            schneiderElectricExtend.thermostatApplication(),
            schneiderElectricExtend.heatingFuel(),
            schneiderElectricExtend.heatTransferMedium(),
            schneiderElectricExtend.heatingEmitter(),
        ],
    },
    {
        zigbeeModel: ["E8331DST300ZB"],
        model: "E8331DST300ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 1G dimmer switch",
        extend: [
            m.light({effect: false, color: false, powerOnBehavior: false, configureReporting: true}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["E8332DST350ZB"],
        model: "E8332DST350ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2G dimmer switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}),
            m.light({
                endpointNames: ["l1", "l2"],
                effect: false,
                color: false,
                powerOnBehavior: false,
                configureReporting: true,
            }),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.ENUM8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([2, 0, 3, 1]),
        ],
    },
    {
        zigbeeModel: ["E8331SRY800ZB"],
        model: "E8331SRY800ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 1G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10}}),
            m.onOff({endpointNames: ["l1"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["A3N31SR800ZB_xx_C1"],
        model: "E8331SRY800ZB_NEW",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 1G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10}}),
            m.onOff({endpointNames: ["l1"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["E8332SRY800ZB"],
        model: "E8332SRY800ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}),
            m.onOff({endpointNames: ["l1", "l2"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["A3N32SR800ZB_xx_C1"],
        model: "E8332SRY800ZB_NEW",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}),
            m.onOff({endpointNames: ["l1", "l2"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["E8333SRY800ZB"],
        model: "E8333SRY800ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 3G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11, l3: 12}}),
            m.onOff({endpointNames: ["l1", "l2", "l3"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["A3N33SR800ZB_xx_C1"],
        model: "E8333SRY800ZB_NEW",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 3G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11, l3: 12}}),
            m.onOff({endpointNames: ["l1", "l2", "l3"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["E8332SCN300ZB"],
        model: "E8332SCN300ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2G curtain switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
            schneiderElectricExtend.visaWiserCurtain(["l1", "l2"]),
            schneiderElectricExtend.visaConfigMotorType(1),
            schneiderElectricExtend.visaConfigMotorType(2),
            schneiderElectricExtend.visaConfigCurtainStatus(1),
            schneiderElectricExtend.visaConfigCurtainStatus(2),
        ],
    },
    {
        zigbeeModel: ["E8334RWMZB"],
        model: "E8334RWMZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 4K Freelocate",
        extend: [
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaKeyEventNotification("1"),
            schneiderElectricExtend.visaKeyEventNotification("2"),
            schneiderElectricExtend.visaKeyEventNotification("3"),
            schneiderElectricExtend.visaKeyEventNotification("4"),
        ],
        exposes: [e.action(["key1", "key2", "key3", "key4"]).withDescription("Last Visa key pressed")],
    },
    {
        zigbeeModel: ["NHMOTION/DIMMER/1"],
        model: "NH3527A",
        vendor: "Schneider Electric",
        description: "Motion sensor with dimmer",
        extend: [
            m.light({
                effect: false,
                powerOnBehavior: false,
                color: false,
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
            }),
            m.lightingBallast(),
            m.illuminance(),
            m.occupancy({
                pirConfig: ["otu_delay"],
            }),
            schneiderElectricExtend.addOccupancyConfigurationCluster(),
            schneiderElectricExtend.occupancyConfiguration(),
            schneiderElectricExtend.dimmingMode(),
        ],
        whiteLabel: [
            {vendor: "Elko", model: "EKO07250"},
            {vendor: "Elko", model: "EKO07251"},
            {vendor: "Elko", model: "EKO07252"},
            {vendor: "Elko", model: "EKO07253"},
            {vendor: "Elko", model: "EKO30199"},
            {vendor: "Exxact", model: "WDE002962"},
            {vendor: "Exxact", model: "WDE003962"},
        ],
    },
    {
        zigbeeModel: ["NHMOTION/UNIDIM/1"],
        model: "NHMOTION/UNIDIM/1",
        vendor: "Schneider Electric",
        description: "Motion sensor with dimmer",
        extend: [
            m.light({
                effect: false,
                powerOnBehavior: false,
                color: false,
                configureReporting: true,
                levelConfig: {
                    features: ["on_level", "current_level_startup"],
                },
            }),
            m.lightingBallast(),
            m.illuminance(),
            m.occupancy({
                pirConfig: ["otu_delay"],
            }),
            schneiderElectricExtend.addOccupancyConfigurationCluster(),
            schneiderElectricExtend.occupancyConfiguration(),
            schneiderElectricExtend.dimmingMode(),
        ],
        whiteLabel: [
            {vendor: "ELKO", model: "EKO06984", description: "SmartPir with push dimmer"},
            {vendor: "ELKO", model: "EKO06985", description: "SmartPir with push dimmer"},
            {vendor: "ELKO", model: "EKO06986", description: "SmartPir with push dimmer"},
        ],
    },
    {
        zigbeeModel: ["S520619"],
        model: "S520619",
        vendor: "Schneider Electric",
        description: "Wiser Odace Smart thermostat",
        fromZigbee: [
            stelpro.fzLocal.stelpro_thermostat,
            fz.metering,
            fzLocal.wiser_device_info,
            fz.hvac_user_interface,
            fz.temperature,
            fz.occupancy,
        ],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_local_temperature,
            tz.thermostat_control_sequence_of_operation,
            tz.schneider_thermostat_keypad_lockout,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_running_state,
        ],
        exposes: [
            e.binary("keypad_lockout", ea.STATE_SET, "lock1", "unlock").withDescription("Enables/disables physical input on the device"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 30, 0.5)
                .withSetpoint("occupied_cooling_setpoint", 4, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "cool"])
                .withRunningState(["idle", "heat", "cool"])
                .withPiHeatingDemand()
                .withPiCoolingDemand(),
            e.temperature(),
            e.occupancy(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.thermostatPICoolingDemand(endpoint1);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint1);
            await reporting.temperature(endpoint2);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout", "tempDisplayMode"]);
            await reporting.bind(endpoint4, coordinatorEndpoint, ["msOccupancySensing"]);
            await utils.ignoreUnsupportedAttribute(async () => await reporting.thermostatOccupancy(endpoint4), "thermostatOccupancy");
        },
        extend: [
            schneiderElectricExtend.addWiserDeviceInfoCluster(),
            schneiderElectricExtend.addHeatingCoolingOutputClusterServer(),
            schneiderElectricExtend.pilotMode(),
            m.poll({
                key: "measurement",
                option: exposes.options.measurement_poll_interval().withDescription("Polling interval of the occupied heating/cooling setpoint"),
                defaultIntervalSeconds: 20,
                poll: async (device) => {
                    const endpoint = device.getEndpoint(1);
                    await endpoint.read("hvacThermostat", ["occupiedHeatingSetpoint", "occupiedCoolingSetpoint"]);
                },
            }),
        ],
    },
    {
        zigbeeModel: ["E8332RWMZB"],
        model: "E8332RWMZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2K Freelocate",
        extend: [
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaKeyEventNotification("1"),
            schneiderElectricExtend.visaKeyEventNotification("2"),
        ],
        exposes: [e.action(["key1", "key2"]).withDescription("Last Visa key pressed")],
    },
    {
        zigbeeModel: ["E8331SCN200ZB"],
        model: "E8331SCN200ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 1G curtain switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10}}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
            schneiderElectricExtend.visaWiserCurtain(["l1"]),
            schneiderElectricExtend.visaConfigMotorType(1),
            schneiderElectricExtend.visaConfigCurtainStatus(1),
        ],
    },
    {
        fingerprint: [{modelID: "GreenPower_254", ieeeAddr: /^0x00000000e205567e$/}],
        model: "EKO01825",
        vendor: "Elko",
        description: "PowerTag power sensor",
        whiteLabel: [{vendor: "Schneider Electric", model: "A9MEM1570"}],
        fromZigbee: [fzLocal.schneider_powertag],
        toZigbee: [],
        exposes: [
            e.power(),
            e.power_apparent(),
            e.power_factor(),
            e.energy(),
            e.ac_frequency(),
            e.numeric("voltage_phase_ab", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase L1 and L2"),
            e.numeric("voltage_phase_bc", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase L2 and L3"),
            e.numeric("voltage_phase_ca", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase L1 and L3"),
            e.numeric("current_phase_a", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase L1"),
            e.numeric("current_phase_b", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase L2"),
            e.numeric("current_phase_c", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase L3"),
        ],
    },
    {
        zigbeeModel: ["UFH"],
        model: "CCTFR6000",
        vendor: "Schneider Electric",
        description: "6 Channel Boiler Actuator",
        extend: [
            m.deviceEndpoints({endpoints: {"1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8}}),
            m.onOff({powerOnBehavior: false, endpointNames: ["1", "2", "3", "4", "5", "6", "7", "8"]}),
        ],
    },
];
