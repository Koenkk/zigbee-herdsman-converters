import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['OJB-CR701-YZ'],
        model: 'CR701-YZ',
        vendor: 'Oujiabao',
        description: 'Gas and carbon monoxide alarm',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.carbon_monoxide(), e.tamper(), e.battery_low()],
    },
];

export default definitions;
module.exports = definitions;
