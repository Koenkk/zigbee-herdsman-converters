import {light} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['LCM-1C09-ZB Light Control'],
        model: 'LCM-1C09-ZB',
        vendor: 'EuControls',
        description: '0-10V Zigbee Dimmer',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
