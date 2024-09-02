import {light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['VOLARE ZB3\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '676-00301024955Z',
        vendor: 'TCI',
        description: 'Dash L DC Volare',
        extend: [light()],
    },
    {
        zigbeeModel: ['MAXI JOLLY ZB3'],
        model: '151570',
        vendor: 'TCI',
        description: 'LED driver for wireless control (60 watt)',
        extend: [light()],
    },
    {
        zigbeeModel: ['PROFESSIONALE ZB3'],
        model: '122576',
        vendor: 'TCI',
        description: 'Direct current wireless dimmable electronic drivers with DIP-SWITCH',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
