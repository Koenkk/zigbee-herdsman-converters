const extend = require('../lib/extend');

const definition = {
    zigbeeModel: ['TS0505B'],
    model: 'DL41-03-10-R-ZB',
    vendor: 'OzSmartThings',
    description: 'OZ SMART RGBW ZIGBEE DOWNLIGHT Smart Led Zigbee Downlight 10W Australian Approved',
    extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
};

module.exports = definition;