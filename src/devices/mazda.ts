import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_k6rdmisz", "_TZE204_k6rdmisz"]),
        model: "TR-M2Z",
        vendor: "MAZDA",
        description: "Thermostatic radiator valve",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "2000"})],
        exposes: [
            e.battery(),
            e.child_lock(),
            e
                .binary("window_detection", ea.STATE_SET, "ON", "OFF")
                .withDescription("Enables/disables window detection on the device")
                .withCategory("config"),
            e.window_open(),
            tuya.exposes.frostProtection(),
            e.binary("alarm_switch", ea.STATE, "ON", "OFF").withDescription("Thermostat in error state"),
            e.comfort_temperature().withValueMin(5).withValueMax(35).withDescription("Comfort mode temperature").withCategory("config"),
            e.eco_temperature().withValueMin(5).withValueMax(35).withDescription("Eco mode temperature").withCategory("config"),
            e.holiday_temperature().withValueMin(5).withValueMax(35).withDescription("Holiday mode temperature").withCategory("config"),
            e
                .numeric("temperature_sensitivity", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0.5)
                .withValueMax(5)
                .withValueStep(0.5)
                .withDescription("Temperature sensitivity"),
            e
                .climate()
                .withSystemMode(["off", "heat"], ea.STATE_SET, "Basic modes")
                .withLocalTemperature(ea.STATE)
                .withSetpoint("current_heating_setpoint", 5, 35, 0.5, ea.STATE_SET)
                .withPreset(["schedule", "eco", "comfort", "frost_protection", "holiday"])
                .withRunningState(["idle", "heat"], ea.STATE)
                .withSystemMode(["off", "heat"], ea.STATE, "Only for Homeassistant")
                .withLocalTemperatureCalibration(-9.5, 15, 0.5, ea.STATE_SET),
            ...tuya.exposes.scheduleAllDays(ea.STATE_SET, "HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    2,
                    null,
                    tuya.valueConverter.thermostatSystemModeAndPresetMap({
                        fromMap: {
                            0: {deviceMode: "manual", systemMode: "heat", preset: "none"},
                            1: {deviceMode: "schedule", systemMode: "heat", preset: "schedule"},
                            2: {deviceMode: "eco", systemMode: "heat", preset: "eco"},
                            3: {deviceMode: "comfort", systemMode: "heat", preset: "comfort"},
                            4: {deviceMode: "frost_protection", systemMode: "heat", preset: "frost_protection"},
                            5: {deviceMode: "holiday", systemMode: "heat", preset: "holiday"},
                            6: {deviceMode: "off", systemMode: "off", preset: "none"},
                        },
                    }),
                ],
                [
                    2,
                    "system_mode",
                    tuya.valueConverter.thermostatSystemModeAndPresetMap({
                        toMap: {
                            heat: new tuya.Enum(0), // manual
                            off: new tuya.Enum(6), // off
                        },
                    }),
                ],
                [
                    2,
                    "preset",
                    tuya.valueConverter.thermostatSystemModeAndPresetMap({
                        toMap: {
                            none: new tuya.Enum(0), // manual
                            schedule: new tuya.Enum(1), // schedule
                            eco: new tuya.Enum(2), // eco
                            comfort: new tuya.Enum(3), // comfort
                            frost_protection: new tuya.Enum(4), // frost_protection
                            holiday: new tuya.Enum(5), // holiday
                        },
                    }),
                ],
                [3, "running_state", tuya.valueConverterBasic.lookup({heat: 1, idle: 0})],
                [4, "current_heating_setpoint", tuya.valueConverter.divideBy10],
                [5, "local_temperature", tuya.valueConverter.divideBy10],
                [6, "battery", tuya.valueConverter.raw],
                [7, "child_lock", tuya.valueConverter.lockUnlock],
                [103, "eco_temperature", tuya.valueConverter.divideBy10],
                [104, "comfort_temperature", tuya.valueConverter.divideBy10],
                [105, "frost_temperature", tuya.valueConverter.divideBy10],
                [102, "temperature_sensitivity", tuya.valueConverter.divideBy10],
                [21, "holiday_temperature", tuya.valueConverter.divideBy10],
                [14, "window_detection", tuya.valueConverter.onOff],
                [15, "window_open", tuya.valueConverter.trueFalseEnum0],
                [35, "alarm_switch", tuya.valueConverter.onOff],
                [36, "frost_protection", tuya.valueConverter.onOff],
                [28, "schedule_monday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1, 6)],
                [29, "schedule_tuesday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2, 6)],
                [30, "schedule_wednesday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3, 6)],
                [31, "schedule_thursday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4, 6)],
                [32, "schedule_friday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5, 6)],
                [33, "schedule_saturday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6, 6)],
                [34, "schedule_sunday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7, 6)],
                [47, "local_temperature_calibration", tuya.valueConverter.localTempCalibration3],
            ],
        },
    },
];
