import {Definition} from '../lib/types';
import {onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'TS0001', manufacturerName: '_TYZB01_reyozfcg'},
            {modelID: 'TS0001', manufacturerName: '_TYZB01_4vgantdz'},
        ],
        model: 'VR-X701U',
        vendor: 'Vrey',
        description: '1 gang switch',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
