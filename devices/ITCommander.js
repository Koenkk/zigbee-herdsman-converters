const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const exposes = require('../lib/exposes');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['ITCMDR_Contact'],
        model: 'ITCMDR_Contact',
        vendor: 'IT Commander',
        description: 'Contact Sensor',
        fromZigbee: [fz.contact],
        toZigbee: [],
        exposes: [e.battery(), e.contact()],
    },
    {
        zigbeeModel: ['ITCMDR_Click'],
        model: 'ITCMDR_Click',
        vendor: 'IT Commander',
        description: 'Button',
        fromZigbee: [fz.ignore_basic_report, fz.ptvo_multistate_action],
        toZigbee: [],
        exposes: [e.action(['single', 'double', 'triple', 'hold', 'release']), e.battery()],
    },
];
