import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Air Quality Sensor Nexelec'],
        model: "Open'R",
        vendor: 'Nexelec',
        description: "Open'R CO2, Temperature and Humidity sensor",
        extend: [m.temperature(), m.humidity(), m.co2(), m.battery(), m.identify()],
    },
];

export default definitions;
module.exports = definitions;
