const extend = require('zigbee-herdsman-converters/lib/extend');
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
    }
]
