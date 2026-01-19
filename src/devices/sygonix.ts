import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE284_chcnj5st"}],
        model: "SY-6811314",
        vendor: "Sygonix",
        description: "Zigbee Smart Button/Switch Pusher",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch(),
            e.binary("auto_adjustment", ea.STATE_SET, "ON", "OFF").withDescription("auto adjustment the arm position"),
            e.binary("set_switch_state", ea.STATE_SET, "ON", "OFF").withDescription("set the switch display status"),
            e
                .enum("mode", ea.STATE_SET, ["click", "long_press"])
                .withDescription("work mode of the finger robot")
                .withCategory("config"),
            e
                .numeric("click_sustain_time", ea.STATE_SET)
                .withValueMin(0.3)
                .withValueMax(10)
                .withValueStep(0.1)
                .withDescription("keep times for click")
                .withUnit("s")
                .withCategory("config"),
            e
                .numeric("arm_down_percent", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(30)
                .withValueStep(1)
                .withDescription("the position for arm moving down")
                .withCategory("config"),
            e
                .numeric("arm_up_percent", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(30)
                .withValueStep(1)
                .withDescription("the position for arm moving up")
                .withCategory("config"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [2, "mode", tuya.valueConverterBasic.lookup({click: tuya.enum(0), long_press: tuya.enum(1)})],
                [3, "click_sustain_time", tuya.valueConverter.divideBy10],
                [5, "arm_down_percent", tuya.valueConverter.raw],
                [6, "arm_up_percent", tuya.valueConverter.raw],
                [101, "auto_adjustment", tuya.valueConverter.onOff],
                [102, "set_switch_state", tuya.valueConverter.onOff],
                [8, "battery", tuya.valueConverter.raw],
            ],
        },
    },
];
