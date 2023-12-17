import {Definition} from 'src/lib/types';
import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
import * as ota from '../lib/ota';
import {light} from '../lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_e5hpkc6d', '_TZE200_4hbx5cvx', '_TZE200_e5hpkc6d']),
        model: 'TS0601_futurehome_thermostat',
        vendor: 'Futurehome',
        description: 'Thermostat',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        whiteLabel: [
            tuya.whitelabel('Futurehome', 'Co020', 'Smart thermostat', ['_TZE200_e5hpkc6d']),
        ],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.climate()
                .withSystemMode(['off', 'heat'], ea.STATE_SET, 'Whether the thermostat is turned on or off')
                .withPreset(['user', 'home', 'away', 'auto'])
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET),
            e.temperature_sensor_select(['air_sensor', 'floor_sensor', 'max_guard'])
                .withDescription(
                    'Max guard. Floor sensor must be installed. The thermostat will regulate according to the room sensor, ' +
                    'but interrupt heating if the floor sensor exceeds the maximum guard temperature. Standard is 27°C' +
                    '\n\n' +
                    'There is also a maximum guard when the thermostat is set to floor sensor. ' +
                    'The thermostat regulates according to the floor sensor, but will interrupt heating if the floor sensor ' +
                    'exceeds the maximum guard temperature. Standard is 27°C.',
                ),
            e.numeric('local_temperature_floor', ea.STATE)
                .withUnit('°C')
                .withDescription('Current temperature measured on the external sensor (floor)')
                .withValueStep(1),
            e.child_lock(),
            e.window_detection(),
            e.numeric('hysteresis', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('The offset from the target temperature in which the temperature has to ' +
                'change for the heating state to change. This is to prevent erratically turning on/off ' +
                'when the temperature is close to the target.')
                .withValueMin(1)
                .withValueMax(9)
                .withValueStep(1),
            e.numeric('max_temperature_protection', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('Max guarding temperature')
                .withValueMin(20)
                .withValueMax(95)
                .withValueStep(1),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({off: false, heat: true})],
                [2, 'preset', tuya.valueConverterBasic.lookup({user: tuya.enum(0), home: tuya.enum(1), away: tuya.enum(2), auto: tuya.enum(3)})],
                [16, 'current_heating_setpoint', tuya.valueConverter.raw],
                [24, 'local_temperature', tuya.valueConverter.raw],
                [28, 'local_temperature_calibration', tuya.valueConverter.raw],
                [30, 'child_lock', tuya.valueConverter.lockUnlock],
                [101, 'local_temperature_floor', tuya.valueConverter.raw],
                [102, 'sensor', tuya.valueConverterBasic.lookup(
                    {air_sensor: tuya.enum(0), floor_sensor: tuya.enum(1), max_guard: tuya.enum(2)})],
                [103, 'hysteresis', tuya.valueConverter.raw],
                [104, 'running_state', tuya.valueConverterBasic.lookup({idle: false, heat: true})],
                // In the old handler, endpoint 105 was left unused. I don't know what this value means.
                // Leaving it in here for future reference in case someone else figures it out.
                // connecteTempProgram: 105
                [106, 'window_detection', tuya.valueConverter.onOff],
                [107, 'max_temperature_protection', tuya.valueConverter.raw],
            ],
        },
    },
    {
        zigbeeModel: ['FH9130'],
        model: '4509243',
        vendor: 'Futurehome',
        description: 'Smart puck',
        ota: ota.zigbeeOTA,
        extend: [light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
