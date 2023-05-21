const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['Z601', 'Z602', 'Z603', 'Z604'],
        model: 'Z6',
        vendor: 'Atsmart',
        description: '3 gang smart wall switch (no neutral wire)',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
                await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
                await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            } catch (error) {
                // dip switch for 1-3 gang
            }
        },
    },
];
