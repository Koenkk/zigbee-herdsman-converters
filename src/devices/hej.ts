import {Definition} from '../lib/types';
import {onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['HejSW01'],
        model: 'GLSK3ZB-1711',
        vendor: 'Hej',
        description: 'Goqual 1 gang Switch',
        extend: [onOff({configureReporting: false, powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['HejSW02'],
        model: 'GLSK3ZB-1712',
        vendor: 'Hej',
        description: 'Goqual 2 gang Switch',
        extend: [onOff({configureReporting: false, endpoints: {top: 1, bottom: 2}, powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['HejSW03'],
        model: 'GLSK3ZB-1713',
        vendor: 'Hej',
        description: 'Goqual 3 gang Switch',
        extend: [onOff({configureReporting: false, endpoints: {top: 1, center: 2, bottom: 3}, powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['HejSW04'],
        model: 'GLSK6ZB-1714',
        vendor: 'Hej',
        description: 'Goqual 4 gang Switch',
        extend: [onOff({configureReporting: false, endpoints: {top_left: 1, bottom_left: 2, top_right: 3, bottom_right: 4}, powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['HejSW05'],
        model: 'GLSK6ZB-1715',
        vendor: 'Hej',
        description: 'Goqual 5 gang Switch',
        extend: [onOff({configureReporting: false, endpoints: {top_left: 1, center_left: 2, bottom_left: 3, top_right: 4, bottom_right: 5},
            powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['HejSW06'],
        model: 'GLSK6ZB-1716',
        vendor: 'Hej',
        description: 'Goqual 6 gang Switch',
        extend: [onOff({endpoints: {top_left: 1, center_left: 2, bottom_left: 3, top_right: 4, center_right: 5, bottom_right: 6},
            powerOnBehavior: false, configureReporting: false})],
    },
];

export default definitions;
module.exports = definitions;
