import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;
const te = tuya.exposes;
const tvc = tuya.valueConverter;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_sonkaxrd"]),
        model: "E12",
        vendor: "Nous",
        description: "Carbon monoxide alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.carbon_monoxide().withDescription("Indicates if CO level and exposure time are above safety limits, triggering the alarm"),
            e.numeric("carbon_monoxide_value", ea.STATE).withUnit("ppm").withDescription("Current CO concentration"),
            e.binary("warming_up", ea.STATE, true, false).withDescription("Sensor preheating status: Takes 120 to complete after power on"),
            e
                .enum("test", ea.STATE_SET, ["test"])
                .withDescription("Triggers the self-checking process: Beeps 4 times and takes 20 seconds to complete")
                .withLabel("Test device"),
            e.binary("testing", ea.STATE, true, false).withDescription("Indicates if self-checking is currently running"),
            te.fault().withDescription("Sensor fault indicator"),
            e
                .binary("end_of_life", ea.STATE, true, false)
                .withDescription("Indicates whether the sensor is past its certified service life (10 years) and should be replaced"),
            te.batteryState(),
        ],
        meta: {
            tuyaDatapoints: [
                // co_status
                [1, "carbon_monoxide", tuya.valueConverter.trueFalseEnum0],
                // co_value
                [2, "carbon_monoxide_value", tuya.valueConverter.raw],
                // self_checking
                [8, "test", tuya.valueConverterBasic.lookup({test: true, idle: false})],
                // checking_result
                [9, "testing", tuya.valueConverter.trueFalseEnum0],
                // preheat
                [
                    10,
                    "warming_up",
                    {
                        from: (v: boolean, meta, options, publish) => {
                            if (!v) return false;

                            setTimeout(() => {
                                publish({warming_up: false});
                            }, 120 * 1000).unref();
                            return true;
                        },
                    },
                ],
                // fault - bitmap, no info from Tuya
                [11, "fault", tuya.valueConverter.fault],
                // lifecycle
                [12, "end_of_life", tuya.valueConverter.trueFalseInvert],
                [14, "battery_state", tuya.valueConverter.batteryState],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_1di7ujzp"]),
        model: "E13",
        vendor: "Nous",
        description: "Water leakage or shortage sensor with sound alarm",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.water(),
            e.water_leak().withDescription("Indicates whether the device detected a water leak and the buzzer is ringing"),
            e
                .enum("alarm_mode", ea.STATE_SET, ["water_presence", "water_absence"])
                .withDescription("When to consider a water leak and sound the alarm")
                .withCategory("config"),
            e
                .enum("ringtone", ea.STATE_SET, ["muted", "tone_1", "tone_2", "tone_3"])
                .withDescription("Selected buzzer ringtone for the alarm")
                .withCategory("config"),
            e.battery(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "water", tuya.valueConverter.trueFalse1],
                [4, "battery", tuya.valueConverter.raw],
                [
                    101,
                    "alarm_mode",
                    tuya.valueConverterBasic.lookup({
                        water_presence: tuya.enum(0),
                        water_absence: tuya.enum(1),
                    }),
                ],
                [102, "water_leak", tuya.valueConverter.trueFalse1],
                [
                    103,
                    "ringtone",
                    tuya.valueConverterBasic.lookup({
                        muted: tuya.enum(0),
                        tone_1: tuya.enum(1),
                        tone_2: tuya.enum(2),
                        tone_3: tuya.enum(3),
                    }),
                ],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0201", ["_TZ3000_lbtpiody"]),
        model: "E5",
        vendor: "Nous",
        description: "Temperature & humidity",
        fromZigbee: [fz.temperature, fz.humidity],
        exposes: [e.temperature(), e.humidity()],
        extend: [m.battery()],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", [
            "_TZE200_lve3dvpy",
            "_TZE200_c7emyjom",
            "_TZE200_locansqn",
            "_TZE200_qrztc3ev",
            "_TZE200_snloy4rw",
            "_TZE200_eanjj2pa",
            "_TZE200_ydrdfkim",
            "_TZE284_locansqn",
        ]),
        model: "SZ-T04",
        vendor: "Nous",
        whiteLabel: [tuya.whitelabel("Tuya", "TH01Z", "Temperature and humidity sensor with clock", ["_TZE200_locansqn"])],
        description: "Temperature and humidity sensor with clock",
        fromZigbee: [legacy.fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.nous_lcd_temperature_humidity_sensor],
        extend: [tuya.modernExtend.tuyaBase({forceTimeUpdates: true, timeStart: "1970"})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
        },
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e
                .numeric("temperature_report_interval", ea.STATE_SET)
                .withUnit("min")
                .withValueMin(5)
                .withValueMax(120)
                .withValueStep(5)
                .withDescription("Temperature Report interval"),
            e
                .numeric("humidity_report_interval", ea.STATE_SET)
                .withUnit("min")
                .withValueMin(5)
                .withValueMax(120)
                .withValueStep(5)
                .withDescription("Humidity Report interval"),
            e.enum("temperature_unit_convert", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Current display unit"),
            e.enum("temperature_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Temperature alarm status"),
            e.numeric("max_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature max"),
            e.numeric("min_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature min"),
            e
                .numeric("temperature_sensitivity", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0.1)
                .withValueMax(50)
                .withValueStep(0.1)
                .withDescription("Temperature sensitivity"),
            e.enum("humidity_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Humidity alarm status"),
            e.numeric("max_humidity", ea.STATE_SET).withUnit("%").withValueMin(0).withValueMax(100).withDescription("Alarm humidity max"),
            e.numeric("min_humidity", ea.STATE_SET).withUnit("%").withValueMin(0).withValueMax(100).withDescription("Alarm humidity min"),
            e
                .numeric("humidity_sensitivity", ea.STATE_SET)
                .withUnit("%")
                .withValueMin(1)
                .withValueMax(100)
                .withValueStep(1)
                .withDescription("Humidity sensitivity"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE284_wtikaxzs", "_TZE200_nnrfa68v", "_TZE200_zppcgbdj", "_TZE200_wtikaxzs"]),
        model: "E6",
        vendor: "Nous",
        description: "Temperature & humidity LCD sensor",
        fromZigbee: [legacy.fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [legacy.tz.nous_lcd_temperature_humidity_sensor],
        extend: [tuya.modernExtend.tuyaBase({forceTimeUpdates: true, bindBasicOnConfigure: true, timeStart: "1970"})],
        exposes: [
            e.temperature(),
            e.humidity(),
            e.battery(),
            e.battery_low(),
            e.enum("temperature_unit_convert", ea.STATE_SET, ["celsius", "fahrenheit"]).withDescription("Current display unit"),
            e.enum("temperature_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Temperature alarm status"),
            e.numeric("max_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature max"),
            e.numeric("min_temperature", ea.STATE_SET).withUnit("°C").withValueMin(-20).withValueMax(60).withDescription("Alarm temperature min"),
            e.enum("humidity_alarm", ea.STATE, ["canceled", "lower_alarm", "upper_alarm"]).withDescription("Humidity alarm status"),
            e.numeric("max_humidity", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(100).withDescription("Alarm humidity max"),
            e.numeric("min_humidity", ea.STATE_SET).withUnit("%").withValueMin(1).withValueMax(100).withDescription("Alarm humidity min"),
            e
                .numeric("temperature_sensitivity", ea.STATE_SET)
                .withUnit("°C")
                .withValueMin(0.1)
                .withValueMax(50)
                .withValueStep(0.1)
                .withDescription("Temperature sensitivity"),
            e
                .numeric("temperature_report_interval", ea.STATE_SET)
                .withUnit("min")
                .withValueMin(1)
                .withValueMax(120)
                .withValueStep(1)
                .withDescription("Temperature Report interval"),
            e
                .numeric("humidity_sensitivity", ea.STATE_SET)
                .withUnit("%")
                .withValueMin(1)
                .withValueMax(100)
                .withValueStep(1)
                .withDescription("Humidity sensitivity"),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_qvxrkeif"]),
        model: "E9",
        vendor: "Nous",
        description: "Household combustible gas detector",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e
                .gas()
                .withDescription(
                    "Indicates whether the device detected combustible gas (Methane) and the buzzer is ringing. Also triggers when the test button is pressed",
                ),
            e.binary("warming_up", ea.STATE, true, false).withDescription("Sensor preheating status: Takes 3 mins to complete after power-on"),
            te.fault().withDescription("Sensor fault indicator"),
            e
                .binary("end_of_life", ea.STATE, true, false)
                .withDescription("Indicates whether the sensor is past its certified service life (5 years) and should be replaced"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "gas", tuya.valueConverter.trueFalseEnum0], // gas_sensor_status, gas_detection_state
                [10, "warming_up", tuya.valueConverter.raw], // preheat
                [11, "fault", tuya.valueConverter.fault], // fault_alarm
                [12, "end_of_life", tuya.valueConverter.trueFalseInvert], // lifecycle
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_loejka0i", "_TZE284_loejka0i"]),
        model: "D4Z",
        vendor: "Nous",
        description: "Smart energy monitor for 3P+N system",
        extend: [tuya.modernExtend.tuyaBase({dp: true, queryOnConfigure: true})],
        exposes: [
            te.circuitBreakerFaults(),

            e.power().withDescription("Total active power"),
            e.power_factor().withUnit("%").withDescription("Total power factor"),

            e.ac_frequency(),

            e.energy().withDescription("Total consumed energy"),
            e.produced_energy().withDescription("Total produced energy"),
            te.energyReset(),

            te.powerWithPhase("a"),
            te.powerWithPhase("b"),
            te.powerWithPhase("c"),

            te.powerFactorWithPhase("a"),
            te.powerFactorWithPhase("b"),
            te.powerFactorWithPhase("c"),

            te.currentWithPhase("a"),
            te.currentWithPhase("b"),
            te.currentWithPhase("c"),

            te.voltageWithPhase("a"),
            te.voltageWithPhase("b"),
            te.voltageWithPhase("c"),

            te.energyWithPhase("a"),
            te.energyWithPhase("b"),
            te.energyWithPhase("c"),

            te.energyProducedWithPhase("a"),
            te.energyProducedWithPhase("b"),
            te.energyProducedWithPhase("c"),

            te.rs485ConfigAndHighPowerAlarm(),
            te.alarmSet2(),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "energy", tvc.divideBy100],
                [2, "produced_energy", tvc.divideBy100],
                [6, null, tvc.raw], // phase a - duplicate measurements
                [7, null, tvc.raw], // phase b - duplicate measurements
                [8, null, tvc.raw], // phase c - duplicate measurements
                [9, "faults", tvc.circuitBreakerFaults1],
                [15, "power_factor", tvc.raw],
                [16, "energy_reset", tvc.reset],
                [17, "alarm_set_1", tvc.threshold_7],
                [18, "alarm_set_2", tvc.threshold_8],
                [101, "ac_frequency", tvc.divideBy100],
                [102, "voltage_a", tvc.divideBy10],
                [103, "current_a", tvc.divideBy1000],
                [104, "power_a", tvc.raw],
                [105, "voltage_b", tvc.divideBy10],
                [106, "current_b", tvc.divideBy1000],
                [107, "power_b", tvc.raw],
                [108, "voltage_c", tvc.divideBy10],
                [109, "current_c", tvc.divideBy1000],
                [110, "power_c", tvc.raw],
                [111, "power", tvc.raw],
                [112, "energy_a", tvc.divideBy100],
                [113, "energy_produced_a", tvc.divideBy100],
                [114, "energy_b", tvc.divideBy100],
                [115, "energy_produced_b", tvc.divideBy100],
                [116, "energy_c", tvc.divideBy100],
                [117, "energy_produced_c", tvc.divideBy100],
                [118, "power_factor_a", tvc.raw],
                [119, "power_factor_b", tvc.raw],
                [120, "power_factor_c", tvc.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_t9ffmdin"]),
        model: "D5Z",
        vendor: "Nous",
        description: "Zigbee smart energy meter with leakage and prepayment",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            te
                .switch()
                .withDescription(
                    "On/off state of the circuit (WARNING: It may automatically switch ON after a fault is cleared. See Reclosing option)",
                ),
            te.countdown().withValueMax(86400),
            te
                .powerOnBehavior()
                .withAccess(ea.STATE_SET)
                .withDescription("State to apply after a power outage (It takes ~35s to check faults before applying)"),
            te.inchingSwitch2(),

            te.circuitBreakerStatus(),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.energy_produced(),
            te
                .leakageCurrent()
                .withDescription("Current measured by the external ring. Place it over BOTH live and neutral wires to detect leakage current"),

            e.device_temperature(),
            te.circuitBreakerFaults(),

            te
                .reclosing()
                .withDescription(
                    "Automatically attempt switching ON the circuit after it was turned OFF by a detected fault (WARNING: It seems this happens even when disabled)",
                ),
            te.reclosing_delay(),
            te.reclosing_count(),

            te.energyPrepayment(),
            te.energyBalance(),
            te.energyBalanceAdd(),
            te.energyBalanceReset(),

            te.leakageCurrentAndTemperatureAlarm(),
            te.overCurrentThresholdTime(),
            te.currentAndVoltageAlarm(),
            te.lostFlowAlarm(),
            te.lostFlowThresholdTime(),
        ],

        meta: {
            tuyaDatapoints: [
                [1, "energy", tvc.divideBy100], // total_forward_energy
                [6, null, tvc.phaseVariant4], // phase_a
                [9, "faults", tvc.circuitBreakerFaults],
                [11, "prepayment", tvc.onOff], // switch_prepayment
                [12, "energy_balance_reset", tvc.reset], // clear_energy
                [13, "energy_balance", tvc.divideBy100], // balance_energy
                [14, "energy_balance_add", tvc.energyBalanceAdd], // charge_energy
                [15, "leakage_current", tvc.raw],
                [16, "state", tvc.onOffWithZeros],
                [17, "alarm_set_1", tvc.threshold_4],
                [18, "alarm_set_2", tvc.threshold_5],
                [101, null, null], // something deprecated
                [102, "reclosing_count", tvc.raw], // reclosing_allowed_times
                [103, "device_temperature", tvc.raw], // temp_current
                [104, "reclosing", tvc.onOff], // reclosing_enable
                [105, "countdown", tvc.raw], // timer
                [106, "cycle_schedule", tvc.cycleSchedule], // device responds, but it's not effective, even in tuya app??
                [107, "reclosing_delay", tvc.raw], // reclose_recover_seconds
                [108, "random_timing", tvc.raw], // unused in tuya app
                [109, "inching", tvc.inchingSwitch2], // switch_inching
                [110, "energy_produced", tvc.divideBy100], // reverse_energy_total
                [119, "power_on_delay", tvc.raw], // device not responding, even in tuya app
                [124, "over_current_threshold_time", tvc.raw], // overcurrent_event_threshold_time
                [125, "lost_flow_threshold_time", tvc.raw], // unknown
                [126, "alarm_set_3", tvc.threshold_6],
                [127, "status", tvc.circuitBreakerStatus],
                [134, "power_on_behavior", tvc.powerOnBehaviorEnum], // relay_status_for_power_on
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3210_6cmeijtd"]),
        model: "A11Z",
        vendor: "Nous",
        description: "3-channel power strip with total energy monitoring",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            tuya.clusters.addTuyaCommonPrivateCluster(),
            tuya.modernExtend.tuyaBase(),
            tuya.modernExtend.tuyaOnOff({
                powerOnBehavior2: true,
                onOffCountdown: true,
                indicatorMode: true,
                childLock: true,
                switchTypeButton: true,
                endpoints: ["l1", "l2", "l3"],
            }),
            m.electricityMeter({
                current: {divisor: 1000, multiplier: 1},
                voltage: {divisor: 1, multiplier: 1},
                power: {divisor: 1, multiplier: 1},
                energy: {divisor: 100, multiplier: 1},
                fzElectricalMeasurement: tuya.fz.TS011F_electrical_measurement,
            }),
            m.identify(),
        ],
        meta: {
            multiEndpoint: true,
            multiEndpointSkip: ["energy", "current", "voltage", "power"],
        },
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
        },
    },
];
