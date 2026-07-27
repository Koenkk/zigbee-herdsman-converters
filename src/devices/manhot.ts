import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_7qc2wlqr"]),
        model: "BL82-TYZ1",
        vendor: "Manhot",
        description: "Cover motor LPD",
        extend: [tuya.modernExtend.tuyaBase({dp: true, respondToMcuVersionResponse: true})],
        exposes: [
            e.battery(),
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.enum("motor_direction", ea.STATE_SET, ["normal", "reversed"]).withDescription("Motor Steering"),
            e.binary("auto_power", ea.STATE_SET, "ON", "OFF").withDescription("Manual pull, automatic run"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "state",
                    tuya.valueConverterBasic.lookup({
                        OPEN: tuya.enum(0),
                        STOP: tuya.enum(1),
                        CLOSE: tuya.enum(2),
                    }),
                ],
                [2, "position", tuya.valueConverter.coverPosition],
                [3, "position", tuya.valueConverter.raw],
                [
                    5,
                    "motor_direction",
                    tuya.valueConverterBasic.lookup({
                        normal: tuya.enum(0),
                        reversed: tuya.enum(1),
                    }),
                ],
                [13, "battery", tuya.valueConverter.raw],
                [6, "auto_power", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_ncc7uahd"]),
        model: "MH03-1Z-OLED",
        vendor: "Manhot",
        description: "OLED Screen Switch 1 Gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true, respondToMcuVersionResponse: true})],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.numeric("countdown_1", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 1"),

            e.binary("child_lock", ea.STATE_SET, "ON", "OFF").withDescription("Child lock"),
            e.binary("backlight_switch", ea.STATE_SET, "ON", "OFF").withDescription("Backlight switch"),
            e.numeric("backlight_lightness", ea.STATE_SET).withValueMin(1).withValueMax(100).withDescription("Backlight brightness %"),
            e.numeric("displayoff_delay", ea.STATE_SET).withValueMin(10).withValueMax(180).withUnit("s").withDescription("Screen off delay"),
            e.enum("relay_status", ea.STATE_SET, ["off", "on", "memory"]).withDescription("Power-on state"),
            e.enum("light_mode", ea.STATE_SET, ["none", "relay", "pos"]).withDescription("Indicator light state"),
            e
                .enum("on_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-on color"),
            e
                .enum("off_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-off color"),

            e.text("sw1_name", ea.STATE_SET).withDescription("Set switch 1 name"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [7, "countdown_1", tuya.valueConverter.raw],

                [14, "relay_status", tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1), memory: tuya.enum(2)})],
                [15, "light_mode", tuya.valueConverterBasic.lookup({none: tuya.enum(0), relay: tuya.enum(1), pos: tuya.enum(2)})],
                [16, "backlight_switch", tuya.valueConverter.onOff],
                [101, "backlight_lightness", tuya.valueConverter.raw],
                [
                    102,
                    "on_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [
                    103,
                    "off_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [104, "displayoff_delay", tuya.valueConverter.raw],
                [105, "child_lock", tuya.valueConverter.onOff],

                [106, "sw1_name", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_dnhhp8ew"]),
        model: "MH03-2Z-OLED",
        vendor: "Manhot",
        description: "OLED Screen Switch 2 Gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true, respondToMcuVersionResponse: true})],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.numeric("countdown_1", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 1"),
            e.numeric("countdown_2", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 2"),

            e.binary("child_lock", ea.STATE_SET, "ON", "OFF").withDescription("Child lock"),
            e.binary("backlight_switch", ea.STATE_SET, "ON", "OFF").withDescription("Backlight switch"),
            e.numeric("backlight_lightness", ea.STATE_SET).withValueMin(1).withValueMax(100).withDescription("Backlight brightness %"),
            e.numeric("displayoff_delay", ea.STATE_SET).withValueMin(10).withValueMax(180).withUnit("s").withDescription("Screen off delay"),
            e.enum("relay_status", ea.STATE_SET, ["off", "on", "memory"]).withDescription("Power-on state"),
            e.enum("light_mode", ea.STATE_SET, ["none", "relay", "pos"]).withDescription("Indicator light state"),
            e
                .enum("on_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-on color"),
            e
                .enum("off_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-off color"),

            e.text("sw1_name", ea.STATE_SET).withDescription("Set switch 1 name"),
            e.text("sw2_name", ea.STATE_SET).withDescription("Set switch 2 name"),
            e.enum("press_on_fun", ea.STATE_SET, ["disable", "press_switch_1", "press_switch_2"]).withDescription("Long press all on channel"),
            e.enum("press_off_fun", ea.STATE_SET, ["disable", "press_switch_1", "press_switch_2"]).withDescription("Long press all off channel"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [7, "countdown_1", tuya.valueConverter.raw],
                [8, "countdown_2", tuya.valueConverter.raw],

                [14, "relay_status", tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1), memory: tuya.enum(2)})],
                [15, "light_mode", tuya.valueConverterBasic.lookup({none: tuya.enum(0), relay: tuya.enum(1), pos: tuya.enum(2)})],
                [16, "backlight_switch", tuya.valueConverter.onOff],
                [101, "backlight_lightness", tuya.valueConverter.raw],
                [
                    102,
                    "on_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [
                    103,
                    "off_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [104, "displayoff_delay", tuya.valueConverter.raw],
                [105, "child_lock", tuya.valueConverter.onOff],

                [106, "sw1_name", tuya.valueConverter.raw],
                [107, "sw2_name", tuya.valueConverter.raw],
                [
                    118,
                    "press_on_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                    }),
                ],
                [
                    119,
                    "press_off_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_59dz7ioi"]),
        model: "MH03-3Z-OLED",
        vendor: "Manhot",
        description: "OLED Screen Switch 3 Gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true, respondToMcuVersionResponse: true})],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),

            e.numeric("countdown_1", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 1"),
            e.numeric("countdown_2", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 2"),
            e.numeric("countdown_3", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 3"),

            e.binary("child_lock", ea.STATE_SET, "ON", "OFF").withDescription("Child lock"),
            e.binary("backlight_switch", ea.STATE_SET, "ON", "OFF").withDescription("Backlight switch"),
            e.numeric("backlight_lightness", ea.STATE_SET).withValueMin(1).withValueMax(100).withDescription("Backlight brightness %"),
            e.numeric("displayoff_delay", ea.STATE_SET).withValueMin(10).withValueMax(180).withUnit("s").withDescription("Screen off delay"),
            e.enum("relay_status", ea.STATE_SET, ["off", "on", "memory"]).withDescription("Power-on state"),
            e.enum("light_mode", ea.STATE_SET, ["none", "relay", "pos"]).withDescription("Indicator light state"),
            e
                .enum("on_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-on color"),
            e
                .enum("off_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-off color"),

            e.text("sw1_name", ea.STATE_SET).withDescription("Set switch 1 name"),
            e.text("sw2_name", ea.STATE_SET).withDescription("Set switch 2 name"),
            e.text("sw3_name", ea.STATE_SET).withDescription("Set switch 3 name"),
            e
                .enum("press_on_fun", ea.STATE_SET, ["disable", "press_switch_1", "press_switch_2", "press_switch_3"])
                .withDescription("Long press all on channel"),
            e
                .enum("press_off_fun", ea.STATE_SET, ["disable", "press_switch_1", "press_switch_2", "press_switch_3"])
                .withDescription("Long press all off channel"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [3, "state_l3", tuya.valueConverter.onOff],

                [7, "countdown_1", tuya.valueConverter.raw],
                [8, "countdown_2", tuya.valueConverter.raw],
                [9, "countdown_3", tuya.valueConverter.raw],

                [14, "relay_status", tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1), memory: tuya.enum(2)})],
                [15, "light_mode", tuya.valueConverterBasic.lookup({none: tuya.enum(0), relay: tuya.enum(1), pos: tuya.enum(2)})],
                [16, "backlight_switch", tuya.valueConverter.onOff],
                [101, "backlight_lightness", tuya.valueConverter.raw],
                [
                    102,
                    "on_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [
                    103,
                    "off_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [104, "displayoff_delay", tuya.valueConverter.raw],
                [105, "child_lock", tuya.valueConverter.onOff],

                [106, "sw1_name", tuya.valueConverter.raw],
                [107, "sw2_name", tuya.valueConverter.raw],
                [108, "sw3_name", tuya.valueConverter.raw],
                [
                    118,
                    "press_on_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                        press_switch_3: tuya.enum(3),
                    }),
                ],
                [
                    119,
                    "press_off_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                        press_switch_3: tuya.enum(3),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_esnu2jxv"]),
        model: "MH03-4Z-OLED",
        vendor: "Manhot",
        description: "OLED Screen Switch 4 Gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true, respondToMcuVersionResponse: true})],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.switch().withEndpoint("l4"),

            e.numeric("countdown_1", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 1"),
            e.numeric("countdown_2", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 2"),
            e.numeric("countdown_3", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 3"),
            e.numeric("countdown_4", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 4"),

            e.binary("child_lock", ea.STATE_SET, "ON", "OFF").withDescription("Child lock"),
            e.binary("backlight_switch", ea.STATE_SET, "ON", "OFF").withDescription("Backlight switch"),
            e.numeric("backlight_lightness", ea.STATE_SET).withValueMin(1).withValueMax(100).withDescription("Backlight brightness %"),
            e.numeric("displayoff_delay", ea.STATE_SET).withValueMin(10).withValueMax(180).withUnit("s").withDescription("Screen off delay"),
            e.enum("relay_status", ea.STATE_SET, ["off", "on", "memory"]).withDescription("Power-on state"),
            e.enum("light_mode", ea.STATE_SET, ["none", "relay", "pos"]).withDescription("Indicator light state"),
            e
                .enum("on_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-on color"),
            e
                .enum("off_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-off color"),

            e.text("sw1_name", ea.STATE_SET).withDescription("Set switch 1 name"),
            e.text("sw2_name", ea.STATE_SET).withDescription("Set switch 2 name"),
            e.text("sw3_name", ea.STATE_SET).withDescription("Set switch 3 name"),
            e.text("sw4_name", ea.STATE_SET).withDescription("Set switch 4 name"),
            e
                .enum("press_on_fun", ea.STATE_SET, ["disable", "press_switch_1", "press_switch_2", "press_switch_3", "press_switch_4"])
                .withDescription("Long press all on channel"),
            e
                .enum("press_off_fun", ea.STATE_SET, ["disable", "press_switch_1", "press_switch_2", "press_switch_3", "press_switch_4"])
                .withDescription("Long press all off channel"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [3, "state_l3", tuya.valueConverter.onOff],
                [4, "state_l4", tuya.valueConverter.onOff],

                [7, "countdown_1", tuya.valueConverter.raw],
                [8, "countdown_2", tuya.valueConverter.raw],
                [9, "countdown_3", tuya.valueConverter.raw],
                [10, "countdown_4", tuya.valueConverter.raw],

                [14, "relay_status", tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1), memory: tuya.enum(2)})],
                [15, "light_mode", tuya.valueConverterBasic.lookup({none: tuya.enum(0), relay: tuya.enum(1), pos: tuya.enum(2)})],
                [16, "backlight_switch", tuya.valueConverter.onOff],
                [101, "backlight_lightness", tuya.valueConverter.raw],
                [
                    102,
                    "on_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [
                    103,
                    "off_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [104, "displayoff_delay", tuya.valueConverter.raw],
                [105, "child_lock", tuya.valueConverter.onOff],

                [106, "sw1_name", tuya.valueConverter.raw],
                [107, "sw2_name", tuya.valueConverter.raw],
                [108, "sw3_name", tuya.valueConverter.raw],
                [109, "sw4_name", tuya.valueConverter.raw],
                [
                    118,
                    "press_on_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                        press_switch_3: tuya.enum(3),
                        press_switch_4: tuya.enum(4),
                    }),
                ],
                [
                    119,
                    "press_off_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                        press_switch_3: tuya.enum(3),
                        press_switch_4: tuya.enum(4),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_zykra2yj"]),
        model: "MH03-6Z-OLED",
        vendor: "Manhot",
        description: "OLED Screen Switch 6 Gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true, respondToMcuVersionResponse: true})],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.switch().withEndpoint("l4"),
            e.switch().withEndpoint("l5"),
            e.switch().withEndpoint("l6"),

            e.numeric("countdown_1", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 1"),
            e.numeric("countdown_2", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 2"),
            e.numeric("countdown_3", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 3"),
            e.numeric("countdown_4", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 4"),
            e.numeric("countdown_5", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 5"),
            e.numeric("countdown_6", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 6"),

            e.binary("child_lock", ea.STATE_SET, "ON", "OFF").withDescription("Child lock"),
            e.binary("backlight_switch", ea.STATE_SET, "ON", "OFF").withDescription("Backlight switch"),
            e.numeric("backlight_lightness", ea.STATE_SET).withValueMin(1).withValueMax(100).withDescription("Backlight brightness %"),
            e.numeric("displayoff_delay", ea.STATE_SET).withValueMin(10).withValueMax(180).withUnit("s").withDescription("Screen off delay"),
            e.enum("relay_status", ea.STATE_SET, ["off", "on", "memory"]).withDescription("Power-on state"),
            e.enum("light_mode", ea.STATE_SET, ["none", "relay", "pos"]).withDescription("Indicator light state"),
            e
                .enum("on_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-on color"),
            e
                .enum("off_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-off color"),

            e.text("sw1_name", ea.STATE_SET).withDescription("Set switch 1 name"),
            e.text("sw2_name", ea.STATE_SET).withDescription("Set switch 2 name"),
            e.text("sw3_name", ea.STATE_SET).withDescription("Set switch 3 name"),
            e.text("sw4_name", ea.STATE_SET).withDescription("Set switch 4 name"),
            e.text("sw5_name", ea.STATE_SET).withDescription("Set switch 5 name"),
            e.text("sw6_name", ea.STATE_SET).withDescription("Set switch 6 name"),
            e
                .enum("press_on_fun", ea.STATE_SET, [
                    "disable",
                    "press_switch_1",
                    "press_switch_2",
                    "press_switch_3",
                    "press_switch_4",
                    "press_switch_5",
                    "press_switch_6",
                ])
                .withDescription("Long press all on channel"),
            e
                .enum("press_off_fun", ea.STATE_SET, [
                    "disable",
                    "press_switch_1",
                    "press_switch_2",
                    "press_switch_3",
                    "press_switch_4",
                    "press_switch_5",
                    "press_switch_6",
                ])
                .withDescription("Long press all off channel"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [3, "state_l3", tuya.valueConverter.onOff],
                [4, "state_l4", tuya.valueConverter.onOff],
                [5, "state_l5", tuya.valueConverter.onOff],
                [6, "state_l6", tuya.valueConverter.onOff],

                [7, "countdown_1", tuya.valueConverter.raw],
                [8, "countdown_2", tuya.valueConverter.raw],
                [9, "countdown_3", tuya.valueConverter.raw],
                [10, "countdown_4", tuya.valueConverter.raw],
                [11, "countdown_5", tuya.valueConverter.raw],
                [12, "countdown_6", tuya.valueConverter.raw],

                [14, "relay_status", tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1), memory: tuya.enum(2)})],
                [15, "light_mode", tuya.valueConverterBasic.lookup({none: tuya.enum(0), relay: tuya.enum(1), pos: tuya.enum(2)})],
                [16, "backlight_switch", tuya.valueConverter.onOff],
                [101, "backlight_lightness", tuya.valueConverter.raw],
                [
                    102,
                    "on_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [
                    103,
                    "off_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [104, "displayoff_delay", tuya.valueConverter.raw],
                [105, "child_lock", tuya.valueConverter.onOff],

                [106, "sw1_name", tuya.valueConverter.raw],
                [107, "sw2_name", tuya.valueConverter.raw],
                [108, "sw3_name", tuya.valueConverter.raw],
                [109, "sw4_name", tuya.valueConverter.raw],
                [110, "sw5_name", tuya.valueConverter.raw],
                [111, "sw6_name", tuya.valueConverter.raw],
                [
                    118,
                    "press_on_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                        press_switch_3: tuya.enum(3),
                        press_switch_4: tuya.enum(4),
                        press_switch_5: tuya.enum(5),
                        press_switch_6: tuya.enum(6),
                    }),
                ],
                [
                    119,
                    "press_off_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                        press_switch_3: tuya.enum(3),
                        press_switch_4: tuya.enum(4),
                        press_switch_5: tuya.enum(5),
                        press_switch_6: tuya.enum(6),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_hwv3by9k"]),
        model: "MH03-8Z-OLED",
        vendor: "Manhot",
        description: "OLED Screen Switch 8 Gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true, respondToMcuVersionResponse: true})],
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.switch().withEndpoint("l4"),
            e.switch().withEndpoint("l5"),
            e.switch().withEndpoint("l6"),
            e.switch().withEndpoint("l7"),
            e.switch().withEndpoint("l8"),

            e.numeric("countdown_1", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 1"),
            e.numeric("countdown_2", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 2"),
            e.numeric("countdown_3", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 3"),
            e.numeric("countdown_4", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 4"),
            e.numeric("countdown_5", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 5"),
            e.numeric("countdown_6", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 6"),
            e.numeric("countdown_7", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 7"),
            e.numeric("countdown_8", ea.STATE_SET).withValueMin(0).withValueMax(43200).withUnit("s").withDescription("Timer for switch 8"),

            e.binary("child_lock", ea.STATE_SET, "ON", "OFF").withDescription("Child lock"),
            e.binary("backlight_switch", ea.STATE_SET, "ON", "OFF").withDescription("Backlight switch"),
            e.numeric("backlight_lightness", ea.STATE_SET).withValueMin(1).withValueMax(100).withDescription("Backlight brightness %"),
            e.numeric("displayoff_delay", ea.STATE_SET).withValueMin(10).withValueMax(180).withUnit("s").withDescription("Screen off delay"),
            e.enum("relay_status", ea.STATE_SET, ["off", "on", "memory"]).withDescription("Power-on state"),
            e.enum("light_mode", ea.STATE_SET, ["none", "relay", "pos"]).withDescription("Indicator light state"),
            e
                .enum("on_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-on color"),
            e
                .enum("off_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"])
                .withDescription("Light-off color"),

            e.text("sw1_name", ea.STATE_SET).withDescription("Set switch 1 name"),
            e.text("sw2_name", ea.STATE_SET).withDescription("Set switch 2 name"),
            e.text("sw3_name", ea.STATE_SET).withDescription("Set switch 3 name"),
            e.text("sw4_name", ea.STATE_SET).withDescription("Set switch 4 name"),
            e.text("sw5_name", ea.STATE_SET).withDescription("Set switch 5 name"),
            e.text("sw6_name", ea.STATE_SET).withDescription("Set switch 6 name"),
            e.text("sw7_name", ea.STATE_SET).withDescription("Set switch 7 name"),
            e.text("sw8_name", ea.STATE_SET).withDescription("Set switch 8 name"),
            e
                .enum("press_on_fun", ea.STATE_SET, [
                    "disable",
                    "press_switch_1",
                    "press_switch_2",
                    "press_switch_3",
                    "press_switch_4",
                    "press_switch_5",
                    "press_switch_6",
                    "press_switch_7",
                    "press_switch_8",
                ])
                .withDescription("Long press all on channel"),
            e
                .enum("press_off_fun", ea.STATE_SET, [
                    "disable",
                    "press_switch_1",
                    "press_switch_2",
                    "press_switch_3",
                    "press_switch_4",
                    "press_switch_5",
                    "press_switch_6",
                    "press_switch_7",
                    "press_switch_8",
                ])
                .withDescription("Long press all off channel"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [3, "state_l3", tuya.valueConverter.onOff],
                [4, "state_l4", tuya.valueConverter.onOff],
                [5, "state_l5", tuya.valueConverter.onOff],
                [6, "state_l6", tuya.valueConverter.onOff],
                [114, "state_l7", tuya.valueConverter.onOff],
                [115, "state_l8", tuya.valueConverter.onOff],

                [7, "countdown_1", tuya.valueConverter.raw],
                [8, "countdown_2", tuya.valueConverter.raw],
                [9, "countdown_3", tuya.valueConverter.raw],
                [10, "countdown_4", tuya.valueConverter.raw],
                [11, "countdown_5", tuya.valueConverter.raw],
                [12, "countdown_6", tuya.valueConverter.raw],
                [116, "countdown_7", tuya.valueConverter.raw],
                [117, "countdown_8", tuya.valueConverter.raw],

                [14, "relay_status", tuya.valueConverterBasic.lookup({off: tuya.enum(0), on: tuya.enum(1), memory: tuya.enum(2)})],
                [15, "light_mode", tuya.valueConverterBasic.lookup({none: tuya.enum(0), relay: tuya.enum(1), pos: tuya.enum(2)})],
                [16, "backlight_switch", tuya.valueConverter.onOff],
                [101, "backlight_lightness", tuya.valueConverter.raw],
                [
                    102,
                    "on_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [
                    103,
                    "off_color",
                    tuya.valueConverterBasic.lookup({
                        red: tuya.enum(0),
                        orange: tuya.enum(1),
                        green: tuya.enum(2),
                        cyan: tuya.enum(3),
                        blue: tuya.enum(4),
                        purple: tuya.enum(5),
                        magenta: tuya.enum(6),
                        cold_white: tuya.enum(7),
                        warm_yellow: tuya.enum(8),
                    }),
                ],
                [104, "displayoff_delay", tuya.valueConverter.raw],
                [105, "child_lock", tuya.valueConverter.onOff],

                [106, "sw1_name", tuya.valueConverter.raw],
                [107, "sw2_name", tuya.valueConverter.raw],
                [108, "sw3_name", tuya.valueConverter.raw],
                [109, "sw4_name", tuya.valueConverter.raw],
                [110, "sw5_name", tuya.valueConverter.raw],
                [111, "sw6_name", tuya.valueConverter.raw],
                [112, "sw7_name", tuya.valueConverter.raw],
                [113, "sw8_name", tuya.valueConverter.raw],
                [
                    118,
                    "press_on_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                        press_switch_3: tuya.enum(3),
                        press_switch_4: tuya.enum(4),
                        press_switch_5: tuya.enum(5),
                        press_switch_6: tuya.enum(6),
                        press_switch_7: tuya.enum(7),
                        press_switch_8: tuya.enum(8),
                    }),
                ],
                [
                    119,
                    "press_off_fun",
                    tuya.valueConverterBasic.lookup({
                        disable: tuya.enum(0),
                        press_switch_1: tuya.enum(1),
                        press_switch_2: tuya.enum(2),
                        press_switch_3: tuya.enum(3),
                        press_switch_4: tuya.enum(4),
                        press_switch_5: tuya.enum(5),
                        press_switch_6: tuya.enum(6),
                        press_switch_7: tuya.enum(7),
                        press_switch_8: tuya.enum(8),
                    }),
                ],
            ],
        },
    },
];
