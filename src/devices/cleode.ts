import {electricityMeter, onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ZPLUG'],
        model: 'ZPLUG_Boost',
        vendor: 'CLEODE',
        description: 'ZPlug boost',
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
    },
];

export default definitions;
module.exports = definitions;
