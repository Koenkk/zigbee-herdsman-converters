const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const extend = require('../lib/extend');
const ea = exposes.access;
const e = exposes.presets;

const fzLocal = {
    DTB2011014: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {
                key_1: msg.data['41361'] === 1 ? 'ON' : 'OFF',
                key_2: msg.data['41362'] === 1 ? 'ON' : 'OFF',
                key_3: msg.data['41363'] === 1 ? 'ON' : 'OFF',
                key_4: msg.data['41364'] === 1 ? 'ON' : 'OFF',
            };
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['DTB190502A1'],
        model: 'DTB190502A1',
        vendor: 'databyte.ch',
        description: 'CC2530 based IO Board',
        fromZigbee: [fz.DTB190502A1],
        toZigbee: [tz.DTB190502A1_LED],
        exposes: [exposes.binary('led_state', ea.STATE, 'ON', 'OFF'),
            exposes.enum('key_state', ea.STATE, ['KEY_SYS', 'KEY_UP', 'KEY_DOWN', 'KEY_NONE'])],
    },
    {
        zigbeeModel: ['DTB-ED2004-012'],
        model: 'ED2004-012',
        vendor: 'databyte.ch',
        description: 'Panda 1 - wall switch',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['DTB-ED2011-014'],
        model: 'Touch4',
        vendor: 'databyte.ch',
        description: 'Wall touchsensor with 4 keys',
        fromZigbee: [fzLocal.DTB2011014, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.linkquality(),
            exposes.binary('key_1', ea.STATE, 'ON', 'OFF'),
            exposes.binary('key_2', ea.STATE, 'ON', 'OFF'),
            exposes.binary('key_3', ea.STATE, 'ON', 'OFF'),
            exposes.binary('key_4', ea.STATE, 'ON', 'OFF'),
        ],
    },
];
