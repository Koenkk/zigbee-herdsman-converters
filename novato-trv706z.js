const exposes = require('zigbee-herdsman-converters/lib/exposes');
const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const e = exposes.presets;
const ea = exposes.access;

const definition = {
    fingerprint: tuya.fingerprint('TS0601', ['_TZE284_ltwbm23f']),
    model: 'TRV706Z',
    vendor: 'Novato',
    description: 'Thermostatic radiator valve (Novato TRV706Z).',
    whiteLabel: [
        tuya.whitelabel(
            'Novato',
            'TRV706Z',
            'Thermostatic radiator valve',
            ['_TZE284_ltwbm23f', '_TZE204_qyr2m29i'],
        ),
    ],

    extend: [
        tuya.modernExtend.tuyaBase({
            dp: true,
            timeStart: '1970',
        }),
    ],

    exposes: [
        e.battery(),
        e.child_lock(),
        e.max_temperature(),
        e.min_temperature(),
        e.position(),
        e.window_detection(),
        e
            .numeric('boost_timeset_countdown', ea.STATE_SET)
            .withUnit('m')
            .withDescription('0–120 dk boost süresi. Boost açıkken kalan süre dakikada geri sayar (120 → 0).')
            .withValueMin(0)
            .withValueMax(120),
        e.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
            .withDescription('Antifriz koruması'),
        e.binary('window', ea.STATE, 'OPEN', 'CLOSE')
            .withDescription('Pencere durumu (açık/kapalı)'),
        e
            .climate()
            .withLocalTemperature(ea.STATE)
            .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
            .withLocalTemperatureCalibration(-10, 10, 0.1, ea.STATE_SET)
            .withPreset(['off', 'antifrost', 'eco', 'comfort', 'auto', 'on'])
            .withRunningState(['idle', 'heat'], ea.STATE)
            .withSystemMode(['auto', 'heat', 'off'], ea.STATE),
        ...tuya.exposes.scheduleAllDays(
            ea.STATE_SET,
            'HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C HH:MM/C',
        ),
        e.comfort_temperature()
            .withValueMin(5)
            .withValueMax(30)
            .withDescription('Konfor modu sıcaklık'),
        e.eco_temperature()
            .withValueMin(5)
            .withValueMax(30)
            .withDescription('Eco modu sıcaklık'),
        e.holiday_temperature()
            .withValueMin(5)
            .withValueMax(30)
            .withDescription('Antifriz modu sıcaklık'),
        e.enum('display_brightness', ea.STATE_SET, ['high', 'medium', 'low'])
            .withDescription('Ekran parlaklığı'),
        e.enum('screen_orientation', ea.STATE_SET, ['up', 'down'])
            .withDescription('Ekran yönü'),
        e.enum('hysteresis', ea.STATE_SET, ['comfort', 'eco'])
            .withDescription(
                'Histerezis: comfort = hedef sıcaklıkta kademeli vana (0-100%), ' +
                'eco = ±0.5°C dalgalı, vana tam açık/tam kapalı',
            ),
        e.enum('motor_thrust', ea.STATE_SET, ['strong', 'middle', 'weak'])
            .withDescription('Vana itiş gücü'),
    ],

    meta: {
        tuyaDatapoints: [
            [
                2,
                null,
                tuya.valueConverter.thermostatSystemModeAndPresetMap({
                    fromMap: {
                        0: {deviceMode: 'off',       systemMode: 'off',  preset: 'off'},
                        1: {deviceMode: 'antifrost', systemMode: 'auto', preset: 'antifrost'},
                        2: {deviceMode: 'eco',       systemMode: 'auto', preset: 'eco'},
                        3: {deviceMode: 'comfort',   systemMode: 'auto', preset: 'comfort'},
                        4: {deviceMode: 'auto',      systemMode: 'auto', preset: 'auto'},
                        5: {deviceMode: 'on',        systemMode: 'heat', preset: 'on'},
                    },
                }),
            ],
            [
                2,
                'preset',
                tuya.valueConverter.thermostatSystemModeAndPresetMap({
                    toMap: {
                        off:       new tuya.Enum(0),
                        antifrost: new tuya.Enum(1),
                        eco:       new tuya.Enum(2),
                        comfort:   new tuya.Enum(3),
                        auto:      new tuya.Enum(4),
                        on:        new tuya.Enum(5),
                    },
                }),
            ],
            [
                2,
                'system_mode',
                tuya.valueConverter.thermostatSystemModeAndPresetMap({
                    toMap: {
                        off:  new tuya.Enum(0),
                        auto: new tuya.Enum(4),
                        heat: new tuya.Enum(5),
                    },
                }),
            ],
            [3,   'running_state',                tuya.valueConverterBasic.lookup({heat: 1, idle: 0})],
            [4,   'current_heating_setpoint',     tuya.valueConverter.divideBy10],
            [5,   'local_temperature',            tuya.valueConverter.divideBy10],
            [6,   'battery',                      tuya.valueConverter.raw],
            [7,   'child_lock',                   tuya.valueConverterBasic.lookup({LOCK: true, UNLOCK: false})],
            [9,   'max_temperature',              tuya.valueConverter.divideBy10],
            [10,  'min_temperature',              tuya.valueConverter.divideBy10],
            [14,  'window_detection',             tuya.valueConverterBasic.lookup({ON: true, OFF: false})],
            [15,  'window',                       tuya.valueConverterBasic.lookup({CLOSE: tuya.enum(0), OPEN: tuya.enum(1)})],
            [47,  'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
            [102, 'schedule_monday',               tuya.valueConverter.thermostatScheduleDayMultiDP_TRV602Z_WithDayNumber(1)],
            [103, 'schedule_tuesday',              tuya.valueConverter.thermostatScheduleDayMultiDP_TRV602Z_WithDayNumber(2)],
            [104, 'schedule_wednesday',            tuya.valueConverter.thermostatScheduleDayMultiDP_TRV602Z_WithDayNumber(3)],
            [105, 'schedule_thursday',             tuya.valueConverter.thermostatScheduleDayMultiDP_TRV602Z_WithDayNumber(4)],
            [106, 'schedule_friday',               tuya.valueConverter.thermostatScheduleDayMultiDP_TRV602Z_WithDayNumber(5)],
            [107, 'schedule_saturday',             tuya.valueConverter.thermostatScheduleDayMultiDP_TRV602Z_WithDayNumber(6)],
            [108, 'schedule_sunday',               tuya.valueConverter.thermostatScheduleDayMultiDP_TRV602Z_WithDayNumber(7)],
            [110, 'motor_thrust',                  tuya.valueConverterBasic.lookup({strong: tuya.enum(0), middle: tuya.enum(1), weak: tuya.enum(2)})],
            [111, 'display_brightness',            tuya.valueConverterBasic.lookup({high: tuya.enum(0), medium: tuya.enum(1), low: tuya.enum(2)})],
            [113, 'screen_orientation',            tuya.valueConverterBasic.lookup({up: tuya.enum(0), down: tuya.enum(1)})],
            [114, 'position',                      tuya.valueConverter.divideBy10],
            [118, 'boost_timeset_countdown',       tuya.valueConverter.raw],
            [119, 'comfort_temperature',           tuya.valueConverter.divideBy10],
            [120, 'eco_temperature',               tuya.valueConverter.divideBy10],
            [121, 'holiday_temperature',           tuya.valueConverter.divideBy10],
            [122, 'frost_protection',              tuya.valueConverter.onOff],
            [127, 'hysteresis',                    tuya.valueConverterBasic.lookup({comfort: tuya.enum(0), eco: tuya.enum(1)})],
        ],
    },
};

module.exports = [definition];
