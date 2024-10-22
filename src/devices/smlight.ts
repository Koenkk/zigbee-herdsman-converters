import fz from '../converters/fromZigbee';
import {forcePowerSource} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['SLZB-06M', 'SLZB-06'],
        model: 'SLZB-06M',
        vendor: 'SMLIGHT',
        description: 'Router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
        extend: [forcePowerSource({powerSource: 'Mains (single phase)'})],
        whiteLabel: [{vendor: 'SMLIGHT', model: 'SLZB-06', description: 'Router', fingerprint: [{modelID: 'SLZB-06'}]}],
    },
];

export default definitions;
module.exports = definitions;
