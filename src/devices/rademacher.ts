import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['RDM-35104001'],
        model: '35104001',
        vendor: 'Rademacher',
        description: 'addZ white + colour',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555]}),
    },
    {
        zigbeeModel: ['RDM-35144001'],
        model: '35144001',
        vendor: 'Rademacher',
        description: 'addZ white + colour',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555]}),
    },
];

module.exports = definitions;
