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
        fromZigbee: [...extend.light_onoff_brightness({noConfigure: true}).fromZigbee, fz.command_on, fz.command_off,
            fz.command_move, fz.command_stop, fz.ZB006X_settings],
        toZigbee: [...extend.light_onoff_brightness({noConfigure: true}).toZigbee, tz.ZB006X_settings],
        exposes: [e.light_brightness(),
            e.action(['on', 'off', 'brightness_move_down', 'brightness_move_up', 'brightness_stop']),
            exposes.enum('ext_switch_type', ea.STATE_SET, ['unknown', 'toggle_sw', 'momentary_sw', 'rotary_sw', 'auto_config'])
                .withDescription('External switch type'),
            exposes.enum('load_detection_mode', ea.STATE_SET, ['none', 'first_power_on', 'every_power_on'])
                .withDescription('Load detection mode'),
            exposes.enum('control_mode', ea.STATE_SET, ['local', 'remote', 'both']).withDescription('Control mode'),
        ],
        meta: {disableActionGroup: true},
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
            e.humidity(), exposes.numeric('reporting_time', ea.STATE_SET).withDescription('Reporting interval in minutes')
                .withValueMin(0).withValueMax(1440),
            exposes.numeric('temperature_calibration', ea.STATE_SET).withDescription('Temperature calibration')
                .withValueMin(-20).withValueMax(20),
            exposes.numeric('humidity_calibration', ea.STATE_SET).withDescription('Humidity calibration')
                .withValueMin(-50).withValueMax(50),
            exposes.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration')
                .withValueMin(-10000).withValueMax(10000),
            exposes.binary('pir_enable', ea.STATE_SET, true, false).withDescription('Enable PIR sensor'),
            exposes.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enabled LED'),
            exposes.binary('reporting_enable', ea.STATE_SET, true, false).withDescription('Enabled reporting'),
            exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            // eslint-disable-next-line
            exposes.enum('keep_time', ea.STATE_SET, ['0', '30', '60', '120', '240']).withDescription('PIR keep time in seconds')],
    },
];
