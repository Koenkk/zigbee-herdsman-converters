import {Definition, Fz} from '../lib/types';
import * as reporting from '../lib/reporting';
import * as exposes from '../lib/exposes';
import * as utils from '../lib/utils';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import {deviceEndpoints, light, onOff} from '../lib/modernExtend';
import {logger} from '../lib/logger';

const NS = 'zhc:led_trading';
const e = exposes.presets;

const fzLocal = {
    led_trading_9133: {
        cluster: 'greenPower',
        type: ['commandNotification', 'commandCommissioningNotification'],
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            if (utils.hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;
            if (commandID === 224) return;
            const lookup = {0x13: 'press_1', 0x14: 'press_2', 0x15: 'press_3', 0x16: 'press_4',
                0x1B: 'hold_1', 0x1C: 'hold_2', 0x1D: 'hold_3', 0x1E: 'hold_4'};
            if (!lookup.hasOwnProperty(commandID)) {
                logger.error(`led_trading_9133: missing command '${commandID}'`, NS);
            } else {
                return {action: utils.getFromLookup(commandID, lookup)};
            }
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x00000000427.....$/}],
        model: '9133',
        vendor: 'LED-Trading',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fzLocal.led_trading_9133],
        toZigbee: [],
        exposes: [e.action(['press_1', 'hold_1', 'press_2', 'hold_2', 'press_3', 'hold_3', 'press_4', 'hold_4'])],
    },
    {
        zigbeeModel: ['HK-LN-DIM-A'],
        model: 'HK-LN-DIM-A',
        vendor: 'LED-Trading',
        description: 'ZigBee AC phase-cut dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['HK-LN-SOCKET-A'],
        model: '9134',
        vendor: 'LED-Trading',
        description: 'Powerstrip with 4 sockets and USB',
        extend: [
            deviceEndpoints({endpoints: {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5}}),
            onOff({endpointNames: ['l1', 'l2', 'l3', 'l4', 'l5']}),
        ],
    },
    {
        zigbeeModel: ['HK-ZCC-ZLL-A'],
        model: '9135',
        vendor: 'LED-Trading',
        description: 'Curtain motor controller',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
