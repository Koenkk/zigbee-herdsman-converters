const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['12501'],
        model: '12501',
        vendor: 'Scan Products',
        description: 'Zigbee push dimmer',
        fromZigbee: extend.light_onoff_brightness().fromZigbee,
        toZigbee: extend.light_onoff_brightness().toZigbee,
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
];
