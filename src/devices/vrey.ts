import * as m from '../lib/modernExtend';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TYZB01_reyozfcg', '_TYZB01_4vgantdz']),
        model: 'VR-X701U',
        vendor: 'Vrey',
        description: '1 gang switch',
        extend: [m.onOff()],
    },
];

export default definitions;
module.exports = definitions;
