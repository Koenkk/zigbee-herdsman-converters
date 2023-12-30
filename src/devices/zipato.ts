import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZHA-ColorLight'],
        model: 'rgbw2.zbee27',
        vendor: 'Zipato',
        description: 'RGBW LED bulb with dimmer',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
];

export default definitions;
module.exports = definitions;
