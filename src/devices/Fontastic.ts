import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Tuya} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

/**
 * Decodes the weekly schedule datapoints (DP 123-129): the first byte holds the number of
 * transitions, each transition consists of 2 byte minutes since midnight (BE) followed by
 * 2 byte temperature * 10 (BE).
 */
const scheduleDay: Tuya.ValueConverterSingle = {
    from: (v: number[]) => {
        const transitions: string[] = [];
        for (let i = 1; i < 1 + v[0] * 4; i += 4) {
            const minutes = (v[i] << 8) | v[i + 1];
            const temperature = (((v[i + 2] << 8) | v[i + 3]) / 10).toFixed(1);
            transitions.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}/${temperature}`);
        }
        return transitions.join(" ");
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("fmeg60f\u0000", ["_TYST11_yfmeg60f"]),
        model: "Fontastic-TRV",
        vendor: "Fontastic",
        description: "Thermostat radiator valve",
        extend: [tuya.modernExtend.tuyaBase({bindBasicOnConfigure: true, dp: true, timeStart: "2000"})],
        ota: false,
        exposes: [
            e.battery_low(),
            e
                .binary("anti_scaling", ea.STATE_SET, "ON", "OFF")
                .withDescription("Enables/disables bi-weekly anti-scaling feature")
                .withCategory("config"),
            e.child_lock(),
            e.away_mode().withDescription("Temperature drops to 16 °C when activated and restores when off"),
            e.binary("schedule_mode", ea.STATE_SET, true, false).withDescription("Enable/disable the heating schedule"),
            e.binary("window_detection", ea.STATE_SET, "ON", "OFF").withDescription("Enables/disables window detection").withCategory("config"),
            e
                .climate()
                .withLocalTemperatureCalibration(-6, 6, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSetpoint("current_heating_setpoint", 5, 30, 0.5, ea.STATE_SET)
                // No "auto": DP 101 only supports heat (1) and off (0).
                .withSystemMode(["off", "heat"], ea.STATE_SET),
            tuya.exposes.frostProtection(
                'When anti-freezing is active, the temperature is kept at 8 °C and the display shows "AF". Press the pair button to cancel.',
            ),
            ...tuya.exposes.scheduleAllDays(ea.STATE, "00:00/20.0 08:00/16.0 18:00/20.0 22:00/16.0"),
        ],
        meta: {
            tuyaDatapoints: [
                // Only one entry per DP: the from converter uses `find()` and
                // therefore only processes the first entry for each DP.
                [8, "window_detection", tuya.valueConverter.onOff],
                [10, "frost_protection", tuya.valueConverter.onOff],
                [27, "local_temperature_calibration", tuya.valueConverter.raw],
                [40, "child_lock", tuya.valueConverter.lockUnlock],
                // DP 101/106/108 are bool datapoints (values arrive as true/false).
                [101, "system_mode", tuya.valueConverterBasic.lookup({heat: true, off: false})],
                [102, "local_temperature", tuya.valueConverter.divideBy10],
                [103, "current_heating_setpoint", tuya.valueConverter.divideBy10],
                // Bitmap; bit 0 is assumed to indicate low battery, not yet verified with an empty battery.
                [105, "battery_low", {from: (v: number) => (v & 1) === 1}],
                [106, "away_mode", tuya.valueConverter.raw],
                [108, "schedule_mode", tuya.valueConverter.raw],
                // Weekly program, one DP per weekday, read-only for now.
                [123, "schedule_monday", scheduleDay],
                [124, "schedule_tuesday", scheduleDay],
                [125, "schedule_wednesday", scheduleDay],
                [126, "schedule_thursday", scheduleDay],
                [127, "schedule_friday", scheduleDay],
                [128, "schedule_saturday", scheduleDay],
                [129, "schedule_sunday", scheduleDay],
                [130, "anti_scaling", tuya.valueConverter.onOff],
                // DPs 110-122 carry statistics buffers (hourly/weekly/monthly/yearly), they are not mapped.
            ],
        },
    },
];
