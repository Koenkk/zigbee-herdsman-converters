import {Definition} from 'src/lib/types';
import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [
            {
                modelID: 'TS0601',
                manufacturerName: '_TZE204_e5hpkc6d',
            },
        ],
        model: 'TS0601_futurehome_thermostat',
        vendor: 'Futurehome',
        description: 'Futurehome Thermostat',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e
                .climate()
                .withSystemMode(
                    ['off', 'heat'],
                    ea.STATE_SET,
                    'Whether the thermostat is turned on or off',
                )
                .withPreset(['user', 'home', 'away', 'auto'])
                .withLocalTemperature(ea.STATE)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET),
            e
                .enum('temperature_sensor', ea.STATE, [
                    'air_sensor',
                    'floor_sensor',
                    'max_guard',
                ])
                .withDescription(
                    'Max guard. Floor sensor must be installed. The thermostat will regulate according to the room sensor, ' +
                        'but interrupt heating if the floor sensor exceeds the maximum guard temperature. Standard is 27°C' +
                        '\n\n' +
                        'There is also a maximum guard when the thermostat is set to floor sensor. ' +
                        'The thermostat regulates according to the floor sensor, but will interrupt heating if the floor sensor ' +
                        'exceeds the maximum guard temperature. Standard is 27°C.',
                ),
            e
                .numeric('local_temperature_floor', ea.STATE)
                .withUnit('°C')
                .withDescription('Floor temperature'),
        ],
        meta: {
            tuyaDatapoints: [
                [
                    1,
                    'system_mode',
                    tuya.valueConverterBasic.lookup({
                        off: false,
                        heat: true,
                    }),
                ],
                [
                    2,
                    'preset',
                    tuya.valueConverterBasic.lookup({
                        user: tuya.enum(0),
                        home: tuya.enum(1),
                        away: tuya.enum(2),
                        auto: tuya.enum(3),
                    }),
                ],
                [16, 'current_heating_setpoint', tuya.valueConverter.raw],
                [24, 'local_temperature', tuya.valueConverter.raw],
                [101, 'local_temperature_floor', tuya.valueConverter.raw],
                [
                    102,
                    'temperature_sensor',
                    tuya.valueConverterBasic.lookup({
                        'air_sensor': tuya.enum(0),
                        'floor_sensor': tuya.enum(1),
                        'max_guard': tuya.enum(2),
                    }),
                ],
                [
                    104,
                    'running_state',
                    tuya.valueConverterBasic.lookup({
                        idle: false,
                        heat: true,
                    }),
                ],
            ],
        },
    },
];

module.exports = definitions;
