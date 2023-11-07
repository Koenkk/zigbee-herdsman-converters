import {Definition, Fz, Tz, KeyValueAny} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import * as ota from '../lib/ota';
import * as utils from '../lib/utils';
const e = exposes.presets;
const ea = exposes.access;
import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';
const manufacturerOptions = {manufacturerCode: 0x128B};

const fzLocal = {
    fil_pilote_mode: {
        cluster: 'manuSpecificNodOnFilPilote',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};
            const mode = msg.data['0'];

            if (mode === 0x00) payload.mode = 'stop';
            else if (mode === 0x01) payload.mode = 'comfort';
            else if (mode === 0x02) payload.mode = 'eco';
            else if (mode === 0x03) payload.mode = 'anti-freeze';
            else if (mode === 0x04) payload.mode = 'comfort_-1';
            else if (mode === 0x05) payload.mode = 'comfort_-2';
            else {
                meta.logger.warn(`wrong mode : ${mode}`);
                payload.mode = 'unknown';
            }
            return payload;
        },
    } as Fz.Converter,
};

const tzLocal = {
    fil_pilote_mode: {
        key: ['mode'],
        convertSet: async (entity, key, value, meta) => {
            const mode = utils.getFromLookup(value, {
                'comfort': 0x01,
                'eco': 0x02,
                'anti-freeze': 0x03,
                'stop': 0x00,
                'comfort_-1': 0x04,
                'comfort_-2': 0x05,
            });
            const payload = {data: Buffer.from([mode])};
            await entity.command('manuSpecificNodOnFilPilote', 'setMode', payload);
            return {state: {'mode': value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificNodOnFilPilote', [0x0000], manufacturerOptions);
        },
    } as Tz.Converter,
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
        exposes: [e.cover_position()],
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
        exposes: [e.cover_position()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-1-20'],
        model: 'SIN-4-1-20',
        vendor: 'NodOn',
        description: 'Multifunction relay switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep);
        },
        endpoint: (device) => {
            return {default: 1};
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SIN-4-1-20_PRO'],
        model: 'SIN-4-1-20_PRO',
        vendor: 'NodOn',
        description: 'Multifunction relay switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep);
        },
        endpoint: (device) => {
            return {default: 1};
        },
        ota: ota.zigbeeOTA,
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
        fromZigbee: [fz.on_off, fz.metering, fzLocal.fil_pilote_mode],
        toZigbee: [tz.on_off, tzLocal.fil_pilote_mode],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.enum('mode', ea.ALL, ['comfort', 'eco', 'anti-freeze', 'stop', 'comfort_-1', 'comfort_-2']),
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
        fromZigbee: [fz.on_off, fz.metering, fzLocal.fil_pilote_mode],
        toZigbee: [tz.on_off, tzLocal.fil_pilote_mode],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.enum('mode', ea.ALL, ['comfort', 'eco', 'anti-freeze', 'stop', 'comfort_-1', 'comfort_-2']),
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
];

module.exports = definitions;
