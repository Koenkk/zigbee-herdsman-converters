const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['AL8TC13W-AP'],
        model: 'AL8TC13W-AP',
        vendor: 'Alchemy',
        description: 'Downlight with tuneable white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
];
