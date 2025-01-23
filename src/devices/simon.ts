import {deviceEndpoints, light} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SM0502'],
        model: 'i7 SM0502',
        vendor: 'SIMON',
        description: 'i7 2-gang smart dimming switch',
        extend: [
            deviceEndpoints({
                endpoints: {
                    left: 1,
                    right: 2,
                },
            }),
            light({
                endpointNames: ['left'],
            }),
            light({
                endpointNames: ['right'],
            }),
        ],
        meta: {
            multiEndpoint: true,
        },
    },
];

export default definitions;
module.exports = definitions;
