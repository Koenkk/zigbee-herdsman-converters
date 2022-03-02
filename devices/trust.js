const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['WATER_TPV14'],
        model: 'ZWLD-100',
        vendor: 'Trust',
        description: 'Water leakage detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.ignore_basic_report, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
                      '\u0000\u0000\u0000\u0000\u0000', 'ZLL-NonColorController'],
        model: 'ZYCT-202',
        vendor: 'Trust',
        description: 'Remote control',
        fromZigbee: [fz.command_on, fz.command_off_with_effect, fz.legacy.ZYCT202_stop, fz.legacy.ZYCT202_up_down],
        exposes: [e.action(['on', 'off', 'stop', 'brightness_stop', 'brightness_move_up', 'brightness_move_down']), e.action_group()],
        toZigbee: [],
        // Device does not support battery: https://github.com/Koenkk/zigbee2mqtt/issues/5928
    },
    {
        zigbeeModel: ['ZLL-DimmableLigh'],
        model: 'ZLED-2709',
        vendor: 'Trust',
        description: 'Smart Dimmable LED Bulb',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [
            // https://github.com/Koenkk/zigbee2mqtt/issues/8027#issuecomment-904783277
            {modelID: 'ZLL-ColorTempera', manufacturerName: 'Trust International B.V.\u0000', applicationVersion: 1, endpoints: [
                {ID: 1, profileID: 49246, deviceID: 544,
                    inputClusters: [0, 4, 3, 6, 8, 5, 768, 65535, 65535, 25], outputClusters: [0, 4, 3, 6, 8, 5, 768, 25]},
                {ID: 2, profileID: 49246, deviceID: 4096, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        zigbeeModel: ['ZLL-ColorTempera', 'ZLL-ColorTemperature'],
        model: 'ZLED-TUNE9',
        vendor: 'Trust',
        description: 'Smart tunable LED bulb',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        fingerprint: [
            // https://github.com/Koenkk/zigbee2mqtt/issues/8027#issuecomment-904783277
            {modelID: 'ZLL-ExtendedColo', manufacturerName: 'Trust International B.V.\u0000', applicationVersion: 1, endpoints: [
                {ID: 1, profileID: 49246, deviceID: 4096, inputClusters: [4096], outputClusters: [4096]},
                {ID: 2, profileID: 49246, deviceID: 528,
                    inputClusters: [0, 4, 3, 6, 8, 5, 768, 65535, 25], outputClusters: [0, 4, 3, 6, 8, 5, 768, 25]},
            ]},
        ],
        model: 'ZLED-RGB9',
        vendor: 'Trust',
        description: 'Smart RGB LED bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        endpoint: (device) => {
            return {'default': 2};
        },
    },
    {
        zigbeeModel: ['VMS_ADUROLIGHT'],
        model: 'ZPIR-8000',
        vendor: 'Trust',
        description: 'Motion Sensor',
        fromZigbee: [fz.ias_occupancy_alarm_2, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['CSW_ADUROLIGHT'],
        model: 'ZCTS-808',
        vendor: 'Trust',
        description: 'Wireless contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
];
