import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['L258'],
        model: 'L258',
        vendor: 'Sowilo DS',
        description: 'Heimdall Pro 5 channel RGBWW controller',
        extend: [light({color: {modes: ['xy', 'hs']}, colorTemp: {range: [150, 575]}, turnsOffAtBrightness1: true})],
    },
];

export default definitions;
module.exports = definitions;
