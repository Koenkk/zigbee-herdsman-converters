const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['020B0B'],
        model: '020B0B',
        vendor: 'Fischer & Honsel',
        description: 'LED Tischleuchte Beta Zig',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        endpoint: (device) => {
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/5463
            const endpoint = device.endpoints.find((e) => e.inputClusters.includes(6)).ID;
            return {'default': endpoint};
        },
    },
];
