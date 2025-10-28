import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_ytx9fudw"]),
        model: "Senoro.Win",
        vendor: "Senoro",
        description: "Senoro window alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            // Here you should put all functionality that your device exposes
            e.enum("opening_state", ea.STATE, ["open", "closed", "tilted"]),
            e.binary("alarm", ea.STATE_SET, true, false),
            e.battery(),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [101, "opening_state", tuya.valueConverterBasic.lookup({open: 0, closed: 1, tilted: 2})],
                [16, "alarm", tuya.valueConverter.raw],
                [2, "battery", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_6teua268"]),
        model: "Senoro.Win_V2",
        vendor: "Senoro",
        description: "Senoro window alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.enum("opening_state", ea.STATE, ["open", "closed", "tilted"]),
            e.binary("alarm_state", ea.STATE_SET, true, false).withDescription("Alarm was triggered."),
            e.binary("setup_mode", ea.STATE_SET, true, false).withDescription("Set mode status"),
            e.binary("alarm_siren", ea.STATE_SET, true, false).withDescription("Activate the siren when the alarm is triggered."),
            e
                .numeric("alarm_siren_duration", ea.STATE_SET)
                .withDescription("Duration of the alarm siren.")
                .withValueMin(5)
                .withValueMax(180)
                .withValueStep(1),
            e.numeric("vibration", ea.STATE).withDescription("Value of vibration."),
            e
                .numeric("vibration_limit", ea.STATE_SET)
                .withDescription("Limit at which a vibration is reported.")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1),
            e.binary("vibration_sirene", ea.STATE_SET, true, false).withDescription("Activate the siren when vibrating."),
            e
                .numeric("vibration_sirene_duration", ea.STATE_SET)
                .withDescription("Duration of the vibrating siren.")
                .withValueMin(5)
                .withValueMax(180)
                .withValueStep(1),
            e.binary("close_signal", ea.STATE_SET, true, false).withDescription("Enable sound when closing the window."),
            e
                .numeric("transmission_power", ea.STATE_SET)
                .withDescription("Transmission power 11-19. High value > battery consumption.")
                .withValueMin(11)
                .withValueMax(19)
                .withValueStep(1),
            e.binary("magnetic_status", ea.STATE, true, false).withDescription("Magnetic status."),
            e.battery(),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [
                    101,
                    "opening_state",
                    tuya.valueConverterBasic.lookup({
                        open: 0,
                        closed: 1,
                        tilted: 2,
                    }),
                ],
                [16, "alarm_state", tuya.valueConverter.raw],
                [107, "setup_mode", tuya.valueConverter.raw],
                [103, "alarm_siren", tuya.valueConverter.raw],
                [109, "alarm_siren_duration", tuya.valueConverter.raw],
                [102, "vibration", tuya.valueConverter.raw],
                [106, "vibration_limit", tuya.valueConverter.raw],
                [110, "vibration_sirene_duration", tuya.valueConverter.raw],
                [108, "vibration_sirene", tuya.valueConverter.raw],
                [104, "close_signal", tuya.valueConverter.raw],
                [105, "transmission_power", tuya.valueConverter.raw],
                [111, "magnetic_status", tuya.valueConverter.raw],
                [2, "battery", tuya.valueConverter.raw],
            ],
        },
    },
];
