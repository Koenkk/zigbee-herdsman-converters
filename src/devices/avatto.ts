import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_s139roas']),
        model: 'ZWSH16',
        vendor: 'AVATTO',
        description: 'Smart Temperature and Humidity Detector',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {seq: 0x0002});
        },
        exposes: [e.battery(), e.temperature(), e.humidity(), tuya.exposes.temperatureUnit(), tuya.exposes.batteryState()],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [2, 'humidity', tuya.valueConverter.raw],
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnit],
                [14, 'battery_state', tuya.valueConverter.batteryState],
                [15, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
                    '_TZE200_ybsqljjg',
                    '_TZE200_cxakecfo' /* model: 'ME168', vendor: 'GIRIER' */,
        ]),
        model: 'ME168',
        vendor: 'AVATTO',
        description: 'Thermostatic radiator valve',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        whiteLabel: [
            tuya.whitelabel('GIRIER', 'ME168', 'Thermostatic radiator valve', ['_TZE200_cxakecfo']),
        ],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        ota: true,
        exposes: [
            e.battery(),
            //! to fix as the exposed format is bitmap
            e.numeric('error', ea.STATE).withDescription('If NTC is damaged, "Er" will be on the TRV display.'),
            e.child_lock().withCategory('config'),
            e
                .enum('running_mode', ea.STATE, ['auto', 'manual', 'off', 'eco', 'comfort', 'boost'])
                .withDescription('Actual TRV running mode')
                .withCategory('diagnostic'),
            e
                .climate()
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET, 'Basic modes')
                .withPreset(['eco', 'comfort', 'boost'], 'Additional heat modes')
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withSetpoint('current_heating_setpoint', 4, 35, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-30, 30, 1, ea.STATE_SET),
            e
                .binary('window_detection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Enables/disables window detection on the device')
                .withCategory('config'),
            e.window_open(),
            e
                .binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription(
                    'When the room temperature is lower than 5 °C, the valve opens; when the temperature rises to 8 °C, the valve closes.',
                )
                .withCategory('config'),
            e
                .binary('scale_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription(
                    'If the heat sink is not fully opened within ' +
                        'two weeks or is not used for a long time, the valve will be blocked due to silting up and the heat sink will not be ' +
                        'able to be used. To ensure normal use of the heat sink, the controller will automatically open the valve fully every ' +
                        'two weeks. It will run for 30 seconds per time with the screen displaying "Ad", then return to its normal working state ' +
                        'again.',
                )
                .withCategory('config'),
            e
                .numeric('boost_time', ea.STATE_SET)
                .withUnit('min')
                .withDescription('Boost running time')
                .withValueMin(0)
                .withValueMax(255)
                .withCategory('config'),
            e.numeric('boost_timeset_countdown', ea.STATE).withUnit('min').withDescription('Boost time remaining'),
            e.eco_temperature().withValueMin(5).withValueMax(35).withValueStep(1).withCategory('config'),
            e.comfort_temperature().withValueMin(5).withValueMax(35).withValueStep(1).withCategory('config'),
            ...tuya.exposes
                .scheduleAllDays(ea.STATE_SET, '06:00/21.0 08:00/16.0 12:00/21.0 14:00/16.0 18:00/21.0 22:00/16.0')
                .map((text) => text.withCategory('config')),
        ],
        meta: {
            tuyaDatapoints: [
                // mode (RW Enum [0=auto, 1=manual, 2=off, 3=eco, 4=comfort, 5=boost])
                [
                    2,
                    null,
                    tuya.valueConverter.thermostatSystemModeAndPresetMap({
                        fromMap: {
                            0: {device_mode: 'auto', system_mode: 'auto', preset: 'none'},
                            1: {device_mode: 'manual', system_mode: 'heat', preset: 'none'},
                            2: {device_mode: 'off', system_mode: 'off', preset: 'none'},
                            3: {device_mode: 'eco', system_mode: 'heat', preset: 'eco'},
                            4: {device_mode: 'comfort', system_mode: 'heat', preset: 'comfort'},
                            5: {device_mode: 'boost', system_mode: 'heat', preset: 'boost'},
                        },
                    }),
                ],
                [
                    2,
                    'system_mode',
                    tuya.valueConverter.thermostatSystemModeAndPresetMap({
                        toMap: {
                            auto: new tuya.Enum(0), // auto
                            heat: new tuya.Enum(1), // manual
                            off: new tuya.Enum(2), // off
                        },
                    }),
                ],
                [
                    2,
                    'preset',
                    tuya.valueConverter.thermostatSystemModeAndPresetMap({
                        toMap: {
                            none: new tuya.Enum(1), // manual
                            eco: new tuya.Enum(3), // eco
                            comfort: new tuya.Enum(4), // comfort
                            boost: new tuya.Enum(5), // boost
                        },
                    }),
                ],
                // work_state (RO Enum [0=opened, 1=closed])
                [3, 'running_state', tuya.valueConverterBasic.lookup({heat: tuya.enum(0), idle: tuya.enum(1)})],
                // temp_set (RW Integer, 40-350 C, scale 1 step 10)
                [4, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                // temp_current (RO Integer, -0-500 C, scale 1 step 10)
                [5, 'local_temperature', tuya.valueConverter.divideBy10],
                // battery_percentage (RO, Integer, 0-100 %, scale 0 step 1)
                [6, 'battery', tuya.valueConverter.raw],
                // child_lock (RW Boolean)
                [7, 'child_lock', tuya.valueConverter.lockUnlock],
                //! load_status (RW, Enum, range [0=closed, 1=opened]) - Non-functional
                // [13, 'load_status', tuya.valueConverterBasic.lookup({CLOSE: tuya.enum(0), OPEN: tuya.enum(1)})],
                // window_check (RW Boolean)
                [14, 'window_detection', tuya.valueConverter.onOff],
                // window_state (RO Enum, range [0=opened, 1=closed])
                [15, 'window_open', tuya.valueConverter.trueFalseEnum0],
                // week_program_13_(1-7) (RW Raw, maxlen 128, special binary-in-base64 format)
                [28, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(1, 6)],
                [29, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(2, 6)],
                [30, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(3, 6)],
                [31, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(4, 6)],
                [32, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(5, 6)],
                [33, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(6, 6)],
                [34, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDPWithDayNumber(7, 6)],
                //? error (RO Bitmap, maxlen 2, label [0x=low_battery, x0=sensor_fault]?)
                [35, null, tuya.valueConverter.errorOrBatteryLow],
                // frost (RW Boolean)
                [36, 'frost_protection', tuya.valueConverter.onOff],
                //! rapid_switch (RW Boolean) - Non-functional
                // [37, 'rapid_switch', tuya.valueConverter.onOff],
                //! rapid_countdown (RW Integer, 1-12 h, scale 0 step 1) - Non-functional
                // [38, 'rapid_countdown', tuya.valueConverter.raw],
                // scale_switch (RW Boolean)
                [39, 'scale_protection', tuya.valueConverter.onOff],
                // temp_correction (RW Integer, -10-10 C, scale 0 step 1)
                [47, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration2],
                // comfort_temp (RW Integer, 100-250 C, scale 1 step 10)
                [101, 'comfort_temperature', tuya.valueConverter.divideBy10],
                //! switch (RW Boolean) - Non-functional
                // [102, 'switch', tuya.valueConverter.onOff],
                // rapid_time_set (RW Integer, 0-180 min, scale 0 step 1)
                [103, 'boost_time', tuya.valueConverter.raw],
                // heating_countdown (RO Integer, 0-3600 min, scale 0 step 1)
                [104, 'boost_timeset_countdown', tuya.valueConverter.countdown],
                // eco_temp (RW Integer, 100-200 C, scale 1 step 10)
                [105, 'eco_temperature', tuya.valueConverter.divideBy10],
                //! eco (RW Boolean) - Non-functional
                // [106, 'eco', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_goecjd1t']),
        model: 'ZWPM16',
        vendor: 'AVATTO',
        description: 'Zigbee smart energy meter',
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            e.power(),
            e.voltage(),
            e.current(),
            e.energy(),
            e.numeric('daily_energy', ea.STATE).withUnit('kWh').withDescription('Daily energy'),
        ],
        meta: {
            tuyaDatapoints: [
                [18, 'current', tuya.valueConverter.divideBy1000],
                [19, 'power', tuya.valueConverter.divideBy10],
                [20, 'voltage', tuya.valueConverter.divideBy10],
                [104, 'energy', tuya.valueConverter.divideBy1000],
                [105, 'daily_energy', tuya.valueConverter.divideBy1000],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_jrcfsaa3']),
        model: 'ZWPM16-2',
        vendor: 'AVATTO',
        description: 'Zigbee smart energy meter 80A/2CH',
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [
            tuya.exposes.voltageWithPhase('l1'),
            tuya.exposes.powerWithPhase('l1'),
            tuya.exposes.currentWithPhase('l1'),
            tuya.exposes.energyWithPhase('l1'),
            e.numeric('daily_energy_l1', ea.STATE).withUnit('kWh').withDescription('Daily energy L1'),
            tuya.exposes.voltageWithPhase('l2'),
            tuya.exposes.powerWithPhase('l2'),
            tuya.exposes.currentWithPhase('l2'),
            tuya.exposes.energyWithPhase('l2'),
            e.numeric('daily_energy_l2', ea.STATE).withUnit('kWh').withDescription('Daily energy L2'),
        ],
        meta: {
            tuyaDatapoints: [
                [105, 'power_l1', tuya.valueConverter.divideBy10],
                [106, 'current_l1', tuya.valueConverter.divideBy1000],
                [107, 'voltage_l1', tuya.valueConverter.divideBy10],
                [108, 'energy_l1', tuya.valueConverter.divideBy1000],
                [109, 'daily_energy_l1', tuya.valueConverter.divideBy1000],
                [115, 'power_l2', tuya.valueConverter.divideBy10],
                [116, 'current_l2', tuya.valueConverter.divideBy1000],
                [117, 'voltage_l2', tuya.valueConverter.divideBy10],
                [118, 'energy_l2', tuya.valueConverter.divideBy1000],
                [119, 'daily_energy_l2', tuya.valueConverter.divideBy1000],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
