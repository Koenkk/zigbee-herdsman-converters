import {Definition} from '../lib/types';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['B1027EB0Z01'],
        model: 'B1027EB0Z01',
        vendor: 'LG Electronics',
        description: 'Smart bulb 1',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['B1027EB0Z02'],
        model: 'B1027EB0Z02',
        vendor: 'LG Electronics',
        description: 'Smart bulb 2',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['B1027EB4Z01'],
        model: 'B1027EB4Z01',
        vendor: 'LG Electronics',
        description: 'Smart bulb 3',
        extend: extend.light_onoff_brightness(),
    },
];

module.exports = definitions;
