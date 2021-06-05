const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['LUBEEZ-12AB'],
        model: '12AB',
        vendor: 'Lubeez',
        description: 'zigbee 3.0 AC dimmer',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
];
