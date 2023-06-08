import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Hilux DZ8'],
        model: 'DZ8',
        vendor: 'Hilux',
        description: 'Spot 7W',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370], disablePowerOnBehavior: true}),
    },
];

module.exports = definitions;
