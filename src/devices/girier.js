const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');

module.exports = [
    {
        fingerprint: [
            {modelID: 'TS0001', manufacturerName: '_TZ3000_majwnphg'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_6axxqqi2'},
        ],
        model: 'JR-ZDS01',
        vendor: 'Girier',
        description: '1 gang mini switch',
        extend: tuya.extend.switch({switchType: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
];
