import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['HA-ZGMW2-E'],
        model: 'HA-ZGMW2-E',
        vendor: 'Halemeier',
        description: 'LED driver',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [160, 450]}),
    },
];

module.exports = definitions;
