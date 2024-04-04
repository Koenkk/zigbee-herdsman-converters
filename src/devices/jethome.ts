import {Definition, Fz} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import * as ota from '../lib/ota';

const e = exposes.presets;

const jetHome = {
    fz: {
        multiStateAction: {
            cluster: 'genMultistateInput',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const actionLookup = {0: 'release', 1: 'single', 2: 'double', 3: 'triple', 4: 'hold', 256: 'release', 257: 'single', 258: 'double',
                    259: 'triple', 260: 'hold', 512: 'release', 513: 'single', 514: 'double', 515: 'triple', 516: 'hold', 1024: 'release',
                    1025: 'single', 1026: 'double', 1027: 'triple', 1028: 'hold'};
                const value = msg.data['presentValue'];
                const action = utils.getFromLookup(value, actionLookup);
                return {action: utils.postfixWithEndpointName(action, msg, model, meta)};
            },
        } satisfies Fz.Converter,
    },
};

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'WS7', manufacturerName: 'JetHome'}],
        model: 'WS7',
        vendor: 'JetHome',
        description: '3-ch battery discrete input module',
        fromZigbee: [fz.battery, jetHome.fz.multiStateAction],
        toZigbee: [],
        ota: ota.jethome,
        exposes: [
            e.battery(), e.battery_voltage(), e.action(
                ['release_in1', 'single_in1', 'double_in1', 'hold_in1',
                    'release_in2', 'single_in2', 'double_in2', 'hold_in2',
                    'release_in3', 'single_in3', 'double_in3', 'hold_in3'])],
        configure: async (device, coordinatorEndpoint) => {
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

export default definitions;
module.exports = definitions;
