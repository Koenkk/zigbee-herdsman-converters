import {presets} from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Expose, Fz, KeyValue, ModernExtend} from "../lib/types";

function imouAlarmButton(): ModernExtend {
    const exposes: Expose[] = [presets.action(["press"])];

    const fromZigbee = [
        {
            cluster: "ssIasZone",
            type: "commandStatusChangeNotification",
            convert: (model, msg, publish, options, meta) => {
                const payload: KeyValue = {};
                const zoneStatus = msg.data.zonestatus;
                if (zoneStatus === 2) payload.action = "press";
                return payload;
            },
        } satisfies Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification">,
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZP1-EN"],
        model: "ZP1-EN",
        vendor: "IMOU",
        description: "Zigbee ZP1 PIR motion sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "tamper", "battery_low"], alarmTimeout: true})],
    },
    {
        zigbeeModel: ["ZR1-EN"],
        model: "ZR1-EN",
        vendor: "IMOU",
        description: "Zigbee ZR1 siren",
        extend: [
            m.battery(),
            m.forceDeviceType({type: "EndDevice"}),
            m.iasWarning(),
            m.iasZoneAlarm({zoneType: "alarm", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
        ],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["ZD1-EN"],
        model: "ZD1-EN",
        vendor: "IMOU",
        description: "Door & window sensor",
        extend: [m.iasZoneAlarm({zoneType: "alarm", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}), m.battery()],
    },
    {
        zigbeeModel: ["ZGA1-EN"],
        model: "ZGA1-EN",
        vendor: "IMOU",
        description: "Smart gas detector",
        extend: [
            m.forceDeviceType({type: "Router"}),
            m.iasZoneAlarm({zoneType: "gas", zoneAttributes: ["alarm_1", "alarm_2", "tamper", "test"], alarmTimeout: true}),
        ],
    },
    {
        zigbeeModel: ["ZTM1-EN"],
        model: "ZTM1-EN",
        vendor: "IMOU",
        description: "Temperature and humidity sensor",
        extend: [m.battery(), m.temperature(), m.humidity()],
    },
    {
        zigbeeModel: ["ZE1-EN"],
        model: "ZE1-EN",
        vendor: "IMOU",
        description: "Wireless switch",
        extend: [m.battery(), imouAlarmButton()],
    },
];
