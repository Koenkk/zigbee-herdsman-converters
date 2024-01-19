import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Windows switch  '],
        model: 'M415-6C',
        vendor: 'BYUN',
        description: 'Smoke sensor',
        fromZigbee: [fz.byun_smoke_true, fz.byun_smoke_false],
        toZigbee: [],
        exposes: [e.smoke()],
    },
    {
        zigbeeModel: ['GAS  SENSOR     '],
        model: 'M415-5C',
        vendor: 'BYUN',
        description: 'Gas sensor',
        fromZigbee: [fz.byun_gas_true, fz.byun_gas_false],
        toZigbee: [],
        exposes: [e.gas()],
    },
];

export default definitions;
module.exports = definitions;
