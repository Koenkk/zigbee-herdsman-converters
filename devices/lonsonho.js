const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS130F', manufacturerName: '_TZ3000_vd43bbfq'}],
        model: 'QS-Zigbee-C01',
        vendor: 'Lonsonho',
        description: 'Curtain/blind motor controller',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal],
        meta: {coverInverted: true},
        exposes: [e.cover_position(), exposes.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
            exposes.binary('calibration', ea.ALL, 'ON', 'OFF'),
            exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF')],
    },
    {
        fingerprint: [{modelID: 'TS130F', manufacturerName: '_TZ3000_egq7y6pr'}],
        model: '11830304',
        vendor: 'Lonsonho',
        description: 'Curtain switch',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_backlight_mode, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal, tz.tuya_backlight_mode],
        meta: {coverInverted: true},
        exposes: [e.cover_position(), exposes.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
            exposes.binary('calibration', ea.ALL, 'ON', 'OFF'),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH']),
            exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF')],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_8vxj8khv'}, {modelID: 'TS0601', manufacturerName: '_TZE200_7tdtqgwv'}],
        model: 'X711A',
        vendor: 'Lonsonho',
        description: '1 gang switch',
        extend: extend.switch(),
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dhdstcqc'}],
        model: 'X712A',
        vendor: 'Lonsonho',
        description: '2 gang switch',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_fqytfymk'}],
        model: 'X713A',
        vendor: 'Lonsonho',
        description: '3 gang switch',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TZ3000_ktuoyvt5'}],
        model: 'QS-Zigbee-D02-TRIAC-L',
        vendor: 'Lonsonho',
        description: '1 gang smart dimmer switch module without neutral',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TYZB01_qezuin6k'}],
        model: 'QS-Zigbee-D02-TRIAC-LN',
        vendor: 'Lonsonho',
        description: '1 gang smart dimmer switch module with neutral',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TYZB01_v8gtiaed'}],
        model: 'QS-Zigbee-D02-TRIAC-2C-LN',
        vendor: 'Lonsonho',
        description: '2 gang smart dimmer switch module with neutral',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            // Don't do: await reporting.onOff(endpoint); https://github.com/Koenkk/zigbee2mqtt/issues/6041
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TZ3000_92chsky7'}],
        model: 'QS-Zigbee-D02-TRIAC-2C-L',
        vendor: 'Lonsonho',
        description: '2 gang smart dimmer switch module without neutral',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        zigbeeModel: ['Plug_01'],
        model: '4000116784070',
        vendor: 'Lonsonho',
        description: 'Smart plug EU',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZB-RGBCW'],
        fingerprint: [{modelID: 'ZB-CL01', manufacturerName: 'eWeLight'}, {modelID: 'ZB-CL01', manufacturerName: 'eWeLink'},
            {modelID: 'ZB-CL02', manufacturerName: 'eWeLight'}],
        model: 'ZB-RGBCW',
        vendor: 'Lonsonho',
        description: 'Zigbee 3.0 LED-bulb, RGBW LED',
        extend: extend.light_onoff_brightness_colortemp_color(
            {disableColorTempStartup: true, colorTempRange: [153, 370], disableEffect: true}),
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_zsl6z0pw'}],
        model: 'QS-Zigbee-S04-2C-LN',
        vendor: 'Lonsonho',
        description: '2 gang switch module with neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        toZigbee: [tz.TYZB01_on_off],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_ncutbjdi'}],
        model: 'QS-Zigbee-S05-LN',
        vendor: 'Lonsonho',
        description: '1 gang switch module with neutral wire',
        extend: extend.switch(),
        toZigbee: [tz.TYZB01_on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
];
