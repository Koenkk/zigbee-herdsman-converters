import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["abb71ca5fe1846f185cfbda554046cce"],
        model: "LVS-ZB500D",
        vendor: "LivingWise",
        description: "Zigbee smart dimmer switch",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["545df2981b704114945f6df1c780515a"],
        model: "LVS-ZB15S",
        vendor: "LivingWise",
        description: "Zigbee smart in-wall switch",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["e70f96b3773a4c9283c6862dbafb6a99"],
        model: "LVS-SM10ZW",
        vendor: "LivingWise",
        description: "Door or window contact switch",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["895a2d80097f4ae2b2d40500d5e03dcc", "700ae5aab3414ec09c1872efe7b8755a"],
        model: "LVS-SN10ZW_SN11",
        vendor: "LivingWise",
        description: "Occupancy sensor",
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["55e0fa5cdb144ba3a91aefb87c068cff"],
        model: "LVS-ZB15R",
        vendor: "LivingWise",
        description: "Zigbee smart outlet",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["75d430d66c164c26ac8601c05932dc94"],
        model: "LVS-SC7",
        vendor: "LivingWise",
        description: "Scene controller ",
        fromZigbee: [fz.orvibo_raw_2],
        exposes: [
            e.action([
                "button_1_click",
                "button_1_hold",
                "button_1_release",
                "button_2_click",
                "button_2_hold",
                "button_2_release",
                "button_3_click",
                "button_3_hold",
                "button_3_release",
                "button_4_click",
                "button_4_hold",
                "button_4_release",
                "button_5_click",
                "button_5_hold",
                "button_5_release",
                "button_6_click",
                "button_6_hold",
                "button_6_release",
                "button_7_click",
                "button_7_hold",
                "button_7_release",
            ]),
        ],
        toZigbee: [],
    },
];
