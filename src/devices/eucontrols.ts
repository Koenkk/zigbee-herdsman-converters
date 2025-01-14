import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
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
