import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            ...tuya.fingerprint("GbxAXL2\u0000", ["_TYST11_KGbxAXL2"]),
            ...tuya.fingerprint("uhszj9s\u0000", ["_TYST11_zuhszj9s"]),
            ...tuya.fingerprint("88teujp\u0000", ["_TYST11_c88teujp"]),
            ...tuya.fingerprint("w7cahqs\u0000", ["_TYST11_yw7cahqs"]),
            ...tuya.fingerprint("w7cahqs", ["_TYST11_yw7cahqs"]),
            ...tuya.fingerprint("TS0601", [
                "_TZE200_c88teujp",
                "_TZE200_yw7cahqs",
                "_TZE200_azqp6ssj",
                "_TZE200_zuhszj9s",
                "_TZE200_9gvruqf5",
                "_TZE200_zr9c0day",
                "_TZE200_0dvm9mva",
                "_TZE284_0dvm9mva",
                "_TZE200_h4cgnbzg",
                "_TZE200_gd4rvykv",
                "_TZE200_exfrnlow",
                "_TZE200_9m4kmbfu",
                "_TZE284_9m4kmbfu",
                "_TZE200_3yp57tby",
                "_TZE200_7p8ugv8d",
                "_TZE284_3yp57tby",
            ]),
            ...tuya.fingerprint("aj4jz0i\u0000", ["_TYST11_caj4jz0i"]),
        ],
        model: "SEA801-Zigbee/SEA802-Zigbee",
        vendor: "Saswell",
        description: "Thermostatic radiator valve",
        whiteLabel: [
            {vendor: "HiHome", model: "WZB-TRVL"},
            {vendor: "Hama", model: "00176592"},
            {vendor: "Maginon", model: "WT-1"},
            {vendor: "RTX", model: "ZB-RT1"},
            {vendor: "SETTI+", model: "TRV001"},
            {vendor: "Royal Thermo", model: "RTE 77.001B"},
        ],
        fromZigbee: [legacy.fz.saswell_thermostat, fz.ignore_tuya_set_time, legacy.fz.tuya_thermostat_weekly_schedule_2],
        toZigbee: [
            legacy.tz.saswell_thermostat_current_heating_setpoint,
            legacy.tz.saswell_thermostat_mode,
            legacy.tz.saswell_thermostat_away,
            legacy.tz.saswell_thermostat_child_lock,
            legacy.tz.saswell_thermostat_window_detection,
            legacy.tz.saswell_thermostat_frost_detection,
            legacy.tz.saswell_thermostat_calibration,
            legacy.tz.saswell_thermostat_anti_scaling,
            legacy.tz.tuya_thermostat_weekly_schedule,
        ],
        extend: [tuya.modernExtend.tuyaBase({bindBasicOnConfigure: true, timeStart: "1970"})],
        meta: {
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleConversion: "saswell",
            },
        },
        exposes: [
            e.battery_low(),
            e.binary("anti_scaling", ea.STATE_SET, "ON", "OFF").withDescription("Enables/disables bi-weekly anti-scaling feature"),
            e.window_detection(),
            e.child_lock(),
            e.away_mode(),
            e.binary("heating", ea.STATE, "ON", "OFF").withDescription("Device valve is open or closed (heating or not)"),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "heat", "auto"], ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE)
                // Range is -6 - 6 and step 1: https://github.com/Koenkk/zigbee2mqtt/issues/11777
                .withLocalTemperatureCalibration(-6, 6, 1, ea.STATE_SET),
        ],
    },
];
