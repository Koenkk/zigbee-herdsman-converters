import { Definition } from 'src/lib/types';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
const e = exposes.presets;
const ea = exposes.access;


const definition: Definition[] = [{
    // Since a lot of TuYa devices use the same modelID, but use different datapoints
    // it's necessary to provide a fingerprint instead of a zigbeeModel
    fingerprint: [
        {
            // The model ID from: Device with modelID 'TS0601' is not supported
            // You may need to add \u0000 at the end of the name in some cases
            modelID: 'TS0601',
            // The manufacturer name from: Device with modelID 'TS0601' is not supported.
            manufacturerName: '_TZE200_e5hpkc6d',
        },
    ],
    model: 'Co020',
    vendor: 'Futurehome',
    description: 'Smart Thermostat',
    fromZigbee: [legacy.fz.connecte_thermostat],
    toZigbee: [legacy.tz.connecte_thermostat],
    onEvent: tuya.onEventSetTime, // Add this if you are getting no converter for 'commandMcuSyncTime'
    configure: tuya.configureMagicPacket,
    exposes: [
        // Here you should put all functionality that your device exposes
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
    meta: {
        // All datapoints go in here
        tuyaDatapoints: [
            [101, 'schedule_monday', tuya.valueConverter.thermostatScheduleDayMultiDP],
            [102, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDayMultiDP],
            [103, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDayMultiDP],
            [104, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDayMultiDP],
            [105, 'schedule_friday', tuya.valueConverter.thermostatScheduleDayMultiDP],
            [106, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDayMultiDP],
            [107, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDayMultiDP],
        ],
    },
}];

module.exports = definition;