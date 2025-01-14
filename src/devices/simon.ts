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
                    l1: 1,
                    l2: 2,
                },
            }),
            light({
                endpointNames: ['l1'],
                configureReporting: true,
            }),
            light({
                endpointNames: ['l2'],
                configureReporting: true,
            }),
        ],
        meta: {
            multiEndpoint: true,
            multiEndpointSkip: ['state', 'brightness'],
        },
    },
];

export default definitions;
module.exports = definitions;
