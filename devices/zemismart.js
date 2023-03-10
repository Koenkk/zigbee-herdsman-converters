const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const tuya = require('../lib/tuya');
const ea = exposes.access;

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
		ZM16EL: {
				cluster: 'manuSpecificTuya',
				type: ['commandDataReport'],
				options: [exposes.options.invert_cover()],
				convert: (model, msg, publish, options, meta) => {
						const dpValue = tuya.firstDpValue(msg, meta, 'ZM16EL');
						const dp = dpValue.dp;
						const value = tuya.getDataValue(dpValue);
					
						switch (dp) {
								case tuya.dataPoints.coverPosition: // Started moving to position (triggered from Zigbee)
								case tuya.dataPoints.coverArrived: { // Arrived at position
										const invert = tuya.isCoverInverted(meta.device.manufacturerName) ? !options.invert_cover : options.invert_cover;
										const position = invert ? 100 - (value & 0xff) : value & 0xff;
									
										if (position > 0 && position <= 100) {
												return { 'position': position, 'state': 'OPEN' };
										} else if (position == 0) {
												return { 'position': position, 'state': 'CLOSE' };
										} else {
												// result.running = running; // Not calibrated yet, no position is available
										}
								}
								break;
							case tuya.dataPoints.state:
									return { 'state': { 'open': 0, 'stop': 1, 'close': 2 }[value] };
									break;
							case tuya.dataPoints.motorDirection:
									return { 'motorDirection': value };
									break;
							case dataPointsLocal.battery:
									return { 'battery': value };
									break;
							case dataPointsLocal.clickControl:
									return { 'clickControl': value };
									break;
							default:
									meta.logger.warn(`ZM16EL-03/33 : Unhandled DP #${dp} for ${meta.device.manufacturerName}:
													${JSON.stringify(value)}`);
					}
				}
		},
};

const tzLocal = {
		ZM16EL: {
				key: ['state', 'position', 'border', 'options', 'click_control'],
				options: [exposes.options.invert_cover()],
				convertSet: async (entity, key, value, meta) => {
						switch (key) {
								case 'state':
										await tuya.sendDataPointEnum(entity, tuya.dataPoints.state, { 'open': 0, 'stop': 1, 'close': 2 }[value.toLowerCase()]);
										break;
								case 'position':
										const invert = tuya.isCoverInverted(meta.device.manufacturerName) ? !meta.options.invert_cover : meta.options.invert_cover;
										const position = invert ? 100 - (value & 0xff) : value & 0xff;

										await tuya.sendDataPointValue(entity, tuya.dataPoints.coverPosition, position);
										break;
								case 'border':
										await tuya.sendDataPointEnum(entity, dataPointsLocal.border, { 'up': 0, 'down': 1, 'up_delete': 2, 'down_delete': 3, 'remove_top_bottom': 4 }[value]);
										break;
								case 'options':
										if (value.reverse_direction != undefined) {
												if (value.reverse_direction) {
														meta.logger.info('Motor direction reverse');
														await tuya.sendDataPointEnum(entity, tuya.dataPoints.motorDirection, 1);
												} else {
														meta.logger.info('Motor direction forward');
														await tuya.sendDataPointEnum(entity, tuya.dataPoints.motorDirection, 0);
												}
										}
										break;
								case 'click_control':
										await tuya.sendDataPointEnum(entity, dataPointsLocal.clickControl, { 'up': 0, 'down': 1 }[value]);
										break;
								default:
										meta.logger.warn(`ZM16EL-03/33 : Unhandled key #${key} for ${meta.device.manufacturerName}:
														${JSON.stringify(value)}`);
						}
				}
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
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
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
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_iossyxra'}],
        model: 'ZM-AM02_cover',
        vendor: 'Zemismart',
        description: 'Zigbee/RF curtain converter',
        fromZigbee: [fz.ZMAM02_cover],
        toZigbee: [tz.ZMAM02_cover],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET),
            exposes.composite('options', 'options', ea.STATE)
                .withFeature(exposes.numeric('motor_speed', ea.STATE)
                    .withValueMin(0)
                    .withValueMax(255)
                    .withDescription('Motor speed')),
            exposes.enum('motor_working_mode', ea.STATE_SET, Object.values(tuya.ZMLookups.AM02MotorWorkingMode)),
            exposes.numeric('percent_state', ea.STATE).withValueMin(0).withValueMax(100).withValueStep(1).withUnit('%'),
            exposes.enum('mode', ea.STATE_SET, Object.values(tuya.ZMLookups.AM02Mode)),
            exposes.enum('motor_direction', ea.STATE_SET, Object.values(tuya.ZMLookups.AM02Direction)),
            exposes.enum('border', ea.STATE_SET, Object.values(tuya.ZMLookups.AM02Border)),
        // ---------------------------------------------------------------------------------
        // DP exists, but not used at the moment
        // exposes.numeric('percent_control', ea.STATE_SET).withValueMin(0).withValueMax(100).withValueStep(1).withUnit('%'),
        // exposes.enum('work_state', ea.STATE, Object.values(tuya.ZMAM02.AM02WorkState)),
        // exposes.numeric('countdown_left', ea.STATE).withUnit('s'),
        // exposes.numeric('time_total', ea.STATE).withUnit('ms'),
        // exposes.enum('situation_set', ea.STATE, Object.values(tuya.ZMAM02.AM02Situation)),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_gubdgai2'}],
        model: 'M515EGBZTN',
        vendor: 'Zemismart',
        description: 'Roller shade driver',
        fromZigbee: [fz.ZMAM02_cover],
        toZigbee: [tz.ZMAM02_cover],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET),
            exposes.enum('motor_direction', ea.STATE_SET, Object.values(tuya.ZMLookups.AM02Direction)),
            exposes.enum('border', ea.STATE_SET, Object.values(tuya.ZMLookups.AM02Border)),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_fzo2pocs'}],
        model: 'ZM25TQ',
        vendor: 'Zemismart',
        description: 'Tubular motor',
        fromZigbee: [fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options, tz.tuya_data_point_test],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_7eue9vhc'}],
        model: 'ZM25RX-08/30',
        vendor: 'Zemismart',
        description: 'Tubular motor',
        fromZigbee: [fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_1n2kyphz'}],
        model: 'TB26-4',
        vendor: 'Zemismart',
        description: '4-gang smart wall switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
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
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
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
				fingerprint: [
						{
								modelID: 'TS0601',
								manufacturerName: '_TZE200_68nvbio9',
						},
				],
				model: 'ZM16EL-03/33',
				vendor: 'Zemismart',
				description: 'Smart tubular motor',
				fromZigbee: [fzLocal.ZM16EL, fz.ignore_basic_report],
				toZigbee: [tzLocal.ZM16EL],
				exposes: [
						e.battery(),
						e.cover_position().setAccess('position', ea.STATE_SET),
						exposes.composite('options', 'options', ea.STATE_SET)
								.withFeature(exposes.binary('reverse_direction', ea.STATE_SET, true, false)
										.withDescription('Reverse the motor direction')),
						exposes.enum('border', ea.STATE_SET, ['up', 'down', 'up_delete', 'down_delete', 'remove_top_bottom']),
						exposes.enum('click_control', ea.STATE_SET, ['up', 'down'])
								.withDescription('Single motor steps'),
				],
		},
];
