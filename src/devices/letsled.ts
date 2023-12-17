import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'RGBW Down Light', manufacturerName: 'Letsleds China'}],
        model: 'HLC929-Z-RGBW-4C-IA-OTA-3.0',
        vendor: 'Letsleds',
        description: 'RGBW down light (color temp is inverted)',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
];

export default definitions;
module.exports = definitions;
