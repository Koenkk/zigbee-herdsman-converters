const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['HA-ZM12/24-1K'],
        model: 'HA-ZM12/24-1K',
        vendor: 'Halemeier',
        description: '1-channel smart receiver',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HA-ZM12/24-mw2'],
        model: 'HA-ZM12/24-mw2',
        vendor: 'Halemeier',
        description: 'MultiWhite 1-channel smart receiver 12V',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [160, 450]}),
    },
    {
        zigbeeModel: ['HA-ZX1'],
        model: 'HA-ZX1',
        vendor: 'Halemeier',
        description: 'X-Mitter Smart Remote Control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [],
        exposes: [],
    },
];
