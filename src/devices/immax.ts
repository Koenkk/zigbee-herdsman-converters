import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import {repInterval} from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    ts0219_duration: {
        key: ["duration"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("ssIasWd", {maxDuration: value as number});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("ssIasWd", ["maxDuration"]);
        },
    } satisfies Tz.Converter,
    ts0219_volume: {
        key: ["volume"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value);
            await entity.write(
                "ssIasWd",
                {2: {value: utils.mapNumberRange(value, 0, 100, 100, 0), type: 0x20}},
                utils.getOptions(meta.mapped, entity),
            );
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("ssIasWd", [0x0002]);
        },
    } satisfies Tz.Converter,
    ts0219_light: {
        key: ["light"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("ssIasWd", {1: {value: value, type: 0x20}}, utils.getOptions(meta.mapped, entity));
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("ssIasWd", [0x0001]);
        },
    } satisfies Tz.Converter,
    ts0219_alarm: {
        key: ["alarm"],
        convertGet: async (entity, key, meta) => {
            await entity.read("ssIasZone", ["zoneStatus"]);
        },
        convertSet: async (entity, key, value, meta) => {
            const OFF = 0;
            const ALARM = 16;
            const info = value ? ALARM : OFF;
            //only startwarninginfo is used, rest of params are ignored (stored values from device are used instead)
            await entity.command(
                "ssIasWd",
                "startWarning",
                {startwarninginfo: info, warningduration: 0, strobedutycycle: 0, strobelevel: 0},
                utils.getOptions(meta.mapped, entity),
            );
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    ts0219ssIasWd: {
        cluster: "ssIasWd",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            //max duration
            if (msg.data.maxDuration !== undefined) {
                result.duration = msg.data.maxDuration;
            }
            if (msg.data["0"] !== undefined) {
                result.duration = msg.data["0"];
            }
            //light
            if (msg.data["1"] !== undefined) {
                result.light = msg.data["1"];
            }
            //volume
            if (msg.data["2"] !== undefined) {
                result.volume = utils.mapNumberRange(msg.data["2"] as number, 100, 0, 0, 100);
            }
            return result;
        },
    } satisfies Fz.Converter<"ssIasWd", undefined, ["attributeReport", "readResponse"]>,
    ts0219genBasic: {
        cluster: "genBasic",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (msg.data.powerSource !== undefined) {
                result.power_source = msg.data.powerSource === 2 ? "mains" : "battery";
            }
            return result;
        },
    } satisfies Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]>,
    ts0219ssIasZone: {
        cluster: "ssIasZone",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (msg.data.zoneStatus !== undefined) {
                result.alarm = msg.data.zoneStatus === 17;
            }
            return result;
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_jak16dll"]),
        model: "07752L",
        description: "NEO smart internal double socket",
        vendor: "Immax",
        extend: [
            tuya.modernExtend.tuyaOnOff({
                electricalMeasurements: true,
                powerOutageMemory: true,
                indicatorMode: true,
                childLock: true,
                endpoints: ["l1", "l2"],
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 100, multiplier: 1});
            device.save();
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ["power", "current", "voltage", "energy"]},
    },
    {
        zigbeeModel: ["Motion-Sensor-ZB3.0"],
        model: "07043M",
        vendor: "Immax",
        description: "Motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["ZBT-CCTfilament-D0000"],
        model: "07089L",
        vendor: "Immax",
        description: "NEO SMART LED E27 5W",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["E27-filament-Dim-ZB3.0"],
        model: "07088L",
        vendor: "Immax",
        description: "Neo SMART LED filament E27 6.3W warm white, dimmable, Zigbee 3.0",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["IM-Z3.0-DIM"],
        model: "07001L/07005B",
        vendor: "Immax",
        description: "Neo SMART LED E14 5W warm white, dimmable, Zigbee 3.0",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["IM-Z3.0-RGBW"],
        model: "07004D/07005L",
        vendor: "Immax",
        description: "Neo SMART LED E27/E14 color, dimmable, Zigbee 3.0",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["IM-Z3.0-RGBCCT"],
        model: "07008L",
        vendor: "Immax",
        description: "Neo SMART LED strip RGB + CCT, color, dimmable, Zigbee 3.0",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        fingerprint: tuya.fingerprint("TS0505B", ["_TZ3210_pwauw3g2"]),
        model: "07743L",
        vendor: "Immax",
        description: "Neo Smart LED E27 11W RGB + CCT, color, dimmable, Zigbee 3.0",
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: true})],
    },
    {
        fingerprint: tuya.fingerprint("TS0502C", ["_TZ3210_6pwpez2j"]),
        model: "TS0502C",
        vendor: "Immax",
        description: "Neo FINO Smart pendant light black 80cm CCT 60W, Zigbee 3.0",
        extend: [m.light({colorTemp: {range: [153, 500]}})],
    },
    {
        zigbeeModel: ["Keyfob-ZB3.0"],
        model: "07046L",
        vendor: "Immax",
        description: "4-Touch single click buttons",
        fromZigbee: [fz.command_arm, fz.command_panic],
        exposes: [e.action(["disarm", "arm_stay", "arm_away", "panic"])],
        toZigbee: [],
    },
    {
        zigbeeModel: ["DoorWindow-Sensor-ZB3.0"],
        model: "07045L",
        vendor: "Immax",
        description: "Magnetic contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["Plug-230V-ZB3.0"],
        model: "07048L",
        vendor: "Immax",
        description: "NEO SMART plug",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.activePower(endpoint, {change: 5});
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ["losfena"],
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_wlosfena"]),
        model: "07703L",
        vendor: "Immax",
        description: "Radiator valve",
        fromZigbee: [legacy.fz.tuya_thermostat_weekly_schedule_2, legacy.fz.etop_thermostat, fz.ignore_tuya_set_time],
        toZigbee: [
            legacy.tz.etop_thermostat_system_mode,
            legacy.tz.etop_thermostat_away_mode,
            legacy.tz.tuya_thermostat_child_lock,
            legacy.tz.tuya_thermostat_current_heating_setpoint,
            legacy.tz.tuya_thermostat_weekly_schedule,
        ],
        extend: [tuya.modernExtend.tuyaBase({timeStart: "2000"})],
        meta: {
            timeout: 20000, // TRV wakes up every 10sec
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: 101,
            },
        },
        exposes: [
            e.battery_low(),
            e.child_lock(),
            e.away_mode(),
            e
                .climate()
                .withSetpoint("current_heating_setpoint", 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(["off", "heat", "auto"], ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE),
        ],
    },
    {
        zigbeeModel: ["Bulb-RGB+CCT-ZB3.0"],
        model: "07115L",
        vendor: "Immax",
        description: "Neo SMART LED E27 9W RGB + CCT, dimmable, Zigbee 3.0",
        extend: [m.light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ["4in1-Sensor-ZB3.0"],
        model: "07047L",
        vendor: "Immax",
        description: "Intelligent motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.temperature, fz.humidity, fz.ignore_iaszone_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["msTemperatureMeasurement", "msRelativeHumidity"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.temperature(), e.humidity()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["ColorTemperature"],
        fingerprint: [{modelID: "07073L", manufacturerName: "Seastar Intelligence"}],
        model: "07073L",
        vendor: "Immax",
        description: "Neo CANTO/HIPODROMO SMART, color temp, dimmable, Zigbee 3.0",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["IM-Z3.0-CCT"],
        model: "07042L",
        vendor: "Immax",
        description: "Neo RECUADRO SMART, color temp, dimmable, Zigbee 3.0",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        fingerprint: tuya.fingerprint("TS0202", ["_TZ3210_jijr1sss", "_TZ3210_m3mxv66l"]),
        model: "07502L",
        vendor: "Immax",
        description: "4 in 1 multi sensor",
        fromZigbee: [fz.battery, legacy.fz.ZB003X, fz.ZB003X_attr, fz.ZB003X_occupancy],
        toZigbee: [legacy.tz.ZB003X],
        exposes: [
            e.occupancy(),
            e.tamper(),
            e.battery(),
            e.temperature(),
            e.humidity(),
            e.numeric("reporting_time", ea.STATE_SET).withDescription("Reporting interval in minutes").withValueMin(0).withValueMax(1440),
            e.numeric("temperature_calibration", ea.STATE_SET).withDescription("Temperature calibration").withValueMin(-20).withValueMax(20),
            e.numeric("humidity_calibration", ea.STATE_SET).withDescription("Humidity calibration").withValueMin(-50).withValueMax(50),
            e.numeric("illuminance_calibration", ea.STATE_SET).withDescription("Illuminance calibration").withValueMin(-10000).withValueMax(10000),
            e.binary("pir_enable", ea.STATE_SET, true, false).withDescription("Enable PIR sensor"),
            e.binary("led_enable", ea.STATE_SET, true, false).withDescription("Enabled LED"),
            e.binary("reporting_enable", ea.STATE_SET, true, false).withDescription("Enabled reporting"),
            e.enum("sensitivity", ea.STATE_SET, ["low", "medium", "high"]).withDescription("PIR sensor sensitivity"),
            e.enum("keep_time", ea.STATE_SET, ["0", "30", "60", "120", "240"]).withDescription("PIR keep time in seconds"),
        ],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["TS0219"],
        model: "07504L",
        vendor: "Immax",
        description: "Neo outdoor smart siren (IP65)",
        fromZigbee: [fzLocal.ts0219ssIasWd, fz.battery, fzLocal.ts0219genBasic, fzLocal.ts0219ssIasZone],
        exposes: [
            e.battery(),
            e.battery_low(),
            e.battery_voltage(),
            e.binary("alarm", ea.ALL, true, false),
            e
                .numeric("volume", ea.ALL)
                .withValueMin(0)
                .withValueMax(50)
                .withDescription("Volume of siren")
                .withPreset("off", 0, "off")
                .withPreset("low", 5, "low volume")
                .withPreset("medium", 25, "medium volume")
                .withPreset("high", 50, "high volume"),
            e.numeric("duration", ea.ALL).withValueMin(0).withValueMax(3600).withUnit("s").withDescription("Duration of alarm"),
            e
                .numeric("light", ea.ALL)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Strobe light level")
                .withPreset("off", 0, "off light")
                .withPreset("low", 30, "low light")
                .withPreset("medium", 60, "medium light")
                .withPreset("high", 100, "high light"),
            e.enum("power_source", ea.STATE, ["mains", "battery"]).withDescription("The current power source"),
        ],
        toZigbee: [tzLocal.ts0219_alarm, tzLocal.ts0219_duration, tzLocal.ts0219_volume, tzLocal.ts0219_light, tz.power_source],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "ssIasZone", "ssIasWd"]);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            //configure reporting for zoneStatus to update alarm state (when alarm goes off)
            await endpoint.configureReporting(
                "ssIasZone",
                [
                    {
                        attribute: "zoneStatus",
                        minimumReportInterval: 0,
                        maximumReportInterval: repInterval.MAX,
                        reportableChange: 1,
                    },
                ],
                {},
            );

            await endpoint.read("genBasic", ["powerSource"]);
            await endpoint.read("ssIasZone", ["zoneState", "iasCieAddr", "zoneId", "zoneStatus"]);
            await endpoint.read("ssIasWd", ["maxDuration", 0x0002, 0x0001]);
        },
        extend: [
            //fix reported as Router
            m.forceDeviceType({type: "EndDevice"}),
        ],
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_n9clpsht", "_TZE200_nyvavzbj", "_TZE200_moycceze"]),
        model: "07505L",
        vendor: "Immax",
        description: "Neo smart keypad",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.action(["disarm", "arm_home", "arm_away", "sos"]),
            e.battery(),
            e.tamper(),
            e.text("admin_code", ea.STATE_SET).withDescription("Admin code").withAccess(ea.STATE),
            e.text("last_added_user_code", ea.STATE_SET).withDescription("Last Added User code").withAccess(ea.STATE),
            e.numeric("arm_delay_time", ea.STATE_SET).withValueMin(0).withValueMax(180).withDescription("Arm Delay Time"),
            e.binary("beep_sound_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Beep Sound Enabled"),
            e.binary("quick_home_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Quick Home Enabled"),
            e.binary("quick_disarm_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Quick Disarm Enabled"),
            e.binary("quick_arm_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Quick Arm Enabled"),
            e.binary("arm_delay_beep_sound", ea.STATE_SET, "ON", "OFF").withDescription("Arm Delay Beep Sound"),
            e.text("user_id", ea.STATE).withDescription("Last Used User ID"),
        ],
        meta: {
            tuyaDatapoints: [
                [3, "battery", tuya.valueConverter.raw],
                [24, "tamper", tuya.valueConverter.trueFalse1],
                [26, "action", tuya.valueConverter.static("disarm")],
                [27, "action", tuya.valueConverter.static("arm_away")],
                [28, "action", tuya.valueConverter.static("arm_home")],
                [29, "action", tuya.valueConverter.static("sos")],
                [108, "admin_code", tuya.valueConverter.raw],
                [109, "last_added_user_code", tuya.valueConverter.raw],
                [103, "arm_delay_time", tuya.valueConverter.raw],
                [104, "beep_sound_enabled", tuya.valueConverter.onOff],
                [105, "quick_home_enabled", tuya.valueConverter.onOff],
                [106, "quick_disarm_enabled", tuya.valueConverter.onOff],
                [107, "quick_arm_enabled", tuya.valueConverter.onOff],
                [111, "arm_delay_beep_sound", tuya.valueConverter.onOff],
                [112, "user_id", tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS004F", ["_TZ3000_krwtzhfd"]),
        model: "07767L",
        vendor: "Immax",
        description: "NEO Smart outdoor button",
        exposes: [e.battery(), e.action(["single", "double", "hold"])],
        fromZigbee: [fz.battery, tuya.fz.on_off_action],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
    },
];
