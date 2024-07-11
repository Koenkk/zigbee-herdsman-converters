import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import {Definition, Fz, KeyValue, KeyValueAny, Publish, Tz, Zh} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;
import {zigbeeOTA} from '../lib/ota';

const valve_statuses = ['OFF', 'ON', 'MOVING', 'STUCK'];
const battery_types = ['LIION', 'ALKALINE', 'NIMH'];
const operation_modes = ['Monitor', 'Heater', 'Cooler'];

const createConverter = (
    cluster: string,
    key: string,
    type: string,
    convert: (model: Definition, msg: Fz.Message, publish: Publish, options: KeyValue, meta: Fz.Meta) => KeyValueAny | void | Promise<void>,
) =>
    ({
        cluster,
        type: ['attributeReport', 'readResponse'],
        convert,
    }) satisfies Fz.Converter;

const createSetConverter = (
    cluster: string,
    key: string,
    convertSet: (entity: Zh.Endpoint | Zh.Group, key: string, value: unknown, meta: Tz.Meta) => Promise<Tz.ConvertSetResult>,
) =>
    ({
        key: [key],
        convertSet,
        convertGet: async (entity, key, meta) => {
            await entity.read(cluster, ['presentValue']);
        },
    }) satisfies Tz.Converter;

const fzLocal = {
    status: createConverter('genMultistateInput', 'status', 'state', (model, msg, publish, options, meta) => {
        return {status: valve_statuses[msg.data['presentValue']]};
    }),
    kamikaze: createConverter('genBinaryValue', 'kamikaze', 'state', (model, msg, publish, options, meta) => {
        return {kamikaze: msg.data['presentValue'] ? 'ON' : 'OFF'};
    }),
    stall_time: createConverter('genMultistateValue', 'stall_time', 'state', (model, msg, publish, options, meta) => {
        return {stall_time: msg.data['presentValue']};
    }),
    battery_type: createConverter('genMultistateOutput', 'battery_type', 'state', (model, msg, publish, options, meta) => {
        const value = msg.data['presentValue'];
        return {battery_type: battery_types[value] || value};
    }),
    end_lag: createConverter('genAnalogValue', 'end_lag', 'state', (model, msg, publish, options, meta) => {
        return {end_lag: msg.data['presentValue']};
    }),
    tgt_temperature: {
        cluster: 'genAnalogOutput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const value = msg.data['presentValue'];
            return {tgt_temperature: value};
        },
    } satisfies Fz.Converter,
    hysteresis: {
        cluster: 'genAnalogValue',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const value = msg.data['presentValue'];
            return {hysteresis: value};
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    status: {
        key: ['status'],
        convertGet: async (entity) => {
            await entity.read('genMultistateInput', ['presentValue']);
        },
    } satisfies Tz.Converter,
    kamikaze: createSetConverter('genBinaryValue', 'kamikaze', async (entity, key, value, meta) => {
        const payload = {0x0055: {value: value === 'ON' ? 0x01 : 0x00, type: 0x10}};
        await entity.write('genBinaryValue', payload);
        return {state: {kamikaze: value}};
    }),
    stall_time: createSetConverter('genMultistateValue', 'stall_time', async (entity, key, value, meta) => {
        const payload = {0x0055: {value, type: 0x21}};
        await entity.write('genMultistateValue', payload);
        return {state: {stall_time: value}};
    }),
    battery_type: createSetConverter('genMultistateOutput', 'battery_type', async (entity, key, value, meta) => {
        const convertValue = typeof value === 'string' && battery_types.includes(value) ? battery_types.indexOf(value) : -1;
        const payload = {0x0055: {value: convertValue, type: 0x21}};
        await entity.write('genMultistateOutput', payload);
        return {state: {battery_type: value}};
    }),
    end_lag: createSetConverter('genAnalogValue', 'end_lag', async (entity, key, value, meta) => {
        const payload = {0x0055: {value, type: 0x39}};
        await entity.write('genAnalogValue', payload);
        return {state: {end_lag: value}};
    }),
    tgt_temperature: createSetConverter('genAnalogOutput', 'tgt_temperature', async (entity, key, value, meta) => {
        const options = {};
        const payload = {0x0055: {value: value, type: 0x39}};
        await entity.write('genAnalogOutput', payload, options);
        return {state: {tgt_temperature: value}};
    }),
    hysteresis: createSetConverter('genAnalogValue', 'hysteresis', async (entity, key, value, meta) => {
        const options = {};
        const payload = {0x0055: {value: value, type: 0x39}};
        await entity.write('genAnalogValue', payload, options);
        return {state: {hysteresis: value}};
    }),
    set_op_mode: createSetConverter('genMultistateOutput', 'set_op_mode', async (entity, key, rawValue, meta) => {
        const options = {};
        const lookup = {Monitor: 0x00, Heater: 0x01, Cooler: 0x02};
        const value = typeof rawValue === 'string' && lookup.hasOwnProperty(rawValue) ? operation_modes.indexOf(rawValue) : 0;
        const payload = {0x0055: {value, type: 0x21}};
        await entity.write('genMultistateOutput', payload, options);
        return {
            state: {[key]: rawValue},
        };
    }),
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['POK001'],
        model: 'POK001',
        vendor: 'PushOk Hardware',
        description: 'Battery powered retrofit valve',
        fromZigbee: [fz.on_off, fz.battery, fz.identify, fzLocal.status, fzLocal.kamikaze, fzLocal.stall_time, fzLocal.battery_type, fzLocal.end_lag],
        toZigbee: [tz.on_off, tz.identify, tzLocal.status, tzLocal.kamikaze, tzLocal.stall_time, tzLocal.battery_type, tzLocal.end_lag],
        exposes: [
            e.switch(),
            e.battery(),
            e.battery_voltage(),
            e.battery_low(),
            e.enum('status', ea.STATE_GET, valve_statuses).withDescription('Actual valve status'),
            e.identify_duration(),
            e.identify(),
            e.binary('kamikaze', ea.ALL, 'ON', 'OFF').withDescription('Allow operation on low battery (can destroy battery)'),
            e
                .numeric('stall_time', ea.ALL)
                .withUnit('s')
                .withDescription('Timeout for state transition')
                .withValueMin(0)
                .withValueMax(60)
                .withValueStep(1),
            e.enum('battery_type', ea.ALL, battery_types).withDescription('Battery type'),
            e
                .numeric('end_lag', ea.ALL)
                .withUnit('°')
                .withDescription('Endstop lag angle (wrong value can cause damage)')
                .withValueMin(0)
                .withValueMax(15)
                .withValueStep(1),
        ],
        ota: zigbeeOTA,
    },
    {
        zigbeeModel: ['POK002', 'POK007'],
        model: 'POK002|POK007',
        vendor: 'PushOk Hardware',
        description: 'Soil moisture and temperature sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [tz.factory_reset],
        ota: zigbeeOTA,
        exposes: [e.humidity(), e.temperature(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['POK003'],
        model: 'POK003',
        vendor: 'PushOk Hardware',
        description: 'Water level and temperature sensor',
        fromZigbee: [fz.terncy_contact, fz.temperature, fz.battery],
        toZigbee: [tz.factory_reset],
        ota: zigbeeOTA,
        exposes: [e.contact(), e.temperature(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['POK004'],
        model: 'POK004',
        vendor: 'PushOk Hardware',
        description: 'Solar powered zigbee router and illuminance sensor',
        fromZigbee: [fz.illuminance, fz.battery],
        toZigbee: [tz.factory_reset],
        ota: zigbeeOTA,
        exposes: [e.illuminance_lux(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['POK005'],
        model: 'POK005',
        vendor: 'PushOk Hardware',
        description: 'Temperature and Humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [tz.factory_reset],
        ota: zigbeeOTA,
        exposes: [e.temperature(), e.humidity(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['POK006'],
        model: 'POK006',
        vendor: 'PushOk Hardware',
        description: 'Battery powered garden valve',
        fromZigbee: [fz.on_off, fz.battery, fz.identify, fzLocal.status, fzLocal.stall_time],
        toZigbee: [tz.on_off, tz.identify, tzLocal.status, tzLocal.stall_time],
        exposes: [
            e.switch(),
            e.battery(),
            e.battery_voltage(),
            e.battery_low(),
            e.identify_duration(),
            e.identify(),
            e.enum('status', ea.STATE_GET, valve_statuses).withDescription('Actual valve status'),
            e
                .numeric('stall_time', ea.ALL)
                .withUnit('s')
                .withDescription('Timeout for state transition')
                .withValueMin(0)
                .withValueMax(60)
                .withValueStep(1),
        ],
        ota: zigbeeOTA,
    },
    {
        zigbeeModel: ['POK008'],
        model: 'POK008',
        vendor: 'PushOk Hardware',
        description: 'Battery powered thermostat relay',
        fromZigbee: [fz.on_off, fz.battery, fzLocal.tgt_temperature, fzLocal.hysteresis, fz.temperature],
        toZigbee: [tz.factory_reset, tzLocal.tgt_temperature, tzLocal.hysteresis, tzLocal.set_op_mode, tz.on_off],
        ota: zigbeeOTA,
        exposes: [
            e.switch(),
            e.battery(),
            e.battery_low(),
            e.battery_voltage(),
            e.temperature(),
            e
                .numeric('tgt_temperature', ea.ALL)
                .withUnit('C')
                .withDescription('Target temperature')
                .withValueMin(-40)
                .withValueMax(90)
                .withValueStep(1),
            e
                .numeric('hysteresis', ea.ALL)
                .withUnit('C')
                .withDescription('Temperature hysteresis')
                .withValueMin(0.1)
                .withValueMax(40)
                .withValueStep(0.1),
            e.enum('set_op_mode', ea.ALL, operation_modes).withDescription('Operation mode'),
        ],
    },
    {
        zigbeeModel: ['POK011'],
        model: 'POK011',
        vendor: 'PushOk Hardware',
        description: 'Illuminance sensor',
        fromZigbee: [fz.illuminance, fz.battery],
        toZigbee: [tz.factory_reset],
        ota: zigbeeOTA,
        exposes: [e.illuminance_lux(), e.battery(), e.battery_voltage()],
    },
];

export default definitions;
module.exports = definitions;
