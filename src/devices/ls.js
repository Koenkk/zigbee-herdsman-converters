import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Emotion'],
        model: 'A319463',
        vendor: 'LS Deutschland GmbH',
        description: 'Home base',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
];

module.exports = definitions;
