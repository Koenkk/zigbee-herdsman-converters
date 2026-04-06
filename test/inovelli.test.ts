import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import type {Definition, Expose, Fz, KeyValue} from "../src/lib/types";
import {mockDevice} from "./utils";

function processFromZigbeeMessage(definition: Definition, cluster: string, type: string, data: KeyValue, endpointID: number) {
    const converters = definition.fromZigbee.filter((c) => {
        const typeMatch = Array.isArray(c.type) ? c.type.includes(type) : c.type === type;
        return c.cluster === cluster && typeMatch;
    });

    let payload: KeyValue = {};
    for (const converter of converters) {
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        const msg: Fz.Message<any, any, any> = {
            data,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            endpoint: {ID: endpointID} as any,
            device: null,
            meta: null,
            groupID: 0,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            type: type as any,
            // biome-ignore lint/suspicious/noExplicitAny: test mock
            cluster: cluster as any,
            linkquality: 0,
        };
        const converted = converter.convert(definition, msg, () => {}, {}, {state: {}, device: null, deviceExposesChanged: () => {}});
        if (converted) {
            payload = {...payload, ...converted};
        }
    }
    return payload;
}

describe("Inovelli VZM36", () => {
    let definition: Definition;

    it("should find definition", async () => {
        const device = mockDevice({
            modelID: "VZM36",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                {ID: 2, inputClusters: ["genOnOff", "genLevelCtrl"]},
            ],
        });
        definition = await findByDevice(device);
        expect(definition.model).toBe("VZM36");
    });

    describe("genOnOff from endpoint 2 (fan)", () => {
        it("should set fan_state without affecting light state", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 2);
            expect(payload).toStrictEqual({fan_state: "ON"});
        });

        it("should not leak raw onOff data", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 2);
            expect(payload).not.toHaveProperty("onOff");
            expect(payload).toStrictEqual({fan_state: "OFF"});
        });
    });

    describe("genOnOff from endpoint 1 (light)", () => {
        it("should set light state without affecting fan_state", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 1}, 1);
            expect(payload).toStrictEqual({state: "ON"});
        });

        it("should not leak raw onOff data", () => {
            const payload = processFromZigbeeMessage(definition, "genOnOff", "attributeReport", {onOff: 0}, 1);
            expect(payload).not.toHaveProperty("onOff");
            expect(payload).toStrictEqual({state: "OFF"});
        });
    });

    describe("genLevelCtrl from endpoint 2 (fan)", () => {
        it("should set fan_mode without affecting light brightness", () => {
            const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 33}, 2);
            expect(payload).not.toHaveProperty("brightness");
            expect(payload).not.toHaveProperty("currentLevel");
            expect(payload).toHaveProperty("fan_mode");
        });
    });

    describe("genLevelCtrl from endpoint 1 (light)", () => {
        it("should set brightness without affecting fan_mode", () => {
            const payload = processFromZigbeeMessage(definition, "genLevelCtrl", "attributeReport", {currentLevel: 200}, 1);
            expect(payload).not.toHaveProperty("fan_mode");
            expect(payload).not.toHaveProperty("currentLevel");
            expect(payload).toStrictEqual({brightness: 200});
        });
    });
});

function resolveExposes(definition: Definition, device: ReturnType<typeof mockDevice>): Expose[] {
    if (typeof definition.exposes === "function") {
        return definition.exposes(device, {});
    }
    return definition.exposes as Expose[];
}

function findExpose(exposes: Expose[], name: string): Expose | undefined {
    return exposes.find((exp) => exp.name === name);
}

function assertExpose(exposes: Expose[], name: string): Expose {
    const expose = exposes.find((exp) => exp.name === name);
    expect(expose).toBeDefined();
    return expose as Expose;
}

function getEnumValues(expose: Expose): (string | number)[] {
    expect(expose.type).toBe("enum");
    return (expose as {values: (string | number)[]} & Expose).values;
}

describe("Inovelli baseline exposes", () => {
    it("VZM30-SN should expose all expected attributes", async () => {
        const device = mockDevice({
            modelID: "VZM30-SN",
            endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}, {ID: 4}],
        });
        const def = await findByDevice(device);
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "current",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "humidity",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "mediumLevelForFanControlMode",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
            "temperature",
            "voltage",
        ]);
    });

    it("VZM31-SN should expose all expected attributes", async () => {
        const device = mockDevice({
            modelID: "VZM31-SN",
            endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}],
        });
        const def = await findByDevice(device);
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "autoTimerOff",
            "auxDetectionLevel",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingAlgorithm",
            "dimmingMode",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "higherOutputInNonNeutral",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "powerType",
            "quickStartLevel",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "relayClick",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
        ]);
    });

    it("VZM32-SN should expose all expected attributes", async () => {
        const device = mockDevice({
            modelID: "VZM32-SN",
            endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}, {ID: 3}],
        });
        const def = await findByDevice(device);
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "activeEnergyReports",
            "activePowerReports",
            "area1Occupancy",
            "area2Occupancy",
            "area3Occupancy",
            "area4Occupancy",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "current",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingMode",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "energy",
            "energy_reset",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "higherOutputInNonNeutral",
            "identify",
            "illuminance",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledBarScaling",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "mmWaveDepthMax",
            "mmWaveDepthMin",
            "mmWaveDetectSensitivity",
            "mmWaveDetectTrigger",
            "mmWaveHeightMax",
            "mmWaveHeightMin",
            "mmWaveHoldTime",
            "mmWaveRoomSizePreset",
            "mmWaveStayLife",
            "mmWaveTargetInfoReport",
            "mmWaveVersion",
            "mmWaveWidthMax",
            "mmWaveWidthMin",
            "mmwaveControlWiredDevice",
            "mmwave_control_commands",
            "mmwave_detection_areas",
            "mmwave_interference_areas",
            "mmwave_stay_areas",
            "mmwave_targets",
            "notificationComplete",
            "occupancy",
            "onOffLedMode",
            "otaImageType",
            "outputMode",
            "overheat",
            "periodicPowerAndEnergyReports",
            "power",
            "powerType",
            "quickStartLevel",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
            "voltage",
        ]);
    });

    it("VZM35-SN should expose all expected attributes", async () => {
        const device = mockDevice({
            modelID: "VZM35-SN",
            endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}],
        });
        const def = await findByDevice(device);
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "action",
            "autoTimerOff",
            "auxSwitchUniqueScenes",
            "bindingOffToOnSyncLevel",
            "breeze mode",
            "brightnessLevelForDoubleTapDown",
            "brightnessLevelForDoubleTapUp",
            "buttonDelay",
            "defaultLed1ColorWhenOff",
            "defaultLed1ColorWhenOn",
            "defaultLed1IntensityWhenOff",
            "defaultLed1IntensityWhenOn",
            "defaultLed2ColorWhenOff",
            "defaultLed2ColorWhenOn",
            "defaultLed2IntensityWhenOff",
            "defaultLed2IntensityWhenOn",
            "defaultLed3ColorWhenOff",
            "defaultLed3ColorWhenOn",
            "defaultLed3IntensityWhenOff",
            "defaultLed3IntensityWhenOn",
            "defaultLed4ColorWhenOff",
            "defaultLed4ColorWhenOn",
            "defaultLed4IntensityWhenOff",
            "defaultLed4IntensityWhenOn",
            "defaultLed5ColorWhenOff",
            "defaultLed5ColorWhenOn",
            "defaultLed5IntensityWhenOff",
            "defaultLed5IntensityWhenOn",
            "defaultLed6ColorWhenOff",
            "defaultLed6ColorWhenOn",
            "defaultLed6IntensityWhenOff",
            "defaultLed6IntensityWhenOn",
            "defaultLed7ColorWhenOff",
            "defaultLed7ColorWhenOn",
            "defaultLed7IntensityWhenOff",
            "defaultLed7IntensityWhenOn",
            "defaultLevelLocal",
            "defaultLevelRemote",
            "deviceBindNumber",
            "dimmingSpeedDownLocal",
            "dimmingSpeedDownRemote",
            "dimmingSpeedUpLocal",
            "dimmingSpeedUpRemote",
            "doubleTapClearNotifications",
            "doubleTapDownToParam56",
            "doubleTapUpToParam55",
            "fanControlMode",
            "fanLedLevelType",
            "fanTimerMode",
            "firmwareUpdateInProgressIndicator",
            "highLevelForFanControlMode",
            "identify",
            "individual_led_effect",
            "internalTemperature",
            "invertSwitch",
            "ledColorForFanControlMode",
            "ledColorWhenOff",
            "ledColorWhenOn",
            "ledIntensityWhenOff",
            "ledIntensityWhenOn",
            "led_effect",
            "loadLevelIndicatorTimeout",
            "localProtection",
            "lowLevelForFanControlMode",
            "maximumLevel",
            "mediumLevelForFanControlMode",
            "minimumLevel",
            "nonNeutralAuxLowGear",
            "nonNeutralAuxMediumGear",
            "notificationComplete",
            "onOffLedMode",
            "outputMode",
            "overheat",
            "powerType",
            "quickStartTime",
            "rampRateOffToOnLocal",
            "rampRateOffToOnRemote",
            "rampRateOnToOffLocal",
            "rampRateOnToOffRemote",
            "remoteProtection",
            "singleTapBehavior",
            "smartBulbMode",
            "stateAfterPowerRestored",
            "switchType",
        ]);
    });

    it("VZM36 should expose all expected attributes", async () => {
        const device = mockDevice({
            modelID: "VZM36",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                {ID: 2, inputClusters: ["genOnOff", "genLevelCtrl"]},
            ],
        });
        const def = await findByDevice(device);
        const exposes = resolveExposes(def, device);
        const names = exposes
            .map((e) => e.name)
            .filter(Boolean)
            .sort();
        expect(names).toStrictEqual([
            "autoTimerOff_1",
            "autoTimerOff_2",
            "breeze mode",
            "defaultLevelRemote_1",
            "defaultLevelRemote_2",
            "dimmingMode_1",
            "dimmingSpeedDownRemote_1",
            "dimmingSpeedDownRemote_2",
            "dimmingSpeedUpRemote_1",
            "dimmingSpeedUpRemote_2",
            "higherOutputInNonNeutral_1",
            "identify",
            "ledColorWhenOn_1",
            "ledIntensityWhenOn_1",
            "maximumLevel_1",
            "maximumLevel_2",
            "minimumLevel_1",
            "minimumLevel_2",
            "outputMode_1",
            "outputMode_2",
            "quickStartLevel_1",
            "quickStartTime_1",
            "quickStartTime_2",
            "rampRateOffToOnRemote_1",
            "rampRateOffToOnRemote_2",
            "rampRateOnToOffRemote_1",
            "rampRateOnToOffRemote_2",
            "smartBulbMode_1",
            "smartBulbMode_2",
            "stateAfterPowerRestored_1",
            "stateAfterPowerRestored_2",
        ]);
    });
});

describe("Inovelli firmware-gated exposes", () => {
    function createVZM31(softwareBuildID?: string) {
        return mockDevice({
            modelID: "VZM31-SN",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                {ID: 2, inputClusters: []},
                {ID: 3, inputClusters: []},
            ],
            softwareBuildID,
        });
    }

    describe("VZM31-SN firmware below 3.0", () => {
        it("switchType should include Single-Pole Full Sine Wave", async () => {
            const device = createVZM31("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).toContain("Single-Pole Full Sine Wave");
        });

        it("fanControlMode should not include Toggle", async () => {
            const device = createVZM31("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).not.toContain("Toggle");
        });

        it("dimmingAlgorithm should not be exposed", async () => {
            const device = createVZM31("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
        });

        it("auxDetectionLevel should not be exposed", async () => {
            const device = createVZM31("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM31-SN firmware 3.0", () => {
        it("switchType should not include Single-Pole Full Sine Wave", async () => {
            const device = createVZM31("3.0");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
        });

        it("fanControlMode should include Toggle", async () => {
            const device = createVZM31("3.0");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });

        it("dimmingAlgorithm should not be exposed (below 3.05)", async () => {
            const device = createVZM31("3.0");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
        });

        it("auxDetectionLevel should not be exposed (below 3.05)", async () => {
            const device = createVZM31("3.0");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM31-SN firmware 3.04 (between 3.0 and 3.05)", () => {
        it("switchType should not include Single-Pole Full Sine Wave", async () => {
            const device = createVZM31("3.04");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
        });

        it("fanControlMode should include Toggle", async () => {
            const device = createVZM31("3.04");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });

        it("dimmingAlgorithm should not be exposed", async () => {
            const device = createVZM31("3.04");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
        });

        it("auxDetectionLevel should not be exposed", async () => {
            const device = createVZM31("3.04");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });
    });

    describe("VZM31-SN firmware 3.05+", () => {
        it("switchType should not include Single-Pole Full Sine Wave", async () => {
            const device = createVZM31("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
        });

        it("fanControlMode should include Toggle", async () => {
            const device = createVZM31("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });

        it("dimmingAlgorithm should be exposed", async () => {
            const device = createVZM31("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeDefined();
        });

        it("auxDetectionLevel should be exposed", async () => {
            const device = createVZM31("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "auxDetectionLevel")).toBeDefined();
        });
    });

    describe("VZM31-SN with no firmware version", () => {
        it("should expose all attributes with all values", async () => {
            const device = createVZM31();
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toContain("Single Pole");

            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");

            expect(findExpose(exposes, "dimmingAlgorithm")).toBeDefined();
            expect(findExpose(exposes, "auxDetectionLevel")).toBeDefined();
        });
    });

    function createVZM30(softwareBuildID?: string) {
        return mockDevice({
            modelID: "VZM30-SN",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                {ID: 2, inputClusters: []},
                {ID: 3, inputClusters: []},
                {ID: 4, inputClusters: []},
            ],
            softwareBuildID,
        });
    }

    describe("VZM30-SN switchType never includes Single-Pole Full Sine Wave", () => {
        it("old firmware", async () => {
            const device = createVZM30("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });

        it("new firmware", async () => {
            const device = createVZM30("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });
    });

    describe("VZM30-SN fanControlMode Toggle is not firmware-gated", () => {
        it("should always include Toggle regardless of firmware", async () => {
            const device = createVZM30("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });
    });

    describe("VZM30-SN has no dimmingAlgorithm or auxDetectionLevel", () => {
        it("regardless of firmware version", async () => {
            const device = createVZM30("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });
    });

    function createVZM32(softwareBuildID?: string) {
        return mockDevice({
            modelID: "VZM32-SN",
            endpoints: [
                {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]},
                {ID: 2, inputClusters: []},
                {ID: 3, inputClusters: []},
            ],
            softwareBuildID,
        });
    }

    describe("VZM32-SN switchType never includes Single-Pole Full Sine Wave", () => {
        it("old firmware", async () => {
            const device = createVZM32("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });

        it("new firmware", async () => {
            const device = createVZM32("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).not.toContain("Single-Pole Full Sine Wave");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });
    });

    describe("VZM32-SN fanControlMode Toggle is not firmware-gated", () => {
        it("should always include Toggle regardless of firmware", async () => {
            const device = createVZM32("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });
    });

    describe("VZM32-SN dimmingAlgorithm and auxDetectionLevel are not available", () => {
        it("should not be exposed regardless of firmware", async () => {
            const device = createVZM32("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });
    });

    function createVZM35(softwareBuildID?: string) {
        return mockDevice({
            modelID: "VZM35-SN",
            endpoints: [{ID: 1, inputClusters: ["genOnOff", "genLevelCtrl"]}, {ID: 2}],
            softwareBuildID,
        });
    }

    describe("VZM35-SN switchType always uses default values", () => {
        it("should only have Single Pole and Aux Switch", async () => {
            const device = createVZM35("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const switchType = assertExpose(exposes, "switchType");
            expect(getEnumValues(switchType)).toStrictEqual(["Single Pole", "Aux Switch"]);
        });
    });

    describe("VZM35-SN fanControlMode Toggle is not firmware-gated", () => {
        it("should always include Toggle regardless of firmware", async () => {
            const device = createVZM35("2.18");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            const fanControlMode = assertExpose(exposes, "fanControlMode");
            expect(getEnumValues(fanControlMode)).toContain("Toggle");
        });
    });

    describe("VZM35-SN has no dimmingAlgorithm or auxDetectionLevel", () => {
        it("regardless of firmware version", async () => {
            const device = createVZM35("3.05");
            const definition = await findByDevice(device);
            const exposes = resolveExposes(definition, device);
            expect(findExpose(exposes, "dimmingAlgorithm")).toBeUndefined();
            expect(findExpose(exposes, "auxDetectionLevel")).toBeUndefined();
        });
    });
});

describe("Inovelli configure attribute filtering", () => {
    function patchDeviceForConfigure(device: ReturnType<typeof mockDevice>) {
        vi.spyOn(device, "save").mockImplementation(() => {});
        const defaults: Record<string, number> = {
            acPowerDivisor: 10,
            acPowerMultiplier: 1,
            divisor: 100,
            multiplier: 1,
        };
        for (const ep of device.endpoints) {
            vi.spyOn(ep, "save").mockImplementation(() => {});
            vi.spyOn(ep, "read").mockImplementation((cluster, attrs) => {
                const result: Record<string, number> = {};
                for (const attr of attrs as string[]) {
                    result[attr] = defaults[attr] ?? 0;
                }
                try {
                    ep.saveClusterAttributeKeyValue(cluster as string, result);
                } catch {
                    // Custom clusters (e.g. manuSpecificInovelli) may not be registered in Zcl
                }
                return Promise.resolve(result);
            });
        }
    }

    function collectReadAttributes(device: ReturnType<typeof mockDevice>): string[] {
        const allReadKeys: string[] = [];
        for (const ep of device.endpoints) {
            for (const call of (ep.read as ReturnType<typeof vi.fn>).mock.calls) {
                allReadKeys.push(...(call[1] as string[]));
            }
        }
        return allReadKeys;
    }

    async function runConfigure(device: ReturnType<typeof mockDevice>) {
        patchDeviceForConfigure(device);
        const definition = await findByDevice(device);
        const coordinatorEndpoint = device.getEndpoint(1);
        await definition.configure(device, coordinatorEndpoint, definition);
        return collectReadAttributes(device);
    }

    describe("VZM31-SN configure", () => {
        function createVZM31(softwareBuildID?: string) {
            return mockDevice({
                modelID: "VZM31-SN",
                endpoints: [
                    {ID: 1, inputClusters: ["genOnOff", "genLevelCtrl", "haElectricalMeasurement", "seMetering"]},
                    {ID: 2, inputClusters: []},
                    {ID: 3, inputClusters: []},
                ],
                softwareBuildID,
            });
        }

        it("should not read dimmingAlgorithm or auxDetectionLevel on firmware below 3.05", async () => {
            const readKeys = await runConfigure(createVZM31("3.0"));
            expect(readKeys).not.toContain("dimmingAlgorithm");
            expect(readKeys).not.toContain("auxDetectionLevel");
        });

        it("should read dimmingAlgorithm and auxDetectionLevel on firmware 3.05+", async () => {
            const readKeys = await runConfigure(createVZM31("3.05"));
            expect(readKeys).toContain("dimmingAlgorithm");
            expect(readKeys).toContain("auxDetectionLevel");
        });

        it("should read all attributes when firmware is unknown", async () => {
            const readKeys = await runConfigure(createVZM31());
            expect(readKeys).toContain("dimmingAlgorithm");
            expect(readKeys).toContain("auxDetectionLevel");
            expect(readKeys).toContain("switchType");
            expect(readKeys).toContain("fanControlMode");
        });
    });

    describe("VZM32-SN configure", () => {
        function createVZM32(softwareBuildID?: string) {
            return mockDevice({
                modelID: "VZM32-SN",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: [
                            "genOnOff",
                            "genLevelCtrl",
                            "haElectricalMeasurement",
                            "seMetering",
                            "msIlluminanceMeasurement",
                            "msOccupancySensing",
                        ],
                    },
                    {ID: 2, inputClusters: []},
                    {ID: 3, inputClusters: []},
                ],
                softwareBuildID,
            });
        }

        it("should never read dimmingAlgorithm or auxDetectionLevel regardless of firmware", async () => {
            const readKeys = await runConfigure(createVZM32("3.05"));
            expect(readKeys).not.toContain("dimmingAlgorithm");
            expect(readKeys).not.toContain("auxDetectionLevel");
        });

        it("should still read other common attributes", async () => {
            const readKeys = await runConfigure(createVZM32("3.05"));
            expect(readKeys).toContain("switchType");
            expect(readKeys).toContain("fanControlMode");
        });
    });

    describe("VZM30-SN configure", () => {
        it("should not read dimmingAlgorithm or auxDetectionLevel", async () => {
            const device = mockDevice({
                modelID: "VZM30-SN",
                endpoints: [
                    {
                        ID: 1,
                        inputClusters: [
                            "genOnOff",
                            "genLevelCtrl",
                            "haElectricalMeasurement",
                            "seMetering",
                            "msTemperatureMeasurement",
                            "msRelativeHumidity",
                        ],
                    },
                    {ID: 2, inputClusters: []},
                    {ID: 3, inputClusters: []},
                    {ID: 4, inputClusters: []},
                ],
                softwareBuildID: "3.05",
            });
            const readKeys = await runConfigure(device);
            expect(readKeys).not.toContain("dimmingAlgorithm");
            expect(readKeys).not.toContain("auxDetectionLevel");
        });
    });
});
