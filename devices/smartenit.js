const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['ZBMLC30'],
        model: '4040B',
        vendor: 'Smartenit',
        description: 'Wireless metering 30A dual-load switch/controller',
        fromZigbee: [fz.on_off, fz.metering, fz.ignore_light_brightness_report],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'seMetering']);

            // Device doesn't respond to divisor read, set it here
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1096
            endpoint2.saveClusterAttributeKeyValue('seMetering', {
                divisor: 100000,
                multiplier: 1,
            });
        },
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['ZBHT-1'],
        model: 'ZBHT-1',
        vendor: 'Smartenit',
        description: 'Temperature & humidity sensor ',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
];
