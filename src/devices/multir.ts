import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import {determineEndpoint} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

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

const tzLocal = {
    MIRSM200: {
        key: ["silence"],
        convertSet: async (entity, key, value, meta) => {
            if (value === "ON") {
                await entity.command("genOnOff", "off", {});
            }
        },
    } satisfies Tz.Converter,
};



const tzsr100Local = {
    MIRSR100: {
        key: ["warning"],
        convertSet: async (entity, key, value, meta) => {
            
        const mode = {stop: 0, burglar: 1, fire: 2, emergency: 3, police_panic: 4, fire_panic: 5, emergency_panic: 6};
        const level = {low: 0, medium: 1, high: 2, very_high: 3};
        const strobeLevel = {low: 0, medium: 1, high: 2, very_high: 3};
            
        const values = {
            mode: value.mode || "emergency",
            level: value.level || "medium",
            strobe: (value.strobe === true || value.strobe === 'true' || value.strobe === 'ON') ? 1 : 0,
            duration: value.duration != null ? value.duration : 10,
            strobeDutyCycle: value.strobe_duty_cycle != null ? value.strobe_duty_cycle * 10 : 0,
            strobeLevel: value.strobe_level != null ? utils.getFromLookup(value.strobe_level, strobeLevel) : 2,
        };
         let warningInfo;           
         warningInfo = (utils.getFromLookup(values.mode, mode) << 4) + ((values.strobe ? 1 : 0) << 2) + utils.getFromLookup(values.level, level);

            await entity.command(
                'ssIasWd', 
                'startWarning', 
                {
                    startwarninginfo: warningInfo, 
                    warningduration: values.duration,
                    strobedutycycle: values.strobeDutyCycle,
                    strobelevel: values.strobeLevel
                },
              utils.getOptions(meta.mapped, entity),
            );
            return {state: {warning: value}};
        },
    } satisfies Tz.Converter,
};
const fzhe300Local = {
    HE300: {
        cluster: "msOccupancySensing",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const value = msg.data.occupancy;

            let occupancy = false;
            let humanMotionstate = "none";

            if (value === 0x00) {
                occupancy = false;
                humanMotionstate = "none";
            } else if (value === 0x01) {
                occupancy = true;
                humanMotionstate = "active";
            } else if (value === 0x02) {
                occupancy = true;
                humanMotionstate = "static";
            } else {
                occupancy = (value & 0x01) !== 0 || (value & 0x02) !== 0;
                humanMotionstate = (value & 0x02) !== 0 ? "static" : (value & 0x01) !== 0 ? "active" : "none";
            }
            return {
                occupancy: occupancy,
                human_motion_state: humanMotionstate,
            };
        },
    } satisfies Fz.Converter<"msOccupancySensing", undefined, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["MIR-MC100", "MIR-MC100-E"],
        model: "MIR-MC100",
        vendor: "MultIR",
        description: "Door sensor",
        whiteLabel: [{model: "MIR-MC100-E", fingerprint: [{modelID: "MIR-MC100-E"}]}],
        extend: [
            m.battery(),
            m.iasZoneAlarm({
                zoneType: "contact",
                zoneAttributes: ["alarm_1", "tamper", "battery_low"],
            }),
        ],
    },
    {
        zigbeeModel: ["MIR-IL100", "MIR-IR100", "MIR-IR100-E"],
        model: "MIR-IR100",
        vendor: "MultIR",
        description: "PIR sensor",
        whiteLabel: [{vendor: "Intelbras", model: "MSM 1001", fingerprint: [{modelID: "MIR-IR100-E"}]}],
        extend: [
            m.battery(),
            m.illuminance(),
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
        zigbeeModel: ["HE300_ZB"],
        model: "HE300_ZB",
        vendor: "MultIR",
        description: "Human presence sensor",
        fromZigbee: [fz.occupancy, fzhe300Local.HE300],
        toZigbee: [],
        extend: [
            m.illuminance(),
            m.numeric({
                name: "occupancy_distance",
                cluster: 0x0406,
                attribute: {ID: 0xa205, type: 0x20},
                description: "Motion Range Detection (meter)",
                valueMin: 2,
                valueMax: 6,
                entityCategory: "config",
            }),
            m.numeric({
                name: "unmanned_duration",
                cluster: 0x0406,
                attribute: {ID: 0xa206, type: 0x21},
                description: "Ultrasonic occupied to unoccupied delay (seconds)",
                valueMin: 0,
                valueMax: 65535,
                entityCategory: "config",
            }),
            m.enumLookup({
                name: "sensitivity",
                cluster: 0x0406,
                attribute: {ID: 0xa203, type: 0x30},
                description: "Sensitivity of human presence detection",
                lookup: {
                    low: 0x00,
                    medium: 0x01,
                    high: 0x02,
                },
                entityCategory: "config",
            }),
        ],
        exposes: [e.occupancy(), e.enum("human_motion_state", ea.STATE, ["none", "active", "static"]).withDescription("Human Motion State")],
    },
    {
        zigbeeModel: ["MIR-SR100"],
        model: "MIR-SR100",
        vendor: "MultIR",
        description: "Zigbee SR100 siren",
        fromZigbee: [],
        toZigbee: [tzsr100Local.MIRSR100],
        extend: [m.onOff({powerOnBehavior: false}), m.forceDeviceType({type: "EndDevice"}), m.iasZoneAlarm({zoneType: "alarm", zoneAttributes: ["alarm_1", "tamper"]})],
        exposes: [
            exposes
                .composite("warning", "warning", ea.SET)
                .withFeature(exposes.enum("level", ea.SET, ["low", "medium", "high", "very_high"]).withDescription("Sound level"))
                .withFeature(exposes.binary("strobe", ea.SET, "ON", "OFF").withDescription("Turn on/off the strobe (light) during warning"))
                .withFeature(exposes.numeric('duration', ea.SET).withUnit('s').withValueMin(1).withValueMax(1800).withDescription('Duration of the warning in seconds'))
                .withFeature(exposes.numeric("strobe_duty_cycle", ea.SET).withValueMin(0).withValueMax(10).withDescription("Length of the flash cycle")),
        ],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["MIR-SM100-E"],
        model: "MIR-SM100-E",
        vendor: "MultIR",
        description: "Smoke sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "generic", zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"]})],
        exposes: [
            exposes.enum("silence", ea.SET, ["ON"]).withDescription("After enabling mute, it will return to detection state after 90 seconds."),
        ],
    },
    {
        zigbeeModel: ["MIR-SM200"],
        model: "MIR-SM200",
        vendor: "MultIR",
        description: "Smoke sensor",
        toZigbee: [tzLocal.MIRSM200],
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "smoke", zoneAttributes: ["alarm_1", "tamper", "battery_low"]})],
        exposes: [
            exposes.enum("silence", ea.SET, ["ON"]).withDescription("After enabling mute, it will return to detection state after 90 seconds."),
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
