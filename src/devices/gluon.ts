import type {ThermostatSystemMode} from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_d2nady2a", "_TZE204_d2nady2a"]),
        model: "ST001",
        vendor: "Gluon",
        description: "FCU thermostat with minimum temperature limit",
        extend: [tuya.modernExtend.tuyaBase({dp: true, forceTimeUpdates: true, timeStart: "1970"})],
        options: [
            e
                .enum("control_sequence_of_operation", ea.SET, ["cooling_only", "cooling_and_heating"])
                .withLabel("Device Configuration")
                .withDescription("Report either cooling and fan or cooling, heating and fan capability."),
            e
                .binary("expose_device_state", ea.SET, true, false)
                .withLabel("Expose device switch")
                .withDescription("Expose a separate on/off switch, instead of including it in system mode."),
            e
                .binary("wake_before_power_transition", ea.SET, true, false)
                .withLabel("Wake before Power Transition")
                .withDescription("Send a wake-up command before turning the device on or/off, required for some firmware revisions."),
        ],
        exposes: (device, options) => {
            const system_modes: ThermostatSystemMode[] = ["off", "cool", "heat", "fan_only"];

            // Device can operate either in cooling or heating/cooling configuration
            // For cooling only configurations remove 'heat' mode
            if (options.control_sequence_of_operation === "cooling_only") {
                system_modes.splice(2, 1);
            }

            const exposes = [
                e
                    .climate()
                    .withLocalTemperature(ea.STATE)
                    .withSystemMode(system_modes, ea.STATE_SET)
                    .withFanMode(["low", "medium", "high", "auto"], ea.STATE_SET)
                    .withSetpoint("current_heating_setpoint", 5, 35, 1, ea.STATE_SET)
                    .withPreset(["auto", "manual"])
                    .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET),
                e.child_lock(),
                e
                    .numeric("min_temperature", ea.STATE_SET)
                    .withUnit("°C")
                    .withValueMin(5)
                    .withValueMax(20)
                    .withDescription("Lowest setpoint that can be selected"),
                e.max_temperature().withValueMin(30).withValueMax(45),
                e.numeric("deadzone_temperature", ea.STATE_SET).withUnit("°C").withValueMin(1).withValueMax(5).withDescription("Hysteresis"),
                e.text("schedule_text", ea.STATE_SET).withDescription(
                    `Weekly schedule in the format "HH:MM/TT HH:MM/TT ...".
                    Example for 12 segments:
                    "06:00/20 11:30/21 13:30/22 17:30/23 06:00/24 12:00/23 14:30/22 17:30/21 06:00/19 12:30/20 14:30/21 18:30/20".
                    Each segment contains:
                    - HH:MM: Time in 24-hour format.
                    - TT: Temperature in °C.
                    Ensure all 12 segments are defined and separated by spaces.`,
                ),
            ];

            if (options.expose_device_state === true) {
                exposes.unshift(e.binary("state", ea.STATE_SET, "ON", "OFF").withDescription("Turn the thermostat ON or OFF"));
            }

            return exposes;
        },
        meta: {
            publishDuplicateTransaction: true,
            tuyaDatapoints: [
                [
                    1,
                    "state",
                    {
                        to: async (v: string, meta: Tz.Meta) => {
                            if (meta.options.expose_device_state === true) {
                                await tuya.sendDataPointBool(
                                    meta.device.endpoints[0],
                                    1,
                                    utils.getFromLookup(v, {on: true, off: false}),
                                    "dataRequest",
                                    1,
                                );
                            }
                        },
                        from: (v: boolean, meta: Fz.Meta, options: KeyValue) => {
                            meta.state.system_mode = v === true ? (meta.state.system_mode_device ?? "cool") : "off";
                            if (options.expose_device_state === true) return v === true ? "ON" : "OFF";
                            delete meta.state.state;
                        },
                    },
                ],
                [
                    2,
                    "system_mode",
                    {
                        to: async (v: string, meta: Tz.Meta) => {
                            const ep = meta.device.endpoints[0];

                            if (v === "off") {
                                if (meta.options.wake_before_power_transition === true) {
                                    await tuya.sendDataPointBool(ep, 1, true, "dataRequest", 1);
                                    await utils.sleep(120);
                                }

                                await tuya.sendDataPointBool(ep, 1, false, "dataRequest", 1);
                                return;
                            }

                            if (meta.options.wake_before_power_transition === true) {
                                if (meta.state.system_mode === "off") {
                                    await tuya.sendDataPointBool(ep, 1, true, "dataRequest", 1);
                                    await utils.sleep(120);
                                }
                            }

                            await tuya.sendDataPointBool(ep, 1, true, "dataRequest", 1);

                            if (v === "cool") await tuya.sendDataPointEnum(ep, 2, 0, "dataRequest", 1);
                            if (v === "heat") await tuya.sendDataPointEnum(ep, 2, 1, "dataRequest", 1);
                            if (v === "fan_only") await tuya.sendDataPointEnum(ep, 2, 2, "dataRequest", 1);
                        },
                        from: (v: number, meta: Fz.Meta) => {
                            const modes = ["cool", "heat", "fan_only"];
                            meta.state.system_mode_device = modes[v];
                            return modes[v];
                        },
                    },
                ],
                [16, "current_heating_setpoint", tuya.valueConverter.raw],
                [19, "max_temperature", tuya.valueConverter.raw],
                [24, "local_temperature", tuya.valueConverter.divideBy10],
                [26, "min_temperature", tuya.valueConverter.raw],
                [27, "local_temperature_calibration", tuya.valueConverter.localTemperatureCalibration],
                [40, "child_lock", tuya.valueConverter.lockUnlock],
                [
                    49,
                    "fan_mode",
                    tuya.valueConverterBasic.lookup({
                        low: tuya.enum(0),
                        medium: tuya.enum(1),
                        high: tuya.enum(2),
                        auto: tuya.enum(3),
                    }),
                ],
                [
                    101,
                    "schedule",
                    {
                        from: (v: number[], meta: Fz.Meta) => {
                            const format = (data: number[]) =>
                                data.reduce((txt: string, val: number, i: number) => {
                                    if (i % 3 === 0) return `${txt}${i > 0 ? " " : ""}${val.toString().padStart(2, "0")}`;
                                    if (i % 3 === 1) return `${txt}:${val.toString().padStart(2, "0")}`;
                                    return `${txt}/${val / 2}`;
                                }, "");

                            const weekdays = format(v.slice(0, 12));
                            const saturday = format(v.slice(12, 24));
                            const sunday = format(v.slice(24, 36));

                            const full = `${weekdays} ${saturday} ${sunday}`.trim();
                            meta.state.schedule_text = full;
                            return full;
                        },
                    },
                ],
                [102, "deadzone_temperature", tuya.valueConverter.raw],
                [
                    103,
                    "preset",
                    {
                        to: async (v: string, meta: Tz.Meta) => {
                            await tuya.sendDataPointBool(meta.device.endpoints[0], 103, v === "manual");
                        },
                        from: (v: boolean, meta: Fz.Meta) => {
                            const preset = v ? "manual" : "auto";
                            meta.state.preset = preset;
                            return preset;
                        },
                    },
                ],
                [
                    202,
                    "schedule_text",
                    {
                        to: async (v: string, meta: Tz.Meta) => {
                            const regex = /((?<h>[01][0-9]|2[0-3]):(?<m>[0-5][0-9])\/(?<t>[0-3]?[0-9](\.[0,5])?))/gm;
                            const matches = [...v.matchAll(regex)];
                            if (matches.length !== 12) return;

                            const result: number[] = [];
                            for (const m of matches) {
                                result.push(Number(m.groups?.h));
                                result.push(Number(m.groups?.m));
                                result.push(Number(m.groups?.t) * 2);
                            }

                            await tuya.sendDataPointRaw(meta.device.endpoints[0], 101, Buffer.from(result));
                        },
                    },
                ],
            ],
        },
    },
];
