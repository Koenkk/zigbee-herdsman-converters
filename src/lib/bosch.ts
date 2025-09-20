import {Zcl} from "zigbee-herdsman";
import type {TPartialClusterAttributes} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import {repInterval} from "./constants";
import {logger} from "./logger";
import {payload} from "./reporting";
import type {Configure, DefinitionExposesFunction, DummyDevice, Expose, Fz, KeyValue, ModernExtend, OnEvent, Tz, Zh} from "./types";
import * as utils from "./utils";
import {toNumber} from "./utils";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:bosch";

export const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH};

//region Bosch BMCT-DZ/-RZ/-SLZ devices
export interface BoschBmctCluster {
    attributes: {
        /** ID: 0 | Type: ENUM8 | Only used by BMCT-SLZ */
        deviceMode: number;
        /** ID: 1 | Type: ENUM8 */
        switchType: number;
        /** ID: 2 | Type: UINT32 | Only used by BMCT-SLZ */
        calibrationOpeningTime: number;
        /** ID: 3 | Type: UINT32 | Only used by BMCT-SLZ */
        calibrationClosingTime: number;
        /** ID: 4 | Type: BITMAP8 | Used by all BMCT devices, but function is unknown */
        unknownAttributeOne: number;
        /** ID: 5 | Type: UINT8 | Only used by BMCT-SLZ */
        calibrationButtonHoldTime: number;
        /** ID: 6 | Type: BOOLEAN | Only used by BMCT-RZ and BMCT-SLZ */
        autoOffEnabled: number;
        /** ID: 7 | Type: UINT16 | Only used by BMCT-RZ and BMCT-SLZ */
        autoOffTime: number;
        /** ID: 8 | Type: BOOLEAN */
        childLock: number;
        /** ID: 10 | Type: UINT32 | Only used by BMCT-SLZ */
        slatRotationDurationOne: number;
        /** ID: 11 | Type: UINT32 | Only used by BMCT-SLZ */
        slatRotationDurationTwo: number;
        /** ID: 13 | Type: ENUM8 | Only used by BMCT-SLZ */
        motorState: number;
        /** ID: 15 | Type: UINT8 | Only used by BMCT-SLZ */
        calibrationMotorStartDelay: number;
        /** ID: 21 | Type: UINT8 | Only used by BMCT-SLZ */
        calibrationMotorEndPosition: number;
        /** ID: 22 | Type: ENUM8 | Only used by BMCT-DZ */
        dimmerType: number;
        /** ID: 24 | Type: UINT16 | Only used by BMCT-RZ */
        pulseLength: number;
        /** ID: 25 | Type: UINT8 | Only used by BMCT-DZ */
        minimumBrightness: number;
        /** ID: 26 | Type: UINT8 | Only used by BMCT-DZ */
        maximumBrightness: number;
        /** ID: 31 | Type: BOOLEAN on BMCT-DZ and BMCT-RZ, UINT8 on BMCT-SLZ */
        switchMode: number;
        /** ID: 33 | Type: UINT16 | Only used by BMCT-SLZ */
        calibrationNewMotorStartDelay: number;
        /** ID: 34 | Type: ENUM8 | Only used by BMCT-RZ */
        actuatorType: number;
        /** ID: 42 | Type: BOOLEAN | Only used by BMCT-SLZ */
        unknownAttributeTwo: number;
    };
    commands: never;
    commandResponses: never;
}

export const boschBmctExtend = {
    switchMode: (args: {endpoint?: number; deviceModeLookup?: KeyValue; switchModeLookup: KeyValue; switchTypeLookup: KeyValue}): ModernExtend => {
        const {endpoint, deviceModeLookup, switchModeLookup, switchTypeLookup} = args;

        const expose: DefinitionExposesFunction = (device: Zh.Device | DummyDevice, options: KeyValue) => {
            if (utils.isDummyDevice(device)) {
                return [];
            }

            const switchTypeKey = device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "switchType") ?? 0x00;
            const selectedSwitchType = utils.getFromLookupByValue(switchTypeKey, switchTypeLookup);

            if (selectedSwitchType === "none") {
                return [];
            }

            let supportedSwitchModes = Object.keys(switchModeLookup);

            if (device.modelID === "RBSH-MMS-ZB-EU") {
                const deviceModeKey = device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "deviceMode");
                const deviceMode = utils.getFromLookupByValue(deviceModeKey, deviceModeLookup);

                if (deviceMode === "light") {
                    if (selectedSwitchType.includes("rocker_switch")) {
                        supportedSwitchModes = supportedSwitchModes.filter((switchMode) => switchMode === "coupled" || switchMode === "decoupled");
                    }
                }

                if (deviceMode === "shutter") {
                    if (selectedSwitchType.includes("button")) {
                        supportedSwitchModes = supportedSwitchModes.filter(
                            (switchMode) => switchMode === "coupled" || switchMode === "only_long_press_decoupled",
                        );
                    } else if (selectedSwitchType.includes("rocker_switch")) {
                        supportedSwitchModes = supportedSwitchModes.filter((switchMode) => switchMode === "coupled");
                    }
                }
            }

            const switchModeExpose = e
                .enum("switch_mode", ea.ALL, supportedSwitchModes)
                .withDescription(
                    "Decouple the switch from the corresponding output to use it for other purposes. Please keep in mind that the available options may depend on the used switch type.",
                )
                .withCategory("config");

            if (endpoint !== undefined) {
                switchModeExpose.withEndpoint(endpoint.toString());
            }

            return [switchModeExpose];
        };

        const fromZigbee = [
            {
                cluster: "boschSpecific",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.switchMode !== undefined) {
                        const property = utils.postfixWithEndpointName("switch_mode", msg, model, meta);
                        result[property] = utils.getFromLookupByValue(data.switchMode, switchModeLookup);
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschSpecific", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["switch_mode"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "switch_mode") {
                        const index = <number>utils.getFromLookup(value, switchModeLookup);
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {switchMode: index});
                        return {state: {switch_mode: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "switch_mode") {
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchMode"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const desiredEndpoint = device.getEndpoint(endpoint ?? 1);
                await desiredEndpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchMode"]);
            },
        ];

        return {
            exposes: [expose],
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    autoOff: (args?: {endpoint?: number}): ModernExtend => {
        const {endpoint} = args ?? {};

        const offOnLookup: KeyValue = {
            OFF: 0x00,
            ON: 0x01,
        };

        const expose: DefinitionExposesFunction = (device: Zh.Device | DummyDevice, options: KeyValue) => {
            if (utils.isDummyDevice(device)) {
                return [];
            }

            if (device.modelID === "RBSH-MMR-ZB-EU") {
                const pulsedModeEnabled = device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "pulseLength") !== 0;

                if (pulsedModeEnabled) {
                    return [];
                }
            }

            const autoOffEnabledExpose = e
                .binary("auto_off_enabled", ea.ALL, utils.getFromLookupByValue(0x01, offOnLookup), utils.getFromLookupByValue(0x00, offOnLookup))
                .withLabel("Enable auto-off")
                .withDescription("Enable/disable the automatic turn-off feature")
                .withCategory("config");

            const autoOffTimeExpose = e
                .numeric("auto_off_time", ea.ALL)
                .withLabel("Auto-off time")
                .withDescription("Turn off the output after the specified amount of time. Only in action when the automatic turn-off is enabled.")
                .withUnit("min")
                .withValueMin(0)
                .withValueMax(720)
                .withValueStep(1)
                .withCategory("config");

            if (endpoint !== undefined) {
                autoOffEnabledExpose.withEndpoint(endpoint.toString());
                autoOffTimeExpose.withEndpoint(endpoint.toString());
            }

            return [autoOffEnabledExpose, autoOffTimeExpose];
        };

        const fromZigbee = [
            {
                cluster: "boschSpecific",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.autoOffEnabled !== undefined) {
                        const property = utils.postfixWithEndpointName("auto_off_enabled", msg, model, meta);
                        result[property] = utils.getFromLookupByValue(data.autoOffEnabled, offOnLookup);
                    }

                    if (data.autoOffTime !== undefined) {
                        const property = utils.postfixWithEndpointName("auto_off_time", msg, model, meta);
                        result[property] = msg.data.autoOffTime / 60;
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschSpecific", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["auto_off_enabled", "auto_off_time"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "auto_off_enabled") {
                        const selectedState = <number>utils.getFromLookup(value, offOnLookup);
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {autoOffEnabled: selectedState});
                        return {state: {auto_off_enabled: value}};
                    }

                    if (key === "auto_off_time") {
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {autoOffTime: toNumber(value) * 60});
                        return {state: {auto_off_time: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "auto_off_enabled") {
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["autoOffEnabled"]);
                    }
                    if (key === "auto_off_time") {
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["autoOffTime"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const desiredEndpoint = device.getEndpoint(endpoint ?? 1);
                await desiredEndpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["autoOffEnabled", "autoOffTime"]);
            },
        ];

        return {
            exposes: [expose],
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    childLock: (args?: {endpoint?: number}): ModernExtend => {
        const {endpoint} = args ?? {};

        const childLockLookup: KeyValue = {
            UNLOCKED: 0x00,
            LOCKED: 0x01,
        };

        const expose: DefinitionExposesFunction = (device: Zh.Device | DummyDevice, options: KeyValue) => {
            if (utils.isDummyDevice(device)) {
                return [];
            }

            const currentSwitchType = device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "switchType") ?? 0x00;

            if (currentSwitchType === 0) {
                return [];
            }

            const childLockExpose = e
                .binary("child_lock", ea.ALL, utils.getFromLookupByValue(0x01, childLockLookup), utils.getFromLookupByValue(0x00, childLockLookup))
                .withDescription("Enables/disables physical input on the switch")
                .withCategory("config");

            if (endpoint !== undefined) {
                childLockExpose.withEndpoint(endpoint.toString());
            }

            return [childLockExpose];
        };

        const fromZigbee = [
            {
                cluster: "boschSpecific",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.childLock !== undefined) {
                        const property = utils.postfixWithEndpointName("child_lock", msg, model, meta);
                        result[property] = data.childLock;
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschSpecific", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["child_lock"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "child_lock") {
                        const selectedMode = <number>utils.getFromLookup(value, childLockLookup);

                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {childLock: selectedMode});

                        return {state: {child_lock: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "child_lock") {
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["childLock"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const desiredEndpoint = device.getEndpoint(endpoint ?? 1);
                await desiredEndpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["childLock"]);
            },
        ];

        return {
            exposes: [expose],
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    actuatorType: () =>
        m.enumLookup<"boschSpecific", BoschBmctCluster>({
            name: "actuator_type",
            cluster: "boschSpecific",
            attribute: "actuatorType",
            description: "Select the appropriate actuator type so that the connected device can be controlled correctly.",
            lookup: {
                normally_closed: 0x00,
                normally_open: 0x01,
            },
            entityCategory: "config",
        }),
    dimmerType: () =>
        m.enumLookup<"boschSpecific", BoschBmctCluster>({
            name: "dimmer_type",
            cluster: "boschSpecific",
            attribute: "dimmerType",
            description: "Select the appropriate dimmer type for your lamps. Make sure that you are only using dimmable lamps.",
            lookup: {
                leading_edge_phase_cut: 0x00,
                trailing_edge_phase_cut: 0x01,
            },
            entityCategory: "config",
        }),
    brightnessRange: (): ModernExtend => {
        const expose: DefinitionExposesFunction = (device: Zh.Device | DummyDevice, options: KeyValue) => {
            if (utils.isDummyDevice(device)) {
                return [];
            }

            const minimumBrightnessExpose = e
                .numeric("minimum_brightness", ea.ALL)
                .withLabel("Raise minimum brightness")
                .withDescription("This raises the minimum brightness level of the connected light")
                .withValueMin(0)
                .withValueMax(255)
                .withCategory("config");

            const maximumBrightnessExpose = e
                .numeric("maximum_brightness", ea.ALL)
                .withLabel("Lower maximum brightness")
                .withDescription("This lowers the maximum brightness level of the connected light")
                .withValueMin(0)
                .withValueMax(255)
                .withCategory("config");

            return [minimumBrightnessExpose, maximumBrightnessExpose];
        };

        const fromZigbee = [
            {
                cluster: "boschSpecific",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.minimumBrightness !== undefined) {
                        result.minimum_brightness = data.minimumBrightness;
                    }

                    if (data.maximumBrightness !== undefined) {
                        result.maximum_brightness = data.maximumBrightness;
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschSpecific", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["minimum_brightness", "maximum_brightness"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "minimum_brightness") {
                        const newMinimumBrightness = toNumber(value);
                        const currentState = await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["maximumBrightness"]);

                        if (newMinimumBrightness >= currentState.maximumBrightness) {
                            throw new Error("The minimum brightness must be lower than the maximum brightness!");
                        }

                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {minimumBrightness: newMinimumBrightness});

                        return {state: {minimum_brightness: value}};
                    }

                    if (key === "maximum_brightness") {
                        const newMaximumBrightness = toNumber(value);
                        const currentState = await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["minimumBrightness"]);

                        if (newMaximumBrightness <= currentState.minimumBrightness) {
                            throw new Error("The maximum brightness must be higher than the minimum brightness!");
                        }

                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {maximumBrightness: newMaximumBrightness});

                        return {state: {maximum_brightness: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "minimum_brightness") {
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["minimumBrightness"]);
                    }
                    if (key === "maximum_brightness") {
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["maximumBrightness"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["minimumBrightness", "maximumBrightness"]);
            },
        ];

        return {
            exposes: [expose],
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    rzDeviceModes: (args: {deviceModesLookup: KeyValue}): ModernExtend => {
        const {deviceModesLookup} = args;

        const expose: DefinitionExposesFunction = (device: Zh.Device | DummyDevice, options: KeyValue) => {
            if (utils.isDummyDevice(device)) {
                return [];
            }

            const deviceModeExpose = e
                .enum("device_mode", ea.SET, Object.keys(deviceModesLookup))
                .withLabel("Device mode")
                .withDescription("Set the desired mode of the relay")
                .withCategory("config");

            return [deviceModeExpose];
        };

        const toZigbee: Tz.Converter[] = [
            {
                key: ["device_mode"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "device_mode") {
                        const deviceModeChanged = meta.state.device_mode !== value;

                        if (deviceModeChanged) {
                            const newPulseLength: number = value === utils.getFromLookupByValue(0x00, deviceModesLookup) ? 0 : 10;
                            const endpoint = meta.device.getEndpoint(1);

                            if (newPulseLength > 0) {
                                await endpoint.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {
                                    switchType: 0x05,
                                    switchMode: 0x00,
                                    childLock: 0x00,
                                    autoOffEnabled: 0x00,
                                    autoOffTime: 0,
                                });

                                await endpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", [
                                    "switchType",
                                    "switchMode",
                                    "childLock",
                                    "autoOffEnabled",
                                    "autoOffTime",
                                ]);
                            } else {
                                await endpoint.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {
                                    switchType: 0x00,
                                    switchMode: 0x00,
                                    childLock: 0x00,
                                });
                                await endpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchType", "switchMode", "childLock"]);
                            }

                            await endpoint.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {pulseLength: newPulseLength});
                            await endpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["pulseLength"]);
                        }

                        return {state: {device_mode: value}};
                    }
                },
            },
        ];

        return {
            exposes: [expose],
            toZigbee,
            isModernExtend: true,
        };
    },
    pulseLength: (args: {updateDeviceMode: boolean; deviceModesLookup?: KeyValue}): ModernExtend => {
        const {updateDeviceMode, deviceModesLookup} = args;

        const expose: DefinitionExposesFunction = (device: Zh.Device | DummyDevice, options: KeyValue) => {
            if (utils.isDummyDevice(device)) {
                return [];
            }

            if (device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "pulseLength") === 0) {
                return [];
            }

            const pulseLengthExpose = e
                .numeric("pulse_length", ea.ALL)
                .withLabel("Pulse length")
                .withDescription("Set the desired pulse length for the relay in seconds.")
                .withUnit("s")
                .withValueStep(0.1)
                .withValueMin(0.5)
                .withValueMax(20)
                .withCategory("config");

            return [pulseLengthExpose];
        };

        const fromZigbee = [
            {
                cluster: "boschSpecific",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.pulseLength !== undefined) {
                        const currentPulseLength = data.pulseLength / 10;
                        const oldPulseLength = meta.device.meta.pulseLength ?? 0;

                        const pulsedModeActivated = currentPulseLength > 0 && oldPulseLength === 0;
                        const pulsedModeDeactivated = currentPulseLength === 0 && oldPulseLength > 0;

                        if (pulsedModeActivated || pulsedModeDeactivated) {
                            meta.device.meta.pulseLength = currentPulseLength;
                            meta.deviceExposesChanged();
                        }

                        if (updateDeviceMode) {
                            result.device_mode =
                                currentPulseLength === 0
                                    ? utils.getFromLookupByValue(0x00, deviceModesLookup)
                                    : utils.getFromLookupByValue(0x01, deviceModesLookup);
                        }

                        result.pulse_length = currentPulseLength;
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschSpecific", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["pulse_length"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "pulse_length") {
                        const selectedPulseLength = toNumber(value) * 10;

                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {pulseLength: selectedPulseLength});

                        return {state: {pulse_length: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "pulse_length") {
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["pulseLength"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["pulseLength"]);
            },
        ];

        return {
            exposes: [expose],
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    switchType: (args: {switchTypeLookup: KeyValue}): ModernExtend => {
        const {switchTypeLookup} = args;

        const expose: DefinitionExposesFunction = (device, options) => {
            if (utils.isDummyDevice(device)) {
                return [];
            }

            let supportedSwitchTypes = Object.keys(switchTypeLookup);

            if (device.modelID === "RBSH-MMR-ZB-EU") {
                const pulseModeActive = <number>device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "pulseLength") > 0;

                if (pulseModeActive) {
                    supportedSwitchTypes = Object.keys(switchTypeLookup).filter(
                        (switchType) => switchType !== utils.getFromLookup("rocker_switch", switchTypeLookup),
                    );
                }
            }

            const switchTypeExpose = e
                .enum("switch_type", ea.ALL, supportedSwitchTypes)
                .withLabel("Connected switch type")
                .withDescription(
                    "Select which switch type is connected to the module. Please keep in mind that the available options may depend on the selected device mode.",
                )
                .withCategory("config");

            return [switchTypeExpose];
        };

        const fromZigbee = [
            {
                cluster: "boschSpecific",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.switchType !== undefined) {
                        const switchType = data.switchType;
                        result.switch_type = utils.getFromLookupByValue(switchType, switchTypeLookup);

                        if (switchType !== meta.device.meta.switchType) {
                            meta.device.meta.switchType = switchType;
                            meta.deviceExposesChanged();
                        }
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschSpecific", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["switch_type"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "switch_type") {
                        const selectedSwitchType = <number>utils.getFromLookup(value, switchTypeLookup);

                        if (meta.device.meta.switchType !== selectedSwitchType) {
                            const endpoints = meta.device.endpoints.filter((e) => e.supportsInputCluster("boschSpecific"));

                            for (const endpoint of endpoints) {
                                await endpoint.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {
                                    switchMode: 0x00,
                                    childLock: 0x00,
                                });
                                await endpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchMode", "childLock"]);
                            }
                        }

                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {switchType: selectedSwitchType});
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchType"]);

                        return {state: {switch_type: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "switch_type") {
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchType"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchType"]);
            },
        ];

        return {
            exposes: [expose],
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    handleZclVersionReadRequest: (): ModernExtend => {
        const onEvent: OnEvent.Handler[] = [
            (event) => {
                if (event.type !== "deviceAnnounce") {
                    return;
                }

                event.data.device.customReadResponse = (frame, endpoint) => {
                    const isZclVersionRequest = frame.isCluster("genBasic") && frame.payload.find((i: {attrId: number}) => i.attrId === 0);

                    if (!isZclVersionRequest) {
                        return false;
                    }

                    const payload: TPartialClusterAttributes<"genBasic"> = {
                        zclVersion: 1,
                    };

                    endpoint.readResponse(frame.cluster.name, frame.header.transactionSequenceNumber, payload).catch((e) => {
                        logger.warning(`Custom zclVersion response failed for '${event.data.device.ieeeAddr}': ${e}`, NS);
                    });

                    return true;
                };
            },
        ];
        return {
            onEvent,
            isModernExtend: true,
        };
    },

    reportSwitchAction: (args: {switchTypeLookup: KeyValue; hasDualSwitchInputs: boolean}): ModernExtend => {
        const {switchTypeLookup, hasDualSwitchInputs} = args;

        const expose: DefinitionExposesFunction = (device, options) => {
            const exposeList: Expose[] = [];

            if (utils.isDummyDevice(device)) {
                return exposeList;
            }

            const switchTypeKey = device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "switchType") ?? 0x00;
            const selectedSwitchType = utils.getFromLookupByValue(switchTypeKey, switchTypeLookup);

            let supportedActionTypes: string[];

            if (selectedSwitchType.includes("button")) {
                if (hasDualSwitchInputs) {
                    supportedActionTypes = [
                        "press_released_left",
                        "press_released_right",
                        "hold_left",
                        "hold_right",
                        "hold_released_left",
                        "hold_released_right",
                    ];
                } else {
                    supportedActionTypes = ["press_released", "hold", "hold_released"];
                }

                exposeList.push(e.action(supportedActionTypes), e.action_duration());
            } else if (selectedSwitchType.includes("rocker_switch")) {
                if (hasDualSwitchInputs) {
                    supportedActionTypes = ["opened_left", "opened_right", "closed_left", "closed_right"];
                } else {
                    supportedActionTypes = ["opened", "closed"];
                }

                exposeList.push(e.action(supportedActionTypes));
            }

            return exposeList;
        };

        const fromZigbee = [
            {
                cluster: "boschSpecific",
                type: ["raw"],
                convert: (model, msg, publish, options, meta) => {
                    const command = msg.data[4];

                    if (command !== 0x03 && command !== 0x04) {
                        return;
                    }

                    let state: string;
                    const status = msg.data[5];
                    const duration = msg.data[6] / 10;

                    switch (status) {
                        case 0:
                            state = "press_released";
                            break;
                        case 1:
                            state = duration !== 0 ? "hold" : "hold_released";
                            break;
                        case 2:
                            state = "closed";
                            break;
                        case 3:
                            state = "opened";
                            break;
                    }

                    let action: string;

                    if (hasDualSwitchInputs) {
                        const triggeredSide = command === 0x03 ? "left" : "right";
                        action = `${state}_${triggeredSide}`;
                    } else {
                        action = state;
                    }

                    return {action: action, action_duration: duration};
                },
            } satisfies Fz.Converter<"boschSpecific", BoschBmctCluster, ["raw"]>,
        ];

        return {
            exposes: [expose],
            fromZigbee,
            isModernExtend: true,
        };
    },
    slzExtends: (): ModernExtend => {
        const stateDeviceMode = {
            light: 0x04,
            shutter: 0x01,
            disabled: 0x00,
        };
        const stateMotor = {
            stopped: 0x00,
            opening: 0x01,
            closing: 0x02,
            unknownOne: 0x03,
            unknownTwo: 0x04,
        };
        const stateSwitchType = {
            button: 0x01,
            button_key_change: 0x02,
            rocker_switch: 0x03,
            rocker_switch_key_change: 0x04,
            none: 0x00,
        };
        const stateSwitchMode = {
            coupled: 0x00,
            decoupled: 0x01,
            only_short_press_decoupled: 0x02,
            only_long_press_decoupled: 0x03,
        };
        const stateOffOn = {
            OFF: 0x00,
            ON: 0x01,
        };
        const fromZigbee = [
            fz.on_off_force_multiendpoint,
            fz.power_on_behavior,
            fz.cover_position_tilt,
            {
                cluster: "boschSpecific",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;
                    if (data.deviceMode !== undefined) {
                        result.device_mode = Object.keys(stateDeviceMode).find(
                            (key) => stateDeviceMode[key as keyof typeof stateDeviceMode] === msg.data.deviceMode,
                        );
                        const deviceMode = msg.data.deviceMode;
                        if (deviceMode !== meta.device.meta.deviceMode) {
                            meta.device.meta.deviceMode = deviceMode;
                            meta.deviceExposesChanged();
                        }
                    }
                    if (data.switchType !== undefined) {
                        const switchType = msg.data.switchType;
                        result.switch_type = Object.keys(stateSwitchType).find(
                            (key) => stateSwitchType[key as keyof typeof stateSwitchType] === switchType,
                        );

                        if (switchType !== meta.device.meta.switchType) {
                            meta.device.meta.switchType = switchType;
                            meta.deviceExposesChanged();
                        }
                    }
                    if (data.switchMode !== undefined) {
                        const property = utils.postfixWithEndpointName("switch_mode", msg, model, meta);
                        result[property] = Object.keys(stateSwitchMode).find(
                            (key) => stateSwitchMode[key as keyof typeof stateSwitchMode] === msg.data.switchMode,
                        );
                    }
                    if (data.calibrationOpeningTime !== undefined) {
                        result.calibration_opening_time = msg.data.calibrationOpeningTime / 10;
                    }
                    if (data.calibrationClosingTime !== undefined) {
                        result.calibration_closing_time = msg.data.calibrationClosingTime / 10;
                    }
                    if (data.calibrationButtonHoldTime !== undefined) {
                        result.calibration_button_hold_time = msg.data.calibrationButtonHoldTime / 10;
                    }
                    if (data.calibrationMotorStartDelay !== undefined) {
                        result.calibration_motor_start_delay = msg.data.calibrationMotorStartDelay / 10;
                    }
                    if (data.childLock !== undefined) {
                        const property = utils.postfixWithEndpointName("child_lock", msg, model, meta);
                        result[property] = msg.data.childLock === 1 ? "ON" : "OFF";
                    }
                    if (data.motorState !== undefined) {
                        result.motor_state = Object.keys(stateMotor).find(
                            (key) => stateMotor[key as keyof typeof stateMotor] === msg.data.motorState,
                        );
                    }
                    if (data.autoOffEnabled !== undefined) {
                        const property = utils.postfixWithEndpointName("auto_off_enabled", msg, model, meta);
                        result[property] = msg.data.autoOffEnabled === 1 ? "ON" : "OFF";
                    }
                    if (data.autoOffTime !== undefined) {
                        const property = utils.postfixWithEndpointName("auto_off_time", msg, model, meta);
                        result[property] = msg.data.autoOffTime / 60;
                    }
                    return result;
                },
            } satisfies Fz.Converter<"boschSpecific", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            tz.power_on_behavior,
            tz.cover_position_tilt,
            {
                key: [
                    "device_mode",
                    "switch_type",
                    "switch_mode",
                    "child_lock",
                    "state",
                    "on_time",
                    "off_wait_time",
                    "auto_off_enabled",
                    "auto_off_time",
                ],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "state") {
                        if ("ID" in entity && entity.ID === 1) {
                            await tz.cover_state.convertSet(entity, key, value, meta);
                        } else {
                            await tz.on_off.convertSet(entity, key, value, meta);
                        }
                    }
                    if (key === "on_time" || key === "on_wait_time") {
                        if ("ID" in entity && entity.ID !== 1) {
                            await tz.on_off.convertSet(entity, key, value, meta);
                        }
                    }
                    if (key === "device_mode") {
                        const index = utils.getFromLookup(value, stateDeviceMode);
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {deviceMode: index});
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["deviceMode"]);
                        return {state: {device_mode: value}};
                    }
                    if (key === "switch_type") {
                        const applyDefaultForSwitchModeAndChildLock = async (endpoint: Zh.Endpoint | Zh.Group) => {
                            const switchModeDefault = utils.getFromLookup("coupled", stateSwitchMode);
                            const childLockDefault = utils.getFromLookup("OFF", stateOffOn);

                            await endpoint.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {
                                switchMode: switchModeDefault,
                                childLock: childLockDefault,
                            });
                            await endpoint.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchMode", "childLock"]);
                        };

                        const switchType = utils.getFromLookup(value, stateSwitchType);
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {switchType: switchType});
                        await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchType"]);
                        await applyDefaultForSwitchModeAndChildLock(entity);

                        const leftEndpoint = meta.device.getEndpoint(2);
                        await applyDefaultForSwitchModeAndChildLock(leftEndpoint);

                        const rightEndpoint = meta.device.getEndpoint(3);
                        await applyDefaultForSwitchModeAndChildLock(rightEndpoint);

                        return {state: {switch_type: value}};
                    }
                    if (key === "switch_mode") {
                        const index = utils.getFromLookup(value, stateSwitchMode);
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {switchMode: index});
                        return {state: {switch_mode: value}};
                    }
                    if (key === "child_lock") {
                        const index = utils.getFromLookup(value, stateOffOn);
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {childLock: index});
                        return {state: {child_lock: value}};
                    }
                    if (key === "auto_off_enabled") {
                        const index = utils.getFromLookup(value, stateOffOn);
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {autoOffEnabled: index});
                        return {state: {auto_off_enabled: value}};
                    }
                    if (key === "auto_off_time" && typeof value === "number") {
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {autoOffTime: value * 60});
                        return {state: {auto_off_time: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    switch (key) {
                        case "state":
                        case "on_time":
                        case "off_wait_time":
                            if ("ID" in entity && entity.ID !== 1) {
                                await entity.read("genOnOff", ["onOff"]);
                            }
                            break;
                        case "device_mode":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["deviceMode"]);
                            break;
                        case "switch_type":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchType"]);
                            break;
                        case "switch_mode":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchMode"]);
                            break;
                        case "child_lock":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["childLock"]);
                            break;
                        case "auto_off_enabled":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["autoOffEnabled"]);
                            break;
                        case "auto_off_time":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["autoOffTime"]);
                            break;
                        default:
                            throw new Error(`Unhandled key boschExtend.bmct.toZigbee.convertGet ${key}`);
                    }
                },
            },
            {
                key: ["calibration_closing_time", "calibration_opening_time", "calibration_button_hold_time", "calibration_motor_start_delay"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "calibration_opening_time") {
                        const number = utils.toNumber(value, "calibration_opening_time");
                        const index = number * 10;
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {calibrationOpeningTime: index});
                        return {state: {calibration_opening_time: number}};
                    }
                    if (key === "calibration_closing_time") {
                        const number = utils.toNumber(value, "calibration_closing_time");
                        const index = number * 10;
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {calibrationClosingTime: index});
                        return {state: {calibration_closing_time: number}};
                    }
                    if (key === "calibration_button_hold_time") {
                        const number = utils.toNumber(value, "calibration_button_hold_time");
                        const index = number * 10;
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {calibrationButtonHoldTime: index});
                        return {state: {calibration_button_hold_time: number}};
                    }
                    if (key === "calibration_motor_start_delay") {
                        const number = utils.toNumber(value, "calibration_motor_start_delay");
                        const index = number * 10;
                        await entity.write<"boschSpecific", BoschBmctCluster>("boschSpecific", {calibrationMotorStartDelay: index});
                        return {state: {calibration_motor_start_delay: number}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    switch (key) {
                        case "calibration_opening_time":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["calibrationOpeningTime"]);
                            break;
                        case "calibration_closing_time":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["calibrationClosingTime"]);
                            break;
                        case "calibration_button_hold_time":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["calibrationButtonHoldTime"]);
                            break;
                        case "calibration_motor_start_delay":
                            await entity.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["calibrationMotorStartDelay"]);
                            break;
                        default:
                            throw new Error(`Unhandled key boschExtend.bmct.toZigbee.convertGet ${key}`);
                    }
                },
            },
        ];
        return {
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
};
//endregion

//region Bosch BSIR-EZ (Outdoor siren)
export interface BoschBsirPowerCfgCluster {
    attributes: {
        /** ID: 40960 | Type: UINT16 */
        solarPanelVoltage: number;
        /** ID: 40961 | Type: UINT8 |
         * This was 1 in most of the cases during testing.
         * Only when the solar panel delivered high voltages
         * did I record 2 and 3 for pretty short times.
         * But was unable to find a clear linkage to the
         * charging behavior. That's why I haven't exposed it yet. */
        unknownAttribute: number;
        /** ID: 40962 | Type: UINT8 */
        primaryPowerSource: number;
    };
    commands: never;
    commandResponses: never;
}

export interface BoschBsirIasZoneCluster {
    attributes: {
        /** ID: 40960 | Type: UINT8 */
        currentPowerSource: number;
    };
    commands: {
        /** ID: 243 */
        acknowledgeStatusChange: {
            /** Type: UINT8 */
            data: number;
        };
    };
    commandResponses: never;
}

export interface BoschBsirIasWdCluster {
    attributes: {
        /** ID: 40960 | Type: UINT8 */
        sirenDuration: number;
        /** ID: 40961 | Type: UINT8 */
        alarmMode: number;
        /** ID: 40962 | Type: UINT8 */
        sirenVolume: number;
        /** ID: 40963 | Type: UINT16 */
        sirenDelay: number;
        /** ID: 40964 | Type: UINT16 */
        lightDelay: number;
        /** ID: 40965 | Type: UINT8 */
        lightDuration: number;
        /** ID: 40966 | Type: UINT8 */
        deviceState: number;
    };
    commands: {
        /** ID: 243 */
        alarmControl: {
            /** Type: UINT16 */
            data: number;
        };
    };
    commandResponses: never;
}

export const boschBsirExtend = {
    customPowerCfgCluster: () =>
        m.deviceAddCustomCluster("genPowerCfg", {
            ID: Zcl.Clusters.genPowerCfg.ID,
            attributes: {
                solarPanelVoltage: {ID: 0xa000, type: Zcl.DataType.UINT16, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownAttribute: {ID: 0xa001, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                primaryPowerSource: {ID: 0xa002, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
            },
            commands: {},
            commandsResponse: {},
        }),
    customIasZoneCluster: () =>
        m.deviceAddCustomCluster("ssIasZone", {
            ID: Zcl.Clusters.ssIasZone.ID,
            attributes: {
                currentPowerSource: {ID: 0xa001, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
            },
            commands: {
                acknowledgeStatusChange: {
                    ID: 0xf3,
                    parameters: [{name: "data", type: Zcl.DataType.UINT8}],
                },
            },
            commandsResponse: {},
        }),
    customIasWdCluster: () =>
        m.deviceAddCustomCluster("ssIasWd", {
            ID: Zcl.Clusters.ssIasWd.ID,
            attributes: {
                sirenDuration: {ID: 0xa000, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                alarmMode: {ID: 0xa001, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                sirenVolume: {ID: 0xa002, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                sirenDelay: {ID: 0xa003, type: Zcl.DataType.UINT16, manufacturerCode: manufacturerOptions.manufacturerCode},
                lightDelay: {ID: 0xa004, type: Zcl.DataType.UINT16, manufacturerCode: manufacturerOptions.manufacturerCode},
                lightDuration: {ID: 0xa005, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                deviceState: {ID: 0xa006, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
            },
            commands: {
                alarmControl: {
                    ID: 0xf0,
                    parameters: [{name: "data", type: Zcl.DataType.UINT8}],
                },
            },
            commandsResponse: {},
        }),
    alarmControl: (): ModernExtend => {
        const exposes: Expose[] = [
            e
                .enum("trigger_alarm", ea.SET, ["trigger"])
                .withLabel("Trigger alarm")
                .withDescription("Trigger an alarm on the device")
                .withCategory("config"),
            e
                .enum("stop_alarm", ea.SET, ["stop"])
                .withLabel("Stop alarm")
                .withDescription(
                    "Stop an active alarm on the device. Please keep in mind that the alarm stops automatically after the configured duration for the light and siren is expired.",
                )
                .withCategory("config"),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["trigger_alarm", "stop_alarm"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "trigger_alarm") {
                        await entity.command<"ssIasWd", "alarmControl", BoschBsirIasWdCluster>(
                            "ssIasWd",
                            "alarmControl",
                            {data: 0x07},
                            manufacturerOptions,
                        );
                    }

                    if (key === "stop_alarm") {
                        await entity.command<"ssIasWd", "alarmControl", BoschBsirIasWdCluster>(
                            "ssIasWd",
                            "alarmControl",
                            {data: 0x00},
                            manufacturerOptions,
                        );
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.bind("ssIasWd", coordinatorEndpoint);
            },
        ];

        return {
            exposes,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    deviceState: () =>
        m.enumLookup<"ssIasWd", BoschBsirIasWdCluster>({
            name: "device_state",
            cluster: "ssIasWd",
            attribute: "deviceState",
            description:
                "Current state of the siren and light. Please keep in mind that these activate after the specified delay time (except when using an external alarm trigger).",
            lookup: {
                siren_active_from_external_trigger: 0x05,
                light_active_from_external_trigger: 0x06,
                siren_and_light_active_from_external_trigger: 0x07,
                siren_active: 0x09,
                light_active: 0x0a,
                siren_and_light_active: 0x0b,
                idle: 0x00,
            },
            access: "STATE_GET",
        }),
    battery: () =>
        m.battery({
            percentage: true,
            percentageReportingConfig: {
                min: "MIN",
                max: "MAX",
                change: 1,
            },
            lowStatus: true,
            lowStatusReportingConfig: {
                min: "MIN",
                max: "MAX",
                change: 0,
            },
        }),
    lightDelay: () =>
        m.numeric<"ssIasWd", BoschBsirIasWdCluster>({
            name: "light_delay",
            cluster: "ssIasWd",
            attribute: "lightDelay",
            description: "Delay of the light activation after an alarm is being triggered",
            valueMin: 0,
            valueMax: 180,
            valueStep: 1,
            unit: "sec",
            entityCategory: "config",
        }),
    sirenDelay: () =>
        m.numeric<"ssIasWd", BoschBsirIasWdCluster>({
            name: "siren_delay",
            cluster: "ssIasWd",
            attribute: "sirenDelay",
            description: "Delay of the siren activation after an alarm is being triggered",
            valueMin: 0,
            valueMax: 180,
            valueStep: 1,
            unit: "sec",
            entityCategory: "config",
        }),
    sirenDuration: () =>
        m.numeric<"ssIasWd", BoschBsirIasWdCluster>({
            name: "siren_duration",
            cluster: "ssIasWd",
            attribute: "sirenDuration",
            description: "Duration of the alarm siren",
            valueMin: 1,
            valueMax: 15,
            valueStep: 1,
            unit: "min",
            entityCategory: "config",
        }),
    lightDuration: () =>
        m.numeric<"ssIasWd", BoschBsirIasWdCluster>({
            name: "light_duration",
            cluster: "ssIasWd",
            attribute: "lightDuration",
            description: "Duration of the alarm light",
            valueMin: 1,
            valueMax: 15,
            valueStep: 1,
            unit: "min",
            entityCategory: "config",
        }),
    sirenVolume: () =>
        m.enumLookup<"ssIasWd", BoschBsirIasWdCluster>({
            name: "siren_volume",
            cluster: "ssIasWd",
            attribute: "sirenVolume",
            description: "Volume of the siren",
            lookup: {
                reduced: 0x01,
                medium: 0x02,
                loud: 0x03,
            },
            entityCategory: "config",
        }),
    alarmMode: () =>
        m.enumLookup<"ssIasWd", BoschBsirIasWdCluster>({
            name: "alarm_mode",
            cluster: "ssIasWd",
            attribute: "alarmMode",
            description: "Select if you only want a visual warning, an acoustic warning or both",
            lookup: {
                only_light: 0x00,
                only_siren: 0x01,
                siren_and_light: 0x02,
            },
            entityCategory: "config",
        }),
    primaryPowerSource: () =>
        m.enumLookup<"genPowerCfg", BoschBsirPowerCfgCluster>({
            name: "primary_power_source",
            cluster: "genPowerCfg",
            attribute: "primaryPowerSource",
            description: "Select which power source you want to use. Note: The battery is always being used as backup source.",
            lookup: {
                solar_panel: 0x00,
                ac_power_supply: 0x01,
                dc_power_supply: 0x02,
            },
            reporting: {min: "MIN", max: "MAX", change: 1},
            entityCategory: "config",
        }),
    iasZoneStatus: (): ModernExtend => {
        const powerOutageLookup = {
            outage_detected: true,
            power_ok: false,
        };

        const exposes: Expose[] = [
            e
                .binary("external_trigger", ea.STATE, true, false)
                .withLabel("External trigger state")
                .withDescription(
                    "Indicates whether an external alarm via the 'TRIGGER_IN' connectors on the back of the device is being received. Please keep in mind that the device automatically activates/deactivates an alarm in that case.",
                ),
            e
                .binary("tamper", ea.STATE, true, false)
                .withLabel("Tamper state")
                .withDescription("Indicates whether the device is tampered")
                .withCategory("diagnostic"),
            e
                .binary(
                    "power_outage",
                    ea.STATE,
                    utils.getFromLookupByValue(true, powerOutageLookup),
                    utils.getFromLookupByValue(false, powerOutageLookup),
                )
                .withLabel("Power outage state")
                .withDescription(
                    "Indicates the configured primary power source experiences a power outage. This only works when using ac or dc power.",
                )
                .withCategory("diagnostic"),
        ];

        const fromZigbee = [
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification"],
                convert: (model, msg, publish, options, meta) => {
                    if (utils.hasAlreadyProcessedMessage(msg, model)) {
                        return;
                    }

                    const zoneStatus = msg.data.zonestatus;
                    const alarmOneStatus = (zoneStatus & 1) > 0;
                    const tamperStatus = (zoneStatus & (1 << 2)) > 0;
                    const alarmTwoStatus = (zoneStatus & (1 << 1)) > 0;

                    if (tamperStatus) {
                        meta.device
                            .getEndpoint(1)
                            .command<"ssIasZone", "acknowledgeStatusChange", BoschBsirIasZoneCluster>(
                                "ssIasZone",
                                "acknowledgeStatusChange",
                                {data: 0x02},
                                manufacturerOptions,
                            )
                            .catch((e) => {
                                logger.warning(`Acknowledgement of tamper status on device '${meta.device.ieeeAddr}' failed: ${e}`, NS);
                            });
                    }

                    if (alarmTwoStatus) {
                        meta.device
                            .getEndpoint(1)
                            .command<"ssIasZone", "acknowledgeStatusChange", BoschBsirIasZoneCluster>(
                                "ssIasZone",
                                "acknowledgeStatusChange",
                                {data: 0x04},
                                manufacturerOptions,
                            )
                            .catch((e) => {
                                logger.warning(`Acknowledgement of alarm 2 status on device '${meta.device.ieeeAddr}' failed: ${e}`, NS);
                            });
                    }

                    return {
                        external_trigger: alarmOneStatus,
                        tamper: tamperStatus,
                        power_outage: utils.getFromLookupByValue(alarmTwoStatus, powerOutageLookup),
                    };
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification"]>,
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read("ssIasZone", ["zoneStatus"]);
            },
        ];

        return {
            exposes,
            fromZigbee,
            configure,
            isModernExtend: true,
        };
    },
    currentPowerSource: () =>
        m.enumLookup<"ssIasZone", BoschBsirIasZoneCluster>({
            name: "current_power_source",
            cluster: "ssIasZone",
            attribute: "currentPowerSource",
            description: "Currently used power source for device operation",
            lookup: {
                battery: 0x00,
                solar_panel: 0x01,
                ac_power: 0x02,
                dc_power: 0x03,
            },
            reporting: {min: "MIN", max: "MAX", change: 1},
            access: "STATE_GET",
            entityCategory: "diagnostic",
        }),
    solarPanelVoltage: (): ModernExtend => {
        const exposes: Expose[] = [
            e
                .numeric("solar_panel_voltage", ea.STATE)
                .withDescription("Current voltage level received from the integrated solar panel")
                .withUnit("volt")
                .withCategory("diagnostic"),
        ];

        const fromZigbee = [
            {
                cluster: "genPowerCfg",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (utils.hasAlreadyProcessedMessage(msg, model)) {
                        return;
                    }

                    const data = msg.data;
                    const containsSolarPanelVoltage = data.solarPanelVoltage !== undefined;

                    if (containsSolarPanelVoltage) {
                        const currentSolarPanelVoltage = data.solarPanelVoltage / 10;
                        return {solar_panel_voltage: currentSolarPanelVoltage};
                    }
                },
            } satisfies Fz.Converter<"genPowerCfg", BoschBsirPowerCfgCluster, ["attributeReport", "readResponse"]>,
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                const solarPanelVoltageReportingPayload = payload<"genPowerCfg", BoschBsirPowerCfgCluster>(
                    "solarPanelVoltage",
                    repInterval.MINUTES_5,
                    repInterval.MAX,
                    1,
                );
                await endpoint.configureReporting("genPowerCfg", solarPanelVoltageReportingPayload);
            },
        ];

        return {exposes, fromZigbee, configure, isModernExtend: true};
    },
};
//endregion

//region Bosch BSEN-C2/-CV/-C2D devices (door/window contacts)
interface BoschDoorWindowContactCluster {
    attributes: {
        /** ID: 0 | Type: UINT8 */
        breakFunctionEnabled: number;
        /** ID: 1 | Type: UINT8 */
        breakFunctionState: number;
        /** ID: 2 | Type: UINT8 */
        breakFunctionTimeout: number;
        /** ID: 4 | Type: UINT8 | Only used on BSEN-CV */
        vibrationDetectionEnabled: number;
        /** ID: 5 | Type: UINT8 | Only used on BSEN-CV */
        vibrationDetectionSensitivity: number;
        /** ID: 7 | Type: UINT8 | Only used on BSEN-CV with value 1 as default */
        unknownOne: number;
        /** ID: 8 | Type: UINT16 | Only used on BSEN-CV with value 30 as default */
        unknownTwo: number;
        /** ID: 9 | Type: UINT8 | Only used on BSEN-CV with value 3 as default */
        unknownThree: number;
        /** ID: 10 | Type: UINT8 | Only used on BSEN-CV with value 0 as default */
        unknownFour: number;
    };
    commands: never;
    commandResponses: never;
}

export const boschDoorWindowContactExtend = {
    doorWindowContactCluster: () =>
        m.deviceAddCustomCluster("boschDoorWindowContactCluster", {
            ID: 0xfcad,
            attributes: {
                breakFunctionEnabled: {ID: 0x0000, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                breakFunctionState: {ID: 0x0001, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                breakFunctionTimeout: {ID: 0x0002, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                vibrationDetectionEnabled: {ID: 0x0004, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                vibrationDetectionSensitivity: {ID: 0x0005, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownOne: {ID: 0x0007, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownTwo: {ID: 0x0008, type: Zcl.DataType.UINT16, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownThree: {ID: 0x0009, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownFour: {ID: 0x000a, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
            },
            commands: {},
            commandsResponse: {},
        }),
    battery: () =>
        m.battery({
            percentage: true,
            lowStatus: true,
            lowStatusReportingConfig: {min: "MIN", max: "MAX", change: 0},
        }),
    reportContactState: () =>
        m.iasZoneAlarm({
            zoneType: "contact",
            zoneAttributes: ["alarm_1"],
            description: "Indicates whether the device detected an open or closed door/window",
        }),
    reportButtonActions: (args?: {doublePressSupported: boolean}): ModernExtend => {
        const {doublePressSupported} = args ?? {doublePressSupported: false};

        let buttonActionsLookup = {
            long_press: 0x02,
            single_press: 0x01,
            none: 0x00,
        };

        if (doublePressSupported) {
            buttonActionsLookup = {...{double_press: 0x08}, ...buttonActionsLookup};
        }

        const exposes: Expose[] = [
            e
                .enum("action", ea.STATE, Object.keys(buttonActionsLookup))
                .withDescription("Indicates button presses on the device")
                .withCategory("diagnostic"),
        ];

        const fromZigbee = [
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;

                    if (zoneStatus !== undefined) {
                        const buttonPayload = zoneStatus >> 11;
                        const buttonState = utils.getFromLookupByValue(buttonPayload, buttonActionsLookup);

                        const result: KeyValue = {
                            action: buttonState,
                        };

                        return result;
                    }
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];

        const configure: Configure[] = [m.setupConfigureForBinding("ssIasZone", "input"), m.setupConfigureForReading("ssIasZone", ["zoneStatus"])];

        return {
            exposes,
            fromZigbee,
            configure,
            isModernExtend: true,
        };
    },
    breakFunctionality: (): ModernExtend => {
        const breakFunctionEnabledLookup = {
            ON: 0x01,
            OFF: 0x00,
        };

        const breakFunctionStatusLookup = {
            break_active: 0x01,
            idle: 0x00,
        };

        const exposes: Expose[] = [
            e
                .binary(
                    "break_function_enabled",
                    ea.ALL,
                    utils.getFromLookupByValue(0x01, breakFunctionEnabledLookup),
                    utils.getFromLookupByValue(0x00, breakFunctionEnabledLookup),
                )
                .withLabel("Break function")
                .withDescription(
                    "Activate the break function by pressing the operating button on the door/window contact twice. This means that the device temporarily stops reading the sensors.",
                )
                .withCategory("config"),
            e
                .numeric("break_function_timeout", ea.ALL)
                .withLabel("Automatic time limit for breaks")
                .withDescription(
                    "Here you can define how long the break function is activated for the door/window contact. Once the time limit has expired, the break ends automatically. The LED on the device will flash orange as long as the break is activated when this setting is being used.",
                )
                .withValueMin(1)
                .withValueMax(15)
                .withUnit("minutes")
                .withPreset("disable", null, "Disable automatic time limit")
                .withCategory("config"),
            e
                .enum("break_function_state", ea.STATE_GET, Object.keys(breakFunctionStatusLookup))
                .withLabel("Break function state")
                .withDescription("Indicates whether the device is in break mode or not"),
        ];

        const fromZigbee = [
            {
                cluster: "boschDoorWindowContactCluster",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.breakFunctionEnabled !== undefined) {
                        result.break_function_enabled = utils.getFromLookupByValue(data.breakFunctionEnabled, breakFunctionEnabledLookup);
                    }

                    if (data.breakFunctionTimeout !== undefined) {
                        result.break_function_timeout = data.breakFunctionTimeout === 0xff ? null : data.breakFunctionTimeout;
                    }

                    if (data.breakFunctionState !== undefined) {
                        result.break_function_state = utils.getFromLookupByValue(data.breakFunctionState, breakFunctionStatusLookup);
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["break_function_enabled", "break_function_timeout", "break_function_state"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "break_function_enabled") {
                        await entity.write<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", {
                            breakFunctionEnabled: utils.getFromLookup(value, breakFunctionEnabledLookup),
                        });
                        return {state: {break_function_enabled: value}};
                    }

                    if (key === "break_function_timeout") {
                        const index = value === null ? 0xff : utils.toNumber(value);
                        await entity.write<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", {
                            breakFunctionTimeout: index,
                        });
                        return {state: {break_function_timeout: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "break_function_enabled") {
                        await entity.read<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", [
                            "breakFunctionEnabled",
                        ]);
                    }
                    if (key === "break_function_timeout") {
                        await entity.read<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", [
                            "breakFunctionTimeout",
                        ]);
                    }
                    if (key === "break_function_state") {
                        await entity.read<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", [
                            "breakFunctionState",
                        ]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            m.setupConfigureForReading<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", [
                "breakFunctionEnabled",
                "breakFunctionTimeout",
                "breakFunctionState",
            ]),
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    vibrationDetection: (): ModernExtend => {
        const vibrationDetectionEnabledLookup = {
            ON: 0x01,
            OFF: 0x00,
        };

        const vibrationDetectionSensitivityLookup = {
            very_high: 0x05,
            high: 0x04,
            medium: 0x03,
            moderate: 0x02,
            low: 0x01,
        };

        const exposes: Expose[] = [
            e
                .binary(
                    "vibration_detection_enabled",
                    ea.ALL,
                    utils.getFromLookupByValue(0x01, vibrationDetectionEnabledLookup),
                    utils.getFromLookupByValue(0x00, vibrationDetectionEnabledLookup),
                )
                .withLabel("Vibration detection")
                .withDescription("Activate the vibration detection to detect vibrations at the window or door via the integrated sensor as well")
                .withCategory("config"),
            e
                .enum("vibration_detection_sensitivity", ea.ALL, Object.keys(vibrationDetectionSensitivityLookup))
                .withLabel("Vibration detection sensitivity")
                .withDescription("Set the sensitivity of the vibration detection sensor")
                .withCategory("config"),
            e.binary("vibration", ea.STATE_GET, true, false).withDescription("Indicates whether the device detected vibration"),
        ];

        const fromZigbee = [
            {
                cluster: "boschDoorWindowContactCluster",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.vibrationDetectionEnabled !== undefined) {
                        result.vibration_detection_enabled = utils.getFromLookupByValue(
                            data.vibrationDetectionEnabled,
                            vibrationDetectionEnabledLookup,
                        );
                    }

                    if (data.vibrationDetectionSensitivity !== undefined) {
                        result.vibration_detection_sensitivity = utils.getFromLookupByValue(
                            data.vibrationDetectionSensitivity,
                            vibrationDetectionSensitivityLookup,
                        );
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster, ["attributeReport", "readResponse"]>,
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;

                    if (zoneStatus !== undefined) {
                        const alarm2Payload = (zoneStatus & (1 << 1)) > 0;

                        return {
                            vibration: alarm2Payload,
                        };
                    }
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["vibration_detection_enabled", "vibration_detection_sensitivity", "vibration"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "vibration_detection_enabled") {
                        await entity.write<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", {
                            vibrationDetectionEnabled: utils.getFromLookup(value, vibrationDetectionEnabledLookup),
                        });
                        return {state: {vibration_detection_enabled: value}};
                    }

                    if (key === "vibration_detection_sensitivity") {
                        await entity.write<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", {
                            vibrationDetectionSensitivity: utils.getFromLookup(value, vibrationDetectionSensitivityLookup),
                        });
                        return {state: {vibration_detection_sensitivity: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "vibration_detection_enabled") {
                        await entity.read<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", [
                            "vibrationDetectionEnabled",
                        ]);
                    }
                    if (key === "vibration_detection_sensitivity") {
                        await entity.read<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", [
                            "vibrationDetectionSensitivity",
                        ]);
                    }
                    if (key === "vibration") {
                        await entity.read("ssIasZone", ["zoneStatus"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            m.setupConfigureForBinding("ssIasZone", "input"),
            m.setupConfigureForReading("ssIasZone", ["zoneStatus"]),
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);

                // The write request is made when using the proprietary
                // Bosch Smart Home Controller II as of 19-09-2025. Looks like
                // the default value was too high, and they didn't want to
                // push a firmware update. We mimic it here to avoid complaints.
                await endpoint.write<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", {
                    vibrationDetectionSensitivity: vibrationDetectionSensitivityLookup.medium,
                });

                // The write request is made when using the proprietary
                // Bosch Smart Home Controller II as of 19-09-2025. I have
                // no idea what it does, but we mimic it here in case it
                // fixes any issues.
                await endpoint.write<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", {
                    unknownOne: 0x00,
                });
            },
            m.setupConfigureForReading<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", [
                "vibrationDetectionEnabled",
                "vibrationDetectionSensitivity",
            ]),
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
};
//endregion

//region Bosch BSEN-M device (Motion detector)
interface BoschBsenIasZoneCluster {
    attributes: never;
    commands: {
        /** ID: 243 */
        initCustomTestMode: {
            /** Type: UINT16 */
            data: number[];
        };
    };
    commandResponses: never;
}

export const boschBsenExtend = {
    customIasZoneCluster: () =>
        m.deviceAddCustomCluster("ssIasZone", {
            ID: Zcl.Clusters.ssIasZone.ID,
            attributes: {},
            commands: {
                initCustomTestMode: {
                    ID: 0x02,
                    parameters: [{name: "data", type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                },
            },
            commandsResponse: {},
        }),
    battery: () =>
        m.battery({
            percentage: false,
            percentageReporting: false,
            voltage: true,
            voltageReporting: true,
            voltageToPercentage: {min: 2500, max: 3000},
            lowStatus: true,
            lowStatusReportingConfig: {min: "MIN", max: "MAX", change: 0},
        }),
    illuminance: () => m.illuminance({reporting: {min: "1_SECOND", max: 600, change: 3522}}),
    // The temperature sensor isn't used at all by Bosch on the BSEN-M.
    // Therefore, I decided to be a bit conservative with the reporting
    // intervals to not drain the battery too much.
    temperature: () => m.temperature({reporting: {min: "5_MINUTES", max: "MAX", change: 100}}),
    tamperAndOccupancyAlarm: (): ModernExtend => {
        const exposes: Expose[] = [
            e
                .binary("tamper", ea.STATE, true, false)
                .withLabel("Tamper state")
                .withDescription("Indicates whether the device is tampered")
                .withCategory("diagnostic"),
            e
                .binary("occupancy", ea.STATE, true, false)
                .withLabel("Occupancy state")
                .withDescription("Indicates whether the device detected any motion in the surroundings"),
        ];

        const fromZigbee = [
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;

                    if (zoneStatus === undefined) {
                        return;
                    }

                    let payload = {};

                    const tamperStatus = (zoneStatus & (1 << 2)) > 0;
                    payload = {tamper: tamperStatus, ...payload};

                    const occupancyLockActive = meta.device.meta.occupancyLockTimeout ? meta.device.meta.occupancyLockTimeout > Date.now() : false;

                    if (!occupancyLockActive) {
                        const alarmOneStatus = (zoneStatus & 1) > 0;
                        payload = {occupancy: alarmOneStatus, ...payload};

                        const isChangeMessage = msg.type === "commandStatusChangeNotification";
                        const newOccupancyStatusDetected = alarmOneStatus === true;

                        if (isChangeMessage && newOccupancyStatusDetected) {
                            // After a detection, the device turns off the motion detection for 3 minutes.
                            // Unfortunately, the alarm is already turned off after 4 seconds for reasons
                            // only known to Bosch. Therefore, we have to manually defer the turn-off by
                            // 4 seconds + 3 minutes to avoid any confusion.
                            const timeoutDelay = 184 * 1000;
                            setTimeout(() => publish({occupancy: false}), timeoutDelay);
                            meta.device.meta.occupancyLockTimeout = Date.now() + timeoutDelay;
                        }
                    }

                    return payload;
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];

        const configure: Configure[] = [m.setupConfigureForBinding("ssIasZone", "input"), m.setupConfigureForReading("ssIasZone", ["zoneStatus"])];

        const onEvent: OnEvent.Handler[] = [
            async (event) => {
                if (event.type !== "start") {
                    return;
                }

                const occupancyLockTimeout = event.data.device.meta.occupancyLockTimeout;

                if (occupancyLockTimeout === undefined) {
                    return;
                }

                const currentTime = Date.now();
                const endpoint = event.data.device.getEndpoint(1);

                if (occupancyLockTimeout > currentTime) {
                    const timeoutDelay = occupancyLockTimeout - currentTime;
                    setTimeout(() => {
                        endpoint.read("ssIasZone", ["zoneStatus"]).catch((exception) => {
                            logger.warning(`Error during reading the zoneStatus on device '${event.data.device.ieeeAddr}': ${exception}`, NS);
                        });
                    }, timeoutDelay);
                } else {
                    await endpoint.read("ssIasZone", ["zoneStatus"]);
                }
            },
        ];

        return {
            exposes,
            fromZigbee,
            configure,
            onEvent,
            isModernExtend: true,
        };
    },
    sensitivityLevel: (): ModernExtend => {
        const sensitivityLevelLookup = {
            pet_immunity: 0xb8,
            sneak_by_guard: 0xb0,
            unknown: 0x00,
        };

        const exposes: Expose[] = [
            e
                .enum("sensitivity_level", ea.STATE_GET, Object.keys(sensitivityLevelLookup))
                .withDescription("Specifies the selected sensitivity level on the back of the device (either 'pet immunity' or 'sneak-by guard').")
                .withCategory("diagnostic"),
        ];

        const fromZigbee = [
            {
                cluster: "ssIasZone",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.currentZoneSensitivityLevel !== undefined) {
                        result.sensitivity_level = utils.getFromLookupByValue(data.currentZoneSensitivityLevel, sensitivityLevelLookup, "unknown");
                    }

                    return result;
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["sensitivity_level"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("ssIasZone", ["currentZoneSensitivityLevel"]);
                },
            },
        ];

        const configure: Configure[] = [
            m.setupConfigureForBinding("ssIasZone", "input"),
            m.setupConfigureForReading("ssIasZone", ["numZoneSensitivityLevelsSupported", "currentZoneSensitivityLevel"]),
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);

                // The write request is made when using the proprietary
                // Bosch Smart Home Controller II as of 15-09-2025. Looks like
                // the default value was too low, and they didn't want to
                // push a firmware update. We mimic it here to avoid complaints.
                await endpoint.write("ssIasZone", {currentZoneSensitivityLevel: 176});
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    changedCheckinInterval: (): ModernExtend => {
        const configure: Configure[] = [
            m.setupConfigureForReading("genPollCtrl", ["checkinInterval", "longPollInterval", "shortPollInterval"]),
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);

                // The write request is made when using the proprietary
                // Bosch Smart Home Controller II as of 15-09-2025.
                // The reason is unclear to me, but we mimic it here
                // to avoid possible complaints in case it fixed any issues.
                await endpoint.write("genPollCtrl", {checkinInterval: 2160});
            },
        ];

        return {
            configure,
            isModernExtend: true,
        };
    },
    testMode: (): ModernExtend => {
        const testModeLookup = {
            ON: true,
            OFF: false,
        };
        const enableTestMode = async (endpoint: Zh.Endpoint | Zh.Group) => {
            await endpoint.command<"ssIasZone", "initCustomTestMode", BoschBsenIasZoneCluster>("ssIasZone", "initCustomTestMode", {
                data: [0x00, 0x80],
            });
        };

        const disableTestMode = async (endpoint: Zh.Endpoint | Zh.Group) => {
            await endpoint.command("ssIasZone", "initNormalOpMode", {});
        };

        const exposes: Expose[] = [
            e
                .binary("test_mode", ea.ALL, utils.getFromLookupByValue(true, testModeLookup), utils.getFromLookupByValue(false, testModeLookup))
                .withDescription(
                    "Activate the test mode. In this mode, the device blinks on every detected motion without any wait time in between to verify the installation. Please keep in mind that it can take up to 45 seconds for the test mode to be activated.",
                )
                .withCategory("config"),
        ];

        const fromZigbee = [
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;

                    if (zoneStatus === undefined) {
                        return;
                    }

                    const result: KeyValue = {};

                    const testModeEnabled = (zoneStatus & (1 << 8)) > 0;
                    result.test_mode = utils.getFromLookupByValue(testModeEnabled, testModeLookup);

                    return result;
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["test_mode"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "test_mode") {
                        if (value === utils.getFromLookupByValue(true, testModeLookup)) {
                            await enableTestMode(entity);
                        } else {
                            await disableTestMode(entity);
                        }
                    }
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("ssIasZone", ["zoneStatus"]);
                },
            },
        ];

        const configure: Configure[] = [m.setupConfigureForBinding("ssIasZone", "input"), m.setupConfigureForReading("ssIasZone", ["zoneStatus"])];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
};
//endregion
