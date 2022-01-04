const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['ON/OFF(2CH)'],
        model: 'UP-SA-9127D',
        vendor: 'Sunricher',
        description: 'LED-trading 2 channel AC switch',
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
        zigbeeModel: ['HK-ZD-CCT-A'],
        model: 'HK-ZD-CCT-A',
        vendor: 'Sunricher',
        description: '50W Zigbee CCT LED driver (constant current)',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [160, 450]}),
    },
    {
        zigbeeModel: ['ZGRC-KEY-007'],
        model: 'SR-ZG9001K2-DIM2',
        vendor: 'Sunricher',
        description: 'Zigbee 2 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'stop_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ZGRC-KEY-009'],
        model: '50208693',
        vendor: 'Sunricher',
        description: 'Zigbee wall remote control for RGBW, 1 zone with 2 scenes',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery,
            fz.command_recall, fz.command_step, fz.command_move_to_color, fz.command_move_to_color_temp],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off',
            'brightness_move_up', 'brightness_move_down', 'brightness_move_stop', 'brightness_step_up', 'brightness_step_down',
            'recall_1', 'recall_2'])],
    },
    {
        zigbeeModel: ['ZGRC-KEY-013'],
        model: 'SR-ZG9001K12-DIM-Z4',
        vendor: 'Sunricher',
        description: '4 zone remote and dimmer',
        fromZigbee: [fz.battery, fz.command_move, fz.legacy.ZGRC013_brightness_onoff,
            fz.legacy.ZGRC013_brightness, fz.command_stop, fz.legacy.ZGRC013_brightness_stop, fz.command_on,
            fz.legacy.ZGRC013_cmdOn, fz.command_off, fz.legacy.ZGRC013_cmdOff, fz.command_recall],
        exposes: [e.battery(), e.action(['brightness_move_up', 'brightness_move_down', 'brightness_stop', 'on', 'off', 'recall_*'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'RGB Genie', model: 'ZGRC-KEY-013'}],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genScenes']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['ZGRC-TEUR-005'],
        model: 'SR-ZG9001T4-DIM-EU',
        vendor: 'Sunricher',
        description: 'Zigbee wireless touch dimmer switch',
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        exposes: [e.action(['recall_*', 'on', 'off', 'brightness_stop', 'brightness_move_down', 'brightness_move_up',
            'brightness_step_down', 'brightness_step_up'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['CCT Lighting'],
        model: 'ZG192910-4',
        vendor: 'Sunricher',
        description: 'Zigbee LED-controller',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZG9101SAC-HP'],
        model: 'ZG9101SAC-HP',
        vendor: 'Sunricher',
        description: 'ZigBee AC phase-cut dimmer',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ON/OFF', 'ZIGBEE-SWITCH'],
        model: 'ZG9101SAC-HP-Switch',
        vendor: 'Sunricher',
        description: 'Zigbee AC in wall switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Micro Smart Dimmer', 'SM311', 'HK-SL-RDIM-A'],
        model: 'ZG2835RAC',
        vendor: 'Sunricher',
        description: 'ZigBee knob smart dimmer',
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.electrical_measurement, fz.metering, fz.ignore_genOta]),
        toZigbee: extend.light_onoff_brightness().toZigbee,
        exposes: [e.light_brightness(), e.power(), e.voltage(), e.current(), e.energy()],
        whiteLabel: [{vendor: 'YPHIX', model: '50208695'}, {vendor: 'Samotech', model: 'SM311'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2835'],
        model: 'ZG2835',
        vendor: 'Sunricher',
        description: 'ZigBee knob smart dimmer',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move_to_level],
        exposes: [e.action(['on', 'off', 'brightness_move_to_level'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['HK-SL-DIM-A'],
        model: 'SR-ZG9040A',
        vendor: 'Sunricher',
        description: 'Zigbee micro smart dimmer',
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.electrical_measurement, fz.metering, fz.ignore_genOta]),
        toZigbee: extend.light_onoff_brightness().toZigbee,
        exposes: [e.light_brightness(), e.power(), e.voltage(), e.current(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['HK-ZD-DIM-A'],
        model: 'SRP-ZG9105-CC',
        vendor: 'Sunricher',
        description: 'Constant Current Zigbee LED dimmable driver',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['SR-ZG9040A-S'],
        model: 'SR-ZG9040A-S',
        vendor: 'Sunricher',
        description: 'ZigBee AC phase-cut dimmer single-line',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Micro Smart OnOff', 'HK-SL-RELAY-A'],
        model: 'SR-ZG9100A-S',
        vendor: 'Sunricher',
        description: 'Zigbee AC in wall switch single-line',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2819S-CCT'],
        model: 'ZG2819S-CCT',
        vendor: 'Sunricher',
        description: 'Zigbee handheld remote CCT 4 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.command_on, fz.command_off, fz.command_toggle, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down',
            'recall_*', 'on', 'off', 'toggle', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'color_loop_set', 'enhanced_move_to_hue_and_saturation', 'hue_stop'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },
    {
        zigbeeModel: ['ZG2858A'],
        model: 'ZG2858A',
        vendor: 'Sunricher',
        description: 'Zigbee handheld remote RGBCCT 3 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.command_on, fz.command_off, fz.command_toggle, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down',
            'recall_*', 'on', 'off', 'toggle', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'color_loop_set', 'enhanced_move_to_hue_and_saturation', 'hue_stop'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3};
        },
    },
    {
        zigbeeModel: ['HK-ZCC-A'],
        model: 'SR-ZG9080A',
        vendor: 'Sunricher',
        description: 'Curtain motor controller',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x00000000010.....$/}],
        model: 'SR-ZGP2801K2-DIM',
        vendor: 'Sunricher',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fz.sunricher_switch2801K2],
        toZigbee: [],
        exposes: [e.action(['press_on', 'press_off', 'hold_on', 'hold_off', 'release'])],
    },
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x000000005d5.....$/}],
        model: 'SR-ZGP2801K4-DIM',
        vendor: 'Sunricher',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fz.sunricher_switch2801K4],
        toZigbee: [],
        exposes: [e.action(['press_on', 'press_off', 'press_high', 'press_low', 'hold_high', 'hold_low', 'release'])],
    },
];
