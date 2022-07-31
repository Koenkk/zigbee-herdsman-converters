const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const reporting = require('../lib/reporting');
const utils = require('../lib/utils');
const e = exposes.presets;

const jetHome = {
    fz: {
        multiStateAction: {
            cluster: 'genMultistateInput',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const actionLookup = {0: 'release', 1: 'single', 2: 'double', 3: 'triple', 4: 'hold'};
                const value = msg.data['presentValue'];
                const action = actionLookup[value];
                return {action: utils.postfixWithEndpointName(action, msg, model, meta)};
            },
        },
    },
};

module.exports = [
    {
        fingerprint: [{modelID: 'WS7', manufacturerName: 'JetHome'}],
        model: 'WS7',
        vendor: 'JetHome',
        description: '3-ch battery discrete input module',
        fromZigbee: [fz.battery, jetHome.fz.multiStateAction],
        toZigbee: [],
        exposes: [
            e.battery(), e.battery_voltage(), e.action(
                ['release_in1', 'single_in1', 'double_in1', 'hold_in1',
                    'release_in2', 'single_in2', 'double_in2', 'hold_in2',
                    'release_in3', 'single_in3', 'double_in3', 'hold_in3'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {
                'in1': 1, 'in2': 2, 'in3': 3,
            };
        },
    },
];
