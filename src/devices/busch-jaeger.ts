import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as globalStore from '../lib/store';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['PU01'],
        model: '6717-84',
        vendor: 'Busch-Jaeger',
        description: 'Adaptor plug',
        extend: extend.switch(),
    },
    {
        fingerprint: [{modelID: 'RM01', endpoints: [{ID: 10}, {ID: 11}, {ID: 12}, {ID: 13}, {ID: 18}]}],
        model: '6737',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link power supply relay/dimmer 4rows',
        endpoint: (device) => {
            return {'row_1': 0x0a, 'row_2': 0x0b, 'row_3': 0x0c, 'row_4': 0x0d, 'relay': 0x12};
        },
        exposes: [e.light_brightness().withEndpoint('relay'),
            e.action(['on_row_1', 'off_row_1', 'brightness_step_up_row_1', 'brightness_step_down_row_1', 'brightness_stop_row_1',
                'on_row_2', 'off_row_2', 'brightness_step_up_row_2', 'brightness_step_down_row_2', 'brightness_stop_row_2',
                'on_row_3', 'off_row_3', 'brightness_step_up_row_3', 'brightness_step_down_row_3', 'brightness_stop_row_3',
                'on_row_4', 'off_row_4', 'brightness_step_up_row_4', 'brightness_step_down_row_4', 'brightness_stop_row_4'])],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint10 = device.getEndpoint(0x0a);
            if (endpoint10 != null) {
                await reporting.bind(endpoint10, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint11 = device.getEndpoint(0x0b);
            if (endpoint11 != null) {
                const index = endpoint11.outputClusters.indexOf(5);
                if (index > -1) {
                    endpoint11.outputClusters.splice(index, 1);
                }
                await reporting.bind(endpoint11, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint12 = device.getEndpoint(0x0c);
            if (endpoint12 != null) {
                const index = endpoint12.outputClusters.indexOf(5);
                if (index > -1) {
                    endpoint12.outputClusters.splice(index, 1);
                }
                await reporting.bind(endpoint12, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint13 = device.getEndpoint(0x0d);
            if (endpoint13 != null) {
                const index = endpoint13.outputClusters.indexOf(5);
                if (index > -1) {
                    endpoint13.outputClusters.splice(index, 1);
                }
                await reporting.bind(endpoint13, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint18 = device.getEndpoint(0x12);
            if (endpoint18 != null) {
                await reporting.bind(endpoint18, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            }
        },
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.brightness, fz.command_on, fz.command_off, fz.command_step, fz.command_stop],
        toZigbee: [tz.RM01_light_onoff_brightness, tz.RM01_light_brightness_step, tz.RM01_light_brightness_move],
        onEvent: async (type, data, device) => {
            const switchEndpoint = device.getEndpoint(0x12);
            if (switchEndpoint == null) {
                return;
            }
            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await switchEndpoint.read('genOnOff', ['onOff']);
                        await switchEndpoint.read('genLevelCtrl', ['currentLevel']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },
    {
        fingerprint: [{modelID: 'RM01', endpoints: [{ID: 10}, {ID: 11}, {ID: 18}]}],
        model: '6736',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link power supply relay/dimmer 2rows',
        endpoint: (device) => {
            return {'row_1': 0x0a, 'row_2': 0x0b, 'relay': 0x12};
        },
        exposes: [e.light_brightness().withEndpoint('relay'),
            e.action(['on_row_1', 'off_row_1', 'brightness_step_up_row_1', 'brightness_step_down_row_1', 'brightness_stop_row_1',
                'on_row_2', 'off_row_2', 'brightness_step_up_row_2', 'brightness_step_down_row_2', 'brightness_stop_row_2'])],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint10 = device.getEndpoint(0x0a);
            if (endpoint10 != null) {
                await reporting.bind(endpoint10, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint11 = device.getEndpoint(0x0b);
            if (endpoint11 != null) {
                const index = endpoint11.outputClusters.indexOf(5);
                if (index > -1) {
                    endpoint11.outputClusters.splice(index, 1);
                }
                await reporting.bind(endpoint11, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint18 = device.getEndpoint(0x12);
            if (endpoint18 != null) {
                await reporting.bind(endpoint18, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            }
        },
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.brightness, fz.command_on, fz.command_off, fz.command_step, fz.command_stop],
        toZigbee: [tz.RM01_light_onoff_brightness, tz.RM01_light_brightness_step, tz.RM01_light_brightness_move],
        onEvent: async (type, data, device) => {
            const switchEndpoint = device.getEndpoint(0x12);
            if (switchEndpoint == null) {
                return;
            }
            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await switchEndpoint.read('genOnOff', ['onOff']);
                        await switchEndpoint.read('genLevelCtrl', ['currentLevel']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },
    {
        fingerprint: [{modelID: 'RM01', endpoints: [{ID: 10}, {ID: 18}]}],
        model: '6735',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link power supply relay/dimmer 1row',
        endpoint: (device) => {
            return {'row_1': 0x0a, 'relay': 0x12};
        },
        exposes: [e.light_brightness().withEndpoint('relay'),
            e.action(['on_row_1', 'off_row_1', 'brightness_step_up_row_1', 'brightness_step_down_row_1', 'brightness_stop_row_1'])],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint10 = device.getEndpoint(0x0a);
            if (endpoint10 != null) {
                await reporting.bind(endpoint10, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint18 = device.getEndpoint(0x12);
            if (endpoint18 != null) {
                await reporting.bind(endpoint18, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            }
        },
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.brightness, fz.command_on, fz.command_off, fz.command_step, fz.command_stop],
        toZigbee: [tz.RM01_light_onoff_brightness, tz.RM01_light_brightness_step, tz.RM01_light_brightness_move],
        onEvent: async (type, data, device) => {
            const switchEndpoint = device.getEndpoint(0x12);
            if (switchEndpoint == null) {
                return;
            }
            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await switchEndpoint.read('genOnOff', ['onOff']);
                        await switchEndpoint.read('genLevelCtrl', ['currentLevel']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },
    {
        fingerprint: [{modelID: 'RB01', endpoints: [{ID: 10}, {ID: 11}, {ID: 12}, {ID: 13}]}],
        model: '6737/01',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link wall-mounted transmitter 4rows',
        endpoint: (device) => {
            return {'row_1': 0x0a, 'row_2': 0x0b, 'row_3': 0x0c, 'row_4': 0x0d};
        },
        exposes: [e.action(['on_row_1', 'off_row_1', 'brightness_step_up_row_1', 'brightness_step_down_row_1', 'brightness_stop_row_1',
            'on_row_2', 'off_row_2', 'brightness_step_up_row_2', 'brightness_step_down_row_2', 'brightness_stop_row_2',
            'on_row_3', 'off_row_3', 'brightness_step_up_row_3', 'brightness_step_down_row_3', 'brightness_stop_row_3',
            'on_row_4', 'off_row_4', 'brightness_step_up_row_4', 'brightness_step_down_row_4', 'brightness_stop_row_4'])],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint10 = device.getEndpoint(0x0a);
            if (endpoint10 != null) {
                await reporting.bind(endpoint10, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint11 = device.getEndpoint(0x0b);
            if (endpoint11 != null) {
                const index = endpoint11.outputClusters.indexOf(5);
                if (index > -1) {
                    endpoint11.outputClusters.splice(index, 1);
                }
                await reporting.bind(endpoint11, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint12 = device.getEndpoint(0x0c);
            if (endpoint12 != null) {
                const index = endpoint12.outputClusters.indexOf(5);
                if (index > -1) {
                    endpoint12.outputClusters.splice(index, 1);
                }
                await reporting.bind(endpoint12, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint13 = device.getEndpoint(0x0d);
            if (endpoint13 != null) {
                const index = endpoint13.outputClusters.indexOf(5);
                if (index > -1) {
                    endpoint13.outputClusters.splice(index, 1);
                }
                await reporting.bind(endpoint13, coordinatorEndpoint, ['genLevelCtrl']);
            }
        },
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.brightness, fz.command_on, fz.command_off, fz.command_step, fz.command_stop],
        toZigbee: [tz.RM01_light_onoff_brightness, tz.RM01_light_brightness_step, tz.RM01_light_brightness_move],
    },
    {
        fingerprint: [{modelID: 'RB01', endpoints: [{ID: 10}, {ID: 11}]}],
        model: '6736/01',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link wall-mounted transmitter 2rows',
        endpoint: (device) => {
            return {'row_1': 0x0a, 'row_2': 0x0b};
        },
        exposes: [e.action(['on_row_1', 'off_row_1', 'brightness_step_up_row_1', 'brightness_step_down_row_1', 'brightness_stop_row_1',
            'on_row_2', 'off_row_2', 'brightness_step_up_row_2', 'brightness_step_down_row_2', 'brightness_stop_row_2'])],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint10 = device.getEndpoint(0x0a);
            if (endpoint10 != null) {
                await reporting.bind(endpoint10, coordinatorEndpoint, ['genLevelCtrl']);
            }
            const endpoint11 = device.getEndpoint(0x0b);
            if (endpoint11 != null) {
                const index = endpoint11.outputClusters.indexOf(5);
                if (index > -1) {
                    endpoint11.outputClusters.splice(index, 1);
                }
                await reporting.bind(endpoint11, coordinatorEndpoint, ['genLevelCtrl']);
            }
        },
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.brightness, fz.command_on, fz.command_off, fz.command_step, fz.command_stop],
        toZigbee: [tz.RM01_light_onoff_brightness, tz.RM01_light_brightness_step, tz.RM01_light_brightness_move],
    },
    {
        fingerprint: [{modelID: 'RB01', endpoints: [{ID: 10}]}],
        model: '6735/01',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link wall-mounted transmitter 1row',
        endpoint: (device) => {
            return {'row_1': 0x0a};
        },
        exposes: [e.action(['on_row_1', 'off_row_1', 'brightness_step_up_row_1', 'brightness_step_down_row_1', 'brightness_stop_row_1'])],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint10 = device.getEndpoint(0x0a);
            if (endpoint10 != null) {
                await reporting.bind(endpoint10, coordinatorEndpoint, ['genLevelCtrl']);
            }
        },
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.brightness, fz.command_on, fz.command_off, fz.command_step, fz.command_stop],
        toZigbee: [tz.RM01_light_onoff_brightness, tz.RM01_light_brightness_step, tz.RM01_light_brightness_move],
    },
];

module.exports = definitions;
