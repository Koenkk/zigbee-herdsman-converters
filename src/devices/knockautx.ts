import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_kafooqvr"]),
        model: "WTFHA025",
        vendor: "KnockautX",
        description: "Wall thermostat for underfloor heating",
        extend: [
            tuya.modernExtend.tuyaBase({
                dp: true,
                timeStart: "1970",
            }),
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["heat", "auto"], ea.STATE_SET)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET),
            e.deadzone_temperature().withValueMin(0.5).withValueMax(2.5).withValueStep(0.5),
            e
                .numeric("auto_heating_setpoint", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(5)
                .withValueMax(35)
                .withValueStep(0.5)
                .withDescription("Target temperature for auto / schedule mode"),
        ],
        meta: {
            tuyaDatapoints: [
                [109, "local_temperature_calibration", tuya.valueConverter.divideBy10],
                [110, "deadzone_temperature", tuya.valueConverter.divideBy10],
                [123, "auto_heating_setpoint", tuya.valueConverter.divideBy10],
                [126, "current_heating_setpoint", tuya.valueConverter.divideBy10],
                [127, "local_temperature", tuya.valueConverter.divideBy10],
                [128, "system_mode", tuya.valueConverterBasic.lookup({heat: tuya.enum(0), auto: tuya.enum(1)})],
            ],
        },
    },
];
