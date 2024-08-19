import {deviceEndpoints, onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Z601', 'Z602', 'Z603', 'Z604'],
        model: 'Z6',
        vendor: 'Atsmart',
        description: '3 gang smart wall switch (no neutral wire)',
        extend: [deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}), onOff({endpointNames: ['left', 'center', 'right']})],
    },
];

export default definitions;
module.exports = definitions;
