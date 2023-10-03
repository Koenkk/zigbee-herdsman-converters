import {Definition, Tz} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as utils from '../lib/utils';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const tzLocal = {
    D10110_position: {
        ...tz.cover_position_tilt,
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            // Requires coverInverted for fromZigbee but not for toZigbee
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/6211/files#r1344424726
            return await tz.cover_position_tilt.convertSet(entity, key, 100 - value, meta);
        },
    } as Tz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['D10110'],
        model: 'D10110',
        vendor: 'Yookee',
        description: 'Smart blind controller',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tzLocal.D10110_position],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },
];

module.exports = definitions;
