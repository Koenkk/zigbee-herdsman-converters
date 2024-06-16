import {Definition, Zh} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as globalStore from '../lib/store';
const e = exposes.presets;
const ea = exposes.access;

const poll = async (device: Zh.Device) => {
    try {
        const endpoint = device.getEndpoint(6);
        const options = {transactionSequenceNumber: 0, srcEndpoint: 8, disableResponse: true, disableRecovery: true};
        await endpoint.command('genOnOff', 'toggle', {}, options);
    } catch (error) {
        // device is lost, need to permit join
    }
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['TI0001          '],
        model: 'TI0001',
        description: 'Zigbee switch (1, 2, 3, 4 gang)',
        vendor: 'Livolo',
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            e.switch().withEndpoint('bottom_left'),
            e.switch().withEndpoint('bottom_right'),
        ],
        fromZigbee: [fz.livolo_switch_state, fz.livolo_switch_state_raw, fz.livolo_new_switch_state_4gang],
        toZigbee: [tz.livolo_socket_switch_on_off],
        endpoint: (device) => {
            return {'left': 6, 'right': 6, 'bottom_left': 6, 'bottom_right': 6};
        },
        configure: poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => await poll(device), 300*1000);
                    globalStore.putValue(device, 'interval', interval);
                }
            }
            if (data.cluster === 'genPowerCfg' && data.type === 'raw') {
                const dp = data.data[10];
                if (data.data[0] === 0x7a && data.data[1] === 0xd1) {
                    const endpoint = device.getEndpoint(6);
                    if (dp === 0x01) {
                        const options = {manufacturerCode: 0x1ad2, disableDefaultResponse: true, disableResponse: true,
                            reservedBits: 3, direction: 1, writeUndiv: true};
                        const payload = {0x2002: {value: [0, 0, 0, 0, 0, 0, 0], type: 0x0e}};
                        await endpoint.readResponse('genPowerCfg', 0xe9, payload, options);
                    }
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-switch'],
        model: 'TI0001-switch',
        description: 'Zigbee switch 1 gang',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_new_switch_state, fz.power_on_behavior],
        toZigbee: [tz.livolo_socket_switch_on_off, tz.power_on_behavior],
        exposes: [e.switch()],
        configure: poll,
        endpoint: (device) => {
            return {'left': 6, 'right': 6};
        },
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => {
                        await poll(device);
                    }, 300*1000); // Every 300 seconds
                    globalStore.putValue(device, 'interval', interval);
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-switch-2gang'],
        model: 'TI0001-switch-2gang',
        description: 'Zigbee Switch 2 gang',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_new_switch_state_2gang],
        toZigbee: [tz.livolo_socket_switch_on_off],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        configure: poll,
        endpoint: (device) => {
            return {'left': 6, 'right': 6};
        },
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => {
                        await poll(device);
                    }, 300*1000); // Every 300 seconds
                    globalStore.putValue(device, 'interval', interval);
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-curtain-switch'],
        model: 'TI0001-curtain-switch',
        description: 'Zigbee curtain switch (can only read status, control does not work yet)',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_curtain_switch_state],
        toZigbee: [tz.livolo_socket_switch_on_off],
        // toZigbee: [tz.livolo_curtain_switch_on_off],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        configure: poll,
        endpoint: (device) => {
            return {'left': 6, 'right': 6};
        },
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => {
                        await poll(device);
                    }, 300*1000); // Every 300 seconds
                    globalStore.putValue(device, 'interval', interval);
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-socket'],
        model: 'TI0001-socket',
        description: 'Zigbee socket',
        vendor: 'Livolo',
        exposes: [e.switch()],
        fromZigbee: [fz.livolo_socket_state, fz.power_on_behavior],
        toZigbee: [tz.livolo_socket_switch_on_off, tz.power_on_behavior],
        configure: poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => {
                        await poll(device);
                    }, 300*1000); // Every 300 seconds
                    globalStore.putValue(device, 'interval', interval);
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-dimmer'],
        model: 'TI0001-dimmer',
        description: 'Zigbee dimmer',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_dimmer_state],
        toZigbee: [tz.livolo_socket_switch_on_off, tz.livolo_dimmer_level],
        exposes: [e.light_brightness()],
        configure: poll,
        endpoint: (device) => {
            return {'left': 6, 'right': 6};
        },
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (!globalStore.hasValue(device, 'interval')) {
                await poll(device);
                const interval = setInterval(async () => {
                    await poll(device);
                }, 300*1000); // Every 300 seconds
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },
    {
        zigbeeModel: ['TI0001-cover'],
        model: 'TI0001-cover',
        description: 'Zigbee roller blind motor',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_cover_state, fz.command_off],
        toZigbee: [tz.livolo_cover_state, tz.livolo_cover_position, tz.livolo_cover_options],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            e.composite('options', 'options', ea.STATE_SET)
                .withDescription('Motor options')
                .withFeature(e.numeric('motor_speed', ea.STATE_SET)
                    .withValueMin(20)
                    .withValueMax(40)
                    .withDescription('Motor speed')
                    .withUnit('rpm'))
                .withFeature(e.enum('motor_direction', ea.STATE_SET, ['FORWARD', 'REVERSE'])
                    .withDescription('Motor direction')),
            e.binary('moving', ea.STATE, true, false)
                .withDescription('Motor is moving'),
        ],
        configure: poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (!globalStore.hasValue(device, 'interval')) {
                await poll(device);
                const interval = setInterval(async () => {
                    await poll(device);
                }, 300*1000); // Every 300 seconds
                globalStore.putValue(device, 'interval', interval);
            }
            // This is needed while pairing in order to let the device know that the interview went right and prevent
            // it from disconnecting from the Zigbee network.
            if (data.cluster === 'genPowerCfg' && data.type === 'raw') {
                const dp = data.data[10];
                if (data.data[0] === 0x7a && data.data[1] === 0xd1) {
                    const endpoint = device.getEndpoint(6);
                    if (dp === 0x02) {
                        const options = {manufacturerCode: 0x1ad2, disableDefaultResponse: true, disableResponse: true,
                            reservedBits: 3, direction: 1, writeUndiv: true};
                        const payload = {0x0802: {value: [data.data[3], 0, 0, 0, 0, 0, 0], type: data.data[2]}};
                        await endpoint.readResponse('genPowerCfg', 0xe9, payload, options);
                    }
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-pir'],
        model: 'TI0001-pir',
        description: 'Zigbee motion Sensor',
        vendor: 'Livolo',
        exposes: [
            e.occupancy(),
        ],
        fromZigbee: [fz.livolo_pir_state],
        toZigbee: [],
        configure: poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => await poll(device), 10*1000);
                    globalStore.putValue(device, 'interval', interval);
                }
            }
            if (data.cluster === 'genPowerCfg' && data.type === 'raw') {
                const dp = data.data[10];
                if (data.data[0] === 0x7a && data.data[1] === 0xd1) {
                    const endpoint = device.getEndpoint(6);
                    if (dp === 0x01) {
                        const options = {manufacturerCode: 0x1ad2, disableDefaultResponse: true, disableResponse: true,
                            reservedBits: 3, direction: 1, writeUndiv: true};
                        const payload = {0x2002: {value: [0, 0, 0, 0, 0, 0, 0], type: 0x0e}};
                        await endpoint.readResponse('genPowerCfg', 0xe9, payload, options);
                    }
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-hygrometer'],
        model: 'TI0001-hygrometer',
        description: 'Zigbee Digital Humidity and Temperature Sensor',
        vendor: 'Livolo',
        exposes: [
            e.humidity(), e.temperature(),
        ],
        fromZigbee: [fz.livolo_hygrometer_state],
        toZigbee: [],
        configure: poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => await poll(device), 60*1000);
                    globalStore.putValue(device, 'interval', interval);
                }
            }
            if (data.cluster === 'genPowerCfg' && data.type === 'raw') {
                const dp = data.data[10];
                if (data.data[0] === 0x7a && data.data[1] === 0xd1) {
                    const endpoint = device.getEndpoint(6);
                    if (dp === 0x02) {
                        const options = {manufacturerCode: 0x1ad2, disableDefaultResponse: true, disableResponse: true,
                            reservedBits: 3, direction: 1, writeUndiv: true};
                        const payload = {0x2002: {value: [data.data[3], 0, 0, 0, 0, 0, 0], type: data.data[2]}};
                        await endpoint.readResponse('genPowerCfg', 0xe9, payload, options);
                    }
                }
            }
        },
    },
];

export default definitions;
module.exports = definitions;
