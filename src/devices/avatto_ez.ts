import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;
const baseExtend = tuya.modernExtend.tuyaBase({dp: true});
const baseFromZigbeeArray = baseExtend.fromZigbee;

const fzLocal = {
    levelUpdateState: {
        cluster: "manuSpecificTuya",
        type: ["commandDataResponse", "commandDataReport", "commandActiveStatusReport", "commandActiveStatusReportAlt"],
        convert: (model, msg, publish, options, meta) => {
            for (const dpValue of msg.data.dpValues) {
                if (dpValue.dp === 102 && dpValue.datatype === tuya.dataTypes.enum) {
                    const parsedValue = dpValue.data[0];
                    const stateValue = parsedValue === 0 ? "OFF" : "ON";
                    publish({state: stateValue});
                }
            }

            return null;
        },
    } satisfies Fz.Converter<
        "manuSpecificTuya",
        undefined,
        ["commandDataResponse", "commandDataReport", "commandActiveStatusReport", "commandActiveStatusReportAlt"]
    >,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_udaucpdi"]),
        model: "ZBS16",
        vendor: "AVATTO",
        description: "Smart Boiler Switch",
        extend: [baseExtend],
        fromZigbee: [fzLocal.levelUpdateState, ...baseFromZigbeeArray],
        exposes: [
            tuya.exposes.switch(),
            e.energy(),
            e.power(),
            e.voltage(),
            e.numeric("current", ea.STATE).withUnit("mA").withDescription("Instantaneous measured electrical current"),
            e.ac_frequency(),
            e
                .enum("switch_on_time", ea.STATE_SET, ["off", "30 minutes", "60 minutes", "90 minutes", "120 minutes", "on"])
                .withDescription("Switch on time selection"),
            e
                .numeric("countdown", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(7210)
                .withValueStep(1)
                .withUnit("seconds")
                .withDescription("Countdown to turn device off after a certain time"),
            e.numeric("total_switch_on_time", ea.STATE).withUnit("minutes").withDescription("Total switch on time"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverter.onOff],
                [20, "energy", tuya.valueConverter.divideBy1000],
                [21, "current", tuya.valueConverter.raw],
                [22, "power", tuya.valueConverter.divideBy10],
                [23, "voltage", tuya.valueConverter.divideBy10],
                [101, "ac_frequency", tuya.valueConverter.divideBy10],
                [
                    102,
                    "switch_on_time",
                    tuya.valueConverterBasic.lookup({
                        off: tuya.enum(0),
                        "30 minutes": tuya.enum(1),
                        "60 minutes": tuya.enum(2),
                        "90 minutes": tuya.enum(3),
                        "120 minutes": tuya.enum(4),
                        on: tuya.enum(5),
                    }),
                ],
                [103, "countdown", tuya.valueConverter.raw],
                [104, "total_switch_on_time", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_ty5neqqo"]),
        model: "TRV60_thermostat",
        vendor: "AVATTO",
        description: "Screen thermostatic radiator valve",
        extend: [tuya.modernExtend.tuyaBase({dp: true, forceTimeUpdates: true})],
        exposes: [
            e.enum("mode", ea.STATE_SET, ["auto", "manual"]).withDescription("Mode"),
            e.enum("work_state", ea.STATE_SET, ["opened", "closed"]).withDescription("Work state"),
            e.child_lock(),
            e.battery(),
            e.window_detection_bool(),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-3, 3, 1, ea.STATE_SET),
            e.numeric("fault", ea.STATE).withDescription("Raw fault code"),
            e
                .binary("frost_protection", ea.STATE_SET, "ON", "OFF")
                .withDescription(
                    "When the room temperature is lower than 5 ℃, the valve opens; when the temperature rises to 8 ℃, the valve closes.",
                ),
            e.binary("scale_protection", ea.STATE_SET, "ON", "OFF"),
            e.numeric("valve_volume", ea.STATE).withDescription("The current percentage of valve flow rate."),
            e
                .numeric("humidity", ea.STATE)
                .withDescription("The percentage of humidity collected after adding an external temperature and humidity sensor."),
            e
                .binary("out_door_sensor1", ea.STATE, "ON", "OFF")
                .withDescription("The on-off status of the door magnet after adding the first external door magnet sensor."),
            e
                .binary("out_door_sensor2", ea.STATE, "ON", "OFF")
                .withDescription("The on-off status of the door magnet after adding the second external door magnet sensor."),
            e
                .binary("out_door_sensor3", ea.STATE, "ON", "OFF")
                .withDescription("The on-off status of the door magnet after adding the third external door magnet sensor."),
            e
                .numeric("out_temperature", ea.STATE)
                .withDescription("The percentage of temperature collected after adding an external temperature and humidity sensor."),
            e.enum("screen_orientation", ea.STATE_SET, ["normal", "inverted"]).withDescription("Screen orientation"),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    2,
                    "mode",
                    tuya.valueConverterBasic.lookup({
                        auto: tuya.enum(0),
                        manual: tuya.enum(1),
                    }),
                ],
                [
                    3,
                    "work_state",
                    tuya.valueConverterBasic.lookup({
                        opened: tuya.enum(0),
                        closed: tuya.enum(1),
                    }),
                ],
                [5, "local_temperature", tuya.valueConverter.divideBy10],
                [6, "battery", tuya.valueConverter.raw],
                [7, "child_lock", tuya.valueConverter.lockUnlock],
                [14, "window_detection", tuya.valueConverter.onOff],
                [28, "schedule_monday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1)],
                [29, "schedule_tuesday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2)],
                [30, "schedule_wednesday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3)],
                [31, "schedule_thursday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4)],
                [32, "schedule_friday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5)],
                [33, "schedule_saturday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6)],
                [34, "schedule_sunday", tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7)],
                [35, "fault", tuya.valueConverter.errorOrBatteryLow],
                [36, "frost_protection", tuya.valueConverter.onOff],
                [36, "scale_protection", tuya.valueConverter.onOff],
                [47, "local_temperature_calibration", tuya.valueConverter.localTempCalibration1],
                [101, "valve_volume", tuya.valueConverter.raw], //
                [102, "humidity", tuya.valueConverter.raw], //
                [103, "out_door_sensor1", tuya.valueConverter.onOff], //
                [106, "out_door_sensor2", tuya.valueConverter.onOff], //
                [107, "out_door_sensor3", tuya.valueConverter.onOff], //
                [109, "out_temperature", tuya.valueConverter.divideBy10],
                [
                    117,
                    "screen_orientation",
                    tuya.valueConverterBasic.lookup({
                        normal: tuya.enum(0),
                        inverted: tuya.enum(1),
                    }),
                ],
                [123, "current_heating_setpoint", tuya.valueConverter.divideBy10],
            ],
        },
    },
];
