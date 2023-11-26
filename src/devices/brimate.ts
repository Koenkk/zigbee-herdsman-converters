import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['FB56-BOT02HM1A5'],
        model: 'FZB8708HD-S1',
        vendor: 'Brimate',
        description: 'Smart motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },
];

export default definitions;
module.exports = definitions;
