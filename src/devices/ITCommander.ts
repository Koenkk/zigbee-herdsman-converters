import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
const e = exposes.presets;
import * as reporting from '../lib/reporting';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ITCMDR_Contact'],
        model: 'ITCMDR_Contact',
        vendor: 'IT Commander',
        description: 'Contact Sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.voltage()],
        configure: async (device, coordinatorEndpoint) => {
            for (const ep of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genPowerCfg', 'ssIasZone']);
            }
        },
    },
    {
        zigbeeModel: ['ITCMDR_Click'],
        model: 'ITCMDR_Click',
        vendor: 'IT Commander',
        description: 'Button',
        exposes: [e.action(['single', 'double', 'triple', 'hold', 'release', 'many']), e.battery(), e.voltage()],
        fromZigbee: [fz.itcmdr_clicks, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            device.endpoints.forEach(async (ep) => {
                await reporting.bind(ep, coordinatorEndpoint, ['genMultistateInput']);
            });
        },
    },
];

export default definitions;
module.exports = definitions;
