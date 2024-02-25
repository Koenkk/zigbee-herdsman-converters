import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'HK-SL-DIM-A', softwareBuildID: '2.5.3_r52'}, {modelID: 'HK-SL-DIM-A', softwareBuildID: '2.9.2_r54'}],
        model: 'VES-ZB-DIM-004',
        vendor: 'Vesternet',
        description: 'Zigbee dimmer',
        fromZigbee: extend.light_onoff_brightness().fromZigbee
            .concat([fz.electrical_measurement, fz.metering, fz.ignore_genOta]),
        toZigbee: extend.light_onoff_brightness().toZigbee.concat([tz.power_on_behavior]),
        exposes: [e.light_brightness().withLevelConfig(['on_transition_time', 'off_transition_time']),
            e.power(), e.voltage(), e.current(), e.energy(), e.power_on_behavior(['off', 'on', 'previous'])],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9040A'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering']);
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
        fingerprint: [{modelID: 'ON/OFF -M', softwareBuildID: '2.9.2_r54'}],
        model: 'VES-ZB-HLD-017',
        vendor: 'Vesternet',
        description: 'Zigbee high load switch',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior, fz.ignore_genOta],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.power_on_behavior(['off', 'on', 'previous'])],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9101SAC-HP-SWITCH-B'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'HK-ZCC-A', softwareBuildID: '2.5.3_r48'}],
        model: 'VES-ZB-MOT-019',
        vendor: 'Vesternet',
        description: 'Zigbee motor controller',
        fromZigbee: [fz.cover_position_tilt, fz.ignore_genOta],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9080A'}],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'ZGRC-KEY-013', softwareBuildID: '2.5.3_r20'}, {modelID: 'ZGRC-KEY-013', softwareBuildID: '2.7.6_r25'}],
        model: 'VES-ZB-REM-013',
        vendor: 'Vesternet',
        description: 'Zigbee remote control - 12 button',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.command_recall, fz.battery, fz.ignore_genOta],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'stop_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2',
            'on_3', 'off_3', 'stop_3', 'brightness_move_up_3', 'brightness_move_down_3', 'brightness_stop_3',
            'on_4', 'off_4', 'stop_4', 'brightness_move_up_4', 'brightness_move_down_4', 'brightness_stop_4',
            'recall_1_1', 'recall_1_2', 'recall_1_3', 'recall_1_4',
            'recall_2_1', 'recall_2_2', 'recall_2_3', 'recall_2_4'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}, publishDuplicateTransaction: true},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K12-DIM-Z4'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genScenes', 'genPowerCfg']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genScenes']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genScenes']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genScenes']);
            await reporting.batteryPercentageRemaining(device.getEndpoint(1));
        },
    },
    {
        fingerprint: [{modelID: 'HK-SL-RELAY-A', softwareBuildID: '2.5.3_r47'}, {modelID: 'HK-SL-RELAY-A', softwareBuildID: '2.9.2_r54'}],
        model: 'VES-ZB-SWI-005',
        vendor: 'Vesternet',
        description: 'Zigbee switch',
        fromZigbee: [fz.on_off, fz.power_on_behavior, fz.ignore_genOta],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power_on_behavior(['off', 'on', 'previous'])],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9100A-S'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'ON/OFF(2CH)', softwareBuildID: '2.5.3_r2'}, {modelID: 'ON/OFF(2CH)', softwareBuildID: '2.9.2_r3'}],
        model: 'VES-ZB-SWI-015',
        vendor: 'Vesternet',
        description: 'Zigbee 2 channel switch',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior, fz.ignore_genOta],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power(), e.current(), e.voltage(),
            e.energy(), e.power_on_behavior(['off', 'on', 'previous'])],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9101SAC-HP-SWITCH-2CH'}],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            if (device && device.softwareBuildID == '2.9.2_r3') {
                // newer firmware version power reports are on endpoint 11
                const endpoint11 = device.getEndpoint(11);
                await reporting.bind(endpoint11, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint11);
                await reporting.activePower(endpoint11);
                await reporting.rmsCurrent(endpoint11, {min: 10, change: 10});
                await reporting.rmsVoltage(endpoint11, {min: 10});
                await reporting.readMeteringMultiplierDivisor(endpoint11);
            } else if (device && device.softwareBuildID == '2.5.3_r2') {
                // older firmware version power reports are on endpoint 1
                await reporting.bind(endpoint1, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint1);
                await reporting.activePower(endpoint1);
                await reporting.rmsCurrent(endpoint1, {min: 10, change: 10});
                await reporting.rmsVoltage(endpoint1, {min: 10});
                await reporting.readMeteringMultiplierDivisor(endpoint1);
                await reporting.currentSummDelivered(endpoint1);
            }
        },
    },
    {
        fingerprint: [{modelID: 'ZG2833K2_EU07', softwareBuildID: '2.5.3_r20'}, {modelID: 'ZG2833K2_EU07', softwareBuildID: '2.7.6_r25'}],
        model: 'VES-ZB-WAL-006',
        vendor: 'Vesternet',
        description: 'Zigbee wall controller - 2 button',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery, fz.ignore_genOta],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K2-DIM2'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(device.getEndpoint(1));
        },
    },
    {
        fingerprint: [{modelID: 'ZG2833K4_EU06', softwareBuildID: '2.5.3_r20'}, {modelID: 'ZG2833K4_EU06', softwareBuildID: '2.7.6_r25'}],
        model: 'VES-ZB-WAL-011',
        vendor: 'Vesternet',
        description: 'Zigbee wall controller - 4 button',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery, fz.ignore_genOta],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'stop_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K4-DIM2'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.batteryPercentageRemaining(device.getEndpoint(1));
        },
    },
    {
        fingerprint: [{modelID: 'ZG2833K8_EU05', softwareBuildID: '2.5.3_r20'}, {modelID: 'ZG2833K8_EU05', softwareBuildID: '2.7.6_r25'}],
        model: 'VES-ZB-WAL-012',
        vendor: 'Vesternet',
        description: 'Zigbee wall controller - 8 button',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery, fz.ignore_genOta],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'stop_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2',
            'on_3', 'off_3', 'stop_3', 'brightness_move_up_3', 'brightness_move_down_3', 'brightness_stop_3',
            'on_4', 'off_4', 'stop_4', 'brightness_move_up_4', 'brightness_move_down_4', 'brightness_stop_4'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K8-DIM'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.batteryPercentageRemaining(device.getEndpoint(1));
        },
    },
];

export default definitions;
module.exports = definitions;
