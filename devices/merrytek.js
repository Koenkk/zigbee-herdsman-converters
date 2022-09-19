const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_9xejegcy'}],
        model: 'MSA201_Z',
        vendor: 'Merrytek',
        description: 'Large Beam Microwave Occupancy Sensor 24GHz',
        fromZigbee: [fz.merrytek_microwave_sensor],
        toZigbee: [tz.merrytek_microwave_sensor],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.occupancy(),
            exposes.numeric('states', ea.STATE).withDescription('Motion State')
                .withDescription('No motion, Big motion, Minor motion, Breathing'),
            e.illuminance_lux(),
            exposes.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enabled LED'),
            exposes.enum('keep_time', ea.STATE_SET, ['0', '1', '2', '3', '4', '5', '6', '7'])
                .withDescription('PIR keep time 0:5s|1:30s|2:60s|3:180s|4:300s|5:600s|6:1200s|7:1800s'),
            exposes.enum('sensitivity', ea.STATE_SET, ['25', '50', '75', '100']),
            exposes.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration')
                .withValueMin(-10000).withValueMax(10000),
        ],
    },
];
