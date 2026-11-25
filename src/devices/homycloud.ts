import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const acModes = ["auto", "cool", "heat", "dry", "fan_only"];

// AC power (dp 1) and mode (dp 4) are separate datapoints, combine both into a single `system_mode_ac` in which powered off maps to `off`.
const acSystemMode = (meta: Fz.Meta) => (meta.state.ac_power === false ? "off" : ((meta.state.ac_mode as string) ?? "cool"));

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_urvgsb2x"]),
        model: "EPT-A30Z/GY-PL",
        vendor: "HomyCloud",
        description: "3-in-1 thermostat (AC, fresh air and floor heating)",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "1970"})],
        ota: true,
        exposes: [
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 16, 32, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "auto", "cool", "heat", "dry", "fan_only"], ea.STATE_SET)
                .withFanMode(["low", "medium", "high", "auto"], ea.STATE_SET)
                .withEndpoint("ac"),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 16, 32, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "heat"], ea.STATE_SET)
                .withEndpoint("floor"),
            e.switch().withEndpoint("fresh_air").setAccess("state", ea.STATE_SET),
            e.enum("fresh_air_speed", ea.STATE_SET, ["low", "medium", "high"]).withDescription("Fresh air fan speed"),
            e.binary("master_power", ea.STATE_SET, "ON", "OFF").withDescription("Master power for all HVAC systems"),
            e.binary("frost_protection", ea.STATE_SET, "ON", "OFF").withDescription("Low temperature frost protection"),
            e.enum("display_page", ea.STATE_SET, ["ac", "fresh_air", "floor"]).withDescription("Active page on the screen"),
            e.action(["screen_wake"]),
            e.enum("backlight_state", ea.STATE_SET, ["full", "low", "off"]).withCategory("config").withDescription("Idle backlight brightness"),
            e
                .enum("backlight_timeout", ea.STATE_SET, ["always_on", "10s", "30s", "1min", "5min", "10min", "30min"])
                .withCategory("config")
                .withDescription("Backlight idle timeout"),
            e
                .enum("system_config", ea.STATE_SET, ["AC", "HE", "AH", "NF", "AN", "NH", "AL"])
                .withCategory("config")
                .withDescription("Enabled HVAC system combination"),
        ],
        endpoint: () => ({ac: 1, floor: 1, fresh_air: 1}),
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [
                    1,
                    "system_mode_ac",
                    {
                        from: (v: boolean, meta: Fz.Meta) => {
                            meta.state.ac_power = v;
                            return acSystemMode(meta);
                        },
                        to: async (v: string, meta: Tz.Meta) => {
                            utils.validateValue(v, ["off", ...acModes]);
                            const endpoint = meta.device.endpoints[0];
                            await tuya.sendDataPointBool(endpoint, 1, v !== "off", "dataRequest", 1);
                            if (v !== "off") await tuya.sendDataPointEnum(endpoint, 4, acModes.indexOf(v), "dataRequest", 1);
                        },
                    },
                ],
                [2, "current_heating_setpoint_ac", tuya.valueConverter.divideBy10],
                [3, null, {from: (v: number) => ({local_temperature_ac: v / 10, local_temperature_floor: v / 10})}],
                [
                    4,
                    "system_mode_ac",
                    {
                        from: (v: number, meta: Fz.Meta) => {
                            meta.state.ac_mode = acModes[v];
                            return acSystemMode(meta);
                        },
                    },
                ],
                [
                    5,
                    "fan_mode_ac",
                    tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2), auto: tuya.enum(3)}),
                ],
                [101, "master_power", tuya.valueConverter.onOff],
                [102, "frost_protection", tuya.valueConverter.onOff],
                [103, "backlight_state", tuya.valueConverterBasic.lookup({full: tuya.enum(0), low: tuya.enum(1), off: tuya.enum(2)})],
                [
                    104,
                    "backlight_timeout",
                    tuya.valueConverterBasic.lookup({
                        always_on: tuya.enum(0),
                        "10s": tuya.enum(1),
                        "30s": tuya.enum(2),
                        "1min": tuya.enum(3),
                        "5min": tuya.enum(4),
                        "10min": tuya.enum(5),
                        "30min": tuya.enum(6),
                    }),
                ],
                [105, "state_fresh_air", tuya.valueConverter.onOff],
                [106, "fresh_air_speed", tuya.valueConverterBasic.lookup({low: tuya.enum(0), medium: tuya.enum(1), high: tuya.enum(2)})],
                [107, "display_page", tuya.valueConverterBasic.lookup({ac: tuya.enum(0), fresh_air: tuya.enum(1), floor: tuya.enum(2)})],
                [108, "system_mode_floor", tuya.valueConverterBasic.lookup({heat: true, off: false})],
                [109, "current_heating_setpoint_floor", tuya.valueConverter.divideBy10],
                [
                    111,
                    "system_config",
                    tuya.valueConverterBasic.lookup({
                        AC: tuya.enum(0),
                        HE: tuya.enum(1),
                        AH: tuya.enum(2),
                        NF: tuya.enum(3),
                        AN: tuya.enum(4),
                        NH: tuya.enum(5),
                        AL: tuya.enum(6),
                    }),
                ],
                [210, "action", tuya.valueConverterBasic.lookup({screen_wake: 1}, null)],
            ],
        },
    },
];
