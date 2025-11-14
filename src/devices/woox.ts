import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0101", ["_TZ3210_eymunffl"]),
        model: "R7060",
        vendor: "Woox",
        description: "Smart garden irrigation control",
        fromZigbee: [fz.on_off, fz.ignore_tuya_set_time, legacy.fromZigbee.woox_R7060],
        toZigbee: [tz.on_off],
        extend: [tuya.modernExtend.tuyaBase()],
        exposes: [e.switch(), e.battery()],
        meta: {disableDefaultResponse: true},
    },
    {
        fingerprint: tuya.fingerprint("TS0505A", ["_TZ3000_keabpigv"]),
        model: "R9077",
        vendor: "Woox",
        description: "RGB+CCT LED",
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: undefined}, color: true, doNotDisturb: false, colorPowerOnBehavior: false})],
        meta: {applyRedFix: true},
    },
    {
        fingerprint: tuya.fingerprint("TS0201", ["_TZ3000_rusu2vzb", "_TZ3000_amqudjr0"]),
        model: "R7048",
        vendor: "Woox",
        description: "Smart humidity & temperature sensor",
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ["msTemperatureMeasurement", "msRelativeHumidity", "genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_aycxwiau", "_TZE200_bxdyeaa9", "_TZE200_ft523twt"]),
        model: "R7049",
        vendor: "Woox",
        description: "Smart smoke alarm",
        meta: {timeout: 30000, disableDefaultResponse: true},
        fromZigbee: [legacy.fromZigbee.R7049_status, fz.ignore_tuya_set_time],
        toZigbee: [legacy.toZigbee.R7049_silenceSiren, legacy.toZigbee.R7049_testAlarm, legacy.toZigbee.R7049_alarm],
        exposes: [
            e.battery_low(),
            e.binary("smoke", ea.STATE, true, false).withDescription("Smoke alarm status"),
            e.binary("test_alarm", ea.STATE_SET, true, false).withDescription("Test alarm"),
            e.enum("test_alarm_result", ea.STATE, ["checking", "check_success", "check_failure", "others"]).withDescription("Test alarm result"),
            e.enum("battery_level", ea.STATE, ["low", "middle", "high"]).withDescription("Battery level state"),
            e.binary("alarm", ea.STATE_SET, true, false).withDescription("Alarm enable"),
            e.binary("fault_alarm", ea.STATE, true, false).withDescription("Fault alarm status"),
            e.binary("silence_siren", ea.STATE_SET, true, false).withDescription("Silence siren"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0219", ["_TYZB01_ynsiasng", "_TYZB01_bwsijaty", "_TYZB01_rs7ff6o7"]),
        model: "R7051",
        vendor: "Woox",
        description: "Smart siren",
        fromZigbee: [fz.battery, fz.ts0216_siren, fz.ias_alarm_only_alarm_1, fz.power_source],
        toZigbee: [tz.warning, tz.ts0216_volume, tz.ts0216_duration],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.warning(),
            e.binary("alarm", ea.STATE, true, false),
            e.binary("ac_connected", ea.STATE, true, false).withDescription("Is the device plugged in"),
            e.numeric("volume", ea.ALL).withValueMin(0).withValueMax(100).withDescription("Volume of siren"),
            e.numeric("duration", ea.ALL).withValueMin(0).withValueMax(3600).withDescription("Duration of siren"),
        ],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ["genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_wnvhlcgl"]),
        model: "R7067",
        vendor: "Woox",
        description: "Thermostatic radiator valve",
        fromZigbee: [legacy.fromZigbee.woox_thermostat],
        toZigbee: [
            //legacy.tuya_data_point_test
            legacy.toZigbee.woox_thermostat_child_lock,
            legacy.toZigbee.woox_thermostat_current_heating_setpoint,
            legacy.toZigbee.woox_thermostat_system_mode,
            legacy.toZigbee.woox_away_mode,
            legacy.toZigbee.woox_comfort_temperature,
            legacy.toZigbee.woox_eco_temperature,
            legacy.toZigbee.woox_local_temperature_calibration,
            legacy.toZigbee.woox_window_detection_temperature,
            legacy.toZigbee.woox_window_detection_time,
            legacy.toZigbee.woox_boost_heating,
            legacy.toZigbee.woox_holidays_schedule,
            legacy.toZigbee.woox_monday_schedule,
            legacy.toZigbee.woox_tuesday_schedule,
            legacy.toZigbee.woox_wednesday_schedule,
            legacy.toZigbee.woox_thursday_schedule,
            legacy.toZigbee.woox_friday_schedule,
            legacy.toZigbee.woox_saturday_schedule,
            legacy.toZigbee.woox_sunday_schedule,
        ],
        extend: [tuya.modernExtend.tuyaBase({timeStart: "2000"})],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
        },
        exposes: [
            exposes
                .climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint("current_heating_setpoint", 0, 30, 0.5, ea.STATE_SET)
                .withSystemMode(["auto", "heat"], ea.STATE_SET, "auto - Automatic mode. heat - Manual mode.")
                .withPreset(["Comfort", "Eco"]),
            e.away_mode(),
            e.comfort_temperature(),
            e.eco_temperature(),
            exposes.numeric("local_temperature_calibration", ea.STATE_SET).withValueMin(-5.5).withValueMax(5.5).withValueStep(0.1).withUnit("°C"),
            e.child_lock(),
            exposes.binary("window_detection", ea.STATE, "ON", "OFF"),
            exposes.numeric("window_detection_temperature", ea.STATE_SET).withValueMin(0).withValueMax(30).withValueStep(0.5).withUnit("°C"),
            exposes.numeric("window_detection_time", ea.STATE_SET).withValueMin(0).withValueMax(60).withValueStep(1).withUnit("m"),
            exposes.binary("boost_heating", ea.STATE_SET, "ON", "OFF"),
            exposes.numeric("boost_time", ea.STATE),
            exposes.numeric("error_status", ea.STATE).withDescription("Error status"),
            exposes
                .composite("programming_mode1", "holidays_schedule", 0)
                .withDescription("Schedule MODE ⏱ - In this mode, the device executes a preset holiday programming temperature time and temperature.")
                .withFeature(exposes.text("holidays_schedule", ea.STATE_SET)),
            exposes
                .composite("programming_mode2", "weekly_schedule", 0)
                .withDescription("Auto MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ")
                .withFeature(exposes.text("monday_schedule", ea.STATE_SET))
                .withFeature(exposes.text("tuesday_schedule", ea.STATE_SET))
                .withFeature(exposes.text("wednesday_schedule", ea.STATE_SET))
                .withFeature(exposes.text("thursday_schedule", ea.STATE_SET))
                .withFeature(exposes.text("friday_schedule", ea.STATE_SET))
                .withFeature(exposes.text("saturday_schedule", ea.STATE_SET))
                .withFeature(exposes.text("sunday_schedule", ea.STATE_SET)),
        ],
    },
];
