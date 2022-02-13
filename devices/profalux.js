const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const utils = require('../lib/utils');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    profalux_cover_state: {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            switch (value) {
            case 'OPEN':
                await entity.command('genOnOff', 'on', {}, utils.getOptions(meta.mapped, entity));
                break;
            case 'CLOSE':
                await entity.command('genOnOff', 'off', {}, utils.getOptions(meta.mapped, entity));
                break;
            case 'STOP':
                await entity.command('genLevelCtrl', 'stop', {}, utils.getOptions(meta.mapped, entity));
                break;
            default:
                throw new Error(`Value '${value}' is not a valid cover position (must be one of 'OPEN' or 'CLOSE' or 'STOP')`);
            }
        },
    },
};

module.exports = [
    {
        fingerprint: [{type: 'Router', manufacturerID: 4368, endpoints: [{ID: 1, profileID: 260, deviceID: 512}]}],
        model: '4368-512',
        vendor: 'Profalux',
        description: 'Visio cover with position control',
        fromZigbee: [fz.identify, fz.cover_state_via_onoff, fz.cover_position_via_brightness],
        toZigbee: [tzLocal.profalux_cover_state, tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
];
