import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {deviceEndpoints, electricityMeter, light, onOff} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['ROB_200-060-0'],
        model: 'ROB_200-060-0',
        vendor: 'ROBB',
        description: 'Zigbee LED driver',
        extend: [light({colorTemp: {range: [160, 450]}, color: true})],
    },
    {
        zigbeeModel: ['ROB_200-061-0'],
        model: 'ROB_200-061-0',
        vendor: 'ROBB',
        description: '50W Zigbee CCT LED driver (constant current)',
        extend: [light({colorTemp: {range: [160, 450]}})],
    },
    {
        zigbeeModel: ['ROB_200-029-0'],
        model: 'ROB_200-029-0',
        vendor: 'ROBB',
        description: 'Zigbee curtain motor controller',
        meta: {coverInverted: true},
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['ROB_200-050-0'],
        model: 'ROB_200-050-0',
        vendor: 'ROBB',
        description: '4 port switch with 2 usb ports (no metering)',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4', 'l5']}),
        ],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9023A(EU)'}],
    },
    {
        zigbeeModel: ['ROB_200-006-0'],
        model: 'ROB_200-006-0',
        vendor: 'ROBB',
        description: 'ZigBee LED dimmer',
        extend: [light()],
    },
    {
        zigbeeModel: ['ROB_200-004-0'],
        model: 'ROB_200-004-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['ROB_200-011-0'],
        model: 'ROB_200-011-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut dimmer',
        extend: [
            light({configureReporting: true}),
            electricityMeter({current: {divisor: 1000}, voltage: {divisor: 10}, power: {divisor: 10}}),
        ],
    },
    {
        zigbeeModel: ['ROB_200-003-0'],
        model: 'ROB_200-003-0',
        vendor: 'ROBB',
        description: 'Zigbee AC in wall switch (push switch)',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['ROB_200-003-1'],
        model: 'ROB_200-003-1',
        vendor: 'ROBB',
        description: 'Zigbee AC in wall switch (normal switch)',
        extend: [onOff({'powerOnBehavior': false})],
    },
    {
        zigbeeModel: ['ROB_200-030-0'],
        model: 'ROB_200-030-0',
        vendor: 'ROBB',
        description: 'Zigbee AC in wall switch 400W (2-wire)',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['ROB_200-014-0'],
        model: 'ROB_200-014-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut rotary dimmer',
        extend: [
            light({configureReporting: true}),
            electricityMeter(),
        ],
        whiteLabel: [{vendor: 'YPHIX', model: '50208695'}, {vendor: 'Samotech', model: 'SM311'}],
    },
    {
        zigbeeModel: ['ZG2833K8_EU05', 'ROB_200-007-0'],
        model: 'ROB_200-007-0',
        vendor: 'ROBB',
        description: 'Zigbee 8 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery, fz.ignore_genOta],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2',
            'on_3', 'off_3', 'brightness_move_up_3', 'brightness_move_down_3', 'brightness_stop_3',
            'on_4', 'off_4', 'brightness_move_up_4', 'brightness_move_down_4', 'brightness_stop_4'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K8-DIM'}],
    },
    {
        zigbeeModel: ['ROB_200-024-0'],
        model: 'ROB_200-024-0',
        vendor: 'ROBB',
        description: 'Zigbee 3.0 4 channel remote control',
        fromZigbee: [fz.battery, fz.command_move, fz.command_stop, fz.command_on, fz.command_off, fz.command_recall],
        exposes: [e.battery(), e.action(['brightness_move_up', 'brightness_move_down', 'brightness_stop', 'on', 'off', 'recall_*'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'RGB Genie', model: 'ZGRC-KEY-013'}],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genScenes']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['ROB_200-025-0'],
        model: 'ROB_200-025-0',
        vendor: 'ROBB',
        description: 'Zigbee 8 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery, fz.ignore_genOta],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2',
            'on_3', 'off_3', 'brightness_move_up_3', 'brightness_move_down_3', 'brightness_stop_3',
            'on_4', 'off_4', 'brightness_move_up_4', 'brightness_move_down_4', 'brightness_stop_4'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ZG2833K4_EU06', 'ROB_200-008', 'ROB_200-008-0'],
        model: 'ROB_200-008-0',
        vendor: 'ROBB',
        description: 'Zigbee 4 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'stop_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K4-DIM2'}],
    },
    {
        zigbeeModel: ['ROB_200-009-0'],
        model: 'ROB_200-009-0',
        vendor: 'ROBB',
        description: 'Zigbee 2 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K2-DIM'}],
    },
    {
        zigbeeModel: ['Motor Controller', 'ROB_200-010-0'],
        model: 'ROB_200-010-0',
        vendor: 'ROBB',
        description: 'Zigbee curtain motor controller',
        meta: {coverInverted: true},
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['ROB_200-018-0'],
        model: 'ROB_200-018-0',
        vendor: 'ROBB',
        description: 'ZigBee knob smart dimmer',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move_to_level, fz.command_move_to_color_temp, fz.battery,
            fz.command_move_to_color],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_to_level', 'color_temperature_move', 'color_move'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG2835'}],
    },
    {
        zigbeeModel: ['ROB_200-017-0', 'HK-PLUG-A'],
        model: 'ROB_200-017-0',
        vendor: 'ROBB',
        description: 'Zigbee smart plug',
        fromZigbee: [fz.electrical_measurement, fz.on_off, fz.ignore_genLevelCtrl_report, fz.metering, fz.temperature],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'msTemperatureMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.temperature(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.power(), e.current(), e.voltage(), e.switch(), e.energy(), e.temperature()],
    },
    {
        zigbeeModel: ['ROB_200-017-1'],
        model: 'ROB_200-017-1',
        vendor: 'ROBB',
        description: 'Zigbee smart plug',
        fromZigbee: [fz.electrical_measurement, fz.on_off, fz.ignore_genLevelCtrl_report, fz.metering, fz.temperature],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'msTemperatureMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.temperature(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.power(), e.current(), e.voltage(), e.switch(), e.energy(), e.temperature()],
    },
    {
        zigbeeModel: ['ROB_200-016-0'],
        model: 'ROB_200-016-0',
        vendor: 'ROBB',
        description: 'RGB CCT DIM 3 in 1 Zigbee Remote',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.command_on, fz.command_off, fz.command_toggle, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation],
        toZigbee: [],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down',
            'recall_*', 'on', 'off', 'toggle', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'color_loop_set', 'enhanced_move_to_hue_and_saturation', 'hue_stop'])],
    },
    {
        zigbeeModel: ['ROB_200-026-0'],
        model: 'ROB_200-026-0',
        vendor: 'ROBB',
        description: '2-gang in-wall switch',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.energy()],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            await endpoint1.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.activePower(endpoint1);
            await reporting.readMeteringMultiplierDivisor(endpoint1);
            await reporting.currentSummDelivered(endpoint1, {min: 60, change: 1});
        },
    },
    {
        zigbeeModel: ['ROB_200-035-0'],
        model: 'ROB_200-035-0',
        vendor: 'ROBB',
        description: '1 channel switch with power monitoring',
        fromZigbee: [fz.electrical_measurement, fz.on_off, fz.ignore_genLevelCtrl_report, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['ROB_200-063-0'],
        model: 'ROB_200-063-0',
        vendor: 'ROBB',
        description: 'Zigbee 0-10V PWM dimmer',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
