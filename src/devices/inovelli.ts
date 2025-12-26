import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {Configure, DefinitionWithExtend, Expose, Fz, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface Inovelli {
    attributes: {
        dimmingSpeedUpRemote: number;
        dimmingSpeedUpLocal: number;
        rampRateOffToOnRemote: number;
        rampRateOffToOnLocal: number;
        dimmingSpeedDownRemote: number;
        dimmingSpeedDownLocal: number;
        rampRateOnToOffRemote: number;
        rampRateOnToOffLocal: number;
        minimumLevel: number;
        maximumLevel: number;
        invertSwitch: number;
        autoTimerOff: number;
        defaultLevelLocal: number;
        defaultLevelRemote: number;
        stateAfterPowerRestored: number;
        loadLevelIndicatorTimeout: number;
        activePowerReports: number;
        periodicPowerAndEnergyReports: number;
        activeEnergyReports: number;
        powerType: number;
        switchType: number;
        quickStartTime: number;
        quickStartLevel: number;
        higherOutputInNonNeutral: number;
        dimmingMode: number;
        nonNeutralAuxMediumGear: number;
        nonNeutralAuxLowGear: number;
        internalTemperature: number;
        overheat: number;
        otaImageType: number;
        buttonDelay: number;
        deviceBindNumber: number;
        smartBulbMode: number;
        doubleTapUpToParam55: number;
        doubleTapDownToParam56: number;
        brightnessLevelForDoubleTapUp: number;
        brightnessLevelForDoubleTapDown: number;
        defaultLed1ColorWhenOn: number;
        defaultLed1ColorWhenOff: number;
        defaultLed1IntensityWhenOn: number;
        defaultLed1IntensityWhenOff: number;
        defaultLed2ColorWhenOn: number;
        defaultLed2ColorWhenOff: number;
        defaultLed2IntensityWhenOn: number;
        defaultLed2IntensityWhenOff: number;
        defaultLed3ColorWhenOn: number;
        defaultLed3ColorWhenOff: number;
        defaultLed3IntensityWhenOn: number;
        defaultLed3IntensityWhenOff: number;
        defaultLed4ColorWhenOn: number;
        defaultLed4ColorWhenOff: number;
        defaultLed4IntensityWhenOn: number;
        defaultLed4IntensityWhenOff: number;
        defaultLed5ColorWhenOn: number;
        defaultLed5ColorWhenOff: number;
        defaultLed5IntensityWhenOn: number;
        defaultLed5IntensityWhenOff: number;
        defaultLed6ColorWhenOn: number;
        defaultLed6ColorWhenOff: number;
        defaultLed6IntensityWhenOn: number;
        defaultLed6IntensityWhenOff: number;
        defaultLed7ColorWhenOn: number;
        defaultLed7ColorWhenOff: number;
        defaultLed7IntensityWhenOn: number;
        defaultLed7IntensityWhenOff: number;
        ledColorWhenOn: number;
        ledColorWhenOff: number;
        ledIntensityWhenOn: number;
        ledIntensityWhenOff: number;
        ledBarScaling: number;
        mmwaveControlWiredDevice: number;
        mmWaveRoomSizePreset: number;
        singleTapBehavior: number;
        fanTimerMode: number;
        auxSwitchUniqueScenes: number;
        bindingOffToOnSyncLevel: number;
        breezeMode: number;
        fanControlMode: number;
        lowLevelForFanControlMode: number;
        mediumLevelForFanControlMode: number;
        highLevelForFanControlMode: number;
        ledColorForFanControlMode: number;
        localProtection: number;
        remoteProtection: number;
        outputMode: number;
        onOffLedMode: number;
        firmwareUpdateInProgressIndicator: number;
        relayClick: number;
        doubleTapClearNotifications: number;
        fanLedLevelType: number;
    };
    commands: {
        ledEffect: {
            effect: number;
            color: number;
            level: number;
            duration: number;
        };
        individualLedEffect: {
            led: number;
            effect: number;
            color: number;
            level: number;
            duration: number;
        };
        ledEffectComplete: {
            notificationType: number;
        };
    };
    commandResponses: never;
}

interface InovelliMmWave {
    attributes: {
        mmWaveHoldTime: number;
        mmWaveDetectSensitivity: number;
        mmWaveDetectTrigger: number;
        mmWaveTargetInfoReport: number;
        mmWaveStayLife: number;
        mmWaveVersion: number;
        mmWaveHeightMin: number;
        mmWaveHeightMax: number;
        mmWaveWidthMin: number;
        mmWaveWidthMax: number;
        mmWaveDepthMin: number;
        mmWaveDepthMax: number;
    };
    commands: {
        mmWaveControl: {
            controlID: number;
        };
    };
    commandResponses: {
        anyoneInReportingArea: {
            /** boolean */
            area1: number;
            /** boolean */
            area2: number;
            /** boolean */
            area3: number;
            /** boolean */
            area4: number;
        };
    };
}

const clickLookup: {[key: number]: string} = {
    0: "single",
    1: "release",
    2: "held",
    3: "double",
    4: "triple",
    5: "quadruple",
    6: "quintuple",
};
const buttonLookup: {[key: number]: string} = {
    1: "down",
    2: "up",
    3: "config",
    4: "aux_down",
    5: "aux_up",
    6: "aux_config",
};

const ledEffects: {[key: string]: number} = {
    off: 0,
    solid: 1,
    fast_blink: 2,
    slow_blink: 3,
    pulse: 4,
    chase: 5,
    open_close: 6,
    small_to_big: 7,
    aurora: 8,
    slow_falling: 9,
    medium_falling: 10,
    fast_falling: 11,
    slow_rising: 12,
    medium_rising: 13,
    fast_rising: 14,
    medium_blink: 15,
    slow_chase: 16,
    fast_chase: 17,
    fast_siren: 18,
    slow_siren: 19,
    clear_effect: 255,
};

const individualLedEffects: {[key: string]: number} = {
    off: 0,
    solid: 1,
    fast_blink: 2,
    slow_blink: 3,
    pulse: 4,
    chase: 5,
    falling: 6,
    rising: 7,
    aurora: 8,
    clear_effect: 255,
};

const mmWaveControlCommands: {[key: string]: number} = {
    set_interference: 1,
    clear_interference: 3,
    reset_detection_area: 4,
    reset_mmwave_module: 0,
};

const INOVELLI_CLUSTER_NAME = "manuSpecificInovelli" as const;
const INOVELLI_MMWAVE_CLUSTER_NAME = "manuSpecificInovelliMMWave" as const;

const inovelliExtend = {
    addCustomClusterInovelli: () =>
        m.deviceAddCustomCluster(INOVELLI_CLUSTER_NAME, {
            ID: 64561,
            manufacturerCode: 0x122f,
            attributes: {
                dimmingSpeedUpRemote: {ID: 0x0001, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                dimmingSpeedUpLocal: {ID: 0x0002, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                rampRateOffToOnRemote: {ID: 0x0003, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                rampRateOffToOnLocal: {ID: 0x0004, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                dimmingSpeedDownRemote: {ID: 0x0005, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                dimmingSpeedDownLocal: {ID: 0x0006, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                rampRateOnToOffRemote: {ID: 0x0007, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                rampRateOnToOffLocal: {ID: 0x0008, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                minimumLevel: {ID: 0x0009, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                maximumLevel: {ID: 0x000a, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                invertSwitch: {ID: 0x000b, type: Zcl.DataType.BOOLEAN, write: true},
                autoTimerOff: {ID: 0x000c, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                defaultLevelLocal: {ID: 0x000d, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLevelRemote: {ID: 0x000e, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                stateAfterPowerRestored: {ID: 0x000f, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                loadLevelIndicatorTimeout: {ID: 0x0011, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                activePowerReports: {ID: 0x0012, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                periodicPowerAndEnergyReports: {ID: 0x0013, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                activeEnergyReports: {ID: 0x0014, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                powerType: {ID: 0x0015, type: Zcl.DataType.BOOLEAN, write: true},
                switchType: {ID: 0x0016, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                quickStartTime: {ID: 0x0017, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                quickStartLevel: {ID: 0x0018, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                higherOutputInNonNeutral: {ID: 0x0019, type: Zcl.DataType.BOOLEAN, write: true},
                dimmingMode: {ID: 0x001a, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                nonNeutralAuxMediumGear: {ID: 0x001e, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                nonNeutralAuxLowGear: {ID: 0x001f, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                internalTemperature: {ID: 0x0020, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                overheat: {ID: 0x0021, type: Zcl.DataType.BOOLEAN, write: true},
                otaImageType: {ID: 0x0022, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                buttonDelay: {ID: 0x0032, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                deviceBindNumber: {ID: 0x0033, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                smartBulbMode: {ID: 0x0034, type: Zcl.DataType.BOOLEAN, write: true},
                doubleTapUpToParam55: {ID: 0x0035, type: Zcl.DataType.BOOLEAN, write: true},
                doubleTapDownToParam56: {ID: 0x0036, type: Zcl.DataType.BOOLEAN, write: true},
                brightnessLevelForDoubleTapUp: {ID: 0x0037, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                brightnessLevelForDoubleTapDown: {ID: 0x0038, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed1ColorWhenOn: {ID: 0x003c, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed1ColorWhenOff: {ID: 0x003d, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed1IntensityWhenOn: {ID: 0x003e, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed1IntensityWhenOff: {ID: 0x003f, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed2ColorWhenOn: {ID: 0x0041, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed2ColorWhenOff: {ID: 0x0042, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed2IntensityWhenOn: {ID: 0x0043, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed2IntensityWhenOff: {ID: 0x0044, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed3ColorWhenOn: {ID: 0x0046, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed3ColorWhenOff: {ID: 0x0047, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed3IntensityWhenOn: {ID: 0x0048, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed3IntensityWhenOff: {ID: 0x0049, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed4ColorWhenOn: {ID: 0x004b, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed4ColorWhenOff: {ID: 0x004c, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed4IntensityWhenOn: {ID: 0x004d, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed4IntensityWhenOff: {ID: 0x004e, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed5ColorWhenOn: {ID: 0x0050, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed5ColorWhenOff: {ID: 0x0051, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed5IntensityWhenOn: {ID: 0x0052, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed5IntensityWhenOff: {ID: 0x0053, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed6ColorWhenOn: {ID: 0x0055, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed6ColorWhenOff: {ID: 0x0056, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed6IntensityWhenOn: {ID: 0x0057, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed6IntensityWhenOff: {ID: 0x0058, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed7ColorWhenOn: {ID: 0x005a, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed7ColorWhenOff: {ID: 0x005b, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed7IntensityWhenOn: {ID: 0x005c, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                defaultLed7IntensityWhenOff: {ID: 0x005d, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                ledColorWhenOn: {ID: 0x005f, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                ledColorWhenOff: {ID: 0x060, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                ledIntensityWhenOn: {ID: 0x0061, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                ledIntensityWhenOff: {ID: 0x0062, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                ledBarScaling: {ID: 0x0064, type: Zcl.DataType.BOOLEAN, write: true},
                mmwaveControlWiredDevice: {ID: 0x006e, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                mmWaveRoomSizePreset: {ID: 0x0075, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                singleTapBehavior: {ID: 0x0078, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                fanTimerMode: {ID: 0x0079, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                auxSwitchUniqueScenes: {ID: 0x007b, type: Zcl.DataType.BOOLEAN, write: true},
                bindingOffToOnSyncLevel: {ID: 0x007d, type: Zcl.DataType.BOOLEAN, write: true},
                breezeMode: {ID: 0x0081, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                fanControlMode: {ID: 0x0082, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                lowLevelForFanControlMode: {ID: 0x0083, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                mediumLevelForFanControlMode: {ID: 0x0084, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                highLevelForFanControlMode: {ID: 0x0085, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                ledColorForFanControlMode: {ID: 0x0086, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                localProtection: {ID: 0x0100, type: Zcl.DataType.BOOLEAN, write: true},
                remoteProtection: {ID: 0x0101, type: Zcl.DataType.BOOLEAN, write: true},
                outputMode: {ID: 0x0102, type: Zcl.DataType.BOOLEAN, write: true},
                onOffLedMode: {ID: 0x0103, type: Zcl.DataType.BOOLEAN, write: true},
                firmwareUpdateInProgressIndicator: {ID: 0x0104, type: Zcl.DataType.BOOLEAN, write: true},
                relayClick: {ID: 0x105, type: Zcl.DataType.BOOLEAN, write: true},
                doubleTapClearNotifications: {ID: 0x106, type: Zcl.DataType.BOOLEAN, write: true},
                fanLedLevelType: {ID: 0x0107, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            },
            commands: {
                ledEffect: {
                    ID: 1,
                    parameters: [
                        {name: "effect", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "color", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "level", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "duration", type: Zcl.DataType.UINT8, max: 0xff},
                    ],
                },
                individualLedEffect: {
                    ID: 3,
                    parameters: [
                        {name: "led", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "effect", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "color", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "level", type: Zcl.DataType.UINT8, max: 0xff},
                        {name: "duration", type: Zcl.DataType.UINT8, max: 0xff},
                    ],
                },
                ledEffectComplete: {
                    ID: 0x24,
                    parameters: [{name: "notificationType", type: Zcl.DataType.INT8, min: -128}],
                },
            },
            commandsResponse: {},
        }),
    addCustomMMWaveClusterInovelli: () =>
        m.deviceAddCustomCluster(INOVELLI_MMWAVE_CLUSTER_NAME, {
            ID: 64562, // 0xfc32
            manufacturerCode: 0x122f,
            attributes: {
                mmWaveHoldTime: {ID: 0x0072, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                mmWaveDetectSensitivity: {ID: 0x0070, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                mmWaveDetectTrigger: {ID: 0x0071, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                mmWaveTargetInfoReport: {ID: 0x006b, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                mmWaveStayLife: {ID: 0x006c, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                mmWaveVersion: {ID: 0x0073, type: Zcl.DataType.UINT32, write: true, max: 0xffffffff},
                mmWaveHeightMin: {ID: 0x0065, type: Zcl.DataType.INT16, write: true, min: -32768},
                mmWaveHeightMax: {ID: 0x0066, type: Zcl.DataType.INT16, write: true, min: -32768},
                mmWaveWidthMin: {ID: 0x0067, type: Zcl.DataType.INT16, write: true, min: -32768},
                mmWaveWidthMax: {ID: 0x0068, type: Zcl.DataType.INT16, write: true, min: -32768},
                mmWaveDepthMin: {ID: 0x0069, type: Zcl.DataType.INT16, write: true, min: -32768},
                mmWaveDepthMax: {ID: 0x006a, type: Zcl.DataType.INT16, write: true, min: -32768},
            },
            commands: {
                mmWaveControl: {
                    ID: 0,
                    parameters: [{name: "controlID", type: Zcl.DataType.UINT8, max: 0xff}],
                },
            },
            commandsResponse: {
                anyoneInReportingArea: {
                    ID: 0,
                    parameters: [
                        {name: "area1", type: Zcl.DataType.BOOLEAN},
                        {name: "area2", type: Zcl.DataType.BOOLEAN},
                        {name: "area3", type: Zcl.DataType.BOOLEAN},
                        {name: "area4", type: Zcl.DataType.BOOLEAN},
                    ],
                },
            },
        }),
    inovelliDevice: ({
        attrs,
        supportsLedEffects,
        supportsButtonTaps,
        splitValuesByEndpoint = false,
    }: {
        attrs: Array<{attributes: {[s: string]: Attribute}; clusterName: typeof INOVELLI_CLUSTER_NAME | typeof INOVELLI_MMWAVE_CLUSTER_NAME}>;
        supportsLedEffects?: boolean;
        supportsButtonTaps: boolean;
        splitValuesByEndpoint?: boolean;
    }) => {
        // biome-ignore lint/suspicious/noExplicitAny: generic
        const fromZigbee: Fz.Converter<any, any, any>[] = [];
        const toZigbee: Tz.Converter[] = [];
        const exposes: Expose[] = [];

        if (supportsLedEffects) {
            fromZigbee.push(fzLocal.led_effect_complete);
            toZigbee.push(tzLocal.inovelli_led_effect, tzLocal.inovelli_individual_led_effect);
            exposes.push(exposeLedEffects(), exposeIndividualLedEffects(), exposeLedEffectComplete());
        }

        for (const attr of attrs) {
            fromZigbee.push(fzLocal.inovelli(attr.attributes, attr.clusterName, splitValuesByEndpoint));
            toZigbee.push(
                tzLocal.inovelli_parameters(attr.attributes, attr.clusterName),
                tzLocal.inovelli_parameters_readOnly(attr.attributes, attr.clusterName),
            );
            attributesToExposeList(attr.attributes, exposes);
        }

        if (supportsButtonTaps) {
            exposes.push(e.action(BUTTON_TAP_SEQUENCES));
        }

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, [INOVELLI_CLUSTER_NAME]);

                // Bind for Button Event Reporting
                const endpoint2 = device.getEndpoint(2);
                await reporting.bind(endpoint2, coordinatorEndpoint, [INOVELLI_CLUSTER_NAME]);

                for (const attr of attrs) {
                    if (!splitValuesByEndpoint) {
                        await chunkedRead(endpoint, Object.keys(attr.attributes), attr.clusterName);
                    } else {
                        await chunkedRead(
                            endpoint,
                            Object.keys(attr.attributes).flatMap((key) => {
                                const keysplit = key.split("_");
                                if (keysplit.length === 2) {
                                    if (Number(keysplit[1]) === 1) {
                                        return [keysplit[0]];
                                    }
                                    return [];
                                }
                                return [key];
                            }),
                            attr.clusterName,
                        );
                        await chunkedRead(
                            endpoint2,
                            Object.keys(attr.attributes).flatMap((key) => {
                                const keysplit = key.split("_");
                                if (keysplit.length === 2) {
                                    if (Number(keysplit[1]) === 2) {
                                        return [keysplit[0]];
                                    }
                                }
                                return [];
                            }),
                            attr.clusterName,
                        );
                    }
                }
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        } as ModernExtend;
    },
    inovelliLight: ({splitValuesByEndpoint = false}: {splitValuesByEndpoint?: boolean} = {}) => {
        // biome-ignore lint/suspicious/noExplicitAny: generic
        const fromZigbee: Fz.Converter<any, any, any>[] = [];
        const bindingList = ["genOnOff"];

        if (!splitValuesByEndpoint) {
            fromZigbee.push(fz.on_off, fz.brightness, fz.level_config, fz.power_on_behavior);
            bindingList.push("genLevelCtrl");
        }

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, bindingList);
                await reporting.onOff(endpoint);
            },
        ];

        return {
            fromZigbee,
            toZigbee: [
                tzLocal.light_onoff_brightness_inovelli,
                tz.power_on_behavior,
                tz.ignore_transition,
                tz.light_brightness_move,
                tz.light_brightness_step,
                tz.level_config,
            ],
            exposes: [e.light_brightness()],
            configure,
            isModernExtend: true,
        } as ModernExtend;
    },
    inovelliFan: ({endpointId, splitValuesByEndpoint = false}: {endpointId: number; splitValuesByEndpoint?: boolean}) => {
        // biome-ignore lint/suspicious/noExplicitAny: generic
        const fromZigbee: Fz.Converter<any, any, any>[] = [fzLocal.fan_mode(endpointId), fzLocal.breeze_mode(endpointId)];
        const toZigbee: Tz.Converter[] = [tzLocal.fan_mode(endpointId), tzLocal.breezeMode(endpointId)];
        const exposes: Expose[] = [e.fan().withState("fan_state").withModes(Object.keys(FAN_MODES)), exposeBreezeMode()];
        const bindingList = ["genOnOff"];

        if (!splitValuesByEndpoint) {
            fromZigbee.push(fzLocal.fan_state);
            toZigbee.push(tzLocal.fan_state);
            bindingList.push("genLevelCtrl");
        }

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, bindingList);
                await reporting.onOff(endpoint);

                if (splitValuesByEndpoint) {
                    const endpoint2 = device.getEndpoint(2);
                    await reporting.bind(endpoint2, coordinatorEndpoint, bindingList);
                    await reporting.onOff(endpoint2);
                }
            },
        ];
        return {
            fromZigbee,
            toZigbee,
            exposes,
            configure,
            isModernExtend: true,
        } as ModernExtend;
    },
    inovelliMMWave: () => {
        return {
            fromZigbee: [],
            toZigbee: [tzLocal.inovelli_mmwave_control_commands],
            exposes: [exposeMMWaveControl()],
            configure: [],
            isModernExtend: true,
        } as ModernExtend;
    },
};

const FAN_MODES: {[key: string]: number} = {off: 0, low: 2, smart: 4, medium: 86, high: 170, on: 255};
const BREEZE_MODES: string[] = ["off", "low", "medium", "high"];
const LED_NOTIFICATION_TYPES: {[key: number]: string} = {
    0: "LED_1",
    1: "LED_2",
    2: "LED_3",
    3: "LED_4",
    4: "LED_5",
    5: "LED_6",
    6: "LED_7",
    16: "ALL_LEDS",
    "-1": "CONFIG_BUTTON_DOUBLE_PRESS",
};

const INOVELLI = 0x122f;

interface Attribute {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ID: number;
    dataType: number;
    min?: number;
    max?: number;
    description: string;
    category?: "config" | "diagnostic";
    unit?: string;
    displayType?: string;
    values?: {[s: string]: number};
    readOnly?: boolean;
}

interface BreezeModeValues {
    speed1: string;
    speed2: string;
    speed3: string;
    speed4: string;
    speed5: string;
    time1: number;
    time2: number;
    time3: number;
    time4: number;
    time5: number;
}

// Converts brightness level to a fan mode
const intToFanMode = (value: number) => {
    let selectedMode = "low";
    if (value >= FAN_MODES.low) {
        selectedMode = "low";
    }
    if (value >= FAN_MODES.medium) {
        selectedMode = "medium";
    }
    if (value >= FAN_MODES.high) {
        selectedMode = "high";
    }
    if (value === 4) {
        selectedMode = "smart";
    }
    if (value === 0) {
        selectedMode = "off";
    }
    return selectedMode;
};

/**
 * Convert speed string to int needed for breeze mode calculation.
 * @param speedIn - speed string
 * @returns low = 1, medium = 2, high = 3, off = 0
 */
const speedToInt = (speedIn: string): number => {
    switch (speedIn) {
        case "low":
            return 1;
        case "medium":
            return 2;
        case "high":
            return 3;
        default:
            return 0;
    }
};

// Create Expose list with Inovelli Parameters definitions
const attributesToExposeList = (attributes: {[s: string]: Attribute}, exposesList: Expose[]) => {
    Object.keys(attributes).forEach((key) => {
        if (attributes[key].displayType === "enum") {
            const enumE = e
                .enum(key, attributes[key].readOnly ? ea.STATE_GET : ea.ALL, Object.keys(attributes[key].values))
                .withDescription(attributes[key].description);
            if (!attributes[key].readOnly) {
                enumE.withCategory(attributes[key].category ?? "config");
            }
            exposesList.push(enumE);
        } else if (attributes[key].displayType === "binary" || attributes[key].displayType === "switch") {
            const binary = e
                .binary(
                    key,
                    attributes[key].readOnly ? ea.STATE_GET : ea.ALL,
                    // @ts-expect-error ignore
                    attributes[key].values.Enabled,
                    attributes[key].values.Disabled,
                )
                .withDescription(attributes[key].description);
            if (!attributes[key].readOnly) {
                binary.withCategory(attributes[key].category ?? "config");
            }
            exposesList.push(binary);
        } else {
            const numeric = e
                .numeric(key, attributes[key].readOnly ? ea.STATE_GET : ea.ALL)
                .withValueMin(attributes[key].min)
                .withValueMax(attributes[key].max);

            if (attributes[key].values) {
                Object.keys(attributes[key].values).forEach((value) => {
                    numeric.withPreset(value, attributes[key].values[value], "");
                });
            }
            if (attributes[key].unit) {
                numeric.withUnit(attributes[key].unit);
            }
            numeric.withDescription(attributes[key].description);
            if (!attributes[key].readOnly) {
                numeric.withCategory(attributes[key].category ?? "config");
            }
            exposesList.push(numeric);
        }
    });
};

/**
 * Common Attributes
 *
 * These attributes are shared between all devices with the manufacturer specific Inovelli cluster
 * Some of the descriptions, max, min or value properties may be overridden for each device
 */
const COMMON_ATTRIBUTES: {[s: string]: Attribute} = {
    dimmingSpeedUpRemote: {
        ID: 1,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        description:
            "This changes the speed that the light dims up when controlled from the hub. " +
            "A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 25 (2.5s)",
    },
    dimmingSpeedUpLocal: {
        ID: 2,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        description:
            "This changes the speed that the light dims up when controlled at the switch. " +
            "A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.",
    },
    rampRateOffToOnRemote: {
        ID: 3,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        description:
            "This changes the speed that the light turns on when controlled from the hub. " +
            "A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.",
    },
    rampRateOffToOnLocal: {
        ID: 4,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        description:
            "This changes the speed that the light turns on when controlled at the switch. " +
            "A setting of 0 turns the light immediately on. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.",
    },
    dimmingSpeedDownRemote: {
        ID: 5,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        description:
            "This changes the speed that the light dims down when controlled from the hub. " +
            "A setting of 0 turns the light immediately off. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.",
    },
    dimmingSpeedDownLocal: {
        ID: 6,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        description:
            "This changes the speed that the light dims down when controlled at the switch. " +
            "A setting of 0 turns the light immediately off. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpLocal setting.",
    },
    rampRateOnToOffRemote: {
        ID: 7,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        description:
            "This changes the speed that the light turns off when controlled from the hub. " +
            "A setting of 'instant' turns the light immediately off. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with rampRateOffToOnRemote setting.",
    },
    rampRateOnToOffLocal: {
        ID: 8,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        description:
            "This changes the speed that the light turns off when controlled at the switch. " +
            "A setting of 'instant' turns the light immediately off. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with rampRateOffToOnLocal setting.",
    },
    invertSwitch: {
        ID: 11,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {Yes: 1, No: 0},
        min: 0,
        max: 1,
        description:
            "Inverts the orientation of the switch." +
            " Useful when the switch is installed upside down. Essentially up becomes down and down becomes up.",
    },
    autoTimerOff: {
        ID: 12,
        min: 0,
        max: 32767,
        dataType: Zcl.DataType.UINT16,
        unit: "seconds",
        values: {Disabled: 0},
        description:
            "Automatically turns the switch off after this many seconds." +
            " When the switch is turned on a timer is started. When the timer expires, the switch is turned off. 0 = Auto off is disabled.",
    },
    defaultLevelLocal: {
        ID: 13,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "Default level for the load when it is turned on at the switch." +
            " A setting of 255 means that the switch will return to the level that it was on before it was turned off.",
    },
    defaultLevelRemote: {
        ID: 14,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "Default level for the load when it is turned on from the hub." +
            " A setting of 255 means that the switch will return to the level that it was on before it was turned off.",
    },
    stateAfterPowerRestored: {
        ID: 15,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description: "The state the switch should return to when power is restored after power failure. 0 = off, 1-254 = level, 255 = previous.",
    },
    loadLevelIndicatorTimeout: {
        ID: 17,
        dataType: Zcl.DataType.UINT8,
        description:
            "Shows the level that the load is at for x number of seconds after the load is adjusted" +
            " and then returns to the Default LED state. 0 = Stay Off, 1-10 = seconds, 11 = Stay On.",
        displayType: "enum",
        values: {
            "Stay Off": 0,
            "1 Second": 1,
            "2 Seconds": 2,
            "3 Seconds": 3,
            "4 Seconds": 4,
            "5 Seconds": 5,
            "6 Seconds": 6,
            "7 Seconds": 7,
            "8 Seconds": 8,
            "9 Seconds": 9,
            "10 Seconds": 10,
            "Stay On": 11,
        },
        min: 0,
        max: 11,
    },
    switchType: {
        ID: 22,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {"Single Pole": 0, "3-Way Dumb Switch": 1, "3-Way Aux Switch": 2, "Single-Pole Full Sine Wave": 3},
        min: 0,
        max: 3,
        description: "Set the switch configuration.",
    },
    internalTemperature: {
        ID: 32,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 127,
        readOnly: true,
        description: "The temperature measured by the temperature sensor inside the chip, in degrees Celsius",
        category: "diagnostic",
        unit: "°C",
    },
    overheat: {
        ID: 33,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {"No Alert": 0, Overheated: 1},
        min: 0,
        max: 1,
        readOnly: true,
        description: "Indicates if the internal chipset is currently in an overheated state.",
    },
    buttonDelay: {
        ID: 50,
        dataType: Zcl.DataType.UINT8,
        values: {
            "0ms": 0,
            "100ms": 1,
            "200ms": 2,
            "300ms": 3,
            "400ms": 4,
            "500ms": 5,
            "600ms": 6,
            "700ms": 7,
            "800ms": 8,
            "900ms": 9,
        },
        displayType: "enum",
        min: 0,
        max: 9,
        description: "This will set the button press delay. 0 = no delay (Disables Button Press Events), Default = 500ms.",
    },
    deviceBindNumber: {
        ID: 51,
        dataType: Zcl.DataType.UINT8,
        readOnly: true,
        description: "The number of devices currently bound (excluding gateways) and counts one group as two devices",
    },
    smartBulbMode: {
        ID: 52,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {Disabled: 0, "Smart Bulb Mode": 1},
        description: "For use with Smart Bulbs that need constant power and are controlled via commands rather than power.",
    },
    doubleTapUpToParam55: {
        ID: 53,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {Disabled: 0, Enabled: 1},
        description: "Enable or Disable setting level to parameter 55 on double-tap UP.",
    },
    doubleTapDownToParam56: {
        ID: 54,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {Disabled: 0, Enabled: 1},
        description: "Enable or Disable setting level to parameter 56 on double-tap DOWN.",
    },
    brightnessLevelForDoubleTapUp: {
        ID: 55,
        dataType: Zcl.DataType.UINT8,
        min: 2,
        max: 255,
        description: "Set this level on double-tap UP (if enabled by P53). 255 = send ON command.",
    },
    brightnessLevelForDoubleTapDown: {
        ID: 56,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description: "Set this level on double-tap DOWN (if enabled by P54). 255 = send OFF command.",
    },
    ledColorWhenOn: {
        ID: 95,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        values: {
            Red: 0,
            Orange: 21,
            Yellow: 42,
            Green: 85,
            Cyan: 127,
            Blue: 170,
            Violet: 212,
            Pink: 234,
            White: 255,
        },
        description: "Set the color of the LED Indicator when the load is on.",
    },
    ledColorWhenOff: {
        ID: 96,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        values: {
            Red: 0,
            Orange: 21,
            Yellow: 42,
            Green: 85,
            Cyan: 127,
            Blue: 170,
            Violet: 212,
            Pink: 234,
            White: 255,
        },
        description: "Set the color of the LED Indicator when the load is off.",
    },
    ledIntensityWhenOn: {
        ID: 97,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 100,
        description: "Set the intensity of the LED Indicator when the load is on.",
    },
    ledIntensityWhenOff: {
        ID: 98,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 100,
        description: "Set the intensity of the LED Indicator when the load is off.",
    },
    singleTapBehavior: {
        ID: 120,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {"Old Behavior": 0, "New Behavior": 1, "Down Always Off": 2},
        description:
            "Behavior of single tapping the on or off button. Old behavior turns the switch on or off. " +
            "New behavior cycles through the levels set by P131-133. Down Always Off is like the new behavior but " +
            "down always turns the switch off instead of going to next lower speed.",
    },
    fanControlMode: {
        ID: 130,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {Disabled: 0, "Multi Tap": 1, Cycle: 2, Toggle: 3},
        description: "Which mode to use when binding EP3 (config button) to another device (like a fan module).",
    },
    lowLevelForFanControlMode: {
        ID: 131,
        dataType: Zcl.DataType.UINT8,
        min: 2,
        max: 254,
        description: "Level to send to device bound to EP3 when set to low.",
    },
    mediumLevelForFanControlMode: {
        ID: 132,
        dataType: Zcl.DataType.UINT8,
        min: 2,
        max: 254,
        description: "Level to send to device bound to EP3 when set to medium.",
    },
    highLevelForFanControlMode: {
        ID: 133,
        dataType: Zcl.DataType.UINT8,
        min: 2,
        max: 254,
        description: "Level to send to device bound to EP3 when set to high.",
    },
    ledColorForFanControlMode: {
        ID: 134,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        values: {
            Red: 0,
            Orange: 21,
            Yellow: 42,
            Green: 85,
            Cyan: 127,
            Blue: 170,
            Violet: 212,
            Pink: 234,
            White: 255,
        },
        description: "LED color used to display fan control mode.",
    },
    auxSwitchUniqueScenes: {
        ID: 123,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {Disabled: 0, Enabled: 1},
        description: "Have unique scene numbers for scenes activated with the aux switch.",
    },
    bindingOffToOnSyncLevel: {
        ID: 125,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {Disabled: 0, Enabled: 1},
        description: "Send Move_To_Level using Default Level with Off/On to bound devices.",
    },
    localProtection: {
        ID: 256,
        dataType: Zcl.DataType.BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        description: "Ability to control switch from the wall.",
        displayType: "enum",
    },
    remoteProtection: {
        ID: 257,
        dataType: Zcl.DataType.BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        readOnly: true,
        description: "Ability to control switch from the hub.",
        displayType: "enum",
    },
    onOffLedMode: {
        ID: 259,
        min: 0,
        max: 1,
        values: {All: 0, One: 1},
        dataType: Zcl.DataType.BOOLEAN,
        description: "When the device is in On/Off mode, use full LED bar or just one LED.",
        displayType: "enum",
    },
    firmwareUpdateInProgressIndicator: {
        ID: 260,
        dataType: Zcl.DataType.BOOLEAN,
        values: {Disabled: 0, Enabled: 1},
        description: "Display progress on LED bar during firmware update.",
        displayType: "enum",
    },
    defaultLed1ColorWhenOn: {
        ID: 60,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed1ColorWhenOff: {
        ID: 61,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed1IntensityWhenOn: {
        ID: 62,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed1IntensityWhenOff: {
        ID: 63,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed2ColorWhenOn: {
        ID: 65,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed2ColorWhenOff: {
        ID: 66,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed2IntensityWhenOn: {
        ID: 67,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed2IntensityWhenOff: {
        ID: 68,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed3ColorWhenOn: {
        ID: 70,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed3ColorWhenOff: {
        ID: 71,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed3IntensityWhenOn: {
        ID: 72,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed3IntensityWhenOff: {
        ID: 73,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed4ColorWhenOn: {
        ID: 75,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed4ColorWhenOff: {
        ID: 76,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed4IntensityWhenOn: {
        ID: 77,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed4IntensityWhenOff: {
        ID: 78,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed5ColorWhenOn: {
        ID: 80,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed5ColorWhenOff: {
        ID: 81,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed5IntensityWhenOn: {
        ID: 82,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed5IntensityWhenOff: {
        ID: 83,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed6ColorWhenOn: {
        ID: 85,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed6ColorWhenOff: {
        ID: 86,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed6IntensityWhenOn: {
        ID: 87,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed6IntensityWhenOff: {
        ID: 88,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed7ColorWhenOn: {
        ID: 90,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed7ColorWhenOff: {
        ID: 91,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 255,
        description:
            "0-254:This is the color of the LED strip in a hex representation. 255:Synchronization with default all LED strip color parameter.",
    },
    defaultLed7IntensityWhenOn: {
        ID: 92,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when on. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    defaultLed7IntensityWhenOff: {
        ID: 93,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 101,
        description: "Intensity of LED strip when off. 101 = Synchronized with default all LED strip intensity parameter.",
    },
    fanTimerMode: {
        ID: 121,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {Disabled: 0, Enabled: 1},
        description: "Enable or disable advanced timer mode to have the switch act like a bathroom fan timer",
    },
    doubleTapClearNotifications: {
        ID: 262,
        dataType: Zcl.DataType.BOOLEAN,
        min: 0,
        max: 1,
        description: "Double-Tap the Config button to clear notifications.",
        values: {"Enabled (Default)": 0, Disabled: 1},
        displayType: "enum",
    },
    fanLedLevelType: {
        ID: 263,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 10,
        values: {"Limitless (like VZM31)": 0, "Adaptive LED": 10},
        description: "Level display of the LED Strip",
    },
};

/**
 * Common Dimmer Attributes
 *
 * These attributes are shared between all devices that act like dimmers (including dimmers + fan switches) with
 * the manufacturer specific Inovelli cluster. These are not shared with on/off switches.
 * Some of the descriptions, max, min or value properties may be overridden for each device
 */
const COMMON_DIMMER_ATTRIBUTES: {[s: string]: Attribute} = {
    ...COMMON_ATTRIBUTES,
    minimumLevel: {
        ID: 9,
        dataType: Zcl.DataType.UINT8,
        min: 1,
        max: 254,
        description:
            "The minimum level that the dimmer allows the bulb to be dimmed to. " +
            "Useful when the user has an LED bulb that does not turn on or flickers at a lower level.",
    },
    maximumLevel: {
        ID: 10,
        dataType: Zcl.DataType.UINT8,
        min: 2,
        max: 255,
        description:
            "The maximum level that the dimmer allows the bulb to be dimmed to." +
            "Useful when the user has an LED bulb that reaches its maximum level before the " +
            "dimmer value of 99 or when the user wants to limit the maximum brightness.",
    },
    powerType: {
        ID: 21,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {"Non Neutral": 0, Neutral: 1},
        min: 0,
        max: 1,
        readOnly: true,
        description: "Set the power type for the device.",
    },
    outputMode: {
        ID: 258,
        min: 0,
        max: 1,
        values: {Dimmer: 0, "On/Off": 1},
        dataType: Zcl.DataType.BOOLEAN,
        description: "Use device as a Dimmer or an On/Off switch.",
        displayType: "enum",
    },
};

/**
 * Common Dimmable light Attributes
 *
 * These attributes are shared between all devices that are dimmable light switches with
 * the manufacturer specific Inovelli cluster. These are not shared with fans or on/off switches.
 * Some of the descriptions, max, min or value properties may be overridden for each device
 */

const COMMON_DIMMABLE_LIGHT_ATTRIBUTES: {[s: string]: Attribute} = {
    quickStartTime: {
        ID: 23,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 60,
        description: "Duration of full power output while lamp transitions from Off to On. In 60th of second. 0 = disable, 1 = 1/60s, 60 = 1s",
    },
    quickStartLevel: {
        ID: 24,
        dataType: Zcl.DataType.UINT8,
        min: 1,
        max: 254,
        description: "Level of power output during Quick Start Light time (P23).",
    },
    higherOutputInNonNeutral: {
        ID: 25,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {"Disabled (default)": 0, Enabled: 1},
        min: 0,
        max: 1,
        description: "Increase level in non-neutral mode",
    },
    dimmingMode: {
        ID: 26,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {"Leading edge": 0, "Trailing edge": 1},
        min: 0,
        max: 1,
        readOnly: true,
        description:
            "Switches the dimming mode from leading edge (default) to trailing edge. " +
            "1. Trailing Edge is only available on neutral single-pole and neutral multi-way with an " +
            "aux/add-on switch (multi-way with a dumb/existing switch and non-neutral setups are not supported and " +
            "will default back to Leading Edge). This parameter can only be changed at the switch.",
    },
};

/**
 * Common Dimmer or On/Off Attributes
 *
 * These attributes are shared between all devices that are light switches (either dimmers or on/off) with
 * the manufacturer specific Inovelli cluster. These are not shared with fans.
 * Some of the descriptions, max, min or value properties may be overridden for each device
 */
const COMMON_DIMMER_ON_OFF_ATTRIBUTES: {[s: string]: Attribute} = {
    ledBarScaling: {
        ID: 100,
        dataType: Zcl.DataType.BOOLEAN,
        displayType: "enum",
        values: {"Gen3 method (VZM-style)": 0, "Gen2 method (LZW-style)": 1},
        description: "Method used for scaling.",
    },
    activePowerReports: {
        ID: 18,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 100,
        description: "Percent power level change that will result in a new power report being sent. 0 = Disabled",
    },
    periodicPowerAndEnergyReports: {
        ID: 19,
        min: 0,
        max: 32767,
        dataType: Zcl.DataType.UINT16,
        description: "Time period between consecutive power & energy reports being sent (in seconds). The timer is reset after each report is sent.",
    },
    activeEnergyReports: {
        ID: 20,
        dataType: Zcl.DataType.UINT16,
        min: 0,
        max: 32767,
        description:
            "Energy reports Energy level change which will result in sending a new energy report." +
            "0 = disabled, 1-32767 = 0.01kWh-327.67kWh. Default setting: 10 (0.1 kWh)",
    },
};

const VZM30_ATTRIBUTES: {[s: string]: Attribute} = {
    ...COMMON_ATTRIBUTES,
    ...COMMON_DIMMER_ON_OFF_ATTRIBUTES,
    switchType: {
        ...COMMON_ATTRIBUTES.switchType,
        values: {"Single Pole": 0, "Aux Switch": 1},
        max: 1,
    },
    outputMode: {
        ...COMMON_DIMMER_ATTRIBUTES.outputMode,
        description: "Use device as a Dimmer or an On/Off switch. Only applies when controlling bound devices.",
    },
};

const VZM31_ATTRIBUTES: {[s: string]: Attribute} = {
    // Temporarily exclude fanTimerMode from the VZM31. While the specifications indicate that this attribute should be present, it's missing in the current firmware (2.18). This can be removed once the firmware bug is corrected.
    ...Object.fromEntries(Object.entries(COMMON_DIMMER_ATTRIBUTES).filter(([key]) => key !== "fanTimerMode")),
    ...COMMON_DIMMER_ON_OFF_ATTRIBUTES,
    ...COMMON_DIMMABLE_LIGHT_ATTRIBUTES,
    relayClick: {
        ID: 261,
        dataType: Zcl.DataType.BOOLEAN,
        min: 0,
        max: 1,
        description:
            "In neutral on/off setups, the default is to have a clicking sound to notify you that the relay " +
            "is open or closed. You may disable this sound by creating a, “simulated” on/off where the switch " +
            "only will turn onto 100 or off to 0.",
        values: {"Disabled (Click Sound On)": 0, "Enabled (Click Sound Off)": 1},
        displayType: "enum",
    },
};

const VZM32_ATTRIBUTES: {[s: string]: Attribute} = {
    ...COMMON_DIMMER_ATTRIBUTES,
    ...COMMON_DIMMER_ON_OFF_ATTRIBUTES,
    ...COMMON_DIMMABLE_LIGHT_ATTRIBUTES,
    switchType: {
        ...COMMON_ATTRIBUTES.switchType,
        values: {"Single Pole": 0, "Aux Switch": 1},
        max: 1,
    },
    otaImageType: {
        ID: 34,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {
            "Zigbee (259)": 0,
            "mmWave (260)": 1,
            "Alternating (259 & 260) (default)": 2,
        },
        min: 0,
        max: 2,
        description: "Which endpoint should the switch advertise for OTA update (Zigbee, mmWave, or both).",
    },
    mmwaveControlWiredDevice: {
        ID: 110,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {
            Disabled: 0,
            "Occupancy (default)": 1,
            Vacancy: 2,
            "Wasteful Occupancy": 3,
            "Mirrored Occupancy": 4,
            "Mirrored Vacancy": 5,
            "Mirrored Wasteful Occupancy": 6,
        },
        min: 0,
        max: 6,
        description:
            "Controls whether the wired load is automatically turned on / off by the presence detector. " +
            "0 = Disabled (manual control of the load), " +
            "1 = Occupancy (default; turn on automatically with presence; turn off automatically without presence), " +
            "2 = Vacancy (does not turn on automatically; turn off automatically without presence), " +
            "3 = Wasteful Occupancy (turn on automatically with presence; does not turn off automatically), " +
            "4 = Mirrored Occupancy (turn on automatically without presence; turn off automatically with presence), " +
            "5 = Mirrored Vacancy (turn on automatically without presence; does not turn off automatically), " +
            "6 = Mirrored Wasteful Occupancy (does not turn on automatically; turns off automatically with presence).",
    },
    mmWaveRoomSizePreset: {
        ID: 117,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {
            Custom: 0,
            Small: 1,
            Medium: 2,
            Large: 3,
        },
        min: 0,
        max: 3,
        description:
            "Allows selection of predefined room dimensions for mmWave sensor processing. Useful for optimizing " +
            "detection zones based on installation environment. Defaults to Custom which allows for manual dimension configuration " +
            "via other parameters. \nOptions: 0=Custom (User-defined), 1=Small (X: −100 to 100, Y: 0 to 200, Z: −100 to 100), " +
            "2=Medium (X: −160 to 160, Y: 0 to 280, Z: −100 to 100), 3=Large (X: −210 to 210, Y: 0 to 360, Z: −100 to 100)",
    },
};

const VZM32_MMWAVE_ATTRIBUTES: {[s: string]: Attribute} = {
    mmWaveHoldTime: {
        ID: 114,
        dataType: Zcl.DataType.UINT32,
        min: 0,
        max: 4294967295,
        description:
            "This changes the duration, measured in seconds, after the mmWave radar detects transition from " +
            "the presence of a person to their absence. Default = 10 (seconds).",
    },
    mmWaveDetectSensitivity: {
        ID: 112,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {Low: 0, Medium: 1, "High (default)": 2},
        min: 0,
        max: 2,
        description: "The sensitivity of the mmWave sensor.",
    },
    mmWaveDetectTrigger: {
        ID: 113,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {"Slow (5s)": 0, "Medium (1s)": 1, "Fast (0.2s, default)": 2},
        min: 0,
        max: 2,
        description: "The time from detecting a person to triggering an action.",
    },
    mmWaveTargetInfoReport: {
        ID: 107,
        dataType: Zcl.DataType.UINT8,
        displayType: "enum",
        values: {"Disable (default)": 0, Enable: 1},
        min: 0,
        max: 1,
        description: "Send target info report when bound to mmWave cluster.",
    },
    mmWaveStayLife: {
        ID: 108,
        dataType: Zcl.DataType.UINT32,
        min: 0,
        max: 4294967295,
        description:
            "The delay time of the stay area is set to 50ms when it is set to 1, to 1 second when it is set to 20, and the default value is 300, that is, 15 seconds",
    },
    mmWaveVersion: {
        ID: 115,
        dataType: Zcl.DataType.UINT32,
        min: 0,
        max: 4294967295,
        readOnly: true,
        description: "The firmware version number of the mmWave module.",
    },
    mmWaveHeightMin: {
        ID: 101,
        dataType: Zcl.DataType.INT16,
        min: -600,
        max: 600,
        readOnly: false,
        description: "Defines the detection area (negative values are below the switch, positive values are above)",
    },
    mmWaveHeightMax: {
        ID: 102,
        dataType: Zcl.DataType.INT16,
        min: -600,
        max: 600,
        readOnly: false,
        description: "Defines the detection area (negative values are below the switch, positive values are above)",
    },
    mmWaveWidthMin: {
        ID: 103,
        dataType: Zcl.DataType.INT16,
        min: -600,
        max: 600,
        readOnly: false,
        description: "Defines the detection area (negative values are left of the switch facing away from the wall, positive values are right)",
    },
    mmWaveWidthMax: {
        ID: 104,
        dataType: Zcl.DataType.INT16,
        min: -600,
        max: 600,
        readOnly: false,
        description: "Defines the detection area (negative values are left of the switch facing away from the wall, positive values are right)",
    },
    mmWaveDepthMin: {
        ID: 105,
        dataType: Zcl.DataType.INT16,
        min: 0,
        max: 600,
        readOnly: false,
        description: "Defines the detection area in front of the switch",
    },
    mmWaveDepthMax: {
        ID: 106,
        dataType: Zcl.DataType.INT16,
        min: 0,
        max: 600,
        readOnly: false,
        description: "Defines the detection area in front of the switch",
    },
};

const VZM35_ATTRIBUTES: {[s: string]: Attribute} = {
    ...COMMON_DIMMER_ATTRIBUTES,
    minimumLevel: {
        ...COMMON_DIMMER_ATTRIBUTES.minimumLevel,
        description:
            "1-84: The level corresponding to the fan is Low, Medium, High. " +
            "85-170: The level corresponding to the fan is Medium, Medium, High. " +
            "170-254: The level corresponding to the fan is High, High, High ",
    },
    maximumLevel: {
        ...COMMON_DIMMER_ATTRIBUTES.maximumLevel,
        description: "2-84: The level corresponding to the fan is Low, Medium, High.",
    },
    switchType: {
        ...COMMON_ATTRIBUTES.switchType,
        values: {"Single Pole": 0, "Aux Switch": 1},
        max: 1,
    },
    smartBulbMode: {
        ...COMMON_ATTRIBUTES.smartBulbMode,
        description: "For use with Smart Fans that need constant power and are controlled via commands rather than power.",
        values: {Disabled: 0, "Smart Fan Mode": 1},
    },
    quickStartTime: {
        ID: 23,
        dataType: Zcl.DataType.UINT8,
        min: 0,
        max: 60,
        description: "Duration of full power output while fan tranisitions from Off to On. In 60th of second. 0 = disable, 1 = 1/60s, 60 = 1s",
    },
    nonNeutralAuxMediumGear: {
        ID: 30,
        dataType: Zcl.DataType.UINT8,
        min: 42,
        max: 135,
        description: "Identification value in Non-nuetral, medium gear, aux switch",
    },
    nonNeutralAuxLowGear: {
        ID: 31,
        dataType: Zcl.DataType.UINT8,
        min: 42,
        max: 135,
        description: "Identification value in Non-nuetral, low gear, aux switch",
    },
    outputMode: {
        ...COMMON_DIMMER_ATTRIBUTES.outputMode,
        values: {"Ceiling Fan (3-Speed)": 0, "Exhaust Fan (On/Off)": 1},
        description: "Use device in ceiling fan (3-Speed) or in exhaust fan (On/Off) mode.",
    },
};

const VZM36_ATTRIBUTES: {[s: string]: Attribute} = {
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    dimmingSpeedUpRemote_1: {...COMMON_ATTRIBUTES.dimmingSpeedUpRemote},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    rampRateOffToOnRemote_1: {...COMMON_ATTRIBUTES.rampRateOffToOnRemote},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    dimmingSpeedDownRemote_1: {...COMMON_ATTRIBUTES.dimmingSpeedDownRemote},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    rampRateOnToOffRemote_1: {...COMMON_ATTRIBUTES.rampRateOnToOffRemote},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    minimumLevel_1: {...COMMON_DIMMER_ATTRIBUTES.minimumLevel},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    maximumLevel_1: {...COMMON_DIMMER_ATTRIBUTES.maximumLevel},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    autoTimerOff_1: {
        ...COMMON_ATTRIBUTES.autoTimerOff,
        description:
            "Automatically turns the light off after this many seconds." +
            " When the light is turned on a timer is started. When the timer expires, the light is turned off. 0 = Auto off is disabled.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    defaultLevelRemote_1: {
        ...COMMON_ATTRIBUTES.defaultLevelRemote,
        description:
            "Default level for the light when it is turned on from the hub." +
            " A setting of 255 means that the light will return to the level that it was on before it was turned off.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    stateAfterPowerRestored_1: {
        ...COMMON_ATTRIBUTES.stateAfterPowerRestored,
        description: "The state the light should return to when power is restored after power failure. 0 = off, 1-254 = level, 255 = previous.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    quickStartTime_1: {...COMMON_DIMMABLE_LIGHT_ATTRIBUTES.quickStartTime},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    quickStartLevel_1: {...COMMON_DIMMABLE_LIGHT_ATTRIBUTES.quickStartLevel},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    higherOutputInNonNeutral_1: {
        ...COMMON_DIMMABLE_LIGHT_ATTRIBUTES.higherOutputInNonNeutral,
        description: "Increase level in non-neutral mode for light.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    dimmingMode_1: {
        ...COMMON_DIMMABLE_LIGHT_ATTRIBUTES.dimmingMode,
        readOnly: false,
        description:
            "Switches the dimming mode from leading edge (default) to trailing edge. " +
            "1. Trailing Edge is only available on neutral single-pole and neutral multi-way with an " +
            "aux/add-on switch (multi-way with a dumb/existing switch and non-neutral setups are not supported and " +
            "will default back to Leading Edge).",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    smartBulbMode_1: {...COMMON_ATTRIBUTES.smartBulbMode},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ledColorWhenOn_1: {...COMMON_ATTRIBUTES.ledColorWhenOn},
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    ledIntensityWhenOn_1: {...COMMON_ATTRIBUTES.ledIntensityWhenOn},
    // remote protection is readonly...
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    outputMode_1: {...COMMON_DIMMER_ATTRIBUTES.outputMode},
    // Endpoint 2 (Fan)
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    dimmingSpeedUpRemote_2: {
        ...COMMON_ATTRIBUTES.dimmingSpeedUpRemote,
        description:
            "This changes the speed that the fan ramps up when controlled from the hub. " +
            "A setting of 0 turns the fan immediately on. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 25 (2.5s)",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    rampRateOffToOnRemote_2: {
        ...COMMON_ATTRIBUTES.rampRateOffToOnRemote,
        description:
            "This changes the speed that the fan turns on when controlled from the hub. " +
            "A setting of 0 turns the fan immediately on. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    dimmingSpeedDownRemote_2: {
        ...COMMON_ATTRIBUTES.dimmingSpeedDownRemote,
        description:
            "This changes the speed that the fan ramps down when controlled from the hub. " +
            "A setting of 0 turns the fan immediately off. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with dimmingSpeedUpRemote setting.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    rampRateOnToOffRemote_2: {
        ...COMMON_ATTRIBUTES.rampRateOnToOffRemote,
        description:
            "This changes the speed that the fan turns off when controlled from the hub. " +
            "A setting of 'instant' turns the fan immediately off. Increasing the value slows down the transition speed. " +
            "Every number represents 100ms. Default = 127 - Keep in sync with rampRateOffToOnRemote setting.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    minimumLevel_2: {
        ...COMMON_DIMMER_ATTRIBUTES.minimumLevel,
        description: "The minimum level that the fan can be set to.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    maximumLevel_2: {
        ...COMMON_DIMMER_ATTRIBUTES.maximumLevel,
        description: "The maximum level that the fan can be set to.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    autoTimerOff_2: {
        ...COMMON_ATTRIBUTES.autoTimerOff,
        description:
            "Automatically turns the fan off after this many seconds." +
            " When the fan is turned on a timer is started. When the timer expires, the switch is turned off. 0 = Auto off is disabled.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    defaultLevelRemote_2: {
        ...COMMON_ATTRIBUTES.defaultLevelRemote,
        description:
            "Default level for the fan when it is turned on from the hub." +
            " A setting of 255 means that the fan will return to the level that it was on before it was turned off.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    stateAfterPowerRestored_2: {
        ...COMMON_ATTRIBUTES.stateAfterPowerRestored,
        description: "The state the fan should return to when power is restored after power failure. 0 = off, 1-254 = level, 255 = previous.",
    },
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    quickStartTime_2: {
        ...COMMON_DIMMABLE_LIGHT_ATTRIBUTES.quickStartTime,
        description: "Duration of full power output while fan transitions from Off to On. In 60th of second. 0 = disable, 1 = 1/60s, 60 = 1s",
    },
    // power type readonly
    // internal temp readonly
    // overheat readonly
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    smartBulbMode_2: {
        ...COMMON_DIMMER_ATTRIBUTES.smartBulbMode,
        values: {Disabled: 0, "Smart Fan Mode": 1},
        description: "For use with Smart Fans that need constant power and are controlled via commands rather than power.",
    },
    // remote protection readonly..
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    outputMode_2: {
        ...COMMON_DIMMER_ATTRIBUTES.outputMode,
        values: {"Ceiling Fan (3-Speed)": 0, "Exhaust Fan (On/Off)": 1},
        description: "Use device in ceiling fan (3-Speed) or in exhaust fan (On/Off) mode.",
    },
};

const tzLocal = {
    inovelli_parameters: (attributes: {[s: string]: Attribute}, cluster: typeof INOVELLI_CLUSTER_NAME | typeof INOVELLI_MMWAVE_CLUSTER_NAME) =>
        ({
            key: Object.keys(attributes).filter((a) => !attributes[a].readOnly),
            convertSet: async (entity, key, value, meta) => {
                // Check key to see if there is an endpoint postfix for the VZM36
                const keysplit = key.split("_");
                let entityToUse = entity;
                if (keysplit.length === 2) {
                    entityToUse = meta.device.getEndpoint(Number(keysplit[1]));
                }

                if (!(key in attributes)) {
                    return;
                }

                const payload = {
                    [attributes[key].ID]: {
                        value:
                            attributes[key].displayType === "enum"
                                ? // @ts-expect-error ignore
                                  attributes[key].values[value]
                                : value,
                        type: attributes[key].dataType,
                    },
                };

                await entityToUse.write(cluster, payload, {
                    manufacturerCode: INOVELLI,
                });

                return {
                    state: {
                        [key]: value,
                    },
                };
            },
            convertGet: async (entity, key, meta) => {
                // Check key to see if there is an endpoint postfix for the VZM36
                const keysplit = key.split("_");
                let entityToUse = entity;
                let keyToUse = key;
                if (keysplit.length === 2) {
                    entityToUse = meta.device.getEndpoint(Number(keysplit[1]));
                    keyToUse = keysplit[0];
                }
                // XXX: far too dynamic to properly type
                await entityToUse.read(cluster, [keyToUse] as Parameters<typeof entityToUse.read>[1], {
                    manufacturerCode: INOVELLI,
                });
            },
        }) satisfies Tz.Converter,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    inovelli_parameters_readOnly: (attributes: {[s: string]: Attribute}, cluster: string) =>
        ({
            key: Object.keys(attributes).filter((a) => attributes[a].readOnly),
            convertGet: async (entity, key, meta) => {
                // Check key to see if there is an endpoint postfix for the VZM36
                const keysplit = key.split("_");
                let entityToUse = entity;
                let keyToUse = key;
                if (keysplit.length === 2) {
                    entityToUse = meta.device.getEndpoint(Number(keysplit[1]));
                    keyToUse = keysplit[0];
                }
                // XXX: far too dynamic to properly type
                await entityToUse.read(cluster, [keyToUse] as Parameters<typeof entityToUse.read>[1], {
                    manufacturerCode: INOVELLI,
                });
            },
        }) satisfies Tz.Converter,
    inovelli_led_effect: {
        key: ["led_effect"],
        convertSet: async (entity, key, values, meta) => {
            await entity.command<typeof INOVELLI_CLUSTER_NAME, "ledEffect", Inovelli>(
                INOVELLI_CLUSTER_NAME,
                "ledEffect",
                {
                    // @ts-expect-error ignore
                    effect: ledEffects[values.effect],
                    // @ts-expect-error ignore
                    color: Math.min(Math.max(0, values.color), 255),
                    // @ts-expect-error ignore
                    level: Math.min(Math.max(0, values.level), 100),
                    // @ts-expect-error ignore
                    duration: Math.min(Math.max(0, values.duration), 255),
                },
                {disableResponse: true, disableDefaultResponse: true},
            );
            return {state: {[key]: values}};
        },
    } satisfies Tz.Converter,
    inovelli_individual_led_effect: {
        key: ["individual_led_effect"],
        convertSet: async (entity, key, values, meta) => {
            utils.assertObject(values);

            await entity.command<typeof INOVELLI_CLUSTER_NAME, "individualLedEffect", Inovelli>(
                INOVELLI_CLUSTER_NAME,
                "individualLedEffect",
                {
                    led: Math.min(Math.max(1, Number.parseInt(values.led, 10)), 7) - 1,
                    effect: individualLedEffects[values.effect],
                    color: Math.min(Math.max(0, values.color), 255),
                    level: Math.min(Math.max(0, values.level), 100),
                    duration: Math.min(Math.max(0, values.duration), 255),
                },
                {disableResponse: true, disableDefaultResponse: true},
            );
            return {state: {[key]: values}};
        },
    } satisfies Tz.Converter,
    inovelli_mmwave_control_commands: {
        key: ["mmwave_control_commands"],
        convertSet: async (entity, key, values, meta) => {
            utils.assertObject(values);

            await entity.command<typeof INOVELLI_MMWAVE_CLUSTER_NAME, "mmWaveControl", InovelliMmWave>(
                INOVELLI_MMWAVE_CLUSTER_NAME,
                "mmWaveControl",
                {
                    controlID: mmWaveControlCommands[values.controlID],
                },
                {disableResponse: true, disableDefaultResponse: true},
            );
            return {state: {[key]: values}};
        },
    } satisfies Tz.Converter,
    /*
     * Inovelli devices have a default transition property that the device should
     * fallback to if a transition is not specified by passing 0xffff
     *
     */
    light_onoff_brightness_inovelli: {
        ...tz.light_onoff_brightness,
        convertSet: async (entity, key, value, meta) => {
            const {message} = meta;
            const transition = utils.getTransition(entity, "brightness", meta);
            const state = utils.isString(message.state) ? message.state.toLowerCase() : null;

            // If transition is not specified and command is on (with no brightness), off or toggle, use on_off converter
            let brightness: number;
            if (message.brightness != null) {
                brightness = Number(message.brightness);
            } else if (message.brightness_percent != null) {
                brightness = utils.mapNumberRange(Number(message.brightness_percent), 0, 100, 0, 255);
            }
            if ((state === "toggle" || state === "off" || (brightness === undefined && state === "on")) && !transition.specified) {
                const localMeta = {
                    ...meta,
                    converterOptions: {
                        ctrlbits: 0,
                        ontime: message.on_time != null ? Math.round((message.on_time as number) * 10) : 0xffff,
                        offwaittime: message.off_wait_time != null ? Math.round((message.off_wait_time as number) * 10) : 0xffff,
                    },
                };
                return await tz.on_off.convertSet(entity, key, value, localMeta);
            }

            const localMeta = {
                ...meta,
                message: {
                    ...message,
                    transition: (!transition.specified ? 0xffff : transition.time) / 10,
                },
            };
            return await tz.light_onoff_brightness.convertSet(entity, key, value, localMeta);
        },
    } satisfies Tz.Converter,

    fan_mode: (endpointId: number) =>
        ({
            key: ["fan_mode"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(value);
                const endpoint = meta.device.getEndpoint(endpointId);
                await endpoint.command(
                    "genLevelCtrl",
                    "moveToLevelWithOnOff",
                    {
                        level: FAN_MODES[value],
                        transtime: 0xffff,
                        optionsMask: 0,
                        optionsOverride: 0,
                    },
                    utils.getOptions(meta.mapped, entity),
                );

                meta.state[key] = value;

                if (endpointId === 2) {
                    return {
                        state: {
                            [key]: value,
                            fan_state: "ON",
                        },
                    };
                }

                return {
                    state: {
                        [key]: value,
                        state: "ON",
                    },
                };
            },
            convertGet: async (entity, key, meta) => {
                const endpoint = meta.device.getEndpoint(endpointId);
                await endpoint.read("genLevelCtrl", ["currentLevel"]);
            },
        }) satisfies Tz.Converter,
    fan_state: {
        key: ["fan_state"],
        convertSet: async (entity, key, value, meta) => {
            const state = meta.message.fan_state != null ? meta.message.fan_state.toString().toLowerCase() : null;
            utils.validateValue(state, ["toggle", "off", "on"]);

            await entity.command("genOnOff", state as "toggle" | "off" | "on", {}, utils.getOptions(meta.mapped, entity));
            if (state === "toggle") {
                const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ""}`];
                return currentState ? {state: {fan_state: currentState === "OFF" ? "ON" : "OFF"}} : {};
            }
            return {state: {fan_state: state.toString().toUpperCase()}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genOnOff", ["onOff"]);
        },
    } satisfies Tz.Converter,

    /**
     * On the VZM36, When turning the fan on and off, we must ensure that we are sending these
     * commands to endpoint 2 on the canopy module.
     */
    vzm36_fan_on_off: {
        key: ["fan_state", "on_time", "off_wait_time"],
        convertSet: async (entity, key, value, meta) => {
            const endpoint = meta.device.getEndpoint(2);

            // is entity an endpoint, or just the device? may need to get the actual endpoint..
            utils.assertEndpoint(entity);
            const state = typeof meta.message.fan_state === "string" ? meta.message.fan_state.toLowerCase() : null;
            utils.validateValue(state, ["toggle", "off", "on"]);

            if (state === "on" && (meta.message.on_time != null || meta.message.off_wait_time != null)) {
                const onTime = meta.message.on_time != null ? meta.message.on_time : 0;
                const offWaitTime = meta.message.off_wait_time != null ? meta.message.off_wait_time : 0;

                if (typeof onTime !== "number") {
                    throw new Error("The on_time value must be a number!");
                }
                if (typeof offWaitTime !== "number") {
                    throw new Error("The off_wait_time value must be a number!");
                }

                const payload = {ctrlbits: 0, ontime: Math.round(onTime * 10), offwaittime: Math.round(offWaitTime * 10)};
                await endpoint.command("genOnOff", "onWithTimedOff", payload, utils.getOptions(meta.mapped, entity));
            } else {
                await endpoint.command("genOnOff", state as "toggle" | "off" | "on", {}, utils.getOptions(meta.mapped, endpoint));
                if (state === "toggle") {
                    const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ""}`];
                    return currentState ? {state: {fan_state: currentState === "OFF" ? "ON" : "OFF"}} : {};
                }
                return {state: {fan_state: state.toUpperCase()}};
            }
        },
        convertGet: async (entity, key, meta) => {
            const endpoint = meta.device.getEndpoint(2);
            await endpoint.read("genOnOff", ["onOff"]);
        },
    } satisfies Tz.Converter,
    breezeMode: (endpointId: number) =>
        ({
            key: ["breezeMode"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertObject<BreezeModeValues>(value);
                // Calculate the value..
                let configValue = 0;
                let term = false;
                configValue += speedToInt(value.speed1);
                configValue += (Number(value.time1) / 5) * 4;

                let speed = speedToInt(value.speed2);

                if (speed !== 0) {
                    configValue += speed * 64;
                    configValue += (value.time2 / 5) * 256;
                } else {
                    term = true;
                }

                speed = speedToInt(value.speed3);

                if (speed !== 0 && !term) {
                    configValue += speed * 4096;
                    configValue += (value.time3 / 5) * 16384;
                } else {
                    term = true;
                }

                speed = speedToInt(value.speed4);

                if (speed !== 0 && !term) {
                    configValue += speed * 262144;
                    configValue += (value.time4 / 5) * 1048576;
                } else {
                    term = true;
                }

                speed = speedToInt(value.speed5);

                if (speed !== 0 && !term) {
                    configValue += speed * 16777216;
                    configValue += (value.time5 / 5) * 67108864;
                } else {
                    term = true;
                }

                const endpoint = meta.device.getEndpoint(endpointId);

                const payload = {breezeMode: configValue.toString()};
                await endpoint.write(INOVELLI_CLUSTER_NAME, payload, {
                    manufacturerCode: INOVELLI,
                });

                return {state: {[key]: value}};
            },
        }) satisfies Tz.Converter,
};

const fzLocal = {
    inovelli: (
        attributes: {[s: string]: Attribute},
        cluster: typeof INOVELLI_CLUSTER_NAME | typeof INOVELLI_MMWAVE_CLUSTER_NAME,
        splitValuesByEndpoint = false,
    ) =>
        ({
            cluster: cluster,
            type: ["raw", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.type === "raw" && msg.endpoint.ID === 2 && msg.data[4] === 0x00) {
                    // Scene Event
                    // # byte 1 - msg.data[6]
                    // # 0 - pressed
                    // # 1 - released
                    // # 2 - held
                    // # 3 - 2x
                    // # 4 - 3x
                    // # 5 - 4x
                    // # 6 - 5x

                    // # byte 2 - msg.data[5]
                    // # 1 - down button
                    // # 2 - up button
                    // # 3 - config button

                    const button = buttonLookup[msg.data[5]];
                    const action = clickLookup[msg.data[6]];
                    return {action: `${button}_${action}`};
                }
                if (msg.type === "readResponse") {
                    return Object.keys(msg.data).reduce((p, c) => {
                        const key = splitValuesByEndpoint ? `${c}_${msg.endpoint.ID}` : c;
                        const raw = (msg.data as Record<string | number, unknown>)[c];
                        if (attributes[key] && attributes[key].displayType === "enum") {
                            return {
                                // biome-ignore lint/performance/noAccumulatingSpread: ignored using `--suppress`
                                ...p,
                                [key]: Object.keys(attributes[key].values).find((k) => attributes[key].values[k] === raw),
                            };
                        }
                        // biome-ignore lint/performance/noAccumulatingSpread: ignored using `--suppress`
                        return {...p, [key]: raw};
                    }, {});
                }
                return msg.data;
            },
        }) satisfies Fz.Converter<typeof cluster, undefined, ["raw", "readResponse"]>,
    fan_mode: (endpointId: number) =>
        ({
            cluster: "genLevelCtrl",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.endpoint.ID === endpointId) {
                    if (msg.data.currentLevel !== undefined) {
                        const mode = intToFanMode(msg.data.currentLevel || 1);
                        return {
                            fan_mode: mode,
                        };
                    }
                }
                return msg.data;
            },
        }) satisfies Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]>,
    fan_state: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.onOff !== undefined) {
                return {fan_state: msg.data.onOff === 1 ? "ON" : "OFF"};
            }
            return msg.data;
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
    brightness: {
        cluster: "genLevelCtrl",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID === 1) {
                if (msg.data.currentLevel !== undefined) {
                    return {brightness: msg.data.currentLevel};
                }
            }
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]>,
    /**
     * Decode breeze mode value:
     *
     * 0: disable
     * 1~0xffffffff: custom (using user configuration parameters) 4bytes
     * Up to 5 different options. First two bits determine the speed. Next four bits is time * 5 seconds.
     * 1111 11 1111 11 1111 11 1111 11 1111 11
     * Setting byte: 00-off, 01-low, 10-meduim, 11-high
     * Each 6 bit word is stored in ascending order, step one word being LSB
     *
     * Extract each nybble of the word, then reverse the calculation to get the setting for each.
     */
    breeze_mode: (endpointId: number) =>
        ({
            cluster: INOVELLI_CLUSTER_NAME,
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.endpoint.ID === endpointId) {
                    // TODO: typo?
                    if (msg.data.breezeMode !== undefined) {
                        const bitmasks = [3, 60, 192, 3840, 12288, 245760, 786432, 15728640, 50331648, 1006632960];
                        const raw = msg.data.breezeMode;
                        const s1 = BREEZE_MODES[raw & bitmasks[0]];
                        const s2 = BREEZE_MODES[(raw & bitmasks[2]) / 64];
                        const s3 = BREEZE_MODES[(raw & bitmasks[4]) / 4096];
                        const s4 = BREEZE_MODES[(raw & bitmasks[6]) / 262144];
                        const s5 = BREEZE_MODES[(raw & bitmasks[8]) / 16777216];

                        const d1 = ((raw & bitmasks[1]) / 4) * 5;
                        const d2 = ((raw & bitmasks[3]) / 256) * 5;
                        const d3 = ((raw & bitmasks[5]) / 16384) * 5;
                        const d4 = ((raw & bitmasks[7]) / 1048576) * 5;
                        const d5 = ((raw & bitmasks[9]) / 67108864) * 5;

                        return {
                            breeze_mode: {
                                speed1: s1,
                                duration1: d1,
                                speed2: s2,
                                duration2: d2,
                                speed3: s3,
                                duration3: d3,
                                speed4: s4,
                                duration4: d4,
                                speed5: s5,
                                duration5: d5,
                            },
                        };
                    }
                }
            },
        }) satisfies Fz.Converter<typeof INOVELLI_CLUSTER_NAME, Inovelli, ["attributeReport", "readResponse"]>,
    vzm36_fan_light_state: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID === 1) {
                if (msg.data.onOff !== undefined) {
                    return {state: msg.data.onOff === 1 ? "ON" : "OFF"};
                }
            } else if (msg.endpoint.ID === 2) {
                if (msg.data.onOff !== undefined) {
                    return {fan_state: msg.data.onOff === 1 ? "ON" : "OFF"};
                }
            } else {
                return msg.data;
            }
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
    led_effect_complete: {
        cluster: INOVELLI_CLUSTER_NAME,
        type: ["commandLedEffectComplete"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.notificationType in LED_NOTIFICATION_TYPES) {
                return {notificationComplete: LED_NOTIFICATION_TYPES[msg.data.notificationType]};
            }
            return {notificationComplete: "Unknown"};
        },
    } satisfies Fz.Converter<typeof INOVELLI_CLUSTER_NAME, Inovelli, ["commandLedEffectComplete"]>,
};

const exposeLedEffects = () => {
    return e
        .composite("led_effect", "led_effect", ea.STATE_SET)
        .withFeature(e.enum("effect", ea.STATE_SET, Object.keys(ledEffects)).withDescription("Animation Effect to use for the LEDs"))
        .withFeature(
            e
                .numeric("color", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription("Calculated by using a hue color circle(value/255*360) If color = 255 display white"),
        )
        .withFeature(e.numeric("level", ea.STATE_SET).withValueMin(0).withValueMax(100).withDescription("Brightness of the LEDs"))
        .withFeature(
            e
                .numeric("duration", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    "1-60 is in seconds calculated 61-120 is in minutes calculated by(value-60) " +
                        "Example a value of 65 would be 65-60 = 5 minutes - 120-254 Is in hours calculated by(value-120) " +
                        "Example a value of 132 would be 132-120 would be 12 hours. - 255 Indefinitely",
                ),
        )
        .withCategory("config");
};

const exposeIndividualLedEffects = () => {
    return e
        .composite("individual_led_effect", "individual_led_effect", ea.STATE_SET)
        .withFeature(e.enum("led", ea.STATE_SET, ["1", "2", "3", "4", "5", "6", "7"]).withDescription("Individual LED to target."))
        .withFeature(e.enum("effect", ea.STATE_SET, Object.keys(individualLedEffects)).withDescription("Animation Effect to use for the LED"))
        .withFeature(
            e
                .numeric("color", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription("Calculated by using a hue color circle(value/255*360) If color = 255 display white"),
        )
        .withFeature(e.numeric("level", ea.STATE_SET).withValueMin(0).withValueMax(100).withDescription("Brightness of the LED"))
        .withFeature(
            e
                .numeric("duration", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    "1-60 is in seconds calculated 61-120 is in minutes calculated by(value-60) " +
                        "Example a value of 65 would be 65-60 = 5 minutes - 120-254 Is in hours calculated by(value-120) " +
                        " Example a value of 132 would be 132-120 would be 12 hours. - 255 Indefinitely",
                ),
        )
        .withCategory("config");
};

const exposeBreezeMode = () => {
    return e
        .composite("breeze mode", "breezeMode", ea.STATE_SET)
        .withFeature(e.enum("speed1", ea.STATE_SET, ["low", "medium", "high"]).withDescription("Step 1 Speed"))
        .withFeature(e.numeric("time1", ea.STATE_SET).withValueMin(1).withValueMax(80).withDescription("Duration (s) for fan in Step 1  "))
        .withFeature(e.enum("speed2", ea.STATE_SET, ["low", "medium", "high"]).withDescription("Step 2 Speed"))
        .withFeature(e.numeric("time2", ea.STATE_SET).withValueMin(1).withValueMax(80).withDescription("Duration (s) for fan in Step 2  "))
        .withFeature(e.enum("speed3", ea.STATE_SET, ["low", "medium", "high"]).withDescription("Step 3 Speed"))
        .withFeature(e.numeric("time3", ea.STATE_SET).withValueMin(1).withValueMax(80).withDescription("Duration (s) for fan in Step 3  "))
        .withFeature(e.enum("speed4", ea.STATE_SET, ["low", "medium", "high"]).withDescription("Step 4 Speed"))
        .withFeature(e.numeric("time4", ea.STATE_SET).withValueMin(1).withValueMax(80).withDescription("Duration (s) for fan in Step 4  "))
        .withFeature(e.enum("speed5", ea.STATE_SET, ["low", "medium", "high"]).withDescription("Step 5 Speed"))
        .withFeature(e.numeric("time5", ea.STATE_SET).withValueMin(1).withValueMax(80).withDescription("Duration (s) for fan in Step 5  "))
        .withCategory("config");
};

const exposeMMWaveControl = () => {
    return e
        .composite("mmwave_control_commands", "mmwave_control_commands", ea.STATE_SET)
        .withFeature(e.enum("controlID", ea.STATE_SET, Object.keys(mmWaveControlCommands)).withDescription("Which mmWave Control command to send"))
        .withCategory("config");
};

const exposeLedEffectComplete = () => {
    return e
        .enum("notificationComplete", ea.STATE, Object.values(LED_NOTIFICATION_TYPES))
        .withDescription("Indication that a specific notification has completed.")
        .withCategory("diagnostic");
};

const BUTTON_TAP_SEQUENCES = [
    "down_single",
    "up_single",
    "config_single",
    "down_release",
    "up_release",
    "config_release",
    "down_held",
    "up_held",
    "config_held",
    "down_double",
    "up_double",
    "config_double",
    "down_triple",
    "up_triple",
    "config_triple",
    "down_quadruple",
    "up_quadruple",
    "config_quadruple",
    "down_quintuple",
    "up_quintuple",
    "config_quintuple",
];

/*
 * Inovelli devices have a huge number of attributes. Calling endpoint.read() in a single call
 * for all attributes causes timeouts even with the timeout set to an absurdly high number (2 minutes)
 */
const chunkedRead = async (endpoint: Zh.Endpoint, attributes: string[], cluster: string) => {
    const chunkSize = 10;
    for (let i = 0; i < attributes.length; i += chunkSize) {
        // XXX: far too dynamic to properly type
        await endpoint.read(cluster, attributes.slice(i, i + chunkSize) as Parameters<typeof endpoint.read>[1]);
    }
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["VZM30-SN"],
        model: "VZM30-SN",
        vendor: "Inovelli",
        description: "On/off switch",
        extend: [
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, "3": 3, "4": 4},
                multiEndpointSkip: ["state", "voltage", "power", "current", "energy", "brightness", "temperature", "humidity"],
            }),
            inovelliExtend.inovelliLight(),
            inovelliExtend.inovelliDevice({
                attrs: [{attributes: VZM30_ATTRIBUTES, clusterName: INOVELLI_CLUSTER_NAME}],
                supportsLedEffects: true,
                supportsButtonTaps: true,
            }),
            inovelliExtend.addCustomClusterInovelli(),
            m.identify(),
            m.temperature(),
            m.humidity(),
            m.electricityMeter({energy: {divisor: 1000}}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["VZM31-SN"],
        model: "VZM31-SN",
        vendor: "Inovelli",
        description: "2-in-1 switch + dimmer",
        extend: [
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, "3": 3},
                multiEndpointSkip: ["state", "power", "energy", "brightness"],
            }),
            inovelliExtend.inovelliLight(),
            inovelliExtend.inovelliDevice({
                attrs: [{attributes: VZM31_ATTRIBUTES, clusterName: INOVELLI_CLUSTER_NAME}],
                supportsLedEffects: true,
                supportsButtonTaps: true,
            }),
            inovelliExtend.addCustomClusterInovelli(),
            m.identify(),
            m.electricityMeter({
                current: false,
                voltage: false,
                power: {min: 15, max: 3600, change: 1},
                energy: {min: 15, max: 3600, change: 0},
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["VZM32-SN"],
        model: "VZM32-SN",
        vendor: "Inovelli",
        description: "mmWave Zigbee Dimmer",
        extend: [
            m.deviceEndpoints({
                endpoints: {"1": 1, "2": 2, "3": 3},
                multiEndpointSkip: ["state", "voltage", "power", "current", "energy", "brightness", "illuminance", "occupancy"],
            }),
            inovelliExtend.inovelliLight(),
            inovelliExtend.inovelliDevice({
                attrs: [
                    {attributes: VZM32_ATTRIBUTES, clusterName: INOVELLI_CLUSTER_NAME},
                    {attributes: VZM32_MMWAVE_ATTRIBUTES, clusterName: INOVELLI_MMWAVE_CLUSTER_NAME},
                ],
                supportsLedEffects: true,
                supportsButtonTaps: true,
            }),
            inovelliExtend.inovelliMMWave(),
            inovelliExtend.addCustomClusterInovelli(),
            inovelliExtend.addCustomMMWaveClusterInovelli(),
            m.identify(),
            m.electricityMeter({
                // Current and voltage were removed in version 0.8 of the firmware and expected to be restored in the future
                current: false,
                voltage: false,
                energy: {divisor: 1000},
            }),
            m.illuminance(),
            m.occupancy(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["VZM35-SN"],
        model: "VZM35-SN",
        vendor: "Inovelli",
        description: "Fan controller",
        extend: [
            inovelliExtend.inovelliFan({endpointId: 1}),
            inovelliExtend.inovelliDevice({
                attrs: [{attributes: VZM35_ATTRIBUTES, clusterName: INOVELLI_CLUSTER_NAME}],
                supportsLedEffects: true,
                supportsButtonTaps: true,
            }),
            inovelliExtend.addCustomClusterInovelli(),
            m.identify(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["VZM36"],
        model: "VZM36",
        vendor: "Inovelli",
        description: "Fan canopy module",
        fromZigbee: [fzLocal.brightness, fzLocal.vzm36_fan_light_state],
        toZigbee: [
            tzLocal.vzm36_fan_on_off, // Need to use VZM36 specific converter
        ],
        extend: [
            inovelliExtend.inovelliLight({splitValuesByEndpoint: true}),
            inovelliExtend.inovelliFan({endpointId: 2, splitValuesByEndpoint: true}),
            inovelliExtend.inovelliDevice({
                attrs: [{attributes: VZM36_ATTRIBUTES, clusterName: INOVELLI_CLUSTER_NAME}],
                supportsLedEffects: false,
                splitValuesByEndpoint: true,
                supportsButtonTaps: false,
            }),
            inovelliExtend.addCustomClusterInovelli(),
            m.identify(),
        ],
        ota: true,
    },
];
