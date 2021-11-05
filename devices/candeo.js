const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['HK-DIM-A'],
        model: 'HK-DIM-A',
        vendor: 'Candeo',
        description: 'Zigbee LED dimmer smart switch',
        extend: extend.light_onoff_brightness({noConfigure: true, disableEffect: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
];
