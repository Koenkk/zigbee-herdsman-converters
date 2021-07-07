const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'HZC'}],
        model: 'ID-UK21FW09',
        vendor: 'Iolloi',
        description: 'Zigbee LED smart dimmer switch',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        whiteLabel: [{vendor: 'Iolloi', model: 'ID-EU20FW09'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
];
