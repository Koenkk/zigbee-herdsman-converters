import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Presence Z1'],
        model: 'THPZ1',
        vendor: 'Tapestry',
        description: 'Tapestry Presence Sensor Z1 Occupancy and Temperature/Humidity Sensor',
        extend: [],
        fromZigbee: [fz.temperature, fz.humidity, fz.occupancy],
        toZigbee: [],
        exposes: [e.occupancy(), e.temperature(), e.humidity()],
        meta: {},
    },
];

export default definitions;
module.exports = definitions;
