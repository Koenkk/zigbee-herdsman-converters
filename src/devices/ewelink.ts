import {Definition, Fz} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import {deviceEndpoints, onOff} from '../lib/modernExtend';
import {logger} from '../lib/logger';
const e = exposes.presets;

const NS = 'zhc:ewelink';
const fzLocal = {
    WS01_rain: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            if (msg.endpoint.ID != 1) return;
            return {rain: (zoneStatus & 1) > 0};
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['CK-BL702-ROUTER-01(7018)'],
        model: 'CK-BL702-ROUTER-01(7018)',
        vendor: 'eWeLink',
        description: 'USB router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['CK-BL702-MSW-01(7010)'],
        model: 'CK-BL702-MSW-01(7010)',
        vendor: 'eWeLink',
        description: 'CMARS Zigbee smart plug',
        extend: [onOff({skipDuplicateTransaction: true})],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['SA-003-Zigbee'],
        model: 'SA-003-Zigbee',
        vendor: 'eWeLink',
        description: 'Zigbee smart plug',
        extend: [onOff({powerOnBehavior: false, skipDuplicateTransaction: true, configureReporting: false})],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
        configure: async (device, coordinatorEndpoint) => {
            try {
                await device.getEndpoint(1).bind('genOnOff', coordinatorEndpoint);
            } catch (error) {
                // This might fail because there are some repeaters which advertise to support genOnOff but don't support it.
                // https://github.com/Koenkk/zigbee2mqtt/issues/19865
                logger.debug('Failed to bind genOnOff for SA-003-Zigbee', NS);
            }
        },
    },
    {
        zigbeeModel: ['SA-030-1'],
        model: 'SA-030-1',
        vendor: 'eWeLink',
        description: 'Zigbee 3.0 smart plug 13A (3120W)(UK version)',
        extend: [onOff({skipDuplicateTransaction: true})],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['SWITCH-ZR02'],
        model: 'SWITCH-ZR02',
        vendor: 'eWeLink',
        description: 'Zigbee smart switch',
        extend: [onOff({powerOnBehavior: false, skipDuplicateTransaction: true})],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['SWITCH-ZR03-1'],
        model: 'SWITCH-ZR03-1',
        vendor: 'eWeLink',
        description: 'Zigbee smart switch',
        extend: [onOff({skipDuplicateTransaction: true})],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW01'],
        model: 'ZB-SW01',
        vendor: 'eWeLink',
        description: 'Smart light switch - 1 gang',
        extend: [onOff({powerOnBehavior: false, skipDuplicateTransaction: true, configureReporting: false})],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW02', 'E220-KR2N0Z0-HA', 'SWITCH-ZR03-2'],
        model: 'ZB-SW02',
        vendor: 'eWeLink',
        description: 'Smart light switch/2 gang relay',
        extend: [
            deviceEndpoints({endpoints: {'left': 1, 'right': 2}}),
            onOff({endpointNames: ['left', 'right'], configureReporting: false}),
        ],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW03'],
        model: 'ZB-SW03',
        vendor: 'eWeLink',
        description: 'Smart light switch - 3 gang',
        extend: [
            deviceEndpoints({endpoints: {'left': 1, 'center': 2, 'right': 3}}),
            onOff({endpointNames: ['left', 'center', 'right'], configureReporting: false}),
        ],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW04'],
        model: 'ZB-SW04',
        vendor: 'eWeLink',
        description: 'Smart light switch - 4 gang',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4'], configureReporting: false}),
        ],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW05'],
        model: 'ZB-SW05',
        vendor: 'eWeLink',
        description: 'Smart light switch - 5 gang',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4', 'l5'], configureReporting: false}),
        ],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['WS01'],
        model: 'WS01',
        vendor: 'eWeLink',
        description: 'Rainfall sensor',
        fromZigbee: [fzLocal.WS01_rain],
        toZigbee: [],
        exposes: [e.rain()],
    },
];

export default definitions;
module.exports = definitions;
