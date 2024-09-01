import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Z3ContactSensor'],
        model: 'N20',
        vendor: 'KAMI',
        description: 'Contact sensor or motion sensor',
        fromZigbee: [fz.KAMI_contact, fz.KAMI_occupancy],
        toZigbee: [],
        exposes: [e.contact(), e.action(['motion'])],
    },
];

export default definitions;
module.exports = definitions;
