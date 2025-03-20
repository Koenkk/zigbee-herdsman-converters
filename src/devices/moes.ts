import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";
import * as zosung from "../lib/zosung";

const e = exposes.presets;
const ea = exposes.access;

const fzZosung = zosung.fzZosung;
const tzZosung = zosung.tzZosung;
const ez = zosung.presetsZosung;

const exposesLocal = {
    hour: (name: string) => e.numeric(name, ea.STATE_SET).withUnit("h").withValueMin(0).withValueMax(23),
    minute: (name: string) => e.numeric(name, ea.STATE_SET).withUnit("m").withValueMin(0).withValueMax(59),
    program_temperature: (name: string) => e.numeric(name, ea.STATE_SET).withUnit("°C").withValueMin(5).withValueMax(35).withValueStep(0.5),
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_cymsnfvf", "_TZ3000_2xlvlnez"]),
        model: "ZP-LZ-FR2U",
        vendor: "Moes",
        description: "Zigbee 3.0 dual USB wireless socket plug",
        extend: [tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, indicatorMode: true, childLock: true, endpoints: ["l1", "l2"]})],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        fingerprint: [...tuya.fingerprint("TS0121", ["_TYZB01_iuepbmpv"]), ...tuya.fingerprint("TS011F", ["_TZ3000_zmy1waw6", "_TZ3000_bkfe0bab"])],
        model: "MS-104Z",
        description: "Smart light switch module (1 gang)",
        vendor: "Moes",
        extend: [tuya.modernExtend.tuyaOnOff()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            try {
                // Fails for some devices.
                // https://github.com/Koenkk/zigbee2mqtt/issues/4598
                await reporting.onOff(endpoint);
            } catch {
                /* empty */
            }
        },
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_pmz6mjyu", "_TZ3000_iv6ph5tr"]),
        model: "MS-104BZ",
        description: "Smart light switch module (2 gang)",
        vendor: "Moes",
        extend: [tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2"]})],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint2);
        },
        whiteLabel: [tuya.whitelabel("KnockautX", "FMS2C017", "2 gang switch", ["_TZ3000_iv6ph5tr"])],
    },
    {
        zigbeeModel: ["TS0112"],
        model: "ZK-EU-2U",
        vendor: "Moes",
        description: "Zigbee 3.0 dual USB wireless socket plug",
        extend: [m.onOff({endpointNames: ["l1", "l2"]})],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            const hasEndpoint2 = !!device.getEndpoint(2);
            return {l1: 1, l2: hasEndpoint2 ? 2 : 7};
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_aoclfnxz",
            "_TZE200_ztvwu4nk",
            "_TZE204_5toc8efa",
            "_TZE200_5toc8efa",
            "_TZE200_ye5jkfsb",
            "_TZE204_aoclfnxz",
            "_TZE200_u9bfwha0",
            "_TZE204_u9bfwha0",
            "_TZE204_xalsoe3m",
        ]),
        model: "BHT-002",
        vendor: "Moes",
        description: "Moes BHT series Thermostat",
        fromZigbee: [legacy.fz.moes_thermostat],
        toZigbee: [
            legacy.tz.moes_thermostat_child_lock,
            legacy.tz.moes_thermostat_current_heating_setpoint,
            legacy.tz.moes_thermostat_mode,
            legacy.tz.moes_thermostat_standby,
            legacy.tz.moes_thermostat_sensor,
            legacy.tz.moes_thermostat_calibration,
            legacy.tz.moes_thermostat_deadzone_temperature,
            legacy.tz.moes_thermostat_max_temperature_limit,
            legacy.tz.moes_thermostat_min_temperature_limit,
            legacy.tz.moes_thermostat_program_schedule,
        ],
        whiteLabel: [tuya.whitelabel("Moes", "BHT-002/BHT-006", "Smart heating thermostat", ["_TZE204_aoclfnxz"])],
        exposes: (device, options) => {
            const heatingStepSize = device?.manufacturerName === "_TZE204_5toc8efa" ? 0.5 : 1;
            return [
                e.child_lock(),
                e.deadzone_temperature(),
                e.max_temperature_limit().withValueMax(45),
                e.min_temperature_limit(),
                e
                    .climate()
                    .withSetpoint("current_heating_setpoint", 5, 45, heatingStepSize, ea.STATE_SET)
                    .withLocalTemperature(ea.STATE)
                    .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET)
                    .withSystemMode(["off", "heat"], ea.STATE_SET)
                    .withRunningState(["idle", "heat", "cool"], ea.STATE)
                    .withPreset(["hold", "program"]),

                e.temperature_sensor_select(["IN", "AL", "OU"]),

                e
                    .composite("program", "program", ea.STATE_SET)
                    .withDescription("Time of day and setpoint to use when in program mode")
                    .withFeature(exposesLocal.hour("weekdays_p1_hour"))
                    .withFeature(exposesLocal.minute("weekdays_p1_minute"))
                    .withFeature(exposesLocal.program_temperature("weekdays_p1_temperature"))
                    .withFeature(exposesLocal.hour("weekdays_p2_hour"))
                    .withFeature(exposesLocal.minute("weekdays_p2_minute"))
                    .withFeature(exposesLocal.program_temperature("weekdays_p2_temperature"))
                    .withFeature(exposesLocal.hour("weekdays_p3_hour"))
                    .withFeature(exposesLocal.minute("weekdays_p3_minute"))
                    .withFeature(exposesLocal.program_temperature("weekdays_p3_temperature"))
                    .withFeature(exposesLocal.hour("weekdays_p4_hour"))
                    .withFeature(exposesLocal.minute("weekdays_p4_minute"))
                    .withFeature(exposesLocal.program_temperature("weekdays_p4_temperature"))
                    .withFeature(exposesLocal.hour("saturday_p1_hour"))
                    .withFeature(exposesLocal.minute("saturday_p1_minute"))
                    .withFeature(exposesLocal.program_temperature("saturday_p1_temperature"))
                    .withFeature(exposesLocal.hour("saturday_p2_hour"))
                    .withFeature(exposesLocal.minute("saturday_p2_minute"))
                    .withFeature(exposesLocal.program_temperature("saturday_p2_temperature"))
                    .withFeature(exposesLocal.hour("saturday_p3_hour"))
                    .withFeature(exposesLocal.minute("saturday_p3_minute"))
                    .withFeature(exposesLocal.program_temperature("saturday_p3_temperature"))
                    .withFeature(exposesLocal.hour("saturday_p4_hour"))
                    .withFeature(exposesLocal.minute("saturday_p4_minute"))
                    .withFeature(exposesLocal.program_temperature("saturday_p4_temperature"))
                    .withFeature(exposesLocal.hour("sunday_p1_hour"))
                    .withFeature(exposesLocal.minute("sunday_p1_minute"))
                    .withFeature(exposesLocal.program_temperature("sunday_p1_temperature"))
                    .withFeature(exposesLocal.hour("sunday_p2_hour"))
                    .withFeature(exposesLocal.minute("sunday_p2_minute"))
                    .withFeature(exposesLocal.program_temperature("sunday_p2_temperature"))
                    .withFeature(exposesLocal.hour("sunday_p3_hour"))
                    .withFeature(exposesLocal.minute("sunday_p3_minute"))
                    .withFeature(exposesLocal.program_temperature("sunday_p3_temperature"))
                    .withFeature(exposesLocal.hour("sunday_p4_hour"))
                    .withFeature(exposesLocal.minute("sunday_p4_minute"))
                    .withFeature(exposesLocal.program_temperature("sunday_p4_temperature")),
            ];
        },
        onEvent: tuya.onEventSetLocalTime,
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_amp6tsvy", "_TZE200_tviaymwx"]),
        model: "ZTS-EU_1gang",
        vendor: "Moes",
        description: "Wall touch light switch (1 gang)",
        exposes: [
            e.switch().setAccess("state", ea.STATE_SET),
            e.enum("indicate_light", ea.STATE_SET, Object.values(legacy.moesSwitch.indicateLight)).withDescription("Indicator light status"),
            e
                .enum("power_on_behavior", ea.STATE_SET, Object.values(legacy.moesSwitch.powerOnBehavior))
                .withDescription("Controls the behavior when the device is powered on"),
        ],
        fromZigbee: [legacy.fz.tuya_switch, legacy.fz.moes_switch],
        toZigbee: [legacy.tz.tuya_switch_state, legacy.tz.moes_switch],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_g1ib5ldv"]),
        model: "ZTS-EU_2gang",
        vendor: "Moes",
        description: "Wall touch light switch (2 gang)",
        exposes: [
            e.switch().withEndpoint("l1").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l2").setAccess("state", ea.STATE_SET),
            e.enum("indicate_light", ea.STATE_SET, Object.values(legacy.moesSwitch.indicateLight)).withDescription("Indicator light status"),
            e
                .enum("power_on_behavior", ea.STATE_SET, Object.values(legacy.moesSwitch.powerOnBehavior))
                .withDescription("Controls the behavior when the device is powered on"),
        ],
        fromZigbee: [fz.ignore_basic_report, legacy.fz.tuya_switch, legacy.fz.moes_switch],
        toZigbee: [legacy.tz.tuya_switch_state, legacy.tz.moes_switch],
        onEvent: tuya.onEventSetLocalTime,
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {l1: 1, l2: 1};
        },
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_tz32mtza"]),
        model: "ZTS-EU_3gang",
        vendor: "Moes",
        description: "Wall touch light switch (3 gang)",
        exposes: [
            e.switch().withEndpoint("l1").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l2").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l3").setAccess("state", ea.STATE_SET),
            e.enum("indicate_light", ea.STATE_SET, Object.values(legacy.moesSwitch.indicateLight)).withDescription("Indicator light status"),
            e
                .enum("power_on_behavior", ea.STATE_SET, Object.values(legacy.moesSwitch.powerOnBehavior))
                .withDescription("Controls the behavior when the device is powered on"),
        ],
        fromZigbee: [fz.ignore_basic_report, legacy.fz.tuya_switch, legacy.fz.moes_switch],
        toZigbee: [legacy.tz.tuya_switch_state, legacy.tz.moes_switch],
        onEvent: tuya.onEventSetLocalTime,
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {l1: 1, l2: 1, l3: 1};
        },
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_1ozguk6x"]),
        model: "ZTS-EU_4gang",
        vendor: "Moes",
        description: "Wall touch light switch (4 gang)",
        exposes: [
            e.switch().withEndpoint("l1").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l2").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l3").setAccess("state", ea.STATE_SET),
            e.switch().withEndpoint("l4").setAccess("state", ea.STATE_SET),
            e.enum("indicate_light", ea.STATE_SET, Object.values(legacy.moesSwitch.indicateLight)).withDescription("Indicator light status"),
            e
                .enum("power_on_behavior", ea.STATE_SET, Object.values(legacy.moesSwitch.powerOnBehavior))
                .withDescription("Controls the behavior when the device is powered on"),
        ],
        fromZigbee: [fz.ignore_basic_report, legacy.fz.tuya_switch, legacy.fz.moes_switch],
        toZigbee: [legacy.tz.tuya_switch_state, legacy.tz.moes_switch],
        onEvent: tuya.onEventSetLocalTime,
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {l1: 1, l2: 1, l3: 1, l4: 1};
        },
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0222", ["_TYZB01_kvwjujy9", "_TYZB01_ftdkanlj"]),
        model: "ZSS-ZK-THL",
        vendor: "Moes",
        description: "Smart temperature and humidity meter with display",
        fromZigbee: [fz.battery, fz.humidity, fz.temperature],
        toZigbee: [],
        exposes: [e.battery(), e.humidity(), e.temperature()],
        extend: [m.illuminance()],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_b6wax7g0", "_TZE200_qsoecqlk"]),
        model: "BRT-100-TRV",
        vendor: "Moes",
        description: "Thermostatic radiator valve",
        whiteLabel: [tuya.whitelabel("Sibling", "Powerswitch-ZK(W)", "Thermostatic radiator valve", ["_TZE200_qsoecqlk"])],
        // ota: true,
        // OTA available but bricks device https://github.com/Koenkk/zigbee2mqtt/issues/18840
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, legacy.fz.moesS_thermostat],
        toZigbee: [
            legacy.tz.moesS_thermostat_current_heating_setpoint,
            legacy.tz.moesS_thermostat_child_lock,
            legacy.tz.moesS_thermostat_window_detection,
            legacy.tz.moesS_thermostat_temperature_calibration,
            legacy.tz.moesS_thermostat_boost_heating,
            legacy.tz.moesS_thermostat_boostHeatingCountdownTimeSet,
            legacy.tz.moesS_thermostat_eco_temperature,
            legacy.tz.moesS_thermostat_max_temperature,
            legacy.tz.moesS_thermostat_min_temperature,
            legacy.tz.moesS_thermostat_moesSecoMode,
            legacy.tz.moesS_thermostat_preset,
            legacy.tz.moesS_thermostat_schedule_programming,
            legacy.tz.moesS_thermostat_system_mode,
        ],
        exposes: [
            e.battery(),
            e.child_lock(),
            e.eco_mode(),
            e.eco_temperature().withValueMin(5),
            e.max_temperature().withValueMax(45),
            e.min_temperature().withValueMin(0),
            e.valve_state(),
            e.position(),
            e.window_detection(),
            e.binary("window", ea.STATE, "OPEN", "CLOSED").withDescription("Window status closed or open "),
            e
                .climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint("current_heating_setpoint", 0, 35, 1, ea.STATE_SET)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withSystemMode(["heat"], ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withPreset(
                    ["programming", "manual", "temporary_manual", "holiday"],
                    "MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. " +
                        'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                        "PROGRAMMING MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. " +
                        "HOLIDAY MODE ⛱ - In this mode, for example, the vacation mode is set for 10 days and the temperature is set" +
                        "to 15 degrees Celsius. After 10 days, the device will automatically switch to programming mode. " +
                        "TEMPORARY MANUAL MODE - In this mode, ☝ icon will flash. At this time, the device executes the manually set " +
                        "temperature and returns to the weekly programming mode in the next time period. ",
                ),
            e
                .text("programming_mode", ea.STATE_SET)
                .withDescription(
                    "PROGRAMMING MODE ⏱ - In this mode, " +
                        "the device executes a preset week programming temperature time and temperature. " +
                        "You can set up to 4 stages of temperature every for WEEKDAY ➀➁➂➃➄,  SATURDAY ➅ and SUNDAY ➆.",
                ),
            e
                .binary("boost_heating", ea.STATE_SET, "ON", "OFF")
                .withDescription(
                    'Boost Heating: press and hold "+" for 3 seconds, ' +
                        "the device will enter the boost heating mode, and the ▷╵◁ will flash. The countdown will be displayed in the APP",
                ),
            e.numeric("boost_heating_countdown", ea.STATE).withUnit("min").withDescription("Countdown in minutes").withValueMin(0).withValueMax(15),
            e
                .numeric("boost_heating_countdown_time_set", ea.STATE_SET)
                .withUnit("s")
                .withDescription("Boost Time Setting 0 sec - 900 sec, (default = 300 sec)")
                .withValueMin(0)
                .withValueMax(900)
                .withValueStep(1),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_nhyj64w2", "_TZE200_127x7wnl", "_TZE204_5slehgeo"]),
        model: "ZTS-EUR-C",
        vendor: "Moes",
        description: "Zigbee + RF curtain switch",
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [legacy.fz.moes_cover, fz.ignore_basic_report],
        toZigbee: [legacy.tz.moes_cover],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.enum("backlight", ea.STATE_SET, ["OFF", "ON"]),
            e.enum("calibration", ea.STATE_SET, ["OFF", "ON"]),
            e.enum("motor_reversal", ea.STATE_SET, ["OFF", "ON"]),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS1201", [
            "_TZ3290_j37rooaxrcdcqo5n",
            "_TZ3290_ot6ewjvmejq5ekhl",
            "_TZ3290_xjpbcxn92aaxvmlz",
            "_TZ3290_gnl5a6a5xvql7c2a",
        ]),
        model: "UFO-R11",
        vendor: "Moes",
        description: "Universal smart IR remote control",
        fromZigbee: [
            fzZosung.zosung_send_ir_code_00,
            fzZosung.zosung_send_ir_code_01,
            fzZosung.zosung_send_ir_code_02,
            fzZosung.zosung_send_ir_code_03,
            fzZosung.zosung_send_ir_code_04,
            fzZosung.zosung_send_ir_code_05,
            fz.battery,
        ],
        toZigbee: [tzZosung.zosung_ir_code_to_send, tzZosung.zosung_learn_ir_code],
        exposes: (device, options) => {
            const exposes = [ez.learn_ir_code(), ez.learned_ir_code(), ez.ir_code_to_send()];
            if (device?.manufacturerName !== "") {
                exposes.push(e.battery(), e.battery_voltage());
            }
            return exposes;
        },
        configure: async (device, coordinatorEndpoint) => {
            if (device.manufacturerName !== "_TZ3290_gnl5a6a5xvql7c2a") {
                const endpoint = device.getEndpoint(1);
                await endpoint.read("genPowerCfg", ["batteryVoltage", "batteryPercentageRemaining"]);
                await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            }
        },
        whiteLabel: [tuya.whitelabel("Tuya", "iH-F8260", "Universal smart IR remote control", ["_TZ3290_gnl5a6a5xvql7c2a"])],
    },
    {
        fingerprint: tuya.fingerprint("TS0049", ["_TZ3000_cjfmu5he", "_TZ3000_kz1anoi8", "_TZ3000_mq4wujmp"]),
        model: "ZWV-YC",
        vendor: "Moes",
        description: "Water valve",
        extend: [m.battery(), m.onOff({powerOnBehavior: false})],
    },
    {
        fingerprint: tuya.fingerprint("TS0011", ["_TZ3000_hhiodade"]),
        model: "ZS-EUB_1gang",
        vendor: "Moes",
        description: "Wall light switch (1 gang)",
        extend: [tuya.modernExtend.tuyaOnOff({backlightModeOffNormalInverted: true})],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genOnOff"]);
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_hr0tdd47", "_TZE200_rjxqso4a", "_TZE284_rjxqso4a"]),
        model: "ZC-HM",
        vendor: "Moes",
        description: "Carbon monoxide alarm",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.carbon_monoxide(), e.co(), tuya.exposes.selfTestResult(), e.battery(), tuya.exposes.silence()],
        meta: {
            tuyaDatapoints: [
                [1, "carbon_monoxide", tuya.valueConverter.trueFalse0],
                [2, "co", tuya.valueConverter.raw],
                [9, "self_test_result", tuya.valueConverter.selfTestResult],
                [15, "battery", tuya.valueConverter.raw],
                [16, "silence", tuya.valueConverter.raw],
            ],
        },
        whiteLabel: [tuya.whitelabel("HEIMAN", "HS-720ES", "Carbon monoxide alarm", ["_TZE200_hr0tdd47"])],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_vawy74yh", "_TZE284_vawy74yh"]),
        model: "ZSS-HM-SSD01",
        vendor: "Moes",
        description: "Smoke sensor",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.smoke(),
            e.battery(),
            tuya.exposes.batteryState(),
            e.binary("silence", ea.STATE_SET, "ON", "OFF"),
            e.enum("self_test", ea.STATE, ["checking", "check_success", "check_failure"]),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "smoke", tuya.valueConverter.trueFalse0],
                [9, "self_test", tuya.valueConverterBasic.lookup({checking: 0, check_success: 1, check_failure: 2})],
                [14, "battery_state", tuya.valueConverter.batteryState],
                [15, "battery", tuya.valueConverter.raw],
                [16, "silence", tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS004F", ["_TZ3000_ja5osu5g", "_TZ3000_kjfzuycl", "_TZ3000_egvb1p2g"]),
        model: "ERS-10TZBVB-AA",
        vendor: "Moes",
        description: "Smart button",
        whiteLabel: [tuya.whitelabel("Loginovo", "ZG-101ZL", "Smart button", ["_TZ3000_ja5osu5g"])],
        fromZigbee: [
            fz.command_step,
            fz.command_on,
            fz.command_off,
            fz.command_move_to_color_temp,
            fz.command_move_to_level,
            fz.tuya_multi_action,
            fz.tuya_operation_mode,
            fz.battery,
        ],
        toZigbee: [tz.tuya_operation_mode],
        exposes: [
            e.action([
                "single",
                "double",
                "hold",
                "brightness_move_to_level",
                "color_temperature_move",
                "brightness_step_up",
                "brightness_step_down",
                "on",
                "off",
            ]),
            e.battery(),
            e
                .enum("operation_mode", ea.ALL, ["command", "event"])
                .withDescription('Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await endpoint.write("genOnOff", {tuyaOperationMode: 1});
            await endpoint.read("genOnOff", ["tuyaOperationMode"]);
            try {
                await endpoint.read(0xe001, [0xd011]);
            } catch {
                /* do nothing */
            }
            await endpoint.read("genPowerCfg", ["batteryVoltage", "batteryPercentageRemaining"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_srmahpwl"]),
        model: "ZS-SR-EUC",
        vendor: "Moes",
        description: "Star ring - smart curtain switch",
        options: [exposes.options.invert_cover()],
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e.enum("calibration", ea.STATE_SET, ["START", "END"]).withDescription("Calibration"),
            e.enum("motor_steering", ea.STATE_SET, ["FORWARD", "BACKWARD"]).withDescription("Motor Steering"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "state", tuya.valueConverterBasic.lookup({OPEN: tuya.enum(0), STOP: tuya.enum(1), CLOSE: tuya.enum(2)})],
                [2, "position", tuya.valueConverter.coverPosition],
                [3, "calibration", tuya.valueConverterBasic.lookup({START: tuya.enum(0), END: tuya.enum(1)})],
                [8, "motor_steering", tuya.valueConverterBasic.lookup({FORWARD: tuya.enum(0), BACKWARD: tuya.enum(1)})],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0726", ["_TZ3002_vaq2bfcu"]),
        model: "SR-ZS",
        vendor: "Moes",
        description: "Smart switch (light + sence)",
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ["l1", "l2", "l3"], powerOnBehavior2: true, switchMode: true}),
            m.actionEnumLookup({
                cluster: "genOnOff",
                commands: ["commandTuyaAction"],
                attribute: "value",
                actionLookup: {button: 0},
                buttonLookup: {
                    "1_up": 4,
                    "1_down": 1,
                    "2_up": 5,
                    "2_down": 2,
                    "3_up": 6,
                    "3_down": 3,
                },
            }),
            tuya.modernExtend.tuyaLedIndicator(),
        ],
    },
    {
        fingerprint: [{modelID: "TS0601", manufacturerName: "_TZE204_lpedvtvr"}],
        model: "ZHT-SR",
        vendor: "Moes",
        description: "Smart ring thermostat",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 45, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-10, 10, 1, ea.STATE_SET)
                .withSystemMode(["off", "heat"], ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withPreset(["Manual", "Temporary manual", "Program", "Eco"]),
            //eco_temperature,
            new exposes.Numeric("eco_temperature", exposes.access.STATE_SET)
                .withUnit("°C")
                .withDescription("Temperature for eco mode")
                .withValueMin(10)
                .withValueMax(30),
            e.child_lock(),
            e.deadzone_temperature().withValueMin(0.5).withValueMax(5).withValueStep(0.5),
            e.max_temperature_limit().withValueMin(35).withValueMax(45),
            e.min_temperature_limit().withValueMin(1).withValueMax(15),
            e
                .enum("sensor_mode", ea.STATE, ["IN", "OU", "AL"])
                .withDescription(
                    "IN - internal sensor, no heat protection. OU - external sensor, no heat protection. AL - internal sensor for room temperature, external for heat protection",
                ),
            new exposes.Numeric("floor_temperature", exposes.access.STATE).withUnit("°C").withDescription("Floor temperature"),
            new exposes.Numeric("high_protect_temperature", exposes.access.STATE_SET)
                .withUnit("°C")
                .withDescription("High protect temperature")
                .withValueMin(10)
                .withValueMax(70),
            new exposes.Numeric("low_protect_temperature", exposes.access.STATE_SET)
                .withUnit("°C")
                .withDescription("Low protect temperature")
                .withValueMin(0)
                .withValueMax(10),
            //backlight_brightness
            new exposes.Numeric("backlight_brightness", exposes.access.STATE_SET)
                .withUnit("%")
                .withDescription("Backlight brightness")
                .withValueMin(0)
                .withValueMax(100),
            //Screen time
            new exposes.Enum(
                "screen_time",
                exposes.access.STATE_SET,
                [10, 20, 30, 40, 50, 60].map((secs) => `${secs}_seconds`),
            )
                .withDescription("Screen on time")
                .withCategory("config"),
            e.binary("rgb_light", exposes.access.STATE_SET, "ON", "OFF"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "system_mode", tuya.valueConverterBasic.lookup({off: false, heat: true})],
                [2, "preset", tuya.valueConverterBasic.lookup({Manual: 0, "Temporary manual": 1, Program: 2, Eco: 3})],
                [16, "local_temperature", tuya.valueConverter.divideBy10],
                [18, "min_temperature_limit", tuya.valueConverter.divideBy10],
                [32, "sensor_mode", tuya.valueConverterBasic.lookup({IN: 0, AL: 1, OU: 2})],
                [34, "max_temperature_limit", tuya.valueConverter.divideBy10],
                [39, "child_lock", tuya.valueConverter.lockUnlock],
                [47, "running_state", tuya.valueConverterBasic.lookup({heat: 0, idle: 1})],
                [48, "backlight_brightness", tuya.valueConverter.raw],
                [50, "current_heating_setpoint", tuya.valueConverter.divideBy10],
                [101, "local_temperature_calibration", tuya.valueConverter.localTemperatureCalibration_256],
                [109, "floor_temperature", tuya.valueConverter.divideBy10],
                [110, "deadzone_temperature", tuya.valueConverter.divideBy10],
                [111, "high_protect_temperature", tuya.valueConverter.divideBy10],
                [112, "low_protect_temperature", tuya.valueConverter.divideBy10],
                [113, "eco_temperature", tuya.valueConverter.divideBy10],
                [
                    114,
                    "screen_time",
                    tuya.valueConverterBasic.lookup({
                        "10_seconds": 0,
                        "20_seconds": 1,
                        "30_seconds": 2,
                        "40_seconds": 3,
                        "50_seconds": 4,
                        "60_seconds": 5,
                    }),
                ],
                [115, "rgb_light", tuya.valueConverterBasic.lookup({ON: true, OFF: false})],
            ],
        },
    },
];
