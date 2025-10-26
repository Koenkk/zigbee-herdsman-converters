import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;

const fzLocal = {
    MIRSO100: {
        cluster: "ssIasZone",
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            switch (msg.data[3]) {
                case 0:
                    return {action: "single"};
                case 1:
                    return {action: "double"};
                case 128:
                    return {action: "hold"};
            }
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, "raw">,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MIR-MC100"],
        model: "MIR-MC100",
        vendor: "MultIR",
        description: "Door sensor",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "contact",
                zoneAttributes: ["alarm_1", "tamper", "battery_low"],
            }),
        ],
    },
    {
        zigbeeModel: ["MIR-IL100"],
        model: "MIR-IL100",
        vendor: "MultIR",
        description: "PIR sensor",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "occupancy",
                zoneAttributes: ["alarm_1", "tamper", "battery_low"],
            }),
            m.enumLookup({
                name: "sensitivity",
                cluster: "ssIasZone",
                attribute: "currentZoneSensitivityLevel",
                description: "Sensitivity of the pir detector",
                lookup: {
                    low: 0x00,
                    medium: 0x01,
                    high: 0x02,
                },
                entityCategory: "config",
            }),
        ],
    },
    {
        zigbeeModel: ["MIR-SM200"],
        model: "MIR-SM200",
        vendor: "MultIR",
        description: "Smoke sensor",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "smoke",
                zoneAttributes: ["alarm_1", "tamper", "battery_low"],
            }),
        ],
    },
    {
        zigbeeModel: ["MIR-SO100"],
        model: "MIR-SO100",
        vendor: "MultIR",
        description: "SOS Button",
        fromZigbee: [fzLocal.MIRSO100],
        exposes: [e.action(["single", "double", "hold"])],
        extend: [m.battery()],
    },
    {
        zigbeeModel: ["MIR-TE600"],
        model: "MIR-TE600",
        vendor: "MultIR",
        description: "Temperature sensor",
        extend: [m.battery(), m.temperature(), m.humidity()],
        meta: {
            multiEndpoint: true,
        },
    },
    {
        zigbeeModel: ["MIR-WA100"],
        model: "MIR-WA100",
        vendor: "MultIR",
        description: "Water leakage sensor",
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1", "battery_low"],
            }),
        ],
    },
];
