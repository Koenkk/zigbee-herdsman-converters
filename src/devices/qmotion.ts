import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
const e = exposes.presets;
const ea = exposes.access;
import * as reporting from '../lib/reporting';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Rollershade QdR'],
        model: 'QZR-ZIG2400',
        vendor: 'Qmotion',
        description: '5 channel remote',
        fromZigbee: [fz.identify, fz.cover_position_tilt],
        exposes: [e.action(['identify']), e.numeric('position', ea.STATE)],
        toZigbee: [],
    },
    {
        zigbeeModel: ['Honeycomb Internal Battery', 'Rollershade Internal Battery'],
        model: 'HDM40PV620',
        vendor: 'Qmotion',
        description: 'Motorized roller blind',
        fromZigbee: [fz.identify, fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
