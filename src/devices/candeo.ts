import assert from "node:assert";
import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as globalStore from "../lib/store";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface CandeoRotaryRemoveControl {
    attributes: never;
    commands: {
        rotaryRemoteControl: {
            field1: number;
            field2: number;
            field3: number;
            field4: number;
        };
    };
    commandResponses: never;
}

const manufacturerSpecificSwitchTypeClusterCode = 0x1224;
const manufacturerSpecificRotaryRemoteControlClusterCode = 0xff03;
const switchTypeAttribute = 0x8803;
const switchTypeDataType = 0x20;
const switchTypeValueMap: {[key: number]: string} = {
    0: "momentary",
    1: "toggle",
};
const switchTypeValueLookup: {[key: string]: number} = {
    momentary: 0,
    toggle: 1,
};
const rd1pKnobActionsMap: {[key: string]: string} = {
    commandOff: "double_pressed",
    commandOn: "pressed",
    commandToggle: "held",
    commandRelease: "released",
    commandMoveWithOnOff: "started_rotating_",
    commandStepWithOnOff: "rotating_",
    commandStop: "stopped_rotating",
};

interface CandeoOnOff {
    attributes: never;
    commands: {
        release: never;
    };
    commandResponses: never;
}

const luxScale: m.ScaleFunction = (value: number, type: "from" | "to") => {
    let result = value;
    if (type === "from") {
        result = 10 ** ((result - 1) / 10000);
        if (result > 0 && result <= 2200) {
            result = -7.969192 + 0.0151988 * result;
        } else if (result > 2200 && result <= 2500) {
            result = -1069.189434 + 0.4950663 * result;
        } else if (result > 2500) {
            result = 78029.21628 - 61.73575 * result + 0.01223567 * result ** 2;
        }
        result = result < 1 ? 1 : result;
    }
    return result;
};

const fzLocal = {
    switch_type: {
        cluster: "genBasic",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (Object.hasOwn(msg.data, switchTypeAttribute)) {
                const value = msg.data[switchTypeAttribute] as number;
                return {
                    external_switch_type: switchTypeValueMap[value] || "unknown",
                    external_switch_type_numeric: value,
                };
            }
            return undefined;
        },
    } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
    rotary_remote_control: {
        cluster: "candeoRotaryRemoteControl",
        type: ["commandRotaryRemoteControl"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const messageTypes: {[key: number]: string} = {
                1: "button_press",
                3: "ring_rotation",
            };
            const messageType = msg.data.field1;
            if (messageType in messageTypes) {
                const rotary_remote_control_actions = [];
                if (messageTypes[messageType] === "button_press") {
                    const buttonNumber = msg.data.field3;
                    const buttonAction = msg.data.field4;
                    const buttonNumbers: {[key: number]: string} = {
                        1: "button_1_",
                        2: "button_2_",
                        4: "button_3_",
                        8: "button_4_",
                        16: "centre_button_",
                    };
                    const buttonActions: {[key: number]: string} = {
                        1: "click",
                        2: "double_click",
                        3: "hold",
                        4: "release",
                    };
                    if (buttonNumber in buttonNumbers && buttonAction in buttonActions) {
                        rotary_remote_control_actions.push(buttonNumbers[buttonNumber] + buttonActions[buttonAction]);
                    }
                } else if (messageTypes[messageType] === "ring_rotation") {
                    const ringAction = msg.data.field3;
                    const ringActions: {[key: number]: string} = {
                        1: "started_",
                        2: "stopped_",
                        3: "continued_",
                    };
                    if (ringAction in ringActions) {
                        if (ringActions[ringAction] === "stopped_") {
                            const previous_direction = globalStore.getValue(msg.endpoint, "previous_direction");
                            if (previous_direction !== undefined) {
                                rotary_remote_control_actions.push(`stopped_${previous_direction}`);
                            }
                            globalStore.putValue(msg.endpoint, "previous_rotation_event", "stopped_");
                        } else {
                            const ringDirection = msg.data.field2;
                            const ringDirections: {[key: number]: string} = {
                                1: "rotating_right",
                                2: "rotating_left",
                            };
                            if (ringDirection in ringDirections) {
                                const previous_rotation_event = globalStore.getValue(msg.endpoint, "previous_rotation_event");
                                if (previous_rotation_event !== undefined) {
                                    const ringClicks = msg.data.field4;
                                    if (previous_rotation_event === "stopped_") {
                                        rotary_remote_control_actions.push(`started_${ringDirections[ringDirection]}`);
                                        globalStore.putValue(msg.endpoint, "previous_rotation_event", "started_");
                                        if (ringClicks > 1) {
                                            for (let i = 1; i < ringClicks; i++) {
                                                rotary_remote_control_actions.push(`continued_${ringDirections[ringDirection]}`);
                                            }
                                            globalStore.putValue(msg.endpoint, "previous_rotation_event", "continued_");
                                        }
                                    } else if (previous_rotation_event === "started_" || previous_rotation_event === "continued_") {
                                        rotary_remote_control_actions.push(`continued_${ringDirections[ringDirection]}`);
                                        if (ringClicks > 1) {
                                            for (let i = 1; i < ringClicks; i++) {
                                                rotary_remote_control_actions.push(`continued_${ringDirections[ringDirection]}`);
                                            }
                                        }
                                        globalStore.putValue(msg.endpoint, "previous_rotation_event", "continued_");
                                    }
                                }
                                globalStore.putValue(msg.endpoint, "previous_direction", ringDirections[ringDirection]);
                            }
                        }
                    }
                }
                for (let i = 0; i < rotary_remote_control_actions.length; i++) {
                    const payload = {action: rotary_remote_control_actions[i]};
                    utils.addActionGroup(payload, msg, model);
                    publish(payload);
                }
            }
            return;
        },
    } satisfies Fz.Converter<"candeoRotaryRemoteControl", CandeoRotaryRemoveControl, ["commandRotaryRemoteControl"]>,
    rd1p_knob_rotation: {
        cluster: "genLevelCtrl",
        type: ["commandMoveWithOnOff", "commandStepWithOnOff", "commandStop"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            let knobAction = "unknown";
            if (msg.type in rd1pKnobActionsMap) {
                knobAction = rd1pKnobActionsMap[msg.type];
                if (msg.type === "commandMoveWithOnOff") {
                    assert("movemode" in msg.data);
                    if (msg.data.movemode === 0 || msg.data.movemode === 1) {
                        knobAction += msg.data.movemode === 1 ? "left" : "right";
                    }
                } else if (msg.type === "commandStepWithOnOff") {
                    assert("stepmode" in msg.data);
                    if (msg.data.stepmode === 0 || msg.data.stepmode === 1) {
                        knobAction += msg.data.stepmode === 1 ? "left" : "right";
                    }
                }
            }
            const payload = {action: knobAction};
            utils.addActionGroup(payload, msg, model);
            return payload;
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["commandMoveWithOnOff", "commandStepWithOnOff", "commandStop"]>,
    rd1p_knob_press: {
        cluster: "genOnOff",
        type: ["commandOn", "commandOff", "commandToggle", "commandRelease"],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            let knobAction = "unknown";
            if (msg.type in rd1pKnobActionsMap) {
                knobAction = rd1pKnobActionsMap[msg.type];
            }
            const payload = {action: knobAction};
            utils.addActionGroup(payload, msg, model);
            return payload;
        },
    } satisfies Fz.Converter<"genOnOff", CandeoOnOff, ["commandOn", "commandOff", "commandToggle", "commandRelease"]>,
};

const tzLocal = {
    switch_type: {
        key: ["external_switch_type"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            const numericValue = switchTypeValueLookup[value] ?? Number.parseInt(value, 10);
            await entity.write(
                "genBasic",
                {[switchTypeAttribute]: {value: numericValue, type: switchTypeDataType}},
                {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode},
            );
            return {state: {external_switch_type: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode});
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "C205", manufacturerName: "Candeo"}],
        model: "C205",
        vendor: "Candeo",
        description: "Zigbee switch module",
        extend: [m.onOff()],
        fromZigbee: [fzLocal.switch_type],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type")],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", ["startUpOnOff"]);
            await endpoint1.write(
                "genBasic",
                {[switchTypeAttribute]: {value: switchTypeValueLookup["toggle"], type: switchTypeDataType}},
                {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode},
            );
            await endpoint1.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode});
        },
    },
    {
        zigbeeModel: ["HK-DIM-A", "Candeo Zigbee Dimmer", "HK_DIM_A"],
        fingerprint: [
            {modelID: "Dimmer-Switch-ZB3.0", manufacturerName: "Candeo"},
            {modelID: "HK_DIM_A", manufacturerName: "Shyugj"},
        ],
        model: "C202.1",
        vendor: "Candeo",
        description: "Zigbee LED smart dimmer switch",
        extend: [m.light({configureReporting: true, powerOnBehavior: false})],
    },
    {
        fingerprint: [
            {modelID: "Dimmer-Switch-ZB3.0", manufacturerID: 4098},
            {modelID: "C210", manufacturerName: "Candeo"},
            {modelID: "Dimmer-Switch-ZB3.0", manufacturerName: "Smart Dim"},
        ],
        model: "C210",
        vendor: "Candeo",
        description: "Zigbee dimming smart plug",
        extend: [m.light({configureReporting: true, levelConfig: {features: ["current_level_startup"]}, powerOnBehavior: true})],
    },
    {
        fingerprint: [{modelID: "C204", manufacturerName: "Candeo"}],
        model: "C204",
        vendor: "Candeo",
        description: "Zigbee micro smart dimmer",
        extend: [
            m.light({
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {features: ["on_off_transition_time", "on_level", "current_level_startup"]},
            }),
            m.electricityMeter({
                power: {min: 10, max: 600, change: 50},
                voltage: {min: 10, max: 600, change: 500},
                current: {min: 10, max: 600, change: 500},
                energy: {min: 10, max: 1800, change: 360000},
            }),
        ],
        fromZigbee: [fzLocal.switch_type],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type")],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", ["startUpOnOff"]);
            await endpoint1.write("genLevelCtrl", {17: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["onLevel"]);
            await endpoint1.write("genLevelCtrl", {16: {value: 0x0a, type: 0x21}});
            await endpoint1.read("genLevelCtrl", ["onOffTransitionTime"]);
            await endpoint1.write("genLevelCtrl", {16384: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["startUpCurrentLevel"]);
            await endpoint1.write(
                "genBasic",
                {[switchTypeAttribute]: {value: switchTypeValueLookup["momentary"], type: switchTypeDataType}},
                {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode},
            );
            await endpoint1.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode});
        },
    },
    {
        fingerprint: [{modelID: "C-ZB-DM204", manufacturerName: "Candeo"}],
        model: "C-ZB-DM204",
        vendor: "Candeo",
        description: "Zigbee micro smart dimmer",
        extend: [
            m.light({
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {features: ["on_off_transition_time", "on_level", "current_level_startup"]},
            }),
            m.electricityMeter({
                power: {min: 10, max: 600, change: 50},
                voltage: {min: 10, max: 600, change: 500},
                current: {min: 10, max: 600, change: 500},
                energy: {min: 10, max: 1800, change: 360000},
            }),
        ],
        fromZigbee: [fzLocal.switch_type],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type")],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", ["startUpOnOff"]);
            await endpoint1.write("genLevelCtrl", {17: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["onLevel"]);
            await endpoint1.write("genLevelCtrl", {16: {value: 0x0a, type: 0x21}});
            await endpoint1.read("genLevelCtrl", ["onOffTransitionTime"]);
            await endpoint1.write("genLevelCtrl", {16384: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["startUpCurrentLevel"]);
            await endpoint1.write(
                "genBasic",
                {[switchTypeAttribute]: {value: switchTypeValueLookup["momentary"], type: switchTypeDataType}},
                {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode},
            );
            await endpoint1.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode});
        },
    },
    {
        zigbeeModel: ["C202"],
        fingerprint: [
            {modelID: "Candeo Zigbee Dimmer", softwareBuildID: "1.04", dateCode: "20230828"},
            {modelID: "Candeo Zigbee Dimmer", softwareBuildID: "1.20", dateCode: "20240813"},
        ],
        model: "C202",
        vendor: "Candeo",
        description: "Smart rotary dimmer",
        extend: [
            m.light({
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {features: ["on_level", "current_level_startup"]},
                powerOnBehavior: true,
            }),
        ],
    },
    {
        zigbeeModel: ["C201"],
        model: "C201",
        vendor: "Candeo",
        description: "Smart dimmer module",
        extend: [
            m.light({
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
                powerOnBehavior: true,
            }),
        ],
    },
    {
        fingerprint: [
            {modelID: "C-ZB-LC20-CCT", manufacturerName: "Candeo"},
            {modelID: "C-ZB-LC20v2-CCT", manufacturerName: "Candeo"},
        ],
        model: "C-ZB-LC20-CCT",
        vendor: "Candeo",
        description: "Smart LED controller (CCT mode)",
        extend: [
            m.light({
                colorTemp: {range: [158, 500]},
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
                effect: false,
            }),
            m.identify(),
        ],
        ota: true,
    },
    {
        fingerprint: [
            {modelID: "C-ZB-LC20-Dim", manufacturerName: "Candeo"},
            {modelID: "C-ZB-LC20v2-Dim", manufacturerName: "Candeo"},
        ],
        model: "C-ZB-LC20-Dim",
        vendor: "Candeo",
        description: "Smart LED controller (dimmer mode)",
        extend: [
            m.light({
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
                effect: false,
            }),
            m.identify(),
        ],
        ota: true,
    },
    {
        fingerprint: [
            {modelID: "C-ZB-LC20-RGB", manufacturerName: "Candeo"},
            {modelID: "C-ZB-LC20v2-RGB", manufacturerName: "Candeo"},
        ],
        model: "C-ZB-LC20-RGB",
        vendor: "Candeo",
        description: "Smart LED controller (RGB mode)",
        extend: [
            m.light({
                color: {modes: ["xy", "hs"], enhancedHue: true},
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
                effect: false,
            }),
            m.identify(),
        ],
        ota: true,
    },
    {
        fingerprint: [
            {modelID: "C-ZB-LC20-RGBCCT", manufacturerName: "Candeo"},
            {modelID: "C-ZB-LC20v2-RGBCCT", manufacturerName: "Candeo"},
        ],
        model: "C-ZB-LC20-RGBCCT",
        vendor: "Candeo",
        description: "Smart LED controller (RGBCCT mode)",
        extend: [
            m.light({
                colorTemp: {range: [158, 500]},
                color: {modes: ["xy", "hs"], enhancedHue: true},
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
                effect: false,
            }),
            m.identify(),
        ],
        ota: true,
    },
    {
        fingerprint: [
            {modelID: "C-ZB-LC20-RGBW", manufacturerName: "Candeo"},
            {modelID: "C-ZB-LC20v2-RGBW", manufacturerName: "Candeo"},
        ],
        model: "C-ZB-LC20-RGBW",
        vendor: "Candeo",
        description: "Smart LED controller (RGBW mode)",
        extend: [
            m.light({
                colorTemp: {range: [158, 500]},
                color: {modes: ["xy", "hs"], enhancedHue: true},
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {
                    features: ["current_level_startup"],
                },
                powerOnBehavior: true,
                effect: false,
            }),
            m.identify(),
        ],
        ota: true,
    },
    {
        fingerprint: [{modelID: "C-ZB-SM205-2G", manufacturerName: "Candeo"}],
        model: "C-ZB-SM205-2G",
        vendor: "Candeo",
        description: "Smart 2 gang switch module",
        extend: [
            m.deviceEndpoints({
                endpoints: {l1: 1, l2: 2, e11: 11},
                multiEndpointSkip: ["power", "current", "voltage", "energy"],
            }),
            m.onOff({endpointNames: ["l1", "l2"]}),
            m.electricityMeter({
                power: {min: 10, max: 600, change: 50},
                voltage: {min: 10, max: 600, change: 500},
                current: {min: 10, max: 600, change: 500},
                energy: {min: 10, max: 1800, change: 360000},
            }),
        ],
        fromZigbee: [fzLocal.switch_type],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type").withEndpoint("e11")],
        meta: {},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", [16387]);
            await endpoint2.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint2.read("genOnOff", [16387]);
            const endpoint11 = device.getEndpoint(11);
            await endpoint1.write(
                "genBasic",
                {[switchTypeAttribute]: {value: switchTypeValueLookup["toggle"], type: switchTypeDataType}},
                {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode},
            );
            await endpoint11.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode});
        },
    },
    {
        fingerprint: [{modelID: "C-RFZB-SM1"}],
        model: "C-RFZB-SM1",
        vendor: "Candeo",
        description: "Zigbee & RF Switch Module",
        extend: [m.onOff({powerOnBehavior: true})],
    },
    {
        fingerprint: [
            {modelID: "C203", manufacturerName: "Candeo"},
            {modelID: "HK-LN-DIM-A", manufacturerName: "Candeo"},
        ],
        model: "C203",
        vendor: "Candeo",
        description: "Zigbee micro smart dimmer",
        extend: [
            m.light({
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {features: ["on_off_transition_time", "on_level", "current_level_startup"]},
            }),
        ],
        fromZigbee: [fzLocal.switch_type],
        toZigbee: [tzLocal.switch_type],
        exposes: [e.enum("external_switch_type", ea.ALL, ["momentary", "toggle"]).withLabel("External switch type")],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write("genOnOff", {16387: {value: 0xff, type: 0x30}});
            await endpoint1.read("genOnOff", ["startUpOnOff"]);
            await endpoint1.write("genLevelCtrl", {17: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["onLevel"]);
            await endpoint1.write("genLevelCtrl", {16: {value: 0x0a, type: 0x21}});
            await endpoint1.read("genLevelCtrl", ["onOffTransitionTime"]);
            await endpoint1.write("genLevelCtrl", {16384: {value: 0xff, type: 0x20}});
            await endpoint1.read("genLevelCtrl", ["startUpCurrentLevel"]);
            await endpoint1.write(
                "genBasic",
                {[switchTypeAttribute]: {value: switchTypeValueLookup["momentary"], type: switchTypeDataType}},
                {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode},
            );
            await endpoint1.read("genBasic", [switchTypeAttribute], {manufacturerCode: manufacturerSpecificSwitchTypeClusterCode});
        },
    },
    {
        fingerprint: [{modelID: "C-ZB-SEWA", manufacturerName: "Candeo"}],
        model: "C-ZB-SEWA",
        vendor: "Candeo",
        description: "Water sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1"]})],
    },
    {
        fingerprint: [{modelID: "C-ZB-SETE", manufacturerName: "Candeo"}],
        model: "C-ZB-SETE",
        vendor: "Candeo",
        description: "Temperature & humidity sensor",
        extend: [m.temperature(), m.humidity(), m.battery()],
    },
    {
        fingerprint: [{modelID: "C-ZB-SEDC", manufacturerName: "Candeo"}],
        model: "C-ZB-SEDC",
        vendor: "Candeo",
        description: "Door contact sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1"]})],
    },
    {
        fingerprint: [{modelID: "C-ZB-SEMO", manufacturerName: "Candeo"}],
        model: "C-ZB-SEMO",
        vendor: "Candeo",
        description: "Motion sensor",
        extend: [
            m.battery(),
            m.illuminance({reporting: null, scale: luxScale}),
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1"]}),
            tuya.modernExtend.tuyaBase({dp: true}),
        ],
        exposes: [
            e
                .enum("sensitivity", ea.STATE_SET, ["low", "medium", "high"])
                .withDescription("PIR sensor sensitivity (refresh and update only while active)"),
            e
                .enum("keep_time", ea.STATE_SET, ["10", "30", "60", "120"])
                .withDescription("PIR keep time in seconds (refresh and update only while active)"),
            e
                .numeric("illuminance_interval", ea.STATE_SET)
                .withValueMin(1)
                .withValueMax(720)
                .withValueStep(1)
                .withUnit("minutes")
                .withDescription("Brightness acquisition interval (refresh and update only while active)"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    9,
                    "sensitivity",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        medium: tuya.enum(1),
                        high: tuya.enum(2),
                    }),
                ],
                [
                    10,
                    "keep_time",
                    tuya.valueConverterBasic.lookup({
                        "10": tuya.enum(0),
                        "30": tuya.enum(1),
                        "60": tuya.enum(2),
                        "120": tuya.enum(3),
                    }),
                ],
                [102, "illuminance_interval", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [{modelID: "C-ZB-DM201-2G"}],
        model: "C-ZB-DM201-2G",
        vendor: "Candeo",
        description: "Zigbee 2 gang dimmer module",
        extend: [
            m.deviceEndpoints({
                endpoints: {l1: 1, l2: 2},
            }),
            m.light({
                endpointNames: ["l1", "l2"],
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                levelConfig: {features: ["on_level", "current_level_startup"]},
                powerOnBehavior: true,
                effect: false,
            }),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-SR5BR", manufacturerName: "Candeo"}],
        model: "C-ZB-SR5BR",
        vendor: "Candeo",
        description: "Zigbee scene switch remote - 5 button rotary",
        extend: [
            m.battery(),
            m.deviceAddCustomCluster("candeoRotaryRemoteControl", {
                ID: manufacturerSpecificRotaryRemoteControlClusterCode,
                attributes: {},
                commands: {
                    rotaryRemoteControl: {
                        ID: 0x01,
                        parameters: [
                            {name: "field1", type: Zcl.DataType.UINT8, max: 0xff},
                            {name: "field2", type: Zcl.DataType.UINT8, max: 0xff},
                            {name: "field3", type: Zcl.DataType.UINT8, max: 0xff},
                            {name: "field4", type: Zcl.DataType.UINT8, max: 0xff},
                        ],
                    },
                },
                commandsResponse: {},
            }),
        ],
        fromZigbee: [fzLocal.rotary_remote_control],
        exposes: [
            e.action([
                "button_1_click",
                "button_1_double_click",
                "button_1_hold",
                "button_1_release",
                "button_2_click",
                "button_2_double_click",
                "button_2_hold",
                "button_2_release",
                "button_3_click",
                "button_3_double_click",
                "button_3_hold",
                "button_3_release",
                "button_4_click",
                "button_4_double_click",
                "button_4_hold",
                "button_4_release",
                "centre_button_click",
                "centre_button_double_click",
                "centre_button_hold",
                "centre_button_release",
                "started_rotating_left",
                "continued_rotating_left",
                "stopped_rotating_left",
                "started_rotating_right",
                "continued_rotating_right",
                "stopped_rotating_right",
            ]),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.bind(manufacturerSpecificRotaryRemoteControlClusterCode, coordinatorEndpoint);
        },
    },
    {
        fingerprint: [{modelID: "C-ZB-RD1", manufacturerName: "Candeo"}],
        model: "C-ZB-RD1",
        vendor: "Candeo",
        description: "Zigbee rotary dimmer",
        extend: [
            m.light({
                levelConfig: {features: ["on_level", "current_level_startup", "on_transition_time", "off_transition_time"]},
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                powerOnBehavior: true,
                effect: false,
            }),
            m.electricityMeter({
                power: {min: 5, max: 300, change: 10},
                voltage: {min: 5, max: 600, change: 500},
                current: {min: 5, max: 900, change: 10},
                energy: {min: 5, max: 1800, change: 50},
            }),
        ],
        meta: {},
    },
    {
        fingerprint: [{modelID: "C-ZB-RD1P-DIM", manufacturerName: "Candeo"}],
        model: "C-ZB-RD1P-DIM",
        vendor: "Candeo",
        description: "Zigbee rotary dimmer pro (dimmer mode)",
        extend: [
            m.light({
                levelConfig: {features: ["on_level", "current_level_startup", "on_transition_time", "off_transition_time"]},
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                powerOnBehavior: true,
                effect: false,
            }),
            m.electricityMeter({
                power: {min: 5, max: 300, change: 10},
                voltage: {min: 5, max: 600, change: 500},
                current: {min: 5, max: 900, change: 10},
                energy: {min: 5, max: 1800, change: 50},
            }),
            m.deviceAddCustomCluster("genOnOff", {
                ID: 6,
                attributes: {},
                commands: {
                    release: {
                        ID: 0x03,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
        ],
    },
    {
        fingerprint: [{modelID: "C-ZB-RD1P-DPM", manufacturerName: "Candeo"}],
        model: "C-ZB-RD1P-DPM",
        vendor: "Candeo",
        description: "Zigbee rotary dimmer pro (dual purpose mode)",
        extend: [
            m.deviceEndpoints({
                endpoints: {l1: 1, l2: 2},
                multiEndpointSkip: ["power", "current", "voltage", "energy"],
            }),
            m.light({
                levelConfig: {features: ["on_level", "current_level_startup", "on_transition_time", "off_transition_time"]},
                configureReporting: true,
                levelReportingConfig: {min: 1, max: 3600, change: 1},
                powerOnBehavior: true,
                effect: false,
            }),
            m.electricityMeter({
                power: {min: 5, max: 300, change: 10},
                voltage: {min: 5, max: 600, change: 500},
                current: {min: 5, max: 900, change: 10},
                energy: {min: 5, max: 1800, change: 50},
            }),
            m.deviceAddCustomCluster("genOnOff", {
                ID: 6,
                attributes: {},
                commands: {
                    release: {
                        ID: 0x03,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
        ],
        fromZigbee: [fzLocal.rd1p_knob_rotation, fzLocal.rd1p_knob_press],
        toZigbee: [],
        exposes: [
            e
                .action([
                    "pressed",
                    "double_pressed",
                    "held",
                    "released",
                    "started_rotating_left",
                    "started_rotating_right",
                    "rotating_right",
                    "rotating_left",
                    "stopped_rotating",
                ])
                .withEndpoint("l2"),
        ],
        meta: {},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint2 = device.getEndpoint(2);
            await endpoint2.bind("genOnOff", coordinatorEndpoint);
            await endpoint2.bind("genLevelCtrl", coordinatorEndpoint);
        },
    },
    {
        fingerprint: [{modelID: "C-ZB-RD1P-REM", manufacturerName: "Candeo"}],
        model: "C-ZB-RD1P-REM",
        vendor: "Candeo",
        description: "Zigbee rotary dimmer pro (remote mode)",
        extend: [
            m.deviceEndpoints({
                endpoints: {l1: 1, l2: 2},
                multiEndpointSkip: ["power", "current", "voltage", "energy"],
            }),
            m.electricityMeter({
                power: {min: 5, max: 300, change: 10},
                voltage: {min: 5, max: 600, change: 500},
                current: {min: 5, max: 900, change: 10},
                energy: {min: 5, max: 1800, change: 50},
            }),
        ],
        fromZigbee: [fzLocal.rd1p_knob_rotation, fzLocal.rd1p_knob_press],
        toZigbee: [],
        exposes: [
            e
                .action([
                    "pressed",
                    "double_pressed",
                    "held",
                    "released",
                    "started_rotating_left",
                    "started_rotating_right",
                    "rotating_right",
                    "rotating_left",
                    "stopped_rotating",
                ])
                .withEndpoint("l2"),
        ],
        meta: {},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint2 = device.getEndpoint(2);
            await endpoint2.bind("genOnOff", coordinatorEndpoint);
            await endpoint2.bind("genLevelCtrl", coordinatorEndpoint);
        },
    },
];
