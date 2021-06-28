const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const ota = require('../lib/ota');

module.exports = [
    {
        zigbeeModel: ['SCM_00.00.03.11TC'],
        model: '12031',
        vendor: 'Lupus',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },
    {
        zigbeeModel: ['SCM-3-OTA_00.00.03.16TC', 'SCM-6-OTA_00.00.03.17TC'],
        model: 'LS12128',
        vendor: 'Lupus',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['PSMP5_00.00.03.11TC'],
        model: '12050',
        vendor: 'Lupus',
        description: 'LUPUSEC mains socket with power meter',
        fromZigbee: [fz.on_off, fz.metering],
        exposes: [e.switch(), e.power()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 10, multiplier: 1});
        },
    },
    {
        zigbeeModel: ['PRS3CH1_00.00.05.10TC', 'PRS3CH1_00.00.05.11TC'],
        model: '12126',
        vendor: 'Lupus',
        description: '1 chanel relay',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['PRS3CH2_00.00.05.10TC', 'PRS3CH2_00.00.05.11TC'],
        model: '12127',
        vendor: 'Lupus',
        description: '2 chanel relay',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
        },
    },
];
