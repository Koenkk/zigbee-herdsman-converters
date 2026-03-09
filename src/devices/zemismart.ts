import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";

const e = exposes.presets;

const ea = exposes.access;

const valueConverterLocal = {
    indiciatorStatus: tuya.valueConverterBasic.lookup({
        off: tuya.enum(0),
        on_off_status: tuya.enum(1),
        switch_position: tuya.enum(2),
    }),
    delayOffSchedule: tuya.valueConverterBasic.lookup({
        red: tuya.enum(0),
        blue: tuya.enum(1),
        green: tuya.enum(2),
        white: tuya.enum(3),
        yellow: tuya.enum(4),
        magenta: tuya.enum(5),
        cyan: tuya.enum(6),
        warmwhite: tuya.enum(7),
        warmyellow: tuya.enum(8),
    }),
    relayStatus: tuya.valueConverterBasic.lookup({
        power_off: tuya.enum(0),
        power_on: tuya.enum(1),
        restart_memory: tuya.enum(2),
    }),
    switchColor: tuya.valueConverterBasic.lookup({
        red: tuya.enum(0),
        blue: tuya.enum(1),
        green: tuya.enum(2),
        white: tuya.enum(3),
        yellow: tuya.enum(4),
        magenta: tuya.enum(5),
        cyan: tuya.enum(6),
        warmwhite: tuya.enum(7),
        warmyellow: tuya.enum(8),
    }),
    radarConfig: tuya.valueConverterBasic.lookup({
        none: tuya.enum(0),
        "10s": tuya.enum(1),
        "20s": tuya.enum(2),
        "30s": tuya.enum(3),
        "45s": tuya.enum(4),
        "60s": tuya.enum(5),
    }),
    name: {
        to: (v: string, meta: Tz.Meta) => {
            const stringValue = String(v ?? "");
            const limitedString = stringValue.slice(0, 12);
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(limitedString);
            const numberArray = Array.from(uint8Array);
            return numberArray;
        },
        from: (v: number, meta: Fz.Meta) => {
            const data = Object.values(v);
            const uint8Array = new Uint8Array(data);
            const decoder = new TextDecoder("utf-8");
            const decodedString = decoder.decode(uint8Array);
            return decodedString;
        },
    },
    cycleSchedule: {
        to: (v: string, meta: Tz.Meta) => {
            const stringValue = String(v ?? "");
            const limitedString = stringValue.slice(0, 12);
            return limitedString.split("").map((char) => char.charCodeAt(0));
        },
        from: (v: number, meta: Fz.Meta) => {
            return Object.values(v)
                .map((code) => String.fromCharCode(code))
                .join("");
        },
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_1vxgqfba", "_TZE200_wdfurkoa", "_TZE200_sq6affpe", "_TZE284_wdfurkoa", "_TZE284_6fopvb6v"]),
        model: "ZM25R1",
        vendor: "Zemismart",
        description: "Tubular motor",
        fromZigbee: [legacy.fromZigbee.tuya_cover],
        toZigbee: [legacy.toZigbee.tuya_cover_control],
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.enum("motor_direction", ea.STATE_SET, ["normal", "reversed"]).withDescription("Motor direction").withCategory("config"),
            e
                .enum("motor_working_mode", ea.STATE_SET, ["continuous", "intermittently"])
                .withDescription("Motor operating mode")
                .withCategory("config"),
            e.enum("remote_pair", ea.STATE_SET, ["on", "off"]).withDescription("Remote control pairing mode").withCategory("config"),
            e.enum("upper_stroke_limit", ea.STATE_SET, ["SET", "RESET"]).withDescription("Set / Reset the upper stroke limit").withCategory("config"),
            e
                .enum("middle_stroke_limit", ea.STATE_SET, ["SET", "RESET"])
                .withDescription("Set / Reset the middle stroke limit")
                .withCategory("config"),
            e.enum("lower_stroke_limit", ea.STATE_SET, ["SET", "RESET"]).withDescription("Set / Reset the lower stroke limit").withCategory("config"),
        ],
        whiteLabel: [tuya.whitelabel("Zemismart", "ZM25R3", "Tubular motor", ["_TZE200_sq6affpe"])],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [5, "motor_direction", tuya.valueConverter.tubularMotorDirection],
                [101, "remote_pair", tuya.valueConverterBasic.lookup({on: true, off: false})],
                [103, "upper_stroke_limit", tuya.valueConverterBasic.lookup({SET: true, RESET: false})],
                [104, "middle_stroke_limit", tuya.valueConverterBasic.lookup({SET: true, RESET: false})],
                [105, "lower_stroke_limit", tuya.valueConverterBasic.lookup({SET: true, RESET: false})],
                [106, "motor_working_mode", tuya.valueConverterBasic.lookup({continuous: tuya.enum(0), intermittently: tuya.enum(1)})],
            ],
        },
    },
    {
        zigbeeModel: ["NUET56-DL27LX1.1"],
        model: "LXZB-12A",
        vendor: "Zemismart",
        description: "RGB LED downlight",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["LXT56-LS27LX1.6"],
        model: "HGZB-DLC4-N15B",
        vendor: "Zemismart",
        description: "RGB LED downlight",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["TS0302"],
        model: "ZM-CSW032-D",
        vendor: "Zemismart",
        description: "Curtain/roller blind switch",
        fromZigbee: [fz.ZMCSW032D_cover_position],
        toZigbee: [tz.cover_state, tz.ZMCSW032D_cover_position],
        exposes: [e.cover_position()],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            // Configure reporting of currentPositionLiftPercentage always fails.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3216
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0003", ["_TZ3000_vjhcenzo", "_TZ3000_f09j9qjb"]),
        model: "TB25",
        vendor: "Zemismart",
        description: "Smart light switch and socket - 2 gang with neutral wire",
        extend: [tuya.modernExtend.tuyaOnOff({endpoints: ["left", "center", "right"]})],
        meta: {multiEndpoint: true},
        endpoint: () => {
            return {left: 1, center: 2, right: 3};
        },
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            for (const endpointID of [1, 2, 3]) {
                const endpoint = device.getEndpoint(endpointID);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
                await reporting.onOff(endpoint);
            }
        },
    },
    {
        zigbeeModel: ["LXN56-SS27LX1.1"],
        model: "LXN56-SS27LX1.1",
        vendor: "Zemismart",
        description: "Smart light switch - 2 gang with neutral wire",
        extend: [m.onOff()],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_zqtiam4u"]),
        model: "ZM-RM02",
        vendor: "Zemismart",
        description: "Smart 6 key scene switch",
        fromZigbee: [legacy.fromZigbee.ZMRM02],
        toZigbee: [],
        extend: [tuya.modernExtend.tuyaBase()],
        exposes: [
            e.battery(),
            e.action([
                "button_1_hold",
                "button_1_single",
                "button_1_double",
                "button_2_hold",
                "button_2_single",
                "button_2_double",
                "button_3_hold",
                "button_3_single",
                "button_3_double",
                "button_4_hold",
                "button_4_single",
                "button_4_double",
                "button_5_hold",
                "button_5_single",
                "button_5_double",
                "button_6_hold",
                "button_6_single",
                "button_6_double",
            ]),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_zigisuyh", "_TZ3000_v4mevirn", "_TZ3000_mlswgkc3"]),
        model: "ZIGBEE-B09-UK",
        vendor: "Zemismart",
        description: "Zigbee smart outlet universal socket with USB port",
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, endpoints: ["l1", "l2"]})],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_7eue9vhc", "_TZE200_bv1jcqqu", "_TZE200_wehza30a"]),
        model: "ZM25RX-08/30",
        vendor: "Zemismart",
        description: "Tubular motor",
        // mcuVersionResponse spsams: https://github.com/Koenkk/zigbee2mqtt/issues/19817
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        options: [exposes.options.invert_cover()],
        exposes: [
            e.text("work_state", ea.STATE),
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.battery(),
            e.enum("program", ea.SET, ["set_bottom", "set_upper", "reset"]).withDescription("Set the upper/bottom limit"),
            e
                .enum("click_control", ea.SET, ["upper", "upper_micro", "lower", "lower_micro"])
                .withDescription("Control motor in steps (ignores set limits; normal/micro = 120deg/5deg movement)"),
            e.enum("motor_direction", ea.STATE_SET, ["normal", "reversed"]).withDescription("Motor direction"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "state",
                    tuya.valueConverterBasic.lookup((options) =>
                        options.invert_cover
                            ? {OPEN: tuya.enum(2), STOP: tuya.enum(1), CLOSE: tuya.enum(0)}
                            : {OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)},
                    ),
                ],
                [2, "position", tuya.valueConverter.coverPosition],
                [3, "position", tuya.valueConverter.coverPosition],
                [5, "motor_direction", tuya.valueConverter.tubularMotorDirection],
                [
                    7,
                    "work_state",
                    tuya.valueConverterBasic.lookup((options) =>
                        options.invert_cover ? {opening: tuya.enum(1), closing: tuya.enum(0)} : {opening: tuya.enum(0), closing: tuya.enum(1)},
                    ),
                ],
                [13, "battery", tuya.valueConverter.raw],
                [
                    101,
                    "program",
                    tuya.valueConverterBasic.lookup(
                        (options) =>
                            options.invert_cover
                                ? {set_bottom: tuya.enum(0), set_upper: tuya.enum(1), reset: tuya.enum(4)}
                                : {set_bottom: tuya.enum(1), set_upper: tuya.enum(0), reset: tuya.enum(4)},
                        null,
                    ),
                ],
                [
                    101,
                    "click_control",
                    tuya.valueConverterBasic.lookup(
                        (options) =>
                            options.invert_cover
                                ? {lower: tuya.enum(2), upper: tuya.enum(3), lower_micro: tuya.enum(5), upper_micro: tuya.enum(6)}
                                : {lower: tuya.enum(3), upper: tuya.enum(2), lower_micro: tuya.enum(6), upper_micro: tuya.enum(5)},
                        null,
                    ),
                ],
                [103, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_iossyxra", "_TZE200_cxu0jkjk"]),
        model: "ZM-AM02_cover",
        vendor: "Zemismart",
        description: "Zigbee/RF curtain converter",
        fromZigbee: [legacy.fz.ZMAM02_cover],
        toZigbee: [legacy.tz.ZMAM02_cover],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e
                .composite("options", "options", ea.STATE)
                .withFeature(e.numeric("motor_speed", ea.STATE).withValueMin(0).withValueMax(255).withDescription("Motor speed")),
            e.enum("motor_working_mode", ea.STATE_SET, Object.values(legacy.ZMLookups.AM02MotorWorkingMode)),
            e.numeric("percent_state", ea.STATE).withValueMin(0).withValueMax(100).withValueStep(1).withUnit("%"),
            e.enum("mode", ea.STATE_SET, Object.values(legacy.ZMLookups.AM02Mode)),
            e.enum("motor_direction", ea.STATE_SET, Object.values(legacy.ZMLookups.AM02Direction)),
            e.enum("border", ea.STATE_SET, Object.values(legacy.ZMLookups.AM02Border)),
            // ---------------------------------------------------------------------------------
            // DP exists, but not used at the moment
            // e.numeric('percent_control', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(1).withUnit('%'),
            // exposes.enum('work_state', ea.STATE, Object.values(tuya.ZMAM02.AM02WorkState)),
            // e.numeric('countdown_left', ea.STATE).withUnit('s'),
            // e.numeric('time_total', ea.STATE).withUnit('ms'),
            // exposes.enum('situation_set', ea.STATE, Object.values(tuya.ZMAM02.AM02Situation)),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_fzo2pocs"]),
        model: "ZM25TQ",
        vendor: "Zemismart",
        description: "Tubular motor",
        fromZigbee: [legacy.fz.tuya_cover],
        toZigbee: [legacy.tz.tuya_cover_control, legacy.tz.tuya_cover_options, legacy.tz.tuya_data_point_test],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.enum("upper_stroke_limit", ea.STATE_SET, ["SET", "RESET"]).withDescription("Set / Reset the upper stroke limit").withCategory("config"),
            e
                .enum("middle_stroke_limit", ea.STATE_SET, ["SET", "RESET"])
                .withDescription("Set / Reset the middle stroke limit")
                .withCategory("config"),
            e.enum("lower_stroke_limit", ea.STATE_SET, ["SET", "RESET"]).withDescription("Set / Reset the lower stroke limit").withCategory("config"),
        ],
        extend: [m.forcePowerSource({powerSource: "Mains (single phase)"}), tuya.modernExtend.tuyaBase({dp: true})],
        meta: {
            tuyaDatapoints: [
                [103, "upper_stroke_limit", tuya.valueConverterBasic.lookup({SET: true, RESET: false})],
                [104, "middle_stroke_limit", tuya.valueConverterBasic.lookup({SET: true, RESET: false})],
                [105, "lower_stroke_limit", tuya.valueConverterBasic.lookup({SET: true, RESET: false})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_1n2kyphz", "_TZE200_shkxsgis", "_TZE204_shkxsgis"]),
        model: "TB26-4",
        vendor: "Zemismart",
        description: "4-gang smart wall switch",
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
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_9mahtqtg", "_TZE200_r731zlxk", "_TZE204_r731zlxk"]),
        model: "TB26-6",
        vendor: "Zemismart",
        description: "6-gang smart wall switch",
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
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(5)) await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(6)) await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ["genOnOff"]);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_xeumnff9"]),
        model: "ZMO-606-P2",
        vendor: "Zemismart",
        description: "Smart 2 poles outlet (20A + 10A)",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.identify(),
            tuya.modernExtend.tuyaOnOff({indicatorMode: true, onOffCountdown: true, childLock: true, endpoints: ["l1", "l2"]}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_b1q8kwmh"]),
        model: "ZMO-606-20A",
        vendor: "Zemismart",
        description: "Smart 20A outlet",
        extend: [m.identify(), tuya.modernExtend.tuyaOnOff({indicatorMode: true, onOffCountdown: true, childLock: true})],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_sa2ueffe", "_TZE204_zuepxzck", "_TZE284_lnyz4a6v"]),
        model: "ZMS-206US-1",
        vendor: "Zemismart",
        description: "Smart screen switch 1 gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.switch(),
            e
                .numeric("backlight_brightness", ea.STATE_SET)
                .withDescription("Brightness of the light")
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1),
            e.child_lock(),
            e.enum("radar_config", ea.STATE_SET, ["none", "10s", "20s", "30s", "45s", "60s"]).withDescription("Radar Config"),
            e
                .enum("switch_color_on", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor when on"),
            e
                .enum("switch_color_off", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor when off"),
            e.enum("indicator_status", ea.STATE_SET, ["off", "on_off_status", "switch_position"]).withDescription("Indicator Light Status"),
            e
                .enum("delay_off_schedule", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor while delayed"),
            e.text("name", ea.STATE_SET).withDescription("Name for switch"),
            e.enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"]).withDescription("Relay status for switch"),
            e
                .numeric("countdown", ea.STATE_SET)
                .withDescription("Countdown for switch 1")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [7, "countdown", tuya.valueConverter.raw],
                [13, "state", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [14, "relay_status", tuya.valueConverter.raw],
                [15, "indicator_status", valueConverterLocal.indiciatorStatus],
                [16, "backlight_mode", tuya.valueConverter.onOff],
                [19, "delay_off_schedule", valueConverterLocal.delayOffSchedule],
                [24, "test_bit", tuya.valueConverter.raw],
                [29, "relay_status", valueConverterLocal.relayStatus],
                [101, "child_lock", tuya.valueConverter.lockUnlock],
                [102, "backlight_brightness", tuya.valueConverter.raw],
                [103, "switch_color_on", valueConverterLocal.switchColor],
                [104, "switch_color_off", valueConverterLocal.switchColor],
                [105, "name", valueConverterLocal.name],
                [111, "radar_config", valueConverterLocal.radarConfig],
                [209, "cycle_schedule", valueConverterLocal.cycleSchedule],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_3ctwoaip", "_TZE204_3ctwoaip", "_TZE284_dmckrsxg"]),
        model: "ZMS-206EU-2",
        vendor: "Zemismart",
        description: "Smart screen switch 2 gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.switch(),
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e
                .numeric("backlight_brightness", ea.STATE_SET)
                .withDescription("Brightness of the light")
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1),
            e.child_lock(),
            e.enum("radar_config", ea.STATE_SET, ["none", "10s", "20s", "30s", "45s", "60s"]).withDescription("Radar Config"),
            e
                .enum("switch_color_on", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor when on"),
            e
                .enum("switch_color_off", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor when off"),
            e.enum("indicator_status", ea.STATE_SET, ["off", "on_off_status", "switch_position"]).withDescription("Indicator Light Status"),
            e
                .enum("delay_off_schedule", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor while delayed"),
            e.text("name", ea.STATE_SET).withEndpoint("l1").withDescription("Name for Switch 1"),
            e.text("name", ea.STATE_SET).withEndpoint("l2").withDescription("Name for Switch 2"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l1")
                .withDescription("Relay Status for Switch 1"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l2")
                .withDescription("Relay Status for Switch 2"),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l1")
                .withDescription("Countdown for Switch 1")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l2")
                .withDescription("Countdown for Switch 2")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, "state_l2", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [7, "countdown_l1", tuya.valueConverter.raw],
                [8, "countdown_l2", tuya.valueConverter.raw],
                [13, "state", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [14, "relay_status", tuya.valueConverter.raw],
                [15, "indicator_status", valueConverterLocal.indiciatorStatus],
                [16, "backlight_mode", tuya.valueConverter.onOff],
                [19, "delay_off_schedule", valueConverterLocal.delayOffSchedule],
                [24, "test_bit", tuya.valueConverter.raw],
                [29, "relay_status_l1", valueConverterLocal.relayStatus],
                [30, "relay_status_l2", valueConverterLocal.relayStatus],
                [101, "child_lock", tuya.valueConverter.lockUnlock],
                [102, "backlight_brightness", tuya.valueConverter.raw],
                [103, "switch_color_on", valueConverterLocal.switchColor],
                [104, "switch_color_off", valueConverterLocal.switchColor],
                [105, "name_l1", valueConverterLocal.name],
                [106, "name_l2", valueConverterLocal.name],
                [111, "radar_config", valueConverterLocal.radarConfig],
                [209, "cycle_schedule", valueConverterLocal.cycleSchedule],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_k7v0eqke", "_TZE204_iyki9kjp", "_TZE284_k7v0eqke", "_TZE284_e4pf6l87"]),
        model: "ZMS-206EU-3",
        vendor: "Zemismart",
        description: "Smart screen switch 3 gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.switch(),
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e
                .numeric("backlight_brightness", ea.STATE_SET)
                .withDescription("Brightness of the light")
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1),
            e.child_lock(),
            e.enum("radar_config", ea.STATE_SET, ["none", "10s", "20s", "30s", "45s", "60s"]).withDescription("Radar Config"),
            e
                .enum("switch_color_on", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor when on"),
            e
                .enum("switch_color_off", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor when off"),
            e.enum("indicator_status", ea.STATE_SET, ["off", "on_off_status", "switch_position"]).withDescription("Indicator Light Status"),
            e
                .enum("delay_off_schedule", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor while delayed"),
            e.text("name", ea.STATE_SET).withEndpoint("l1").withDescription("Name for Switch 1"),
            e.text("name", ea.STATE_SET).withEndpoint("l2").withDescription("Name for Switch 2"),
            e.text("name", ea.STATE_SET).withEndpoint("l3").withDescription("Name for Switch 3"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l1")
                .withDescription("Relay Status for Switch 1"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l2")
                .withDescription("Relay Status for Switch 2"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l3")
                .withDescription("Relay Status for Switch 3"),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l1")
                .withDescription("Countdown for Switch 1")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l2")
                .withDescription("Countdown for Switch 2")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l3")
                .withDescription("Countdown for Switch 3")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, "state_l2", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [3, "state_l3", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [7, "countdown_l1", tuya.valueConverter.raw],
                [8, "countdown_l2", tuya.valueConverter.raw],
                [9, "countdown_l3", tuya.valueConverter.raw],
                [13, "state", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [14, "relay_status", tuya.valueConverter.raw],
                [15, "indicator_status", valueConverterLocal.indiciatorStatus],
                [16, "backlight_mode", tuya.valueConverter.onOff],
                [19, "delay_off_schedule", valueConverterLocal.delayOffSchedule],
                [24, "test_bit", tuya.valueConverter.raw],
                [29, "relay_status_l1", valueConverterLocal.relayStatus],
                [30, "relay_status_l2", valueConverterLocal.relayStatus],
                [31, "relay_status_l3", valueConverterLocal.relayStatus],
                [101, "child_lock", tuya.valueConverter.lockUnlock],
                [102, "backlight_brightness", tuya.valueConverter.raw],
                [103, "switch_color_on", valueConverterLocal.switchColor],
                [104, "switch_color_off", valueConverterLocal.switchColor],
                [105, "name_l1", valueConverterLocal.name],
                [106, "name_l2", valueConverterLocal.name],
                [107, "name_l3", valueConverterLocal.name],
                [111, "radar_config", valueConverterLocal.radarConfig],
                [209, "cycle_schedule", valueConverterLocal.cycleSchedule],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE204_wwaeqnrf",
            "_TZE284_wwaeqnrf",
            "_TZE204_y4jqpry8",
            "_TZE284_y4jqpry8",
            "_TZE204_xibaabmu",
            "_TZE284_xibaabmu",
        ]),
        model: "ZMS-206US-4",
        vendor: "Zemismart",
        description: "Smart screen switch 4 gang US",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
            e.switch(),
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.switch().withEndpoint("l4"),

            e
                .numeric("backlight_brightness", ea.STATE_SET)
                .withDescription("Brightness of the light")
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1),
            e.child_lock(),
            e.enum("radar_config", ea.STATE_SET, ["none", "10s", "20s", "30s", "45s", "60s"]).withDescription("Radar Config"),
            e
                .enum("switch_color_on", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor when on"),
            e
                .enum("switch_color_off", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor when off"),
            e.enum("indicator_status", ea.STATE_SET, ["off", "on_off_status", "switch_position"]).withDescription("Indicator Light Status"),
            e
                .enum("delay_off_schedule", ea.STATE_SET, ["red", "blue", "green", "white", "yellow", "magenta", "cyan", "warm_white", "warm_yellow"])
                .withDescription("Switch lightcolor while delayed"),
            e.text("name", ea.STATE_SET).withEndpoint("l1").withDescription("Name for Switch 1"),
            e.text("name", ea.STATE_SET).withEndpoint("l2").withDescription("Name for Switch 2"),
            e.text("name", ea.STATE_SET).withEndpoint("l3").withDescription("Name for Switch 3"),
            e.text("name", ea.STATE_SET).withEndpoint("l4").withDescription("Name for Switch 4"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l1")
                .withDescription("Relay Status for Switch 1"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l2")
                .withDescription("Relay Status for Switch 2"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l3")
                .withDescription("Relay Status for Switch 3"),
            e
                .enum("relay_status", ea.STATE_SET, ["power_on", "power_off", "restart_memory"])
                .withEndpoint("l4")
                .withDescription("Relay Status for Switch 4"),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l1")
                .withDescription("Countdown for Switch 1")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l2")
                .withDescription("Countdown for Switch 2")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l3")
                .withDescription("Countdown for Switch 3")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l4")
                .withDescription("Countdown for Switch 4")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1, l4: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, "state_l2", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [3, "state_l3", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [4, "state_l4", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [7, "countdown_l1", tuya.valueConverter.raw],
                [8, "countdown_l2", tuya.valueConverter.raw],
                [9, "countdown_l3", tuya.valueConverter.raw],
                [10, "countdown_l4", tuya.valueConverter.raw],
                [13, "state", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [14, "relay_status", tuya.valueConverter.raw],
                [15, "indicator_status", valueConverterLocal.indiciatorStatus],
                [16, "backlight_mode", tuya.valueConverter.onOff],
                [19, "delay_off_schedule", valueConverterLocal.delayOffSchedule],
                [24, "test_bit", tuya.valueConverter.raw],
                [29, "relay_status_l1", valueConverterLocal.relayStatus],
                [30, "relay_status_l2", valueConverterLocal.relayStatus],
                [31, "relay_status_l3", valueConverterLocal.relayStatus],
                [32, "relay_status_l4", valueConverterLocal.relayStatus],
                [101, "child_lock", tuya.valueConverter.lockUnlock],
                [102, "backlight_brightness", tuya.valueConverter.raw],
                [103, "switch_color_on", valueConverterLocal.switchColor],
                [104, "switch_color_off", valueConverterLocal.switchColor],
                [105, "name_l1", valueConverterLocal.name],
                [106, "name_l2", valueConverterLocal.name],
                [107, "name_l3", valueConverterLocal.name],
                [108, "name_l4", valueConverterLocal.name],
                [111, "radar_config", valueConverterLocal.radarConfig],
                [201, "cycle_schedule", valueConverterLocal.cycleSchedule],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_a2teqi5u"]),
        model: "ZMS-208US-2",
        vendor: "Zemismart",
        description: "Smart screen switch 2 gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch(),
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.child_lock(),
            e.text("name", ea.STATE_SET).withEndpoint("l1").withDescription("Name for Switch 1"),
            e.text("name", ea.STATE_SET).withEndpoint("l2").withDescription("Name for Switch 2"),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l1")
                .withDescription("Countdown for Switch 1")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l2")
                .withDescription("Countdown for Switch 2")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, "state_l2", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [7, "countdown_l1", tuya.valueConverter.raw],
                [8, "countdown_l2", tuya.valueConverter.raw],
                [13, "state", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [24, "test_bit", tuya.valueConverter.raw],
                [101, "child_lock", tuya.valueConverter.lockUnlock],
                [105, "name_l1", valueConverterLocal.name],
                [106, "name_l2", valueConverterLocal.name],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_xvywzhmi"]),
        model: "ZMS-208US-3",
        vendor: "Zemismart",
        description: "Smart screen switch 3 gang",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.switch(),
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.switch().withEndpoint("l3"),
            e.child_lock(),
            e.text("name", ea.STATE_SET).withEndpoint("l1").withDescription("Name for Switch 1"),
            e.text("name", ea.STATE_SET).withEndpoint("l2").withDescription("Name for Switch 2"),
            e.text("name", ea.STATE_SET).withEndpoint("l3").withDescription("Name for Switch 3"),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l1")
                .withDescription("Countdown for Switch 1")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l2")
                .withDescription("Countdown for Switch 2")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
            e
                .numeric("countdown", ea.STATE_SET)
                .withEndpoint("l3")
                .withDescription("Countdown for Switch 3")
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withValueStep(1),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, "state_l2", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [3, "state_l3", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [7, "countdown_l1", tuya.valueConverter.raw],
                [8, "countdown_l2", tuya.valueConverter.raw],
                [9, "countdown_l3", tuya.valueConverter.raw],
                [13, "state", tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [24, "test_bit", tuya.valueConverter.raw],
                [101, "child_lock", tuya.valueConverter.lockUnlock],
                [105, "name_l1", valueConverterLocal.name],
                [106, "name_l2", valueConverterLocal.name],
                [107, "name_l3", valueConverterLocal.name],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_mpg22jc1"]),
        model: "ZN-USC1U-HT",
        vendor: "Zemismart",
        description: "Smart curtain wall switch",
        options: [exposes.options.invert_cover()],
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.enum("motor_steering", ea.STATE_SET, ["FORWARD", "BACKWARD"]).withDescription("Motor steering"),
            e
                .numeric("calibration_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(500)
                .withUnit("s")
                .withDescription("Calibration time in seconds (Please fully close the curtain before set the calibration time)"),
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
                [
                    8,
                    "motor_steering",
                    tuya.valueConverterBasic.lookup({
                        FORWARD: tuya.enum(0),
                        BACKWARD: tuya.enum(1),
                    }),
                ],
                [10, "calibration_time", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0004", ["_TZ3000_nsa76jai"]),
        model: "KES-606US-L4",
        vendor: "Zemismart",
        description: "Smart light switch - 4 gang (US)",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}),
            tuya.modernExtend.tuyaOnOff({
                endpoints: ["l1", "l2", "l3", "l4"],
                powerOnBehavior2: true,
                backlightModeOffOn: true,
                indicatorMode: true,
            }),
        ],
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_3mzb0sdz"]),
        model: "ZM16B",
        vendor: "Zemismart",
        description: "Tubular motor",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        options: [exposes.options.invert_cover()],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.enum("motor_direction", ea.STATE_SET, ["forward", "back"]).withDescription("Motor direction"),
            e.enum("border", ea.STATE_SET, ["up", "down", "up_delete", "down_delete", "remove_top_bottom"]).withDescription("Limit setting"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [9, "position", tuya.valueConverter.coverPosition], // Percent control - set position (0-100)
                [8, "position", tuya.valueConverter.coverPosition], // Percent state - current position (0-100)
                [11, "motor_direction", tuya.valueConverterBasic.lookup({forward: tuya.enum(0), back: tuya.enum(1)})],
                [13, "battery", tuya.valueConverter.raw],
                [
                    16,
                    "border",
                    tuya.valueConverterBasic.lookup({
                        up: tuya.enum(0),
                        down: tuya.enum(1),
                        up_delete: tuya.enum(2),
                        down_delete: tuya.enum(3),
                        remove_top_bottom: tuya.enum(4),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_6hrnp30w"]),
        model: "ZMP1",
        vendor: "Zemismart",
        description: "Blind driver",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        options: [exposes.options.invert_cover()],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.text("work_state", ea.STATE),
            e.battery(),
            e.enum("motor_direction", ea.STATE_SET, ["normal", "reversed"]).withDescription("Motor direction"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "state",
                    tuya.valueConverterBasic.lookup((options) =>
                        options.invert_cover
                            ? {OPEN: tuya.enum(2), STOP: tuya.enum(1), CLOSE: tuya.enum(0)}
                            : {OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)},
                    ),
                ],
                [2, "position", tuya.valueConverter.coverPosition], // Curtain position setting
                [3, "position", tuya.valueConverter.coverPosition], // Current curtain position
                [5, "motor_direction", tuya.valueConverter.tubularMotorDirection],
                [
                    7,
                    "work_state",
                    tuya.valueConverterBasic.lookup((options) =>
                        options.invert_cover ? {opening: tuya.enum(1), closing: tuya.enum(0)} : {opening: tuya.enum(0), closing: tuya.enum(1)},
                    ),
                ],
                [13, "battery", tuya.valueConverter.raw],
            ],
        },
    },
];
