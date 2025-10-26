import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_oahqgdig"]),
        model: "ECB62-ZB",
        vendor: "ENGO",
        description: "Control box for underfloor heating system",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "2000"})],
        exposes: [
            e.enum("pump_delay_time", ea.STATE_SET, ["OFF", "3_min", "5_min", "15_min"]).withDescription("Pump shutdown delay"),
            e.binary("zone_1", ea.STATE, "ON", "OFF").withDescription("Zigbee zone 1 heat demand"),
            e.binary("zone_2", ea.STATE, "ON", "OFF").withDescription("Zigbee zone 2 heat demand"),
            e.binary("zone_3", ea.STATE, "ON", "OFF").withDescription("Zigbee zone 3 heat demand"),
            e.binary("zone_4", ea.STATE, "ON", "OFF").withDescription("Zigbee zone 4 heat demand"),
            e.binary("zone_5", ea.STATE, "ON", "OFF").withDescription("Zigbee zone 5 heat demand"),
            e.binary("zone_6", ea.STATE, "ON", "OFF").withDescription("Zigbee zone 6 heat demand"),
            e.binary("zone_a", ea.STATE, "ON", "OFF").withDescription("Wired zone A heat demand"),
            e.binary("zone_b", ea.STATE, "ON", "OFF").withDescription("Wired zone B heat demand"),
            e.binary("boiler_state", ea.STATE, "ON", "OFF").withDescription("Boiler output"),
            e.binary("pump_state", ea.STATE, "ON", "OFF").withDescription("Pump output"),
            e.binary("zone_1_linked", ea.STATE, "ON", "OFF").withDescription("Zone 1 thermostat connection status"),
            e.binary("zone_2_linked", ea.STATE, "ON", "OFF").withDescription("Zone 2 thermostat connection status"),
            e.binary("zone_3_linked", ea.STATE, "ON", "OFF").withDescription("Zone 3 thermostat connection status"),
            e.binary("zone_4_linked", ea.STATE, "ON", "OFF").withDescription("Zone 4 thermostat connection status"),
            e.binary("zone_5_linked", ea.STATE, "ON", "OFF").withDescription("Zone 5 thermostat connection status"),
            e.binary("zone_6_linked", ea.STATE, "ON", "OFF").withDescription("Zone 6 thermostat connection status"),
            e.text("zone_a_name", ea.STATE_SET).withDescription("Custom name for wired zone A"),
            e.text("zone_b_name", ea.STATE_SET).withDescription("Custom name for wired zone B"),
            e.text("zone_1_name", ea.STATE_SET).withDescription("Custom name for zigbee zone 1"),
            e.text("zone_2_name", ea.STATE_SET).withDescription("Custom name for zigbee zone 2"),
            e.text("zone_3_name", ea.STATE_SET).withDescription("Custom name for zigbee zone 3"),
            e.text("zone_4_name", ea.STATE_SET).withDescription("Custom name for zigbee zone 4"),
            e.text("zone_5_name", ea.STATE_SET).withDescription("Custom name for zigbee zone 5"),
            e.text("zone_6_name", ea.STATE_SET).withDescription("Custom name for zigbee zone 6"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "zone_1", tuya.valueConverter.onOff],
                [2, "zone_2", tuya.valueConverter.onOff],
                [3, "zone_3", tuya.valueConverter.onOff],
                [4, "zone_4", tuya.valueConverter.onOff],
                [5, "zone_5", tuya.valueConverter.onOff],
                [6, "zone_6", tuya.valueConverter.onOff],
                [101, "pump_state", tuya.valueConverter.onOff],
                [102, "boiler_state", tuya.valueConverter.onOff],
                [103, "zone_a", tuya.valueConverter.onOff],
                [104, "zone_b", tuya.valueConverter.onOff],
                [105, "zone_1_linked", tuya.valueConverter.onOff],
                [106, "zone_2_linked", tuya.valueConverter.onOff],
                [107, "zone_3_linked", tuya.valueConverter.onOff],
                [108, "zone_4_linked", tuya.valueConverter.onOff],
                [109, "zone_5_linked", tuya.valueConverter.onOff],
                [110, "zone_6_linked", tuya.valueConverter.onOff],
                [111, "zone_a_name", tuya.valueConverter.raw],
                [112, "zone_b_name", tuya.valueConverter.raw],
                [113, "zone_1_name", tuya.valueConverter.raw],
                [114, "zone_2_name", tuya.valueConverter.raw],
                [115, "zone_3_name", tuya.valueConverter.raw],
                [116, "zone_4_name", tuya.valueConverter.raw],
                [117, "zone_5_name", tuya.valueConverter.raw],
                [118, "zone_6_name", tuya.valueConverter.raw],
                [
                    119,
                    "pump_delay_time",
                    tuya.valueConverterBasic.lookup({
                        OFF: tuya.enum(0),
                        "3_min": tuya.enum(1),
                        "5_min": tuya.enum(2),
                        "15_min": tuya.enum(3),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_djurk6p5"]),
        model: "EONE",
        vendor: "ENGO",
        description: "Smart thermostat",
        extend: [tuya.modernExtend.tuyaBase({dp: true, forceTimeUpdates: true, timeStart: "1970"})],
        options: [
            e.binary("expose_device_state", ea.SET, true, false).withDescription("Expose device power state as a separate property when enabled."),
        ],
        exposes: (device, options) => {
            const exposesList = [
                e
                    .climate()
                    .withSetpoint("current_heating_setpoint", 5, 45, 0.5, ea.STATE_SET)
                    .withLocalTemperature(ea.STATE)
                    .withLocalTemperatureCalibration(-3.5, 3.5, 0.5, ea.STATE_SET)
                    .withSystemMode(["off", "heat", "cool"], ea.STATE_SET)
                    .withRunningState(["idle", "heat", "cool"], ea.STATE)
                    .withPreset(["manual", "schedule", "holiday", "temporary", "occupancy_off", "frost"]),
                e.max_temperature().withValueMin(5).withValueMax(45),
                e.min_temperature().withValueMin(5).withValueMax(45),
                e.humidity(),
                e.battery(),
                e.child_lock(),
                e.enum("sensor_choose", ea.STATE_SET, ["internal", "floor", "external", "occupancy"]).withDescription("Temperature input source"),
                e.numeric("brightness", ea.STATE_SET).withUnit("%").withValueMin(10).withValueMax(100).withValueStep(10),
                e
                    .enum("control_algorithm", ea.STATE_SET, [
                        "TPI_UFH",
                        "TPI_RAD",
                        "TPI_ELE",
                        "HIS_02",
                        "HIS_04",
                        "HIS_06",
                        "HIS_08",
                        "HIS_10",
                        "HIS_20",
                        "HIS_30",
                        "HIS_40",
                    ])
                    .withDescription("Control algorithm used to regulate temperature"),
                e
                    .numeric("frost_set", ea.STATE_SET)
                    .withUnit("°C")
                    .withValueMin(5)
                    .withValueMax(17)
                    .withValueStep(0.5)
                    .withDescription("Frost protection setpoint"),
                e
                    .numeric("holiday_temp_set", ea.STATE_SET)
                    .withUnit("°C")
                    .withValueMin(5)
                    .withValueMax(45)
                    .withValueStep(0.5)
                    .withDescription("Target temperature during holiday mode"),
                e
                    .numeric("holiday_days_set", ea.STATE_SET)
                    .withUnit("day")
                    .withValueMin(1)
                    .withValueMax(30)
                    .withValueStep(1)
                    .withDescription("Number of days for holiday"),
                e.binary("valve_protection", ea.STATE_SET, "ON", "OFF").withDescription("Prevents valve blockage during long periods of inactivity."),
                e
                    .enum("warm_floor", ea.STATE_SET, ["OFF", "7_min", "11_min", "15_min", "19_min", "23_min"])
                    .withDescription("Automatically warms the floor every 60 minutes."),
                e.enum("sensor_error", ea.STATE, ["Normal", "E1", "E2"]).withDescription("Sensor error indicator."),
                ...tuya.exposes.scheduleAllDays(ea.STATE_SET, "HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C"),
            ];

            if (options?.expose_device_state === true) {
                exposesList.unshift(e.binary("state", ea.STATE_SET, "ON", "OFF").withDescription("Turn the thermostat ON or OFF"));
            }
            return exposesList;
        },
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    "state",
                    {
                        to: async (value, meta) => {
                            if (meta.options?.expose_device_state === true) {
                                await tuya.sendDataPointBool(
                                    meta.device.endpoints[0],
                                    1,
                                    utils.getFromLookup(value, {on: true, off: false}),
                                    "dataRequest",
                                    1,
                                );
                            }
                        },
                        from: (value, meta, options) => {
                            const isOn = value === true;
                            meta.state.system_mode = isOn ? (meta.state.system_mode_device ?? "heat") : "off";

                            if (options?.expose_device_state === true) {
                                return isOn ? "ON" : "OFF";
                            }
                            meta.state.state = undefined;
                        },
                    },
                ],

                [
                    2,
                    "system_mode",
                    {
                        to: async (value, meta) => {
                            const entity = meta.device.endpoints[0];
                            await tuya.sendDataPointBool(entity, 1, value !== "off", "dataRequest", 1);
                            switch (value) {
                                case "heat":
                                    await tuya.sendDataPointEnum(entity, 2, 0, "dataRequest", 1);
                                    break;
                                case "cool":
                                    await tuya.sendDataPointEnum(entity, 2, 1, "dataRequest", 1);
                                    break;
                            }
                        },
                        from: (value, meta) => {
                            const modes = ["heat", "cool"];
                            const mode = modes[value];
                            meta.state.system_mode_device = mode;
                            const fallbackMode = "heat";
                            return mode ?? fallbackMode;
                        },
                    },
                ],

                [
                    3,
                    "running_state",
                    tuya.valueConverterBasic.lookup(
                        {
                            heat: tuya.enum(1),
                            cool: tuya.enum(3),
                        },
                        "idle",
                    ),
                ],
                [16, "current_heating_setpoint", tuya.valueConverter.divideBy10],
                [19, "max_temperature", tuya.valueConverter.divideBy10],
                [24, "local_temperature", tuya.valueConverter.divideBy10],
                [26, "min_temperature", tuya.valueConverter.divideBy10],
                [27, "local_temperature_calibration", tuya.valueConverter.raw],
                [32, "holiday_temp_set", tuya.valueConverter.divideBy10],
                [33, "holiday_days_set", tuya.valueConverter.raw],
                [34, "humidity", tuya.valueConverter.raw],
                [35, "battery", tuya.valueConverter.raw],
                [40, "child_lock", tuya.valueConverter.lockUnlock],
                [
                    43,
                    "sensor_choose",
                    tuya.valueConverterBasic.lookup({
                        internal: tuya.enum(0),
                        floor: tuya.enum(1),
                        external: tuya.enum(2),
                        occupancy: tuya.enum(3),
                    }),
                ],
                [44, "brightness", tuya.valueConverter.raw],
                [
                    58,
                    "preset",
                    tuya.valueConverterBasic.lookup(
                        {
                            manual: tuya.enum(0),
                            schedule: tuya.enum(1),
                            holiday: tuya.enum(2),
                            temporary: tuya.enum(3),
                            occupancy_off: tuya.enum(4),
                            frost: tuya.enum(5),
                        },
                        "manual",
                    ),
                ],
                [
                    101,
                    "control_algorithm",
                    tuya.valueConverterBasic.lookup({
                        TPI_UFH: tuya.enum(0),
                        TPI_RAD: tuya.enum(1),
                        TPI_ELE: tuya.enum(2),
                        HIS_02: tuya.enum(3),
                        HIS_04: tuya.enum(4),
                        HIS_06: tuya.enum(5),
                        HIS_08: tuya.enum(6),
                        HIS_10: tuya.enum(7),
                        HIS_20: tuya.enum(8),
                        HIS_30: tuya.enum(9),
                        HIS_40: tuya.enum(10),
                    }),
                ],
                [106, "frost_set", tuya.valueConverter.divideBy10],
                [107, "valve_protection", tuya.valueConverter.onOff],
                [109, "schedule_monday", tuya.valueConverter.thermostatScheduleDayMultiDPWithTransitionCount(6)],
                [110, "schedule_tuesday", tuya.valueConverter.thermostatScheduleDayMultiDPWithTransitionCount(6)],
                [111, "schedule_wednesday", tuya.valueConverter.thermostatScheduleDayMultiDPWithTransitionCount(6)],
                [112, "schedule_thursday", tuya.valueConverter.thermostatScheduleDayMultiDPWithTransitionCount(6)],
                [113, "schedule_friday", tuya.valueConverter.thermostatScheduleDayMultiDPWithTransitionCount(6)],
                [114, "schedule_saturday", tuya.valueConverter.thermostatScheduleDayMultiDPWithTransitionCount(6)],
                [115, "schedule_sunday", tuya.valueConverter.thermostatScheduleDayMultiDPWithTransitionCount(6)],
                [
                    118,
                    "warm_floor",
                    tuya.valueConverterBasic.lookup({
                        OFF: tuya.enum(0),
                        "7_min": tuya.enum(1),
                        "11_min": tuya.enum(2),
                        "15_min": tuya.enum(3),
                        "19_min": tuya.enum(4),
                        "23_min": tuya.enum(5),
                    }),
                ],
                [
                    120,
                    "sensor_error",
                    tuya.valueConverterBasic.lookup({
                        Normal: tuya.enum(0),
                        E1: tuya.enum(1),
                        E2: tuya.enum(2),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_cmyc8g5i"]),
        model: "E25-230",
        vendor: "ENGO",
        description: "Smart thermostat",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.binary("state", ea.STATE_SET, "ON", "OFF").withDescription("Turn the thermostat ON/OFF"),
            e
                .climate()
                .withSystemMode(["heat", "cool"], ea.STATE_SET)
                .withSetpoint("current_heating_setpoint", 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-3.5, 3.5, 0.5, ea.STATE_SET)
                .withRunningState(["idle", "heat", "cool"], ea.STATE)
                .withPreset(["Manual", "Frost"]),
            e
                .enum("control_algorithm", ea.STATE_SET, [
                    "TPI_UFH",
                    "TPI_RAD",
                    "TPI_ELE",
                    "HIS_04",
                    "HIS_08",
                    "HIS_12",
                    "HIS_16",
                    "HIS_20",
                    "HIS_30",
                    "HIS_40",
                ])
                .withDescription("Sets the control algorithim of the thermostat"),
            e.max_temperature().withValueMin(5).withValueMax(35),
            e.min_temperature().withValueMin(5).withValueMax(35),
            e.child_lock(),
            e.binary("valve_protection", ea.STATE_SET, "ON", "OFF").withDescription("Enable valve protection"),
            e.enum("relay_mode", ea.STATE_SET, ["NO", "NC", "OFF"]).withDescription("Sets the internal relay function"),
            e
                .numeric("backlight", ea.STATE_SET)
                .withDescription("Set the backlight brightness of the thermostat.")
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(10),
            e
                .numeric("frost_set", ea.STATE_SET)
                .withDescription("Set the frost protection temperature.")
                .withUnit("°C")
                .withValueMin(5)
                .withValueMax(17)
                .withValueStep(0.5),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [2, "system_mode", tuya.valueConverterBasic.lookup({heat: tuya.enum(0), cool: tuya.enum(1)})],
                [
                    3,
                    "running_state",
                    tuya.valueConverterBasic.lookup({heat: tuya.enum(2), cool: tuya.enum(3), idle: tuya.enum(4), idle_c: tuya.enum(5)}),
                ],
                [16, "current_heating_setpoint", tuya.valueConverter.divideBy10],
                [19, "max_temperature", tuya.valueConverter.divideBy10],
                [24, "local_temperature", tuya.valueConverter.divideBy10],
                [26, "min_temperature", tuya.valueConverter.divideBy10],
                [27, "local_temperature_calibration", tuya.valueConverter.divideBy10],
                [40, "child_lock", tuya.valueConverter.lockUnlock],
                [44, "backlight", tuya.valueConverter.raw],
                [
                    58,
                    "preset",
                    tuya.valueConverterBasic.lookup({
                        Manual: tuya.enum(0),
                        Frost: tuya.enum(3),
                    }),
                ],
                [
                    101,
                    "control_algorithm",
                    tuya.valueConverterBasic.lookup({
                        TPI_UFH: tuya.enum(0),
                        TPI_RAD: tuya.enum(1),
                        TPI_ELE: tuya.enum(2),
                        HIS_04: tuya.enum(3),
                        HIS_08: tuya.enum(4),
                        HIS_12: tuya.enum(5),
                        HIS_16: tuya.enum(6),
                        HIS_20: tuya.enum(8),
                        HIS_30: tuya.enum(9),
                        HIS_40: tuya.enum(10),
                    }),
                ],
                [106, "frost_set", tuya.valueConverter.divideBy10],
                [107, "valve_protection", tuya.valueConverter.onOff],
                [
                    108,
                    "relay_mode",
                    tuya.valueConverterBasic.lookup({
                        NO: tuya.enum(0),
                        NC: tuya.enum(1),
                        OFF: tuya.enum(2),
                    }),
                ],
            ],
        },
    },
];
