import {Definition, Fz, ModernExtend} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as modernExtend from '../lib/modernExtend';

const e = exposes.presets;

const fzLocal = {
    on_off_action: {
        cluster: 'genOnOff',
        type: [
            'commandOn',
            'commandOff',
            'commandToggle',
            // 'commandOnWithTimedOff'
        ],
        convert: (model, msg, publish, options, meta) => {
            switch (msg.type) {
            case 'commandOn':
                return {action: `on_button_${msg.endpoint.ID}`};
            case 'commandOff':
                return {action: `off_button_${msg.endpoint.ID}`};
            case 'commandToggle':
                return {action: `toggle_button_${msg.endpoint.ID}`};
            default:
                return {action: 'NULL'};
            }
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['Zucchini'],
        model: 'Zucchini',
        vendor: 'Llama Devices',
        description: 'On/Off output device',
        fromZigbee: [fzLocal.on_off_action],
        exposes: [
            e.action(['on/off', 'off/on', 'toggle', 'on', 'off']),
        ],
        extend: [
            modernExtend.temperature(),
            modernExtend.humidity(),
            ...(
                () => {
                    const feature: ModernExtend[] = [];

                    for (let i = 0; i < 4; i++) {
                        feature.push(
                            modernExtend.enumLookup({
                                name: 'switch_mode',
                                lookup: {
                                    'toggle': 0,
                                    'alternate': 2,
                                },
                                endpointName: `button_${i + 1}`,
                                cluster: 0xfcb0,
                                attribute: {
                                    ID: 0x0a00,
                                    type: 0x30,
                                },
                                description: '',
                                access: 'ALL',
                                entityCategory: 'config',
                                zigbeeCommandOptions: {
                                    manufacturerCode: 0x4c44,
                                },
                            }),
                        );
                        feature.push(
                            modernExtend.enumLookup({
                                name: 'switch_events',
                                lookup: {
                                    'on/off': 6,
                                    'off/on': 5,
                                    'toggle': 3,
                                    'on': 2,
                                    'off': 1,
                                },
                                endpointName: `button_${i + 1}`,
                                cluster: 0xfcb0,
                                attribute: {
                                    ID: 0x0a01,
                                    type: 0x30,
                                },
                                description: '',
                                access: 'ALL',
                                entityCategory: 'config',
                                zigbeeCommandOptions: {
                                    manufacturerCode: 0x4c44,
                                },
                            }),
                        );
                    }

                    return feature;
                }
            )(),
            modernExtend.deviceEndpoints({
                endpoints: {'button_1': 1, 'button_2': 2, 'button_3': 3, 'button_4': 4},
                multiEndpointSkip: ['battery', 'temperature', 'humidity'],
            }),
        ],
    },
];

export default definitions;
module.exports = definitions;
