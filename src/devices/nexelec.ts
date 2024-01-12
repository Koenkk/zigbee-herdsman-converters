import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const definitions: Definition[] = [
    zigbeeModel: ['Air Quality Sensor Nexelec'], 
        model: 'Open\'R', 
        vendor: 'Nexelec', 
        description: 'Measures CO2, Temperature and Relative Humidity', 
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.co2], 
        toZigbee: [], 
        endpoint: (device) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            return {'e1': 1, 'e2': 2, 'e3': 3};
        },
        exposes: [e.battery(), 
                e.temperature().withEndpoint('e1'), 
                e.humidity().withEndpoint('e1'), 
                e.co2(),            
                ],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: false}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'msCO2']);
            await reporting.batteryPercentageRemaining(endpoint3);
        },
];

export default definitions;
module.exports = definitions;
