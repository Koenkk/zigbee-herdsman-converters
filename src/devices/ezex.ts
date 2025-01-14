import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['E220-KR3N0Z0-HA'],
        model: 'ECW-100-A03',
        vendor: 'eZEX',
        description: 'Zigbee switch 3 gang',
        extend: [m.deviceEndpoints({endpoints: {top: 1, center: 2, bottom: 3}}), m.onOff({endpointNames: ['top', 'center', 'bottom']})],
    },
];

export default definitions;
module.exports = definitions;
