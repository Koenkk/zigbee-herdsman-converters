import {Definition, Fz, KeyValue} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import {deviceEndpoints, forcePowerSource, light, onOff} from '../lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    LXN59_cover_options: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('tuyaMovingState')) {
                const value = msg.data['tuyaMovingState'];
                const movingLookup = {0: 'DOWN', 1: 'UP', 2: 'STOP'};
                result.moving = utils.getFromLookup(value, movingLookup);
            }
            return result;
        },
    } satisfies Fz.Converter,
    LXN59_cover_state_via_onoff: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                return {state: msg.data['onOff'] === 1 ? 'CLOSE' : 'OPEN'};
            }
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['LXN59-1S7LX1.0'],
        model: 'HGZB-01',
        vendor: 'Nue / 3A',
        description: 'Smart Zigbee 3.0 light controller',
        extend: [onOff({powerOnBehavior: false}), forcePowerSource({powerSource: 'Mains (single phase)'})],
        whiteLabel: [{vendor: 'Zemismart', model: 'ZW-EU-01', description: 'Smart light relay - 1 gang'},
            {vendor: 'Moes', model: 'ZK-CH-2U', description: 'Plug with 2 USB ports'}],
    },
    {
        zigbeeModel: ['LXN59-2S7LX1.0'],
        model: 'LXN59-2S7LX1.0',
        vendor: 'Nue / 3A',
        description: 'Smart light relay - 2 gang',
        extend: [
            deviceEndpoints({endpoints: {'left': 1, 'right': 2}}),
            onOff({endpointNames: ['left', 'right']}),
        ],
        whiteLabel: [{vendor: 'Zemismart', model: 'ZW-EU-02'}],
    },
    {
        zigbeeModel: ['FTB56+ZSN15HG1.0'],
        model: 'HGZB-1S',
        vendor: 'Nue / 3A',
        description: 'Smart 1 key scene wall switch',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, legacy.fz.scenes_recall_click, fz.ignore_power_report],
        exposes: [e.action(['recall_*']), e.switch()],
    },
    {
        zigbeeModel: ['FTB56+ZSN16HG1.0'],
        model: 'HGZB-02S',
        vendor: 'Nue / 3A',
        description: 'Smart 2 key scene wall switch',
        toZigbee: [tz.on_off],
        exposes: [e.action(['recall_*']), e.switch()],
        fromZigbee: [fz.command_recall, legacy.fz.scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['FB56+ZSN08KJ2.3', 'FEB56-ZSN26YS1.3'],
        model: 'HGZB-045',
        vendor: 'Nue / 3A',
        description: 'Smart 4 key scene wall switch',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, legacy.fz.scenes_recall_click, fz.ignore_power_report],
        exposes: [e.action(['recall_*']), e.switch()],
    },
    {
        zigbeeModel: ['LXN56-DC27LX1.1', 'LXN56-DS27LX1.1', 'LXN56-DS27LX1.3'],
        model: 'LXZB-02A',
        vendor: 'Nue / 3A',
        description: 'Smart light controller',
        extend: [light({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['FNB56-ZSW03LX2.0', 'LXN-3S27LX1.0'],
        model: 'HGZB-43',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang v2.0',
        extend: [
            deviceEndpoints({endpoints: {'top': 1, 'center': 2, 'bottom': 3}}),
            onOff({endpointNames: ['top', 'center', 'bottom']}),
        ],
    },
    {
        zigbeeModel: ['LXN-4S27LX1.0'],
        model: 'HGZB-4S',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 4 gang v2.0',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4']}),
        ],
    },
    {
        zigbeeModel: ['FB56+ZSW1IKJ1.7', 'FB56+ZSW1IKJ2.5', 'FB56+ZSW1IKJ2.7'],
        model: 'HGZB-043',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang',
        extend: [
            deviceEndpoints({endpoints: {'top': 16, 'center': 17, 'bottom': 18}}),
            onOff({endpointNames: ['top', 'center', 'bottom']}),
        ],
    },
    {
        zigbeeModel: ['FB56+ZSW1JKJ2.7'],
        model: 'HGZB-44',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 4 gang v2.0',
        extend: [
            deviceEndpoints({endpoints: {'top_left': 16, 'top_right': 17, 'bottom_right': 18, 'bottom_left': 19}}),
            onOff({endpointNames: ['top_left', 'top_right', 'bottom_right', 'bottom_left']}),
        ],
    },
    {
        zigbeeModel: ['FB56+ZSC05HG1.0', 'FNB56-ZBW01LX1.2', 'LXN60-DS27LX1.3'],
        model: 'HGZB-04D / HGZB-4D-UK',
        vendor: 'Nue / 3A',
        description: 'Smart dimmer wall switch',
        extend: [light({effect: false, configureReporting: true})],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K8-DIM'}],
    },
    {
        zigbeeModel: ['FB56+ZSW1HKJ1.7', 'FB56+ZSW1HKJ2.5', 'FB56+ZSW1HKJ2.7'],
        model: 'HGZB-042',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang',
        extend: [
            deviceEndpoints({endpoints: {'top': 16, 'bottom': 17}}),
            onOff({endpointNames: ['top', 'bottom']}),
        ],
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: '3A Smart Home DE', modelID: 'LXN-2S27LX1.0', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 0, inputClusters: [0, 4, 3, 6, 5, 4096, 8], outputClusters: [25]},
                {ID: 12, profileID: 49246, deviceID: 0, inputClusters: [0, 4, 3, 6, 5, 8], outputClusters: [25]},
            ]},
        ],
        zigbeeModel: ['FNB56-ZSW02LX2.0'],
        model: 'HGZB-42',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang v2.0',
        extend: [
            deviceEndpoints({endpoints: {'top': 11, 'bottom': 12}}),
            onOff({endpointNames: ['top', 'bottom'], configureReporting: false}),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // ConfigureReporting for onOff fails
            // https://github.com/Koenkk/zigbee2mqtt/issues/20867
            await reporting.bind(device.getEndpoint(11), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-SKT1JXN1.0'],
        model: 'HGZB-20A',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['FB56+ZSW1GKJ2.5', 'LXN-1S27LX1.0', 'FB56+ZSW1GKJ2.7'],
        model: 'HGZB-41',
        vendor: 'Nue / 3A',
        description: 'Smart one gang wall switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['FNB56-SKT1DHG1.4'],
        model: 'MG-AUWS01',
        vendor: 'Nue / 3A',
        description: 'Smart Double GPO',
        extend: [
            deviceEndpoints({endpoints: {'left': 11, 'right': 12}}),
            onOff({endpointNames: ['left', 'right']}),
        ],
    },
    {
        zigbeeModel: ['LXN56-TS27LX1.2'],
        model: 'LXN56-TS27LX1.2',
        vendor: 'Nue / 3A',
        description: 'Smart double GPO',
        extend: [
            deviceEndpoints({endpoints: {'left': 1, 'right': 2}}),
            onOff({endpointNames: ['left', 'right']}),
        ],
    },

    {
        zigbeeModel: ['FNB56-ZCW25FB1.9'],
        model: 'XY12S-15',
        vendor: 'Nue / 3A',
        description: 'Smart light controller RGBW',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['FNB56-ZSW23HG1.1', 'LXN56-LC27LX1.1', 'LXN56-LC27LX1.3'],
        model: 'HGZB-01A',
        vendor: 'Nue / 3A',
        description: 'Smart in-wall switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['FNB56-ZSC01LX1.2', 'FB56+ZSW05HG1.2', 'FB56+ZSC04HG1.0'],
        model: 'HGZB-02A',
        vendor: 'Nue / 3A',
        description: 'Smart light controller',
        extend: [light({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['FNB56-ZSW01LX2.0'],
        model: 'HGZB-42-UK / HGZB-41 / HGZB-41-UK',
        description: 'Smart switch 1 or 2 gang',
        vendor: 'Nue / 3A',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['FNB56-ZCW25FB1.6', 'FNB56-ZCW25FB2.1'],
        model: 'HGZB-06A',
        vendor: 'Nue / 3A',
        description: 'Smart 7W E27 light bulb',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LXN59-CS27LX1.0'],
        model: 'ZW-EU-4C',
        vendor: 'Nue / 3A',
        description: 'Zigbee smart curtain switch',
        fromZigbee: [fz.cover_position_tilt, fzLocal.LXN59_cover_state_via_onoff, fzLocal.LXN59_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {disableDefaultResponse: true},
        exposes: [e.cover_position(), e.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint1);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['LXX60-CS27LX1.0'],
        model: 'ZW-EC-01',
        vendor: 'Nue / 3A',
        description: 'Zigbee smart curtain switch',
        extend: [onOff(), forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
    {
        zigbeeModel: ['LXN56-0S27LX1.1', 'LXN56-0S27LX1.3'],
        model: 'HGZB-20-UK',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['NUET56-DL27LX1.2'],
        model: 'HGZB-DLC4-N12B',
        vendor: 'Nue / 3A',
        description: 'RGB LED downlight',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['FB56-WTS04HM1.1'],
        model: 'HGZB-14A',
        vendor: 'Nue / 3A',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-DOS07FB3.1'],
        model: 'HGZB-13A',
        vendor: 'Nue / 3A',
        description: 'Door/window sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['LXT56-LS27LX1.4', 'LXT56-LS27LX1.7'],
        model: '3A12S-15',
        vendor: 'Nue / 3A',
        description: 'Smart Zigbee 3.0 strip light controller',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LXN60-LS27-Z30', 'FEB56-ZCW2CLX1.0'],
        model: 'WL-SD001-9W',
        vendor: 'Nue / 3A',
        description: '9W RGB LED downlight',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: '3A Smart Home DE', modelID: 'LXN-2S27LX1.0', endpoints: [
                {ID: 1, profileID: 49246, deviceID: 0, inputClusters: [0, 4, 3, 6, 5, 4096, 8], outputClusters: [0]},
                {ID: 2, profileID: 49246, deviceID: 0, inputClusters: [0, 4, 3, 6, 5, 4096, 8], outputClusters: [0]},
            ]},
        ],
        model: 'NUE-AUWZO2',
        vendor: 'Nue / 3A',
        description: 'Smart Zigbee double power point',
        extend: [
            deviceEndpoints({endpoints: {'left': 1, 'right': 2}}),
            onOff({endpointNames: ['left', 'right']}),
        ],
    },
    {
        zigbeeModel: ['LXN56-1S27LX1.2', 'LXX60-FN27LX1.0'],
        model: 'NUE-ZBFLB',
        vendor: 'Nue / 3A',
        description: 'Smart fan light switch',
        extend: [
            deviceEndpoints({endpoints: {'button_light': 1, 'button_fan_high': 2, 'button_fan_med': 3, 'button_fan_low': 4}}),
            onOff({endpointNames: ['button_light', 'button_fan_high', 'button_fan_med', 'button_fan_low']}),
            forcePowerSource({powerSource: 'Mains (single phase)'}),
        ],
    },
];

export default definitions;
module.exports = definitions;
