import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type { DefinitionWithExtend } from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_7qc2wlqr"]),
        model: "BL82-TYZ1",
        vendor: "Manhot",
        description: "Cover motor LPD",
        extend: [tuya.modernExtend.tuyaBase({ dp: true, respondToMcuVersionResponse: true })],
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
            e.enum("on_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"]).withDescription("Light-on color"),
            e.enum("off_color", ea.STATE_SET, ["red", "orange", "green", "cyan", "blue", "purple", "magenta", "cold_white", "warm_yellow"]).withDescription("Light-off color"),


            e.text("sw1_name", ea.STATE_SET).withDescription("Set switch 1 name"),
        ],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [7, "countdown_1", tuya.valueConverter.raw],

                [14, "relay_status", tuya.valueConverterBasic.lookup({ "off": tuya.enum(0), "on": tuya.enum(1), "memory": tuya.enum(2) })],
                [15, "light_mode", tuya.valueConverterBasic.lookup({ "none": tuya.enum(0), "relay": tuya.enum(1), "pos": tuya.enum(2) })],
                [16, "backlight_switch", tuya.valueConverter.onOff],
                [101, "backlight_lightness", tuya.valueConverter.raw],
                [102, "on_color", tuya.valueConverterBasic.lookup({
                    "red": tuya.enum(0),
                    "orange": tuya.enum(1),
                    "green": tuya.enum(2),
                    "cyan": tuya.enum(3),
                    "blue": tuya.enum(4),
                    "purple": tuya.enum(5),
                    "magenta": tuya.enum(6),
                    "cold_white": tuya.enum(7),
                    "warm_yellow": tuya.enum(8)
                })],
                [103, "off_color", tuya.valueConverterBasic.lookup({
                    "red": tuya.enum(0),
                    "orange": tuya.enum(1),
                    "green": tuya.enum(2),
                    "cyan": tuya.enum(3),
                    "blue": tuya.enum(4),
                    "purple": tuya.enum(5),
                    "magenta": tuya.enum(6),
                    "cold_white": tuya.enum(7),
                    "warm_yellow": tuya.enum(8)
                })],
                [104, "displayoff_delay", tuya.valueConverter.raw],
                [105, "child_lock", tuya.valueConverter.onOff],

                [106, "sw1_name", tuya.valueConverter.raw],
            ],
        },
    },
];
