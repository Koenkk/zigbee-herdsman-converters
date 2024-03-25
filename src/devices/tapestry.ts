import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Presence Z1'],
        model: 'THPZ1',
        vendor: 'Tapestry',
        description: 'Presence sensor Z1 occupancy and temperature/humidity sensor',
        extend: [],
        fromZigbee: [fz.temperature, fz.humidity, fz.occupancy],
        toZigbee: [],
        exposes: [e.occupancy(), e.temperature(), e.humidity()],
    },
];

export default definitions;
module.exports = definitions;
