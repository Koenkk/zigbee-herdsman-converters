import {Definition} from '../lib/types';
import tz from '../converters/toZigbee';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZB-CL01'],
        model: 'ZB-CL01',
        vendor: 'KURVIA',
        description: 'GU10 GRBWC built from AliExpress',
        extend: [light({colorTemp: {range: [250, 454]}, color: {applyRedFix: true, enhancedHue: false}})],
        toZigbee: [tz.on_off],
    },
];

export default definitions;
module.exports = definitions;
