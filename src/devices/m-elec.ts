import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ML-ST-D200'],
        model: 'ML-ST-D200',
        vendor: 'M-ELEC',
        description: 'Stitchy Dim switchable wall module',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ML-ST-BP-DIM'],
        model: 'ML-ST-BP-DIM',
        vendor: 'M-ELEC',
        description: 'Stitchy dim mechanism',
        extend: extend.light_onoff_brightness({disableEffect: true}),
    },
];

module.exports = definitions;
