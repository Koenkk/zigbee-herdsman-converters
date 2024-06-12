import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
import * as reporting from '../lib/reporting';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as utils from '../lib/utils';
import {KeyValue, Definition, Tz, Fz} from '../lib/types';
import {deviceEndpoints, actionEnumLookup, light} from '../lib/modernExtend';
import {addActionGroup, hasAlreadyProcessedMessage, postfixWithEndpointName} from '../lib/utils';
const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    TS110E_options: {
        key: ['min_brightness', 'max_brightness', 'light_type', 'switch_type'],
        convertSet: async (entity, key, value, meta) => {
            let payload = null;
            if (key === 'min_brightness' || key == 'max_brightness') {
                const id = key === 'min_brightness' ? 64515 : 64516;
                payload = {[id]: {value: utils.mapNumberRange(utils.toNumber(value, key), 1, 255, 0, 1000), type: 0x21}};
            } else if (key === 'light_type' || key === 'switch_type') {
                utils.assertString(value, 'light_type/switch_type');
                const lookup: KeyValue = key === 'light_type' ? {led: 0, incandescent: 1, halogen: 2} : {momentary: 0, toggle: 1, state: 2};
                payload = {64514: {value: lookup[value], type: 0x20}};
            }
            await entity.write('genLevelCtrl', payload, utils.getOptions(meta.mapped, entity));
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            let id = null;
            if (key === 'min_brightness') id = 64515;
            if (key === 'max_brightness') id = 64516;
            if (key === 'light_type' || key === 'switch_type') id = 64514;
            await entity.read('genLevelCtrl', [id]);
        },
    } satisfies Tz.Converter,
    TS110E_onoff_brightness: {
        key: ['state', 'brightness'],
        convertSet: async (entity, key, value, meta) => {
            const {message, state} = meta;
            if (message.state === 'OFF' || (message.hasOwnProperty('state') && !message.hasOwnProperty('brightness'))) {
                return await tz.on_off.convertSet(entity, key, value, meta);
            } else if (message.hasOwnProperty('brightness')) {
                // set brightness
                if (state.state === 'OFF') {
                    await entity.command('genOnOff', 'on', {}, utils.getOptions(meta.mapped, entity));
                }

                const brightness = utils.toNumber(message.brightness, 'brightness');
                const level = utils.mapNumberRange(brightness, 0, 254, 0, 1000);
                await entity.command('genLevelCtrl', 'moveToLevelTuya', {level, transtime: 100}, utils.getOptions(meta.mapped, entity));
                return {state: {state: 'ON', brightness}};
            }
        },
        convertGet: async (entity, key, meta) => {
            if (key === 'state') await tz.on_off.convertGet(entity, key, meta);
            if (key === 'brightness') await entity.read('genLevelCtrl', [61440]);
        },
    } satisfies Tz.Converter,
    TS110E_light_onoff_brightness: {
        ...tz.light_onoff_brightness,
        convertSet: async (entity, key, value, meta) => {
            const {message} = meta;
            if (message.state === 'ON' || (typeof message.brightness === 'number' && message.brightness > 1)) {
                // Does not turn off with physical press when turned on with just moveToLevelWithOnOff, required on before.
                // https://github.com/Koenkk/zigbee2mqtt/issues/15902#issuecomment-1382848150
                await entity.command('genOnOff', 'on', {}, utils.getOptions(meta.mapped, entity));
            }
            return tz.light_onoff_brightness.convertSet(entity, key, value, meta);
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    TS110E: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('64515')) {
                result['min_brightness'] = utils.mapNumberRange(msg.data['64515'], 0, 1000, 1, 255);
            }
            if (msg.data.hasOwnProperty('64516')) {
                result['max_brightness'] = utils.mapNumberRange(msg.data['64516'], 0, 1000, 1, 255);
            }
            if (msg.data.hasOwnProperty('61440')) {
                const propertyName = utils.postfixWithEndpointName('brightness', msg, model, meta);
                result[propertyName] = utils.mapNumberRange(msg.data['61440'], 0, 1000, 0, 255);
            }
            return result;
        },
    } satisfies Fz.Converter,
    TS110E_light_type: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('64514')) {
                const lookup: KeyValue = {0: 'led', 1: 'incandescent', 2: 'halogen'};
                result['light_type'] = lookup[msg.data['64514']];
            }
            return result;
        },
    } satisfies Fz.Converter,
    TS110E_switch_type: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('64514')) {
                const lookup: KeyValue = {0: 'momentary', 1: 'toggle', 2: 'state'};
                const propertyName = utils.postfixWithEndpointName('switch_type', msg, model, meta);
                result[propertyName] = lookup[msg.data['64514']];
            }
            return result;
        },
    } satisfies Fz.Converter,
    scene_recall: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, model)) return;
            const payload = {action: postfixWithEndpointName(`scene_${msg.data.sceneid}`, msg, model, meta)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    } satisfies Fz.Converter,
    scenes_recall_scene_65029: {
        cluster: '65029',
        type: ['raw', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const id = meta.device.modelID === '005f0c3b' ? msg.data[0] : msg.data[msg.data.length - 1];
            return {action: `scene_${id}`};
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        fingerprint: tuya.fingerprint('TS0726', ['_TZ3000_kt6xxa4o']),
        model: 'QAT42Z3',
        vendor: 'QA',
        description: '3 channel scene switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1', 'l2', 'l3'], powerOnBehavior2: true, backlightModeOffOn: true}),
            actionEnumLookup({
                cluster: 'genOnOff',
                commands: ['commandTuyaAction'],
                attribute: 'value',
                actionLookup: {'button': 0},
                buttonLookup: {
                    '1_up': 4, '1_down': 1,
                    '2_up': 5, '2_down': 2,
                    '3_up': 6, '3_down': 3,
                },
            }),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0726', ['_TZ3000_wopf2sox']),
        model: 'QAT42Z1',
        vendor: 'QA',
        description: '1 channel scene switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1'], powerOnBehavior2: true, backlightModeOffOn: true}),
            actionEnumLookup({
                cluster: 'genOnOff',
                commands: ['commandTuyaAction'],
                attribute: 'value',
                actionLookup: {'button': 0},
                buttonLookup: {
                    '1_up': 4, '1_down': 1,
                    '2_up': 5, '2_down': 2,
                    '3_up': 6, '3_down': 3,
                },
            }),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0726', ['_TZ3000_ssup6h68']),
        model: 'QAT42Z2',
        vendor: 'QA',
        description: '2 channel scene switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1', 'l2'], powerOnBehavior2: true, backlightModeOffOn: true}),
            actionEnumLookup({
                cluster: 'genOnOff',
                commands: ['commandTuyaAction'],
                attribute: 'value',
                actionLookup: {'button': 0},
                buttonLookup: {
                    '1_up': 4, '1_down': 1,
                    '2_up': 5, '2_down': 2,
                    '3_up': 6, '3_down': 3,
                },
            }),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TZ3000_gtdswg8k']),
        model: 'QARZDC1LR',
        vendor: 'QA',
        description: '1 channel long range switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1'], powerOnBehavior2: true, switchType: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0002', ['_TZ3000_rfjctviq', '_TZ3210_pdnwpnz5', '_TZ3210_a2erlvb8']),
        model: 'QARZ2LR',
        vendor: 'QA',
        description: '2 channel long range switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1', 'l2'], powerOnBehavior2: true, switchType: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0003', ['_TZ3000_zeuulson']),
        model: 'QARZ3LR',
        vendor: 'QA',
        description: '3 channel long range switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1', 'l2', 'l3'], powerOnBehavior2: true, switchType: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0004', ['_TZ3000_wwtnshol']),
        model: 'QARZ4LR',
        vendor: 'QA',
        description: '4 channel long range switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1', 'l2', 'l3', 'l4'], powerOnBehavior2: true, switchType: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0001', [
            '_TZ3000_dov0a3p1',
        ]),
        model: 'QAT42Z1H',
        vendor: 'QA',
        description: '1 channel wall switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1'], powerOnBehavior2: true, backlightModeOffOn: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0002', [
            '_TZ3000_gkesadus',
        ]),
        model: 'QAT42Z2H',
        vendor: 'QA',
        description: '2 channel wall switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['l1', 'l2'], powerOnBehavior2: true, backlightModeOffOn: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0003', [
            '_TZ3000_pmsxmttq',
        ]),
        model: 'QAT42Z3H',
        vendor: 'QA',
        description: '3 channel wall switch',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'left': 1, 'center': 2, 'right': 3}}),
            tuya.modernExtend.tuyaOnOff({endpoints: ['left', 'center', 'right'], powerOnBehavior2: true, backlightModeOffOn: true}),
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE204_4cl0dzt4',
        ]),
        model: 'QAT44Z6H',
        vendor: 'QA',
        description: '6 channel wall switch',
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
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE204_kyzjsjo3',
        ]),
        model: 'QAT44Z4H',
        vendor: 'QA',
        description: '4 channel wall switch',
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
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint('TS130F', [
            '_TZ3210_xbpt8ewc',
        ]),
        model: 'QACZ1',
        vendor: 'QA',
        description: 'Curtain switch',
        fromZigbee: [fz.tuya_cover_options, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.moes_cover_calibration, tz.cover_position_tilt, tz.tuya_cover_reversal],
        exposes: [e.cover_position(), e.numeric('calibration_time', ea.ALL).withValueMin(0).withValueMax(100),
            e.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']), e.binary('motor_reversal', ea.ALL, 'ON', 'OFF')],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_4qznlkbu']),
        model: 'QASZ24R',
        vendor: 'QA',
        description: 'mmWave 24 Ghz sensor',
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        exposes: [
            e.presence(),
            e.illuminance().withUnit('lx'),
            e
                .numeric('target_distance', ea.STATE)
                .withDescription('Distance to target')
                .withUnit('m'),
            e
                .numeric('radar_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9)
                .withValueStep(1)
                .withDescription('Sensitivity of the radar'),
            e
                .numeric('entry_sensitivity', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(9)
                .withValueStep(1)
                .withDescription('Entry sensitivity'),
            e
                .numeric('detection_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(0.1)
                .withUnit('m')
                .withDescription('Detection range'),
            e
                .numeric('shield_range', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(0.1)
                .withUnit('m')
                .withDescription('Shield range of the radar'),
            e
                .numeric('entry_distance_indentation', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(8)
                .withValueStep(0.1)
                .withUnit('m')
                .withDescription('Entry distance indentation'),
            e
                .numeric('entry_filter_time', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withUnit('s')
                .withDescription('Entry filter time'),
            e
                .numeric('departure_delay', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(600)
                .withValueStep(1)
                .withUnit('s')
                .withDescription('Turn off delay'),
            e
                .numeric('block_time', ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(10)
                .withValueStep(0.1)
                .withUnit('s')
                .withDescription('Block time'),
            e
                .binary('breaker_status', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Breaker status changes with breaker_mode->standard'),
            e
                .enum('breaker_mode', ea.STATE_SET, ['standard', 'local'])
                .withDescription(
                    'Status breaker mode: standard is external, local is auto'
                ),
            e
                .enum('status_indication', ea.STATE_SET, ['OFF', 'ON'])
                .withDescription('Led backlight when triggered'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'presence', tuya.valueConverter.trueFalse1],
                [2, 'radar_sensitivity', tuya.valueConverter.raw],
                [3, 'shield_range', tuya.valueConverter.divideBy100],
                [4, 'detection_range', tuya.valueConverter.divideBy100],
                [6, 'equipment_status', tuya.valueConverter.raw],
                [9, 'target_distance', tuya.valueConverter.divideBy100],
                [101, 'entry_filter_time', tuya.valueConverter.divideBy10],
                [102, 'departure_delay', tuya.valueConverter.raw],
                [103, 'cline', tuya.valueConverter.raw],
                [104, 'illuminance', tuya.valueConverter.divideBy10],
                [105, 'entry_sensitivity', tuya.valueConverter.raw],
                [106, 'entry_distance_indentation', tuya.valueConverter.divideBy100],
                [
                    107,
                    'breaker_mode',
                    tuya.valueConverterBasic.lookup({
                        standard: tuya.enum(0),
                        local: tuya.enum(1),
                    }),
                ],
                [
                    108,
                    'breaker_status',
                    tuya.valueConverterBasic.lookup({
                        OFF: tuya.enum(0),
                        ON: tuya.enum(1),
                    }),
                ],
                [
                    109,
                    'status_indication',
                    tuya.valueConverterBasic.lookup({
                        OFF: tuya.enum(0),
                        ON: tuya.enum(1),
                    }),
                ],
                [
                    111,
                    'breaker_polarity',
                    tuya.valueConverterBasic.lookup({
                        NC: tuya.enum(0),
                        NO: tuya.enum(1),
                    }),
                ],
                [112, 'block_time', tuya.valueConverter.divideBy10],
                [113, 'parameter_setting_result', tuya.valueConverter.raw],
                [114, 'factory_parameters', tuya.valueConverter.raw],
                [115, 'sensor', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0203', manufacturerName: '_TZ3000_udyjylt7'},
            {modelID: 'TS0203', manufacturerName: '_TZ3000_lltemgsf'},
            {modelID: 'TS0203', manufacturerName: '_TZ3000_mg4dy6z6'}],
        model: 'QASD1',
        vendor: 'QA',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage(), e.tamper(), e.linkquality()],
        configure: async (device, coordinatorEndpoint) => {
            try {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            } catch (error) {/* Fails for some*/}
        },
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_zxbtub8r', '_TZ3210_k1msuvg6', '_TZ3210_hzdhb62z', '_TZ3210_v5yquxma']),
        model: 'QADZ1',
        vendor: 'QA',
        description: 'Dimmer 1 channel',
        extend: [light({powerOnBehavior: false, configureReporting: true, effect: false})],
        fromZigbee: [tuya.fz.power_on_behavior_1, fzLocal.TS110E_switch_type, fzLocal.TS110E, fz.on_off],
        toZigbee: [tzLocal.TS110E_light_onoff_brightness, tuya.tz.power_on_behavior_1, tzLocal.TS110E_options],
        exposes: [e.power_on_behavior(), tuya.exposes.switchType()],
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: tuya.fingerprint('TS110E', ['_TZ3210_tkkb1ym8']),
        model: 'QADZ2',
        vendor: 'QA',
        description: 'Dimmer 2 channel',
        extend: [
            tuya.modernExtend.tuyaMagicPacket(),
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2}}),
            light({endpointNames: ['l1', 'l2'], powerOnBehavior: false, configureReporting: true, effect: false})],
        fromZigbee: [tuya.fz.power_on_behavior_1, fzLocal.TS110E_switch_type, fzLocal.TS110E, fz.on_off],
        toZigbee: [tzLocal.TS110E_light_onoff_brightness, tuya.tz.power_on_behavior_1, tzLocal.TS110E_options],
        exposes: [e.power_on_behavior(), tuya.exposes.switchType()],
        configure: tuya.configureMagicPacket,
    },
];

export default definitions;
module.exports = definitions;
