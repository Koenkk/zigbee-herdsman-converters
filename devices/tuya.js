const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const ota = require('../lib/ota');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['TS0203'],
        model: 'TS0203',
        vendor: 'TuYa',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        whiteLabel: [{vendor: 'CR Smart Home', model: 'TS0203'}],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_bq5c8xfe'}],
        model: 'TS0601_temperature_humidity_sensor',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.tuya_temperature_humidity_sensor],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_8ygsuhe1'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yvx5lh6k'}],
        model: 'TS0601_air_quality_sensor',
        vendor: 'Tuya',
        description: 'Air quality sensor',
        fromZigbee: [fz.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2(), e.voc(), e.formaldehyd()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ggev5fsl'}],
        model: 'TS0601_gas_sensor',
        vendor: 'TuYa',
        description: 'gas sensor',
        fromZigbee: [fz.tuya_gas],
        toZigbee: [],
        exposes: [e.gas()],
    },
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_hktqahrq'}, {manufacturerName: '_TZ3000_hktqahrq'}],
        model: 'WHD02',
        vendor: 'TuYa',
        description: 'Wall switch module',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        exposes: extend.switch().exposes.concat([exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
            .withDescription('Controls the behaviour when the device is powered on')]),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_mvn6jl7x'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_raviyuvk'}, {modelID: 'TS011F', manufacturerName: '_TYZB01_hlla45kx'}],
        model: 'TS011F_2_gang_wall',
        vendor: 'TuYa',
        description: '2 gang wall outlet',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        whiteLabel: [{vendor: 'ClickSmart+', model: 'CMA30036'}],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_rk2yzt0u'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_o4cjetlm'}, {manufacturerName: '_TZ3000_o4cjetlm'}],
        model: 'ZN231392',
        vendor: 'TuYa',
        description: 'Smart water/gas valve',
        extend: extend.switch(),
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_1hwjutgo'}],
        model: 'TS011F_circuit_breaker',
        vendor: 'TuYa',
        description: 'Circuit breaker',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Mumubiz', model: 'ZJSB9-80Z'}],
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_qqjaziws'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_jtmhndw2'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_5snkkrxw'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_12sxjap4'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_1mtktxdk'}],
        model: 'TS0505B',
        vendor: 'TuYa',
        description: 'Zigbee RGB+CCT light',
        whiteLabel: [{vendor: 'Mercator ikuü', model: 'SMD4106W-RGB-ZB'},
            {vendor: 'Tuya', model: 'A5C-21F7-01'}],
        extend: extend.light_onoff_brightness_colortemp_color(),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0503B', manufacturerName: '_TZ3000_i8l0nqdu'}],
        model: 'TS0503B',
        vendor: 'TuYa',
        description: 'Zigbee RGB light',
        extend: extend.light_onoff_brightness_color(),
        // Requires red fix: https://github.com/Koenkk/zigbee2mqtt/issues/5962#issue-796462106
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0504B', manufacturerName: '_TZ3000_ukuvyhaa'}],
        model: 'TS0504B',
        vendor: 'TuYa',
        description: 'Zigbee RGBW light',
        extend: extend.light_onoff_brightness_color(),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0501B', manufacturerName: '_TZ3000_4whigl8i'}],
        model: 'TS0501B',
        description: 'Zigbee light',
        vendor: 'TuYa',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_ef5xlc9q'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_vwqnz1sn'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_2b8f6cio'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_dl7cejts'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_qjqgmqxr'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_mmtwjmaq'}],
        model: 'TS0202',
        vendor: 'TuYa',
        description: 'Motion sensor',
        whiteLabel: [{vendor: 'Mercator Ikuü', model: 'SMA02P'}],
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0207', manufacturerName: '_TZ3000_m0vaazab'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_ufttklsz'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_5k5vh43t'}],
        model: 'TS0207_repeater',
        vendor: 'TuYa',
        description: 'Repeater',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TYZB01_ijihzffk'}],
        model: 'TS0101',
        vendor: 'TuYa',
        description: 'Zigbee Socket',
        whiteLabel: [{vendor: 'Larkkey', model: 'PS080'}],
        extend: extend.switch(),
        meta: {disableDefaultResponse: true},
    },
    {
        fingerprint: [{modelID: 'TS0108', manufacturerName: '_TYZB01_7yidyqxd'}],
        model: 'TS0108',
        vendor: 'TuYa',
        description: 'Socket with 2 USB',
        whiteLabel: [{vendor: 'Larkkey', model: 'PS580'}],
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 7};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_whpb9yts'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ebwgzdqq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9i9dt8is'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_dfxkcots'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_swaamsoy'},
        ],
        model: 'TS0601_dimmer',
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        whiteLabel: [
            {vendor: 'Larkkey', model: 'ZSTY-SM-1DMZG-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAA-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAB-EU'},
            {vendor: 'Earda', model: 'EDM-1ZBA-EU'},
        ],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_oiymh3qu'}],
        model: 'TS011F_socket_module',
        vendor: 'TuYa',
        description: 'Socket module',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'LoraTap', model: 'RR400ZB'}],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_wxtp7c5y'},
            {modelID: 'TS011F', manufacturerName: '_TYZB01_mtunwanm'}],
        model: 'TS011F_wall_outlet',
        vendor: 'TuYa',
        description: 'In-wall outlet',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Teekar', model: 'SWP86-01OG'}, {vendor: 'ClickSmart+', model: 'CMA30035'}],
    },
    {
        fingerprint: [{modelID: 'isltm67\u0000', manufacturerName: '_TYST11_pisltm67'}],
        model: 'S-LUX-ZB',
        vendor: 'TuYa',
        description: 'Light sensor',
        fromZigbee: [fz.SLUXZB],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery(), e.illuminance_lux(), e.battery_low()],
    },
    {
        zigbeeModel: ['TS130F'],
        model: 'TS130F',
        vendor: 'TuYa',
        description: 'Curtain/blind switch',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_backlight_mode, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal, tz.tuya_backlight_mode],
        whiteLabel: [{vendor: 'LoraTap', model: 'SC400'}],
        exposes: [e.cover_position(), exposes.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
            exposes.binary('calibration', ea.ALL, 'ON', 'OFF'),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH']),
            exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF')],
    },
    {
        zigbeeModel: ['qnazj70', 'kjintbl'],
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_wunufsil'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_vhy3iakz'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_oisqyl4o'},
            {modelID: 'TS0601', manufacturerName: '_TZ3000_uim07oem'},
        ],
        model: 'TS0601_switch',
        vendor: 'TuYa',
        description: '1, 2, 3 or 4 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        whiteLabel: [
            {vendor: 'Norklmes', model: 'MKS-CM-W5'},
            {vendor: 'Somgoms', model: 'ZSQB-SMB-ZB'},
            {vendor: 'Moes', model: 'WS-EUB1-ZG'},
            {vendor: 'AVATTO', model: 'ZGB-WS-EU'},
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_aqnazj70'}],
        model: 'TS0601_switch_4_gang',
        vendor: 'TuYa',
        description: '4 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_nkjintbl'}],
        model: 'TS0601_switch_2_gang',
        vendor: 'TuYa',
        description: '2 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kyfqmmyl'}],
        model: 'TS0601_switch_3_gang',
        vendor: 'TuYa',
        description: '3 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0215A', manufacturerName: '_TZ3000_4fsgukof'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_wr2ucaj9'}],
        model: 'TS0215A_sos',
        vendor: 'TuYa',
        description: 'SOS button',
        fromZigbee: [fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.action(['emergency'])],
        toZigbee: [],
    },
    {
        fingerprint: [{modelID: 'TS0215A', manufacturerName: '_TZ3000_p6ju8myv'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_fsiepnrh'}],
        model: 'TS0215A_remote',
        vendor: 'TuYa',
        description: 'Security remote control',
        fromZigbee: [fz.command_arm, fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.action(['disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Woox', model: 'R7054'}, {vendor: 'Nedis', model: 'ZBRC10WT'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genTime', 'genBasic', 'ssIasAce', 'ssIasZone']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0503A', manufacturerName: '_TZ3000_obacbukl'}],
        model: 'TS0503A',
        vendor: 'TuYa',
        description: 'Led strip controller',
        extend: extend.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['TS0503A'],
        model: 'TYZS1L',
        vendor: 'TuYa',
        description: 'Led strip controller HSB',
        exposes: [e.light_colorhs()],
        fromZigbee: [fz.on_off, fz.tuya_led_controller],
        toZigbee: [tz.tuya_led_controller, tz.ignore_transition, tz.ignore_rate],
    },
    {
        zigbeeModel: ['TS0502A'],
        model: 'TS0502A',
        vendor: 'TuYa',
        description: 'Light controller',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        fingerprint: [
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_s1x7gcq0'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_hi1ym4bl'},
        ],
        model: 'TS0502B',
        vendor: 'TuYa',
        description: 'Light controller',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        fingerprint: [{modelID: 'TS0504A', manufacturerName: '_TZ3000_nzbm4ad4'}],
        model: 'TS0504A',
        vendor: 'TuYa',
        description: 'RGBW LED controller',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_sosdczdl'}],
        model: 'TS0505A_led',
        vendor: 'TuYa',
        description: 'RGB+CCT LED',
        toZigbee: [tz.on_off, tz.tuya_led_control],
        fromZigbee: [fz.on_off, fz.tuya_led_controller, fz.brightness, fz.ignore_basic_report],
        exposes: [e.light_brightness_colortemp_colorhs([153, 500]).removeFeature('color_temp_startup')],
    },
    {
        zigbeeModel: ['TS0505A'],
        model: 'TS0505A',
        vendor: 'TuYa',
        description: 'RGB+CCT light controller',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [
            {type: 'EndDevice', manufacturerID: 4098, endpoints: [{ID: 1, inputClusters: [], outputClusters: []}]},
            {manufacturerName: '_TZ2000_a476raq2'},
        ],
        zigbeeModel: ['TS0201', 'SNTZ003'],
        model: 'TS0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with display',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        fingerprint: [{modelID: 'SM0201', manufacturerName: '_TYZB01_cbiezpds'}],
        model: 'SM0201',
        vendor: 'Tuya',
        description: 'Temperature & humidity sensor with LED screen',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['TS0041'],
        model: 'TS0041',
        vendor: 'TuYa',
        description: 'Wireless switch with 1 button',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0041'}],
        exposes: [e.battery(), e.action(['single', 'double', 'hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (error) {/* Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/6313 */}
        },
    },
    {
        zigbeeModel: ['TS0042'],
        model: 'TS0042',
        vendor: 'TuYa',
        description: 'Wireless switch with 2 buttons',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0042'}],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TS0043'],
        model: 'TS0043',
        vendor: 'TuYa',
        description: 'Wireless switch with 3 buttons',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0043'}, {vendor: 'LoraTap', model: 'SS600ZB'}],
        exposes: [e.battery(),
            e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold', '3_single', '3_double', '3_hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0044'],
        model: 'TS0044',
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        whiteLabel: [{vendor: 'Lonsonho', model: 'TS0044'}, {vendor: 'Haozee', model: 'ESW-OZAA-EU'}],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
            '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold'])],
        toZigbee: [],
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_xabckq1v'}],
        model: 'TS004F',
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        exposes: [e.battery(), e.action(
            ['on', 'off', 'brightness_move_up', 'brightness_step_up', 'brightness_step_down', 'brightness_move_down', 'brightness_stop'])],
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (error) {/* Fails for some*/}
        },
    },
    {
        zigbeeModel: ['TS0001'],
        model: 'TS0001',
        vendor: 'TuYa',
        description: '1 gang switch',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'CR Smart Home', model: 'TS0001', description: 'Valve control'}, {vendor: 'Lonsonho', model: 'X701'},
            {vendor: 'Bandi', model: 'BDS03G1'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0002'],
        model: 'TS0002',
        vendor: 'TuYa',
        description: '2 gang switch',
        whiteLabel: [{vendor: 'Zemismart', model: 'ZM-CSW002-D_switch'}, {vendor: 'Lonsonho', model: 'X702'}],
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: [
            'owvfni3\u0000', 'owvfni3', 'u1rkty3', 'aabybja', // Curtain motors
            'mcdj3aq', 'mcdj3aq\u0000', // Tubular motors
        ],
        fingerprint: [
            // Curtain motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_5zbp6j0u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nkoabg8w'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xuzcvlku'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_4vobcgd3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nogaemzt'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pk0sfzvr'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fdtjuw7u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zpzndjez'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wmcdj3aq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cowvfni3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rddyvrci'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nueqqe6k'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xaabybja'},
            {modelID: 'zo2pocs\u0000', manufacturerName: '_TYST11_fzo2pocs'},
            // Roller blinds:
            {modelID: 'TS0601', manufacturerName: '_TZE200_sbordckq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fctwhugx'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zah67ekd'},
            // Window pushers:
            {modelID: 'TS0601', manufacturerName: '_TZE200_g5wdnuow'},
            // Tubular motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_fzo2pocs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_5sbebbzs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zuz7f94z'},
        ],
        model: 'TS0601_cover',
        vendor: 'TuYa',
        description: 'Curtain motor/roller blind motor/window pusher/tubular motor',
        whiteLabel: [
            {vendor: 'Yushun', model: 'YS-MT750'},
            {vendor: 'Zemismart', model: 'ZM79E-DT'},
            {vendor: 'Binthen', model: 'BCM100D'},
            {vendor: 'Binthen', model: 'CV01A'},
            {vendor: 'Zemismart', model: 'M515EGB'},
            {vendor: 'Tuya', model: 'M515EGZT'},
            {vendor: 'TuYa', model: 'DT82LEMA-1.2N'},
            {vendor: 'Moes', model: 'AM43-0.45/40-ES-EB'},
            {vendor: 'Larkkey', model: 'ZSTY-SM-1SRZG-EU'},
            {vendor: 'Zemismart', model: 'ZM25TQ', description: 'Tubular motor'},
            {vendor: 'Zemismart', model: 'AM43', description: 'Roller blind motor'},
            {vendor: 'Zemismart', model: 'M2805EGBZTN', description: 'Tubular motor'},
            {vendor: 'Zemismart', model: 'BCM500DS-TYZ', description: 'Curtain motor'},
            {vendor: 'A-OK', model: 'AM25', description: 'Tubular motor'},
        ],
        fromZigbee: [fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            exposes.composite('options', 'options')
                .withFeature(exposes.numeric('motor_speed', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(255)
                    .withDescription('Motor speed'))],
    },
    {
        zigbeeModel: ['kud7u2l'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ckud7u2l'}, {modelID: 'TS0601', manufacturerName: '_TZE200_ywdxldoj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cwnjrr72'}],
        model: 'TS0601_thermostat',
        vendor: 'TuYa',
        description: 'Radiator valve with thermostat',
        whiteLabel: [{vendor: 'Moes', model: 'HY368'}, {vendor: 'Moes', model: 'HY369RT'}, {vendor: 'SHOJZJ', model: '378RT'}],
        meta: {tuyaThermostatPreset: tuya.thermostatPresets, tuyaThermostatSystemMode: tuya.thermostatSystemModes3},
        ota: ota.zigbeeOTA,
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.tuya_thermostat_child_lock, tz.tuya_thermostat_window_detection, tz.tuya_thermostat_valve_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_auto_lock,
            tz.tuya_thermostat_calibration, tz.tuya_thermostat_min_temp, tz.tuya_thermostat_max_temp,
            tz.tuya_thermostat_boost_time, tz.tuya_thermostat_comfort_temp, tz.tuya_thermostat_eco_temp,
            tz.tuya_thermostat_force_to_mode, tz.tuya_thermostat_force, tz.tuya_thermostat_preset, tz.tuya_thermostat_away_mode,
            tz.tuya_thermostat_window_detect, tz.tuya_thermostat_schedule, tz.tuya_thermostat_week, tz.tuya_thermostat_away_preset],
        exposes: [
            e.child_lock(), e.window_detection(), e.battery_low(), e.valve_detection(), e.position(),
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSystemMode(['heat', 'auto', 'off'], ea.STATE_SET)
                .withLocalTemperatureCalibration(ea.STATE_SET)
                .withAwayMode().withPreset(['schedule', 'manual', 'boost', 'complex', 'comfort', 'eco']),
            e.auto_lock(), e.away_mode(), e.away_preset_days(), e.boost_time(), e.comfort_temperature(), e.eco_temperature(), e.force(),
            e.max_temperature(), e.min_temperature(), e.week(), e.away_preset_temperature()],
    },
    {
        fingerprint: [{modelID: 'v90ladg\u0000', manufacturerName: '_TYST11_wv90ladg'}],
        model: 'HT-08',
        vendor: 'ETOP',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.legacy.tuya_thermostat_weekly_schedule, fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.etop_thermostat_system_mode, tz.etop_thermostat_away_mode, tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: tuya.dataPoints.schedule,
            },
        },
        exposes: [e.child_lock(), exposes.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)
            .withAwayMode()],
    },
    {
        fingerprint: [{modelID: 'dpplnsn\u0000', manufacturerName: '_TYST11_2dpplnsn'}],
        model: 'HT-10',
        vendor: 'ETOP',
        description: 'Radiator valve',
        fromZigbee: [fz.legacy.tuya_thermostat_weekly_schedule, fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.etop_thermostat_system_mode, tz.etop_thermostat_away_mode, tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            timeout: 20000, // TRV wakes up every 10sec
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: tuya.dataPoints.schedule,
            },
        },
        exposes: [
            e.battery_low(), e.child_lock(), exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withAwayMode()
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE),
        ],
    },
    {
        zigbeeModel: ['TS0121'],
        model: 'TS0121_plug',
        description: '10A UK or 16A EU smart plug',
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-SHP13'}],
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 1, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
        // This device doesn't support reporting correctly.
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.STATE_SET, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        onEvent: (type, data, device, options) => {
            const endpoint = device.getEndpoint(1);
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 60;
                const interval = setInterval(async () => {
                    try {
                        await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                    } catch (error) {/* Do nothing*/}
                }, seconds*1000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_cphmq0q7'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_ew3ldmgx'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_ps3dmato'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_mraovvmm'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_jvzvulen'}],
        model: 'TS011F_plug',
        description: 'Smart plug (with power monitoring)',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'LELLKI', model: 'TS011F_plug'}],
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.STATE_SET, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_hyfvrar3'}],
        model: 'TS011F_plug_2',
        description: 'Smart plug (without power monitoring)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.switch(), exposes.enum('power_outage_memory', ea.STATE_SET, ['on', 'off', 'restore'])
            .withDescription('Recover state after power outage')],
    },
    {
        zigbeeModel: ['5p1vj8r'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_t5p1vj8r'}],
        model: 'TS0601_smoke',
        vendor: 'TuYa',
        description: 'Smoke sensor',
        fromZigbee: [fz.tuya_smoke],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.smoke(), e.battery_low()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_byzdayie'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fsb6zw01'}],
        model: 'TS0601_din',
        vendor: 'TuYa',
        description: 'Zigbee smart energy meter DDS238-2 Zigbee',
        fromZigbee: [fz.tuya_dinrail_switch],
        toZigbee: [tz.tuya_switch_state],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.switch().setAccess('state', ea.STATE_SET), e.voltage(), e.power(), e.current(), e.energy()],
    },
    {
        zigbeeModel: ['RH3001'],
        fingerprint: [{type: 'EndDevice', manufacturerID: 4098, applicationVersion: 66, endpoints: [
            {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 10, 1, 1280], outputClusters: [25]},
        ]}],
        model: 'SNTZ007',
        vendor: 'TuYa',
        description: 'Rechargeable Zigbee contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ignore_time_read],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-IS2'}],
    },
    {
        zigbeeModel: ['RH3040'],
        model: 'RH3040',
        vendor: 'TuYa',
        description: 'PIR sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        whiteLabel: [{vendor: 'Samotech', model: 'SM301Z'}],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['TS0115'],
        model: 'TS0115',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (10A or 16A)',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5')],
        whiteLabel: [{vendor: 'UseeLink', model: 'SM-SO306E/K/M'}],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 7};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['RH3052'],
        model: 'TT001ZAV20',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['TS0011'],
        model: 'TS0011',
        vendor: 'TuYa',
        description: 'Smart light switch - 1 gang',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Vrey', model: 'VR-X712U-0013'}, {vendor: 'TUYATEC', model: 'GDKES-01TZXD'},
            {vendor: 'Lonsonho', model: 'QS-Zigbee-S05-L', description: '1 gang smart switch module without neutral wire'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0012'],
        model: 'TS0012',
        vendor: 'TuYa',
        description: 'Smart light switch - 2 gang',
        whiteLabel: [{vendor: 'Vrey', model: 'VR-X712U-0013'}, {vendor: 'TUYATEC', model: 'GDKES-02TZXD'},
            {vendor: 'Earda', model: 'ESW-2ZAA-EU'}],
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0013'],
        model: 'TS0013',
        vendor: 'TuYa',
        description: 'Smart light switch - 3 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-03TZXD'}],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                for (const ID of [1, 2, 3]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0014', manufacturerName: '_TZ3000_jr2atpww'}, {modelID: 'TS0014', manufacturerName: '_TYZB01_dvakyzhd'},
            {modelID: 'TS0014', manufacturerName: '_TZ3210_w3hl6rao'}, {modelID: 'TS0014', manufacturerName: '_TYZB01_bagt1e4o'},
            {modelID: 'TS0014', manufacturerName: '_TZ3000_r0pmi2p3'}],
        model: 'TS0014',
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-04TZXD'}, {vendor: 'Vizo', model: 'VZ-222S'},
            {vendor: 'MakeGood', model: 'MG-ZG04W/B/G'}],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                for (const ID of [1, 2, 3, 4]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['gq8b1uv'],
        model: 'gq8b1uv',
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['HY0017'],
        model: 'U86KCJ-ZP',
        vendor: 'TuYa',
        description: 'Smart 6 key scene wall switch',
        fromZigbee: [fz.scenes_recall_scene_65029],
        exposes: [e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['q9mpfhw'],
        model: 'SNTZ009',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [fz.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0004'],
        model: 'TS0004',
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang with neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0006', manufacturerName: '_TYZB01_ltundz9m'}],
        model: 'TS0006',
        vendor: 'TuYa',
        description: '6 gang switch module with neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5'), e.switch().withEndpoint('l6')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5, 'l6': 6};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HY0080'],
        model: 'U86KWF-ZPSJ',
        vendor: 'TuYa',
        description: 'Environment controller',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.fan],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
            tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration, tz.fan_mode],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat'], ea.ALL)
            .withRunningState(['idle', 'heat', 'cool'], ea.STATE)
            .withLocalTemperatureCalibration(ea.ALL).withPiHeatingDemand()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['6dfgetq'],
        model: 'D3-DPWK-TY',
        vendor: 'TuYa',
        description: 'HVAC controller',
        exposes: [exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
            .withRunningState(['idle', 'heat', 'cool'], ea.STATE)],
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report, fz.tuya_dimmer],
        meta: {tuyaThermostatSystemMode: tuya.thermostatSystemModes2, tuyaThermostatPreset: tuya.thermostatPresets},
        toZigbee: [tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_system_mode,
            tz.tuya_thermostat_fan_mode, tz.tuya_dimmer_state],
    },
    {
        zigbeeModel: ['E220-KR4N0Z0-HA', 'JZ-ZB-004'],
        model: 'E220-KR4N0Z0-HA',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        whiteLabel: [{vendor: 'LEELKI', model: 'WP33-EU'}],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0216'],
        model: 'TS0216',
        vendor: 'TuYa',
        description: 'Sound and flash siren',
        fromZigbee: [fz.ts0216_siren, fz.battery],
        exposes: [e.battery(), exposes.binary('alarm', ea.STATE_SET, true, false),
            exposes.numeric('volume', ea.ALL).withValueMin(0).withValueMax(100).withDescription('Volume of siren')],
        toZigbee: [tz.ts0216_alarm, tz.ts0216_duration, tz.ts0216_volume],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_znzs7yaw'}],
        model: 'HY08WE',
        vendor: 'TuYa',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.hy_thermostat, fz.ignore_basic_report, fz.hy_set_time_request],
        toZigbee: [tz.hy_thermostat],
        exposes: [exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)],
    },
    {
        fingerprint: [{modelID: 'TS0222', manufacturerName: '_TYZB01_4mdqxxnn'}],
        model: 'TS0222',
        vendor: 'TuYa',
        description: 'Light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance],
        toZigbee: [],
        exposes: [e.battery(), e.illuminance(), e.illuminance_lux()],
    },
    {
        fingerprint: [{modelID: 'TS0210', manufacturerName: '_TYZB01_3zv6oleo'}],
        model: 'TS0210',
        vendor: 'TuYa',
        description: 'Vibration sensor',
        fromZigbee: [fz.battery, fz.ias_vibration_alarm_1_with_timeout],
        toZigbee: [tz.TS0210_sensitivity],
        exposes: [e.battery(), e.vibration(), exposes.enum('sensitivity', exposes.access.STATE_SET, ['low', 'medium', 'high'])],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_8bxrzyxz'}],
        model: 'TS011F_DinSmartRelay',
        description: 'Din Smart Relay (with power monitoring)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.STATE_SET, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        icon: 'data:image/png;base64,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',
    },
];