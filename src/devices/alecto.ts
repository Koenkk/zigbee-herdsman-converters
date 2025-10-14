import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [...tuya.fingerprint("daqwrsj\u0000", ["_TYST11_8daqwrsj"]), ...tuya.fingerprint("TS0601", ["_TZE200_8daqwrsj"])],
        model: "SMART-HEAT10",
        vendor: "Alecto",
        description: "Radiator valve with thermostat",
        fromZigbee: [legacy.fz.tuya_thermostat],
        meta: {
            tuyaThermostatSystemMode: legacy.thermostatSystemModes4,
            tuyaThermostatPreset: legacy.thermostatPresets,
            tuyaThermostatPresetToSystemMode: legacy.thermostatSystemModes4,
        },
        toZigbee: [
            legacy.tz.tuya_thermostat_child_lock,
            legacy.tz.siterwell_thermostat_window_detection,
            legacy.tz.tuya_thermostat_current_heating_setpoint,
            legacy.tz.tuya_thermostat_system_mode,
        ],
        exposes: [
            e.child_lock(),
            e.window_detection(),
            e.battery(),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "auto", "heat"], ea.STATE_SET),
        ],
    },
    {
        fingerprint: [...tuya.fingerprint("tbrwrfv\u0000", ["_TYST11_qtbrwrfv"]), ...tuya.fingerprint("TS0601", ["_TZE200_qtbrwrfv"])],
        model: "SMART-SMOKE10",
        vendor: "Alecto",
        description: "Smoke detector",
        fromZigbee: [legacy.fz.tuya_alecto_smoke],
        toZigbee: [legacy.tz.tuya_alecto_smoke],
        meta: {},
        exposes: [
            e.enum("smoke_state", ea.STATE, ["alarm", "normal"]),
            e.enum("battery_state", ea.STATE, ["low", "middle", "high"]),
            e.enum("checking_result", ea.STATE, ["checking", "check_success", "check_failure", "others"]),
            e.numeric("smoke_value", ea.STATE),
            e.numeric("battery", ea.STATE),
            e.binary("lifecycle", ea.STATE, true, false),
            e.binary("self_checking", ea.STATE_SET, true, false),
            e.binary("silence", ea.STATE_SET, true, false),
        ],
    },
];
