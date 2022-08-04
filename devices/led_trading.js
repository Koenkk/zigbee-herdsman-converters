const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const exposes = require('../lib/exposes');
const utils = require('../lib/utils');
const e = exposes.presets;

const fzLocal = {
    led_trading_9133: {
        cluster: 'greenPower',
        type: ['commandNotification', 'commandCommisioningNotification'],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            if (utils.hasAlreadyProcessedMessage(msg, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;
            if (commandID === 224) return;
            const lookup = {0x13: 'press_1', 0x14: 'press_2', 0x15: 'press_3', 0x16: 'press_4',
                0x1B: 'hold_1', 0x1C: 'hold_2', 0x1D: 'hold_3', 0x1E: 'hold_4'};
            if (!lookup.hasOwnProperty(commandID)) {
                meta.logger.error(`led_trading_9133: missing command '${commandID}'`);
            } else {
                return {action: lookup[commandID]};
            }
        },
    },
};

module.exports = [
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x00000000427.....$/}],
        model: '9133',
        vendor: 'Led Trading',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fzLocal.led_trading_9133],
        toZigbee: [],
        exposes: [e.action(['press_1', 'hold_1', 'press_2', 'hold_2', 'press_3', 'hold_3', 'press_4', 'hold_4'])],
    },
    {
        zigbeeModel: ['HK-LN-DIM-A'],
        model: 'HK-LN-DIM-A',
        vendor: 'LED Trading',
        description: 'ZigBee AC phase-cut dimmer',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['HK-LN-SOCKET-A'],
        model: '9134',
        vendor: 'LED Trading',
        description: 'Powerstrip with 4 sockets and USB',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'), e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
        },
    },
];
