const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const extend = require('../lib/extend');
const ea = exposes.access;
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['DTB190502A1'],
        model: 'DTB190502A1',
        vendor: 'databyte.ch',
        description: '[CC2530 based IO Board](https://databyte.ch/zigbee-dev-board-dtb190502a)',
        fromZigbee: [fz.DTB190502A1],
        toZigbee: [tz.DTB190502A1_LED],
        exposes: [exposes.binary('led_state', ea.STATE, 'ON', 'OFF'),
            exposes.enum('key_state', ea.STATE, ['KEY_SYS', 'KEY_UP', 'KEY_DOWN', 'KEY_NONE'])],
    },
    {
        zigbeeModel: ['DTB-ED2004-012'],
        model: 'ED2004-012',
        vendor: 'databyte.ch',
        description: 'Panda 1 - wall switch (https://databyte.ch/panda1-wallswitch-zigbee)',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['DTB-ED2011-014'],
        model: 'DTB-ED2011-014',
        vendor: 'databyte.ch',
        description: 'Wall Touchsensor with 4 keys (https://databyte.ch/zigbee-touch-key)',
        fromZigbee: [fz.on_off],
        exposes: [e.battery(), e.switch(), e.linkquality()],
    },
];
