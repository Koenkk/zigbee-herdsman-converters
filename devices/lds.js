const extend = require('../lib/extend');

const definition = {
    zigbeeModel: ['ZBT-RGBWLight-A0000'],
    model: 'ZBT-RGBWLight-A0000',
    vendor: 'LDS',
    description: 'Ynoa Smart LED E27',
    extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555]}),
};

module.exports = definition;
