import {Definition} from '../lib/types';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'TS0001', manufacturerName: '_TYZB01_reyozfcg'},
            {modelID: 'TS0001', manufacturerName: '_TYZB01_4vgantdz'},
        ],
        model: 'VR-X701U',
        vendor: 'Vrey',
        description: '1 gang switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
];

module.exports = definitions;
