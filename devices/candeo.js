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

            // The default reporting from the Candeo dimmer can result in a lot of Zigbee traffic
            // to the extent that reported brighness values can arrive at the endpoint out of order
            // giving the appearance that the values are jumping around.
            // Limit the reporting to once a second to give a smoother reporting of brightness.
            await reporting.brightness(endpoint, {min: 1});
        },
    },
];
