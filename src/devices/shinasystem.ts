import {Definition, Fz, Tz} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as utils from '../lib/utils';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {onOff} from '../lib/modernExtend';
import * as ota from '../lib/ota';
import * as globalStore from '../lib/store';
import {Zcl} from 'zigbee-herdsman';
import * as constants from '../lib/constants';
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    DMS300_IN: {
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.no_occupancy_since_false()],
        convert: (model, msg, publish, options, meta) => {
            const occupancyIn = msg.data.occupancy;
            globalStore.putValue(msg.endpoint, 'occupancy_in', occupancyIn);
            const occupancyOr = occupancyIn | globalStore.getValue(msg.endpoint, 'occupancy_out', 0);
            const occupancyAnd = occupancyIn & globalStore.getValue(msg.endpoint, 'occupancy_out', 0);
            return {
                occupancy_in: (occupancyIn & 1) > 0,
                occupancy_or: (occupancyOr & 1) > 0,
                occupancy_and: (occupancyAnd & 1) > 0,
            };
        },
    } satisfies Fz.Converter,
    DMS300_OUT: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const occupancyOut = msg.data.zonestatus;
            globalStore.putValue(msg.endpoint, 'occupancy_out', occupancyOut);
            const occupancyOr = occupancyOut | globalStore.getValue(msg.endpoint, 'occupancy_in', 0);
            const occupancyAnd = occupancyOut & globalStore.getValue(msg.endpoint, 'occupancy_in', 0);
            return {
                occupancy_out: (occupancyOut & 1) > 0,
                occupancy_or: (occupancyOr & 1) > 0,
                occupancy_and: (occupancyAnd & 1) > 0,
            };
        },
    } satisfies Fz.Converter,
    ISM300Z3_on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                const property = utils.postfixWithEndpointName('state', msg, model, meta);
                return {[property]: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            } else if (msg.data.hasOwnProperty(0x9000)) {
                const value = msg.data[0x9000];
                const lookup = {0: 'auto', 1: 'push', 2: 'latch'};
                return {operation_mode: utils.getFromLookup(value, lookup)};
            }
        },
    } satisfies Fz.Converter,
    GCM300Z_on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                const endpoint = meta.device.getEndpoint(1);
                endpoint.read('genOnOff', [0x9007]); // for update : close_remain_timeout
                return {gas_valve_state: msg.data['onOff'] === 1 ? 'OPEN' : 'CLOSE'};
            } else if (msg.data.hasOwnProperty(0x9005)) { // Temperature overheating condition
                return {overheat_mode: msg.data['0x9005'] === 1 ? 'OverHeat' : 'Normal'};
            } else if (msg.data.hasOwnProperty(0x9006)) { // Set the default closing time when the gas valve is open
                const value = msg.data[0x9006];
                return {close_timeout: Math.floor(value/60)};
            } else if (msg.data.hasOwnProperty(0x9007)) { // Set the time or remaining time until the gas valve closes
                const value = msg.data[0x9007];
                return {close_remain_timeout: Math.floor(value/60)};
            } else if (msg.data.hasOwnProperty(0x9008)) { // Values observed are `1` (Voice), `2` (High) or `3` (Low)
                const value = msg.data[0x9008];
                const lookup = {0: 'Voice', 1: 'Voice', 2: 'High', 3: 'Low'};
                return {volume: utils.getFromLookup(value, lookup)};
            }
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    CSM300_SETUP: {
        key: ['rf_pairing_on', 'counting_freeze', 'tof_init', 'led_state', 'rf_state', 'transaction', 'fast_in', 'fast_out'],
        convertSet: async (entity, key, value, meta) => {
            let payload = null;
            const endpoint = meta.device.endpoints.find((e) => e.supportsInputCluster('genAnalogInput'));
            switch (key) {
            case 'rf_pairing_on':
                payload = {'presentValue': 81};
                break;
            case 'counting_freeze':
                utils.assertString(value, key);
                if (value.toLowerCase() === 'on') {
                    payload = {'presentValue': 82};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {counting_freeze: 'ON'}};
                } else if (value.toLowerCase() === 'off') {
                    payload = {'presentValue': 84};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {counting_freeze: 'OFF'}};
                }
                break;
            case 'tof_init':
                payload = {'presentValue': 83};
                break;
            case 'led_state':
                if (value === 'enable') {
                    payload = {'presentValue': 86};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {led_state: 'enable'}};
                } else if (value === 'disable') {
                    payload = {'presentValue': 87};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {led_state: 'disable'}};
                }
                break;
            case 'rf_state':
                if (value === 'enable') {
                    payload = {'presentValue': 88};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {rf_state: 'enable'}};
                } else if (value === 'disable') {
                    payload = {'presentValue': 89};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {rf_state: 'disable'}};
                }
                break;
            case 'transaction':
                if (value === '0ms') {
                    payload = {'presentValue': 90};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {transaction: '0ms'}};
                } else if (value === '200ms') {
                    payload = {'presentValue': 91};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {transaction: '200ms'}};
                } else if (value === '400ms') {
                    payload = {'presentValue': 92};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {transaction: '400ms'}};
                } else if (value === '600ms') {
                    payload = {'presentValue': 93};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {transaction: '600ms'}};
                } else if (value === '800ms') {
                    payload = {'presentValue': 94};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {transaction: '800ms'}};
                } else if (value === '1,000ms') {
                    payload = {'presentValue': 95};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {transaction: '1,000ms'}};
                }
                break;
            case 'fast_in':
                if (value === 'enable') {
                    payload = {'presentValue': 96};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {fast_in: 'enable'}};
                } else if (value === 'disable') {
                    payload = {'presentValue': 97};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {fast_in: 'disable'}};
                }
                break;
            case 'fast_out':
                if (value === 'enable') {
                    payload = {'presentValue': 98};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {fast_out: 'enable'}};
                } else if (value === 'disable') {
                    payload = {'presentValue': 99};
                    await endpoint.write('genAnalogInput', payload);
                    return {state: {fast_out: 'disable'}};
                }
                break;
            }
            await endpoint.write('genAnalogInput', payload);
        },
    } satisfies Tz.Converter,
    ISM300Z3_on_off: {
        key: ['state', 'operation_mode'],
        convertSet: async (entity, key, value, meta) => {
            const endpoint = meta.device.getEndpoint(1);
            if (key === 'state') {
                // @ts-expect-error
                const state = meta.message.hasOwnProperty('state') ? meta.message.state.toLowerCase() : null;
                utils.validateValue(state, ['toggle', 'off', 'on']);
                await entity.command('genOnOff', state, {}, utils.getOptions(meta.mapped, entity));
                if (state === 'toggle') {
                    const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
                    return currentState ? {state: {state: currentState === 'OFF' ? 'ON' : 'OFF'}} : {};
                } else {
                    return {state: {state: state.toUpperCase()}};
                }
            } else if (key === 'operation_mode') {
                const lookup = {'auto': 0, 'push': 1, 'latch': 2};
                const payload = {0x9000: {value: utils.getFromLookup(value, lookup), type: 0x20}}; // INT8U
                await entity.write('genOnOff', payload);
                await endpoint.read('genOnOff', [0x9000]);
            }
        },
        convertGet: async (entity, key, meta) => {
            if (key === 'operation_mode') {
                const endpoint = meta.device.getEndpoint(1);
                await endpoint.read('genOnOff', [0x9000]);
            } else {
                await entity.read('genOnOff', ['onOff']);
            }
        },
    } satisfies Tz.Converter,
    ISM300Z3_rf_pairing: {
        key: ['rf_pairing'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'l1': 1, 'l2': 2, 'l3': 3};
            const payload = {0x9001: {value: utils.getFromLookup(value, lookup), type: 0x20}}; // INT8U
            await entity.write('genOnOff', payload);
        },
    } satisfies Tz.Converter,
    GCM300Z_on_off: {
        key: ['gas_valve_state', 'close_timeout', 'close_remain_timeout', 'volume'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'gas_valve_state') {
                const lookup = {'CLOSE': 'off'}; // open is not supported.
                const state = utils.getFromLookup(value, lookup);
                if (state != 'off') value = 'CLOSE';
                else await entity.command('genOnOff', state, {}, utils.getOptions(meta.mapped, entity));
            } else if (key === 'close_timeout') {
                utils.assertNumber(value);
                const payload = {0x9006: {value: value*60, type: Zcl.DataType.uint16}};
                await entity.write('genOnOff', payload);
            } else if (key === 'close_remain_timeout') {
                utils.assertNumber(value);
                const payload = {0x9007: {value: value*60, type: Zcl.DataType.uint16}};
                await entity.write('genOnOff', payload);
            } else if (key === 'volume') {
                const lookup = {'Voice': 1, 'High': 2, 'Low': 2};
                const payload = {0x9008: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.uint8}};
                await entity.write('genOnOff', payload);
            }
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            if (key === 'gas_valve_state') {
                await entity.read('genOnOff', ['onOff']);
            } else if (key === 'close_timeout') {
                await entity.read('genOnOff', [0x9006]);
            } else if (key === 'close_remain_timeout') {
                await entity.read('genOnOff', [0x9007]);
            } else if (key === 'volume') {
                await entity.read('genOnOff', [0x9008]);
            }
        },
    } satisfies Tz.Converter,
    GCM300Z_status: {
        key: ['overheat_mode'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', [0x9005]);
        },
    } satisfies Tz.Converter,
};

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'CSM-300Z', applicationVersion: 1},
            {modelID: 'CSM-300Z', applicationVersion: 2},
            {modelID: 'CSM-300Z', applicationVersion: 3},
            {modelID: 'CSM-300Z', applicationVersion: 4},
        ],
        model: 'CSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS multipurpose sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.sihas_people_cnt],
        toZigbee: [tz.sihas_set_people],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'genAnalogInput'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            const payload = reporting.payload('presentValue', 1, 600, 0);
            await endpoint.configureReporting('genAnalogInput', payload);
        },
        exposes: [e.battery(), e.battery_voltage(),
            e.enum('status', ea.STATE, ['idle', 'in', 'out']).withDescription('Currently status'),
            e.numeric('people', ea.ALL).withValueMin(0).withValueMax(50).withDescription('People count')],
    },
    {
        zigbeeModel: ['CSM-300Z'],
        model: 'CSM-300ZB_V2',
        vendor: 'ShinaSystem',
        ota: ota.zigbeeOTA,
        description: 'SiHAS multipurpose ToF sensor',
        meta: {battery: {voltageToPercentage: 'Add_1V_42V_CSM300z2v2'}},
        fromZigbee: [fz.battery, fz.sihas_people_cnt],
        toZigbee: [tz.sihas_set_people, tzLocal.CSM300_SETUP],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'genAnalogInput'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            const payload = reporting.payload('presentValue', 1, 600, 0);
            await endpoint.configureReporting('genAnalogInput', payload);
        },
        exposes: [e.battery(), e.battery_voltage(),
            e.enum('status', ea.STATE, ['idle', 'in', 'out']).withDescription('Currently status'),
            e.numeric('people', ea.ALL).withValueMin(0).withValueMax(100).withDescription('People count'),
            e.enum('rf_pairing_on', ea.SET, ['run']).withDescription('Run RF pairing mode'),
            e.binary('counting_freeze', ea.SET, 'ON', 'OFF')
                .withDescription('Counting Freeze ON/OFF, not reporting people value when is ON'),
            e.enum('tof_init', ea.SET, ['initial']).withDescription('ToF sensor initial'),
            e.binary('led_state', ea.SET, 'enable', 'disable').withDescription('Indicate LED enable/disable, default : enable'),
            e.binary('rf_state', ea.SET, 'enable', 'disable').withDescription('RF function enable/disable, default : disable'),
            e.enum('transaction', ea.SET, ['0ms', '200ms', '400ms', '600ms', '800ms', '1,000ms'])
                .withDescription('Transaction interval, default : 400ms'),
            e.binary('fast_in', ea.SET, 'enable', 'disable')
                .withDescription('Fast process enable/disable when people 0 to 1. default : enable'),
            e.binary('fast_out', ea.SET, 'enable', 'disable')
                .withDescription('Fast process enable/disable when people 1 to 0. default : enable')],
    },
    {
        zigbeeModel: ['USM-300Z'],
        model: 'USM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS multipurpose sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.occupancy, fz.illuminance],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.occupancy(endpoint, {min: 1, max: 600, change: 1});
            await reporting.temperature(endpoint, {min: 20, max: 300, change: 10});
            await reporting.humidity(endpoint, {min: 20, max: 300, change: 40});
            await reporting.illuminance(endpoint, {min: 20, max: 3600, change: 10});
        },
        exposes: [e.battery(), e.battery_voltage(), e.temperature(), e.humidity(), e.occupancy(),
            e.illuminance_lux().withProperty('illuminance')],
    },
    {
        zigbeeModel: ['SBM300Z1'],
        model: 'SBM300Z1',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 1 gang',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SBM300Z2'],
        model: 'SBM300Z2',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 2 gang',
        extend: [onOff({endpoints: {top: 1, bottom: 2}})],
    },
    {
        zigbeeModel: ['SBM300Z3'],
        model: 'SBM300Z3',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 3 gang',
        extend: [onOff({endpoints: {top: 1, center: 2, bottom: 3}})],
    },
    {
        zigbeeModel: ['SBM300Z4'],
        model: 'SBM300Z4',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 4 gang',
        extend: [onOff({endpoints: {top_left: 1, bottom_left: 2, top_right: 3, bottom_right: 4}})],
    },
    {
        zigbeeModel: ['SBM300Z5'],
        model: 'SBM300Z5',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 5 gang',
        extend: [onOff({endpoints: {top_left: 1, center_left: 2, bottom_left: 3, top_right: 4, bottom_right: 5}})],
    },
    {
        zigbeeModel: ['SBM300Z6'],
        model: 'SBM300Z6',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 6 gang',
        extend: [onOff({endpoints: {top_left: 1, center_left: 2, bottom_left: 3, top_right: 4, center_right: 5, bottom_right: 6}})],
    },
    {
        zigbeeModel: ['BSM-300Z'],
        model: 'BSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.sihas_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'long'])],
    },
    {
        zigbeeModel: ['TSM-300Z'],
        model: 'TSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS temperature/humidity sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint, {min: 30, max: 300, change: 30});
            await reporting.humidity(endpoint, {min: 30, max: 3600, change: 50});
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
        exposes: [e.temperature(), e.humidity(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['DSM-300Z'],
        model: 'DSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS contact sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['ssIasZone', 'genPowerCfg']);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['MSM-300Z'],
        model: 'MSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control 4 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long',
            '3_single', '3_double', '3_long', '4_single', '4_double', '4_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['SBM300ZB1'],
        model: 'SBM300ZB1',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.sihas_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'long'])],
    },
    {
        zigbeeModel: ['SBM300ZB2'],
        model: 'SBM300ZB2',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control 2 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },

    },
    {
        zigbeeModel: ['SBM300ZB3'],
        model: 'SBM300ZB3',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control 3 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long',
            '3_single', '3_double', '3_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['SBM300ZB4'],
        model: 'SBM300ZB4',
        vendor: 'ShinaSystem',
        ota: ota.zigbeeOTA,
        description: 'SiHAS remote control 4 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long',
            '3_single', '3_double', '3_long', '4_single', '4_double', '4_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['SBM300ZC1'],
        model: 'SBM300ZC1',
        vendor: 'ShinaSystem',
        ota: ota.zigbeeOTA,
        description: 'SiHAS remote control',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.sihas_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'long'])],
    },
    {
        zigbeeModel: ['SBM300ZC2'],
        model: 'SBM300ZC2',
        vendor: 'ShinaSystem',
        ota: ota.zigbeeOTA,
        description: 'SiHAS remote control 2 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['SBM300ZC3'],
        model: 'SBM300ZC3',
        vendor: 'ShinaSystem',
        ota: ota.zigbeeOTA,
        description: 'SiHAS remote control 3 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long',
            '3_single', '3_double', '3_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['SBM300ZC4'],
        model: 'SBM300ZC4',
        vendor: 'ShinaSystem',
        ota: ota.zigbeeOTA,
        description: 'SiHAS remote control 4 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long',
            '3_single', '3_double', '3_long', '4_single', '4_double', '4_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['PMM-300Z1'],
        model: 'PMM-300Z1',
        vendor: 'ShinaSystem',
        description: 'SiHAS energy monitor',
        fromZigbee: [fz.electrical_measurement, fz.metering],
        toZigbee: [tz.electrical_measurement_power],
        exposes: [e.power().withAccess(ea.STATE_GET), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.activePower(endpoint, {min: 1, max: 600, change: 5});
            await reporting.instantaneousDemand(endpoint, {min: 1, max: 600, change: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {multiplier: 1, divisor: 1000});
            await reporting.currentSummDelivered(endpoint, {min: 1, max: 600, change: 5});
        },
    },
    {
        zigbeeModel: ['PMM-300Z2'],
        model: 'PMM-300Z2',
        vendor: 'ShinaSystem',
        description: 'SiHAS energy monitor',
        fromZigbee: [fz.electrical_measurement, fz.metering, fz.temperature],
        toZigbee: [tz.metering_power, tz.currentsummdelivered, tz.frequency, tz.powerfactor, tz.acvoltage, tz.accurrent, tz.temperature],
        exposes: [e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET),
            e.current().withAccess(ea.STATE_GET), e.voltage().withAccess(ea.STATE_GET),
            e.temperature().withAccess(ea.STATE_GET).withDescription('temperature of device internal mcu'),
            e.numeric('power_factor', ea.STATE_GET).withDescription('Measured electrical power factor'),
            e.numeric('ac_frequency', ea.STATE_GET).withUnit('Hz').withDescription('Measured electrical ac frequency')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering', 'msTemperatureMeasurement']);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier',
                'acCurrentDivisor']);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
            // await reporting.activePower(endpoint, {min: 1, max: 600, change: 5});  // no need, duplicate for power value.
            await reporting.instantaneousDemand(endpoint, {min: 1, max: 600, change: 5});
            await reporting.powerFactor(endpoint, {min: 10, max: 600, change: 1});
            await reporting.rmsVoltage(endpoint, {min: 5, max: 600, change: 1});
            await reporting.rmsCurrent(endpoint, {min: 5, max: 600, change: 1});
            await reporting.currentSummDelivered(endpoint, {min: 1, max: 600, change: 5});
            await reporting.temperature(endpoint, {min: 20, max: 300, change: 10});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acFrequencyMultiplier: 1, acFrequencyDivisor: 10});
            await endpoint.configureReporting('haElectricalMeasurement', [{
                attribute: 'acFrequency',
                minimumReportInterval: 10,
                maximumReportInterval: 600,
                reportableChange: 3,
            }]);
        },
    },
    {
        zigbeeModel: ['PMM-300Z3'],
        model: 'PMM-300Z3',
        vendor: 'ShinaSystem',
        description: 'SiHAS 3phase energy monitor',
        fromZigbee: [fz.electrical_measurement, fz.metering, fz.temperature],
        toZigbee: [tz.metering_power, tz.currentsummdelivered, tz.frequency, tz.powerfactor, tz.acvoltage, tz.accurrent, tz.temperature],
        exposes: [e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET),
            e.current().withAccess(ea.STATE_GET), e.voltage().withAccess(ea.STATE_GET),
            e.temperature().withAccess(ea.STATE_GET).withDescription('temperature of device internal mcu'),
            e.numeric('power_factor', ea.STATE_GET).withDescription('Measured electrical power factor'),
            e.numeric('ac_frequency', ea.STATE_GET).withUnit('Hz').withDescription('Measured electrical ac frequency')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering', 'msTemperatureMeasurement']);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier',
                'acCurrentDivisor']);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
            // await reporting.activePower(endpoint, {min: 1, max: 600, change: 5});  // no need, duplicate for power value.
            await reporting.instantaneousDemand(endpoint, {min: 1, max: 600, change: 5});
            await reporting.powerFactor(endpoint, {min: 10, max: 600, change: 1});
            await reporting.rmsVoltage(endpoint, {min: 5, max: 600, change: 1});
            await reporting.rmsCurrent(endpoint, {min: 5, max: 600, change: 1});
            await reporting.currentSummDelivered(endpoint, {min: 1, max: 600, change: 5});
            await reporting.temperature(endpoint, {min: 20, max: 300, change: 10});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acFrequencyMultiplier: 1, acFrequencyDivisor: 10});
            await endpoint.configureReporting('haElectricalMeasurement', [{
                attribute: 'acFrequency',
                minimumReportInterval: 10,
                maximumReportInterval: 600,
                reportableChange: 3,
            }]);
        },
    },
    {
        zigbeeModel: ['DLM-300Z'],
        model: 'DLM-300Z',
        vendor: 'ShinaSystem',
        description: 'Sihas door lock',
        fromZigbee: [fz.lock, fz.battery, fz.lock_operation_event, fz.lock_programming_event, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.pincode_lock],
        meta: {pinCodeCount: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint, {min: 0, max: 3600, change: 0});
            await reporting.batteryPercentageRemaining(endpoint, {min: 600, max: 21600, change: 1});
            await reporting.doorState(endpoint);
        },
        exposes: [e.battery(), e.lock(), e.enum('door_state', ea.STATE, ['open', 'closed']).withDescription('Door status'),
            e.lock_action(), e.lock_action_source_name(), e.lock_action_user(),
            e.composite('pin_code', 'pin_code', ea.ALL)
                .withFeature(e.numeric('user', ea.SET).withDescription('User ID can only number 1'))
                .withFeature(e.numeric('pin_code', ea.SET).withDescription('Pincode to set, set pincode(4 digit) to null to clear')),
        ],
    },
    {
        zigbeeModel: ['DMS-300Z'],
        model: 'DMS-300ZB',
        vendor: 'ShinaSystem',
        ota: ota.zigbeeOTA,
        description: 'SiHAS dual motion sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fzLocal.DMS300_OUT, fzLocal.DMS300_IN, fz.occupancy_timeout],
        toZigbee: [tz.occupancy_timeout],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'msOccupancySensing', 'ssIasZone'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.occupancy(endpoint, {min: 1, max: 600, change: 1});
            const payload = [{
                attribute: 'zoneStatus', minimumReportInterval: 1, maximumReportInterval: 600, reportableChange: 1}];
            await endpoint.configureReporting('ssIasZone', payload);
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
        },
        exposes: [e.battery(), e.battery_voltage(),
            e.binary('occupancy_in', ea.STATE, true, false)
                .withDescription('Indicates whether "IN" Sensor of the device detected occupancy'),
            e.binary('occupancy_out', ea.STATE, true, false)
                .withDescription('Indicates whether "OUT" Sensor of the device detected occupancy'),
            e.binary('occupancy_or', ea.STATE, true, false)
                .withDescription('Indicates whether "IN or OUT" Sensor of the device detected occupancy'),
            e.binary('occupancy_and', ea.STATE, true, false)
                .withDescription('Indicates whether "IN and OUT" Sensor of the device detected occupancy'),
            e.numeric('occupancy_timeout', ea.ALL).withUnit('s').withValueMin(0).withValueMax(3600)],
    },
    {
        zigbeeModel: ['ISM300Z3'],
        model: 'ISM300Z3',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart inner switch 3 gang',
        fromZigbee: [fzLocal.ISM300Z3_on_off],
        toZigbee: [tzLocal.ISM300Z3_on_off, tzLocal.ISM300Z3_rf_pairing],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.enum('operation_mode', ea.ALL, ['auto', 'push', 'latch'])
                .withDescription('Operation mode: "auto" - toggle by S/W, "push" - for momentary S/W, "latch" - sync S/W'),
            e.enum('rf_pairing', ea.SET, ['l1', 'l2', 'l3'])
                .withDescription('Enable RF pairing mode each button l1, l2, l3')],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genOnOff', [0x9000]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
    },
    {
        zigbeeModel: ['GCM-300Z'],
        model: 'GCM-300Z',
        vendor: 'ShinaSystem',
        description: 'SiHAS Gas Valve',
        fromZigbee: [fzLocal.GCM300Z_on_off, fz.battery],
        toZigbee: [tzLocal.GCM300Z_on_off, tzLocal.GCM300Z_status],
        exposes: [
            e.binary('gas_valve_state', ea.ALL, 'OPEN', 'CLOSE')
                .withDescription('Valve state if open or closed'),
            e.numeric('close_timeout', ea.ALL ).withValueMin(1).withValueMax(540).withValueStep(1).withUnit('Miniute')
                .withDescription('Set the default closing time when the gas valve is open.'),
            e.numeric('close_remain_timeout', ea.ALL ).withValueMin(0).withValueMax(540).withValueStep(1).withUnit('Miniute')
                .withDescription('Set the time or remaining time until the gas valve closes.'),
            e.enum('volume', ea.ALL, ['Voice', 'High', 'Low'])
                .withDescription('Values observed are `1` (Voice), `2` (High) or `3` (Low)'),
            e.binary('overheat_mode', ea.STATE_GET, 'OverHeat', 'Normal')
                .withDescription('Temperature overheating condition'),
            e.battery(),
        ],
        // The configure method below is needed to make the device reports on/off state changes
        // when the device is controlled manually through the button on it.
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff']);
            await utils.sleep(500);
            await reporting.onOff(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            // E_CLD_ONOFF_ATTR_ID_GAS_TIMER_OVERHEAT_STATUS    = 0x9005
            await endpoint.read('genOnOff', [0x9005]);
            await endpoint.configureReporting('genOnOff', [{
                attribute: {ID: 0x9005, type: Zcl.DataType.uint8},
                minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1},
            ]);
            // E_CLD_ONOFF_ATTR_ID_GAS_TIMER_TIMEOUT            = 0x9006
            await endpoint.read('genOnOff', [0x9006]);
            await endpoint.configureReporting('genOnOff', [{
                attribute: {ID: 0x9006, type: Zcl.DataType.uint16},
                minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1},
            ]);
            await utils.sleep(1000);
            // E_CLD_ONOFF_ATTR_ID_GAS_TIMER_REMAIN             = 0x9007
            await endpoint.read('genOnOff', [0x9007]);
            await endpoint.configureReporting('genOnOff', [{
                attribute: {ID: 0x9007, type: Zcl.DataType.uint16},
                minimumReportInterval: 1,
                maximumReportInterval: 1800,
                reportableChange: 1},
            ]);
            // E_CLD_ONOFF_ATTR_ID_GAS_TIMER_VOLUME             = 0x9008
            await endpoint.read('genOnOff', [0x9008]);
            await endpoint.configureReporting('genOnOff', [{
                attribute: {ID: 0x9008, type: Zcl.DataType.uint8},
                minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1},
            ]);
            await utils.sleep(300);
            await endpoint.read('genOnOff', ['onOff']);
        },
    },
];

export default definitions;
module.exports = definitions;
