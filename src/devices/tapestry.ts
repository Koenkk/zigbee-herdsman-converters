import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
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
