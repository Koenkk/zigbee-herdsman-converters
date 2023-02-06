const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const e = exposes.presets;
const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_zrvxvydd'}],
        model: 'FUT066Z',
        vendor: 'MiBoxer',
        description: 'RGB+CCT LED Downlight',
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_jicmoite'}],
        model: 'FUT039Z',
        vendor: 'Miboxer',
        description: 'RGB+CCT LED controller',
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        fingerprint: [{modelID: 'TS0501B', manufacturerName: '_TZ3210_dxroobu3'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_dbilpfqk'}],
        model: 'FUT036Z',
        description: 'Single color LED controller',
        vendor: 'Miboxer',
        extend: tuya.extend.light_onoff_brightness(),
        onEvent: tuya.onEventSetTime,
    },
    {
        fingerprint: [
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_frm6149r'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_jtifm80b'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_xwqng7ol'},
        ],
        model: 'FUT035Z',
        description: 'Dual white LED controller',
        vendor: 'Miboxer',
        extend: tuya.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        fingerprint: [{modelID: 'TS0504B', manufacturerName: '_TZ3210_ttkgurpb'}],
        model: 'FUT038Z',
        description: 'RGBW LED controller',
        vendor: 'Miboxer',
        extend: tuya.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
    },
    {
        fingerprint: [{modelID: 'TS1002', manufacturerName: '_TZ3000_xwh1e22x'}],
        model: 'FUT089Z',
        vendor: 'MiBoxer',
        description: 'RGB+CCT Remote',
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await endpoint.command('genGroups', 'miboxerSetZones', {zones: [
                {zoneNum: 1, groupId: 101},
                {zoneNum: 2, groupId: 102},
                {zoneNum: 3, groupId: 103},
                {zoneNum: 4, groupId: 104},
                {zoneNum: 5, groupId: 105},
                {zoneNum: 6, groupId: 106},
                {zoneNum: 7, groupId: 107},
                {zoneNum: 8, groupId: 108},
            ]});
            await endpoint.command('genBasic', 'tuyaSetup', {}, {disableDefaultResponse: true});
        },
    },
];
