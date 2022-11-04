const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const globalStore = require('../lib/store');
const xiaomi = require('../lib/xiaomi');

const xiaomiExtend = {
    light_onoff_brightness_colortemp: (options={disableColorTempStartup: true}) => ({
        ...extend.light_onoff_brightness_colortemp(options),
        fromZigbee: extend.light_onoff_brightness_colortemp(options).fromZigbee.concat([
            fz.xiaomi_bulb_interval, fz.ignore_occupancy_report, fz.ignore_humidity_report,
            fz.ignore_pressure_report, fz.ignore_temperature_report,
        ]),
    }),
};

const preventReset = async (type, data, device) => {
    if (
        // options.allow_reset ||
        type !== 'message' ||
        data.type !== 'attributeReport' ||
        data.cluster !== 'genBasic' ||
        !data.data[0xfff0] ||
        // eg: [0xaa, 0x10, 0x05, 0x41, 0x87, 0x01, 0x01, 0x10, 0x00]
        !data.data[0xFFF0].slice(0, 5).equals(Buffer.from([0xaa, 0x10, 0x05, 0x41, 0x87]))
    ) {
        return;
    }
    const options = {manufacturerCode: 0x115f};
    const payload = {[0xfff0]: {
        value: [0xaa, 0x10, 0x05, 0x41, 0x47, 0x01, 0x01, 0x10, 0x01],
        type: 0x41,
    }};
    await device.getEndpoint(1).write('genBasic', payload, options);
};


const fzLocal = {
    aqara_trv: {
        cluster: 'aqaraOpple',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            Object.entries(msg.data).forEach(([key, value]) => {
                switch (parseInt(key)) {
                case 0x0271:
                    result['system_mode'] = {1: 'heat', 0: 'off'}[value];
                    break;
                case 0x0272:
                    result['preset'] = {2: 'away', 1: 'auto', 0: 'manual'}[value];
                    break;
                case 0x0273:
                    result['window_detection'] = {1: 'ON', 0: 'OFF'}[value];
                    break;
                case 0x0274:
                    result['valve_detection'] = {1: 'ON', 0: 'OFF'}[value];
                    break;
                case 0x0277:
                    result['child_lock'] = {1: 'LOCK', 0: 'UNLOCK'}[value];
                    break;
                case 0x0279:
                    result['away_preset_temperature'] = (value / 100).toFixed(1);
                    break;
                case 0x027b:
                    result['calibrated'] = {1: true, 0: false}[value];
                    break;
                case 0x027e:
                    result['sensor'] = {1: 'external', 0: 'internal'}[value];
                    break;
                case 0x040a:
                    result['battery'] = value;
                    break;
                case 0x027a:
                    result['window_open'] = {1: true, 0: false}[value];
                    break;
                case 0x0275:
                    result['valve_alarm'] = {1: true, 0: false}[value];
                    break;
                case 0xfff2:
                case 0x00ff: // 4e:27:49:bb:24:b6:30:dd:74:de:53:76:89:44:c4:81
                case 0x00f7: // 03:28:1f:05:21:01:00:0a:21:00:00:0d:23:19:08:00:00:11:23...
                case 0x0276: // 04:3e:01:e0:00:00:09:60:04:38:00:00:06:a4:05:64:00:00:08:98:81:e0:00:00:08:98
                case 0x027c: // 0x00
                case 0x027d: // 0x00
                case 0x0280: // 0x00/0x01
                    meta.logger.debug(`zigbee-herdsman-converters:aqara_trv: Unhandled key ${key} = ${value}`);
                    break;
                default:
                    meta.logger.warn(`zigbee-herdsman-converters:aqara_trv: Unknown key ${key} = ${value}`);
                }
            });
            return result;
        },
    },
};

const tzLocal = {
    aqara_trv: {
        key: ['system_mode', 'preset', 'window_detection', 'valve_detection', 'child_lock', 'away_preset_temperature',
            'calibrate', 'sensor', 'sensor_temp', 'identify'],
        convertSet: async (entity, key, value, meta) => {
            const aqaraHeader = (counter, params, action) => {
                const header = [0xaa, 0x71, params.length + 3, 0x44, counter];
                const integrity = 512 - header.reduce((sum, elem) => sum + elem, 0);
                return [...header, integrity, action, 0x41, params.length];
            };
            const sensor = Buffer.from('00158d00019d1b98', 'hex');

            switch (key) {
            case 'system_mode':
                await entity.write('aqaraOpple', {0x0271: {value: {'off': 0, 'heat': 1}[value], type: 0x20}},
                    {manufacturerCode: 0x115f});
                break;
            case 'preset':
                await entity.write('aqaraOpple', {0x0272: {value: {'manual': 0, 'auto': 1, 'away': 2}[value], type: 0x20}},
                    {manufacturerCode: 0x115f});
                break;
            case 'window_detection':
                await entity.write('aqaraOpple', {0x0273: {value: {'OFF': 0, 'ON': 1}[value], type: 0x20}},
                    {manufacturerCode: 0x115f});
                break;
            case 'valve_detection':
                await entity.write('aqaraOpple', {0x0274: {value: {'OFF': 0, 'ON': 1}[value], type: 0x20}},
                    {manufacturerCode: 0x115f});
                break;
            case 'child_lock':
                await entity.write('aqaraOpple', {0x0277: {value: {'UNLOCK': 0, 'LOCK': 1}[value], type: 0x20}},
                    {manufacturerCode: 0x115f});
                break;
            case 'away_preset_temperature':
                await entity.write('aqaraOpple', {0x0279: {value: Math.round(value * 100), type: 0x23}}, {manufacturerCode: 0x115f});
                break;
            case 'sensor': {
                const device = Buffer.from(entity.deviceIeeeAddress.substring(2), 'hex');
                const timestamp = Buffer.alloc(4);
                timestamp.writeUint32BE(Date.now()/1000);

                if (value === 'external') {
                    const params1 = [
                        ...timestamp,
                        0x3d, 0x04,
                        ...device,
                        ...sensor,
                        0x00, 0x01, 0x00, 0x55,
                        0x13, 0x0a, 0x02, 0x00, 0x00, 0x64, 0x04, 0xce, 0xc2, 0xb6, 0xc8,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x3d,
                        0x64,
                        0x65,
                    ];
                    const params2 = [
                        ...timestamp,
                        0x3d, 0x05,
                        ...device,
                        ...sensor,
                        0x08, 0x00, 0x07, 0xfd,
                        0x16, 0x0a, 0x02, 0x0a, 0xc9, 0xe8, 0xb1, 0xb8, 0xd4, 0xda, 0xcf, 0xdf, 0xc0, 0xeb,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x3d,
                        0x04,
                        0x65,
                    ];

                    const val1 = [...(aqaraHeader(0x12, params1, 0x02)), ...params1];
                    const val2 = [...(aqaraHeader(0x13, params2, 0x02)), ...params2];

                    await entity.write('aqaraOpple', {0xfff2: {value: val1, type: 0x41}}, {manufacturerCode: 0x115f});
                    await entity.write('aqaraOpple', {0xfff2: {value: val2, type: 0x41}}, {manufacturerCode: 0x115f});
                } else if (value === 'internal') {
                    const params1 = [
                        ...timestamp,
                        0x3d, 0x05,
                        ...device,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    ];
                    const params2 = [
                        ...timestamp,
                        0x3d, 0x04,
                        ...device,
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    ];

                    const val1 = [...(aqaraHeader(0x12, params1, 0x04)), ...params1];
                    const val2 = [...(aqaraHeader(0x13, params2, 0x04)), ...params2];

                    await entity.write('aqaraOpple', {0xfff2: {value: val1, type: 0x41}}, {manufacturerCode: 0x115f});
                    await entity.write('aqaraOpple', {0xfff2: {value: val2, type: 0x41}}, {manufacturerCode: 0x115f});

                    await entity.read('hvacThermostat', ['localTemp']);
                }
                break;
            }
            case 'sensor_temp':
                if (meta.state['sensor'] === 'external') {
                    const temperatureBuf = Buffer.alloc(4);
                    temperatureBuf.writeFloatBE(Math.round(value * 100));

                    const params = [...sensor, 0x00, 0x01, 0x00, 0x55, ...temperatureBuf];
                    const data = [...(aqaraHeader(0x12, params, 0x05)), ...params];

                    await entity.write('aqaraOpple', {0xfff2: {value: data, type: 0x41}}, {manufacturerCode: 0x115f});
                }
                break;
            case 'calibrate':
                await entity.write('aqaraOpple', {0x0270: {value: 1, type: 0x20}}, {manufacturerCode: 0x115F});
                break;
            case 'identify':
                await entity.command('genIdentify', 'identify', {identifytime: 5}, {});
                break;
            default: // Unknown key
                meta.logger.warn(`zigbee-herdsman-converters:aqara_trv: Unhandled key ${key}`);
            }
        },
        convertGet: async (entity, key, meta) => {
            const dict = {'system_mode': 0x0271, 'preset': 0x0272, 'window_detection': 0x0273, 'valve_detection': 0x0274,
                'child_lock': 0x0277, 'away_preset_temperature': 0x0279, 'calibrated': 0x027b, 'sensor': 0x027e};

            if (dict.hasOwnProperty(key)) {
                await entity.read('aqaraOpple', [dict[key]], {manufacturerCode: 0x115F});
            }
        },
    },
    VOCKQJK11LM_display_unit: {
        key: ['display_unit'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('aqaraOpple',
                {0x0114: {value: xiaomi.VOCKQJK11LMDisplayUnit[value], type: 0x20}}, {manufacturerCode: 0x115F});
            return {state: {display_unit: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('aqaraOpple', [0x0114], {manufacturerCode: 0x115F, disableDefaultResponse: true});
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['lumi.flood.acn001'],
        model: 'SJCGQ13LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 water leak sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.aqara_opple, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery(), e.battery_low(), e.battery_voltage(), e.device_temperature(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.magnet.acn001'],
        model: 'MCCGQ14LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.aqara_opple, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.contact(), e.battery(), e.battery_low(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        // OTA request: "fieldControl":0, "manufacturerCode":4447, "imageType":10635
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.magnet.ac01'],
        model: 'MCCGQ13LM',
        vendor: 'Xiaomi',
        description: 'Aqara P1 door & window contact sensor',
        fromZigbee: [fz. xiaomi_contact, fz.ias_contact_alarm_1, fz.aqara_opple],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.dimmer.rcbac1'],
        model: 'ZNDDMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart lightstrip driver',
        fromZigbee: extend.light_onoff_brightness_colortemp_color().fromZigbee.concat([
            fz.xiaomi_power, fz.aqara_opple]),
        toZigbee: extend.light_onoff_brightness_colortemp_color().toZigbee.concat([
            tz.xiaomi_dimmer_mode, tz.xiaomi_switch_power_outage_memory]),
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        exposes: [e.power(), e.energy(), e.voltage(), e.device_temperature(), e.power_outage_memory(),
            // When in rgbw mode, only one of color and colortemp will be valid, and l2 will be invalid
            // Do not control l2 in rgbw mode
            e.light_brightness_colortemp_colorxy([153, 370]).removeFeature('color_temp_startup').withEndpoint('l1'),
            e.light_brightness_colortemp([153, 370]).removeFeature('color_temp_startup').withEndpoint('l2'),
            exposes.enum('dimmer_mode', ea.ALL, ['rgbw', 'dual_ct'])
                .withDescription('Switch between rgbw mode or dual color temperature mode')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.aqcn02'],
        model: 'ZNLDP12LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart LED bulb',
        toZigbee: xiaomiExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}).toZigbee.concat([
            tz.xiaomi_light_power_outage_memory]),
        fromZigbee: xiaomiExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}).fromZigbee,
        // power_on_behavior 'toggle' does not seem to be supported
        exposes: xiaomiExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}).exposes.concat([
            e.power_outage_memory().withAccess(ea.STATE_SET)]),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.acn003'],
        model: 'ZNXDD01LM',
        vendor: 'Xiaomi',
        description: 'Aqara ceiling light L1-350',
        extend: xiaomiExtend.light_onoff_brightness_colortemp({disableEffect: true, colorTempRange: [153, 370]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cwac02', 'lumi.light.acn014'],
        model: 'ZNLDP13LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 smart LED bulb',
        toZigbee: xiaomiExtend.light_onoff_brightness_colortemp({disableEffect: true, disablePowerOnBehavior: true}).toZigbee.concat([
            tz.xiaomi_switch_power_outage_memory,
        ]),
        fromZigbee: xiaomiExtend.light_onoff_brightness_colortemp({disableEffect: true, disablePowerOnBehavior: true}).fromZigbee.concat([
            fz.aqara_opple,
        ]),
        exposes: xiaomiExtend.light_onoff_brightness_colortemp({
            disableEffect: true,
            disablePowerOnBehavior: true,
            colorTempRange: [153, 370],
        }).exposes.concat([
            e.power_outage_memory(),
            e.device_temperature(),
            e.power_outage_count(),
        ]),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cwopcn01'],
        model: 'XDD11LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple MX960',
        meta: {turnsOffAtBrightness1: true},
        extend: xiaomiExtend.light_onoff_brightness_colortemp({disableEffect: true, disableColorTempStartup: true,
            colorTempRange: [175, 370]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cwopcn02'],
        model: 'XDD12LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple MX650',
        meta: {turnsOffAtBrightness1: true},
        extend: xiaomiExtend.light_onoff_brightness_colortemp({disableEffect: true, disableColorTempStartup: true,
            colorTempRange: [175, 370]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cwopcn03'],
        model: 'XDD13LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple MX480',
        meta: {turnsOffAtBrightness1: true},
        extend: xiaomiExtend.light_onoff_brightness_colortemp({disableEffect: true, disableColorTempStartup: true,
            colorTempRange: [175, 370]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cwjwcn01'],
        model: 'JWSP001A',
        vendor: 'Xiaomi',
        description: 'Jiawen LED Driver & Dimmer',
        extend: xiaomiExtend.light_onoff_brightness_colortemp({disableEffect: true, disableColorTempStartup: true,
            colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['lumi.light.cwjwcn02'],
        model: 'JWDL001A',
        vendor: 'Xiaomi',
        description: 'Aqara embedded spot led light',
        extend: xiaomiExtend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['lumi.sensor_switch'],
        model: 'WXKG01LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4040GL'}, {vendor: 'Xiaomi', model: 'YTC4006CN'},
            {vendor: 'Xiaomi', model: 'YTC4017CN'}, {vendor: 'Xiaomi', model: 'ZHTZ02LM'}],
        description: 'MiJia wireless switch',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_WXKG01LM_action, fz.legacy.WXKG01LM_click],
        exposes: [e.battery(), e.action(['single', 'double', 'triple', 'quadruple', 'hold', 'release', 'many']), e.battery_voltage(),
            e.power_outage_count(false)],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq2', 'lumi.remote.b1acn01'],
        model: 'WXKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'triple', 'quadruple', 'hold', 'release']),
            e.device_temperature(), e.power_outage_count()],
        fromZigbee: [fz.xiaomi_multistate_action, fz.xiaomi_WXKG11LM_action, fz.xiaomi_basic,
            fz.legacy.WXKG11LM_click, fz.legacy.xiaomi_action_click_multistate],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq3', 'lumi.sensor_swit'],
        model: 'WXKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch (with gyroscope)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single', 'double', 'hold', 'release', 'shake']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_multistate_action, fz.legacy.WXKG12LM_action_click_multistate],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_86sw1'],
        model: 'WXKG03LM_rev1',
        vendor: 'Xiaomi',
        description: 'Aqara single key wireless wall switch (2016 model)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_basic, fz.legacy.WXKG03LM_click],
        toZigbee: [],
        onEvent: preventReset,
    },
    {
        zigbeeModel: ['lumi.remote.b186acn01'],
        model: 'WXKG03LM_rev2',
        vendor: 'Xiaomi',
        description: 'Aqara single key wireless wall switch (2018 model)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single', 'double', 'hold']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_basic,
            fz.legacy.WXKG03LM_click, fz.legacy.xiaomi_action_click_multistate],
        toZigbee: [],
        onEvent: preventReset,
    },
    {
        zigbeeModel: ['lumi.remote.b186acn02'],
        model: 'WXKG06LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 single key wireless wall switch',
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_on_off_action, fz.xiaomi_multistate_action],
        toZigbee: [],
        exposes: [e.battery(),
            e.action(['single', 'double', 'hold']),
            e.battery_voltage()],
        onEvent: preventReset,
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.endpoints[1];
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            } catch (error) {
                // fails for some but device works as expected: https://github.com/Koenkk/zigbee2mqtt/issues/9136
            }
        },
    },
    {
        zigbeeModel: ['lumi.sensor_86sw2', 'lumi.sensor_86sw2.es1'],
        model: 'WXKG02LM_rev1',
        vendor: 'Xiaomi',
        description: 'Aqara double key wireless wall switch (2016 model)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single_left', 'single_right', 'single_both']), e.battery_voltage(), e.power_outage_count(false)],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_basic, fz.legacy.WXKG02LM_click],
        toZigbee: [],
        onEvent: preventReset,
    },
    {
        zigbeeModel: ['lumi.remote.b286acn01'],
        model: 'WXKG02LM_rev2',
        vendor: 'Xiaomi',
        description: 'Aqara double key wireless wall switch (2018 model)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single_left', 'single_right', 'single_both', 'double_left', 'double_right', 'double_both',
            'hold_left', 'hold_right', 'hold_both']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_basic,
            fz.legacy.WXKG02LM_click, fz.legacy.WXKG02LM_click_multistate],
        toZigbee: [],
        onEvent: preventReset,
    },
    {
        zigbeeModel: ['lumi.switch.b1laus01'],
        model: 'WS-USC01',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (no neutral, single rocker)',
        fromZigbee: [fz.on_off, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple,
            tz.xiaomi_flip_indicator_light, tz.aqara_switch_mode_switch],
        exposes: [e.switch(), e.action(['single', 'double']), e.flip_indicator_light(),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode'),
            exposes.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.')],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b2laus01'],
        model: 'WS-USC02',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (no neutral, double rocker)',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b1naus01'],
        model: 'WS-USC03',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (neutral, single rocker)',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b2naus01'],
        model: 'WS-USC04',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (neutral, double rocker)',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.n2acn1'],
        model: 'QBKG31LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch H1 Pro (with neutral, double rocker)',
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.aqara_opple, fz.xiaomi_multistate_action],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_led_disabled_night, tz.xiaomi_flip_indicator_light],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.power(), e.energy(), e.voltage(),
            e.device_temperature(), e.power_outage_memory(), e.led_disabled_night(), e.flip_indicator_light(),
            e.action([
                'single_left', 'single_right', 'single_both',
                'double_left', 'double_right', 'double_both']),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button').withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button').withEndpoint('right')],
        onEvent: preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.l1aeu1'],
        model: 'WS-EUK01',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch H1 EU (no neutral, single rocker)',
        fromZigbee: [fz.on_off, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_flip_indicator_light, tz.xiaomi_led_disabled_night, tz.aqara_switch_mode_switch],
        exposes: [e.switch(), e.action(['single', 'double']), e.power_outage_memory(), e.flip_indicator_light(),
            e.led_disabled_night(), e.power_outage_count(), e.device_temperature().withAccess(ea.STATE),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode'),
            exposes.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.')],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
    },
    {
        zigbeeModel: ['lumi.switch.l2aeu1'],
        model: 'WS-EUK02',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch H1 EU (no neutral, double rocker)',
        fromZigbee: [fz.on_off, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_flip_indicator_light, tz.xiaomi_led_disabled_night, tz.aqara_switch_mode_switch],
        meta: {multiEndpoint: true},
        endpoint: (_device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.power_outage_memory(),
            e.flip_indicator_light(), e.led_disabled_night(), e.power_outage_count(),
            e.device_temperature().withAccess(ea.STATE),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            exposes.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both'])],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
    },
    {
        zigbeeModel: ['lumi.switch.n1aeu1'],
        model: 'WS-EUK03',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch H1 EU (with neutral, single rocker)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_flip_indicator_light, tz.xiaomi_led_disabled_night],
        exposes: [e.switch(), e.action(['single', 'double']), e.power().withAccess(ea.STATE_GET), e.energy(), e.flip_indicator_light(),
            e.power_outage_memory(), e.device_temperature().withAccess(ea.STATE), e.led_disabled_night(), e.power_outage_count(),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode')],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.n2aeu1'],
        model: 'WS-EUK04',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch H1 EU (with neutral, double rocker)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_flip_indicator_light, tz.xiaomi_led_disabled_night],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.power().withAccess(ea.STATE_GET), e.energy(),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both']),
            e.device_temperature().withAccess(ea.STATE), e.power_outage_memory(), e.flip_indicator_light(),
            e.led_disabled_night(), e.power_outage_count()],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral1'],
        model: 'QBKG04LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wired wall switch without neutral wire. Doesn\'t work as a router and doesn\'t support power meter',
        fromZigbee: [fz.xiaomi_on_off_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy.QBKG04LM_QBKG11LM_click,
            fz.xiaomi_operation_mode_basic],
        exposes: [
            e.switch(), e.action(['release', 'hold', 'double', 'single', 'hold_release']),
            exposes.enum('operation_mode', ea.STATE_SET, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
        ],
        toZigbee: [tz.on_off, {...tz.xiaomi_switch_operation_mode_basic, convertGet: null}],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.ctrl_ln1.aq1', 'lumi.ctrl_ln1'],
        model: 'QBKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wired wall switch',
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_on_off_ignore_endpoint_4_5_6,
            fz.legacy.QBKG04LM_QBKG11LM_click, fz.xiaomi_basic, fz.xiaomi_operation_mode_basic,
            fz.legacy.QBKG11LM_click, fz.ignore_multistate_report, fz.xiaomi_power],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.device_temperature(), e.energy(),
            e.action(['single', 'double', 'release', 'hold']),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_basic, tz.xiaomi_power],
        endpoint: (device) => {
            return {'system': 1};
        },
        onEvent: preventReset,
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral2'],
        model: 'QBKG03LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wired wall switch without neutral wire. Doesn\'t work as a router and doesn\'t support power meter',
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_on_off_ignore_endpoint_4_5_6, fz.legacy.QBKG03LM_QBKG12LM_click,
            fz.legacy.QBKG03LM_buttons, fz.xiaomi_operation_mode_basic, fz.xiaomi_basic],
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.device_temperature(),
            e.action(['release_left', 'release_right', 'release_both', 'double_left', 'double_right',
                'single_left', 'single_right', 'hold_release_left', 'hold_release_left']),
            exposes.enum('operation_mode', ea.STATE_SET, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.STATE_SET, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for right button')
                .withEndpoint('right'),
        ],
        toZigbee: [tz.on_off, {...tz.xiaomi_switch_operation_mode_basic, convertGet: null}, tz.xiaomi_power],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.ctrl_ln2.aq1', 'lumi.ctrl_ln2'],
        model: 'QBKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wired wall switch',
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_on_off_ignore_endpoint_4_5_6,
            fz.legacy.QBKG03LM_QBKG12LM_click, fz.xiaomi_basic, fz.xiaomi_operation_mode_basic, fz.legacy.QBKG12LM_click,
            fz.xiaomi_power],
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.device_temperature(), e.energy(),
            e.power().withAccess(ea.STATE_GET),
            e.action(['single_left', 'single_right', 'single_both', 'double_left', 'double_right', 'double_both',
                'hold_left', 'hold_right', 'hold_both', 'release_left', 'release_right', 'release_both']),
            exposes.enum('operation_mode', ea.ALL, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for right button')
                .withEndpoint('right'),
        ],
        meta: {multiEndpoint: true},
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_basic, tz.xiaomi_power],
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'system': 1};
        },
        onEvent: preventReset,
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.remote.b286acn02'],
        model: 'WXKG07LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 double key wireless wall switch',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.legacy.xiaomi_on_off_action, fz.legacy.xiaomi_multistate_action],
        toZigbee: [],
        endpoint: (device) => {
            return {left: 1, right: 2, both: 3};
        },
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'single_left', 'single_right', 'single_both',
            'double_left', 'double_right', 'double_both',
            'hold_left', 'hold_right', 'hold_both'])],
        onEvent: preventReset,
    },
    {
        zigbeeModel: ['lumi.switch.b1lacn02'],
        model: 'QBKG21LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 single gang smart wall switch (no neutral wire)',
        fromZigbee: [fz.xiaomi_on_off_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy.QBKG04LM_QBKG11LM_click,
            fz.xiaomi_operation_mode_basic],
        exposes: [
            e.switch(), e.action(['release', 'hold', 'double', 'single', 'hold_release']),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_basic],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.b2lacn02'],
        model: 'QBKG22LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 2 gang smart wall switch (no neutral wire)',
        fromZigbee: [fz.xiaomi_on_off_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy.QBKG03LM_QBKG12LM_click,
            fz.legacy.QBKG03LM_buttons, fz.xiaomi_operation_mode_basic],
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.action(['release_left', 'release_right', 'release_both', 'double_left', 'double_right',
                'single_left', 'single_right', 'hold_release_left', 'hold_release_left']),
            exposes.enum('operation_mode', ea.ALL, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for right button')
                .withEndpoint('right'),
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_basic],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.l3acn3'],
        model: 'QBKG25LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 3 gang smart wall switch (no neutral wire)',
        fromZigbee: [fz.on_off, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_led_disabled_night,
            tz.aqara_switch_mode_switch, tz.xiaomi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for center button')
                .withEndpoint('center'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            exposes.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
            e.power_outage_memory(), e.led_disabled_night(), e.device_temperature().withAccess(ea.STATE), e.flip_indicator_light(),
            e.action([
                'left_single', 'left_double', 'center_single', 'center_double', 'right_single', 'right_double',
                'single_left_center', 'double_left_center', 'single_left_right', 'double_left_right',
                'single_center_right', 'double_center_right', 'single_all', 'double_all']),
            e.power_outage_count(),
        ],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.n3acn3'],
        model: 'QBKG26LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 3 gang smart wall switch (with neutral wire)',
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for center button')
                .withEndpoint('center'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.power().withAccess(ea.STATE), e.power_outage_memory(), e.led_disabled_night(), e.voltage(),
            e.device_temperature().withAccess(ea.STATE), e.flip_indicator_light(),
            e.action([
                'single_left', 'double_left', 'single_center', 'double_center', 'single_right', 'double_right',
                'single_left_center', 'double_left_center', 'single_left_right', 'double_left_right',
                'single_center_right', 'double_center_right', 'single_all', 'double_all']),
        ],
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.aqara_opple, fz.xiaomi_multistate_action],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_led_disabled_night, tz.xiaomi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        onEvent: preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b1nacn02'],
        model: 'QBKG23LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 1 gang smart wall switch (with neutral wire)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_basic, fz.xiaomi_multistate_action],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_operation_mode_basic],
        endpoint: (device) => {
            return {'system': 1};
        },
        onEvent: preventReset,
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET),
            e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.action(['single', 'release']),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.type = 'Router';
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b2nacn02'],
        model: 'QBKG24LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 2 gang smart wall switch (with neutral wire)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_multistate_action, fz.xiaomi_operation_mode_basic],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_operation_mode_basic],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'system': 1};
        },
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.power().withAccess(ea.STATE_GET),
            e.action([
                'hold_left', 'single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both',
            ]),
            exposes.enum('operation_mode', ea.ALL, ['control_left_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_right_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
        ],
        onEvent: preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b1nacn01'],
        model: 'QBKG19LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch T1 (with neutral, single rocker)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_led_disabled_night, tz.xiaomi_flip_indicator_light],
        exposes: [
            e.switch(), e.action(['single', 'double']), e.power().withAccess(ea.STATE), e.energy(),
            e.voltage().withAccess(ea.STATE), e.device_temperature().withAccess(ea.STATE),
            e.power_outage_memory(), e.led_disabled_night(), e.flip_indicator_light(),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button'),
        ],
        onEvent: preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b2nacn01'],
        model: 'QBKG20LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch T1 (with neutral, double rocker)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_led_disabled_night, tz.xiaomi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.power().withAccess(ea.STATE), e.energy(), e.voltage().withAccess(ea.STATE), e.flip_indicator_light(),
            e.power_outage_memory(), e.led_disabled_night(), e.device_temperature().withAccess(ea.STATE),
            e.action([
                'single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both']),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
        ],
        onEvent: preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b3n01'],
        model: 'QBKG34LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch T1 (with neutral, three rocker)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_led_disabled_night, tz.xiaomi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            e.power().withAccess(ea.STATE), e.energy(), e.voltage().withAccess(ea.STATE), e.flip_indicator_light(),
            e.power_outage_memory(), e.led_disabled_night(), e.device_temperature().withAccess(ea.STATE),
            e.action([
                'single_left', 'double_left', 'single_center', 'double_center',
                'single_right', 'double_right', 'single_left_center', 'double_left_center',
                'single_left_right', 'double_left_right', 'single_center_right', 'double_center_right',
                'single_all', 'double_all']),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('center'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
        ],
        onEvent: preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sens', 'lumi.sensor_ht'],
        model: 'WSDCGQ01LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4042GL'}, {vendor: 'Xiaomi', model: 'YTC4007CN'},
            {vendor: 'Xiaomi', model: 'YTC4018CN'}],
        description: 'MiJia temperature & humidity sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.weather'],
        model: 'WSDCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara temperature, humidity and pressure sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_temperature, fz.humidity, fz.pressure],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.sensor_ht.agl02'],
        model: 'WSDCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 temperature, humidity and pressure sensor',
        fromZigbee: [fz.aqara_opple, fz.temperature, fz.humidity, fz.pressure, fz.battery],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.pressure(), e.device_temperature(), e.battery(), e.battery_voltage(),
            e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sensor_motion'],
        model: 'RTCGQ01LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4041GL'}, {vendor: 'Xiaomi', model: 'YTC4004CN'},
            {vendor: 'Xiaomi', model: 'YTC4016CN'}, {vendor: 'Xiaomi', model: 'ZHTZ02LM'}],
        description: 'MiJia human body movement sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.occupancy_with_timeout],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.battery_voltage(), e.power_outage_count(false)],
    },
    {
        zigbeeModel: ['lumi.sensor_motion.aq2'],
        model: 'RTCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara human body movement and illuminance sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.occupancy_with_timeout, fz.RTCGQ11LM_illuminance],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.device_temperature(), e.battery_voltage(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux'), e.power_outage_count(false)],
    },
    {
        zigbeeModel: ['lumi.motion.agl02'],
        model: 'RTCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 human body movement and illuminance sensor',
        fromZigbee: [fz.aqara_occupancy_illuminance, fz.aqara_opple, fz.battery],
        toZigbee: [tz.aqara_detection_interval],
        exposes: [e.occupancy(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux'),
            exposes.numeric('detection_interval', ea.ALL).withValueMin(2).withValueMax(65535).withUnit('s')
                .withDescription('Time interval for detecting actions'),
            e.device_temperature(), e.battery(), e.battery_voltage(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('aqaraOpple', [0x0102], {manufacturerCode: 0x115f});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.motion.agl04'],
        model: 'RTCGQ13LM',
        vendor: 'Xiaomi',
        description: 'Aqara high precision motion sensor',
        fromZigbee: [fz.RTCGQ13LM_occupancy, fz.aqara_opple, fz.battery],
        toZigbee: [tz.aqara_detection_interval, tz.aqara_motion_sensitivity],
        exposes: [e.occupancy(), exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high']),
            exposes.numeric('detection_interval', ea.ALL).withValueMin(2).withValueMax(65535).withUnit('s')
                .withDescription('Time interval for detecting actions'),
            e.device_temperature(), e.battery(), e.battery_voltage(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('aqaraOpple', [0x0102], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x010c], {manufacturerCode: 0x115f});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.motion.ac02'],
        model: 'RTCGQ14LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'MS-S02'}],
        description: 'Aqara P1 human body movement and illuminance sensor',
        fromZigbee: [fz.aqara_occupancy_illuminance, fz.aqara_opple, fz.battery],
        toZigbee: [tz.aqara_detection_interval, tz.aqara_motion_sensitivity, tz.RTCGQ14LM_trigger_indicator],
        exposes: [e.occupancy(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux'),
            exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high'])
                .withDescription('. Press pairing button right before changing this otherwise it will fail.'),
            exposes.numeric('detection_interval', ea.ALL).withValueMin(2).withValueMax(65535).withUnit('s')
                .withDescription('Time interval for detecting actions. ' +
                    'Press pairing button right before changing this otherwise it will fail.'),
            exposes.binary('trigger_indicator', ea.ALL, true, false).withDescription('When this option is enabled then ' +
                'blue LED will blink once when motion is detected. ' +
                'Press pairing button right before changing this otherwise it will fail.'),
            e.device_temperature(), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('aqaraOpple', [0x0102], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x010c], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0152], {manufacturerCode: 0x115f});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.motion.acn001'],
        model: 'RTCGQ15LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 human body movement and illuminance sensor',
        fromZigbee: [fz.aqara_occupancy_illuminance, fz.aqara_opple, fz.battery],
        toZigbee: [tz.aqara_detection_interval],
        exposes: [e.occupancy(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux'),
            exposes.numeric('detection_interval', ea.ALL).withValueMin(2).withValueMax(65535).withUnit('s')
                .withDescription('Time interval for detecting actions'),
            e.device_temperature(), e.battery(), e.battery_voltage(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('aqaraOpple', [0x0102], {manufacturerCode: 0x115f});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.motion.ac01'],
        model: 'RTCZCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara presence detector FP1 (regions not supported for now)',
        fromZigbee: [fz.aqara_opple],
        toZigbee: [tz.RTCZCGQ11LM_presence, tz.RTCZCGQ11LM_monitoring_mode, tz.RTCZCGQ11LM_approach_distance,
            tz.aqara_motion_sensitivity, tz.RTCZCGQ11LM_reset_nopresence_status],
        exposes: [e.presence().withAccess(ea.STATE_GET),
            exposes.enum('presence_event', ea.STATE, ['enter', 'leave', 'left_enter', 'right_leave', 'right_enter', 'left_leave',
                'approach', 'away']).withDescription('Presence events: "enter", "leave", "left_enter", "right_leave", ' +
                '"right_enter", "left_leave", "approach", "away"'),
            exposes.enum('monitoring_mode', ea.ALL, ['undirected', 'left_right']).withDescription('Monitoring mode with or ' +
                'without considering right and left sides'),
            exposes.enum('approach_distance', ea.ALL, ['far', 'medium', 'near']).withDescription('The distance at which the ' +
                'sensor detects approaching'),
            exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('Different sensitivities ' +
                'means different static human body recognition rate and response speed of occupied'),
            exposes.enum('reset_nopresence_status', ea.SET, ['']).withDescription('Reset the status of no presence'),
            e.device_temperature(), e.power_outage_count()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('aqaraOpple', [0x010c], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0142], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0144], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0146], {manufacturerCode: 0x115f});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sensor_magnet'],
        model: 'MCCGQ01LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4039GL'}, {vendor: 'Xiaomi', model: 'YTC4005CN'},
            {vendor: 'Xiaomi', model: 'YTC4015CN'}, {vendor: 'Xiaomi', model: 'ZHTZ02LM'}],
        description: 'MiJia door & window contact sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_contact],
        toZigbee: [],
        exposes: [e.battery(), e.contact(), e.battery_voltage(), e.power_outage_count(false)],
    },
    {
        zigbeeModel: ['lumi.sensor_magnet.aq2'],
        model: 'MCCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara door & window contact sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_contact],
        toZigbee: [],
        exposes: [e.battery(), e.contact(), e.device_temperature(), e.battery_voltage(), e.power_outage_count(false)],
        configure: async (device) => {
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.sensor_wleak.aq1'],
        model: 'SJCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara water leak sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.battery(), e.water_leak(), e.battery_low(), e.battery_voltage(), e.device_temperature(), e.power_outage_count(false)],
    },
    {
        zigbeeModel: ['lumi.flood.agl02'],
        model: 'SJCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 water leak sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.battery(), e.water_leak(), e.battery_low(), e.tamper(), e.battery_voltage()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sensor_cube', 'lumi.sensor_cube.aqgl01'],
        model: 'MFKZQ01LM',
        vendor: 'Xiaomi',
        description: 'Mi/Aqara smart home cube',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.MFKZQ01LM_action_multistate, fz.MFKZQ01LM_action_analog],
        exposes: [e.battery(), e.battery_voltage(), e.angle('action_angle'), e.device_temperature(), e.power_outage_count(false),
            e.cube_side('action_from_side'), e.cube_side('action_side'), e.cube_side('action_to_side'), e.cube_side('side'),
            e.action(['shake', 'wakeup', 'fall', 'tap', 'slide', 'flip180', 'flip90', 'rotate_left', 'rotate_right'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.plug'],
        model: 'ZNCZ02LM',
        description: 'Mi power plug ZigBee',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature(), e.power_outage_memory()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.plug.mitw01'],
        model: 'ZNCZ03LM',
        description: 'Mi power plug ZigBee TW',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, tz.xiaomi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE)],
    },
    {
        zigbeeModel: ['lumi.plug.mmeu01'],
        model: 'ZNCZ04LM',
        description: 'Mi power plug ZigBee EU',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.aqara_opple, fz.ignore_occupancy_report, fz.ignore_illuminance_report,
            fz.ignore_time_read],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_auto_off, tz.xiaomi_led_disabled_night,
            tz.xiaomi_overload_protection],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.current(), e.consumer_connected(), e.led_disabled_night(),
            e.power_outage_memory(), exposes.binary('auto_off', ea.STATE_SET, true, false)
                .withDescription('Turn the device automatically off when attached device consumes less than 2W for 20 minutes'),
            exposes.numeric('overload_protection', exposes.access.ALL).withValueMin(100).withValueMax(2300).withUnit('W')
                .withDescription('Maximum allowed load, turns off if exceeded')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.plug.maus01'],
        model: 'ZNCZ12LM',
        description: 'Mi power plug ZigBee US',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.aqara_opple, fz.xiaomi_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_auto_off, tz.xiaomi_led_disabled_night,
            tz.xiaomi_overload_protection],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.current(), e.consumer_connected(), e.led_disabled_night(),
            e.power_outage_memory(), exposes.binary('auto_off', ea.STATE_SET, true, false)
                .withDescription('Turn the device automatically off when attached device consumes less than 2W for 20 minutes'),
            exposes.numeric('overload_protection', exposes.access.ALL).withValueMin(100).withValueMax(2300).withUnit('W')
                .withDescription('Maximum allowed load, turns off if exceeded')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.plug.maeu01'],
        model: 'SP-EUC01',
        description: 'Aqara EU smart plug',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_basic, fz.electrical_measurement, fz.metering,
            fz.aqara_opple, fz.xiaomi_power, fz.device_temperature],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);

            // Not all plugs support electricity measurements:
            // - https://github.com/Koenkk/zigbee2mqtt/issues/6861
            // - https://github.com/Koenkk/zigbee-herdsman-converters/issues/1050#issuecomment-673111969
            // Voltage and current are not supported:
            // - https://github.com/Koenkk/zigbee-herdsman-converters/issues/1050
            try {
                await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement']);
                await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            } catch (e) {
                logger.warn(`SP-EUC01 failed to setup electricity measurements (${e.message})`);
                logger.debug(e.stack);
            }
            try {
                await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
                await reporting.readMeteringMultiplierDivisor(endpoint);
                await reporting.currentSummDelivered(endpoint, {change: 0});
            } catch (e) {
                logger.warn(`SP-EUC01 failed to setup metering (${e.message})`);
                logger.debug(e.stack);
            }
        },
        onEvent: async (type, data, device) => {
            const switchEndpoint = device.getEndpoint(1);
            if (switchEndpoint == null) {
                return;
            }

            // This device doesn't support temperature reporting.
            // Therefore we read the temperature every 30 min.
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await switchEndpoint.read('genDeviceTempCfg', ['currentTemperature']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 1800000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
        exposes: [e.switch(), e.power(), e.energy(), e.power_outage_memory(),
            e.voltage().withAccess(ea.STATE), e.current(),
            e.device_temperature().withDescription('Device temperature (polled every 30 min)')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.plug.aq1'],
        model: 'ZNCZ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara power plug ZigBee',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.ignore_occupancy_report, fz.xiaomi_basic],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_led_disabled_night,
            tz.xiaomi_switch_power_outage_memory, tz.xiaomi_auto_off],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature(), e.voltage().withAccess(ea.STATE),
            e.power_outage_memory(), e.led_disabled_night(),
            exposes.binary('auto_off', ea.STATE_SET, true, false)
                .withDescription('If the power is constantly lower than 2W within half an hour, ' +
                    'the plug will be automatically turned off')],
        onEvent: async (type, data, device) => {
            device.skipTimeResponse = true;
            // According to the Zigbee the genTime.time should be the seconds since 1 January 2020 UTC
            // However the device expects this to be the seconds since 1 January in the local time zone.
            // Disable the responses of zigbee-herdsman and respond here instead.
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/2843#issuecomment-888532667
            if (type === 'message' && data.type === 'read' && data.cluster === 'genTime') {
                const oneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();
                const secondsUTC = Math.round(((new Date()).getTime() - oneJanuary2000) / 1000);
                const secondsLocal = secondsUTC - (new Date()).getTimezoneOffset() * 60;
                device.getEndpoint(1).readResponse('genTime', data.meta.zclTransactionSequenceNumber, {time: secondsLocal});
            }
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_86plug', 'lumi.ctrl_86plug.aq1'],
        model: 'QBCZ11LM',
        description: 'Aqara socket Zigbee',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_basic],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.power_outage_memory()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sensor_smoke'],
        model: 'JTYJ-GD-01LM/BW',
        description: 'MiJia Honeywell smoke detector',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4020RT'}],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.JTYJGD01LMBW_smoke],
        toZigbee: [tz.JTQJBF01LMBW_JTYJGD01LMBW_sensitivity, tz.JTQJBF01LMBW_JTYJGD01LMBW_selfest],
        exposes: [
            e.smoke(), e.battery_low(), e.tamper(), e.battery(), exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']),
            exposes.numeric('smoke_density', ea.STATE), exposes.enum('selftest', ea.SET, ['']), e.battery_voltage(),
            exposes.binary('test', ea.STATE, true, false).withDescription('Test mode activated'), e.device_temperature(),
            e.power_outage_count(false),
        ],
    },
    {
        zigbeeModel: ['lumi.sensor_natgas'],
        model: 'JTQJ-BF-01LM/BW',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4019RT'}],
        description: 'MiJia gas leak detector ',
        fromZigbee: [fz.ias_gas_alarm_1, fz.JTQJBF01LMBW_sensitivity, fz.JTQJBF01LMBW_gas_density],
        toZigbee: [tz.JTQJBF01LMBW_JTYJGD01LMBW_sensitivity, tz.JTQJBF01LMBW_JTYJGD01LMBW_selfest],
        exposes: [
            e.gas(), e.battery_low(), e.tamper(), exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']),
            exposes.numeric('gas_density', ea.STATE), exposes.enum('selftest', ea.SET, ['']),
        ],
    },
    {
        zigbeeModel: ['lumi.sensor_gas.acn02'],
        model: 'JT-BZ-01AQ/A',
        vendor: 'Xiaomi',
        description: 'Aqara smart natural gas detector',
        fromZigbee: [fz.aqara_opple],
        toZigbee: [tz.aqara_alarm, tz.aqara_density, tz.JTBZ01AQA_gas_sensitivity, tz.aqara_selftest, tz.aqara_buzzer,
            tz.aqara_buzzer_manual, tz.aqara_linkage_alarm, tz.JTBZ01AQA_state, tz.aqara_power_outage_count],
        exposes: [e.gas().withAccess(ea.STATE_GET),
            exposes.numeric('gas_density', ea.STATE_GET).withUnit('%LEL').withDescription('Value of gas concentration'),
            exposes.enum('gas_sensitivity', ea.ALL, ['10%LEL', '15%LEL']).withDescription('Gas concentration value at which ' +
                'an alarm is triggered ("10%LEL" is more sensitive than "15%LEL")'),
            exposes.enum('selftest', ea.SET, ['selftest']).withDescription('Starts the self-test process (checking the indicator ' +
                'light and buzzer work properly)'),
            exposes.binary('test', ea.STATE, true, false).withDescription('Self-test in progress'),
            exposes.enum('buzzer', ea.SET, ['mute', 'alarm']).withDescription('The buzzer can be muted and alarmed manually. ' +
                'During a gas alarm, the buzzer can be manually muted for 10 minutes ("mute"), but cannot be unmuted manually ' +
                'before this timeout expires. The buzzer cannot be pre-muted, as this function only works during a gas alarm. ' +
                'During the absence of a gas alarm, the buzzer can be manually alarmed ("alarm") and disalarmed ("mute")'),
            exposes.binary('buzzer_manual_alarm', ea.STATE_GET, true, false).withDescription('Buzzer alarmed (manually)'),
            exposes.binary('buzzer_manual_mute', ea.STATE_GET, true, false).withDescription('Buzzer muted (manually)'),
            exposes.binary('linkage_alarm', ea.ALL, true, false).withDescription('When this option is enabled and a gas ' +
                'alarm has occurred, then "linkage_alarm_state"=true, and when the gas alarm has ended or the buzzer has ' +
                'been manually muted, then "linkage_alarm_state"=false'),
            exposes.binary('linkage_alarm_state', ea.STATE, true, false).withDescription('"linkage_alarm" is triggered'),
            exposes.binary('state', ea.STATE_GET, 'preparation', 'work').withDescription('"Preparation" or "work" ' +
                '(measurement of the gas concentration value and triggering of an alarm are only performed in the "work" state)'),
            e.power_outage_count().withAccess(ea.STATE_GET)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('aqaraOpple', [0x013a], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x013b], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x013d], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0126], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0139], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x010c], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x014b], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0002], {manufacturerCode: 0x115f});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sensor_smoke.acn03'],
        model: 'JY-GZ-01AQ',
        vendor: 'Xiaomi',
        description: 'Aqara smart smoke detector',
        fromZigbee: [fz.aqara_opple, fz.battery],
        toZigbee: [tz.aqara_alarm, tz.aqara_density, tz.aqara_selftest, tz.aqara_buzzer, tz.aqara_buzzer_manual,
            tz.JYGZ01AQ_heartbeat_indicator, tz.aqara_linkage_alarm],
        exposes: [e.smoke().withAccess(ea.STATE_GET),
            exposes.numeric('smoke_density', ea.STATE_GET).withDescription('Value of smoke concentration'),
            exposes.numeric('smoke_density_dbm', ea.STATE_GET).withUnit('dB/m').withDescription('Value of smoke concentration in dB/m'),
            exposes.enum('selftest', ea.SET, ['selftest']).withDescription('Starts the self-test process (checking the indicator ' +
                'light and buzzer work properly)'),
            exposes.binary('test', ea.STATE, true, false).withDescription('Self-test in progress'),
            exposes.enum('buzzer', ea.SET, ['mute', 'alarm']).withDescription('The buzzer can be muted and alarmed manually. ' +
                'During a smoke alarm, the buzzer can be manually muted for 80 seconds ("mute") and unmuted ("alarm"). ' +
                'The buzzer cannot be pre-muted, as this function only works during a smoke alarm. ' +
                'During the absence of a smoke alarm, the buzzer can be manually alarmed ("alarm") and disalarmed ("mute")'),
            exposes.binary('buzzer_manual_alarm', ea.STATE_GET, true, false).withDescription('Buzzer alarmed (manually)'),
            exposes.binary('buzzer_manual_mute', ea.STATE_GET, true, false).withDescription('Buzzer muted (manually)'),
            exposes.binary('heartbeat_indicator', ea.ALL, true, false).withDescription('When this option is enabled then in ' +
                'the normal monitoring state, the green indicator light flashes every 60 seconds'),
            exposes.binary('linkage_alarm', ea.ALL, true, false).withDescription('When this option is enabled and a smoke ' +
                'alarm has occurred, then "linkage_alarm_state"=true, and when the smoke alarm has ended or the buzzer has ' +
                'been manually muted, then "linkage_alarm_state"=false'),
            exposes.binary('linkage_alarm_state', ea.STATE, true, false).withDescription('"linkage_alarm" is triggered'),
            e.battery(), e.battery_voltage(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('aqaraOpple', [0x013a], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x013b], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x013c], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x013d], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0126], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x014b], {manufacturerCode: 0x115f});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.lock.v1'],
        model: 'A6121',
        vendor: 'Xiaomi',
        description: 'Vima Smart Lock',
        fromZigbee: [fz.xiaomi_lock_report],
        exposes: [exposes.text('inserted', ea.STATE)],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.vibration.aq1'],
        model: 'DJT11LM',
        vendor: 'Xiaomi',
        description: 'Aqara vibration sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_basic, fz.DJT11LM_vibration],
        toZigbee: [tz.DJT11LM_vibration_sensitivity],
        exposes: [
            e.battery(), e.device_temperature(), e.vibration(), e.action(['vibration', 'tilt', 'drop']),
            exposes.numeric('strength', ea.STATE), exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']),
            e.angle_axis('angle_x'), e.angle_axis('angle_y'), e.angle_axis('angle_z'), e.battery_voltage(), e.power_outage_count(false),
        ],
    },
    {
        zigbeeModel: ['lumi.vibration.agl01'],
        model: 'DJT12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 vibration sensor',
        fromZigbee: [fz.DJT12LM_vibration],
        exposes: [e.action(['vibration'])],
        toZigbee: [],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.curtain'],
        model: 'ZNCLDJ11LM',
        description: 'Aqara curtain motor',
        vendor: 'Xiaomi',
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_curtain_position, fz.xiaomi_curtain_position_tilt],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.xiaomi_curtain_options],
        exposes: [e.cover_position().setAccess('state', ea.ALL),
            exposes.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not'),
            exposes.enum('motor_state', ea.STATE, ['stopped', 'opening', 'closing'])
                .withDescription('Motor state')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.curtain.aq2'],
        model: 'ZNGZDJ11LM',
        description: 'Aqara roller shade motor',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'SRSC-M01'}],
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_curtain_position, fz.xiaomi_curtain_position_tilt],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.xiaomi_curtain_options],
        exposes: [e.cover_position().setAccess('state', ea.ALL),
            exposes.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.curtain.hagl04'],
        model: 'ZNCLDJ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara B1 curtain motor',
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_curtain_position, fz.xiaomi_curtain_position_tilt, fz.xiaomi_curtain_hagl04_status],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.xiaomi_curtain_options],
        onEvent: async (type, data, device) => {
            // The position (genAnalogOutput.presentValue) reported via an attribute contains an invaid value
            // however when reading it will provide the correct value.
            if (data.type === 'attributeReport' && data.cluster === 'genAnalogOutput') {
                await device.endpoints[0].read('genAnalogOutput', ['presentValue']);
            }
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.battery(),
            exposes.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not'),
            exposes.enum('motor_state', ea.STATE, ['closing', 'opening', 'stop'])
                .withDescription('The current state of the motor.'), e.power_outage_count()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.curtain.acn002'],
        model: 'ZNJLBL01LM',
        description: 'Aqara roller shade companion E1',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'RSD-M01'}],
        fromZigbee: [fz.xiaomi_curtain_position, fz.xiaomi_curtain_acn002_status, fz.ignore_basic_report, fz.aqara_opple],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.xiaomi_curtain_acn002_battery, tz.xiaomi_curtain_acn002_charging_status],
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'attributeReport' && data.cluster === 'genMultistateOutput' &&
                data.data.hasOwnProperty('presentValue') && data.data['presentValue'] > 1) {
                // Try to read the position after the motor stops, the device occasionally report wrong data right after stopping
                // Might need to add delay, seems to be working without one but needs more tests.
                await device.getEndpoint(1).read('genAnalogOutput', ['presentValue']);
            }
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.battery().withAccess(ea.STATE_GET), e.device_temperature(),
            exposes.binary('charging_status', ea.STATE_GET, true, false)
                .withDescription('The current charging status.'),
            exposes.enum('motor_state', ea.STATE, ['declining', 'rising', 'pause', 'blocked'])
                .withDescription('The current state of the motor.'),
            exposes.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not')],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Battery';
            device.save();
            const endpoint = device.getEndpoint(1);
            await endpoint.read('aqaraOpple', [0x040a], {manufacturerCode: 0x115f});
        },
        ota: ota.zigbeeOTA,
    },
    {
        // 'lumi.curtain.acn003' - CN version (ZNCLBL01LM), 'lumi.curtain.agl001' - global version (CM-M01)
        zigbeeModel: ['lumi.curtain.acn003', 'lumi.curtain.agl001'],
        model: 'ZNCLBL01LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'CM-M01'}],
        description: 'Aqara curtain driver E1',
        fromZigbee: [fz.battery, fz.xiaomi_curtain_position_tilt, fz.aqara_opple, fz.power_source],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.ZNCLBL01LM_battery_voltage, tz.ZNCLBL01LM_hooks_state,
            tz.power_source, tz.battery_percentage_remaining],
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.battery().withAccess(ea.STATE_GET),
            e.battery_voltage().withAccess(ea.STATE_GET),
            e.device_temperature(),
            e.action(['manual_open', 'manual_close']),
            exposes.enum('motor_state', ea.STATE, ['stopped', 'opening', 'closing', 'pause'])
                .withDescription('Motor state'),
            exposes.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not'),
            exposes.enum('hooks_state', ea.STATE_GET, ['unlocked', 'locked', 'locking', 'unlocking'])
                .withDescription('Hooks state'),
            exposes.numeric('target_position', ea.STATE).withUnit('%').withDescription('Target position'),
            exposes.enum('power_source', ea.STATE_GET, ['battery', 'dc_source']).withDescription('The current power source'),
            exposes.binary('charging', ea.STATE_GET, true, false).withDescription('The current charging state')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            await endpoint.read('aqaraOpple', [0x040B], {manufacturerCode: 0x115f});
            await endpoint.read('aqaraOpple', [0x0428], {manufacturerCode: 0x115f});
            await endpoint.read('genBasic', ['powerSource']);
            await endpoint.read('closuresWindowCovering', ['currentPositionLiftPercentage']);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.relay.c2acn01'],
        model: 'LLKZMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless relay controller',
        fromZigbee: [fz.xiaomi_basic, fz.xiaomi_power, fz.ignore_multistate_report, fz.on_off, fz.xiaomi_basic_raw],
        meta: {multiEndpoint: true},
        toZigbee: [tz.on_off, tz.LLKZMK11LM_interlock, tz.xiaomi_power, tz.xiaomi_switch_power_outage_memory],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        exposes: [e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature(), e.voltage(), e.current(),
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power_outage_count(false),
            e.power_outage_memory(),
            exposes.binary('interlock', ea.STATE_SET, true, false)
                .withDescription('Enabling prevents both relais being on at the same time'),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.lock.acn02'],
        model: 'ZNMS12LM',
        description: 'Aqara S2 lock',
        vendor: 'Xiaomi',
        fromZigbee: [fz.xiaomi_basic, fz.ZNMS12LM_ZNMS13LM_closuresDoorLock_report, fz.ZNMS12LM_low_battery],
        toZigbee: [],
        exposes: [
            e.battery(), e.battery_voltage(), e.battery_low(), exposes.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        meta: {battery: {voltageToPercentage: '4LR6AA1_5v'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.lock.acn03'],
        model: 'ZNMS13LM',
        description: 'Aqara S2 lock pro',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNMS12LM_ZNMS13LM_closuresDoorLock_report, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [
            exposes.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.lock.aq1'],
        model: 'ZNMS11LM',
        description: 'Xiaomi Aqara smart lock',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNMS11LM_closuresDoorLock_report, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [
            exposes.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.remote.b286opcn01'],
        model: 'WXCJKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 1 band',
        fromZigbee: [fz.aqara_opple_on, fz.aqara_opple_off, fz.battery, fz.aqara_opple_multistate, fz.aqara_opple],
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
        ]), exposes.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['lumi.remote.b486opcn01'],
        model: 'WXCJKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 2 bands',
        fromZigbee: [fz.aqara_opple_on, fz.aqara_opple_off, fz.aqara_opple_step, fz.aqara_opple_step_color_temp, fz.battery,
            fz.aqara_opple_multistate, fz.aqara_opple],
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
            'button_3_hold', 'button_3_release', 'button_3_single', 'button_3_double', 'button_3_triple',
            'button_4_hold', 'button_4_release', 'button_4_single', 'button_4_double', 'button_4_triple',
        ]), exposes.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg',
            ]);
        },
    },
    {
        zigbeeModel: ['lumi.remote.b686opcn01'],
        model: 'WXCJKG13LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 3 bands',
        fromZigbee: [fz.aqara_opple_on, fz.aqara_opple_off, fz.aqara_opple_step, fz.aqara_opple_move, fz.aqara_opple_stop,
            fz.aqara_opple_step_color_temp, fz.aqara_opple_move_color_temp, fz.battery, fz.aqara_opple_multistate, fz.aqara_opple],
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
            'button_3_hold', 'button_3_release', 'button_3_single', 'button_3_double', 'button_3_triple',
            'button_4_hold', 'button_4_release', 'button_4_single', 'button_4_double', 'button_4_triple',
            'button_5_hold', 'button_5_release', 'button_5_single', 'button_5_double', 'button_5_triple',
            'button_6_hold', 'button_6_release', 'button_6_single', 'button_6_double', 'button_6_triple',
        ]), exposes.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)'),
        e.power_outage_count(false)],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg',
            ]);
        },
    },
    {
        zigbeeModel: ['lumi.sen_ill.mgl01'],
        model: 'GZCGQ01LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4043GL'}],
        description: 'MiJia light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance, fz.aqara_opple],
        toZigbee: [tz.illuminance],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint, {min: 15, max: constants.repInterval.HOUR, change: 500});
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        exposes: [e.battery(), e.battery_voltage(), e.illuminance().withAccess(ea.STATE_GET),
            e.illuminance_lux().withAccess(ea.STATE_GET), e.power_outage_count(false)],
    },
    {
        zigbeeModel: ['lumi.light.rgbac1'],
        model: 'ZNTGMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart RGBW light controller',
        extend: extend.light_onoff_brightness_colortemp_color({supportsHS: true}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cbacn1'],
        model: 'HLQDQ01LM',
        vendor: 'Xiaomi',
        description: 'Aqara zigbee LED-controller ',
        extend: extend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.n0agl1'],
        model: 'SSM-U01',
        vendor: 'Xiaomi',
        description: 'Aqara single switch module T1 (with neutral)',
        // Ignore energy metering reports, rely on aqara_opple: https://github.com/Koenkk/zigbee2mqtt/issues/10709
        fromZigbee: [fz.on_off, fz.device_temperature, fz.aqara_opple, fz.ignore_metering, fz.ignore_electrical_measurement,
            fz.xiaomi_power],
        exposes: [e.switch(), e.energy(), e.power(), e.device_temperature(), e.power_outage_memory(), e.power_outage_count(),
            e.switch_type(), e.voltage(), e.current(),
        ],
        toZigbee: [tz.xiaomi_switch_type, tz.on_off, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_led_disabled_night],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);
            device.powerSource = 'Mains (single phase)';
            device.type = 'Router';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.n0acn2'],
        model: 'DLKZMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara single switch module T1 (with neutral)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_type, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_led_disabled_night],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.power_outage_memory(), e.led_disabled_night(), e.switch_type()],
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.l0agl1'],
        model: 'SSM-U02',
        vendor: 'Xiaomi',
        description: 'Aqara single switch module T1 (without neutral). Doesn\'t work as a router and doesn\'t support power meter',
        fromZigbee: [fz.on_off, fz.aqara_opple],
        exposes: [e.switch(), e.power_outage_memory(), e.switch_type(), e.power_outage_count(), e.device_temperature()],
        toZigbee: [tz.xiaomi_switch_type, tz.on_off, tz.xiaomi_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.l0acn1'],
        model: 'DLKZMK12LM',
        vendor: 'Xiaomi',
        description: 'Aqara single switch module T1 (without neutral). Doesn\'t work as a router and doesn\'t support power meter',
        fromZigbee: [fz.on_off, fz.aqara_opple],
        exposes: [e.switch(), e.power_outage_memory(), e.switch_type()],
        toZigbee: [tz.xiaomi_switch_type, tz.on_off, tz.xiaomi_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.n4acn4'],
        model: 'ZNCJMB14LM',
        vendor: 'Xiaomi',
        description: 'Aqara S1 smart touch panel',
        fromZigbee: [fz.on_off, fz.ZNCJMB14LM],
        toZigbee: [tz.on_off, tz.ZNCJMB14LM],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'),
            e.switch().withEndpoint('right'),
            exposes.binary('standby_enabled', ea.STATE_SET, true, false).withDescription('Enable standby'),
            exposes.enum('theme', ea.STATE_SET, ['classic', 'concise']).withDescription('Display theme'),
            exposes.enum('beep_volume', ea.STATE_SET, ['mute', 'low', 'medium', 'high']).withDescription('Beep volume'),
            exposes.numeric('lcd_brightness', ea.STATE_SET).withValueMin(1).withValueMax(100).withUnit('%')
                .withDescription('LCD brightness (will not persist if auto-brightness is enabled)'),
            exposes.enum('language', ea.STATE_SET, ['chinese', 'english']).withDescription('Interface language'),
            exposes.enum('screen_saver_style', ea.STATE_SET, ['classic', 'analog clock']).withDescription('Screen saver style'),
            exposes.numeric('standby_time', ea.STATE_SET).withValueMin(0).withValueMax(65534).withUnit('s')
                .withDescription('Display standby time'),
            exposes.enum('font_size', ea.STATE_SET, ['small', 'medium', 'large']).withDescription('Display font size'),
            exposes.binary('lcd_auto_brightness_enabled', ea.STATE_SET, true, false).withDescription('Enable LCD auto brightness'),
            exposes.enum('homepage', ea.STATE_SET, ['scene', 'feel', 'thermostat', 'switch']).withDescription('Default display homepage'),
            exposes.binary('screen_saver_enabled', ea.STATE_SET, true, false).withDescription('Enable screen saver'),
            exposes.numeric('standby_lcd_brightness', ea.STATE_SET).withValueMin(1).withValueMax(100).withUnit('%')
                .withDescription('Standby LCD brightness'),
            exposes.enum('available_switches', ea.STATE_SET, ['none', '1', '2', '3', '1 and 2', '1 and 3', '2 and 3', 'all'])
                .withDescription('Control which switches are available in the switches screen (none disables switches screen)'),
            exposes.composite('switch_1_text_icon', 'switch_1_text_icon').withDescription('Switch 1 text and icon')
                .withFeature(exposes.enum('switch_1_icon', ea.STATE_SET, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
                    .withDescription('Icon'))
                .withFeature(exposes.text('switch_1_text', ea.STATE_SET)
                    .withDescription('Text')),
            exposes.composite('switch_2_text_icon', 'switch_2_text_icon').withDescription('Switch 2 text and icon')
                .withFeature(exposes.enum('switch_2_icon', ea.STATE_SET, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
                    .withDescription('Icon'))
                .withFeature(exposes.text('switch_2_text', ea.STATE_SET)
                    .withDescription('Text')),
            exposes.composite('switch_3_text_icon', 'switch_3_text_icon').withDescription('Switch 3 text and icon')
                .withFeature(exposes.enum('switch_3_icon', ea.STATE_SET, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
                    .withDescription('Icon'))
                .withFeature(exposes.text('switch_3_text', ea.STATE_SET)
                    .withDescription('Text'))],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            // await reporting.onOff(device.getEndpoint(2)); ToDo: Currently fails
            // await reporting.onOff(device.getEndpoint(3)); ToDo: Currently fails
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.remote.b28ac1'],
        model: 'WXKG15LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'WRS-R02'}],
        description: 'Aqara wireless remote switch H1 (double rocker)',
        fromZigbee: [fz.battery, fz.xiaomi_multistate_action, fz.aqara_opple, fz.command_toggle],
        toZigbee: [tz.xiaomi_switch_click_mode, tz.aqara_opple_operation_mode],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}, multiEndpoint: true},
        exposes: [
            e.battery(), e.battery_voltage(), e.action([
                'single_left', 'single_right', 'single_both',
                'double_left', 'double_right', 'double_both',
                'triple_left', 'triple_right', 'triple_both',
                'hold_left', 'hold_right', 'hold_both']),
            exposes.enum('click_mode', ea.ALL, ['fast', 'multi'])
                .withDescription('Click mode, fast: only supports single click which will be send immediately after clicking.' +
                    'multi: supports more events like double and hold'),
            exposes.enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(3);
            // set "event" mode
            await endpoint1.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            // turn on the "multiple clicks" mode, otherwise the only "single click" events.
            // if value is 1 - there will be single clicks, 2 - multiple.
            await endpoint1.write('aqaraOpple', {0x0125: {value: 0x02, type: 0x20}}, {manufacturerCode: 0x115f});
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            // TODO/BUG:
            // Did not understand how to separate the left and right keys in command mode -
            // the "toggleCommand" always arrives from the first endpoint
        },
    },
    {
        zigbeeModel: ['lumi.switch.b1lc04'],
        model: 'QBKG38LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 1 gang switch (without neutral)',
        fromZigbee: [fz.on_off, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.aqara_switch_mode_switch, tz.xiaomi_flip_indicator_light],
        exposes: [e.switch(), e.power_outage_memory(), e.action(['single', 'double']),
            e.device_temperature(), e.flip_indicator_light(),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for button'),
            exposes.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.')],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b2lc04'],
        model: 'QBKG39LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 2 gang switch (without neutral)',
        fromZigbee: [fz.on_off, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.aqara_switch_mode_switch, tz.xiaomi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.device_temperature(),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            exposes.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both']),
            e.power_outage_memory(), e.flip_indicator_light(),
        ],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.airmonitor.acn01'],
        model: 'VOCKQJK11LM',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'AAQS-S01'}],
        description: 'Aqara TVOC air quality monitor',
        fromZigbee: [fz.xiaomi_tvoc, fz.battery, fz.temperature, fz.humidity, fz.aqara_opple],
        toZigbee: [tzLocal.VOCKQJK11LM_display_unit],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.temperature(), e.humidity(), e.voc(), e.device_temperature(), e.battery(), e.battery_voltage(),
            exposes.enum('display_unit', ea.ALL, ['mgm3_celsius', 'ppb_celsius', 'mgm3_fahrenheit', 'ppb_fahrenheit'])
                .withDescription('Units to show on the display')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genAnalogInput'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.humidity(endpoint);
            await reporting.temperature(endpoint);
            const payload = reporting.payload('presentValue', 10, constants.repInterval.HOUR, 5);
            await endpoint.configureReporting('genAnalogInput', payload);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b2nc01'],
        model: 'QBKG41LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 2 gang switch (with neutral)',
        fromZigbee: [fz.on_off, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both']),
            e.power_outage_memory(), e.device_temperature(), e.flip_indicator_light(),
        ],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.plug.macn01'],
        model: 'ZNCZ15LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart plug T1 (china standard)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_led_disabled_night,
            tz.xiaomi_overload_protection, tz.xiaomi_socket_button_lock],
        exposes: [e.switch(), e.power().withAccess(ea.STATE), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.current(), e.consumer_connected().withAccess(ea.STATE),
            e.power_outage_memory(), e.led_disabled_night(), e.button_lock(),
            exposes.numeric('overload_protection', exposes.access.ALL).withValueMin(100).withValueMax(2500).withUnit('W')
                .withDescription('Maximum allowed load, turns off if exceeded')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.b1nc01'],
        model: 'QBKG40LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 1 gang switch (with neutral)',
        fromZigbee: [fz.on_off, fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode_opple, tz.xiaomi_switch_power_outage_memory,
            tz.xiaomi_flip_indicator_light],
        exposes: [e.switch(), e.action(['single', 'double']), e.power_outage_memory(), e.device_temperature(), e.flip_indicator_light(),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode')],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.remote.b1acn02'],
        model: 'WXKG13LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 wireless mini switch',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.battery, fz.aqara_opple_multistate, fz.aqara_opple],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'triple', 'quintuple', 'hold', 'release', 'many'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
    },
    {
        zigbeeModel: ['lumi.sen_ill.agl01'],
        model: 'GZCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance, fz.aqara_opple],
        toZigbee: [tz.GZCGQ11LM_detection_period],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.battery_voltage(), e.illuminance(), e.illuminance_lux(),
            exposes.numeric('detection_period', exposes.access.ALL).withValueMin(1).withValueMax(59).withUnit('s')
                .withDescription('Time interval in seconds to report after light changes')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await device.getEndpoint(1).write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
            await endpoint.read('aqaraOpple', [0x0000], {manufactureCode: 0x115f});
        },
    },
    {
        zigbeeModel: ['lumi.plug.sacn03'],
        model: 'QBCZ15LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall outlet H1 (USB)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_led_disabled_night,
            tz.xiaomi_button_switch_mode, tz.xiaomi_overload_protection, tz.xiaomi_socket_button_lock],
        meta: {multiEndpoint: true},
        endpoint: () => {
            return {'relay': 1, 'usb': 2};
        },
        exposes: [
            e.switch().withEndpoint('relay'), e.switch().withEndpoint('usb'),
            e.power().withAccess(ea.STATE), e.energy(), e.device_temperature().withAccess(ea.STATE), e.voltage().withAccess(ea.STATE),
            e.current(), e.power_outage_memory(), e.led_disabled_night(), e.button_lock(),
            exposes.enum('button_switch_mode', exposes.access.ALL, ['relay', 'relay_and_usb'])
                .withDescription('Control both relay and usb or only the relay with the physical switch button'),
            exposes.numeric('overload_protection', exposes.access.ALL).withValueMin(100).withValueMax(2500).withUnit('W')
                .withDescription('Maximum allowed load, turns off if exceeded')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.magnet.agl02'],
        model: 'MCCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 door & window contact sensor',
        fromZigbee: [fz.xiaomi_contact, fz.aqara_opple],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.plug.sacn02'],
        model: 'QBCZ14LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall outlet T1',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.aqara_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_led_disabled_night,
            tz.xiaomi_overload_protection, tz.xiaomi_socket_button_lock],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE), e.energy(),
            e.device_temperature().withAccess(ea.STATE), e.voltage().withAccess(ea.STATE),
            e.current(), e.power_outage_memory(), e.led_disabled_night(), e.button_lock(),
            exposes.numeric('overload_protection', exposes.access.ALL).withValueMin(100).withValueMax(2500).withUnit('W')
                .withDescription('Maximum allowed load, turns off if exceeded')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.remote.rkba01'],
        model: 'ZNXNKG02LM',
        vendor: 'Xiaomi',
        description: 'Aqara knob H1 (wireless)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.battery_voltage(),
            e.action(['single', 'double', 'hold', 'release', 'start_rotating', 'rotation', 'stop_rotating']),
            exposes.enum('operation_mode', ea.ALL, ['event', 'command']).withDescription('Button mode'),
            exposes.numeric('action_rotation_angle', ea.STATE).withUnit('*').withDescription('Rotation angle'),
            exposes.numeric('action_rotation_angle_speed', ea.STATE).withUnit('*').withDescription('Rotation angle speed'),
            exposes.numeric('action_rotation_percent', ea.STATE).withUnit('%').withDescription('Rotation percent'),
            exposes.numeric('action_rotation_percent_speed', ea.STATE).withUnit('%').withDescription('Rotation percent speed'),
            exposes.numeric('action_rotation_time', ea.STATE).withUnit('ms').withDescription('Rotation time'),
        ],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_basic, fz.aqara_opple, fz.aqara_knob_rotation],
        toZigbee: [tz.aqara_opple_operation_mode],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
        },
    },
    {
        zigbeeModel: ['lumi.remote.acn003'],
        model: 'WXKG16LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless remote switch E1 (single rocker)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.xiaomi_switch_click_mode],
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'hold']),
            exposes.enum('click_mode', ea.ALL, ['fast', 'multi'])
                .withDescription('Click mode, fast: only supports single click which will be send immediately after clicking.' +
                    'multi: supports more events like double and hold')],
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).write('aqaraOpple', {0x0125: {value: 0x02, type: 0x20}}, {manufacturerCode: 0x115f});
        },
    },
    {
        zigbeeModel: ['lumi.remote.acn004'],
        model: 'WXKG17LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 double key wireless switch',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.battery_voltage(),
            e.action(['single_left', 'single_right', 'single_both', 'double_left', 'double_right', 'hold_left', 'hold_right']),
            // eslint-disable-next-line max-len
            exposes.enum('click_mode', ea.ALL, ['fast', 'multi']).withDescription('Click mode, fast: only supports single click which will be send immediately after clicking, multi: supports more events like double and hold'),
        ],
        fromZigbee: [fz.xiaomi_multistate_action, fz.aqara_opple],
        toZigbee: [tz.xiaomi_switch_click_mode],
        onEvent: preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            // set multiclick mode
            await endpoint1.write('aqaraOpple', {0x0125: {value: 0x02, type: 0x20}}, {manufacturerCode: 0x115f});
        },
    },
    {
        zigbeeModel: ['lumi.remote.b18ac1'],
        model: 'WXKG14LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless remote switch H1 (single rocker)',
        fromZigbee: [fz.xiaomi_multistate_action, fz.aqara_opple, fz.command_toggle],
        toZigbee: [tz.xiaomi_switch_click_mode, tz.aqara_opple_operation_mode],
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'triple', 'hold']),
            exposes.enum('click_mode', ea.ALL, ['fast', 'multi'])
                .withDescription('Click mode, fast: only supports single click which will be send immediately after clicking.' +
                    'multi: supports more events like double and hold'),
            exposes.enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f, disableResponse: true});
            await endpoint1.read('aqaraOpple', [0x0125], {manufacturerCode: 0x115f});
        },
    },
    {
        zigbeeModel: ['lumi.airrtc.agl001'],
        model: 'SRTS-A01',
        vendor: 'Xiaomi',
        description: 'Aqara Smart Radiator Thermostat E1',
        fromZigbee: [fzLocal.aqara_trv, fz.thermostat, fz.battery],
        toZigbee: [tzLocal.aqara_trv, tz.thermostat_occupied_heating_setpoint],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'heat'], ea.ALL)
                .withPreset(['manual', 'away', 'auto']).setAccess('preset', ea.ALL),
            e.temperature_sensor_select(['internal', 'external']).withAccess(ea.ALL),
            exposes.binary('calibrated', ea.STATE, true, false)
                .withDescription('Is the valve calibrated'),
            e.child_lock().setAccess('state', ea.ALL),
            e.window_detection().setAccess('state', ea.ALL),
            exposes.binary('window_open', ea.STATE, true, false),
            e.valve_detection().setAccess('state', ea.ALL),
            e.away_preset_temperature().withAccess(ea.ALL),
            e.battery_voltage(),
            e.battery(),
        ],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('aqaraOpple', [0x040a], {manufacturerCode: 0x115f});
        },
    },
    {
        zigbeeModel: ['lumi.remote.acn007'],
        model: 'WXKG20LM',
        vendor: 'Xiaomi',
        description: 'Aqara E1 wireless mini switch',
        fromZigbee: [fz.battery, fz.aqara_opple_multistate, fz.aqara_opple],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'hold', 'release']),
            e.device_temperature(), e.power_outage_count()],
    },
];
