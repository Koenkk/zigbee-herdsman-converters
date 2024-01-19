import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['5991711', '5991713'],
        model: 'C5850000',
        vendor: 'Villeroy & Boch',
        description: 'Subway 3.0 Zigbee home automation kit',
        extend: [light({colorTemp: {range: [160, 450]}})],
    },
    {
        zigbeeModel: ['EC1300'],
        model: 'C0040000',
        vendor: 'Villeroy & Boch',
        description: 'Zigbee home automation kit for mirror',
        extend: [light({colorTemp: {range: [160, 450]}})],
    },
];

export default definitions;
module.exports = definitions;
