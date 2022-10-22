const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;
const extend = require('../lib/extend');
const reporting = require('../lib/reporting');
const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TZ3210_lfbz816s'},
            {modelID: 'TS110F', manufacturerName: '_TZ3210_ebbfkvoy'}],
        model: 'ZB006-X',
        vendor: 'Fantem',
        description: 'Smart dimmer module',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        fromZigbee: [...extend.light_onoff_brightness({noConfigure: true}).fromZigbee,
            fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.ZB006X_settings],
        toZigbee: [...extend.light_onoff_brightness({noConfigure: true}).toZigbee, tz.ZB006X_settings],
        exposes: [e.light_brightness(),
            e.action(['on', 'off', 'brightness_move_down', 'brightness_move_up', 'brightness_stop']),
            exposes.enum('control_mode', ea.STATE_SET, ['ext_switch', 'remote', 'both']).withDescription('Control mode'),
            exposes.enum('switch_type', ea.STATE_SET, ['unknown', 'toggle', 'momentary', 'rotary', 'auto_config'])
                .withDescription('External switch type'),
            exposes.numeric('switch_status', ea.STATE).withDescription('External switch status')
                .withValueMin(-10000).withValueMax(10000),
            exposes.enum('load_detection_mode', ea.STATE_SET, ['none', 'first_power_on', 'every_power_on'])
                .withDescription('Load detection mode'),
            // If you see load_type 'unknown', pls. check with Tuya gateway and app and update with label from Tuya app.
            exposes.enum('load_type', ea.STATE, ['unknown', 'resistive_capacitive', 'unknown', 'detecting'])
                .withDescription('Load type'),
            exposes.enum('load_dimmable', ea.STATE, ['unknown', 'dimmable', 'not_dimmable'])
                .withDescription('Load dimmable'),
            exposes.enum('power_supply_mode', ea.STATE, ['unknown', 'no_neutral', 'with_neutral'])
                .withDescription('Power supply mode'),
        ],
        meta: {disableActionGroup: true},
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            // Enables reporting of physical state changes
            // https://github.com/Koenkk/zigbee2mqtt/issues/9057#issuecomment-1007742130
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TZ3210_rxqls8v0'},
            {modelID: 'TS0202', manufacturerName: '_TZ3210_zmy9hjay'}],
        model: 'ZB003-X',
        vendor: 'Fantem',
        description: '4 in 1 multi sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.illuminance, fz.ZB003X, fz.ZB003X_attr, fz.ZB003X_occupancy],
        toZigbee: [tz.ZB003X],
        exposes: [e.occupancy(), e.tamper(), e.illuminance_lux(), e.illuminance(), e.temperature(), e.humidity(),
            e.battery(), e.battery_voltage(),
            exposes.numeric('battery2', ea.STATE).withUnit('%').withDescription('Remaining battery 2 in %'),
            exposes.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration in lux')
                .withValueMin(-20).withValueMax(20),
            exposes.numeric('temperature_calibration', ea.STATE_SET).withDescription('Temperature calibration (-2.0...2.0)')
                .withValueMin(-2).withValueMax(2).withValueStep(0.1),
            exposes.numeric('humidity_calibration', ea.STATE_SET).withDescription('Humidity calibration')
                .withValueMin(-15).withValueMax(15),
            exposes.binary('reporting_enable', ea.STATE_SET, true, false).withDescription('Enable reporting'),
            exposes.numeric('reporting_time', ea.STATE_SET).withDescription('Reporting interval in minutes')
                .withValueMin(0).withValueMax(1440).withValueStep(5),
            exposes.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enable LED'),
            exposes.binary('pir_enable', ea.STATE_SET, true, false).withDescription('Enable PIR sensor'),
            exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            // eslint-disable-next-line
            exposes.enum('keep_time', ea.STATE_SET, ['0', '30', '60', '120', '240', '480'])
                .withDescription('PIR keep time in seconds')],
    },
];
