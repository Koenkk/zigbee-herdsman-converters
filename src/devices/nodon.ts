import {Fz, Tz, Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import * as ota from '../lib/ota';
const e = exposes.presets;
const ea = exposes.access;
import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';

const tzLocal = {
    impulse_time: {
        key: ['transition_time'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genOnOff', {nodonTransitionTime: value});
            return {state: {nodonTransitionTime: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['nodonTransitionTime']);
        },
    } as Tz.Converter,
};

const fzLocal = {
    impulse_time: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('nodonTransitionTime')) {
                return {transition_time: msg.data['nodonTransitionTime']};
            }
        },
    } as Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['SIN-4-RS-20'],
        model: 'SIN-4-RS-20',
        vendor: 'NodOn',
        description: 'Roller shutter relay switch',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
            await reporting.currentPositionTiltPercentage(endpoint);
        },
        exposes: [e.cover_position_tilt()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-RS-20_PRO'],
        model: 'SIN-4-RS-20_PRO',
        vendor: 'NodOn',
        description: 'Roller shutter relay switch',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
            await reporting.currentPositionTiltPercentage(endpoint);
        },
        exposes: [e.cover_position_tilt()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-1-20'],
        model: 'SIN-4-1-20',
        vendor: 'NodOn',
        description: 'Multifunction relay switch',
        fromZigbee: [fz.identify, fz.on_off, fz.command_toggle, fz.command_on, fz.command_off, fz.power_on_behavior, fzLocal.impulse_time],
        toZigbee: [tz.on_off, tz.power_on_behavior, tzLocal.impulse_time],
        exposes: [
            e.switch(),
            e.action(['identify', 'on', 'off', 'toggle']),
            e.power_on_behavior(),
        ],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        model: 'SIN-4-1-20_PRO',
        zigbeeModel: ['SIN-4-1-20_PRO'],
        vendor: 'NodOn',
        description: 'Multifunction relay switch',
        fromZigbee: [fz.identify, fz.on_off, fz.command_toggle, fz.command_on, fz.command_off, fz.power_on_behavior, fzLocal.impulse_time],
        toZigbee: [tz.on_off, tz.power_on_behavior, tzLocal.impulse_time],
        exposes: [
            e.switch(),
            e.action(['identify', 'on', 'off', 'toggle']),
            e.power_on_behavior(),
        ],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['SIN-4-2-20'],
        model: 'SIN-4-2-20',
        vendor: 'NodOn',
        description: 'Lighting relay switch',
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        extend: extend.switch(),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(ep2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep1);
            await reporting.onOff(ep2);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-2-20_PRO'],
        model: 'SIN-4-2-20_PRO',
        vendor: 'NodOn',
        description: 'Lighting relay switch',
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        extend: extend.switch(),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(ep2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep1);
            await reporting.onOff(ep2);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-FP-20'],
        model: 'SIN-4-FP-20',
        vendor: 'NodOn',
        description: 'Pilot wire heating module',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.metering, fz.power_on_behavior, fz.nodon_fil_pilote_mode],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.nodon_fil_pilote_mode],
        exposes: [
            e.power(),
            e.energy(),
            e.enum('mode', ea.ALL, ['comfort', 'eco', 'anti-freeze', 'stop', 'comfort_-1', 'comfort_-2']),
            e.power_on_behavior(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff', 'seMetering', 'manuSpecificNodOnFilPilote']);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
            await ep.read('manuSpecificNodOnFilPilote', ['mode']);
        },
    },
    {
        zigbeeModel: ['SIN-4-FP-21'],
        model: 'SIN-4-FP-21',
        vendor: 'NodOn',
        description: 'Pilot wire heating module',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.metering, fz.power_on_behavior, fz.nodon_fil_pilote_mode],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.nodon_fil_pilote_mode],
        exposes: [
            e.power(),
            e.energy(),
            e.enum('mode', ea.ALL, ['comfort', 'eco', 'anti-freeze', 'stop', 'comfort_-1', 'comfort_-2']),
            e.power_on_behavior(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff', 'seMetering', 'manuSpecificNodOnFilPilote']);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
            await ep.read('manuSpecificNodOnFilPilote', ['mode']);
        },
    },
    {
        zigbeeModel: ['SIN-4-1-21'],
        model: 'SIN-4-1-21',
        vendor: 'NodOn',
        description: 'Multifunction relay switch with metering',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.identify, fz.on_off, fz.command_toggle, fz.command_on, fz.command_off, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.energy(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff', 'seMetering']);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
        },
    },
];

export default definitions;
module.exports = definitions;
