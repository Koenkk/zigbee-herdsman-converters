import {Definition, Fz, Tz, KeyValue} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
const e = exposes.presets;
const ea = exposes.access;
import * as zigbeeHerdsman from 'zigbee-herdsman/dist';

const manufacturerOptions = {manufacturerCode: zigbeeHerdsman.Zcl.ManufacturerCode.PLUGWISE_B_V};

const plugwisePushForce = {
    0: 'standard',
    0x60000: 'high',
    0x70000: 'very_high',
};

const plugwiseRadioStrength = {
    0: 'normal',
    1: 'high',
};

const fzLocal = {
    plugwise_radiator_valve: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = fz.thermostat.convert(model, msg, publish, options, meta) as KeyValue;

            // Reports pIHeatingDemand between 0 and 100 already
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = utils.precisionRound(msg.data['pIHeatingDemand'], 0);
            }

            if (typeof msg.data[0x4003] == 'number') {
                result.current_heating_setpoint = utils.precisionRound(msg.data[0x4003], 2) / 100;
            }
            if (typeof msg.data[0x4008] == 'number') {
                result.plugwise_t_diff = msg.data[0x4008];
            }
            if (typeof msg.data[0x4002] == 'number') {
                result.error_status = msg.data[0x4002];
            }
            if (typeof msg.data[0x4001] == 'number') {
                result.valve_position = msg.data[0x4001];
            }
            return result;
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    plugwise_calibrate_valve: {
        key: ['calibrate_valve'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('hvacThermostat', 'plugwiseCalibrateValve', {},
                {srcEndpoint: 11, disableDefaultResponse: true});
            return {state: {'calibrate_valve': value}};
        },
    } satisfies Tz.Converter,
    plugwise_valve_position: {
        key: ['plugwise_valve_position', 'valve_position'],
        convertSet: async (entity, key, value, meta) => {
            const payload = {0x4001: {value, type: 0x20}};
            await entity.write('hvacThermostat', payload, manufacturerOptions);
            // Tom does not automatically send back updated value so ask for it
            await entity.read('hvacThermostat', [0x4001], manufacturerOptions);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4001], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    plugwise_push_force: {
        key: ['plugwise_push_force', 'force'],
        convertSet: async (entity, key, value, meta) => {
            const val = utils.getKey(plugwisePushForce, value, value, Number);
            const payload = {0x4012: {value: val, type: 0x23}};
            await entity.write('hvacThermostat', payload, manufacturerOptions);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4012], manufacturerOptions);
        },
    } satisfies Tz.Converter,
    plugwise_radio_strength: {
        key: ['plugwise_radio_strength', 'radio_strength'],
        convertSet: async (entity, key, value, meta) => {
            const val = utils.getKey(plugwiseRadioStrength, value, value, Number);
            const payload = {0x4014: {value: val, type: 0x10}};
            await entity.write('hvacThermostat', payload, manufacturerOptions);
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('hvacThermostat', [0x4014], manufacturerOptions);
        },
    } satisfies Tz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['160-01'],
        model: '160-01',
        vendor: 'Plugwise',
        description: 'Plug power socket on/off with power consumption monitoring',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['106-03'],
        model: '106-03',
        vendor: 'Plugwise',
        description: 'Tom thermostatic radiator valve',
        fromZigbee: [fz.temperature, fz.battery, fzLocal.plugwise_radiator_valve],
        // sytem_mode and occupied_heating_setpoint is not supported: https://github.com/Koenkk/zigbee2mqtt.io/pull/1666
        toZigbee: [
            tz.thermostat_pi_heating_demand,
            tzLocal.plugwise_valve_position,
            tzLocal.plugwise_push_force,
            tzLocal.plugwise_radio_strength,
            tzLocal.plugwise_calibrate_valve,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg', 'hvacThermostat']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
        exposes: [e.battery(),
            e.numeric('pi_heating_demand', ea.STATE_GET).withValueMin(0).withValueMax(100).withUnit('%')
                .withDescription('Position of the valve (= demanded heat) where 0% is fully closed and 100% is fully open'),
            e.numeric('local_temperature', ea.STATE).withUnit('°C').withDescription('Current temperature measured on the device'),
            e.numeric('valve_position', ea.ALL).withValueMin(0).withValueMax(100)
                .withDescription('Directly control the radiator valve. The values range from 0 (valve ' +
                    'closed) to 100 (valve fully open)'),
            e.enum('force', ea.ALL, ['standard', 'high', 'very_high'])
                .withDescription('How hard the motor pushes the valve. The closer to the boiler, the higher the force needed'),
            e.enum('radio_strength', ea.ALL, ['normal', 'high'])
                .withDescription('Transmits with higher power when range is not sufficient'),
            e.binary('calibrate_valve', ea.STATE_SET, 'calibrate', 'idle')
                .withDescription('Calibrates valve on next wakeup'),
        ],
    },
    {
        zigbeeModel: ['158-01'],
        model: '158-01',
        vendor: 'Plugwise',
        description: 'Lisa zone thermostat',
        fromZigbee: [fz.thermostat, fz.temperature, fz.battery],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg', 'hvacThermostat']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint);
        },
        exposes: [e.battery(),
            e.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5, ea.ALL)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'auto'], ea.ALL),
        ],
    },
];

export default definitions;
module.exports = definitions;
