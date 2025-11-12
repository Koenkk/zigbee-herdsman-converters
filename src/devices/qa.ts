import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0726", ["_TZ3000_wopf2sox"]),
        model: "QAT42Z1",
        vendor: "QA",
        description: "1 channel scene switch",
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1"], powerOnBehavior2: true, backlightModeOffOn: true}),
            m.actionEnumLookup<"genOnOff", undefined, ["commandTuyaAction"]>({
                cluster: "genOnOff",
                commands: ["commandTuyaAction"],
                attribute: "value",
                actionLookup: {button: 0},
                buttonLookup: {
                    "1_up": 4,
                    "1_down": 1,
                    "2_up": 5,
                    "2_down": 2,
                    "3_up": 6,
                    "3_down": 3,
                },
            }),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0726", ["_TZ3000_ssup6h68"]),
        model: "QAT42Z2",
        vendor: "QA",
        description: "2 channel scene switch",
        meta: {multiEndpoint: true},
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2"], powerOnBehavior2: true, backlightModeOffOn: true}),
            m.actionEnumLookup<"genOnOff", undefined, ["commandTuyaAction"]>({
                cluster: "genOnOff",
                commands: ["commandTuyaAction"],
                attribute: "value",
                actionLookup: {button: 0},
                buttonLookup: {
                    "1_up": 4,
                    "1_down": 1,
                    "2_up": 5,
                    "2_down": 2,
                    "3_up": 6,
                    "3_down": 3,
                },
            }),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0726", ["_TZ3000_kt6xxa4o"]),
        model: "QAT42Z3",
        vendor: "QA",
        description: "3 channel scene switch",
        meta: {multiEndpoint: true},
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2", "l3"], powerOnBehavior2: true, backlightModeOffOn: true}),
            m.actionEnumLookup<"genOnOff", undefined, ["commandTuyaAction"]>({
                cluster: "genOnOff",
                commands: ["commandTuyaAction"],
                attribute: "value",
                actionLookup: {button: 0},
                buttonLookup: {
                    "1_up": 4,
                    "1_down": 1,
                    "2_up": 5,
                    "2_down": 2,
                    "3_up": 6,
                    "3_down": 3,
                },
            }),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS000F", ["_TZ3210_a2erlvb8"]),
        model: "QARZ1DC",
        vendor: "QA",
        description: "1 channel switch",
        extend: [tuya.modernExtend.tuyaMagicPacket(), m.deviceEndpoints({endpoints: {l1: 1}}), tuya.modernExtend.tuyaOnOff({endpoints: ["l1"]})],
    },
    {
        fingerprint: tuya.fingerprint("TS0001", ["_TZ3000_gtdswg8k", "_TZ3000_qh6qjuan"]),
        model: "QARZDC1LR",
        vendor: "QA",
        description: "1 channel long range switch",
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1"], switchType: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0002", ["_TZ3000_rfjctviq", "_TZ3210_pdnwpnz5", "_TZ3210_a2erlvb8", "_TZ3000_yxmafzmd"]),
        model: "QARZ2LR",
        vendor: "QA",
        description: "2 channel long range switch",
        meta: {multiEndpoint: true},
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2"], switchType: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0003", ["_TZ3000_zeuulson", "_TZ33000_d9yfgzur"]),
        model: "QARZ3LR",
        vendor: "QA",
        description: "3 channel long range switch",
        meta: {multiEndpoint: true},
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2", "l3"], switchType: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0004", ["_TZ3000_wwtnshol"]),
        model: "QARZ4LR",
        vendor: "QA",
        description: "4 channel long range switch",
        meta: {multiEndpoint: true},
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2", "l3", "l4"], switchType: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0001", ["_TZ3000_dov0a3p1"]),
        model: "QAT42Z1H",
        vendor: "QA",
        description: "1 channel wall switch",
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1"], backlightModeOffOn: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0002", ["_TZ3000_gkesadus"]),
        model: "QAT42Z2H",
        vendor: "QA",
        description: "2 channel wall switch",
        meta: {multiEndpoint: true},
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2"], backlightModeOffOn: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0003", ["_TZ3000_pmsxmttq", "_TZ3000_0q5fjqgw"]),
        model: "QAT42Z3H",
        vendor: "QA",
        description: "3 channel wall switch",
        meta: {multiEndpoint: true},
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["left", "center", "right"], backlightModeOffOn: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_kyzjsjo3"]),
        model: "QAT44Z4H",
        vendor: "QA",
        description: "4 channel wall switch",
        exposes: [
            e.switch().withEndpoint("l1").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l2").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l3").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l4").setAccess("state", ea.STATE_SET),
        ],
        fromZigbee: [legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_4cl0dzt4"]),
        model: "QAT44Z6H",
        vendor: "QA",
        description: "6 channel wall switch",
        exposes: [
            e.switch().withEndpoint("l1").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l2").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l3").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l4").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l5").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l6").setAccess("state", ea.STATE_SET),
        ],
        fromZigbee: [legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ["genOnOff"]);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_ms97nkyy"]),
        model: "QAT44Z6",
        vendor: "QA",
        description: "6 channel scene switch",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.switch().withEndpoint("l4"),
            e.switch().withEndpoint("l5"),
            e.switch().withEndpoint("l6"),
            e.numeric("action_1", ea.STATE).withDescription("Scene 1"),
            e.numeric("action_2", ea.STATE).withDescription("Scene 2"),
            e.numeric("action_3", ea.STATE).withDescription("Scene 3"),
            e.numeric("action_4", ea.STATE).withDescription("Scene 4"),
            e.numeric("action_5", ea.STATE).withDescription("Scene 5"),
            e.numeric("action_6", ea.STATE).withDescription("Scene 6"),
            // Backlight brightness control (0-99%)
            e
                .numeric("backlight_brightness", ea.ALL)
                .withValueMin(0)
                .withValueMax(99)
                .withDescription("Backlight brightness (0-99)")
                .withUnit("%"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [24, "state_l1", tuya.valueConverter.onOff],
                [25, "state_l2", tuya.valueConverter.onOff],
                [26, "state_l3", tuya.valueConverter.onOff],
                [27, "state_l4", tuya.valueConverter.onOff],
                [28, "state_l5", tuya.valueConverter.onOff],
                [29, "state_l6", tuya.valueConverter.onOff],
                [7, "action_1", tuya.valueConverter.raw],
                [8, "action_2", tuya.valueConverter.raw],
                [9, "action_3", tuya.valueConverter.raw],
                [10, "action_4", tuya.valueConverter.raw],
                [11, "action_5", tuya.valueConverter.raw],
                [12, "action_6", tuya.valueConverter.raw],
                // Backlight brightness datapoint
                [101, "backlight_brightness", tuya.valueConverter.raw],
            ],
        },
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1, l5: 1, l6: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint("TS110E", ["_TZ3210_hzdhb62z", "_TZ3210_v5yquxma"]),
        model: "QADZ1",
        vendor: "QA",
        description: "Dimmer 1 channel",
        extend: [m.light({powerOnBehavior: false, configureReporting: true, effect: false}), tuya.modernExtend.tuyaMagicPacket()],
        fromZigbee: [tuya.fz.power_on_behavior_1, fz.TS110E_switch_type, fz.TS110E, fz.on_off],
        toZigbee: [tz.TS110E_light_onoff_brightness, tuya.tz.power_on_behavior_1, tz.TS110E_options],
        exposes: [e.power_on_behavior(), tuya.exposes.switchType()],
    },
    {
        fingerprint: tuya.fingerprint("TS110E", ["_TZ3210_tkkb1ym8"]),
        model: "QADZ2",
        vendor: "QA",
        description: "Dimmer 2 channel",
        meta: {multiEndpoint: true},
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.light({endpointNames: ["l1", "l2"], powerOnBehavior: false, configureReporting: true, effect: false}),
        ],
        fromZigbee: [tuya.fz.power_on_behavior_1, fz.TS110E_switch_type, fz.TS110E, fz.on_off],
        toZigbee: [tz.TS110E_light_onoff_brightness, tuya.tz.power_on_behavior_1, tz.TS110E_options],
        exposes: [e.power_on_behavior(), tuya.exposes.switchType()],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_nthhgkd6"]),
        model: "QADZ4DIN",
        vendor: "QA",
        description: "4 channel dimmer module",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            tuya.exposes.lightBrightness().withMinBrightness().withEndpoint("l1"),
            tuya.exposes.lightBrightness().withMinBrightness().withEndpoint("l2"),
            tuya.exposes.lightBrightness().withMinBrightness().withEndpoint("l3"),
            tuya.exposes.lightBrightness().withMinBrightness().withEndpoint("l4"),
            tuya.exposes.switchType(),
            e.enum("power_on_behavior", ea.STATE_SET, ["off", "on", "previous"]),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, "brightness_l1", tuya.valueConverter.scale0_254to0_1000],
                [3, "min_brightness_l1", tuya.valueConverter.scale0_254to0_1000],
                [7, "state_l2", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [8, "brightness_l2", tuya.valueConverter.scale0_254to0_1000],
                [9, "min_brightness_l2", tuya.valueConverter.scale0_254to0_1000],
                [14, "power_on_behavior", tuya.valueConverter.powerOnBehaviorEnum],
                [15, "state_l3", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [16, "brightness_l3", tuya.valueConverter.scale0_254to0_1000],
                [17, "min_brightness_l3", tuya.valueConverter.scale0_254to0_1000],
                [101, "state_l4", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [102, "brightness_l4", tuya.valueConverter.scale0_254to0_1000],
                [103, "min_brightness_l4", tuya.valueConverter.scale0_254to0_1000],
                [106, "switch_type", tuya.valueConverter.switchType],
            ],
        },
    },
];
