import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {Definition} from '../lib/types';
const e = exposes.presets;
import * as tuya from '../lib/tuya';
import {forcePowerSource, light, onOff} from '../lib/modernExtend';

const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_1vxgqfba']),
        model: 'ZM25R1',
        vendor: 'Zemismart',
        description: 'Tubular motor',
        fromZigbee: [legacy.fromZigbee.tuya_cover],
        toZigbee: [legacy.toZigbee.tuya_cover_control, legacy.toZigbee.tuya_cover_options, tuya.tz.datapoints],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('upper_stroke_limit', ea.STATE_SET, ['SET', 'RESET']).withDescription('Reset / Set the upper stroke limit'),
            e.enum('middle_stroke_limit', ea.STATE_SET, ['SET', 'RESET']).withDescription('Reset / Set the middle stroke limit'),
            e.enum('lower_stroke_limit', ea.STATE_SET, ['SET', 'RESET']).withDescription('Reset / Set the lower stroke limit'),
        ],
        meta: {
            // All datapoints go in here
            tuyaDatapoints: [
                [103, 'upper_stroke_limit', tuya.valueConverterBasic.lookup({'SET': tuya.enum(1), 'RESET': tuya.enum(0)})],
                [104, 'middle_stroke_limit', tuya.valueConverterBasic.lookup({'SET': tuya.enum(1), 'RESET': tuya.enum(0)})],
                [105, 'lower_stroke_limit', tuya.valueConverterBasic.lookup({'SET': tuya.enum(1), 'RESET': tuya.enum(0)})],
            ],
        },
    },
    {
        zigbeeModel: ['NUET56-DL27LX1.1'],
        model: 'LXZB-12A',
        vendor: 'Zemismart',
        description: 'RGB LED downlight',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LXT56-LS27LX1.6'],
        model: 'HGZB-DLC4-N15B',
        vendor: 'Zemismart',
        description: 'RGB LED downlight',
        extend: [light({colorTemp: {range: undefined}, color: true})],
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
            // Configure reporting of currentPositionLiftPercentage always fails.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3216
        },
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TZ3000_vjhcenzo'}, {modelID: 'TS0003', manufacturerName: '_TZ3000_f09j9qjb'}],
        model: 'TB25',
        vendor: 'Zemismart',
        description: 'Smart light switch and socket - 2 gang with neutral wire',
        extend: tuya.extend.switch({endpoints: ['left', 'center', 'right']}),
        meta: {multiEndpoint: true},
        endpoint: () => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            for (const endpointID of [1, 2, 3]) {
                const endpoint = device.getEndpoint(endpointID);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                await reporting.onOff(endpoint);
            }
        },
    },
    {
        zigbeeModel: ['LXN56-SS27LX1.1'],
        model: 'LXN56-SS27LX1.1',
        vendor: 'Zemismart',
        description: 'Smart light switch - 2 gang with neutral wire',
        extend: [onOff()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_zqtiam4u'}],
        model: 'ZM-RM02',
        vendor: 'Zemismart',
        description: 'Smart 6 key scene switch',
        fromZigbee: [legacy.fromZigbee.ZMRM02],
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
    {
        fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_zigisuyh', '_TZ3000_v4mevirn', '_TZ3000_mlswgkc3']),
        model: 'ZIGBEE-B09-UK',
        vendor: 'Zemismart',
        description: 'Zigbee smart outlet universal socket with USB port',
        extend: tuya.extend.switch({powerOutageMemory: true, endpoints: ['l1', 'l2']}),
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_7eue9vhc', '_TZE200_bv1jcqqu']),
        model: 'ZM25RX-08/30',
        vendor: 'Zemismart',
        description: 'Tubular motor',
        // mcuVersionResponse spsams: https://github.com/Koenkk/zigbee2mqtt/issues/19817
        onEvent: tuya.onEvent({respondToMcuVersionResponse: false}),
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        options: [exposes.options.invert_cover()],
        exposes: [
            e.text('work_state', ea.STATE),
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.battery(),
            e.enum('program', ea.SET, ['set_bottom', 'set_upper', 'reset']).withDescription('Set the upper/bottom limit'),
            e.enum('click_control', ea.SET, ['upper', 'upper_micro', 'lower', 'lower_micro'])
                .withDescription('Control motor in steps (ignores set limits; normal/micro = 120deg/5deg movement)'),
            e.enum('motor_direction', ea.STATE_SET, ['normal', 'reversed']).withDescription('Motor direction'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverterBasic.lookup(
                    (options) => options.invert_cover ?
                        {'OPEN': tuya.enum(2), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(0)} :
                        {'OPEN': tuya.enum(0), 'STOP': tuya.enum(1), 'CLOSE': tuya.enum(2)},
                )],
                [2, 'position', tuya.valueConverter.coverPosition],
                [3, 'position', tuya.valueConverter.coverPosition],
                [5, 'motor_direction', tuya.valueConverter.tubularMotorDirection],
                [7, 'work_state', tuya.valueConverterBasic.lookup(
                    (options) => options.invert_cover ?
                        {'opening': tuya.enum(1), 'closing': tuya.enum(0)} :
                        {'opening': tuya.enum(0), 'closing': tuya.enum(1)},
                )],
                [13, 'battery', tuya.valueConverter.raw],
                [101, 'program', tuya.valueConverterBasic.lookup((options) => options.invert_cover ?
                    {'set_bottom': tuya.enum(0), 'set_upper': tuya.enum(1), 'reset': tuya.enum(4)} :
                    {'set_bottom': tuya.enum(1), 'set_upper': tuya.enum(0), 'reset': tuya.enum(4)}, null)],
                [101, 'click_control', tuya.valueConverterBasic.lookup((options) => options.invert_cover ?
                    {'lower': tuya.enum(2), 'upper': tuya.enum(3), 'lower_micro': tuya.enum(5), 'upper_micro': tuya.enum(6)} :
                    {'lower': tuya.enum(3), 'upper': tuya.enum(2), 'lower_micro': tuya.enum(6), 'upper_micro': tuya.enum(5)}, null)],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_iossyxra', '_TZE200_cxu0jkjk']),
        model: 'ZM-AM02_cover',
        vendor: 'Zemismart',
        description: 'Zigbee/RF curtain converter',
        fromZigbee: [legacy.fz.ZMAM02_cover],
        toZigbee: [legacy.tz.ZMAM02_cover],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET),
            e.composite('options', 'options', ea.STATE)
                .withFeature(e.numeric('motor_speed', ea.STATE)
                    .withValueMin(0)
                    .withValueMax(255)
                    .withDescription('Motor speed')),
            e.enum('motor_working_mode', ea.STATE_SET, Object.values(legacy.ZMLookups.AM02MotorWorkingMode)),
            e.numeric('percent_state', ea.STATE).withValueMin(0).withValueMax(100).withValueStep(1).withUnit('%'),
            e.enum('mode', ea.STATE_SET, Object.values(legacy.ZMLookups.AM02Mode)),
            e.enum('motor_direction', ea.STATE_SET, Object.values(legacy.ZMLookups.AM02Direction)),
            e.enum('border', ea.STATE_SET, Object.values(legacy.ZMLookups.AM02Border)),
        // ---------------------------------------------------------------------------------
        // DP exists, but not used at the moment
        // e.numeric('percent_control', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(1).withUnit('%'),
        // exposes.enum('work_state', ea.STATE, Object.values(tuya.ZMAM02.AM02WorkState)),
        // e.numeric('countdown_left', ea.STATE).withUnit('s'),
        // e.numeric('time_total', ea.STATE).withUnit('ms'),
        // exposes.enum('situation_set', ea.STATE, Object.values(tuya.ZMAM02.AM02Situation)),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_gubdgai2'}],
        model: 'M515EGBZTN',
        vendor: 'Zemismart',
        description: 'Roller shade driver',
        fromZigbee: [legacy.fz.ZMAM02_cover],
        toZigbee: [legacy.tz.ZMAM02_cover],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET),
            e.enum('motor_direction', ea.STATE_SET, Object.values(legacy.ZMLookups.AM02Direction)),
            e.enum('border', ea.STATE_SET, Object.values(legacy.ZMLookups.AM02Border)),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_fzo2pocs'}],
        model: 'ZM25TQ',
        vendor: 'Zemismart',
        description: 'Tubular motor',
        fromZigbee: [legacy.fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [legacy.tz.tuya_cover_control, legacy.tz.tuya_cover_options, legacy.tz.tuya_data_point_test],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
        extend: [forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_1n2kyphz'}, {modelID: 'TS0601', manufacturerName: '_TZE200_shkxsgis'}],
        model: 'TB26-4',
        vendor: 'Zemismart',
        description: '4-gang smart wall switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_9mahtqtg'}, {modelID: 'TS0601', manufacturerName: '_TZE200_r731zlxk'}],
        model: 'TB26-6',
        vendor: 'Zemismart',
        description: '6-gang smart wall switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l5').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l6').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, legacy.fz.tuya_switch],
        toZigbee: [legacy.tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1, 'l6': 1};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(5)) await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(6)) await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];

export default definitions;
module.exports = definitions;
