import {temperature, humidity, co2, battery, identify} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Air Quality Sensor Nexelec'],
        model: "Open'R",
        vendor: 'Nexelec',
        description: "Open'R CO2, Temperature and Humidity sensor",
        extend: [temperature(), humidity(), co2(), battery(), identify()],
    },
];

export default definitions;
module.exports = definitions;
