import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_6ewjlefg"]),
        model: "BVRF-L001",
        vendor: "Beca",
        description: "VRF/VRV central air-conditioning thermostat",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.binary("state", ea.STATE_SET, "ON", "OFF").withDescription("Turn the thermostat on or off independently of the operating mode"),
            e
                .climate()
                .withSystemMode(["cool", "heat", "fan_only", "dry"], ea.STATE_SET)
                .withFanMode(["auto", "low", "medium", "high"], ea.STATE_SET)
                .withSetpoint("current_heating_setpoint", 16, 32, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE),
            e.child_lock(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [
                    2,
                    "system_mode",
                    tuya.valueConverterBasic.lookup({
                        cool: tuya.enum(0),
                        heat: tuya.enum(1),
                        fan_only: tuya.enum(2),
                        dry: tuya.enum(3),
                    }),
                ],
                [
                    16,
                    "current_heating_setpoint",
                    {
                        from: (value: number) => value / 10,
                        to: (value: number) => {
                            if (!Number.isInteger(value) || value < 16 || value > 32) {
                                throw new Error(`current_heating_setpoint must be an integer from 16 to 32 °C: ${value}`);
                            }
                            return value * 10;
                        },
                    },
                ],
                [24, "local_temperature", tuya.valueConverter.divideBy10FromOnly],
                [40, "child_lock", tuya.valueConverter.lockUnlock],
                [
                    49,
                    "fan_mode",
                    tuya.valueConverterBasic.lookup({
                        auto: tuya.enum(0),
                        low: tuya.enum(1),
                        medium: tuya.enum(2),
                        high: tuya.enum(3),
                    }),
                ],
            ],
        },
    },
];
