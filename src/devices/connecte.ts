import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_e5hpkc6d', '_TZE200_4hbx5cvx', '_TZE200_e5hpkc6d']),
        model: '4500994',
        vendor: 'Connecte',
        description: 'Smart thermostat',
        fromZigbee: [legacy.fz.connecte_thermostat],
        toZigbee: [legacy.tz.connecte_thermostat],
        whiteLabel: [
            tuya.whitelabel('Futurehome', 'Co020', 'Smart thermostat', ['_TZE200_e5hpkc6d']),
        ],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.binary('state', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('On/off state of the switch'),
            e.child_lock(),
            e.window_detection(),
            e.away_mode(),
            e.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withSystemMode(['heat', 'auto'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.temperature_sensor_select(['internal', 'external', 'both']),
            e.numeric('external_temperature', ea.STATE)
                .withUnit('°C')
                .withDescription('Current temperature measured on the external sensor (floor)'),
            e.numeric('hysteresis', ea.STATE_SET)
                .withDescription('The difference between the temperature at which the thermostat switches off, ' +
                'and the temperature at which it switches on again.')
                .withValueMin(1)
                .withValueMax(9),
            e.numeric('max_temperature_protection', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('Max guarding temperature')
                .withValueMin(20)
                .withValueMax(95),
        ],
    },
];

module.exports = definitions;
