const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['3c4e4fc81ed442efaf69353effcdfc5f', '51725b7bcba945c8a595b325127461e9'],
        model: 'CR11S8UZ',
        vendor: 'ORVIBO',
        description: 'Smart sticker switch',
        fromZigbee: [fz.orvibo_raw_1],
        exposes: [e.action(['button_1_click', 'button_1_hold', 'button_1_release', 'button_2_click', 'button_2_hold', 'button_2_release',
            'button_3_click', 'button_3_hold', 'button_3_release', 'button_4_click', 'button_4_hold', 'button_4_release'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['31c989b65ebb45beaf3b67b1361d3965'],
        model: 'T18W3Z',
        vendor: 'ORVIBO',
        description: 'Neutral smart switch 3 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint3);
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
    },
    {
        zigbeeModel: ['fdd76effa0e146b4bdafa0c203a37192', 'c670e231d1374dbc9e3c6a9fffbd0ae6', '75a4bfe8ef9c4350830a25d13e3ab068'],
        model: 'SM10ZW',
        vendor: 'ORVIBO',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['8643db61de35494d93e72c1289b526a3'],
        model: 'RL804CZB',
        vendor: 'Orvibo',
        description: 'Zigbee LED controller RGB + CCT or RGBW',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['82c167c95ed746cdbd21d6817f72c593', '8762413da99140cbb809195ff40f8c51'],
        model: 'RL804QZB',
        vendor: 'ORVIBO',
        description: 'Multi-functional 3 gang relay',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['b467083cfc864f5e826459e5d8ea6079'],
        model: 'ST20',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['888a434f3cfc47f29ec4a3a03e9fc442'],
        model: 'ST21',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity Sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ['898ca74409a740b28d5841661e72268d', '50938c4c3c0b4049923cd5afbc151bde'],
        model: 'ST30',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['9f76c9f31b4c4a499e3aca0977ac4494', '6fd24c0f58a04c848fea837aaa7d6e0f'],
        model: 'T30W3Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 3 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
    },
    {
        zigbeeModel: ['074b3ffba5a045b7afd94c47079dd553'],
        model: 'T21W2Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 2 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['095db3379e414477ba6c2f7e0c6aa026'],
        model: 'T21W1Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 1 gang',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['093199ff04984948b4c78167c8e7f47e'],
        model: 'W40CZ',
        vendor: 'ORVIBO',
        description: 'Smart curtain motor ',
        fromZigbee: [fz.curtain_position_analog_output, fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['e0fc98cc88df4857847dc4ae73d80b9e'],
        model: 'R11W2Z',
        vendor: 'ORVIBO',
        description: 'In wall switch - 2 gang',
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
        zigbeeModel: ['9ea4d5d8778d4f7089ac06a3969e784b', '83b9b27d5ffb4830bf35be5b1023623e'],
        model: 'R20W2Z',
        vendor: 'ORVIBO',
        description: 'In wall switch - 2 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
    },
    {
        zigbeeModel: ['131c854783bc45c9b2ac58088d09571c', 'b2e57a0f606546cd879a1a54790827d6'],
        model: 'SN10ZW',
        vendor: 'ORVIBO',
        description: 'Occupancy sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['da2edf1ded0d44e1815d06f45ce02029'],
        model: 'SW21',
        vendor: 'ORVIBO',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['b7e305eb329f497384e966fe3fb0ac69', '52debf035a1b4a66af56415474646c02', 'MultIR'],
        model: 'SW30',
        vendor: 'ORVIBO',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['72bd56c539ca4c7fba73a9be0ae0d19f'],
        model: 'SE21',
        vendor: 'ORVIBO',
        description: 'Smart emergency button',
        fromZigbee: [fz.command_status_change_notification_action],
        exposes: [e.action(['off', 'single', 'double', 'hold'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['2a103244da0b406fa51410c692f79ead'],
        model: 'AM25',
        vendor: 'ORVIBO',
        description: 'Smart blind controller',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },
];
