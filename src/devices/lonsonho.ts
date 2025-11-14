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
        fingerprint: tuya.fingerprint("TS130F", ["_TZ3000_vd43bbfq", "_TZ3000_fccpjz5z"]),
        model: "QS-Zigbee-C01",
        vendor: "Lonsonho",
        description: "Curtain/blind motor controller",
        fromZigbee: [fz.cover_position_tilt, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.moes_cover_calibration, tz.tuya_cover_calibration, tz.tuya_cover_reversal],
        meta: {coverInverted: true},
        exposes: [
            e.cover_position(),
            e.enum("moving", ea.STATE, ["UP", "STOP", "DOWN"]),
            e.binary("calibration", ea.ALL, "ON", "OFF"),
            e.binary("motor_reversal", ea.ALL, "ON", "OFF"),
            e.numeric("calibration_time", ea.ALL).withUnit("s").withValueMin(0).withValueMax(100).withDescription("Calibration time"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS130F", ["_TZ3000_egq7y6pr"]),
        model: "11830304",
        vendor: "Lonsonho",
        description: "Curtain switch",
        fromZigbee: [fz.cover_position_tilt, tuya.fz.backlight_mode_low_medium_high, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal, tuya.tz.backlight_indicator_mode_1],
        meta: {coverInverted: true},
        exposes: [
            e.cover_position(),
            e.enum("moving", ea.STATE, ["UP", "STOP", "DOWN"]),
            e.binary("calibration", ea.ALL, "ON", "OFF"),
            e.binary("motor_reversal", ea.ALL, "ON", "OFF"),
            e.enum("backlight_mode", ea.ALL, ["LOW", "MEDIUM", "HIGH"]),
            e.numeric("calibration_time", ea.STATE).withUnit("s").withDescription("Calibration time"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS130F", [
            "_TZ3000_j1xl73iw",
            "_TZ3000_kmsbwdol",
            "_TZ3000_esynmmox",
            "_TZ3000_l6iqph4f",
            "_TZ3000_xdo0hj1k",
            "_TZ3000_bmhwnl7s",
        ]),
        model: "TS130F_dual",
        vendor: "Lonsonho",
        description: "Dual curtain/blind module",
        fromZigbee: [fz.cover_position_tilt, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal],
        whiteLabel: [tuya.whitelabel("Girier", "TS130F_GIRIER_DUAL", "Dual smart curtain switch", ["_TZ3000_j1xl73iw"])],
        meta: {multiEndpoint: true, coverInverted: true},
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        exposes: [
            e.enum("moving", ea.STATE, ["UP", "STOP", "DOWN"]).withEndpoint("left"),
            e.enum("moving", ea.STATE, ["UP", "STOP", "DOWN"]).withEndpoint("right"),
            e
                .numeric("calibration_time", ea.ALL)
                .withValueMin(0)
                .withValueMax(500)
                .withUnit("s")
                .withDescription("Calibration time")
                .withEndpoint("left"),
            e
                .numeric("calibration_time", ea.ALL)
                .withValueMin(0)
                .withValueMax(500)
                .withUnit("s")
                .withDescription("Calibration time")
                .withEndpoint("right"),
            e.cover_position().withEndpoint("left"),
            e.binary("calibration", ea.ALL, "ON", "OFF").withEndpoint("left"),
            e.binary("motor_reversal", ea.ALL, "ON", "OFF").withEndpoint("left"),
            e.cover_position().withEndpoint("right"),
            e.binary("calibration", ea.ALL, "ON", "OFF").withEndpoint("right"),
            e.binary("motor_reversal", ea.ALL, "ON", "OFF").withEndpoint("right"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0001", ["_TZ3000_t3s9qmmg"]),
        model: "X701A",
        vendor: "Lonsonho",
        description: "1 gang switch with backlight",
        extend: [tuya.modernExtend.tuyaOnOff({indicatorMode: true})],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_8vxj8khv", "_TZE200_7tdtqgwv"]),
        model: "X711A",
        vendor: "Lonsonho",
        description: "1 gang switch",
        exposes: [e.switch().setAccess("state", ea.STATE_SET)],
        fromZigbee: [legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_dhdstcqc"]),
        model: "X712A",
        vendor: "Lonsonho",
        description: "2 gang switch",
        exposes: [e.switch().withEndpoint("l1").setAccess("state", ea.STATE_SET), e.switch().withEndpoint("l2").setAccess("state", ea.STATE_SET)],
        fromZigbee: [legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {l1: 1, l2: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_fqytfymk"]),
        model: "X713A",
        vendor: "Lonsonho",
        description: "3 gang switch",
        exposes: [
            e.switch().withEndpoint("l1").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l2").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l3").setAccess("state", ea.STATE_SET),
        ],
        fromZigbee: [legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {l1: 1, l2: 1, l3: 1};
        },
    },
    {
        fingerprint: tuya.fingerprint("TS110F", ["_TYZB01_qezuin6k"]),
        model: "QS-Zigbee-D02-TRIAC-LN",
        vendor: "Lonsonho",
        description: "1 gang smart dimmer switch module with neutral",
        extend: [tuya.modernExtend.tuyaLight({minBrightness: "attribute"})],
    },
    {
        fingerprint: tuya.fingerprint("TS110F", ["_TYZB01_v8gtiaed"]),
        model: "QS-Zigbee-D02-TRIAC-2C-LN",
        vendor: "Lonsonho",
        description: "2 gang smart dimmer switch module with neutral",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            tuya.modernExtend.tuyaLight({minBrightness: "attribute", endpointNames: ["l1", "l2"]}),
        ],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
            // Don't do: await reporting.onOff(endpoint); https://github.com/Koenkk/zigbee2mqtt/issues/6041
        },
    },
    {
        fingerprint: tuya.fingerprint("TS110F", ["_TZ3000_92chsky7"]),
        model: "QS-Zigbee-D02-TRIAC-2C-L",
        vendor: "Lonsonho",
        description: "2 gang smart dimmer switch module without neutral",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.light({endpointNames: ["l1", "l2"], configureReporting: true})],
    },
    {
        zigbeeModel: ["Plug_01"],
        model: "4000116784070",
        vendor: "Lonsonho",
        description: "Smart plug EU",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["ZB-RGBCW"],
        fingerprint: [
            {modelID: "ZB-CL01", manufacturerName: "eWeLight"},
            {modelID: "ZB-CL01", manufacturerName: "eWeLink"},
            {modelID: "ZB-CL02", manufacturerName: "eWeLight"},
            {modelID: "ZB-CL01", manufacturerName: "eWeLi\u0001\u0000\u0010"},
            {modelID: "Z102LG03-1", manufacturerName: "eWeLink"},
        ],
        model: "ZB-RGBCW",
        vendor: "Lonsonho",
        description: "Zigbee 3.0 LED-bulb, RGBW LED",
        extend: [m.light({colorTemp: {range: [153, 500], startup: false}, color: true, effect: false, powerOnBehavior: false})],
    },
    {
        fingerprint: tuya.fingerprint("TS0003", ["_TYZB01_zsl6z0pw", "_TYZB01_uqkphoed"]),
        model: "QS-Zigbee-S04-2C-LN",
        vendor: "Lonsonho",
        description: "2 gang switch module with neutral wire",
        exposes: [e.switch().withEndpoint("l1"), e.switch().withEndpoint("l2")],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        toZigbee: [tz.TYZB01_on_off],
        fromZigbee: [fz.on_off],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0003", ["_TYZB01_ncutbjdi"]),
        model: "QS-Zigbee-S05-LN",
        vendor: "Lonsonho",
        description: "1 gang switch module with neutral wire",
        extend: [m.onOff({powerOnBehavior: false, configureReporting: false})],
        toZigbee: [tz.TYZB01_on_off],
    },
    {
        fingerprint: tuya.fingerprint("TS130F", ["_TZ3000_zirycpws", "_TZ3210_ol1uhvza"]),
        model: "QS-Zigbee-C03",
        vendor: "Lonsonho",
        description: "Curtain/blind motor controller",
        fromZigbee: [fz.cover_position_tilt, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal],
        meta: {coverInverted: true},
        exposes: [
            e.cover_position(),
            e.enum("moving", ea.STATE, ["UP", "STOP", "DOWN"]),
            e.binary("calibration", ea.ALL, "ON", "OFF"),
            e.binary("motor_reversal", ea.ALL, "ON", "OFF"),
            e.numeric("calibration_time", ea.STATE).withUnit("s").withDescription("Calibration time"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0603", ["_TZE600_wxq8dpha\u0000"]),
        model: "VM-Zigbee-S02-0-10V",
        vendor: "Lonsonho",
        description: "2 channel Zigbee 0-10V dimmer module",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint("l1"),
            tuya.exposes.lightBrightnessWithMinMax().withEndpoint("l2"),
            tuya.exposes.countdown().withEndpoint("l1"),
            tuya.exposes.countdown().withEndpoint("l2"),
            tuya.exposes.switchType().withEndpoint("l1"),
            tuya.exposes.switchType().withEndpoint("l2"),
            e.power_on_behavior().withAccess(ea.STATE_SET),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 1, l3: 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "brightness_l1", tuya.valueConverter.scale0_254to0_1000],
                [3, "min_brightness_l1", tuya.valueConverter.scale0_254to0_1000],
                [4, "switch_type_l1", tuya.valueConverter.switchType],
                [5, "max_brightness_l1", tuya.valueConverter.scale0_254to0_1000],
                [6, "countdown_l1", tuya.valueConverter.raw],
                [7, "state_l2", tuya.valueConverter.onOff],
                [8, "brightness_l2", tuya.valueConverter.scale0_254to0_1000],
                [9, "min_brightness_l2", tuya.valueConverter.scale0_254to0_1000],
                [10, "switch_type_l2", tuya.valueConverter.switchType],
                [11, "max_brightness_l2", tuya.valueConverter.scale0_254to0_1000],
                [12, "countdown_l2", tuya.valueConverter.raw],
                [14, "power_on_behavior", tuya.valueConverter.powerOnBehaviorEnum],
            ],
        },
    },
];
