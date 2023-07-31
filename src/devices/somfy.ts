import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Sonesse Ultra 30 WF Li-Ion Rolle'],
        model: 'SOMFY-1241752',
        vendor: 'SOMFY',
        description: 'Blinds from vendors using this roller',
        fromZigbee: [fz.battery, fz.power_source, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(232);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },
];

module.exports = definitions;
