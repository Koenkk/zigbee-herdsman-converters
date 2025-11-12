import {Zcl, ZSpec} from "zigbee-herdsman";
import type {SendPolicy} from "zigbee-herdsman/dist/controller/tstype";
import type {TPartialClusterAttributes} from "zigbee-herdsman/dist/zspec/zcl/definition/clusters-types";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import type {BatteryArgs} from "../lib/modernExtend";
import * as m from "../lib/modernExtend";
import {repInterval} from "./constants";
import {logger} from "./logger";
import type {ElectricityMeterArgs} from "./modernExtend";
import {payload} from "./reporting";
import * as globalStore from "./store";
import type {Configure, DefinitionExposesFunction, DummyDevice, Expose, Fz, KeyValue, KeyValueAny, ModernExtend, OnEvent, Tz, Zh} from "./types";
import * as utils from "./utils";
import {sleep, toNumber} from "./utils";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:bosch";

export const manufacturerOptions = {
    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
    sendPolicy: <SendPolicy>"immediate",
};

//region Generally used Bosch functionality
export const boschGeneralExtend = {
    /** Some devices now use a different name for some custom clusters than
     * originally used. This can lead to issues like those described in
     * https://github.com/Koenkk/zigbee2mqtt/issues/28806. To prevent that
     * we have to make sure that all attributes of the renamed cluster are
     * available when using "getEndpoint().getClusterAttributeValue()". */
    handleRenamedCustomCluster: (oldClusterName: string, newClusterName: string): ModernExtend => {
        const onEvent: OnEvent.Handler[] = [
            async (event) => {
                if (event.type !== "start") {
                    return;
                }

                const device = event.data.device;

                const renameAlreadyApplied = device.meta.renamedClusters?.includes(oldClusterName);
                if (!renameAlreadyApplied) {
                    logger.debug(
                        `Try to apply cluster rename from ${oldClusterName} to ${newClusterName} for device ${device.ieeeAddr}. Current meta state: ${JSON.stringify(device.meta)}`,
                        NS,
                    );

                    const newClusterDefinition = device.customClusters[newClusterName];
                    const endpointsWithNewCluster = device.endpoints.filter((endpoint) => endpoint.clusters[newClusterName] !== undefined);

                    for (const endpointToRead in endpointsWithNewCluster) {
                        const endpoint = endpointsWithNewCluster[endpointToRead];
                        logger.debug(`Attempt to read all attributes for cluster ${newClusterName} from endpoint ${endpoint.ID}`, NS);

                        for (const attributeToRead in newClusterDefinition.attributes) {
                            const attributeValueExistsInDatabase =
                                endpoint.getClusterAttributeValue(newClusterName, newClusterDefinition.attributes[attributeToRead].ID) !== undefined;

                            if (!attributeValueExistsInDatabase) {
                                logger.debug(
                                    `Attempt to read undefined attribute ${attributeToRead} in cluster ${newClusterName} from endpoint ${endpoint.ID}`,
                                    NS,
                                );

                                try {
                                    await endpoint.read(newClusterDefinition.ID, [newClusterDefinition.attributes[attributeToRead].ID]);
                                } catch (exception) {
                                    logger.debug(
                                        `Error during read attempt for attribute ${attributeToRead}. Probably unsupported attribute on this device or endpoint. Skipping... ${exception}`,
                                        NS,
                                    );
                                }
                            } else {
                                logger.debug(
                                    `Value for attribute ${attributeToRead} in cluster ${newClusterName} from endpoint ${endpoint.ID} already in database. Skipping...`,
                                    NS,
                                );
                            }
                        }
                    }

                    logger.debug(`All attributes are read, now calling deviceExposeChanged() for device ${device.ieeeAddr}`, NS);
                    event.data.deviceExposesChanged();

                    device.meta.renamedClusters =
                        device.meta.renamedClusters === undefined ? [oldClusterName] : [...device.meta.renamedClusters, oldClusterName];
                    logger.debug(
                        `Cluster rename from ${oldClusterName} to ${newClusterName} for device ${device.ieeeAddr} successfully applied. New meta state: ${JSON.stringify(device.meta)}`,
                        NS,
                    );
                }
            },
        ];
        return {
            onEvent,
            isModernExtend: true,
        };
    },
    /** Some Bosch devices ask the coordinator for their ZCL version
     * during deviceAnnouncement. Without answer, these devices regularly
     * re-join the network. To avoid that, we have to make sure that a readRequest
     * for the zclVersion is always being answered. The answered zclVersion is
     * taken from the Bosch Smart Home Controller II.
     *
     * Exception: BTH-RM and BTH-RM230Z ask the coordinator at regular
     * intervals for their zclVersion (maybe availability check like Z2M does?)
     * and *not* during interview! To avoid code-duplication, we handle that
     * case here as well. */
    handleZclVersionReadRequest: (): ModernExtend => {
        const onEvent: OnEvent.Handler[] = [
            (event) => {
                if (event.type !== "start") {
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
    batteryWithPercentageAndLowStatus: (args?: BatteryArgs) =>
        m.battery({
            percentage: true,
            percentageReportingConfig: false,
            lowStatus: true,
            lowStatusReportingConfig: {min: "MIN", max: "MAX", change: null},
            ...args,
        }),
};
//endregion

//region Generally used Bosch functionality on energy controlling devices
interface BoschMeteringCluster {
    attributes: never;
    commands: {
        /** ID: 128 */
        resetEnergyMeters: Record<string, never>;
    };
    commandResponses: never;
}

interface BoschGeneralEnergyDeviceCluster {
    attributes: {
        /** ID: 6 | Type: BOOLEAN */
        autoOffEnabled: number;
        /** ID: 7 | Type: UINT16 */
        autoOffTime: number;
    };
    commands: never;
    commandResponses: never;
}

export const boschGeneralEnergyDeviceExtend = {
    customMeteringCluster: () =>
        m.deviceAddCustomCluster("seMetering", {
            ID: Zcl.Clusters.seMetering.ID,
            attributes: {},
            commands: {
                resetEnergyMeters: {
                    ID: 0x80,
                    parameters: [],
                },
            },
            commandsResponse: {},
        }),
    resetEnergyMeters: (): ModernExtend => {
        const exposes: Expose[] = [
            e
                .enum("reset_energy_meters", ea.SET, ["reset"])
                .withDescription("Triggers the reset of all energy meters on the device to 0 kWh")
                .withCategory("config"),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["reset_energy_meters"],
                convertSet: async (entity, key, value, meta) => {
                    await entity.command<"seMetering", "resetEnergyMeters", BoschMeteringCluster>(
                        "seMetering",
                        "resetEnergyMeters",
                        {},
                        manufacturerOptions,
                    );
                },
            },
        ];
        return {
            exposes,
            toZigbee,
            isModernExtend: true,
        };
    },
    autoOff: (args?: {endpoint: number}): ModernExtend => {
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
                const pulsedModeEnabled = device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "pulseLength") !== 0;

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
                .withValueStep(0.5)
                .withCategory("config");

            if (endpoint !== undefined) {
                autoOffEnabledExpose.withEndpoint(endpoint.toString());
                autoOffTimeExpose.withEndpoint(endpoint.toString());
            }

            return [autoOffEnabledExpose, autoOffTimeExpose];
        };

        const fromZigbee = [
            {
                cluster: "boschEnergyDevice",
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
                        result[property] = data.autoOffTime / 60;
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschEnergyDevice", BoschGeneralEnergyDeviceCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["auto_off_enabled", "auto_off_time"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "auto_off_enabled") {
                        const selectedState = utils.getFromLookup(value, offOnLookup);
                        await entity.write<"boschEnergyDevice", BoschGeneralEnergyDeviceCluster>("boschEnergyDevice", {
                            autoOffEnabled: utils.toNumber(selectedState),
                        });
                        return {state: {auto_off_enabled: value}};
                    }

                    if (key === "auto_off_time") {
                        await entity.write<"boschEnergyDevice", BoschGeneralEnergyDeviceCluster>("boschEnergyDevice", {
                            autoOffTime: toNumber(value) * 60,
                        });
                        return {state: {auto_off_time: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "auto_off_enabled") {
                        await entity.read<"boschEnergyDevice", BoschGeneralEnergyDeviceCluster>("boschEnergyDevice", ["autoOffEnabled"]);
                    }
                    if (key === "auto_off_time") {
                        await entity.read<"boschEnergyDevice", BoschGeneralEnergyDeviceCluster>("boschEnergyDevice", ["autoOffTime"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            m.setupConfigureForBinding("boschEnergyDevice", "input", endpoint ? [endpoint.toString()] : null),
            m.setupConfigureForReading<"boschEnergyDevice", BoschGeneralEnergyDeviceCluster>(
                "boschEnergyDevice",
                ["autoOffEnabled", "autoOffTime"],
                endpoint ? [endpoint.toString()] : null,
            ),
        ];

        return {
            exposes: [expose],
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
};
//endregion

//region Generally used Bosch functionality on sensor devices
export const boschGeneralSensorDeviceExtend = {
    testMode: (args: {
        testModeDescription: string;
        sensitivityLevelToUse: number;
        variableTimeoutSupported?: boolean;
        defaultTimeout?: number;
        zoneStatusBit?: number;
    }): ModernExtend => {
        const {testModeDescription, sensitivityLevelToUse, variableTimeoutSupported = false, defaultTimeout = 0, zoneStatusBit = 8} = args;

        const testModeLookup = {
            ON: true,
            OFF: false,
        };

        const enableTestMode = async (endpoint: Zh.Endpoint | Zh.Group, sensitivityLevelToUse: number, timeoutInSeconds: number) => {
            await endpoint.command("ssIasZone", "initTestMode", {
                testModeDuration: timeoutInSeconds,
                currentZoneSensitivityLevel: sensitivityLevelToUse,
            });
        };

        const disableTestMode = async (endpoint: Zh.Endpoint | Zh.Group) => {
            await endpoint.command("ssIasZone", "initNormalOpMode", {});
        };

        const exposes: Expose[] = [
            e
                .binary("test_mode", ea.ALL, utils.getFromLookupByValue(true, testModeLookup), utils.getFromLookupByValue(false, testModeLookup))
                .withDescription(testModeDescription)
                .withCategory("config"),
        ];

        if (variableTimeoutSupported) {
            exposes.push(
                e
                    .numeric("test_mode_timeout", ea.ALL)
                    .withDescription(`Determines how long the test mode should be activated. The default length is ${defaultTimeout} seconds.`)
                    .withValueMin(1)
                    .withValueMax(255)
                    .withUnit("seconds")
                    .withCategory("config"),
            );
        }

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

                    const testModeEnabled = (zoneStatus & (1 << zoneStatusBit)) > 0;
                    result.test_mode = utils.getFromLookupByValue(testModeEnabled, testModeLookup);

                    return result;
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["test_mode", "test_mode_timeout"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "test_mode") {
                        if (value === utils.getFromLookupByValue(true, testModeLookup)) {
                            let timeoutInSeconds: number;

                            const currentTimeout = meta.state.test_mode_timeout;

                            if (currentTimeout == null) {
                                timeoutInSeconds = defaultTimeout;
                                meta.publish({test_mode_timeout: timeoutInSeconds});
                            } else {
                                timeoutInSeconds = utils.toNumber(currentTimeout);
                            }

                            await enableTestMode(entity, sensitivityLevelToUse, timeoutInSeconds);
                        } else {
                            await disableTestMode(entity);
                        }
                    }
                    if (key === "test_mode_timeout") {
                        return {state: {test_mode_timeout: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "test_mode") {
                        await entity.read("ssIasZone", ["zoneStatus"]);
                    }

                    if (key === "test_mode_timeout" && meta.state.test_mode_timeout == null) {
                        meta.publish({test_mode_timeout: defaultTimeout});
                    }
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

//region Bosch BMCT-DZ/-RZ/-SLZ devices
export interface BoschBmctCluster extends BoschGeneralEnergyDeviceCluster {
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

            const switchTypeKey = device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "switchType") ?? 0x00;
            const selectedSwitchType = utils.getFromLookupByValue(switchTypeKey, switchTypeLookup);

            if (selectedSwitchType === "none") {
                return [];
            }

            let supportedSwitchModes = Object.keys(switchModeLookup);

            if (device.modelID === "RBSH-MMS-ZB-EU") {
                const deviceModeKey = device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "deviceMode");
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
                cluster: "boschEnergyDevice",
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
            } satisfies Fz.Converter<"boschEnergyDevice", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["switch_mode"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "switch_mode") {
                        const index = <number>utils.getFromLookup(value, switchModeLookup);
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {switchMode: index});
                        return {state: {switch_mode: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "switch_mode") {
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchMode"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const desiredEndpoint = device.getEndpoint(endpoint ?? 1);
                await desiredEndpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchMode"]);
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

            const currentSwitchType = device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "switchType") ?? 0x00;

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
                cluster: "boschEnergyDevice",
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
            } satisfies Fz.Converter<"boschEnergyDevice", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["child_lock"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "child_lock") {
                        const selectedMode = <number>utils.getFromLookup(value, childLockLookup);

                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {childLock: selectedMode});

                        return {state: {child_lock: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "child_lock") {
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["childLock"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const desiredEndpoint = device.getEndpoint(endpoint ?? 1);
                await desiredEndpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["childLock"]);
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
        m.enumLookup<"boschEnergyDevice", BoschBmctCluster>({
            name: "actuator_type",
            cluster: "boschEnergyDevice",
            attribute: "actuatorType",
            description: "Select the appropriate actuator type so that the connected device can be controlled correctly.",
            lookup: {
                normally_closed: 0x00,
                normally_open: 0x01,
            },
            entityCategory: "config",
        }),
    dimmerType: () =>
        m.enumLookup<"boschEnergyDevice", BoschBmctCluster>({
            name: "dimmer_type",
            cluster: "boschEnergyDevice",
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
                cluster: "boschEnergyDevice",
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
            } satisfies Fz.Converter<"boschEnergyDevice", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["minimum_brightness", "maximum_brightness"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "minimum_brightness") {
                        const newMinimumBrightness = toNumber(value);
                        const currentState = await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["maximumBrightness"]);

                        if (newMinimumBrightness >= currentState.maximumBrightness) {
                            throw new Error("The minimum brightness must be lower than the maximum brightness!");
                        }

                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                            minimumBrightness: newMinimumBrightness,
                        });

                        return {state: {minimum_brightness: value}};
                    }

                    if (key === "maximum_brightness") {
                        const newMaximumBrightness = toNumber(value);
                        const currentState = await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["minimumBrightness"]);

                        if (newMaximumBrightness <= currentState.minimumBrightness) {
                            throw new Error("The maximum brightness must be higher than the minimum brightness!");
                        }

                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                            maximumBrightness: newMaximumBrightness,
                        });

                        return {state: {maximum_brightness: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "minimum_brightness") {
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["minimumBrightness"]);
                    }
                    if (key === "maximum_brightness") {
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["maximumBrightness"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["minimumBrightness", "maximumBrightness"]);
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
                                await endpoint.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                                    switchType: 0x05,
                                    switchMode: 0x00,
                                    childLock: 0x00,
                                    autoOffEnabled: 0x00,
                                    autoOffTime: 0,
                                });

                                await endpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", [
                                    "switchType",
                                    "switchMode",
                                    "childLock",
                                    "autoOffEnabled",
                                    "autoOffTime",
                                ]);
                            } else {
                                await endpoint.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                                    switchType: 0x00,
                                    switchMode: 0x00,
                                    childLock: 0x00,
                                });
                                await endpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", [
                                    "switchType",
                                    "switchMode",
                                    "childLock",
                                ]);
                            }

                            await endpoint.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                                pulseLength: newPulseLength,
                            });
                            await endpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["pulseLength"]);
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

            if (device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "pulseLength") === 0) {
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
                cluster: "boschEnergyDevice",
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
            } satisfies Fz.Converter<"boschEnergyDevice", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["pulse_length"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "pulse_length") {
                        const selectedPulseLength = toNumber(value) * 10;

                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                            pulseLength: selectedPulseLength,
                        });

                        return {state: {pulse_length: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "pulse_length") {
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["pulseLength"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["pulseLength"]);
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
                const pulseModeActive = <number>device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "pulseLength") > 0;

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
                cluster: "boschEnergyDevice",
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
            } satisfies Fz.Converter<"boschEnergyDevice", BoschBmctCluster, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["switch_type"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "switch_type") {
                        const selectedSwitchType = <number>utils.getFromLookup(value, switchTypeLookup);

                        if (meta.device.meta.switchType !== selectedSwitchType) {
                            const endpoints = meta.device.endpoints.filter((e) => e.supportsInputCluster("boschEnergyDevice"));

                            for (const endpoint of endpoints) {
                                await endpoint.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                                    switchMode: 0x00,
                                    childLock: 0x00,
                                });
                                await endpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchMode", "childLock"]);
                            }
                        }

                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                            switchType: selectedSwitchType,
                        });
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchType"]);

                        return {state: {switch_type: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "switch_type") {
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchType"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);
                await endpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchType"]);
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
    reportSwitchAction: (args: {switchTypeLookup: KeyValue; hasDualSwitchInputs: boolean}): ModernExtend => {
        const {switchTypeLookup, hasDualSwitchInputs} = args;

        const expose: DefinitionExposesFunction = (device, options) => {
            const exposeList: Expose[] = [];

            if (utils.isDummyDevice(device)) {
                return exposeList;
            }

            const switchTypeKey = device.getEndpoint(1).getClusterAttributeValue("boschEnergyDevice", "switchType") ?? 0x00;
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
                cluster: "boschEnergyDevice",
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
            } satisfies Fz.Converter<"boschEnergyDevice", BoschBmctCluster, ["raw"]>,
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
                cluster: "boschEnergyDevice",
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
            } satisfies Fz.Converter<"boschEnergyDevice", BoschBmctCluster, ["attributeReport", "readResponse"]>,
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
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {deviceMode: index});
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["deviceMode"]);
                        return {state: {device_mode: value}};
                    }
                    if (key === "switch_type") {
                        const applyDefaultForSwitchModeAndChildLock = async (endpoint: Zh.Endpoint | Zh.Group) => {
                            const switchModeDefault = utils.getFromLookup("coupled", stateSwitchMode);
                            const childLockDefault = utils.getFromLookup("OFF", stateOffOn);

                            await endpoint.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                                switchMode: switchModeDefault,
                                childLock: childLockDefault,
                            });
                            await endpoint.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchMode", "childLock"]);
                        };

                        const switchType = utils.getFromLookup(value, stateSwitchType);
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {switchType: switchType});
                        await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchType"]);
                        await applyDefaultForSwitchModeAndChildLock(entity);

                        const leftEndpoint = meta.device.getEndpoint(2);
                        await applyDefaultForSwitchModeAndChildLock(leftEndpoint);

                        const rightEndpoint = meta.device.getEndpoint(3);
                        await applyDefaultForSwitchModeAndChildLock(rightEndpoint);

                        return {state: {switch_type: value}};
                    }
                    if (key === "switch_mode") {
                        const index = utils.getFromLookup(value, stateSwitchMode);
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {switchMode: index});
                        return {state: {switch_mode: value}};
                    }
                    if (key === "child_lock") {
                        const index = utils.getFromLookup(value, stateOffOn);
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {childLock: index});
                        return {state: {child_lock: value}};
                    }
                    if (key === "auto_off_enabled") {
                        const index = utils.getFromLookup(value, stateOffOn);
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {autoOffEnabled: index});
                        return {state: {auto_off_enabled: value}};
                    }
                    if (key === "auto_off_time" && typeof value === "number") {
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {autoOffTime: value * 60});
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
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["deviceMode"]);
                            break;
                        case "switch_type":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchType"]);
                            break;
                        case "switch_mode":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["switchMode"]);
                            break;
                        case "child_lock":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["childLock"]);
                            break;
                        case "auto_off_enabled":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["autoOffEnabled"]);
                            break;
                        case "auto_off_time":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["autoOffTime"]);
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
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {calibrationOpeningTime: index});
                        return {state: {calibration_opening_time: number}};
                    }
                    if (key === "calibration_closing_time") {
                        const number = utils.toNumber(value, "calibration_closing_time");
                        const index = number * 10;
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {calibrationClosingTime: index});
                        return {state: {calibration_closing_time: number}};
                    }
                    if (key === "calibration_button_hold_time") {
                        const number = utils.toNumber(value, "calibration_button_hold_time");
                        const index = number * 10;
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                            calibrationButtonHoldTime: index,
                        });
                        return {state: {calibration_button_hold_time: number}};
                    }
                    if (key === "calibration_motor_start_delay") {
                        const number = utils.toNumber(value, "calibration_motor_start_delay");
                        const index = number * 10;
                        await entity.write<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", {
                            calibrationMotorStartDelay: index,
                        });
                        return {state: {calibration_motor_start_delay: number}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    switch (key) {
                        case "calibration_opening_time":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["calibrationOpeningTime"]);
                            break;
                        case "calibration_closing_time":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["calibrationClosingTime"]);
                            break;
                        case "calibration_button_hold_time":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["calibrationButtonHoldTime"]);
                            break;
                        case "calibration_motor_start_delay":
                            await entity.read<"boschEnergyDevice", BoschBmctCluster>("boschEnergyDevice", ["calibrationMotorStartDelay"]);
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
                if (device.meta.newDefaultSensitivityApplied === undefined) {
                    await endpoint.write<"boschDoorWindowContactCluster", BoschDoorWindowContactCluster>("boschDoorWindowContactCluster", {
                        vibrationDetectionSensitivity: vibrationDetectionSensitivityLookup.medium,
                    });

                    device.meta.newDefaultSensitivityApplied = true;
                }

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
export const boschBsenExtend = {
    battery: () =>
        m.battery({
            percentage: false,
            percentageReporting: false,
            voltage: true,
            voltageReporting: true,
            voltageToPercentage: {min: 2500, max: 3000},
            lowStatus: true,
            lowStatusReportingConfig: {min: "MIN", max: "MAX", change: null},
        }),
    testMode: () =>
        boschGeneralSensorDeviceExtend.testMode({
            testModeDescription:
                "Activates the test mode. In this mode, the device blinks on every detected motion " +
                "without any wait time in between to verify the installation. Please keep in mind " +
                "that it can take up to 45 seconds for the test mode to be activated.",
            sensitivityLevelToUse: 0x80,
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
};
//endregion

//region Bosch BSEN-M (Water alarm)
interface BoschWaterAlarmCluster {
    attributes: {
        /** ID: 3 | Type: BOOLEAN */
        alarmOnMotion: number;
    };
    commands: {
        /** ID: 0 */
        muteAlarmControl: {
            /** Type: UINT8 */
            data: number;
        };
        /** ID: 1 */
        muteAlarmControlResponse: {
            /** Type: ENUM8 */
            data: number;
        };
    };
    commandResponses: never;
}

export const boschWaterAlarmExtend = {
    waterAlarmCluster: () =>
        m.deviceAddCustomCluster("boschWaterAlarm", {
            ID: 0xfcac,
            manufacturerCode: manufacturerOptions.manufacturerCode,
            attributes: {
                alarmOnMotion: {ID: 0x0003, type: Zcl.DataType.BOOLEAN},
            },
            commands: {
                muteAlarmControl: {ID: 0x00, parameters: [{name: "data", type: Zcl.DataType.UINT8}]},
                muteAlarmControlResponse: {ID: 0x01, parameters: [{name: "data", type: Zcl.DataType.ENUM8}]},
            },
            commandsResponse: {},
        }),
    changedSensitivityLevel: (): ModernExtend => {
        const configure: Configure[] = [
            m.setupConfigureForBinding("ssIasZone", "input"),
            m.setupConfigureForReading("ssIasZone", ["numZoneSensitivityLevelsSupported", "currentZoneSensitivityLevel"]),
            async (device, coordinatorEndpoint, definition) => {
                const endpoint = device.getEndpoint(1);

                // The write request is made when using the proprietary
                // Bosch Smart Home Controller II as of 16-10-2025. Looks like
                // the default value was too high, and they didn't want to
                // push a firmware update. We mimic it here to avoid complaints.
                await endpoint.write("ssIasZone", {currentZoneSensitivityLevel: 5});
            },
        ];
        return {
            configure,
            isModernExtend: true,
        };
    },
    waterAndTamperAlarm: () =>
        m.iasZoneAlarm({
            zoneType: "water_leak",
            zoneAttributes: ["alarm_1", "tamper"],
        }),
    muteAlarmControl: (): ModernExtend => {
        const muteAlarmControlLookup = {
            UNMUTED: false,
            MUTED: true,
        };

        const muteAlarmControlResponseLookup = {
            muted: 0x00,
            error: 0x01,
            no_change: 0x02,
            unmuted: 0x03,
        };

        const exposes: Expose[] = [
            e
                .binary(
                    "water_leak_alarm_control",
                    ea.ALL,
                    utils.getFromLookupByValue(true, muteAlarmControlLookup),
                    utils.getFromLookupByValue(false, muteAlarmControlLookup),
                )
                .withLabel("Mute water leak alarm")
                .withDescription("In case of an water leak, you can mute and unmute the audible alarm here"),
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["water_leak_alarm_control"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === utils.getFromLookupByValue(false, muteAlarmControlLookup)) {
                        await entity.command<"boschWaterAlarm", "muteAlarmControl", BoschWaterAlarmCluster>(
                            "boschWaterAlarm",
                            "muteAlarmControl",
                            {data: 0x00},
                            manufacturerOptions,
                        );
                    } else {
                        await entity.command<"boschWaterAlarm", "muteAlarmControl", BoschWaterAlarmCluster>(
                            "boschWaterAlarm",
                            "muteAlarmControl",
                            {data: 0x01},
                            manufacturerOptions,
                        );
                    }
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("ssIasZone", ["zoneStatus"]);
                },
            },
        ];

        const fromZigbee = [
            {
                cluster: "boschWaterAlarm",
                type: ["raw"],
                convert: (model, msg, publish, options, meta) => {
                    const command = msg.data[4];

                    if (command !== 0x01) {
                        return;
                    }

                    const muteAlarmControlResponse = msg.data[5];

                    switch (muteAlarmControlResponse) {
                        case muteAlarmControlResponseLookup.muted:
                            logger.debug(`Alarm on device '${meta.device.ieeeAddr}' was muted`, NS);
                            break;
                        case muteAlarmControlResponseLookup.error:
                            logger.error(`Alarm on device '${meta.device.ieeeAddr}' could not be muted right now (e.g., no active alarm)!`, NS);
                            break;
                        case muteAlarmControlResponseLookup.no_change:
                            logger.debug(`Alarm on device '${meta.device.ieeeAddr}' is already in requested state`, NS);
                            break;
                        case muteAlarmControlResponseLookup.unmuted:
                            logger.debug(`Alarm on device '${meta.device.ieeeAddr}' was unmuted`, NS);
                            break;
                    }
                },
            } satisfies Fz.Converter<"boschWaterAlarm", BoschWaterAlarmCluster, ["raw"]>,
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;

                    if (zoneStatus === undefined) {
                        return;
                    }

                    const result: KeyValue = {};

                    const alarmMuted = (zoneStatus & (1 << 1)) > 0;
                    result.water_leak_alarm_control = utils.getFromLookupByValue(alarmMuted, muteAlarmControlLookup);

                    return result;
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];

        const configure: Configure[] = [m.setupConfigureForBinding("ssIasZone", "input"), m.setupConfigureForReading("ssIasZone", ["zoneStatus"])];

        return {
            exposes,
            toZigbee,
            fromZigbee,
            configure,
            isModernExtend: true,
        };
    },
    alarmOnMotion: () =>
        m.binary<"boschWaterAlarm", BoschWaterAlarmCluster>({
            name: "alarm_on_motion",
            cluster: "boschWaterAlarm",
            attribute: "alarmOnMotion",
            description: "If your water alarm is moved, an acoustic signal sounds",
            valueOn: ["ON", 0x01],
            valueOff: ["OFF", 0x00],
            entityCategory: "config",
        }),
    testMode: () =>
        boschGeneralSensorDeviceExtend.testMode({
            testModeDescription:
                "Activates the test mode. In this mode, the device acts like it would when " +
                "detecting any water to verify the installation. Please keep in mind " +
                "that it can take up to 10 seconds for the test mode to be activated.",
            sensitivityLevelToUse: 0x00,
            variableTimeoutSupported: true,
            defaultTimeout: 3,
        }),
};
//endregion

//region Bosch BSD-2 (Smoke alarm II)
interface BoschSmokeAlarmIasZoneCluster {
    attributes: {
        /** ID: 36609 | Type: UINT8 | Used with default value 0 */
        unknownAttribute1: number;
        /** ID: 36614 | Type: UINT8 | Used with default value 0 */
        unknownAttribute2: number;
    };
    commands: {
        /** ID: 128 */
        alarmControl: {
            /** Type: ENUM8 */
            alarmMode: number;
            /** Type: UINT8 */
            alarmTimeout: number;
        };
    };
    commandResponses: never;
}

export const boschSmokeAlarmExtend = {
    customIasZoneCluster: () =>
        m.deviceAddCustomCluster("ssIasZone", {
            ID: Zcl.Clusters.ssIasZone.ID,
            attributes: {
                unknownAttribute1: {ID: 0x8f01, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownAttribute2: {ID: 0x8f06, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
            },
            commands: {
                alarmControl: {
                    ID: 0x80,
                    parameters: [
                        {name: "alarmMode", type: Zcl.DataType.ENUM8},
                        {name: "alarmTimeout", type: Zcl.DataType.UINT8},
                    ],
                },
            },
            commandsResponse: {},
        }),
    /** In previous implementations, the user was able to change the
     * sensitivity level of the smoke detector. That is not supported
     * when using the Bosch Smart Home Controller II. As the previous
     * creator assumed that Bosch follows the ZCL specification for
     * the sensitivity level (which isn't the case), this may result
     * in an unintentionally lowered sensitivity level. Therefore,
     * we set the manufacturer's default value here once to reverse
     * any previous modifications for safety reasons, as we talk
     * about a device that should save lives... */
    enforceDefaultSensitivityLevel: (): ModernExtend => {
        const onEvent: OnEvent.Handler[] = [
            async (event) => {
                if (event.type !== "start") {
                    return;
                }

                const device = event.data.device;

                if (device.meta.enforceDefaultSensitivityLevelApplied !== true) {
                    const endpoint = device.getEndpoint(1);

                    await endpoint.write("ssIasZone", {currentZoneSensitivityLevel: 0x00});

                    device.meta.enforceDefaultSensitivityLevelApplied = true;
                }
            },
        ];
        return {
            onEvent,
            isModernExtend: true,
        };
    },
    smokeAlarmAndButtonPushes: () =>
        m.iasZoneAlarm({
            zoneType: "smoke",
            zoneAttributes: ["alarm_1"],
            manufacturerZoneAttributes: [
                {
                    bit: 11,
                    name: "smoke_alarm_silenced",
                    valueOn: true,
                    valueOff: false,
                    description:
                        "Indicates whether an smoke alarm was silenced on the device itself for 10 minutes. " +
                        "Please keep in mind that the smoke detection is being disabled during that " +
                        "time period as well.",
                    entityCategory: "diagnostic",
                },
                {
                    bit: 8,
                    name: "button_pushed",
                    valueOn: true,
                    valueOff: false,
                    description:
                        "Indicates whether the button on the device is being pushed for at least " +
                        "3 seconds (e.g., to trigger a test alarm or silence a smoke alarm)",
                    entityCategory: "diagnostic",
                },
            ],
        }),
    alarmControl: (): ModernExtend => {
        const alarmModeLookup = {
            manual_smoke_alarm: 0x00,
            manual_burglar_alarm: 0x01,
        };

        const onOffLookup = {
            OFF: false,
            ON: true,
        };

        const defaultBroadcastAlarms: boolean = true;

        function setDefaultBroadcastAlarms(meta: Tz.Meta) {
            const newBroadcastStatus = utils.getFromLookupByValue(defaultBroadcastAlarms, onOffLookup);
            meta.publish({broadcast_alarms: newBroadcastStatus});
        }

        async function sendAlarmControlMessage(endpoint: Zh.Endpoint, broadcastAlarm: boolean, alarmMode: number, timeoutInSeconds: number) {
            if (broadcastAlarm === true) {
                // Bosch sends broadcast messages two times with 4 seconds in between to
                // ensure all sleepy devices receive them. We mimic the same pattern here.
                for (let index = 0; index < 2; index++) {
                    await endpoint.zclCommandBroadcast<"ssIasZone", "alarmControl", BoschSmokeAlarmIasZoneCluster>(
                        255,
                        ZSpec.BroadcastAddress.SLEEPY,
                        "ssIasZone",
                        "alarmControl",
                        {alarmMode: alarmMode, alarmTimeout: timeoutInSeconds},
                        manufacturerOptions,
                    );

                    await sleep(4000);
                }
            } else {
                await endpoint.command<"ssIasZone", "alarmControl", BoschSmokeAlarmIasZoneCluster>(
                    "ssIasZone",
                    "alarmControl",
                    {alarmMode: alarmMode, alarmTimeout: timeoutInSeconds},
                    manufacturerOptions,
                );
            }
        }

        const exposes: Expose[] = [
            e
                .binary("manual_smoke_alarm", ea.ALL, utils.getFromLookupByValue(true, onOffLookup), utils.getFromLookupByValue(false, onOffLookup))
                .withDescription("Indicates whether the smoke alarm siren is being manually activated on the device"),
            e
                .binary("manual_burglar_alarm", ea.ALL, utils.getFromLookupByValue(true, onOffLookup), utils.getFromLookupByValue(false, onOffLookup))
                .withDescription("Indicates whether the burglar alarm siren is being manually activated on the device"),
            e
                .binary("broadcast_alarms", ea.ALL, utils.getFromLookupByValue(true, onOffLookup), utils.getFromLookupByValue(false, onOffLookup))
                .withLabel("Broadcast alarms")
                .withDescription(
                    "Broadcast manual alarm state changes to all BSD-2 devices on the network. Please keep in mind " +
                        "that a detected smoke alarm is not being transmitted automatically to other devices. " +
                        "To achieve that, you must set up an automation, e.g., in Home Assistant.",
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

                    const smokeAlarmEnabled = (zoneStatus & (1 << 1)) > 0;
                    result.manual_smoke_alarm = utils.getFromLookupByValue(smokeAlarmEnabled, onOffLookup);

                    const burglarAlarmEnabled = (zoneStatus & (1 << 7)) > 0;
                    result.manual_burglar_alarm = utils.getFromLookupByValue(burglarAlarmEnabled, onOffLookup);

                    return result;
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["manual_smoke_alarm", "manual_burglar_alarm", "broadcast_alarms"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "manual_smoke_alarm" || key === "manual_burglar_alarm") {
                        let broadcastAlarm: boolean;

                        try {
                            broadcastAlarm = utils.getFromLookup(meta.state.broadcast_alarms, onOffLookup);
                        } catch {
                            setDefaultBroadcastAlarms(meta);
                            broadcastAlarm = defaultBroadcastAlarms;
                        }

                        const alarmMode = utils.getFromLookup(key, alarmModeLookup);
                        const enableAlarm = utils.getFromLookup(value, onOffLookup);
                        const timeoutInSeconds = enableAlarm ? 0xf0 : 0;

                        utils.assertEndpoint(entity);
                        await sendAlarmControlMessage(entity, broadcastAlarm, alarmMode, timeoutInSeconds);
                        clearTimeout(globalStore.getValue("boschSmokeAlarm", "alarmTimer"));

                        if (enableAlarm) {
                            const alarmTimer = setTimeout(
                                async () => await sendAlarmControlMessage(entity, broadcastAlarm, alarmMode, timeoutInSeconds),
                                (timeoutInSeconds - 60) * 1000,
                            );
                            globalStore.putValue("boschSmokeAlarm", "alarmTimer", alarmTimer);
                        }
                    }
                    if (key === "broadcast_alarms") {
                        return {state: {broadcast_alarms: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "manual_smoke_alarm" || key === "manual_burglar_alarm") {
                        await entity.read("ssIasZone", ["zoneStatus"]);
                    }
                    if (key === "broadcast_alarms" && meta.state[key] === undefined) {
                        setDefaultBroadcastAlarms(meta);
                    }
                },
            },
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    testMode: () =>
        boschGeneralSensorDeviceExtend.testMode({
            testModeDescription:
                "Check the function of the smoke alarm. Pay attention to the alarm sound " +
                "and the flashing of the alarm LED. Please keep in mind that it can take " +
                "up to 10 seconds for the test mode to be activated.",
            sensitivityLevelToUse: 0x00,
            variableTimeoutSupported: true,
            defaultTimeout: 5,
            zoneStatusBit: 10,
        }),
    battery: () => boschGeneralExtend.batteryWithPercentageAndLowStatus({percentageReportingConfig: {min: "MIN", max: "MAX", change: 1}}),
};
//endregion

//region Bosch BSP-FZ2/-EZ2/-GZ2/-FD (compact smart plugs)
interface BoschSmartPlugCluster extends BoschGeneralEnergyDeviceCluster {
    attributes: {
        /** ID: 6 | Type: BOOLEAN */
        autoOffEnabled: number;
        /** ID: 7 | Type: UINT16 */
        autoOffTime: number;
        /** ID: 44 | Type: UINT8 | Only used on BSP-FD */
        ledBrightness: number;
        /** ID: 45 | Type: BOOLEAN | Only used on BSP-FD */
        energySavingModeEnabled: number;
        /** ID: 46 | Type: UINT16 | Only used on BSP-FD */
        energySavingModeThreshold: number;
        /** ID: 47 | Type: UINT32 | Only used on BSP-FD */
        energySavingModeTimer: number;
    };
    commands: never;
    commandResponses: never;
}

export const boschSmartPlugExtend = {
    smartPlugCluster: () =>
        m.deviceAddCustomCluster("boschEnergyDevice", {
            ID: 0xfca0,
            manufacturerCode: manufacturerOptions.manufacturerCode,
            attributes: {
                autoOffEnabled: {ID: 0x0006, type: Zcl.DataType.BOOLEAN},
                autoOffTime: {ID: 0x0007, type: Zcl.DataType.UINT16},
                ledBrightness: {ID: 0x002c, type: Zcl.DataType.UINT8},
                energySavingModeEnabled: {ID: 0x002d, type: Zcl.DataType.BOOLEAN},
                energySavingModeThreshold: {ID: 0x002e, type: Zcl.DataType.UINT16},
                energySavingModeTimer: {ID: 0x002f, type: Zcl.DataType.UINT32},
            },
            commands: {},
            commandsResponse: {},
        }),
    onOff: () => m.onOff({powerOnBehavior: true, configureReporting: true}),
    ledBrightness: () =>
        m.numeric<"boschEnergyDevice", BoschSmartPlugCluster>({
            name: "led_brightness",
            cluster: "boschEnergyDevice",
            attribute: "ledBrightness",
            label: "LED brightness",
            description: "Here you can adjust the LED brightness",
            valueMin: 0,
            valueMax: 100,
            valueStep: 1,
            unit: "%",
            entityCategory: "config",
        }),
    energySavingMode: (): ModernExtend => {
        const energySavingModeEnabledLookup = {
            ON: 0x01,
            OFF: 0x00,
        };

        const exposes: Expose[] = [
            e
                .binary(
                    "energy_saving_mode_enabled",
                    ea.ALL,
                    utils.getFromLookupByValue(0x01, energySavingModeEnabledLookup),
                    utils.getFromLookupByValue(0x00, energySavingModeEnabledLookup),
                )
                .withLabel("Enable energy-saving mode")
                .withDescription("Here you can enable/disable the energy-saving mode")
                .withCategory("config"),
            e
                .numeric("energy_saving_mode_threshold", ea.ALL)
                .withLabel("Energy-saving threshold")
                .withDescription(
                    "Here you can set the threshold for the energy-saving mode. If the consumption falls below the set value (and the timer has been met), the smart plug will be turned off.",
                )
                .withUnit("watt")
                .withValueMin(1)
                .withValueMax(50)
                .withValueStep(1)
                .withCategory("config"),
            e
                .numeric("energy_saving_mode_timer", ea.ALL)
                .withLabel("Energy-saving timer")
                .withDescription("Here you can set the time the threshold has to be met before the smart plug is turned off")
                .withUnit("seconds")
                .withValueMin(1)
                .withValueMax(1800)
                .withValueStep(1)
                .withCategory("config"),
        ];

        const fromZigbee = [
            {
                cluster: "boschEnergyDevice",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    const data = msg.data;

                    if (data.energySavingModeEnabled !== undefined) {
                        result.energy_saving_mode_enabled = utils.getFromLookupByValue(data.energySavingModeEnabled, energySavingModeEnabledLookup);
                    }

                    if (data.energySavingModeThreshold !== undefined) {
                        result.energy_saving_mode_threshold = utils.toNumber(data.energySavingModeThreshold) / 10;
                    }

                    if (data.energySavingModeTimer !== undefined) {
                        result.energy_saving_mode_timer = utils.toNumber(data.energySavingModeTimer);
                    }

                    return result;
                },
            } satisfies Fz.Converter<"boschEnergyDevice", BoschSmartPlugCluster, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["energy_saving_mode_enabled", "energy_saving_mode_threshold", "energy_saving_mode_timer"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "energy_saving_mode_enabled") {
                        await entity.write<"boschEnergyDevice", BoschSmartPlugCluster>("boschEnergyDevice", {
                            energySavingModeEnabled: utils.getFromLookup(value, energySavingModeEnabledLookup),
                        });
                        return {state: {energy_saving_mode_enabled: value}};
                    }

                    if (key === "energy_saving_mode_threshold") {
                        await entity.write<"boschEnergyDevice", BoschSmartPlugCluster>("boschEnergyDevice", {
                            energySavingModeThreshold: utils.toNumber(value) * 10,
                        });
                        return {state: {energy_saving_mode_threshold: value}};
                    }

                    if (key === "energy_saving_mode_timer") {
                        await entity.write<"boschEnergyDevice", BoschSmartPlugCluster>("boschEnergyDevice", {
                            energySavingModeTimer: utils.toNumber(value),
                        });
                        return {state: {energy_saving_mode_timer: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "energy_saving_mode_enabled") {
                        await entity.read<"boschEnergyDevice", BoschSmartPlugCluster>("boschEnergyDevice", ["energySavingModeEnabled"]);
                    }

                    if (key === "energy_saving_mode_threshold") {
                        await entity.read<"boschEnergyDevice", BoschSmartPlugCluster>("boschEnergyDevice", ["energySavingModeThreshold"]);
                    }

                    if (key === "energy_saving_mode_timer") {
                        await entity.read<"boschEnergyDevice", BoschSmartPlugCluster>("boschEnergyDevice", ["energySavingModeTimer"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            m.setupConfigureForBinding("boschEnergyDevice", "input"),
            m.setupConfigureForReading<"boschEnergyDevice", BoschSmartPlugCluster>("boschEnergyDevice", [
                "energySavingModeEnabled",
                "energySavingModeThreshold",
                "energySavingModeTimer",
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
    electricityMeter: (args?: ElectricityMeterArgs) =>
        m.electricityMeter({
            voltage: false,
            current: false,
            power: {change: 1},
            energy: {change: 1},
            ...args,
        }),
};
//endregion

//region Bosch BTH-RA/-RM/-RM230Z (thermostats)
export interface BoschThermostatCluster {
    attributes: {
        /** ID: 16391 | Type: ENUM8 */
        operatingMode: number;
        /** ID: 16416 | Type: ENUM8 | Only used on BTH-RA */
        heatingDemand: number;
        /** ID: 16418 | Type: ENUM8 | Only used on BTH-RA */
        valveAdaptStatus: number;
        /** ID: 16421 | Type: ENUM8 | Only used on BTH-RM230Z with value depending on heaterType */
        unknownAttribute0: number;
        /** ID: 16448 | Type: INT16 | Only used on BTH-RA */
        remoteTemperature: number;
        /** ID: 16449 | Type: ENUM8 | Only used on BTH-RA with default value 0x01 */
        unknownAttribute1: number;
        /** ID: 16450 | Type: ENUM8 */
        windowOpenMode: number;
        /** ID: 16451 | Type: ENUM8 */
        boostHeating: number;
        /** ID: 16466 | Type: INT16 | Only used on BTH-RM and BTH-RM230Z */
        cableSensorTemperature: number;
        /** ID: 16480 | Type: ENUM8 | Only used on BTH-RM230Z */
        valveType: number;
        /** ID: 16481 | Type: ENUM8 | Read-only on BTH-RM230Z with value depending on heaterType */
        unknownAttribute2: number;
        /** ID: 16482 | Type: ENUM8 | Only used on BTH-RM and BTH-RM230Z */
        cableSensorMode: number;
        /** ID: 16483 | Type: ENUM8 | Only used on BTH-RM230Z */
        heaterType: number;
        /** ID: 20480 | Type: BITMAP8 */
        errorState: number;
        /** ID: 20496 | Type: ENUM8 | Only used on BTH-RA */
        automaticValveAdapt: number;
    };
    commands: {
        /** ID: 65 | Only used on BTH-RA */
        calibrateValve: Record<string, never>;
    };
    commandResponses: never;
}

export interface BoschUserInterfaceCfgCluster {
    attributes: {
        /** ID: 16395 | Type: UINT8 | Only used on BTH-RA */
        displayOrientation: number;
        /** ID: 16435 | Type: ENUM8 | Only used on BTH-RM and BTH-RM230Z */
        activityLed: number;
        /** ID: 16441 | Type: ENUM8 | Only used on BTH-RA */
        displayedTemperature: number;
        /** ID: 16442 | Type: ENUM8 */
        displaySwitchOnDuration: number;
        /** ID: 16443 | Type: ENUM8 */
        displayBrightness: number;
    };
    commands: never;
    commandResponses: never;
}

const boschThermostatLookup = {
    systemModes: {
        heat: 0x04,
        cool: 0x03,
        off: 0x00,
    },
    raRunningStates: <("idle" | "heat" | "cool" | "fan_only")[]>["idle", "heat"],
    heaterType: {
        underfloor_heating: 0x00,
        radiator: 0x02,
        central_heating: 0x01,
        manual_control: 0x03,
    },
};

export const boschThermostatExtend = {
    customThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                operatingMode: {ID: 0x4007, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                heatingDemand: {ID: 0x4020, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                valveAdaptStatus: {ID: 0x4022, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownAttribute0: {ID: 0x4025, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                remoteTemperature: {ID: 0x4040, type: Zcl.DataType.INT16, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownAttribute1: {ID: 0x4041, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                windowOpenMode: {ID: 0x4042, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                boostHeating: {ID: 0x4043, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                cableSensorTemperature: {ID: 0x4052, type: Zcl.DataType.INT16, manufacturerCode: manufacturerOptions.manufacturerCode},
                valveType: {ID: 0x4060, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                unknownAttribute2: {ID: 0x4061, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                cableSensorMode: {ID: 0x4062, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                heaterType: {ID: 0x4063, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                errorState: {ID: 0x5000, type: Zcl.DataType.BITMAP8, manufacturerCode: manufacturerOptions.manufacturerCode},
                automaticValveAdapt: {ID: 0x5010, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
            },
            commands: {
                calibrateValve: {ID: 0x41, parameters: []},
            },
            commandsResponse: {},
        }),
    customUserInterfaceCfgCluster: () =>
        m.deviceAddCustomCluster("hvacUserInterfaceCfg", {
            ID: Zcl.Clusters.hvacUserInterfaceCfg.ID,
            attributes: {
                displayOrientation: {ID: 0x400b, type: Zcl.DataType.UINT8, manufacturerCode: manufacturerOptions.manufacturerCode},
                activityLed: {ID: 0x4033, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                displayedTemperature: {ID: 0x4039, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                displaySwitchOnDuration: {ID: 0x403a, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
                displayBrightness: {ID: 0x403b, type: Zcl.DataType.ENUM8, manufacturerCode: manufacturerOptions.manufacturerCode},
            },
            commands: {},
            commandsResponse: {},
        }),
    relayState: () => m.onOff({description: "The state of the relay controlling the connected heating/cooling device", powerOnBehavior: false}),
    cableSensorMode: () =>
        m.enumLookup<"hvacThermostat", BoschThermostatCluster>({
            name: "cable_sensor_mode",
            cluster: "hvacThermostat",
            attribute: "cableSensorMode",
            description:
                'Select a configuration for the sensor connection. If you select "with_regulation", ' +
                "the measured temperature on the cable sensor is used by the heating/cooling algorithm " +
                "instead of the local temperature.",
            lookup: {not_used: 0x00, cable_sensor_without_regulation: 0xb0, cable_sensor_with_regulation: 0xb1},
            reporting: false,
            entityCategory: "config",
        }),
    cableSensorTemperature: () =>
        m.numeric<"hvacThermostat", BoschThermostatCluster>({
            name: "cable_sensor_temperature",
            cluster: "hvacThermostat",
            attribute: "cableSensorTemperature",
            description: "Measured temperature value on the cable sensor (if enabled)",
            unit: "°C",
            scale: 100,
            reporting: {min: 30, max: "MAX", change: 20},
            access: "STATE_GET",
        }),
    heaterType: () =>
        m.enumLookup<"hvacThermostat", BoschThermostatCluster>({
            name: "heater_type",
            cluster: "hvacThermostat",
            attribute: "heaterType",
            description: "Select the connected heater type or 'manual_control' if you like to activate the relay manually when necessary",
            lookup: boschThermostatLookup.heaterType,
            reporting: false,
            entityCategory: "config",
        }),
    valveType: () =>
        m.enumLookup<"hvacThermostat", BoschThermostatCluster>({
            name: "valve_type",
            cluster: "hvacThermostat",
            attribute: "valveType",
            description: "Select the connected valve type",
            lookup: {normally_closed: 0x00, normally_open: 0x01},
            reporting: false,
            entityCategory: "config",
        }),
    humidity: () => m.humidity({reporting: false}),
    operatingMode: (args?: {enableReporting: boolean}) =>
        m.enumLookup<"hvacThermostat", BoschThermostatCluster>({
            name: "operating_mode",
            cluster: "hvacThermostat",
            attribute: "operatingMode",
            description: "Bosch-specific operating mode",
            lookup: {schedule: 0x00, manual: 0x01, pause: 0x05},
            reporting: args?.enableReporting ? {min: "MIN", max: "MAX", change: null} : false,
            entityCategory: "config",
        }),
    windowOpenMode: (args?: {enableReporting: boolean}) =>
        m.binary<"hvacThermostat", BoschThermostatCluster>({
            name: "window_detection",
            cluster: "hvacThermostat",
            attribute: "windowOpenMode",
            description:
                "Activates the window open mode, where the thermostat disables any heating/cooling " +
                "to prevent unnecessary energy consumption. Please keep in mind that the device " +
                "itself does not detect any open windows!",
            valueOn: ["ON", 0x01],
            valueOff: ["OFF", 0x00],
            reporting: args?.enableReporting ? {min: "MIN", max: "MAX", change: null} : false,
        }),
    childLock: () =>
        m.binary({
            name: "child_lock",
            cluster: "hvacUserInterfaceCfg",
            attribute: "keypadLockout",
            description: "Enables/disables physical input on the thermostat",
            valueOn: ["LOCK", 0x01],
            valueOff: ["UNLOCK", 0x00],
            reporting: {min: "MIN", max: "MAX", change: null},
        }),
    displayBrightness: () =>
        m.numeric<"hvacUserInterfaceCfg", BoschUserInterfaceCfgCluster>({
            name: "display_brightness",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displayBrightness",
            description: "Sets brightness of the display",
            valueMin: 0,
            valueMax: 100,
            valueStep: 10,
            unit: "%",
            scale: 0.1,
            reporting: false,
            entityCategory: "config",
        }),
    displaySwitchOnDuration: () =>
        m.numeric<"hvacUserInterfaceCfg", BoschUserInterfaceCfgCluster>({
            name: "display_switch_on_duration",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displaySwitchOnDuration",
            label: "Display switch-on duration",
            description: "Sets the time before the display is automatically switched off",
            valueMin: 5,
            valueMax: 30,
            unit: "s",
            reporting: false,
            entityCategory: "config",
        }),
    displayOrientation: () =>
        m.enumLookup<"hvacUserInterfaceCfg", BoschUserInterfaceCfgCluster>({
            name: "display_orientation",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displayOrientation",
            description:
                "You can rotate the display content by 180° here. This is recommended if your thermostat is fitted vertically, for instance.",
            lookup: {standard_arrangement: 0x00, rotated_by_180_degrees: 0x01},
            reporting: false,
            entityCategory: "config",
        }),
    displayedTemperature: () =>
        m.enumLookup<"hvacUserInterfaceCfg", BoschUserInterfaceCfgCluster>({
            name: "displayed_temperature",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displayedTemperature",
            description: "Select which temperature should be displayed on your radiator thermostat display",
            lookup: {set_temperature: 0x00, measured_temperature: 0x01},
            reporting: false,
            entityCategory: "config",
        }),
    activityLedState: () =>
        m.enumLookup<"hvacUserInterfaceCfg", BoschUserInterfaceCfgCluster>({
            name: "activity_led",
            cluster: "hvacUserInterfaceCfg",
            attribute: "activityLed",
            label: "Activity LED state",
            description: "Determines the state of the little dot on the display next to the heating/cooling symbol",
            lookup: {off: 0x00, auto: 0x01, on: 0x02},
            reporting: false,
            entityCategory: "config",
        }),
    remoteTemperature: () =>
        m.numeric<"hvacThermostat", BoschThermostatCluster>({
            name: "remote_temperature",
            cluster: "hvacThermostat",
            attribute: "remoteTemperature",
            description: "Input for remote temperature sensor. Required at least every 30 minutes to prevent fallback to the internal sensor!",
            valueMin: 0.0,
            valueMax: 35.0,
            valueStep: 0.2,
            unit: "°C",
            scale: 100,
            reporting: false,
            entityCategory: "config",
        }),
    setpointChangeSource: (args?: {enableReporting: boolean}) =>
        m.enumLookup({
            name: "setpoint_change_source",
            cluster: "hvacThermostat",
            attribute: "setpointChangeSource",
            description: "Source of the current setpoint temperature",
            lookup: {manual: 0x00, schedule: 0x01, externally: 0x02},
            access: "STATE_GET",
            reporting: args?.enableReporting ? {min: "MIN", max: "MAX", change: null} : false,
            entityCategory: "diagnostic",
        }),
    customHeatingDemand: () =>
        m.numeric<"hvacThermostat", BoschThermostatCluster>({
            name: "pi_heating_demand",
            cluster: "hvacThermostat",
            attribute: "heatingDemand",
            label: "PI heating demand",
            description: "Position of the valve (= demanded heat) where 0% is fully closed and 100% is fully open",
            unit: "%",
            valueMin: 0,
            valueMax: 100,
            access: "ALL",
            reporting: {min: "MIN", max: "MAX", change: null},
        }),
    rmBattery: () =>
        m.battery({
            percentage: true,
            percentageReporting: false,
            voltage: true,
            voltageReporting: true,
            voltageReportingConfig: false,
            voltageToPercentage: {min: 4400, max: 6400},
            lowStatus: true,
            lowStatusReportingConfig: {min: "MIN", max: "MAX", change: null},
        }),
    rmThermostat: (): ModernExtend => {
        const thermostat = m.thermostat({
            localTemperature: {
                configure: {reporting: {min: 30, max: 900, change: 10}},
            },
            localTemperatureCalibration: {
                values: {min: -5, max: 5, step: 0.1},
                configure: {reporting: false},
            },
            setpoints: {
                values: {
                    occupiedHeatingSetpoint: {min: 5, max: 30, step: 0.5},
                    occupiedCoolingSetpoint: {min: 5, max: 30, step: 0.5},
                },
                configure: {reporting: {min: "10_SECONDS", max: "MAX", change: 50}},
            },
            systemMode: {
                values: ["off", "heat", "cool"],
                configure: {reporting: {min: "MIN", max: "MAX", change: null}},
            },
            runningState: {
                values: ["idle", "heat", "cool"],
                configure: {reporting: {min: "MIN", max: "MAX", change: null}},
            },
        });

        const exposes: (Expose | DefinitionExposesFunction)[] = thermostat.exposes;

        return {
            exposes: exposes,
            fromZigbee: thermostat.fromZigbee,
            toZigbee: thermostat.toZigbee,
            configure: thermostat.configure,
            isModernExtend: true,
        };
    },
    raThermostat: (): ModernExtend => {
        // Native thermostat
        const thermostat = m.thermostat({
            localTemperature: {
                values: {
                    description:
                        "Temperature used by the heating algorithm. This is the " +
                        "temperature measured on the device (by default) or the " +
                        "remote temperature (if set within the last 30 min).",
                },
                configure: {
                    reporting: {min: 30, max: 900, change: 20},
                },
            },
            localTemperatureCalibration: {
                values: {min: -5, max: 5, step: 0.1},
                configure: {reporting: false},
            },
            setpoints: {
                values: {
                    occupiedHeatingSetpoint: {min: 5, max: 30, step: 0.5},
                },
                configure: {
                    reporting: {min: "10_SECONDS", max: "MAX", change: 50},
                },
            },
            systemMode: {
                values: ["heat"],
                configure: {
                    reporting: false,
                },
            },
            runningState: {
                values: boschThermostatLookup.raRunningStates,
                toZigbee: {
                    skip: true,
                },
                configure: {
                    reporting: false,
                },
            },
            piHeatingDemand: {
                values: ea.ALL,
                toZigbee: {
                    skip: true,
                },
                configure: {
                    skip: true,
                },
            },
        });
        const exposes: (Expose | DefinitionExposesFunction)[] = thermostat.exposes;
        const fromZigbee = thermostat.fromZigbee;
        const toZigbee: Tz.Converter[] = thermostat.toZigbee;
        let configure: Configure[] = thermostat.configure;

        // Add converters for custom running state
        const runningState = boschThermostatExtend.customRunningState();
        fromZigbee.push(...runningState.fromZigbee);
        toZigbee.push(...runningState.toZigbee);

        // Add converters and configure for custom heating demand
        const piHeatingDemand = boschThermostatExtend.customHeatingDemand();
        fromZigbee.push(...piHeatingDemand.fromZigbee);
        toZigbee.push(...piHeatingDemand.toZigbee);
        configure = [...configure, ...piHeatingDemand.configure];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    customRunningState: (): ModernExtend => {
        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.heatingDemand !== undefined) {
                        result.running_state =
                            utils.toNumber(data.heatingDemand) > 0
                                ? boschThermostatLookup.raRunningStates[1]
                                : boschThermostatLookup.raRunningStates[0];
                    }

                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", BoschThermostatCluster, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["running_state"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", ["heatingDemand"]);
                },
            },
        ];

        return {
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    boostHeating: (args?: {enableReporting: boolean}): ModernExtend => {
        const boostHeatingLookup: KeyValue = {
            OFF: 0x00,
            ON: 0x01,
        };

        const exposes: Expose[] = [
            e
                .binary(
                    "boost_heating",
                    ea.ALL,
                    utils.getFromLookupByValue(0x01, boostHeatingLookup),
                    utils.getFromLookupByValue(0x00, boostHeatingLookup),
                )
                .withLabel("Activate boost heating")
                .withDescription("Activate boost heating (opens TRV for 5 minutes)"),
        ];

        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.boostHeating !== undefined) {
                        result.boost_heating = utils.getFromLookupByValue(data.boostHeating, boostHeatingLookup);
                    }

                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", BoschThermostatCluster, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["boost_heating"],
                convertSet: async (entity, key, value, meta) => {
                    const enableBoostHeating = value === utils.getFromLookupByValue(boostHeatingLookup.ON, boostHeatingLookup);

                    if (enableBoostHeating) {
                        const systemModeNotSetToHeat = "system_mode" in meta.state && meta.state.system_mode !== "heat";

                        if (systemModeNotSetToHeat) {
                            throw new Error("Boost heating is only possible when system mode is set to 'heat'!");
                        }

                        const heaterTypeNotSetToRadiator =
                            "heater_type" in meta.state &&
                            meta.state.heater_type !==
                                utils.getFromLookupByValue(boschThermostatLookup.heaterType.radiator, boschThermostatLookup.heaterType);

                        if (heaterTypeNotSetToRadiator) {
                            throw new Error("Boost heating is only possible when heater type is set to 'radiator'!");
                        }
                    }

                    await entity.write<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", {
                        boostHeating: utils.toNumber(utils.getFromLookup(value, boostHeatingLookup)),
                    });

                    return {state: {boost_heating: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", ["boostHeating"]);
                },
            },
        ];

        const configure: Configure[] = [
            m.setupConfigureForReporting<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", "boostHeating", {
                config: args?.enableReporting ? {min: "MIN", max: "MAX", change: null} : false,
                access: ea.ALL,
            }),
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    errorState: (args?: {enableReporting: boolean}): ModernExtend => {
        const exposes: Expose[] = [
            e
                .text("error_state", ea.STATE_GET)
                .withDescription("Indicates whether the device encounters any errors or not")
                .withCategory("diagnostic"),
        ];

        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.errorState !== undefined) {
                        const receivedErrorState = data.errorState;

                        if (receivedErrorState === 0) {
                            result.error_state = "ok";
                        } else {
                            result.error_state = "";
                            const bitmapLength = (receivedErrorState >>> 0).toString(2).length;

                            for (let errorNumber = 0; errorNumber < bitmapLength; errorNumber++) {
                                if ((receivedErrorState >> errorNumber) & 1) {
                                    if (String(result.error_state).length > 0) {
                                        result.error_state += " - ";
                                    }

                                    result.error_state += `E${String(errorNumber + 1).padStart(2, "0")}`;
                                }
                            }
                        }
                    }

                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", BoschThermostatCluster, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["error_state"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", ["errorState"]);
                },
            },
        ];

        const configure: Configure[] = [
            m.setupConfigureForReporting<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", "errorState", {
                config: args?.enableReporting ? {min: "MIN", max: "MAX", change: null} : false,
                access: ea.STATE_GET,
            }),
        ];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            configure,
            isModernExtend: true,
        };
    },
    valveAdaptation: (): ModernExtend => {
        const valveAdaptStatusLookup = {
            none: 0x00,
            ready_to_calibrate: 0x01,
            calibration_in_progress: 0x02,
            error: 0x03,
            success: 0x04,
        };

        const triggerValveAdaptation = async (state: KeyValue, endpoint: Zh.Endpoint | Zh.Group, throwError = true) => {
            let adaptStatus: number;

            try {
                adaptStatus = utils.getFromLookup(state.valve_adapt_status, valveAdaptStatusLookup);
            } catch {
                adaptStatus = valveAdaptStatusLookup.none;
            }

            switch (adaptStatus) {
                case valveAdaptStatusLookup.ready_to_calibrate:
                case valveAdaptStatusLookup.error:
                    await endpoint.command<"hvacThermostat", "calibrateValve", BoschThermostatCluster>(
                        "hvacThermostat",
                        "calibrateValve",
                        {},
                        manufacturerOptions,
                    );
                    break;
                default:
                    if (throwError) {
                        throw new Error("Valve adaptation process not possible right now!");
                    }
            }
        };

        const exposes: Expose[] = [
            e
                .enum("valve_adapt_status", ea.STATE_GET, Object.keys(valveAdaptStatusLookup))
                .withLabel("Valve adaptation status")
                .withDescription("Specifies the current status of the valve adaptation")
                .withCategory("diagnostic"),
            e
                .binary("automatic_valve_adapt", ea.STATE_GET, true, false)
                .withLabel("Automatic valve adaptation requested")
                .withDescription(
                    "Specifies if an automatic valve adaptation is being requested by the thermostat " +
                        "(for example after a successful firmware upgrade). If this is the case, the " +
                        "valve adaptation will be automatically started as soon as the adaptation status " +
                        "is 'ready_to_calibrate' or 'error'.",
                )
                .withCategory("diagnostic"),
            e
                .enum("valve_adapt_process", ea.SET, ["adapt"])
                .withLabel("Trigger adaptation process")
                .withDescription("Trigger the valve adaptation process. Only possible when the adaptation status is 'ready_to_calibrate' or 'error'.")
                .withCategory("config"),
        ];

        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: async (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const data = msg.data;

                    if (data.valveAdaptStatus !== undefined) {
                        result.valve_adapt_status = utils.getFromLookupByValue(data.valveAdaptStatus, valveAdaptStatusLookup);

                        const automaticValveAdapt = meta.state.automatic_valve_adapt ?? false;
                        if (automaticValveAdapt === true) {
                            await triggerValveAdaptation(meta.state, msg.endpoint, false);
                        }
                    }

                    if (data.automaticValveAdapt !== undefined) {
                        result.automatic_valve_adapt = !!data.automaticValveAdapt;
                    }

                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", BoschThermostatCluster, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["valve_adapt_status", "automatic_valve_adapt", "valve_adapt_process"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "valve_adapt_process") {
                        await triggerValveAdaptation(meta.state, entity);
                    }
                },
                convertGet: async (entity, key, meta) => {
                    if (key === "valve_adapt_status") {
                        await entity.read<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", ["valveAdaptStatus"]);
                    }
                    if (key === "automatic_valve_adapt") {
                        await entity.read<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", ["automaticValveAdapt"]);
                    }
                },
            },
        ];

        const configure: Configure[] = [
            m.setupConfigureForReporting<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", "valveAdaptStatus", {
                config: {min: "MIN", max: "MAX", change: null},
                access: ea.STATE_GET,
            }),
            m.setupConfigureForReading<"hvacThermostat", BoschThermostatCluster>("hvacThermostat", ["automaticValveAdapt"]),
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
