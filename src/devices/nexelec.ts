import {Definition} from '../lib/types';
import {temperature, humidity, co2, batteryPercentage, identify} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Air Quality Sensor Nexelec'],
        model: 'Open\'R',
        vendor: 'Nexelec',
        description: '3-in-1 room sensor',
        extend: [temperature(), humidity(), co2(), batteryPercentage(), identify()],
    },
];

export default definitions;
module.exports = definitions;
