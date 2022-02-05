const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const libColor = require('../lib/color');
const utils = require('../lib/utils');

const TS011Fplugs = ['_TZ3000_5f43h46b', '_TZ3000_cphmq0q7', '_TZ3000_dpo1ysak', '_TZ3000_ew3ldmgx', '_TZ3000_gjnozsaz',
    '_TZ3000_jvzvulen', '_TZ3000_mraovvmm', '_TZ3000_nfnmi125', '_TZ3000_ps3dmato', '_TZ3000_w0qqde0g', '_TZ3000_u5u4cakc',
    '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg', '_TZ3000_2xlvlnez'];

const tzLocal = {
    TS0504B_color: {
        key: ['color'],
        convertSet: async (entity, key, value, meta) => {
            const color = libColor.Color.fromConverterArg(value);
            console.log(color);
            const enableWhite =
                (color.isRGB() && (color.rgb.red === 1 && color.rgb.green === 1 && color.rgb.blue === 1)) ||
                // Zigbee2MQTT frontend white value
                (color.isXY() && (color.xy.x === 0.3125 || color.xy.y === 0.32894736842105265)) ||
                // Home Assistant white color picker value
                (color.isXY() && (color.xy.x === 0.323 || color.xy.y === 0.329));

            if (enableWhite) {
                await entity.command('lightingColorCtrl', 'tuyaRgbMode', {enable: false});
                const newState = {color_mode: 'xy'};
                if (color.isXY()) {
                    newState.color = color.xy;
                } else {
                    newState.color = color.rgb.gammaCorrected().toXY().rounded(4);
                }
                return {state: libColor.syncColorState(newState, meta.state, entity, meta.options, meta.logger)};
            } else {
                return await tz.light_color.convertSet(entity, key, value, meta);
            }
        },
    },
};

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
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (error) {/* Fails for some*/}
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_bq5c8xfe'}],
        model: 'TS0601_temperature_humidity_sensor',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.tuya_temperature_humidity_sensor],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vzqtvljm'}],
        model: 'TS0601_illuminance_temperature_humidity_sensor',
        vendor: 'TuYa',
        description: 'Illuminance, temperature & humidity sensor',
        fromZigbee: [fz.tuya_illuminance_temperature_humidity_sensor],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.illuminance_lux(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_8ygsuhe1'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yvx5lh6k'}, {modelID: 'TS0601', manufacturerName: '_TZE200_ryfmq5rl'}],
        model: 'TS0601_air_quality_sensor',
        vendor: 'TuYa',
        description: 'Air quality sensor',
        fromZigbee: [fz.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2(), e.voc(), e.formaldehyd()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dwcarsat'}],
        model: 'TS0601_smart_air_house_keeper',
        vendor: 'TuYa',
        description: 'Smart air house keeper',
        fromZigbee: [fz.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2(), e.voc(), e.formaldehyd(), e.pm25()],
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
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_hktqahrq'}, {manufacturerName: '_TZ3000_hktqahrq'},
            {manufacturerName: '_TZ3000_q6a3tepg'}, {modelID: 'TS000F', manufacturerName: '_TZ3000_m9af2l6g'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_npzfdcof'}],
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
            {modelID: 'TS011F', manufacturerName: '_TZ3000_raviyuvk'}, {modelID: 'TS011F', manufacturerName: '_TYZB01_hlla45kx'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_92qd4sqa'}],
        model: 'TS011F_2_gang_wall',
        vendor: 'TuYa',
        description: '2 gang wall outlet',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_backlight_mode]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_backlight_mode]),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            exposes.enum('power_on_behavior', ea.ALL, ['on', 'off', 'previous']),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH'])],
        whiteLabel: [{vendor: 'ClickSmart+', model: 'CMA30036'}],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_rk2yzt0u'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_o4cjetlm'}, {manufacturerName: '_TZ3000_o4cjetlm'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_iedbgyxt'}, {modelID: 'TS0001', manufacturerName: '_TZ3000_h3noz0a5'},
            {modelID: 'TS0001', manufacturerName: '_TYZB01_4tlksk8a'}],
        model: 'ZN231392',
        vendor: 'TuYa',
        description: 'Smart water/gas valve',
        extend: extend.switch(),
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_1hwjutgo'}, {modelID: 'TS011F', manufacturerName: '_TZ3000_lnggrqqi'}],
        model: 'TS011F_circuit_breaker',
        vendor: 'TuYa',
        description: 'Circuit breaker',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Mumubiz', model: 'ZJSB9-80Z'}],
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_qqjaziws'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_jtmhndw2'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_ezlg0pht'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_5snkkrxw'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_12sxjap4'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_x2fqbdun'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_589kq4ul'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_1mtktxdk'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_remypqqm'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_kohbva1f'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_wslkvrau'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_0rn9qhnu'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_bicjqpg4'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_cmaky9gq'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_tza2vjxx'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_k1pe6ibm'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_bfwvfyx1'}],
        model: 'TS0505B',
        vendor: 'TuYa',
        description: 'Zigbee RGB+CCT light',
        whiteLabel: [{vendor: 'Mercator Ikuü', model: 'SMD4106W-RGB-ZB'},
            {vendor: 'TuYa', model: 'A5C-21F7-01'}, {vendor: 'Mercator Ikuü', model: 'S9E27LED9W-RGB-Z'},
            {vendor: 'Aldi', model: 'L122CB63H11A9.0W', description: 'LIGHTWAY smart home LED-lamp - bulb'},
            {vendor: 'Lidl', model: '14153706L', description: 'Livarno smart LED ceiling light'},
        ],
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0503B', manufacturerName: '_TZ3000_i8l0nqdu'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_a5fxguxr'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_778drfdt'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3000_g5xawfcq'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_trm3l2aw'}],
        model: 'TS0503B',
        vendor: 'TuYa',
        description: 'Zigbee RGB light',
        extend: extend.light_onoff_brightness_color(),
        // Requires red fix: https://github.com/Koenkk/zigbee2mqtt/issues/5962#issue-796462106
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0504B', manufacturerName: '_TZ3000_ukuvyhaa'},
            {modelID: 'TS0504B', manufacturerName: '_TZ3210_bfvybixd'},
            {modelID: 'TS0504B', manufacturerName: '_TZ3210_sroezl0s'},
            {modelID: 'TS0504B', manufacturerName: '_TZ3210_1elppmba'}],
        model: 'TS0504B',
        vendor: 'TuYa',
        description: 'Zigbee RGBW light',
        extend: extend.light_onoff_brightness_color(),
        toZigbee: utils.replaceInArray(extend.light_onoff_brightness_color().toZigbee, [tz.light_color], [tzLocal.TS0504B_color]),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0501A', manufacturerName: '_TZ3000_yeg1e5eh'}],
        model: 'TS0501A',
        description: 'Zigbee light',
        vendor: 'TuYa',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS0501B', manufacturerName: '_TZ3000_4whigl8i'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_4whigl8i'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_9q49basr'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_i680rtja'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_grnwgegn'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_wuheofsg'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_e5t9bfdv'}],
        model: 'TS0501B',
        description: 'Zigbee light',
        vendor: 'TuYa',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_ef5xlc9q'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_vwqnz1sn'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_2b8f6cio'},
            {modelID: 'TS0202', manufacturerName: '_TZE200_bq5c8xfe'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_dl7cejts'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_qjqgmqxr'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_mmtwjmaq'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_kmh5qpmb'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_zwvaj5wy'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_bsvqrxru'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_tv3wxhcz'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_hqbdru35'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_tiwq83wk'},
            {modelID: 'WHD02', manufacturerName: '_TZ3000_hktqahrq'}],
        model: 'TS0202',
        vendor: 'TuYa',
        description: 'Motion sensor',
        whiteLabel: [{vendor: 'Mercator Ikuü', model: 'SMA02P'}, {vendor: 'TuYa', model: 'TY-ZPR06'}],
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TZ3000_mcxw5ehu'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_msl6wxk9'}],
        model: 'ZM-35H-Q',
        vendor: 'TuYa',
        description: 'Motion Sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ZM35HQ_attr],
        toZigbee: [tz.ZM35HQ_attr],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(),
            exposes.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            exposes.enum('keep_time', ea.ALL, ['30', '60', '120']).withDescription('PIR keep time in seconds'),
        ],
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
        zigbeeModel: ['TS0207', 'FNB54-WTS08ML1.0'],
        fingerprint: [{modelID: 'TS0207', manufacturerName: '_TZ3000_upgcbody'}],
        model: 'TS0207_water_leak_detector',
        vendor: 'TuYa',
        description: 'Water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        whiteLabel: [{vendor: 'CR Smart Home', model: 'TS0207'}],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.battery()],
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
            {modelID: 'TS0601', manufacturerName: '_TZE200_ojzhk75b'},
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
            {vendor: 'Mercator Ikuü', model: 'SSWD01'},
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
            {modelID: 'TS011F', manufacturerName: '_TYZB01_mtunwanm'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_o1jzcxou'}],
        model: 'TS011F_wall_outlet',
        vendor: 'TuYa',
        description: 'In-wall outlet',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Teekar', model: 'SWP86-01OG'},
            {vendor: 'ClickSmart+', model: 'CMA30035'},
            {vendor: 'BSEED', model: 'Zigbee Socket'}],
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
            exposes.binary('calibration', ea.ALL, 'ON', 'OFF'), exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF'),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH']),
            exposes.numeric('calibration_time', ea.STATE).withUnit('S').withDescription('Calibration time')],
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
        meta: {applyRedFix: true},
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
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_muqovqv0'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_hi1ym4bl'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_psgq7ysz'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_zw7wr5uo'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_pz9zmxjj'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_fzwhym79'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_rm0hthdo'},
        ],
        model: 'TS0502B',
        vendor: 'TuYa',
        description: 'Light controller',
        whiteLabel: [{vendor: 'Mercator Ikuü', model: 'SMI7040', description: 'Ford Batten Light'}],
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
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-IS4'}],
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_bguser20'}],
        model: 'WSD500A',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        fingerprint: [{modelID: 'SM0201', manufacturerName: '_TYZB01_cbiezpds'}],
        model: 'SM0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with LED screen',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['TS0041'],
        fingerprint: [{manufacturerName: '_TZ3000_tk3s5tyg'}],
        model: 'TS0041',
        vendor: 'TuYa',
        description: 'Wireless switch with 1 button',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0041'}, {vendor: 'Benexmart', model: 'ZM-sui1'}],
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
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (error) {/* Fails for some*/}
        },
    },
    {
        zigbeeModel: ['TS0044'],
        model: 'TS0044',
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        whiteLabel: [{vendor: 'Lonsonho', model: 'TS0044'}, {vendor: 'Haozee', model: 'ESW-OZAA-EU'},
            {vendor: 'LoraTap', model: 'SS6400ZB'}],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
            '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold'])],
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
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_xabckq1v'}],
        model: 'TS004F',
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
            '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold'])],
        fromZigbee: [fz.battery, fz.tuya_on_off_action],
        toZigbee: [tz.tuya_operation_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_qq9mpfhw'}],
        model: 'TS0601_water_sensor',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [fz.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
        whiteLabel: [{vendor: 'Neo', model: 'NAS-WS02B0'}],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_jthf7vb6'}],
        model: 'WLS-100z',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_raw, fz.wls100z_water_leak],
        toZigbee: [],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery(), e.water_leak()],
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
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_tqlv4ug4'}],
        model: 'TS0001_switch_module',
        vendor: 'TuYa',
        description: '1 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ21'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: extend.switch().exposes.concat([
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ]),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0002', manufacturerName: '_TZ3000_01gpyda5'}, {modelID: 'TS0002', manufacturerName: '_TZ3000_bvrlqyj7'}],
        model: 'TS0002_switch_module',
        vendor: 'TuYa',
        description: '2 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ22'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
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
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TZ3000_vsasbzkf'},
            {modelID: 'TS0003', manufacturerName: '_TZ3000_odzoiovu'}],
        model: 'TS0003_switch_module',
        vendor: 'TuYa',
        description: '3 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ23'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0004', manufacturerName: '_TZ3000_ltt60asa'}],
        model: 'TS0004_switch_module',
        vendor: 'TuYa',
        description: '4 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ27'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
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
            {modelID: 'TS0601', manufacturerName: '_TZE200_r0jdjrvi'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pk0sfzvr'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fdtjuw7u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zpzndjez'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wmcdj3aq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cowvfni3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rddyvrci'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nueqqe6k'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xaabybja'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rmymn92d'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_3i3exuay'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_tvrvdj6o'},
            {modelID: 'zo2pocs\u0000', manufacturerName: '_TYST11_fzo2pocs'},
            // Roller blinds:
            {modelID: 'TS0601', manufacturerName: '_TZE200_sbordckq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fctwhugx'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zah67ekd'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_hsgrhjpf'},
            // Window pushers:
            {modelID: 'TS0601', manufacturerName: '_TZE200_g5wdnuow'},
            // Tubular motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_fzo2pocs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_5sbebbzs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zuz7f94z'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zyrdrmno'},
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
            {vendor: 'TuYa', model: 'M515EGZT'},
            {vendor: 'TuYa', model: 'DT82LEMA-1.2N'},
            {vendor: 'TuYa', model: 'ZD82TN', description: 'Curtain motor'},
            {vendor: 'Moes', model: 'AM43-0.45/40-ES-EB'},
            {vendor: 'Larkkey', model: 'ZSTY-SM-1SRZG-EU'},
            {vendor: 'Zemismart', model: 'ZM25TQ', description: 'Tubular motor'},
            {vendor: 'Zemismart', model: 'AM43', description: 'Roller blind motor'},
            {vendor: 'Zemismart', model: 'M2805EGBZTN', description: 'Tubular motor'},
            {vendor: 'Zemismart', model: 'BCM500DS-TYZ', description: 'Curtain motor'},
            {vendor: 'A-OK', model: 'AM25', description: 'Tubular motor'},
            {vendor: 'Alutech', model: 'AM/R-Sm', description: 'Tubular motor'},
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
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_ckud7u2l'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ywdxldoj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cwnjrr72'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pvvbommb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2atgpdho'}, // HY367
        ],
        model: 'TS0601_thermostat',
        vendor: 'TuYa',
        description: 'Radiator valve with thermostat',
        whiteLabel: [
            {vendor: 'Moes', model: 'HY368'},
            {vendor: 'Moes', model: 'HY369RT'},
            {vendor: 'SHOJZJ', model: '378RT'},
            {vendor: 'Silvercrest', model: 'TVR01'},
        ],
        meta: {tuyaThermostatPreset: tuya.thermostatPresets, tuyaThermostatSystemMode: tuya.thermostatSystemModes3},
        ota: ota.zigbeeOTA,
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.tuya_thermostat_child_lock, tz.tuya_thermostat_window_detection, tz.tuya_thermostat_valve_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_auto_lock,
            tz.tuya_thermostat_calibration, tz.tuya_thermostat_min_temp, tz.tuya_thermostat_max_temp,
            tz.tuya_thermostat_boost_time, tz.tuya_thermostat_comfort_temp, tz.tuya_thermostat_eco_temp,
            tz.tuya_thermostat_force_to_mode, tz.tuya_thermostat_force, tz.tuya_thermostat_preset, tz.tuya_thermostat_away_mode,
            tz.tuya_thermostat_window_detect, tz.tuya_thermostat_schedule, tz.tuya_thermostat_week, tz.tuya_thermostat_away_preset,
            tz.tuya_thermostat_schedule_programming_mode],
        exposes: [
            e.child_lock(), e.window_detection(), e.battery_low(), e.valve_detection(), e.position(),
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSystemMode(['heat', 'auto', 'off'], ea.STATE_SET,
                    'Mode of this device, in the `heat` mode the TS0601 will remain continuously heating, i.e. it does not regulate ' +
                    'to the desired temperature. If you want TRV to properly regulate the temperature you need to use mode `auto` ' +
                    'instead setting the desired temperature.')
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withAwayMode().withPreset(['schedule', 'manual', 'boost', 'complex', 'comfort', 'eco']),
            e.auto_lock(), e.away_mode(), e.away_preset_days(), e.boost_time(), e.comfort_temperature(), e.eco_temperature(), e.force(),
            e.max_temperature(), e.min_temperature(), e.away_preset_temperature(),
            exposes.composite('programming_mode').withDescription('Schedule MODE ⏱ - In this mode, ' +
                    'the device executes a preset week programming temperature time and temperature.')
                .withFeature(e.week())
                .withFeature(exposes.text('workdays_schedule', ea.STATE_SET))
                .withFeature(exposes.text('holidays_schedule', ea.STATE_SET))],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_hue3yfsn'}, /* model: 'TV02-Zigbee', vendor: 'TuYa' */
            {modelID: 'TS0601', manufacturerName: '_TZE200_e9ba97vf'}, /* model: 'TV01-ZB', vendor: 'Moes' */
            {modelID: 'TS0601', manufacturerName: '_TZE200_husqqvux'}, /* model: 'TSL-TRV-TV01ZG', vendor: 'Tesla Smart' */
            {modelID: 'TS0601', manufacturerName: '_TZE200_lllliz3p'}, /* model: 'TV02-Zigbee', vendor: 'TuYa' */
        ],
        model: 'TV02-Zigbee',
        vendor: 'TuYa',
        description: 'Thermostat radiator valve',
        whiteLabel: [
            {vendor: 'Moes', model: 'TV01-ZB'},
            {vendor: 'Tesla Smart', model: 'TSL-TRV-TV01ZG'},
            {vendor: 'Unknown/id3.pl', model: 'GTZ08'},
        ],
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, fz.tvtwo_thermostat],
        toZigbee: [tz.tvtwo_thermostat],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [
            e.battery_low(), e.child_lock(), e.open_window(), e.open_window_temperature().withValueMin(0).withValueMax(30),
            e.comfort_temperature().withValueMin(0).withValueMax(30), e.eco_temperature().withValueMin(0).withValueMax(30),
            exposes.climate().withPreset(['auto', 'manual', 'holiday']).withLocalTemperatureCalibration(-5, 5, 0.1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 0, 30, 0.5, ea.STATE_SET),
            exposes.numeric('boost_timeset_countdown', ea.STATE_SET).withUnit('second').withDescription('Setting '+
                    'minimum 0 - maximum 465 seconds boost time. The boost (♨) function is activated. The remaining '+
                    'time for the function will be counted down in seconds ( 465 to 0 ).').withValueMin(0).withValueMax(465),
            exposes.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('When Anti-Freezing function'+
                    ' is activated, the temperature in the house is kept at 8 °C, the device display "AF".press the '+
                    'pair button to cancel.'),
            exposes.binary('heating_stop', ea.STATE_SET, 'ON', 'OFF').withDescription('Battery life can be prolonged'+
                    ' by switching the heating off. To achieve this, the valve is closed fully. To activate the '+
                    'heating stop, the device display "HS", press the pair button to cancel.'),
            e.holiday_temperature(), exposes.composite('holiday_mode_date').withDescription('The holiday mode( ⛱ ) will '+
                    'automatically start at the set time starting point and run the holiday temperature.')
                .withFeature(exposes.text('holiday_start_stop', ea.STATE_SET)),
            // exposes.enum('working_day', ea.STATE_SET, ['0', '1', '2', '3']),
            exposes.composite('schedule')/* .withFeature(exposes.text('week_schedule_programming', ea.STATE_SET)) */
                .withDescription('week_schedule').withDescription('Auto Mode ⏱ - In this mode, '+
                    'the device executes a preset week programming temperature time and temperature. '),
            exposes.text('schedule_monday', ea.STATE),
            exposes.text('schedule_tuesday', ea.STATE),
            exposes.text('schedule_wednesday', ea.STATE),
            exposes.text('schedule_thursday', ea.STATE),
            exposes.text('schedule_friday', ea.STATE),
            exposes.text('schedule_saturday', ea.STATE),
            exposes.text('schedule_sunday', ea.STATE),
            exposes.binary('online', ea.STATE_SET, 'ON', 'OFF').withDescription('Is the device online'),
            exposes.numeric('error_status', ea.STATE).withDescription('Error status'),
        ],
    },
    {
        fingerprint: [
            {modelID: 'v90ladg\u0000', manufacturerName: '_TYST11_wv90ladg'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wv90ladg'},
        ],
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
        fingerprint: [{modelID: 'dpplnsn\u0000', manufacturerName: '_TYST11_2dpplnsn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2dpplnsn'}],
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
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_a4bpgplm'}],
        model: 'TS0601_thermostat_1',
        vendor: 'TuYa',
        description: 'Thermostatic radiator valve',
        whiteLabel: [
            {vendor: 'Unknown/id3.pl', model: 'GTZ06'},
        ],
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, fz.haozee_thermostat],
        toZigbee: [
            tz.haozee_thermostat_system_mode, tz.haozee_thermostat_current_heating_setpoint, tz.haozee_thermostat_boost_heating,
            tz.haozee_thermostat_boost_heating_countdown, tz.haozee_thermostat_window_detection,
            tz.haozee_thermostat_child_lock, tz.haozee_thermostat_temperature_calibration, tz.haozee_thermostat_max_temperature,
            tz.haozee_thermostat_min_temperature,
        ],
        exposes: [
            e.battery(), e.child_lock(), e.max_temperature(), e.min_temperature(),
            e.position(), e.window_detection(),
            exposes.binary('window', ea.STATE, 'CLOSED', 'OPEN').withDescription('Window status closed or open '),
            exposes.binary('heating', ea.STATE, 'ON', 'OFF').withDescription('Device valve is open or closed (heating or not)'),
            exposes.climate()
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET).withPreset(['auto', 'manual', 'off', 'on'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. ' +
                    'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                    'AUTO MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                    'ON - In this mode, the thermostat stays open ' +
                    'OFF - In this mode, the thermostat stays closed'),
            exposes.composite('programming_mode').withDescription('Auto MODE ⏱ - In this mode, ' +
                    'the device executes a preset week programming temperature time and temperature. ')
                .withFeature(exposes.text('monday_schedule', ea.STATE))
                .withFeature(exposes.text('tuesday_schedule', ea.STATE))
                .withFeature(exposes.text('wednesday_schedule', ea.STATE))
                .withFeature(exposes.text('thursday_schedule', ea.STATE))
                .withFeature(exposes.text('friday_schedule', ea.STATE))
                .withFeature(exposes.text('saturday_schedule', ea.STATE))
                .withFeature(exposes.text('sunday_schedule', ea.STATE)),
            exposes.binary('boost_heating', ea.STATE_SET, 'ON', 'OFF').withDescription('Boost Heating: press and hold "+" for 3 seconds, ' +
                'the device will enter the boost heating mode, and the ▷╵◁ will flash. The countdown will be displayed in the APP'),
            exposes.numeric('boost_heating_countdown', ea.STATE_SET).withUnit('min').withDescription('Countdown in minutes')
                .withValueMin(0).withValueMax(1000),
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
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 1, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
            try {
                await reporting.currentSummDelivered(endpoint);
            } catch (error) {/* fails for some https://github.com/Koenkk/zigbee2mqtt/issues/11179 */}
        },
        options: [exposes.options.measurement_poll_interval()],
        // This device doesn't support reporting correctly.
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.STATE_SET, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        onEvent: tuya.onEventMeasurementPoll,
    },
    {
        fingerprint: [{modelID: 'TS0111', manufacturerName: '_TYZB01_ymcdbl3u'}],
        model: 'TS0111_valve',
        vendor: 'TuYa',
        description: 'Smart water/gas valve',
        extend: extend.switch(),
    },
    {
        fingerprint: TS011Fplugs.map((manufacturerName) => {
            return {modelID: 'TS011F', manufacturerName};
        }),
        model: 'TS011F_plug_1',
        description: 'Smart plug (with power monitoring)',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'LELLKI', model: 'TS011F_plug'}, {vendor: 'NEO', model: 'NAS-WR01B'},
            {vendor: 'BlitzWolf', model: 'BW-SHP15'}],
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
        fingerprint: [
            {modelID: 'TS011F', manufacturerName: '_TZ3000_hyfvrar3'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_v1pdxuqq'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_bfn1w0mm'}],
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
        fingerprint: [].concat(...TS011Fplugs.map((manufacturerName) => {
            return [69, 68, 65, 64].map((applicationVersion) => {
                return {modelID: 'TS011F', manufacturerName, applicationVersion};
            });
        })),
        model: 'TS011F_plug_3',
        description: 'Smart plug (with power monitoring by polling)',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'VIKEFON', model: 'TS011F'}, {vendor: 'BlitzWolf', model: 'BW-SHP15'}],
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // Enables reporting of physical state changes
            // https://github.com/Koenkk/zigbee2mqtt/issues/9057#issuecomment-1007742130
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.STATE_SET, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        onEvent: tuya.onEventMeasurementPoll,
    },
    {
        zigbeeModel: ['5p1vj8r'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_t5p1vj8r'}, {modelID: 'TS0601', manufacturerName: '_TZE200_uebojraa'}],
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
            {modelID: 'TS0601', manufacturerName: '_TZE200_fsb6zw01'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ewxhg6o9'}],
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
        fingerprint: [{modelID: 'TS1101', manufacturerName: '_TZ3000_xfs39dbf'}],
        model: 'TS1101_dimmer_module_1ch',
        vendor: 'TuYa',
        description: 'Zigbee dimmer module 1 channel',
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.tuya_min_brightness]),
        toZigbee: extend.light_onoff_brightness().toZigbee.concat([tz.tuya_min_brightness]),
        exposes: [e.light_brightness().withMinBrightness()],
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS1101', manufacturerName: '_TZ3000_7ysdnebc'}],
        model: 'TS1101_dimmer_module_2ch',
        vendor: 'TuYa',
        description: 'Zigbee dimmer module 2 channel',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ25'}],
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.tuya_min_brightness]),
        toZigbee: extend.light_onoff_brightness().toZigbee.concat([tz.tuya_min_brightness]),
        exposes: [e.light_brightness().withMinBrightness().withEndpoint('l1'),
            e.light_brightness().withMinBrightness().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
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
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5'), e.power_on_behavior()],
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
            await device.getEndpoint(1).read('genOnOff', ['onOff', 'moesStartUpOnOff']);
            await device.getEndpoint(2).read('genOnOff', ['onOff']);
            await device.getEndpoint(3).read('genOnOff', ['onOff']);
            await device.getEndpoint(4).read('genOnOff', ['onOff']);
            await device.getEndpoint(7).read('genOnOff', ['onOff']);
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
        fingerprint: [{modelID: 'TS0011', manufacturerName: '_TZ3000_l8fsgo6p'}],
        zigbeeModel: ['TS0011'],
        model: 'TS0011',
        vendor: 'TuYa',
        description: 'Smart light switch - 1 gang',
        extend: extend.switch(),
        whiteLabel: [
            {vendor: 'Vrey', model: 'VR-X712U-0013'},
            {vendor: 'TUYATEC', model: 'GDKES-01TZXD'},
            {vendor: 'Lonsonho', model: 'QS-Zigbee-S05-L', description: '1 gang smart switch module without neutral wire'},
            {vendor: 'Mercator Ikuü', model: 'SSW01'},
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0011', manufacturerName: '_TZ3000_qmi1cfuq'},
            {modelID: 'TS0011', manufacturerName: '_TZ3000_txpirhfq'}, {modelID: 'TS0011', manufacturerName: '_TZ3000_ji4araar'}],
        model: 'TS0011_switch_module',
        vendor: 'TuYa',
        description: '1 gang switch module - (without neutral)',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch(),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
        whiteLabel: [{vendor: 'AVATTO', model: '1gang N-ZLWSM01'}, {vendor: 'SMATRUL', model: 'TMZ02L-16A-W'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
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
        fingerprint: [{modelID: 'TS0012', manufacturerName: '_TZ3000_jl7qyupf'}, {modelID: 'TS0012', manufacturerName: '_TZ3000_nPGIPl5D'}],
        model: 'TS0012_switch_module',
        vendor: 'TuYa',
        description: '2 gang switch module - (without neutral)',
        whiteLabel: [{vendor: 'AVATTO', model: '2gang N-ZLWSM01'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
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
        fingerprint: [{modelID: 'TS0013', manufacturerName: '_TZ3000_ypgri8yz'}],
        model: 'TS0013_switch_module',
        vendor: 'TuYa',
        description: '3 gang switch module - (without neutral)',
        whiteLabel: [{vendor: 'AVATTO', model: '3gang N-ZLWSM01'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('center'),
            e.switch().withEndpoint('right'),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
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
            {modelID: 'TS0014', manufacturerName: '_TZ3000_r0pmi2p3'}, {modelID: 'TS0014', manufacturerName: '_TZ3000_fxjdcikv'},
            {modelID: 'TS0014', manufacturerName: '_TZ3000_q6vxaod1'}],
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
            {vendor: 'MakeGood', model: 'MG-ZG04W/B/G'}, {vendor: 'Mercator Ikuü', model: 'SSW04'}],
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
            .withLocalTemperatureCalibration(-30, 30, 0.1, ea.ALL).withPiHeatingDemand()],
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
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
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
        fromZigbee: [fz.hy_thermostat, fz.ignore_basic_report],
        toZigbee: [tz.hy_thermostat],
        onEvent: tuya.onEventSetTime,
        exposes: [exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)],
    },
    {
        fingerprint: [{modelID: 'TS0222', manufacturerName: '_TYZB01_4mdqxxnn'},
            {modelID: 'TS0222', manufacturerName: '_TYZB01_m6ec2pgj'}],
        model: 'TS0222',
        vendor: 'TuYa',
        description: 'Light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance],
        toZigbee: [],
        exposes: [e.battery(), e.illuminance(), e.illuminance_lux()],
    },
    {
        fingerprint: [{modelID: 'TS0210', manufacturerName: '_TYZB01_3zv6oleo'},
            {modelID: 'TS0210', manufacturerName: '_TYZB01_j9xxahcl'}],
        model: 'TS0210',
        vendor: 'TuYa',
        description: 'Vibration sensor',
        fromZigbee: [fz.battery, fz.ias_vibration_alarm_1_with_timeout],
        toZigbee: [tz.TS0210_sensitivity],
        exposes: [e.battery(), e.vibration(), exposes.enum('sensitivity', exposes.access.STATE_SET, ['low', 'medium', 'high'])],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_8bxrzyxz'}],
        model: 'TS011F_din_smart_relay',
        description: 'Din smart relay (with power monitoring)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        whiteLabel: [{vendor: 'MatSee Plus', model: 'ATMS1602Z'}],
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
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_nklqjk62'}],
        model: 'PJ-ZGD01',
        vendor: 'TuYa',
        description: 'Garage door opener',
        fromZigbee: [fz.matsee_garage_door_opener, fz.ignore_basic_report],
        toZigbee: [tz.matsee_garage_door_opener, tz.tuya_data_point_test],
        whiteLabel: [{vendor: 'MatSee Plus', model: 'PJ-ZGD01'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [exposes.binary('trigger', ea.STATE_SET, true, false).withDescription('Trigger the door movement'),
            e.action(['trigger']), exposes.binary('garage_door_contact', ea.STATE, true, false)],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_qaaysllp'}],
        model: 'LCZ030',
        vendor: 'TuYa',
        description: 'Temperature & humidity & illuminance sensor with display',
        fromZigbee: [fz.battery, fz.illuminance, fz.temperature, fz.humidity, fz.ts0201_temperature_humidity_alarm],
        toZigbee: [tz.ts0201_temperature_humidity_alarm],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // Enables reporting of measurement state changes
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg',
                'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msRelativeHumidity', 'manuSpecificTuya_2']);
        },
        exposes: [e.temperature(), e.humidity(), e.battery(), e.illuminance(), e.illuminance_lux(),
            exposes.numeric('alarm_temperature_max', ea.STATE_SET).withUnit('°C').withDescription('Alarm temperature max')
                .withValueMin(-20).withValueMax(80),
            exposes.numeric('alarm_temperature_min', ea.STATE_SET).withUnit('°C').withDescription('Alarm temperature min')
                .withValueMin(-20).withValueMax(80),
            exposes.numeric('alarm_humidity_max', ea.STATE_SET).withUnit('%').withDescription('Alarm humidity max')
                .withValueMin(0).withValueMax(100),
            exposes.numeric('alarm_humidity_min', ea.STATE_SET).withUnit('%').withDescription('Alarm humidity min')
                .withValueMin(0).withValueMax(100),
            exposes.enum('alarm_humidity', ea.STATE, ['below_min_humdity', 'over_humidity', 'off'])
                .withDescription('Alarm humidity status'),
            exposes.enum('alarm_temperature', ea.STATE, ['below_min_temperature', 'over_temperature', 'off'])
                .withDescription('Alarm temperature status'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_auin8mzr'}],
        model: 'TS0601_motion_sensor',
        vendor: 'TuYa',
        description: 'Human presence sensor AIR',
        fromZigbee: [fz.tuya_motion_sensor],
        toZigbee: [tz.tuya_motion_sensor],
        exposes: [
            e.occupancy(),
            exposes.enum('o_sensitivity', ea.STATE_SET, Object.values(tuya.msLookups.OSensitivity)).withDescription('O-Sensitivity mode'),
            exposes.enum('v_sensitivity', ea.STATE_SET, Object.values(tuya.msLookups.VSensitivity)).withDescription('V-Sensitivity mode'),
            exposes.enum('led_status', ea.STATE_SET, ['ON', 'OFF']).withDescription('Led status switch'),
            exposes.numeric('vacancy_delay', ea.STATE_SET).withUnit('sec').withDescription('Vacancy delay').withValueMin(0)
                .withValueMax(1000),
            exposes.numeric('light_on_luminance_prefer', ea.STATE_SET).withDescription('Light-On luminance prefer')
                .withValueMin(0).withValueMax(10000),
            exposes.numeric('light_off_luminance_prefer', ea.STATE_SET).withDescription('Light-Off luminance prefer')
                .withValueMin(0).withValueMax(10000),
            exposes.enum('mode', ea.STATE_SET, Object.values(tuya.msLookups.Mode)).withDescription('Working mode'),
            exposes.numeric('luminance_level', ea.STATE).withDescription('Luminance level'),
            exposes.numeric('reference_luminance', ea.STATE).withDescription('Reference luminance'),
            exposes.numeric('vacant_confirm_time', ea.STATE).withDescription('Vacant confirm time'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vrfecyku'}],
        model: 'MIR-HE200-TY',
        vendor: 'TuYa',
        description: 'Human presence sensor',
        fromZigbee: [fz.tuya_radar_sensor],
        toZigbee: [tz.tuya_radar_sensor],
        exposes: [
            e.illuminance_lux(), e.presence(), e.occupancy(),
            exposes.numeric('motion_speed', ea.STATE).withDescription('Speed of movement'),
            exposes.enum('motion_direction', ea.STATE, Object.values(tuya.tuyaRadar.motionDirection))
                .withDescription('direction of movement from the point of view of the radar'),
            exposes.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1)
                .withDescription('sensitivity of the radar'),
            exposes.enum('radar_scene', ea.STATE_SET, Object.values(tuya.tuyaRadar.radarScene))
                .withDescription('presets for sensitivity for presence and movement'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_lu01t0zl'}],
        model: 'MIR-HE200-TY_fall',
        vendor: 'TuYa',
        description: 'Human presence sensor with fall function',
        fromZigbee: [fz.tuya_radar_sensor_fall],
        toZigbee: [tz.tuya_radar_sensor_fall],
        exposes: [
            e.illuminance_lux(), e.presence(), e.occupancy(),
            exposes.numeric('motion_speed', ea.STATE).withDescription('Speed of movement'),
            exposes.enum('motion_direction', ea.STATE, Object.values(tuya.tuyaRadar.motionDirection))
                .withDescription('direction of movement from the point of view of the radar'),
            exposes.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1)
                .withDescription('sensitivity of the radar'),
            exposes.enum('radar_scene', ea.STATE_SET, Object.values(tuya.tuyaRadar.radarScene))
                .withDescription('presets for sensitivity for presence and movement'),
            exposes.enum('tumble_switch', ea.STATE_SET, ['ON', 'OFF']).withDescription('Tumble status switch'),
            exposes.numeric('fall_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1)
                .withDescription('fall sensitivity of the radar'),
            exposes.numeric('tumble_alarm_time', ea.STATE_SET).withValueMin(1).withValueMax(5).withValueStep(1)
                .withUnit('min').withDescription('tumble alarm time'),
            exposes.enum('fall_down_status', ea.STATE, Object.values(tuya.tuyaRadar.fallDown))
                .withDescription('fall down status'),
            exposes.text('static_dwell_alarm', ea.STATE).withDescription('static dwell alarm'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.sendDataPointEnum(endpoint, tuya.dataPoints.trsfTumbleSwitch, false);
        },
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_pcqjmcud'}],
        model: 'YSR-MINI-Z',
        vendor: 'TuYa',
        description: '2 in 1 dimming remote control and scene control',
        exposes: [
            e.battery(),
            e.action(['on', 'off',
                'brightness_move_up', 'brightness_step_up', 'brightness_step_down', 'brightness_move_down', 'brightness_stop',
                'color_temperature_step_down', 'color_temperature_step_up',
                '1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
                '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold',
            ]),
            exposes.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop,
            fz.command_step_color_temperature, fz.tuya_on_off_action, fz.tuya_operation_mode],
        toZigbee: [tz.tuya_operation_mode],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_hkdl5fmv'}],
        model: 'TS0601_rcbo',
        vendor: 'TuYa',
        whiteLabel: [
            {vendor: 'HOCH', model: 'ZJSBL7-100Z'},
            {vendor: 'WDYK', model: 'ZJSBL7-100Z'},
        ],
        description: 'DIN mount RCBO with smart energy metering',
        fromZigbee: [fz.hoch_din],
        toZigbee: [tz.hoch_din],
        exposes: [
            exposes.text('meter_number', ea.STATE),
            exposes.binary('state', ea.STATE_SET, 'ON', 'OFF'),
            exposes.text('alarm', ea.STATE),
            exposes.binary('trip', ea.STATE_SET, 'trip', 'clear'),
            exposes.binary('child_lock', ea.STATE_SET, 'ON', 'OFF'),
            exposes.enum('power_on_behaviour', ea.STATE_SET, ['off', 'on', 'previous']),
            exposes.numeric('countdown_timer', ea.STATE_SET).withValueMin(0).withValueMax(86400).withUnit('s'),
            exposes.numeric('voltage', ea.STATE).withUnit('V'),
            exposes.numeric('voltage_rms', ea.STATE).withUnit('V'),
            exposes.numeric('current', ea.STATE).withUnit('A'),
            exposes.numeric('current_average', ea.STATE).withUnit('A'),
            exposes.numeric('power', ea.STATE).withUnit('W'),
            exposes.numeric('energy_consumed', ea.STATE).withUnit('kWh'),
            exposes.numeric('temperature', ea.STATE).withUnit('°C'),
            /* TODO: Add toZigbee converters for the below composites
            exposes.composite('voltage_setting', 'voltage_setting')
                .withFeature(exposes.numeric('under_voltage_threshold', ea.STATE_SET)
                    .withValueMin(50)
                    .withValueMax(385)
                    .withUnit('V'))
                .withFeature(exposes.binary('under_voltage_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('under_voltage_alarm', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.numeric('over_voltage_threshold', ea.STATE_SET)
                    .withValueMin(50)
                    .withValueMax(385)
                    .withUnit('V'))
                .withFeature(exposes.binary('over_voltage_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('over_voltage_alarm', ea.STATE_SET, 'ON', 'OFF')),
            exposes.composite('current_setting', 'current_setting')
                .withFeature(exposes.numeric('over_current_threshold', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(999)
                    .withUnit('A'))
                .withFeature(exposes.binary('over_current_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('over_current_alarm', ea.STATE_SET, 'ON', 'OFF')),
            exposes.composite('temperature_setting', 'temperature_setting')
                .withFeature(exposes.numeric('over_temperature_threshold', ea.STATE_SET)
                    .withValueMin(-40)
                    .withValueMax(127)
                    .withUnit('°C'))
                .withFeature(exposes.binary('over_temperature_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('over_temperature_alarm', ea.STATE_SET, 'ON', 'OFF')),
            exposes.composite('leakage_current_setting', 'leakage_current_setting')
                .withFeature(exposes.numeric('self_test_auto_days', ea.STATE_SET)
                    .withValueMin(1)
                    .withValueMax(28)
                    .withUnit('days'))
                .withFeature(exposes.numeric('self_test_auto_hours', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(23)
                    .withUnit('hours'))
                .withFeature(exposes.binary('self_test_auto', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.numeric('over_leakage_current_threshold', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(3000)
                    .withUnit('mA'))
                .withFeature(exposes.binary('over_leakage_current_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('over_leakage_current_alarm', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('self_test', ea.STATE_SET, 'test', 'clear')),*/
            exposes.enum('clear_device_data', ea.SET, ['clear']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_4fjiwweb'}, {modelID: 'TS004F', manufacturerName: '_TZ3000_uri7ongn'}],
        model: 'ERS-10TZBVK-AA',
        vendor: 'TuYa',
        description: 'Smart knob',
        fromZigbee: [
            fz.command_step, fz.command_toggle, fz.command_move_hue, fz.command_step_color_temperature, fz.command_stop_move_raw,
            fz.tuya_multi_action, fz.tuya_operation_mode, fz.battery,
        ],
        toZigbee: [tz.tuya_operation_mode],
        exposes: [
            e.action([
                'toggle', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up', 'color_temperature_step_down',
                'saturation_move', 'hue_move', 'hue_stop', 'single', 'double', 'hold', 'rotate_left', 'rotate_right',
            ]),
            exposes.numeric('action_step_size', ea.STATE).withValueMin(0).withValueMax(255),
            exposes.numeric('action_transition_time', ea.STATE).withUnit('s'),
            exposes.numeric('action_rate', ea.STATE).withValueMin(0).withValueMax(255),
            e.battery(),
            exposes.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kzm5w4iz'}],
        model: 'TS0601_vibration_sensor',
        vendor: 'TuYa',
        description: 'Smart vibration sensor',
        fromZigbee: [fz.tuya_smart_vibration_sensor],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.vibration()],
    },
    {
        fingerprint: [{modelID: `TS0601`, manufacturerName: `_TZE200_yi4jtqq1`}],
        model: `XFY-CGQ-ZIGB`,
        vendor: `TuYa`,
        description: `Illuminance sensor`,
        fromZigbee: [fz.tuya_illuminance_sensor],
        toZigbee: [],
        exposes: [e.illuminance_lux(), e.brightness_state()],
    },
];
