import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
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
