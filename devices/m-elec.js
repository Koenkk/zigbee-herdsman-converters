const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['ML-ST-D200'],
        model: 'ML-ST-D200',
        vendor: 'M-ELEC',
        description: 'Stitchy Dim switchable wall module',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ML-ST-BP-DIM'],
        model: 'ML-ST-BP-DIM',
        vendor: 'M-ELEC',
        description: 'Stitchy Dim Mechanism',
        extend: extend.light_onoff_brightness({disableEffect: true}),
    },
];
