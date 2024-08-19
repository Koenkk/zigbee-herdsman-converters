import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['FB56-BOT02HM1A5'],
        model: 'FZB8708HD-S1',
        vendor: 'Brimate',
        description: 'Smart motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },
];

export default definitions;
module.exports = definitions;
