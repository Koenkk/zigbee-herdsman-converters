import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['4655BC0-R'],
        model: '4655BC0-R',
        vendor: 'Ecolink',
        description: 'Contact sensor',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
