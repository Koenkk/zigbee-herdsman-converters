import {Definition} from '../lib/types';
import {temperature, humidity, co2, battery, identify} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Air Quality Sensor Nexelec'],
        model: 'Open\'R',
        vendor: 'Nexelec',
        description: 'Open\'R CO2, Temperature and Humidity sensor',
        extend: [temperature(), humidity(), co2(), battery(), identify()],
    },
];

export default definitions;
module.exports = definitions;
