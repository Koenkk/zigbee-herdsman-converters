import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Alarm_SD_Device'],
        model: 'W2-Module',
        description: 'Carbon monoxide sensor',
        vendor: 'FireAngel',
        fromZigbee: [fz.W2_module_carbon_monoxide, fz.battery],
        toZigbee: [],
        exposes: [e.carbon_monoxide(), e.battery()],
    },
];

export default definitions;
module.exports = definitions;
