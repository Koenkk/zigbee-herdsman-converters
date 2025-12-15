import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_ne4pikwm", "_TZE284_ne4pikwm", "_TZE284_hcs66axl"]),
        model: "ZBHTR20WT",
        vendor: "Nedis",
        description: "Thermostat radiator valve",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "1970"})],
        exposes: [
            e.battery_low(),
            e.child_lock(),
            e.open_window(),
            e
                .climate()
                .withLocalTemperatureCalibration(-6, 6, 1, ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withSystemMode(["off", "heat"], ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSetpoint("current_heating_setpoint", 5, 30, 0.5, ea.STATE_SET),
            e
                .binary("frost_protection", ea.STATE_SET, "ON", "OFF")
                .withDescription("This function prevents freezing of the radiator. It automatically switches on the thermostat between 5°C and 8°C."),
            e.binary("schedule_mode", ea.STATE_SET, "ON", "OFF").withDescription("Should the device be on the heating schedule"),
            e
                .binary("scale_protection", ea.STATE_SET, "ON", "OFF")
                .withDescription(
                    "The radiator can scale and become clogged if the valve is not opened regularly. This function opens the valve for 30 seconds every two weeks. The display shows “Rd” during this procedure.",
                ),
            e.binary("leave_home", ea.STATE_SET, "ON", "OFF").withDescription("Temperature drops to 16°C when activated and restores when off"),
            tuya.exposes.errorStatus(),
        ],
        meta: {
            tuyaDatapoints: [
                [3, "running_state", tuya.valueConverterBasic.lookup({heat: tuya.enum(1), idle: tuya.enum(0)})],
                [8, "open_window", tuya.valueConverter.onOff],
                [10, "frost_protection", tuya.valueConverter.onOff],
                [27, "local_temperature_calibration", tuya.valueConverter.localTempCalibration2],
                [40, "child_lock", tuya.valueConverter.lockUnlock],
                [101, "system_mode", tuya.valueConverterBasic.lookup({heat: true, off: false})],
                [102, "local_temperature", tuya.valueConverter.divideBy10],
                [103, "current_heating_setpoint", tuya.valueConverter.divideBy10],
                [105, "battery_low", tuya.valueConverter.trueFalse1], // Not sure if works but no null atm. DP is bitmap?
                [106, "leave_home", tuya.valueConverter.onOff],
                [108, "schedule_mode", tuya.valueConverter.onOff],
                [130, "scale_protection", tuya.valueConverter.onOff], // Not verified, but DP should match
            ],
        },
    },
];
