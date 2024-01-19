import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as ota from '../lib/ota';
import {light, onOff} from '../lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['5121.10'],
        model: '5121.10',
        vendor: 'Iluminize',
        description: 'Rotary dimmer with integrated Zigbee 3.0 dimming actuator',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['5120.2210'],
        model: '5120.2210',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 actuator mini 1x 230V',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['511.050'],
        model: '511.050',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 LED controller for 5in1 RGB+CCT LEDs',
        extend: [light({colorTemp: {range: [155, 450]}, color: true})],
    },
    {
        zigbeeModel: ['DIM Lighting'],
        model: '511.10',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller ',
        extend: [light()],
    },
    {
        zigbeeModel: ['511.201'],
        model: '511.201',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 dimming actuator mini 1x 230V',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['5120.1100'],
        model: '5120.1100',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 dimming actuator mini 1x 230V',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['5120.1110'],
        model: '5120.1110',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 dimming actuator mini 1x 230V',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['5120.2110'],
        model: '5120.2110',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 dimming actuator mini 1x 230V',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['5123.1110'],
        model: '5123.1110',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 controller with adjustable current 250-1500mA, max. 50W / 48V SELV',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['511.010'],
        model: '511.010',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller',
        extend: [light()],
    },
    {
        zigbeeModel: ['511.012'],
        model: '511.012',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller',
        extend: [light()],
    },
    {
        zigbeeModel: ['511.202'],
        model: '511.202',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V, 200W/400W',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['5120.1200'],
        model: '5120.1200',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V with neutral, 200W/400W',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['5120.1210'],
        model: '5120.1210',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V without neutral, 200W/400W',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['5128.10'],
        model: '5128.10',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch shutter SW with level control',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_via_brightness],
        exposes: [e.cover_position()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['ZG2801K2-G1-RGB-CCT-LEAD'],
        model: '511.557',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 wall dimmer',
        fromZigbee: [fz.command_off, fz.command_on, fz.command_move_to_color_temp, fz.command_move_to_color],
        toZigbee: [],
        exposes: [e.action(['off', 'on', 'color_temperature_move', 'color_move'])],
    },
    {
        zigbeeModel: ['RGBW-CCT', '511.040'],
        model: '511.040',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 LED-controller, 4 channel 5A, RGBW LED',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['HK-ZD-RGB-A', '5110.40'],
        model: '5110.40',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 LED controller multi 5 - 4A,RGB W/CCT LED',
        extend: [light({colorTemp: {range: [160, 450]}, color: true})],
    },
    {
        zigbeeModel: ['HK-ZD-RGBCCT-A', '511.000'],
        model: '511.000',
        vendor: 'Iluminize',
        whiteLabel: [{vendor: 'Sunricher', model: 'HK-ZD-RGBCCT-A'}],
        description: 'Zigbee 3.0 universal LED-controller, 5 channel, RGBCCT LED',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['ZG2819S-RGBW'],
        model: '511.344',
        vendor: 'Iluminize',
        description: 'Zigbee handheld remote RGBW 4 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.command_on, fz.command_off],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'hue_stop', 'brightness_step_up', 'brightness_step_down',
            'recall_*', 'on', 'off']),
        e.composite('action_color', 'action_color', ea.STATE)
            .withFeature(e.numeric('x', ea.STATE))
            .withFeature(e.numeric('y', ea.STATE))
            .withDescription('Only shows the transmitted color in X7Y-Mode. Noch changes possible.'),
        e.numeric('action_color_temperature', ea.STATE).withUnit('mired')
            .withDescription('color temperature value. Fixed values for each key press: 145, 175, 222, 304, 480 mired'),
        e.numeric('action_group', ea.STATE)
            .withDescription('Shows the zigbee2mqtt group bound to the active data point EP(1-4).'),
        e.numeric('action_transition_time', ea.STATE),
        e.numeric('action_step_size', ea.STATE),
        e.numeric('action_rate', ea.STATE)],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },
    {
        zigbeeModel: ['511.324'],
        model: '511.324',
        vendor: 'Iluminize',
        description: 'Zigbee handheld remote CCT 4 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.command_on, fz.command_off, fz.command_toggle, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down',
            'recall_*', 'on', 'off', 'toggle', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'color_loop_set', 'enhanced_move_to_hue_and_saturation', 'hue_stop']),
        e.numeric('action_group', ea.STATE)
            .withDescription('Shows the zigbee2mqtt group bound to the active data point EP(1-4).'),
        e.numeric('action_transition_time', ea.STATE),
        e.numeric('action_step_size', ea.STATE),
        e.numeric('action_rate', ea.STATE)],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },
    {
        zigbeeModel: ['ZGRC-TEUR-002'],
        model: '511.541',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 wall dimmer RGBW 1 zone',
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_move_to_color, fz.command_move_to_color_temp,
            fz.command_move_hue, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
        exposes: [e.action(['recall_*', 'on', 'off', 'color_move', 'color_temperature_move',
            'hue_move', 'brightness_step_down', 'brightness_step_up', 'brightness_move_down', 'brightness_move_up', 'brightness_stop'])],
    },
    {
        zigbeeModel: ['5112.80'],
        model: '5112.80',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 LED-controller 1x 8A',
        extend: [light()],
    },
    {
        zigbeeModel: ['ZGRC-TEUR-001'],
        model: '511.544',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 wall dimmer RGBW 4 zones',
        fromZigbee: [fz.command_move_to_color, fz.command_move_hue, fz.command_on, fz.command_off, fz.command_move],
        toZigbee: [],
        exposes: [e.action(['recall_*', 'on', 'off', 'color_move', 'color_temperature_move',
            'hue_move', 'brightness_step_down', 'brightness_step_up', 'brightness_move_down', 'brightness_move_up', 'brightness_stop'])],
    },
    {
        zigbeeModel: ['ZGRC-TEUR-003'],
        model: '511.524',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 wall dimmer CCT 4 zones',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_recall,
            fz.command_move_to_color_temp, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        exposes: [e.action([
            'recall_*', 'on', 'off',
            'brightness_step_down', 'brightness_step_up',
            'brightness_move_down', 'brightness_move_up', 'brightness_stop',
            'color_move', 'color_temperature_move', 'hue_move',
            'color_loop_set', 'enhanced_move_to_hue_and_saturation', 'hue_stop'])],
    },
];

export default definitions;
module.exports = definitions;
