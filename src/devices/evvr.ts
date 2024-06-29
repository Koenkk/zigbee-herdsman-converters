import {onOff} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['SRB01', 'SRB01A'],
        model: 'SRB01',
        vendor: 'Evvr',
        description: 'In-wall relay switch',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
