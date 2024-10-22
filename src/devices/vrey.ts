import {onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
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
