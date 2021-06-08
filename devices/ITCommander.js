const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['ITCMDR_Contact'],
        model: 'ITCMDR_Contact',
        vendor: 'sumju.net',
        description: 'Contact Sensor by IT Commander',
        fromZigbee: ['fz.contact'],
        toZigbee: [],
        exposes: [e.battery(), e.contact()]
    },
    {
        zigbeeModel: ['ITCMDR_Click'],
        model: 'ITCMDR_Click',
        vendor: 'sumju.net',
        description: 'button by IT Commander',
        fromZigbee: [fz.ignore_basic_report, fz.ptvo_multistate_action,],
        toZigbee: [],
        exposes: [e.action(['single', 'double', 'triple', 'hold', 'release']),e.battery(),]
    },
]
