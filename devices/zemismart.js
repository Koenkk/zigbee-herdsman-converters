const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const tuya = require('../lib/tuya');

const fzLocal = {
    ZMRM02: {
        cluster: 'manuSpecificTuya',
        type: ['commandGetData', 'commandSetDataResponse', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'ZMRM02');
            if (dpValue.dp === 10) {
                return {battery: tuya.getDataValue(dpValue)};
            } else {
                const button = dpValue.dp;
                const actionValue = tuya.getDataValue(dpValue);
                const lookup = {0: 'single', 1: 'double', 2: 'hold'};
                const action = lookup[actionValue];
                return {action: `button_${button}_${action}`};
            }
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['NUET56-DL27LX1.1'],
        model: 'LXZB-12A',
        vendor: 'Zemismart',
        description: 'RGB LED downlight',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXT56-LS27LX1.6'],
        model: 'HGZB-DLC4-N15B',
        vendor: 'Zemismart',
        description: 'RGB LED downlight',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['TS0302'],
        model: 'ZM-CSW032-D',
        vendor: 'Zemismart',
        description: 'Curtain/roller blind switch',
        fromZigbee: [fz.ignore_basic_report, fz.ZMCSW032D_cover_position],
        toZigbee: [tz.cover_state, tz.ZMCSW032D_cover_position],
        exposes: [e.cover_position()],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            // Configure reporing of currentPositionLiftPercentage always fails.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3216
        },
    },
    {
        zigbeeModel: ['TS0003'],
        model: 'ZM-L03E-Z',
        vendor: 'Zemismart',
        description: 'Smart light switch - 3 gang with neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        whiteLabel: [{vendor: 'BSEED', model: 'TS0003', description: 'Zigbee switch'}],
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['LXN56-SS27LX1.1'],
        model: 'LXN56-SS27LX1.1',
        vendor: 'Zemismart',
        description: 'Smart light switch - 2 gang with neutral wire',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_zqtiam4u'}],
        model: 'ZM-RM02',
        vendor: 'Zemismart',
        description: 'Smart 6 key scene switch',
        fromZigbee: [fzLocal.ZMRM02],
        toZigbee: [],
        onEvent: tuya.onEventSetTime,
        exposes: [e.battery(), e.action([
            'button_1_hold', 'button_1_single', 'button_1_double',
            'button_2_hold', 'button_2_single', 'button_2_double',
            'button_3_hold', 'button_3_single', 'button_3_double',
            'button_4_hold', 'button_4_single', 'button_4_double',
            'button_5_hold', 'button_5_single', 'button_5_double',
            'button_6_hold', 'button_6_single', 'button_6_double'])],
    },
];
