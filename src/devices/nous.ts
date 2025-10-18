import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
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
        extend: [tuya.modernExtend.tuyaBase({forceTimeUpdates: true})],
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
        extend: [tuya.modernExtend.tuyaBase({forceTimeUpdates: true, bindBasicOnConfigure: true})],
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
        description: "Zigbee gas sensor",
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary("gas", ea.STATE, "ON", "OFF").withDescription("Gas detection state (ON = Gas detected)"),
            e.binary("preheat", ea.STATE, "ON", "OFF").withDescription("Sensor is preheating"),
            e.binary("fault_alarm", ea.STATE, "ON", "OFF").withDescription("Sensor fault detected"),
            e.numeric("lifecycle", ea.STATE).withUnit("%").withDescription("Sensor life remaining"),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "gas", tuya.valueConverter.trueFalse0],
                [10, "preheat", tuya.valueConverter.trueFalse0],
                [11, "fault_alarm", tuya.valueConverter.trueFalse1],
                [12, "lifecycle", tuya.valueConverter.raw],
            ],
        },
    },
    // --- Datapoints (DP) ---
const DP_LEAK_STATUS = 1;        // Состояние протечки
const DP_BATTERY_LEVEL = 4;      // Заряд батареи
const DP_WORKING_MODE = 101;     // Режим работы
const DP_STATUS = 102;           // Статус устройства
const DP_ALARM_RINGTONE = 103;   // Тон сирены

// --- Константы маппинга ---
const WORKING_MODES = {
    0: 'normal',
    1: 'silent',
    2: 'test',
},

const ALARM_RINGTONES = {
    0: 'tone_1',
    1: 'tone_2',
    2: 'tone_3',
},

// --- Локальная функция lookup (замена tuya.valueConverter.lookup) ---
const valueConverterLookup = (lookupTable) => ({
    from: (v) => lookupTable[v] ?? v,
    to: (v) => {
        const entry = Object.entries(lookupTable).find(([, name]) => name === v);
        return entry ? Number(entry[0]) : v;
    },
}),

// --- Основное описание устройства ---
const definition = {
    fingerprint: tuya.fingerprint('TS0601', ['_TZE284_1di7ujzp']),
    model: 'E13',
    vendor: 'NOUS',
    description: 'Tuya Zigbee water leak sensor with sound alarm',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    configure: tuya.configureMagicPacket,
    exposes: [
        e.water_leak().withDescription('Water leak detected or not'),
        e.battery().withDescription('Battery level in %'),
        e.enum('working_mode', ea.ALL, Object.values(WORKING_MODES))
            .withDescription('Operational mode of the device'),
        e.text('status', ea.STATE)
            .withDescription('Device status (normal, fault, etc.)'),
        e.enum('alarm_ringtone', ea.ALL, Object.values(ALARM_RINGTONES))
            .withDescription('Select alarm ringtone'),
    ],
    meta: {
        tuyaDatapoints: [
            [DP_LEAK_STATUS, 'water_leak', tuya.valueConverter.trueFalse0],
            [DP_BATTERY_LEVEL, 'battery', tuya.valueConverter.raw],
            [DP_WORKING_MODE, 'working_mode', valueConverterLookup(WORKING_MODES)],
            [DP_STATUS, 'status', tuya.valueConverter.raw],
            [DP_ALARM_RINGTONE, 'alarm_ringtone', valueConverterLookup(ALARM_RINGTONES)],
        ],
    },
},
    // --- Datapoints (DP) ---
const DP_CO_STATE = 1;       // Состояние CO (норма / тревога)
const DP_CO_VALUE = 2;       // Уровень CO в ppm
const DP_SELF_CHECKING = 8;  // Самопроверка
const DP_CHECK_RESULT = 9;   // Результат самопроверки
const DP_PREHEAT = 10;       // Прогрев
const DP_FAULT = 11;         // Ошибка
const DP_LIFECYCLE = 12;     // Срок службы
const DP_BATTERY_STATE = 14; // Заряд батареи

// --- Маппинги статусов ---
const CO_STATES = {0: 'normal', 1: 'alarm'};
const CHECK_RESULTS = {0: 'ok', 1: 'error'};
const PREHEAT_STATE = {0: 'off', 1: 'on'};
const FAULT_STATE = {0: 'normal', 1: 'fault'};

// --- Локальная функция lookup ---
const valueConverterLookup = (lookupTable) => ({
    from: (v) => lookupTable[v] ?? v,
    to: (v) => {
        const entry = Object.entries(lookupTable).find(([, name]) => name === v);
        return entry ? Number(entry[0]) : v;
    },
}),

// --- Основное описание устройства ---
const definition = {
    fingerprint: tuya.fingerprint('TS0601', ['_TZE284_sonkaxrd']),
    model: 'E12',
    vendor: 'NOUS',
    description: 'Tuya Zigbee carbon monoxide (CO) sensor',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    configure: tuya.configureMagicPacket,
    exposes: [
        e.enum('co_state', ea.STATE, Object.values(CO_STATES))
            .withDescription('CO alarm state (normal or alarm)'),
        e.numeric('co_value', ea.STATE)
            .withUnit('ppm')
            .withDescription('Current CO concentration'),
        e.binary('self_checking', ea.ALL, 'ON', 'OFF')
            .withDescription('Triggers self-checking process'),
        e.enum('checking_result', ea.STATE, Object.values(CHECK_RESULTS))
            .withDescription('Result of self-checking'),
        e.enum('preheat', ea.STATE, Object.values(PREHEAT_STATE))
            .withDescription('Sensor preheating status'),
        e.enum('fault', ea.STATE, Object.values(FAULT_STATE))
            .withDescription('Sensor fault indicator'),
        e.numeric('lifecycle', ea.STATE)
            .withUnit('days')
            .withDescription('Sensor service life or usage counter'),
        e.battery().withDescription('Battery level in %'),
    ],
    meta: {
        tuyaDatapoints: [
            [DP_CO_STATE, 'co_state', valueConverterLookup(CO_STATES)],
            [DP_CO_VALUE, 'co_value', tuya.valueConverter.raw],
            [DP_SELF_CHECKING, 'self_checking', tuya.valueConverter.trueFalse0],
            [DP_CHECK_RESULT, 'checking_result', valueConverterLookup(CHECK_RESULTS)],
            [DP_PREHEAT, 'preheat', valueConverterLookup(PREHEAT_STATE)],
            [DP_FAULT, 'fault', valueConverterLookup(FAULT_STATE)],
            [DP_LIFECYCLE, 'lifecycle', tuya.valueConverter.raw],
            [DP_BATTERY_STATE, 'battery', tuya.valueConverter.raw],
        ],
    },
},
],
