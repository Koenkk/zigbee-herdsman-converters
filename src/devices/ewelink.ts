import {Zcl} from 'zigbee-herdsman';

import fz from '../converters/fromZigbee';
import {modernExtend as ewelinkModernExtend} from '../lib/ewelink';
import * as exposes from '../lib/exposes';
import {logger} from '../lib/logger';
import {
    battery,
    deviceAddCustomCluster,
    deviceEndpoints,
    forcePowerSource,
    iasZoneAlarm,
    onOff,
    setupAttributes,
    windowCovering,
} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Fz} from '../lib/types';

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

const definitions: DefinitionWithExtend[] = [
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
            } catch {
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
        extend: [deviceEndpoints({endpoints: {left: 1, right: 2}}), onOff({endpointNames: ['left', 'right'], configureReporting: false})],
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
            deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}),
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
            deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}),
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
            deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5}}),
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
    {
        zigbeeModel: ['SNZB-05'],
        model: 'SNZB-05',
        vendor: 'eWeLink',
        description: 'Zigbee water sensor',
        extend: [battery(), iasZoneAlarm({zoneType: 'water_leak', zoneAttributes: ['alarm_1', 'battery_low']})],
    },
    {
        zigbeeModel: ['CK-MG22-JLDJ-01(7015)', 'CK-MG22-Z310EE07DOOYA-01(7015)', 'MYDY25Z-1', 'Grandekor Smart Curtain Grandekor'],
        model: 'CK-MG22-JLDJ-01(7015)',
        vendor: 'eWeLink',
        whiteLabel: [
            {fingerprint: [{modelID: 'CK-MG22-JLDJ-01(7015)'}], vendor: 'eWeLink', model: 'CK-MG22-JLDJ-01(7015)'},
            {fingerprint: [{modelID: 'CK-MG22-Z310EE07DOOYA-01(7015)'}], vendor: 'eWeLink', model: 'CK-MG22-Z310EE07DOOYA-01(7015)'},
            {fingerprint: [{modelID: 'MYDY25Z-1'}], vendor: 'eWeLink', model: 'MYDY25Z-1'},
            {fingerprint: [{modelID: 'Grandekor Smart Curtain Grandekor'}], vendor: 'eWeLink', model: 'Grandekor Smart Curtain Grandekor'},
        ],
        description: 'Dooya Curtain',
        extend: [
            deviceAddCustomCluster('customClusterEwelink', {
                ID: 0xef00,
                attributes: {},
                commands: {
                    protocolData: {
                        ID: 0,
                        parameters: [{name: 'data', type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                    },
                },
                commandsResponse: {},
            }),
            forcePowerSource({powerSource: 'Battery'}),
            ewelinkModernExtend.ewelinkBattery(),
            windowCovering({
                controls: ['lift'],
                configureReporting: false,
                coverMode: false,
                coverInverted: true,
            }),
            ewelinkModernExtend.ewelinkMotorReverse(),
            ewelinkModernExtend.ewelinkMotorMode('customClusterEwelink', 'protocolData'),
            ewelinkModernExtend.ewelinkMotorClbByPosition('customClusterEwelink', 'protocolData'),
            ewelinkModernExtend.ewelinkReportMotorInfo('customClusterEwelink'),
            ewelinkModernExtend.ewelinkMotorSpeed('customClusterEwelink', 'protocolData', 0x00, 0x0e),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const windowCoveringAttributes = [{attribute: 'currentPositionLiftPercentage', min: 0, max: 3600, change: 10}];
            await setupAttributes(device, coordinatorEndpoint, 'closuresWindowCovering', windowCoveringAttributes);
        },
        onEvent: async (type, data, device, settings, state) => {
            if (type === 'deviceInterview') {
                const endpoint = device.getEndpoint(1);
                const payloadValue = [];
                payloadValue[0] = 0x02;
                payloadValue[1] = 0x0e;
                payloadValue[2] = 0x00;
                // Query the maximum level supported for speed adjustment.
                await endpoint.command('customClusterEwelink', 'protocolData', {
                    data: payloadValue,
                });
            }
        },
        ota: true,
    },
    {
        zigbeeModel: ['MYRX25Z-1'],
        model: 'MYRX25Z-1',
        vendor: 'eWeLink',
        whiteLabel: [{fingerprint: [{modelID: 'MYRX25Z-1'}], vendor: 'eWeLink', model: 'MYRX25Z-1'}],
        description: 'Reax Curtain',
        extend: [
            deviceAddCustomCluster('customClusterEwelink', {
                ID: 0xef00,
                attributes: {},
                commands: {
                    protocolData: {
                        ID: 0,
                        parameters: [{name: 'data', type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                    },
                },
                commandsResponse: {},
            }),
            forcePowerSource({powerSource: 'Battery'}),
            ewelinkModernExtend.ewelinkBattery(),
            windowCovering({
                controls: ['lift'],
                configureReporting: false,
                coverMode: false,
                coverInverted: true,
            }),
            ewelinkModernExtend.ewelinkMotorMode('customClusterEwelink', 'protocolData'),
            ewelinkModernExtend.ewelinkMotorClbByPosition('customClusterEwelink', 'protocolData'),
            ewelinkModernExtend.ewelinkReportMotorInfo('customClusterEwelink'),
            ewelinkModernExtend.ewelinkMotorSpeed('customClusterEwelink', 'protocolData', 0x01, 0x03),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['customClusterEwelink']);

            const windowCoveringAttributes = [{attribute: 'currentPositionLiftPercentage', min: 0, max: 3600, change: 10}];
            await setupAttributes(device, coordinatorEndpoint, 'closuresWindowCovering', windowCoveringAttributes);
        },
        ota: true,
    },
    {
        zigbeeModel: ['AM25B-1-25-ES-E-Z', 'ZM25-EAZ', 'AM25C-1-25-ES-E-Z'],
        model: 'AM25B-1-25-ES-E-Z',
        vendor: 'eWeLink',
        whiteLabel: [
            {fingerprint: [{modelID: 'AM25B-1-25-ES-E-Z'}], vendor: 'eWeLink', model: 'AM25B-1-25-ES-E-Z'},
            {fingerprint: [{modelID: 'ZM25-EAZ'}], vendor: 'eWeLink', model: 'ZM25-EAZ'},
            {fingerprint: [{modelID: 'AM25C-1-25-ES-E-Z'}], vendor: 'eWeLink', model: 'AM25C-1-25-ES-E-Z'},
        ],
        description: 'AK Curtain',
        extend: [
            deviceAddCustomCluster('customClusterEwelink', {
                ID: 0xef00,
                attributes: {},
                commands: {
                    protocolData: {
                        ID: 0,
                        parameters: [{name: 'data', type: Zcl.BuffaloZclDataType.LIST_UINT8}],
                    },
                },
                commandsResponse: {},
            }),
            forcePowerSource({powerSource: 'Battery'}),
            ewelinkModernExtend.ewelinkBattery(),
            windowCovering({
                controls: ['lift'],
                configureReporting: false,
                coverMode: false,
                coverInverted: true,
            }),
            ewelinkModernExtend.ewelinkMotorReverse(),
            ewelinkModernExtend.ewelinkMotorMode('customClusterEwelink', 'protocolData'),
            ewelinkModernExtend.ewelinkMotorClbByPosition('customClusterEwelink', 'protocolData'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const windowCoveringAttributes = [{attribute: 'currentPositionLiftPercentage', min: 0, max: 3600, change: 10}];
            await setupAttributes(device, coordinatorEndpoint, 'closuresWindowCovering', windowCoveringAttributes);
        },
        ota: true,
    },
];

export default definitions;
module.exports = definitions;
