const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;
const extend = require('../lib/extend');
const reporting = require('../lib/reporting');

module.exports = [
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TZ3210_lfbz816s'}],
        model: 'ZB006-X',
        vendor: 'Fantem',
        description: 'Smart dimmer module without neutral',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        exposes: [e.light_brightness()],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TZ3210_rxqls8v0'}, {modelID: 'TS0202', manufacturerName: '_TZ3210_zmy9hjay'}],
        model: 'ZB003-X',
        vendor: 'Fantem',
        description: '4 in 1 multi sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.illuminance, fz.ZB003X, fz.ZB003X_attr, fz.ZB003X_occupancy],
        toZigbee: [tz.ZB003X],
        exposes: [e.occupancy(), e.tamper(), e.battery(), e.illuminance(), e.illuminance_lux().withUnit('lx'), e.temperature(),
            e.humidity(), exposes.numeric('reporting_time', ea.STATE_SET).withDescription('Reporting interval in minutes'),
            exposes.numeric('temperature_calibration', ea.STATE_SET).withDescription('Temperature calibration'),
            exposes.numeric('humidity_calibration', ea.STATE_SET).withDescription('Humidity calibration'),
            exposes.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration'),
            exposes.binary('pir_enable', ea.STATE_SET, true, false).withDescription('Enable PIR sensor'),
            exposes.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enabled LED'),
            exposes.binary('reporting_enable', ea.STATE_SET, true, false).withDescription('Enabled reporting'),
            exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            // eslint-disable-next-line
            exposes.enum('keep_time', ea.STATE_SET, ['0', '30', '60', '120', '240']).withDescription('PIR keep time in seconds')],
    },
];
