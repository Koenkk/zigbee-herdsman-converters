const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['CCT box'],
        model: 'B07KG5KF5R',
        vendor: 'GMY Smart Bulb',
        description: 'GMY Smart bulb, 470lm, vintage dimmable, 2700-6500k, E27',
        extend: extend.light_onoff_brightness_colortemp(),
    },
];
