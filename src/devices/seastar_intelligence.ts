import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['020B0B'],
        model: '020B0B',
        vendor: 'Fischer & Honsel',
        description: 'LED Tischleuchte Beta Zig',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
        endpoint: (device) => {
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/5463
            const endpoint = device.endpoints.find((e) => e.inputClusters.includes(6)).ID;
            return {'default': endpoint};
        },
    },
];

export default definitions;
module.exports = definitions;
