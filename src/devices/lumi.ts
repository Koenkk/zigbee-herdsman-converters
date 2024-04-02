import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import {
    light, numeric, binary, enumLookup, forceDeviceType,
    temperature, humidity, forcePowerSource, quirkAddEndpointCluster,
    quirkCheckinInterval, customTimeResponse, deviceEndpoints, battery,
} from '../lib/modernExtend';
const e = exposes.presets;
const ea = exposes.access;
import * as globalStore from '../lib/store';
import * as lumi from '../lib/lumi';
const {
    lumiAction, lumiOperationMode, lumiPowerOnBehavior, lumiZigbeeOTA,
    lumiSwitchType, lumiAirQuality, lumiVoc, lumiDisplayUnit, lumiLight,
    lumiOutageCountRestoreBindReporting, lumiElectricityMeter, lumiPower,
    lumiOverloadProtection, lumiLedIndicator, lumiButtonLock, lumiMotorSpeed,
    lumiOnOff, lumiLedDisabledNight, lumiFlipIndicatorLight, lumiPreventReset,
    lumiClickMode, lumiSlider, lumiSetEventMode, lumiSwitchMode, lumiVibration,
} = lumi.modernExtend;
import {Definition} from '../lib/types';
import {logger} from '../lib/logger';

const NS = 'zhc:lumi';
const {manufacturerCode} = lumi;

const definitions: Definition[] = [
    {
        zigbeeModel: ['lumi.flood.acn001'],
        model: 'SJCGQ13LM',
        vendor: 'Aqara',
        description: 'Water leak sensor E1',
        fromZigbee: [fz.ias_water_leak_alarm_1, lumi.fromZigbee.lumi_specific, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery(), e.battery_low(), e.battery_voltage(), e.device_temperature(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.airm.fhac01'],
        model: 'KQJCMB11LM',
        vendor: 'Aqara',
        description: 'Air monitoring panel S1',
        fromZigbee: [fz.temperature, fz.humidity, lumi.fromZigbee.lumi_pm25, lumi.fromZigbee.lumi_co2],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.pm25(), e.co2()],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.magnet.acn001'],
        model: 'MCCGQ14LM',
        vendor: 'Aqara',
        description: 'Door and window sensor E1',
        fromZigbee: [fz.ias_contact_alarm_1, lumi.fromZigbee.lumi_specific, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.contact(), e.battery(), e.battery_low(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        extend: [
            quirkCheckinInterval('1_HOUR'),
            // OTA request: "fieldControl":0, "manufacturerCode":4447, "imageType":10635, no available for now
            // https://github.com/Koenkk/zigbee-OTA/pull/138
            // lumiZigbeeOTA(),
        ],
    },
    {
        zigbeeModel: ['lumi.magnet.ac01'],
        model: 'MCCGQ13LM',
        vendor: 'Aqara',
        description: 'Door and window sensor P1',
        fromZigbee: [lumi.fromZigbee.lumi_contact, fz.ias_contact_alarm_1, lumi.fromZigbee.lumi_specific],
        toZigbee: [lumi.toZigbee.lumi_detection_distance],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.contact(), e.battery(), e.battery_voltage(),
            e.tamper(),
            e.enum('detection_distance', ea.ALL, ['10mm', '20mm', '30mm'])
                .withDescription('The sensor will be considered "off" within the set distance. Please press the device button before setting'),
        ],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.dimmer.rcbac1'],
        model: 'ZNDDMK11LM',
        vendor: 'Aqara',
        description: 'Smart lightstrip driver',
        fromZigbee: [lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific, ...light({colorTemp: {range: undefined}, color: true}).fromZigbee],
        toZigbee: [lumi.toZigbee.lumi_dimmer_mode, lumi.toZigbee.lumi_switch_power_outage_memory,
            ...light({colorTemp: {range: undefined}, color: true}).toZigbee],
        exposes: [e.power(), e.energy(), e.voltage(), e.device_temperature(), e.power_outage_memory(),
            // When in rgbw mode, only one of color and colortemp will be valid, and l2 will be invalid
            // Do not control l2 in rgbw mode
            e.light_brightness_colortemp_colorxy([153, 370]).removeFeature('color_temp_startup').withEndpoint('l1'),
            e.light_brightness_colortemp([153, 370]).removeFeature('color_temp_startup').withEndpoint('l2'),
            e.enum('dimmer_mode', ea.ALL, ['rgbw', 'dual_ct'])
                .withDescription('Switch between rgbw mode or dual color temperature mode')],
        extend: [
            deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            lumiZigbeeOTA(),
        ],
    },
    {
        zigbeeModel: ['lumi.light.aqcn02'],
        model: 'ZNLDP12LM',
        vendor: 'Aqara',
        description: 'Light bulb',
        extend: [lumiLight({colorTemp: true, powerOutageMemory: 'light'}), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.light.acn003'],
        model: 'ZNXDD01LM',
        vendor: 'Aqara',
        description: 'Ceiling light L1-350',
        extend: [lumiLight({colorTemp: true, powerOutageMemory: 'switch'}), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.light.cwac02', 'lumi.light.acn014'],
        model: 'ZNLDP13LM',
        vendor: 'Aqara',
        description: 'Light bulb T1',
        whiteLabel: [{vendor: 'Aqara', model: 'LEDLBT1-L01'}],
        extend: [
            lumiZigbeeOTA(),
            lumiLight({colorTemp: true, powerOutageMemory: 'switch'}),
            forceDeviceType({type: 'Router'}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
        ],
    },
    {
        zigbeeModel: ['lumi.light.cwopcn01'],
        model: 'XDD11LM',
        vendor: 'Aqara',
        description: 'Opple MX960',
        meta: {turnsOffAtBrightness1: true},
        extend: [lumiLight({colorTemp: true, powerOutageMemory: 'switch'}), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.light.cwopcn02'],
        model: 'XDD12LM',
        vendor: 'Aqara',
        description: 'Opple MX650',
        meta: {turnsOffAtBrightness1: true},
        extend: [lumiZigbeeOTA(), lumiLight({colorTemp: true, powerOutageMemory: 'switch'})],
    },
    {
        zigbeeModel: ['lumi.light.cwopcn03'],
        model: 'XDD13LM',
        vendor: 'Aqara',
        description: 'Opple MX480',
        meta: {turnsOffAtBrightness1: true},
        extend: [lumiLight({colorTemp: true, powerOutageMemory: 'switch'}), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.light.cwjwcn01'],
        model: 'JWSP001A',
        vendor: 'Aqara',
        description: 'Jiawen LED Driver & Dimmer',
        extend: [lumiLight({colorTemp: true, powerOutageMemory: 'switch'})],
    },
    {
        zigbeeModel: ['lumi.light.cwjwcn02'],
        model: 'JWDL001A',
        vendor: 'Aqara',
        description: 'Embedded spot led light',
        extend: [lumiLight({colorTemp: true, powerOutageMemory: 'switch'})],
    },
    {
        zigbeeModel: ['lumi.sensor_switch'],
        model: 'WXKG01LM',
        vendor: 'Xiaomi',
        whiteLabel: [
            {vendor: 'Xiaomi', model: 'YTC4040GL'},
            {vendor: 'Xiaomi', model: 'YTC4006CN'},
            {vendor: 'Xiaomi', model: 'YTC4017CN'},
            {vendor: 'Xiaomi', model: 'ZHTZ02LM'}],
        description: 'Mi wireless switch',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_action_WXKG01LM, lumi.legacyFromZigbee.WXKG01LM_click],
        exposes: [e.battery(), e.action(['single', 'double', 'triple', 'quadruple', 'hold', 'release', 'many']), e.battery_voltage(),
            e.power_outage_count(false)],
        toZigbee: [],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq2', 'lumi.remote.b1acn01'],
        model: 'WXKG11LM',
        vendor: 'Aqara',
        description: 'Wireless mini switch',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'triple', 'quadruple', 'hold', 'release']),
            e.device_temperature(), e.power_outage_count()],
        fromZigbee: [lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_basic,
            lumi.legacyFromZigbee.WXKG11LM_click, lumi.legacyFromZigbee.lumi_action_click_multistate],
        toZigbee: [],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq3', 'lumi.sensor_swit'],
        model: 'WXKG12LM',
        vendor: 'Aqara',
        description: 'Wireless mini switch (with gyroscope)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single', 'double', 'hold', 'release', 'shake']), e.battery_voltage()],
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_action_multistate, lumi.legacyFromZigbee.WXKG12LM_action_click_multistate],
        toZigbee: [],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.sensor_86sw1'],
        model: 'WXKG03LM_rev1',
        vendor: 'Aqara',
        description: 'Wireless remote switch (single rocker), 2016 model',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single']), e.battery_voltage()],
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_basic, lumi.legacyFromZigbee.WXKG03LM_click],
        toZigbee: [],
        extend: [quirkCheckinInterval('1_HOUR'), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.remote.b186acn01'],
        model: 'WXKG03LM_rev2',
        vendor: 'Aqara',
        description: 'Wireless remote switch (single rocker), 2018 model',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single', 'double', 'hold']), e.battery_voltage()],
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_basic,
            lumi.legacyFromZigbee.WXKG03LM_click, lumi.legacyFromZigbee.lumi_action_click_multistate],
        toZigbee: [],
        extend: [quirkCheckinInterval('1_HOUR'), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.remote.b186acn02'],
        model: 'WXKG06LM',
        vendor: 'Aqara',
        description: 'Wireless remote switch D1 (single rocker)',
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_action_multistate],
        toZigbee: [],
        exposes: [e.battery(),
            e.action(['single', 'double', 'hold']),
            e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR'), lumiPreventReset()],
        configure: async (device, coordinatorEndpoint) => {
            try {
                const endpoint = device.endpoints[1];
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            } catch (error) {
                // fails for some but device works as expected: https://github.com/Koenkk/zigbee2mqtt/issues/9136
            }
        },
    },
    {
        zigbeeModel: ['lumi.light.acn132'],
        model: 'LGYCDD01LM',
        vendor: 'Aqara',
        whiteLabel: [{vendor: 'Aqara', model: 'RLS-K01D'}],
        description: 'Light strip T1',
        extend: [
            light({effect: false, powerOnBehavior: false, colorTemp: {startup: false, range: [153, 370]}, color: true}),
            lumiPowerOnBehavior(),
            numeric({
                name: 'length',
                valueMin: 1,
                valueMax: 10,
                valueStep: 0.2,
                scale: 5,
                unit: 'm',
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x051b, type: 0x20},
                description: 'LED strip length',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            numeric({
                name: 'min_brightness',
                valueMin: 0,
                valueMax: 99,
                unit: '%',
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x0515, type: 0x20},
                description: 'Minimum brightness level',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            numeric({
                name: 'max_brightness',
                valueMin: 1,
                valueMax: 100,
                unit: '%',
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x0516, type: 0x20},
                description: 'Maximum brightness level',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            binary({
                name: 'audio',
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x051c, type: 0x20},
                description: 'Enabling audio',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            enumLookup({
                name: 'audio_sensitivity',
                lookup: {'low': 0, 'medium': 1, 'high': 2},
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x051e, type: 0x20},
                description: 'Audio sensitivity',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            enumLookup({
                name: 'audio_effect',
                lookup: {'random': 0, 'blink': 1, 'rainbow': 2, 'wave': 3},
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x051d, type: 0x23},
                description: 'Audio effect',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            numeric({
                name: 'preset',
                valueMin: 1,
                valueMax: 32,
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x051f, type: 0x23},
                description: 'Preset index (0-6 default presets)',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            numeric({
                name: 'speed',
                valueMin: 1,
                valueMax: 100,
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x0520, type: 0x20},
                description: 'Effect speed',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            lumiZigbeeOTA(),
        ],
    },
    {
        zigbeeModel: ['lumi.sensor_86sw2', 'lumi.sensor_86sw2.es1'],
        model: 'WXKG02LM_rev1',
        vendor: 'Aqara',
        description: 'Wireless remote switch (double rocker), 2016 model',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single_left', 'single_right', 'single_both']), e.battery_voltage(), e.power_outage_count(false)],
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_basic, lumi.legacyFromZigbee.WXKG02LM_click],
        toZigbee: [],
        extend: [quirkCheckinInterval('1_HOUR'), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.remote.b286acn01'],
        model: 'WXKG02LM_rev2',
        vendor: 'Aqara',
        description: 'Wireless remote switch (double rocker), 2018 model',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.action(['single_left', 'single_right', 'single_both', 'double_left', 'double_right', 'double_both',
            'hold_left', 'hold_right', 'hold_both']), e.battery_voltage()],
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_basic,
            lumi.legacyFromZigbee.WXKG02LM_click, lumi.legacyFromZigbee.WXKG02LM_click_multistate],
        toZigbee: [],
        extend: [quirkCheckinInterval('1_HOUR'), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b1laus01'],
        model: 'WS-USC01',
        vendor: 'Aqara',
        description: 'Smart wall switch (no neutral, single rocker), US',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple,
            lumi.toZigbee.lumi_flip_indicator_light, lumi.toZigbee.lumi_switch_mode_switch, lumi.toZigbee.lumi_switch_power_outage_memory],
        exposes: [e.switch(), e.action(['single', 'double']),
            e.flip_indicator_light(), e.power_outage_memory(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode'),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
            e.power_outage_count(), e.device_temperature().withAccess(ea.STATE)],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b2laus01'],
        model: 'WS-USC02',
        vendor: 'Aqara',
        description: 'Smart wall switch (no neutral, double rocker), US',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [
            tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_flip_indicator_light,
            lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_switch_mode_switch],
        exposes: [
            e.switch().withEndpoint('top'),
            e.switch().withEndpoint('bottom'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for top button')
                .withEndpoint('top'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for bottom button')
                .withEndpoint('bottom'),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription(
                    'Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.',
                ),
            e.power_outage_count(),
            e.device_temperature().withAccess(ea.STATE),
            e.flip_indicator_light(),
            e.power_outage_memory(),
            e.action(['single_top', 'single_bottom', 'single_both', 'double_top', 'double_bottom', 'double_both'])],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write(
                'manuSpecificLumi', {mode: 1}, {manufacturerCode: manufacturerCode, disableResponse: true},
            );
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b1naus01'],
        model: 'WS-USC03',
        vendor: 'Aqara',
        description: 'Smart wall switch (with neutral, single rocker), US',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light],
        exposes: [e.switch(), e.action(['single', 'double']), e.flip_indicator_light(), e.power_outage_count(),
            e.device_temperature().withAccess(ea.STATE),
            e.power().withAccess(ea.STATE_GET), e.energy(), e.voltage(), e.power_outage_memory(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b2naus01'],
        model: 'WS-USC04',
        vendor: 'Aqara',
        description: 'Smart wall switch (with neutral, double rocker), US',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [
            tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light],
        exposes: [
            e.switch().withEndpoint('top'),
            e.switch().withEndpoint('bottom'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for top button')
                .withEndpoint('top'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for bottom button')
                .withEndpoint('bottom'),
            e.power_outage_count(),
            e.device_temperature().withAccess(ea.STATE),
            e.flip_indicator_light(),
            e.power().withAccess(ea.STATE_GET),
            e.energy(),
            e.voltage(),
            e.power_outage_memory(),
            e.action(['single_top', 'single_bottom', 'single_both', 'double_top', 'double_bottom', 'double_both'])],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write(
                'manuSpecificLumi', {mode: 1}, {manufacturerCode: manufacturerCode, disableResponse: true},
            );
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.l1acn1'],
        model: 'QBKG27LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 (no neutral, single rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_action_multistate],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_flip_indicator_light, lumi.toZigbee.lumi_switch_mode_switch],
        exposes: [e.switch(), e.device_temperature(), e.power_outage_memory(), e.led_disabled_night(), e.flip_indicator_light(),
            e.action(['single', 'double']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
            e.power_outage_count(),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription(
                    'Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.l2acn1'],
        model: 'QBKG28LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 (no neutral, double rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light, lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_switch_mode_switch],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.device_temperature(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button').withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button').withEndpoint('right'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both']),
            e.power_outage_memory(), e.flip_indicator_light(), e.led_disabled_night(),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription(
                    'Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.l3acn1'],
        model: 'QBKG29LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 (no neutral, triple rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light, lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_switch_mode_switch],
        meta: {multiEndpoint: true},
        endpoint: (device) => ({left: 1, center: 2, right: 3}),
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            e.power_outage_memory(), e.flip_indicator_light(), e.led_disabled_night(), e.power_outage_count(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for center button')
                .withEndpoint('center'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription(
                    'Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
            e.device_temperature().withAccess(ea.STATE),
            e.action([
                'single_left', 'double_left', 'single_center', 'double_center', 'single_right', 'double_right',
                'single_left_center', 'double_left_center', 'single_left_right', 'double_left_right',
                'single_center_right', 'double_center_right', 'single_all', 'double_all',
            ]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.n1acn1'],
        model: 'QBKG30LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 Pro (with neutral, single rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_action_multistate],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_flip_indicator_light],
        exposes: [e.switch(), e.power(), e.energy(), e.voltage(),
            e.device_temperature(), e.power_outage_memory(), e.led_disabled_night(), e.flip_indicator_light(),
            e.action(['single', 'double']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
            e.power_outage_count()],
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.n2acn1'],
        model: 'QBKG31LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 Pro (with neutral, double rocker)',
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_action_multistate],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_flip_indicator_light],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.power(), e.energy(), e.voltage(),
            e.device_temperature(), e.power_outage_memory(), e.led_disabled_night(), e.flip_indicator_light(),
            e.action([
                'single_left', 'single_right', 'single_both',
                'double_left', 'double_right', 'double_both']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button').withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button').withEndpoint('right'),
            e.power_outage_count()],
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.n3acn1'],
        model: 'QBKG32LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 Pro (with neutral, triple rocker)',
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_action_multistate],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_flip_indicator_light],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.switch().withEndpoint('center'),
            e.power(), e.energy(), e.voltage(), e.device_temperature(), e.power_outage_memory(), e.led_disabled_night(), e.flip_indicator_light(),
            e.action([
                'single_left', 'double_left', 'single_center', 'double_center',
                'single_right', 'double_right', 'single_left_center', 'double_left_center',
                'single_left_right', 'double_left_right', 'single_center_right', 'double_center_right',
                'single_all', 'double_all']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button').withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button').withEndpoint('right'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for center button').withEndpoint('center'),
            e.power_outage_count()],
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.l1aeu1'],
        model: 'WS-EUK01',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 EU (no neutral, single rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light, lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_switch_mode_switch],
        exposes: [e.switch(), e.action(['single', 'double']), e.power_outage_memory(), e.flip_indicator_light(),
            e.led_disabled_night(), e.power_outage_count(), e.device_temperature().withAccess(ea.STATE),
            e.operation_mode_select(['control_relay', 'decoupled']).withDescription('Switches between direct relay control and action sending only'),
            e.mode_switch_select(['anti_flicker_mode', 'quick_mode'])
                .withDescription('Features. Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.l2aeu1'],
        model: 'WS-EUK02',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 EU (no neutral, double rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light, lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_switch_mode_switch],
        meta: {multiEndpoint: true},
        endpoint: (_device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.power_outage_memory(),
            e.flip_indicator_light(), e.led_disabled_night(), e.power_outage_count(),
            e.device_temperature().withAccess(ea.STATE),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both'])],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.n1aeu1'],
        model: 'WS-EUK03',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 EU (with neutral, single rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light, lumi.toZigbee.lumi_led_disabled_night],
        exposes: [e.switch(), e.action(['single', 'double']), e.power().withAccess(ea.STATE_GET), e.energy(), e.flip_indicator_light(),
            e.power_outage_memory(), e.device_temperature().withAccess(ea.STATE), e.led_disabled_night(), e.power_outage_count(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.n2aeu1'],
        model: 'WS-EUK04',
        vendor: 'Aqara',
        description: 'Smart wall switch H1 EU (with neutral, double rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light, lumi.toZigbee.lumi_led_disabled_night],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.power().withAccess(ea.STATE_GET), e.energy(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both']),
            e.device_temperature().withAccess(ea.STATE), e.power_outage_memory(), e.flip_indicator_light(),
            e.led_disabled_night(), e.power_outage_count()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            // set "event" mode
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral1'],
        model: 'QBKG04LM',
        vendor: 'Aqara',
        description: 'Smart wall switch (no neutral, single rocker)',
        fromZigbee: [lumi.fromZigbee.lumi_on_off, lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_operation_mode_basic,
            lumi.legacyFromZigbee.QBKG04LM_QBKG11LM_click],
        exposes: [
            e.switch(), e.action(['release', 'hold', 'double', 'single', 'hold_release']),
            e.enum('operation_mode', ea.STATE_SET, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
        ],
        toZigbee: [tz.on_off, {...lumi.toZigbee.lumi_switch_operation_mode_basic, convertGet: null}],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.ctrl_ln1.aq1', 'lumi.ctrl_ln1'],
        model: 'QBKG11LM',
        vendor: 'Aqara',
        description: 'Smart wall switch (with neutral, single rocker)',
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_on_off,
            lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_operation_mode_basic,
            fz.ignore_multistate_report, lumi.fromZigbee.lumi_power, lumi.legacyFromZigbee.QBKG04LM_QBKG11LM_click,
            lumi.legacyFromZigbee.QBKG11LM_click,
        ],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.device_temperature(), e.energy(),
            e.action(['single', 'double', 'release', 'hold']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
        ],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_basic, lumi.toZigbee.lumi_power],
        endpoint: (device) => {
            return {'system': 1};
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral2'],
        model: 'QBKG03LM',
        vendor: 'Aqara',
        description: 'Smart wall switch (no neutral, double rocker)',
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_on_off,
            lumi.fromZigbee.lumi_operation_mode_basic, lumi.fromZigbee.lumi_basic, lumi.legacyFromZigbee.QBKG03LM_QBKG12LM_click,
            lumi.legacyFromZigbee.QBKG03LM_buttons,
        ],
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.device_temperature(),
            e.action(['release_left', 'release_right', 'release_both', 'double_left', 'double_right',
                'single_left', 'single_right', 'hold_release_left', 'hold_release_left']),
            e.enum('operation_mode', ea.STATE_SET, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for left button')
                .withEndpoint('left')
                .withCategory('config'),
            e.enum('operation_mode', ea.STATE_SET, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for right button')
                .withEndpoint('right')
                .withCategory('config'),
        ],
        toZigbee: [tz.on_off, {...lumi.toZigbee.lumi_switch_operation_mode_basic, convertGet: null}, lumi.toZigbee.lumi_power],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.ctrl_ln2.aq1', 'lumi.ctrl_ln2'],
        model: 'QBKG12LM',
        vendor: 'Aqara',
        description: 'Smart wall switch (with neutral, double rocker)',
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_on_off,
            lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_operation_mode_basic, lumi.fromZigbee.lumi_power,
            lumi.legacyFromZigbee.QBKG03LM_QBKG12LM_click, lumi.legacyFromZigbee.QBKG12LM_click,
        ],
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.device_temperature(), e.energy(),
            e.power().withAccess(ea.STATE_GET),
            e.action(['single_left', 'single_right', 'single_both', 'double_left', 'double_right', 'double_both',
                'hold_left', 'hold_right', 'hold_both', 'release_left', 'release_right', 'release_both']),
            e.enum('operation_mode', ea.ALL, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for right button')
                .withEndpoint('right'),
        ],
        meta: {multiEndpoint: true},
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_basic, lumi.toZigbee.lumi_power],
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'system': 1};
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.remote.b286acn02'],
        model: 'WXKG07LM',
        vendor: 'Aqara',
        description: 'Wireless remote switch D1 (double rocker)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_action_multistate,
            lumi.legacyFromZigbee.lumi_on_off_action, lumi.legacyFromZigbee.lumi_multistate_action,
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {left: 1, right: 2, both: 3};
        },
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'single_left', 'single_right', 'single_both',
            'double_left', 'double_right', 'double_both',
            'hold_left', 'hold_right', 'hold_both'])],
        extend: [quirkCheckinInterval('1_HOUR'), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b1lacn02'],
        model: 'QBKG21LM',
        vendor: 'Aqara',
        description: 'Smart wall switch D1 (no neutral, single rocker)',
        fromZigbee: [lumi.fromZigbee.lumi_on_off, lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_operation_mode_basic,
            lumi.legacyFromZigbee.QBKG04LM_QBKG11LM_click,
        ],
        exposes: [
            e.switch(), e.action(['release', 'hold', 'double', 'single', 'hold_release']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
        ],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_basic],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
        extend: [lumiPreventReset()],
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.b2lacn02'],
        model: 'QBKG22LM',
        vendor: 'Aqara',
        description: 'Smart wall switch D1 (no neutral, double rocker)',
        fromZigbee: [lumi.fromZigbee.lumi_on_off, lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_operation_mode_basic,
            lumi.legacyFromZigbee.QBKG03LM_QBKG12LM_click, lumi.legacyFromZigbee.QBKG03LM_buttons,
        ],
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.action(['release_left', 'release_right', 'release_both', 'double_left', 'double_right',
                'single_left', 'single_right', 'hold_release_left', 'hold_release_left']),
            e.enum('operation_mode', ea.ALL, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_left_relay', 'control_right_relay', 'decoupled'])
                .withDescription('Operation mode for right button')
                .withEndpoint('right'),
        ],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_basic],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
        extend: [lumiPreventReset()],
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.l3acn3'],
        model: 'QBKG25LM',
        vendor: 'Aqara',
        description: 'Smart wall switch D1 (no neutral, triple rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple,
            lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_led_disabled_night,
            lumi.toZigbee.lumi_switch_mode_switch, lumi.toZigbee.lumi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for center button')
                .withEndpoint('center'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
            e.power_outage_memory(), e.led_disabled_night(), e.device_temperature().withAccess(ea.STATE), e.flip_indicator_light(),
            e.action([
                'left_single', 'left_double', 'center_single', 'center_double', 'right_single', 'right_double',
                'single_left_center', 'double_left_center', 'single_left_right', 'double_left_right',
                'single_center_right', 'double_center_right', 'single_all', 'double_all']),
            e.power_outage_count(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.n3acn3'],
        model: 'QBKG26LM',
        vendor: 'Aqara',
        description: 'Smart wall switch D1 (with neutral, triple rocker)',
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for center button')
                .withEndpoint('center'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.power().withAccess(ea.STATE), e.power_outage_memory(), e.led_disabled_night(), e.voltage(), e.energy(),
            e.device_temperature().withAccess(ea.STATE), e.flip_indicator_light(),
            e.action([
                'single_left', 'double_left', 'single_center', 'double_center', 'single_right', 'double_right',
                'single_left_center', 'double_left_center', 'single_left_right', 'double_left_right',
                'single_center_right', 'double_center_right', 'single_all', 'double_all']),
        ],
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_action_multistate],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b1nacn02'],
        model: 'QBKG23LM',
        vendor: 'Aqara',
        description: 'Smart wall switch D1 (with neutral, single rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_action_multistate],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_operation_mode_basic],
        endpoint: (device) => {
            return {'system': 1};
        },
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET),
            e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage(), e.action(['single', 'release']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            device.type = 'Router';
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b2nacn02'],
        model: 'QBKG24LM',
        vendor: 'Aqara',
        description: 'Smart wall switch D1 (with neutral, double rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_operation_mode_basic,
            lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_basic],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_operation_mode_basic],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'system': 1};
        },
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.energy(),
            e.power().withAccess(ea.STATE_GET),
            e.action([
                'hold_left', 'single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both',
            ]),
            e.enum('operation_mode', ea.ALL, ['control_left_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_right_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
        ],
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b1lacn01'],
        model: 'QBKG17LM',
        vendor: 'Aqara',
        description: 'Smart wall switch T1 (no neutral, single rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiOnOff({powerOutageMemory: 'binary', operationMode: true}),
            lumiLedDisabledNight(),
            lumiFlipIndicatorLight(),
            lumiAction({actionLookup: {'single': 1, 'double': 2}}),
            lumiPreventReset(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.b2lacn01'],
        model: 'QBKG18LM',
        vendor: 'Aqara',
        description: 'Smart wall switch T1 (no neutral, double rocker)',
        extend: [
            lumiZigbeeOTA(),
            deviceEndpoints({endpoints: {'left': 1, 'right': 2}}),
            lumiOnOff({powerOutageMemory: 'binary', operationMode: true, endpointNames: ['left', 'right']}),
            lumiLedDisabledNight(),
            lumiFlipIndicatorLight(),
            lumiAction({actionLookup: {'single': 1, 'double': 2}, buttonLookup: {'left': 41, 'right': 42, 'both': 51}}),
            lumiPreventReset(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.b1nacn01'],
        model: 'QBKG19LM',
        vendor: 'Aqara',
        description: 'Smart wall switch T1 (with neutral, single rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiOnOff({powerOutageMemory: 'binary', operationMode: true}),
            lumiLedDisabledNight(),
            lumiFlipIndicatorLight(),
            lumiAction({actionLookup: {'single': 1, 'double': 2}}),
            lumiElectricityMeter(),
            lumiPower(),
            lumiPreventReset(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.b2nacn01'],
        model: 'QBKG20LM',
        vendor: 'Aqara',
        description: 'Smart wall switch T1 (with neutral, double rocker)',
        extend: [
            forceDeviceType({type: 'Router'}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
            lumiZigbeeOTA(),
            deviceEndpoints({endpoints: {'left': 1, 'right': 2}}),
            lumiOnOff({powerOutageMemory: 'binary', operationMode: true, endpointNames: ['left', 'right']}),
            lumiLedDisabledNight(),
            lumiFlipIndicatorLight(),
            lumiAction({actionLookup: {'single': 1, 'double': 2}, buttonLookup: {'left': 41, 'right': 42, 'both': 51}}),
            lumiElectricityMeter(),
            lumiPower(),
            lumiPreventReset(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.b3l01'],
        model: 'QBKG33LM',
        vendor: 'Aqara',
        description: 'Smart wall switch T1 (no neutral, triple rocker)',
        extend: [
            lumiZigbeeOTA(),
            deviceEndpoints({endpoints: {'left': 1, 'center': 2, 'right': 3}}),
            lumiOnOff({powerOutageMemory: 'binary', operationMode: true, endpointNames: ['left', 'center', 'right']}),
            lumiLedDisabledNight(),
            lumiFlipIndicatorLight(),
            lumiAction({actionLookup: {'single': 1, 'double': 2}, buttonLookup: {
                'left': 41, 'center': 42, 'right': 43,
                'left_center': 51, 'left_right': 52, 'center_right': 53,
                'all': 61,
            }}),
            lumiPreventReset(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.b3n01'],
        model: 'QBKG34LM',
        vendor: 'Aqara',
        description: 'Smart wall switch T1 (with neutral, triple rocker)',
        extend: [
            lumiZigbeeOTA(),
            deviceEndpoints({endpoints: {'left': 1, 'center': 2, 'right': 3}}),
            lumiOnOff({powerOutageMemory: 'binary', operationMode: true, endpointNames: ['left', 'center', 'right']}),
            lumiLedDisabledNight(),
            lumiFlipIndicatorLight(),
            lumiAction({actionLookup: {'single': 1, 'double': 2}, buttonLookup: {
                'left': 41, 'center': 42, 'right': 43,
                'left_center': 51, 'left_right': 52, 'center_right': 53,
                'all': 61,
            }}),
            lumiElectricityMeter(),
            lumiPower(),
            lumiPreventReset(),
        ],
    },
    {
        zigbeeModel: ['lumi.sens', 'lumi.sensor_ht'],
        model: 'WSDCGQ01LM',
        vendor: 'Xiaomi',
        whiteLabel: [
            {vendor: 'Xiaomi', model: 'YTC4042GL'},
            {vendor: 'Xiaomi', model: 'YTC4007CN'},
            {vendor: 'Xiaomi', model: 'YTC4018CN'},
        ],
        description: 'Mi temperature and humidity sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.weather'],
        model: 'WSDCGQ11LM',
        vendor: 'Aqara',
        description: 'Temperature and humidity sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_temperature, fz.humidity, fz.pressure],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Battery';
            device.save();
        },
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.sensor_ht.agl02'],
        model: 'WSDCGQ12LM',
        vendor: 'Aqara',
        description: 'Temperature and humidity sensor T1',
        whiteLabel: [{vendor: 'Aqara', model: 'TH-S02D'}],
        fromZigbee: [lumi.fromZigbee.lumi_specific, fz.temperature, fz.humidity, lumi.fromZigbee.lumi_pressure, fz.battery],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.pressure(), e.device_temperature(), e.battery(), e.battery_voltage(),
            e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.sensor_motion'],
        model: 'RTCGQ01LM',
        vendor: 'Xiaomi',
        whiteLabel: [
            {vendor: 'Xiaomi', model: 'YTC4041GL'},
            {vendor: 'Xiaomi', model: 'YTC4004CN'},
            {vendor: 'Xiaomi', model: 'YTC4016CN'},
            {vendor: 'Xiaomi', model: 'ZHTZ02LM'},
        ],
        description: 'Mi motion sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, fz.occupancy_with_timeout],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.battery_voltage(), e.power_outage_count(false)],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.sensor_motion.aq2'],
        model: 'RTCGQ11LM',
        vendor: 'Aqara',
        description: 'Motion sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, fz.occupancy_with_timeout, lumi.fromZigbee.lumi_illuminance],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.device_temperature(), e.battery_voltage(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux'), e.power_outage_count(false)],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.motion.agl02'],
        model: 'RTCGQ12LM',
        vendor: 'Aqara',
        description: 'Motion sensor T1',
        fromZigbee: [lumi.fromZigbee.lumi_occupancy_illuminance, lumi.fromZigbee.lumi_specific, fz.battery],
        toZigbee: [lumi.toZigbee.lumi_detection_interval],
        exposes: [e.occupancy(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux'),
            e.numeric('detection_interval', ea.ALL).withValueMin(2).withValueMax(65535).withUnit('s')
                .withDescription('Time interval for detecting actions'),
            e.device_temperature(), e.battery(), e.battery_voltage(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('manuSpecificLumi', [0x0102], {manufacturerCode: manufacturerCode});
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.motion.agl04'],
        model: 'RTCGQ13LM',
        vendor: 'Aqara',
        description: 'High precision motion sensor',
        fromZigbee: [lumi.fromZigbee.lumi_occupancy, lumi.fromZigbee.lumi_specific, fz.battery],
        toZigbee: [lumi.toZigbee.lumi_detection_interval, lumi.toZigbee.lumi_motion_sensitivity],
        exposes: [e.occupancy(), e.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high']),
            e.numeric('detection_interval', ea.ALL).withValueMin(2).withValueMax(65535).withUnit('s')
                .withDescription('Time interval for detecting actions'),
            e.device_temperature(), e.battery(), e.battery_voltage(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('manuSpecificLumi', [0x0102], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x010c], {manufacturerCode: manufacturerCode});
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.motion.ac02'],
        model: 'RTCGQ14LM',
        vendor: 'Aqara',
        whiteLabel: [{vendor: 'Aqara', model: 'MS-S02'}],
        description: 'Motion sensor P1',
        fromZigbee: [lumi.fromZigbee.lumi_occupancy_illuminance, lumi.fromZigbee.lumi_specific, fz.battery],
        toZigbee: [lumi.toZigbee.lumi_detection_interval, lumi.toZigbee.lumi_motion_sensitivity, lumi.toZigbee.lumi_trigger_indicator],
        exposes: [e.occupancy(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux'),
            e.motion_sensitivity_select(['low', 'medium', 'high'])
                .withDescription('Select motion sensitivity to use. Press pairing button right before changing this otherwise it will fail.'),
            e.detection_interval().withDescription('Time interval between action detection. ' +
                'Press pairing button right before changing this otherwise it will fail.'),
            e.trigger_indicator().withDescription('When this option is enabled then ' +
                'blue LED will blink once when motion is detected. ' +
                'Press pairing button right before changing this otherwise it will fail.'),
            e.device_temperature(), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('manuSpecificLumi', [0x0102], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x010c], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0152], {manufacturerCode: manufacturerCode});
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.motion.acn001'],
        model: 'RTCGQ15LM',
        vendor: 'Aqara',
        description: 'Motion sensor E1',
        fromZigbee: [lumi.fromZigbee.lumi_occupancy_illuminance, lumi.fromZigbee.lumi_specific, fz.battery],
        toZigbee: [lumi.toZigbee.lumi_detection_interval],
        exposes: [e.occupancy(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux'),
            e.numeric('detection_interval', ea.ALL).withValueMin(2).withValueMax(65535).withUnit('s')
                .withDescription('Time interval for detecting actions'),
            e.device_temperature(), e.battery(), e.battery_voltage(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('manuSpecificLumi', [0x0102], {manufacturerCode: manufacturerCode});
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.motion.ac01'],
        model: 'RTCZCGQ11LM',
        vendor: 'Aqara',
        description: 'Presence sensor FP1',
        fromZigbee: [lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_presence_region_events],
        toZigbee: [
            lumi.toZigbee.lumi_presence, lumi.toZigbee.lumi_monitoring_mode,
            lumi.toZigbee.lumi_approach_distance, lumi.toZigbee.lumi_motion_sensitivity,
            lumi.toZigbee.lumi_reset_nopresence_status, lumi.toZigbee.lumi_presence_region_upsert, lumi.toZigbee.lumi_presence_region_delete,
        ],
        exposes: [
            e.presence().withAccess(ea.STATE_GET), e.device_temperature(), e.power_outage_count(),
            e.enum('presence_event', ea.STATE, ['enter', 'leave', 'left_enter', 'right_leave', 'right_enter', 'left_leave',
                'approach', 'away']).withDescription('Presence events: "enter", "leave", "left_enter", "right_leave", ' +
                '"right_enter", "left_leave", "approach", "away"'),
            e.enum('monitoring_mode', ea.ALL, ['undirected', 'left_right']).withDescription('Monitoring mode with or ' +
                'without considering right and left sides'),
            e.enum('approach_distance', ea.ALL, ['far', 'medium', 'near']).withDescription('The distance at which the ' +
                'sensor detects approaching'),
            e.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('Different sensitivities ' +
                'means different static human body recognition rate and response speed of occupied'),
            e.enum('reset_nopresence_status', ea.SET, ['']).withDescription('Reset the status of no presence'),
            e.enum('action', ea.STATE, ['region_*_enter', 'region_*_leave', 'region_*_occupied',
                'region_*_unoccupied']).withDescription('Most recent region event. Event template is "region_<REGION_ID>_<EVENT_TYPE>", ' +
                'where <REGION_ID> is region number (1-10), <EVENT_TYPE> is one of "enter", "leave", "occupied", "unoccupied". ' +
                '"enter" / "leave" events are usually triggered first, followed by "occupied" / "unoccupied" after a couple of seconds.'),
            e.composite('region_upsert', 'region_upsert', ea.SET)
                .withDescription(
                    'Definition of a new region to be added (or replace existing one). ' +
                    'Creating or modifying a region requires you to define which zones of a 7x4 detection grid ' +
                    'should be active for that zone. Regions can overlap, meaning that a zone can be defined ' +
                    'in more than one region (eg. "zone x = 1 & y = 1" can be added to region 1 & 2). ' +
                    '"Zone x = 1 & y = 1" is the nearest zone on the right (from sensor\'s perspective, along the detection path).',
                )
                .withFeature(
                    e.numeric('region_id', ea.SET)
                        .withValueMin(lumi.presence.constants.region_config_regionId_min)
                        .withValueMax(lumi.presence.constants.region_config_regionId_max),
                )
                .withFeature(
                    e.list('zones', ea.SET,
                        e.composite('Zone position', 'zone_position', ea.SET)
                            .withFeature(e.numeric('x', ea.SET)
                                .withValueMin(lumi.presence.constants.region_config_zoneX_min)
                                .withValueMax(lumi.presence.constants.region_config_zoneX_max))
                            .withFeature(e.numeric('y', ea.SET)
                                .withValueMin(lumi.presence.constants.region_config_zoneY_min)
                                .withValueMax(lumi.presence.constants.region_config_zoneY_max)),
                    ).withDescription('list of dictionaries in the format {"x": 1, "y": 1}, {"x": 2, "y": 1}'),
                ),
            e.composite('region_delete', 'region_delete', ea.SET)
                .withDescription('Region definition to be deleted from the device.')
                .withFeature(e.numeric('region_id', ea.SET)
                    .withValueMin(lumi.presence.constants.region_config_regionId_min)
                    .withValueMax(lumi.presence.constants.region_config_regionId_max),
                ),
        ],
        configure: async (device, coordinatorEndpoint) => {
            device.softwareBuildID = `${device.applicationVersion}`;
            device.save();

            const endpoint = device.getEndpoint(1);
            await endpoint.read('manuSpecificLumi', [0x010c], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0142], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0144], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0146], {manufacturerCode: manufacturerCode});
        },
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.sensor_magnet'],
        model: 'MCCGQ01LM',
        vendor: 'Xiaomi',
        whiteLabel: [
            {vendor: 'Xiaomi', model: 'YTC4039GL'},
            {vendor: 'Xiaomi', model: 'YTC4005CN'},
            {vendor: 'Xiaomi', model: 'YTC4015CN'},
            {vendor: 'Xiaomi', model: 'ZHTZ02LM'}],
        description: 'Mi door and window sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_contact],
        toZigbee: [],
        exposes: [e.battery(), e.contact(), e.battery_voltage(), e.power_outage_count(false)],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.sensor_magnet.aq2'],
        model: 'MCCGQ11LM',
        vendor: 'Aqara',
        description: 'Door and window sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_contact],
        toZigbee: [],
        exposes: [e.battery(), e.contact(), e.device_temperature(), e.battery_voltage(), e.power_outage_count(false), e.trigger_count()],
        extend: [quirkCheckinInterval('1_HOUR')],
        configure: async (device) => {
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.sensor_wleak.aq1'],
        model: 'SJCGQ11LM',
        vendor: 'Aqara',
        description: 'Water leak sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.battery(), e.water_leak(), e.battery_low(), e.battery_voltage(), e.device_temperature(), e.power_outage_count(false),
            e.trigger_count()],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.flood.agl02'],
        model: 'SJCGQ12LM',
        vendor: 'Aqara',
        description: 'Water leak sensor T1',
        whiteLabel: [{vendor: 'Aqara', model: 'WL-S02D'}],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, fz.ias_water_leak_alarm_1, lumi.fromZigbee.lumi_specific],
        toZigbee: [],
        exposes: [e.battery(), e.water_leak(), e.battery_low(), e.tamper(), e.battery_voltage()],
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.sensor_cube', 'lumi.sensor_cube.aqgl01'],
        model: 'MFKZQ01LM',
        vendor: 'Aqara',
        description: 'Cube',
        whiteLabel: [{vendor: 'Xiaomi', model: 'MFKZQ01LM'}],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_action_analog],
        exposes: [e.battery(), e.battery_voltage(), e.angle('action_angle'), e.device_temperature(), e.power_outage_count(false),
            e.cube_side('action_from_side'), e.cube_side('action_side'), e.cube_side('action_to_side'), e.cube_side('side'),
            e.action(['shake', 'throw', 'wakeup', 'fall', 'tap', 'slide', 'flip180', 'flip90', 'rotate_left', 'rotate_right'])],
        toZigbee: [],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.plug'],
        model: 'ZNCZ02LM',
        description: 'Mi smart plug',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature(), e.power_outage_memory()],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.plug.mitw01'],
        model: 'ZNCZ03LM',
        description: 'Mi smart plug TW',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage()],
    },
    {
        zigbeeModel: ['lumi.plug.mmeu01'],
        model: 'ZNCZ04LM',
        description: 'Mi smart plug EU',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific, fz.ignore_occupancy_report, fz.ignore_illuminance_report,
            fz.ignore_time_read],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_auto_off, lumi.toZigbee.lumi_led_disabled_night,
            lumi.toZigbee.lumi_overload_protection],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage(), e.current(), e.consumer_connected(), e.led_disabled_night(),
            e.power_outage_memory(), e.auto_off(20),
            e.overload_protection(100, 2300)],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.plug.maus01'],
        model: 'ZNCZ12LM',
        description: 'Smart plug US',
        vendor: 'Aqara',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_basic,
            fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_auto_off, lumi.toZigbee.lumi_led_disabled_night,
            lumi.toZigbee.lumi_overload_protection],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage(), e.current(), e.consumer_connected(), e.led_disabled_night(),
            e.power_outage_memory(), e.auto_off(20),
            e.overload_protection(100, 2300)],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.plug.maeu01'],
        model: 'SP-EUC01',
        description: 'Smart plug EU',
        vendor: 'Aqara',
        extend: [forceDeviceType({type: 'Router'}), lumiZigbeeOTA()],
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_basic, fz.electrical_measurement, fz.metering,
            lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_power, fz.device_temperature],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_led_disabled_night,
            lumi.toZigbee.lumi_overload_protection, lumi.toZigbee.lumi_auto_off, lumi.toZigbee.lumi_socket_button_lock],
        configure: async (device, coordinatorEndpoint) => {
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
                logger.warning(`SP-EUC01 failed to setup electricity measurements (${e.message})`, NS);
                logger.debug(e.stack, NS);
            }
            try {
                await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
                await reporting.readMeteringMultiplierDivisor(endpoint);
                await reporting.currentSummDelivered(endpoint, {change: 0});
            } catch (e) {
                logger.warning(`SP-EUC01 failed to setup metering (${e.message})`, NS);
                logger.debug(e.stack, NS);
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
        exposes: [e.switch(), e.power(), e.energy(), e.power_outage_memory(), e.voltage(), e.current(),
            e.device_temperature().withDescription('Device temperature (polled every 30 min)'),
            e.consumer_connected(), e.led_disabled_night(), e.overload_protection(100, 2300),
            e.auto_off(20), e.button_lock()],
    },
    {
        zigbeeModel: ['lumi.plug.aq1'],
        model: 'ZNCZ11LM',
        vendor: 'Aqara',
        description: 'Smart plug',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, fz.ignore_occupancy_report, lumi.fromZigbee.lumi_basic],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_led_disabled_night,
            lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_auto_off],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature(), e.voltage(),
            e.power_outage_memory(), e.led_disabled_night(),
            e.auto_off(30)],
        extend: [customTimeResponse('2000_LOCAL')],
    },
    {
        zigbeeModel: ['lumi.ctrl_86plug', 'lumi.ctrl_86plug.aq1'],
        model: 'QBCZ11LM',
        description: 'Smart wall outlet',
        vendor: 'Aqara',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_basic],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage(), e.power_outage_memory()],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.sensor_smoke'],
        model: 'JTYJ-GD-01LM/BW',
        description: 'Mijia Honeywell smoke detector',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4020RT'}],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_smoke],
        toZigbee: [lumi.toZigbee.lumi_sensitivity, lumi.toZigbee.lumi_selftest],
        exposes: [
            e.smoke(), e.battery_low(), e.tamper(), e.battery(), e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']),
            e.numeric('smoke_density', ea.STATE), e.enum('selftest', ea.SET, ['']), e.battery_voltage(),
            e.binary('test', ea.STATE, true, false).withDescription('Test mode activated'), e.device_temperature(),
            e.power_outage_count(false),
        ],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.sensor_natgas'],
        model: 'JTQJ-BF-01LM/BW',
        vendor: 'Xiaomi',
        whiteLabel: [{vendor: 'Xiaomi', model: 'YTC4019RT'}],
        description: 'Mijia Honeywell gas leak detector',
        fromZigbee: [fz.ias_gas_alarm_1, lumi.fromZigbee.lumi_gas_sensitivity, lumi.fromZigbee.lumi_gas_density],
        toZigbee: [lumi.toZigbee.lumi_sensitivity, lumi.toZigbee.lumi_selftest],
        exposes: [
            e.gas(), e.tamper(), e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']),
            e.numeric('gas_density', ea.STATE), e.enum('selftest', ea.SET, ['']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Mains (single phase)';
            device.type = 'Router';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.sensor_gas.acn02'],
        model: 'JT-BZ-01AQ/A',
        vendor: 'Aqara',
        description: 'Smart natural gas detector',
        whiteLabel: [{vendor: 'Aqara', model: 'JT-BZ-03AQ/A'}],
        fromZigbee: [lumi.fromZigbee.lumi_specific],
        toZigbee: [lumi.toZigbee.lumi_alarm, lumi.toZigbee.lumi_density, lumi.toZigbee.lumi_gas_sensitivity,
            lumi.toZigbee.lumi_selftest, lumi.toZigbee.lumi_buzzer,
            lumi.toZigbee.lumi_buzzer_manual, lumi.toZigbee.lumi_linkage_alarm,
            lumi.toZigbee.lumi_state, lumi.toZigbee.lumi_power_outage_count],
        exposes: [e.gas().withAccess(ea.STATE_GET),
            e.numeric('gas_density', ea.STATE_GET).withUnit('%LEL').withDescription('Value of gas concentration'),
            e.enum('gas_sensitivity', ea.ALL, ['10%LEL', '15%LEL']).withDescription('Gas concentration value at which ' +
                'an alarm is triggered ("10%LEL" is more sensitive than "15%LEL")'),
            e.enum('selftest', ea.SET, ['selftest']).withDescription('Starts the self-test process (checking the indicator ' +
                'light and buzzer work properly)'),
            e.binary('test', ea.STATE, true, false).withDescription('Self-test in progress'),
            e.enum('buzzer', ea.SET, ['mute', 'alarm']).withDescription('The buzzer can be muted and alarmed manually. ' +
                'During a gas alarm, the buzzer can be manually muted for 10 minutes ("mute"), but cannot be unmuted manually ' +
                'before this timeout expires. The buzzer cannot be pre-muted, as this function only works during a gas alarm. ' +
                'During the absence of a gas alarm, the buzzer can be manually alarmed ("alarm") and disalarmed ("mute"), ' +
                'but for this "linkage_alarm" option must be enabled'),
            e.binary('buzzer_manual_alarm', ea.STATE_GET, true, false).withDescription('Buzzer alarmed (manually)'),
            e.binary('buzzer_manual_mute', ea.STATE_GET, true, false).withDescription('Buzzer muted (manually)'),
            e.binary('linkage_alarm', ea.ALL, true, false).withDescription('When this option is enabled and a gas ' +
                'alarm has occurred, then "linkage_alarm_state"=true, and when the gas alarm has ended or the buzzer has ' +
                'been manually muted, then "linkage_alarm_state"=false'),
            e.binary('linkage_alarm_state', ea.STATE, true, false).withDescription('"linkage_alarm" is triggered'),
            e.binary('state', ea.STATE_GET, 'preparation', 'work').withDescription('"Preparation" or "work" ' +
                '(measurement of the gas concentration value and triggering of an alarm are only performed in the "work" state)'),
            e.power_outage_count().withAccess(ea.STATE_GET)],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('manuSpecificLumi', {0x014b: {value: 1, type: 0x20}}, {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x013a], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x013b], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x013d], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0126], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0139], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x010c], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x014b], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0002], {manufacturerCode: manufacturerCode});
        },
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.sensor_smoke.acn03'],
        model: 'JY-GZ-01AQ',
        vendor: 'Aqara',
        description: 'Smart smoke detector',
        whiteLabel: [{vendor: 'Aqara', model: 'JY-GZ-03AQ'}],
        fromZigbee: [lumi.fromZigbee.lumi_specific, fz.battery],
        toZigbee: [lumi.toZigbee.lumi_alarm, lumi.toZigbee.lumi_density, lumi.toZigbee.lumi_selftest,
            lumi.toZigbee.lumi_buzzer, lumi.toZigbee.lumi_buzzer_manual,
            lumi.toZigbee.lumi_heartbeat_indicator, lumi.toZigbee.lumi_linkage_alarm],
        exposes: [e.smoke().withAccess(ea.STATE_GET),
            e.numeric('smoke_density', ea.STATE_GET).withDescription('Value of smoke concentration'),
            e.numeric('smoke_density_dbm', ea.STATE_GET).withUnit('dB/m').withDescription('Value of smoke concentration in dB/m'),
            e.enum('selftest', ea.SET, ['selftest']).withDescription('Starts the self-test process (checking the indicator ' +
                'light and buzzer work properly)'),
            e.binary('test', ea.STATE, true, false).withDescription('Self-test in progress'),
            e.enum('buzzer', ea.SET, ['mute', 'alarm']).withDescription('The buzzer can be muted and alarmed manually. ' +
                'During a smoke alarm, the buzzer can be manually muted for 80 seconds ("mute") and unmuted ("alarm"). ' +
                'The buzzer cannot be pre-muted, as this function only works during a smoke alarm. ' +
                'During the absence of a smoke alarm, the buzzer can be manually alarmed ("alarm") and disalarmed ("mute"), ' +
                'but for this "linkage_alarm" option must be enabled'),
            e.binary('buzzer_manual_alarm', ea.STATE_GET, true, false).withDescription('Buzzer alarmed (manually)'),
            e.binary('buzzer_manual_mute', ea.STATE_GET, true, false).withDescription('Buzzer muted (manually)'),
            e.binary('heartbeat_indicator', ea.ALL, true, false).withDescription('When this option is enabled then in ' +
                'the normal monitoring state, the green indicator light flashes every 60 seconds'),
            e.binary('linkage_alarm', ea.ALL, true, false).withDescription('When this option is enabled and a smoke ' +
                'alarm has occurred, then "linkage_alarm_state"=true, and when the smoke alarm has ended or the buzzer has ' +
                'been manually muted, then "linkage_alarm_state"=false'),
            e.binary('linkage_alarm_state', ea.STATE, true, false).withDescription('"linkage_alarm" is triggered'),
            e.battery(), e.battery_voltage(), e.power_outage_count(false)],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('manuSpecificLumi', {0x014b: {value: 1, type: 0x20}}, {manufacturerCode: manufacturerCode});
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await endpoint.read('manuSpecificLumi', [0x013a], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x013b], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x013c], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x013d], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0126], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x014b], {manufacturerCode: manufacturerCode});
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.lock.v1'],
        model: 'A6121',
        vendor: 'Xiaomi',
        description: 'Vima Smart Lock',
        fromZigbee: [lumi.fromZigbee.lumi_lock_report],
        exposes: [e.text('inserted', ea.STATE)],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.vibration.aq1'],
        model: 'DJT11LM',
        vendor: 'Aqara',
        description: 'Vibration sensor',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_vibration_analog],
        toZigbee: [lumi.toZigbee.lumi_vibration_sensitivity],
        exposes: [
            e.battery(), e.device_temperature(), e.vibration(), e.action(['vibration', 'tilt', 'drop']),
            e.numeric('strength', ea.STATE), e.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']),
            e.angle_axis('angle_x'), e.angle_axis('angle_y'), e.angle_axis('angle_z'),
            e.x_axis(), e.y_axis(), e.z_axis(), e.battery_voltage(), e.power_outage_count(false),
        ],
        extend: [quirkCheckinInterval('1_HOUR')],
    },
    {
        zigbeeModel: ['lumi.vibration.agl01'],
        model: 'DJT12LM',
        vendor: 'Aqara',
        description: 'Vibration sensor T1',
        extend: [
            lumiVibration(),
            // Doesn't seem to be working at all
            // https://github.com/Koenkk/zigbee2mqtt/issues/21731
            // lumiMiscellaneous(),
            battery({voltageToPercentage: '3V_2850_3000', voltage: true}),
            lumiZigbeeOTA(),
            quirkCheckinInterval('1_HOUR'),
        ],
    },
    {
        zigbeeModel: ['lumi.curtain'],
        model: 'ZNCLDJ11LM',
        description: 'Curtain controller',
        vendor: 'Aqara',
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_curtain_position, lumi.fromZigbee.lumi_curtain_position_tilt],
        toZigbee: [lumi.toZigbee.lumi_curtain_position_state, lumi.toZigbee.lumi_curtain_options],
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'attributeReport' && data.cluster === 'genBasic' &&
                data.data.hasOwnProperty('1028') && data.data['1028'] == 0) {
                // Try to read the position after the motor stops, the device occasionally report wrong data right after stopping
                // Might need to add delay, seems to be working without one but needs more tests.
                await device.getEndpoint(1).read('genAnalogOutput', ['presentValue']);
            }
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL),
            e.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not'),
            e.enum('motor_state', ea.STATE, ['stopped', 'opening', 'closing'])
                .withDescription('Motor state')],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.curtain.aq2'],
        model: 'ZNGZDJ11LM',
        description: 'Roller shade controller',
        vendor: 'Aqara',
        whiteLabel: [{vendor: 'Aqara', model: 'SRSC-M01'}],
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_curtain_position, lumi.fromZigbee.lumi_curtain_position_tilt],
        toZigbee: [lumi.toZigbee.lumi_curtain_position_state, lumi.toZigbee.lumi_curtain_options],
        exposes: [e.cover_position().setAccess('state', ea.ALL),
            e.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not')],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.curtain.vagl02'],
        model: 'ZNGZDJ16LM',
        description: 'Roller shade controller T1C',
        vendor: 'Aqara',
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_curtain_position, lumi.fromZigbee.lumi_curtain_position_tilt],
        toZigbee: [lumi.toZigbee.lumi_curtain_position_state, lumi.toZigbee.lumi_curtain_options],
        exposes: [e.cover_position().setAccess('state', ea.ALL),
            e.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not')],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.curtain.hagl04'],
        model: 'ZNCLDJ12LM',
        vendor: 'Aqara',
        description: 'Curtain controller B1',
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_curtain_position,
            lumi.fromZigbee.lumi_curtain_position_tilt, lumi.fromZigbee.lumi_curtain_status],
        toZigbee: [lumi.toZigbee.lumi_curtain_position_state, lumi.toZigbee.lumi_curtain_options],
        onEvent: async (type, data, device) => {
            // The position (genAnalogOutput.presentValue) reported via an attribute contains an invalid value
            // however when reading it will provide the correct value.
            if (data.type === 'attributeReport' && data.cluster === 'genAnalogOutput') {
                await device.endpoints[0].read('genAnalogOutput', ['presentValue']);
            }
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.battery(),
            e.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not'),
            e.enum('motor_state', ea.STATE, ['closing', 'opening', 'stop'])
                .withDescription('The current state of the motor.'), e.power_outage_count()],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.curtain.hagl07'],
        model: 'ZNCLDJ14LM',
        vendor: 'Aqara',
        description: 'Curtain controller C2',
        fromZigbee: [
            lumi.fromZigbee.lumi_basic,
            lumi.fromZigbee.lumi_curtain_position,
            lumi.fromZigbee.lumi_curtain_status,
            lumi.fromZigbee.lumi_curtain_options,
        ],
        toZigbee: [
            lumi.toZigbee.lumi_curtain_position_state,
            lumi.toZigbee.lumi_curtain_hand_open,
            lumi.toZigbee.lumi_curtain_reverse,
            lumi.toZigbee.lumi_curtain_limits_calibration_ZNCLDJ14LM,
        ],
        exposes: [e.cover_position().setAccess('state', ea.ALL),
            e.binary('reverse_direction', ea.ALL, true, false)
                .withDescription('Whether the curtain direction is inverted'),
            e.binary('hand_open', ea.ALL, true, false)
                .withDescription('Pulling curtains by hand starts the motor'),
            e.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not'),
            e.enum('motor_state', ea.STATE, ['closing', 'opening', 'stop'])
                .withDescription('The current state of the motor.'), e.power_outage_count()],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.curtain.acn002'],
        model: 'ZNJLBL01LM',
        description: 'Roller shade driver E1',
        vendor: 'Aqara',
        whiteLabel: [{vendor: 'Aqara', model: 'RSD-M01'}],
        fromZigbee: [lumi.fromZigbee.lumi_curtain_position, lumi.fromZigbee.lumi_curtain_status,
            fz.ignore_basic_report, lumi.fromZigbee.lumi_specific],
        toZigbee: [lumi.toZigbee.lumi_curtain_position_state, lumi.toZigbee.lumi_curtain_battery,
            lumi.toZigbee.lumi_curtain_charging_status],
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'attributeReport' && data.cluster === 'genMultistateOutput' &&
                data.data.hasOwnProperty('presentValue') && data.data['presentValue'] > 1) {
                // Try to read the position after the motor stops, the device occasionally report wrong data right after stopping
                // Might need to add delay, seems to be working without one but needs more tests.
                await device.getEndpoint(1).read('genAnalogOutput', ['presentValue']);
            }
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.battery().withAccess(ea.STATE_GET), e.device_temperature(),
            e.binary('charging_status', ea.STATE_GET, true, false)
                .withDescription('The current charging status.'),
            e.enum('motor_state', ea.STATE, ['declining', 'rising', 'pause', 'blocked'])
                .withDescription('The current state of the motor.'),
            e.binary('running', ea.STATE, true, false)
                .withDescription('Whether the motor is moving or not')],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Battery';
            device.save();
            const endpoint = device.getEndpoint(1);
            await endpoint.read('manuSpecificLumi', [0x040a], {manufacturerCode: manufacturerCode});
        },
        extend: [
            lumiZigbeeOTA(),
            lumiMotorSpeed(),
        ],
    },
    {
        // 'lumi.curtain.acn003' - CN version (ZNCLBL01LM), 'lumi.curtain.agl001' - global version (CM-M01)
        zigbeeModel: ['lumi.curtain.acn003', 'lumi.curtain.agl001'],
        model: 'ZNCLBL01LM',
        vendor: 'Aqara',
        whiteLabel: [
            {vendor: 'Aqara', model: 'CM-M01'},
            {vendor: 'Aqara', model: 'CM-M01R'},
        ],
        description: 'Curtain driver E1',
        fromZigbee: [
            fz.battery,
            lumi.fromZigbee.lumi_curtain_position_tilt,
            lumi.fromZigbee.lumi_specific,
            fz.power_source,
        ],
        toZigbee: [
            lumi.toZigbee.lumi_curtain_position_state,
            lumi.toZigbee.lumi_curtain_battery_voltage,
            lumi.toZigbee.lumi_curtain_hooks_lock,
            lumi.toZigbee.lumi_curtain_hooks_state,
            lumi.toZigbee.lumi_curtain_hand_open,
            lumi.toZigbee.lumi_curtain_limits_calibration,
            tz.power_source,
            tz.battery_percentage_remaining,
        ],
        exposes: [
            e.cover_position().setAccess('state', ea.ALL),
            e.binary('hand_open', ea.ALL, true, false).withDescription('Pulling curtains by hand starts the motor'),
            e.enum('limits_calibration', ea.SET, ['start', 'end', 'reset']).withDescription('Calibrate the position limits'),
            e.battery().withAccess(ea.STATE_GET),
            e.battery_voltage().withAccess(ea.STATE_GET),
            e.device_temperature(),
            e.illuminance_lux(),
            e.action(['manual_open', 'manual_close']),
            e.enum('motor_state', ea.STATE, ['stopped', 'opening', 'closing', 'pause']).withDescription('Motor state'),
            e.binary('running', ea.STATE, true, false).withDescription('Whether the motor is moving or not'),
            e.enum('hooks_lock', ea.STATE_SET, ['LOCK', 'UNLOCK']).withDescription('Lock the curtain driver hooks'),
            e.enum('hooks_state', ea.STATE_GET, ['unlocked', 'locked', 'locking', 'unlocking']).withDescription('Hooks state'),
            e.numeric('target_position', ea.STATE).withUnit('%').withDescription('Target position'),
            e.enum('power_source', ea.STATE_GET, ['battery', 'dc_source']).withDescription('The current power source'),
            e.binary('charging', ea.STATE_GET, true, false).withDescription('The current charging state'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            // Read correct version to replace version advertised by `genBasic` and `genOta`:
            // https://github.com/Koenkk/zigbee2mqtt/issues/15745
            await endpoint.read('manuSpecificLumi', [0x00EE], {manufacturerCode: manufacturerCode});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            await endpoint.read('manuSpecificLumi', [0x040B], {manufacturerCode: manufacturerCode});
            await endpoint.read('manuSpecificLumi', [0x0428], {manufacturerCode: manufacturerCode});
            await endpoint.read('genBasic', ['powerSource']);
            await endpoint.read('closuresWindowCovering', ['currentPositionLiftPercentage']);
        },
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.relay.c2acn01'],
        model: 'LLKZMK11LM',
        vendor: 'Aqara',
        description: 'Dual relay module',
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_power, fz.ignore_multistate_report, fz.on_off, lumi.fromZigbee.lumi_basic_raw],
        meta: {multiEndpoint: true},
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_interlock, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_power_outage_memory],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        exposes: [e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature(), e.voltage(), e.current(),
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power_outage_count(false),
            e.power_outage_memory(),
            e.binary('interlock', ea.STATE_SET, true, false)
                .withDescription('Enabling prevents both relais being on at the same time'),
        ],
        extend: [lumiZigbeeOTA()],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.acn047'],
        model: 'LLKZMK12LM',
        vendor: 'Aqara',
        whiteLabel: [{vendor: 'Aqara', model: 'DCM-K01'}],
        description: 'Dual relay module T2',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_power],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.power(), e.current(), e.energy(), e.voltage(), e.device_temperature(),
        ],
        extend: [
            lumiSwitchType(),
            lumiPowerOnBehavior({lookup: {'on': 0, 'previous': 1, 'off': 2, 'toggle': 3}}),
            lumiOperationMode({description: 'Decoupled mode for 1st relay', endpointName: 'l1'}),
            lumiOperationMode({description: 'Decoupled mode for 2nd relay', endpointName: 'l2'}),
            lumiAction({endpointNames: ['l1', 'l2']}),
            binary({
                name: 'interlock',
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x02d0, type: 0x10},
                description: 'Enabling prevents both relays being on at the same time (Interlock)',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            enumLookup({
                name: 'mode',
                lookup: {'power': 0, 'pulse': 1, 'dry': 3},
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x0289, type: 0x20},
                description: 'Work mode: Power mode, Dry mode with impulse, Dry mode',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            numeric({
                name: 'pulse_length',
                valueMin: 200,
                valueMax: 2000,
                unit: 'ms',
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x00eb, type: 0x21},
                description: 'Impulse length in Dry mode with impulse',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            lumiZigbeeOTA(),
        ],
    },
    {
        zigbeeModel: ['lumi.lock.acn02'],
        model: 'ZNMS12LM',
        description: 'Smart door lock S2',
        vendor: 'Aqara',
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_door_lock_report, lumi.fromZigbee.lumi_door_lock_low_battery],
        toZigbee: [],
        exposes: [
            e.battery(), e.battery_voltage(), e.battery_low(), e.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            e.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            e.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        meta: {battery: {voltageToPercentage: '4LR6AA1_5v'}},
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.lock.acn03'],
        model: 'ZNMS13LM',
        description: 'Smart door lock S2 Pro',
        vendor: 'Aqara',
        fromZigbee: [lumi.fromZigbee.lumi_door_lock_report, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [
            e.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            e.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            e.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        extend: [quirkCheckinInterval('1_HOUR')],
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.lock.aq1'],
        model: 'ZNMS11LM',
        description: 'Smart door lock',
        vendor: 'Aqara',
        fromZigbee: [lumi.fromZigbee.lumi_door_lock_report, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [
            e.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            e.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            e.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.remote.b286opcn01'],
        model: 'WXCJKG11LM',
        vendor: 'Aqara',
        description: 'Opple wireless switch (single band)',
        fromZigbee: [lumi.fromZigbee.lumi_action_on, lumi.fromZigbee.lumi_action_off, fz.battery,
            lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
        ]), e.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        toZigbee: [lumi.toZigbee.lumi_operation_mode_opple],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode});
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['lumi.remote.b486opcn01'],
        model: 'WXCJKG12LM',
        vendor: 'Aqara',
        description: 'Opple wireless switch (double band)',
        fromZigbee: [lumi.fromZigbee.lumi_action_on, lumi.fromZigbee.lumi_action_off,
            lumi.fromZigbee.lumi_action_step, lumi.fromZigbee.lumi_action_step_color_temp, fz.battery,
            lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
            'button_3_hold', 'button_3_release', 'button_3_single', 'button_3_double', 'button_3_triple',
            'button_4_hold', 'button_4_release', 'button_4_single', 'button_4_double', 'button_4_triple',
        ]), e.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        toZigbee: [lumi.toZigbee.lumi_operation_mode_opple],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode});
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg',
            ]);
        },
    },
    {
        zigbeeModel: ['lumi.remote.b686opcn01'],
        model: 'WXCJKG13LM',
        vendor: 'Aqara',
        description: 'Opple wireless switch (triple band)',
        fromZigbee: [lumi.fromZigbee.lumi_action_on, lumi.fromZigbee.lumi_action_off,
            lumi.fromZigbee.lumi_action_step, lumi.fromZigbee.lumi_action_move, lumi.fromZigbee.lumi_action_stop,
            lumi.fromZigbee.lumi_action_step_color_temp, lumi.fromZigbee.lumi_action_move_color_temp,
            fz.battery, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
            'button_3_hold', 'button_3_release', 'button_3_single', 'button_3_double', 'button_3_triple',
            'button_4_hold', 'button_4_release', 'button_4_single', 'button_4_double', 'button_4_triple',
            'button_5_hold', 'button_5_release', 'button_5_single', 'button_5_double', 'button_5_triple',
            'button_6_hold', 'button_6_release', 'button_6_single', 'button_6_double', 'button_6_triple',
        ]), e.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)'),
        e.power_outage_count(false)],
        toZigbee: [lumi.toZigbee.lumi_operation_mode_opple],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode});
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
        description: 'Mi light sensor',
        fromZigbee: [fz.battery, fz.illuminance, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.illuminance],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint, {min: 15, max: constants.repInterval.HOUR, change: 500});
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        exposes: [e.battery(), e.battery_voltage(), e.illuminance().withAccess(ea.STATE_GET),
            e.illuminance_lux().withAccess(ea.STATE_GET)],
    },
    {
        zigbeeModel: ['lumi.light.acn128'],
        model: 'TDL01LM',
        vendor: 'Aqara',
        description: 'Spotlight T3',
        extend: [light({colorTemp: {range: undefined}, color: true}), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.light.rgbac1'],
        model: 'ZNTGMK11LM',
        vendor: 'Aqara',
        description: 'Smart RGBW light controller',
        extend: [light({colorTemp: {range: undefined}, color: {modes: ['xy', 'hs']}}), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.light.cbacn1'],
        model: 'HLQDQ01LM',
        vendor: 'Aqara',
        description: 'Smart LED controller',
        extend: [light(), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.light.acn004'],
        model: 'SSWQD02LM',
        vendor: 'Aqara',
        description: 'Smart dimmer controller T1 Pro',
        extend: [lumiZigbeeOTA(), lumiLight({colorTemp: true, powerOutageMemory: 'switch'})],
    },
    {
        zigbeeModel: ['lumi.dimmer.acn004'],
        model: 'ZNDDQDQ12LM',
        vendor: 'Aqara',
        description: 'T1 light strip controller',
        extend: [lumiZigbeeOTA(), lumiLight({colorTemp: true, powerOutageMemory: 'switch'})],
    },
    {
        zigbeeModel: ['lumi.light.acn026', 'lumi.light.acn024'],
        model: 'SSWQD03LM',
        vendor: 'Aqara',
        description: 'Spotlight T2',
        extend: [lumiZigbeeOTA(), lumiLight({colorTemp: true, powerOutageMemory: 'switch'})],
    },
    {
        zigbeeModel: ['lumi.switch.n0agl1'],
        model: 'SSM-U01',
        vendor: 'Aqara',
        description: 'Single switch module T1 (with neutral)',
        // Ignore energy metering reports, rely on aqara_opple: https://github.com/Koenkk/zigbee2mqtt/issues/10709
        fromZigbee: [fz.on_off, fz.device_temperature, lumi.fromZigbee.lumi_specific, fz.ignore_metering, fz.ignore_electrical_measurement,
            lumi.fromZigbee.lumi_power],
        exposes: [e.switch(), e.energy(), e.power(), e.device_temperature(), e.power_outage_memory(), e.power_outage_count(),
            e.switch_type(), e.voltage(), e.current(),
        ],
        toZigbee: [lumi.toZigbee.lumi_switch_type, tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_led_disabled_night],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);
            device.powerSource = 'Mains (single phase)';
            device.type = 'Router';
            device.save();
        },
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.switch.n0acn2'],
        model: 'DLKZMK11LM',
        vendor: 'Aqara',
        description: 'Single switch module T1 (with neutral), CN',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_power, lumi.toZigbee.lumi_switch_type,
            lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_led_disabled_night],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage(), e.current(), e.power_outage_memory(), e.led_disabled_night(), e.switch_type()],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.switch.l0agl1'],
        model: 'SSM-U02',
        vendor: 'Aqara',
        description: 'Single switch module T1 (no neutral)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_specific],
        exposes: [e.switch(), e.power_outage_memory(), e.switch_type(), e.power_outage_count(), e.device_temperature()],
        toZigbee: [lumi.toZigbee.lumi_switch_type, tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint) => {
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
        vendor: 'Aqara',
        description: 'Single switch module T1 (no neutral), CN',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_specific],
        exposes: [e.switch(), e.power_outage_memory(), e.switch_type()],
        toZigbee: [lumi.toZigbee.lumi_switch_type, tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint) => {
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
        vendor: 'Aqara',
        description: 'Smart touch panel S1',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_smart_panel_ZNCJMB14LM],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_smart_panel_ZNCJMB14LM],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'),
            e.switch().withEndpoint('right'),
            e.binary('standby_enabled', ea.STATE_SET, true, false).withDescription('Enable standby'),
            e.enum('theme', ea.STATE_SET, ['classic', 'concise']).withDescription('Display theme'),
            e.enum('beep_volume', ea.STATE_SET, ['mute', 'low', 'medium', 'high']).withDescription('Beep volume'),
            e.numeric('lcd_brightness', ea.STATE_SET).withValueMin(1).withValueMax(100).withUnit('%')
                .withDescription('LCD brightness (will not persist if auto-brightness is enabled)'),
            e.enum('language', ea.STATE_SET, ['chinese', 'english']).withDescription('Interface language'),
            e.enum('screen_saver_style', ea.STATE_SET, ['classic', 'analog clock']).withDescription('Screen saver style'),
            e.numeric('standby_time', ea.STATE_SET).withValueMin(0).withValueMax(65534).withUnit('s')
                .withDescription('Display standby time'),
            e.enum('font_size', ea.STATE_SET, ['small', 'medium', 'large']).withDescription('Display font size'),
            e.binary('lcd_auto_brightness_enabled', ea.STATE_SET, true, false).withDescription('Enable LCD auto brightness'),
            e.enum('homepage', ea.STATE_SET, ['scene', 'feel', 'thermostat', 'switch']).withDescription('Default display homepage'),
            e.binary('screen_saver_enabled', ea.STATE_SET, true, false).withDescription('Enable screen saver'),
            e.numeric('standby_lcd_brightness', ea.STATE_SET).withValueMin(1).withValueMax(100).withUnit('%')
                .withDescription('Standby LCD brightness'),
            e.enum('available_switches', ea.STATE_SET, ['none', '1', '2', '3', '1 and 2', '1 and 3', '2 and 3', 'all'])
                .withDescription('Control which switches are available in the switches screen (none disables switches screen)'),
            e.composite('switch_1_text_icon', 'switch_1_text_icon', ea.STATE_SET).withDescription('Switch 1 text and icon')
                .withFeature(e.enum('switch_1_icon', ea.STATE_SET, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
                    .withDescription('Icon'))
                .withFeature(e.text('switch_1_text', ea.STATE_SET)
                    .withDescription('Text')),
            e.composite('switch_2_text_icon', 'switch_2_text_icon', ea.STATE_SET).withDescription('Switch 2 text and icon')
                .withFeature(e.enum('switch_2_icon', ea.STATE_SET, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
                    .withDescription('Icon'))
                .withFeature(e.text('switch_2_text', ea.STATE_SET)
                    .withDescription('Text')),
            e.composite('switch_3_text_icon', 'switch_3_text_icon', ea.STATE_SET).withDescription('Switch 3 text and icon')
                .withFeature(e.enum('switch_3_icon', ea.STATE_SET, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
                    .withDescription('Icon'))
                .withFeature(e.text('switch_3_text', ea.STATE_SET)
                    .withDescription('Text'))],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            // await reporting.onOff(device.getEndpoint(2)); ToDo: Currently fails
            // await reporting.onOff(device.getEndpoint(3)); ToDo: Currently fails
        },
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.remote.b186acn03'],
        model: 'WXKG05LM',
        vendor: 'Aqara',
        description: 'Wireless remote switch T1 (single rocker)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR')],
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_action_multistate, fz.battery, lumi.fromZigbee.lumi_specific],
        toZigbee: [],
        exposes: [e.action(['single', 'double', 'hold']), e.battery()],
    },
    {
        zigbeeModel: ['lumi.remote.b28ac1'],
        model: 'WXKG15LM',
        vendor: 'Aqara',
        whiteLabel: [{vendor: 'Aqara', model: 'WRS-R02'}],
        description: 'Wireless remote switch H1 (double rocker)',
        fromZigbee: [fz.battery, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific, fz.command_toggle],
        toZigbee: [lumi.toZigbee.lumi_switch_click_mode, lumi.toZigbee.lumi_operation_mode_opple],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}, multiEndpoint: true},
        extend: [quirkCheckinInterval('1_HOUR')],
        exposes: [
            e.battery(), e.battery_voltage(), e.action([
                'single_left', 'single_right', 'single_both',
                'double_left', 'double_right', 'double_both',
                'triple_left', 'triple_right', 'triple_both',
                'hold_left', 'hold_right', 'hold_both']),
            e.enum('click_mode', ea.ALL, ['fast', 'multi'])
                .withDescription('Click mode, fast: only supports single click which will be send immediately after clicking.' +
                    'multi: supports more events like double and hold'),
            e.enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(3);
            // set "event" mode
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode});
            // turn on the "multiple clicks" mode, otherwise the only "single click" events.
            // if value is 1 - there will be single clicks, 2 - multiple.
            await endpoint1.write('manuSpecificLumi', {0x0125: {value: 0x02, type: 0x20}}, {manufacturerCode: manufacturerCode});
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
        vendor: 'Aqara',
        description: 'Smart wall switch E1 (no neutral, single rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_switch_mode_switch, lumi.toZigbee.lumi_flip_indicator_light],
        exposes: [e.switch(), e.power_outage_memory(), e.action(['single', 'double']),
            e.device_temperature(), e.flip_indicator_light(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for button'),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.')],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.b2lc04'],
        model: 'QBKG39LM',
        vendor: 'Aqara',
        description: 'Smart wall switch E1 (no neutral, double rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_switch_mode_switch, lumi.toZigbee.lumi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.device_temperature(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.enum('mode_switch', ea.ALL, ['anti_flicker_mode', 'quick_mode'])
                .withDescription('Anti flicker mode can be used to solve blinking issues of some lights.' +
                    'Quick mode makes the device respond faster.'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both']),
            e.power_outage_memory(), e.flip_indicator_light(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.airmonitor.acn01'],
        model: 'VOCKQJK11LM',
        vendor: 'Aqara',
        whiteLabel: [{vendor: 'Aqara', model: 'AAQS-S01'}],
        description: 'TVOC air quality monitor',
        fromZigbee: [fz.battery, lumi.fromZigbee.lumi_specific],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.device_temperature(), e.battery(), e.battery_voltage()],
        extend: [
            quirkCheckinInterval('1_HOUR'),
            quirkAddEndpointCluster({
                endpointID: 1,
                inputClusters: [
                    'msTemperatureMeasurement',
                    'msRelativeHumidity',
                    'genAnalogInput',
                    'manuSpecificLumi',
                ],
            }),
            lumiAirQuality(),
            lumiVoc(),
            temperature(),
            humidity(),
            lumiDisplayUnit(),
            lumiOutageCountRestoreBindReporting(),
            lumiZigbeeOTA(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['lumi.switch.b2nc01'],
        model: 'QBKG41LM',
        vendor: 'Aqara',
        description: 'Smart wall switch E1 (with neutral, double rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right', 'single_both', 'double_both']),
            e.power_outage_memory(), e.device_temperature(), e.flip_indicator_light(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.plug.macn01'],
        model: 'ZNCZ15LM',
        vendor: 'Aqara',
        description: 'Smart plug T1, CN',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_led_disabled_night,
            lumi.toZigbee.lumi_overload_protection, lumi.toZigbee.lumi_socket_button_lock],
        exposes: [e.switch(), e.power().withAccess(ea.STATE), e.energy(), e.device_temperature().withAccess(ea.STATE),
            e.voltage(), e.current(), e.consumer_connected().withAccess(ea.STATE),
            e.power_outage_memory(), e.led_disabled_night(), e.button_lock(),
            e.overload_protection(100, 2500)],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.switch.b1nc01'],
        model: 'QBKG40LM',
        vendor: 'Aqara',
        description: 'Smart wall switch E1 (with neutral, single rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_flip_indicator_light],
        exposes: [e.switch(), e.action(['single', 'double']), e.power_outage_memory(), e.device_temperature(), e.flip_indicator_light(),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withDescription('Decoupled mode')],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.remote.b1acn02'],
        model: 'WXKG13LM',
        vendor: 'Aqara',
        description: 'Wireless mini switch T1',
        whiteLabel: [{vendor: 'Aqara', model: 'WB-R02D'}],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [fz.battery, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'triple', 'quintuple', 'hold', 'release', 'many'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.sen_ill.agl01'],
        model: 'GZCGQ11LM',
        vendor: 'Aqara',
        description: 'Light sensor T1',
        fromZigbee: [fz.battery, fz.illuminance, lumi.fromZigbee.lumi_specific],
        toZigbee: [lumi.toZigbee.lumi_detection_period],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        exposes: [e.battery(), e.battery_voltage(), e.illuminance(), e.illuminance_lux(),
            e.numeric('detection_period', exposes.access.ALL).withValueMin(1).withValueMax(59).withUnit('s')
                .withDescription('Time interval in seconds to report after light changes')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
            await endpoint.read('manuSpecificLumi', [0x0000], {manufacturerCode: manufacturerCode});
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.plug.sacn03'],
        model: 'QBCZ15LM',
        vendor: 'Aqara',
        description: 'Smart wall outlet H1 (USB)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_led_disabled_night,
            lumi.toZigbee.lumi_button_switch_mode, lumi.toZigbee.lumi_overload_protection, lumi.toZigbee.lumi_socket_button_lock],
        meta: {multiEndpoint: true},
        endpoint: () => {
            return {'relay': 1, 'usb': 2};
        },
        exposes: [
            e.switch().withEndpoint('relay'), e.switch().withEndpoint('usb'),
            e.power().withAccess(ea.STATE), e.energy(), e.device_temperature().withAccess(ea.STATE), e.voltage(),
            e.current(), e.power_outage_memory(), e.led_disabled_night(), e.button_lock(),
            e.enum('button_switch_mode', exposes.access.ALL, ['relay', 'relay_and_usb'])
                .withDescription('Control both relay and usb or only the relay with the physical switch button'),
            e.overload_protection(100, 2500)],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.magnet.agl02'],
        model: 'MCCGQ12LM',
        vendor: 'Aqara',
        description: 'Door and window sensor T1',
        whiteLabel: [{vendor: 'Aqara', model: 'DW-S03D'}],
        fromZigbee: [lumi.fromZigbee.lumi_contact, lumi.fromZigbee.lumi_specific, fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.plug.sacn02'],
        model: 'QBCZ14LM',
        vendor: 'Aqara',
        description: 'Smart wall outlet T1',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_led_disabled_night,
            lumi.toZigbee.lumi_overload_protection, lumi.toZigbee.lumi_socket_button_lock],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE), e.energy(),
            e.device_temperature().withAccess(ea.STATE), e.voltage(),
            e.current(), e.power_outage_memory(), e.led_disabled_night(), e.button_lock(),
            e.overload_protection(100, 2500)],
        extend: [lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.remote.rkba01'],
        model: 'ZNXNKG02LM',
        vendor: 'Aqara',
        description: 'Smart rotary knob H1 (wireless)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR'), lumiPreventReset()],
        exposes: [e.battery(), e.battery_voltage(),
            e.action(['single', 'double', 'hold', 'release', 'start_rotating', 'rotation', 'stop_rotating']),
            e.enum('operation_mode', ea.ALL, ['event', 'command']).withDescription('Button mode'),
            e.enum('action_rotation_button_state', ea.STATE, ['released', 'pressed']).withDescription('Button state during rotation'),
            e.numeric('action_rotation_angle', ea.STATE).withUnit('*').withDescription('Rotation angle'),
            e.numeric('action_rotation_angle_speed', ea.STATE).withUnit('*').withDescription('Rotation angle speed'),
            e.numeric('action_rotation_percent', ea.STATE).withUnit('%').withDescription('Rotation percent'),
            e.numeric('action_rotation_percent_speed', ea.STATE).withUnit('%').withDescription('Rotation percent speed'),
            e.numeric('action_rotation_time', ea.STATE).withUnit('ms').withDescription('Rotation time'),
        ],
        fromZigbee: [lumi.fromZigbee.lumi_action, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_basic,
            lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_knob_rotation],
        toZigbee: [lumi.toZigbee.lumi_operation_mode_opple],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
    },
    {
        zigbeeModel: ['lumi.remote.acn003'],
        model: 'WXKG16LM',
        vendor: 'Aqara',
        description: 'Wireless remote switch E1 (single rocker)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR')],
        fromZigbee: [lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [lumi.toZigbee.lumi_switch_click_mode],
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'hold']),
            e.enum('click_mode', ea.ALL, ['fast', 'multi'])
                .withDescription('Click mode, fast: only supports single click which will be send immediately after clicking.' +
                    'multi: supports more events like double and hold')],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {0x0125: {value: 0x02, type: 0x20}}, {manufacturerCode: manufacturerCode});
        },
    },
    {
        zigbeeModel: ['lumi.remote.acn004'],
        model: 'WXKG17LM',
        vendor: 'Aqara',
        description: 'Wireless remote switch E1 (double rocker)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR'), lumiPreventReset()],
        exposes: [e.battery(), e.battery_voltage(),
            e.action(['single_left', 'single_right', 'single_both', 'double_left', 'double_right', 'hold_left', 'hold_right']),
            // eslint-disable-next-line max-len
            e.enum('click_mode', ea.ALL, ['fast', 'multi']).withDescription('Click mode, fast: only supports single click which will be send immediately after clicking, multi: supports more events like double and hold'),
        ],
        fromZigbee: [lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [lumi.toZigbee.lumi_switch_click_mode],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            // set multiclick mode
            await endpoint1.write('manuSpecificLumi', {0x0125: {value: 0x02, type: 0x20}}, {manufacturerCode: manufacturerCode});
        },
    },
    {
        zigbeeModel: ['lumi.remote.b18ac1'],
        model: 'WXKG14LM',
        vendor: 'Aqara',
        description: 'Wireless remote switch H1 (single rocker)',
        fromZigbee: [lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific, fz.command_toggle],
        toZigbee: [lumi.toZigbee.lumi_switch_click_mode, lumi.toZigbee.lumi_operation_mode_opple],
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'triple', 'hold']),
            e.enum('click_mode', ea.ALL, ['fast', 'multi'])
                .withDescription('Click mode, fast: only supports single click which will be send immediately after clicking.' +
                    'multi: supports more events like double and hold'),
            e.enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
            await endpoint1.read('manuSpecificLumi', [0x0125], {manufacturerCode: manufacturerCode});
        },
    },
    {
        zigbeeModel: ['lumi.airrtc.agl001'],
        model: 'SRTS-A01',
        vendor: 'Aqara',
        description: 'Smart radiator thermostat E1',
        fromZigbee: [lumi.fromZigbee.lumi_trv, fz.thermostat, fz.battery],
        toZigbee: [lumi.toZigbee.lumi_trv, tz.thermostat_occupied_heating_setpoint],
        exposes: [
            e.setup().withDescription('Indicates if the device is in setup mode (E11)'),
            e.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature(ea.STATE, 'Current temperature measured by the internal or external sensor')
                .withSystemMode(['off', 'heat'], ea.ALL)
                .withPreset(['manual', 'away', 'auto'])
                .setAccess('preset', ea.ALL),
            e.temperature_sensor_select(['internal', 'external']).withAccess(ea.ALL),
            e.external_temperature_input().withDescription('Input for remote temperature sensor (when sensor is set to external)'),
            e.calibrated().withDescription('Indicates if this valve is calibrated, use the calibrate option to calibrate'),
            e.enum('calibrate', ea.ALL, ['calibrate'])
                .withDescription('Calibrates the valve')
                .withCategory('config'),
            e.child_lock_bool(), e.window_detection_bool(), e.window_open(), e.valve_detection_bool(),
            e.valve_alarm().withDescription('Notifies of a temperature control abnormality if valve detection is enabled ' +
                    '(e.g., thermostat not installed correctly, valve failure or incorrect calibration, ' +
                    'incorrect link to external temperature sensor)'),
            e.away_preset_temperature().withAccess(ea.ALL), e.battery_voltage(), e.battery(),
            e.power_outage_count(), e.device_temperature(), e.schedule(),
            e.schedule_settings()
                .withDescription('Smart schedule configuration (default: mon,tue,wed,thu,fri|8:00,24.0|18:00,17.0|23:00,22.0|8:00,22.0)'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            // Initialize battery percentage and voltage
            await endpoint.read('manuSpecificLumi', [0x040a], {manufacturerCode: manufacturerCode});
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
        },
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['aqara.feeder.acn001'],
        model: 'ZNCWWSQ01LM',
        vendor: 'Aqara',
        description: 'Smart pet feeder C1',
        whiteLabel: [{vendor: 'Aqara', model: 'PETC1-M01'}],
        fromZigbee: [lumi.fromZigbee.lumi_feeder],
        toZigbee: [lumi.toZigbee.lumi_feeder],
        exposes: [
            e.enum('feed', ea.STATE_SET, ['', 'START']).withDescription('Start feeding'),
            e.enum('feeding_source', ea.STATE, ['schedule', 'manual', 'remote']).withDescription('Feeding source'),
            e.numeric('feeding_size', ea.STATE).withDescription('Feeding size').withUnit('portion'),
            e.numeric('portions_per_day', ea.STATE).withDescription('Portions per day'),
            e.numeric('weight_per_day', ea.STATE).withDescription('Weight per day').withUnit('g'),
            e.binary('error', ea.STATE, true, false)
                .withDescription('Indicates whether there is an error with the feeder'),
            e.list('schedule', ea.STATE_SET, e.composite('dayTime', 'dayTime', exposes.access.STATE_SET)
                .withFeature(e.enum('days', exposes.access.STATE_SET, [
                    'everyday', 'workdays', 'weekend', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
                    'mon-wed-fri-sun', 'tue-thu-sat']))
                .withFeature(e.numeric('hour', exposes.access.STATE_SET))
                .withFeature(e.numeric('minute', exposes.access.STATE_SET))
                .withFeature(e.numeric('size', exposes.access.STATE_SET)),
            ).withDescription('Feeding schedule'),
            e.switch_().withState('led_indicator', true, 'Led indicator', ea.STATE_SET, 'ON', 'OFF'),
            e.child_lock(),
            e.enum('mode', ea.STATE_SET, ['schedule', 'manual']).withDescription('Feeding mode'),
            e.numeric('serving_size', ea.STATE_SET).withValueMin(1).withValueMax(10).withDescription('One serving size')
                .withUnit('portion'),
            e.numeric('portion_weight', ea.STATE_SET).withValueMin(1).withValueMax(20).withDescription('Portion weight')
                .withUnit('g'),
        ],
        extend: [lumiZigbeeOTA()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('manuSpecificLumi', [0xfff1], {manufacturerCode: manufacturerCode});
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.remote.acn007'],
        model: 'WXKG20LM',
        vendor: 'Aqara',
        description: 'Wireless mini switch E1',
        fromZigbee: [fz.battery, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR')],
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'hold', 'release']),
            e.device_temperature(), e.power_outage_count()],
    },
    {
        zigbeeModel: ['lumi.remote.acn009'],
        model: 'WXKG22LM',
        vendor: 'Aqara',
        description: 'Wireless remote switch H1M (double rocker)',
        fromZigbee: [fz.battery, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific, fz.command_toggle],
        toZigbee: [lumi.toZigbee.lumi_switch_click_mode, lumi.toZigbee.lumi_operation_mode_opple],
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}, multiEndpoint: true},
        extend: [quirkCheckinInterval('1_HOUR')],
        exposes: [
            e.battery(), e.battery_voltage(), e.action([
                'single_left', 'single_right', 'single_both',
                'double_left', 'double_right', 'double_both',
                'triple_left', 'triple_right', 'triple_both',
                'hold_left', 'hold_right', 'hold_both']),
            e.enum('click_mode', ea.ALL, ['fast', 'multi'])
                .withDescription('Click mode, fast: only supports single click which will be send immediately after clicking.' +
                    'multi: supports more events like double and hold'),
            e.enum('operation_mode', ea.ALL, ['command', 'event'])
                .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(3);
            // set "event" mode
            await endpoint1.write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode});
            // turn on the "multiple clicks" mode, otherwise the only "single click" events.
            // if value is 1 - there will be single clicks, 2 - multiple.
            await endpoint1.write('manuSpecificLumi', {0x0125: {value: 0x02, type: 0x20}}, {manufacturerCode: manufacturerCode});
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            // TODO/BUG:
            // Did not understand how to separate the left and right keys in command mode -
            // the "toggleCommand" always arrives from the first endpoint
        },
    },
    {
        zigbeeModel: ['lumi.remote.b286acn03'],
        model: 'WXKG04LM',
        vendor: 'Aqara',
        description: 'Wireless remote switch T1 (double rocker)',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        fromZigbee: [lumi.fromZigbee.lumi_basic, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [],
        endpoint: (device) => {
            return {left: 1, right: 2, both: 3};
        },
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
            'button_3_hold', 'button_3_release', 'button_3_single', 'button_3_double', 'button_3_triple',
        ])],
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
    },
    {
        zigbeeModel: ['lumi.switch.acn048'],
        model: 'ZNQBKG38LM',
        vendor: 'Aqara',
        description: 'Smart wall switch Z1 (single rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            lumiOnOff({operationMode: true, powerOutageMemory: 'enum', lockRelay: true}),
            lumiAction(),
            lumiElectricityMeter(),
            lumiPower(),
            lumiLedDisabledNight(),
            lumiClickMode({attribute: {ID: 0x0286, type: 0x20}}),
            lumiSetEventMode(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.acn049'],
        model: 'ZNQBKG39LM',
        vendor: 'Aqara',
        description: 'Smart wall switch Z1 (double rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            deviceEndpoints({endpoints: {'top': 1, 'bottom': 2}}),
            lumiOnOff({
                operationMode: true,
                powerOutageMemory: 'enum',
                lockRelay: true,
                endpointNames: ['top', 'bottom'],
            }),
            lumiAction({endpointNames: ['top', 'bottom']}),
            lumiElectricityMeter(),
            lumiPower(),
            lumiLedDisabledNight(),
            lumiClickMode({attribute: {ID: 0x0286, type: 0x20}}),
            lumiSetEventMode(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.acn054'],
        model: 'ZNQBKG40LM',
        vendor: 'Aqara',
        description: 'Smart wall switch Z1 (triple rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            deviceEndpoints({endpoints: {'top': 1, 'center': 2, 'bottom': 3}}),
            lumiOnOff({
                operationMode: true,
                powerOutageMemory: 'enum',
                lockRelay: true,
                endpointNames: ['top', 'center', 'bottom']}),
            lumiAction({endpointNames: ['top', 'center', 'bottom']}),
            lumiElectricityMeter(),
            lumiPower(),
            lumiLedDisabledNight(),
            lumiClickMode({attribute: {ID: 0x0286, type: 0x20}}),
            lumiSetEventMode(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.acn055'],
        model: 'ZNQBKG41LM',
        vendor: 'Aqara',
        description: 'Smart wall switch Z1 (quadruple rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            deviceEndpoints({endpoints: {'top': 1, 'center': 2, 'bottom': 3, 'wireless': 4}}),
            lumiOnOff({
                operationMode: true,
                powerOutageMemory: 'enum',
                lockRelay: true,
                endpointNames: ['top', 'center', 'bottom'],
            }),
            lumiAction({
                actionLookup: {'hold': 0, 'single': 1, 'double': 2, 'release': 255},
                endpointNames: ['top', 'center', 'bottom', 'wireless']}),
            lumiElectricityMeter(),
            lumiPower(),
            lumiLedDisabledNight(),
            lumiClickMode({attribute: {ID: 0x0286, type: 0x20}}),
            lumiSetEventMode(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.acn056'],
        model: 'ZNQBKG42LM',
        vendor: 'Aqara',
        description: 'Smart wall switch Z1 Pro (single rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            lumiOnOff({operationMode: true, powerOutageMemory: 'enum', lockRelay: true}),
            lumiAction({extraActions: ['slider_single', 'slider_double', 'slider_hold', 'slider_up', 'slider_down']}),
            lumiElectricityMeter(),
            lumiPower(),
            lumiClickMode({attribute: {ID: 0x0286, type: 0x20}}),
            lumiSlider(),
            lumiSwitchMode(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.acn057'],
        model: 'ZNQBKG43LM',
        vendor: 'Aqara',
        description: 'Smart wall switch Z1 Pro (double rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            deviceEndpoints({endpoints: {'top': 1, 'bottom': 2}}),
            lumiOnOff({
                operationMode: true,
                powerOutageMemory: 'enum',
                lockRelay: true,
                endpointNames: ['top', 'bottom'],
            }),
            lumiAction({
                endpointNames: ['top', 'bottom'],
                extraActions: ['slider_single', 'slider_double', 'slider_hold', 'slider_up', 'slider_down'],
            }),
            lumiElectricityMeter(),
            lumiPower(),
            lumiClickMode({attribute: {ID: 0x0286, type: 0x20}}),
            lumiSlider(),
            lumiSwitchMode(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.acn058'],
        model: 'ZNQBKG44LM',
        vendor: 'Aqara',
        description: 'Smart wall switch Z1 Pro (triple rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            deviceEndpoints({endpoints: {'top': 1, 'center': 2, 'bottom': 3}}),
            lumiOnOff({
                operationMode: true,
                powerOutageMemory: 'enum',
                lockRelay: true,
                endpointNames: ['top', 'center', 'bottom']}),
            lumiAction({
                endpointNames: ['top', 'center', 'bottom'],
                extraActions: ['slider_single', 'slider_double', 'slider_hold', 'slider_up', 'slider_down'],
            }),
            lumiElectricityMeter(),
            lumiPower(),
            lumiClickMode({attribute: {ID: 0x0286, type: 0x20}}),
            lumiSlider(),
            lumiSwitchMode(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.acn059'],
        model: 'ZNQBKG45LM',
        vendor: 'Aqara',
        description: 'Smart wall switch Z1 Pro (quadruple rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            deviceEndpoints({endpoints: {'top': 1, 'center': 2, 'bottom': 3, 'wireless': 4}}),
            lumiOnOff({
                operationMode: true,
                powerOutageMemory: 'enum',
                lockRelay: true,
                endpointNames: ['top', 'center', 'bottom'],
            }),
            lumiAction({
                actionLookup: {'hold': 0, 'single': 1, 'double': 2, 'release': 255},
                endpointNames: ['top', 'center', 'bottom', 'wireless'],
                extraActions: ['slider_single', 'slider_double', 'slider_hold', 'slider_up', 'slider_down'],
            }),
            lumiElectricityMeter(),
            lumiPower(),
            lumiClickMode({attribute: {ID: 0x0286, type: 0x20}}),
            lumiSlider(),
            lumiSwitchMode(),
        ],
    },
    {
        zigbeeModel: ['lumi.switch.acn061'],
        model: 'WS-K01D',
        vendor: 'Aqara',
        description: 'Smart 20A Switch H1 (single rocker)',
        extend: [
            lumiZigbeeOTA(),
            lumiPreventReset(),
            lumiOnOff({operationMode: true, powerOutageMemory: 'binary'}),
            lumiAction({actionLookup: {'single': 1, 'double': 2}}),
            lumiElectricityMeter(),
            lumiPower(),
            lumiLedDisabledNight(),
            lumiSetEventMode(),
            lumiFlipIndicatorLight(),
        ],
    },
    {
        zigbeeModel: ['lumi.remote.cagl02'],
        model: 'CTP-R01',
        vendor: 'Aqara',
        whiteLabel: [{vendor: 'Aqara', model: 'MFCZQ12LM'}],
        description: 'Cube T1 Pro',
        meta: {battery: {voltageToPercentage: '3V_2850_3000'}},
        extend: [quirkCheckinInterval('1_HOUR'), lumiZigbeeOTA()],
        fromZigbee: [lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_action_multistate,
            lumi.fromZigbee.lumi_action_analog, fz.ignore_onoff_report],
        toZigbee: [lumi.toZigbee.lumi_cube_operation_mode],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.power_outage_count(false),
            e.enum('operation_mode', ea.SET, ['action_mode', 'scene_mode'])
                .withDescription('[Soft Switch]: There is a configuration window, opens once an hour on itself, ' +
                    'only during which the cube will respond to mode switch. ' +
                    'Mode switch will be scheduled to take effect when the window becomes available. ' +
                    'You can also give it a throw action (no backward motion) to force a respond! ' +
                    'Otherwise, you may open lid and click LINK once to make the cube respond immediately. ' +
                    '[Hard Switch]: Open lid and click LINK button 5 times.'),
            e.cube_side('side'),
            e.action([
                'shake', 'throw', 'tap', 'slide', 'flip180', 'flip90', 'hold', 'side_up',
                'rotate_left', 'rotate_right', '1_min_inactivity', 'flip_to_side',
            ]).withDescription('Triggered action'),
            e.cube_side('action_from_side'),
            e.angle('action_angle'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            device.softwareBuildID = `0.0.0_00${device.applicationVersion}`;
            device.save();

            const endpoint = device.getEndpoint(1);
            await endpoint.write('manuSpecificLumi', {mode: 1}, {manufacturerCode: manufacturerCode,
                disableDefaultResponse: true, disableResponse: true});
            await endpoint.read('manuSpecificLumi', [0x148], {manufacturerCode: manufacturerCode,
                disableDefaultResponse: true, disableResponse: true});
        },
    },
    {
        zigbeeModel: ['lumi.switch.acn040'],
        model: 'ZNQBKG31LM',
        vendor: 'Aqara',
        description: 'Smart wall switch E1 (with neutral, triple rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple,
            lumi.toZigbee.lumi_switch_power_outage_memory, lumi.toZigbee.lumi_switch_mode_switch,
            lumi.toZigbee.lumi_flip_indicator_light],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true},
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for center button')
                .withEndpoint('center'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.action(['single_left', 'double_left', 'single_center', 'double_center', 'single_right', 'double_right',
                'single_left_center', 'double_left_center', 'single_left_right', 'double_left_right',
                'single_center_right', 'double_center_right', 'single_all', 'double_all']),
            e.power_outage_memory(), e.device_temperature(), e.flip_indicator_light(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.acn029'],
        model: 'ZNQBKG24LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1M (with neutral, single rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_power, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific],
        toZigbee: [
            tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_flip_indicator_light,
        ],
        exposes: [
            e.switch(), e.power(), e.energy(), e.voltage(), e.device_temperature(),
            e.action(['single', 'double']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode'),
            e.power_outage_memory(), e.led_disabled_night(), e.flip_indicator_light(),
        ],
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.acn030'],
        model: 'ZNQBKG25LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1M (with neutral, double rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_power],
        toZigbee: [
            tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_flip_indicator_light,
        ],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true},
        exposes: [
            e.power(), e.energy(), e.voltage(),
            e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.action(['single_left', 'double_left', 'single_right', 'double_right',
                'single_left_right', 'double_left_right', 'single_all', 'double_all']),
            e.power_outage_memory(), e.led_disabled_night(), e.device_temperature(), e.flip_indicator_light(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.switch.acn031'],
        model: 'ZNQBKG26LM',
        vendor: 'Aqara',
        description: 'Smart wall switch H1M (with neutral, triple rocker)',
        fromZigbee: [fz.on_off, lumi.fromZigbee.lumi_action_multistate, lumi.fromZigbee.lumi_specific, lumi.fromZigbee.lumi_power],
        toZigbee: [
            tz.on_off, lumi.toZigbee.lumi_switch_operation_mode_opple, lumi.toZigbee.lumi_switch_power_outage_memory,
            lumi.toZigbee.lumi_led_disabled_night, lumi.toZigbee.lumi_flip_indicator_light,
        ],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true},
        exposes: [
            e.power(), e.energy(), e.voltage(),
            e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for left button')
                .withEndpoint('left'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for center button')
                .withEndpoint('center'),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled'])
                .withDescription('Decoupled mode for right button')
                .withEndpoint('right'),
            e.action(['single_left', 'double_left', 'single_center', 'double_center', 'single_right', 'double_right',
                'single_left_center', 'double_left_center', 'single_left_right', 'double_left_right',
                'single_center_right', 'double_center_right', 'single_all', 'double_all']),
            e.power_outage_memory(), e.led_disabled_night(), e.device_temperature(), e.flip_indicator_light(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).write('manuSpecificLumi', {'mode': 1}, {manufacturerCode: manufacturerCode, disableResponse: true});
        },
        extend: [lumiZigbeeOTA(), lumiPreventReset()],
    },
    {
        zigbeeModel: ['lumi.plug.aeu001'],
        model: 'WP-P01D',
        vendor: 'Aqara',
        description: 'Smart wall outlet H2 EU',
        extend: [
            lumiZigbeeOTA(),
            lumiOnOff({powerOutageMemory: 'enum'}),
            lumiPower(),
            lumiElectricityMeter(),
            lumiOverloadProtection(),
            lumiLedIndicator(),
            lumiButtonLock(),
            binary({
                name: 'charging_protection',
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x0202, type: 0x10},
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                description: 'Turn off the outlet if the power is below the set limit for half an hour',
                access: 'ALL',
                zigbeeCommandOptions: {manufacturerCode},
            }),
            numeric({
                name: 'charging_limit',
                cluster: 'manuSpecificLumi',
                attribute: {ID: 0x0206, type: 0x39},
                valueMin: 0.1,
                valueMax: 2,
                valueStep: 0.1,
                unit: 'W',
                description: 'Charging protection power limit',
                access: 'ALL',
                zigbeeCommandOptions: {manufacturerCode},
            }),
        ],
    },
    {
        zigbeeModel: ['lumi.light.acn031'],
        model: 'HCXDD12LM',
        vendor: 'Aqara',
        description: 'Ceiling light T1',
        extend: [
            deviceEndpoints({endpoints: {'white': 1, 'rgb': 2}}),
            lumiLight({colorTemp: true, powerOutageMemory: 'light', endpointNames: ['white']}),
            lumiLight({colorTemp: true, deviceTemperature: false, powerOutageCount: false, color: {modes: ['xy', 'hs']}, endpointNames: ['rgb']}),
            lumiZigbeeOTA(),
        ],
    },
    {
        zigbeeModel: ['lumi.light.acn032'],
        model: 'CL-L02D',
        vendor: 'Aqara',
        description: 'Ceiling light T1M',
        extend: [
            deviceEndpoints({endpoints: {'white': 1, 'rgb': 2}}),
            lumiLight({colorTemp: true, powerOutageMemory: 'light', endpointNames: ['white']}),
            lumiLight({colorTemp: true, deviceTemperature: false, powerOutageCount: false, color: {modes: ['xy', 'hs']}, endpointNames: ['rgb']}),
            lumiZigbeeOTA(),
        ],
    },
];

export default definitions;
module.exports = definitions;
