import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['SC-02'],
        model: 'MC-02',
        vendor: 'Shade Control',
        description: 'Automate shades and blinds with beaded chains',
        fromZigbee: [fz.battery, fz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
            device.powerSource = 'Battery';
            device.save();
        },
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.battery(), e.cover_position()],
    },
];

export default definitions;
module.exports = definitions;
