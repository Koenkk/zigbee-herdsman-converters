const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['LXN59-1S7LX1.0'],
        model: 'HGZB-01',
        vendor: 'Nue / 3A',
        description: 'Smart Zigbee 3.0 light controller',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Zemismart', model: 'ZW-EU-01', description: 'Smart light relay - 1 gang'},
            {vendor: 'Moes', model: 'ZK-CH-2U', description: 'Plug with 2 USB ports'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['LXN59-2S7LX1.0'],
        model: 'LXN59-2S7LX1.0',
        vendor: 'Nue / 3A',
        description: 'Smart light relay - 2 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        whiteLabel: [{vendor: 'Zemismart', model: 'ZW-EU-02'}],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['FTB56+ZSN15HG1.0'],
        model: 'HGZB-1S',
        vendor: 'Nue / 3A',
        description: 'Smart 1 key scene wall switch',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, fz.legacy.scenes_recall_click, fz.ignore_power_report],
        exposes: [e.action(['recall_*']), e.switch()],
    },
    {
        zigbeeModel: ['FTB56+ZSN16HG1.0'],
        model: 'HGZB-02S',
        vendor: 'Nue / 3A',
        description: 'Smart 2 key scene wall switch',
        toZigbee: [tz.on_off],
        exposes: [e.action(['recall_*']), e.switch()],
        fromZigbee: [fz.command_recall, fz.legacy.scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['FB56+ZSN08KJ2.3'],
        model: 'HGZB-045',
        vendor: 'Nue / 3A',
        description: 'Smart 4 key scene wall switch',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, fz.legacy.scenes_recall_click, fz.ignore_power_report],
        exposes: [e.action(['recall_*']), e.switch()],
    },
    {
        zigbeeModel: ['LXN56-DC27LX1.1', 'LXN56-DS27LX1.1'],
        model: 'LXZB-02A',
        vendor: 'Nue / 3A',
        description: 'Smart light controller',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FNB56-ZSW03LX2.0', 'LXN-3S27LX1.0'],
        model: 'HGZB-43',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang v2.0',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1IKJ1.7', 'FB56+ZSW1IKJ2.5', 'FB56+ZSW1IKJ2.7'],
        model: 'HGZB-043',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom'), e.switch().withEndpoint('center')],
        endpoint: (device) => {
            return {'top': 16, 'center': 17, 'bottom': 18};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1JKJ2.7'],
        model: 'HGZB-44',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 4 gang v2.0',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top_left'), e.switch().withEndpoint('top_right'),
            e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('bottom_right')],
        endpoint: (device) => {
            return {'top_left': 16, 'top_right': 17, 'bottom_right': 18, 'bottom_left': 19};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(19), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSC05HG1.0', 'FNB56-ZBW01LX1.2', 'LXN56-DS27LX1.3', 'LXN60-DS27LX1.3'],
        model: 'HGZB-04D / HGZB-4D-UK',
        vendor: 'Nue / 3A',
        description: 'Smart dimmer wall switch',
        extend: extend.light_onoff_brightness({disableEffect: true}),
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K8-DIM'}],
    },
    {
        zigbeeModel: ['FB56+ZSW1HKJ1.7', 'FB56+ZSW1HKJ2.5', 'FB56+ZSW1HKJ2.7'],
        model: 'HGZB-042',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 16, 'bottom': 17};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-ZSW02LX2.0', 'LXN-2S27LX1.0'],
        model: 'HGZB-42',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang v2.0',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 11, 'bottom': 12};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(11), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-SKT1JXN1.0'],
        model: 'HGZB-20A',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(11), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1GKJ2.5', 'LXN-1S27LX1.0', 'FB56+ZSW1GKJ2.7'],
        model: 'HGZB-41',
        vendor: 'Nue / 3A',
        description: 'Smart one gang wall switch',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['FNB56-SKT1DHG1.4'],
        model: 'MG-AUWS01',
        vendor: 'Nue / 3A',
        description: 'Smart Double GPO',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {left: 12, right: 11};
        },
    },
    {
        zigbeeModel: ['FNB56-ZCW25FB1.9'],
        model: 'XY12S-15',
        vendor: 'Nue / 3A',
        description: 'Smart light controller RGBW',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['FNB56-ZSW23HG1.1', 'LXN56-LC27LX1.1', 'LXN56-LC27LX1.3'],
        model: 'HGZB-01A',
        vendor: 'Nue / 3A',
        description: 'Smart in-wall switch',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['FNB56-ZSC01LX1.2', 'FB56+ZSW05HG1.2', 'FB56+ZSC04HG1.0'],
        model: 'HGZB-02A',
        vendor: 'Nue / 3A',
        description: 'Smart light controller',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FNB56-ZSW01LX2.0'],
        model: 'HGZB-42-UK / HGZB-41 / HGZB-41-UK',
        description: 'Smart switch 1 or 2 gang',
        vendor: 'Nue / 3A',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['FNB56-ZCW25FB1.6', 'FNB56-ZCW25FB2.1'],
        model: 'HGZB-06A',
        vendor: 'Nue / 3A',
        description: 'Smart 7W E27 light bulb',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXN56-0S27LX1.1', 'LXN56-0S27LX1.3'],
        model: 'HGZB-20-UK',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['NUET56-DL27LX1.2'],
        model: 'HGZB-DLC4-N12B',
        vendor: 'Nue / 3A',
        description: 'RGB LED downlight',
        extend: extend.light_onoff_brightness_colortemp_color(),
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
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXN60-LS27-Z30'],
        model: 'WL-SD001-9W',
        vendor: 'Nue / 3A',
        description: '9W RGB LED downlight',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
];
