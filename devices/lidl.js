const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [
            {manufacturerName: '_TZ3000_kdi2o9m6'}, // EU
            {modelID: 'TS011F', manufacturerName: '_TZ3000_plyvnuf5'}, // CH
            {modelID: 'TS011F', manufacturerName: '_TZ3000_wamqdr3f'}, // FR
            {modelID: 'TS011F', manufacturerName: '_TZ3000_00mk2xzy'}, // BS
            {modelID: 'TS011F', manufacturerName: '_TZ3000_upjrsxh1'}, // DK
            {manufacturerName: '_TZ3000_00mk2xzy'}, // BS
        ],
        model: 'HG06337',
        vendor: 'Lidl',
        description: 'Silvercrest smart plug (EU, CH, FR, BS, DK)',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0211', manufacturerName: '_TZ1800_ladpngdx'}],
        model: 'HG06668',
        vendor: 'Lidl',
        description: 'Silvercrest smart wireless door bell',
        fromZigbee: [fz.battery, fz.tuya_doorbell_button, fz.ignore_basic_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.action(['pressed']), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: [{modelID: 'TY0202', manufacturerName: '_TZ1800_fcdjzz3s'}],
        model: 'HG06335',
        vendor: 'Lidl',
        description: 'Silvercrest smart motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TY0203', manufacturerName: '_TZ1800_ejwkn2h2'}],
        model: 'HG06336',
        vendor: 'Lidl',
        description: 'Silvercrest smart window and door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
    },
    {
        fingerprint: [{modelID: 'TS1001', manufacturerName: '_TYZB01_bngwdjsr'}],
        model: 'FB20-002',
        vendor: 'Lidl',
        description: 'Livarno Lux switch and dimming light remote control',
        exposes: [e.action(['on', 'off', 'brightness_stop', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down'])],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
    },
    {
        fingerprint: [
            {modelID: 'TS011F', manufacturerName: '_TZ3000_wzauvbcs'}, // EU
            {modelID: 'TS011F', manufacturerName: '_TZ3000_1obwwnmq'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_4uf3d0ax'}, // FR
            {modelID: 'TS011F', manufacturerName: '_TZ3000_vzopcetz'}, // CZ
            {modelID: 'TS011F', manufacturerName: '_TZ3000_vmpbygs5'}, // BS
        ],
        model: 'HG06338',
        vendor: 'Lidl',
        description: 'Silvercrest 3 gang switch, with 4 USB (EU, FR, CZ, BS)',
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        extend: extend.switch(),
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            for (const ID of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ID), coordinatorEndpoint, ['genOnOff']);
            }
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_riwp3k79'}, {manufacturerName: '_TZ3000_riwp3k79'}],
        model: 'HG06104A',
        vendor: 'Lidl',
        description: 'Livarno Lux smart LED light strip 2.5m',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_s8gkrkxk'}],
        model: 'HG06467',
        vendor: 'Lidl',
        description: 'Melinera smart LED string lights',
        toZigbee: [tz.on_off, tz.silvercrest_smart_led_string],
        fromZigbee: [fz.on_off, fz.silvercrest_smart_led_string],
        exposes: [e.light_brightness_colorhs().setAccess('brightness', ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_odygigth'}],
        model: 'HG06106B',
        vendor: 'Lidl',
        description: 'Livarno Lux E14 candle RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_kdpxju99'}],
        model: 'HG06106A',
        vendor: 'Lidl',
        description: 'Livarno Lux GU10 spot RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_dbou1ap4'}],
        model: 'HG06106C',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 bulb RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_el5kt5im'}],
        model: 'HG06492A',
        vendor: 'Lidl',
        description: 'Livarno Lux GU10 spot CCT',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_oborybow'}],
        model: 'HG06492B',
        vendor: 'Lidl',
        description: 'Livarno Lux E14 candle CCT',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_49qchf10'}],
        model: 'HG06492C',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 bulb CCT',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_rylaozuc'}],
        model: '14147206L',
        vendor: 'Lidl',
        description: 'Livarno Lux ceiling light',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_9cpuaca6'}],
        model: '14148906L',
        vendor: 'Lidl',
        description: 'Livarno Lux mood light RGB+CCT',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_gek6snaj'}],
        model: '14149505L/14149506L',
        vendor: 'Lidl',
        description: 'Livarno Lux light bar RGB+CCT (black/white)',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_htnnfasr'}],
        model: 'PSBZS A1',
        vendor: 'Lidl',
        description: 'Parkside smart watering timer',
        fromZigbee: [fz.ignore_basic_report],
        toZigbee: [tz.on_off, tz.lidl_watering_timer],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint, logger) => {},
        exposes: [e.switch(), exposes.numeric('timer', ea.SET).withValueMin(1)
            .withUnit('min').withDescription('Auto off after specific time.')],
    },
];
