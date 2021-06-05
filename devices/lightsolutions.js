const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['91-947'],
        model: '200403V2-B',
        vendor: 'LightSolutions',
        description: 'Mini dimmer 200W',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['91-948'],
        model: '200106V3',
        vendor: 'LightSolutions',
        description: 'Zigbee switch 200W',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];
