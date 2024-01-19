import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['5e56b9c85b6e4fcaaaad3c1319e16c57'],
        model: 'MS-20-Z',
        vendor: 'Hommyn',
        description: 'Occupancy sensor',
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['2f077707a13f4120846e0775df7e2efe'],
        model: 'WS-20-Z',
        vendor: 'Hommyn',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
];

export default definitions;
module.exports = definitions;
