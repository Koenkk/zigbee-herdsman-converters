const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['SM308'],
        model: 'SM308',
        vendor: 'Samotech',
        description: 'Zigbee AC in wall switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff']);
        },
    },
    {
        zigbeeModel: ['SM309'],
        model: 'SM309',
        vendor: 'Samotech',
        description: 'ZigBee dimmer 400W',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'Samotech'}],
        model: 'SM323',
        vendor: 'Samotech',
        description: 'ZigBee retrofit dimmer 250W',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
];
