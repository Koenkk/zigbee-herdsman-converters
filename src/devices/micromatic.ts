import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SZ1000'],
        model: 'ZB250',
        vendor: 'Micro Matic Norge AS',
        description: 'Zigbee dimmer for LED',
        extend: [m.light({configureReporting: true}), m.electricityMeter()],
    },
];

export default definitions;
module.exports = definitions;
