import {Definition} from '../lib/types';
import {light, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ML-ST-D200'],
        model: 'ML-ST-D200',
        vendor: 'M-ELEC',
        description: 'Stitchy dim switchable wall module',
        extend: [light()],
    },
    {
        zigbeeModel: ['ML-ST-D200-NF'],
        model: 'ML-ST-D200-NF',
        vendor: 'M-ELEC',
        description: 'Stitchy dim neutral free switchable wall module',
        extend: [light()],
    },
    {
        zigbeeModel: ['ML-ST-BP-DIM'],
        model: 'ML-ST-BP-DIM',
        vendor: 'M-ELEC',
        description: 'Stitchy dim mechanism',
        extend: [light({effect: false})],
    },
    {
        zigbeeModel: ['ML-ST-R200'],
        model: 'ML-ST-R200',
        vendor: 'M-ELEC',
        description: 'Stitchy switchable wall module',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
