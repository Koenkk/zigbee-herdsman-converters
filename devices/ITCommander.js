const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const exposes = require('../lib/exposes');
const e = exposes.presets;
const reporting = require('../lib/reporting');

module.exports = [
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
