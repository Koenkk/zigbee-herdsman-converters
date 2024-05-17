import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
const e = exposes.presets;
const ea = exposes.access;
import * as tuya from '../lib/tuya';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TZ3210_lfbz816s'},
            {modelID: 'TS110F', manufacturerName: '_TZ3210_ebbfkvoy'}],
        model: 'ZB006-X',
        vendor: 'Fantem',
        description: 'Smart dimmer module',
        extend: [light({configureReporting: true})],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, legacy.fz.ZB006X_settings],
        toZigbee: [legacy.tz.ZB006X_settings],
        exposes: [
            e.action(['on', 'off', 'brightness_move_down', 'brightness_move_up', 'brightness_stop']),
            e.enum('control_mode', ea.STATE_SET, ['ext_switch', 'remote', 'both']).withDescription('Control mode'),
            e.enum('switch_type', ea.STATE_SET, ['unknown', 'toggle', 'momentary', 'rotary', 'auto_config'])
                .withDescription('External switch type'),
            e.numeric('switch_status', ea.STATE).withDescription('External switch status')
                .withValueMin(-10000).withValueMax(10000),
            e.enum('load_detection_mode', ea.STATE_SET, ['none', 'first_power_on', 'every_power_on'])
                .withDescription('Load detection mode'),
            // If you see load_type 'unknown', pls. check with Tuya gateway and app and update with label from Tuya app.
            e.enum('load_type', ea.STATE, ['unknown', 'resistive_capacitive', 'unknown', 'detecting'])
                .withDescription('Load type'),
            e.enum('load_dimmable', ea.STATE, ['unknown', 'dimmable', 'not_dimmable'])
                .withDescription('Load dimmable'),
            e.enum('power_supply_mode', ea.STATE, ['unknown', 'no_neutral', 'with_neutral'])
                .withDescription('Power supply mode'),
        ],
        meta: {disableActionGroup: true},
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint) => {
            // Enables reporting of physical state changes
            // https://github.com/Koenkk/zigbee2mqtt/issues/9057#issuecomment-1007742130
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3210_0aqbrnts', '_TZ3210_rxqls8v0', '_TZ3210_zmy9hjay', '_TZ3210_wuhzzfqg']),
        model: 'ZB003-X',
        vendor: 'Fantem',
        description: '4 in 1 multi sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.illuminance, legacy.fz.ZB003X, fz.ZB003X_attr, fz.ZB003X_occupancy],
        toZigbee: [legacy.tz.ZB003X],
        whiteLabel: [
            tuya.whitelabel('EFK', 'is-thpl-zb', '4 in 1 multi sensor', ['_TZ3210_0aqbrnts']),
        ],
        exposes: [e.occupancy(), e.tamper(), e.illuminance_lux(), e.illuminance(), e.temperature(), e.humidity(),
            e.battery(), e.battery_voltage(),
            e.numeric('battery2', ea.STATE).withUnit('%').withDescription('Remaining battery 2 in %'),
            e.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration in lux')
                .withValueMin(-20).withValueMax(20),
            e.numeric('temperature_calibration', ea.STATE_SET).withDescription('Temperature calibration (-2.0...2.0)')
                .withValueMin(-2).withValueMax(2).withValueStep(0.1),
            e.numeric('humidity_calibration', ea.STATE_SET).withDescription('Humidity calibration')
                .withValueMin(-15).withValueMax(15),
            e.binary('reporting_enable', ea.STATE_SET, true, false).withDescription('Enable reporting'),
            e.numeric('reporting_time', ea.STATE_SET).withDescription('Reporting interval in minutes')
                .withValueMin(0).withValueMax(1440).withValueStep(5),
            e.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enable LED'),
            e.binary('pir_enable', ea.STATE_SET, true, false).withDescription('Enable PIR sensor'),
            e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            // eslint-disable-next-line
            e.enum('keep_time', ea.STATE_SET, ['0', '30', '60', '120', '240', '480'])
                .withDescription('PIR keep time in seconds')],
    },
];

export default definitions;
module.exports = definitions;
